import { describe, expect, it } from "bun:test";
import {
  documentDetailDtoToUi,
  documentSummaryDtoToUi,
  type DocumentDetailDto,
  type DocumentSummaryDto,
} from "@/lib/documents/dto";

describe("Document DTO to UI Adapters", () => {
  it("converts ready artifactState to status concluido", () => {
    const summary: DocumentSummaryDto = {
      id: "doc_1",
      modeloSlug: "contrato-locacao",
      modeloNome: "Contrato de Locação",
      status: "concluido",
      artifactState: "ready",
      currentVersion: 1,
      watermarked: false,
      criadoEm: 1000,
      atualizadoEm: 2000,
    };

    const uiDoc = documentSummaryDtoToUi(summary);
    expect(uiDoc.id).toBe("doc_1");
    expect(uiDoc.status).toBe("concluido");
    expect(uiDoc.criadoEm).toBe(1000);
    expect(uiDoc.atualizadoEm).toBe(2000);
  });

  it("converts generating/failed artifactState to status rascunho", () => {
    const summary: DocumentSummaryDto = {
      id: "doc_2",
      modeloSlug: "procuracao-simples",
      modeloNome: "Procuração Simples",
      status: "rascunho",
      artifactState: "generating",
      currentVersion: null,
      watermarked: true,
      criadoEm: 1000,
      atualizadoEm: 1000,
    };

    const uiDoc = documentSummaryDtoToUi(summary);
    expect(uiDoc.status).toBe("rascunho");
  });

  it("converts detail DTO preserving respostas", () => {
    const detail: DocumentDetailDto = {
      id: "doc_3",
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      status: "concluido",
      artifactState: "ready",
      currentVersion: 1,
      watermarked: false,
      criadoEm: 1000,
      atualizadoEm: 2000,
      respostas: { nome: "Maria Silva", cidade: "Curitiba" },
    };

    const uiDoc = documentDetailDtoToUi(detail);
    expect(uiDoc.respostas.nome).toBe("Maria Silva");
    expect(uiDoc.respostas.cidade).toBe("Curitiba");
    expect(uiDoc.status).toBe("concluido");
  });
});
