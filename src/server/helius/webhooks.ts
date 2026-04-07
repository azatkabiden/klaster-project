import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { getJsonString, sha256Hex } from "@/server/crypto";
import { createSupabaseServiceRoleClient } from "@/server/supabase/service-role";

const heliusWebhookTransactionSchema = z
  .object({
    events: z.record(z.string(), z.unknown()).optional(),
    signature: z.string().trim().min(1).optional(),
    timestamp: z.number().int().optional(),
    type: z.string().trim().min(1).optional(),
  })
  .passthrough();

const klasteraiDepositMirrorEventSchema = z
  .union([
    z.object({
      amountUsdc: z.coerce.number().positive(),
      kind: z.literal("deposit"),
      revenueIndexAfter: z.coerce.number().positive(),
      vaultId: z.uuid(),
    }),
    z.object({
      grossAmountUsdc: z.coerce.number().positive(),
      kind: z.literal("deposit"),
      netAmountUsdc: z.coerce.number().positive(),
      platformFeeAmountUsdc: z.coerce.number().min(0),
      revenueIndexAfter: z.coerce.number().positive(),
      vaultId: z.uuid(),
    }),
  ])
  .transform((value) =>
    "amountUsdc" in value
      ? {
          grossAmountUsdc: value.amountUsdc,
          kind: "deposit" as const,
          netAmountUsdc: value.amountUsdc,
          platformFeeAmountUsdc: 0,
          revenueIndexAfter: value.revenueIndexAfter,
          vaultId: value.vaultId,
        }
      : value,
  );

const klasteraiMirrorEventSchema = z.union([
  z.object({
    amountUsdc: z.coerce.number().positive(),
    buyerProfileId: z.uuid(),
    kind: z.literal("purchase"),
    shares: z.coerce.number().int().positive(),
    vaultId: z.uuid(),
  }),
  klasteraiDepositMirrorEventSchema,
  z.object({
    amountUsdc: z.coerce.number().positive(),
    claimantProfileId: z.uuid(),
    kind: z.literal("claim"),
    revenueIndexClaimed: z.coerce.number().positive(),
    vaultId: z.uuid(),
  }),
  z.object({
    kind: z.literal("pause"),
    vaultId: z.uuid(),
  }),
  z.object({
    kind: z.literal("resume"),
    vaultId: z.uuid(),
  }),
  z.object({
    kind: z.literal("approve"),
    onchainVaultAddress: z.string().trim().min(1).optional(),
    tokenMintAddress: z.string().trim().min(1).optional(),
    vaultId: z.uuid(),
  }),
]);

type HeliusWebhookTransaction = z.infer<typeof heliusWebhookTransactionSchema>;
type KlasteraiMirrorEvent = z.infer<typeof klasteraiMirrorEventSchema>;
type PersistedWebhookEvent = {
  id: string;
  processed_at: string | null;
};

