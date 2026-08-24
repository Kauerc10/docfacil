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
import {
  activateProSubscription,
  cancelProSubscription,
  failProRenewal,
  renewProSubscription,
} from "@/lib/server/billing/subscription-lifecycle";

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

function requiredNumber(
  record: Record<string, unknown>,
  key: string
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "Evento de pagamento incompleto."
    );
  }
  return value;
}

function optionalString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function parseEventTimestamp(
  record: Record<string, unknown>,
  key: string,
  fallback: number
): number {
  const value = optionalString(record, key);
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function methodsFrom(record: Record<string, unknown>): string[] {
  return Array.isArray(record.methods)
    ? record.methods.filter((value): value is string => typeof value === "string")
    : [];
}

function requireCardMethods(record: Record<string, unknown>): void {
  const methods = methodsFrom(record);
  if (methods.length > 0 && !methods.includes("CARD")) {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "O método do evento não corresponde ao pedido."
    );
  }
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

async function requireProOrder(
  repos: BillingRepositories,
  payment: Record<string, unknown>,
  checkout: Record<string, unknown>
) {
  const providerCheckoutId = requiredString(checkout, "id");
  const correlatedOrderId =
    optionalString(checkout, "externalId") ||
    optionalString(payment, "externalId");

  const order = correlatedOrderId
    ? await repos.orders.getOrder(correlatedOrderId)
    : await repos.orders.findByProviderCheckoutId(providerCheckoutId);

  if (!order) {
    throw new BackendError(
      "ORDER_NOT_FOUND",
      404,
      "Pedido da assinatura não encontrado."
    );
  }
  if (
    order.provider !== "abacatepay" ||
    order.product !== "pro" ||
    order.amountCents !== 3990 ||
    (order.method && order.method !== "card")
  ) {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "O evento não corresponde à assinatura contratada."
    );
  }
  if (order.buyer.type !== "user") {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "A assinatura Pro precisa pertencer a uma conta autenticada."
    );
  }

  return { order, providerCheckoutId, userId: order.buyer.userId };
}

function requireMonthlyCardSubscription(
  subscription: Record<string, unknown>
): {
  providerSubscriptionId: string;
  amountCents: 3990;
} {
  const providerSubscriptionId = requiredString(subscription, "id");
  const amount = requiredNumber(subscription, "amount");
  const method = requiredString(subscription, "method");
  const frequency = requiredString(subscription, "frequency");

  if (amount !== 3990 || method !== "CARD" || frequency !== "MONTHLY") {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "A assinatura recebida não corresponde ao plano Pro mensal."
    );
  }

  return { providerSubscriptionId, amountCents: 3990 };
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
  const methods = methodsFrom(transparent);
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

async function processSubscriptionCompleted(
  event: AbacateWebhookEvent,
  repos: BillingRepositories,
  now: number
): Promise<void> {
  const subscription = asRecord(event.data.subscription);
  const payment = asRecord(event.data.payment);
  const checkout = asRecord(event.data.checkout);
  if (!subscription || !payment || !checkout) {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "Evento de ativação da assinatura incompleto."
    );
  }

  const { providerSubscriptionId, amountCents } =
    requireMonthlyCardSubscription(subscription);
  if (requiredString(subscription, "status") !== "ACTIVE") {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "A assinatura recebida não está ativa."
    );
  }

  const providerPaymentId = requiredString(payment, "id");
  if (
    requiredString(payment, "status") !== "PAID" ||
    requiredNumber(payment, "paidAmount") !== amountCents
  ) {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "O primeiro pagamento da assinatura não está confirmado."
    );
  }
  requireCardMethods(payment);
  requireCardMethods(checkout);
  if (
    requiredString(checkout, "status") !== "PAID" ||
    requiredString(checkout, "frequency") !== "SUBSCRIPTION"
  ) {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "O checkout não corresponde a uma assinatura paga."
    );
  }

  const { order, providerCheckoutId, userId } = await requireProOrder(
    repos,
    payment,
    checkout
  );
  const items = Array.isArray(checkout.items) ? checkout.items : [];
  const firstItem = asRecord(items[0]);
  if (!firstItem || requiredNumber(firstItem, "quantity") !== 1) {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "Produto recorrente ausente no evento da assinatura."
    );
  }
  const providerProductId = requiredString(firstItem, "id");
  const paidAt = parseEventTimestamp(payment, "createdAt", now);

  const record = activateProSubscription({
    userId,
    providerSubscriptionId,
    providerCheckoutId,
    providerProductId,
    paymentId: providerPaymentId,
    amountCents,
    paidAt,
  });

  await repos.subscriptions.upsert(record);
  await repos.orders.updateProviderRefs(order.id!, {
    providerPaymentId,
    providerCheckoutId,
    providerSubscriptionId,
    providerStatus: "PAID",
    providerDevMode: event.devMode,
  });
  await repos.orders.markOrderPaid(order.id!);
}

