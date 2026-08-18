"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Client-side view router for DocFacil.
 *
 * The platform spec defines many routes (/modelos, /criar, /sucesso, /ia,
 * /planos, /app, /ajuda, /login...). To keep everything reachable from the
 * single `/` entry point (sandbox constraint), we simulate routing with
 * client state + scroll-to-top on change. Every link in the app uses
 * `navigate(view, params?)` instead of <a href>, so the experience feels
 * like a real multi-page app while staying on one URL.
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

const VALID_VIEWS = new Set<View>([
  "home",
  "modelos",
  "modelo-detalhe",
  "criar",
  "sucesso",
  "ia",
  "planos",
  "checkout",
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

function readLocationState(): { view: View; params: NavParams } {
  if (typeof window === "undefined") {
    return { view: "home", params: {} };
  }

  const search = new URLSearchParams(window.location.search);
  const queryView = search.get("view");
  const hashView = window.location.hash.replace("#/", "").replace("#", "");
  const candidate = queryView || hashView;
  const view = candidate && VALID_VIEWS.has(candidate as View) ? (candidate as View) : "home";

  const params: NavParams = {};
  search.forEach((value, key) => {
    if (key !== "view") params[key] = value;
  });

  return { view, params };
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  // SSR e o primeiro render do cliente precisam produzir exatamente a mesma
  // árvore. Ler window/location dentro do initializer do useState fazia o
  // servidor renderizar "home" enquanto o browser já renderizava "login",
  // "criar" etc., causando React hydration error #418.
  const [view, setView] = useState<View>("home");
  const [params, setParams] = useState<NavParams>({});

  // Sincroniza a URL apenas depois que a hidratação inicial terminou.
  useEffect(() => {
    const state = readLocationState();
    setView(state.view);
    setParams(state.params);
  }, []);

  const navigate = useCallback((next: View, p: NavParams = {}) => {
    setView(next);
    setParams(p);
    if (typeof window !== "undefined") {
      const search = new URLSearchParams();
      search.set("view", next);
      for (const [k, v] of Object.entries(p)) {
        if (v) search.set(k, v);
      }
      window.history.pushState({}, "", `/?${search.toString()}`);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, []);

  // Listen to popstate (back/forward)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const state = readLocationState();
      setView(state.view);
      setParams(state.params);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
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
