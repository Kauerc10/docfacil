import "server-only";
import { NextResponse } from "next/server";
import { redeemPurchaseAccess, PURCHASE_ACCESS_COOKIE } from "@/lib/server/billing/purchase-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  try {
    const result = await redeemPurchaseAccess(token);
    const response = NextResponse.json({ ok: true, orderId: result.orderId }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(PURCHASE_ACCESS_COOKIE, result.cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 60 });
    return response;
  } catch {
    return NextResponse.json({ ok: false, message: "Link de acesso inválido ou expirado." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
}
