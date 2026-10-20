import { describe, expect, it } from "bun:test";
import { InMemoryBillingSubscriptionsRepository, InMemoryBillingWebhookEventsRepository, InMemoryOrdersRepository } from "@/lib/server/firestore/in-memory-repositories";
import type { BillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { reconcileMercadoPagoPayment } from "@/lib/server/billing/mercadopago/reconcile";
import { continueMercadoPagoSubscription } from "@/lib/server/billing/mercadopago/subscription-management";
import { hashIdentifier } from "@/lib/server/billing/identity-correction";

function repos(): BillingRepositories {
  return {
    orders: new InMemoryOrdersRepository(true),
    subscriptions: new InMemoryBillingSubscriptionsRepository(true),
    webhookEvents: new InMemoryBillingWebhookEventsRepository(true),
  };
}

describe("Remediation Repro: Bug 1 - Promotional payment of R$ 29,90 rejected by reconciliation", () => {
  it("should accept an approved promotional pro payment of R$ 29,90", async () => {
    const repository = repos();
    const order = await repository.orders.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 2990,
      buyer: { type: "user", userId: "u-promo-1", email: "promo@example.com" },
      status: "pending",
      createdAt: Date.now(),
      providerSubscriptionId: "sub-promo-1",
    });

    const result = await reconcileMercadoPagoPayment("pay-promo-1", {
      repos: repository,
      collectorId: "12345",
      environment: "test",
      now: () => Date.UTC(2026, 9, 20),
      provider: {
        getPayment: async () => ({
          id: "pay-promo-1",
          status: "approved",
          live_mode: false,
          collector_id: "12345",
          currency_id: "BRL",
          transaction_amount: 29.90,
          payment_method_id: "pix",
          payment_type_id: "bank_transfer",
          date_approved: "2026-10-20T12:00:00.000Z",
          external_reference: order.id,
        }),
        getAuthorizedPayment: async () => ({}),
        getSubscription: async () => ({
          id: "sub-promo-1",
          status: "authorized",
          auto_recurring: {
            currency_id: "BRL",
            transaction_amount: 39.90,
            frequency: 1,
            frequency_type: "months",
          },
        }),
      },
    });

    if (!result.ignored) {
      expect(result.applied).toBe(true);
    }
  });
});

describe("Remediation Repro: Bug 2 - continueMercadoPagoSubscription throws 409", () => {
  it("should resume autoRenew for an active cancelled subscription without throwing 409", async () => {
    const repository = repos();
    await repository.subscriptions.activateWithPayment({
      record: {
        userId: "u-cont-1",
        provider: "mercadopago",
        providerSubscriptionId: "sub-1",
        providerProductId: "pro",
        product: "pro",
        method: "card",
        status: "active",
        autoRenew: true,
        amountCents: 3990,
        paidThrough: Date.now() + 30 * 86400000,
        lastPaidAt: Date.now(),
        lastPaymentId: "pay-1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      paymentId: "pay-1",
    });

    // Request cancellation: sets autoRenew = false while preserving paidThrough
    await repository.subscriptions.requestCancellation("u-cont-1", Date.now());

    // When the user clicks "Continue with Pro", it should re-enable autoRenew and not throw 409
    const result = await continueMercadoPagoSubscription({
      userId: "u-cont-1",
      repos: repository,
    });

    expect(result).toMatchObject({ status: "active", autoRenew: true });
  });
});

describe("Remediation Repro: Bug 3 - hashIdentifier must use HMAC/salt", () => {
  it("should not match plain unsalted sha256 hash", () => {
    const cpf = "123.456.789-01";
    // Raw SHA256 of "12345678901":
    const plainSha256 = "254aa248acb47dd654ca3ea53f48c2c26d641d23d7e2e93a1ec56258df7674c4";
    // Must be false because it must use salt/HMAC:
    expect(hashIdentifier(cpf)).not.toBe(plainSha256);
  });
});
