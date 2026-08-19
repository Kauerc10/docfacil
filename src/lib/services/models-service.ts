/**
 * Models Service — Provedor de modelos e catálogo do DocFacil.
 *
 * Arquitetura:
 * - O código (Git / TypeScript) é a FONTE ÚNICA DA VERDADE para o catálogo oficial da plataforma.
 * - Carregamento instantâneo (0ms, zero latência de rede, zero custo de leituras no Firestore).
 * - Extensível para futura integração com IA RAG (resolução de modelos dinâmicos/personalizados).
 */
import { MODELOS, getModelo as getLocalModelo } from "../modelos";
import type { Modelo, Categoria } from "../types";

/**
 * Retorna todos os modelos oficiais da plataforma.
 * Ordenação: Modelos populares primeiro, seguidos por ordem alfabética.
 */
export async function getModels(): Promise<Modelo[]> {
  const models = [...MODELOS];
  return models.sort((a, b) => {
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

/**
 * Retorna um modelo oficial pelo seu slug (ex: "contrato-locacao", "declaracao-residencia").
 */
export async function getModel(slug: string): Promise<Modelo | null> {
  const found = getLocalModelo(slug);
  return found || null;
}

/**
 * Filtra modelos por categoria.
 */
export async function getModelsByCategory(categoria: Categoria): Promise<Modelo[]> {
  const all = await getModels();
  return all.filter((m) => m.categoria === categoria);
}

/**
 * Busca textual em títulos, descrições e categorias.
 */
export async function searchModels(query: string): Promise<Modelo[]> {
  const q = query.trim().toLowerCase();
  if (!q) return getModels();

  const all = await getModels();
  return all.filter(
    (m) =>
      m.nome.toLowerCase().includes(q) ||
      m.desc.toLowerCase().includes(q) ||
      m.quandoUsar.toLowerCase().includes(q) ||
      m.categoria.toLowerCase().includes(q)
  );
}

/**
 * Interface extensível de resolução de modelos.
 * Preparada para suporte a IA RAG com Tool Use (geração de minutas sob demanda).
 */
export interface ModelResolveContext {
  userId?: string;
  customTemplates?: Record<string, Modelo>;
}

export async function resolveModel(
  slugOrId: string,
  context?: ModelResolveContext
): Promise<Modelo | null> {
  // 1. Tenta resolver modelo padrão do catálogo oficial
  const official = getLocalModelo(slugOrId);
  if (official) return official;

  // 2. Tenta resolver modelo personalizado/dinâmico injetado (ex: gerado por IA RAG)
  if (context?.customTemplates && context.customTemplates[slugOrId]) {
    return context.customTemplates[slugOrId];
  }

  return null;
}

/** Re-exporta MODELOS para compatibilidade com testes e scripts. */
export { MODELOS as LOCAL_MODELOS, MODELOS };
