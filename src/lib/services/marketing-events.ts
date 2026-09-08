import { getCookiePreferences } from "./consent-service";

export type AllowedMarketingEvent =
  | "landing_cta_click"
  | "catalog_search"
  | "category_select"
  | "model_select"
  | "product_example_open"
  | "access_option_select"
  | "faq_open";

export type SafeMarketingParams = {
  position?: "hero" | "final" | "nav" | "modelos" | string;
  slug?: string;
  category?: string;
  option?: string;
  faqId?: string;
  exampleId?: string;
};

const ALLOWED_EVENTS = new Set<string>([
  "landing_cta_click",
  "catalog_search",
  "category_select",
  "model_select",
  "product_example_open",
  "access_option_select",
  "faq_open",
]);

const ALLOWED_PARAM_KEYS = new Set<string>([
  "position",
  "slug",
  "category",
  "option",
  "faqId",
  "exampleId",
]);

/**
 * Sanitiza parâmetros de tracking para garantir que NENHUM dado pessoal,
 * consulta livre, token ou resposta de documento seja enviado a serviços de analytics.
 */
export function sanitizeMarketingParams(
  params: Record<string, unknown>
): SafeMarketingParams {
  const sanitized: SafeMarketingParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (ALLOWED_PARAM_KEYS.has(key) && typeof value === "string") {
      (sanitized as Record<string, string>)[key] = value;
    }
  }
  return sanitized;
}

/**
 * Dispara evento de marketing respeitando allowlist e consentimento explícito LGPD.
 * Retorna true se o evento foi aceito e enviado, false caso contrário.
 */
export function trackMarketingEvent(
  eventName: AllowedMarketingEvent,
  params: SafeMarketingParams = {}
): boolean {
  if (typeof window === "undefined") return false;
  if (!ALLOWED_EVENTS.has(eventName)) return false;

  const prefs = getCookiePreferences();
  if (!prefs?.analytics) return false;

  const safeParams = sanitizeMarketingParams(params as Record<string, unknown>);

  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === "function") {
    w.gtag("event", eventName, safeParams);
    return true;
  }

  return false;
}
