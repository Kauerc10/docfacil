import { describe, expect, it } from "bun:test";
import { buildContractContent } from "@/lib/pdf/contract-composer";
import { getModelo } from "@/lib/modelos";
import { buildDocDefinition } from "@/lib/pdf/styles";
import { generatePdfServer } from "@/lib/pdf/server/generator";
import { getPdfLayoutGeometry } from "@/lib/pdf/layout-geometry";
import { getPdfVisualRecipe } from "@/lib/pdf/visual-recipes";

const formalRecipe = getPdfVisualRecipe({ slug: "contrato-locacao" });
const denseRecipe = getPdfVisualRecipe({ slug: "contrato-locacao-comercial" });

const contractLines = [
  "(Instrumento particular firmado nos termos da Lei nº 8.245/1991)",
  "Pelo presente instrumento particular, de um lado:",
  "LOCADOR(A): Carlos da Silva, brasileiro, inscrito no CPF sob o nº 111.222.333-44.",
  "## CLÁUSULA PRIMEIRA - DO OBJETO",
  "O LOCADOR dá em locação ao LOCATÁRIO o imóvel residencial descrito neste instrumento.",
  "E, por estarem assim justos e contratados, as PARTES assinam o presente instrumento na presença das testemunhas abaixo.",
  "Blumenau/SC, 20 de agosto de 2026.",
  "",
  "[ASSINATURA] _______________________________________________",
  "LOCADOR(A) - Carlos da Silva",
  "CPF nº 111.222.333-44",
  "",
  "[ASSINATURA] _______________________________________________",
  "LOCATÁRIO(A) - Marina Souza",
  "CPF nº 555.666.777-88",
  "",
  "TESTEMUNHAS:",
  "1) _________________________________________________ Nome: _________________________ CPF: _______________",
  "2) _________________________________________________ Nome: _________________________ CPF: _______________",
];

