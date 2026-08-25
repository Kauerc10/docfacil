import { describe, expect, it } from "bun:test";
import {
  InMemoryBillingSubscriptionsRepository,
  InMemoryOrdersRepository,
} from "@/lib/server/firestore/in-memory-repositories";

describe("real billing repository contracts", () => {
  it("finds an order by the provider checkout id", async () => {
    const repo = new InMemoryOrdersRepository(true);
    const order = await repo.createOrder({
      provider: "abacatepay",
      product: "avulso",
      amountCents: 1990,
      buyer: { type: "user", userId: "user_lookup", email: "lookup@example.com" },
      status: "pending",
      createdAt: Date.now(),
    });

    await repo.updateProviderRefs(order.id!, {
      method: "card",
      providerCheckoutId: "bill_lookup_123",
      providerDevMode: true,
    });

    expect((await repo.findByProviderCheckoutId("bill_lookup_123"))?.id).toBe(
      order.id
    );
    expect(await repo.findByProviderCheckoutId("bill_missing")).toBeNull();
  });

  it("upserts a Pro subscription and resolves it by both identities", async () => {
    const repo = new InMemoryBillingSubscriptionsRepository(true);
    const now = Date.now();

    await repo.upsert({
      userId: "user_pro",
      provider: "abacatepay",
      providerSubscriptionId: "sub_123",
      providerCheckoutId: "bill_pro_123",
      providerProductId: "prod_pro_monthly",
      product: "pro",
      method: "card",
      status: "active",
      autoRenew: true,
      amountCents: 3990,
      paidThrough: now + 30 * 24 * 60 * 60 * 1000,
      lastPaidAt: now,
      createdAt: now,
      updatedAt: now,
    });

    expect((await repo.getByUserId("user_pro"))?.providerSubscriptionId).toBe(
      "sub_123"
    );
    expect((await repo.getByProviderSubscriptionId("sub_123"))?.userId).toBe(
      "user_pro"
    );
  });
});
