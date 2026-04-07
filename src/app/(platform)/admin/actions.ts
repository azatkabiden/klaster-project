"use server";

import { requireCurrentSession } from "@/server/auth/guards";
import {
  pauseVaultSchema,
  reviewVault,
  reviewVaultSchema,
  setVaultPauseState,
} from "@/server/vaults/admin";

export async function reviewVaultAction(vaultId: string, input: unknown) {
  const session = await requireCurrentSession(["admin"]);

  return reviewVault(vaultId, reviewVaultSchema.parse(input), session);
}

export async function setVaultPauseStateAction(
  vaultId: string,
  input: unknown,
) {
  const session = await requireCurrentSession(["admin"]);

  return setVaultPauseState(vaultId, pauseVaultSchema.parse(input), session);
}
