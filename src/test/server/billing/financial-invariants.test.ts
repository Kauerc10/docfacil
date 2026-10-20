import { describe, expect, it } from "bun:test";
import {
  InMemoryBillingSubscriptionsRepository,
  InMemoryBillingWebhookEventsRepository,
} from "@/lib/server/firestore/in-memory-repositories";

describe("financial transition invariants", () => {
  it("applies a subscription payment once even when two workers race", async () => {
    const repo = new InMemoryBillingSubscriptionsRepository(true);
    const paidAt = Date.UTC(2026, 7, 24, 19, 45, 0);
    await repo.upsert({
      userId: "usr_financial",
      provider: "abacatepay",
      providerSubscriptionId: "sub_financial",
      providerProductId: "prod_pro_3990",
      product: "pro",
      method: "card",
      status: "active",
      autoRenew: true,
      amountCents: 3990,
      paidThrough: Date.UTC(2026, 8, 24, 19, 45, 0),
      lastPaidAt: paidAt,
      lastPaymentId: "initial",
      createdAt: paidAt,
      updatedAt: paidAt,
    });

    const results = await Promise.all([
      repo.renewWithPayment({
        userId: "usr_financial",
        providerSubscriptionId: "sub_financial",
        paymentId: "renewal-1",
        paidAt: Date.UTC(2026, 8, 20, 12, 0, 0),
      }),
      repo.renewWithPayment({
        userId: "usr_financial",
        providerSubscriptionId: "sub_financial",
        paymentId: "renewal-1",
        paidAt: Date.UTC(2026, 8, 20, 12, 0, 0),
      }),
    ]);

    expect(results.filter((result) => result.applied)).toHaveLength(1);
    const current = await repo.getByUserId("usr_financial");
    expect(current?.lastPaymentId).toBe("renewal-1");
    expect(current?.paidThrough).toBe(Date.UTC(2026, 9, 24, 19, 45, 0));
  });

  it("reclaims an abandoned webhook lease only after its TTL and protects the owner", async () => {
    const repo = new InMemoryBillingWebhookEventsRepository(true);
    const claimedAt = Date.UTC(2026, 7, 24, 19, 0, 0);

    expect(await repo.claim("event-lease", claimedAt, "worker-a")).toBe(true);
    expect(await repo.claim("event-lease", claimedAt + 4 * 60_000, "worker-b")).toBe(false);
    expect(await repo.claim("event-lease", claimedAt + 5 * 60_000, "worker-b")).toBe(true);

    await repo.complete("event-lease", claimedAt + 5 * 60_000, "worker-a");
    expect(await repo.claim("event-lease", claimedAt + 6 * 60_000, "worker-c")).toBe(false);
    await repo.complete("event-lease", claimedAt + 6 * 60_000, "worker-b");
    expect(await repo.claim("event-lease", claimedAt + 7 * 60_000, "worker-c")).toBe(false);
  });
});
