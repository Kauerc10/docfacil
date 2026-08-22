import { describe, expect, it } from "bun:test";
import { buildFinalizationAnswers } from "@/lib/documents/finalization-answers";

describe("respostas enviadas para finalizar", () => {
  it("preserva os moradores como dados estruturados para a validação do servidor", () => {
    const moradores = JSON.stringify([{ nome: "Maicon da Silva", cpf: "113.554.569-32" }]);

    const respostas = buildFinalizationAnswers(
      { moradores_autorizados: moradores, locador_nome: "Kevin Costa" },
      { animais_estimacao: { animais_estimacao_detalhes: "1 cachorro" } }
    );

    expect(respostas.moradores_autorizados).toBe(moradores);
    expect(respostas.animais_estimacao_detalhes).toBe("1 cachorro");
  });
});
