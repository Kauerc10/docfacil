import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppCheck, resolvePrincipal, requireUser } from "@/lib/server/security";
import { generateDocumentArtifact } from "@/lib/server/domain/orchestrator";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { BackendError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const versionInputSchema = z.object({
  requestId: z.string().uuid("O requestId deve ser um UUID válido."),
  respostas: z.record(
    z
      .string()
      .min(1)
      .max(100)
      .refine((k) => !k.startsWith("__clausula_") && !k.startsWith("__"), {
        message: "Chaves internas não são permitidas nas respostas.",
      }),
    z.string().max(10000)
  ),
  clausulasSelecionadas: z.array(z.string().min(1).max(100)).max(50).optional().default([]),
});

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);
    const user = requireUser(principal);

    const { id: documentId } = await props.params;

    const body = await req.json().catch(() => ({}));
    const parseResult = versionInputSchema.safeParse(body);

    if (!parseResult.success) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "Dados para nova versão inválidos.",
        { errors: parseResult.error.flatten() }
      );
    }

    const { requestId, respostas, clausulasSelecionadas } = parseResult.data;

    const repos = getRepositories();
    const existingDoc = await repos.documents.getDocument(documentId);

    if (!existingDoc) {
      throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Documento não encontrado.");
    }

    if (
      existingDoc.owner.type !== "user" ||
      existingDoc.owner.userId !== user.userId
    ) {
      throw new BackendError(
        "DOCUMENT_FORBIDDEN",
        403,
        "Sem permissão para criar nova versão deste documento."
      );
    }

    const result = await generateDocumentArtifact({
      requestId,
      principal,
      modeloSlug: existingDoc.modeloSlug,
      respostas,
      clausulasSelecionadas,
      existingDocumentId: documentId,
    });

    return NextResponse.json(
      {
        document: {
          id: result.documentId,
          version: result.version,
          artifactState: result.artifactState,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: unknown) {
    if (err instanceof BackendError) {
      return err.toResponse();
    }
    return BackendError.fromUnknown(err).toResponse();
  }
}
