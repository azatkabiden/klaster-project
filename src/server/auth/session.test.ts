import { describe, expect, it } from "vitest";
import {
  type AppSession,
  createAuthChallengeToken,
  createSessionToken,
  readAuthChallengeToken,
  readSessionToken,
} from "@/server/auth/session";

describe("session token helpers", () => {
  it("round-trips an app session payload", async () => {
    process.env.SESSION_SECRET =
      "test-session-secret-that-is-long-enough-for-local-verification";

    const session: AppSession = {
      profileId: crypto.randomUUID(),
      regionCode: "KZ",
      role: "operator",
      walletAddress: "wallet-address",
    };
    const token = await createSessionToken(session);

    await expect(readSessionToken(token)).resolves.toEqual(session);
  });

  it("round-trips an auth challenge payload", async () => {
    process.env.SESSION_SECRET =
      "test-session-secret-that-is-long-enough-for-local-verification";

    const token = await createAuthChallengeToken({
      expirationTime: new Date(Date.now() + 60_000).toISOString(),
      message: "sign me",
      nonce: "abc123",
      statement: "Sign in",
      walletAddress: "wallet-address",
    });

    await expect(readAuthChallengeToken(token)).resolves.toMatchObject({
      message: "sign me",
      nonce: "abc123",
      statement: "Sign in",
      walletAddress: "wallet-address",
    });
  });
});
