/**
 * Consent service — registra a concordância do usuário com Termos e
 * Privacidade. Em Firebase real a evidência é criada pelo backend; o client
 * envia somente a decisão do usuário e, no checkout guest, o e-mail informado.
 */
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import {
  auth,
  db,
  getClientAppCheckToken,
  IS_FIREBASE_CONFIGURED,
} from "../firebase";
import { STORAGE_KEYS } from "../constants";
import {
  COOKIES_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../legal/versions";

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

function loadDemoConsents(): ConsentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEMO_CONSENTS);
    return raw ? (JSON.parse(raw) as ConsentRecord[]) : [];
  } catch {
    return [];
  }
}

function saveDemoConsents(list: ConsentRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.DEMO_CONSENTS, JSON.stringify(list));
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

async function getConsentHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth?.currentUser) {
    const idToken = await auth.currentUser.getIdToken();
    if (idToken) headers.Authorization = `Bearer ${idToken}`;
  }

  const appCheckToken = await getClientAppCheckToken().catch(() => null);
  if (appCheckToken) headers["X-Firebase-AppCheck"] = appCheckToken;

  return headers;
}

export async function recordConsent(params: {
  userId: string;
  userEmail?: string;
  documents: ConsentDocument[];
  flow: ConsentFlow;
}): Promise<ConsentRecord> {
  if (!IS_FIREBASE_CONFIGURED || !db) {
    const record = await createDemoConsentRecord(params);
    const list = loadDemoConsents();
    const saved = { ...record, id: `demo-${Date.now()}` };
    list.push(saved);
    saveDemoConsents(list);
    return saved;
  }

  const headers = await getConsentHeaders();
  const isGuest = params.userId === "guest";
  const response = await fetch("/api/consents", {
    method: "POST",
    headers,
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

export async function listConsents(userId: string): Promise<ConsentRecord[]> {
  if (!IS_FIREBASE_CONFIGURED || !db) {
    return loadDemoConsents()
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.acceptedAt - a.acceptedAt);
  }

  const q = query(
    collection(db, "consents"),
    where("userId", "==", userId),
    orderBy("acceptedAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ConsentRecord, "id">),
  }));
}

export const COOKIE_PREFS_KEY = STORAGE_KEYS.COOKIE_PREFS;

export interface CookiePreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  acceptedAt?: number;
  rejectedAt?: number;
}

export function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_PREFS_KEY);
    return raw ? (JSON.parse(raw) as CookiePreferences) : null;
  } catch {
    return null;
  }
}

export function saveCookiePreferences(prefs: CookiePreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(prefs));
}
