import { describe, expect, it } from "bun:test";
import {
  getOrCreateWelcomeOffer,
  evaluateAttemptPricing,
  processPromoPaymentTiming,
  TWO_HOURS_MS,
  THIRTY_MINUTES_MS,
  PROMO_CENTS,
  REGULAR_CENTS,
} from "../../../lib/server/billing/welcome-offer";

describe("Welcome offer window & late payment incident containment (Tickets 12 & 13)", () => {
  it("initializes a real 2-hour window on first authenticated view for eligible users", async () => {
    const store = new Map<string, any>();
    const fakeDb = {
      collection: () => ({
        doc: (id: string) => ({ id }),
      }),
      runTransaction: async (fn: any) => {
        const tx = {
          get: async (ref: any) => ({ exists: store.has(ref.id), data: () => store.get(ref.id) }),
          set: (ref: any, data: any) => store.set(ref.id, data),
          update: (ref: any, data: any) => store.set(ref.id, { ...store.get(ref.id), ...data }),
        };
        return fn(tx);
      },
    };

    const t0 = 1000000;
    const offer = await getOrCreateWelcomeOffer({
      userId: "user-new",
      hasHadProBefore: false,
      now: t0,
      db: fakeDb as never,
    });

    expect(offer.status).toBe("active");
    expect(offer.startedAt).toBe(t0);
    expect(offer.expiresAt).toBe(t0 + TWO_HOURS_MS);

    // Segunda consulta recupera a janela original sem reiniciar o relógio
    const offerAgain = await getOrCreateWelcomeOffer({
      userId: "user-new",
      hasHadProBefore: false,
      now: t0 + 50000,
      db: fakeDb as never,
    });

    expect(offerAgain.startedAt).toBe(t0);
    expect(offerAgain.expiresAt).toBe(t0 + TWO_HOURS_MS);
  });

  it("marks user as expired immediately if they previously had Pro", async () => {
    const store = new Map<string, any>();
    const fakeDb = {
      collection: () => ({
        doc: (id: string) => ({ id }),
      }),
      runTransaction: async (fn: any) => {
        const tx = {
          get: async (ref: any) => ({ exists: store.has(ref.id), data: () => store.get(ref.id) }),
          set: (ref: any, data: any) => store.set(ref.id, data),
        };
        return fn(tx);
      },
    };

    const offer = await getOrCreateWelcomeOffer({
      userId: "user-veteran",
      hasHadProBefore: true,
      now: 1000000,
      db: fakeDb as never,
    });

    expect(offer.status).toBe("expired");
  });

  it("calculates 29.90 during window and 30-minute attempt TTL, and 39.90 afterwards", () => {
    const t0 = 1000000;
    const activeOffer = {
      userId: "user-1",
      startedAt: t0,
      expiresAt: t0 + TWO_HOURS_MS,
      status: "active" as const,
      createdAt: t0,
      updatedAt: t0,
    };

    // Tentativa iniciada dentro da janela e verificada em 15 minutos: R$ 29,90
    const attemptTime = t0 + 1000;
    const pricing1 = evaluateAttemptPricing(activeOffer, attemptTime, attemptTime + 15 * 60 * 1000);
    expect(pricing1.amountCents).toBe(PROMO_CENTS);
    expect(pricing1.isIntroductory).toBe(true);

    // Tentativa após 30 minutos de checkout: R$ 39,90
    const pricingExpiredAttempt = evaluateAttemptPricing(activeOffer, attemptTime, attemptTime + 31 * 60 * 1000);
    expect(pricingExpiredAttempt.amountCents).toBe(REGULAR_CENTS);
    expect(pricingExpiredAttempt.isIntroductory).toBe(false);

    // Janela geral expirada (após 2 horas): R$ 39,90
    const lateAttemptTime = t0 + TWO_HOURS_MS + 1000;
    const pricingLateWindow = evaluateAttemptPricing(activeOffer, lateAttemptTime, lateAttemptTime);
    expect(pricingLateWindow.amountCents).toBe(REGULAR_CENTS);
  });

  it("distinguishes webhook notification delay from truly late payments and contains incident", async () => {
    const store = new Map<string, any>();
    const t0 = 1000000;
    const offerRecord = {
      userId: "user-timing",
      startedAt: t0,
      expiresAt: t0 + TWO_HOURS_MS,
      status: "active",
      createdAt: t0,
      updatedAt: t0,
    };
    store.set("user-timing", offerRecord);

    const fakeDb = {
      collection: () => ({
        doc: (id: string) => ({ id }),
      }),
      runTransaction: async (fn: any) => {
        const tx = {
          get: async (ref: any) => ({ exists: store.has(ref.id), data: () => store.get(ref.id) }),
          set: (ref: any, data: any) => store.set(ref.id, data),
          update: (ref: any, data: any) => store.set(ref.id, { ...store.get(ref.id), ...data }),
        };
        return fn(tx);
      },
    };

    // Caso 1: Pagamento feito dentro do prazo (t0 + 1 hora), mas webhook recebido 3 horas depois (delay externo)
    const onTimeResult = await processPromoPaymentTiming({
      userId: "user-timing",
      paidAt: t0 + 1 * 60 * 60 * 1000,
      receivedAt: t0 + 4 * 60 * 60 * 1000,
      amountCents: PROMO_CENTS,
      db: fakeDb as never,
    });

    expect(onTimeResult.honoured).toBe(true);
    expect(onTimeResult.incident).toBe(false);
    expect(store.get("user-timing").status).toBe("consumed");

    // Caso 2: Pagamento realmente tardio aceito pelo provedor fora da janela
    store.set("user-late", { ...offerRecord, userId: "user-late" });
    const lateResult = await processPromoPaymentTiming({
      userId: "user-late",
      paidAt: t0 + TWO_HOURS_MS + 45 * 60 * 1000, // 45 min após o prazo
      receivedAt: t0 + TWO_HOURS_MS + 50 * 60 * 1000,
      amountCents: PROMO_CENTS,
      db: fakeDb as never,
    });

    expect(lateResult.honoured).toBe(true); // Honra o mês do cliente sem cobrar a mais
    expect(lateResult.incident).toBe(true); // Aciona incidente e suspensão
    expect(store.get("user-late").status).toBe("suspended");
    expect(store.has("occurrence:late_promo:user-late")).toBe(true);
  });
});
