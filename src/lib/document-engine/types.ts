/**
 * Tipos compartilhados do motor de renderização de documentos.
 *
 * O motor é split em módulos pequenos e focados (template, compose, classify,
 * paginate, render) para facilitar manutenção, testes e extensão com novos
 * modelos sem duplicar lógica.
 */
import type { Modelo } from "../types";

/** Classificação de uma linha renderizada (define o estilo visual). */
export type TipoLinha =
  | "heading1" // título principal do documento (ex.: "CONTRATO DE LOCAÇÃO")
  | "heading2" // subtítulo de seção (ex.: "1. DAS PARTES", "Cláusula Primeira:")
  | "paragraph" // parágrafo justificado (default)
  | "signature" // linha de assinatura (underscores ou "Assinatura:")
  | "witness" // testemunha/observação (itálico)
  | "empty"; // linha em branco (espaçamento)

/** Linha já classificada — saída do classifier. */
export interface LinhaClassificada {
  tipo: TipoLinha;
  texto: string;
}

/** Linha já quebrada em múltiplas visuais (wrapping por chars/linha). */
export interface LinhaQuebrada {
  tipo: TipoLinha;
  texto: string;
}

/** Página renderizada (após paginação). */
export interface PaginaRenderizada {
  linhas: LinhaQuebrada[];
  numero: number;
  total: number;
}

/** Input para o renderDocument (high-level API). */
export interface RenderInput {
  /** Título centralizado do documento (heading1). */
  titulo: string;
  /** Corpo do template — cada item é uma linha com `{{key}}` / `{{clausula:id}}`. */
  corpo: string[];
  /** Respostas brutas do usuário (campos individuais, ex.: `locador_cep`). */
  respostas: Record<string, string>;
  /** IDs das cláusulas dinâmicas selecionadas. */
  clausulasSelecionadas?: string[];
  /** Modelo (usado para composição de endereço e definição de cláusulas). */
  modelo?: Modelo;
  /** Doc ID exibido no header da 1ª página (quando aplicável). */
  docId?: string;
}

/** Opções de renderização (todos opcionais com defaults sensatos). */
export interface RenderOptions {
  /** Linhas por página A4 (default 20). */
  linhasPorPagina?: number;
  /** Caracteres por linha para wrapping (default 78). */
  charsPorLinha?: number;
  /** Chaves dos campos opcionais (vazios viram "" em vez de "_____"). */
  camposOpcionais?: string[];
}
