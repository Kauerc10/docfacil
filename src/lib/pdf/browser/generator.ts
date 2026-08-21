/**
 * browser/generator.ts — Adapter de PDF para execução no browser.
 * Utiliza o VFS do pdfmake empacotado para renderização client-side.
 */
export { gerarEBaixarPDF, gerarPDFBuffer } from "../generate";
export { preloadPdfmake, loadPdfmake } from "../loader";
export type { GerarPDFOptions } from "../types";
