import { describe, expect, it, beforeEach } from "bun:test";
import { DemoBillingProvider } from "@/lib/server/billing/demo-provider";
import { InMemoryOrdersRepository } from "@/lib/server/firestore/in-memory-repositories";
import { BackendError } from "@/lib/server/errors";

describe("DemoBillingProvider Fail-Closed & Pricing", () => {
  let ordersRepo: InMemoryOrdersRepository;

  beforeEach(() => {
    ordersRepo = new InMemoryOrdersRepository();
  });

  it("creates a pending order and simulates payment when demo billing is allowed", async () => {
    const provider = new DemoBillingProvider(ordersRepo, {
      allowDemoBilling: true,
      nodeEnv: "development",
    });

    const order = await provider.createOrder({
      product: "avulso",
      amountCents: 990,
      buyer: { type: "guest", email: "guest@example.com" },
    });

    expect(order.id).toBeDefined();
    expect(order.status).toBe("pending");
    expect(order.amountCents).toBe(990);

    const paidOrder = await provider.simulatePayment(order.id!);
    expect(paidOrder.status).toBe("paid");
    expect(paidOrder.paidAt).toBeDefined();
  });

  it("fails closed and throws error when demo billing is disabled", async () => {
    const provider = new DemoBillingProvider(ordersRepo, {
      allowDemoBilling: false,
      nodeEnv: "development",
    });

    expect(
      provider.createOrder({
        product: "avulso",
        amountCents: 990,
        buyer: { type: "guest" },
      })
    ).rejects.toThrow(BackendError);
  });

  it("fails closed in production even if allowDemoBilling is true", async () => {
    const provider = new DemoBillingProvider(ordersRepo, {
      allowDemoBilling: true,
      nodeEnv: "production",
    });

    expect(
      provider.createOrder({
        product: "avulso",
        amountCents: 990,
        buyer: { type: "guest" },
      })
    ).rejects.toThrow(BackendError);
  });
});
