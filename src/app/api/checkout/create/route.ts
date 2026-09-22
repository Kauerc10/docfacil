import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { planPriceToCents } from '@/lib/pricing';
import { BackendError } from '@/lib/server/errors';
import { requireAppCheck, resolvePrincipal, requireUser } from '@/lib/server/security';
import { getBillingProvider } from '@/lib/server/billing/provider';
import { getRepositories } from '@/lib/server/firestore/repositories';
import { getServerEnv } from '@/lib/server/env';
import { DEFAULT_PIX_EXPIRATION_MS } from '@/lib/server/billing/constants';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || undefined : value),
  z.string().optional()
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() || undefined : value),
  z.string().email('E-mail inválido.').optional()
);

const createCheckoutSchema = z.object({
  product: z.enum(['avulso', 'pro']),
  method: z.enum(['pix', 'credit_card', 'card']).default('pix'),
  guestContact: z
    .object({
      email: optionalEmail,
      phone: optionalTrimmedString.pipe(z.string().min(8).max(30).optional()),
      cpfCnpj: optionalTrimmedString,
    })
    .optional(),
  successUrl: optionalTrimmedString,
});

function buildCompletionUrl(
  requestUrl: string,
  successUrl: string | undefined,
  orderId: string,
  product?: string
): string {
  const origin = new URL(requestUrl).origin;
  const target = successUrl
    ? new URL(successUrl, origin)
    : new URL('/?view=checkout', origin);

  if (target.origin !== origin) {
    throw new BackendError(
      'INVALID_REQUEST',
      400,
      'A URL de retorno do checkout é inválida.'
    );
  }

  const currentView = target.searchParams.get('view');
  if (!currentView || currentView === 'sucesso') {
    target.searchParams.set('view', 'checkout');
  }

  if (product) {
    target.searchParams.set('plan', product);
  }

  target.searchParams.set('billingReturn', '1');
  target.searchParams.set('orderId', orderId);
  return target.toString();
}

