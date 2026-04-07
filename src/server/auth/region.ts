import { getServerEnv } from "@/lib/env";
import { AppError } from "@/server/http/errors";

const REGION_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
  "x-region-code",
] as const;

export function resolveRegionCode(
  headers: Headers,
  fallbackRegionCode?: string | null,
) {
  for (const headerName of REGION_HEADERS) {
    const value = headers.get(headerName)?.trim().toUpperCase();

    if (value) {
      return value;
    }
  }

  return fallbackRegionCode?.trim().toUpperCase() || null;
}

export function assertRegionAllowed(
  headers: Headers,
  fallbackRegionCode?: string,
) {
  const regionCode = resolveRegionCode(headers, fallbackRegionCode);
  const blockedRegions = getServerEnv()
    .appRegionBlocklist.split(",")
    .map((region) => region.trim().toUpperCase())
    .filter(Boolean);

  if (regionCode && blockedRegions.includes(regionCode)) {
    throw new AppError(
      451,
      `Access from region ${regionCode} is blocked for this release.`,
    );
  }

  return regionCode;
}
