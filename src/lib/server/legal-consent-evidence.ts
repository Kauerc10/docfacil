import "server-only";
import { renderToStaticMarkup } from "react-dom/server";
import { createHash } from "node:crypto";
import { TermsContent } from "@/lib/legal/terms-content";
import { PrivacyContent } from "@/lib/legal/privacy-content";
import {
  LEGAL_DOCUMENT_VERSIONS,
  type LegalConsentDocument,
} from "@/lib/legal/versions";

export interface LegalDocumentEvidence {
  version: string;
  sha256: string;
}

export const LEGAL_HASH_SCOPE = "canonical-rendered-html-v1" as const;

let evidenceCache: Record<LegalConsentDocument, LegalDocumentEvidence> | null = null;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function renderCanonicalDocument(document: LegalConsentDocument): string {
  const onNavigate = () => undefined;
  const content =
    document === "termos"
      ? TermsContent({ onNavigate })
      : PrivacyContent({ onNavigate });

  return renderToStaticMarkup(content).replace(/\r\n/g, "\n").trim();
}

function buildEvidenceCache(): Record<LegalConsentDocument, LegalDocumentEvidence> {
  return {
    termos: {
      version: LEGAL_DOCUMENT_VERSIONS.termos,
      sha256: sha256Hex(renderCanonicalDocument("termos")),
    },
    privacidade: {
      version: LEGAL_DOCUMENT_VERSIONS.privacidade,
      sha256: sha256Hex(renderCanonicalDocument("privacidade")),
    },
  };
}

export function getLegalDocumentEvidence(
  documents: readonly LegalConsentDocument[]
): Partial<Record<LegalConsentDocument, LegalDocumentEvidence>> {
  evidenceCache ??= buildEvidenceCache();

  const result: Partial<Record<LegalConsentDocument, LegalDocumentEvidence>> = {};
  for (const document of documents) {
    result[document] = evidenceCache[document];
  }
  return result;
}
