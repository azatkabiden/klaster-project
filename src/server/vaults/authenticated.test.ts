import { afterEach, describe, expect, it } from "vitest";
import type { AppSession } from "@/server/auth/session";
import {
  getAdminReviewDetailPageData,
  getAdminReviewQueuePageData,
  getPortfolioPageData,
} from "@/server/vaults/authenticated";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const demoAdminSession: AppSession = {
  profileId: "demo-admin-profile",
  regionCode: "KZ",
  role: "admin",
  walletAddress: "demo-admin-wallet",
};

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
});

describe("authenticated workspace demo gating", () => {
  it("keeps the admin queue on seeded data for demo admin sessions even when live runtime exists", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const result = await getAdminReviewQueuePageData(demoAdminSession);

    expect(result.source).toBe("seeded");
    expect(result.state).toBe("seeded_demo");
    expect(
      result.rows.some((row) => row.slug === "pending-orbit-lattice"),
    ).toBe(true);
  });

  it("keeps the admin detail route on seeded data for demo admin sessions even when live runtime exists", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const result = await getAdminReviewDetailPageData(
      "pending-orbit-lattice",
      demoAdminSession,
    );

    expect(result.source).toBe("seeded");
    expect(result.state).toBe("seeded_demo");
    expect(result.review?.slug).toBe("pending-orbit-lattice");
  });

  it("keeps seeded portfolio data fee-aware for demo sessions", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    const result = await getPortfolioPageData({
      profileId: "demo-investor-profile",
      regionCode: "KZ",
      role: "investor",
      walletAddress: "demo-investor-wallet",
    });

    expect(result.source).toBe("seeded");
    expect(result.summary.totalPlatformFeesUsdc).toBeGreaterThan(0);
    expect(
      result.holdings.some(
        (holding) => holding.assetOrigin === "klaster_managed",
      ),
    ).toBe(true);
  });
});
