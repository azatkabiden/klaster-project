import { describe, expect, it } from "vitest";
import {
  getInitialShareAmount,
  validatePurchaseQuantity,
} from "@/components/vaults/purchase-panel-logic";

describe("purchase panel quantity validation", () => {
  it("prefills with the lower of 100 shares or the available supply", () => {
    expect(getInitialShareAmount(400)).toBe("100");
    expect(getInitialShareAmount(12)).toBe("12");
    expect(getInitialShareAmount(0)).toBe("");
  });

  it("accepts valid whole-number quantities", () => {
    expect(validatePurchaseQuantity("5", 100, 98)).toEqual({
      estimatedCostUsdc: 490,
      kind: "valid",
      shares: 5,
    });
  });

  it("rejects empty, zero, fractional, and oversized quantities", () => {
    expect(validatePurchaseQuantity("", 100, 98)).toMatchObject({
      kind: "invalid",
      reason: "empty",
    });
    expect(validatePurchaseQuantity("0", 100, 98)).toMatchObject({
      kind: "invalid",
      reason: "too_low",
    });
    expect(validatePurchaseQuantity("3.5", 100, 98)).toMatchObject({
      kind: "invalid",
      reason: "not_integer",
    });
    expect(validatePurchaseQuantity("101", 100, 98)).toMatchObject({
      kind: "invalid",
      reason: "too_high",
    });
  });
});
