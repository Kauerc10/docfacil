import { describe, expect, it } from "bun:test";
import { aplicarComposicaoModelo } from "@/lib/document-engine";
import { getModelo } from "@/lib/modelos";

describe("moradores autorizados na locação residencial", () => {
  const modelo = getModelo("contrato-locacao")!;

  it("inclui os moradores informados sem transformá-los em partes do contrato", () => {
    const respostas = aplicarComposicaoModelo(
      {
        moradores_autorizados: JSON.stringify([
          { nome: "Ana Paula Costa", cpf: "123.456.789-00" },
          { nome: "João Pedro Costa" },
        ]),
      },
      modelo
    );

    expect(respostas.moradores_autorizados).toBe(
      "Além do LOCATÁRIO, ficam autorizados a residir no IMÓVEL: Ana Paula Costa, CPF nº 123.456.789-00; João Pedro Costa. Essas pessoas são identificadas exclusivamente como ocupantes autorizados e não assumem, por essa indicação, a condição de LOCATÁRIOS, FIADORES ou responsáveis pelas obrigações deste contrato."
    );
  });

  it("não insere uma cláusula vazia quando ninguém mais vai morar no imóvel", () => {
    const respostas = aplicarComposicaoModelo(
      { moradores_autorizados: "[]" },
      modelo
    );

    expect(respostas.moradores_autorizados).toBe("");
  });
});
