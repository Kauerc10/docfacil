import { describe, expect, it } from "bun:test";
import { BackendError } from "../../../lib/server/errors";
import { claimVerifiedPurchases, isClaimedPurchaseOwner, type PurchaseClaimStore } from "../../../lib/server/billing/claim-purchases";

function fakeStore() {
  const claims = new Map<string, string>();
  const orders = [{ id: "o1", provider: "mercadopago", product: "avulso", amountCents: 1990, buyer: { type: "guest", email: "owner@example.com" }, status: "consumed", documentId: "d1", createdAt: 1 } as any];
  const store: PurchaseClaimStore = {
    async findGuestOrders(email, cursor, limit) { return { orders: email === "owner@example.com" && !cursor ? orders.slice(0, limit) : [], nextCursor: undefined }; },
    async claimOrder({ order, userId }) { if (claims.has(order.id!)) return claims.get(order.id!) === userId ? "already_claimed" : "skipped"; claims.set(order.id!, userId); return "claimed"; },
    async isClaimedPurchaseOwner(userId, orderId) { return claims.get(orderId) === userId; },
  };
  return store;
}

describe("claim verified purchases", () => {
  it("requires verified email and claims only matching Mercado Pago guest purchases", async () => {
    const store = fakeStore();
    await expect(claimVerifiedPurchases({ userId: "u1", email: "owner@example.com", emailVerified: false }, { store })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    const result = await claimVerifiedPurchases({ userId: "u1", email: " Owner@Example.com ", emailVerified: true }, { store });
    expect(result.claimed).toBe(1);
    expect(await isClaimedPurchaseOwner("u1", "o1", store)).toBe(true);
  });

  it("is idempotent and never transfers an existing claim", async () => {
    const store = fakeStore();
    await claimVerifiedPurchases({ userId: "u1", email: "owner@example.com", emailVerified: true }, { store });
    const repeated = await claimVerifiedPurchases({ userId: "u1", email: "owner@example.com", emailVerified: true }, { store });
    const other = await claimVerifiedPurchases({ userId: "u2", email: "owner@example.com", emailVerified: true }, { store });
    expect(repeated.alreadyClaimed).toBe(1);
    expect(other.skipped).toBe(1);
    expect(await isClaimedPurchaseOwner("u1", "o1", store)).toBe(true);
    expect(await isClaimedPurchaseOwner("u2", "o1", store)).toBe(false);
  });
});
