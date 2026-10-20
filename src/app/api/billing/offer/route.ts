import "server-only";
import { NextResponse } from "next/server";
import { BackendError } from "@/lib/server/errors";
import { requireAppCheck, resolvePrincipal } from "@/lib/server/security";
import { getBillingRepositories } from "@/lib/server/firestore/billing-repositories";
import {
  getOrCreateWelcomeOffer,
  PROMO_CENTS,
  REGULAR_CENTS,
} from "@/lib/server/billing/welcome-offer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);
    if (principal.type !== "user") {
      return NextResponse.json({
        eligible: false,
        active: false,
        priceCents: REGULAR_CENTS,
        regularPriceCents: REGULAR_CENTS,
        expiresAt: null,
        remainingSeconds: 0,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const repos = getBillingRepositories();
    const existingSub = await repos.subscriptions.getByUserId(principal.userId);
    const hasHadProBefore = Boolean(existingSub && (existingSub.status === "active" || existingSub.lastPaidAt > 0));

    const now = Date.now();
    const offer = await getOrCreateWelcomeOffer({
      userId: principal.userId,
      hasHadProBefore,
      now,
    });

    const active = offer.status === "active" && now < offer.expiresAt;
    const remainingSeconds = active ? Math.max(0, Math.floor((offer.expiresAt - now) / 1000)) : 0;

    return NextResponse.json({
      status: offer.status,
      active,
      eligible: active,
      priceCents: active ? PROMO_CENTS : REGULAR_CENTS,
      regularPriceCents: REGULAR_CENTS,
      expiresAt: active ? offer.expiresAt : null,
      remainingSeconds,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    return BackendError.fromUnknown(error).toResponse();
  }
}
