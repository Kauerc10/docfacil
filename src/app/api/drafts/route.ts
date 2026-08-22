import "server-only";
import { NextResponse } from "next/server";
import { requireAppCheck, resolvePrincipal, requireUser } from "@/lib/server/security";
import { BackendError } from "@/lib/server/errors";
import { accountDraftInputSchema } from "@/lib/server/domain/drafts";
import { getDraftStore } from "@/lib/server/drafts/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAppCheck(req);
    const user = requireUser(await resolvePrincipal(req));
    const drafts = await getDraftStore().list(user.userId);
    return NextResponse.json(
      { drafts },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (error instanceof BackendError) return error.toResponse();
    return BackendError.fromUnknown(error).toResponse();
  }
}

export async function POST(req: Request) {
  try {
    await requireAppCheck(req);
    const user = requireUser(await resolvePrincipal(req));
    const body = await req.json().catch(() => ({}));
    const parsed = accountDraftInputSchema.safeParse(body);
    if (!parsed.success) {
      throw new BackendError("INVALID_REQUEST", 400, "Dados do rascunho inválidos.", {
        errors: parsed.error.flatten(),
      });
    }

    const draft = await getDraftStore().save(user.userId, parsed.data);
    return NextResponse.json(
      { draft },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    if (error instanceof BackendError) return error.toResponse();
    return BackendError.fromUnknown(error).toResponse();
  }
}
