import { describe, expect, it } from "bun:test";
import { InMemoryBillingSubscriptionsRepository, InMemoryBillingWebhookEventsRepository, InMemoryOrdersRepository } from "@/lib/server/firestore/in-memory-repositories";
import type { BillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { cancelMercadoPagoSubscription, continueMercadoPagoSubscription } from "@/lib/server/billing/mercadopago/subscription-management";

function fixture(): BillingRepositories {
  return { orders: new InMemoryOrdersRepository(true), subscriptions: new InMemoryBillingSubscriptionsRepository(true), webhookEvents: new InMemoryBillingWebhookEventsRepository(true) };
}

async function seed(repos: BillingRepositories) {
  await repos.subscriptions.upsert({
    userId: "user-sub",
    provider: "mercadopago",
    providerSubscriptionId: "preapproval-1",
    providerProductId: "pro",
    product: "pro",
    method: "card",
    status: "active",
    autoRenew: true,
    amountCents: 3990,
    paidThrough: Date.UTC(2026, 9, 24),
    lastPaidAt: Date.UTC(2026, 8, 24),
    lastPaymentId: "payment-1",
    createdAt: Date.UTC(2026, 8, 24),
    updatedAt: Date.UTC(2026, 8, 24),
  });
}

describe("Mercado Pago subscription management", () => {
  it("cancels external renewal and preserves paidThrough", async () => {
    const repos = fixture();
    await seed(repos);
    let calls = 0;
    const result = await cancelMercadoPagoSubscription({
      userId: "user-sub",
      repos,
      provider: { cancelSubscription: async ({ providerSubscriptionId }) => { expect(providerSubscriptionId).toBe("preapproval-1"); calls++; } },
      now: Date.UTC(2026, 8, 25),
    });
    expect(calls).toBe(1);
    expect(result.paidThrough).toBe(Date.UTC(2026, 9, 24));
    expect((await repos.subscriptions.getByUserId("user-sub"))?.autoRenew).toBe(false);
  });

  it("fails safe when continuing a cancelled subscription would require a new authorization", async () => {
    const repos = fixture();
    await seed(repos);
    const current = await repos.subscriptions.getByUserId("user-sub");
    await repos.subscriptions.upsert({ ...current!, status: "cancelled", autoRenew: false });
    await expect(continueMercadoPagoSubscription({ userId: "user-sub", repos })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("persists cancellation intent when provider cancellation fails", async () => {
    const repos = fixture();
    await seed(repos);
    await expect(cancelMercadoPagoSubscription({
      userId: "user-sub",
      repos,
      provider: { cancelSubscription: async () => { throw new Error("provider timeout"); } },
      now: Date.UTC(2026, 8, 25),
    })).rejects.toThrow("provider timeout");
    expect((await repos.subscriptions.getByUserId("user-sub"))?.cancellationRequestStatus).toBe("requested");
    expect((await repos.subscriptions.getByUserId("user-sub"))?.autoRenew).toBe(true);
  });

  it("applies a legitimately paid cancelled-period cycle once without re-enabling renewal", async () => {
    const repos = fixture();
    await seed(repos);
    await repos.subscriptions.upsert({ ...(await repos.subscriptions.getByUserId("user-sub"))!, status: "cancelled", autoRenew: false });
    const input = { userId: "user-sub", providerSubscriptionId: "preapproval-1", paidAt: Date.UTC(2026, 9, 24), cycleId: "invoice-2" };
    const first = await repos.subscriptions.renewWithPayment({ ...input, paymentId: "payment-2" });
    const duplicateDifferentPayment = await repos.subscriptions.renewWithPayment({ ...input, paymentId: "payment-2-retry" });
    expect(first.applied).toBe(true);
    expect(duplicateDifferentPayment.applied).toBe(false);
    expect(first.subscription.status).toBe("cancelled");
    expect(first.subscription.autoRenew).toBe(false);
  });
});
