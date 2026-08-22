import "server-only";
import { z } from "zod";
import { MODELOS } from "@/lib/modelos";
import { generatePdfServer } from "@/lib/pdf/server/generator";
import { reconstructAndValidateResponses } from "@/lib/server/domain/documents";
import { resolveDocumentWatermark } from "@/lib/server/domain/preview-render-policy";
import { BackendError } from "@/lib/server/errors";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { requireAppCheck, requireUser, resolvePrincipal } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 8;

const MAX_PAYLOAD_BYTES = 256 * 1024;
const MAX_PDF_BYTES = 3 * 1024 * 1024;

const previewInputSchema = z
  .object({
    modeloSlug: z.string().min(1).max(100),
    respostas: z
      .record(
        z
          .string()
          .min(1)
          .max(100)
          .refine((key) => !key.startsWith("__clausula_") && !key.startsWith("__"), {
            message: "Chaves internas não são permitidas nas respostas.",
          }),
        z.string().max(10000)
      )
      .refine((respostas) => Object.keys(respostas).length <= 200, {
        message: "Limite de 200 campos excedido.",
      }),
    clausulasSelecionadas: z.array(z.string().min(1).max(100)).max(50).default([]),
  })
  .strict();

const privacyHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
};

function withPrivacyHeaders(response: Response): Response {
  for (const [name, value] of Object.entries(privacyHeaders)) {
    response.headers.set(name, value);
  }
  return response;
}

function invalidPreviewRequest(message: string, status = 400): BackendError {
  return new BackendError("INVALID_REQUEST", status, message);
}

async function readPreviewBody(req: Request): Promise<unknown> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    throw invalidPreviewRequest("A prévia excede o limite de dados permitido.", 413);
  }

  if (!req.body) {
    throw invalidPreviewRequest("Dados de prévia inválidos.");
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_PAYLOAD_BYTES) {
        await reader.cancel();
        throw invalidPreviewRequest("A prévia excede o limite de dados permitido.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw invalidPreviewRequest("Dados de prévia inválidos.");
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    await requireAppCheck(req, undefined, true);
    const user = requireUser(await resolvePrincipal(req));

    const input = previewInputSchema.safeParse(await readPreviewBody(req));
    if (!input.success) {
      throw invalidPreviewRequest("Dados de prévia inválidos.");
    }

    const modelo = MODELOS.find((candidate) => candidate.slug === input.data.modeloSlug);
    if (!modelo) {
      throw invalidPreviewRequest("Modelo de documento não encontrado.");
    }

    const respostas = reconstructAndValidateResponses(
      modelo,
      input.data.respostas,
      input.data.clausulasSelecionadas
    );
    const profile = await getRepositories().users.getUserProfile(user.userId);
    const watermark = resolveDocumentWatermark(profile?.plano === "pro" ? "pro" : "free");
    const pdf = await generatePdfServer(modelo, respostas, { watermark });

    if (pdf.byteLength > MAX_PDF_BYTES) {
      throw new BackendError(
        "GENERATION_FAILED",
        413,
        "A prévia excede o limite seguro de tamanho."
      );
    }

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        ...privacyHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${modelo.slug}.pdf"`,
        "Content-Length": String(pdf.byteLength),
      },
    });
  } catch (error: unknown) {
    return withPrivacyHeaders(
      error instanceof BackendError
        ? error.toResponse()
        : new BackendError(
            "GENERATION_FAILED",
            500,
            "Não foi possível gerar a prévia do documento."
          ).toResponse()
    );
  }
}
