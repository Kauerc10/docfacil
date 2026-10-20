import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { configureAdminFirestore } from "@/lib/server/firebase-admin";
import {
  FirestoreBillingSubscriptionsRepository,
  FirestoreBillingWebhookEventsRepository,
} from "@/lib/server/firestore/billing-repositories";
import { FirestoreOrdersRepository } from "@/lib/server/firestore/repositories";
import { createOrderBuyerPrincipalKey } from "@/lib/server/billing/order-identity";

const enabled = process.env.RUN_FIRESTORE_BILLING_TESTS === "true" && Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!enabled)("Firestore financial transition invariants", () => {
  let app: App;
  let db: Firestore;
  let subscriptions: FirestoreBillingSubscriptionsRepository;
  let events: FirestoreBillingWebhookEventsRepository;
  let orders: FirestoreOrdersRepository;

  beforeAll(() => {
    app = initializeApp({ projectId: "demo-docfacil-billing-invariants" }, "billing-invariants-emulator-test");
    db = configureAdminFirestore(getFirestore(app));
    subscriptions = new FirestoreBillingSubscriptionsRepository(db);
    events = new FirestoreBillingWebhookEventsRepository(db);
    orders = new FirestoreOrdersRepository(db);
  });

  beforeEach(async () => {
    for (const collection of ["billing_subscriptions", "billing_webhook_events", "orders"]) {
      // Recursive deletion is required because payment effects live in a
      // subcollection under each billing subscription. A parent-only delete
      // leaves stale effect IDs and makes a second test run non-repeatable.
      await db.recursiveDelete(db.collection(collection));
    }
  });

  afterAll(async () => {
    await deleteApp(app);
  });

  it("deduplicates concurrent renewal effects transactionally", async () => {
    const paidAt = Date.UTC(2026, 7, 24, 19, 45, 0);
    await subscriptions.upsert({
      userId: "usr_firestore_financial",
      provider: "abacatepay",
      providerSubscriptionId: "sub_firestore_financial",
      providerProductId: "prod_pro_3990",
      product: "pro",
      method: "card",
      status: "active",
      autoRenew: true,
      amountCents: 3990,
      paidThrough: Date.UTC(2026, 8, 24, 19, 45, 0),
      lastPaidAt: paidAt,
      lastPaymentId: "initial",
      createdAt: paidAt,
      updatedAt: paidAt,
    });
    const input = {
      userId: "usr_firestore_financial",
      providerSubscriptionId: "sub_firestore_financial",
      paymentId: "renewal-firestore",
      paidAt: Date.UTC(2026, 8, 20, 12, 0, 0),
    };
    const results = await Promise.all([
      subscriptions.renewWithPayment(input),
      subscriptions.renewWithPayment(input),
    ]);
    expect(results.filter((result) => result.applied)).toHaveLength(1);
    expect((await subscriptions.getByUserId(input.userId))?.lastPaymentId).toBe(input.paymentId);
  });

  it("reclaims stale webhook leases and rejects the previous owner", async () => {
    const start = Date.UTC(2026, 7, 24, 19, 0, 0);
    expect(await events.claim("firestore-lease", start, "worker-a")).toBe(true);
    expect(await events.claim("firestore-lease", start + 5 * 60_000, "worker-b")).toBe(true);
    await events.complete("firestore-lease", start + 5 * 60_000, "worker-a");
    expect(await events.claim("firestore-lease", start + 6 * 60_000, "worker-c")).toBe(false);
    await events.complete("firestore-lease", start + 6 * 60_000, "worker-b");
    expect(await events.claim("firestore-lease", start + 7 * 60_000, "worker-c")).toBe(false);
  });

  it("preserves reserved, consumed and refunded orders when a duplicate payment arrives", async () => {
    const createdAt = Date.UTC(2026, 7, 24, 19, 0, 0);
    const buyer = { type: "guest" as const, email: "billing-invariants@example.com" };
    const principalKey = createOrderBuyerPrincipalKey(buyer);
    const order = await orders.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer,
      status: "paid",
      createdAt,
      paidAt: createdAt,
    });

    await orders.reservePaidOrder({ orderId: order.id!, requestId: "request-reserved", principalKey });
    const reserved = await orders.markOrderPaid(order.id!);
    expect(reserved.status).toBe("reserved");
    expect(reserved.reservedByRequestId).toBe("request-reserved");

    await orders.consumeReservedOrder({ orderId: order.id!, requestId: "request-reserved", documentId: "doc-consumed" });
    const consumed = await orders.markOrderPaid(order.id!);
    expect(consumed.status).toBe("consumed");
    expect(consumed.documentId).toBe("doc-consumed");

    const refunded = await orders.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer,
      status: "refunded",
      createdAt,
      paidAt: createdAt,
    });
    const stillRefunded = await orders.markOrderPaid(refunded.id!);
    expect(stillRefunded.status).toBe("refunded");
  });
});
