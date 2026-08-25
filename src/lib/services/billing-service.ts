import { apiFetch } from "@/lib/auth/api-fetch";

export type AccountSubscriptionState = {
  status: "active" | "cancelled" | "past_due";
  autoRenew: boolean;
  paidThrough: number;
};

export interface AccountBillingState {
  plan: "gratis" | "pro";
  subscription: AccountSubscriptionState | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseAccountBillingState(value: unknown): AccountBillingState {
  const record = asRecord(value);
  if (!record || (record.plan !== "gratis" && record.plan !== "pro")) {
    throw new Error("Estado de assinatura inválido.");
  }

  if (record.subscription === null) {
    return { plan: record.plan, subscription: null };
  }

  const subscription = asRecord(record.subscription);
  if (!subscription) {
    throw new Error("Estado de assinatura inválido.");
  }

  const status = subscription.status;
  const autoRenew = subscription.autoRenew;
  const paidThrough = subscription.paidThrough;

  if (
    (status !== "active" && status !== "cancelled" && status !== "past_due") ||
    typeof autoRenew !== "boolean" ||
    typeof paidThrough !== "number" ||
    !Number.isFinite(paidThrough)
  ) {
    throw new Error("Estado de assinatura inválido.");
  }

  return {
    plan: record.plan,
    subscription: { status, autoRenew, paidThrough },
  };
}

export async function getAccountBillingState(): Promise<AccountBillingState> {
  const response = await apiFetch("/api/billing/me", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = asRecord(payload)?.error;
    const errorRecord = asRecord(message);
    throw new Error(
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Não foi possível consultar sua assinatura."
    );
  }

  return parseAccountBillingState(await response.json());
}
