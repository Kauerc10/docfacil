/**
 * Factory do provider de IA — escolhe o provider conforme env var.
 *
 * Env vars:
 *  - NEXT_PUBLIC_AI_PROVIDER: "demo" (default) | "openai" | "anthropic" | ...
 *
 * Providers reais (openai/anthropic/etc.) ainda não estão implementados —
 * o usuário definirá qual provedor usar e adicionaremos o arquivo
 * `<provider>-provider.ts` correspondente. Por enquanto, qualquer valor
 * diferente de "demo" cai no demo com aviso.
 *
 * A chave de API NUNCA deve ser NEXT_PUBLIC_* — chamadas reais vão pela
 * API route /api/ai/generate (server-side), que lê a chave do servidor.
 */
import type { AIProvider } from "./ai-provider";
export type { AIProvider, GenerateOptions, GeneratedDocument, AISecao, OnChunk } from "./ai-provider";
export { AIError } from "./ai-provider";
import { demoProvider } from "./demo-provider";

export type AIProviderName = "demo" | "openai" | "anthropic" | "gemini" | "zai";

const ACTIVE_PROVIDER_NAME = (process.env.NEXT_PUBLIC_AI_PROVIDER as AIProviderName | undefined) ?? "demo";

let cachedProvider: AIProvider | null = null;

/**
 * Retorna o provider de IA ativo (singleton).
 * Client-side e server-side safe.
 */
export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  switch (ACTIVE_PROVIDER_NAME) {
    case "demo":
      cachedProvider = demoProvider;
      break;
    // case "openai":
    //   cachedProvider = openaiProvider; // TODO: implementar quando provedor for escolhido
    //   break;
    // case "anthropic":
    //   cachedProvider = anthropicProvider; // TODO: implementar
    //   break;
    // case "gemini":
    //   cachedProvider = geminiProvider; // TODO: implementar
    //   break;
    // case "zai":
    //   cachedProvider = zaiProvider; // z-ai-web-dev-sdk (já no package.json)
    //   break;
    default:
      // Provider desconhecido — cai no demo com aviso (não quebra o app).
      if (typeof console !== "undefined") {
        console.warn(
          `[AI] Provider "${ACTIVE_PROVIDER_NAME}" não implementado — usando demo.`
        );
      }
      cachedProvider = demoProvider;
  }

  return cachedProvider;
}

/** Verdadeiro se o provider ativo é o demo (sem IA real). */
export const IS_DEMO_PROVIDER = ACTIVE_PROVIDER_NAME === "demo";

/** Nome do provider ativo (para exibição/debug). */
export const ACTIVE_PROVIDER = ACTIVE_PROVIDER_NAME;
