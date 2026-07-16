/**
 * generator.ts — Thin re-export para backward-compat.
 *
 * Este arquivo era o monolito de ~950 linhas. Foi modularizado em 7 arquivos
 * (types, fonts, loader, content-builder, styles, generate, index) seguindo
 * o padrão do `document-engine/`.
 *
 * Mantido como re-export para que callers existentes
 * (`@/lib/pdf/generator`) continuem funcionando sem mudança.
 * Novos imports devem usar `@/lib/pdf` (o barrel).
 *
 * @deprecated Prefira importar de `@/lib/pdf`.
 */
export { gerarEBaixarPDF, gerarPDFBuffer } from "./generate";
export { preloadPdfmake } from "./loader";
export type { GerarPDFOptions } from "./types";
