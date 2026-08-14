import { describe, expect, it } from "bun:test";
import { generatePdfServer } from "./generator";
import { MODELOS } from "../../modelos";

describe("generatePdfServer", () => {
  it("generates a valid PDF buffer in Node without window or DOM APIs", async () => {
    // Assert window is undefined in server environment
    expect(typeof window).toBe("undefined");

    const modelo = MODELOS.find((m) => m.slug === "declaracao-residencia") || MODELOS[0];
    const respostas: Record<string, string> = {
      declarante_nome: "Maria da Silva",
      declarante_cpf: "123.456.789-00",
      declarante_nacionalidade: "Brasileira",
      declarante_estado_civil: "Solteira",
      declarante_profissao: "Engenheira",
      declarante_rg: "12.345.678-9",
      endereco_imovel: "Av. Paulista, 1000, Apto 50, Bela Vista, São Paulo/SP, CEP 01310-100",
      cidade_data: "São Paulo, 14 de agosto de 2026",
    };

    const pdfBuffer = await generatePdfServer(modelo, respostas, { watermark: false });

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(500);

    // Validate PDF magic bytes: %PDF-
    const header = pdfBuffer.subarray(0, 5).toString("ascii");
    expect(header).toBe("%PDF-");
  });

  it("generates a watermarked PDF when requested", async () => {
    const modelo = MODELOS.find((m) => m.slug === "declaracao-residencia") || MODELOS[0];
    const respostas: Record<string, string> = {
      declarante_nome: "João dos Santos",
      declarante_cpf: "987.654.321-11",
      declarante_nacionalidade: "Brasileiro",
      declarante_estado_civil: "Casado",
      declarante_profissao: "Advogado",
      endereco_imovel: "Rua das Flores, 45, Centro, Curitiba/PR, CEP 80000-000",
      cidade_data: "Curitiba, 14 de agosto de 2026",
    };

    const pdfBuffer = await generatePdfServer(modelo, respostas, { watermark: true });
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
