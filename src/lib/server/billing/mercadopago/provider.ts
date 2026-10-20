import "server-only";
import { BackendError } from "../../errors";
import { planPriceToCents } from "../../../pricing";
import type {
  BillingProvider,
  CreateOneTimePaymentInput,
  CreateSubscriptionInput,
  OneTimePaymentResult,
  SubscriptionPaymentResult,
} from "../provider";
import { MercadoPagoClient, getMercadoPagoClient } from "./client";
import type {
  MercadoPagoClientConfig,
  MercadoPagoOneTimePaymentInput,
  MercadoPagoPayment,
  MercadoPagoPreference,
  MercadoPagoRefund,
  MercadoPagoSubscription,
  MercadoPagoSubscriptionInput,
} from "./types";

const AVULSO_CENTS = planPriceToCents("avulso");
const PRO_CENTS = planPriceToCents("pro");

function requiredEmail(input: { buyerEmail?: string }): string {
  const email = input.buyerEmail?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new BackendError("INVALID_REQUEST", 400, "E-mail do comprador inválido.");
  }
  return email;
}

function requiredAmount(amountCents: number, expected: number | number[]): number {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!Number.isSafeInteger(amountCents) || !allowed.includes(amountCents)) {
    throw new BackendError("INVALID_REQUEST", 400, "Valor de pagamento inválido.");
  }
  return amountCents / 100;
}

function requiredId(value: string, label: string): string {
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(value)) {
    throw new BackendError("INVALID_REQUEST", 400, `${label} inválido.`);
  }
  return value;
}

