import { describe, expect, it } from "bun:test";
import {
  fillDocument,
  normalizarRespostasLegadasDeContrato,
} from "@/lib/document-engine";
import { getModelo } from "@/lib/modelos";

function render(
  slug: string,
  respostas: Record<string, string> = {},
  clausulasSelecionadas: string[] = []
) {
  const modelo = getModelo(slug);
  if (!modelo) throw new Error(`Modelo não encontrado: ${slug}`);

  return fillDocument({
    titulo: modelo.template.titulo,
    corpo: modelo.template.corpo,
    respostas,
    clausulasSelecionadas,
    modelo,
  }).join("\n");
}

describe("robustez dos contratos auditados", () => {
  it("declara a ausência de garantia comercial sem manter vigência de garantia inexistente", () => {
    const document = render("contrato-locacao-comercial", {}, []);

    expect(document).toContain("SEM QUALQUER MODALIDADE DE GARANTIA LOCATÍCIA");
    expect(document).not.toContain("A garantia vigorará durante toda a locação");
  });

  it("registra a caução comercial em poupança e reverte seus rendimentos ao locatário", () => {
    const document = render(
      "contrato-locacao-comercial",
      { caucao_valor: "10.500,00", caucao_meses: "3" },
      ["caucao"]
    );

    expect(document).toContain("caderneta de poupança");
    expect(document).toContain("rendimentos reverterão ao LOCATÁRIO");
  });

  it("só materializa arras imobiliárias quando há sinal", () => {
    const withoutDeposit = render("contrato-compra-venda-imovel", {
      possui_sinal: "Não",
    });
    const withDeposit = render("contrato-compra-venda-imovel", {
      possui_sinal: "Sim",
      sinal: "35.000,00",
      forma_pagamento_sinal: "PIX",
    });

    expect(withoutDeposit).not.toContain("arras confirmatórias");
    expect(withDeposit).toContain("arras confirmatórias");
    expect(withDeposit).toContain("35.000,00");
    expect(withDeposit).toContain("PIX");
  });

  it("menciona a vistoria comercial somente como documento apartado informado pelas partes", () => {
    const withoutInspection = render("contrato-locacao-comercial", {
      vistoria_anexa: "Não",
    });
    const withInspection = render("contrato-locacao-comercial", {
      vistoria_anexa: "Sim",
    });

    expect(withoutInspection).not.toContain("Termo de Vistoria");
    expect(withInspection).toContain("documentos apartados, assinados e juntados pelas PARTES");
  });

  it("não promete continuidade automática da locação comercial perante adquirente", () => {
    const document = render("contrato-locacao-comercial");

    expect(document).toContain("depende dos requisitos legais aplicáveis");
    expect(document).toContain("cláusula de vigência em caso de alienação");
    expect(document).not.toContain("não se extinguindo com a eventual alienação do imóvel");
  });

  it("preserva o desgaste natural no comodato e não trata o comodatário como segurador", () => {
    const document = render(
      "comodato",
      { periodo_emprestimo: "seis meses" },
      ["responsabilidade"]
    );

    expect(document).toContain("seis meses");
    expect(document).toContain("ressalvado o desgaste natural decorrente do uso regular");
    expect(document).not.toContain("incluindo furto ou roubo");
  });

  it("fecha a compra e venda de bem móvel na cidade e UF do vendedor", () => {
    const document = render("compra-venda", {
      vendedor_cidade: "Blumenau",
      vendedor_uf: "SC",
    });

    expect(document).toContain("Blumenau/SC, ");
    expect(document).toContain("foro da Comarca de Blumenau/SC");
  });

  it("preserva a redação segura do bem móvel legado sem cidade e UF inventadas", () => {
    const document = render("compra-venda");

    expect(document).toContain("foro do domicílio do VENDEDOR");
    expect(document).not.toContain("______________________/______________________");
  });

  it("renderiza respostas legadas sem inventar a matrícula imobiliária", () => {
    const modeloImovel = getModelo("contrato-compra-venda-imovel")!;
    const respostasLegadas = {
      sinal: "35.000,00",
      forma_pagamento_sinal: "PIX",
    };
    const comodatoLegado = render("comodato", { prazo: "seis meses" });
    const imovelLegado = render("contrato-compra-venda-imovel", respostasLegadas);
    const normalizadas = normalizarRespostasLegadasDeContrato(modeloImovel, respostasLegadas);

    expect(normalizadas.possui_sinal).toBe("Sim");
    expect(normalizadas).not.toHaveProperty("matricula_imovel");
    expect(normalizadas).not.toHaveProperty("registro_imoveis");
    expect(comodatoLegado).toContain("seis meses");
    expect(imovelLegado).toContain("arras confirmatórias");
    expect(imovelLegado).toContain("pago mediante PIX");
    expect(imovelLegado).toMatch(/matriculado sob o nº _+/);
    expect(imovelLegado).not.toContain("matriculado sob o nº 0");
  });
});
