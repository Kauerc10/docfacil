import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BackendError } from "@/lib/server/errors";
import { requireAppCheck, resolvePrincipal } from "@/lib/server/security";
import { getBillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { getRefundRequest, requestAvulsoRefund } from "@/lib/server/billing/refunds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ orderId: z.string().min(1), reason: z.string().min(3).max(500) });

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAppCheck(req);
    const orderId = new URL(req.url).searchParams.get("orderId");
    if (!orderId) throw new BackendError("INVALID_REQUEST", 400, "orderId obrigatório.");
    const order = await getBillingRepositories().orders.getOrder(orderId);
    if (!order) throw new BackendError("ORDER_NOT_FOUND", 404, "Pedido não encontrado.");
    const principal = await resolvePrincipal(req);
    const request = await getRefundRequest(orderId);
    if (request && principal.type !== "user") {
      // The request endpoint performs the full purchase-session check. Keep GET
      // neutral for unauthenticated callers to avoid enumerating cases.
      return NextResponse.json({ orderId, status: "unavailable" }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(request ?? { orderId, status: "none" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) { return BackendError.fromUnknown(error).toResponse(); }
}

export async function POST(req: Request): Promise<Response> {
  try {
    await requireAppCheck(req);
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new BackendError("INVALID_REQUEST", 400, "Solicitação de reembolso inválida.");
    const repos = getBillingRepositories();
    const order = await repos.orders.getOrder(parsed.data.orderId);
    if (!order) throw new BackendError("ORDER_NOT_FOUND", 404, "Pedido não encontrado.");
    const request = await requestAvulsoRefund({ req, order, principal: await resolvePrincipal(req), reason: parsed.data.reason });
    return NextResponse.json(request, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) { return BackendError.fromUnknown(error).toResponse(); }
}
