import { beforeEach, describe, expect, it, vi } from "vitest";

type MockResult = {
  data: unknown;
  error: { code?: string; message: string } | null;
};

type MockOperationKey =
  | "insert-single"
  | "select-maybeSingle"
  | "update-eq"
  | "upsert";

type RecordedOperation = {
  filters?: Array<{ column: string; value: unknown }>;
  operation: MockOperationKey;
  options?: unknown;
  payload?: unknown;
  table: string;
};

const operationQueues = new Map<string, MockResult[]>();
const recordedOperations: RecordedOperation[] = [];

function queueResult(
  table: string,
  operation: MockOperationKey,
  result: MockResult,
) {
  const key = `${table}:${operation}`;
  const queue = operationQueues.get(key) ?? [];

  queue.push(result);
  operationQueues.set(key, queue);
}

function ok(data: unknown): MockResult {
  return {
    data,
    error: null,
  };
}

function takeResult(table: string, operation: MockOperationKey) {
  const key = `${table}:${operation}`;
  const queue = operationQueues.get(key);

  if (!queue?.length) {
    throw new Error(`No queued Supabase mock result for ${key}.`);
  }

  const result = queue.shift();

  if (!result) {
    throw new Error(`Supabase mock queue underflow for ${key}.`);
  }

  return result;
}

function createMockQuery(table: string) {
  const filters: Array<{ column: string; value: unknown }> = [];
  let pendingPayload: unknown;
  let pendingOperation: "insert" | "select" | "update" | null = null;

  const query = {
    eq(column: string, value: unknown) {
      filters.push({ column, value });

      if (pendingOperation === "update") {
        recordedOperations.push({
          filters: [...filters],
          operation: "update-eq",
          payload: pendingPayload,
          table,
        });

        return Promise.resolve(takeResult(table, "update-eq"));
      }

      return query;
    },
    insert(payload: unknown) {
      pendingOperation = "insert";
      pendingPayload = payload;

      return query;
    },
    maybeSingle() {
      recordedOperations.push({
        filters: [...filters],
        operation: "select-maybeSingle",
        table,
      });

      return Promise.resolve(takeResult(table, "select-maybeSingle"));
    },
    select() {
      pendingOperation = "select";

      return query;
    },
    single() {
      recordedOperations.push({
        filters: [...filters],
        operation: "insert-single",
        payload: pendingPayload,
        table,
      });

      return Promise.resolve(takeResult(table, "insert-single"));
    },
    update(payload: unknown) {
      pendingOperation = "update";
      pendingPayload = payload;

      return query;
    },
    upsert(payload: unknown, options: unknown) {
      recordedOperations.push({
        operation: "upsert",
        options,
        payload,
        table,
      });

      return Promise.resolve(takeResult(table, "upsert"));
    },
  };

  return query;
}

vi.mock("@/server/supabase/service-role", () => ({
  createSupabaseServiceRoleClient: () => ({
    from: (table: string) => createMockQuery(table),
  }),
}));

import {
  getHeliusProviderEventId,
  ingestHeliusWebhook,
  isHeliusAuthorizationValid,
  parseHeliusWebhookPayload,
} from "@/server/helius/webhooks";

beforeEach(() => {
  operationQueues.clear();
  recordedOperations.length = 0;
});

describe("helius webhook helpers", () => {
  it("validates the echoed authorization header", () => {
    process.env.HELIUS_WEBHOOK_SECRET = "Bearer local-helius-secret";

    expect(isHeliusAuthorizationValid("Bearer local-helius-secret")).toBe(true);
    expect(isHeliusAuthorizationValid("Bearer invalid-secret")).toBe(false);
  });

  it("normalizes single payloads into an array", () => {
    const payload = parseHeliusWebhookPayload({
      signature: "abc123",
      type: "transaction",
    });

    expect(payload).toEqual([
      {
        signature: "abc123",
        type: "transaction",
      },
    ]);
  });

  it("falls back to a payload hash when the webhook has no signature", async () => {
    const providerEventId = await getHeliusProviderEventId({
      type: "transaction",
    });

    expect(providerEventId).toMatch(/^[a-f0-9]{64}$/);
  });

  it("persists expanded deposit payloads into the split revenue columns", async () => {
    const vaultId = crypto.randomUUID();

    queueResult("webhook_events", "select-maybeSingle", ok(null));
    queueResult(
      "webhook_events",
      "insert-single",
      ok({
        id: "event-1",
        processed_at: null,
      }),
    );
    queueResult("revenue_deposits", "upsert", ok(null));
    queueResult("webhook_events", "update-eq", ok(null));

    const result = await ingestHeliusWebhook({
      events: {
        klasterai: {
          grossAmountUsdc: 1200,
          kind: "deposit",
          netAmountUsdc: 1080,
          platformFeeAmountUsdc: 120,
          revenueIndexAfter: 8,
          vaultId,
        },
      },
      signature: "sig-expanded",
      timestamp: 1_744_017_600,
      type: "transaction",
    });

    expect(result).toEqual({
      accepted: 1,
      deduped: 0,
    });
    expect(
      recordedOperations.find(
        (operation) =>
          operation.table === "revenue_deposits" &&
          operation.operation === "upsert",
      ),
    ).toMatchObject({
      payload: {
        created_at: "2025-04-07T09:20:00.000Z",
        gross_amount_usdc: 1200,
        net_amount_usdc: 1080,
        platform_fee_amount_usdc: 120,
        revenue_index_after: 8,
        signature: "sig-expanded",
        vault_id: vaultId,
      },
    });
  });

  it("maps legacy deposit payloads to gross/net parity with zero platform fee", async () => {
    const vaultId = crypto.randomUUID();

    queueResult("webhook_events", "select-maybeSingle", ok(null));
    queueResult(
      "webhook_events",
      "insert-single",
      ok({
        id: "event-2",
        processed_at: null,
      }),
    );
    queueResult("revenue_deposits", "upsert", ok(null));
    queueResult("webhook_events", "update-eq", ok(null));

    await ingestHeliusWebhook({
      events: {
        klasterai: {
          amountUsdc: 640,
          kind: "deposit",
          revenueIndexAfter: 3,
          vaultId,
        },
      },
      signature: "sig-legacy",
      timestamp: 1_744_017_600,
      type: "transaction",
    });

    expect(
      recordedOperations.find(
        (operation) =>
          operation.table === "revenue_deposits" &&
          operation.operation === "upsert",
      ),
    ).toMatchObject({
      payload: {
        gross_amount_usdc: 640,
        net_amount_usdc: 640,
        platform_fee_amount_usdc: 0,
        revenue_index_after: 3,
        signature: "sig-legacy",
        vault_id: vaultId,
      },
    });
  });

  it("dedupes already processed webhook deliveries by signature", async () => {
    queueResult(
      "webhook_events",
      "select-maybeSingle",
      ok({
        id: "event-3",
        processed_at: "2026-04-07T12:00:00.000Z",
      }),
    );

    const result = await ingestHeliusWebhook({
      events: {
        klasterai: {
          amountUsdc: 250,
          kind: "deposit",
          revenueIndexAfter: 2,
          vaultId: crypto.randomUUID(),
        },
      },
      signature: "sig-deduped",
      type: "transaction",
    });

    expect(result).toEqual({
      accepted: 1,
      deduped: 1,
    });
    expect(
      recordedOperations.find(
        (operation) => operation.table === "revenue_deposits",
      ),
    ).toBeUndefined();
  });
});
