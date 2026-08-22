import "server-only";
import { NextResponse } from "next/server";
import { requireAppCheck, resolvePrincipal, requireUser } from "@/lib/server/security";
import { BackendError } from "@/lib/server/errors";
import { getDraftStore } from "@/lib/server/drafts/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await requireAppCheck(req);
    const user = requireUser(await resolvePrincipal(req));
    const { id } = await props.params;
    const draft = await getDraftStore().get(user.userId, id);
    if (!draft) {
      throw new BackendError("DRAFT_NOT_FOUND", 404, "Rascunho não encontrado.");
    }
    return NextResponse.json(
      { draft },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (error instanceof BackendError) return error.toResponse();
    return BackendError.fromUnknown(error).toResponse();
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    await requireAppCheck(req);
    const user = requireUser(await resolvePrincipal(req));
    const { id } = await props.params;
    await getDraftStore().delete(user.userId, id);
    return NextResponse.json(
      { success: true, draftId: id },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (error instanceof BackendError) return error.toResponse();
    return BackendError.fromUnknown(error).toResponse();
  }
}
