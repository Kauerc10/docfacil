import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { planPriceToCents } from "@/lib/pricing";
import { BackendError } from "@/lib/server/errors";
import { requireAppCheck, resolvePrincipal } from "@/lib/server/security";
import { validateCheckoutSelection } from "@/lib/server/billing/checkout-policy";
import { getAbacatePayBillingProvider } from "@/lib/server/billing/abacate/provider";
import { getBillingRepositories } from "@/lib/server/firestore/billing-repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || undefined : value),
  z.string().optional()
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || undefined : value),
  z.string().email("E-mail inválido.").optional()
);

const createCheckoutSchema = z.object({
  product: z.enum(["avulso", "pro"]),
  method: z.enum(["pix", "card"]).default("pix"),
  guestContact: z
    .object({
      email: optionalEmail,
      phone: optionalTrimmedString.pipe(z.string().min(8).max(30).optional()),
    })
    .optional(),
  successUrl: optionalTrimmedString,
});

function buildCompletionUrl(requestUrl: string, successUrl: string | undefined, orderId: string): string {
  const origin = new URL(requestUrl).origin;
  const target = successUrl
    ? new URL(successUrl, origin)
    : new URL("/?view=checkout", origin);

  if (target.origin !== origin) {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "A URL de retorno do checkout é inválida."
    );
  }

  target.searchParams.set("billingReturn", "1");
  target.searchParams.set("orderId", orderId);
  return target.toString();
}

function parseProviderExpiry(value: string): number {
  const expiresAt = Date.parse(value);
  if (!Number.isFinite(expiresAt)) {
    throw new BackendError(
      "BILLING_PROVIDER_FAILED",
      502,
      "Não foi possível processar a operação de pagamento. Tente novamente."
    );
  }
  return expiresAt;
}

export async function POST(req: Request) {
  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);
    const body = await req.json().catch(() => ({}));
    const parsed = createCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "Dados de checkout inválidos.",
        { errors: parsed.error.flatten() }
      );
    }

    const { product, method, guestContact, successUrl } = parsed.data;

    validateCheckoutSelection({
      product,
      method,
      principal,
      guestContact,
    });

    const buyer =
      principal.type === "user"
        ? {
            type: "user" as const,
            userId: principal.userId,
            ...(principal.email ? { email: principal.email } : {}),
          }
        : {
            type: "guest" as const,
            ...(guestContact?.email ? { email: guestContact.email } : {}),
            ...(guestContact?.phone ? { phone: guestContact.phone } : {}),
          };

    const amountCents = planPriceToCents(product);
    const repos = getBillingRepositories();
    const order = await repos.orders.createOrder({
      provider: "abacatepay",
      product,
      amountCents,
      buyer,
      status: "pending",
      method,
      createdAt: Date.now(),
    });

    if (!order.id) {
      throw new BackendError(
        "INTERNAL_ERROR",
        500,
        "Não foi possível criar o pedido de pagamento."
      );
    }

    const completionUrl = buildCompletionUrl(req.url, successUrl, order.id);
    const provider = getAbacatePayBillingProvider();

    if (product === "pro") {
      const result = await provider.createSubscription({
        orderId: order.id,
        amountCents,
        completionUrl,
      });

      await repos.orders.updateProviderRefs(order.id, {
        providerCheckoutId: result.providerCheckoutId,
        providerStatus: result.providerStatus,
        providerDevMode: result.devMode,
      });

      return NextResponse.json(
        {
          kind: "redirect",
          orderId: order.id,
          product,
          amountCents,
          checkoutUrl: result.checkoutUrl,
          devMode: result.devMode,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const result = await provider.createOneTimePayment({
      orderId: order.id,
      product: "avulso",
      amountCents,
      method,
      completionUrl,
    });

    if (result.kind === "pix") {
      const pix = {
        brCode: result.brCode,
        brCodeBase64: result.brCodeBase64,
        expiresAt: parseProviderExpiry(result.expiresAt),
      };

      await repos.orders.updateProviderRefs(order.id, {
        providerPaymentId: result.providerPaymentId,
        providerStatus: result.providerStatus,
        providerDevMode: result.devMode,
        pix,
      });

      return NextResponse.json(
        {
          kind: "pix",
          orderId: order.id,
          product,
          amountCents,
          pix,
          devMode: result.devMode,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    await repos.orders.updateProviderRefs(order.id, {
      providerCheckoutId: result.providerCheckoutId,
      providerStatus: result.providerStatus,
      providerDevMode: result.devMode,
    });

    return NextResponse.json(
      {
        kind: "redirect",
        orderId: order.id,
        product,
        amountCents,
        checkoutUrl: result.checkoutUrl,
        devMode: result.devMode,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (error instanceof BackendError) {
      return error.toResponse();
    }
    return BackendError.fromUnknown(error).toResponse();
  }
}
