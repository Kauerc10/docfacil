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
  | "dashboard"
  | "documento-detalhe"
  | "perfil"
  | "ajuda"
  | "login"
  | "cadastro";

type NavParams = Record<string, string | undefined>;

type NavState = {
  view: View;
  params: NavParams;
  navigate: (view: View, params?: NavParams) => void;
};

const NavContext = createContext<NavState | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<View>("home");
  const [params, setParams] = useState<NavParams>({});

  const navigate = useCallback((next: View, p: NavParams = {}) => {
    setView(next);
    setParams(p);
    // Jump to top so each "page" starts at the hero/header, not mid-scroll.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, []);

  // Keep a hash in the URL so back/forward and refresh feel natural-ish.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHash = () => {
      const h = window.location.hash.replace("#/", "").replace("#", "") as View;
      if (h && h !== view) setView(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [view]);

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
