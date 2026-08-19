import { describe, expect, it } from "bun:test";
import { resolveEntitlement, FREE_MONTHLY_LIMIT } from "./entitlement";
import { BackendError } from "../errors";
import type { OrderRecord } from "../domain/documents";

describe("resolveEntitlement", () => {
  it("resolves guest with paid order as single_purchase without watermark", () => {
    const order: OrderRecord = {
      id: "ord_123",
      provider: "demo",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "guest@example.com" },
      status: "paid",
      createdAt: Date.now(),
    };

    const decision = resolveEntitlement({
      principal: { type: "guest" },
      orderId: "ord_123",
      order,
    });

    expect(decision).toEqual({
      entitlement: "single_purchase",
      watermarked: false,
      orderId: "ord_123",
    });
  });

  it("throws PAYMENT_REQUIRED when guest provides no order", () => {
    expect(() =>
      resolveEntitlement({
        principal: { type: "guest" },
      })
    ).toThrow(BackendError);

    try {
      resolveEntitlement({ principal: { type: "guest" } });
    } catch (err: any) {
      expect(err.code).toBe("PAYMENT_REQUIRED");
      expect(err.status).toBe(402);
    }
  });

  it("throws ORDER_NOT_PAID when order is pending or failed", () => {
    const pendingOrder: OrderRecord = {
      id: "ord_pending",
      provider: "demo",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest" },
      status: "pending",
      createdAt: Date.now(),
    };

    try {
      resolveEntitlement({
        principal: { type: "guest" },
        orderId: "ord_pending",
        order: pendingOrder,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("ORDER_NOT_PAID");
      expect(err.status).toBe(402);
    }
  });

  it("throws ORDER_ALREADY_CONSUMED when order has already been used", () => {
    const consumedOrder: OrderRecord = {
      id: "ord_consumed",
      provider: "demo",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest" },
      status: "consumed",
      createdAt: Date.now(),
      consumedAt: Date.now(),
    };

    try {
      resolveEntitlement({
        principal: { type: "guest" },
        orderId: "ord_consumed",
        order: consumedOrder,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("ORDER_ALREADY_CONSUMED");
      expect(err.status).toBe(409);
    }
  });

  it("resolves Pro user as pro without watermark and without checking order or monthly count", () => {
    const decision = resolveEntitlement({
      principal: { type: "user", userId: "usr_pro" },
      userProfile: { plano: "pro" },
      currentMonthlyCount: 50,
    });

    expect(decision).toEqual({
      entitlement: "pro",
      watermarked: false,
    });
  });

  it("resolves Free user below limit as free with watermark", () => {
    const decision = resolveEntitlement({
      principal: { type: "user", userId: "usr_free" },
      userProfile: { plano: "gratis" },
      currentMonthlyCount: 1,
    });

    expect(decision).toEqual({
      entitlement: "free",
      watermarked: true,
    });
  });

  it("throws FREE_LIMIT_REACHED when Free user reaches monthly limit", () => {
    try {
      resolveEntitlement({
        principal: { type: "user", userId: "usr_free" },
        userProfile: { plano: "gratis" },
        currentMonthlyCount: FREE_MONTHLY_LIMIT,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("FREE_LIMIT_REACHED");
      expect(err.status).toBe(402);
    }
  });

  it("allows Free user with paid order to generate single_purchase without watermark", () => {
    const order: OrderRecord = {
      id: "ord_user_paid",
      provider: "demo",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "user", userId: "usr_free" },
      status: "paid",
      createdAt: Date.now(),
    };

    const decision = resolveEntitlement({
      principal: { type: "user", userId: "usr_free" },
      userProfile: { plano: "gratis" },
      currentMonthlyCount: FREE_MONTHLY_LIMIT,
      orderId: "ord_user_paid",
      order,
    });

    expect(decision).toEqual({
      entitlement: "single_purchase",
      watermarked: false,
      orderId: "ord_user_paid",
    });
  });

  it("never treats legacy 'avulso' on user profile as Pro", () => {
    const decision = resolveEntitlement({
      principal: { type: "user", userId: "usr_legacy" },
      userProfile: { plano: "avulso" },
      currentMonthlyCount: 0,
    });

    expect(decision.entitlement).toBe("free");
    expect(decision.watermarked).toBe(true);
  });
});
