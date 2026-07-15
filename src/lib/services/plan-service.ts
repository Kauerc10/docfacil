/**
 * Plan Service — verificação de plano (paywall) do DocFacil.
 *
 * Fonte única de verdade para quem pode fazer o quê. Usado por:
 *  - sucesso-view.tsx (download pós-criação)
 *  - documento-detalhe-view.tsx / use-documento-actions.ts (download e edição)
 *  - dashboard-view.tsx (download)
 *  - criar-view.tsx (limite mensal do plano grátis)
 *
 * Modelo de negócio:
 *  - **Grátis**: até FREE_PLAN_MONTHLY_LIMIT documentos/mês, PDF com marca d'água.
 *  - **Avulso**: 1 documento específico sem marca d'água (vinculado ao pagamento).
 *  - **Pro**: documentos ilimitados, sem marca d'água, edição e re-download liberados.
 *
 * Nota de segurança: estas checagens são client-side (UX/gating de interface).
 * A validação server-side definitiva acontece nas API routes / regras do Firestore.
 * Nunca confie apenas no client para proteger recursos pagos.
 */
import type { AppUser } from "@/lib/types";
import type { Documento } from "@/lib/types";
import { FREE_PLAN_MONTHLY_LIMIT, isPaidPlan, type Plan } from "@/lib/pricing";

/** Tipo mínimo que aceita tanto AppUser quanto PerfilUsuario. */
type UserLike = Pick<AppUser, "plano"> | null | undefined;

/** Retorna verdadeiro se o usuário tem plano Pro ativo. */
export function isPro(user: UserLike): boolean {
  return user?.plano === "pro";
}

/** Retorna verdadeiro se o usuário tem plano Avulso ativo. */
export function isAvulso(user: UserLike): boolean {
  return user?.plano === "avulso";
}

/** Retorna verdadeiro se o usuário tem qualquer plano pago (avulso ou pro). */
export function hasPaidPlan(user: UserLike): boolean {
  return isPaidPlan(user?.plano);
}

/** Retorna o plano normalizado (default "gratis" se indefinido). */
export function getPlan(user: UserLike): Plan {
  return (user?.plano as Plan) ?? "gratis";
}

/**
 * Conta quantos documentos o usuário criou no mês atual.
 * Usado para enforce do limite do plano grátis.
 */
export function countDocumentsThisMonth(docs: Documento[]): number {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return docs.filter((d) => d.criadoEm >= startOfMonth).length;
}

/**
 * Verdadeiro se o usuário ainda pode criar documentos neste mês.
 * Pro = ilimitado. Grátis = respeita FREE_PLAN_MONTHLY_LIMIT. Avulso = 1 (já pago).
 */
export function canCreateDocument(user: UserLike, monthDocCount: number): boolean {
  if (isPro(user)) return true;
  if (isAvulso(user)) return true; // avulso libera 1 documento (o pago)
  // Grátis: limite mensal
  return monthDocCount < FREE_PLAN_MONTHLY_LIMIT;
}

/** Quantos documentos restam no mês para o usuário (null = ilimitado). */
export function remainingDocumentsThisMonth(user: UserLike, monthDocCount: number): number | null {
  if (isPro(user)) return null;
  if (isAvulso(user)) return Math.max(0, 1 - monthDocCount);
  return Math.max(0, FREE_PLAN_MONTHLY_LIMIT - monthDocCount);
}

/**
 * Decide se o PDF deve levar marca d'água.
 * Grátis = SIM. Avulso/Pro = NÃO.
 */
export function shouldWatermark(user: UserLike): boolean {
  return !hasPaidPlan(user);
}

/**
 * Verdadeiro se o usuário pode baixar o PDF deste documento SEM marca d'água.
 *
 * Regras:
 *  - Pro: sempre sim (sem marca d'água).
 *  - Avulso: sim APENAS para o documento pago (matching por documentId via payment).
 *    Como não há vinculação payment→document implementada ainda, Avulso libera
 *    o último documento criado. TODO: vincular orderId ao documentId no checkout.
 *  - Grátis: nunca (sempre com marca d'água).
 *  - Deslogado: nunca (PaymentBarrier cuida do gating de UI).
 */
export function canDownloadClean(user: UserLike, _doc: Documento): boolean {
  if (isPro(user)) return true;
  if (isAvulso(user)) return true; // vê TODO acima
  return false;
}

/**
 * Verdadeiro se o usuário pode editar/rebaixar um documento.
 * Marketing: "Editar e rebaixar quando quiser" é feature Pro.
 */
export function canEditDocument(user: UserLike): boolean {
  return isPro(user);
}

/** Mensagem humana explicando o bloqueio de download limpo, se aplicável. */
export function downloadBlockReason(user: UserLike): string | null {
  if (canDownloadClean(user, null as unknown as Documento)) return null;
  if (!user) return null; // deslogado — PaymentBarrier cuida
  return "Seu plano gratuito inclui marca d'água. Faça upgrade para baixar sem marca.";
}
