import { hasInvalidMoradoresAutorizados } from "@/lib/document-engine";
import type { Modelo } from "@/lib/types";

export interface CreateFinalizationGuard {
  stepIndex: number;
  message: string;
}

/**
 * Keeps a local form mistake in the chat instead of discovering it only after
 * a generation request reaches the backend.
 */
export function getCreateFinalizationGuard(
  modelo: Modelo,
  answers: Record<string, string>
): CreateFinalizationGuard | null {
  if (
    modelo.slug !== "contrato-locacao" ||
    !hasInvalidMoradoresAutorizados(answers.moradores_autorizados)
  ) {
    return null;
  }

  const stepIndex = (modelo.etapas ?? []).findIndex(
    (etapa) => etapa.tipo === "campo" && etapa.campo.key === "moradores_autorizados"
  );

  return {
    stepIndex: Math.max(0, stepIndex),
    message: "Informe o nome completo de cada morador adicional.",
  };
}
