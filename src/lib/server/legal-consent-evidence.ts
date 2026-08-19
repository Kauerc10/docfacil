import "server-only";
import { createHash } from "node:crypto";
import { isValidElement, type ReactNode } from "react";
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

export const LEGAL_HASH_SCOPE = "canonical-react-content-v1" as const;

let evidenceCache: Record<LegalConsentDocument, LegalDocumentEvidence> | null = null;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalizeReactNode(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(canonicalizeReactNode).join("");
  }

  if (!isValidElement(node)) {
    return "";
  }

  const props = node.props as {
    children?: ReactNode;
    href?: unknown;
    view?: unknown;
  };

  const type = typeof node.type === "string" ? node.type : "component";
  const semanticAttributes: string[] = [];

  if (typeof props.href === "string") {
    semanticAttributes.push(`href=${JSON.stringify(props.href)}`);
  }
  if (typeof props.view === "string") {
    semanticAttributes.push(`view=${JSON.stringify(props.view)}`);
  }

  const attrs = semanticAttributes.length > 0
    ? ` ${semanticAttributes.join(" ")}`
    : "";

  return `<${type}${attrs}>${canonicalizeReactNode(props.children)}</${type}>`;
}

function serializeCanonicalDocument(document: LegalConsentDocument): string {
  const content = document === "termos" ? TermsContent({}) : PrivacyContent({});
  return canonicalizeReactNode(content).replace(/\s+/g, " ").trim();
}

function buildEvidenceCache(): Record<LegalConsentDocument, LegalDocumentEvidence> {
  return {
    termos: {
      version: LEGAL_DOCUMENT_VERSIONS.termos,
      sha256: sha256Hex(serializeCanonicalDocument("termos")),
    },
    privacidade: {
      version: LEGAL_DOCUMENT_VERSIONS.privacidade,
      sha256: sha256Hex(serializeCanonicalDocument("privacidade")),
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
