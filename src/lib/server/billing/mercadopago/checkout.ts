import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { BackendError } from "../../errors";
import type { Principal } from "../../security";
import { getServerEnv } from "../../env";
import { getBillingRepositories } from "../../firestore/billing-repositories";
import { planPriceToCents } from "../../../pricing";
import { capturePurchase } from "../purchase-delivery";
import { createMercadoPagoBillingProvider } from "./provider";
import { FirestoreCheckoutSessions, checkoutTokenHash } from "./checkout-store";
import { getOrCreateWelcomeOffer, PROMO_CENTS } from "../welcome-offer";
import { purchaseOrderCookie } from "../purchase-authorization";

export const mercadoPagoCheckoutSchema = z.object({
  product: z.enum(["avulso", "pro"]),
  method: z.enum(["pix", "card"]),
  requestId: z.string().uuid(),
  accessToken: z.string().regex(/^[a-f0-9]{64}$/),
  appliedOffer: z.literal("welcome").optional(),
  guestContact: z.object({ email: z.string().trim().email(), phone: z.string().trim().min(8).max(30).optional() }).optional(),
  successUrl: z.string().url().optional(),
  draft: z.object({
    modeloSlug: z.string().min(1).max(100),
    respostas: z.record(z.string().min(1).max(100), z.string().max(10000)).refine(x => Object.keys(x).length <= 200),
    clausulasSelecionadas: z.array(z.string().max(100)).max(50).default([]),
  }).optional(),
});

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

export const mercadoPagoOrderCookie = purchaseOrderCookie;

export interface MercadoPagoCheckoutDependencies {
  sessions?: Pick<FirestoreCheckoutSessions, "begin" | "finish">;
  provider?: Pick<ReturnType<typeof createMercadoPagoBillingProvider>, "createOneTimePayment"> & Partial<Pick<ReturnType<typeof createMercadoPagoBillingProvider>, "createSubscription">>;
  capture?: typeof capturePurchase;
  orders?: ReturnType<typeof getBillingRepositories>["orders"];
  subscriptions?: Pick<ReturnType<typeof getBillingRepositories>["subscriptions"], "getByUserId">;
}

