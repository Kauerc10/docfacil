/**
 * index.ts — Ponto de entrada canônico do módulo de geração de PDF.
 *
 * API pública:
 *   - gerarEBaixarPDF(modelo, respostas, options?) — download no browser
 *   - gerarPDFBuffer(modelo, respostas, options?) — Buffer para testes
 *   - preloadPdfmake() — pré-aquece o pdfmake (chamar no mount de views)
 *   - loadPdfmake() — carrega o pdfmake sob demanda
 *   - buildDocDefinition(modelo, respostas, options?) — compila a docDefinition pdfmake
 *   - getPdfVisualRecipe(modelo) — obtém a receita visual calibrada
 *   - GerarPDFOptions — tipo das opções de geração
 */
export type { GerarPDFOptions } from "./types";
export { gerarEBaixarPDF, gerarPDFBuffer } from "./generate";
export { preloadPdfmake, loadPdfmake } from "./loader";
export { buildDocDefinition, getPdfLayoutProfile } from "./styles";
export { getPdfVisualRecipe, type PdfVisualRecipe } from "./visual-recipes";
