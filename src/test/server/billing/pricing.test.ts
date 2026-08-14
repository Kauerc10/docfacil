import { describe, expect, it } from "bun:test";
import { planPriceToCents, PLAN_PRICES, type Plan } from "@/lib/pricing";

describe("Pricing and Canonical Plans", () => {
  it("avulso costs exactly 990 cents (R$ 9,90)", () => {
    expect(planPriceToCents("avulso")).toBe(990);
    expect(PLAN_PRICES.avulso).toBe(9.9);
  });

  it("pro costs exactly 2490 cents (R$ 24,90)", () => {
    expect(planPriceToCents("pro")).toBe(2490);
    expect(PLAN_PRICES.pro).toBe(24.9);
  });

  it("gratis costs 0 cents", () => {
    expect(planPriceToCents("gratis")).toBe(0);
    expect(PLAN_PRICES.gratis).toBe(0);
  });
});
