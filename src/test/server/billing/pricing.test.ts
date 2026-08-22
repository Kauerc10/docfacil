import { describe, expect, it } from "bun:test";
import { planPriceToCents, PLAN_PRICES } from "@/lib/pricing";

describe("Pricing and Canonical Plans", () => {
  it("avulso costs exactly 1990 cents (R$ 19,90)", () => {
    expect(planPriceToCents("avulso")).toBe(1990);
    expect(PLAN_PRICES.avulso).toBe(19.9);
  });

  it("pro costs exactly 3990 cents (R$ 39,90)", () => {
    expect(planPriceToCents("pro")).toBe(3990);
    expect(PLAN_PRICES.pro).toBe(39.9);
  });

  it("gratis costs 0 cents", () => {
    expect(planPriceToCents("gratis")).toBe(0);
    expect(PLAN_PRICES.gratis).toBe(0);
  });
});
