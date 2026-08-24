import { afterEach, describe, expect, it } from "bun:test";
import { POST } from "./route";
import {
  InMemoryBillingSubscriptionsRepository,
  InMemoryBillingWebhookEventsRepository,
  InMemoryOrdersRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import { setBillingRepositoriesForTesting } from "@/lib/server/firestore/billing-repositories";

function request(body: unknown): Request {
  return new Request("http://localhost/api/checkout/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function installRepos() {
  const orders = new InMemoryOrdersRepository(true);
  setBillingRepositoriesForTesting({
    orders,
    subscriptions: new InMemoryBillingSubscriptionsRepository(true),
    webhookEvents: new InMemoryBillingWebhookEventsRepository(true),
  });
  return orders;
}

afterEach(() => {
  setBillingRepositoriesForTesting(null);
});

describe("POST /api/checkout/status", () => {
  it("permite guest com e-mail e ignora telefone vazio", async () => {
    const orders = installRepos();
    const order = await orders.createOrder({
      provider: "abacatepay",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "guest@example.com" },
      status: "pending",
      method: "pix",
      createdAt: Date.now(),
    });

    const response = await POST(
      request({
        orderId: order.id,
        guestContact: { email: " guest@example.com ", phone: "   " },
      })
    );

    expect(response.status).toBe(200);
    expect((await response.json()).orderId).toBe(order.id);
  });

  it("permite guest com telefone apenas", async () => {
    const orders = installRepos();
    const order = await orders.createOrder({
      provider: "abacatepay",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", phone: "47999999999" },
      status: "pending",
      method: "pix",
      createdAt: Date.now(),
    });

    const response = await POST(
      request({
        orderId: order.id,
        guestContact: { email: "", phone: "47999999999" },
      })
    );

    expect(response.status).toBe(200);
  });

  it("rejeita outro guest sem revelar o pedido", async () => {
    const orders = installRepos();
    const order = await orders.createOrder({
      provider: "abacatepay",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "owner@example.com" },
      status: "pending",
      method: "pix",
      createdAt: Date.now(),
    });

    const response = await POST(
      request({ orderId: order.id, guestContact: { email: "other@example.com" } })
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("ORDER_FORBIDDEN");
  });

  it("devolve o documento já criado quando o pedido foi consumido", async () => {
    const orders = installRepos();
    const order = await orders.createOrder({
      provider: "abacatepay",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "guest@example.com" },
      status: "paid",
      method: "card",
      createdAt: Date.now(),
      paidAt: Date.now(),
    });

    await orders.consumeOrder(order.id!, "doc-ja-gerado");

    const response = await POST(
      request({
        orderId: order.id,
        guestContact: { email: "guest@example.com" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("consumed");
    expect(body.documentId).toBe("doc-ja-gerado");
  });
});