function decimalAmount(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export class MercadoPagoBillingProvider implements BillingProvider {
  constructor(private readonly client: MercadoPagoClient) {}

  public async createOneTimePayment(
    input: CreateOneTimePaymentInput & Partial<Pick<MercadoPagoOneTimePaymentInput, "buyerEmail">>
  ): Promise<OneTimePaymentResult> {
    const email = requiredEmail(input);
    const amount = requiredAmount(input.amountCents, AVULSO_CENTS);
    const orderId = requiredId(input.orderId, "Pedido");

    if (input.method === "pix") {
      const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
      const payment = await this.client.request<MercadoPagoPayment>(
        "/v1/payments",
        {
          method: "POST",
          body: JSON.stringify({
            transaction_amount: amount,
            description: "Documento avulso",
            payment_method_id: "pix",
            notification_url: new URL("/api/webhooks/mercadopago", input.completionUrl).toString(),
            date_of_expiration: expiresAt,
            payer: { email },
            external_reference: orderId,
            metadata: { product: "avulso", order_id: orderId },
          }),
        },
        { idempotencyKey: orderId }
      );
      const transaction = payment.point_of_interaction?.transaction_data;
      if (!payment.id || !transaction?.qr_code || !transaction.qr_code_base64 ||
          !payment.date_of_expiration || !Number.isFinite(Date.parse(payment.date_of_expiration))) {
        throw new BackendError("BILLING_PROVIDER_FAILED", 502, "Resposta Pix inválida do provedor.");
      }
      return {
        kind: "pix",
        providerPaymentId: String(payment.id),
        providerStatus: payment.status ?? "pending",
        brCode: transaction.qr_code,
        brCodeBase64: transaction.qr_code_base64,
        expiresAt: payment.date_of_expiration,
        devMode: this.clientEnvironmentIsTest(),
      };
    }

    const preference = await this.client.request<MercadoPagoPreference>(
      "/checkout/preferences",
      {
        method: "POST",
        body: JSON.stringify({
          items: [{ id: "docfacil-avulso", title: "Documento avulso", quantity: 1, unit_price: amount, currency_id: "BRL" }],
          payer: { email },
          external_reference: orderId,
          back_urls: { success: input.completionUrl, pending: input.completionUrl, failure: input.completionUrl },
          auto_return: "approved",
          notification_url: new URL("/api/webhooks/mercadopago", input.completionUrl).toString(),
          payment_methods: {
            excluded_payment_types: ["ticket", "bank_transfer", "debit_card", "prepaid_card", "atm", "digital_currency"].map(id => ({ id })),
            installments: 1,
            default_installments: 1,
          },
          metadata: { product: "avulso", order_id: orderId },
        }),
      },
      { idempotencyKey: orderId }
    );
    const checkoutUrl = preference.init_point ?? preference.sandbox_init_point;
    if (!preference.id || !checkoutUrl) {
      throw new BackendError("BILLING_PROVIDER_FAILED", 502, "Resposta de checkout inválida do provedor.");
    }
    return {
      kind: "hosted",
      providerCheckoutId: preference.id,
      providerStatus: "pending",
      checkoutUrl,
      devMode: this.clientEnvironmentIsTest(),
    };
  }

  public async createSubscription(
    input: CreateSubscriptionInput & Partial<Pick<MercadoPagoSubscriptionInput, "buyerEmail">>
  ): Promise<SubscriptionPaymentResult> {
    const email = requiredEmail(input);
    const amount = requiredAmount(input.amountCents, [PRO_CENTS, 2990]);
    const orderId = requiredId(input.orderId, "Pedido");
    const subscription = await this.client.request<MercadoPagoSubscription>(
      "/preapproval",
      {
        method: "POST",
        body: JSON.stringify({
          reason: "DocFácil Pro",
          external_reference: orderId,
          payer_email: email,
          auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: amount, currency_id: "BRL" },
          back_url: input.completionUrl,
          status: "pending",
        }),
      },
      { idempotencyKey: orderId }
    );
    if (!subscription.id || !subscription.init_point) {
      throw new BackendError("BILLING_PROVIDER_FAILED", 502, "Resposta de assinatura inválida do provedor.");
    }
    return {
      kind: "hosted",
      providerCheckoutId: subscription.id,
      providerStatus: subscription.status ?? "pending",
      checkoutUrl: subscription.init_point,
      devMode: this.clientEnvironmentIsTest(),
    };
  }

  public async cancelSubscription(input: { providerSubscriptionId: string }): Promise<void> {
    const id = requiredId(input.providerSubscriptionId, "Assinatura");
    await this.client.request(`/preapproval/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ status: "cancelled" }),
    });
  }

  public async getPayment(paymentId: string): Promise<MercadoPagoPayment> {
    return this.client.request<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(requiredId(paymentId, "Pagamento"))}`);
  }

  public async findPaymentsForOrder(orderId: string): Promise<MercadoPagoPayment[]> {
    const id = requiredId(orderId, "Pedido");
    const result = await this.client.request<{ results?: MercadoPagoPayment[] }>(
      `/v1/payments/search?external_reference=${encodeURIComponent(id)}&sort=date_created&criteria=desc&limit=20`
    );
    return Array.isArray(result.results) ? result.results : [];
  }

  public async getAuthorizedPayment(paymentId: string): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>(`/authorized_payments/${encodeURIComponent(requiredId(paymentId, "Pagamento"))}`);
  }

  public async getSubscription(subscriptionId: string): Promise<MercadoPagoSubscription> {
    return this.client.request<MercadoPagoSubscription>(`/preapproval/${encodeURIComponent(requiredId(subscriptionId, "Assinatura"))}`);
  }

  public async refundPayment(paymentId: string, idempotencyKey: string): Promise<MercadoPagoRefund> {
    const id = requiredId(paymentId, "Pagamento");
    return this.client.request<MercadoPagoRefund>(`/v1/payments/${encodeURIComponent(id)}/refunds`, { method: "POST", body: "{}" }, { idempotencyKey });
  }

  public async cancelPayment(paymentId: string, idempotencyKey: string): Promise<MercadoPagoPayment> {
    const id = requiredId(paymentId, "Pagamento");
    return this.client.request<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) }, { idempotencyKey });
  }

  private clientEnvironmentIsTest(): boolean {
    return this.client.environment === "test";
  }
}

export function createMercadoPagoBillingProvider(config?: MercadoPagoClientConfig): MercadoPagoBillingProvider {
  return new MercadoPagoBillingProvider(config ? new MercadoPagoClient(config) : getMercadoPagoClient());
}
