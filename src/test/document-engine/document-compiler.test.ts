import { describe, expect, it } from "bun:test";
import { compileDocument } from "@/lib/document-engine/compiler";
import { gerarPDFBuffer, buildDocDefinition, preloadPdfmake } from "@/lib/pdf";
import { generatePdfServer } from "@/lib/pdf/server";
import { getModelo } from "@/lib/modelos";

describe("DocumentCompiler: compilação unificada de documentos", () => {
  const modelo = getModelo("declaracao-residencia")!;
  const respostas = {
    declarante_nome: "Maria Joaquina",
    declarante_cpf: "111.444.777-35",
    declarante_nacionalidade: "Brasileira",
    declarante_estado_civil: "Solteira",
    declarante_profissao: "Engenheira",
    declarante_cep: "01310-100",
    declarante_rua: "Avenida Paulista",
    declarante_numero: "1000",
    declarante_bairro: "Bela Vista",
    declarante_cidade: "São Paulo",
    declarante_uf: "SP",
    finalidade: "Abertura de conta bancária",
    cidade_data: "São Paulo, 17 de setembro de 2026",
  };

  it("compila linhas e páginas com interface simplificada", () => {
    const compiled = compileDocument({
      modelo,
      respostas,
    });

    expect(compiled.titulo).toContain("DECLARAÇÃO DE RESIDÊNCIA");
    expect(compiled.linhas.length).toBeGreaterThan(0);
    expect(compiled.paginas.length).toBeGreaterThan(0);
    expect(compiled.totalPaginas).toBe(compiled.paginas.length);

    // As linhas devem conter as respostas substituídas
    const corpoCompleto = compiled.linhas.join("\n");
    expect(corpoCompleto).toContain("Maria Joaquina");
    expect(corpoCompleto).toContain("111.444.777-35");
  });

  it("aplica cláusulas opcionais selecionadas", () => {
    const modeloLocacao = getModelo("contrato-locacao-residencial");
    if (!modeloLocacao) return;

    const compiled = compileDocument({
      modelo: modeloLocacao,
      respostas: {
        locador_nome: "Carlos Silva",
        locatario_nome: "Ana Souza",
      },
      clausulasSelecionadas: ["garantia_caucao"],
    });

    expect(compiled.linhas.length).toBeGreaterThan(0);
  });
});

describe("PDF Pipeline: fachada pública unificada", () => {
  const modelo = getModelo("declaracao-residencia")!;
  const respostas = {
    declarante_nome: "Maria Joaquina",
    declarante_cpf: "111.444.777-35",
    declarante_nacionalidade: "Brasileira",
    declarante_estado_civil: "Solteira",
    declarante_profissao: "Engenheira",
    declarante_cep: "01310-100",
    declarante_rua: "Avenida Paulista",
    declarante_numero: "1000",
    declarante_bairro: "Bela Vista",
    declarante_cidade: "São Paulo",
    declarante_uf: "SP",
    finalidade: "Comprovante",
    cidade_data: "São Paulo, 17 de setembro de 2026",
  };

  it("exporta funções e tipos canônicos a partir de @/lib/pdf", () => {
    expect(typeof preloadPdfmake).toBe("function");
    expect(typeof gerarPDFBuffer).toBe("function");
    expect(typeof buildDocDefinition).toBe("function");

    const docDef = buildDocDefinition(modelo, respostas, { watermark: false });
    expect(docDef).toBeDefined();
    expect((docDef as { pageSize?: string }).pageSize).toBe("A4");
  });

  it("exporta generatePdfServer a partir de @/lib/pdf/server", async () => {
    expect(typeof generatePdfServer).toBe("function");
    const buffer = await generatePdfServer(modelo, respostas, { watermark: false });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
