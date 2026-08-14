import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppCheck } from "@/lib/server/security";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { getArtifactStorage } from "@/lib/server/r2/storage";
import { hashToken } from "@/lib/server/domain/documents";
import { BackendError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const accessDownloadSchema = z.object({
  token: z.string().min(10, "Token de acesso inválido."),
});

export async function POST(req: Request) {
  try {
    await requireAppCheck(req);

    const body = await req.json().catch(() => ({}));
    const parseResult = accessDownloadSchema.safeParse(body);

    if (!parseResult.success) {
      throw new BackendError(
        "ACCESS_LINK_INVALID",
        404,
        "Token de acesso inválido."
      );
    }

    const { token } = parseResult.data;
    const tokenHash = hashToken(token);

    const repos = getRepositories();
    const link = await repos.access.getAccessLink(tokenHash);

    if (!link || !link.active) {
      throw new BackendError(
        "ACCESS_LINK_INVALID",
        404,
        "Este link de acesso é inválido ou foi revogado pelo proprietário."
      );
    }

    const artifact = await repos.documents.getArtifact(
      link.documentId,
      link.version
    );

    if (!artifact) {
      throw new BackendError(
        "ARTIFACT_NOT_FOUND",
        404,
        "O arquivo PDF associado a este link não foi encontrado."
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
        kind: link.kind,
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
