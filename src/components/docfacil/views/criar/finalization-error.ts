export type FinalizationErrorKind =
  | "free_limit"
  | "model_not_free"
  | "pro_required"
  | "generic";

type FinalizationApiError = Error & {
  code?: unknown;
  status?: unknown;
};

/**
 * Traduz apenas erros que mudam de fato o próximo passo da interface.
 * Um 402 genérico não é suficiente: checkout pendente, pedido inválido,
 * elegibilidade gratuita e exigência Pro têm recuperações diferentes.
 */
export function classifyFinalizationError(error: unknown): FinalizationErrorKind {
  if (!error || typeof error !== "object") return "generic";

  const apiError = error as FinalizationApiError;
  if (apiError.code === "FREE_LIMIT_REACHED") return "free_limit";
  if (apiError.code === "FREE_MODEL_NOT_ELIGIBLE") return "model_not_free";
  if (apiError.code === "PRO_REQUIRED") return "pro_required";
  return "generic";
}
