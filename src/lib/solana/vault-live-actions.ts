export type OperatorDepositBundle = {
  amountUsdc: string;
  operatorWalletAddress: string;
  platformTreasuryOwnerAddress: string;
  programAddress: string;
  usdcMint: string;
  usdcTokenProgram: string;
  vaultAddress: string;
  vaultId: string;
};

export type PortfolioClaimBundle = {
  holderWalletAddress: string;
  programAddress: string;
  usdcMint: string;
  usdcTokenProgram: string;
  vaultAddress: string;
  vaultId: string;
};
