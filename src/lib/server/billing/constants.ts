import 'server-only';

/**
 * Constantes autoritativas de ciclo de vida e faturamento (Billing & Payments).
 */

/** Duração padrão do ciclo de assinatura mensal em milissegundos (30 dias). */
export const DEFAULT_SUBSCRIPTION_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

/** Janela de tolerância para considerar uma reserva Pro em andamento como abandonada (60 segundos). */
export const RESERVATION_STALENESS_MS = 60_000;

/** Tempo padrão de expiração do Pix gerado no Mercado Pago (30 minutos). */
export const DEFAULT_PIX_EXPIRATION_MS = 30 * 60 * 1000;

/** Janela máxima de tolerância a ataques de replay em assinaturas de webhooks (10 minutos). */
export const WEBHOOK_REPLAY_TOLERANCE_MS = 10 * 60 * 1000;
