import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import {
  getDemoSessionForRole,
  requireCurrentSession,
} from "@/server/auth/guards";
import type { AppError } from "@/server/http/errors";

describe("requireCurrentSession", () => {
  beforeEach(() => {
    vi.mocked(cookies).mockReset();
    process.env.SESSION_SECRET = "";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  });

  it("rejects privileged access when no session cookie exists even in demo mode", async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(requireCurrentSession(["admin"])).rejects.toMatchObject({
      message: "Authentication is required.",
    } satisfies Partial<AppError>);
  });

  it("keeps demo sessions enabled when live auth runtime is incomplete", () => {
    process.env.SESSION_SECRET =
      "test-session-secret-that-is-long-enough-for-local-verification";

    expect(getDemoSessionForRole("admin")).toMatchObject({
      profileId: "demo-admin-profile",
      role: "admin",
    });
  });

  it("disables demo sessions when full live auth runtime is available", () => {
    process.env.SESSION_SECRET =
      "test-session-secret-that-is-long-enough-for-local-verification";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    expect(getDemoSessionForRole("admin")).toBeNull();
  });
});
