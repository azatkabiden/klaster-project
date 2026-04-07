import type { AppSession } from "@/server/auth/session";
import { createSupabaseServiceRoleClient } from "@/server/supabase/service-role";
import type {
  OperatorVaultDetailPageData,
  OperatorVaultStatus,
  OperatorWorkspacePageData,
} from "@/server/vaults/authenticated-read-model/types";
import { readLiveVaultActionConfig } from "@/server/vaults/live-action-config";
import { toNumber } from "@/server/vaults/read-model-helpers";

export async function getLiveOperatorWorkspaceData(
  session: AppSession,
): Promise<OperatorWorkspacePageData> {
  const client = createSupabaseServiceRoleClient();
  const vaultsResult = await client
    .from("vaults")
    .select(
      "asset_origin, campaign_raised_usdc, campaign_target_usdc, created_at, id, node_category, node_label, platform_fee_bps, public_share_supply, share_price_usdc, slug, status, total_shares, verification_summary",
    )
    .eq("operator_profile_id", session.profileId)
    .order("created_at", { ascending: false });

  if (vaultsResult.error) {
    throw new Error(vaultsResult.error.message);
  }

  const vaultRows = vaultsResult.data ?? [];

  if (!vaultRows.length) {
    return {
      errorMessage: null,
      lanes: {
        draft: [],
        needs_info: [],
        paused: [],
        pending_review: [],
        verified: [],
      },
      source: "live",
      state: "live_empty",
      summary: {
        draftCount: 0,
        needsInfoCount: 0,
        pendingReviewCount: 0,
        verifiedCount: 0,
      },
    };
  }

  const vaultIds = vaultRows.map((vault) => vault.id);
  const [documentsResult, depositsResult] = await Promise.all([
    client
      .from("vault_documents")
      .select("id, vault_id")
      .in("vault_id", vaultIds),
    client
      .from("revenue_deposits")
      .select("created_at, vault_id")
      .in("vault_id", vaultIds)
      .order("created_at", { ascending: false }),
  ]);

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message);
  }

  if (depositsResult.error) {
    throw new Error(depositsResult.error.message);
  }

  const documentCountByVault = new Map<string, number>();
  for (const row of documentsResult.data ?? []) {
    documentCountByVault.set(
      row.vault_id,
      (documentCountByVault.get(row.vault_id) ?? 0) + 1,
    );
  }

  const latestDepositByVault = new Map<string, string>();
  for (const row of depositsResult.data ?? []) {
    if (!latestDepositByVault.has(row.vault_id)) {
      latestDepositByVault.set(row.vault_id, row.created_at);
    }
  }

  const cards = vaultRows.map((vault) => {
    const verificationSummary =
      vault.verification_summary &&
      typeof vault.verification_summary === "object" &&
      !Array.isArray(vault.verification_summary)
        ? (vault.verification_summary as Record<string, unknown>)
        : {};

    return {
      assetOrigin:
        vault.asset_origin === "klaster_managed"
          ? "klaster_managed"
          : "operator_listed",
      campaignRaisedUsdc: toNumber(vault.campaign_raised_usdc),
      campaignTargetUsdc: toNumber(vault.campaign_target_usdc),
      documentCount: documentCountByVault.get(vault.id) ?? 0,
      id: vault.id,
      latestDepositAt: latestDepositByVault.get(vault.id) ?? null,
      latestReviewNote:
        typeof verificationSummary.notes === "string"
          ? verificationSummary.notes
          : null,
      nodeCategory: vault.node_category,
      nodeLabel: vault.node_label,
      platformFeeBps: toNumber(vault.platform_fee_bps),
      publicShareSupply: toNumber(vault.public_share_supply),
      sharePriceUsdc: toNumber(vault.share_price_usdc),
      slug: vault.slug,
      status: vault.status as OperatorVaultStatus,
      totalShares: toNumber(vault.total_shares),
    } satisfies import("@/server/vaults/authenticated-read-model/types").OperatorVaultCard;
  });

  return {
    errorMessage: null,
    lanes: {
      draft: cards.filter((vault) => vault.status === "draft"),
      needs_info: cards.filter((vault) => vault.status === "needs_info"),
      paused: cards.filter((vault) => vault.status === "paused"),
      pending_review: cards.filter(
        (vault) => vault.status === "pending_review",
      ),
      verified: cards.filter((vault) => vault.status === "verified"),
    },
    source: "live",
    state: "live_ready",
    summary: {
      draftCount: cards.filter((vault) => vault.status === "draft").length,
      needsInfoCount: cards.filter((vault) => vault.status === "needs_info")
        .length,
      pendingReviewCount: cards.filter(
        (vault) => vault.status === "pending_review",
      ).length,
      verifiedCount: cards.filter((vault) => vault.status === "verified")
        .length,
    },
  };
}

