import type { CampoModelo } from "@/lib/types";

const REDUNDANT_MICROCOPY = new Set([
  "Escreva o nome completo, igual aparece no RG.",
  "Se não quiser informar, pode deixar em branco.",
  'Pode digitar com ou sem a palavra "Rua" — ajustamos para você.',
  "Pode digitar a sigla (SP) ou o nome (São Paulo).",
]);

export function getVisibleMicrocopy(campo: Pick<CampoModelo, "microcopy">): string | undefined {
  const text = campo.microcopy?.trim();
  if (!text || REDUNDANT_MICROCOPY.has(text)) return undefined;
  return text;
}
