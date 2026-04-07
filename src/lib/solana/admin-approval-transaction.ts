import type { SolanaClient, TransactionInstructionInput } from "@solana/client";
import type { Address, TransactionSigner } from "@solana/kit";
import type { KeyPairSigner } from "@solana/signers";
import { generateKeyPairSigner } from "@solana/signers";
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getInitializeMint2Instruction,
  getInitializeNonTransferableMintInstruction,
  getMintSize,
} from "@solana-program/token-2022";
import type { AdminApprovalBundle } from "@/lib/solana/admin-approval";
import {
  parseUsdcAtomicAmount,
  resolveVaultTransactionAccounts,
} from "@/lib/solana/vault-transaction-accounts";
import {
  getApproveVaultInstructionAsync,
  getInitializeVaultInstructionAsync,
} from "@/programs/klaster-vault/generated/instructions";
import { findVaultPda } from "@/programs/klaster-vault/generated/pdas";

type ApprovalSolanaClient = Pick<SolanaClient, "runtime" | "splToken">;

type BuildAdminApprovalTransactionInput = {
  adminSigner: TransactionSigner<string>;
  bundle: AdminApprovalBundle;
  solana: ApprovalSolanaClient;
};

export type AdminApprovalTransactionPlan = {
  instructions: readonly TransactionInstructionInput[];
  shareMintAddress: Address<string>;
  shareMintSigner: KeyPairSigner | null;
  vaultAddress: Address<string>;
};

const NON_TRANSFERABLE_MINT_EXTENSION = [
  { __kind: "NonTransferable" },
] as const;

export async function buildAdminApprovalTransactionPlan({
  adminSigner,
  bundle,
  solana,
}: BuildAdminApprovalTransactionInput): Promise<AdminApprovalTransactionPlan> {
  const shareMintSigner =
    bundle.bootstrapMode === "full" && !bundle.existingShareMintAddress
      ? await generateKeyPairSigner()
      : null;
  const shareMintAddress = (bundle.existingShareMintAddress ??
    shareMintSigner?.address) as Address<string> | undefined;

  if (!shareMintAddress) {
    throw new Error("Approval bootstrap could not resolve the share mint.");
  }

  const [vaultAddress] = await findVaultPda({
    shareMint: shareMintAddress,
  });
  const transactionAccounts = await resolveVaultTransactionAccounts({
    adminMultisig: bundle.platformTreasuryOwnerAddress as Address<string>,
    operatorAddress: bundle.operatorWalletAddress as Address<string>,
    shareMint: shareMintAddress,
    shareTokenProgram: bundle.shareTokenProgram as Address<string>,
    solana,
    usdcMint: bundle.usdcMint as Address<string>,
    usdcTokenProgram: bundle.usdcTokenProgram as Address<string>,
    vaultAddress,
  });

  if (
    !transactionAccounts.operatorSettlementTokenAccount ||
    !transactionAccounts.operatorShareTokenAccount ||
    !transactionAccounts.platformTreasuryTokenAccount
  ) {
    throw new Error(
      "Approval bootstrap could not derive the required token accounts.",
    );
  }

  const instructions: TransactionInstructionInput[] = [];

  if (bundle.bootstrapMode === "full" && shareMintSigner) {
    const mintAccountSize = getMintSize([...NON_TRANSFERABLE_MINT_EXTENSION]);
    const rentLamports = await solana.runtime.rpc
      .getMinimumBalanceForRentExemption(BigInt(mintAccountSize))
      .send();

    instructions.push(
      getCreateAccountInstruction({
        lamports: rentLamports,
        newAccount: shareMintSigner,
        payer: adminSigner,
        programAddress: bundle.shareTokenProgram as Address<string>,
        space: BigInt(mintAccountSize),
      }),
      getInitializeNonTransferableMintInstruction(
        {
          mint: shareMintAddress,
        },
        {
          programAddress: bundle.shareTokenProgram as Address<string>,
        },
      ),
      getInitializeMint2Instruction(
        {
          decimals: 0,
          freezeAuthority: null,
          mint: shareMintAddress,
          mintAuthority: transactionAccounts.vaultAuthority,
        },
        {
          programAddress: bundle.shareTokenProgram as Address<string>,
        },
      ),
    );
  }

  instructions.push(
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      mint: bundle.usdcMint as Address<string>,
      owner: bundle.operatorWalletAddress as Address<string>,
      payer: adminSigner,
      tokenProgram: bundle.usdcTokenProgram as Address<string>,
    }),
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      mint: bundle.usdcMint as Address<string>,
      owner: transactionAccounts.vaultAuthority,
      payer: adminSigner,
      tokenProgram: bundle.usdcTokenProgram as Address<string>,
    }),
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      mint: bundle.usdcMint as Address<string>,
      owner: bundle.platformTreasuryOwnerAddress as Address<string>,
      payer: adminSigner,
      tokenProgram: bundle.usdcTokenProgram as Address<string>,
    }),
    await getCreateAssociatedTokenIdempotentInstructionAsync({
      mint: shareMintAddress,
      owner: bundle.operatorWalletAddress as Address<string>,
      payer: adminSigner,
      tokenProgram: bundle.shareTokenProgram as Address<string>,
    }),
  );

  if (bundle.bootstrapMode === "full") {
    instructions.push(
      await getInitializeVaultInstructionAsync(
        {
          admin: adminSigner,
          operator: bundle.operatorWalletAddress as Address<string>,
          operatorSettlementTokenAccount:
            transactionAccounts.operatorSettlementTokenAccount,
          platformFeeBps: bundle.platformFeeBps,
          platformTreasuryTokenAccount:
            transactionAccounts.platformTreasuryTokenAccount,
          proofBundleHash: bundle.proofBundleHash,
          publicMetadataUri: bundle.publicMetadataUri,
          publicTrancheShares: BigInt(bundle.publicShareSupply),
          revenuePoolTokenAccount: transactionAccounts.revenuePoolTokenAccount,
          shareMint: shareMintAddress,
          sharePriceUsdc: parseUsdcAtomicAmount(bundle.sharePriceUsdc),
          totalShares: BigInt(bundle.totalShares),
          usdcMint: bundle.usdcMint as Address<string>,
          vault: vaultAddress,
          vaultAuthority: transactionAccounts.vaultAuthority,
        },
        {
          programAddress: bundle.programAddress as Address<string>,
        },
      ),
    );
  }

  instructions.push(
    await getApproveVaultInstructionAsync(
      {
        admin: adminSigner,
        operator: bundle.operatorWalletAddress as Address<string>,
        operatorShareTokenAccount:
          transactionAccounts.operatorShareTokenAccount,
        shareMint: shareMintAddress,
        shareTokenProgram: bundle.shareTokenProgram as Address<string>,
        vault: vaultAddress,
        vaultAuthority: transactionAccounts.vaultAuthority,
      },
      {
        programAddress: bundle.programAddress as Address<string>,
      },
    ),
  );

  return {
    instructions,
    shareMintAddress,
    shareMintSigner,
    vaultAddress,
  };
}
