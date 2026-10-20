import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { configureAdminFirestore } from "@/lib/server/firebase-admin";
import { ensurePurchaseReceipt, issuePurchaseAccess, redeemPurchaseAccess } from "@/lib/server/billing/purchase-access";

const enabled = process.env.RUN_FIRESTORE_BILLING_TESTS === "true" && Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const accessEnv = { NODE_ENV: "test", PURCHASE_ACCESS_SECRET: "test-secret-with-at-least-32-characters-long" } as unknown as NodeJS.ProcessEnv;

describe.skipIf(!enabled)("guest purchase access", () => {
  let app: App;
  let db: Firestore;

  beforeAll(() => {
    app = initializeApp({ projectId: "demo-docfacil-purchase-access" }, "purchase-access-emulator-test");
    db = configureAdminFirestore(getFirestore(app));
  });
  beforeEach(async () => { await db.recursiveDelete(db.collection("orders")); await db.recursiveDelete(db.collection("purchase_access_tokens")); await db.recursiveDelete(db.collection("purchase_access_receipts")); await db.recursiveDelete(db.collection("purchase_mail_jobs")); await db.recursiveDelete(db.collection("purchase_access_rate_limits")); });
  afterAll(async () => { await deleteApp(app); });

  it("issues a hashed one-time token and rejects a second redemption", async () => {
    const order = { id: "order-access", provider: "mercadopago" as const, product: "avulso" as const, amountCents: 1990, buyer: { type: "guest" as const, email: "buyer@example.com" }, status: "paid" as const, createdAt: 1 };
    await db.collection("orders").doc(order.id).set(order);
    const issued = await issuePurchaseAccess(order, { now: 1000, db, env: accessEnv });
    expect(issued.issued).toBe(true);
    expect(issued.token).toBeString();
    expect((await db.collection("purchase_access_tokens").get()).docs[0].id).not.toBe(issued.token);
    const redeemed = await redeemPurchaseAccess(issued.token!, { now: 2000, db, env: accessEnv });
    expect(redeemed.orderId).toBe(order.id);
    await expect(redeemPurchaseAccess(issued.token!, { now: 2001, db, env: accessEnv })).rejects.toThrow();
  });

  it("does not redeem access after the order is refunded", async () => {
    const order = { id: "order-refunded", provider: "mercadopago" as const, product: "avulso" as const, amountCents: 1990, buyer: { type: "guest" as const, email: "buyer@example.com" }, status: "paid" as const, createdAt: 1 };
    await db.collection("orders").doc(order.id).set(order);
    const issued = await issuePurchaseAccess(order, { now: 1000, db, env: accessEnv });
    await db.collection("orders").doc(order.id).update({ status: "refunded" });
    await expect(redeemPurchaseAccess(issued.token!, { now: 2000, db, env: accessEnv })).rejects.toThrow();
  });

  it("deduplicates the paid delivery callback by order", async () => {
    const order = { id: "order-callback", provider: "mercadopago" as const, product: "avulso" as const, amountCents: 1990, buyer: { type: "guest" as const, email: "buyer@example.com" }, status: "paid" as const, createdAt: 1 };
    await db.collection("orders").doc(order.id).set(order);
    expect((await ensurePurchaseReceipt(order, { now: 1000, db, env: accessEnv })).issued).toBe(true);
    expect((await ensurePurchaseReceipt(order, { now: 1001, db, env: accessEnv })).issued).toBe(false);
    expect((await db.collection("purchase_access_receipts").get()).size).toBe(1);
    expect((await db.collection("purchase_mail_jobs").get()).size).toBe(1);
  });
});
