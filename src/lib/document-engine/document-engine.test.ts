import { describe, expect, test } from "bun:test";

import type { ClausulaDinamica, EnderecoConfig } from "../types";
import {
  composeEndereco,
  encodeClausulasSelecionadas,
  extractClausulasSelecionadas,
  fillDocument,
  fillTemplate,
  renderDocument,
} from ".";

const clausulaFiador: ClausulaDinamica = {
  id: "fiador",
  titulo: "Fiador",
  descricao: "Inclui um fiador no documento.",
  corpo: "Fiador: {{nome_fiador}}.",
};

const enderecoConfig: EnderecoConfig = {
  cepKey: "cep",
  logradouroKey: "logradouro",
  numeroKey: "numero",
  complementoKey: "complemento",
  bairroKey: "bairro",
  cidadeKey: "cidade",
  ufKey: "uf",
  saidaKey: "endereco",
};

describe("document engine", () => {
  test("resolve placeholders inseridos por cláusulas selecionadas", () => {
    const result = fillTemplate(
      "Declarante: {{nome}}. {{clausula:fiador}}",
      { nome: "Ana", nome_fiador: "Bruno" },
      { fiador: clausulaFiador },
      ["fiador"]
    );

    expect(result).toBe("Declarante: Ana. Fiador: Bruno.");
  });

  test("distingue campos opcionais de campos obrigatórios ausentes", () => {
    expect(fillTemplate("Contato {{email}}", { email: "" }, {}, [], ["email"])).toBe("Contato");
    expect(fillTemplate("Contato {{email}}", { email: "" }, {}, [])).toBe(
      "Contato ______________________"
    );
  });

  test("persiste e recupera cláusulas selecionadas sem alterar outras respostas", () => {
    const encoded = encodeClausulasSelecionadas(["fiador", "prazo"]);

    expect(encoded).toEqual({
      __clausula_fiador: "true",
      __clausula_prazo: "true",
    });
    expect(extractClausulasSelecionadas({ ...encoded, nome: "Ana", __clausula_ignorar: "false" })).toEqual([
      "fiador",
      "prazo",
    ]);
  });

  test("compõe endereço com normalização de UF e sem partes vazias", () => {
    expect(
      composeEndereco(
        {
          logradouro: "Rua das Flores",
          numero: "123",
          complemento: "Apto 4",
          bairro: "Centro",
          cidade: "Blumenau",
          uf: "Santa Catarina",
          cep: "89000-000",
        },
        enderecoConfig
      )
    ).toBe("Rua das Flores, 123, Apto 4 - Centro - Blumenau/SC - CEP 89000-000");
  });

  test("remove linhas vazias de cláusulas não selecionadas no documento preenchido", () => {
    expect(
      fillDocument({
        titulo: "Declaração de {{nome}}",
        corpo: ["{{clausula:fiador}}", "Texto principal."],
        respostas: { nome: "Ana" },
        clausulasSelecionadas: [],
        modelo: {
          slug: "declaracao",
          nome: "Declaração",
          desc: "Modelo de teste",
          quandoUsar: "Em testes do motor de documentos.",
          categoria: "Pessoal",
          minutos: 1,
          icone: "seal",
          campos: [],
          etapas: [{ tipo: "clausulas", clausulas: [clausulaFiador] }],
          template: { titulo: "Declaração de {{nome}}", corpo: [] },
        },
      })
    ).toEqual(["Declaração de Ana", "Texto principal."]);
  });

  test("pagina linhas classificadas mantendo a contagem total consistente", () => {
    const pages = renderDocument(
      {
        titulo: "Declaração",
        corpo: ["# Identificação", "Texto principal.", "[ASSINATURA] Ana"],
        respostas: {},
      },
      { linhasPorPagina: 2, charsPorLinha: 80 }
    );

    expect(pages).toHaveLength(2);
    expect(pages.map((page) => page.total)).toEqual([2, 2]);
    expect(pages[0].linhas.map((line) => line.tipo)).toEqual(["heading1", "heading1"]);
    expect(pages[1].linhas.map((line) => line.tipo)).toEqual(["paragraph", "signature"]);
  });
});
