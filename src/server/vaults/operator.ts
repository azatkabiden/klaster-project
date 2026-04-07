import { z } from "zod";
import type { AppSession } from "@/server/auth/session";
import { getJsonString, sha256Hex } from "@/server/crypto";
import { AppError } from "@/server/http/errors";
import { getConfirmedProofDocuments } from "@/server/storage/private-documents";
import { createSupabaseServiceRoleClient } from "@/server/supabase/service-role";

const EDITABLE_STATUSES = ["draft", "needs_info", "rejected"] as const;

export const operatorVaultDraftSchema = z.object({
  hardwareSummary: z.record(z.string(), z.unknown()),
  nodeCategory: z.string().trim().min(2).max(80),
  nodeLabel: z.string().trim().min(3).max(120),
  publicShareSupply: z.coerce.number().int().positive(),
  sharePriceUsdc: z.coerce.number().positive(),
  slug: z.string().trim().min(3).max(80).optional(),
  submitForReview: z.boolean().optional().default(false),
  totalShares: z.coerce.number().int().positive(),
  valuationUsdc: z.coerce.number().positive(),
  vaultId: z.uuid().optional(),
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function ensureUniqueSlug(baseSlug: string, vaultId?: string) {
  const client = createSupabaseServiceRoleClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug =
      attempt === 0
        ? baseSlug
        : `${baseSlug}-${crypto.randomUUID().slice(0, 6).toLowerCase()}`;
    const existing = await client
      .from("vaults")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing.error) {
      throw new Error(existing.error.message);
    }

    if (!existing.data || existing.data.id === vaultId) {
      return slug;
    }
  }

  throw new AppError(409, "Could not generate a unique vault slug.");
}

async function computeProofBundleHash(vaultId: string) {
  const documents = await getConfirmedProofDocuments(vaultId);

  if (!documents.length) {
    throw new AppError(
      409,
      "At least one proof document is required before submitting a vault.",
    );
  }

  return sha256Hex(getJsonString(documents.map((document) => document.sha256)));
}

export async function saveOperatorVaultDraft(
  rawInput: z.infer<typeof operatorVaultDraftSchema>,
  session: AppSession,
) {
  const input = operatorVaultDraftSchema.parse(rawInput);
  const client = createSupabaseServiceRoleClient();
  const desiredStatus = input.submitForReview ? "pending_review" : "draft";
  const nextSlug = await ensureUniqueSlug(
    slugify(input.slug ?? input.nodeLabel),
    input.vaultId,
  );

  if (input.publicShareSupply > input.totalShares) {
    throw new AppError(400, "Public share supply cannot exceed total shares.");
  }

  let existingVault:
    | {
        id: string;
        operator_profile_id: string;
        status: string;
      }
    | null
    | undefined;

  if (input.vaultId) {
    const existingVaultResult = await client
      .from("vaults")
      .select("id, operator_profile_id, status")
      .eq("id", input.vaultId)
      .maybeSingle();

    if (existingVaultResult.error) {
      throw new Error(existingVaultResult.error.message);
    }

    existingVault = existingVaultResult.data;

    if (!existingVault) {
      throw new AppError(404, "Vault not found.");
    }

    if (existingVault.operator_profile_id !== session.profileId) {
      throw new AppError(403, "You do not have access to this vault.");
    }

    if (
      !EDITABLE_STATUSES.includes(
        existingVault.status as (typeof EDITABLE_STATUSES)[number],
      )
    ) {
      throw new AppError(409, "This vault can no longer be edited.");
    }
  }

  const proofBundleHash = input.submitForReview
    ? await computeProofBundleHash(input.vaultId ?? "")
    : "";
  const payload = {
    hardware_summary: input.hardwareSummary,
    node_category: input.nodeCategory,
    node_label: input.nodeLabel,
    operator_profile_id: session.profileId,
    proof_bundle_hash: proofBundleHash,
    public_share_supply: input.publicShareSupply,
    share_price_usdc: input.sharePriceUsdc,
    slug: nextSlug,
    status: desiredStatus,
    total_shares: input.totalShares,
    valuation_usdc: input.valuationUsdc,
  };

  if (existingVault) {
    const updatedVault = await client
      .from("vaults")
      .update(payload)
      .eq("id", existingVault.id)
      .select("id, slug, status")
      .single();

    if (updatedVault.error) {
      throw new Error(updatedVault.error.message);
    }

    return updatedVault.data;
  }

  const insertedVault = await client
    .from("vaults")
    .insert(payload)
    .select("id, slug, status")
    .single();

  if (insertedVault.error) {
    throw new Error(insertedVault.error.message);
  }

  return insertedVault.data;
}
