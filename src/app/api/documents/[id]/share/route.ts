import "server-only";
import { NextResponse } from "next/server";
import { requireAppCheck, resolvePrincipal, requireUser } from "@/lib/server/security";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { generateAccessToken } from "@/lib/server/domain/documents";
import { BackendError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);
    const user = requireUser(principal);

    const { id: documentId } = await props.params;

    const repos = getRepositories();
    const doc = await repos.documents.getDocument(documentId);

    if (!doc) {
      throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Documento não encontrado.");
    }

    if (doc.owner.type !== "user" || doc.owner.userId !== user.userId) {
      throw new BackendError(
        "DOCUMENT_FORBIDDEN",
        403,
        "Você não tem permissão para compartilhar este documento."
      );
    }

    if (!doc.currentVersion) {
      throw new BackendError(
        "ARTIFACT_NOT_FOUND",
        404,
        "Nenhum artefato disponível para compartilhamento."
      );
    }

    // Revoga links de compartilhamento ativos anteriores para manter apenas 1 ativo
    await repos.access.revokeDocumentShareLinks(documentId);

    const { token, tokenHash } = generateAccessToken();
    const now = Date.now();

    await repos.access.createAccessLink({
      tokenHash,
      kind: "share",
      documentId,
      version: doc.currentVersion,
      active: true,
      createdByUserId: user.userId,
      createdAt: now,
    });

    return NextResponse.json(
      {
        shareUrl: `/d/${token}`,
        token,
        version: doc.currentVersion,
        active: true,
        createdAt: now,
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
