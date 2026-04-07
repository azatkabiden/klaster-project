import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSession } from "@/server/auth/session";
import type { AppError } from "@/server/http/errors";

const {
  mockGetLiveOperatorVaultDetail,
  mockGetLivePortfolioPageData,
  mockReadLiveVaultActionConfig,
} = vi.hoisted(() => ({
  mockGetLiveOperatorVaultDetail: vi.fn(),
  mockGetLivePortfolioPageData: vi.fn(),
  mockReadLiveVaultActionConfig: vi.fn(),
}));

vi.mock("@/server/vaults/authenticated-read-model/operator", () => ({
  getLiveOperatorVaultDetail: mockGetLiveOperatorVaultDetail,
}));

vi.mock("@/server/vaults/authenticated-read-model/portfolio", () => ({
  getLivePortfolioPageData: mockGetLivePortfolioPageData,
}));

vi.mock("@/server/vaults/live-action-config", () => ({
  readLiveVaultActionConfig: mockReadLiveVaultActionConfig,
}));

import {
  prepareOperatorDeposit,
  preparePortfolioClaim,
} from "@/server/vaults/live-transactions";

const operatorSession: AppSession = {
  profileId: "operator-profile",
  regionCode: "KZ",
  role: "operator",
  walletAddress: "operator-wallet",
};

const investorSession: AppSession = {
  profileId: "investor-profile",
  regionCode: "KZ",
  role: "investor",
  walletAddress: "investor-wallet",
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SOLANA_ADMIN_MULTISIG = "treasury-wallet";
  mockReadLiveVaultActionConfig.mockResolvedValue({
    mintedShares: 12,
    programAddress: "program-address",
    usdcMint: "usdc-mint",
    usdcTokenProgram: "token-program",
    vaultAddress: "vault-address",
  });
});

describe("live transaction prep helpers", () => {
  it("prepares a live operator deposit bundle for eligible vaults", async () => {
    mockGetLiveOperatorVaultDetail.mockResolvedValue({
      actionMode: "live",
      errorMessage: null,
      source: "live",
      state: "live_ready",
      vault: {
        assetOrigin: "operator_listed",
        campaignRaisedUsdc: 0,
        campaignTargetUsdc: 0,
        depositActionAvailability: "live_enabled",
        depositDisabledReason: null,
        documentCount: 0,
        healthSummary: "",
        id: "vault-1",
        latestDepositAt: null,
        latestHealthScore: 94.1,
        latestReviewNote: null,
        mintedShares: 12,
        nodeCategory: "GPU Cluster",
        nodeLabel: "Atlas Node",
        platformFeeBps: 1000,
        proofDocuments: [],
        publicShareSupply: 120,
        recentDeposits: [],
        reviewHistory: [],
        sharePriceUsdc: 15.25,
        slug: "atlas-node",
        status: "verified",
        tokenMintAddress: "share-mint",
        totalShares: 240,
        vaultAddress: "vault-address",
      },
    });

    const bundle = await prepareOperatorDeposit(
      "vault-1",
      {
        amountUsdc: "150.25",
      },
      operatorSession,
    );

    expect(bundle).toMatchObject({
      amountUsdc: "150.25",
      operatorWalletAddress: "operator-wallet",
      platformTreasuryOwnerAddress: "treasury-wallet",
      programAddress: "program-address",
      usdcMint: "usdc-mint",
      vaultAddress: "vault-address",
    });
  });

  it("surfaces the disabled deposit reason when the vault is not eligible", async () => {
    mockGetLiveOperatorVaultDetail.mockResolvedValue({
      actionMode: "live",
      errorMessage: null,
      source: "live",
      state: "live_ready",
      vault: {
        depositActionAvailability: "live_disabled",
        depositDisabledReason:
          "Revenue deposits stay disabled until the vault has minted shares into circulation.",
        id: "vault-1",
        vaultAddress: "vault-address",
      },
    });

    await expect(
      prepareOperatorDeposit(
        "vault-1",
        {
          amountUsdc: "10",
        },
        operatorSession,
      ),
    ).rejects.toMatchObject({
      message:
        "Revenue deposits stay disabled until the vault has minted shares into circulation.",
    } satisfies Partial<AppError>);
  });

  it("prepares a per-vault claim bundle for eligible holdings", async () => {
    mockGetLivePortfolioPageData.mockResolvedValue({
      activities: [],
      errorMessage: null,
      holdings: [
        {
          assetOrigin: "operator_listed",
          averageEntryUsdc: 10,
          claimActionAvailability: "live_enabled",
          claimDisabledReason: null,
          claimableUsdc: 18.4,
          grossRevenueUsdc: 20,
          id: "vault-1",
          investedUsdc: 100,
          investorNetRevenueUsdc: 18.4,
          lastClaimAt: null,
          lastDepositAt: null,
          nodeCategory: "GPU Cluster",
          nodeLabel: "Atlas Node",
          platformFeePaidUsdc: 1.6,
          sharesOwned: 10,
          slug: "atlas-node",
          status: "verified",
          tokenMintAddress: "share-mint",
          totalClaimedUsdc: 0,
          vaultAddress: "vault-address",
        },
      ],
      source: "live",
      state: "live_ready",
      summary: {
        grossRevenueUsdc: 20,
        investorNetRevenueUsdc: 18.4,
        latestClaimAt: null,
        pausedExposureUsdc: 0,
        totalClaimableUsdc: 18.4,
        totalInvestedUsdc: 100,
        totalPlatformFeesUsdc: 1.6,
        vaultCount: 1,
      },
    });

    const bundle = await preparePortfolioClaim("vault-1", investorSession);

    expect(bundle).toMatchObject({
      holderWalletAddress: "investor-wallet",
      programAddress: "program-address",
      usdcMint: "usdc-mint",
      vaultAddress: "vault-address",
    });
  });
});
