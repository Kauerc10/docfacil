/**
 * Fonte única de verdade para preços e rótulos de planos do DocFacil.
 *
 * Toda referência a preço ou nome de plano no app DEVE partir daqui.
 * Isso evita inconsistências (ex.: perfil mostrando R$29,90 enquanto o
 * checkout cobra R$24,90) e permite mudar o preço em um único lugar.
 *
 * Módulos que consomem:
 *  - checkout-service.ts (re-exporta PLAN_PRICES/PLAN_LABELS)
 *  - planos-view.tsx (preço exibido)
 *  - checkout-view.tsx (resumo do pedido)
 *  - perfil-view.tsx (plano atual do usuário)
 *  - termos-view.tsx (preço citado nos Termos)
 */

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
  avulso: 9.9,
  pro: 24.9,
} as const;

/**
 * Converte o preço do plano/produto para valor inteiro em centavos.
 * Ex: avulso (R$ 9,90) -> 990 centavos.
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

/** Descrição de cobrança exibida sob o nome do plano (ex.: "R$ 24,90/mês"). */
export const PLAN_BILLING_DESC: Record<Plan, string> = {
  gratis: "Gratuito",
  avulso: "R$ 9,90 / documento avulso",
  pro: "R$ 24,90/mês",
};

/** Limite mensal de documentos do plano grátis. Pro é ilimitado. */
export const FREE_PLAN_MONTHLY_LIMIT = 3;

/**
 * Formata um valor numérico como moeda brasileira (R$ X,XX).
 * Aceita 0 → "Gratuito" quando usado em contexto de plano.
 */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Texto de preço de exibição para cards/hero (ex.: "R$ 9,90", "R$ 24,90", "R$ 0").
 * Não inclui o sufixo de periodicidade — use PLAN_BILLING_DESC para isso.
 */
export function formatPlanPrice(plan: Plan): string {
  if (plan === "gratis") return "R$ 0";
  return formatBRL(PLAN_PRICES[plan]);
}

/** Verdadeiro se o plano é pago (avulso ou pro). */
export function isPaidPlan(plan: Plan | string | undefined): plan is PaidPlan {
  return plan === "avulso" || plan === "pro";
}
