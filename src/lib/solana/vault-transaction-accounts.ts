import type { SolanaClient } from "@solana/client";
import type { Address } from "@solana/kit";
import { findVaultAuthorityPda } from "@/programs/klaster-vault/generated/pdas";

export const USDC_DECIMALS = 6;

type SplTokenCapableClient = Pick<SolanaClient, "splToken">;

type ResolveVaultTransactionAccountsInput = {
  adminMultisig?: Address<string>;
  operatorAddress?: Address<string>;
  holderAddress?: Address<string>;
  shareMint?: Address<string>;
  shareTokenProgram?: Address<string>;
  solana: SplTokenCapableClient;
  usdcMint: Address<string>;
  usdcTokenProgram: Address<string>;
  vaultAddress: Address<string>;
};

export async function resolveVaultTransactionAccounts(
  input: ResolveVaultTransactionAccountsInput,
) {
  const [vaultAuthority] = await findVaultAuthorityPda({
    vault: input.vaultAddress,
  });
  const usdcHelper = input.solana.splToken({
    mint: input.usdcMint,
    tokenProgram: input.usdcTokenProgram,
  });
  const shareHelper =
    input.shareMint && input.shareTokenProgram
      ? input.solana.splToken({
          mint: input.shareMint,
          tokenProgram: input.shareTokenProgram,
        })
      : null;

  const [
    revenuePoolTokenAccount,
    platformTreasuryTokenAccount,
    operatorSettlementTokenAccount,
    operatorUsdcTokenAccount,
    holderUsdcTokenAccount,
    holderShareTokenAccount,
    operatorShareTokenAccount,
  ] = await Promise.all([
    usdcHelper.deriveAssociatedTokenAddress(vaultAuthority),
    input.adminMultisig
      ? usdcHelper.deriveAssociatedTokenAddress(input.adminMultisig)
      : Promise.resolve(undefined),
    input.operatorAddress
      ? usdcHelper.deriveAssociatedTokenAddress(input.operatorAddress)
      : Promise.resolve(undefined),
    input.operatorAddress
      ? usdcHelper.deriveAssociatedTokenAddress(input.operatorAddress)
      : Promise.resolve(undefined),
    input.holderAddress
      ? usdcHelper.deriveAssociatedTokenAddress(input.holderAddress)
      : Promise.resolve(undefined),
    shareHelper && input.holderAddress
      ? shareHelper.deriveAssociatedTokenAddress(input.holderAddress)
      : Promise.resolve(undefined),
    shareHelper && input.operatorAddress
      ? shareHelper.deriveAssociatedTokenAddress(input.operatorAddress)
      : Promise.resolve(undefined),
  ]);

  return {
    holderShareTokenAccount,
    holderUsdcTokenAccount,
    operatorSettlementTokenAccount,
    operatorShareTokenAccount,
    operatorUsdcTokenAccount,
    platformTreasuryTokenAccount,
    revenuePoolTokenAccount,
    vaultAuthority,
  };
}

export function toUsdcAtomicAmount(value: number) {
  return BigInt(Math.round(value * 10 ** USDC_DECIMALS));
}

export function parseUsdcAtomicAmount(value: number | string) {
  const normalizedValue =
    typeof value === "number" ? value.toFixed(USDC_DECIMALS) : value.trim();
  const match = normalizedValue.match(/^([0-9]+)(?:\.([0-9]+))?$/);

  if (!match) {
    throw new Error(`Invalid USDC amount: ${value}`);
  }

  const [, wholePart, fractionalPart = ""] = match;
  const normalizedFraction = fractionalPart
    .padEnd(USDC_DECIMALS, "0")
    .slice(0, USDC_DECIMALS);

  return BigInt(`${wholePart}${normalizedFraction}`);
}
