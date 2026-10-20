import { describe, expect, it } from "bun:test";
import { createMercadoPagoCheckout } from "../../../lib/server/billing/mercadopago/checkout";
import { BackendError } from "../../../lib/server/errors";
import type { BillingSubscriptionRecord } from "../../../lib/server/billing/subscription";

const dummyReq = () => new Request("http://localhost:3000/api/checkout/create", { method: "POST" });
const dummyToken = "a".repeat(64);

describe("Mercado Pago Pro anti-duplicity & checkout", () => {
  it("rejects Pro subscription for guests", async () => {
    const input = {
      product: "pro",
      method: "card",
      requestId: crypto.randomUUID(),
      accessToken: dummyToken,
    };

    expect(createMercadoPagoCheckout(dummyReq(), { type: "guest" }, input)).rejects.toThrow(BackendError);
  });

  it("rejects Pro subscription via Pix", async () => {
    const input = {
      product: "pro",
      method: "pix",
      requestId: crypto.randomUUID(),
      accessToken: dummyToken,
    };

    expect(createMercadoPagoCheckout(dummyReq(), { type: "user", userId: "user-1", email: "user@example.com" }, input)).rejects.toThrow(BackendError);
  });

  it("blocks duplicate subscription when user already has active Pro access", async () => {
    const activeSub: BillingSubscriptionRecord = {
      userId: "user-active",
      provider: "mercadopago",
      providerSubscriptionId: "sub-123",
      providerProductId: "pro",
      product: "pro",
      method: "card",
      status: "active",
      autoRenew: true,
      amountCents: 3990,
      paidThrough: Date.now() + 86400000,
      lastPaidAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const input = {
      product: "pro",
      method: "card",
      requestId: crypto.randomUUID(),
      accessToken: dummyToken,
    };

    const deps = {
      subscriptions: {
        getByUserId: async (uid: string) => (uid === "user-active" ? activeSub : null),
      },
    };

    try {
      await createMercadoPagoCheckout(dummyReq(), { type: "user", userId: "user-active", email: "active@example.com" }, input, deps as never);
      expect(true).toBe(false);
    } catch (err: unknown) {
      expect(err instanceof BackendError).toBe(true);
      if (err instanceof BackendError) {
        expect(err.code).toBe("CONFLICT");
        expect(err.status).toBe(409);
      }
    }
  });

  it("creates a single hosted subscription and reuses the pending attempt idempotently", async () => {
    let callCount = 0;
    const sessionStore = new Map<string, any>();
    const fakeSessions = {
      begin: async ({ orderId, tokenHash, order }: any) => {
        if (!sessionStore.has(orderId)) {
          sessionStore.set(orderId, { state: "in_progress", owner: "owner-1", result: null });
          return { acquired: true, session: sessionStore.get(orderId) };
        }
        return { acquired: false, session: sessionStore.get(orderId) };
      },
      finish: async (orderId: string, owner: string, result: any) => {
        sessionStore.set(orderId, { state: "ready", owner, result });
      },
    };

    const fakeOrders = {
      updateProviderRefs: async () => {},
    };

    const deps = {
      sessions: fakeSessions,
      orders: fakeOrders as never,
      subscriptions: { getByUserId: async () => null },
      provider: {
        createSubscription: async () => {
          callCount++;
          return {
            kind: "hosted" as const,
            providerCheckoutId: "sub_mp_456",
            providerStatus: "pending",
            checkoutUrl: "https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=sub_mp_456",
            devMode: true,
          };
        },
      },
    };

    const reqId = crypto.randomUUID();
    const input = {
      product: "pro",
      method: "card",
      requestId: reqId,
      accessToken: dummyToken,
    };

    const res1 = await createMercadoPagoCheckout(dummyReq(), { type: "user", userId: "user-free", email: "free@example.com" }, input, deps as never);
    const body1 = await res1.json();

    expect(body1.kind).toBe("redirect");
    expect(body1.product).toBe("pro");
    expect(body1.amountCents).toBe(3990);
    expect(body1.checkoutUrl).toContain("sub_mp_456");
    expect(callCount).toBe(1);

    // Segunda chamada concorrente / retry com o mesmo requestId
    const res2 = await createMercadoPagoCheckout(dummyReq(), { type: "user", userId: "user-free", email: "free@example.com" }, input, deps as never);
    const body2 = await res2.json();

    expect(body2).toEqual(body1);
    expect(callCount).toBe(1); // Não chama o gateway novamente!
  });
});
