/** Caminho legado fechado; a criação usa sessões autenticadas. */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ error: "Use /api/ai/sessions." }, { status: 410, headers: { "Cache-Control": "no-store" } });
}

/** GET — healthcheck simples. */
export async function GET() {
  return NextResponse.json({ ok: false }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
