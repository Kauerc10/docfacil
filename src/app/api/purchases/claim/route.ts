import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { claimVerifiedPurchases } from "@/lib/server/billing/claim-purchases";
import { BackendError } from "@/lib/server/errors";
import { requireAppCheck, resolvePrincipal } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ cursor: z.string().min(1).max(200).optional() });

export async function POST(req: Request) {
  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);
    if (principal.type !== "user") throw new BackendError("INVALID_AUTH_TOKEN", 401, "Entre na sua conta para associar compras.");
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new BackendError("INVALID_REQUEST", 400, "Cursor inválido.");
    const result = await claimVerifiedPurchases({ userId: principal.userId, email: principal.email, emailVerified: principal.emailVerified }, { cursor: parsed.data.cursor });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    if (error instanceof BackendError) return error.toResponse();
    return BackendError.fromUnknown(error).toResponse();
  }
}
