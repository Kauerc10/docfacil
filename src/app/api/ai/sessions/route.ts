import "server-only";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BackendError } from "@/lib/server/errors";
import { requireAIPilot } from "@/lib/server/ai/route-auth";
import { createSession, getSession, listSessions } from "@/lib/server/ai/session-store";
import { runInitial } from "@/lib/server/ai/controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const inputSchema = z.object({ request: z.string().trim().min(15).max(2000), operationId: z.string().uuid() }).strict();

export async function GET(req: Request) {
  try {
    const userId = await requireAIPilot(req);
    return NextResponse.json({ sessions: await listSessions(userId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return BackendError.fromUnknown(error).toResponse(); }
}

export async function POST(req: Request) {
  try {
    const userId = await requireAIPilot(req);
    const parsed = inputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new BackendError("INVALID_REQUEST", 400, "Descreva o documento em até 2.000 caracteres.");
    const session = await createSession(userId, parsed.data.operationId, parsed.data.request);
    let ready = session;
    if (session.version === 1) {
      try { ready = await runInitial(session, randomUUID()); }
      catch (error) {
        if (!(error instanceof BackendError && error.code === "CONFLICT")) throw error;
        ready = await getSession(session.id, userId);
      }
    }
    return NextResponse.json({ session: ready }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return BackendError.fromUnknown(error).toResponse(); }
}
