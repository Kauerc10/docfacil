import { describe, expect, it } from "bun:test";
import {
  FREE_MONTHLY_LIMIT,
  MONTHLY_FREE_MODEL_SLUGS,
  isMonthlyFreeModel,
} from "@/lib/document-access-policy";
import { PLAN_PRICES } from "@/lib/pricing";

describe("document access policy", () => {
  it("limita a conta gratis a uma geracao mensal", () => {
    expect(FREE_MONTHLY_LIMIT).toBe(1);
  });

  it("mantem somente os tres modelos selecionados como gratis neste ciclo", () => {
    expect([...MONTHLY_FREE_MODEL_SLUGS]).toEqual([
      "declaracao-residencia",
      "comodato",
      "contrato-locacao-comercial",
    ]);

    expect(isMonthlyFreeModel("declaracao-residencia")).toBe(true);
    expect(isMonthlyFreeModel("comodato")).toBe(true);
    expect(isMonthlyFreeModel("contrato-locacao-comercial")).toBe(true);
    expect(isMonthlyFreeModel("contrato-locacao")).toBe(false);
    expect(isMonthlyFreeModel("procuracao-simples")).toBe(false);
  });

  it("usa os novos precos comerciais em uma unica fonte", () => {
    expect(PLAN_PRICES.avulso).toBe(19.9);
    expect(PLAN_PRICES.pro).toBe(39.9);
  });
});
