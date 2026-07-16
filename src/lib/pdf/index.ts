/**
 * index.ts — Barrel público do módulo de geração de PDF.
 *
 * API pública:
 *   - gerarEBaixarPDF(modelo, respostas, options?) — download no browser
 *   - gerarPDFBuffer(modelo, respostas, options?) — Buffer para testes
 *   - preloadPdfmake() — pré-aquece o pdfmake (chamar no mount de views)
 *   - GerarPDFOptions — tipo das opções
 *
 * Consumers (importam via `@/lib/pdf`):
 *   - src/components/docfacil/views/sucesso-view.tsx
 *   - src/components/docfacil/views/documento/use-documento-actions.ts
 *   - src/lib/document-engine/index.ts (referência em comentário)
 *
 * Arquitetura interna (cada arquivo tem responsabilidade única):
 *   types.ts           — tipos compartilhados (folha base)
 *   fonts.ts           — configuração de fontes Roboto / VFS
 *   loader.ts          — loadPdfmake() singleton + preloadPdfmake()
 *   content-builder.ts — template → nós pdfmake (buildContent, textRuns, etc.)
 *   styles.ts          — buildDocDefinition() (docDefinition completo)
 *   generate.ts        — gerarEBaixarPDF + gerarPDFBuffer (orquestrador)
 *   generator.ts       — thin re-export (backward-compat com @/lib/pdf/generator)
 *
 * Segue o mesmo padrão do `src/lib/document-engine/`.
 */
export type { GerarPDFOptions } from "./types";
export { gerarEBaixarPDF, gerarPDFBuffer } from "./generate";
export { preloadPdfmake } from "./loader";
