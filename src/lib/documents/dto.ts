import type { Documento } from "../types";

export interface DocumentSummaryDto {
  id: string;
  modeloSlug: string;
  modeloNome: string;
  status: "rascunho" | "concluido";
  artifactState: "generating" | "ready" | "failed";
  currentVersion: number | null;
  watermarked: boolean;
  criadoEm: number;
  atualizadoEm: number;
}

export interface DocumentDetailDto extends DocumentSummaryDto {
  respostas: Record<string, string>;
  clausulasSelecionadas?: string[];
  extrasPorClausula?: Record<string, Record<string, string>>;
}

export function documentSummaryDtoToUi(dto: DocumentSummaryDto): Documento {
  return {
    id: dto.id,
    modeloSlug: dto.modeloSlug,
    modeloNome: dto.modeloNome,
    respostas: {},
    status: dto.artifactState === "ready" ? "concluido" : "rascunho",
    userId: "",
    criadoEm: dto.criadoEm,
    atualizadoEm: dto.atualizadoEm,
  };
}

export function documentDetailDtoToUi(dto: DocumentDetailDto): Documento {
  return {
    id: dto.id,
    modeloSlug: dto.modeloSlug,
    modeloNome: dto.modeloNome,
    respostas: dto.respostas,
    status: dto.artifactState === "ready" ? "concluido" : "rascunho",
    userId: "",
    criadoEm: dto.criadoEm,
    atualizadoEm: dto.atualizadoEm,
  };
}
