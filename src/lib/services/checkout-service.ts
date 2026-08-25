/**
 * Checkout service — integração com a AbacatePay.
 * Demo mode simula via /api/checkout/demo. O checkout real usa a API server-side.
 * Preços e rótulos vêm de `@/lib/pricing` (fonte única de verdade).
 */
import { apiFetch } from "@/lib/auth/api-fetch";
import { PLAN_PRICES, PLAN_LABELS, type PaidPlan } from "@/lib/pricing";
import {
  pixPaymentSessionStorageKey,
  preparePixPaymentNavigation,
} from "@/lib/services/pix-payment-session";

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

export interface CheckoutPixPayload {
  brCode: string;
  brCodeBase64: string;
  expiresAt: number;
}

export type CheckoutApiResponse =
  | {
      kind: "redirect";
      orderId: string;
      checkoutUrl: string;
    }
  | {
      kind: "pix";
      orderId: string;
      pix: CheckoutPixPayload;
    };

interface CheckoutResultBase {
  orderId: string;
  provider: CheckoutProvider | "demo";
  plan: CheckoutPlan;
  amount: number;
}

export type CheckoutResult =
  | (CheckoutResultBase & {
      kind: "redirect";
      checkoutUrl: string;
    })
  | (CheckoutResultBase & {
      kind: "pix";
      provider: CheckoutProvider;
      pix: CheckoutPixPayload;
    });

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
  pix?: CheckoutPixPayload;
  documentId?: string;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function parseCheckoutApiResponse(value: unknown): CheckoutApiResponse {
  const record = asRecord(value);
  const kind = nonEmptyString(record?.kind);
  const orderId = nonEmptyString(record?.orderId);

  if (!record || !orderId) {
    throw new Error("Resposta de checkout inválida");
  }

  if (kind === "redirect") {
    const checkoutUrl = nonEmptyString(record.checkoutUrl);
    if (!checkoutUrl) {
      throw new Error("Resposta de checkout inválida");
    }
    return { kind: "redirect", orderId, checkoutUrl };
  }

  if (kind === "pix") {
    const pix = asRecord(record.pix);
    const brCode = nonEmptyString(pix?.brCode);
    const brCodeBase64 = nonEmptyString(pix?.brCodeBase64);
    const expiresAt = pix?.expiresAt;

    if (
      !pix ||
      !brCode ||
      !brCodeBase64 ||
      typeof expiresAt !== "number" ||
      !Number.isFinite(expiresAt)
    ) {
      throw new Error("Resposta de checkout inválida");
    }

    return {
      kind: "pix",
      orderId,
      pix: { brCode, brCodeBase64, expiresAt },
    };
  }

  throw new Error("Resposta de checkout inválida");
}

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
      kind: "redirect",
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

  const response = parseCheckoutApiResponse(await res.json());
  if (response.kind === "redirect") {
    return {
      ...response,
      provider,
      plan: params.plan,
      amount,
    };
  }

  if (
    typeof window !== "undefined" &&
    params.successUrl &&
    params.plan === "avulso"
  ) {
    const { paymentUrl, session } = preparePixPaymentNavigation({
      successUrl: params.successUrl,
      orderId: response.orderId,
      authenticated,
      guestEmail: params.userEmail,
      pix: response.pix,
    });

    try {
      window.sessionStorage.setItem(
        pixPaymentSessionStorageKey(response.orderId),
        JSON.stringify(session)
      );
    } catch {
      // A página ainda consegue recuperar o payload PIX via /checkout/status.
    }

    window.location.assign(paymentUrl);
  }

  return {
    ...response,
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
