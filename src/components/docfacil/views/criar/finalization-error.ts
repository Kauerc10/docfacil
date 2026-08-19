export type FinalizationErrorKind = "free_limit" | "generic";

type FinalizationApiError = Error & {
  code?: unknown;
  status?: unknown;
};

/**
 * Traduz apenas erros que mudam de fato o próximo passo da interface.
 * Um 402 genérico não é suficiente: checkout pendente, pedido inválido e
 * limite gratuito têm recuperações diferentes.
 */
export function classifyFinalizationError(error: unknown): FinalizationErrorKind {
  if (!error || typeof error !== "object") return "generic";

  const apiError = error as FinalizationApiError;
  return apiError.code === "FREE_LIMIT_REACHED" ? "free_limit" : "generic";
}
