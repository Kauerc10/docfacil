import { describe, expect, it } from "bun:test";
import { InMemoryBillingSubscriptionsRepository, InMemoryBillingWebhookEventsRepository, InMemoryOrdersRepository } from "@/lib/server/firestore/in-memory-repositories";
import type { BillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { reconcileMercadoPagoPayment, reconcileMercadoPagoWebhookEvent } from "@/lib/server/billing/mercadopago/reconcile";

function repos(): BillingRepositories {
  return { orders: new InMemoryOrdersRepository(true), subscriptions: new InMemoryBillingSubscriptionsRepository(true), webhookEvents: new InMemoryBillingWebhookEventsRepository(true) };
}

describe("Mercado Pago authoritative reconciliation", () => {
  it("confirms an approved avulso only after validating seller, amount, currency and reference", async () => {
    const repository = repos();
    const order = await repository.orders.createOrder({ provider: "mercadopago", product: "avulso", amountCents: 1990, buyer: { type: "guest", email: "buyer@example.com" }, status: "pending", createdAt: Date.now() });
    const result = await reconcileMercadoPagoPayment("pay-1", {
      repos: repository,
      applyAvulsoPayment: async (id) => { await repository.orders.markOrderPaid(id); return { primary: true, applied: true }; },
      collectorId: "12345",
      environment: "test",
      now: () => Date.UTC(2026, 7, 24),
      provider: {
        getPayment: async () => ({ id: "pay-1", status: "approved", live_mode: false, collector_id: "12345", currency_id: "BRL", transaction_amount: 19.9, payment_method_id: "pix", payment_type_id: "bank_transfer", date_approved: "2026-08-24T00:00:00.000Z", external_reference: order.id }),
        getAuthorizedPayment: async () => ({}),
        getSubscription: async () => ({ id: "sub", status: "authorized" }),
      },
    });
    expect(result).toMatchObject({ kind: "avulso", applied: true });
    expect((await repository.orders.getOrder(order.id!))?.status).toBe("paid");
  });

  it("ignores non-approved updates without marking the order paid", async () => {
    const repository = repos();
    const order = await repository.orders.createOrder({ provider: "mercadopago", product: "avulso", amountCents: 1990, buyer: { type: "guest", email: "buyer@example.com" }, status: "pending", createdAt: Date.now() });
    const result = await reconcileMercadoPagoWebhookEvent("payment.updated", "pay-pending", {
      repos: repository,
      collectorId: "12345",
      environment: "test",
      now: Date.now,
      provider: {
        getPayment: async () => ({ id: "pay-pending", status: "pending", external_reference: order.id }),
        getAuthorizedPayment: async () => ({}),
        getSubscription: async () => ({ id: "sub", status: "authorized" }),
      },
    });
    expect(result.ignored).toBe(true);
    expect((await repository.orders.getOrder(order.id!))?.status).toBe("pending");
  });

  it.each([
    ["wrong seller", { collector_id: "another" }],
    ["wrong currency", { currency_id: "USD" }],
    ["wrong amount", { transaction_amount: 1 }],
    ["wrong environment", { live_mode: true }],
    ["wrong resource", { id: "different" }],
    ["missing approval date", { date_approved: undefined }],
    ["debit card", { payment_method_id: "visa", payment_type_id: "debit_card" }],
  ])("rejects %s before applying any financial effect", async (_label, invalid) => {
    const repository = repos();
    const order = await repository.orders.createOrder({ provider: "mercadopago", product: "avulso", amountCents: 1990, buyer: { type: "guest", email: "buyer@example.com" }, status: "pending", createdAt: Date.now() });
    let applied = false;
    await expect(reconcileMercadoPagoPayment("payment-1", {
      repos: repository, collectorId: "12345", environment: "test", now: Date.now,
      applyAvulsoPayment: async () => { applied = true; return { primary: true, applied: true }; },
      provider: {
        getPayment: async () => ({ id: "payment-1", status: "approved", live_mode: false, collector_id: "12345", currency_id: "BRL", transaction_amount: 19.9, payment_method_id: "pix", date_approved: "2026-10-20T12:00:00Z", external_reference: order.id, ...invalid }),
        getAuthorizedPayment: async () => ({}), getSubscription: async () => ({ id: "sub" }),
      },
    })).rejects.toMatchObject({ status: 409 });
    expect(applied).toBe(false);
    expect((await repository.orders.getOrder(order.id!))?.status).toBe("pending");
  });

  it("does not deliver again when the financial ledger identifies an excess payment", async () => {
    const repository = repos();
    const order = await repository.orders.createOrder({ provider: "mercadopago", product: "avulso", amountCents: 1990, buyer: { type: "guest", email: "buyer@example.com" }, status: "consumed", createdAt: Date.now() });
    let delivered = false;
    const result = await reconcileMercadoPagoPayment("excess-1", {
      repos: repository, collectorId: "12345", environment: "test", now: Date.now,
      applyAvulsoPayment: async () => ({ primary: false, applied: false }),
      onPaid: async () => { delivered = true; },
      provider: {
        getPayment: async () => ({ id: "excess-1", status: "approved", live_mode: false, collector_id: "12345", currency_id: "BRL", transaction_amount: 19.9, payment_method_id: "pix", date_approved: "2026-10-20T12:00:00Z", external_reference: order.id }),
        getAuthorizedPayment: async () => ({}), getSubscription: async () => ({ id: "sub" }),
      },
    });
    expect(result).toMatchObject({ applied: false });
    expect(delivered).toBe(false);
  });
});
