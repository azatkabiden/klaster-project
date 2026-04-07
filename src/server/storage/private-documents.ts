import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import type { AppSession } from "@/server/auth/session";
import { AppError } from "@/server/http/errors";
import { createSupabaseServiceRoleClient } from "@/server/supabase/service-role";

const ALLOWED_VAULT_STATUSES = [
  "draft",
  "pending_review",
  "needs_info",
] as const;

export const privateUploadRequestSchema = z.object({
  contentType: z.enum([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]),
  documentType: z.enum([
    "invoice",
    "serial_photo",
    "benchmark_evidence",
    "other",
  ]),
  fileName: z.string().trim().min(1).max(120),
  sha256: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i),
  sizeBytes: z.coerce.number().int().positive().max(26_214_400),
});

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

export async function getConfirmedProofDocuments(vaultId: string) {
  const client = createSupabaseServiceRoleClient();
  const bucketName = getServerEnv().supabasePrivateBucket;

  if (!bucketName) {
    throw new Error(
      "Missing required environment variable: SUPABASE_PRIVATE_BUCKET.",
    );
  }

  const documentsResult = await client
    .from("vault_documents")
    .select("id, sha256, storage_path")
    .eq("vault_id", vaultId)
    .order("created_at", { ascending: true });

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message);
  }

  const confirmedDocuments = [];

  for (const document of documentsResult.data) {
    const existsResult = await client.storage
      .from(bucketName)
      .exists(document.storage_path);

    if (existsResult.error) {
      throw new Error(existsResult.error.message);
    }

    if (existsResult.data) {
      confirmedDocuments.push(document);
    }
  }

  return confirmedDocuments;
}

export async function createPrivateDocumentUpload(
  input: z.infer<typeof privateUploadRequestSchema> & {
    session: AppSession;
    vaultId: string;
  },
) {
  const client = createSupabaseServiceRoleClient();
  const bucketName = getServerEnv().supabasePrivateBucket;

  if (!bucketName) {
    throw new Error(
      "Missing required environment variable: SUPABASE_PRIVATE_BUCKET.",
    );
  }

  const vaultResult = await client
    .from("vaults")
    .select("id, operator_profile_id, status")
    .eq("id", input.vaultId)
    .maybeSingle();

  if (vaultResult.error) {
    throw new Error(vaultResult.error.message);
  }

  if (!vaultResult.data) {
    throw new AppError(404, "Vault not found.");
  }

  if (vaultResult.data.operator_profile_id !== input.session.profileId) {
    throw new AppError(403, "You do not have access to this vault.");
  }

  if (
    !ALLOWED_VAULT_STATUSES.includes(
      vaultResult.data.status as (typeof ALLOWED_VAULT_STATUSES)[number],
    )
  ) {
    throw new AppError(409, "This vault is not accepting new proof documents.");
  }

  const documentId = crypto.randomUUID();
  const storagePath = `vaults/${input.vaultId}/${documentId}-${sanitizeFileName(
    input.fileName,
  )}`;
  const signedUpload = await client.storage
    .from(bucketName)
    .createSignedUploadUrl(storagePath);

  if (signedUpload.error || !signedUpload.data) {
    throw new Error(
      signedUpload.error?.message ?? "Failed to create upload URL.",
    );
  }

  const insertResult = await client
    .from("vault_documents")
    .insert({
      document_type: input.documentType,
      id: documentId,
      sha256: input.sha256.toLowerCase(),
      storage_path: storagePath,
      vault_id: input.vaultId,
      visibility: "private",
    })
    .select("id, storage_path, created_at")
    .single();

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  return {
    contentType: input.contentType,
    documentId: insertResult.data.id,
    path: signedUpload.data.path,
    signedUrl: signedUpload.data.signedUrl,
    storagePath: insertResult.data.storage_path,
    token: signedUpload.data.token,
  };
}
