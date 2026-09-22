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
import { DEFAULT_SUBSCRIPTION_CYCLE_MS } from '@/lib/server/billing/constants';

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

    // Webhook delivery idempotency
    const requestId = req.headers.get('x-request-id')?.trim();
    const eventDedupeKey = requestId
      ? `req:${requestId}`
      : `${event.type}:${event.id}:${event.action || 'status'}`;

    const claimed = await repos.webhookEvents.claim(eventDedupeKey, now);
    if (!claimed) {
      return NextResponse.json(
        { ok: true, duplicate: true },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    claimedEventId = eventDedupeKey;

    // Process event
    if (event.type === 'payment') {
      const client = deps.client || new MercadoPagoClient();
      const payment = await client.getPayment(event.id);

      if (payment.external_reference) {
        const orderId = payment.external_reference;
        const order = await repos.orders.getOrder(orderId);

        if (order) {
          if (payment.status === 'approved') {
            const isPendingOrFailed =
              order.status === 'pending' || order.status === 'failed';
            const isPaid = order.status === 'paid';

            // Apenas pedidos Pro ativos/elegíveis (não cancelados nem consumidos) podem conceder
            // ou restaurar entitlement, evitando que notificações atrasadas de pagamentos reativem
            // assinaturas canceladas ou sobrescrevam assinaturas ativas mais novas.
            // Executamos a concessão ANTES de marcar o pedido como pago para que qualquer consumidor
            // de polling (ex: tela de retorno) que veja order.status === 'paid' já encontre o perfil Pro ativado.
            if (
              order.product === 'pro' &&
              order.buyer.type === 'user' &&
              (isPendingOrFailed || isPaid) &&
              order.status !== 'cancelled'
            ) {
              const currentProfile = await repos.users.getUserProfile(order.buyer.userId);
              const hasDifferentActiveSubscription =
                currentProfile?.plano === 'pro' &&
                Boolean(currentProfile.subscriptionOrderId) &&
                currentProfile.subscriptionOrderId !== orderId;

              if (!hasDifferentActiveSubscription) {
                await setServerUserPlan(
                  order.buyer.userId,
                  'pro',
                  currentProfile?.subscriptionId || order.externalPaymentId || null,
                  orderId,
                  false,
                  {
                    subscriptionStatus: 'active',
                    subscriptionExpiresAt: null,
                    cancelledAt: null,
                  }
                );
              }
            }

            if (isPendingOrFailed) {
              await repos.orders.markOrderPaid(orderId);
              await repos.orders.updateOrder(orderId, {
                externalPaymentId: String(payment.id),
                paidAt: payment.date_approved
                  ? Date.parse(payment.date_approved)
                  : Date.now(),
              });
            }
          } else if (
            (payment.status === 'rejected' || payment.status === 'cancelled') &&
            order.status === 'pending'
          ) {
            await repos.orders.updateOrder(orderId, {
              status: 'failed',
              externalPaymentId: String(payment.id),
            });
          }
        }
      }
    } else if (
      event.type === 'subscription_preapproval' ||
      event.type === 'preapproval'
    ) {
      const client = deps.client || new MercadoPagoClient();
      const preapproval = await client.getPreapproval(event.id);

      if (preapproval.status === 'authorized' && preapproval.external_reference) {
        const orderId = preapproval.external_reference;
        const order = await repos.orders.getOrder(orderId);

        if (order) {
          if (order.product === 'pro' && order.buyer.type === 'user') {
            const currentProfile = await repos.users.getUserProfile(order.buyer.userId);
            const hasDifferentActiveSubscription =
              currentProfile?.plano === 'pro' &&
              Boolean(currentProfile.subscriptionId) &&
              currentProfile.subscriptionId !== preapproval.id;

            if (hasDifferentActiveSubscription) {
              // Se o usuário já possui outra assinatura Pro ativa B, a assinatura A é conflitante/substituída.
              // Cancela a assinatura A no Mercado Pago para não cobrar o cliente duplamente todo mês
              // e atualiza o pedido A como cancelled sem rebaixar o plano ou marcar como pago.
              // O erro de cancelamento no gateway deve propagar para liberar a claim do webhook e permitir retry.
              const client = deps.client || new MercadoPagoClient();
              await client.cancelPreapproval(preapproval.id);
              await repos.orders.updateOrder(orderId, {
                status: 'cancelled',
                externalPaymentId: preapproval.id,
              });
            } else {
              await setServerUserPlan(
                order.buyer.userId,
                'pro',
                preapproval.id,
                orderId,
                false,
                {
                  subscriptionStatus: 'active',
                  subscriptionExpiresAt: null,
                  cancelledAt: null,
                }
              );

              if (order.status === 'pending' || order.status === 'cancelled' || order.status === 'failed') {
                await repos.orders.markOrderPaid(orderId);
                await repos.orders.updateOrder(orderId, {
                  externalPaymentId: preapproval.id,
                  paidAt: Date.now(),
                });
              }
            }
          }
        }
      } else if (
        (preapproval.status === 'cancelled' || preapproval.status === 'paused') &&
        preapproval.external_reference
      ) {
        const orderId = preapproval.external_reference;
        const order = await repos.orders.getOrder(orderId);

        if (order) {
          await repos.orders.updateOrder(orderId, {
            status: 'cancelled',
          });

          if (order.product === 'pro' && order.buyer.type === 'user') {
            const currentProfile = await repos.users.getUserProfile(order.buyer.userId);
            const hasDifferentPending =
              Boolean(currentProfile?.pendingProOrderId) &&
              currentProfile?.pendingProOrderId !== orderId;

            const isCurrentSubscription =
              (currentProfile?.subscriptionId && currentProfile.subscriptionId === preapproval.id) ||
              (currentProfile?.subscriptionOrderId && currentProfile.subscriptionOrderId === orderId) ||
              (!currentProfile?.subscriptionId && !currentProfile?.subscriptionOrderId && !hasDifferentPending);

            if (isCurrentSubscription) {
              let expiry = currentProfile?.subscriptionExpiresAt;
              if (!expiry && preapproval.next_payment_date) {
                const parsed = Date.parse(preapproval.next_payment_date);
                if (Number.isFinite(parsed) && parsed > now) {
                  expiry = parsed;
                }
              }
              if (!expiry && order.paidAt) {
                expiry = order.paidAt + DEFAULT_SUBSCRIPTION_CYCLE_MS;
              }

              if (expiry && expiry > now) {
                // Preserva o acesso Pro até o término do ciclo mensal pago
                await setServerUserPlan(
                  order.buyer.userId,
                  'pro',
                  preapproval.id,
                  orderId,
                  hasDifferentPending,
                  {
                    subscriptionStatus: 'cancelled',
                    subscriptionExpiresAt: expiry,
                    cancelledAt: currentProfile?.cancelledAt ?? now,
                  }
                );
              } else {
                await setServerUserPlan(
                  order.buyer.userId,
                  'gratis',
                  null,
                  null,
                  hasDifferentPending
                );
              }
            }
          }
        }
      }
    }

    await repos.webhookEvents.complete(eventDedupeKey, now);
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
