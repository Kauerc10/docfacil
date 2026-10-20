import "server-only";
import { NextResponse } from "next/server";
import { resolvePrincipal } from "@/lib/server/security";
import { getBillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { getPurchaseDelivery } from "@/lib/server/billing/purchase-delivery";
import { authorizePurchaseRequest } from "@/lib/server/billing/purchase-authorization";
import { getArtifactStorage } from "@/lib/server/r2/storage";
import { BackendError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  try {
    const id = new URL(req.url).searchParams.get("orderId") ?? "";
    if (!/^[a-f0-9]{64}$/.test(id)) throw new BackendError("ORDER_FORBIDDEN", 403, "Compra indisponível.");
    const order = await getBillingRepositories().orders.getOrder(id);
    if (!order || !await authorizePurchaseRequest(req, order, await resolvePrincipal(req))) throw new BackendError("ORDER_FORBIDDEN", 403, "Compra indisponível.");
    if (!["paid", "reserved", "consumed"].includes(order.status)) throw new BackendError("ORDER_NOT_PAID", 403, "Esta compra não permite novos downloads.");
    const delivery = await getPurchaseDelivery(id);
    if (!delivery?.result || delivery.status !== "completed") throw new BackendError("GENERATION_IN_PROGRESS", 409, "O documento ainda está sendo preparado.");
    const repos = getRepositories();
    const document = await repos.documents.getDocument(delivery.result.documentId);
    if (!document || document.entitlement.orderId !== id || document.status === "deleted") throw new BackendError("DOCUMENT_FORBIDDEN", 403, "Documento indisponível.");
    const artifact = await repos.documents.getArtifact(document.id!, document.currentVersion ?? delivery.result.version);
    if (!artifact) throw new BackendError("ARTIFACT_NOT_FOUND", 404, "Arquivo indisponível.");
    const url = await getArtifactStorage().getDownloadUrl({ objectKey: artifact.objectKey, filename: artifact.filename, expiresInSeconds: 300 });
    const response = NextResponse.redirect(url, 303);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) { return BackendError.fromUnknown(error).toResponse(); }
}
