export type AdminApprovalBootstrapMode = "approve_only" | "full";

export type AdminApprovalBundle = {
  adminWalletAddress: string;
  bootstrapMode: AdminApprovalBootstrapMode;
  existingShareMintAddress: string | null;
  existingVaultAddress: string | null;
  operatorWalletAddress: string;
  platformFeeBps: number;
  platformTreasuryOwnerAddress: string;
  programAddress: string;
  proofBundleHash: string;
  publicMetadataHash: string;
  publicMetadataUri: string;
  publicShareSupply: number;
  sharePriceUsdc: string;
  shareTokenProgram: string;
  totalShares: number;
  usdcMint: string;
  usdcTokenProgram: string;
  vaultId: string;
};

export type PreparedAdminApproval = {
  approvalToken: string;
  bundle: AdminApprovalBundle;
};
