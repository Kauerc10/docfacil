import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppCheck, resolvePrincipal } from "@/lib/server/security";
import { getAdminFirestore } from "@/lib/server/firebase-admin";
import { BackendError } from "@/lib/server/errors";
import {
  getLegalDocumentEvidence,
  LEGAL_HASH_SCOPE,
} from "@/lib/server/legal-consent-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const consentInputSchema = z.object({
  documents: z
    .array(z.enum(["termos", "privacidade", "marketing"]))
    .min(2)
    .max(3),
  flow: z.enum(["cadastro", "checkout", "document-generation"]),
  guestEmail: z.string().trim().email().max(254).optional(),
});

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("true-client-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  ).slice(0, 128);
}

function getUserAgent(req: Request): string {
  return (req.headers.get("user-agent") || "unknown").slice(0, 512);
}

export async function POST(req: Request) {
  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);
    const body = await req.json().catch(() => ({}));
    const parsed = consentInputSchema.safeParse(body);

    if (!parsed.success) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "Dados de consentimento inválidos."
      );
    }

    const documents = Array.from(new Set(parsed.data.documents));
    if (!documents.includes("termos") || !documents.includes("privacidade")) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "Termos de Uso e Política de Privacidade são obrigatórios."
      );
    }

    if (principal.type === "guest" && parsed.data.flow === "cadastro") {
      throw new BackendError(
        "INVALID_AUTH_TOKEN",
        401,
        "A conta precisa estar autenticada antes de registrar o aceite de cadastro."
      );
    }

    const userEmail =
      principal.type === "user"
        ? principal.email?.trim().toLowerCase()
        : parsed.data.guestEmail?.trim().toLowerCase();

    if (principal.type === "guest" && !userEmail) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "E-mail obrigatório para registrar o consentimento do visitante."
      );
    }

    const legalEvidence = getLegalDocumentEvidence(["termos", "privacidade"]);
    const termsEvidence = legalEvidence.termos;
    const privacyEvidence = legalEvidence.privacidade;

    if (!termsEvidence || !privacyEvidence) {
      throw new BackendError(
        "INTERNAL_ERROR",
        500,
        "Não foi possível preparar a evidência dos documentos legais."
      );
    }

    const now = Date.now();
    const record = {
      evidenceVersion: 2,
      recordedBy: "server" as const,
      principalType: principal.type,
      ...(principal.type === "user" ? { userId: principal.userId } : {}),
      ...(userEmail ? { userEmail } : {}),
      documents,
      flow: parsed.data.flow,
      acceptedAt: now,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      termsVersion: termsEvidence.version,
      privacyVersion: privacyEvidence.version,
      termsHash: termsEvidence.sha256,
      documentVersions: {
        termos: termsEvidence.version,
        privacidade: privacyEvidence.version,
      },
      documentHashes: {
        termos: termsEvidence.sha256,
        privacidade: privacyEvidence.sha256,
      },
      hashScope: LEGAL_HASH_SCOPE,
      marketingOptIn: documents.includes("marketing"),
    };

    const ref = getAdminFirestore().collection("consents").doc();
    await ref.set(record);

    return NextResponse.json(
      { consent: { id: ref.id, ...record } },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    return BackendError.fromUnknown(error).toResponse();
  }
}
