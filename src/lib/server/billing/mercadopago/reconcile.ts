import "server-only";
import { BackendError } from "../../errors";
import type { BillingRepositories } from "../../firestore/billing-repositories";
import type { MercadoPagoPayment, MercadoPagoSubscription } from "./types";
import { addBillingMonth } from "../subscription-lifecycle";
import { planPriceToCents } from "../../../pricing";
import { applyAvulsoPayment as applyConfirmedAvulsoPayment } from "./financial-operations";

const AVULSO_CENTS = planPriceToCents("avulso");
const PRO_CENTS = planPriceToCents("pro");

export interface MercadoPagoReconciliationProvider {
  getPayment(paymentId: string): Promise<MercadoPagoPayment>;
  getAuthorizedPayment(paymentId: string): Promise<Record<string, unknown>>;
  getSubscription(subscriptionId: string): Promise<MercadoPagoSubscription>;
}

export interface MercadoPagoReconciliationDeps {
  provider: MercadoPagoReconciliationProvider;
  repos: BillingRepositories;
  collectorId: string;
  environment: "test" | "production";
  now: () => number;
  /** Starts the persisted delivery flow after an avulso payment is confirmed. */
  onPaid?: (orderId: string) => Promise<void>;
  applyAvulsoPayment?: typeof applyConfirmedAvulsoPayment;
}

export type MercadoPagoReconciliationResult =
  | { accepted: true; ignored: true; reason: string }
  | { accepted: true; ignored: false; kind: "avulso" | "pro"; paymentId: string; applied: boolean };

function invalid(message: string): never {
  throw new BackendError("INVALID_REQUEST", 409, message);
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" && typeof value !== "number") invalid(`${label} ausente.`);
  const result = String(value).trim();
  if (!result) invalid(`${label} ausente.`);
  return result;
}

function cents(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) invalid("Valor da cobrança inválido.");
  return Math.round(value * 100);
}

function validatePayment(payment: MercadoPagoPayment, deps: MercadoPagoReconciliationDeps, expectedCents: number): void {
  if (payment.live_mode !== (deps.environment === "production")) invalid("Ambiente da cobrança não corresponde ao ambiente configurado.");
  if (String(payment.collector_id ?? payment.collectorId ?? "") !== deps.collectorId) invalid("Recebedor da cobrança não corresponde à conta configurada.");
  if (String(payment.currency_id ?? "") !== "BRL") invalid("Moeda da cobrança inválida.");
  if (cents(payment.transaction_amount) !== expectedCents) invalid("Valor da cobrança não corresponde ao produto.");
  const method = String(payment.payment_method_id ?? "").toLowerCase();
  const paymentType = String(payment.payment_type_id ?? "").toLowerCase();
  if (method === "pix") {
    if (paymentType && paymentType !== "bank_transfer") invalid("Meio de pagamento não permitido.");
  } else if (paymentType !== "credit_card") invalid("Meio de pagamento não permitido.");
  if (method !== "pix" && payment.installments !== 1) invalid("Parcelamento não permitido.");
}

function requireApproved(payment: MercadoPagoPayment): void {
  if (String(payment.status ?? "").toLowerCase() !== "approved") invalid("A cobrança ainda não foi aprovada.");
}

function authorizedPaymentId(authorized: Record<string, unknown>): string {
  const nested = authorized.payment;
  const nestedRecord = nested && typeof nested === "object" ? nested as Record<string, unknown> : undefined;
  return text(authorized.payment_id ?? authorized.paymentId ?? nestedRecord?.id ?? authorized.id, "Pagamento autorizado");
}

function preapprovalId(authorized: Record<string, unknown>): string {
  return text(authorized.preapproval_id ?? authorized.preapprovalId ?? authorized.subscription_id, "Assinatura autorizada");
}

