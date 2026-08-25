import { describe, expect, it } from "bun:test";
import {
  activateProSubscription,
  addBillingMonth,
  cancelProSubscription,
  failProRenewal,
  renewProSubscription,
} from "@/lib/server/billing/subscription-lifecycle";
import { hasCurrentProAccess } from "@/lib/server/billing/subscription";

const baseInput = {
  userId: "usr_pro",
  providerSubscriptionId: "sub_1",
  providerCheckoutId: "bill_1",
  providerProductId: "prod_pro",
  paymentId: "pay_1",
  amountCents: 3990 as const,
};

describe("ciclo mensal da assinatura Pro", () => {
  it("usa mes civil para fevereiro comum, bissexto e dia 31", () => {
    expect(addBillingMonth(Date.UTC(2025, 0, 31, 12))).toBe(
      Date.UTC(2025, 1, 28, 12)
    );
    expect(addBillingMonth(Date.UTC(2024, 0, 31, 12))).toBe(
      Date.UTC(2024, 1, 29, 12)
    );
    expect(addBillingMonth(Date.UTC(2026, 7, 31, 12))).toBe(
      Date.UTC(2026, 8, 30, 12)
    );
  });

  it("ativa Pro somente pelo periodo pago e registra auto renovacao", () => {
    const paidAt = Date.UTC(2026, 7, 24, 19, 0, 0);
    const subscription = activateProSubscription({ ...baseInput, paidAt });

    expect(subscription.status).toBe("active");
    expect(subscription.autoRenew).toBe(true);
    expect(subscription.lastPaidAt).toBe(paidAt);
    expect(subscription.paidThrough).toBe(Date.UTC(2026, 8, 24, 19, 0, 0));
    expect(hasCurrentProAccess(subscription, paidAt + 1)).toBe(true);
  });

  it("renovacao antecipada estende a partir do paidThrough sem roubar dias", () => {
    const firstPaidAt = Date.UTC(2026, 7, 31, 10, 0, 0);
    const current = activateProSubscription({ ...baseInput, paidAt: firstPaidAt });
    const earlyRenewalAt = Date.UTC(2026, 8, 28, 10, 0, 0);

    const renewed = renewProSubscription(current, {
      paymentId: "pay_2",
      paidAt: earlyRenewalAt,
    });

    expect(current.paidThrough).toBe(Date.UTC(2026, 8, 30, 10, 0, 0));
    expect(renewed.paidThrough).toBe(Date.UTC(2026, 9, 30, 10, 0, 0));
    expect(renewed.lastPaymentId).toBe("pay_2");
    expect(renewed.status).toBe("active");
  });

  it("falha de renovacao nao corta acesso antes do fim do periodo ja pago", () => {
    const paidAt = Date.UTC(2026, 7, 24, 19, 0, 0);
    const current = activateProSubscription({ ...baseInput, paidAt });
    const failedAt = Date.UTC(2026, 8, 20, 12, 0, 0);

    const failed = failProRenewal(current, failedAt);

    expect(failed.status).toBe("past_due");
    expect(failed.lastFailureAt).toBe(failedAt);
    expect(hasCurrentProAccess(failed, failedAt)).toBe(true);
    expect(hasCurrentProAccess(failed, current.paidThrough)).toBe(false);
  });

  it("cancelamento desliga auto renovacao mas preserva acesso ate paidThrough", () => {
    const paidAt = Date.UTC(2026, 7, 24, 19, 0, 0);
    const current = activateProSubscription({ ...baseInput, paidAt });
    const cancelledAt = Date.UTC(2026, 8, 1, 10, 0, 0);

    const cancelled = cancelProSubscription(current, cancelledAt);

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.autoRenew).toBe(false);
    expect(cancelled.paidThrough).toBe(current.paidThrough);
    expect(hasCurrentProAccess(cancelled, cancelledAt)).toBe(true);
    expect(hasCurrentProAccess(cancelled, current.paidThrough)).toBe(false);
  });
});
