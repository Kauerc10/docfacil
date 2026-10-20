import "server-only";
import type { DocumentData, Firestore, UpdateData } from "firebase-admin/firestore";
import { getAdminFirestore } from "../firebase-admin";
import { BackendError } from "../errors";
import { getServerEnv } from "../env";
import { assertProductionServerConfig } from "../config/assert-production-config";
import type { OrderRecord } from "../domain/documents";
import type { BillingSubscriptionRecord } from "../billing/subscription";
import { cancelProSubscription, renewProSubscription } from "../billing/subscription-lifecycle";
import type {
  IBillingOrdersRepository,
  IBillingSubscriptionsRepository,
  IBillingWebhookEventsRepository,
} from "./interfaces";
import { FirestoreOrdersRepository } from "./repositories";
import {
  InMemoryOrdersRepository,
  InMemoryBillingSubscriptionsRepository,
  InMemoryBillingWebhookEventsRepository,
} from "./in-memory-repositories";

export class FirestoreBillingOrdersRepository
  extends FirestoreOrdersRepository
  implements IBillingOrdersRepository
{
  private readonly billingDb: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    super(db);
    this.billingDb = db;
  }

  public async updateProviderRefs(
    orderId: string,
    refs: Partial<
      Pick<
        OrderRecord,
        | "method"
        | "providerPaymentId"
        | "providerCheckoutId"
        | "providerSubscriptionId"
        | "providerStatus"
        | "providerDevMode"
        | "pix"
      >
    >
  ): Promise<OrderRecord> {
    const docRef = this.billingDb.collection("orders").doc(orderId);

    return await this.billingDb.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) {
        throw new BackendError(
          "ORDER_NOT_FOUND",
          404,
          "Pedido de compra não encontrado."
        );
      }

      tx.update(docRef, refs as UpdateData<DocumentData>);
      return { id: snap.id, ...snap.data(), ...refs } as OrderRecord;
    });
  }

  public async findByProviderCheckoutId(
    providerCheckoutId: string
  ): Promise<OrderRecord | null> {
    const snap = await this.billingDb
      .collection("orders")
      .where("providerCheckoutId", "==", providerCheckoutId)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() } as OrderRecord;
  }
}

export class FirestoreBillingSubscriptionsRepository
  implements IBillingSubscriptionsRepository
{
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async getByUserId(
    userId: string
  ): Promise<BillingSubscriptionRecord | null> {
    const snap = await this.db.collection("billing_subscriptions").doc(userId).get();
    if (!snap.exists) return null;
    return snap.data() as BillingSubscriptionRecord;
  }

  public async getByProviderSubscriptionId(
    id: string
  ): Promise<BillingSubscriptionRecord | null> {
    const snap = await this.db
      .collection("billing_subscriptions")
      .where("providerSubscriptionId", "==", id)
      .limit(1)
      .get();

    if (snap.empty) return null;
    return snap.docs[0].data() as BillingSubscriptionRecord;
  }

  public async upsert(record: BillingSubscriptionRecord): Promise<void> {
    await this.db
      .collection("billing_subscriptions")
      .doc(record.userId)
      .set(record, { merge: true });
  }

  public async renewWithPayment(input: {
    userId: string;
    providerSubscriptionId: string;
    paymentId: string;
    paidAt: number;
    cycleId?: string;
  }): Promise<{ applied: boolean; subscription: BillingSubscriptionRecord }> {
    const subscriptionRef = this.db.collection("billing_subscriptions").doc(input.userId);
    const effectRef = subscriptionRef.collection("payment_effects").doc(input.cycleId ?? input.paymentId);
    return this.db.runTransaction(async (tx) => {
      const subscriptionSnap = await tx.get(subscriptionRef);
      const effectSnap = await tx.get(effectRef);
      if (!subscriptionSnap.exists) {
        throw new BackendError("ORDER_NOT_FOUND", 404, "Assinatura local não encontrada.");
      }
      const current = subscriptionSnap.data() as BillingSubscriptionRecord;
      if (current.providerSubscriptionId !== input.providerSubscriptionId) {
        throw new BackendError("ORDER_NOT_FOUND", 404, "Assinatura local não encontrada.");
      }
      if (effectSnap.exists || current.lastPaymentId === input.paymentId) {
        return { applied: false, subscription: current };
      }
      const renewed = renewProSubscription(current, {
        paymentId: input.paymentId,
        paidAt: input.paidAt,
      });
      if (current.status === "cancelled" || !current.autoRenew) {
        renewed.status = "cancelled";
        renewed.autoRenew = false;
      }
      tx.create(effectRef, { paymentId: input.paymentId, paidAt: input.paidAt, createdAt: input.paidAt });
      tx.set(subscriptionRef, renewed, { merge: true });
      return { applied: true, subscription: renewed };
    });
  }

  public async activateWithPayment(input: {
    record: BillingSubscriptionRecord;
    paymentId: string;
  }): Promise<{ applied: boolean; subscription: BillingSubscriptionRecord }> {
    const ref = this.db.collection("billing_subscriptions").doc(input.record.userId);
    const effectRef = ref.collection("payment_effects").doc(input.paymentId);
    return this.db.runTransaction(async (tx) => {
      const [existingSnap, effectSnap] = [await tx.get(ref), await tx.get(effectRef)];
      if (existingSnap.exists) {
        const existing = existingSnap.data() as BillingSubscriptionRecord;
        if (existing.providerSubscriptionId !== input.record.providerSubscriptionId) {
          throw new BackendError("CONFLICT", 409, "Já existe uma assinatura Pro vinculada a esta conta.");
        }
        return { applied: false, subscription: existing };
      }
      if (effectSnap.exists) return { applied: false, subscription: input.record };
      tx.create(effectRef, { paymentId: input.paymentId, createdAt: input.record.createdAt });
      tx.create(ref, input.record);
      return { applied: true, subscription: input.record };
    });
  }

  public async requestCancellation(userId: string, requestedAt: number): Promise<BillingSubscriptionRecord> {
    const ref = this.db.collection("billing_subscriptions").doc(userId);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new BackendError("ORDER_NOT_FOUND", 404, "Assinatura Pro não encontrada.");
      const current = snap.data() as BillingSubscriptionRecord;
      const next = { ...current, cancellationRequestedAt: current.cancellationRequestedAt ?? requestedAt, cancellationRequestStatus: "requested" as const, updatedAt: requestedAt };
      tx.set(ref, next, { merge: true });
      return next;
    });
  }

  public async resumeAutoRenew(userId: string): Promise<BillingSubscriptionRecord> {
    const ref = this.db.collection("billing_subscriptions").doc(userId);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new BackendError("ORDER_NOT_FOUND", 404, "Assinatura Pro não encontrada.");
      const current = snap.data() as BillingSubscriptionRecord;
      const next: BillingSubscriptionRecord = {
        ...current,
        status: "active",
        autoRenew: true,
        cancellationRequestedAt: undefined,
        cancellationRequestStatus: undefined,
        updatedAt: Date.now(),
      };
      tx.set(ref, next, { merge: true });
      return next;
    });
  }

  public async confirmCancellation(userId: string, confirmedAt: number): Promise<BillingSubscriptionRecord> {
    const ref = this.db.collection("billing_subscriptions").doc(userId);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new BackendError("ORDER_NOT_FOUND", 404, "Assinatura Pro não encontrada.");
      const current = snap.data() as BillingSubscriptionRecord;
      const next = { ...cancelProSubscription(current, confirmedAt), cancellationRequestStatus: "confirmed" as const, cancellationRequestedAt: current.cancellationRequestedAt ?? confirmedAt };
      tx.set(ref, next, { merge: true });
      return next;
    });
  }
}

