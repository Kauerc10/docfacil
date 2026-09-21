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

  it("processa pagamento avulso aprovado e marca o pedido como pago", async () => {
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "cliente@exemplo.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    mockMpClient = {
      createPayment: async () => ({} as any),
      createPreference: async () => ({} as any),
      getPayment: async (id) => ({
        id: Number(id),
        status: "approved",
        date_approved: new Date().toISOString(),
        external_reference: order.id,
      }),
    };

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
    mockMpClient = {
      createPayment: async () => ({} as any),
      createPreference: async () => ({} as any),
      getPayment: async (id) => {
        fetchCount++;
        return {
          id: Number(id),
          status: "approved",
          external_reference: order.id,
        };
      },
    };

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

    mockMpClient = {
      createPayment: async () => ({} as any),
      createPreference: async () => ({} as any),
      getPayment: async (id) => ({
        id: Number(id),
        status: "approved",
        external_reference: order.id,
      }),
    };

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
});
