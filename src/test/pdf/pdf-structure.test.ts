import { describe, expect, it } from "bun:test";
import { getModelo } from "@/lib/modelos";
import { buildDocDefinition, getPdfLayoutProfile } from "@/lib/pdf/styles";
import { buildContent, CONTENT_WIDTH } from "@/lib/pdf/content-builder";
import { getPdfVisualRecipe } from "@/lib/pdf/visual-recipes";

const answers: Record<string, string> = {
  locador_nome: "Carlos Eduardo Souza",
  locador_nacionalidade: "brasileiro",
  locador_estado_civil: "casado(a)",
  locador_profissao: "Engenheiro",
  locador_cpf: "111.222.333-44",
  locatario_nome: "Mariana Alves Pereira",
  locatario_nacionalidade: "brasileira",
  locatario_estado_civil: "solteiro(a)",
  locatario_profissao: "Advogada",
  locatario_cpf: "555.666.777-88",
  imovel: "Rua XV de Novembro, 500, Blumenau - SC",
  imovel_cidade: "Blumenau",
  imovel_uf: "SC",
  valor: "1.500,00",
  prazo: "30",
  dia_vencimento: "5",
  forma_pagamento: "PIX",
  atividade: "Comércio de roupas",
};

const declarationAnswers: Record<string, string> = {
  declarante_nome: "Carlos Eduardo Souza",
  declarante_nacionalidade: "brasileiro",
  declarante_estado_civil: "casado(a)",
  declarante_profissao: "Engenheiro",
  declarante_cpf: "111.222.333-44",
  declarante_rg: "12345678-9",
  declarante_rg_emissor: "SSP/SC",
  declarante_endereco: "Rua das Flores, nº 100, Centro, Blumenau - SC, CEP 89000-000",
  declarante_cidade: "Blumenau",
  declarante_uf: "SC",
  finalidade: "Abertura de conta corrente bancária",
};

const thirdPartyDeclarationAnswers: Record<string, string> = {
  ...declarationAnswers,
  residente_nome: "Lucas Pereira Souza",
  residente_documento: "RG nº 45.678.910-1 SSP/SC",
  residente_cpf: "999.888.777-66",
};

type InspectablePdfNode = {
  text?: unknown;
  style?: string;
  alignment?: string;
  margin?: number[];
  [key: string]: unknown;
};

function collectPdfNodes(value: unknown, acc: InspectablePdfNode[] = []): InspectablePdfNode[] {
  if (Array.isArray(value)) {
    for (const item of value) collectPdfNodes(item, acc);
    return acc;
  }

  if (!value || typeof value !== "object") return acc;

  const node = value as InspectablePdfNode;
  acc.push(node);

  for (const child of Object.values(node)) {
    if (child && typeof child === "object") collectPdfNodes(child, acc);
  }

  return acc;
}

function nodeText(node: InspectablePdfNode): string {
  if (typeof node.text === "string") return node.text;
  if (!Array.isArray(node.text)) return "";

  return node.text
    .map((run) => {
      if (typeof run === "string") return run;
      if (run && typeof run === "object" && "text" in run) {
        return String((run as { text?: unknown }).text ?? "");
      }
      return "";
    })
    .join("");
}

function firstBodyParagraph(
  slug: string,
  modelAnswers: Record<string, string>
): InspectablePdfNode {
  const modelo = getModelo(slug)!;
  const nodes = collectPdfNodes(buildContent(modelo, modelAnswers, [], []));
  const paragraph = nodes.find(
    (node) => node.style === "body" && node.alignment === "justify" && Array.isArray(node.margin)
  );

  expect(paragraph).toBeDefined();
  return paragraph!;
}

function firstClauseHeading(slug: string): InspectablePdfNode {
  const modelo = getModelo(slug)!;
  const nodes = collectPdfNodes(buildContent(modelo, answers, [], []));
  const heading = nodes.find(
    (node) => node.style === "clauseHeading" && Array.isArray(node.margin)
  );

  expect(heading).toBeDefined();
  return heading!;
}

