import "server-only";
import { NextResponse } from "next/server";
import { requireAppCheck, resolvePrincipal, requireUser } from "@/lib/server/security";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { getArtifactStorage } from "@/lib/server/r2/storage";
import { BackendError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(
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
        "Você não tem permissão para visualizar este documento."
      );
    }

    const artifacts = await repos.documents.listArtifacts(documentId);

    return NextResponse.json(
      {
        document: {
          id: doc.id,
          modeloSlug: doc.modeloSlug,
          modeloNome: doc.modeloNome,
          respostas: doc.respostas,
          entitlement: doc.entitlement,
          artifactState: doc.artifactState,
          currentVersion: doc.currentVersion,
          targetVersion: doc.targetVersion,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          artifacts: artifacts.map((art) => ({
            version: art.version,
            filename: art.filename,
            sizeBytes: art.sizeBytes,
            watermarked: art.watermarked,
            sha256: art.sha256,
            generatedAt: art.generatedAt,
          })),
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

export async function DELETE(
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
        "Você não tem permissão para excluir este documento."
      );
    }

    // 1. Revoga todos os links de compartilhamento
    await repos.access.revokeDocumentShareLinks(documentId);

    // 2. Remove artefatos do bucket privado R2
    const storage = getArtifactStorage();
    await storage.deleteDocumentArtifacts(documentId);

    // 3. Remove metadados do documento e subcoleção de artefatos no Firestore
    await repos.documents.deleteDocumentAndArtifacts(documentId);

    return NextResponse.json(
      {
        success: true,
        deletedDocumentId: documentId,
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
