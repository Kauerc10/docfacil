import 'server-only';
import crypto from 'crypto';
import { BackendError } from '../../errors';
import { WEBHOOK_REPLAY_TOLERANCE_MS } from '../constants';

export interface MercadoPagoWebhookParts {
  ts: string;
  v1: string;
}

export function parseMercadoPagoSignature(signatureHeader: string | null): MercadoPagoWebhookParts | null {
  if (!signatureHeader) return null;
  const parts = signatureHeader.split(',').map((p) => p.trim());
  let ts: string | undefined;
  let v1: string | undefined;

  for (const part of parts) {
    const [key, val] = part.split('=');
    if (key === 'ts') ts = val;
    if (key === 'v1') v1 = val;
  }

  if (!ts || !v1) return null;
  return { ts, v1 };
}

export function verifyMercadoPagoSignature(params: {
  signatureHeader: string | null;
  requestIdHeader?: string | null;
  dataId: string;
  secret: string;
  maxAgeMs?: number;
  now?: number;
}): boolean {
  const {
    signatureHeader,
    requestIdHeader,
    dataId,
    secret,
    maxAgeMs = WEBHOOK_REPLAY_TOLERANCE_MS,
    now = Date.now(),
  } = params;

  if (!secret) return false;

  const parsed = parseMercadoPagoSignature(signatureHeader);
  if (!parsed) return false;

  const tsNum = Number(parsed.ts);
  if (Number.isFinite(tsNum)) {
    const tsMs = tsNum < 1e11 ? tsNum * 1000 : tsNum;
    if (Math.abs(now - tsMs) > maxAgeMs) {
      return false;
    }
  }

  const manifest = `id:${dataId};request-id:${requestIdHeader || ''};ts:${parsed.ts};`;
  const computedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    const computedBuffer = Buffer.from(computedHash, 'hex');
    const receivedBuffer = Buffer.from(parsed.v1, 'hex');
    if (computedBuffer.length !== receivedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(computedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

export interface MercadoPagoWebhookEvent {
  id: string;
  type: string;
  action?: string;
  liveMode?: boolean;
}

export function parseMercadoPagoWebhookEvent(
  body: any,
  searchParams?: URLSearchParams
): MercadoPagoWebhookEvent {
  const id =
    String(
      body?.data?.id ??
      searchParams?.get('data.id') ??
      searchParams?.get('id') ??
      body?.id ??
      ''
    ).trim();

  const type =
    String(
      body?.type ??
      searchParams?.get('type') ??
      searchParams?.get('topic') ??
      body?.topic ??
      ''
    ).trim();

  const action = body?.action ? String(body.action) : undefined;
  const liveMode = typeof body?.live_mode === 'boolean' ? body.live_mode : undefined;

  if (!id) {
    throw new BackendError('INVALID_REQUEST', 400, 'Webhook sem identificador (data.id) válido.');
  }

  return {
    id,
    type: type || 'payment',
    action,
    liveMode,
  };
}
