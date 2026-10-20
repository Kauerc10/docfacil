import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BackendError } from "@/lib/server/errors";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import { requireSupportOrAdmin, reviewIdentityCorrection } from "@/lib/server/billing/identity-correction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  correctionId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  decisionNotes: z.string().max(500).optional(),
});

export async function GET(req: Request): Promise<Response> {
  try {
    await requireSupportOrAdmin(req);
    const snap = await getAdminFirestore()
      .collection("billing_identity_corrections")
      .where("status", "==", "pending")
      .limit(100)
      .get();

    return NextResponse.json(
      { corrections: snap.docs.map((doc) => doc.data()) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return BackendError.fromUnknown(error).toResponse();
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const reviewer = await requireSupportOrAdmin(req);
    const parsed = reviewSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new BackendError("INVALID_REQUEST", 400, "Dados de revisão inválidos.");
    }

    const result = await reviewIdentityCorrection({
      correctionId: parsed.data.correctionId,
      decision: parsed.data.decision,
      reviewerId: reviewer.uid,
      decisionNotes: parsed.data.decisionNotes,
    });

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    return BackendError.fromUnknown(error).toResponse();
  }
}
