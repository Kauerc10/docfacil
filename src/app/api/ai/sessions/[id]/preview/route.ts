import "server-only";
import { BackendError } from "@/lib/server/errors";
import { requireAIPilot } from "@/lib/server/ai/route-auth";
import { previewAISession } from "@/lib/server/ai/finalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;
type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: Context) {
  try {
    const userId = await requireAIPilot(req);
    const pdf = await previewAISession((await context.params).id, userId);
    if (pdf.byteLength > 3 * 1024 * 1024) throw new BackendError("GENERATION_FAILED", 413, "Prévia grande demais.");
    return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Cache-Control": "private, no-store" } });
  } catch (error) { return BackendError.fromUnknown(error).toResponse(); }
}
