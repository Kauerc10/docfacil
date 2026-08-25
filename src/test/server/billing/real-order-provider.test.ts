import { describe, expect, it } from "bun:test";
import { InMemoryOrdersRepository } from "@/lib/server/firestore/in-memory-repositories";

describe("real billing order provider refs", () => {
  it("persists complete AbacatePay refs without changing paid-order lifecycle", async () => {
    const repo = new InMemoryOrdersRepository(true);
    const order = await repo.createOrder({
      provider: "abacatepay",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "user", userId: "user_123", email: "user@example.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    const updated = await repo.updateProviderRefs(order.id!, {
      method: "pix",
      providerPaymentId: "pix_char_123",
      providerCheckoutId: "bill_123",
      providerStatus: "PENDING",
      providerDevMode: true,
      pix: {
        brCode: "000201...PIX",
        brCodeBase64: "data:image/png;base64,abc",
        expiresAt: 1787599999999,
      },
    });

    expect(updated.provider).toBe("abacatepay");
    expect(updated.method).toBe("pix");
    expect(updated.providerPaymentId).toBe("pix_char_123");
    expect(updated.providerCheckoutId).toBe("bill_123");
    expect(updated.providerStatus).toBe("PENDING");
    expect(updated.providerDevMode).toBe(true);
    expect(updated.pix?.brCode).toContain("PIX");

    const stored = await repo.getOrder(order.id!);
    expect(stored?.providerPaymentId).toBe("pix_char_123");
    expect(stored?.pix?.expiresAt).toBe(1787599999999);

    const paid = await repo.markOrderPaid(order.id!);
    expect(paid.status).toBe("paid");
  });
});
