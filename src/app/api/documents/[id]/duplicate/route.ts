import "server-only";
import { NextResponse } from "next/server";
import { requireAppCheck, requireUser } from "@/lib/server/security";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { BackendError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAppCheck(req);
    const user = await requireUser(req);
    const { id } = await params;

    const repos = getRepositories();
    const original = await repos.documents.getDocument(id);

    if (!original) {
      throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Documento não encontrado.");
    }

    if (original.owner.type !== "user" || original.owner.userId !== user.userId) {
      throw new BackendError("DOCUMENT_FORBIDDEN", 403, "Você não tem permissão para duplicar este documento.");
    }

    return NextResponse.json(
      {
        duplicateDraft: {
          modeloSlug: original.modeloSlug,
          respostas: { ...original.respostas },
          clausulasSelecionadas: [],
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
