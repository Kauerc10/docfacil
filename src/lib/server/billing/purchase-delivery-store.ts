import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore } from "../firebase-admin";

export type PurchaseBuyer =
  | { type: "guest"; email?: string; phone?: string }
  | { type: "user"; userId: string; email?: string };

export interface PurchaseDraftSnapshot {
  modeloSlug: string;
  respostas: Record<string, string>;
  clausulasSelecionadas: string[];
  guestContact?: { email?: string; phone?: string };
  capturedAt: number;
  snapshotHash: string;
}

export interface PurchaseDeliveryResult {
  documentId: string;
  version: number;
  guestAccessPath?: string;
}

export type PurchaseDeliveryStatus = "pending" | "processing" | "completed" | "failed";

export interface PurchaseDeliveryRecord {
  orderId: string;
  buyer: PurchaseBuyer;
  snapshot: PurchaseDraftSnapshot;
  status: PurchaseDeliveryStatus;
  jobKey: string;
  generationRequestId?: string;
  retryCount: number;
  maxRetries: number;
  leaseOwner?: string;
  leaseExpiresAt?: number;
  result?: PurchaseDeliveryResult;
  lastErrorCode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PurchaseDeliveryStore {
  get(orderId: string): Promise<PurchaseDeliveryRecord | null>;
  capture(input: Omit<PurchaseDeliveryRecord, "status" | "retryCount" | "createdAt" | "updatedAt"> & { now: number }): Promise<PurchaseDeliveryRecord>;
  claim(input: { orderId: string; owner: string; now: number; leaseMs: number; generationRequestId?: string }): Promise<{ claimed: boolean; record: PurchaseDeliveryRecord | null }>;
  complete(input: { orderId: string; owner: string; now: number; result: PurchaseDeliveryResult }): Promise<void>;
  fail(input: { orderId: string; owner: string; now: number; errorCode: string }): Promise<void>;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deliveryRef(db: Firestore, orderId: string) {
  return db.collection("purchase_deliveries").doc(orderId);
}

export class FirestorePurchaseDeliveryStore implements PurchaseDeliveryStore {
  constructor(private readonly db: Firestore = getAdminFirestore()) {}

  public async get(orderId: string): Promise<PurchaseDeliveryRecord | null> {
    const snap = await deliveryRef(this.db, orderId).get();
    return snap.exists ? (snap.data() as PurchaseDeliveryRecord) : null;
  }

  public async capture(input: Omit<PurchaseDeliveryRecord, "status" | "retryCount" | "createdAt" | "updatedAt"> & { now: number }): Promise<PurchaseDeliveryRecord> {
    const ref = deliveryRef(this.db, input.orderId);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const existing = snap.data() as PurchaseDeliveryRecord;
        if (existing.snapshot.snapshotHash !== input.snapshot.snapshotHash || JSON.stringify(existing.buyer) !== JSON.stringify(input.buyer)) {
          throw new Error("PURCHASE_SNAPSHOT_IMMUTABLE");
        }
        return existing;
      }
      const record: PurchaseDeliveryRecord = { ...input, status: "pending", retryCount: 0, maxRetries: input.maxRetries || 3, createdAt: input.now, updatedAt: input.now };
      tx.create(ref, record);
      return record;
    });
  }

  public async claim(input: { orderId: string; owner: string; now: number; leaseMs: number; generationRequestId?: string }): Promise<{ claimed: boolean; record: PurchaseDeliveryRecord | null }> {
    const ref = deliveryRef(this.db, input.orderId);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { claimed: false, record: null };
      const current = snap.data() as PurchaseDeliveryRecord;
      if (current.status === "completed" || current.retryCount >= current.maxRetries || (current.status === "processing" && (current.leaseExpiresAt ?? Infinity) > input.now)) return { claimed: false, record: current };
      const claimed: PurchaseDeliveryRecord = { ...current, status: "processing", retryCount: current.retryCount + 1, generationRequestId: input.generationRequestId ?? `${current.jobKey}:${current.retryCount + 1}`, leaseOwner: input.owner, leaseExpiresAt: input.now + input.leaseMs, updatedAt: input.now };
      tx.update(ref, { status: claimed.status, retryCount: claimed.retryCount, generationRequestId: claimed.generationRequestId, leaseOwner: claimed.leaseOwner, leaseExpiresAt: claimed.leaseExpiresAt, updatedAt: claimed.updatedAt });
      return { claimed: true, record: claimed };
    });
  }

  public async complete(input: { orderId: string; owner: string; now: number; result: PurchaseDeliveryResult }): Promise<void> {
    const ref = deliveryRef(this.db, input.orderId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.data() as PurchaseDeliveryRecord | undefined;
      if (!current || current.leaseOwner !== input.owner || current.status !== "processing") return;
      tx.update(ref, { status: "completed", result: input.result, leaseOwner: null, leaseExpiresAt: null, updatedAt: input.now });
    });
  }

  public async fail(input: { orderId: string; owner: string; now: number; errorCode: string }): Promise<void> {
    const ref = deliveryRef(this.db, input.orderId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.data() as PurchaseDeliveryRecord | undefined;
      if (!current || current.leaseOwner !== input.owner || current.status !== "processing") return;
      tx.update(ref, { status: "failed", lastErrorCode: input.errorCode, leaseOwner: null, leaseExpiresAt: null, updatedAt: input.now });
    });
  }
}

