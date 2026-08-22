import { describe, expect, it } from "bun:test";
import type { Modelo } from "@/lib/types";
import { reconstructAndValidateResponses } from "@/lib/server/domain/documents";

const validationModel: Modelo = {
  slug: "modelo-validacao-formatos",
  nome: "Modelo de validação",
  desc: "Fixture de validação server-side",
  quandoUsar: "teste",
  categoria: "Pessoal",
  minutos: 1,
  icone: "seal",
  campos: [
    { key: "pessoa_cpf", pergunta: "CPF:", tipo: "text" },
    { key: "pessoa_cep", pergunta: "CEP:", tipo: "text" },
    { key: "data_nascimento", pergunta: "Data de nascimento:", tipo: "date" },
    {
      key: "contato_telefone",
      pergunta: "Telefone:",
      tipo: "text",
      obrigatorio: false,
    },
  ],
  etapas: [],
  template: {
    titulo: "DOCUMENTO",
    corpo: [
      "{{pessoa_cpf}}",
      "{{pessoa_cep}}",
      "{{data_nascimento}}",
      "{{contato_telefone}}",
    ],
  },
};

const validAnswers = {
  pessoa_cpf: "529.982.247-25",
  pessoa_cep: "01310-100",
  data_nascimento: "21/08/2000",
  contato_telefone: "(47) 99999-0000",
};

describe("validação autoritativa de formatos no servidor", () => {
  it("rejeita CPF com dígito verificador inválido", () => {
    expect(() =>
      reconstructAndValidateResponses(
        validationModel,
        { ...validAnswers, pessoa_cpf: "123.456.789-00" },
        []
      )
    ).toThrow(/CPF inválido/i);
  });

  it("rejeita CEP incompleto", () => {
    expect(() =>
      reconstructAndValidateResponses(
        validationModel,
        { ...validAnswers, pessoa_cep: "8901" },
        []
      )
    ).toThrow(/CEP/i);
  });

  it("rejeita data impossível mesmo quando o formato parece válido", () => {
    expect(() =>
      reconstructAndValidateResponses(
        validationModel,
        { ...validAnswers, data_nascimento: "31/02/2000" },
        []
      )
    ).toThrow(/data|dia/i);
  });

  it("mantém campo opcional vazio fora da validação de formato", () => {
    expect(
      reconstructAndValidateResponses(
        validationModel,
        { ...validAnswers, contato_telefone: "" },
        []
      )
    ).toMatchObject({ contato_telefone: "" });
  });

  it("não trata um campo RG como CPF apenas porque o label menciona CPF", () => {
    const modelWithAmbiguousLabel: Modelo = {
      ...validationModel,
      campos: [
        {
          key: "rg",
          pergunta: "RG e CPF apresentados:",
          tipo: "text",
        },
      ],
      template: { titulo: "DOCUMENTO", corpo: ["{{rg}}"] },
    };

    expect(
      reconstructAndValidateResponses(
        modelWithAmbiguousLabel,
        { rg: "12.345.678-9" },
        []
      ).rg
    ).toBe("12.345.678-9");
  });
});
