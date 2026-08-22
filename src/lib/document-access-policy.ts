export const FREE_MONTHLY_LIMIT = 1;

export const MONTHLY_FREE_MODEL_SLUGS = [
  "declaracao-residencia",
  "comodato",
  "contrato-locacao-comercial",
] as const;

const FREE_MODEL_SET = new Set<string>(MONTHLY_FREE_MODEL_SLUGS);

export function isMonthlyFreeModel(slug: string): boolean {
  return FREE_MODEL_SET.has(slug);
}
