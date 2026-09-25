import "server-only";
import { NextResponse } from "next/server";
import { BackendError } from "@/lib/server/errors";
import { requireAIPilot } from "@/lib/server/ai/route-auth";
import { deleteSession, getSession } from "@/lib/server/ai/session-store";
import { performAction, sessionActionSchema } from "@/lib/server/ai/controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: Context) {
  try {
    const userId = await requireAIPilot(req);
    return NextResponse.json({ session: await getSession((await context.params).id, userId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return BackendError.fromUnknown(error).toResponse(); }
}

export async function PATCH(req: Request, context: Context) {
  try {
    const userId = await requireAIPilot(req);
    const parsed = sessionActionSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new BackendError("INVALID_REQUEST", 400, "Operação de sessão inválida.");
    const session = await performAction((await context.params).id, userId, parsed.data);
    return NextResponse.json({ session }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return BackendError.fromUnknown(error).toResponse(); }
}

export async function DELETE(req: Request, context: Context) {
  try {
    const userId = await requireAIPilot(req);
    await deleteSession((await context.params).id, userId);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return BackendError.fromUnknown(error).toResponse(); }
}
