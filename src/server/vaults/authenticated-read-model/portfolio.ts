import type { AppSession } from "@/server/auth/session";
import { createSupabaseServiceRoleClient } from "@/server/supabase/service-role";
import { proRateVaultAmount } from "@/server/vaults/authenticated-read-model/shared";
import type { PortfolioPageData } from "@/server/vaults/authenticated-read-model/types";
import { readLiveVaultActionConfig } from "@/server/vaults/live-action-config";
import { toNumber } from "@/server/vaults/read-model-helpers";

export async function getLivePortfolioPageData(
  session: AppSession,
): Promise<PortfolioPageData> {
  const client = createSupabaseServiceRoleClient();
  const [purchasesResult, claimsResult] = await Promise.all([
    client
      .from("purchases")
      .select("created_at, id, shares, usdc_amount, vault_id")
      .eq("buyer_profile_id", session.profileId)
      .order("created_at", { ascending: false }),
    client
      .from("claims")
      .select("amount_usdc, created_at, id, vault_id")
      .eq("claimant_profile_id", session.profileId)
      .order("created_at", { ascending: false }),
  ]);

  if (purchasesResult.error) {
    throw new Error(purchasesResult.error.message);
  }

  if (claimsResult.error) {
    throw new Error(claimsResult.error.message);
  }

  const purchases = purchasesResult.data ?? [];
  const claims = claimsResult.data ?? [];
  const vaultIds = [
    ...new Set([...purchases, ...claims].map((row) => row.vault_id)),
  ];

  if (!vaultIds.length) {
    return {
      activities: [],
      errorMessage: null,
      holdings: [],
      source: "live",
      state: "live_empty",
      summary: {
        grossRevenueUsdc: 0,
        investorNetRevenueUsdc: 0,
        latestClaimAt: null,
        pausedExposureUsdc: 0,
        totalPlatformFeesUsdc: 0,
        totalClaimableUsdc: 0,
        totalInvestedUsdc: 0,
        vaultCount: 0,
      },
    };
  }

  const [vaultsResult, allVaultPurchasesResult, depositsResult] =
    await Promise.all([
      client
        .from("vaults")
        .select(
          "asset_origin, id, node_category, node_label, onchain_vault_address, share_price_usdc, slug, status, token_mint_address",
        )
        .in("id", vaultIds),
      client
        .from("purchases")
        .select("shares, vault_id")
        .in("vault_id", vaultIds),
      client
        .from("revenue_deposits")
        .select(
          "created_at, gross_amount_usdc, id, net_amount_usdc, platform_fee_amount_usdc, vault_id",
        )
        .in("vault_id", vaultIds)
        .order("created_at", { ascending: false }),
    ]);

  if (vaultsResult.error) {
    throw new Error(vaultsResult.error.message);
  }

  if (allVaultPurchasesResult.error) {
    throw new Error(allVaultPurchasesResult.error.message);
  }

  if (depositsResult.error) {
    throw new Error(depositsResult.error.message);
  }

  const vaultById = new Map(
    (vaultsResult.data ?? []).map((vault) => [vault.id, vault]),
  );
  const soldSharesByVault = new Map<string, number>();
  for (const row of allVaultPurchasesResult.data ?? []) {
    soldSharesByVault.set(
      row.vault_id,
      (soldSharesByVault.get(row.vault_id) ?? 0) + toNumber(row.shares),
    );
  }

  const depositsByVault = new Map<
    string,
    {
      grossUsdc: number;
      latestAt: string | null;
      netUsdc: number;
      platformFeeUsdc: number;
    }
  >();
  for (const row of depositsResult.data ?? []) {
    const current = depositsByVault.get(row.vault_id) ?? {
      grossUsdc: 0,
      latestAt: null,
      netUsdc: 0,
      platformFeeUsdc: 0,
    };

    depositsByVault.set(row.vault_id, {
      grossUsdc: current.grossUsdc + toNumber(row.gross_amount_usdc),
      latestAt: current.latestAt ?? row.created_at,
      netUsdc: current.netUsdc + toNumber(row.net_amount_usdc),
      platformFeeUsdc:
        current.platformFeeUsdc + toNumber(row.platform_fee_amount_usdc),
    });
  }

  const purchasesByVault = new Map<string, typeof purchases>();
  for (const purchase of purchases) {
    const current = purchasesByVault.get(purchase.vault_id) ?? [];
    current.push(purchase);
    purchasesByVault.set(purchase.vault_id, current);
  }

  const claimsByVault = new Map<string, typeof claims>();
  for (const claim of claims) {
    const current = claimsByVault.get(claim.vault_id) ?? [];
    current.push(claim);
    claimsByVault.set(claim.vault_id, current);
  }

  const holdings = (
    await Promise.all(
      vaultIds.map(async (vaultId) => {
        const vault = vaultById.get(vaultId);

        if (!vault) {
          return null;
        }

        const vaultPurchases = purchasesByVault.get(vaultId) ?? [];
        const vaultClaims = claimsByVault.get(vaultId) ?? [];
        const sharesOwned = vaultPurchases.reduce(
          (total, purchase) => total + toNumber(purchase.shares),
          0,
        );
        const investedUsdc = vaultPurchases.reduce(
          (total, purchase) => total + toNumber(purchase.usdc_amount),
          0,
        );
        const totalClaimedUsdc = vaultClaims.reduce(
          (total, claim) => total + toNumber(claim.amount_usdc),
          0,
        );
        const vaultDeposits = depositsByVault.get(vaultId) ?? {
          grossUsdc: 0,
          latestAt: null,
          netUsdc: 0,
          platformFeeUsdc: 0,
        };
        const totalVaultDeposits = vaultDeposits.netUsdc;
        const totalSoldShares = Math.max(
          soldSharesByVault.get(vaultId) ?? sharesOwned,
          1,
        );
        const grossRevenueShare = proRateVaultAmount(
          vaultDeposits.grossUsdc,
          sharesOwned,
          totalSoldShares,
        );
        const netRevenueShare = proRateVaultAmount(
          vaultDeposits.netUsdc,
          sharesOwned,
          totalSoldShares,
        );
        const platformFeeShare = proRateVaultAmount(
          vaultDeposits.platformFeeUsdc,
          sharesOwned,
          totalSoldShares,
        );
        const indexedClaimable = Math.max(
          (totalVaultDeposits * sharesOwned) / totalSoldShares -
            totalClaimedUsdc,
          0,
        );
        const vaultAddress =
          typeof vault.onchain_vault_address === "string"
            ? vault.onchain_vault_address
            : null;
        const tokenMintAddress =
          typeof vault.token_mint_address === "string"
            ? vault.token_mint_address
            : null;
        const liveActionConfig = await readLiveVaultActionConfig(vaultAddress);
        const claimDisabledReason =
          vault.status === "paused"
            ? "Claiming is disabled while this vault remains paused."
            : indexedClaimable <= 0
              ? "No indexed claimable balance is currently available for this vault."
              : !vaultAddress || !tokenMintAddress || !liveActionConfig
                ? "Live claim execution is unavailable because the vault's onchain configuration could not be resolved."
                : null;

        return {
          assetOrigin:
            vault.asset_origin === "klaster_managed"
              ? "klaster_managed"
              : "operator_listed",
          averageEntryUsdc: sharesOwned > 0 ? investedUsdc / sharesOwned : 0,
          claimActionAvailability: claimDisabledReason
            ? "live_disabled"
            : "live_enabled",
          claimDisabledReason,
          claimableUsdc: Number(indexedClaimable.toFixed(2)),
          grossRevenueUsdc: Number(grossRevenueShare.toFixed(2)),
          id: vault.id,
          investedUsdc: Number(investedUsdc.toFixed(2)),
          investorNetRevenueUsdc: Number(netRevenueShare.toFixed(2)),
          lastClaimAt: vaultClaims[0]?.created_at ?? null,
          lastDepositAt: vaultDeposits.latestAt,
          nodeCategory: vault.node_category,
          nodeLabel: vault.node_label,
          platformFeePaidUsdc: Number(platformFeeShare.toFixed(2)),
          sharesOwned,
          slug: vault.slug,
          status: vault.status === "paused" ? "paused" : "verified",
          tokenMintAddress,
          totalClaimedUsdc: Number(totalClaimedUsdc.toFixed(2)),
          vaultAddress: liveActionConfig?.vaultAddress ?? vaultAddress,
        } satisfies import("@/server/vaults/authenticated-read-model/types").PortfolioHolding;
      }),
    )
  )
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((left, right) => right.investedUsdc - left.investedUsdc);

  const activities = [
    ...purchases.map((purchase) => ({
      amountUsdc: toNumber(purchase.usdc_amount),
      id: purchase.id,
      occurredAt: purchase.created_at,
      shares: toNumber(purchase.shares),
      type: "purchase" as const,
      vaultLabel:
        vaultById.get(purchase.vault_id)?.node_label ?? "Unknown vault",
    })),
    ...claims.map((claim) => ({
      amountUsdc: toNumber(claim.amount_usdc),
      id: claim.id,
      occurredAt: claim.created_at,
      shares: null,
      type: "claim" as const,
      vaultLabel: vaultById.get(claim.vault_id)?.node_label ?? "Unknown vault",
    })),
    ...(depositsResult.data ?? [])
      .filter((deposit) =>
        holdings.some((holding) => holding.id === deposit.vault_id),
      )
      .slice(0, 5)
      .map((deposit) => ({
        amountUsdc: toNumber(deposit.gross_amount_usdc),
        id: deposit.id,
        occurredAt: deposit.created_at,
        shares: null,
        type: "deposit" as const,
        vaultLabel:
          vaultById.get(deposit.vault_id)?.node_label ?? "Unknown vault",
      })),
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return {
    activities,
    errorMessage: null,
    holdings,
    source: "live",
    state: holdings.length ? "live_ready" : "live_empty",
    summary: {
      grossRevenueUsdc: Number(
        holdings
          .reduce((total, holding) => total + holding.grossRevenueUsdc, 0)
          .toFixed(2),
      ),
      investorNetRevenueUsdc: Number(
        holdings
          .reduce((total, holding) => total + holding.investorNetRevenueUsdc, 0)
          .toFixed(2),
      ),
      latestClaimAt: claims[0]?.created_at ?? null,
      pausedExposureUsdc: Number(
        holdings
          .filter((holding) => holding.status === "paused")
          .reduce((total, holding) => total + holding.investedUsdc, 0)
          .toFixed(2),
      ),
      totalPlatformFeesUsdc: Number(
        holdings
          .reduce((total, holding) => total + holding.platformFeePaidUsdc, 0)
          .toFixed(2),
      ),
      totalClaimableUsdc: Number(
        holdings
          .reduce((total, holding) => total + holding.claimableUsdc, 0)
          .toFixed(2),
      ),
      totalInvestedUsdc: Number(
        holdings
          .reduce((total, holding) => total + holding.investedUsdc, 0)
          .toFixed(2),
      ),
      vaultCount: holdings.length,
    },
  };
}
