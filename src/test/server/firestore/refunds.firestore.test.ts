import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { configureAdminFirestore } from "@/lib/server/firebase-admin";
import { executeAvulsoRefund, type RefundProvider, type RefundRequestRecord } from "@/lib/server/billing/refunds";
import type { OrderRecord } from "@/lib/server/domain/documents";

const enabled = process.env.RUN_FIRESTORE_REFUND_TESTS === "true" && Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!enabled)("Firestore manual refund operations", () => {
  let app: App;
  let db: Firestore;
  beforeAll(() => { app = initializeApp({ projectId: "demo-docfacil-refunds" }, "refunds-emulator-test"); db = configureAdminFirestore(getFirestore(app)); });
  beforeEach(async () => {
    for (const name of ["orders", "billing_refund_requests", "billing_financial_operations"]) {
      const snap = await db.collection(name).get(); const batch = db.batch(); snap.docs.forEach((doc) => batch.delete(doc.ref)); await batch.commit();
    }
  });
  afterAll(async () => { await deleteApp(app); });

  function order(): OrderRecord { return { id: "order-refund", provider: "mercadopago", product: "avulso", amountCents: 1990, buyer: { type: "guest", email: "buyer@example.com" }, status: "paid", providerPaymentId: "pay-refund", createdAt: Date.now() }; }
  function request(): RefundRequestRecord { return { id: "manual:order-refund", orderId: "order-refund", reason: "Compra duplicada", status: "requested", createdAt: Date.now(), updatedAt: Date.now() }; }

  it("confirms full refund and marks only the order refunded", async () => {
    const current = order(); await db.collection("orders").doc(current.id!).set(current); await db.collection("billing_refund_requests").doc(request().id).set(request());
    const provider: RefundProvider = { refundPayment: async () => ({ id: "refund-1", status: "approved" }), getPayment: async () => ({ id: "pay-refund", status: "refunded", currency_id: "BRL", transaction_amount: 19.9 }) };
    const result = await executeAvulsoRefund({ order: current, request: request(), reviewerId: "admin-1", confirmedAmountCents: 1990, provider, db });
    expect(result.status).toBe("confirmed"); expect((await db.collection("orders").doc(current.id!).get()).get("status")).toBe("refunded");
  });

  it("keeps a partially confirmed provider refund out of refunded state", async () => {
    const current = order(); await db.collection("orders").doc(current.id!).set(current); await db.collection("billing_refund_requests").doc(request().id).set(request());
    const provider: RefundProvider = { refundPayment: async () => ({ id: "refund-1", status: "approved" }), getPayment: async () => ({ id: "pay-refund", status: "approved", currency_id: "BRL", transaction_amount: 19.9, refunds: [{ status: "approved", amount: 5 }] }) };
    const result = await executeAvulsoRefund({ order: current, request: request(), reviewerId: "admin-1", confirmedAmountCents: 1990, provider, db });
    expect(result.status).toBe("partial"); expect((await db.collection("orders").doc(current.id!).get()).get("status")).toBe("paid");
  });
});
