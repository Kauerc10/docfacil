import { describe, expect, it } from "bun:test";
import {
  fillTemplate,
  converterValorMoedaParaExtenso,
  formatarNumeroExtenso,
} from "@/lib/document-engine/template";

describe("Template Engine Enhancements (Formatting & Extenso)", () => {
  it("converts currency numbers to written Portuguese words", () => {
    expect(converterValorMoedaParaExtenso("1500,00")).toBe("um mil e quinhentos reais");
    expect(converterValorMoedaParaExtenso("1.500,00")).toBe("um mil e quinhentos reais");
    expect(converterValorMoedaParaExtenso("1000")).toBe("um mil reais");
    expect(converterValorMoedaParaExtenso("2500")).toBe("dois mil e quinhentos reais");
    expect(converterValorMoedaParaExtenso("150,50")).toBe("cento e cinquenta reais e cinquenta centavos");
  });

  it("handles {{valor_extenso}} in template interpolation", () => {
    const template = "Aluguel mensal de R$ {{valor}}{{valor_extenso}}.";
    const result = fillTemplate(template, { valor: "1.450,00" }, {}, []);
    expect(result).toBe("Aluguel mensal de R$ 1.450,00 (um mil quatrocentos e cinquenta reais).");
  });

  it("replaces {{sem_garantia}} when no guarantee clause is selected", () => {
    const template = "Garantia: {{clausula:caucao}}{{sem_garantia}}";
    const resultSemGarantia = fillTemplate(template, {}, { caucao: { id: "caucao", titulo: "Caução", descricao: "", corpo: "Caução de R$ 1000." } }, []);
    expect(resultSemGarantia).toContain("SEM QUALQUER MODALIDADE DE GARANTIA LOCATÍCIA");

    const resultComGarantia = fillTemplate(template, {}, { caucao: { id: "caucao", titulo: "Caução", descricao: "", corpo: "Caução de R$ 1000." } }, ["caucao"]);
    expect(resultComGarantia).toBe("Garantia: Caução de R$ 1000.");
    expect(resultComGarantia).not.toContain("SEM QUALQUER MODALIDADE");
  });

  it("normalizes marital status representations", () => {
    const template = "Estado civil: {{locador_estado_civil}}";
    expect(fillTemplate(template, { locador_estado_civil: "SOLTEIRO" }, {}, [])).toBe("Estado civil: solteiro(a)");
    expect(fillTemplate(template, { locador_estado_civil: "CASADA" }, {}, [])).toBe("Estado civil: casado(a)");
    expect(fillTemplate(template, { locador_estado_civil: "UNIAO ESTAVEL" }, {}, [])).toBe("Estado civil: em união estável");
  });
});
