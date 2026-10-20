import "server-only";
import crypto from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore } from "../firebase-admin";
import { BackendError } from "../errors";
import { hashToken } from "../domain/documents";
import type { OrderRecord } from "../domain/documents";
import { encryptPurchaseToken, enqueuePurchaseMail, type PurchaseMailJob } from "./purchase-mail";

export const PURCHASE_ACCESS_COOKIE = "docfacil_purchase_session";
const ACCESS_TTL_MS = 30 * 60_000;
const RATE_WINDOW_MS = 60 * 60_000;
const MAX_REQUESTS = 5;

function secret(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.PURCHASE_ACCESS_SECRET?.trim();
  if (!value || value.length < 32) throw new BackendError("SERVER_MISCONFIGURED", 500, "Acesso de compra indisponível.");
  return value;
}

function emailDigest(email: string): string { return hashToken(email.trim().toLowerCase()); }
function tokenSignature(value: string, key: string): string { return crypto.createHmac("sha256", key).update(value).digest("base64url"); }

function sessionValue(orderId: string, expiresAt: number, key: string): string {
  const payload = `${orderId}.${expiresAt}`;
  return `${payload}.${tokenSignature(payload, key)}`;
}

export function authorizePurchaseSession(req: Request, orderId: string, now = Date.now(), env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = req.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${PURCHASE_ACCESS_COOKIE}=`))?.slice(PURCHASE_ACCESS_COOKIE.length + 1);
  if (!raw) return false;
  const [storedOrderId, expiresRaw, signature] = raw.split(".");
  const expiresAt = Number(expiresRaw);
  if (!storedOrderId || storedOrderId !== orderId || !Number.isFinite(expiresAt) || expiresAt <= now || !signature) return false;
  const payload = `${storedOrderId}.${expiresAt}`;
  const expected = Buffer.from(tokenSignature(payload, secret(env)));
  const received = Buffer.from(signature);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function tokenRef(db: Firestore, hash: string) { return db.collection("purchase_access_tokens").doc(hash); }
function receiptRef(db: Firestore, orderId: string) { return db.collection("purchase_access_receipts").doc(orderId); }
function rateRef(db: Firestore, email: string) { return db.collection("purchase_access_rate_limits").doc(emailDigest(email)); }

export async function issuePurchaseAccess(order: OrderRecord, input?: { now?: number; db?: Firestore; env?: NodeJS.ProcessEnv }): Promise<{ issued: boolean; token?: string }> {
  const now = input?.now ?? Date.now();
  const db = input?.db ?? getAdminFirestore();
  const env = input?.env ?? process.env;
  const email = order.buyer.type === "guest" ? order.buyer.email?.trim().toLowerCase() : order.buyer.email?.trim().toLowerCase();
  if (!email || order.status !== "paid" && order.status !== "consumed" || order.product !== "avulso") return { issued: false };
  const accessSecret = secret(env);
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = now + ACCESS_TTL_MS;
  await tokenRef(db, tokenHash).create({ orderId: order.id, emailDigest: emailDigest(email), tokenHash, expiresAt, redeemedAt: null, createdAt: now });
  await enqueuePurchaseMail({ id: `${order.id}:${tokenHash}`, orderId: order.id!, tokenCiphertext: encryptPurchaseToken(token, accessSecret), recipientEmail: email, now }, db);
  return { issued: true, token };
}

/**
 * Idempotent hook for a paid delivery callback. A callback may be replayed by
 * Mercado Pago, so the first receipt token and stable mail job are retained by
 * order. Explicit customer resend uses issuePurchaseAccess and gets a new
 * one-time token under its own rate limit.
 */
export async function ensurePurchaseReceipt(order: OrderRecord, input?: { now?: number; db?: Firestore; env?: NodeJS.ProcessEnv }): Promise<{ issued: boolean }> {
  const now = input?.now ?? Date.now();
  const db = input?.db ?? getAdminFirestore();
  const env = input?.env ?? process.env;
  const email = order.buyer.email?.trim().toLowerCase();
  if (!order.id || !email || !["paid", "consumed"].includes(order.status) || order.product !== "avulso") return { issued: false };
  const orderId = order.id;
  const accessSecret = secret(env);
  const receipt = receiptRef(db, order.id);
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const tokenCiphertext = encryptPurchaseToken(token, accessSecret);
  const created = await db.runTransaction(async (tx) => {
    const existing = await tx.get(receipt);
    if (existing.exists) return false;
    tx.create(receipt, { orderId, tokenHash, tokenCiphertext, emailDigest: emailDigest(email), createdAt: now });
    tx.create(tokenRef(db, tokenHash), { orderId, emailDigest: emailDigest(email), tokenHash, expiresAt: now + ACCESS_TTL_MS, redeemedAt: null, createdAt: now });
    const job: PurchaseMailJob = { id: `${orderId}:paid`, orderId, tokenCiphertext, recipientEmail: email, status: "pending", attempts: 0, nextAttemptAt: now, createdAt: now, updatedAt: now };
    tx.create(db.collection("purchase_mail_jobs").doc(job.id), job);
    return true;
  });
  return { issued: created };
}

export async function requestPurchaseAccess(input: { order: OrderRecord | null; email: string; now?: number; db?: Firestore; env?: NodeJS.ProcessEnv }): Promise<void> {
  const now = input.now ?? Date.now();
  const email = input.email.trim().toLowerCase();
  if (!email || !input.order || input.order.buyer.type !== "guest" || input.order.buyer.email?.trim().toLowerCase() !== email) return;
  const db = input.db ?? getAdminFirestore();
  const rate = rateRef(db, email);
  const allowed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(rate);
    const current = snap.exists ? snap.data() as { startedAt?: number; count?: number } : {};
    const active = typeof current.startedAt === "number" && current.startedAt + RATE_WINDOW_MS > now;
    const count = active ? Number(current.count ?? 0) : 0;
    if (count >= MAX_REQUESTS) return false;
    tx.set(rate, { startedAt: active ? current.startedAt : now, count: count + 1, updatedAt: now }, { merge: true });
    return true;
  });
  if (allowed) await issuePurchaseAccess(input.order, { now, db, env: input.env });
}

export async function redeemPurchaseAccess(token: string, input?: { now?: number; db?: Firestore; env?: NodeJS.ProcessEnv }): Promise<{ orderId: string; cookie: string; expiresAt: number }> {
  const now = input?.now ?? Date.now();
  const db = input?.db ?? getAdminFirestore();
  const env = input?.env ?? process.env;
  const hash = hashToken(token.trim());
  const ref = tokenRef(db, hash);
  let orderId = "";
  const expiresAt = now + ACCESS_TTL_MS;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new BackendError("ORDER_FORBIDDEN", 403, "Link de acesso inválido ou expirado.");
    const value = snap.data() as { orderId?: string; expiresAt?: number; redeemedAt?: number | null };
    if (!value.orderId || !value.expiresAt || value.expiresAt <= now || value.redeemedAt) throw new BackendError("ORDER_FORBIDDEN", 403, "Link de acesso inválido ou expirado.");
    const orderSnap = await tx.get(db.collection("orders").doc(value.orderId));
    const order = orderSnap.exists ? orderSnap.data() as { status?: string; product?: string } : null;
    if (!order || order.product !== "avulso" || !["paid", "consumed"].includes(order.status ?? "")) {
      throw new BackendError("ORDER_FORBIDDEN", 403, "Esta compra não está disponível para acesso.");
    }
    orderId = value.orderId;
    tx.update(ref, { redeemedAt: now });
  });
  return { orderId, expiresAt, cookie: sessionValue(orderId, expiresAt, secret(env)) };
}
