/**
 * PDF generation with pdfmake.
 *
 * Produces a properly formatted A4 PDF for a filled document, with:
 * - Title block (centered, bold)
 * - Body paragraphs (justified)
 * - Signature lines (two columns)
 * - Footer with DocFacil branding + date
 * - Subtle stamp watermark on first page
 *
 * Works fully client-side (no server needed). The download is triggered
 * by pdfmake's built-in download helper.
 */
import type { Modelo } from "../types";

type PdfMake = typeof import("pdfmake/build/pdfmake");
type DocDefinition = Parameters<PdfMake["createPdf"]>[0];

let pdfmakePromise: Promise<PdfMake> | null = null;

async function loadPdfmake(): Promise<PdfMake> {
  if (!pdfmakePromise) {
    pdfmakePromise = (async () => {
      // pdfmake needs the vfs fonts loaded. We import dynamically to keep
      // the initial bundle small and avoid SSR issues.
      const pdfmake = (await import("pdfmake/build/pdfmake")) as unknown as PdfMake;
      const vfs = (await import("pdfmake/build/vfs_fonts")).default as unknown as {
        pdfMake: { vfs: Record<string, string> };
      };
      // pdfmake 0.2+ uses vfs.pdfMake.vfs
      const vfsData = (vfs as unknown as { pdfMake?: { vfs?: Record<string, string> } }).pdfMake?.vfs;
      if (vfsData) {
        (pdfmake as unknown as { vfs: Record<string, string> }).vfs = vfsData;
      }
      return pdfmake;
    })();
  }
  return pdfmakePromise;
}

/** Substitui {{key}} no template pelos valores das respostas. */
function fillTemplate(template: string, respostas: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = respostas[key];
    return v && v.trim() ? v : "______________________";
  });
}

/**
 * Gera e baixa o PDF do documento.
 * @param modelo O modelo (template) usado
 * @param respostas As respostas preenchidas pelo usuário
 * @param nomeArquivo Nome do arquivo (sem extensão)
 */
export async function gerarEBaixarPDF(
  modelo: Modelo,
  respostas: Record<string, string>,
  nomeArquivo?: string
): Promise<void> {
  const pdfmake = await loadPdfmake();

  const corpoPreenchido = modelo.template.corpo.map((linha) =>
    fillTemplate(linha, respostas)
  );

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const docDefinition: DocDefinition = {
    pageSize: "A4",
    pageMargins: [72, 72, 72, 90],
    defaultStyle: {
      font: "Roboto",
      fontSize: 12,
      lineHeight: 1.5,
      alignment: "justify",
      color: "#0E2340",
    },
    header: (currentPage) => {
      if (currentPage > 1) return null;
      return {
        margin: [72, 36, 72, 0],
        stack: [
          {
            text: modelo.template.titulo,
            style: "docTitle",
            alignment: "center",
          },
          {
            canvas: [
              {
                type: "line",
                x1: 0,
                y1: 8,
                x2: 451,
                y2: 8,
                lineWidth: 1,
                lineColor: "#14315C",
              },
            ],
            margin: [0, 6, 0, 0],
          },
        ],
      };
    },
    content: [
      { text: "", margin: [0, 8] },
      ...corpoPreenchido.map((paragrafo) => ({
        text: paragrafo,
        margin: [0, 0, 0, 12],
      })),
      // Cláusula de assinaturas
      {
        text: "E, por estarem de acordo, assinam o presente instrumento em 2 (duas) vias de igual teor.",
        margin: [0, 24, 0, 36],
        alignment: "center",
      },
      {
        columns: [
          {
            stack: [
              {
                canvas: [
                  {
                    type: "line",
                    x1: 0,
                    y1: 0,
                    x2: 200,
                    y2: 0,
                    lineWidth: 0.75,
                    lineColor: "#0E2340",
                  },
                ],
              },
              {
                text: "Parte 1",
                alignment: "center",
                style: "signatureLabel",
                margin: [0, 4, 0, 0],
              },
            ],
          },
          {
            stack: [
              {
                canvas: [
                  {
                    type: "line",
                    x1: 0,
                    y1: 0,
                    x2: 200,
                    y2: 0,
                    lineWidth: 0.75,
                    lineColor: "#0E2340",
                  },
                ],
              },
              {
                text: "Parte 2",
                alignment: "center",
                style: "signatureLabel",
                margin: [0, 4, 0, 0],
              },
            ],
          },
        ],
      },
    ],
    footer: (currentPage, pageCount) => ({
      margin: [72, 0, 72, 36],
      stack: [
        {
          canvas: [
            {
              type: "line",
              x1: 0,
              y1: 0,
              x2: 451,
              y2: 0,
              lineWidth: 0.5,
              lineColor: "#E6DCCB",
            },
          ],
        },
        {
          columns: [
            {
              text: `Gerado por DocFacil · ${COMPANY_LINE}`,
              style: "footerText",
            },
            {
              text: `${dataHoje} — pág. ${currentPage}/${pageCount}`,
              style: "footerText",
              alignment: "right",
            },
          ],
          margin: [0, 6, 0, 0],
        },
      ],
    }),
    styles: {
      docTitle: {
        font: "Roboto",
        fontSize: 16,
        bold: true,
        color: "#0E2340",
        margin: [0, 0, 0, 4],
      },
      signatureLabel: {
        font: "Roboto",
        fontSize: 10,
        color: "#5A6B82",
      },
      footerText: {
        font: "Roboto",
        fontSize: 9,
        color: "#8A8A8A",
      },
    },
    // Watermark — subtle stamp on every page
    background: () => ({
      stack: [
        {
          text: "DOCFACIL",
          fontSize: 80,
          font: "Roboto",
          bold: true,
          color: "#F1ECE3",
          opacity: 0.4,
          alignment: "center",
          margin: [0, 280, 0, 0],
          rotation: -25,
        },
      ],
      alignment: "center",
    }),
  };

  const nome = nomeArquivo || `${modelo.slug}-${dataHoje.replace(/\//g, "-")}`;
  pdfmake.createPdf(docDefinition).download(`${nome}.pdf`);
}

const COMPANY_LINE = "K-HUB Soluções Digitais";

/**
 * Verifica se pdfmake carregou (útil para mostrar loading state).
 */
export async function preloadPdfmake(): Promise<void> {
  await loadPdfmake();
}
