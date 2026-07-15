/**
 * Analytics loader — carrega scripts de analytics/marketing APENAS após
 * consentimento explícito do usuário (LGPD/ePrivacy).
 *
 * Como usar:
 *  - Chame `initAnalyticsOnConsent()` no boot do app (client-side).
 *  - Ela lê as preferências salvas e, se o consentimento existir, injeta os
 *    scripts correspondentes. Se não houver preferência, nada é carregado
 *    (o banner de cookies cuida de coletar o consentimento).
 *
 * IDs de tracking vêm de env vars (NEXT_PUBLIC_GA_ID, NEXT_PUBLIC_META_PIXEL_ID).
 * Se ausentes, o loader é no-op — não injeta nada.
 *
 * IMPORTANTE: este módulo é client-side only. Sempre proteja com verificação
 * de `typeof window !== "undefined"`.
 */
import { getCookiePreferences } from "./consent-service";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Typed helpers to access window globals safely. */
type GtagFn = (...args: unknown[]) => void;
type FbqFn = (...args: unknown[]) => void;

function getGtag(): GtagFn | undefined {
  return typeof window !== "undefined"
    ? (window as unknown as { gtag?: GtagFn }).gtag
    : undefined;
}

function setGtag(fn: GtagFn): void {
  if (typeof window !== "undefined") {
    const w = window as unknown as { gtag: GtagFn; dataLayer: unknown[] };
    w.gtag = fn;
    w.dataLayer = w.dataLayer || [];
  }
}

function getDataLayer(): unknown[] | undefined {
  return typeof window !== "undefined"
    ? (window as unknown as { dataLayer?: unknown[] }).dataLayer
    : undefined;
}

function setDataLayer(dl: unknown[]): void {
  if (typeof window !== "undefined") {
    (window as unknown as { dataLayer: unknown[] }).dataLayer = dl;
  }
}

function getFbq(): FbqFn | undefined {
  return typeof window !== "undefined"
    ? (window as unknown as { fbq?: FbqFn }).fbq
    : undefined;
}

function setFbq(fn: FbqFn): void {
  if (typeof window !== "undefined") {
    (window as unknown as { fbq: FbqFn }).fbq = fn;
  }
}

function getFbqQueue(): unknown[] {
  if (typeof window === "undefined") return [];
  const w = window as unknown as { _fbq?: { queue?: unknown[] }; fbq?: { queue?: unknown[] } };
  return w.fbq?.queue || w._fbq?.queue || [];
}

/** Carrega o Google Analytics 4 (gtag.js) injetando o script. */
function loadGoogleAnalytics(): void {
  if (typeof window === "undefined" || !GA_ID) return;
  if (getGtag()) return; // já carregado

  const scriptSrc = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  const script = document.createElement("script");
  script.async = true;
  script.src = scriptSrc;
  document.head.appendChild(script);

  setDataLayer(getDataLayer() || []);

  setGtag(function (...args: unknown[]) {
    const dl = getDataLayer();
    if (dl) dl.push(args);
  });

  const gtag = getGtag();
  gtag?.("js", new Date());
  gtag?.("config", GA_ID, { anonymize_ip: true });
}

/** Carrega o Meta (Facebook) Pixel injetando o script. */
function loadMetaPixel(): void {
  if (typeof window === "undefined" || !META_PIXEL_ID) return;
  if (getFbq()) return; // já carregado

  // Inicializa o fbq queue (snippet oficial do Meta Pixel adaptado).
  const queue = getFbqQueue();

  setFbq(function (...args: unknown[]) {
    queue.push(args);
  });

  const w = window as unknown as { fbq: FbqFn & { queue: unknown[]; push: (...a: unknown[]) => void; loaded: boolean; version: string } };
  w.fbq.queue = queue;
  w.fbq.push = w.fbq;
  w.fbq.loaded = true;
  w.fbq.version = "2.0";

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  const first = document.getElementsByTagName("script")[0];
  first.parentNode?.insertBefore(script, first);

  const fbq = getFbq();
  fbq?.("init", META_PIXEL_ID);
  fbq?.("track", "PageView");
}

/**
 * Inicializa analytics/marketing conforme as preferências salvas.
 * No-op se não houver preferência (banner ainda não foi respondido) ou se
 * os IDs de tracking não estiverem configurados.
 *
 * Deve ser chamado uma vez no boot do app (client-side), ex.: num useEffect
 * no layout ou num componente raiz.
 */
export function initAnalyticsOnConsent(): void {
  if (typeof window === "undefined") return;

  const prefs = getCookiePreferences();
  if (!prefs) return; // sem consentimento registrado ainda — não carrega nada

  if (prefs.analytics) loadGoogleAnalytics();
  if (prefs.marketing) loadMetaPixel();
}

/**
 * Recarrega/reavalia os scripts após mudança nas preferências.
 * Útil para chamar quando o usuário atualiza as preferências na página de
 * Cookies. Scripts já carregados não são recarregados (guard interno).
 */
export function refreshAnalytics(): void {
  initAnalyticsOnConsent();
}

/** Verdadeiro se GA ou Meta Pixel estão configurados via env. */
export const ANALYTICS_CONFIGURED = Boolean(GA_ID || META_PIXEL_ID);
