import { describe, expect, it, beforeEach } from "bun:test";
import crypto from "crypto";
import { handleMercadoPagoWebhook } from "./route";
import { setRepositoriesForTesting } from "@/lib/server/firestore/repositories";
import {
  InMemoryOrdersRepository,
  InMemoryUsersRepository,
  InMemoryWebhookEventsRepository,
  InMemoryDocumentsRepository,
  InMemoryAccessRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryGenerationCommitRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import type { IMercadoPagoClient } from "@/lib/server/billing/mercadopago/client";

describe("POST /api/webhooks/mercadopago", () => {
  const secret = "test_webhook_secret_key";
  let ordersRepo: InMemoryOrdersRepository;
  let usersRepo: InMemoryUsersRepository;
  let webhookEventsRepo: InMemoryWebhookEventsRepository;
  let mockMpClient: IMercadoPagoClient;

  beforeEach(() => {
    ordersRepo = new InMemoryOrdersRepository(true);
    usersRepo = new InMemoryUsersRepository(true);
    webhookEventsRepo = new InMemoryWebhookEventsRepository(true);

    setRepositoriesForTesting({
      orders: ordersRepo,
      users: usersRepo,
      webhookEvents: webhookEventsRepo,
    });
  });

  function makeWebhookRequest(
    dataId: string,
    body: any,
    options: {
      sign?: boolean;
      customSecret?: string;
      requestId?: string;
      ts?: string;
    } = {}
  ): Request {
    const { sign = true, customSecret = secret, requestId = "req_123" } = options;
    const ts = options.ts || Math.floor(Date.now() / 1000).toString();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-request-id": requestId,
    };

    if (sign) {
      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      const hash = crypto.createHmac("sha256", customSecret).update(manifest).digest("hex");
      headers["x-signature"] = `ts=${ts},v1=${hash}`;
    }

    return new Request("https://docfacil.com.br/api/webhooks/mercadopago", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  it("rejeita requisição com assinatura inválida com 401", async () => {
    const req = makeWebhookRequest("pay_123", { data: { id: "pay_123" }, type: "payment" }, {
      sign: false,
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
    });

    expect(res.status).toBe(401);
  });

  function createTestMpClient(overrides: Partial<IMercadoPagoClient> = {}): IMercadoPagoClient {
    return {
      createPayment: async () => ({} as any),
      createPreference: async () => ({} as any),
      createPreapproval: async () => ({} as any),
      getPayment: async () => ({} as any),
      getPreapproval: async () => ({} as any),
      cancelPreapproval: async () => ({} as any),
      ...overrides,
    };
  }

  it("processa pagamento avulso aprovado e marca o pedido como pago", async () => {
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "cliente@exemplo.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    mockMpClient = createTestMpClient({
      getPayment: async (id) => ({
        id: Number(id),
        status: "approved",
        date_approved: new Date().toISOString(),
        external_reference: order.id,
      }),
    });

    const req = makeWebhookRequest("998877", {
      action: "payment.updated",
      data: { id: "998877" },
      type: "payment",
      live_mode: false,
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);
    const updated = await ordersRepo.getOrder(order.id!);
    expect(updated?.status).toBe("paid");
    expect(updated?.externalPaymentId).toBe("998877");
    expect(updated?.paidAt).toBeDefined();
  });

  it("garante idempotência ao receber evento duplicado", async () => {
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "cliente@exemplo.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    let fetchCount = 0;
    mockMpClient = createTestMpClient({
      getPayment: async (id) => {
        fetchCount++;
        return {
          id: Number(id),
          status: "approved",
          external_reference: order.id,
        };
      },
    });

    const body = {
      action: "payment.updated",
      data: { id: "998877" },
      type: "payment",
    };

    const req1 = makeWebhookRequest("998877", body);
    const res1 = await handleMercadoPagoWebhook(req1, {
      secret,
      client: mockMpClient,
    });
    expect(res1.status).toBe(200);
    expect(fetchCount).toBe(1);

    const req2 = makeWebhookRequest("998877", body);
    const res2 = await handleMercadoPagoWebhook(req2, {
      secret,
      client: mockMpClient,
    });
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.duplicate).toBe(true);
    expect(fetchCount).toBe(1); // Não chamou a API do MP de novo
  });

  it("processa assinatura Pro e atualiza o plano do usuário para pro", async () => {
    const userId = "usr_prod_123";
    usersRepo.setUserProfile(userId, {
      plano: "gratis",
      email: "pro@docfacil.com.br",
    });

    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "pro@docfacil.com.br" },
      status: "pending",
      createdAt: Date.now(),
    });

    mockMpClient = createTestMpClient({
      getPayment: async (id) => ({
        id: Number(id),
        status: "approved",
        external_reference: order.id,
      }),
    });

    const req = makeWebhookRequest("776655", {
      action: "payment.created",
      data: { id: "776655" },
      type: "payment",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);
    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("paid");

    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("pro");
  });

  it("permite reprocessar payment.updated após payment.created pendente para o mesmo data.id", async () => {
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "cliente@exemplo.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    let paymentStatus: "pending" | "approved" = "pending";
    mockMpClient = createTestMpClient({
      getPayment: async (id) => ({
        id: Number(id),
        status: paymentStatus,
        external_reference: order.id,
      }),
    });

    // 1. Primeiro evento: payment.created (Pix gerado, pendente)
    const req1 = makeWebhookRequest(
      "998877",
      { action: "payment.created", data: { id: "998877" }, type: "payment" },
      { requestId: "delivery_1" }
    );
    const res1 = await handleMercadoPagoWebhook(req1, {
      secret,
      client: mockMpClient,
    });
    expect(res1.status).toBe(200);
    const orderAfterCreated = await ordersRepo.getOrder(order.id!);
    expect(orderAfterCreated?.status).toBe("pending");

    // 2. Cliente paga o Pix -> Mercado Pago envia payment.updated com o MESMO data.id ("998877")
    paymentStatus = "approved";
    const req2 = makeWebhookRequest(
      "998877",
      { action: "payment.updated", data: { id: "998877" }, type: "payment" },
      { requestId: "delivery_2" }
    );
    const res2 = await handleMercadoPagoWebhook(req2, {
      secret,
      client: mockMpClient,
    });
    expect(res2.status).toBe(200);
    const orderAfterUpdated = await ordersRepo.getOrder(order.id!);
    expect(orderAfterUpdated?.status).toBe("paid");
  });

  it("processa evento subscription_preapproval autorizado e atualiza o plano do usuário para pro", async () => {
    const userId = "usr_subscriber_999";
    usersRepo.setUserProfile(userId, {
      plano: "gratis",
      email: "subscriber@docfacil.com.br",
    });

    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "subscriber@docfacil.com.br" },
      status: "pending",
      createdAt: Date.now(),
    });

    mockMpClient = createTestMpClient({
      getPreapproval: async (id) => ({
        id,
        status: "authorized",
        external_reference: order.id,
      }),
    });

    const req = makeWebhookRequest("preapp_sub_555", {
      action: "updated",
      data: { id: "preapp_sub_555" },
      type: "subscription_preapproval",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);
    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("paid");
    expect(updatedOrder?.externalPaymentId).toBe("preapp_sub_555");

    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("pro");
  });

  it("não regride pedido já consumido para pago ao receber notificação de aprovação posterior", async () => {
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "cliente@exemplo.com" },
      status: "consumed",
      createdAt: Date.now() - 60000,
    });

    mockMpClient = createTestMpClient({
      getPayment: async (id) => ({
        id: Number(id),
        status: "approved",
        external_reference: order.id,
      }),
    });

    const req = makeWebhookRequest("late_pay_1", {
      action: "payment.updated",
      data: { id: "late_pay_1" },
      type: "payment",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);
    const orderAfter = await ordersRepo.getOrder(order.id!);
    expect(orderAfter?.status).toBe("consumed"); // Permanece consumed, não regride para paid
  });

  it("revoga o plano Pro e cancela o pedido quando recebe subscription_preapproval cancelada", async () => {
    const userId = "usr_cancelled_sub";
    usersRepo.setUserProfile(userId, {
      plano: "pro",
      email: "cancelled@docfacil.com.br",
    });

    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "cancelled@docfacil.com.br" },
      status: "paid",
      createdAt: Date.now() - 3600000,
    });

    mockMpClient = createTestMpClient({
      getPreapproval: async (id) => ({
        id,
        status: "cancelled",
        external_reference: order.id,
      }),
    });

    const req = makeWebhookRequest("preapp_cancel_1", {
      action: "updated",
      data: { id: "preapp_cancel_1" },
      type: "subscription_preapproval",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);
    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("cancelled");

    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("gratis"); // Revogado
  });

  it("restaura o plano Pro e marca o pedido como pago quando uma assinatura cancelada ou pausada é retomada como authorized", async () => {
    const userId = "usr_resumed_sub";
    usersRepo.setUserProfile(userId, {
      plano: "gratis",
      email: "resumed@docfacil.com.br",
    });

    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "resumed@docfacil.com.br" },
      status: "cancelled", // Estava cancelada/pausada
      createdAt: Date.now() - 7200000,
    });

    mockMpClient = createTestMpClient({
      getPreapproval: async (id) => ({
        id,
        status: "authorized", // Retomada
        external_reference: order.id,
      }),
    });

    const req = makeWebhookRequest("preapp_resume_1", {
      action: "updated",
      data: { id: "preapp_resume_1" },
      type: "subscription_preapproval",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);
    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("paid");
    expect(updatedOrder?.externalPaymentId).toBe("preapp_resume_1");

    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("pro");
  });
});

