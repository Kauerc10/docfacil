/**
 * Preferências de cookies (LGPD) — armazenamento e consulta local.
 * Desacoplado do serviço de evidências jurídicas imutáveis (ConsentManager).
 */
import { STORAGE_KEYS } from "../constants";
import { COOKIES_VERSION } from "../legal/versions";

export const COOKIE_PREFS_KEY = STORAGE_KEYS.COOKIE_PREFS;

export interface CookiePreferences {
  version?: string;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  acceptedAt?: number;
  rejectedAt?: number;
}

export function isCookiePreferences(value: unknown): value is CookiePreferences {
  if (!value || typeof value !== "object") return false;
  const prefs = value as Partial<CookiePreferences>;
  return (
    prefs.version === COOKIES_VERSION &&
    prefs.essential === true &&
    typeof prefs.analytics === "boolean" &&
    typeof prefs.marketing === "boolean"
  );
}

export function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_PREFS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCookiePreferences(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCookiePreferences(prefs: CookiePreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    COOKIE_PREFS_KEY,
    JSON.stringify({ ...prefs, version: COOKIES_VERSION })
  );
}

