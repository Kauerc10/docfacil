/**
 * Checkout service — integração com gateways de pagamento brasileiros.
 * Suporta kirvano, perfectpay, stripe. Demo mode simula.
 * Preços e rótulos vêm de `@/lib/pricing` (fonte única de verdade).
 */
import { PLAN_PRICES, PLAN_LABELS, type PaidPlan } from "@/lib/pricing";

export type CheckoutProvider = "kirvano" | "perfectpay" | "stripe";
export type CheckoutPlan = PaidPlan;

export interface CheckoutParams {
  provider?: CheckoutProvider; plan: CheckoutPlan; userId?: string; userEmail?: string;
  documentId?: string; successUrl?: string;
}
export interface CheckoutResult {
  checkoutUrl: string; orderId: string; provider: CheckoutProvider; plan: CheckoutPlan; amount: number;
}

// Re-exporta para compatibilidade — consumidores existentes continuam funcionando.
// Prefira importar diretamente de `@/lib/pricing` em código novo.
export { PLAN_PRICES, PLAN_LABELS } from "@/lib/pricing";

export const ACTIVE_PROVIDER: CheckoutProvider | "demo" =
  (process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER as CheckoutProvider | undefined) || "demo";

const IS_PRODUCTION_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER && process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER !== "demo"
);

export async function createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const provider = params.provider || ACTIVE_PROVIDER;
  const amount = PLAN_PRICES[params.plan];
  const orderId = `df-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (provider === "demo" || !IS_PRODUCTION_CONFIGURED) {
    const successUrl = params.successUrl || `${window.location.origin}/?view=sucesso&paid=1&order=${orderId}`;
    return { checkoutUrl: successUrl, orderId, provider: "kirvano", plan: params.plan, amount };
  }
  const res = await fetch("/api/checkout/create", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, provider, orderId }),
  });
  if (!res.ok) throw new Error(`Falha ao criar checkout: ${res.status}`);
  const data = (await res.json()) as { checkoutUrl: string };
  return { checkoutUrl: data.checkoutUrl, orderId, provider, plan: params.plan, amount };
}

export async function checkPaymentStatus(orderId: string): Promise<{ paid: boolean; status: "pending" | "paid" | "failed" | "refunded"; }> {
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    const paid = url.searchParams.get("paid") === "1";
    return { paid, status: paid ? "paid" : "pending" };
  }
  return { paid: false, status: "pending" };
}

export async function createOrder(params: {
  orderId: string; userId: string; userEmail?: string; plan: CheckoutPlan; amount: number;
  provider: CheckoutProvider; documentId?: string;
}): Promise<void> {
  const order = { ...params, status: "pending" as const, createdAt: Date.now(), paidAt: null };
  if (!IS_PRODUCTION_CONFIGURED) {
    if (typeof window !== "undefined") {
      const orders = JSON.parse(localStorage.getItem("docfacil:orders") || "[]");
      orders.push(order); localStorage.setItem("docfacil:orders", JSON.stringify(orders));
    }
    return;
  }
  await fetch("/api/orders/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) });
}
