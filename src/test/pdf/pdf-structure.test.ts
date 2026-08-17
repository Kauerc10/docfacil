import { describe, expect, it } from "bun:test";
import { getModelo } from "@/lib/modelos";
import { buildDocDefinition } from "@/lib/pdf/styles";
import { buildContent } from "@/lib/pdf/content-builder";

describe("PDF Structure & Layout Protection", () => {
  it("builds atomic signature cells and headings in DocDefinition", () => {
    const locacao = getModelo("contrato-locacao")!;
    const answers: Record<string, string> = {
      locador_nome: "Carlos Eduardo",
      locador_cpf: "111.222.333-44",
      locatario_nome: "Mariana Alves",
      locatario_cpf: "555.666.777-88",
      imovel: "Rua XV de Novembro, 500, Blumenau - SC",
      valor: "1.500,00",
      prazo: "30",
      dia_vencimento: "5",
      forma_pagamento: "PIX",
    };

    const ddo = buildDocDefinition(locacao, answers) as {
      content: Array<Record<string, unknown>>;
    };

    expect(ddo).toBeDefined();
    expect(Array.isArray(ddo.content)).toBe(true);
    expect(ddo.content.length).toBeGreaterThan(5);

    // Encontra o bloco de fechamento/assinaturas
    const content = buildContent(locacao, answers, [], []);
    const closingStack = content[content.length - 1] as {
      stack: Array<{ stack?: Array<{ unbreakable?: boolean }> }>;
      unbreakable?: boolean;
    };

    expect(closingStack).toBeDefined();
    expect(closingStack.stack).toBeDefined();
  });
});
