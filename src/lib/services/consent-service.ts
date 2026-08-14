/**
 * Consent service — registra a concordância do usuário com os Termos de Uso
 * e Política de Privacidade, com evidência robusta para fins legais.
 * Coleção Firestore: "consents". Demo mode: localStorage.
 */
import { collection, addDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db, IS_FIREBASE_CONFIGURED } from "../firebase";
import { STORAGE_KEYS } from "../constants";

export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";
export const COOKIES_VERSION = "1.0";

export type ConsentFlow = "cadastro" | "checkout" | "document-generation";
export type ConsentDocument = "termos" | "privacidade" | "cookies" | "marketing";

export interface ConsentRecord {
  id?: string;
  userId: string;
  userEmail?: string;
  documents: ConsentDocument[];
  termsVersion: string;
  flow: ConsentFlow;
  acceptedAt: number;
  ipAddress?: string;
  userAgent: string;
  termsHash: string;
}

function loadDemoConsents(): ConsentRecord[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(STORAGE_KEYS.DEMO_CONSENTS); return raw ? JSON.parse(raw) as ConsentRecord[] : []; } catch { return []; }
}
function saveDemoConsents(list: ConsentRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.DEMO_CONSENTS, JSON.stringify(list));
}
function getUserAgent(): string {
  if (typeof navigator === "undefined") return "unknown";
  return navigator.userAgent;
}
function hashTerms(version: string): string { return `docfacil-terms-v${version}`; }

export async function recordConsent(params: {
  userId: string;
  userEmail?: string;
  documents: ConsentDocument[];
  flow: ConsentFlow;
  termsVersion?: string;
}): Promise<ConsentRecord> {
  const record: ConsentRecord = {
    userId: params.userId,
    userEmail: params.userEmail,
    documents: params.documents,
    termsVersion: params.termsVersion || TERMS_VERSION,
    flow: params.flow,
    acceptedAt: Date.now(),
    userAgent: getUserAgent(),
    termsHash: hashTerms(params.termsVersion || TERMS_VERSION),
  };
  if (!IS_FIREBASE_CONFIGURED || !db) {
    const list = loadDemoConsents();
    const saved = { ...record, id: `demo-${Date.now()}` };
    list.push(saved); saveDemoConsents(list); return saved;
  }
  try {
    const ipRes = await fetch("/api/consent/ip").catch(() => null);
    if (ipRes?.ok) { const { ip } = (await ipRes.json()) as { ip?: string }; if (ip) record.ipAddress = ip; }
  } catch { /* IP é best-effort */ }
  const ref = await addDoc(collection(db, "consents"), record);
  return { ...record, id: ref.id };
}

export async function listConsents(userId: string): Promise<ConsentRecord[]> {
  if (!IS_FIREBASE_CONFIGURED || !db) {
    return loadDemoConsents().filter((c) => c.userId === userId).sort((a, b) => b.acceptedAt - a.acceptedAt);
  }
  const q = query(collection(db, "consents"), where("userId", "==", userId), orderBy("acceptedAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ConsentRecord, "id">) }));
}

export const COOKIE_PREFS_KEY = STORAGE_KEYS.COOKIE_PREFS;

export interface CookiePreferences {
  essential: true; analytics: boolean; marketing: boolean; acceptedAt?: number; rejectedAt?: number;
}

export function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(COOKIE_PREFS_KEY); return raw ? JSON.parse(raw) as CookiePreferences : null; } catch { return null; }
}
export function saveCookiePreferences(prefs: CookiePreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(prefs));
}
