/**
 * generate.ts — Orquestrador de alto nível para geração de PDF.
 *
 * Ponto de entrada público: `gerarEBaixarPDF` (download no browser) e
 * `gerarPDFBuffer` (Buffer para testes/Node). Ambas consomem `buildDocDefinition`
 * (de `./styles`) e `loadPdfmake` (de `./loader`).
 *
 * Esta é a camada mais alta do módulo `pdf/`: orquestra loader + styles,
 * mas não contém lógica de renderização (isso vive em `content-builder`).
 */
import type { Modelo } from "../types";
import type { GerarPDFOptions } from "./types";
import { loadPdfmake } from "./loader";
import { buildDocDefinition } from "./styles";

/**
 * Gera o PDF e dispara o download no browser.
 *
 * Aceita múltiplas formas de chamada (backward-compat com callers antigos):
 *   gerarEBaixarPDF(modelo, respostas)
 *   gerarEBaixarPDF(modelo, respostas, "nome-arquivo")
 *   gerarEBaixarPDF(modelo, respostas, { watermark: true })
 *   gerarEBaixarPDF(modelo, respostas, "nome-arquivo", { watermark: true })
 *
 * @param modelo   modelo do documento
 * @param respostas respostas preenchidas
 * @param nomeArquivoOrOptions  nome do arquivo (string) OU objeto de opções
 * @param legacyOptions opções de watermark (quando o 3º arg é string)
 */
export async function gerarEBaixarPDF(
  modelo: Modelo,
  respostas: Record<string, string>,
  nomeArquivoOrOptions?: string | GerarPDFOptions,
  legacyOptions?: { watermark?: boolean }
): Promise<void> {
  const pdfmake = await loadPdfmake();

  // Normaliza argumentos para um único objeto GerarPDFOptions.
  let options: GerarPDFOptions;
  if (typeof nomeArquivoOrOptions === "string") {
    options = { nomeArquivo: nomeArquivoOrOptions, ...legacyOptions };
  } else {
    options = nomeArquivoOrOptions ?? legacyOptions ?? {};
  }

  const docDefinition = buildDocDefinition(modelo, respostas, options);

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const nome = options.nomeArquivo || `${modelo.slug}-${dataHoje.replace(/\//g, "-")}`;
  pdfmake.createPdf(docDefinition).download(`${nome}.pdf`);
}

/**
 * Gera o PDF e retorna um Buffer (para testes/Node).
 * Não dispara download — útil para testes automatizados.
 */
export async function gerarPDFBuffer(
  modelo: Modelo,
  respostas: Record<string, string>,
  options?: { watermark?: boolean }
): Promise<Buffer> {
  const pdfmake = await loadPdfmake();
  const docDefinition = buildDocDefinition(modelo, respostas, options);
  const pdfDoc = pdfmake.createPdf(docDefinition);
  return new Promise<Buffer>((resolve, reject) => {
    try {
      pdfDoc.getBuffer((buf: any) => {
        resolve(Buffer.from(buf));
      });
    } catch (e) {
      reject(e);
    }
  });
}
