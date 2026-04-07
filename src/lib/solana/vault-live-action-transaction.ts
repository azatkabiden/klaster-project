import type { SolanaClient, TransactionInstructionInput } from "@solana/client";
import type { Address, TransactionSigner } from "@solana/kit";
import { getCreateAssociatedTokenIdempotentInstructionAsync } from "@solana-program/token-2022";
import type {
  OperatorDepositBundle,
  PortfolioClaimBundle,
} from "@/lib/solana/vault-live-actions";
import {
  parseUsdcAtomicAmount,
  resolveVaultTransactionAccounts,
} from "@/lib/solana/vault-transaction-accounts";
import {
  getClaimYieldInstructionAsync,
  getDepositRevenueInstruction,
} from "@/programs/klaster-vault/generated/instructions";

type LiveActionSolanaClient = Pick<SolanaClient, "runtime" | "splToken">;

type BuildOperatorDepositTransactionInput = {
  bundle: OperatorDepositBundle;
  operatorSigner: TransactionSigner<string>;
  solana: LiveActionSolanaClient;
};

type BuildPortfolioClaimTransactionInput = {
  bundle: PortfolioClaimBundle;
  holderSigner: TransactionSigner<string>;
  solana: LiveActionSolanaClient;
};

export async function buildOperatorDepositTransactionPlan({
  bundle,
  operatorSigner,
  solana,
}: BuildOperatorDepositTransactionInput) {
  const transactionAccounts = await resolveVaultTransactionAccounts({
    adminMultisig: bundle.platformTreasuryOwnerAddress as Address<string>,
    operatorAddress: bundle.operatorWalletAddress as Address<string>,
    solana,
    usdcMint: bundle.usdcMint as Address<string>,
    usdcTokenProgram: bundle.usdcTokenProgram as Address<string>,
    vaultAddress: bundle.vaultAddress as Address<string>,
  });

  if (
    !transactionAccounts.operatorUsdcTokenAccount ||
    !transactionAccounts.platformTreasuryTokenAccount
  ) {
    throw new Error(
      "Deposit preparation could not derive the required operator token accounts.",
    );
  }

  const instructions: TransactionInstructionInput[] = [
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      mint: bundle.usdcMint as Address<string>,
      owner: bundle.operatorWalletAddress as Address<string>,
      payer: operatorSigner,
      tokenProgram: bundle.usdcTokenProgram as Address<string>,
    }),
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      mint: bundle.usdcMint as Address<string>,
      owner: transactionAccounts.vaultAuthority,
      payer: operatorSigner,
      tokenProgram: bundle.usdcTokenProgram as Address<string>,
    }),
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      mint: bundle.usdcMint as Address<string>,
      owner: bundle.platformTreasuryOwnerAddress as Address<string>,
      payer: operatorSigner,
      tokenProgram: bundle.usdcTokenProgram as Address<string>,
    }),
    getDepositRevenueInstruction(
      {
        amount: parseUsdcAtomicAmount(bundle.amountUsdc),
        operator: operatorSigner,
        operatorUsdcTokenAccount: transactionAccounts.operatorUsdcTokenAccount,
        platformTreasuryTokenAccount:
          transactionAccounts.platformTreasuryTokenAccount,
        revenuePoolTokenAccount: transactionAccounts.revenuePoolTokenAccount,
        usdcMint: bundle.usdcMint as Address<string>,
        usdcTokenProgram: bundle.usdcTokenProgram as Address<string>,
        vault: bundle.vaultAddress as Address<string>,
      },
      {
        programAddress: bundle.programAddress as Address<string>,
      },
    ),
  ];

  return {
    instructions,
  };
}

export async function buildPortfolioClaimTransactionPlan({
  bundle,
  holderSigner,
  solana,
}: BuildPortfolioClaimTransactionInput) {
  const transactionAccounts = await resolveVaultTransactionAccounts({
    holderAddress: bundle.holderWalletAddress as Address<string>,
    solana,
    usdcMint: bundle.usdcMint as Address<string>,
    usdcTokenProgram: bundle.usdcTokenProgram as Address<string>,
    vaultAddress: bundle.vaultAddress as Address<string>,
  });

  if (!transactionAccounts.holderUsdcTokenAccount) {
    throw new Error(
      "Claim preparation could not derive the holder USDC token account.",
    );
  }

  const instructions: TransactionInstructionInput[] = [
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      mint: bundle.usdcMint as Address<string>,
      owner: bundle.holderWalletAddress as Address<string>,
      payer: holderSigner,
      tokenProgram: bundle.usdcTokenProgram as Address<string>,
    }),
    await getClaimYieldInstructionAsync(
      {
        holder: holderSigner,
        holderUsdcTokenAccount: transactionAccounts.holderUsdcTokenAccount,
        revenuePoolTokenAccount: transactionAccounts.revenuePoolTokenAccount,
        usdcMint: bundle.usdcMint as Address<string>,
        usdcTokenProgram: bundle.usdcTokenProgram as Address<string>,
        vault: bundle.vaultAddress as Address<string>,
      },
      {
        programAddress: bundle.programAddress as Address<string>,
      },
    ),
  ];

  return {
    instructions,
  };
}
