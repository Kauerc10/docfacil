import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retorna o IP do cliente, lendo headers de proxy/CDN.
 * Usado pelo consent service para registrar IP nas concordâncias de termos.
 */
export async function GET() {
  const headersList = (await import("next/headers")).headers;
  const headers = await headersList();
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("true-client-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown";
  return NextResponse.json({ ip }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
