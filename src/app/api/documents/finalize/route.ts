import "server-only";
import { NextResponse } from "next/server";
import { requireAppCheck, resolvePrincipal } from "@/lib/server/security";
import { documentDraftInputSchema } from "@/lib/server/domain/documents";
import { generateDocumentArtifact } from "@/lib/server/domain/orchestrator";
import { BackendError } from "@/lib/server/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
