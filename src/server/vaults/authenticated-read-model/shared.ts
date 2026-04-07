import type { AppSession } from "@/server/auth/session";

export function isDemoSession(session: AppSession | null | undefined) {
  return !session || session.profileId.startsWith("demo-");
}

export function proRateVaultAmount(
  vaultWideAmount: number,
  sharesOwned: number,
  totalSoldShares: number,
) {
  if (vaultWideAmount <= 0 || sharesOwned <= 0 || totalSoldShares <= 0) {
    return 0;
  }

  return (vaultWideAmount * sharesOwned) / totalSoldShares;
}

export function formatReviewLabel(decision: string | null) {
  if (!decision) {
    return null;
  }

  if (decision === "needs_info") {
    return "Needs info";
  }

  return decision
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}
