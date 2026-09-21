import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { handleCancelSubscription } from "./route";
import { setRepositoriesForTesting } from "@/lib/server/firestore/repositories";
import { InMemoryOrdersRepository, InMemoryUsersRepository } from "@/lib/server/firestore/in-memory-repositories";
import { setAdminAuthForTesting } from "@/lib/server/firebase-admin";
import type { IMercadoPagoClient } from "@/lib/server/billing/mercadopago/client";

describe("POST /api/subscription/cancel", () => {
  let ordersRepo: InMemoryOrdersRepository;
  let usersRepo: InMemoryUsersRepository;
  let mockMpClient: IMercadoPagoClient;
  let cancelledPreapprovalId: string | null = null;

  beforeEach(() => {
    cancelledPreapprovalId = null;
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
            uid: "usr_pro_subscriber",
            email: "pro@exemplo.com",
          } as any;
        }
        if (token === "free_user_token") {
          return {
            uid: "usr_free",
            email: "free@exemplo.com",
          } as any;
        }
        throw new Error("Invalid token");
      },
    } as any);

    mockMpClient = {
      createPayment: async () => ({} as any),
      getPayment: async () => ({} as any),
      createPreference: async () => ({} as any),
      createPreapproval: async () => ({} as any),
      getPreapproval: async () => ({} as any),
      cancelPreapproval: async (id: string) => {
        cancelledPreapprovalId = id;
        return {
          id,
          status: "cancelled",
        };
      },
    };
  });

  afterEach(() => {
    setAdminAuthForTesting(null);
  });

  function makeRequest(authHeader?: string): Request {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-app-check-token": "valid_token",
    };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }
    return new Request("https://docfacil.com.br/api/subscription/cancel", {
      method: "POST",
      headers,
    });
  }

  it("rejeita requisição de convidado com 401", async () => {
    const res = await handleCancelSubscription(makeRequest(), {
      client: mockMpClient,
    });
    expect(res.status).toBe(401);
  });

  it("rejeita cancelamento de usuário que não possui plano Pro ativo com 400", async () => {
    usersRepo.setUserProfile("usr_free", {
      plano: "gratis",
      email: "free@exemplo.com",
    });

    const res = await handleCancelSubscription(
      makeRequest("Bearer free_user_token"),
      { client: mockMpClient }
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.message).toMatch(/não possui uma assinatura Pro ativa/);
  });

  it("cancela assinatura ativa no Mercado Pago, rebaixa para gratis e cancela pedido", async () => {
    const userId = "usr_pro_subscriber";
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "pro@exemplo.com" },
      status: "paid",
      externalPaymentId: "preapp_active_123",
      createdAt: Date.now() - 3600000,
    });

    usersRepo.setUserProfile(userId, {
      plano: "pro",
      email: "pro@exemplo.com",
      subscriptionId: "preapp_active_123",
      subscriptionOrderId: order.id,
    });

    const res = await handleCancelSubscription(
      makeRequest("Bearer valid_user_token"),
      { client: mockMpClient }
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toMatch(/cancelada com sucesso/);

    // Verifica chamada ao client do Mercado Pago
    expect(cancelledPreapprovalId).toBe("preapp_active_123");

    // Verifica rebaixamento do usuário para grátis
    const updatedProfile = await usersRepo.getUserProfile(userId);
    expect(updatedProfile?.plano).toBe("gratis");
    expect(updatedProfile?.subscriptionId).toBeNull();

    // Verifica cancelamento do pedido associado
    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("cancelled");
  });

  it("recupera o identificador da assinatura a partir do pedido associado quando profile.subscriptionId está ausente", async () => {
    const userId = "usr_pro_subscriber";
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "pro@exemplo.com" },
      status: "paid",
      externalPaymentId: "preapp_recovered_from_order",
      createdAt: Date.now() - 3600000,
    });

    usersRepo.setUserProfile(userId, {
      plano: "pro",
      email: "pro@exemplo.com",
      subscriptionId: null, // Ausente no perfil
      subscriptionOrderId: order.id,
    });

    const res = await handleCancelSubscription(
      makeRequest("Bearer valid_user_token"),
      { client: mockMpClient }
    );

    expect(res.status).toBe(200);
    expect(cancelledPreapprovalId).toBe("preapp_recovered_from_order");

    const updatedProfile = await usersRepo.getUserProfile(userId);
    expect(updatedProfile?.plano).toBe("gratis");
  });

  it("recusa o cancelamento com 400 se o identificador da assinatura não for localizado nem no perfil nem no pedido", async () => {
    const userId = "usr_pro_subscriber";
    usersRepo.setUserProfile(userId, {
      plano: "pro",
      email: "pro@exemplo.com",
      subscriptionId: null,
      subscriptionOrderId: null,
    });

    const res = await handleCancelSubscription(
      makeRequest("Bearer valid_user_token"),
      { client: mockMpClient }
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.message).toMatch(/Não foi possível localizar o identificador da assinatura/);

    // Garante que o usuário NÃO foi rebaixado sem cancelar no Mercado Pago
    const updatedProfile = await usersRepo.getUserProfile(userId);
    expect(updatedProfile?.plano).toBe("pro");
  });

  it("não rebaixa o usuário nem cancela o pedido se o cancelamento no Mercado Pago falhar", async () => {
    const userId = "usr_pro_subscriber";
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "pro@exemplo.com" },
      status: "paid",
      externalPaymentId: "preapp_fails",
      createdAt: Date.now() - 3600000,
    });

    usersRepo.setUserProfile(userId, {
      plano: "pro",
      email: "pro@exemplo.com",
      subscriptionId: "preapp_fails",
      subscriptionOrderId: order.id,
    });

    const failingClient: IMercadoPagoClient = {
      ...mockMpClient,
      cancelPreapproval: async () => {
        throw new Error("Mercado Pago API indisponível");
      },
    };

    const res = await handleCancelSubscription(
      makeRequest("Bearer valid_user_token"),
      { client: failingClient }
    );

    expect(res.status).toBe(500);

    // O usuário continua no plano Pro e o pedido continua paid
    const updatedProfile = await usersRepo.getUserProfile(userId);
    expect(updatedProfile?.plano).toBe("pro");

    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("paid");
  });
});
