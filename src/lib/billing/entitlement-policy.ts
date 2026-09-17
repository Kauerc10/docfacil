/**
 * Entitlement Policy — Política unificada de acesso, cotas e marca d'água do DocFacil.
 *
 * Módulo de domínio puro compartilhado entre client e server.
 * Fonte única de verdade para:
 *  - Fuso de referência de faturamento (America/Sao_Paulo) e início do mês civil.
 *  - Contagem autoritativa de documentos no mês civil.
 *  - Avaliação de elegibilidade de criação (visitante, grátis, avulso pago, Pro).
 *  - Resolução de marca d'água fiel ao documento (honra single_purchase histórico).
 */
import { FREE_MONTHLY_LIMIT, isMonthlyFreeModel } from "@/lib/document-access-policy";

export const BILLING_TIME_ZONE = "America/Sao_Paulo";

const billingDateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BILLING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getBillingZoneParts(date: Date) {
  const parts = billingDateTimeFormatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
    second: getPart("second"),
  };
}

function getBillingZoneOffsetMs(timestamp: number): number {
  const parts = getBillingZoneParts(new Date(timestamp));
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return representedAsUtc - Math.trunc(timestamp / 1000) * 1000;
}

/**
 * Retorna o instante UTC correspondente à meia-noite do primeiro dia do mês
 * civil vigente em São Paulo.
 */
export function getStartOfBillingMonthTimestamp(now = new Date()): number {
  const { year, month } = getBillingZoneParts(now);
  const localMidnightAsUtc = Date.UTC(year, month - 1, 1, 0, 0, 0);

  let candidate = localMidnightAsUtc;
  for (let attempt = 0; attempt < 3; attempt++) {
    const nextCandidate =
      localMidnightAsUtc - getBillingZoneOffsetMs(candidate);
    if (nextCandidate === candidate) break;
    candidate = nextCandidate;
  }

  return candidate;
}

/**
 * Conta quantos documentos foram criados dentro do mês civil de São Paulo.
 */
export function countBillingMonthDocuments(
  docs: Array<{ criadoEm?: number; createdAt?: number }>,
  now = new Date()
): number {
  const startOfMonth = getStartOfBillingMonthTimestamp(now);
  return docs.filter((d) => {
    const ts = d.criadoEm ?? d.createdAt ?? 0;
    return ts >= startOfMonth;
  }).length;
}

export type UserLike = { plano?: string | null } | null | undefined;

export function isPro(user: UserLike): boolean {
  return user?.plano === "pro";
}

export function isAvulso(user: UserLike): boolean {
  return user?.plano === "avulso";
}

export function hasPaidPlan(user: UserLike): boolean {
  return user?.plano === "avulso" || user?.plano === "pro";
}

export function getPlan(user: UserLike): "gratis" | "avulso" | "pro" {
  if (user?.plano === "pro") return "pro";
  if (user?.plano === "avulso") return "avulso";
  return "gratis";
}

export interface DocumentLikeForWatermark {
  watermarked?: boolean;
  entitlement?: {
    type?: "free" | "single_purchase" | "pro" | string;
    watermarked?: boolean;
  };
}

/**
 * Decide se um documento deve ter marca d'água.
 * Prioriza os atributos persistidos no próprio documento (entitlement/watermarked),
 * com fallback para o plano atual do usuário.
 */
export function resolveDocumentWatermark(
  doc: DocumentLikeForWatermark | null | undefined,
  user: UserLike
): boolean {
  if (isPro(user)) {
    return false;
  }

  if (doc) {
    if (doc.entitlement) {
      if (doc.entitlement.type === "single_purchase" || doc.entitlement.type === "pro") {
        return false;
      }
      if (typeof doc.entitlement.watermarked === "boolean") {
        return doc.entitlement.watermarked;
      }
    }
    if (typeof doc.watermarked === "boolean") {
      return doc.watermarked;
    }
  }

  return !hasPaidPlan(user);
}

/**
 * Retorna true se o usuário pode baixar o documento limpo (sem marca d'água).
 */
export function canDownloadClean(
  user: UserLike,
  doc?: DocumentLikeForWatermark | null
): boolean {
  return !resolveDocumentWatermark(doc, user);
}

export type EntitlementFailureReason =
  | "login_or_payment_required"
  | "free_limit_reached"
  | "model_not_eligible"
  | "payment_required";

export interface EvaluateCreationEntitlementParams {
  isUserLoggedIn: boolean;
  userPlan?: string | null;
  modelSlug: string;
  monthDocCount: number;
  hasPaidOrder?: boolean;
}

export interface CreationEntitlementResult {
  allowed: boolean;
  entitlement?: "free" | "single_purchase" | "pro";
  watermarked?: boolean;
  reason?: EntitlementFailureReason;
}

/**
 * Avalia se a geração de um documento é permitida e sob quais condições de entitlement.
 */
export function evaluateCreationEntitlement(
  params: EvaluateCreationEntitlementParams
): CreationEntitlementResult {
  const { isUserLoggedIn, userPlan, modelSlug, monthDocCount, hasPaidOrder } = params;

  if (hasPaidOrder) {
    return { allowed: true, entitlement: "single_purchase", watermarked: false };
  }

  if (!isUserLoggedIn) {
    return { allowed: false, reason: "login_or_payment_required" };
  }

  if (userPlan === "pro") {
    return { allowed: true, entitlement: "pro", watermarked: false };
  }

  if (!isMonthlyFreeModel(modelSlug)) {
    return { allowed: false, reason: "model_not_eligible" };
  }

  if (monthDocCount >= FREE_MONTHLY_LIMIT) {
    return { allowed: false, reason: "free_limit_reached" };
  }

  return { allowed: true, entitlement: "free", watermarked: true };
}

/**
 * Verifica se o usuário ainda pode criar documentos neste mês.
 */
export function canCreateDocument(
  user: UserLike,
  monthDocCount: number,
  modelSlug?: string
): boolean {
  if (isPro(user) || isAvulso(user)) return true;
  if (modelSlug && !isMonthlyFreeModel(modelSlug)) return false;
  return monthDocCount < FREE_MONTHLY_LIMIT;
}

/**
 * Retorna quantos documentos restam no mês para o usuário (null = ilimitado).
 */
export function remainingDocumentsThisMonth(
  user: UserLike,
  monthDocCount: number
): number | null {
  if (isPro(user)) return null;
  if (isAvulso(user)) return Math.max(0, 1 - monthDocCount);
  return Math.max(0, FREE_MONTHLY_LIMIT - monthDocCount);
}

/**
 * Retorna true se o usuário tem permissão para editar/rebaixar.
 */
export function canEditDocument(user: UserLike): boolean {
  return isPro(user);
}

/**
 * Mensagem explicativa para bloqueio de download limpo, se aplicável.
 */
export function downloadBlockReason(user: UserLike): string | null {
  if (isPro(user) || isAvulso(user)) return null;
  if (!user) return null;
  return "Seu plano gratuito inclui marca d'água. Faça upgrade para baixar sem marca.";
}
