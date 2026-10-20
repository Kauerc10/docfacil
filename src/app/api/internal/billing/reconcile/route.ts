import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";
import { getServerEnv } from "@/lib/server/env";
import { BackendError } from "@/lib/server/errors";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import { getBillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { createMercadoPagoBillingProvider } from "@/lib/server/billing/mercadopago/provider";
import { reconcileMercadoPagoPayment } from "@/lib/server/billing/mercadopago/reconcile";
import { fulfillPaidPurchase } from "@/lib/server/billing/fulfill-paid-purchase";
import { processPurchaseMailJobs, decryptPurchaseToken } from "@/lib/server/billing/purchase-mail";
import type { OrderRecord } from "@/lib/server/domain/documents";
import { processDuplicateRefunds } from "@/lib/server/billing/mercadopago/financial-operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  try {
    const env = getServerEnv();
    if (!env.BILLING_RECONCILE_SECRET) throw new BackendError("SERVER_MISCONFIGURED", 503, "Reconciliação indisponível.");
    const expected = Buffer.from(`Bearer ${env.BILLING_RECONCILE_SECRET}`);
    const received = Buffer.from(req.headers.get("authorization") ?? "");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new BackendError("INVALID_AUTH_TOKEN", 401, "Acesso não autorizado.");
    }
    if (env.CHECKOUT_PROVIDER !== "mercadopago") throw new BackendError("BILLING_METHOD_UNAVAILABLE", 409, "Provedor não habilitado.");
    const input = await req.json().catch(() => ({}));
    const cursor = typeof input.after === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(input.after) ? input.after : undefined;
    const db = getAdminFirestore();
    // Paginação por ID mantém a busca previsível sem depender de índices compostos.
    let query = db.collection("orders").orderBy(FieldPath.documentId()).limit(20);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    const provider = createMercadoPagoBillingProvider();
    const repos = getBillingRepositories();
    let processed = 0;
    let failed = 0;
    for (const doc of snapshot.docs) {
      const order = { ...doc.data(), id: doc.id } as OrderRecord;
      if (order.provider !== "mercadopago" || !["pending", "paid", "reserved", "consumed"].includes(order.status)) continue;
      try {
        if (order.status === "pending") {
          const payments = order.providerPaymentId
            ? [await provider.getPayment(order.providerPaymentId)]
            : await provider.findPaymentsForOrder(order.id!);
          for (const payment of payments) {
            await reconcileMercadoPagoPayment(String(payment.id), {
              provider, repos, environment: env.MERCADOPAGO_ENVIRONMENT,
              collectorId: env.MERCADOPAGO_COLLECTOR_ID ?? "", now: Date.now,
              onPaid: fulfillPaidPurchase,
            });
          }
        } else if (order.product === "avulso") {
          await fulfillPaidPurchase(order.id!);
        }
        processed++;
      } catch {
        // Não devolver payload/PII do recurso. A operação persiste estado recuperável.
        failed++;
      }
    }
    const mail = env.PURCHASE_ACCESS_SECRET ? await processPurchaseMailJobs({
      decryptToken: value => decryptPurchaseToken(value, env.PURCHASE_ACCESS_SECRET!), limit: 10,
    }) : { sent: 0, failed: 0, skipped: 0 };
    const refunds = await processDuplicateRefunds({ provider, limit: 10 });
    return NextResponse.json({ processed, failed, mail, refunds, after: snapshot.docs.at(-1)?.id ?? null, hasMore: snapshot.size === 20 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return BackendError.fromUnknown(error).toResponse(); }
}
