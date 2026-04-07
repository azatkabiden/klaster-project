import { createDefaultClient, TOKEN_PROGRAM_ADDRESS } from "@solana/client";
import type { Address } from "@solana/kit";
import { fetchVault } from "@/programs/klaster-vault/generated/accounts/vault";
import { getReadModelRuntimeAvailability } from "@/server/vaults/read-model-runtime";

export type LiveVaultActionConfig = {
  mintedShares: number;
  programAddress: string;
  usdcMint: string;
  usdcTokenProgram: string;
  vaultAddress: string;
};

export async function readLiveVaultActionConfig(
  onchainVaultAddress: string | null,
): Promise<LiveVaultActionConfig | null> {
  const { hasProgramRuntime, publicEnv } = getReadModelRuntimeAvailability();

  if (!hasProgramRuntime || !onchainVaultAddress) {
    return null;
  }

  try {
    const client = createDefaultClient({
      cluster: publicEnv.solanaCluster,
      rpc: publicEnv.heliusRpcUrl as `http${string}`,
    });
    const onchainVault = await fetchVault(
      client.runtime.rpc,
      onchainVaultAddress as Address<string>,
    );

    return {
      mintedShares: Number(onchainVault.data.mintedShares),
      programAddress: publicEnv.programId,
      usdcMint: onchainVault.data.usdcMint,
      usdcTokenProgram: TOKEN_PROGRAM_ADDRESS,
      vaultAddress: onchainVault.address,
    };
  } catch {
    return null;
  }
}