function compareSecrets(expected: string, actual: string) {
  if (!expected || expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export function isHeliusAuthorizationValid(authorizationHeader: string | null) {
  const expectedHeader = getServerEnv().heliusWebhookSecret.trim();

  if (!expectedHeader) {
    throw new Error(
      "Missing required environment variable: HELIUS_WEBHOOK_SECRET.",
    );
  }

  return authorizationHeader
    ? compareSecrets(expectedHeader, authorizationHeader.trim())
    : false;
}

export function parseHeliusWebhookPayload(payload: unknown) {
  const parsed = z
    .union([
      heliusWebhookTransactionSchema,
      z.array(heliusWebhookTransactionSchema),
    ])
    .parse(payload);

  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function getHeliusProviderEventId(
  transaction: HeliusWebhookTransaction,
) {
  if (transaction.signature) {
    return transaction.signature;
  }

  return sha256Hex(getJsonString(transaction));
}

function getMirrorEvent(transaction: HeliusWebhookTransaction) {
  const candidate =
    transaction.events &&
    typeof transaction.events === "object" &&
    "klasterai" in transaction.events
      ? transaction.events.klasterai
      : null;

  if (!candidate) {
    return null;
  }

  return klasteraiMirrorEventSchema.parse(candidate);
}

async function applyMirrorEvent(
  mirrorEvent: KlasteraiMirrorEvent,
  signature: string,
  timestamp?: number,
) {
  const client = createSupabaseServiceRoleClient();
  const createdAt = timestamp
    ? new Date(timestamp * 1000).toISOString()
    : new Date().toISOString();

  if (mirrorEvent.kind === "purchase") {
    const result = await client.from("purchases").upsert(
      {
        buyer_profile_id: mirrorEvent.buyerProfileId,
        created_at: createdAt,
        shares: mirrorEvent.shares,
        signature,
        usdc_amount: mirrorEvent.amountUsdc,
        vault_id: mirrorEvent.vaultId,
      },
      {
        ignoreDuplicates: true,
        onConflict: "signature",
      },
    );

    if (result.error) {
      throw new Error(result.error.message);
    }

    return;
  }

  if (mirrorEvent.kind === "deposit") {
    const result = await client.from("revenue_deposits").upsert(
      {
        created_at: createdAt,
        gross_amount_usdc: mirrorEvent.grossAmountUsdc,
        net_amount_usdc: mirrorEvent.netAmountUsdc,
        platform_fee_amount_usdc: mirrorEvent.platformFeeAmountUsdc,
        revenue_index_after: mirrorEvent.revenueIndexAfter,
        signature,
        vault_id: mirrorEvent.vaultId,
      },
      {
        ignoreDuplicates: true,
        onConflict: "signature",
      },
    );

    if (result.error) {
      throw new Error(result.error.message);
    }

    return;
  }

  if (mirrorEvent.kind === "claim") {
    const result = await client.from("claims").upsert(
      {
        amount_usdc: mirrorEvent.amountUsdc,
        claimant_profile_id: mirrorEvent.claimantProfileId,
        created_at: createdAt,
        revenue_index_claimed: mirrorEvent.revenueIndexClaimed,
        signature,
        vault_id: mirrorEvent.vaultId,
      },
      {
        ignoreDuplicates: true,
        onConflict: "signature",
      },
    );

    if (result.error) {
      throw new Error(result.error.message);
    }

    return;
  }

  const updateResult = await client
    .from("vaults")
    .update(
      mirrorEvent.kind === "pause"
        ? {
            paused_at: createdAt,
            status: "paused",
          }
        : mirrorEvent.kind === "resume"
          ? {
              paused_at: null,
              status: "verified",
            }
          : {
              onchain_vault_address: mirrorEvent.onchainVaultAddress ?? null,
              status: "verified",
              token_mint_address: mirrorEvent.tokenMintAddress ?? null,
              verified_at: createdAt,
            },
    )
    .eq("id", mirrorEvent.vaultId);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }
}

async function persistWebhookEvent(transaction: HeliusWebhookTransaction) {
  const client = createSupabaseServiceRoleClient();
  const providerEventId = await getHeliusProviderEventId(transaction);
  const persistedEvent = await ensureWebhookEventRecord(
    transaction,
    providerEventId,
  );

  if (persistedEvent.processed_at) {
    return {
      deduped: true,
      providerEventId,
    };
  }

  const mirrorEvent = getMirrorEvent(transaction);

  if (mirrorEvent) {
    await applyMirrorEvent(
      mirrorEvent,
      transaction.signature ?? providerEventId,
      transaction.timestamp,
    );
  }

  const markProcessed = await client
    .from("webhook_events")
    .update({
      processed_at: new Date().toISOString(),
    })
    .eq("id", persistedEvent.id);

  if (markProcessed.error) {
    throw new Error(markProcessed.error.message);
  }

  return {
    deduped: false,
    providerEventId,
  };
}

async function getPersistedWebhookEvent(providerEventId: string) {
  const client = createSupabaseServiceRoleClient();
  const existingEvent = await client
    .from("webhook_events")
    .select("id, processed_at")
    .eq("provider", "helius")
    .eq("provider_event_id", providerEventId)
    .maybeSingle();

  if (existingEvent.error) {
    throw new Error(existingEvent.error.message);
  }

  return existingEvent.data as PersistedWebhookEvent | null;
}

async function ensureWebhookEventRecord(
  transaction: HeliusWebhookTransaction,
  providerEventId: string,
) {
  const client = createSupabaseServiceRoleClient();
  const existingEvent = await getPersistedWebhookEvent(providerEventId);

  if (existingEvent) {
    return existingEvent;
  }

  const insertResult = await client
    .from("webhook_events")
    .insert({
      event_type: transaction.type ?? "transaction",
      payload: transaction,
      processed_at: null,
      provider: "helius",
      provider_event_id: providerEventId,
    })
    .select("id, processed_at")
    .single();

  if (insertResult.error) {
    if (insertResult.error.code === "23505") {
      const retriedEvent = await getPersistedWebhookEvent(providerEventId);

      if (retriedEvent) {
        return retriedEvent;
      }
    }

    throw new Error(insertResult.error.message);
  }

  return insertResult.data as PersistedWebhookEvent;
}

export async function ingestHeliusWebhook(payload: unknown) {
  const transactions = parseHeliusWebhookPayload(payload);
  const results = [];

  for (const transaction of transactions) {
    results.push(await persistWebhookEvent(transaction));
  }

  return {
    accepted: results.length,
    deduped: results.filter((result) => result.deduped).length,
  };
}
