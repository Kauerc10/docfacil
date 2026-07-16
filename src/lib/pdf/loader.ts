/**
 * loader.ts — Carregamento lazy + singleton do módulo pdfmake.
 *
 * O pdfmake é pesado (~1MB de VFS com as fontes Roboto embutidas). Carregamos
 * dinamicamente via `import()` apenas quando o usuário realmente vai gerar
 * um PDF, e cacheamos o módulo num singleton (`pdfmakePromise`) para que
 * chamadas subsequentes sejam instantâneas.
 *
 * O Next.js / ESM congela (freeze) o namespace do módulo, impedindo que o
 * pdfmake atribua a `pdfMake.vfs` / `pdfMake.fonts`. Por isso criamos um
 * `ctx` mutável e fazemos `bind` de `createPdf` e `_transformToDocument`
 * nesse contexto.
 */
import type { PdfMakeContext } from "./types";
import { configurePdfMakeFonts } from "./fonts";

let pdfmakePromise: Promise<PdfMakeContext> | null = null;

/**
 * Carrega o pdfmake (lazy) e retorna um contexto configurado com fontes.
 * Singleton: a primeira chamada faz o import + config; as subsequentes
 * reutilizam a promise cacheada.
 */
export async function loadPdfmake(): Promise<PdfMakeContext> {
  if (!pdfmakePromise) {
    pdfmakePromise = (async () => {
      const rawMod = await import("pdfmake/build/pdfmake");
      const mod = (rawMod as any).default || rawMod;
      const pdfFontsModule = (await import("pdfmake/build/vfs_fonts")).default;

      // Contexto mutável — dribla o freeze de namespace do Next.js/ESM.
      const ctx = {
        fonts: mod.fonts || {},
        vfs: mod.vfs || {},
        virtualfs: mod.virtualfs,
        urlAccessPolicy: mod.urlAccessPolicy,
        localAccessPolicy: mod.localAccessPolicy,
        tableLayouts: (mod as unknown as { tableLayouts?: unknown }).tableLayouts,
        progressCallback: (mod as unknown as { progressCallback?: unknown }).progressCallback,
      };

      configurePdfMakeFonts(ctx, pdfFontsModule);

      const createPdf = mod.createPdf.bind(ctx) as (docDefinition: unknown) => any;
      const _transformToDocument = (mod as unknown as { _transformToDocument: any })._transformToDocument.bind(ctx);
      (ctx as unknown as { _transformToDocument: unknown })._transformToDocument = _transformToDocument;

      return { createPdf };
    })();
  }
  return pdfmakePromise;
}

/**
 * Pré-aquece o pdfmake sem gerar PDF.
 * Útil para chamar no mount de uma view que terá um botão de download —
 * o primeiro clique fica ~instantâneo.
 */
export async function preloadPdfmake(): Promise<void> {
  await loadPdfmake();
}
