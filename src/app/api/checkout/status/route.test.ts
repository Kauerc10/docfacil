import { describe, expect, it, beforeEach } from "bun:test";
import { POST } from "./route";
import { setRepositoriesForTesting } from "@/lib/server/firestore/repositories";
import { InMemoryOrdersRepository, InMemoryUsersRepository } from "@/lib/server/firestore/in-memory-repositories";

describe("POST /api/checkout/status", () => {
  let ordersRepo: InMemoryOrdersRepository;

  beforeEach(() => {
    ordersRepo = new InMemoryOrdersRepository(true);
    setRepositoriesForTesting({
      orders: ordersRepo,
      users: new InMemoryUsersRepository(true),
    });
  });

  function makeRequest(body: any): Request {
    return new Request("https://docfacil.com.br/api/checkout/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-check-token": "valid_token",
      },
      body: JSON.stringify(body),
    });
  }

  it("retorna 404 para pedido inexistente", async () => {
    const res = await POST(
      makeRequest({
        orderId: "ord_inexistente",
      })
    );

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error?.code).toBe("ORDER_NOT_FOUND");
  });

  it("retorna 403 quando convidado não fornece dados do comprador correspondente", async () => {
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "dono@exemplo.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    const res = await POST(
      makeRequest({
        orderId: order.id,
        guestContact: { email: "outro@exemplo.com" },
      })
    );

    expect(res.status).toBe(403);
  });

  it("retorna status e dados do Pix para pedido pendente com autorização de convidado", async () => {
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "cliente@exemplo.com" },
      status: "pending",
      brCode: "00020126580014br.gov.bcb.pix...",
      brCodeBase64: "data:image/png;base64,...",
      expiresAt: Date.now() + 1800000,
      createdAt: Date.now(),
    });

    const res = await POST(
      makeRequest({
        orderId: order.id,
        guestContact: { email: "cliente@exemplo.com" },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orderId).toBe(order.id);
    expect(data.status).toBe("pending");
    expect(data.amountCents).toBe(1990);
    expect(data.pix?.brCode).toBe(order.brCode);
  });

  it("retorna status paid após o pedido ser pago", async () => {
    const order = await ordersRepo.createOrder({
      provider: "mercadopago",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "guest", email: "cliente@exemplo.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    await ordersRepo.markOrderPaid(order.id!);

    const res = await POST(
      makeRequest({
        orderId: order.id,
        guestContact: { email: "cliente@exemplo.com" },
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("paid");
  });
});
