import type {
  ClusterStatus,
  MarketplaceStateFilter,
  PublicVaultListing,
} from "@/server/vaults/public-read-model/types";
import { toNumber } from "@/server/vaults/read-model-helpers";

export const SHARED_DISCLOSURE =
  "Health score and routing telemetry are seeded off-chain v1 data, primary sale proceeds are separate from claimable revenue, and vault shares remain non-transferable in this release.";

export { toNumber };

export function readStringRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function readObjectArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
  );
}

export function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return Number(
    (values.reduce((total, value) => total + value, 0) / values.length).toFixed(
      2,
    ),
  );
}

export function parseClusterStatus(value: unknown): ClusterStatus {
  return value === "routing" ||
    value === "renting" ||
    value === "training" ||
    value === "degraded"
    ? value
    : "idle";
}

export function getAvailability(
  status: "paused" | "verified",
  remainingShares: number,
) {
  if (status === "paused") {
    return "paused";
  }

  if (remainingShares <= 0) {
    return "sold_out";
  }

  return "live";
}

export function parseFilterState(
  value: string | undefined,
): MarketplaceStateFilter {
  if (value === "live" || value === "paused" || value === "sold_out") {
    return value;
  }

  return "all";
}

export function matchesQuery(listing: PublicVaultListing, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    listing.nodeCategory,
    listing.nodeLabel,
    ...Object.values(listing.hardwareSummary).map((value) => String(value)),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}
