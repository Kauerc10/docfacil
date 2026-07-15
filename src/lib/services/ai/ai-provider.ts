/**
 * Interface do provider de IA — camada agnóstica de provedor.
 *
 * O DocFacil pode usar diferentes provedores de LLM (OpenAI, Anthropic,
 * Gemini, z-ai-web-dev-sdk, etc.). Esta interface isola o resto do app
 * dos detalhes de cada provedor.
 *
 * Para adicionar um novo provedor:
 *  1. Crie um arquivo `<nome>-provider.ts` implementando `AIProvider`.
 *  2. Registre-o no factory em `index.ts` (switch por env var).
 *
 * O tipo `GeneratedDocument` descreve a estrutura mínima que a IA deve
 * retornar para o fluxo /criar consumir.
 */

/** Uma seção proposta pela IA (ex.: "Partes envolvidas"). */
export interface AISecao {
  titulo: string;
  desc: string;
}

/** Estrutura de documento gerada pela IA a partir da descrição do usuário. */
export interface GeneratedDocument {
  /** Título amigável (ex.: "Contrato de Aluguel Comercial"). */
  titulo: string;
  /** Descrição curta do documento. */
  descricao: string;
  /** Seções propostas que virarão etapas no fluxo /criar. */
  secoes: AISecao[];
}

/** Opções para a geração. */
export interface GenerateOptions {
  /** Descrição em linguagem natural do que o usuário precisa. */
  prompt: string;
  /** Sinal de cancelamento (opcional — provider pode ignorar). */
  signal?: AbortSignal;
}

/** Callback para streaming de progresso (texto parcial). */
export type OnChunk = (chunk: string) => void;

/**
 * Interface que todo provider de IA deve implementar.
 */
export interface AIProvider {
  /** Nome identificador do provider (ex.: "demo", "openai"). */
  readonly name: string;

  /**
   * Gera a estrutura de um documento a partir da descrição do usuário.
   * @returns Estrutura gerada ou lança erro em caso de falha.
   */
  generateDocument(options: GenerateOptions): Promise<GeneratedDocument>;

  /**
   * Versão com streaming (opcional — providers que não suportam podem
   * delegar para generateDocument chamando onChunk uma vez no fim).
   */
  generateDocumentStream?(
    options: GenerateOptions,
    onChunk: OnChunk
  ): Promise<GeneratedDocument>;
}

/** Erro padronizado para falhas de IA (rede, chave inválida, quota, etc.). */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: "network" | "auth" | "quota" | "invalid" | "unknown" = "unknown",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AIError";
  }
}
