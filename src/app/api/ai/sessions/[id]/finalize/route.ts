import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BackendError } from "@/lib/server/errors";
import { requireAIPilot } from "@/lib/server/ai/route-auth";
import { finalizeAISession } from "@/lib/server/ai/finalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: Context) {
  try {
    const userId = await requireAIPilot(req);
    const parsed = z.object({ requestId: z.string().uuid(), expectedVersion: z.number().int().positive() }).strict().safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new BackendError("INVALID_REQUEST", 400, "Solicitação inválida.");
    const document = await finalizeAISession((await context.params).id, userId, parsed.data.requestId, parsed.data.expectedVersion);
    return NextResponse.json({ document }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return BackendError.fromUnknown(error).toResponse(); }
}
