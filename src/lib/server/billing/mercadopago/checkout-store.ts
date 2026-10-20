import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore } from "../../firebase-admin";
import type { OrderRecord } from "../../domain/documents";
import { BackendError } from "../../errors";

export interface CheckoutSession {
  orderId: string;
  requestHash: string;
  tokenHash: string;
  state: "creating" | "ready" | "unknown";
  owner: string;
  leaseUntil: number;
  createdAt: number;
  result?: Record<string, unknown>;
}

export const checkoutTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** A criação do pedido e a reserva da tentativa são uma única transação. */
export class FirestoreCheckoutSessions {
  constructor(private readonly db: Firestore = getAdminFirestore()) {}

  async begin(input: {
    orderId: string;
    requestHash: string;
    tokenHash: string;
    order: Omit<OrderRecord, "id">;
    now: number;
  }): Promise<{ session: CheckoutSession; acquired: boolean }> {
    const ref = this.db.collection("billing_checkout_sessions").doc(input.orderId);
    return this.db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const session = snap.data() as CheckoutSession;
        if (session.requestHash !== input.requestHash || session.tokenHash !== input.tokenHash) {
          throw new BackendError("INVALID_REQUEST", 409, "Esta tentativa pertence a outro checkout.");
        }
        // Não repetir operações cujo resultado externo é desconhecido.
        // Preferências/assinaturas não têm idempotência presumida pelo produto.
        return { session, acquired: false };
      }
      const session: CheckoutSession = {
        orderId: input.orderId,
        requestHash: input.requestHash,
        tokenHash: input.tokenHash,
        state: "creating",
        owner: randomUUID(),
        leaseUntil: input.now + 60_000,
        createdAt: input.now,
      };
      tx.create(ref, session);
      tx.create(this.db.collection("orders").doc(input.orderId), input.order);
      return { session, acquired: true };
    });
  }

  async get(orderId: string): Promise<CheckoutSession | null> {
    const snap = await this.db.collection("billing_checkout_sessions").doc(orderId).get();
    return snap.exists ? snap.data() as CheckoutSession : null;
  }

  async finish(orderId: string, owner: string, result: Record<string, unknown> | null): Promise<void> {
    const ref = this.db.collection("billing_checkout_sessions").doc(orderId);
    await this.db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.owner !== owner) {
        throw new BackendError("INVALID_REQUEST", 409, "A tentativa de checkout foi substituída.");
      }
      tx.update(ref, result ? { state: "ready", result } : { state: "unknown" });
    });
  }
}
