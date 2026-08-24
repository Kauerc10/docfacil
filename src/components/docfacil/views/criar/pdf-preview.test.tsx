import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Modelo } from "@/lib/types";
import {
  createPdfPreviewPayload,
  isPdfPreviewReady,
  PdfPreview,
  PdfPreviewFrame,
} from "./pdf-preview";

const modelo = {
  slug: "modelo-teste",
  nome: "Modelo teste",
  campos: [
    { key: "nome", pergunta: "Nome" },
    {
      key: "sinal",
      pergunta: "Valor do sinal",
      visivelQuando: { campo: "possui_sinal", igualA: "Sim" },
    },
  ],
  etapas: [
    {
      tipo: "campo_grupo",
      campos: [
        { key: "nome", pergunta: "Nome" },
        {
          key: "sinal",
          pergunta: "Valor do sinal",
          visivelQuando: { campo: "possui_sinal", igualA: "Sim" },
        },
      ],
    },
    {
      tipo: "clausulas",
      clausulas: [
        {
          id: "garantia",
          titulo: "Garantia",
          descricao: "Garantia adicional",
          corpo: "Garantia {{fiador}}",
          camposExtras: [{ key: "fiador", pergunta: "Fiador" }],
        },
      ],
    },
  ],
} as Modelo;

describe("PdfPreview", () => {
  it("waits for fields that are currently required, including selected clause extras", () => {
    expect(isPdfPreviewReady(modelo, { nome: "Maria", possui_sinal: "Não" }, [])).toBe(true);
    expect(isPdfPreviewReady(modelo, { nome: "Maria", possui_sinal: "Sim" }, [])).toBe(false);
    expect(
      isPdfPreviewReady(modelo, { nome: "Maria", possui_sinal: "Não" }, ["garantia"])
    ).toBe(false);
    expect(
      isPdfPreviewReady(
        modelo,
        { nome: "Maria", possui_sinal: "Não", fiador: "João" },
        ["garantia"]
      )
    ).toBe(true);
  });

  it("does not wait for an optional field before scheduling a preview", () => {
    const modeloComOpcional = {
      ...modelo,
      campos: [
        { key: "nome", pergunta: "Nome" },
        { key: "observacao", pergunta: "Observação", obrigatorio: false },
      ],
    } as Modelo;

    expect(isPdfPreviewReady(modeloComOpcional, { nome: "Maria" }, [])).toBe(true);
  });

  it("merges selected clause extras before preview readiness and excludes deselected extras", () => {
    const extrasPorClausula = {
      garantia: { fiador: "João da Silva" },
      clausula_removida: { testemunha: "Dado que não pode vazar" },
    };
    const props = {
      modelo,
      respostas: { nome: "Maria", possui_sinal: "Não" },
      clausulasSelecionadas: ["garantia"],
      extrasPorClausula,
      authenticated: true,
    };

    const payload = createPdfPreviewPayload(
      props.modelo.slug,
      props.respostas,
      props.clausulasSelecionadas,
      props.extrasPorClausula
    );
    const html = renderToStaticMarkup(<PdfPreview {...props} />);

    expect(payload.respostas).toEqual({
      nome: "Maria",
      possui_sinal: "Não",
      fiador: "João da Silva",
    });
    expect(payload.respostas).not.toHaveProperty("testemunha");
    expect(isPdfPreviewReady(modelo, payload.respostas, payload.clausulasSelecionadas)).toBe(true);
    expect(html).toContain("Preparando a prévia fiel em PDF…");
  });

  it("renders the actual PDF in an accessible iframe", () => {
    const html = renderToStaticMarkup(<PdfPreviewFrame pdfUrl="blob:latest-preview" />);

    expect(html).toContain('<iframe title="Prévia fiel do documento"');
    expect(html).toContain('src="blob:latest-preview"');
  });

  it("shows guests a short unlocked-form state instead of a PDF preview", () => {
    const html = renderToStaticMarkup(
      <PdfPreview
        modelo={modelo}
        respostas={{ nome: "Maria", possui_sinal: "Não" }}
        clausulasSelecionadas={[]}
        extrasPorClausula={{}}
        authenticated={false}
      />
    );

    expect(html).toContain("Entre para ver a prévia fiel em PDF.");
    expect(html).not.toContain("<iframe");
  });
});
