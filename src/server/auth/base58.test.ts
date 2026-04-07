import { describe, expect, it } from "vitest";
import { decodeBase58 } from "@/server/auth/base58";
import { AppError } from "@/server/http/errors";

describe("decodeBase58", () => {
  it("treats malformed input as a client error", () => {
    expect(() => decodeBase58("0OIl")).toThrow(AppError);
    expect(() => decodeBase58("0OIl")).toThrow("Invalid Base58 value.");
  });
});
