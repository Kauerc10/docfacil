"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";

/**
 * Client-side view router for DocFacil.
 *
 * The platform spec defines many routes (/modelos, /criar, /sucesso, /ia,
 * /planos, /app, /ajuda, /login...). To keep everything reachable from the
 * single `/` entry point (sandbox constraint), we simulate routing with
 * history.pushState while exposing the current view through context.
 */

export type View =
  | "home"
  | "modelos"
  | "modelo-detalhe"
  | "criar"
  | "sucesso"
  | "ia"
  | "planos"
  | "checkout"
  | "pagamento-pix"
  | "dashboard"
  | "documento-detalhe"
  | "perfil"
  | "ajuda"
  | "login"
  | "cadastro"
  | "termos"
  | "privacidade"
  | "cookies";

type NavParams = Record<string, string | undefined>;

type NavState = {
  view: View;
  params: NavParams;
  navigate: (view: View, params?: NavParams) => void;
};

const NavContext = createContext<NavState | null>(null);
const NAV_EVENT = "docfacil:navigate";
const SERVER_SNAPSHOT = "home|";

const VALID_VIEWS = new Set<View>([
  "home",
  "modelos",
  "modelo-detalhe",
  "criar",
  "sucesso",
  "ia",
  "planos",
  "checkout",
  "pagamento-pix",
  "dashboard",
  "documento-detalhe",
  "perfil",
  "ajuda",
  "login",
  "cadastro",
  "termos",
  "privacidade",
  "cookies",
]);

function readLocationSnapshot(): string {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  const search = new URLSearchParams(window.location.search);
  const queryView = search.get("view");
  const hashView = window.location.hash.replace("#/", "").replace("#", "");
  const candidate = queryView || hashView;
  const view = candidate && VALID_VIEWS.has(candidate as View) ? candidate : "home";

  const params = new URLSearchParams();
  search.forEach((value, key) => {
    if (key !== "view") params.set(key, value);
  });

  return `${view}|${params.toString()}`;
}

function parseSnapshot(snapshot: string): { view: View; params: NavParams } {
  const separator = snapshot.indexOf("|");
  const rawView = separator >= 0 ? snapshot.slice(0, separator) : "home";
  const rawParams = separator >= 0 ? snapshot.slice(separator + 1) : "";
  const view = VALID_VIEWS.has(rawView as View) ? (rawView as View) : "home";
  const params: NavParams = {};

  new URLSearchParams(rawParams).forEach((value, key) => {
    params[key] = value;
  });

  return { view, params };
}

function subscribeToLocation(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const notify = () => onStoreChange();
  window.addEventListener("popstate", notify);
  window.addEventListener(NAV_EVENT, notify);

  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener(NAV_EVENT, notify);
  };
}

export type NavAction =
  | { type: "assign"; url: string }
  | { type: "pushState"; url: string };

export function resolveNavAction(
  next: View,
  p: NavParams = {},
  currentPath: string = "/"
): NavAction {
  if (next === "modelos") {
    return { type: "assign", url: "/documentos" };
  }
  if (next === "modelo-detalhe" && p.slug) {
    return { type: "assign", url: `/documentos/${p.slug}` };
  }

  const search = new URLSearchParams();
  search.set("view", next);
  for (const [key, value] of Object.entries(p)) {
    if (value) search.set(key, value);
  }
  const target = `/?${search.toString()}`;

  if (currentPath !== "/") {
    return { type: "assign", url: target };
  }

  return { type: "pushState", url: target };
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  // getServerSnapshot mantém o primeiro render do browser idêntico ao SSR.
  // Depois da hidratação, o React lê a URL real e atualiza a view sem o
  // mismatch que gerava o erro #418 ao abrir ?view=login/criar diretamente.
  const snapshot = useSyncExternalStore(
    subscribeToLocation,
    readLocationSnapshot,
    () => SERVER_SNAPSHOT
  );
  const { view, params } = parseSnapshot(snapshot);

  const navigate = useCallback((next: View, p: NavParams = {}) => {
    if (typeof window === "undefined") return;

    const currentPath = window.location.pathname || "/";
    const action = resolveNavAction(next, p, currentPath);

    if (action.type === "assign") {
      if (typeof window.location?.assign === "function") {
        window.location.assign(action.url);
      } else if (window.location) {
        window.location.href = action.url;
      }
      return;
    }

    window.history.pushState({}, "", action.url);
    window.dispatchEvent(new Event(NAV_EVENT));
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return (
    <NavContext.Provider value={{ view, params, navigate }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}
