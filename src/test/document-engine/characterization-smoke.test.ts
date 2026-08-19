import { describe, expect, it } from "bun:test";
import { MODELOS, getModelo } from "@/lib/modelos";
import { fillDocument, renderDocument } from "@/lib/document-engine";
import { applyLegalTitleRule } from "@/lib/document-engine/legal-rules";

describe("Fase A: Characterization Smoke Tests (9 Modelos V1)", () => {
  it("renders a valid document for all 9 official platform models", () => {
    expect(MODELOS.length).toBe(9);

    const baseAnswers: Record<string, string> = {
      locador_nome: "Carlos Eduardo Souza",
      locador_nacionalidade: "brasileiro",
      locador_estado_civil: "casado(a)",
      locador_profissao: "Engenheiro",
      locador_cpf: "111.222.333-44",
      locador_rg: "12345678-9",
      locador_rg_emissor: "SSP/SP",

      vendedor_nome: "Carlos Eduardo Souza",
      vendedor_nacionalidade: "brasileiro",
      vendedor_estado_civil: "casado(a)",
      vendedor_profissao: "Engenheiro",
      vendedor_cpf: "111.222.333-44",
      vendedor_rg: "12345678-9",
      vendedor_rg_emissor: "SSP/SP",
      vendedor_endereco: "Rua das Flores, nº 100, Centro, Blumenau - SC, CEP 89000-000",

      comodante_nome: "Carlos Eduardo Souza",
      comodante_nacionalidade: "brasileiro",
      comodante_estado_civil: "casado(a)",
      comodante_profissao: "Engenheiro",
      comodante_cpf: "111.222.333-44",
      comodante_endereco: "Rua das Flores, nº 100, Centro, Blumenau - SC, CEP 89000-000",

      declarante_nome: "Carlos Eduardo Souza",
      declarante_nacionalidade: "brasileiro",
      declarante_estado_civil: "casado(a)",
      declarante_profissao: "Engenheiro",
      declarante_cpf: "111.222.333-44",
      declarante_rg: "12345678-9",
      declarante_rg_emissor: "SSP/SP",
      declarante_endereco: "Rua das Flores, nº 100, Centro, Blumenau - SC, CEP 89000-000",
      declarante_cidade: "Blumenau",
      declarante_uf: "SC",
      finalidade: "Abertura de conta corrente bancária",

      outorgante_nome: "Carlos Eduardo Souza",
      outorgante_nacionalidade: "brasileiro",
      outorgante_estado_civil: "casado(a)",
      outorgante_profissao: "Engenheiro",
      outorgante_cpf: "111.222.333-44",
      outorgante_rg: "12345678-9",
      outorgante_rg_emissor: "SSP/SP",
      outorgado_nome: "Mariana Alves Pereira",
      outorgado_nacionalidade: "brasileira",
      outorgado_estado_civil: "solteira",
      outorgado_profissao: "Advogada",
      outorgado_cpf: "555.666.777-88",
      outorgado_rg: "98765432-1",
      outorgado_rg_emissor: "SSP/SP",
      poderes: "Representar perante órgãos públicos e assinar contratos de locação",

      pessoa1_nome: "Carlos Eduardo Souza",
      pessoa1_nacionalidade: "brasileiro",
      pessoa1_estado_civil: "solteiro",
      pessoa1_profissao: "Engenheiro",
      pessoa1_cpf: "111.222.333-44",
      pessoa2_nome: "Mariana Alves Pereira",
      pessoa2_nacionalidade: "brasileira",
      pessoa2_estado_civil: "solteira",
      pessoa2_profissao: "Advogada",
      pessoa2_cpf: "555.666.777-88",
      inicio: "15 de março de 2021",
      regime: "Comunhão parcial de bens (padrão)",
      endereco: "Rua das Flores, nº 100, Centro, Blumenau - SC, CEP 89000-000",
      endereco_cidade: "Blumenau",
      endereco_uf: "SC",

      locatario_nome: "Mariana Alves Pereira",
      locatario_nacionalidade: "brasileira",
      locatario_estado_civil: "solteiro(a)",
      locatario_profissao: "Advogada",
      locatario_cpf: "555.666.777-88",
      locatario_rg: "98765432-1",
      locatario_rg_emissor: "SSP/SP",

      comprador_nome: "Mariana Alves Pereira",
      comprador_nacionalidade: "brasileira",
      comprador_estado_civil: "solteiro(a)",
      comprador_profissao: "Advogada",
      comprador_cpf: "555.666.777-88",
      comprador_endereco: "Av. Paulista, nº 1500, São Paulo - SP, CEP 01310-200",

      comodatario_nome: "Mariana Alves Pereira",
      comodatario_nacionalidade: "brasileira",
      comodatario_estado_civil: "solteiro(a)",
      comodatario_profissao: "Advogada",
      comodatario_cpf: "555.666.777-88",
      comodatario_endereco: "Av. Paulista, nº 1500, São Paulo - SP, CEP 01310-200",
      comodante_cidade: "Blumenau",
      comodante_uf: "SC",
      bem: "Notebook Dell Precision 5570, série BR123456",

      residente_nome: "Lucas Pereira Souza",
      residente_documento: "RG nº 45.678.910-1 SSP/SC",
      residente_cpf: "999.888.777-66",

      imovel: "Rua XV de Novembro, nº 500, Apto 302, Centro, Blumenau - SC, CEP 89010-000",
      imovel_cidade: "Blumenau",
      imovel_uf: "SC",
      valor: "1.500,00",
      prazo: "30",
      dia_vencimento: "5",
      forma_pagamento: "transferência PIX para chave 11999999999",
      atividade: "Comércio de roupas",
      sinal: "15.000,00",
      saldo_pagamento: "Financiamento bancário junto à Caixa",
      pagamento: "À vista via TED",
    };

    for (const modelo of MODELOS) {
      const linhas = fillDocument({
        titulo: modelo.template.titulo,
        corpo: modelo.template.corpo,
        respostas: baseAnswers,
        modelo,
      });

      expect(linhas.length).toBeGreaterThan(3);
      expect(linhas[0]).toBe(applyLegalTitleRule(modelo.slug, modelo.template.titulo));

      const joined = linhas.join("\n");
      expect(joined).not.toContain("{{locador_nome}}");
      expect(joined).not.toContain("{{declarante_nome}}");

      const paginas = renderDocument({
        titulo: modelo.template.titulo,
        corpo: modelo.template.corpo,
        respostas: baseAnswers,
        modelo,
      });

      expect(paginas.length).toBeGreaterThanOrEqual(1);
    }
  });

  describe("Contrato de Locação — Variações de Garantia", () => {
    const locacaoModelo = getModelo("contrato-locacao")!;
    const answers: Record<string, string> = {
      locador_nome: "Carlos Eduardo Souza",
      locador_nacionalidade: "brasileiro",
      locador_estado_civil: "casado(a)",
      locador_profissao: "Engenheiro",
      locador_cpf: "111.222.333-44",
      locatario_nome: "Mariana Alves Pereira",
      locatario_nacionalidade: "brasileira",
      locatario_estado_civil: "solteira",
      locatario_profissao: "Advogada",
      locatario_cpf: "555.666.777-88",
      imovel: "Rua XV de Novembro, nº 500, Centro, Blumenau - SC",
      imovel_cidade: "Blumenau",
      imovel_uf: "SC",
      valor: "1.500,00",
      prazo: "30",
      dia_vencimento: "5",
      forma_pagamento: "PIX",
    };

    it("renders sem garantia when no clause is selected", () => {
      const linhas = fillDocument({
        titulo: locacaoModelo.template.titulo,
        corpo: locacaoModelo.template.corpo,
        respostas: answers,
        clausulasSelecionadas: [],
        modelo: locacaoModelo,
      });

      const joined = linhas.join("\n");
      expect(joined).toContain("SEM QUALQUER MODALIDADE DE GARANTIA LOCATÍCIA");
      expect(joined).toContain("R$ 1.500,00 (um mil e quinhentos reais)");
    });

    it("renders caução when caucao clause is selected", () => {
      const linhas = fillDocument({
        titulo: locacaoModelo.template.titulo,
        corpo: locacaoModelo.template.corpo,
        respostas: {
          ...answers,
          caucao_valor: "4.500,00",
          caucao_meses: "3",
        },
        clausulasSelecionadas: ["caucao"],
        modelo: locacaoModelo,
      });

      const joined = linhas.join("\n");
      expect(joined).toContain("CAUÇÃO EM DINHEIRO");
      expect(joined).toContain("4.500,00");
      expect(joined).not.toContain("SEM QUALQUER MODALIDADE DE GARANTIA");
    });

    it("renders fiador when fiador clause is selected", () => {
      const linhas = fillDocument({
        titulo: locacaoModelo.template.titulo,
        corpo: locacaoModelo.template.corpo,
        respostas: {
          ...answers,
          fiador_nome: "José Roberto Pereira",
          fiador_cpf: "333.444.555-66",
        },
        clausulasSelecionadas: ["fiador"],
        modelo: locacaoModelo,
      });

      const joined = linhas.join("\n");
      expect(joined).toContain("FIANÇA");
      expect(joined).toContain("José Roberto Pereira");
      expect(joined).not.toContain("SEM QUALQUER MODALIDADE DE GARANTIA");
    });

    it("renders seguro_fianca when seguro_fianca clause is selected", () => {
      const linhas = fillDocument({
        titulo: locacaoModelo.template.titulo,
        corpo: locacaoModelo.template.corpo,
        respostas: {
          ...answers,
          seguro_numero: "AP-998877",
          seguro_seguradora: "Porto Seguro",
        },
        clausulasSelecionadas: ["seguro_fianca"],
        modelo: locacaoModelo,
      });

      const joined = linhas.join("\n");
      expect(joined).toContain("SEGURO-FIANÇA LOCATÍCIA");
      expect(joined).toContain("AP-998877");
      expect(joined).not.toContain("SEM QUALQUER MODALIDADE DE GARANTIA");
    });
  });
});
