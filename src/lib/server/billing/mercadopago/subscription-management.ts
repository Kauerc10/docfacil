import "server-only";
import { BackendError } from "../../errors";
import type { BillingRepositories } from "../../firestore/billing-repositories";

export interface MercadoPagoSubscriptionManagementProvider {
  cancelSubscription(input: { providerSubscriptionId: string }): Promise<void>;
}

export async function cancelMercadoPagoSubscription(input: {
  userId: string;
  repos: BillingRepositories;
  provider: MercadoPagoSubscriptionManagementProvider;
  now: number;
}): Promise<{ status: "cancelled"; paidThrough: number }> {
  const current = await input.repos.subscriptions.getByUserId(input.userId);
  if (!current || current.provider !== "mercadopago") {
    throw new BackendError("ORDER_NOT_FOUND", 404, "Assinatura Pro não encontrada.");
  }
  if (!current.autoRenew || current.status === "cancelled") {
    return { status: "cancelled", paidThrough: current.paidThrough };
  }
  await input.repos.subscriptions.requestCancellation(input.userId, input.now);
  await input.provider.cancelSubscription({ providerSubscriptionId: current.providerSubscriptionId });
  const cancelled = await input.repos.subscriptions.confirmCancellation(input.userId, input.now);
  return { status: "cancelled", paidThrough: cancelled.paidThrough };
}

export async function continueMercadoPagoSubscription(input: {
  userId: string;
  repos: BillingRepositories;
}): Promise<{ status: "active"; autoRenew: true; paidThrough: number }> {
  const current = await input.repos.subscriptions.getByUserId(input.userId);
  if (!current || current.provider !== "mercadopago") {
    throw new BackendError("ORDER_NOT_FOUND", 404, "Assinatura Pro não encontrada.");
  }
  if (current.autoRenew && current.status === "active") {
    return { status: "active", autoRenew: true, paidThrough: current.paidThrough };
  }
  if (current.status === "cancelled" || current.paidThrough <= Date.now()) {
    throw new BackendError("CONFLICT", 409, "Esta assinatura precisa de uma nova autorização no Mercado Pago antes de continuar.");
  }
  const resumed = await input.repos.subscriptions.resumeAutoRenew(input.userId);
  return { status: "active", autoRenew: true, paidThrough: resumed.paidThrough };
}
