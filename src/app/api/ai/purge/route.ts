import "server-only";
import { NextResponse } from "next/server";
import { purgeExpiredSessions } from "@/lib/server/ai/session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) return new Response(null, { status: 401 });
  const deleted = await purgeExpiredSessions();
  return NextResponse.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
}
