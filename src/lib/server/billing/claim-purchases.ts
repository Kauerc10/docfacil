import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore } from "../firebase-admin";
import { BackendError } from "../errors";
import type { OrderRecord, DocumentRecord } from "../domain/documents";
import type { IOrdersRepository } from "../firestore/interfaces";

const MAX_PAGE_SIZE = 50;
const MAX_PAGES = 10;

export interface ClaimPrincipal {
  userId: string;
  email?: string;
  emailVerified?: boolean;
}

export interface PurchaseClaimRecord {
  orderId: string;
  userId: string;
  email: string;
  claimedAt: number;
  documentId?: string;
}

export interface ClaimPage {
  orders: OrderRecord[];
  nextCursor?: string;
}

export interface PurchaseClaimStore {
  findGuestOrders(email: string, cursor: string | undefined, limit: number): Promise<ClaimPage>;
  claimOrder(input: { order: OrderRecord; userId: string; email: string; now: number }): Promise<"claimed" | "already_claimed" | "skipped">;
  isClaimedPurchaseOwner(userId: string, orderId: string): Promise<boolean>;
}

function normalizeEmail(value: string | undefined): string {
  const email = value?.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BackendError("INVALID_REQUEST", 400, "E-mail da conta inválido.");
  return email;
}

function claimedRef(db: Firestore, orderId: string) {
  return db.collection("purchase_claims").doc(orderId);
}

export class FirestorePurchaseClaimStore implements PurchaseClaimStore {
  constructor(private readonly db: Firestore = getAdminFirestore()) {}

  public async findGuestOrders(email: string, cursor: string | undefined, limit: number): Promise<ClaimPage> {
    let query = this.db.collection("orders").where("provider", "==", "mercadopago").where("buyer.type", "==", "guest").where("buyer.email", "==", email).orderBy("__name__").limit(Math.min(limit, MAX_PAGE_SIZE));
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    return { orders: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as OrderRecord)), ...(snap.size === Math.min(limit, MAX_PAGE_SIZE) && snap.docs.length ? { nextCursor: snap.docs[snap.docs.length - 1].id } : {}) };
  }

  public async claimOrder(input: { order: OrderRecord; userId: string; email: string; now: number }): Promise<"claimed" | "already_claimed" | "skipped"> {
    const orderId = input.order.id;
    const documentId = input.order.documentId;
    if (!orderId || input.order.status !== "consumed" || !documentId) return "skipped";
    const claim = claimedRef(this.db, orderId);
    const document = this.db.collection("documents").doc(documentId);
    return this.db.runTransaction(async (tx) => {
      const [claimSnap, documentSnap] = await Promise.all([tx.get(claim), tx.get(document)]);
      if (claimSnap.exists) return (claimSnap.data()?.userId === input.userId ? "already_claimed" : "skipped");
      if (!documentSnap.exists) return "skipped";
      const record = documentSnap.data() as DocumentRecord;
      if (record.status === "deleted" || record.owner.type !== "guest") return "skipped";
      if (record.owner.contact.email?.trim().toLowerCase() !== input.email) return "skipped";
      const claimRecord: PurchaseClaimRecord = { orderId, userId: input.userId, email: input.email, claimedAt: input.now, documentId };
      tx.create(claim, claimRecord);
      tx.update(document, { owner: { type: "user", userId: input.userId } });
      return "claimed";
    });
  }

  public async isClaimedPurchaseOwner(userId: string, orderId: string): Promise<boolean> {
    const snap = await claimedRef(this.db, orderId).get();
    return snap.exists && snap.data()?.userId === userId;
  }
}

export async function claimVerifiedPurchases(principal: ClaimPrincipal, input?: { store?: PurchaseClaimStore; pageSize?: number; maxPages?: number; cursor?: string; now?: () => number }): Promise<{ claimed: number; alreadyClaimed: number; skipped: number; nextCursor?: string }> {
  if (!principal.emailVerified) throw new BackendError("INVALID_REQUEST", 400, "Verifique o e-mail da conta antes de associar compras.");
  const email = normalizeEmail(principal.email);
  const store = input?.store ?? new FirestorePurchaseClaimStore();
  const pageSize = Math.min(Math.max(input?.pageSize ?? MAX_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const maxPages = Math.min(Math.max(input?.maxPages ?? 1, 1), MAX_PAGES);
  let cursor = input?.cursor;
  let claimed = 0;
  let alreadyClaimed = 0;
  let skipped = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const result = await store.findGuestOrders(email, cursor, pageSize);
    for (const order of result.orders) {
      const outcome = await store.claimOrder({ order, userId: principal.userId, email, now: input?.now?.() ?? Date.now() });
      if (outcome === "claimed") claimed += 1;
      else if (outcome === "already_claimed") alreadyClaimed += 1;
      else skipped += 1;
    }
    cursor = result.nextCursor;
    if (!cursor || result.orders.length < pageSize) break;
  }
  return { claimed, alreadyClaimed, skipped, ...(cursor ? { nextCursor: cursor } : {}) };
}

export async function isClaimedPurchaseOwner(userId: string, orderId: string, store?: PurchaseClaimStore): Promise<boolean> {
  if (!userId || !orderId) return false;
  return (store ?? new FirestorePurchaseClaimStore()).isClaimedPurchaseOwner(userId, orderId);
}
