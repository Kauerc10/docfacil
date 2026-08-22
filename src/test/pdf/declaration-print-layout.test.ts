import { describe, expect, it } from "bun:test";
import { getModelo } from "@/lib/modelos";
import { buildDocDefinition } from "@/lib/pdf/styles";
import { cm } from "@/lib/pdf/content-builder";
import { getPdfVisualRecipe } from "@/lib/pdf/visual-recipes";

const answers: Record<string, string> = {
  declarante_nome: "Carlos Eduardo Souza",
  declarante_nacionalidade: "brasileiro",
  declarante_estado_civil: "casado(a)",
  declarante_profissao: "Engenheiro",
  declarante_cpf: "111.222.333-44",
  declarante_rg: "12345678-9",
  declarante_rg_emissor: "SSP/SC",
  declarante_endereco: "Rua das Flores, nº 100, Centro, Blumenau - SC, CEP 89000-000",
  declarante_cidade: "Blumenau",
  declarante_uf: "SC",
  finalidade: "Abertura de conta corrente bancária",
};

type Node = {
  margin?: number[];
  [key: string]: unknown;
};

describe("Declaration print layout", () => {
  it("usa a mesma geometria lateral de folha e footer da shell formal", () => {
    const modelo = getModelo("declaracao-residencia")!;
    const ddo = buildDocDefinition(modelo, answers) as {
      pageMargins: number[];
      footer?: (page: number, count: number) => { margin?: number[] };
    };

    expect(typeof ddo.footer).toBe("function");
    const footer = ddo.footer!(1, 1);

    expect(ddo.pageMargins[0]).toBeCloseTo(cm(2), 2);
    expect(ddo.pageMargins[2]).toBeCloseTo(cm(2), 2);
    expect(footer.margin?.[0]).toBeCloseTo(cm(2), 2);
    expect(footer.margin?.[2]).toBeCloseTo(cm(2), 2);
    expect(ddo.pageMargins[3]).toBeCloseTo(cm(2), 2);
  });

  it("desce levemente o título sem deslocar a moldura lateral", () => {
    const modelo = getModelo("declaracao-residencia")!;
    const ddo = buildDocDefinition(modelo, answers) as { pageMargins: number[] };

    expect(ddo.pageMargins[1]).toBeGreaterThanOrEqual(cm(2.5));
    expect(ddo.pageMargins[1]).toBeLessThanOrEqual(cm(2.7));
    expect(ddo.pageMargins[0]).toBeCloseTo(cm(2), 2);
    expect(ddo.pageMargins[2]).toBeCloseTo(cm(2), 2);
  });

  it("mantém a data centralizada e usa o fechamento para distribuir melhor a página", () => {
    const modelo = getModelo("declaracao-residencia")!;
    const recipe = getPdfVisualRecipe(modelo);

    expect(recipe.dateAlignment).toBe("center");
    expect(recipe.dateTopMargin).toBeGreaterThanOrEqual(20);
    expect(recipe.dateTopMargin).toBeLessThanOrEqual(26);
    expect(recipe.dateBottomMargin).toBeGreaterThanOrEqual(28);
    expect(recipe.dateBottomMargin).toBeLessThanOrEqual(36);
  });

  it("preserva espaço de assinatura sem forçar whitespace excessivo", () => {
    const modelo = getModelo("declaracao-residencia")!;
    const recipe = getPdfVisualRecipe(modelo);
    const ddo = buildDocDefinition(modelo, answers) as {
      content: Node[];
      styles: { signature: { characterSpacing?: number } };
    };
    const closing = ddo.content[ddo.content.length - 1];

    expect(recipe.signatureCharacterSpacing).toBeLessThanOrEqual(0.4);
    expect(ddo.styles.signature.characterSpacing ?? Infinity).toBeLessThanOrEqual(0.4);
    expect(recipe.closingBottomMargin).toBeGreaterThanOrEqual(18);
    expect(recipe.closingBottomMargin).toBeLessThanOrEqual(28);
    expect(closing.margin?.[3] ?? 0).toBeGreaterThanOrEqual(18);
    expect(closing.margin?.[3] ?? Infinity).toBeLessThanOrEqual(28);
  });
});