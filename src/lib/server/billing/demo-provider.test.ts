import { describe, expect, it, beforeEach } from "bun:test";
import { DemoBillingProvider } from "./demo-provider";
import { InMemoryOrdersRepository } from "../firestore/in-memory-repositories";
import { BackendError } from "../errors";

describe("DemoBillingProvider", () => {
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
      amountCents: 1990,
      buyer: { type: "guest", email: "guest@example.com" },
    });

    expect(order.id).toBeDefined();
    expect(order.status).toBe("pending");
    expect(order.amountCents).toBe(1990);

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
        amountCents: 1990,
        buyer: { type: "guest" },
      })
    ).rejects.toThrow(BackendError);
  });

  it("allows demo billing in Vercel Preview without depending on a manual flag", async () => {
    const provider = new DemoBillingProvider(ordersRepo, {
      allowDemoBilling: false,
      nodeEnv: "production",
      vercelEnv: "preview",
    });

    const order = await provider.createOrder({
      product: "pro",
      amountCents: 3990,
      buyer: { type: "user", userId: "usr_preview", email: "preview@example.com" },
    });

    expect(order.status).toBe("pending");
  });

  it("fails closed in final production even if allowDemoBilling is true", async () => {
    const provider = new DemoBillingProvider(ordersRepo, {
      allowDemoBilling: true,
      nodeEnv: "production",
      vercelEnv: "production",
    });

    expect(
      provider.createOrder({
        product: "avulso",
        amountCents: 1990,
        buyer: { type: "guest" },
      })
    ).rejects.toThrow(BackendError);
  });
});
