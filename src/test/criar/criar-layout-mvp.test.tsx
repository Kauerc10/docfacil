import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CriarLayout } from "@/components/docfacil/views/criar/layout";

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
});
