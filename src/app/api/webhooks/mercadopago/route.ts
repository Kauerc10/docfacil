import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { BackendError } from "@/lib/server/errors";
import { getServerEnv } from "@/lib/server/env";
import { getBillingRepositories, type BillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { createMercadoPagoBillingProvider } from "@/lib/server/billing/mercadopago/provider";
import { parseMercadoPagoWebhookEvent, verifyMercadoPagoWebhookSignature } from "@/lib/server/billing/mercadopago/webhook";
import { reconcileMercadoPagoWebhookEvent, type MercadoPagoReconciliationDeps } from "@/lib/server/billing/mercadopago/reconcile";
import { fulfillPaidPurchase } from "@/lib/server/billing/fulfill-paid-purchase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface MercadoPagoWebhookHandlerDeps extends MercadoPagoReconciliationDeps {
  webhookSecret: string;
}

export async function handleMercadoPagoWebhook(req: Request, deps: MercadoPagoWebhookHandlerDeps): Promise<Response> {
  let lease: { id: string; owner: string } | undefined;
  try {
    const url = new URL(req.url);
    const queryDataId = url.searchParams.get("data.id");
    const rawBody = await req.text();
    if (!verifyMercadoPagoWebhookSignature({
      rawBody,
      xSignature: req.headers.get("x-signature"),
      xRequestId: req.headers.get("x-request-id"),
      queryDataId,
      webhookSecret: deps.webhookSecret,
    })) {
      throw new BackendError("INVALID_REQUEST", 401, "Webhook não autorizado.");
    }
    const event = parseMercadoPagoWebhookEvent(rawBody, queryDataId);
    const receiptId = createHash("sha256").update([
      "mercadopago", event.type, event.resourceId, req.headers.get("x-request-id"), req.headers.get("x-signature"),
    ].join(":")).digest("hex");
    const owner = randomUUID();
    if (!await deps.repos.webhookEvents.claim(receiptId, deps.now(), owner)) {
      return NextResponse.json({ ok: true, duplicate: true }, { headers: { "Cache-Control": "no-store" } });
    }
    lease = { id: receiptId, owner };
    const result = await reconcileMercadoPagoWebhookEvent(event.type, event.resourceId, deps);
    await deps.repos.webhookEvents.complete(receiptId, deps.now(), owner);
    lease = undefined;
    return NextResponse.json({ ok: true, ...result }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    if (lease) await deps.repos.webhookEvents.release(lease.id, lease.owner).catch(() => undefined);
    return BackendError.fromUnknown(error).toResponse();
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
  const env = getServerEnv();
  const provider = createMercadoPagoBillingProvider();
  return await handleMercadoPagoWebhook(req, {
    provider,
    repos: getBillingRepositories(),
    collectorId: env.MERCADOPAGO_COLLECTOR_ID ?? "",
    environment: env.MERCADOPAGO_ENVIRONMENT,
    webhookSecret: env.MERCADOPAGO_WEBHOOK_SECRET ?? "",
    now: () => Date.now(),
    onPaid: fulfillPaidPurchase,
  });
  } catch (error) { return BackendError.fromUnknown(error).toResponse(); }
}
