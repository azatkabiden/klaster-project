import type { AppSession } from "@/server/auth/session";

export type AuthenticatedDataState =
  | "seeded_demo"
  | "live_ready"
  | "live_empty"
  | "live_error";

export type AuthenticatedDataSource = "seeded" | "live";
export type VaultAssetOrigin = "klaster_managed" | "operator_listed";
export type LiveActionAvailability = "demo" | "live_disabled" | "live_enabled";

export type PortfolioHolding = {
  assetOrigin: VaultAssetOrigin;
  averageEntryUsdc: number;
  claimActionAvailability: LiveActionAvailability;
  claimDisabledReason: string | null;
  claimableUsdc: number;
  grossRevenueUsdc: number;
  id: string;
  investedUsdc: number;
  investorNetRevenueUsdc: number;
  lastClaimAt: string | null;
  lastDepositAt: string | null;
  nodeCategory: string;
  nodeLabel: string;
  platformFeePaidUsdc: number;
  sharesOwned: number;
  slug: string;
  status: "paused" | "verified";
  tokenMintAddress: string | null;
  totalClaimedUsdc: number;
  vaultAddress: string | null;
};

export type PortfolioActivity = {
  amountUsdc: number | null;
  id: string;
  occurredAt: string;
  shares: number | null;
  type: "claim" | "deposit" | "purchase";
  vaultLabel: string;
};

export type PortfolioPageData = {
  activities: PortfolioActivity[];
  errorMessage: string | null;
  holdings: PortfolioHolding[];
  source: AuthenticatedDataSource;
  state: AuthenticatedDataState;
  summary: {
    grossRevenueUsdc: number;
    investorNetRevenueUsdc: number;
    latestClaimAt: string | null;
    pausedExposureUsdc: number;
    totalPlatformFeesUsdc: number;
    totalClaimableUsdc: number;
    totalInvestedUsdc: number;
    vaultCount: number;
  };
};

export type OperatorVaultStatus =
  | "draft"
  | "needs_info"
  | "pending_review"
  | "paused"
  | "verified";

export type OperatorVaultCard = {
  assetOrigin: VaultAssetOrigin;
  campaignRaisedUsdc: number;
  campaignTargetUsdc: number;
  documentCount: number;
  id: string;
  latestDepositAt: string | null;
  latestReviewNote: string | null;
  nodeCategory: string;
  nodeLabel: string;
  platformFeeBps: number;
  publicShareSupply: number;
  sharePriceUsdc: number;
  slug: string;
  status: OperatorVaultStatus;
  totalShares: number;
};

export type OperatorWorkspacePageData = {
  errorMessage: string | null;
  lanes: Record<OperatorVaultStatus, OperatorVaultCard[]>;
  source: AuthenticatedDataSource;
  state: AuthenticatedDataState;
  summary: {
    draftCount: number;
    needsInfoCount: number;
    pendingReviewCount: number;
    verifiedCount: number;
  };
};

export type OperatorDraftPageData = {
  defaults: {
    nodeCategory: string;
    nodeLabel: string;
    publicShareSupply: number;
    sharePriceUsdc: number;
    totalShares: number;
    valuationUsdc: number;
  };
  guidance: string[];
  requiredDocuments: Array<{
    description: string;
    id: "benchmark_evidence" | "invoice" | "serial_photo";
    label: string;
  }>;
  source: AuthenticatedDataSource;
  state: AuthenticatedDataState;
};

export type OperatorVaultDetailPageData = {
  actionMode: "demo" | "live";
  errorMessage: string | null;
  source: AuthenticatedDataSource;
  state: AuthenticatedDataState;
  vault:
    | (OperatorVaultCard & {
        depositActionAvailability: LiveActionAvailability;
        depositDisabledReason: string | null;
        healthSummary: string;
        latestHealthScore: number | null;
        mintedShares: number | null;
        tokenMintAddress: string | null;
        vaultAddress: string | null;
        proofDocuments: Array<{
          id: string;
          kind: string;
          label: string;
          sha256: string;
          uploadedAt: string;
        }>;
        recentDeposits: Array<{
          amountUsdc: number;
          createdAt: string;
          id: string;
        }>;
        reviewHistory: Array<{
          createdAt: string;
          decision: "approved" | "needs_info" | "pending" | "rejected";
          id: string;
          notes: string;
          reviewerLabel: string;
        }>;
      })
    | null;
};

export type AdminQueueRow = {
  assetOrigin: VaultAssetOrigin;
  documentCount: number;
  id: string;
  nodeCategory: string;
  nodeLabel: string;
  operatorLabel: string;
  reviewDecision: "approved" | "needs_info" | "pending" | "rejected" | null;
  slug: string;
  status:
    | "draft"
    | "needs_info"
    | "pending_review"
    | "paused"
    | "rejected"
    | "verified";
  submittedAt: string;
  updatedAt: string;
};

export type AdminReviewQueuePageData = {
  errorMessage: string | null;
  rows: AdminQueueRow[];
  source: AuthenticatedDataSource;
  state: AuthenticatedDataState;
  summary: {
    needsInfoCount: number;
    pendingCount: number;
    pausedCount: number;
    reviewedCount: number;
  };
};

export type AdminReviewDetailPageData = {
  actionMode: "demo" | "live";
  errorMessage: string | null;
  review: {
    auditTrail: Array<{
      createdAt: string;
      id: string;
      notes: string;
      type: string;
      who: string;
    }>;
    documents: Array<{
      id: string;
      kind: string;
      label: string;
      sha256: string;
      uploadedAt: string;
    }>;
    id: string;
    nodeCategory: string;
    nodeLabel: string;
    operatorLabel: string;
    proofBundleHash: string;
    publicSummary: Array<{
      label: string;
      value: string;
    }>;
    slug: string;
    status:
      | "needs_info"
      | "pending_review"
      | "paused"
      | "rejected"
      | "verified";
    verificationNotes: string;
  } | null;
  source: AuthenticatedDataSource;
  state: AuthenticatedDataState;
};

export type PortfolioPageLoader = (
  session: AppSession,
) => Promise<PortfolioPageData>;
