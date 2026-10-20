import "server-only";
import crypto from "node:crypto";
import { BackendError } from "../../errors";
import type { MercadoPagoWebhookEvent } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signatureParts(value: string): { ts: string; v1: string } | null {
  const fields = new Map<string, string>();
  for (const part of value.split(",")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key || rest.length === 0 || !rest.join("=").trim()) continue;
    fields.set(key, rest.join("=").trim());
  }
  const ts = fields.get("ts");
  const v1 = fields.get("v1");
  return ts && v1 && /^\d{10,}$/.test(ts) && /^[a-f0-9]{64}$/i.test(v1) ? { ts, v1 } : null;
}

/**
 * Verifies Mercado Pago's x-signature manifest: id, request-id and timestamp
 * are all included in the HMAC and data.id must match the query id.
 */
export function verifyMercadoPagoWebhookSignature(input: {
  rawBody: string;
  xSignature: string | null | undefined;
  xRequestId: string | null | undefined;
  queryDataId: string | null | undefined;
  webhookSecret: string;
}): boolean {
  if (!input.xSignature || !input.xRequestId || !input.queryDataId || !input.webhookSecret) return false;
  const parsed = signatureParts(input.xSignature);
  if (!parsed || !/^[A-Za-z0-9._:-]{1,200}$/.test(input.xRequestId) || !/^[A-Za-z0-9_-]{1,200}$/.test(input.queryDataId)) return false;
  let body: unknown;
  try {
    body = JSON.parse(input.rawBody);
  } catch {
    return false;
  }
  const data = isRecord(body) && isRecord(body.data) ? body.data : null;
  const bodyId = typeof data?.id === "string" || typeof data?.id === "number" ? String(data.id) : null;
  if (!bodyId || bodyId !== input.queryDataId) return false;
  const manifest = `id:${input.queryDataId.toLowerCase()};request-id:${input.xRequestId};ts:${parsed.ts};`;
  const expected = crypto.createHmac("sha256", input.webhookSecret).update(manifest).digest("hex");
  return safeEqual(expected.toLowerCase(), parsed.v1.toLowerCase());
}

export function parseMercadoPagoWebhookEvent(rawBody: string, queryDataId?: string | null): MercadoPagoWebhookEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new BackendError("INVALID_REQUEST", 400, "Payload de webhook inválido.");
  }
  if (!isRecord(parsed) || !isRecord(parsed.data)) {
    throw new BackendError("INVALID_REQUEST", 400, "Envelope de webhook inválido.");
  }
  const bodyId = parsed.data.id;
  if (!(typeof bodyId === "string" || typeof bodyId === "number") || String(bodyId).trim() === "") {
    throw new BackendError("INVALID_REQUEST", 400, "Identificador de recurso ausente no webhook.");
  }
  const resourceId = String(bodyId);
  if (queryDataId && resourceId !== queryDataId) {
    throw new BackendError("INVALID_REQUEST", 400, "Identificadores do webhook não conferem.");
  }
  const id = (typeof parsed.id === "string" || typeof parsed.id === "number") && String(parsed.id).trim()
    ? String(parsed.id) : `${parsed.type ?? "unknown"}:${resourceId}`;
  return {
    id,
    type: typeof parsed.type === "string" ? parsed.type : undefined,
    action: typeof parsed.action === "string" ? parsed.action : undefined,
    resourceId,
    data: parsed.data,
    raw: parsed,
  };
}

