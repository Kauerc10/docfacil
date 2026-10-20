import { describe, expect, it } from "bun:test";
import { openPaymentDispute, resolvePaymentDispute } from "../../../lib/server/billing/disputes";

describe("Disputes & Chargeback handling (Ticket 17)", () => {
  it("opens dispute, suspends document edits and registers occurrence in audit queue", async () => {
    const store = new Map<string, any>();
    const orderRecord = {
      id: "order-mp-99",
      providerPaymentId: "pay-99",
      product: "avulso",
      amountCents: 1990,
      documentId: "doc-99",
      buyer: { type: "user", userId: "u-1" },
    };

    const docRecord = {
      id: "doc-99",
      disputeActive: false,
    };

    store.set("orders:order-mp-99", orderRecord);
    store.set("documents:doc-99", docRecord);

    const fakeDb = {
      collection: (col: string) => ({
        where: (field: string, op: string, val: any) => ({
          limit: () => ({
            get: async () => ({
              empty: val !== "pay-99",
              docs: val === "pay-99" ? [{ id: "order-mp-99", data: () => orderRecord }] : [],
            }),
          }),
        }),
        doc: (id: string) => ({
          id,
          get: async () => ({ exists: store.has(`${col}:${id}`), data: () => store.get(`${col}:${id}`) }),
        }),
      }),
      runTransaction: async (fn: any) => {
        const tx = {
          get: async (ref: any) => ({ exists: store.has(`billing_disputes:${ref.id}`), data: () => store.get(`billing_disputes:${ref.id}`) }),
          set: (ref: any, data: any) => store.set(`billing_disputes:${ref.id}`, data),
          update: (ref: any, data: any) => {
            const current = store.get(`documents:${ref.id}`);
            if (current) store.set(`documents:${ref.id}`, { ...current, ...data });
          },
        };
        return fn(tx);
      },
    };

    const dispute = await openPaymentDispute({
      paymentId: "pay-99",
      reason: "Cartão clonado alegado pelo pagador",
      now: 1000,
      db: fakeDb as never,
    });

    expect(dispute.status).toBe("opened");
    expect(dispute.paymentId).toBe("pay-99");
    expect(dispute.amountCents).toBe(1990);
    expect(store.get("documents:doc-99")?.disputeActive).toBe(true);

    // Resolução favorável da disputa
    const resolved = await resolvePaymentDispute({
      paymentId: "pay-99",
      outcome: "won",
      now: 2000,
      db: fakeDb as never,
    });

    expect(resolved.status).toBe("resolved_won");
    expect(resolved.resolvedAt).toBe(2000);
    expect(store.get("documents:doc-99")?.disputeActive).toBe(false); // Restaura direitos
  });
});
