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
