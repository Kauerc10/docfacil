import "server-only";
import type { BillingSubscriptionRecord } from "./subscription";

export function addBillingMonth(timestamp: number): number {
  const current = new Date(timestamp);
  const targetMonthIndex = current.getUTCMonth() + 1;
  const targetYear = current.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();

  return Date.UTC(
    targetYear,
    targetMonth,
    Math.min(current.getUTCDate(), lastDayOfTargetMonth),
    current.getUTCHours(),
    current.getUTCMinutes(),
    current.getUTCSeconds(),
    current.getUTCMilliseconds()
  );
}

export interface ActivateProSubscriptionInput {
  userId: string;
  providerSubscriptionId: string;
  providerCheckoutId?: string;
  providerProductId: string;
  paymentId: string;
  amountCents: 3990;
  paidAt: number;
}

export function activateProSubscription(
  input: ActivateProSubscriptionInput
): BillingSubscriptionRecord {
  return {
    userId: input.userId,
    provider: "abacatepay",
    providerSubscriptionId: input.providerSubscriptionId,
    providerCheckoutId: input.providerCheckoutId,
    providerProductId: input.providerProductId,
    product: "pro",
    method: "card",
    status: "active",
    autoRenew: true,
    amountCents: input.amountCents,
    paidThrough: addBillingMonth(input.paidAt),
    lastPaidAt: input.paidAt,
    lastPaymentId: input.paymentId,
    createdAt: input.paidAt,
    updatedAt: input.paidAt,
  };
}

export function renewProSubscription(
  current: BillingSubscriptionRecord,
  input: { paymentId: string; paidAt: number }
): BillingSubscriptionRecord {
  const periodStart = Math.max(current.paidThrough, input.paidAt);

  return {
    ...current,
    status: "active",
    autoRenew: true,
    paidThrough: addBillingMonth(periodStart),
    lastPaidAt: input.paidAt,
    lastPaymentId: input.paymentId,
    lastFailureAt: undefined,
    updatedAt: input.paidAt,
  };
}

export function failProRenewal(
  current: BillingSubscriptionRecord,
  failedAt: number
): BillingSubscriptionRecord {
  return {
    ...current,
    status: "past_due",
    lastFailureAt: failedAt,
    updatedAt: failedAt,
  };
}

export function cancelProSubscription(
  current: BillingSubscriptionRecord,
  cancelledAt: number
): BillingSubscriptionRecord {
  return {
    ...current,
    status: "cancelled",
    autoRenew: false,
    updatedAt: cancelledAt,
  };
}
