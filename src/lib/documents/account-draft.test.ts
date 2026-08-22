import { describe, expect, it } from "bun:test";
import { buildAccountDraftFinalizationAnswers } from "./account-draft";
import type { AccountDraftData } from "./client";

const draft: AccountDraftData = {
  id: "draft_1",
  ownerUserId: "usr_1",
  modeloSlug: "contrato-locacao-comercial",
  respostas: { locador_nome: "Maria", aluguel: "2500" },
  stepIndex: 4,
  clausulasSelecionadas: ["caucao"],
  extrasPorClausula: {
    caucao: {
      caucao_meses: "2",
      caucao_valor: "5000",
    },
  },
  createdAt: 1,
  updatedAt: 2,
};

describe("buildAccountDraftFinalizationAnswers", () => {
  it("mescla respostas e extras das clausulas para finalizar depois do checkout", () => {
    expect(buildAccountDraftFinalizationAnswers(draft)).toEqual({
      locador_nome: "Maria",
      aluguel: "2500",
      caucao_meses: "2",
      caucao_valor: "5000",
    });
  });

  it("nao muta o rascunho original", () => {
    const before = JSON.stringify(draft);
    buildAccountDraftFinalizationAnswers(draft);
    expect(JSON.stringify(draft)).toBe(before);
  });
});
