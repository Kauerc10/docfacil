import "server-only";
import { z } from "zod";
import { BackendError } from "@/lib/server/errors";

const MODEL = "openai/gpt-oss-120b";

export async function groqStructured<T extends z.ZodTypeAny>(
  name: string,
  schema: T,
  system: string,
  user: string,
  maxTokens = 1800
): Promise<z.infer<T>> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new BackendError("SERVER_MISCONFIGURED", 503, "IA ainda não está configurada.");
  const started = Date.now();
  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        reasoning_effort: "low",
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name, strict: true, schema: z.toJSONSchema(schema) },
        },
      }),
      signal: AbortSignal.timeout(35000),
    });
  } catch {
    throw new BackendError("GENERATION_FAILED", 503, "Serviço de IA indisponível. Seu progresso foi salvo.");
  }
  if (response.status === 429) {
    throw new BackendError("FREE_LIMIT_REACHED", 429, "Limite gratuito de IA atingido. Retome mais tarde.");
  }
  if (!response.ok) {
    throw new BackendError("GENERATION_FAILED", 503, "Não foi possível consultar a IA agora. Retome mais tarde.");
  }
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { total_tokens?: number } };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new BackendError("GENERATION_FAILED", 502, "A IA não retornou uma resposta utilizável.");
  let parsed: unknown;
  try { parsed = JSON.parse(content); } catch { throw new BackendError("GENERATION_FAILED", 502, "A resposta da IA veio incompleta."); }
  const validated = schema.safeParse(parsed);
  if (!validated.success) throw new BackendError("GENERATION_FAILED", 502, "A resposta da IA não passou na validação.");
  // Somente métricas sem conteúdo do documento.
  console.info("AIDocumentLLM", { name, durationMs: Date.now() - started, tokens: body.usage?.total_tokens ?? null });
  return validated.data;
}
