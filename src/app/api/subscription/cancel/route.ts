import 'server-only';
import { NextResponse } from 'next/server';
import { requireAppCheck, resolvePrincipal, requireUser } from '@/lib/server/security';
import { getRepositories } from '@/lib/server/firestore/repositories';
import { setServerUserPlan } from '@/lib/server/billing/account-plan';
import { MercadoPagoClient, type IMercadoPagoClient } from '@/lib/server/billing/mercadopago/client';
import { BackendError } from '@/lib/server/errors';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function handleCancelSubscription(
  req: Request,
  deps: { client?: IMercadoPagoClient } = {}
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

    if (!subscriptionId && profile.subscriptionOrderId) {
      const order = await repos.orders.getOrder(profile.subscriptionOrderId);
      if (order?.externalPaymentId) {
        subscriptionId = order.externalPaymentId;
      }
    }

    if (!subscriptionId) {
      throw new BackendError(
        'INVALID_REQUEST',
        400,
        'Não foi possível localizar o identificador da assinatura no Mercado Pago para cancelamento. Entre em contato com o suporte.'
      );
    }

    if (deps.client) {
      await deps.client.cancelPreapproval(subscriptionId);
    } else if (!subscriptionId.startsWith('demo_')) {
      const client = new MercadoPagoClient();
      await client.cancelPreapproval(subscriptionId);
    }

    if (profile.subscriptionOrderId) {
      await repos.orders
        .updateOrder(profile.subscriptionOrderId, {
          status: 'cancelled',
        })
        .catch(() => undefined);
    }

    await setServerUserPlan(user.userId, 'gratis', null, null);

    return NextResponse.json(
      { ok: true, message: 'Assinatura cancelada com sucesso.' },
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
