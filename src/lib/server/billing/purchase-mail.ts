import "server-only";
import crypto from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore } from "../firebase-admin";

const MAX_ATTEMPTS = 3;
const LEASE_MS = 2 * 60_000;

export interface PurchaseMailConfig {
  apiKey: string;
  from: string;
  endpoint: string;
  appUrl: string;
}

export interface PurchaseMailJob {
  id: string;
  orderId: string;
  tokenCiphertext: string;
  recipientEmail: string;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  nextAttemptAt: number;
  lastErrorCode?: string;
  createdAt: number;
  updatedAt: number;
  leaseId?: string;
  leaseUntil?: number;
}

export function getPurchaseMailConfig(env: NodeJS.ProcessEnv = process.env): PurchaseMailConfig | null {
  const apiKey = env.PURCHASE_MAIL_API_KEY?.trim();
  const from = env.PURCHASE_MAIL_FROM?.trim();
  const appUrl = (env.NEXT_PUBLIC_APP_URL || env.APP_URL || "").trim().replace(/\/$/, "");
  if (!apiKey || !from || !appUrl) return null;
  return { apiKey, from, appUrl, endpoint: (env.PURCHASE_MAIL_API_ENDPOINT || "https://api.resend.com/emails").trim() };
}

function jobRef(db: Firestore, id: string) {
  return db.collection("purchase_mail_jobs").doc(id);
}

export async function enqueuePurchaseMail(input: Omit<PurchaseMailJob, "status" | "attempts" | "nextAttemptAt" | "createdAt" | "updatedAt"> & { now: number }, db: Firestore = getAdminFirestore()): Promise<PurchaseMailJob> {
  const ref = jobRef(db, input.id);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) return existing.data() as PurchaseMailJob;
    const job: PurchaseMailJob = { ...input, status: "pending", attempts: 0, nextAttemptAt: input.now, createdAt: input.now, updatedAt: input.now };
    tx.create(ref, job);
    return job;
  });
}

export async function processPurchaseMailJobs(input: { decryptToken: (ciphertext: string) => string; now?: number; limit?: number; db?: Firestore; fetchImpl?: typeof fetch; config?: PurchaseMailConfig | null }): Promise<{ sent: number; failed: number; skipped: number }> {
  const db = input.db ?? getAdminFirestore();
  const now = input.now ?? Date.now();
  const config = input.config === undefined ? getPurchaseMailConfig() : input.config;
  const fetchImpl = input.fetchImpl ?? fetch;
  // Avoid requiring a composite index for this bounded worker.
  const snap = await db.collection("purchase_mail_jobs").where("status", "in", ["pending", "failed", "processing"]).limit(Math.max(input.limit ?? 10, 25)).get();
  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const doc of snap.docs.filter((item) => Number(item.get("attempts") ?? 0) < MAX_ATTEMPTS && (Number(item.get("nextAttemptAt") ?? 0) <= now || (item.get("status") === "processing" && Number(item.get("leaseUntil") ?? 0) <= now))).slice(0, input.limit ?? 10)) {
    const ref = doc.ref;
    const job = doc.data() as PurchaseMailJob;
    if (job.attempts >= MAX_ATTEMPTS) { result.skipped++; continue; }
    if (!config) {
      await ref.update({ status: "failed", attempts: MAX_ATTEMPTS, lastErrorCode: "MAIL_NOT_CONFIGURED", updatedAt: now });
      result.failed++;
      continue;
    }
    const leaseId = crypto.randomBytes(12).toString("hex");
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      if (!fresh.exists) return false;
      const current = fresh.data() as PurchaseMailJob;
      const reclaimable = current.status !== "processing" || Number(current.leaseUntil ?? 0) <= now;
      if (!reclaimable || current.status === "sent" || current.attempts >= MAX_ATTEMPTS || Number(current.nextAttemptAt ?? 0) > now) return false;
      tx.update(ref, { status: "processing", attempts: current.attempts + 1, leaseId, leaseUntil: now + LEASE_MS, updatedAt: now });
      return true;
    });
    if (!claimed) { result.skipped++; continue; }
    const attempts = job.attempts + 1;
    try {
      const orderSnap = await db.collection("orders").doc(job.orderId).get();
      const order = orderSnap.exists ? orderSnap.data() as { status?: string; product?: string } : null;
      if (!order || order.product !== "avulso" || !["paid", "consumed"].includes(order.status ?? "")) {
        await ref.update({ status: "failed", lastErrorCode: "ORDER_UNAVAILABLE", leaseId: null, leaseUntil: null, updatedAt: now });
        result.failed++;
        continue;
      }
      const token = input.decryptToken(job.tokenCiphertext);
      const tokenSnap = await db.collection("purchase_access_tokens").doc(hashTokenForWorker(token)).get();
      const expiresAt = Number(tokenSnap.get("expiresAt") ?? 0);
      if (!expiresAt || expiresAt <= now) {
        await ref.update({ status: "failed", lastErrorCode: "TOKEN_EXPIRED", leaseId: null, leaseUntil: null, updatedAt: now });
        result.failed++;
        continue;
      }
      const accessUrl = `${config.appUrl}/purchases/access?token=${encodeURIComponent(token)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const response = await fetchImpl(config.endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": job.id },
        signal: controller.signal,
        body: JSON.stringify({ from: config.from, to: [job.recipientEmail], subject: "Acesso à sua compra no DocFácil", html: `<p>Seu pagamento foi confirmado.</p><p><a href="${accessUrl}">Acessar minha compra</a></p><p>Este link expira em pouco tempo e pode ser solicitado novamente.</p>` }),
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`MAIL_PROVIDER_${response.status}`);
      await ref.update({ status: "sent", lastErrorCode: null, leaseId: null, leaseUntil: null, updatedAt: now });
      result.sent++;
    } catch {
      await ref.update({ status: attempts >= MAX_ATTEMPTS ? "failed" : "pending", nextAttemptAt: now + attempts * 5 * 60_000, leaseId: null, leaseUntil: null, lastErrorCode: "MAIL_DELIVERY_FAILED", updatedAt: now });
      result.failed++;
    }
  }
  return result;
}

function hashTokenForWorker(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function deriveMailSecret(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptPurchaseToken(token: string, secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveMailSecret(secret), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptPurchaseToken(ciphertext: string, secret: string): string {
  const [ivRaw, tagRaw, dataRaw] = ciphertext.split(".");
  if (!ivRaw || !tagRaw || !dataRaw) throw new Error("INVALID_TOKEN_CIPHERTEXT");
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveMailSecret(secret), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString("utf8");
}