export class FirestoreBillingWebhookEventsRepository
  implements IBillingWebhookEventsRepository
{
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  private eventRef(eventId: string) {
    return this.db.collection("billing_webhook_events").doc(eventId);
  }

  public async exists(eventId: string): Promise<boolean> {
    const snap = await this.eventRef(eventId).get();
    return snap.exists;
  }

  public async claim(eventId: string, now: number, ownerId = eventId): Promise<boolean> {
    const ref = this.eventRef(eventId);
    return await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const data = snap.data() as { status?: string; claimedAt?: number };
        if (data.status === "processing" && typeof data.claimedAt === "number" && now - data.claimedAt >= 5 * 60_000) {
          tx.update(ref, { status: "processing", claimedAt: now, ownerId });
          return true;
        }
        return false;
      }

      tx.create(ref, {
        status: "processing",
        claimedAt: now,
        ownerId,
      });
      return true;
    });
  }

  public async complete(eventId: string, now: number, ownerId = eventId): Promise<void> {
    const ref = this.eventRef(eventId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.ownerId !== ownerId || snap.data()?.status !== "processing") return;
      tx.update(ref, { status: "completed", completedAt: now });
    });
  }

  public async release(eventId: string, ownerId = eventId): Promise<void> {
    const ref = this.eventRef(eventId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.status !== "processing" || snap.data()?.ownerId !== ownerId) return;
      tx.delete(ref);
    });
  }
}

export interface BillingRepositories {
  orders: IBillingOrdersRepository;
  subscriptions: IBillingSubscriptionsRepository;
  webhookEvents: IBillingWebhookEventsRepository;
}

let billingRepositoriesSingleton: BillingRepositories | null = null;

export function getBillingRepositories(): BillingRepositories {
  if (billingRepositoriesSingleton) return billingRepositoriesSingleton;

  const env = getServerEnv();
  assertProductionServerConfig(env);

  const useInMemory =
    env.ALLOW_IN_MEMORY_REPOSITORIES ||
    (env.NODE_ENV === "test" && !env.FIRESTORE_EMULATOR_HOST);

  billingRepositoriesSingleton = useInMemory
    ? {
        orders: new InMemoryOrdersRepository(false),
        subscriptions: new InMemoryBillingSubscriptionsRepository(false),
        webhookEvents: new InMemoryBillingWebhookEventsRepository(false),
      }
    : {
        orders: new FirestoreBillingOrdersRepository(),
        subscriptions: new FirestoreBillingSubscriptionsRepository(),
        webhookEvents: new FirestoreBillingWebhookEventsRepository(),
      };

  return billingRepositoriesSingleton;
}

export function setBillingRepositoriesForTesting(
  repos: BillingRepositories | null
): void {
  billingRepositoriesSingleton = repos;
}
