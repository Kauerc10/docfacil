import { describe, expect, it } from "bun:test";
import { getModelo } from "@/lib/modelos";
import { buildDocDefinition } from "@/lib/pdf/styles";
import { buildContent, cm } from "@/lib/pdf/content-builder";
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
  it("mantém o footer nativo fora da caixa lateral do corpo e perto da borda física", () => {
    const modelo = getModelo("declaracao-residencia")!;
    const ddo = buildDocDefinition(modelo, answers) as {
      pageMargins: number[];
      footer?: (page: number, count: number) => { margin?: number[] };
    };

    expect(typeof ddo.footer).toBe("function");
    const footer = ddo.footer!(1, 1);

    expect(footer.margin?.[0] ?? Infinity).toBeLessThan(ddo.pageMargins[0]);
    expect(footer.margin?.[2] ?? Infinity).toBeLessThan(ddo.pageMargins[2]);
    expect(ddo.pageMargins[3]).toBeLessThan(cm(2.5));
  });

  it("sobe o título da declaração sem apertar o corpo", () => {
    const modelo = getModelo("declaracao-residencia")!;
    const ddo = buildDocDefinition(modelo, answers) as { pageMargins: number[] };

    expect(ddo.pageMargins[1]).toBeLessThan(cm(3.5));
  });

  it("sobe a data e aumenta o vão até a assinatura", () => {
    const modelo = getModelo("declaracao-residencia")!;
    const recipe = getPdfVisualRecipe(modelo);

    expect(recipe.dateTopMargin).toBeLessThan(22);
    expect(recipe.dateBottomMargin).toBeGreaterThanOrEqual(26);
  });

  it("reserva uma assinatura larga e uma área branca generosa abaixo do declarante", () => {
    const modelo = getModelo("declaracao-residencia")!;
    const recipe = getPdfVisualRecipe(modelo) as ReturnType<typeof getPdfVisualRecipe> & {
      signatureLineWidthCm?: number;
      closingBottomMargin?: number;
    };
    const content = buildContent(modelo, answers, [], []) as Node[];
    const closing = content[content.length - 1];

    expect(recipe.signatureLineWidthCm ?? 0).toBeGreaterThanOrEqual(8.5);
    expect(recipe.closingBottomMargin ?? 0).toBeGreaterThanOrEqual(34);
    expect(closing.margin?.[3] ?? 0).toBeGreaterThanOrEqual(34);
  });
});
