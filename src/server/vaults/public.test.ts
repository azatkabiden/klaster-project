import { describe, expect, it } from "vitest";
import {
  getAllVaultDetails,
  getPublicVaultDetailPageData,
} from "@/server/vaults/public";

describe("public vault read model state handling", () => {
  it("uses seeded demo data only when the live read runtime is unavailable", async () => {
    const result = await getAllVaultDetails({
      hasSupabaseReadRuntime: false,
    });

    expect(result.source).toBe("seeded");
    expect(result.state).toBe("seeded_demo");
    const demoVault = result.vaults.find(
      (vault) => vault.slug === "demo-vault",
    );

    expect(demoVault).toBeDefined();
    expect(demoVault?.assetOrigin).toBe("klaster_managed");
    expect(demoVault?.routingSummary.mode).toBe("smart_auto_routing");
    expect(demoVault?.taskStream.length).toBeGreaterThan(0);
    expect(demoVault?.feeSummary.platformFeesCollectedUsdc).toBeGreaterThan(0);
  });

  it("preserves an empty live marketplace instead of falling back to demo data", async () => {
    const result = await getAllVaultDetails({
      hasSupabaseReadRuntime: true,
      loadLiveListings: async () => [],
    });

    expect(result.source).toBe("live");
    expect(result.state).toBe("live_empty");
    expect(result.vaults).toEqual([]);
  });

  it("falls back to seeded demo data when the live read fails", async () => {
    const result = await getAllVaultDetails({
      hasSupabaseReadRuntime: true,
      loadLiveListings: async () => {
        throw new Error("temporary outage");
      },
    });

    expect(result.source).toBe("seeded");
    expect(result.state).toBe("seeded_demo");
    expect(result.errorMessage).toContain("temporary outage");
    expect(result.vaults.some((vault) => vault.slug === "demo-vault")).toBe(
      true,
    );
  });

  it("does not expose seeded demo vault slugs when the live market is empty", async () => {
    const result = await getPublicVaultDetailPageData("demo-vault", {
      hasSupabaseReadRuntime: true,
      loadLiveListings: async () => [],
    });

    expect(result.state).toBe("live_empty");
    expect(result.vault).toBeNull();
  });
});
