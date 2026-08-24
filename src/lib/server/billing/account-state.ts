import "server-only";
import {
  hasCurrentProAccess,
  type BillingSubscriptionRecord,
  type SubscriptionStatus,
} from "./subscription";

export interface AccountBillingState {
  plan: "gratis" | "pro";
  subscription: {
    status: SubscriptionStatus;
    autoRenew: boolean;
    paidThrough: number;
  } | null;
}

export function resolveAccountBillingState(
  subscription: BillingSubscriptionRecord | null | undefined,
  now = Date.now()
): AccountBillingState {
  return {
    plan: hasCurrentProAccess(subscription, now) ? "pro" : "gratis",
    subscription: subscription
      ? {
          status: subscription.status,
          autoRenew: subscription.autoRenew,
          paidThrough: subscription.paidThrough,
        }
      : null,
  };
}
