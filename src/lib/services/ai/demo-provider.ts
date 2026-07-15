/**
 * Demo provider — geração de documento SEM chamada real a LLM.
 *
 * Reproduz o comportamento do ia-view.tsx original (estrutura fixa em 4
 * seções) para que o fluxo seja testável sem custo de API. É o provider
 * padrão quando nenhum provedor real está configurado.
 *
 * Em produção, substitua por um provider real (openai/anthropic/etc.) via
 * env var NEXT_PUBLIC_AI_PROVIDER.
 */
import type { AIProvider, GenerateOptions, GeneratedDocument } from "./ai-provider";

const SECOES_PADRAO: GeneratedDocument["secoes"] = [
  { titulo: "Partes envolvidas", desc: "Nome completo, CPF e qualificação das duas partes." },
  { titulo: "Objeto", desc: "O que está sendo acordado, descrito com clareza." },
  { titulo: "Condições", desc: "Prazos, valores, obrigações e direitos de cada lado." },
  { titulo: "Assinaturas", desc: "Local, data e assinatura das partes para validade." },
];

/**
 * Deriva um título amigável da descrição do usuário (heurística simples).
 * Em provider real, o LLM faria isso.
 */
function derivarTitulo(prompt: string): string {
  const limpo = prompt.trim().replace(/\.$/, "");
  // Heurística: se começa com "contrato de", capitaliza; senão, prefixa.
  if (/^contrato/i.test(limpo)) {
    return limpo.charAt(0).toUpperCase() + limpo.slice(1);
  }
  return `Documento: ${limpo}`;
}

export const demoProvider: AIProvider = {
  name: "demo",

  async generateDocument(options: GenerateOptions): Promise<GeneratedDocument> {
    // Simula latência de rede/LLM (1.2-1.8s) para o UI de typing funcionar.
    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 600));
    return {
      titulo: derivarTitulo(options.prompt),
      descricao: `Estrutura sugerida com base na sua descrição: "${options.prompt.slice(0, 80)}${options.prompt.length > 80 ? "…" : ""}"`,
      secoes: SECOES_PADRAO,
    };
  },

  async generateDocumentStream(options: GenerateOptions, onChunk: (c: string) => void) {
    // Demo não tem streaming real — emite o título como "chunk" de progresso.
    const titulo = derivarTitulo(options.prompt);
    onChunk("Analisando sua descrição…\n");
    await new Promise((resolve) => setTimeout(resolve, 400));
    onChunk("Identificando as partes e o objeto…\n");
    await new Promise((resolve) => setTimeout(resolve, 500));
    onChunk("Montando as condições…\n");
    const doc = await this.generateDocument(options);
    onChunk(titulo);
    return doc;
  },
};
