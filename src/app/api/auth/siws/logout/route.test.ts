import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/siws/logout/route";
import {
  CHALLENGE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/server/auth/session";

describe("siws logout route", () => {
  it("clears the session and challenge cookies", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toMatchObject({
      maxAge: 0,
      value: "",
    });
    expect(response.cookies.get(CHALLENGE_COOKIE_NAME)).toMatchObject({
      maxAge: 0,
      value: "",
    });
  });
});