describe("PDF Structure & Layout Protection", () => {
  it("alinha as assinaturas das partes em uma mesma linha atômica", () => {
    const locacao = getModelo("contrato-locacao")!;
    const nodes = collectPdfNodes(buildContent(locacao, answers, [], []));
    const signatureRow = nodes.find((node) => {
      const columns = node.columns;
      return (
        Array.isArray(columns) &&
        columns.length === 2 &&
        JSON.stringify(columns).includes("LOCADOR(A)") &&
        JSON.stringify(columns).includes("LOCATÁRIO(A)")
      );
    });

    expect(signatureRow).toBeDefined();
    expect(signatureRow!.unbreakable).toBe(true);
  });

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
    const declaracaoDdo = buildDocDefinition(declaracao, declarationAnswers) as {
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

  it("calibra declarações curtas individualmente em vez de aplicar o mesmo ritmo às duas", () => {
    const propria = getModelo("declaracao-residencia")!;
    const terceiro = getModelo("declaracao-residencia-terceiro")!;

    const propriaDdo = buildDocDefinition(propria, declarationAnswers) as {
      styles: { body: { lineHeight: number } };
    };
    const terceiroDdo = buildDocDefinition(terceiro, thirdPartyDeclarationAnswers) as {
      styles: { body: { lineHeight: number } };
    };

    expect(propriaDdo.styles.body.lineHeight).toBeGreaterThan(
      terceiroDdo.styles.body.lineHeight
    );
  });

  it("usa composição mais densa na locação comercial do que na residencial", () => {
    const residencial = getModelo("contrato-locacao")!;
    const comercial = getModelo("contrato-locacao-comercial")!;

    const residencialDdo = buildDocDefinition(residencial, answers) as {
      styles: { body: { lineHeight: number } };
    };
    const comercialDdo = buildDocDefinition(comercial, answers) as {
      styles: { body: { lineHeight: number } };
    };

    expect(residencialDdo.styles.body.lineHeight).toBeGreaterThan(
      comercialDdo.styles.body.lineHeight
    );
  });

  it("dá mais solenidade editorial à união estável do que à procuração simples", () => {
    const uniao = getModelo("uniao-estavel")!;
    const procuracao = getModelo("procuracao-simples")!;

    const uniaoDdo = buildDocDefinition(uniao, {}) as {
      styles: { body: { lineHeight: number } };
    };
    const procuracaoDdo = buildDocDefinition(procuracao, {}) as {
      styles: { body: { lineHeight: number } };
    };

    expect(uniaoDdo.styles.body.lineHeight).toBeGreaterThan(
      procuracaoDdo.styles.body.lineHeight
    );
  });

  it("usa filete curto e centralizado no título das declarações em vez de uma linha de página inteira", () => {
    const declaracao = getModelo("declaracao-residencia")!;
    const ddo = buildDocDefinition(declaracao, declarationAnswers) as {
      content: Array<{
        canvas?: Array<{ x1: number; x2: number }>;
      }>;
    };

    const divider = ddo.content[1]?.canvas?.[0];

    expect(divider).toBeDefined();
    expect(divider!.x1).toBeGreaterThan(0);
    expect(divider!.x2).toBeLessThan(CONTENT_WIDTH);
    expect(divider!.x2 - divider!.x1).toBeLessThan(CONTENT_WIDTH / 2);
  });

  it("centraliza a data das declarações com respiro próprio antes da assinatura", () => {
    const declaracao = getModelo("declaracao-residencia")!;
    const nodes = collectPdfNodes(buildContent(declaracao, declarationAnswers, [], []));
    const dateNode = nodes.find(
      (node) => node.style === "body" && /,\s*\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}/i.test(nodeText(node))
    );

    expect(dateNode).toBeDefined();
    expect(dateNode!.alignment).toBe("center");
    expect(dateNode!.margin?.[1] ?? 0).toBeGreaterThan(14);
  });

  it("usa mais espaço entre parágrafos na declaração própria do que na declaração por terceiro", () => {
    const propria = firstBodyParagraph("declaracao-residencia", declarationAnswers);
    const terceiro = firstBodyParagraph(
      "declaracao-residencia-terceiro",
      thirdPartyDeclarationAnswers
    );

    expect(propria.margin![3]).toBeGreaterThan(terceiro.margin![3]);
  });


  it("atribui variantes editoriais reutilizáveis à família de contratos", () => {
    expect(getPdfVisualRecipe(getModelo("contrato-locacao")!).contractVariant).toBe(
      "standard"
    );
    expect(getPdfVisualRecipe(getModelo("contrato-locacao-comercial")!).contractVariant).toBe(
      "dense"
    );
    expect(getPdfVisualRecipe(getModelo("contrato-compra-venda-imovel")!).contractVariant).toBe(
      "property"
    );
    expect(getPdfVisualRecipe(getModelo("compra-venda")!).contractVariant).toBe("formal");
  });

  it("compacta o ritmo de cláusulas da locação comercial sem afetar a residencial", () => {
    const residencial = firstClauseHeading("contrato-locacao");
    const comercial = firstClauseHeading("contrato-locacao-comercial");

    expect(residencial.margin![1]).toBeGreaterThan(comercial.margin![1]);
    expect(residencial.margin![3]).toBeGreaterThan(comercial.margin![3]);
  });
});
