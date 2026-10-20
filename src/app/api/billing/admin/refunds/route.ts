import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BackendError } from "@/lib/server/errors";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import { getBillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { requireBillingAdmin, executeAvulsoRefund } from "@/lib/server/billing/refunds";
import { createMercadoPagoBillingProvider } from "@/lib/server/billing/mercadopago/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const executeSchema = z.object({ action: z.literal("execute"), orderId: z.string().min(1), confirmedAmountCents: z.union([z.literal(1990), z.literal(2990), z.literal(3990)]) });

export async function GET(req: Request): Promise<Response> {
  try {
    await requireBillingAdmin(req);
    const snap = await getAdminFirestore().collection("billing_refund_requests").where("status", "in", ["requested", "failed", "partial", "processing"]).limit(100).get();
    return NextResponse.json({ requests: snap.docs.map((doc) => doc.data()) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) { return BackendError.fromUnknown(error).toResponse(); }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const admin = await requireBillingAdmin(req);
    const parsed = executeSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new BackendError("INVALID_REQUEST", 400, "Operação de reembolso inválida.");
    const repos = getBillingRepositories();
    const order = await repos.orders.getOrder(parsed.data.orderId);
    if (!order) throw new BackendError("ORDER_NOT_FOUND", 404, "Pedido não encontrado.");
    const db = getAdminFirestore();
    const requestSnap = await db.collection("billing_refund_requests").doc(`manual:${order.id}`).get();
    if (!requestSnap.exists) throw new BackendError("ORDER_NOT_FOUND", 404, "Solicitação de reembolso não encontrada.");
    const result = await executeAvulsoRefund({ order, request: requestSnap.data() as never, reviewerId: admin.uid, confirmedAmountCents: parsed.data.confirmedAmountCents, provider: createMercadoPagoBillingProvider(), db });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) { return BackendError.fromUnknown(error).toResponse(); }
}
