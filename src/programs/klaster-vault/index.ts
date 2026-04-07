import type { Address } from "@solana/kit";

import { getPublicEnv } from "@/lib/env";

export * from "./generated";
export { KLASTER_VAULT_PROGRAM_ADDRESS } from "./generated/programs";

export function getKlasterVaultProgramAddress(): Address<string> {
  const configuredProgramId = getPublicEnv().programId;

  if (!configuredProgramId) {
    throw new Error(
      "Missing program ID. Set NEXT_PUBLIC_PROGRAM_ID_KLASTER_VAULT before building transactions.",
    );
  }

  return configuredProgramId as Address<string>;
}
