import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockQueryResult = {
  data: unknown;
  error: { message: string } | null;
};

const queryQueues = new Map<string, MockQueryResult[]>();

function queueTableResult(table: string, result: MockQueryResult) {
  const queue = queryQueues.get(table) ?? [];
  queue.push(result);
  queryQueues.set(table, queue);
}

function ok(data: unknown): MockQueryResult {
  return {
    data,
    error: null,
  };
}

function createMockSupabaseQuery(result: MockQueryResult) {
  const query = Promise.resolve(result) as Promise<MockQueryResult> & {
    eq: () => typeof query;
    in: () => typeof query;
    order: () => typeof query;
    select: () => typeof query;
  };

  query.eq = () => query;
  query.in = () => query;
  query.order = () => query;
  query.select = () => query;

  return query;
}

vi.mock("@/server/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: () => ({
    from: (table: string) => {
      const queue = queryQueues.get(table);

      if (!queue?.length) {
        throw new Error(
          `No queued mock Supabase response for table "${table}".`,
        );
      }

      const result = queue.shift();

      if (!result) {
        throw new Error(
          `Mock Supabase response queue underflow for "${table}".`,
        );
      }

      return createMockSupabaseQuery(result);
    },
  }),
}));

import { getPortfolioPageData } from "@/server/vaults/authenticated";
import { getPublicVaultDetailPageData } from "@/server/vaults/public";

const originalEnv = {
  nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

beforeEach(() => {
  queryQueues.clear();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
});

afterEach(() => {
  queryQueues.clear();
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.nextPublicSupabaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.supabaseServiceRoleKey;
});

describe("live read-model regressions", () => {
  it("pro-rates live portfolio revenue metrics to the holder share of sold supply", async () => {
    queueTableResult(
      "purchases",
      ok([
        {
          created_at: "2026-04-07T08:00:00.000Z",
          id: "purchase-1",
          shares: 25,
          usdc_amount: 250,
          vault_id: "vault-1",
        },
      ]),
    );
    queueTableResult("claims", ok([]));
    queueTableResult(
      "vaults",
      ok([
        {
          asset_origin: "operator_listed",
          id: "vault-1",
          node_category: "GPU Cluster",
          node_label: "Vault One",
          share_price_usdc: 10,
          slug: "vault-one",
          status: "verified",
        },
      ]),
    );
    queueTableResult("purchases", ok([{ shares: 100, vault_id: "vault-1" }]));
    queueTableResult(
      "revenue_deposits",
      ok([
        {
          created_at: "2026-04-07T09:00:00.000Z",
          gross_amount_usdc: 2000,
          id: "deposit-1",
          net_amount_usdc: 1800,
          platform_fee_amount_usdc: 200,
          vault_id: "vault-1",
        },
      ]),
    );

    const result = await getPortfolioPageData({
      profileId: "live-investor-profile",
      regionCode: "KZ",
      role: "investor",
      walletAddress: "live-investor-wallet",
    });

    expect(result.source).toBe("live");
    expect(result.state).toBe("live_ready");
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0]).toMatchObject({
      claimableUsdc: 450,
      grossRevenueUsdc: 500,
      investorNetRevenueUsdc: 450,
      platformFeePaidUsdc: 50,
      sharesOwned: 25,
    });
    expect(result.summary).toMatchObject({
      grossRevenueUsdc: 500,
      investorNetRevenueUsdc: 450,
      totalPlatformFeesUsdc: 50,
    });
  });

  it("hydrates the live task stream from indexed telemetry rows", async () => {
    queueTableResult(
      "vaults",
      ok([
        {
          asset_origin: "klaster_managed",
          campaign_raised_usdc: 150000,
          campaign_target_usdc: 250000,
          hardware_summary: {},
          id: "vault-1",
          node_category: "GPU Cluster",
          node_label: "Vault One",
          onchain_vault_address: null,
          platform_fee_bps: 1000,
          proof_bundle_hash: "proof-hash",
          public_metadata_hash: "meta-hash",
          public_share_supply: 100,
          routing_summary: {
            activeProvider: "io.net",
            explanation: "Live provider ingest is active.",
            mode: "smart_auto_routing",
            status: "live_ready",
          },
          share_price_usdc: 10,
          slug: "vault-one",
          status: "verified",
          total_shares: 200,
          valuation_usdc: 2000,
          verification_summary: {
            notes: "Reviewed",
            reviewedAt: "2026-04-07T08:00:00.000Z",
            reviewedBy: "admin",
          },
          verified_at: "2026-04-07T08:00:00.000Z",
          yield_source_summary: [],
        },
      ]),
    );
    queueTableResult("health_snapshots", ok([]));
    queueTableResult("purchases", ok([]));
    queueTableResult("revenue_deposits", ok([]));
    queueTableResult(
      "vault_task_stream_events",
      ok([
        {
          id: "event-2",
          logged_at: "2026-04-07T09:05:00.000Z",
          message: "Training queue accepted by provider lane B.",
          reward_delta_usdc: 12.5,
          source: "provider_ingest",
          status: "training",
          vault_id: "vault-1",
        },
        {
          id: "event-1",
          logged_at: "2026-04-07T09:00:00.000Z",
          message: "Routing warm-up started.",
          reward_delta_usdc: null,
          source: "seeded_demo",
          status: "routing",
          vault_id: "vault-1",
        },
      ]),
    );

    const result = await getPublicVaultDetailPageData("vault-one");

    expect(result.source).toBe("live");
    expect(result.state).toBe("live_ready");
    expect(result.vault?.taskStream).toEqual([
      {
        id: "event-2",
        loggedAt: "2026-04-07T09:05:00.000Z",
        message: "Training queue accepted by provider lane B.",
        rewardDeltaUsdc: 12.5,
        source: "provider_ingest",
        status: "training",
      },
      {
        id: "event-1",
        loggedAt: "2026-04-07T09:00:00.000Z",
        message: "Routing warm-up started.",
        rewardDeltaUsdc: null,
        source: "seeded_demo",
        status: "routing",
      },
    ]);
  });
});
