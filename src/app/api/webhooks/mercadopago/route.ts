import 'server-only';
import { NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/server/env';
import { BackendError } from '@/lib/server/errors';
import { getRepositories, type BackendRepositories } from '@/lib/server/firestore/repositories';
import {
  verifyMercadoPagoSignature,
  parseMercadoPagoWebhookEvent,
} from '@/lib/server/billing/mercadopago/webhook';
import { MercadoPagoClient, type IMercadoPagoClient } from '@/lib/server/billing/mercadopago/client';
import { setServerUserPlan } from '@/lib/server/billing/account-plan';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface MercadoPagoWebhookDeps {
  repos?: BackendRepositories;
  secret?: string;
  client?: IMercadoPagoClient;
  now?: () => number;
  finalProduction?: boolean;
}

export async function handleMercadoPagoWebhook(
  req: Request,
  deps: MercadoPagoWebhookDeps = {}
): Promise<Response> {
  const env = getServerEnv();
  const repos = deps.repos || getRepositories();
  const secret = deps.secret ?? env.MERCADOPAGO_WEBHOOK_SECRET ?? '';
  const now = deps.now ? deps.now() : Date.now();
  const isFinalProduction =
    deps.finalProduction ??
    (env.NODE_ENV === 'production' && env.VERCEL_ENV === 'production');

  let claimedEventId: string | null = null;

  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    const event = parseMercadoPagoWebhookEvent(body, url.searchParams);

    // Cryptographic signature check
    const signatureHeader = req.headers.get('x-signature');
    const requestIdHeader = req.headers.get('x-request-id');

    const isValidSignature = verifyMercadoPagoSignature({
      signatureHeader,
      requestIdHeader,
      dataId: event.id,
      secret,
      now,
    });

    if (!isValidSignature) {
      throw new BackendError('INVALID_REQUEST', 401, 'Webhook não autorizado.');
    }

    if (isFinalProduction && event.liveMode === false) {
      throw new BackendError(
        'INVALID_REQUEST',
        403,
        'Evento de teste recusado em produção.'
      );
    }

    // Webhook event idempotency
    const claimed = await repos.webhookEvents.claim(event.id, now);
    if (!claimed) {
      return NextResponse.json(
        { ok: true, duplicate: true },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    claimedEventId = event.id;

    // Process event
    if (event.type === 'payment') {
      const client = deps.client || new MercadoPagoClient();
      const payment = await client.getPayment(event.id);

      if (payment.status === 'approved' && payment.external_reference) {
        const orderId = payment.external_reference;
        const order = await repos.orders.getOrder(orderId);

        if (order) {
          await repos.orders.markOrderPaid(orderId);
          await repos.orders.updateOrder(orderId, {
            externalPaymentId: String(payment.id),
            paidAt: payment.date_approved
              ? Date.parse(payment.date_approved)
              : Date.now(),
          });

          if (order.product === 'pro' && order.buyer.type === 'user') {
            await setServerUserPlan(order.buyer.userId, 'pro');
          }
        }
      }
    }

    await repos.webhookEvents.complete(event.id, now);
    claimedEventId = null;

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: unknown) {
    if (claimedEventId) {
      await repos.webhookEvents.release(claimedEventId).catch(() => undefined);
    }
    if (err instanceof BackendError) {
      return err.toResponse();
    }
    return BackendError.fromUnknown(err).toResponse();
  }
}

export async function POST(req: Request): Promise<Response> {
  return handleMercadoPagoWebhook(req);
}
