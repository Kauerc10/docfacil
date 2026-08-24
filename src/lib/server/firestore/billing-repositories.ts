import "server-only";
import type { DocumentData, Firestore, UpdateData } from "firebase-admin/firestore";
import { getAdminFirestore } from "../firebase-admin";
import { BackendError } from "../errors";
import { getServerEnv } from "../env";
import { assertProductionServerConfig } from "../config/assert-production-config";
import type { OrderRecord } from "../domain/documents";
import type { BillingSubscriptionRecord } from "../billing/subscription";
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

  public async claim(eventId: string, now: number): Promise<boolean> {
    const ref = this.eventRef(eventId);
    return await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) return false;

      tx.create(ref, {
        status: "processing",
        claimedAt: now,
      });
      return true;
    });
  }

  public async complete(eventId: string, now: number): Promise<void> {
    await this.eventRef(eventId).set(
      {
        status: "completed",
        completedAt: now,
      },
      { merge: true }
    );
  }

  public async release(eventId: string): Promise<void> {
    const ref = this.eventRef(eventId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.status !== "processing") return;
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
