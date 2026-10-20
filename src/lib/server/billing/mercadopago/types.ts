import type {
  BillingProvider,
  CreateOneTimePaymentInput,
  CreateSubscriptionInput,
  OneTimePaymentResult,
  SubscriptionPaymentResult,
} from "../provider";

export type MercadoPagoEnvironment = "test" | "production";

export interface MercadoPagoClientConfig {
  accessToken: string;
  environment: MercadoPagoEnvironment;
  sellerId: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export type MercadoPagoOneTimePaymentInput = CreateOneTimePaymentInput & {
  /** Mercado Pago requires payer.email for a payment. */
  buyerEmail: string;
};

export type MercadoPagoSubscriptionInput = CreateSubscriptionInput & {
  /** Mercado Pago requires payer_email for a preapproval. */
  buyerEmail: string;
};

export interface MercadoPagoPayment {
  id: string | number;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
  date_approved?: string | null;
  date_of_expiration?: string | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
      transaction_id?: string;
    };
  };
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MercadoPagoPreference {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
  [key: string]: unknown;
}

export interface MercadoPagoSubscription {
  id: string;
  status?: string;
  init_point?: string;
  payer_email?: string;
  external_reference?: string;
  auto_recurring?: {
    transaction_amount?: number;
    currency_id?: string;
    frequency?: number;
    frequency_type?: string;
    [key: string]: unknown;
  };
  next_payment_date?: string;
  [key: string]: unknown;
}

export interface MercadoPagoRefund {
  id: string | number;
  payment_id?: string | number;
  amount?: number;
  status?: string;
  [key: string]: unknown;
}

export interface MercadoPagoWebhookEvent {
  id: string;
  type?: string;
  action?: string;
  resourceId: string;
  data: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export type {
  BillingProvider,
  CreateOneTimePaymentInput,
  CreateSubscriptionInput,
  OneTimePaymentResult,
  SubscriptionPaymentResult,
};
