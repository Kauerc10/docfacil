import 'server-only';
import { NextResponse } from 'next/server';
import { requireAppCheck, resolvePrincipal, requireUser } from '@/lib/server/security';
import { getRepositories } from '@/lib/server/firestore/repositories';
import { setServerUserPlan } from '@/lib/server/billing/account-plan';
import { MercadoPagoClient, type IMercadoPagoClient } from '@/lib/server/billing/mercadopago/client';
import { BackendError } from '@/lib/server/errors';

import { DEFAULT_SUBSCRIPTION_CYCLE_MS } from '@/lib/server/billing/constants';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function handleCancelSubscription(
  req: Request,
  deps: { client?: IMercadoPagoClient; now?: () => number } = {}
) {
  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);
    const user = requireUser(principal);

    const repos = getRepositories();
    const profile = await repos.users.getUserProfile(user.userId);

    if (profile?.plano !== 'pro') {
      throw new BackendError(
        'INVALID_REQUEST',
        400,
        'Você não possui uma assinatura Pro ativa para cancelar.'
      );
    }

    let subscriptionId = profile.subscriptionId;
    let order = profile.subscriptionOrderId
      ? await repos.orders.getOrder(profile.subscriptionOrderId)
      : null;

    if (!subscriptionId && order?.externalPaymentId) {
      subscriptionId = order.externalPaymentId;
    }

    if (!subscriptionId) {
      throw new BackendError(
        'INVALID_REQUEST',
        400,
        'Não foi possível localizar o identificador da assinatura no Mercado Pago para cancelamento. Entre em contato com o suporte.'
      );
    }

    const now = deps.now ? deps.now() : Date.now();
    const client =
      deps.client ??
      (!subscriptionId.startsWith('demo_') ? new MercadoPagoClient() : undefined);

    let subscriptionExpiresAt: number | null = null;

    if (client) {
      try {
        const preapproval = await client.getPreapproval(subscriptionId);
        if (preapproval?.next_payment_date) {
          const parsed = Date.parse(preapproval.next_payment_date);
          if (Number.isFinite(parsed) && parsed > now) {
            subscriptionExpiresAt = parsed;
          }
        }
      } catch {
        // Ignora erro de consulta de detalhes para não bloquear o cancelamento
      }
    }

    if (!subscriptionExpiresAt && order?.paidAt) {
      const cycleEnd = order.paidAt + DEFAULT_SUBSCRIPTION_CYCLE_MS;
      if (cycleEnd > now) {
        subscriptionExpiresAt = cycleEnd;
      }
    }

    if (!subscriptionExpiresAt) {
      subscriptionExpiresAt = now + DEFAULT_SUBSCRIPTION_CYCLE_MS;
    }

    if (client) {
      await client.cancelPreapproval(subscriptionId);
    }

    if (profile.subscriptionOrderId) {
      await repos.orders
        .updateOrder(profile.subscriptionOrderId, {
          status: 'cancelled',
        })
        .catch(() => undefined);
    }

    // Preserva plano: "pro", gravando subscriptionStatus: "cancelled" e subscriptionExpiresAt
    await setServerUserPlan(
      user.userId,
      'pro',
      subscriptionId,
      profile.subscriptionOrderId ?? null,
      false,
      {
        subscriptionStatus: 'cancelled',
        subscriptionExpiresAt,
        cancelledAt: now,
      }
    );

    return NextResponse.json(
      {
        ok: true,
        message: 'Assinatura cancelada com sucesso.',
        expiresAt: subscriptionExpiresAt,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: unknown) {
    if (err instanceof BackendError) {
      return err.toResponse();
    }
    return BackendError.fromUnknown(err).toResponse();
  }
}

export async function POST(req: Request) {
  return handleCancelSubscription(req);
}
