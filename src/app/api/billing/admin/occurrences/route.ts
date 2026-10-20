import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BackendError } from "@/lib/server/errors";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import { requireSupportOrAdmin } from "@/lib/server/billing/identity-correction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resolveOccurrenceSchema = z.object({
  occurrenceId: z.string().min(1),
  status: z.enum(["resolved", "dismissed"]),
  resolutionNotes: z.string().min(3).max(1000),
});

export async function GET(req: Request): Promise<Response> {
  try {
    await requireSupportOrAdmin(req);
    const db = getAdminFirestore();
    const snap = await db
      .collection("billing_occurrences")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    return NextResponse.json(
      { occurrences: snap.docs.map((doc) => doc.data()) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return BackendError.fromUnknown(error).toResponse();
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const reviewer = await requireSupportOrAdmin(req);
    const parsed = resolveOccurrenceSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      throw new BackendError("INVALID_REQUEST", 400, "Dados de resolução da ocorrência inválidos.");
    }

    const db = getAdminFirestore();
    const ref = db.collection("billing_occurrences").doc(parsed.data.occurrenceId);
    const now = Date.now();

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new BackendError("NOT_FOUND" as never, 404, "Ocorrência não encontrada.");
      }

      const updateData = {
        status: parsed.data.status,
        resolutionNotes: parsed.data.resolutionNotes,
        resolvedBy: reviewer.uid,
        resolvedAt: now,
        updatedAt: now,
      };

      tx.update(ref, updateData);
      return { id: ref.id, ...snap.data(), ...updateData };
    });

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    return BackendError.fromUnknown(error).toResponse();
  }
}
