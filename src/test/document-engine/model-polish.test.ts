import { describe, expect, it } from "bun:test";
import { fillDocument } from "@/lib/document-engine";
import { getModelo } from "@/lib/modelos";

function render(slug: string, respostas: Record<string, string> = {}) {
  const modelo = getModelo(slug);
  if (!modelo) throw new Error(`Modelo não encontrado: ${slug}`);

  return fillDocument({
    titulo: modelo.template.titulo,
    corpo: modelo.template.corpo,
    respostas,
    clausulasSelecionadas: [],
    modelo,
  }).join("\n");
}

describe("lapidação editorial e jurídica dos modelos V1", () => {
  it("fundamenta a autodeclaração de residência na Lei 7.115/1983 sem criar exigência de reconhecimento de firma", () => {
    const text = render("declaracao-residencia");

    expect(text).toContain("Lei nº 7.115/1983");
    expect(text).toContain("responsabilidade");
    expect(text).not.toContain("recomenda-se o reconhecimento de firma");
  });

  it("usa linguagem neutra na declaração de residência por terceiro", () => {
    const text = render("declaracao-residencia-terceiro");

    expect(text).not.toContain("portadora da cédula");
    expect(text).not.toContain("inscrita no CPF");
    expect(text).not.toContain("e inscrito no CPF");
    expect(text).toContain("sob sua responsabilidade");
  });

  it("posiciona a compra de imóvel como compromisso e elimina alternativa ambígua com barra", () => {
    const text = render("contrato-compra-venda-imovel");

    expect(text).toContain("COMPROMISSO DE COMPRA E VENDA DE IMÓVEL");
    expect(text).not.toContain("quitação integral do preço / assinatura da escritura pública");
    expect(text).toContain("art. 1.245");
  });

  it("limita o recibo da compra e venda de bem móvel ao que o pagamento efetivamente declara", () => {
    const text = render("compra-venda");

    expect(text).not.toContain("servirá como recibo de quitação das parcelas pagas na data da assinatura");
    expect(text).toContain("quitação somente dos valores expressamente declarados como pagos");
  });

  it("neutraliza linguagem e promessa excessiva na declaração de união estável", () => {
    const text = render("uniao-estavel", { regime: "Comunhão parcial de bens (padrão)" });

    expect(text).not.toContain("as declarantes:");
    expect(text).toContain("as partes declarantes");
    expect(text).not.toContain("produção de todos os efeitos jurídicos legais");
    expect(text).not.toContain("(padrão)");
  });

  it("não concede substabelecimento automaticamente na procuração simples", () => {
    const text = render("procuracao-simples", { poderes: "Representar-me perante o órgão indicado." });

    expect(text).not.toContain("podendo substabelecer");
    expect(text).toContain("limitados aos atos expressamente descritos");
  });
});