export class InMemoryPurchaseDeliveryStore implements PurchaseDeliveryStore {
  private readonly records = new Map<string, PurchaseDeliveryRecord>();

  public async get(orderId: string): Promise<PurchaseDeliveryRecord | null> { return this.records.has(orderId) ? clone(this.records.get(orderId)!) : null; }
  public async capture(input: Omit<PurchaseDeliveryRecord, "status" | "retryCount" | "createdAt" | "updatedAt"> & { now: number }): Promise<PurchaseDeliveryRecord> {
    const existing = this.records.get(input.orderId);
    if (existing) {
      if (existing.snapshot.snapshotHash !== input.snapshot.snapshotHash || JSON.stringify(existing.buyer) !== JSON.stringify(input.buyer)) throw new Error("PURCHASE_SNAPSHOT_IMMUTABLE");
      return clone(existing);
    }
    const record: PurchaseDeliveryRecord = { ...input, status: "pending", retryCount: 0, maxRetries: input.maxRetries || 3, createdAt: input.now, updatedAt: input.now };
    this.records.set(input.orderId, clone(record));
    return clone(record);
  }
  public async claim(input: { orderId: string; owner: string; now: number; leaseMs: number; generationRequestId?: string }): Promise<{ claimed: boolean; record: PurchaseDeliveryRecord | null }> {
    const current = this.records.get(input.orderId);
    if (!current) return { claimed: false, record: null };
    if (current.status === "completed" || current.retryCount >= current.maxRetries || (current.status === "processing" && (current.leaseExpiresAt ?? Infinity) > input.now)) return { claimed: false, record: clone(current) };
    const claimed = { ...current, status: "processing" as const, retryCount: current.retryCount + 1, generationRequestId: input.generationRequestId ?? `${current.jobKey}:${current.retryCount + 1}`, leaseOwner: input.owner, leaseExpiresAt: input.now + input.leaseMs, updatedAt: input.now };
    this.records.set(input.orderId, clone(claimed));
    return { claimed: true, record: clone(claimed) };
  }
  public async complete(input: { orderId: string; owner: string; now: number; result: PurchaseDeliveryResult }): Promise<void> { const current = this.records.get(input.orderId); if (current?.status === "processing" && current.leaseOwner === input.owner) this.records.set(input.orderId, { ...current, status: "completed", result: input.result, leaseOwner: undefined, leaseExpiresAt: undefined, updatedAt: input.now }); }
  public async fail(input: { orderId: string; owner: string; now: number; errorCode: string }): Promise<void> { const current = this.records.get(input.orderId); if (current?.status === "processing" && current.leaseOwner === input.owner) this.records.set(input.orderId, { ...current, status: "failed", lastErrorCode: input.errorCode, leaseOwner: undefined, leaseExpiresAt: undefined, updatedAt: input.now }); }
}
