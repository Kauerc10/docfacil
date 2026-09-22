import 'server-only';
import { DEFAULT_PIX_EXPIRATION_MS } from './constants';
import type { PaymentMethod } from '../domain/documents';

export interface CreateOneTimePaymentInput {
  orderId: string;
  product: 'avulso';
  amountCents: number;
  method: PaymentMethod;
  payer: {
    email: string;
    name?: string;
    phone?: string;
    cpfCnpj?: string;
  };
  completionUrl: string;
}

export type OneTimePaymentResult =
  | {
      kind: 'pix';
      providerPaymentId: string;
      providerStatus: string;
      brCode: string;
      brCodeBase64: string;
      expiresAt: string;
      devMode: boolean;
    }
  | {
      kind: 'hosted';
      providerCheckoutId: string;
      providerStatus: string;
      checkoutUrl: string;
      devMode: boolean;
    };

export interface CreateSubscriptionInput {
  orderId: string;
  product: 'pro';
  amountCents: number;
  payer: {
    email: string;
    userId: string;
    name?: string;
    phone?: string;
  };
  completionUrl: string;
}

export interface SubscriptionPaymentResult {
  kind: 'hosted';
  providerCheckoutId: string;
  providerStatus: string;
  checkoutUrl: string;
  devMode: boolean;
}

export interface PaymentStatusResult {
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  externalId: string;
  paidAt?: number;
}

export interface BillingProvider {
  createOneTimePayment(
    input: CreateOneTimePaymentInput
  ): Promise<OneTimePaymentResult>;
  createSubscription(
    input: CreateSubscriptionInput
  ): Promise<SubscriptionPaymentResult>;
  checkPaymentStatus?(
    paymentId: string
  ): Promise<PaymentStatusResult>;
}

let testingBillingProvider: BillingProvider | null = null;

export function setBillingProviderForTesting(provider: BillingProvider | null): void {
  testingBillingProvider = provider;
}

export function getTestingBillingProvider(): BillingProvider | null {
  return testingBillingProvider;
}

export class DemoBillingProviderAdapter implements BillingProvider {
  public async createOneTimePayment(
    input: CreateOneTimePaymentInput
  ): Promise<OneTimePaymentResult> {
    return {
      kind: 'pix',
      providerPaymentId: `demo_pix_${input.orderId}`,
      providerStatus: 'pending',
      brCode:
        '00020126580014br.gov.bcb.pix0136demo-pix-code-docfacil520400005303986540519.905802BR5913DocFacil Demo6009Sao Paulo62070503***6304ABCD',
      brCodeBase64:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      expiresAt: new Date(Date.now() + DEFAULT_PIX_EXPIRATION_MS).toISOString(),
      devMode: true,
    };
  }

  public async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<SubscriptionPaymentResult> {
    return {
      kind: 'hosted',
      providerCheckoutId: `demo_pref_${input.orderId}`,
      providerStatus: 'pending',
      checkoutUrl: input.completionUrl,
      devMode: true,
    };
  }

  public async checkPaymentStatus(
    paymentId: string
  ): Promise<PaymentStatusResult> {
    return {
      status: 'paid',
      externalId: `demo_pay_${paymentId}`,
      paidAt: Date.now(),
    };
  }
}

export function getBillingProvider(): BillingProvider {
  if (testingBillingProvider) {
    return testingBillingProvider;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getServerEnv } = require('../env');
  const env = getServerEnv();

  if (env.MERCADOPAGO_ACCESS_TOKEN) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MercadoPagoBillingProvider } = require('./mercadopago/provider');
    return new MercadoPagoBillingProvider();
  }

  if (env.ALLOW_DEMO_BILLING || env.NODE_ENV === 'test') {
    return new DemoBillingProviderAdapter();
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BackendError } = require('../errors');
  throw new BackendError(
    'SERVER_MISCONFIGURED',
    500,
    'Provedor de pagamento Mercado Pago não configurado no servidor.'
  );
}

