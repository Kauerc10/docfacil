import "server-only";
import { NextResponse } from "next/server";
import { requireAppCheck, resolvePrincipal } from "@/lib/server/security";
import { documentDraftInputSchema } from "@/lib/server/domain/documents";
import { generateDocumentArtifact } from "@/lib/server/domain/orchestrator";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { BackendError } from "@/lib/server/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let requestIdForCleanup: string | undefined;

  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);

    const body = await req.json().catch(() => ({}));
    const parseResult = documentDraftInputSchema.safeParse(body);

    if (!parseResult.success) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "Dados de finalização do documento inválidos.",
        { errors: parseResult.error.flatten() }
      );
    }

    const {
      requestId,
      modeloSlug,
      respostas,
      clausulasSelecionadas,
      guestContact,
      orderId,
    } = parseResult.data;
    requestIdForCleanup = requestId;

    const result = await generateDocumentArtifact({
      requestId,
      principal,
      modeloSlug,
      respostas,
      clausulasSelecionadas,
      guestContact,
      orderId,
    });

    return NextResponse.json(
      {
        document: {
          id: result.documentId,
          version: result.version,
          artifactState: result.artifactState,
          guestAccessToken: result.guestAccessToken,
          guestAccessPath: result.guestAccessPath,
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
    const isGenerationStillRunning =
      err instanceof BackendError && err.code === "GENERATION_IN_PROGRESS";

    if (requestIdForCleanup && !isGenerationStillRunning) {
      try {
        const generationRequests = getRepositories().generationRequests;
        const request = await generationRequests.getRequest(requestIdForCleanup);
        if (request?.status === "processing") {
          const errorCode = err instanceof BackendError ? err.code : "GENERATION_FAILED";
          await generationRequests.markFailed(requestIdForCleanup, errorCode);
        }
      } catch (cleanupErr) {
        logger.warn("DocumentsFinalize", "não foi possível liberar a trava da geração", {
          error: cleanupErr instanceof Error ? cleanupErr.message : "erro desconhecido",
        });
      }
    }

    if (err instanceof BackendError) {
      return err.toResponse();
    }

    logger.error(
      "DocumentsFinalize",
      "falha inesperada ao finalizar documento",
      err
    );
    return BackendError.fromUnknown(err).toResponse();
  }
}
