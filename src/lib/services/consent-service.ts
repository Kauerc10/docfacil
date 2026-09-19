/**
 * Consent service — registra a concordância do usuário com Termos e
 * Privacidade. Em Firebase real a evidência é criada pelo backend; o client
 * envia somente a decisão do usuário e, no checkout guest, o e-mail informado.
 *
 * Consolidação no ConsentManager:
 * - Seam exclusiva via API routes (/api/consents POST e GET).
 * - Zero acoplamento ou importação do SDK client do Firestore.
 * - Preferências de cookies isoladas no submódulo cookie-preferences.ts.
 */
import { apiFetch } from "@/lib/auth/api-fetch";
import { IS_FIREBASE_CONFIGURED } from "../firebase";
import { STORAGE_KEYS } from "../constants";
import {
  COOKIES_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../legal/versions";

export {
  COOKIE_PREFS_KEY,
  type CookiePreferences,
  getCookiePreferences,
  saveCookiePreferences,
} from "./cookie-preferences";

export { COOKIES_VERSION, PRIVACY_VERSION, TERMS_VERSION };

export type ConsentFlow = "cadastro" | "checkout" | "document-generation";
export type ConsentDocument = "termos" | "privacidade" | "cookies" | "marketing";

export interface ConsentRecord {
  id?: string;
  evidenceVersion?: number;
  recordedBy?: "server" | "demo";
  principalType?: "user" | "guest";
  userId?: string;
  userEmail?: string;
  documents: ConsentDocument[];
  termsVersion: string;
  privacyVersion?: string;
  flow: ConsentFlow;
  acceptedAt: number;
  ipAddress?: string;
  userAgent: string;
  termsHash: string;
  documentVersions?: Partial<Record<"termos" | "privacidade" | "cookies", string>>;
  documentHashes?: Partial<Record<"termos" | "privacidade" | "cookies", string>>;
  hashScope?: string;
  marketingOptIn?: boolean;
}

let inMemoryDemoConsents: ConsentRecord[] = [];

function loadDemoConsents(): ConsentRecord[] {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEYS.DEMO_CONSENTS);
      return raw ? (JSON.parse(raw) as ConsentRecord[]) : [];
    }
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEYS.DEMO_CONSENTS);
      return raw ? (JSON.parse(raw) as ConsentRecord[]) : [];
    }
  } catch {
    // fallback
  }
  return inMemoryDemoConsents;
}

function saveDemoConsents(list: ConsentRecord[]) {
  inMemoryDemoConsents = list;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEYS.DEMO_CONSENTS, JSON.stringify(list));
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.DEMO_CONSENTS, JSON.stringify(list));
    }
  } catch {
    // fallback
  }
}

function getUserAgent(): string {
  if (typeof navigator === "undefined") return "unknown";
  return navigator.userAgent;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function createDemoConsentRecord(params: {
  userId: string;
  userEmail?: string;
  documents: ConsentDocument[];
  flow: ConsentFlow;
}): Promise<ConsentRecord> {
  const termsHash = await sha256Hex(`docfacil:demo:termos:${TERMS_VERSION}`);
  const privacyHash = await sha256Hex(`docfacil:demo:privacidade:${PRIVACY_VERSION}`);

  return {
    evidenceVersion: 2,
    recordedBy: "demo",
    principalType: params.userId === "guest" ? "guest" : "user",
    ...(params.userId !== "guest" ? { userId: params.userId } : {}),
    ...(params.userEmail ? { userEmail: params.userEmail } : {}),
    documents: params.documents,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    flow: params.flow,
    acceptedAt: Date.now(),
    userAgent: getUserAgent(),
    termsHash,
    documentVersions: {
      termos: TERMS_VERSION,
      privacidade: PRIVACY_VERSION,
    },
    documentHashes: {
      termos: termsHash,
      privacidade: privacyHash,
    },
    hashScope: "demo-v1",
    marketingOptIn: params.documents.includes("marketing"),
  };
}

export async function recordConsent(params: {
  userId: string;
  userEmail?: string;
  documents: ConsentDocument[];
  flow: ConsentFlow;
  /** @deprecated Compatibilidade temporária. A versão real é definida pelo servidor. */
  termsVersion?: string;
}): Promise<ConsentRecord> {
  if (!IS_FIREBASE_CONFIGURED) {
    const record = await createDemoConsentRecord(params);
    const list = loadDemoConsents();
    const saved = { ...record, id: `demo-${Date.now()}` };
    list.push(saved);
    saveDemoConsents(list);
    return saved;
  }

  const isGuest = params.userId === "guest";
  const response = await apiFetch("/api/consents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documents: params.documents.filter((doc) => doc !== "cookies"),
      flow: params.flow,
      ...(isGuest && params.userEmail ? { guestEmail: params.userEmail } : {}),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload.error?.message || "Não foi possível registrar seu consentimento."
    );
  }

  const payload = (await response.json()) as { consent: ConsentRecord };
  return payload.consent;
}

export async function listConsents(userId?: string): Promise<ConsentRecord[]> {
  if (!IS_FIREBASE_CONFIGURED) {
    return loadDemoConsents()
      .filter((c) => !userId || c.userId === userId)
      .sort((a, b) => b.acceptedAt - a.acceptedAt);
  }

  const response = await apiFetch("/api/consents", {
    method: "GET",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload.error?.message || "Não foi possível carregar os registros de consentimento."
    );
  }

  const payload = (await response.json()) as { consents: ConsentRecord[] };
  const list = payload.consents || [];
  return userId ? list.filter((c) => c.userId === userId) : list;
}

export const listUserConsents = listConsents;

export const ConsentManager = {
  record: recordConsent,
  list: listConsents,
  listUserConsents,
};