export async function createMercadoPagoCheckout(req: Request, principal: Principal, raw: unknown, deps: MercadoPagoCheckoutDependencies = {}): Promise<Response> {
  const parsed = mercadoPagoCheckoutSchema.safeParse(raw);
  if (!parsed.success) throw new BackendError("INVALID_REQUEST", 400, "Dados de checkout inválidos.");
  const input = parsed.data;
  if (input.product === "pro") {
    if (principal.type !== "user") {
      throw new BackendError("INVALID_AUTH_TOKEN", 401, "Entre na sua conta para assinar o Pro.");
    }
    if (input.method !== "card") {
      throw new BackendError("INVALID_REQUEST", 400, "Assinatura Pro disponível apenas por cartão de crédito.");
    }
    const repos = getBillingRepositories();
    const subscriptionsRepo = deps.subscriptions ?? repos.subscriptions;
    const existing = await subscriptionsRepo.getByUserId(principal.userId);
    if (existing && (existing.status === "active" || (existing.paidThrough && existing.paidThrough > Date.now()))) {
      throw new BackendError("CONFLICT", 409, "Você já possui uma assinatura Pro ativa.");
    }
    const email = principal.email?.trim().toLowerCase();
    if (!email) throw new BackendError("INVALID_REQUEST", 400, "Informe seu e-mail antes de assinar.");
    const buyer = { type: "user" as const, userId: principal.userId, email };
    const env = getServerEnv();
    const origin = new URL(env.NEXT_PUBLIC_APP_URL).origin;
    const completion = new URL(input.successUrl ?? "/?view=checkout", origin);
    if (completion.origin !== origin) throw new BackendError("INVALID_REQUEST", 400, "URL de retorno inválida.");
    const requestHash = createHash("sha256").update(canonical({ buyer, product: "pro", method: "card" })).digest("hex");
    const hasHadProBefore = Boolean(existing && (existing.status === "active" || existing.lastPaidAt > 0));
    let proAmountCents = planPriceToCents("pro");
    if (input.appliedOffer === "welcome") {
      try {
        const offer = await getOrCreateWelcomeOffer({
          userId: principal.userId,
          hasHadProBefore,
          now: Date.now(),
        });
        if (offer.status === "active" && Date.now() < offer.expiresAt) {
          proAmountCents = PROMO_CENTS;
        }
      } catch {
        // Fallback para preço regular
      }
    }
    const orderId = createHash("sha256").update(`${canonical(buyer)}:pro:${input.requestId}`).digest("hex");
    const sessions = deps.sessions ?? new FirestoreCheckoutSessions();
    const provider = deps.provider ?? createMercadoPagoBillingProvider();
    const { session, acquired } = await sessions.begin({
      orderId,
      requestHash,
      tokenHash: checkoutTokenHash(input.accessToken),
      now: Date.now(),
      order: {
        provider: "mercadopago",
        product: "pro",
        buyer,
        status: "pending",
        method: "card",
        amountCents: proAmountCents,
        createdAt: Date.now(),
      },
    });
    if (!acquired && session.state !== "ready") {
      throw new BackendError("INVALID_REQUEST", 409, "Esta tentativa está sendo verificada. Não pague novamente.");
    }
    let responseBody = session.result;
    if (acquired) {
      try {
        completion.searchParams.set("billingReturn", "1");
        completion.searchParams.set("orderId", orderId);
        if (!provider.createSubscription) throw new BackendError("SERVER_MISCONFIGURED", 500, "Assinatura não configurada.");
        const result = await provider.createSubscription({
          orderId,
          amountCents: proAmountCents,
          completionUrl: completion.toString(),
          buyerEmail: email,
        });
        const orders = deps.orders ?? repos.orders;
        await orders.updateProviderRefs(orderId, {
          providerCheckoutId: result.providerCheckoutId,
          providerStatus: result.providerStatus,
          providerDevMode: result.devMode,
        });
        responseBody = {
          kind: "redirect",
          orderId,
          product: "pro",
          amountCents: proAmountCents,
          checkoutUrl: result.checkoutUrl,
        };
        await sessions.finish(orderId, session.owner, responseBody);
      } catch (error) {
        await sessions.finish(orderId, session.owner, null).catch(() => undefined);
        throw error;
      }
    }
    const response = NextResponse.json(responseBody, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(mercadoPagoOrderCookie(orderId), input.accessToken, { httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax", path: "/", maxAge: 86400 });
    return response;
  }
  if (!input.draft) throw new BackendError("INVALID_REQUEST", 400, "Salve o documento antes de pagar.");
  const email = (principal.type === "user" ? principal.email : input.guestContact?.email)?.trim().toLowerCase();
  if (!email) throw new BackendError("INVALID_REQUEST", 400, "Informe seu e-mail antes de pagar.");
  const buyer = principal.type === "user"
    ? { type: "user" as const, userId: principal.userId, email }
    : { type: "guest" as const, email, ...(input.guestContact?.phone ? { phone: input.guestContact.phone } : {}) };
  const env = getServerEnv();
  const origin = new URL(env.NEXT_PUBLIC_APP_URL).origin;
  const completion = new URL(input.successUrl ?? "/?view=checkout", origin);
  if (completion.origin !== origin) throw new BackendError("INVALID_REQUEST", 400, "URL de retorno inválida.");
  const requestHash = createHash("sha256").update(canonical({ buyer, draft: input.draft, method: input.method })).digest("hex");
  const orderId = createHash("sha256").update(`${canonical(buyer)}:${input.requestId}`).digest("hex");
  const sessions = deps.sessions ?? new FirestoreCheckoutSessions();
  const provider = deps.provider ?? createMercadoPagoBillingProvider(); // validar configuração antes de persistir
  const { session, acquired } = await sessions.begin({
    orderId, requestHash, tokenHash: checkoutTokenHash(input.accessToken), now: Date.now(),
    order: { provider: "mercadopago", product: "avulso", buyer, status: "pending", method: input.method, amountCents: planPriceToCents("avulso"), fulfillmentMode: "verified_delivery", createdAt: Date.now() },
  });
  if (!acquired && session.state !== "ready") {
    throw new BackendError("INVALID_REQUEST", 409, "Esta tentativa está sendo verificada. Não pague novamente.");
  }
  let responseBody = session.result;
  if (acquired) {
    try {
      await (deps.capture ?? capturePurchase)(orderId, buyer, { ...input.draft, ...(buyer.type === "guest" ? { guestContact: { email, ...(buyer.phone ? { phone: buyer.phone } : {}) } } : {}) });
      completion.searchParams.set("billingReturn", "1");
      completion.searchParams.set("orderId", orderId);
      const result = await provider.createOneTimePayment({ orderId, product: "avulso", amountCents: 1990, method: input.method, completionUrl: completion.toString(), buyerEmail: email });
      const orders = deps.orders ?? getBillingRepositories().orders;
      if (result.kind === "pix") {
        const pix = { brCode: result.brCode, brCodeBase64: result.brCodeBase64, expiresAt: Date.parse(result.expiresAt) };
        await orders.updateProviderRefs(orderId, { providerPaymentId: result.providerPaymentId, providerStatus: result.providerStatus, providerDevMode: result.devMode, pix });
        responseBody = { kind: "pix", orderId, product: "avulso", amountCents: 1990, pix };
      } else {
        await orders.updateProviderRefs(orderId, { providerCheckoutId: result.providerCheckoutId, providerStatus: result.providerStatus, providerDevMode: result.devMode });
        responseBody = { kind: "redirect", orderId, product: "avulso", amountCents: 1990, checkoutUrl: result.checkoutUrl };
      }
      await sessions.finish(orderId, session.owner, responseBody);
    } catch (error) {
      await sessions.finish(orderId, session.owner, null).catch(() => undefined);
      throw error;
    }
  }
  const response = NextResponse.json(responseBody, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(mercadoPagoOrderCookie(orderId), input.accessToken, { httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax", path: "/", maxAge: 86400 });
  return response;
}