async function requireExistingSubscription(
  repos: BillingRepositories,
  subscription: Record<string, unknown>
) {
  const { providerSubscriptionId } = requireMonthlyCardSubscription(subscription);
  const current = await repos.subscriptions.getByProviderSubscriptionId(
    providerSubscriptionId
  );
  if (!current) {
    throw new BackendError(
      "ORDER_NOT_FOUND",
      404,
      "Assinatura local não encontrada."
    );
  }
  return current;
}

async function processSubscriptionRenewed(
  event: AbacateWebhookEvent,
  repos: BillingRepositories,
  now: number
): Promise<void> {
  const subscription = asRecord(event.data.subscription);
  const payment = asRecord(event.data.payment);
  if (!subscription || !payment) {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "Evento de renovação da assinatura incompleto."
    );
  }
  if (requiredString(subscription, "status") !== "ACTIVE") {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "A assinatura renovada não está ativa."
    );
  }
  const current = await requireExistingSubscription(repos, subscription);
  if (
    requiredString(payment, "status") !== "PAID" ||
    requiredNumber(payment, "paidAmount") !== current.amountCents
  ) {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "A cobrança de renovação não está paga."
    );
  }
  requireCardMethods(payment);

  const renewed = renewProSubscription(current, {
    paymentId: requiredString(payment, "id"),
    paidAt: parseEventTimestamp(payment, "createdAt", now),
  });
  await repos.subscriptions.upsert(renewed);
}

async function processSubscriptionPaymentFailed(
  event: AbacateWebhookEvent,
  repos: BillingRepositories,
  now: number
): Promise<void> {
  const subscription = asRecord(event.data.subscription);
  if (!subscription) {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "Evento de falha da assinatura incompleto."
    );
  }
  const current = await requireExistingSubscription(repos, subscription);
  await repos.subscriptions.upsert(failProRenewal(current, now));
}

async function processSubscriptionCancelled(
  event: AbacateWebhookEvent,
  repos: BillingRepositories,
  now: number
): Promise<void> {
  const subscription = asRecord(event.data.subscription);
  if (!subscription) {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "Evento de cancelamento da assinatura incompleto."
    );
  }
  if (requiredString(subscription, "status") !== "CANCELLED") {
    throw new BackendError(
      "INVALID_REQUEST",
      409,
      "A assinatura recebida não está cancelada."
    );
  }
  const current = await requireExistingSubscription(repos, subscription);
  const cancelledAt = parseEventTimestamp(subscription, "canceledAt", now);
  await repos.subscriptions.upsert(
    cancelProSubscription(current, cancelledAt)
  );
}

async function processEvent(
  event: AbacateWebhookEvent,
  repos: BillingRepositories,
  now: number
): Promise<void> {
  switch (event.event) {
    case "transparent.completed":
      await processTransparentCompleted(event, repos);
      return;
    case "checkout.completed":
      await processCheckoutCompleted(event, repos);
      return;
    case "subscription.completed":
      await processSubscriptionCompleted(event, repos, now);
      return;
    case "subscription.renewed":
      await processSubscriptionRenewed(event, repos, now);
      return;
    case "subscription.payment_failed":
      await processSubscriptionPaymentFailed(event, repos, now);
      return;
    case "subscription.cancelled":
      await processSubscriptionCancelled(event, repos, now);
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

    const now = deps.now();
    const claimed = await deps.repos.webhookEvents.claim(event.id, now);
    if (!claimed) {
      return NextResponse.json(
        { ok: true, duplicate: true },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }
    claimedEventId = event.id;

    await processEvent(event, deps.repos, now);
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
