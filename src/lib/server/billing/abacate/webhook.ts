import "server-only";
import crypto from "node:crypto";
import { BackendError } from "../../errors";

const ABACATEPAY_WEBHOOK_PUBLIC_KEY =
  "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

export interface AbacateWebhookEvent {
  id: string;
  event: string;
  apiVersion: 2;
  devMode: boolean;
  data: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function secretsMatch(
  received: string | null | undefined,
  expected: string | null | undefined
): boolean {
  if (!received || !expected) return false;
  return timingSafeStringEqual(received, expected);
}

export function verifyAbacateWebhookSignature(
  rawBody: string,
  signatureFromHeader: string | null | undefined
): boolean {
  if (!signatureFromHeader) return false;

  const expected = crypto
    .createHmac("sha256", ABACATEPAY_WEBHOOK_PUBLIC_KEY)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");

  return timingSafeStringEqual(expected, signatureFromHeader);
}

export function parseAbacateWebhookEvent(rawBody: string): AbacateWebhookEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "Payload de webhook inválido."
    );
  }

  if (
    !isRecord(parsed) ||
    typeof parsed.id !== "string" ||
    parsed.id.trim().length === 0 ||
    typeof parsed.event !== "string" ||
    parsed.event.trim().length === 0 ||
    parsed.apiVersion !== 2 ||
    typeof parsed.devMode !== "boolean" ||
    !isRecord(parsed.data)
  ) {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "Envelope de webhook inválido."
    );
  }

  return {
    id: parsed.id,
    event: parsed.event,
    apiVersion: 2,
    devMode: parsed.devMode,
    data: parsed.data,
  };
}
