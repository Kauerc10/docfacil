/**
 * Checkout service — integração com a AbacatePay.
 * Demo mode simula via /api/checkout/demo. O checkout real usa a API server-side.
 * Preços e rótulos vêm de `@/lib/pricing` (fonte única de verdade).
 */
import { apiFetch } from "@/lib/auth/api-fetch";
import { PLAN_PRICES, PLAN_LABELS, type PaidPlan } from "@/lib/pricing";

export type CheckoutProvider = "abacatepay";
export type CheckoutPlan = PaidPlan;
export type CheckoutMethod = "pix" | "card";

export interface CheckoutParams {
  provider?: CheckoutProvider;
  plan: CheckoutPlan;
  userId?: string;
  userEmail?: string;
  documentId?: string;
  successUrl?: string;
  method?: CheckoutMethod;
  authenticated?: boolean;
}

export interface CheckoutResult {
  checkoutUrl: string;
  orderId: string;
  provider: CheckoutProvider | "demo";
  plan: CheckoutPlan;
  amount: number;
}

export interface GuestContactInput {
  email?: string;
  phone?: string;
}

export interface StatusRequestInput extends GuestContactInput {
  orderId: string;
  authenticated: boolean;
}

export interface CheckoutStatusResult {
  orderId: string;
  status: "pending" | "paid" | "reserved" | "consumed" | "failed" | "refunded";
  product: "avulso" | "pro";
  method?: "pix" | "card";
  amountCents: number;
  pix?: {
    brCode: string;
    brCodeBase64: string;
    expiresAt: number;
  };
}

export interface CheckoutCreatePayloadInput {
  plan: CheckoutPlan;
  authenticated: boolean;
  userEmail?: string;
  method?: CheckoutMethod;
  successUrl?: string;
}

export { PLAN_PRICES, PLAN_LABELS } from "@/lib/pricing";

export const ACTIVE_PROVIDER: CheckoutProvider | "demo" =
  process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER === "abacatepay"
    ? "abacatepay"
    : "demo";

const IS_PRODUCTION_CONFIGURED = ACTIVE_PROVIDER === "abacatepay";

export function buildGuestContact(
  input: GuestContactInput
): { email?: string; phone?: string } | undefined {
  const email = input.email?.trim();
  const phone = input.phone?.trim();

  if (!email && !phone) return undefined;

  return {
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
  };
}

export function buildCheckoutCreatePayload(
  input: CheckoutCreatePayloadInput
): {
  product: CheckoutPlan;
  method: CheckoutMethod;
  guestContact?: { email?: string; phone?: string };
  successUrl?: string;
} {
  const method: CheckoutMethod = input.plan === "pro" ? "card" : input.method ?? "pix";
  const guestContact = input.authenticated
    ? undefined
    : buildGuestContact({ email: input.userEmail });

  return {
    product: input.plan,
    method,
    ...(guestContact ? { guestContact } : {}),
    ...(input.successUrl ? { successUrl: input.successUrl } : {}),
  };
}

export function buildStatusRequestPayload(input: StatusRequestInput): {
  orderId: string;
  guestContact?: { email?: string; phone?: string };
} {
  if (input.authenticated) {
    return { orderId: input.orderId };
  }

  const guestContact = buildGuestContact(input);
  return guestContact
    ? { orderId: input.orderId, guestContact }
    : { orderId: input.orderId };
}

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

  const authenticated =
    params.authenticated ?? Boolean(params.userId && params.userId !== "guest");
  const payload = buildCheckoutCreatePayload({
    plan: params.plan,
    authenticated,
    userEmail: params.userEmail,
    method: params.method,
    successUrl: params.successUrl,
  });

  const res = await apiFetch("/api/checkout/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error?.message || `Falha ao criar checkout: ${res.status}`
    );
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

export async function checkOrderStatus(
  params: StatusRequestInput
): Promise<CheckoutStatusResult> {
  const res = await apiFetch("/api/checkout/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildStatusRequestPayload(params)),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error?.message || "Não foi possível consultar o status do pagamento."
    );
  }

  return (await res.json()) as CheckoutStatusResult;
}
