import { describe, expect, it } from "bun:test";
import { buildGuestFinalizationAnswers } from "@/lib/documents/guest-draft";
import type { GuestDraftData } from "@/lib/documents/client";

function makeDraft(): GuestDraftData {
  return {
    requestId: crypto.randomUUID(),
    modeloSlug: "contrato-locacao",
    answers: {
      locador_nome: "Maria",
      locatario_nome: "João",
    },
    stepIndex: 4,
    clausulasSelecionadas: ["fiador"],
    extrasPorClausula: {
      fiador: {
        fiador_nome: "Carlos",
        fiador_cpf: "123.456.789-00",
      },
      animais: {
        animal_descricao: "Gato",
      },
    },
    updatedAt: Date.now(),
  };
}

describe("buildGuestFinalizationAnswers", () => {
  it("flattens extras from selected clauses into the final payload", () => {
    const result = buildGuestFinalizationAnswers(makeDraft());

    expect(result.fiador_nome).toBe("Carlos");
    expect(result.fiador_cpf).toBe("123.456.789-00");
  });

  it("does not include stale extras from unselected clauses", () => {
    const result = buildGuestFinalizationAnswers(makeDraft());

    expect(result.animal_descricao).toBeUndefined();
  });

  it("never injects internal clause markers from the client", () => {
    const draft = makeDraft();
    draft.answers.__clausula_fiador = "true";

    const result = buildGuestFinalizationAnswers(draft);

    expect(result.__clausula_fiador).toBeUndefined();
  });
});