export async function reconcileMercadoPagoPayment(
  paymentId: string,
  deps: MercadoPagoReconciliationDeps
): Promise<MercadoPagoReconciliationResult> {
  const payment = await deps.provider.getPayment(paymentId);
  if (String(payment.id) !== String(paymentId)) invalid("Identificador da cobrança não corresponde ao recurso consultado.");
  if (String(payment.status ?? "").toLowerCase() !== "approved") {
    return { accepted: true, ignored: true, reason: `payment_status:${String(payment.status ?? "unknown")}` };
  }
  const externalReference = text(payment.external_reference, "Referência externa");
  const order = await deps.repos.orders.getOrder(externalReference);
  if (!order) throw new BackendError("ORDER_NOT_FOUND", 404, "Pedido da cobrança não encontrado.");
  if (order.provider !== "mercadopago") invalid("Pedido não pertence ao Mercado Pago.");
  const expected = order.product === "pro"
    ? ([PRO_CENTS, 2990].includes(order.amountCents) ? order.amountCents : PRO_CENTS)
    : AVULSO_CENTS;
  validatePayment(payment, deps, expected);
  if (order.amountCents !== expected) invalid("Pedido possui valor incompatível.");
  if (!payment.date_approved || !Number.isFinite(Date.parse(payment.date_approved))) invalid("Data de aprovação da cobrança ausente.");
  const paymentMethod = String(payment.payment_method_id ?? "").toLowerCase();
  if ((order.method === "pix" && paymentMethod !== "pix") || (order.method === "card" && String(payment.payment_type_id ?? "").toLowerCase() !== "credit_card")) invalid("Meio de pagamento não corresponde ao pedido.");
  const providerPaymentId = text(payment.id, "Pagamento");
  if (order.product === "pro") {
    const subscriptionId = text(order.providerSubscriptionId, "Assinatura");
    const subscription = await deps.provider.getSubscription(subscriptionId);
    if (String(subscription.status ?? "").toLowerCase() !== "authorized") invalid("Assinatura não está autorizada.");
    if (subscription.auto_recurring?.currency_id !== "BRL" || subscription.auto_recurring?.transaction_amount !== PRO_CENTS / 100 || subscription.auto_recurring?.frequency !== 1 || subscription.auto_recurring?.frequency_type !== "months") {
      invalid("Periodicidade ou valor da assinatura não corresponde ao plano Pro.");
    }
    const userId = order.buyer.type === "user" ? order.buyer.userId : "";
    if (!userId) invalid("Assinatura Pro precisa pertencer a uma conta.");
    if (!payment.date_approved || !Number.isFinite(Date.parse(payment.date_approved))) invalid("Data de aprovação da cobrança ausente.");
    const paidAt = Date.parse(payment.date_approved);
    const local = await deps.repos.subscriptions.getByProviderSubscriptionId(subscriptionId);
    const result = local
      ? await deps.repos.subscriptions.renewWithPayment({ userId: local.userId, providerSubscriptionId: subscriptionId, paymentId: providerPaymentId, paidAt, cycleId: String(payment.metadata?.invoice_id ?? payment.metadata?.cycle_id ?? providerPaymentId) })
      : await deps.repos.subscriptions.activateWithPayment({
          paymentId: providerPaymentId,
          record: {
            userId,
            provider: "mercadopago",
            providerSubscriptionId: subscriptionId,
            providerCheckoutId: order.providerCheckoutId,
            providerProductId: String(payment.metadata?.product_id ?? "pro"),
            product: "pro",
            method: "card",
            status: "active",
            autoRenew: true,
            amountCents: PRO_CENTS,
            paidThrough: addBillingMonth(paidAt),
            lastPaidAt: paidAt,
            lastPaymentId: providerPaymentId,
            createdAt: paidAt,
            updatedAt: paidAt,
          },
        });
    return { accepted: true, ignored: false, kind: "pro", paymentId: providerPaymentId, applied: result.applied };
  }
  const application = await (deps.applyAvulsoPayment ?? applyConfirmedAvulsoPayment)(externalReference, providerPaymentId, Date.parse(payment.date_approved));
  if (application.primary && deps.onPaid) await deps.onPaid(externalReference);
  return { accepted: true, ignored: false, kind: "avulso", paymentId: providerPaymentId, applied: application.applied };
}

export async function reconcileMercadoPagoAuthorizedPayment(
  authorizedId: string,
  deps: MercadoPagoReconciliationDeps
): Promise<MercadoPagoReconciliationResult> {
  const authorized = await deps.provider.getAuthorizedPayment(authorizedId);
  const paymentId = authorizedPaymentId(authorized);
  const subscriptionId = preapprovalId(authorized);
  const payment = await deps.provider.getPayment(paymentId);
  requireApproved(payment);
  const externalReference = text(payment.external_reference, "Referência externa");
  const order = await deps.repos.orders.getOrder(externalReference);
  if (!order || order.provider !== "mercadopago" || order.providerSubscriptionId !== subscriptionId) invalid("Pagamento não pertence à assinatura autorizada.");
  return reconcileMercadoPagoPayment(paymentId, deps);
}

export async function reconcileMercadoPagoWebhookEvent(
  eventType: string | undefined,
  resourceId: string,
  deps: MercadoPagoReconciliationDeps
): Promise<MercadoPagoReconciliationResult> {
  if (eventType === "payment" || eventType === "payment.updated") return reconcileMercadoPagoPayment(resourceId, deps);
  if (eventType === "authorized_payment" || eventType === "authorized_payment.updated" || eventType === "subscription_authorized_payment") return reconcileMercadoPagoAuthorizedPayment(resourceId, deps);
  return { accepted: true, ignored: true, reason: `unsupported_topic:${eventType ?? "unknown"}` };
}
