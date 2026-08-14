import { describe, expect, it, beforeEach } from "bun:test";
import { InMemoryOrdersRepository } from "@/lib/server/firestore/in-memory-repositories";
import { BackendError } from "@/lib/server/errors";

describe("Atomic Order Reservation & Lifecycle", () => {
  let ordersRepo: InMemoryOrdersRepository;

  beforeEach(() => {
    ordersRepo = new InMemoryOrdersRepository();
  });

  it("reserves a paid order atomically", async () => {
    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "guest@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    const reserved = await ordersRepo.reservePaidOrder({
      orderId: order.id!,
      requestId: "req_1",
      principalKey: "guest:fingerprint1",
    });

    expect(reserved.status).toBe("reserved");
    expect(reserved.reservedByRequestId).toBe("req_1");
  });

  it("rejects concurrent request trying to reserve the same order with a different requestId", async () => {
    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "guest@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    await ordersRepo.reservePaidOrder({
      orderId: order.id!,
      requestId: "req_1",
      principalKey: "guest:fingerprint1",
    });

    expect(
      ordersRepo.reservePaidOrder({
        orderId: order.id!,
        requestId: "req_2",
        principalKey: "guest:fingerprint2",
      })
    ).rejects.toThrow(BackendError);
  });

  it("allows idempotent retry with the exact same requestId", async () => {
    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "guest@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    const res1 = await ordersRepo.reservePaidOrder({
      orderId: order.id!,
      requestId: "req_1",
      principalKey: "guest:fingerprint1",
    });

    const res2 = await ordersRepo.reservePaidOrder({
      orderId: order.id!,
      requestId: "req_1",
      principalKey: "guest:fingerprint1",
    });

    expect(res2.id).toBe(res1.id);
    expect(res2.status).toBe("reserved");
  });

  it("releases reservation on failure", async () => {
    const order = await ordersRepo.createOrder({
      provider: "demo",
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "guest@example.com" },
      status: "paid",
      createdAt: Date.now(),
    });

    await ordersRepo.reservePaidOrder({
      orderId: order.id!,
      requestId: "req_1",
      principalKey: "guest:fingerprint1",
    });

    await ordersRepo.releaseReservedOrder({
      orderId: order.id!,
      requestId: "req_1",
    });

    const released = await ordersRepo.getOrder(order.id!);
    expect(released?.status).toBe("paid");
    expect(released?.reservedByRequestId).toBeUndefined();
  });
});
