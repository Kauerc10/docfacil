import 'server-only';
import { getServerEnv } from '../../env';
import { BackendError } from '../../errors';

export interface MercadoPagoPaymentPayload {
  transaction_amount: number;
  description: string;
  payment_method_id: 'pix';
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: 'CPF' | 'CNPJ';
      number: string;
    };
  };
  external_reference: string;
  notification_url?: string;
}

export interface MercadoPagoPaymentResponse {
  id: number;
  status:
    | 'pending'
    | 'approved'
    | 'authorized'
    | 'in_process'
    | 'in_mediation'
    | 'rejected'
    | 'cancelled'
    | 'refunded'
    | 'charged_back';
  status_detail?: string;
  date_approved?: string;
  date_of_expiration?: string;
  external_reference?: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

export interface MercadoPagoPreferencePayload {
  items: Array<{
    id?: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: 'BRL';
  }>;
  payer?: {
    email: string;
    name?: string;
  };
  external_reference: string;
  back_urls?: {
    success: string;
    pending: string;
    failure: string;
  };
  auto_return?: 'approved' | 'all';
  notification_url?: string;
}

export interface MercadoPagoPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export interface MercadoPagoPreapprovalPayload {
  reason: string;
  auto_recurring: {
    frequency: number;
    frequency_type: 'months' | 'days';
    transaction_amount: number;
    currency_id: 'BRL';
  };
  payer_email: string;
  back_url: string;
  external_reference: string;
  status?: string;
}

export interface MercadoPagoPreapprovalResponse {
  id: string;
  init_point?: string;
  sandbox_init_point?: string;
  status: 'pending' | 'authorized' | 'paused' | 'cancelled';
  reason?: string;
  external_reference?: string;
  payer_email?: string;
}

export interface IMercadoPagoClient {
  createPayment(payload: MercadoPagoPaymentPayload): Promise<MercadoPagoPaymentResponse>;
  getPayment(id: string | number): Promise<MercadoPagoPaymentResponse>;
  createPreference(payload: MercadoPagoPreferencePayload): Promise<MercadoPagoPreferenceResponse>;
  createPreapproval(payload: MercadoPagoPreapprovalPayload, idempotencyKey?: string): Promise<MercadoPagoPreapprovalResponse>;
  getPreapproval(id: string): Promise<MercadoPagoPreapprovalResponse>;
  cancelPreapproval(id: string): Promise<MercadoPagoPreapprovalResponse>;
}

export class MercadoPagoClient implements IMercadoPagoClient {
  private readonly accessToken: string;
  private readonly baseUrl = 'https://api.mercadopago.com';

  constructor(accessToken?: string) {
    this.accessToken = accessToken || getServerEnv().MERCADOPAGO_ACCESS_TOKEN || '';
    if (!this.accessToken) {
      throw new BackendError(
        'SERVER_MISCONFIGURED',
        500,
        'MERCADOPAGO_ACCESS_TOKEN não está configurado no servidor.'
      );
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const message =
        (errorBody as { message?: string }).message ||
        `Mercado Pago API error: ${res.status}`;
      throw new BackendError('INTERNAL_ERROR', res.status >= 500 ? 502 : 400, message, {
        mpError: errorBody,
      });
    }

    return (await res.json()) as T;
  }

  public async createPayment(
    payload: MercadoPagoPaymentPayload
  ): Promise<MercadoPagoPaymentResponse> {
    return this.request<MercadoPagoPaymentResponse>('/v1/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getPayment(id: string | number): Promise<MercadoPagoPaymentResponse> {
    return this.request<MercadoPagoPaymentResponse>(`/v1/payments/${id}`, {
      method: 'GET',
    });
  }

  public async createPreference(
    payload: MercadoPagoPreferencePayload
  ): Promise<MercadoPagoPreferenceResponse> {
    return this.request<MercadoPagoPreferenceResponse>('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async createPreapproval(
    payload: MercadoPagoPreapprovalPayload,
    idempotencyKey?: string
  ): Promise<MercadoPagoPreapprovalResponse> {
    return this.request<MercadoPagoPreapprovalResponse>('/preapproval', {
      method: 'POST',
      headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined,
      body: JSON.stringify(payload),
    });
  }

  public async getPreapproval(id: string): Promise<MercadoPagoPreapprovalResponse> {
    return this.request<MercadoPagoPreapprovalResponse>(`/preapproval/${id}`, {
      method: 'GET',
    });
  }

  public async cancelPreapproval(id: string): Promise<MercadoPagoPreapprovalResponse> {
    return this.request<MercadoPagoPreapprovalResponse>(`/preapproval/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' }),
    });
  }
}
