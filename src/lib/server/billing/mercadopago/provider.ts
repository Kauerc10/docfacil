import 'server-only';
import type {
  BillingProvider,
  CreateOneTimePaymentInput,
  OneTimePaymentResult,
  CreateSubscriptionInput,
  SubscriptionPaymentResult,
  PaymentStatusResult,
} from '../provider';
import type { IMercadoPagoClient } from './client';
import { MercadoPagoClient } from './client';
import { getServerEnv } from '../../env';
import { BackendError } from '../../errors';

export class MercadoPagoBillingProvider implements BillingProvider {
  private readonly client: IMercadoPagoClient;

  constructor(client?: IMercadoPagoClient) {
    this.client = client || new MercadoPagoClient();
  }

  public async createOneTimePayment(
    input: CreateOneTimePaymentInput
  ): Promise<OneTimePaymentResult> {
    const env = getServerEnv();
    const isDev = env.NODE_ENV !== 'production' || env.VERCEL_ENV === 'preview';
    const amountInReais = Number((input.amountCents / 100).toFixed(2));
    const notificationUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`;

    const nameParts = (input.payer.name || 'Cliente DocFácil').trim().split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'DocFácil';

    const payment = await this.client.createPayment({
      transaction_amount: amountInReais,
      description: 'DocFácil - Documento Avulso',
      payment_method_id: 'pix',
      payer: {
        email: input.payer.email,
        first_name: firstName,
        last_name: lastName,
        ...(input.payer.cpfCnpj
          ? {
              identification: {
                type:
                  input.payer.cpfCnpj.replace(/\D/g, '').length > 11
                    ? 'CNPJ'
                    : 'CPF',
                number: input.payer.cpfCnpj.replace(/\D/g, ''),
              },
            }
          : {}),
      },
      external_reference: input.orderId,
      notification_url: notificationUrl,
    });

    const qrCode =
      payment.point_of_interaction?.transaction_data?.qr_code || '';
    const qrCodeBase64 =
      payment.point_of_interaction?.transaction_data?.qr_code_base64 || '';

    if (!qrCode) {
      throw new BackendError(
        'INTERNAL_ERROR',
        502,
        'Não foi possível gerar a chave Pix no Mercado Pago.'
      );
    }

    return {
      kind: 'pix',
      providerPaymentId: String(payment.id),
      providerStatus: payment.status,
      brCode: qrCode,
      brCodeBase64: qrCodeBase64,
      expiresAt:
        payment.date_of_expiration ||
        new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      devMode: isDev,
    };
  }

  public async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<SubscriptionPaymentResult> {
    const env = getServerEnv();
    const isDev = env.NODE_ENV !== 'production' || env.VERCEL_ENV === 'preview';
    const amountInReais = Number((input.amountCents / 100).toFixed(2));
    const notificationUrl = `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`;

    const preference = await this.client.createPreference({
      items: [
        {
          id: 'plano-pro-mensal',
          title: 'DocFácil - Plano Pro Mensal',
          quantity: 1,
          unit_price: amountInReais,
          currency_id: 'BRL',
        },
      ],
      payer: {
        email: input.payer.email,
        name: input.payer.name,
      },
      external_reference: input.orderId,
      back_urls: {
        success: input.completionUrl,
        pending: input.completionUrl,
        failure: `${env.NEXT_PUBLIC_APP_URL}/planos`,
      },
      auto_return: 'approved',
      notification_url: notificationUrl,
    });

    const checkoutUrl =
      isDev && preference.sandbox_init_point
        ? preference.sandbox_init_point
        : preference.init_point;

    return {
      kind: 'hosted',
      providerCheckoutId: preference.id,
      providerStatus: 'pending',
      checkoutUrl,
      devMode: isDev,
    };
  }

  public async checkPaymentStatus(
    paymentId: string
  ): Promise<PaymentStatusResult> {
    const payment = await this.client.getPayment(paymentId);

    let status: 'pending' | 'paid' | 'failed' | 'refunded' = 'pending';
    if (payment.status === 'approved') {
      status = 'paid';
    } else if (
      ['rejected', 'cancelled', 'charged_back'].includes(payment.status)
    ) {
      status = 'failed';
    } else if (payment.status === 'refunded') {
      status = 'refunded';
    }

    return {
      status,
      externalId: String(payment.id),
      paidAt: payment.date_approved
        ? new Date(payment.date_approved).getTime()
        : undefined,
    };
  }
}