export async function getLiveOperatorVaultDetail(
  session: AppSession,
  idOrSlug: string,
): Promise<OperatorVaultDetailPageData> {
  const workspace = await getLiveOperatorWorkspaceData(session);

  if (workspace.state !== "live_ready") {
    return {
      actionMode: "live",
      errorMessage: workspace.errorMessage,
      source: workspace.source,
      state: workspace.state,
      vault: null,
    };
  }

  const card = Object.values(workspace.lanes)
    .flat()
    .find((vault) => vault.id === idOrSlug || vault.slug === idOrSlug);

  if (!card) {
    return {
      actionMode: "live",
      errorMessage: null,
      source: "live",
      state: "live_empty",
      vault: null,
    };
  }

  const client = createSupabaseServiceRoleClient();
  const [
    vaultResult,
    documentsResult,
    reviewsResult,
    healthResult,
    depositsResult,
  ] = await Promise.all([
    client
      .from("vaults")
      .select("onchain_vault_address, token_mint_address")
      .eq("id", card.id)
      .single(),
    client
      .from("vault_documents")
      .select("created_at, document_type, id, sha256")
      .eq("vault_id", card.id)
      .order("created_at", { ascending: false }),
    client
      .from("verification_reviews")
      .select("created_at, decision, id, notes, reviewer_profile_id")
      .eq("vault_id", card.id)
      .order("created_at", { ascending: false }),
    client
      .from("health_snapshots")
      .select("health_score")
      .eq("vault_id", card.id)
      .order("sampled_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("revenue_deposits")
      .select("created_at, gross_amount_usdc, id")
      .eq("vault_id", card.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (vaultResult.error) {
    throw new Error(vaultResult.error.message);
  }
  if (documentsResult.error) {
    throw new Error(documentsResult.error.message);
  }
  if (reviewsResult.error) {
    throw new Error(reviewsResult.error.message);
  }
  if (healthResult.error) {
    throw new Error(healthResult.error.message);
  }
  if (depositsResult.error) {
    throw new Error(depositsResult.error.message);
  }

  const vaultAddress =
    typeof vaultResult.data.onchain_vault_address === "string"
      ? vaultResult.data.onchain_vault_address
      : null;
  const tokenMintAddress =
    typeof vaultResult.data.token_mint_address === "string"
      ? vaultResult.data.token_mint_address
      : null;
  const liveActionConfig = await readLiveVaultActionConfig(vaultAddress);
  const canAcceptRevenueDeposit =
    card.status === "verified" || card.status === "paused";
  const depositDisabledReason = !canAcceptRevenueDeposit
    ? "Revenue deposits unlock only after the vault is verified."
    : !vaultAddress || !tokenMintAddress || !liveActionConfig
      ? "Live revenue deposits are unavailable because the onchain vault configuration could not be resolved."
      : liveActionConfig.mintedShares <= 0
        ? "Revenue deposits stay disabled until the vault has minted shares into circulation."
        : null;

  return {
    actionMode: "live",
    errorMessage: null,
    source: "live",
    state: "live_ready",
    vault: {
      ...card,
      depositActionAvailability: depositDisabledReason
        ? "live_disabled"
        : "live_enabled",
      depositDisabledReason,
      healthSummary:
        healthResult.data?.health_score !== undefined
          ? `Latest indexed health score is ${toNumber(healthResult.data.health_score).toFixed(1)}.`
          : "Health snapshots have not been indexed for this vault yet.",
      latestHealthScore:
        healthResult.data?.health_score !== undefined
          ? toNumber(healthResult.data.health_score)
          : null,
      mintedShares: liveActionConfig?.mintedShares ?? null,
      proofDocuments: (documentsResult.data ?? []).map((document) => ({
        id: document.id,
        kind: document.document_type,
        label: document.document_type.replace(/_/g, " "),
        sha256: document.sha256,
        uploadedAt: document.created_at,
      })),
      recentDeposits: (depositsResult.data ?? []).map((deposit) => ({
        amountUsdc: toNumber(deposit.gross_amount_usdc),
        createdAt: deposit.created_at,
        id: deposit.id,
      })),
      reviewHistory: (reviewsResult.data ?? []).map((review) => ({
        createdAt: review.created_at,
        decision: review.decision,
        id: review.id,
        notes: review.notes,
        reviewerLabel: review.reviewer_profile_id,
      })),
      tokenMintAddress,
      vaultAddress,
    },
  };
}
