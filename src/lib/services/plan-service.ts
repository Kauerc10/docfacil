/**
 * Plan Service — verificação de plano (paywall) do DocFacil.
 *
 * Fachada do client delegando para a política unificada de entitlement
 * (@/lib/billing/entitlement-policy).
 *
 * Modelo de negócio:
 *  - **Grátis**: até FREE_PLAN_MONTHLY_LIMIT documentos/mês (em modelos selecionados), PDF com marca d'água.
 *  - **Avulso**: 1 documento específico sem marca d'água (vinculado ao pagamento).
 *  - **Pro**: documentos ilimitados, sem marca d'água, edição e re-download liberados.
 *
 * Nota de segurança: estas checagens são client-side (UX/gating de interface).
 * A validação server-side definitiva acontece nas API routes / regras do Firestore.
 * Nunca confie apenas no client para proteger recursos pagos.
 */
import type { AppUser, Documento } from "@/lib/types";
import { type Plan } from "@/lib/pricing";
import {
  isPro as policyIsPro,
  isAvulso as policyIsAvulso,
  hasPaidPlan as policyHasPaidPlan,
  getPlan as policyGetPlan,
  countBillingMonthDocuments,
  canCreateDocument as policyCanCreateDocument,
  remainingDocumentsThisMonth as policyRemainingDocumentsThisMonth,
  resolveDocumentWatermark,
  canDownloadClean as policyCanDownloadClean,
  canEditDocument as policyCanEditDocument,
  downloadBlockReason as policyDownloadBlockReason,
  type DocumentLikeForWatermark,
} from "@/lib/billing/entitlement-policy";

export type { DocumentLikeForWatermark };

/** Tipo mínimo que aceita tanto AppUser quanto PerfilUsuario. */
export type UserLike = Pick<AppUser, "plano"> | null | undefined;

/** Retorna verdadeiro se o usuário tem plano Pro ativo. */
export function isPro(user: UserLike): boolean {
  return policyIsPro(user);
}

/** Retorna verdadeiro se o usuário tem plano Avulso ativo. */
export function isAvulso(user: UserLike): boolean {
  return policyIsAvulso(user);
}

/** Retorna verdadeiro se o usuário tem qualquer plano pago (avulso ou pro). */
export function hasPaidPlan(user: UserLike): boolean {
  return policyHasPaidPlan(user);
}

/** Retorna o plano normalizado (default "gratis" se indefinido). */
export function getPlan(user: UserLike): Plan {
  return policyGetPlan(user);
}

/**
 * Conta quantos documentos o usuário criou no mês civil vigente em São Paulo.
 * Usado para enforce do limite do plano grátis alinhado com o servidor.
 */
export function countDocumentsThisMonth(
  docs: Array<{ criadoEm?: number; createdAt?: number }>
): number {
  return countBillingMonthDocuments(docs);
}

/**
 * Verdadeiro se o usuário ainda pode criar documentos neste mês.
 * Pro = ilimitado. Grátis = respeita FREE_MONTHLY_LIMIT e modelo elegível.
 */
export function canCreateDocument(
  user: UserLike,
  monthDocCount: number,
  modelSlug?: string
): boolean {
  return policyCanCreateDocument(user, monthDocCount, modelSlug);
}

/** Quantos documentos restam no mês para o usuário (null = ilimitado). */
export function remainingDocumentsThisMonth(
  user: UserLike,
  monthDocCount: number
): number | null {
  return policyRemainingDocumentsThisMonth(user, monthDocCount);
}

/**
 * Decide se o PDF deve levar marca d'água.
 * Prioriza os atributos persistidos no próprio documento (entitlement/watermarked),
 * mantendo compatibilidade caso o documento seja omitido.
 */
export function shouldWatermark(
  user: UserLike,
  doc?: Documento | DocumentLikeForWatermark | null
): boolean {
  return resolveDocumentWatermark(doc, user);
}

/**
 * Verdadeiro se o usuário pode baixar o PDF deste documento SEM marca d'água.
 * Respeita documentos avulsos pagos e contas Pro.
 */
export function canDownloadClean(
  user: UserLike,
  doc?: Documento | DocumentLikeForWatermark | null
): boolean {
  return policyCanDownloadClean(user, doc);
}

/**
 * Verdadeiro se o usuário pode editar/rebaixar um documento.
 * Marketing: "Editar e rebaixar quando quiser" é feature Pro.
 */
export function canEditDocument(user: UserLike): boolean {
  return policyCanEditDocument(user);
}

/** Mensagem humana explicando o bloqueio de download limpo, se aplicável. */
export function downloadBlockReason(user: UserLike): string | null {
  return policyDownloadBlockReason(user);
}
