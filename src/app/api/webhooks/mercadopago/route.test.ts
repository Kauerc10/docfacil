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

  it("ignora cancelamento de assinatura antiga que já foi substituída por uma nova assinatura Pro ativa", async () => {
    const userId = "usr_superseded_sub";
    const orderOld = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "user@docfacil.com.br" },
      status: "paid",
      createdAt: Date.now() - 10000000,
    });

    const orderNew = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "user@docfacil.com.br" },
      status: "paid",
      createdAt: Date.now() - 1000000,
    });

    usersRepo.setUserProfile(userId, {
      plano: "pro",
      email: "user@docfacil.com.br",
      subscriptionId: "preapp_new",
      subscriptionOrderId: orderNew.id,
    });

    mockMpClient = createTestMpClient({
      getPreapproval: async (id) => ({
        id: "preapp_old",
        status: "cancelled",
        external_reference: orderOld.id,
      }),
    });

    const req = makeWebhookRequest("preapp_old", {
      action: "updated",
      data: { id: "preapp_old" },
      type: "subscription_preapproval",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);

    const updatedOldOrder = await ordersRepo.getOrder(orderOld.id!);
    expect(updatedOldOrder?.status).toBe("cancelled");

    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("pro");
    expect(userProfile?.subscriptionId).toBe("preapp_new");
    expect(userProfile?.subscriptionOrderId).toBe(orderNew.id);
  });

  it("não sobrescreve plano ou ponteiros de assinatura ativa B quando uma assinatura mais antiga A é retomada como authorized", async () => {
    const userId = "usr_multiple_subs";
    const orderOld = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "user@docfacil.com.br" },
      status: "cancelled",
      createdAt: Date.now() - 10000000,
    });

    const orderNew = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "user@docfacil.com.br" },
      status: "paid",
      createdAt: Date.now() - 1000000,
    });

    // Usuário já está ativo na assinatura nova B
    usersRepo.setUserProfile(userId, {
      plano: "pro",
      email: "user@docfacil.com.br",
      subscriptionId: "preapp_B",
      subscriptionOrderId: orderNew.id,
    });

    // Webhook de retomada da assinatura antiga A quando B já está ativa
    let cancelledConflictingId = "";
    mockMpClient = createTestMpClient({
      getPreapproval: async (id) => ({
        id: "preapp_A",
        status: "authorized",
        external_reference: orderOld.id,
      }),
      cancelPreapproval: async (id) => {
        cancelledConflictingId = id;
        return { id, status: "cancelled" } as any;
      },
    });

    const req = makeWebhookRequest("preapp_A", {
      action: "updated",
      data: { id: "preapp_A" },
      type: "subscription_preapproval",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);

    // A assinatura conflitante A é cancelada no Mercado Pago para não gerar cobrança duplicada
    expect(cancelledConflictingId).toBe("preapp_A");

    // O pedido antigo A é marcado como cancelled
    const updatedOldOrder = await ordersRepo.getOrder(orderOld.id!);
    expect(updatedOldOrder?.status).toBe("cancelled");

    // Mas os ponteiros do usuário PERMANECEM apontando para a assinatura B ativa!
    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("pro");
    expect(userProfile?.subscriptionId).toBe("preapp_B");
    expect(userProfile?.subscriptionOrderId).toBe(orderNew.id);
  });

  it("propaga erro e libera claim do webhook quando cancelPreapproval falhar para assinatura conflitante", async () => {
    const userId = "usr_concurrent_conflict_fail";
    const orderOld = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId },
      status: "pending",
      createdAt: Date.now(),
    });
    const orderNew = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId },
      status: "paid",
      externalPaymentId: "preapp_B",
      createdAt: Date.now(),
    });

    usersRepo.setUserProfile(userId, {
      plano: "pro",
      email: "user@docfacil.com.br",
      subscriptionId: "preapp_B",
      subscriptionOrderId: orderNew.id,
    });

    mockMpClient = createTestMpClient({
      getPreapproval: async () => ({
        id: "preapp_A",
        status: "authorized",
        external_reference: orderOld.id,
      }),
      cancelPreapproval: async () => {
        throw new Error("Mercado Pago API indisponível temporariamente");
      },
    });

    const req = makeWebhookRequest("preapp_A", {
      action: "updated",
      data: { id: "preapp_A" },
      type: "subscription_preapproval",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    // Erro é propagado como 500 para que o webhook seja retentado pelo gateway
    expect(res.status).toBe(500);

    // O pedido antigo A NÃO foi marcado como cancelled
    const updatedOldOrder = await ordersRepo.getOrder(orderOld.id!);
    expect(updatedOldOrder?.status).toBe("pending");

    // A claim do evento foi liberada para permitir retry
    const eventKey = "subscription_preapproval:preapp_A:updated";
    const canReclaim = await webhookEventsRepo.claim(eventKey, Date.now());
    expect(canReclaim).toBe(true);
  });

  it("marca pedido como failed quando recebe evento payment com status rejected", async () => {
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "card_fail@exemplo.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    mockMpClient = createTestMpClient({
      getPayment: async (id) => ({
        id: Number(id) || 99999,
        status: "rejected",
        status_detail: "cc_rejected_bad_filled_security_code",
        external_reference: order.id,
        payment_method_id: "master",
        transaction_amount: 19.9,
      }),
    });

    const req = makeWebhookRequest("pay_rejected_1", {
      action: "payment.updated",
      data: { id: "pay_rejected_1" },
      type: "payment",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);

    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("failed");
  });

  it("permite que uma tentativa aprovada posterior recupere um pedido com status failed para paid sem reabrir pedidos consumidos", async () => {
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "card_retry@exemplo.com" },
      status: "failed", // Primeira tentativa falhou
      createdAt: Date.now() - 60000,
    });

    mockMpClient = createTestMpClient({
      getPayment: async (id) => ({
        id: Number(id) || 123456,
        status: "approved",
        external_reference: order.id,
        payment_method_id: "visa",
        transaction_amount: 19.9,
      }),
    });

    const req = makeWebhookRequest("pay_approved_after_fail", {
      action: "payment.created",
      data: { id: "pay_approved_after_fail" },
      type: "payment",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);

    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("paid");
  });

  it("garante que a concessão do plano Pro seja reexecutada na redelivery mesmo quando o pedido já foi gravado como paid", async () => {
    const userId = "usr_pro_redelivery";
    usersRepo.setUserProfile(userId, {
      plano: "gratis", // Simulando que a primeira execução falhou antes de atualizar o plano
      email: "pro_retry@docfacil.com.br",
    });

    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "pro_retry@docfacil.com.br" },
      status: "paid", // Pedido já estava gravado como pago
      createdAt: Date.now() - 30000,
    });

    mockMpClient = createTestMpClient({
      getPayment: async (id) => ({
        id: Number(id) || 789012,
        status: "approved",
        external_reference: order.id,
      }),
    });

    const req = makeWebhookRequest("pay_pro_redelivery_1", {
      action: "payment.updated",
      data: { id: "pay_pro_redelivery_1" },
      type: "payment",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);

    // O plano do usuário deve ser atualizado para Pro mesmo o pedido já estando pago
    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("pro");
  });

  it("não restaura o plano Pro se o pedido estiver cancelado após cancelamento da assinatura", async () => {
    const userId = "usr_pro_cancelled";
    usersRepo.setUserProfile(userId, {
      plano: "gratis", // Usuário cancelou a assinatura
      email: "pro_cancelled@docfacil.com.br",
    });

    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "pro_cancelled@docfacil.com.br" },
      status: "cancelled", // Pedido foi marcado como cancelled na rota de cancelamento
      createdAt: Date.now() - 40000,
    });

    mockMpClient = createTestMpClient({
      getPayment: async (id) => ({
        id: Number(id) || 998877,
        status: "approved",
        external_reference: order.id,
      }),
    });

    const req = makeWebhookRequest("pay_delayed_after_cancel", {
      action: "payment.created",
      data: { id: "pay_delayed_after_cancel" },
      type: "payment",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);

    // O pedido continua cancelado e o plano do usuário permanece 'gratis'
    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("cancelled");

    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("gratis");
  });

  it("não sobrescreve os ponteiros da assinatura ativa B se chegar pagamento de assinatura anterior A já substituída", async () => {
    const userId = "usr_pro_superseded";
    usersRepo.setUserProfile(userId, {
      plano: "pro",
      subscriptionId: "sub_B_active",
      subscriptionOrderId: "ord_B_active",
      email: "pro_superseded@docfacil.com.br",
    });

    const orderA = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "pro_superseded@docfacil.com.br" },
      status: "paid",
      createdAt: Date.now() - 60000,
    });

    mockMpClient = createTestMpClient({
      getPayment: async (id) => ({
        id: Number(id) || 112233,
        status: "approved",
        external_reference: orderA.id,
      }),
    });

    const req = makeWebhookRequest("pay_order_A_superseded", {
      action: "payment.created",
      data: { id: "pay_order_A_superseded" },
      type: "payment",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);

    // A assinatura ativa B permanece intacta
    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("pro");
    expect(userProfile?.subscriptionOrderId).toBe("ord_B_active");
    expect(userProfile?.subscriptionId).toBe("sub_B_active");
  });

  it("ativa entitlement Pro no perfil antes de marcar o pedido como paid no webhook authorized de preapproval", async () => {
    const userId = "usr_pro_entitlement_order";
    usersRepo.setUserProfile(userId, {
      plano: "gratis",
      email: "order_first@docfacil.com.br",
    });

    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "order_first@docfacil.com.br" },
      status: "pending",
      createdAt: Date.now() - 10000,
    });

    let profileWasProWhenOrderBecamePaid = false;
    const originalMarkOrderPaid = ordersRepo.markOrderPaid.bind(ordersRepo);
    ordersRepo.markOrderPaid = async (orderId) => {
      const p = await usersRepo.getUserProfile(userId);
      if (p?.plano === "pro") {
        profileWasProWhenOrderBecamePaid = true;
      }
      return originalMarkOrderPaid(orderId);
    };

    mockMpClient = createTestMpClient({
      getPreapproval: async () => ({
        id: "preapp_order_test_123",
        status: "authorized",
        external_reference: order.id,
      }),
    });

    const req = makeWebhookRequest("sub_preapp_order_123", {
      action: "created",
      data: { id: "sub_preapp_order_123" },
      type: "subscription_preapproval",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);
    expect(profileWasProWhenOrderBecamePaid).toBe(true);

    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("pro");
    expect(userProfile?.subscriptionId).toBe("preapp_order_test_123");
  });

  it("armazena externalPaymentId do pedido como subscriptionId no perfil quando evento payment chega antes de preapproval", async () => {
    const userId = "usr_pro_early_payment";
    usersRepo.setUserProfile(userId, {
      plano: "gratis",
      email: "early_payment@docfacil.com.br",
    });

    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "early_payment@docfacil.com.br" },
      status: "pending",
      externalPaymentId: "preapp_created_at_checkout_456",
      createdAt: Date.now() - 15000,
    });

    mockMpClient = createTestMpClient({
      getPayment: async (id) => ({
        id: Number(id) || 445566,
        status: "approved",
        external_reference: order.id,
      }),
    });

    const req = makeWebhookRequest("pay_early_sub_payment", {
      action: "payment.created",
      data: { id: "pay_early_sub_payment" },
      type: "payment",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);

    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("pro");
    // O subscriptionId foi recuperado com sucesso a partir de order.externalPaymentId
    expect(userProfile?.subscriptionId).toBe("preapp_created_at_checkout_456");
    expect(userProfile?.subscriptionOrderId).toBe(order.id);
  });

  it("não limpa a reserva pendente de uma assinatura de substituição B ao receber webhook de cancelamento da assinatura A", async () => {
    const userId = "usr_pro_replacement";
    const orderA = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "replacement@docfacil.com.br" },
      status: "cancelled",
      createdAt: Date.now() - 60000,
    });

    // Usuário já cancelou A e iniciou o checkout para a assinatura B
    usersRepo.setUserProfile(userId, {
      plano: "gratis",
      email: "replacement@docfacil.com.br",
      subscriptionId: null,
      subscriptionOrderId: null,
      pendingProOrderId: "order_B_pending",
    });

    mockMpClient = createTestMpClient({
      getPreapproval: async () => ({
        id: "preapp_A_cancelled",
        status: "cancelled",
        external_reference: orderA.id,
      }),
    });

    const req = makeWebhookRequest("preapp_A_cancelled", {
      action: "updated",
      data: { id: "preapp_A_cancelled" },
      type: "subscription_preapproval",
    });

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
    });

    expect(res.status).toBe(200);

    // A reserva pendente da assinatura B NÃO foi apagada
    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.pendingProOrderId).toBe("order_B_pending");
  });

  it("preserva plano Pro até subscriptionExpiresAt ao receber webhook de cancelamento de preapproval vigente", async () => {
    const userId = "usr_pro_future_expiry";
    const now = 1770000000000;
    const futureExpiry = now + 15 * 24 * 60 * 60 * 1000; // 15 dias no futuro

    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "pro",
      amountCents: 3490,
      buyer: { type: "user", userId, email: "future@docfacil.com.br" },
      status: "paid",
      externalPaymentId: "preapp_future_cancel",
      paidAt: now - 15 * 24 * 60 * 60 * 1000,
      createdAt: now - 15 * 24 * 60 * 60 * 1000,
    });

    usersRepo.setUserProfile(userId, {
      plano: "pro",
      email: "future@docfacil.com.br",
      subscriptionId: "preapp_future_cancel",
      subscriptionOrderId: order.id,
      subscriptionExpiresAt: futureExpiry,
    });

    mockMpClient = createTestMpClient({
      getPreapproval: async () => ({
        id: "preapp_future_cancel",
        status: "cancelled",
        external_reference: order.id,
      }),
    });

    const req = makeWebhookRequest(
      "preapp_future_cancel",
      {
        action: "updated",
        data: { id: "preapp_future_cancel" },
        type: "subscription_preapproval",
      },
      { ts: Math.floor(now / 1000).toString() }
    );

    const res = await handleMercadoPagoWebhook(req, {
      secret,
      client: mockMpClient,
      now: () => now,
    });

    expect(res.status).toBe(200);

    // O pedido foi marcado como cancelado
    const updatedOrder = await ordersRepo.getOrder(order.id!);
    expect(updatedOrder?.status).toBe("cancelled");

    // O usuário retém o plano Pro com status cancelled e data de expiração preservada
    const userProfile = await usersRepo.getUserProfile(userId);
    expect(userProfile?.plano).toBe("pro");
    expect(userProfile?.subscriptionStatus).toBe("cancelled");
    expect(userProfile?.subscriptionExpiresAt).toBe(futureExpiry);
  });
});

