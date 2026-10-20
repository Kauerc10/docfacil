import "server-only";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore } from "../firebase-admin";
import { getServerEnv } from "../env";

const inMemoryOffers = new Map<string, WelcomeOfferWindow>();

export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
export const THIRTY_MINUTES_MS = 30 * 60 * 1000;
export const PROMO_CENTS = 2990;
export const REGULAR_CENTS = 3990;

export interface WelcomeOfferWindow {
  userId: string;
  startedAt: number;
  expiresAt: number;
  status: "active" | "expired" | "consumed" | "suspended";
  suspendedReason?: string;
  createdAt: number;
  updatedAt: number;
}

function offerRef(db: Firestore, userId: string) {
  return db.collection("billing_welcome_offers").doc(userId);
}

function occurrenceRef(db: Firestore, id: string) {
  return db.collection("billing_occurrences").doc(id);
}

export async function getOrCreateWelcomeOffer(input: {
  userId: string;
  hasHadProBefore: boolean;
  now?: number;
  db?: Firestore;
}): Promise<WelcomeOfferWindow> {
  const now = input.now ?? Date.now();
  let useInMemory = false;
  try {
    const env = getServerEnv();
    if (env.ALLOW_IN_MEMORY_REPOSITORIES && !input.db && !process.env.FIRESTORE_EMULATOR_HOST) {
      useInMemory = true;
    }
  } catch {}

  if (useInMemory) {
    const current = inMemoryOffers.get(input.userId);
    if (current) {
      if (current.status === "active" && now > current.expiresAt) {
        const updated: WelcomeOfferWindow = { ...current, status: "expired", updatedAt: now };
        inMemoryOffers.set(input.userId, updated);
        return updated;
      }
      return current;
    }
    if (input.hasHadProBefore) {
      const record: WelcomeOfferWindow = {
        userId: input.userId,
        startedAt: now,
        expiresAt: now,
        status: "expired",
        createdAt: now,
        updatedAt: now,
      };
      inMemoryOffers.set(input.userId, record);
      return record;
    }
    const record: WelcomeOfferWindow = {
      userId: input.userId,
      startedAt: now,
      expiresAt: now + TWO_HOURS_MS,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    inMemoryOffers.set(input.userId, record);
    return record;
  }

  const db = input.db ?? getAdminFirestore();
  const ref = offerRef(db, input.userId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const current = snap.data() as WelcomeOfferWindow;
      if (current.status === "active" && now > current.expiresAt) {
        tx.update(ref, { status: "expired", updatedAt: now });
        return { ...current, status: "expired", updatedAt: now };
      }
      return current;
    }

    if (input.hasHadProBefore) {
      const record: WelcomeOfferWindow = {
        userId: input.userId,
        startedAt: now,
        expiresAt: now,
        status: "expired",
        createdAt: now,
        updatedAt: now,
      };
      tx.set(ref, record);
      return record;
    }

    const record: WelcomeOfferWindow = {
      userId: input.userId,
      startedAt: now,
      expiresAt: now + TWO_HOURS_MS,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    tx.set(ref, record);
    return record;
  });
}

export function evaluateAttemptPricing(
  offer: WelcomeOfferWindow,
  attemptStartedAt: number,
  now: number
): { amountCents: number; isIntroductory: boolean } {
  if (offer.status !== "active") {
    return { amountCents: REGULAR_CENTS, isIntroductory: false };
  }

  // A tentativa deve ter sido iniciada dentro da janela de 2h
  const withinWindow = attemptStartedAt >= offer.startedAt && attemptStartedAt <= offer.expiresAt;
  // E tem validade de até 30 minutos desde o seu início
  const withinAttemptTtl = now <= attemptStartedAt + THIRTY_MINUTES_MS;

  if (withinWindow && withinAttemptTtl) {
    return { amountCents: PROMO_CENTS, isIntroductory: true };
  }

  return { amountCents: REGULAR_CENTS, isIntroductory: false };
}

export async function processPromoPaymentTiming(input: {
  userId: string;
  paidAt: number;
  receivedAt: number;
  amountCents: number;
  db?: Firestore;
}): Promise<{ honoured: boolean; incident: boolean }> {
  const db = input.db ?? getAdminFirestore();
  const ref = offerRef(db, input.userId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { honoured: true, incident: false };

    const offer = snap.data() as WelcomeOfferWindow;

    // Se o pagamento foi efetuado dentro do prazo da oferta, é válido normalmente (mesmo que o webhook atrase)
    if (input.paidAt <= offer.expiresAt + THIRTY_MINUTES_MS) {
      tx.update(ref, { status: "consumed", updatedAt: input.receivedAt });
      return { honoured: true, incident: false };
    }

    // Se o provedor aceitou o valor de 29,90 fora do prazo:
    // Conforme decisão da entrevista: honra o mês para o cliente e suspende o fluxo abrindo incidente
    if (input.amountCents === PROMO_CENTS) {
      tx.update(ref, {
        status: "suspended",
        suspendedReason: "Pagamento promocional tardio aceito pelo gateway.",
        updatedAt: input.receivedAt,
      });

      const occId = `occurrence:late_promo:${input.userId}`;
      tx.set(occurrenceRef(db, occId), {
        id: occId,
        type: "late_promotional_payment",
        userId: input.userId,
        amountCents: input.amountCents,
        paidAt: input.paidAt,
        receivedAt: input.receivedAt,
        status: "incident_opened",
        createdAt: input.receivedAt,
      });

      return { honoured: true, incident: true };
    }

    return { honoured: true, incident: false };
  });
}
