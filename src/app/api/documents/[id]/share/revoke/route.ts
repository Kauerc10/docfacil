import "server-only";
import { NextResponse } from "next/server";
import { requireAppCheck, resolvePrincipal, requireUser } from "@/lib/server/security";
import { getRepositories } from "@/lib/server/firestore/repositories";
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
        "Você não tem permissão para revogar o compartilhamento deste documento."
      );
    }

    await repos.access.revokeDocumentShareLinks(documentId);

    return NextResponse.json(
      {
        success: true,
        revokedAt: Date.now(),
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
