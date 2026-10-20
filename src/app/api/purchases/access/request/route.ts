import "server-only";
import { NextResponse } from "next/server";
import { getBillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { requestPurchaseAccess } from "@/lib/server/billing/purchase-access";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import type { OrderRecord } from "@/lib/server/domain/documents";
import { requireAppCheck } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    await requireAppCheck(req);
    const body = await req.json().catch(() => ({}));
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("invalid contact");
    if (orderId) {
      const order = /^[a-f0-9]{64}$/.test(orderId) ? await getBillingRepositories().orders.getOrder(orderId).catch(() => null) : null;
      await requestPurchaseAccess({ order, email });
    } else {
      const purchases = await getAdminFirestore().collection("orders").where("buyer.email", "==", email).limit(10).get();
      for (const purchase of purchases.docs) {
        const order = { ...purchase.data(), id: purchase.id } as OrderRecord;
        if (order.provider === "mercadopago") await requestPurchaseAccess({ order, email });
      }
    }
  } catch {
    // Keep this endpoint neutral: an unknown order, mismatched email, rate limit,
    // or temporarily missing mail configuration must not become an enumeration signal.
  }
  return NextResponse.json({ ok: true, message: "Se a compra e o e-mail conferirem, você receberá um novo link." }, { headers: { "Cache-Control": "no-store" } });
}
