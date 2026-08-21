import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GrupoCampos } from "@/components/docfacil/views/criar/grupo-campos";
import { getModelo } from "@/lib/modelos";

const imovel = getModelo("contrato-compra-venda-imovel")!;
const etapaValores = (() => {
  const etapa = imovel.etapas!.find(
    (item) => item.tipo === "campo_grupo" && item.tituloGrupo === "Valores e pagamento"
  );
  if (!etapa || etapa.tipo !== "campo_grupo") {
    throw new Error("Etapa de valores do imóvel não encontrada.");
  }
  return etapa;
})();

function renderFields(values: Record<string, string>) {
  return renderToStaticMarkup(
    createElement(GrupoCampos, {
      campos: etapaValores.campos,
      values,
      onFieldChange: () => {},
      onAvancar: () => {},
    })
  );
}

describe("campos condicionais de sinal", () => {
  it("oculta valor e forma do sinal quando a resposta é Não", () => {
    const markup = renderFields({ possui_sinal: "Não" });

    expect(markup).not.toContain("Valor do sinal pago nesta data");
    expect(markup).not.toContain("Como o sinal será pago");
  });

  it("revela valor e forma do sinal quando a resposta é Sim", () => {
    const markup = renderFields({ possui_sinal: "Sim" });

    expect(markup).toContain("Valor do sinal pago nesta data");
    expect(markup).toContain("Como o sinal será pago");
  });
});
