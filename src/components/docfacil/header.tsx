"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { useNav, type View } from "./nav-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

const NAV: { label: string; view: View }[] = [
  { label: "Início", view: "home" },
  { label: "Modelos", view: "modelos" },
  { label: "Meus Documentos", view: "dashboard" },
  { label: "Planos", view: "planos" },
];

export function Header() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { view, navigate } = useNav();
  const { user, signOut } = useAuth();

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      let last = window.scrollY;
      let hidden = false;
      const onScroll = () => {
        const y = window.scrollY;
        setScrolled(y > 24);
        if (y > 160 && y > last + 4 && !hidden) {
          gsap.to(el, { yPercent: -100, duration: 0.4, ease: "power2.out" });
          hidden = true;
        } else if ((y < last - 4 || y < 160) && hidden) {
          gsap.to(el, { yPercent: 0, duration: 0.4, ease: "power2.out" });
          hidden = false;
        }
        last = y;
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    },
    { scope: root }
  );

  const go = (v: View) => {
    navigate(v);
    setOpen(false);
  };

  return (
    <header
      ref={root}
      className={cn(
        "fixed top-0 inset-x-0 z-40 transition-[height,box-shadow,background] duration-300",
        scrolled ? "h-[58px] shadow-[0_6px_24px_-12px_rgba(14,35,64,0.18)]" : "h-[72px]",
        "bg-surface/95 backdrop-blur-md border-b border-[var(--border)]"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        {/* Logo — PNG is the "D" */}
        <button
          onClick={() => go("home")}
          className="flex items-center shrink-0 hover:opacity-90 transition-opacity"
          aria-label="DocFacil — início"
        >
          <Logo variant="header" />
        </button>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <button
              key={n.view}
              onClick={() => go(n.view)}
              className={cn(
                "px-3.5 py-2 rounded-lg text-[0.975rem] font-medium transition-colors",
                view === n.view
                  ? "text-ink bg-[var(--blue-soft)]/70"
                  : "text-ink/70 hover:text-ink hover:bg-[var(--blue-soft)]/60"
              )}
            >
              {n.label}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <button
                onClick={() => go("perfil")}
                className="hidden sm:inline-flex items-center gap-2 h-10 px-3 rounded-lg hover:bg-[var(--blue-soft)] transition-colors"
                title={user.email}
              >
                <span className="grid place-items-center w-7 h-7 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)] font-bold text-sm">
                  {user.nome.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-ink max-w-[120px] truncate">
                  {user.nome.split(" ")[0]}
                </span>
              </button>
              <button
                onClick={async () => { await signOut(); go("home"); }}
                className="hidden sm:inline-flex items-center justify-center h-10 px-3 rounded-lg text-ink/60 hover:text-ink hover:bg-[var(--blue-soft)] font-medium text-sm transition-colors"
                title="Sair"
              >
                Sair
              </button>
            </>
          ) : (
            <button
              onClick={() => go("login")}
              className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-lg border border-[var(--blue-royal)]/30 text-[var(--blue-royal)] font-semibold text-[0.925rem] hover:bg-[var(--blue-soft)] transition-colors"
            >
              Entrar
            </button>
          )}
          <button
            onClick={() => go("modelos")}
            className="inline-flex items-center justify-center h-10 px-4 sm:px-5 rounded-lg bg-[var(--blue-royal)] text-white font-semibold text-[0.925rem] hover:bg-[#1e44a8] active:scale-[0.98] transition-all shadow-[0_6px_18px_-8px_rgba(37,84,199,0.7)]"
          >
            Criar Documento Grátis
          </button>

          <button
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden grid place-items-center w-10 h-10 rounded-lg border border-[var(--border)] text-ink"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <div
        className={cn(
          "md:hidden overflow-hidden border-t border-[var(--border)] bg-surface transition-[max-height,opacity] duration-300",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <nav className="px-4 py-3 flex flex-col">
          {NAV.map((n) => (
            <button
              key={n.view}
              onClick={() => go(n.view)}
              className={cn(
                "py-3 px-2 rounded-lg text-left font-medium border-b border-[var(--border)]/60 last:border-0",
                view === n.view ? "text-[var(--blue-royal)]" : "text-ink/80"
              )}
            >
              {n.label}
            </button>
          ))}
          {user ? (
            <>
              <button
                onClick={() => go("perfil")}
                className="mt-2 py-2.5 px-2 rounded-lg text-left text-ink font-semibold border-b border-[var(--border)]/60"
              >
                Olá, {user.nome.split(" ")[0]}
              </button>
              <button
                onClick={async () => { await signOut(); go("home"); setOpen(false); }}
                className="mt-2 py-2.5 px-2 rounded-lg text-left text-[var(--coral)] font-semibold"
              >
                Sair
              </button>
            </>
          ) : (
            <button
              onClick={() => go("login")}
              className="mt-2 py-2.5 px-2 rounded-lg text-left text-[var(--blue-royal)] font-semibold"
            >
              Entrar
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
