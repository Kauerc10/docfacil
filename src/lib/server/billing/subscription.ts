import "server-only";

export type SubscriptionStatus = "active" | "cancelled" | "past_due";

export interface BillingSubscriptionRecord {
  userId: string;
  provider: "abacatepay";
  providerSubscriptionId: string;
  providerCheckoutId?: string;
  providerProductId: string;
  product: "pro";
  method: "card";
  status: SubscriptionStatus;
  autoRenew: boolean;
  amountCents: 3990;
  paidThrough: number;
  lastPaidAt: number;
  lastPaymentId?: string;
  lastFailureAt?: number;
  createdAt: number;
  updatedAt: number;
}

export function hasCurrentProAccess(
  subscription: BillingSubscriptionRecord | null | undefined,
  now = Date.now()
): boolean {
  return Boolean(subscription && subscription.paidThrough > now);
}
