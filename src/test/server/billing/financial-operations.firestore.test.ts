import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { configureAdminFirestore } from "@/lib/server/firebase-admin";
import { applyAvulsoPayment, processDuplicateRefunds, type FinancialProvider } from "@/lib/server/billing/mercadopago/financial-operations";

const enabled = process.env.RUN_FIRESTORE_BILLING_TESTS === "true" && Boolean(process.env.FIRESTORE_EMULATOR_HOST);
describe.skipIf(!enabled)("Mercado Pago financial operations", () => {
  let app: App; let db: Firestore;
  beforeAll(() => { app = initializeApp({ projectId: "demo-docfacil-financial-ops" }, "financial-ops-emulator-test"); db = configureAdminFirestore(getFirestore(app)); });
  beforeEach(async () => { for (const name of ["orders", "billing_payment_ledger", "billing_financial_operations", "billing_occurrences"]) await db.recursiveDelete(db.collection(name)); });
  afterAll(async () => { await deleteApp(app); });

  it("chooses one primary payment under concurrent approval and schedules one excess refund", async () => {
    await db.collection("orders").doc("order-financial").set({ id: "order-financial", provider: "mercadopago", product: "avulso", amountCents: 1990, buyer: { type: "guest", email: "finance@example.com" }, status: "pending", providerStatus: "pending", providerPaymentId: "pix-pending", createdAt: 1 });
    const results = await Promise.all([applyAvulsoPayment("order-financial", "pay-a", 10, db), applyAvulsoPayment("order-financial", "pay-b", 11, db)]);
    expect(results.filter((item) => item.primary)).toHaveLength(1);
    expect((await db.collection("billing_financial_operations").get()).size).toBe(1);
    const order = (await db.collection("orders").doc("order-financial").get()).data()!;
    expect(["pay-a", "pay-b"]).toContain(order.providerPaymentId);
    expect(order.status).toBe("paid");
  });

  it("rejects a payment already bound to another order", async () => {
    await db.collection("orders").doc("order-one").set({ id: "order-one", provider: "mercadopago", product: "avulso", amountCents: 1990, buyer: { type: "guest" }, status: "pending", createdAt: 1 });
    await db.collection("orders").doc("order-two").set({ id: "order-two", provider: "mercadopago", product: "avulso", amountCents: 1990, buyer: { type: "guest" }, status: "pending", createdAt: 1 });
    await applyAvulsoPayment("order-one", "pay-bound", 10, db);
    await expect(applyAvulsoPayment("order-two", "pay-bound", 11, db)).rejects.toThrow();
  });

  it("does not replay a legacy primary payment or schedule its refund", async () => {
    await db.collection("orders").doc("order-legacy").set({ id: "order-legacy", provider: "mercadopago", product: "avulso", amountCents: 1990, buyer: { type: "guest" }, status: "consumed", providerPaymentId: "pay-legacy", createdAt: 1 });
    expect(await applyAvulsoPayment("order-legacy", "pay-legacy", 10, db)).toEqual({ primary: true, applied: false });
    expect((await db.collection("billing_financial_operations").get()).size).toBe(0);
  });

  it("confirms a full refund with stable idempotency and recovers a lease", async () => {
    await db.collection("billing_financial_operations").doc("order-x:refund:pay-x").set({ id: "order-x:refund:pay-x", type: "duplicate_payment_refund", orderId: "order-x", paymentId: "pay-x", idempotencyKey: "refund:order-x:pay-x", status: "processing", attempts: 1, nextAttemptAt: 1, leaseUntil: 1, createdAt: 1, updatedAt: 1 });
    const keys: string[] = [];
    const provider: FinancialProvider = { refundPayment: async (_id, key) => { keys.push(key); return { id: "refund-x", status: "approved" }; }, getPayment: async () => ({ id: "pay-x", status: "refunded", transaction_amount: 19.9 }) };
    expect((await processDuplicateRefunds({ provider, db, now: 10 })).confirmed).toBe(1);
    expect(keys).toEqual(["refund:order-x:pay-x"]);
    expect((await db.collection("billing_financial_operations").doc("order-x:refund:pay-x").get()).get("status")).toBe("confirmed");
  });

  it("keeps an unconfirmed third refund attempt as an administrative failure", async () => {
    await db.collection("billing_financial_operations").doc("order-y:refund:pay-y").set({ id: "order-y:refund:pay-y", type: "duplicate_payment_refund", orderId: "order-y", paymentId: "pay-y", idempotencyKey: "refund:order-y:pay-y", status: "pending", attempts: 2, nextAttemptAt: 1, createdAt: 1, updatedAt: 1 });
    const provider: FinancialProvider = { refundPayment: async () => ({ id: "r", status: "approved" }), getPayment: async () => ({ id: "pay-y", status: "approved", transaction_amount: 19.9 }) };
    expect((await processDuplicateRefunds({ provider, db, now: 10 })).failed).toBe(1);
    expect((await db.collection("billing_occurrences").get()).size).toBe(1);
  });
});
