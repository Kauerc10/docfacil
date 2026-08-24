import { describe, expect, it } from "bun:test";
import { InMemoryOrdersRepository } from "@/lib/server/firestore/in-memory-repositories";

describe("real billing order provider refs", () => {
  it("persists AbacatePay provider refs without changing paid-order lifecycle", async () => {
    const repo = new InMemoryOrdersRepository(true);
    const order = await repo.createOrder({
      provider: "abacatepay" as never,
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "user", userId: "user_123", email: "user@example.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    await (repo as unknown as {
      updateProviderRefs(orderId: string, refs: {
        providerPaymentId?: string;
        providerCheckoutId?: string;
        providerDevMode?: boolean;
      }): Promise<void>;
    }).updateProviderRefs(order.id!, {
      providerPaymentId: "pix_char_123",
      providerDevMode: true,
    });

    const stored = await repo.getOrder(order.id!);
    expect(stored?.provider).toBe("abacatepay");
    expect((stored as any)?.providerPaymentId).toBe("pix_char_123");
    expect((stored as any)?.providerDevMode).toBe(true);

    const paid = await repo.markOrderPaid(order.id!);
    expect(paid.status).toBe("paid");
  });
});
