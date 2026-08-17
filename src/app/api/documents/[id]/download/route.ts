import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppCheck, resolvePrincipal, requireUser } from "@/lib/server/security";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { getArtifactStorage } from "@/lib/server/r2/storage";
import { BackendError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const downloadInputSchema = z.object({
  version: z.number().int().positive().optional(),
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
    const parseResult = downloadInputSchema.safeParse(body);
    const requestedVersion = parseResult.success ? parseResult.data.version : undefined;

    const repos = getRepositories();
    const doc = await repos.documents.getDocument(documentId);

    if (!doc) {
      throw new BackendError("DOCUMENT_NOT_FOUND", 404, "Documento não encontrado.");
    }

    if (doc.owner.type !== "user" || doc.owner.userId !== user.userId) {
      throw new BackendError(
        "DOCUMENT_FORBIDDEN",
        403,
        "Você não tem permissão para baixar este documento."
      );
    }

    const version = requestedVersion || doc.currentVersion;
    if (!version) {
      throw new BackendError(
        "ARTIFACT_NOT_FOUND",
        404,
        "Nenhum artefato PDF disponível para download neste documento."
      );
    }

    const artifact = await repos.documents.getArtifact(documentId, version);
    if (!artifact) {
      throw new BackendError(
        "ARTIFACT_NOT_FOUND",
        404,
        `Artefato da versão ${version} não foi encontrado.`
      );
    }

    const storage = getArtifactStorage();
    const downloadUrl = await storage.getDownloadUrl({
      objectKey: artifact.objectKey,
      filename: artifact.filename,
      expiresInSeconds: 300,
    });

    return NextResponse.json(
      {
        downloadUrl,
        filename: artifact.filename,
        version: artifact.version,
        sha256: artifact.sha256,
        expiresIn: 300,
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