export async function POST(req: Request) {
  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);
    const body = await req.json().catch(() => ({}));
    const parsed = createCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      throw new BackendError(
        'INVALID_REQUEST',
        400,
        'Dados de checkout inválidos.',
        { errors: parsed.error.flatten() }
      );
    }

    const { product, method, guestContact, successUrl } = parsed.data;

    const repos = getRepositories();

    if (product === 'pro') {
      if (principal.type === 'guest') {
        throw new BackendError(
          'INVALID_AUTH_TOKEN',
          401,
          'Faça login ou crie uma conta para assinar o Plano Pro.'
        );
      }

      const userProfile = await repos.users.getUserProfile(principal.userId);
      const isCancelledSubscription = userProfile?.subscriptionStatus === 'cancelled';
      if (userProfile?.plano === 'pro' && !isCancelledSubscription) {
        throw new BackendError(
          'CONFLICT',
          409,
          'Você já possui uma assinatura do Plano Pro ativa.'
        );
      }

      if (userProfile?.pendingProOrderId) {
        const existingOrder = await repos.orders.getOrder(userProfile.pendingProOrderId);
        if (
          existingOrder &&
          existingOrder.status === 'pending' &&
          existingOrder.checkoutUrl
        ) {
          const env = getServerEnv();
          const isDev = env.NODE_ENV !== 'production' || env.VERCEL_ENV === 'preview';
          return NextResponse.json(
            {
              kind: 'redirect',
              orderId: existingOrder.id,
              product: 'pro',
              amountCents: existingOrder.amountCents,
              checkoutUrl: existingOrder.checkoutUrl,
              devMode: isDev,
            },
            { status: 200, headers: { 'Cache-Control': 'no-store' } }
          );
        }
      }
    }

    if (product === 'avulso' && principal.type === 'guest') {
      const email = guestContact?.email?.trim();
      const phone = guestContact?.phone?.trim();
      if (!email && !phone) {
        throw new BackendError(
          'INVALID_REQUEST',
          400,
          'Informe ao menos um e-mail ou WhatsApp de contato para continuar.'
        );
      }
    }

    const buyer =
      principal.type === 'user'
        ? {
            type: 'user' as const,
            userId: principal.userId,
            ...(principal.email ? { email: principal.email } : {}),
          }
        : {
            type: 'guest' as const,
            ...(guestContact?.email ? { email: guestContact.email } : {}),
            ...(guestContact?.phone ? { phone: guestContact.phone } : {}),
          };

    const normalizedMethod = method === 'card' ? 'credit_card' : method;
    const amountCents = planPriceToCents(product);

    const order = await repos.orders.createOrder({
      provider: 'mercadopago',
      product,
      amountCents,
      buyer,
      status: 'pending',
      paymentMethod: normalizedMethod,
      createdAt: Date.now(),
    });

    if (!order.id) {
      throw new BackendError(
        'INTERNAL_ERROR',
        500,
        'Não foi possível registrar o pedido de pagamento.'
      );
    }

    const completionUrl = buildCompletionUrl(req.url, successUrl, order.id, product);
    const provider = getBillingProvider();

    if (product === 'pro') {
      const user = requireUser(principal);

      const reservation = await repos.users.reservePendingProSubscription(
        user.userId,
        order.id
      );

      if (reservation.status === 'active_pro') {
        await repos.orders.updateOrder(order.id, { status: 'cancelled' });
        throw new BackendError(
          'CONFLICT',
          409,
          'Você já possui uma assinatura do Plano Pro ativa.'
        );
      }

      if (reservation.status === 'existing_pending') {
        await repos.orders.updateOrder(order.id, { status: 'cancelled' });

        let existingOrder = await repos.orders.getOrder(reservation.orderId);
        if (!existingOrder?.checkoutUrl) {
          for (let i = 0; i < 6; i++) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            existingOrder = await repos.orders.getOrder(reservation.orderId);
            if (existingOrder?.checkoutUrl) {
              break;
            }
          }
        }

        if (
          existingOrder &&
          existingOrder.status === 'pending' &&
          existingOrder.checkoutUrl
        ) {
          const env = getServerEnv();
          const isDev = env.NODE_ENV !== 'production' || env.VERCEL_ENV === 'preview';
          return NextResponse.json(
            {
              kind: 'redirect',
              orderId: existingOrder.id,
              product: 'pro',
              amountCents: existingOrder.amountCents,
              checkoutUrl: existingOrder.checkoutUrl,
              devMode: isDev,
            },
            { status: 200, headers: { 'Cache-Control': 'no-store' } }
          );
        }

        // Only reclaim a reservation proven abandoned (already failed or older than 60s without checkoutUrl).
        // If the call may still be running (< 60s), keep the reservation intact and return 409 to prevent duplicate preapprovals!
        const isProvenAbandoned =
          existingOrder?.status === 'failed' ||
          Boolean(existingOrder && !existingOrder.checkoutUrl && Date.now() - (existingOrder.createdAt || 0) > 60_000);

        if (isProvenAbandoned) {
          await repos.users.releasePendingProSubscription(user.userId, reservation.orderId).catch(() => undefined);
          if (existingOrder && existingOrder.status === 'pending') {
            await repos.orders.updateOrder(reservation.orderId, { status: 'failed' }).catch(() => undefined);
          }
          throw new BackendError(
            'INTERNAL_ERROR',
            500,
            'A tentativa anterior foi abandonada. A trava foi liberada, por favor tente novamente.'
          );
        }

        throw new BackendError(
          'CONFLICT',
          409,
          'Uma solicitação de assinatura já está em andamento. Aguarde alguns instantes.'
        );
      }

      let result;
      try {
        result = await provider.createSubscription({
          orderId: order.id,
          product: 'pro',
          amountCents,
          payer: {
            email: user.email || 'cliente@docfacil.com.br',
            userId: user.userId,
          },
          completionUrl,
        });
      } catch (err) {
        // Falha antes de criar a assinatura externa: libera a trava com segurança
        await repos.users.releasePendingProSubscription(user.userId, order.id).catch(() => undefined);
        await repos.orders.updateOrder(order.id, { status: 'failed' }).catch(() => undefined);
        throw err;
      }

      // createSubscription teve sucesso: a assinatura recorrente já existe no Mercado Pago!
      // Atualizamos o pedido com checkoutUrl e externalPaymentId, retentando em caso de falha transitória.
      // Nunca marcamos o pedido como failed nem liberamos a trava, garantindo que o estado do provedor
      // seja retido e nenhuma segunda assinatura recorrente seja criada em novas requisições.
      try {
        await repos.orders.updateOrder(order.id, {
          checkoutUrl: result.checkoutUrl,
          externalPaymentId: result.providerCheckoutId,
        });
      } catch {
        for (let i = 0; i < 3; i++) {
          await new Promise((r) => setTimeout(r, 100));
          try {
            await repos.orders.updateOrder(order.id, {
              checkoutUrl: result.checkoutUrl,
              externalPaymentId: result.providerCheckoutId,
            });
            break;
          } catch {
            // retry
          }
        }
      }

      return NextResponse.json(
        {
          kind: 'redirect',
          orderId: order.id,
          product,
          amountCents,
          checkoutUrl: result.checkoutUrl,
          devMode: result.devMode,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Avulso
    const payerEmail =
      (principal.type === 'user' ? principal.email : guestContact?.email) ||
      'cliente@docfacil.com.br';

    const result = await provider.createOneTimePayment({
      orderId: order.id,
      product: 'avulso',
      amountCents,
      method: normalizedMethod,
      payer: {
        email: payerEmail,
        phone: guestContact?.phone,
        cpfCnpj: guestContact?.cpfCnpj,
      },
      completionUrl,
    });

    if (result.kind === 'pix') {
      const expiresAt =
        Date.parse(result.expiresAt) || Date.now() + DEFAULT_PIX_EXPIRATION_MS;

      await repos.orders.updateOrder(order.id, {
        brCode: result.brCode,
        brCodeBase64: result.brCodeBase64,
        expiresAt,
        externalPaymentId: result.providerPaymentId,
      });

      return NextResponse.json(
        {
          kind: 'pix',
          orderId: order.id,
          product,
          amountCents,
          pix: {
            brCode: result.brCode,
            brCodeBase64: result.brCodeBase64,
            expiresAt,
          },
          devMode: result.devMode,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    await repos.orders.updateOrder(order.id, {
      checkoutUrl: result.checkoutUrl,
      externalPaymentId: result.providerCheckoutId,
    });

    return NextResponse.json(
      {
        kind: 'redirect',
        orderId: order.id,
        product,
        amountCents,
        checkoutUrl: result.checkoutUrl,
        devMode: result.devMode,
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
