export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";
export const COOKIES_VERSION = "1.1";

export type LegalConsentDocument = "termos" | "privacidade";

export const LEGAL_DOCUMENT_VERSIONS: Record<LegalConsentDocument, string> = {
  termos: TERMS_VERSION,
  privacidade: PRIVACY_VERSION,
};
