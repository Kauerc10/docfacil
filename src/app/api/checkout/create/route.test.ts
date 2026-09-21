import { describe, expect, it, beforeEach } from "bun:test";
import { POST } from "./route";
import { setRepositoriesForTesting } from "@/lib/server/firestore/repositories";
import { InMemoryOrdersRepository, InMemoryUsersRepository } from "@/lib/server/firestore/in-memory-repositories";
import { setBillingProviderForTesting, type BillingProvider } from "@/lib/server/billing/provider";

describe("POST /api/checkout/create", () => {
  let ordersRepo: InMemoryOrdersRepository;
  let mockProvider: BillingProvider;

  beforeEach(() => {
    ordersRepo = new InMemoryOrdersRepository(true);
    setRepositoriesForTesting({
      orders: ordersRepo,
      users: new InMemoryUsersRepository(true),
    });

    mockProvider = {
      createOneTimePayment: async (input) => ({
        kind: "pix",
        providerPaymentId: "mp_pix_12345",
        providerStatus: "pending",
        brCode: "00020126580014br.gov.bcb.pix0136test-pix-brcode",
        brCodeBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        expiresAt: new Date(Date.now() + 1800000).toISOString(),
        devMode: true,
      }),
      createSubscription: async (input) => ({
        kind: "hosted",
        providerCheckoutId: "mp_pref_98765",
        providerStatus: "pending",
        checkoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mp_pref_98765",
        devMode: true,
      }),
    };
    setBillingProviderForTesting(mockProvider);
  });

  function makeRequest(body: any, authHeader?: string): Request {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-app-check-token": "valid_token",
    };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }
    return new Request("https://docfacil.com.br/api/checkout/create", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  it("rejeita compra de plano Pro por convidado com 401", async () => {
    const res = await POST(
      makeRequest({
        product: "pro",
      })
    );

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error?.message).toMatch(/login/);
  });

  it("rejeita compra avulsa por convidado sem contato com 400", async () => {
    const res = await POST(
      makeRequest({
        product: "avulso",
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.message).toMatch(/contato/);
  });

  it("cria pedido Pix avulso para convidado com sucesso", async () => {
    const res = await POST(
      makeRequest({
        product: "avulso",
        method: "pix",
        guestContact: {
          email: "convidado@exemplo.com",
          phone: "11999998888",
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.kind).toBe("pix");
    expect(data.product).toBe("avulso");
    expect(data.amountCents).toBe(1990);
    expect(data.orderId).toBeDefined();
    expect(data.pix.brCode).toContain("br.gov.bcb.pix");
    expect(data.pix.brCodeBase64).toContain("base64");

    const savedOrder = await ordersRepo.getOrder(data.orderId);
    expect(savedOrder).not.toBeNull();
    expect(savedOrder?.status).toBe("pending");
    expect(savedOrder?.amountCents).toBe(1990);
    expect(savedOrder?.brCode).toBe(data.pix.brCode);
  });
});
