import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { CampoPergunta } from "@/components/docfacil/views/criar/campo-input";
import { CriarLayout } from "@/components/docfacil/views/criar/layout";

const modeloDetalheSource = readFileSync(
  "src/components/docfacil/views/modelo-detalhe-view.tsx",
  "utf8"
);
const sucessoSource = readFileSync(
  "src/components/docfacil/views/sucesso-view.tsx",
  "utf8"
);

describe("layout de criação do MVP", () => {
  it("mantém o chat como único fluxo visível e não renderiza a prévia", () => {
    const html = renderToStaticMarkup(
      <CriarLayout
        step={0}
        total={3}
        progressPct={0}
        onVoltar={() => {}}
      >
        <p>Pergunta do chat</p>
      </CriarLayout>
    );

    expect(html).toContain("Pergunta do chat");
    expect(html).not.toContain("Visualizar");
    expect(html).not.toContain("Prévia do documento");
  });

  it("usa um único indicador de progresso no topo", () => {
    const html = renderToStaticMarkup(
      <CriarLayout
        step={1}
        total={5}
        progressPct={40}
        onVoltar={() => {}}
        onStepClick={() => {}}
      >
        <p>Etapa atual</p>
      </CriarLayout>
    );

    expect((html.match(/role="progressbar"/g) ?? []).length).toBe(1);
    expect(html).not.toContain("Ir para a etapa");
    expect(html).toContain("passo");
    expect(html).toContain("de 5");
  });

  it("omite microcopy óbvia e preserva ajuda que explica comportamento útil", () => {
    const redundante = renderToStaticMarkup(
      <CampoPergunta
        campo={{
          key: "nome",
          pergunta: "Nome completo:",
          microcopy: "Escreva o nome completo, igual aparece no RG.",
        }}
        value=""
        onChange={() => {}}
        onAvancar={() => {}}
      />
    );
    const util = renderToStaticMarkup(
      <CampoPergunta
        campo={{
          key: "cep",
          pergunta: "CEP:",
          microcopy: "Ao digitar o CEP, preenchemos a rua e o bairro automaticamente.",
        }}
        value=""
        onChange={() => {}}
        onAvancar={() => {}}
      />
    );

    expect(redundante).not.toContain("Escreva o nome completo, igual aparece no RG.");
    expect(util).toContain("Ao digitar o CEP, preenchemos a rua e o bairro automaticamente.");
  });

  it("resume a página do modelo por etapas e usa o renderer real na prévia", () => {
    expect(modeloDetalheSource).not.toContain("modelo.campos.map");
    expect(modeloDetalheSource).not.toContain("c.microcopy");
    expect(modeloDetalheSource).toContain("modelo.etapas");
    expect(modeloDetalheSource).toContain("PdfDocumentPreview");
    expect(modeloDetalheSource).not.toContain("renderPlaceholders");
    expect(modeloDetalheSource).not.toContain("Prévia ilustrativa");
  });

  it("usa a mesma prévia PDF real na tela de sucesso", () => {
    expect(sucessoSource).toContain("PdfDocumentPreview");
    expect(sucessoSource).not.toContain("renderFilledLine");
  });
});