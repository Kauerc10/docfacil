import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BackendError } from "@/lib/server/errors";
import { requireAppCheck, resolvePrincipal } from "@/lib/server/security";
import { getBillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { authorizePurchaseRequest } from "@/lib/server/billing/purchase-authorization";
import { deliverPaidPurchase } from "@/lib/server/billing/purchase-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const retrySchema = z.object({ orderId: z.string().min(1).max(160) });

export async function POST(req: Request) {
  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);
    const parsed = retrySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new BackendError("INVALID_REQUEST", 400, "Pedido inválido.");
    const { orderId } = parsed.data;
    const order = await getBillingRepositories().orders.getOrder(orderId);
    if (!order) throw new BackendError("ORDER_NOT_FOUND", 404, "Pedido de compra não encontrado.");
    if (order.provider !== "mercadopago") throw new BackendError("INVALID_REQUEST", 400, "Pedido não pertence ao fluxo Mercado Pago.");

    if (!await authorizePurchaseRequest(req, order, principal)) throw new BackendError("ORDER_FORBIDDEN", 403, "Você não tem permissão para este pedido.");

    const delivery = await deliverPaidPurchase(orderId);
    return NextResponse.json({ orderId, deliveryStatus: delivery?.status ?? "pending", ...(delivery?.result ? { documentId: delivery.result.documentId, purchaseAccessPath: `/purchases/access?orderId=${encodeURIComponent(orderId)}` } : {}) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    if (error instanceof BackendError) return error.toResponse();
    return BackendError.fromUnknown(error).toResponse();
  }
}
