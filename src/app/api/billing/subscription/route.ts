import "server-only";
import { NextResponse } from "next/server";
import { BackendError } from "@/lib/server/errors";
import { requireAppCheck, requireUser, resolvePrincipal } from "@/lib/server/security";
import { getBillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { resolveAccountBillingState } from "@/lib/server/billing/account-state";
import { createMercadoPagoBillingProvider } from "@/lib/server/billing/mercadopago/provider";
import { cancelMercadoPagoSubscription, continueMercadoPagoSubscription } from "@/lib/server/billing/mercadopago/subscription-management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAppCheck(req);
    const user = requireUser(await resolvePrincipal(req));
    const subscription = await getBillingRepositories().subscriptions.getByUserId(user.userId);
    return NextResponse.json(resolveAccountBillingState(subscription), { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    return BackendError.fromUnknown(error).toResponse();
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    await requireAppCheck(req);
    const user = requireUser(await resolvePrincipal(req));
    const body = await req.json().catch(() => ({})) as { action?: unknown };
    const action = body.action;
    const repos = getBillingRepositories();
    const provider = createMercadoPagoBillingProvider();
    if (action === "cancel") {
      const result = await cancelMercadoPagoSubscription({ userId: user.userId, repos, provider, now: Date.now() });
      return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    }
    if (action === "continue") {
      await continueMercadoPagoSubscription({ userId: user.userId, repos });
    }
    throw new BackendError("INVALID_REQUEST", 400, "Ação de assinatura inválida.");
  } catch (error: unknown) {
    return BackendError.fromUnknown(error).toResponse();
  }
}
