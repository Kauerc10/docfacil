import "server-only";
import { NextResponse } from "next/server";
import { resolveAccountBillingState } from "@/lib/server/billing/account-state";
import { getBillingRepositories } from "@/lib/server/firestore/billing-repositories";
import { BackendError } from "@/lib/server/errors";
import { requireAppCheck, requireUser, resolvePrincipal } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAppCheck(req);
    const user = requireUser(await resolvePrincipal(req));
    const subscription = await getBillingRepositories().subscriptions.getByUserId(
      user.userId
    );

    return NextResponse.json(resolveAccountBillingState(subscription), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    if (error instanceof BackendError) return error.toResponse();
    return BackendError.fromUnknown(error).toResponse();
  }
}
