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

export const mercadoPagoCheckoutSchema = z.object({
  product: z.enum(["avulso", "pro"]),
  method: z.enum(["pix", "card"]),
  requestId: z.string().uuid(),
  accessToken: z.string().regex(/^[a-f0-9]{64}$/),
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

export const mercadoPagoOrderCookie = (id: string) => `mp_order_${id}`;

export interface MercadoPagoCheckoutDependencies {
  sessions?: Pick<FirestoreCheckoutSessions, "begin" | "finish">;
  provider?: Pick<ReturnType<typeof createMercadoPagoBillingProvider>, "createOneTimePayment">;
  capture?: typeof capturePurchase;
  orders?: ReturnType<typeof getBillingRepositories>["orders"];
}

export async function createMercadoPagoCheckout(req: Request, principal: Principal, raw: unknown, deps: MercadoPagoCheckoutDependencies = {}): Promise<Response> {
  const parsed = mercadoPagoCheckoutSchema.safeParse(raw);
  if (!parsed.success) throw new BackendError("INVALID_REQUEST", 400, "Dados de checkout inválidos.");
  const input = parsed.data;
  if (input.product === "pro") {
    // O fluxo Pro só será habilitado após assinatura, identidade e gestão integrarem-se.
    throw new BackendError("BILLING_METHOD_UNAVAILABLE", 503, "A contratação Pro está em preparação. Nenhuma cobrança foi criada.");
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
    order: { provider: "mercadopago", product: "avulso", buyer, status: "pending", method: input.method, amountCents: planPriceToCents("avulso"), createdAt: Date.now() },
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
