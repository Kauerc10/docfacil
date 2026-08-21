import { createHash } from "crypto";
import type { OrderRecord } from "../domain/documents";

export function normalizeEmail(email?: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

export function normalizePhone(phone?: string): string {
  if (!phone) return "";
  // Remove non-digit characters
  return phone.replace(/\D/g, "");
}

export function createBuyerFingerprint(input: {
  email?: string;
  phone?: string;
}): string {
  const normEmail = normalizeEmail(input.email);
  const normPhone = normalizePhone(input.phone);

  const payload = {
    email: normEmail || null,
    phone: normPhone || null,
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function createOrderBuyerPrincipalKey(buyer: OrderRecord["buyer"]): string {
  if (buyer.type === "user") {
    return `user:${buyer.userId}`;
  }

  return `guest:${createBuyerFingerprint(buyer)}`;
}
