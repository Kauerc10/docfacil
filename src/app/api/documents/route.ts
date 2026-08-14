import "server-only";
import { NextResponse } from "next/server";
import { requireAppCheck, requireUser } from "@/lib/server/security";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { BackendError } from "@/lib/server/errors";
import type { DocumentSummaryDto } from "@/lib/documents/dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAppCheck(req);
    const user = await requireUser(req);

    const repos = getRepositories();
    const records = await repos.documents.listUserDocuments(user.userId);

    const documents: DocumentSummaryDto[] = records.map((doc) => ({
      id: doc.id!,
      modeloSlug: doc.modeloSlug,
      modeloNome: doc.modeloNome,
      status: doc.artifactState === "ready" ? "concluido" : "rascunho",
      artifactState: doc.artifactState,
      currentVersion: doc.currentVersion,
      watermarked: doc.entitlement.watermarked,
      criadoEm: doc.createdAt,
      atualizadoEm: doc.updatedAt,
    }));

    return NextResponse.json(
      { documents },
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
