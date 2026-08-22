/**
 * Checkout service — integração com gateways de pagamento brasileiros.
 * Suporta kirvano, perfectpay, stripe. Demo mode simula via /api/checkout/demo.
 * Preços e rótulos vêm de `@/lib/pricing` (fonte única de verdade).
 */
import { apiFetch } from "@/lib/auth/api-fetch";
import { PLAN_PRICES, PLAN_LABELS, type PaidPlan } from "@/lib/pricing";

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
  provider: CheckoutProvider | "demo";
  plan: CheckoutPlan;
  amount: number;
}

export { PLAN_PRICES, PLAN_LABELS } from "@/lib/pricing";

export const ACTIVE_PROVIDER: CheckoutProvider | "demo" =
  (process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER as CheckoutProvider | undefined) || "demo";

const IS_PRODUCTION_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER && process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER !== "demo"
);

export function buildCheckoutReturnUrl(
  successUrl: string,
  orderId: string
): string {
  const url = new URL(successUrl);
  url.searchParams.set("orderId", orderId);
  return url.toString();
}

export async function createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  const provider = params.provider || ACTIVE_PROVIDER;
  const amount = PLAN_PRICES[params.plan];

  if (provider === "demo" || !IS_PRODUCTION_CONFIGURED) {
    if (!params.userEmail) {
      throw new Error("Informe seu e-mail para prosseguir com o pagamento.");
    }

    const res = await apiFetch("/api/checkout/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: params.plan,
        guestContact: { email: params.userEmail },
        autoPay: true,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "Não foi possível criar o pedido de checkout.");
    }

    const data = await res.json();
    const baseSuccessUrl =
      params.successUrl ||
      `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/?view=sucesso`;
    const successUrl = buildCheckoutReturnUrl(baseSuccessUrl, data.order.id);

    return {
      checkoutUrl: successUrl,
      orderId: data.order.id,
      provider: "demo",
      plan: params.plan,
      amount,
    };
  }

  const res = await apiFetch("/api/checkout/create", {
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
