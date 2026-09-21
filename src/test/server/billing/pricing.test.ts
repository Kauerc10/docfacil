import { describe, expect, it } from "bun:test";
import { planPriceToCents, PLAN_PRICES } from "@/lib/pricing";

describe("Pricing and Canonical Plans", () => {
  it("avulso costs exactly 1990 cents (R$ 19,90)", () => {
    expect(planPriceToCents("avulso")).toBe(1990);
    expect(PLAN_PRICES.avulso).toBe(19.9);
  });

  it("pro costs exactly 3490 cents (R$ 34,90)", () => {
    expect(planPriceToCents("pro")).toBe(3490);
    expect(PLAN_PRICES.pro).toBe(34.9);
  });

  it("gratis costs 0 cents", () => {
    expect(planPriceToCents("gratis")).toBe(0);
    expect(PLAN_PRICES.gratis).toBe(0);
  });
});
