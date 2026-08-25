import type { CheckoutPixPayload } from "@/lib/services/checkout-service";

export interface PixPaymentSession {
  orderId: string;
  authenticated: boolean;
  guestEmail?: string;
  returnUrl: string;
  pix: CheckoutPixPayload;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function buildPixPaymentUrl(successUrl: string, orderId: string): string {
  const url = new URL(successUrl);
  url.searchParams.set("view", "pagamento-pix");
  url.searchParams.set("orderId", orderId);
  url.searchParams.delete("billingReturn");
  return url.toString();
}

export function parsePixPaymentSession(raw: string | null): PixPaymentSession | null {
  if (!raw) return null;

  try {
    const record = asRecord(JSON.parse(raw));
    const pix = asRecord(record?.pix);
    const orderId = nonEmptyString(record?.orderId);
    const returnUrl = nonEmptyString(record?.returnUrl);
    const brCode = nonEmptyString(pix?.brCode);
    const brCodeBase64 = nonEmptyString(pix?.brCodeBase64);
    const expiresAt = pix?.expiresAt;
    const authenticated = record?.authenticated;
    const guestEmail = nonEmptyString(record?.guestEmail);

    if (
      !record ||
      !pix ||
      !orderId ||
      !returnUrl ||
      !brCode ||
      !brCodeBase64 ||
      typeof expiresAt !== "number" ||
      !Number.isFinite(expiresAt) ||
      typeof authenticated !== "boolean"
    ) {
      return null;
    }

    return {
      orderId,
      authenticated,
      ...(guestEmail ? { guestEmail } : {}),
      returnUrl,
      pix: { brCode, brCodeBase64, expiresAt },
    };
  } catch {
    return null;
  }
}
