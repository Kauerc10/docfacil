/**
 * types.ts — Tipos compartilhados do gerador de PDF.
 *
 * Folha base do módulo `pdf/`: nenhum arquivo deste diretório importa de
 * outro módulo funcional; apenas este importa tipos do domínio pai.
 *
 * Segue o mesmo padrão do `document-engine/types.ts`.
 */
import type { Modelo } from "../types";

/** Opções de geração de PDF (nome do arquivo + watermark condicional). */
export interface GerarPDFOptions {
  /** Nome base do arquivo (sem extensão .pdf). Default: `${slug}-${data}`. */
  nomeArquivo?: string;
  /** Quando true, aplica o carimbo circular "DOCFACIL · VALIDADE LEGAL". */
  watermark?: boolean;
}

/** Tipo do módulo dinâmico do pdfmake. */
export type PdfMakeModule = typeof import("pdfmake/build/pdfmake");

/** Contexto mutável criado para driblar o freeze de namespace do Next.js/ESM. */
export type PdfMakeContext = {
  createPdf: (docDefinition: unknown) => any;
};

/** Re-export do tipo Modelo para conveniência dos módulos que precisam. */
export type { Modelo };
