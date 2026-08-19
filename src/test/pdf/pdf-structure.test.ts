import { describe, expect, it } from "bun:test";
import { getModelo } from "@/lib/modelos";
import { buildDocDefinition, getPdfLayoutProfile } from "@/lib/pdf/styles";
import { buildContent } from "@/lib/pdf/content-builder";

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

describe("PDF Structure & Layout Protection", () => {
  it("mantém assinaturas atômicas sem transformar o fechamento inteiro em bloco indivisível", () => {
    const locacao = getModelo("contrato-locacao")!;
    const content = buildContent(locacao, answers, [], []);
    const closingStack = content[content.length - 1] as {
      stack: unknown[];
      unbreakable?: boolean;
    };

    expect(closingStack).toBeDefined();
    expect(closingStack.stack).toBeDefined();
    expect(closingStack.unbreakable).not.toBe(true);
    expect(JSON.stringify(closingStack)).toContain('"unbreakable":true');
  });

  it("não promete validade legal na marca d'água do DocFácil", () => {
    const locacao = getModelo("contrato-locacao")!;
    const ddo = buildDocDefinition(locacao, answers, { watermark: true }) as {
      background?: () => unknown;
    };
    const background = ddo.background?.();
    const serialized = JSON.stringify(background);

    expect(serialized).toContain("DOCFÁCIL");
    expect(serialized).toContain("DOCUMENTO GERADO");
    expect(serialized).not.toContain("VALIDADE LEGAL");
  });

  it("usa perfis editoriais diferentes para declaração, instrumento e contrato", () => {
    const locacao = getModelo("contrato-locacao")!;
    const declaracao = getModelo("declaracao-residencia")!;
    const uniao = getModelo("uniao-estavel")!;

    expect(getPdfLayoutProfile(locacao)).toBe("contract");
    expect(getPdfLayoutProfile(declaracao)).toBe("declaration");
    expect(getPdfLayoutProfile(uniao)).toBe("instrument");

    const contratoDdo = buildDocDefinition(locacao, answers) as {
      styles: { body: { lineHeight: number }; signature: { lineHeight: number } };
    };
    const declaracaoDdo = buildDocDefinition(declaracao, {}) as {
      styles: { body: { lineHeight: number }; signature: { lineHeight: number } };
    };
    const instrumentoDdo = buildDocDefinition(uniao, {}) as {
      styles: { body: { lineHeight: number } };
    };

    expect(declaracaoDdo.styles.body.lineHeight).toBeGreaterThan(
      contratoDdo.styles.body.lineHeight
    );
    expect(instrumentoDdo.styles.body.lineHeight).toBeGreaterThan(
      contratoDdo.styles.body.lineHeight
    );
    expect(declaracaoDdo.styles.signature.lineHeight).toBeGreaterThanOrEqual(
      contratoDdo.styles.signature.lineHeight
    );
  });

  it("expõe proteção semântica contra heading órfão na paginação real", () => {
    const locacao = getModelo("contrato-locacao")!;
    const ddo = buildDocDefinition(locacao, answers) as {
      pageBreakBefore?: (...args: unknown[]) => boolean;
      content: unknown[];
    };

    expect(typeof ddo.pageBreakBefore).toBe("function");
    expect(JSON.stringify(ddo.content)).toContain('"headlineLevel"');
  });
});
