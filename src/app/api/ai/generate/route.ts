/**
 * API route: POST /api/ai/generate
 *
 * Gera a estrutura de um documento via IA, mantendo a chave de API secreta
 * no servidor. O cliente nunca vê a chave.
 *
 * Request body: { prompt: string }
 * Response: { document: GeneratedDocument }
 *
 * Em modo demo (NEXT_PUBLIC_AI_PROVIDER não definido ou "demo"), retorna
 * a estrutura fixa sem chamar LLM.
 *
 * TODO: quando um provedor real for escolhido, implementar a chamada ao
 * LLM aqui lendo a chave de `process.env.<PROVIDER>_API_KEY` (server-only).
 */
import { NextRequest, NextResponse } from "next/server";
import { getAIProvider, IS_DEMO_PROVIDER, AIError } from "@/lib/services/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROMPT_LENGTH = 2000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Descreva o documento que você precisa." },
        { status: 400 }
      );
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Descrição muito longa (máximo ${MAX_PROMPT_LENGTH} caracteres).` },
        { status: 400 }
      );
    }

    const provider = getAIProvider();
    const document = await provider.generateDocument({ prompt });

    return NextResponse.json({
      document,
      provider: provider.name,
      demo: IS_DEMO_PROVIDER,
    });
  } catch (e) {
    if (e instanceof AIError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 502 });
    }
    console.error("[/api/ai/generate] erro inesperado:", e);
    return NextResponse.json(
      { error: "Não consegui gerar o documento agora. Tente novamente." },
      { status: 500 }
    );
  }
}

/** GET — healthcheck simples. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: getAIProvider().name,
    demo: IS_DEMO_PROVIDER,
  });
}
