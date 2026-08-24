import { describe, expect, it } from "bun:test";
import { resolveAccountBillingState } from "@/lib/server/billing/account-state";

const PAID_THROUGH = Date.UTC(2026, 8, 24);

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-1",
    provider: "abacatepay" as const,
    providerSubscriptionId: "sub_secret_provider_id",
    providerCheckoutId: "checkout_secret_provider_id",
    providerProductId: "product_secret_provider_id",
    product: "pro" as const,
    method: "card" as const,
    status: "active" as const,
    autoRenew: true,
    amountCents: 3990 as const,
    paidThrough: PAID_THROUGH,
    lastPaidAt: Date.UTC(2026, 7, 24),
    lastPaymentId: "payment_secret_provider_id",
    createdAt: Date.UTC(2026, 7, 24),
    updatedAt: Date.UTC(2026, 7, 24),
    ...overrides,
  };
}

describe("plano efetivo da conta", () => {
  it("mantém Pro enquanto existir período pago, mesmo após cancelamento", () => {
    const state = resolveAccountBillingState(
      subscription({ status: "cancelled", autoRenew: false }),
      PAID_THROUGH - 1
    );

    expect(state.plan).toBe("pro");
    expect(state.subscription).toEqual({
      status: "cancelled",
      autoRenew: false,
      paidThrough: PAID_THROUGH,
    });
  });

  it("volta para grátis quando o período pago expira", () => {
    const state = resolveAccountBillingState(subscription(), PAID_THROUGH);

    expect(state.plan).toBe("gratis");
  });

  it("não expõe ids internos do gateway no estado enviado ao cliente", () => {
    const state = resolveAccountBillingState(subscription(), PAID_THROUGH - 1);
    const serialized = JSON.stringify(state);

    expect(serialized).not.toContain("sub_secret_provider_id");
    expect(serialized).not.toContain("checkout_secret_provider_id");
    expect(serialized).not.toContain("product_secret_provider_id");
    expect(serialized).not.toContain("payment_secret_provider_id");
  });

  it("AuthContext usa o plano autoritativo em vez do plano legado do perfil", async () => {
    const authSource = await Bun.file("src/lib/auth-context.tsx").text();

    expect(authSource).toContain("getAccountBillingState");
    expect(authSource).toContain("plano: billingState.plan");
  });
});
