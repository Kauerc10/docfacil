/**
 * Fonte única de verdade para preços e rótulos de planos do DocFacil.
 *
 * Toda referência a preço ou nome de plano no app DEVE partir daqui.
 * Regras de elegibilidade e quota gratuita vivem em document-access-policy.
 */
import { FREE_MONTHLY_LIMIT } from "@/lib/document-access-policy";

/** Planos de conta de usuário autoritativos no sistema. */
export type AccountPlan = "gratis" | "pro";

/** Produtos de compra disponíveis. */
export type PurchaseProduct = "avulso" | "pro";

/** Planos possíveis para um usuário (inclui legado para UI). */
export type Plan = "gratis" | "avulso" | "pro";

/** Planos pagos (subset usado pelo checkout). */
export type PaidPlan = Exclude<Plan, "gratis">;

/** Preço numérico (BRL) de cada plano. Grátis = 0. */
export const PLAN_PRICES = {
  gratis: 0,
  avulso: 19.9,
  pro: 39.9,
} as const;

/**
 * Converte o preço do plano/produto para valor inteiro em centavos.
 */
export function planPriceToCents(plan: keyof typeof PLAN_PRICES): number {
  return Math.round(PLAN_PRICES[plan] * 100);
}

/** Rótulo curto de exibição. */
export const PLAN_LABELS: Record<Plan, string> = {
  gratis: "Grátis",
  avulso: "Avulso",
  pro: "Pro",
};

/** Rótulo completo/descritivo do plano. */
export const PLAN_FULL_LABELS: Record<Plan, string> = {
  gratis: "Plano Grátis",
  avulso: "Documento Avulso",
  pro: "Plano Pro (mensal)",
};

/** Descrição de cobrança exibida sob o nome do plano. */
export const PLAN_BILLING_DESC: Record<Plan, string> = {
  gratis: "Gratuito",
  avulso: "R$ 19,90 / documento avulso",
  pro: "R$ 39,90/mês",
};

/**
 * Alias temporário para consumidores antigos. A fonte autoritativa é
 * FREE_MONTHLY_LIMIT em document-access-policy.
 */
export const FREE_PLAN_MONTHLY_LIMIT = FREE_MONTHLY_LIMIT;

/**
 * Formata um valor numérico como moeda brasileira (R$ X,XX).
 */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Texto de preço de exibição para cards/hero. */
export function formatPlanPrice(plan: Plan): string {
  if (plan === "gratis") return "R$ 0";
  return formatBRL(PLAN_PRICES[plan]);
}

/** Verdadeiro se o plano é pago (avulso ou pro). */
export function isPaidPlan(plan: Plan | string | undefined): plan is PaidPlan {
  return plan === "avulso" || plan === "pro";
}
