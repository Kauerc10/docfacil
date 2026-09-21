import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { POST } from "./route";
import { setRepositoriesForTesting } from "@/lib/server/firestore/repositories";
import { InMemoryOrdersRepository, InMemoryUsersRepository } from "@/lib/server/firestore/in-memory-repositories";
import { setBillingProviderForTesting, type BillingProvider } from "@/lib/server/billing/provider";
import { setAdminAuthForTesting } from "@/lib/server/firebase-admin";

describe("POST /api/checkout/create", () => {
  let ordersRepo: InMemoryOrdersRepository;
  let usersRepo: InMemoryUsersRepository;
  let mockProvider: BillingProvider;

  beforeEach(() => {
    ordersRepo = new InMemoryOrdersRepository(true);
    usersRepo = new InMemoryUsersRepository(true);
    setRepositoriesForTesting({
      orders: ordersRepo,
      users: usersRepo,
    });

    setAdminAuthForTesting({
      verifyIdToken: async (token: string) => {
        if (token === "valid_user_token") {
          return {
            uid: "usr_123",
            email: "usuario@exemplo.com",
          } as any;
        }
        throw new Error("Invalid token");
      },
    } as any);

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

  afterEach(() => {
    setAdminAuthForTesting(null);
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

  it("cria pedido avulso com cartão de crédito retornando redirect e checkoutUrl", async () => {
    let capturedMethod: string | undefined;
    mockProvider.createOneTimePayment = async (input) => {
      capturedMethod = input.method;
      return {
        kind: "hosted",
        providerCheckoutId: "pref_card_123",
        providerStatus: "pending",
        checkoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_card_123",
        devMode: true,
      };
    };

    const res = await POST(
      makeRequest({
        product: "avulso",
        method: "credit_card",
        guestContact: {
          email: "cartao@exemplo.com",
          phone: "11999998888",
        },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.kind).toBe("redirect");
    expect(data.checkoutUrl).toContain("pref_card_123");
    expect(capturedMethod).toBe("credit_card");

    const savedOrder = await ordersRepo.getOrder(data.orderId);
    expect(savedOrder?.checkoutUrl).toContain("pref_card_123");
  });

  it("força view=checkout na completionUrl mesmo quando caller envia view=sucesso", async () => {
    let capturedCompletionUrl: string | undefined;
    mockProvider.createSubscription = async (input) => {
      capturedCompletionUrl = input.completionUrl;
      return {
        kind: "hosted",
        providerCheckoutId: "pref_pro_123",
        providerStatus: "pending",
        checkoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_pro_123",
        devMode: true,
      };
    };

    const res = await POST(
      makeRequest(
        {
          product: "pro",
          successUrl: "https://docfacil.com.br/?view=sucesso&slug=locacao-residencial",
        },
        "Bearer valid_user_token"
      )
    );

    expect(res.status).toBe(200);
    expect(capturedCompletionUrl).toBeDefined();
    const parsed = new URL(capturedCompletionUrl!);
    expect(parsed.searchParams.get("view")).toBe("checkout");
    expect(parsed.searchParams.get("plan")).toBe("pro");
    expect(parsed.searchParams.get("billingReturn")).toBe("1");
    expect(parsed.searchParams.get("slug")).toBe("locacao-residencial");
    expect(parsed.searchParams.get("orderId")).toBeDefined();
  });

  it("rejeita compra de plano Pro quando o usuário já possui assinatura Pro ativa com 409 Conflict", async () => {
    usersRepo.setUserProfile("usr_123", {
      plano: "pro",
      email: "usuario@exemplo.com",
    });

    const res = await POST(
      makeRequest(
        { product: "pro" },
        "Bearer valid_user_token"
      )
    );

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error?.message).toMatch(/já possui uma assinatura do Plano Pro ativa/);
  });

  it("reaproveita pedido Pro pendente e sua URL de checkout sem criar assinatura duplicada", async () => {
    const existingOrder = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId: "usr_123" },
      status: "pending",
      checkoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=existing_pref",
      createdAt: Date.now() - 5000,
    });

    usersRepo.setUserProfile("usr_123", {
      plano: "gratis",
      email: "usuario@exemplo.com",
      pendingProOrderId: existingOrder.id,
    });

    let subscriptionCreated = false;
    mockProvider.createSubscription = async () => {
      subscriptionCreated = true;
      throw new Error("Should not be called");
    };

    const res = await POST(
      makeRequest(
        { product: "pro" },
        "Bearer valid_user_token"
      )
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orderId).toBe(existingOrder.id);
    expect(data.checkoutUrl).toBe("https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=existing_pref");
    expect(subscriptionCreated).toBe(false);
  });
});
