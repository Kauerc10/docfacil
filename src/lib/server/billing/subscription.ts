import "server-only";

export type SubscriptionStatus = "active" | "cancelled" | "past_due";

export interface BillingSubscriptionRecord {
  userId: string;
  provider: "abacatepay" | "mercadopago";
  providerSubscriptionId: string;
  providerCheckoutId?: string;
  providerProductId: string;
  product: "pro";
  method: "card";
  status: SubscriptionStatus;
  autoRenew: boolean;
  amountCents: number;
  paidThrough: number;
  lastPaidAt: number;
  lastPaymentId?: string;
  lastFailureAt?: number;
  createdAt: number;
  updatedAt: number;
  cancellationRequestedAt?: number;
  cancellationRequestStatus?: "requested" | "confirmed" | "failed";
}

export function hasCurrentProAccess(
  subscription: BillingSubscriptionRecord | null | undefined,
  now = Date.now()
): boolean {
  return Boolean(subscription && subscription.paidThrough > now);
}