describe("contract composer", () => {
  it("mantém campos de sinal obrigatórios no PDF quando a resposta muda de Não para Sim", () => {
    const modelo = getModelo("contrato-compra-venda-imovel")!;
    const ddo = buildDocDefinition(modelo, { possui_sinal: "Sim" });

    expect(JSON.stringify(ddo)).toMatch(/pago mediante _+\./);
  });

  it("mantém o fechamento comum como unidade editorial com grade de assinaturas", () => {
    const content = buildContractContent(contractLines, formalRecipe) as Array<Record<string, unknown>>;
    const closing = content.find((node) => node.id === "contract-closing");

    expect(closing).not.toMatchObject({ unbreakable: true });
    expect(JSON.stringify(closing)).toContain('"dontBreakRows":true');
    expect(JSON.stringify(closing)).toContain("LOCADOR(A) - Carlos da Silva");
    expect(JSON.stringify(closing)).toContain("TESTEMUNHAS:");
  });

  it("permite que a introdução de fechamento longa quebre sem desproteger as grades", () => {
    const longClosingLines = [
      "E, por estarem assim justos e contratados, as PARTES assinam o presente instrumento na presença das testemunhas abaixo, depois de lerem integralmente todas as condições, confirmarem que compreenderam o conteúdo e declararem que celebram este ajuste de livre e espontânea vontade.",
      "Blumenau/SC, 20 de agosto de 2026.",
      "",
      "[ASSINATURA] _______________________________________________",
      "LOCADOR(A) - Carlos da Silva",
      "CPF nº 111.222.333-44",
      "",
      "[ASSINATURA] _______________________________________________",
      "LOCATÁRIO(A) - Marina Souza",
      "CPF nº 555.666.777-88",
      "",
      "TESTEMUNHAS:",
      "1) _________________________________________________ Nome: _________________________ CPF: _______________",
      "2) _________________________________________________ Nome: _________________________ CPF: _______________",
    ];
    const closing = buildContractContent(longClosingLines, denseRecipe).at(-1);

    expect(closing).not.toMatchObject({ unbreakable: true });
    expect(JSON.stringify(closing)).not.toContain('"widths":[16,"*",36,112,26,84]');
    expect(JSON.stringify(closing)).toContain('"dontBreakRows":true');
  });

  it("calcula as grades de fechamento pela largura útil da receita", () => {
    const closing = buildContractContent(contractLines, denseRecipe).at(-1) as {
      stack: Array<{
        table?: { widths?: number[]; body?: unknown[] };
        stack?: Array<{ table?: { widths?: number[]; body?: unknown[] } }>;
      }>;
    };
    const geometry = getPdfLayoutGeometry(denseRecipe);
    const tables = closing.stack.filter((node) => node.table);
    const witnessGrid = closing.stack.find((node) => node.stack);
    const witnessTable = witnessGrid?.stack?.find((node) => node.table)?.table;

    expect(tables[0]?.table?.widths).toEqual([geometry.contentWidth / 2, geometry.contentWidth / 2]);
    expect(witnessTable?.widths?.reduce((sum, width) => sum + width, 0)).toBeCloseTo(
      geometry.contentWidth,
      4
    );
    expect(witnessTable?.widths?.[2]).toBeGreaterThanOrEqual(43);
    expect(witnessTable?.widths?.[4]).toBeGreaterThanOrEqual(32);
  });

  it("centraliza a data de bem móvel mesmo sem vírgula antes do dia", () => {
    const closing = buildContractContent(
      [
        "E, por estarem assim justos e acordados, as partes assinam o presente instrumento.",
        "Blumenau/SC 20 de agosto de 2026.",
      ],
      formalRecipe
    ).at(-1) as { stack: Array<{ alignment?: string; text?: unknown }> };
    const date = closing.stack.find((node) => JSON.stringify(node.text).includes("20 de agosto de 2026"));

    expect(date).toMatchObject({ alignment: "center" });
  });

  it("marca cláusulas para a proteção nativa contra heading órfão", () => {
    const content = buildContractContent(contractLines, formalRecipe) as Array<Record<string, unknown>>;
    const clause = content.find((node) => node.style === "clauseHeading");

    expect(clause).toMatchObject({ headlineLevel: 2 });
    expect(clause).not.toHaveProperty("keepWithNext");
  });

  it("conecta o contrato real ao compositor semântico", () => {
    const modelo = getModelo("contrato-locacao")!;
    const ddo = buildDocDefinition(modelo, {
      locador_nome: "Carlos da Silva",
      locador_cpf: "111.222.333-44",
      locatario_nome: "Marina Souza",
      locatario_cpf: "555.666.777-88",
      imovel_cidade: "Blumenau",
      imovel_uf: "SC",
      prazo: "12",
      valor: "1.500,00",
      dia_vencimento: "5",
      forma_pagamento: "PIX",
    }) as { content: Array<Record<string, unknown>> };

    expect(ddo.content.some((node) => node.id === "contract-closing")).toBe(true);
  });

  it("compõe sem condicionais por slug todos os modelos da família contract", () => {
    for (const slug of [
      "contrato-locacao",
      "contrato-locacao-comercial",
      "contrato-compra-venda-imovel",
      "comodato",
      "compra-venda",
    ]) {
      const ddo = buildDocDefinition(getModelo(slug)!, {}) as {
        content: Array<Record<string, unknown>>;
      };

      expect(ddo.content.some((node) => node.id === "contract-closing")).toBe(true);
      expect(JSON.stringify(ddo.content)).not.toContain('"keepWithNext"');
    }
  });

  it("gera PDF válido para cada contrato oficial", async () => {
    for (const slug of [
      "contrato-locacao",
      "contrato-locacao-comercial",
      "contrato-compra-venda-imovel",
      "comodato",
      "compra-venda",
    ]) {
      const pdf = await generatePdfServer(getModelo(slug)!, {
        imovel_cidade: "Blumenau",
        imovel_uf: "SC",
        locador_nome: "Carlos da Silva",
        locatario_nome: "Marina Souza",
      });

      expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    }
  });
});
