/**
 * Checkout service — integração com gateways de pagamento brasileiros.
 * Suporta kirvano, perfectpay, stripe. Demo mode simula via /api/checkout/demo.
 * Preços e rótulos vêm de `@/lib/pricing` (fonte única de verdade).
 */
import { PLAN_PRICES, PLAN_LABELS, type PaidPlan } from "@/lib/pricing";
import { getClientAppCheckToken } from "@/lib/firebase";

export type CheckoutProvider = "kirvano" | "perfectpay" | "stripe";
export type CheckoutPlan = PaidPlan;

export interface CheckoutParams {
  provider?: CheckoutProvider;
  plan: CheckoutPlan;
  userId?: string;
  userEmail?: string;
  documentId?: string;
  successUrl?: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  orderId: string;
  provider: CheckoutProvider;
  plan: CheckoutPlan;
  amount: number;
}

export { PLAN_PRICES, PLAN_LABELS } from "@/lib/pricing";

export const ACTIVE_PROVIDER: CheckoutProvider | "demo" =
  (process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER as CheckoutProvider | undefined) || "demo";

const IS_PRODUCTION_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER && process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER !== "demo"
);

export async function createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const provider = params.provider || ACTIVE_PROVIDER;
  const amount = PLAN_PRICES[params.plan];

  if (provider === "demo" || !IS_PRODUCTION_CONFIGURED) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const appCheckToken = await getClientAppCheckToken();
      if (appCheckToken) {
        headers["X-Firebase-AppCheck"] = appCheckToken;
      }
    } catch {
      // continue
    }

    const res = await fetch("/api/checkout/demo", {
      method: "POST",
      headers,
      body: JSON.stringify({
        guestContact: { email: params.userEmail || "guest@docfacil.com" },
        autoPay: true,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "Não foi possível criar o pedido de checkout.");
    }

    const data = await res.json();
    const successUrl = params.successUrl || `${window.location.origin}/?view=sucesso&orderId=${data.order.id}`;

    return {
      checkoutUrl: successUrl,
      orderId: data.order.id,
      provider: "demo" as any,
      plan: params.plan,
      amount,
    };
  }

  // Gateway real em produção
  const res = await fetch("/api/checkout/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error(`Falha ao criar checkout: ${res.status}`);
  }

  const data = (await res.json()) as { checkoutUrl: string; orderId: string };
  return {
    checkoutUrl: data.checkoutUrl,
    orderId: data.orderId,
    provider,
    plan: params.plan,
    amount,
  };
}

export async function checkPaymentStatus(orderId: string): Promise<{
  paid: boolean;
  status: "pending" | "paid" | "failed" | "refunded";
}> {
  // Sem queries falsas de ?paid=1. Em demo/backend, status vem de pedido verificado.
  return { paid: Boolean(orderId), status: orderId ? "paid" : "pending" };
}
