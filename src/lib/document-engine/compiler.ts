import type { Modelo } from "../types";
import { renderDocument, fillDocument } from "./render";
import type { PaginaRenderizada, RenderOptions } from "./types";

export interface CompileDocumentParams {
  modelo: Modelo;
  respostas: Record<string, string>;
  clausulasSelecionadas?: string[];
  options?: RenderOptions;
}

export interface CompiledDocument {
  linhas: string[];
  paginas: PaginaRenderizada[];
  titulo: string;
  totalPaginas: number;
}

/**
 * Compila o documento para representação intermediária textual e paginada.
 * Ponto de entrada profundo e simplificado para o motor de documentos.
 */
export function compileDocument(params: CompileDocumentParams): CompiledDocument {
  const { modelo, respostas, clausulasSelecionadas = [], options } = params;
  const input = {
    titulo: modelo.template.titulo,
    corpo: modelo.template.corpo,
    respostas,
    clausulasSelecionadas,
    modelo,
  };

  const linhas = fillDocument(input, options);
  const paginas = renderDocument(input, options);

  return {
    linhas,
    paginas,
    titulo: linhas[0] ?? modelo.template.titulo,
    totalPaginas: paginas.length,
  };
}
