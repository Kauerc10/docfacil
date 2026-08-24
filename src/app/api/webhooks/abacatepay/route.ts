import "server-only";
import { NextResponse } from "next/server";
import { BackendError } from "@/lib/server/errors";
import { getServerEnv } from "@/lib/server/env";
import {
  getBillingRepositories,
  type BillingRepositories,
} from "@/lib/server/firestore/billing-repositories";
import {
  parseAbacateWebhookEvent,
  secretsMatch,
  verifyAbacateWebhookSignature,
  type AbacateWebhookEvent,
} from "@/lib/server/billing/abacate/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WebhookHandlerDeps {
  repos: BillingRepositories;
  expectedSecret: string | undefined;
  finalProduction: boolean;
  now: () => number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredString(
  record: Record<string, unknown>,
  key: string
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "Evento de pagamento incompleto."
    );
  }
  return value;
}

async function requireAvulsoOrder(
  repos: BillingRepositories,
  orderId: string
) {
  const order = await repos.orders.getOrder(orderId);
  if (!order) {
    throw new BackendError(
      "ORDER_NOT_FOUND",
      404,
      "Pedido de pagamento não encontrado."
    );
  }
  if (order.provider !== "abacatepay" || order.product !== "avulso") {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "O evento não corresponde ao pedido informado."
    );
  }
  return order;
}

async function processTransparentCompleted(
  event: AbacateWebhookEvent,
  repos: BillingRepositories
): Promise<void> {
  const transparent = asRecord(event.data.transparent);
  if (!transparent) {
    throw new BackendError("INVALID_REQUEST", 400, "Evento PIX incompleto.");
  }

  const providerPaymentId = requiredString(transparent, "id");
  const orderId = requiredString(transparent, "externalId");
  const providerStatus = requiredString(transparent, "status");
  if (providerStatus !== "PAID") {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "O evento de pagamento não está confirmado."
    );
  }

  const order = await requireAvulsoOrder(repos, orderId);
  const methods = Array.isArray(transparent.methods)
    ? transparent.methods.filter((value): value is string => typeof value === "string")
    : [];
  if (methods.length > 0 && !methods.includes("PIX")) {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "O método do evento não corresponde ao pedido."
    );
  }
  if (order.method && order.method !== "pix") {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "O método do evento não corresponde ao pedido."
    );
  }

  await repos.orders.updateProviderRefs(orderId, {
    providerPaymentId,
    providerStatus,
    providerDevMode: event.devMode,
  });
  await repos.orders.markOrderPaid(orderId);
}

async function processCheckoutCompleted(
  event: AbacateWebhookEvent,
  repos: BillingRepositories
): Promise<void> {
  const checkout = asRecord(event.data.checkout);
  if (!checkout) {
    throw new BackendError("INVALID_REQUEST", 400, "Evento de checkout incompleto.");
  }

  const providerCheckoutId = requiredString(checkout, "id");
  const orderId = requiredString(checkout, "externalId");
  const providerStatus = requiredString(checkout, "status");
  if (providerStatus !== "PAID") {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "O checkout informado não está pago."
    );
  }

  const order = await requireAvulsoOrder(repos, orderId);
  if (order.method && order.method !== "card") {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "O método do evento não corresponde ao pedido."
    );
  }

  await repos.orders.updateProviderRefs(orderId, {
    providerCheckoutId,
    providerStatus,
    providerDevMode: event.devMode,
  });
  await repos.orders.markOrderPaid(orderId);
}

async function processEvent(
  event: AbacateWebhookEvent,
  repos: BillingRepositories
): Promise<void> {
  switch (event.event) {
    case "transparent.completed":
      await processTransparentCompleted(event, repos);
      return;
    case "checkout.completed":
      await processCheckoutCompleted(event, repos);
      return;
    default:
      return;
  }
}

export async function handleAbacatePayWebhook(
  req: Request,
  deps: WebhookHandlerDeps
): Promise<Response> {
  let claimedEventId: string | null = null;

  try {
    const receivedSecret = new URL(req.url).searchParams.get("webhookSecret");
    if (!secretsMatch(receivedSecret, deps.expectedSecret)) {
      throw new BackendError(
        "INVALID_REQUEST",
        401,
        "Webhook não autorizado."
      );
    }

    const rawBody = await req.text();
    if (
      !verifyAbacateWebhookSignature(
        rawBody,
        req.headers.get("x-webhook-signature")
      )
    ) {
      throw new BackendError(
        "INVALID_REQUEST",
        401,
        "Webhook não autorizado."
      );
    }

    const event = parseAbacateWebhookEvent(rawBody);
    if (deps.finalProduction && event.devMode) {
      throw new BackendError(
        "INVALID_REQUEST",
        403,
        "Evento de desenvolvimento recusado em produção."
      );
    }

    const claimed = await deps.repos.webhookEvents.claim(event.id, deps.now());
    if (!claimed) {
      return NextResponse.json(
        { ok: true, duplicate: true },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }
    claimedEventId = event.id;

    await processEvent(event, deps.repos);
    await deps.repos.webhookEvents.complete(event.id, deps.now());
    claimedEventId = null;

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (claimedEventId) {
      await deps.repos.webhookEvents.release(claimedEventId).catch(() => undefined);
    }
    return BackendError.fromUnknown(error).toResponse();
  }
}

export async function POST(req: Request): Promise<Response> {
  const env = getServerEnv();
  return handleAbacatePayWebhook(req, {
    repos: getBillingRepositories(),
    expectedSecret: env.ABACATEPAY_WEBHOOK_SECRET,
    finalProduction:
      env.NODE_ENV === "production" && env.VERCEL_ENV === "production",
    now: () => Date.now(),
  });
}
