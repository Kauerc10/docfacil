"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { Logo } from "./logo";
import { useNav, type View } from "./nav-context";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

type NavItem = {
  label: string;
  href?: string;
  view?: View;
};

const NAV: NavItem[] = [
  { label: "Documentos", href: "/documentos" },
  { label: "Como funciona", href: "/#como-funciona" },
  { label: "Planos", href: "/planos" },
  { label: "Ajuda", href: "/ajuda" },
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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3 sm:gap-4">
        {/* Logo */}
        <Link
          href="/"
          onClick={() => {
            go("home");
          }}
          className="flex items-center shrink-0 hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] rounded-lg"
          aria-label="DocFácil — início"
        >
          <Logo variant="header" />
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => {
            if (n.href) {
              return (
                <Link
                  key={n.label}
                  href={n.href}
                  className={cn(
                    "px-3.5 py-2 rounded-lg text-[0.925rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]",
                    "text-ink/80 hover:text-ink hover:bg-[var(--blue-soft)]/60"
                  )}
                >
                  {n.label}
                </Link>
              );
            }
            return (
              <button
                key={n.label}
                onClick={() => n.view && go(n.view)}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-[0.925rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]",
                  view === n.view
                    ? "text-ink bg-[var(--blue-soft)]/70"
                    : "text-ink/80 hover:text-ink hover:bg-[var(--blue-soft)]/60"
                )}
              >
                {n.label}
              </button>
            );
          })}
          {user && (
            <button
              onClick={() => go("dashboard")}
              className={cn(
                "px-3.5 py-2 rounded-lg text-[0.925rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]",
                view === "dashboard"
                  ? "text-ink bg-[var(--blue-soft)]/70"
                  : "text-ink/80 hover:text-ink hover:bg-[var(--blue-soft)]/60"
              )}
            >
              Meus Documentos
            </button>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button
                onClick={() => go("perfil")}
                className="hidden sm:inline-flex items-center gap-2 h-10 px-3 rounded-lg hover:bg-[var(--blue-soft)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
                aria-label={`Perfil de ${user.nome}`}
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
                onClick={async () => {
                  await signOut();
                  go("home");
                }}
                className="hidden sm:inline-flex items-center justify-center h-10 px-3 rounded-lg text-ink/60 hover:text-ink hover:bg-[var(--blue-soft)] font-medium text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
                aria-label="Sair da conta"
                title="Sair"
              >
                Sair
              </button>
            </>
          ) : (
            <button
              onClick={() => go("login")}
              className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-lg border border-[var(--blue-royal)]/30 text-[var(--blue-royal)] font-semibold text-[0.925rem] hover:bg-[var(--blue-soft)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
            >
              Entrar
            </button>
          )}
          <Link
            href="/documentos"
            className="inline-flex items-center justify-center min-h-11 px-3.5 sm:px-5 rounded-xl bg-[var(--blue-royal)] text-white font-semibold text-sm sm:text-[0.925rem] hover:bg-[#1e44a8] active:scale-[0.98] transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <span className="hidden sm:inline">Criar Documento Grátis</span>
            <span className="sm:hidden">Começar</span>
          </Link>

          <button
            type="button"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden grid place-items-center min-h-11 min-w-11 rounded-lg border border-[var(--border)] text-ink focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <div
        className={cn(
          "md:hidden overflow-hidden border-t border-[var(--border)] bg-surface transition-[max-height,opacity] duration-300",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        )}
        aria-hidden={!open}
        inert={!open}
      >
        <nav className="px-4 py-3 flex flex-col gap-1">
          {NAV.map((n) => {
            if (n.href) {
              return (
                <Link
                  key={n.label}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="py-3 px-2 rounded-lg text-left font-medium text-ink/80 border-b border-[var(--border)]/60 last:border-0 hover:bg-[var(--blue-soft)]/50 focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
                >
                  {n.label}
                </Link>
              );
            }
            return (
              <button
                key={n.label}
                onClick={() => n.view && go(n.view)}
                className="py-3 px-2 rounded-lg text-left font-medium text-ink/80 border-b border-[var(--border)]/60 last:border-0 hover:bg-[var(--blue-soft)]/50 focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
              >
                {n.label}
              </button>
            );
          })}
          {user ? (
            <>
              <button
                onClick={() => go("dashboard")}
                className="py-3 px-2 rounded-lg text-left font-medium text-ink/80 border-b border-[var(--border)]/60"
              >
                Meus Documentos
              </button>
              <button
                onClick={() => go("perfil")}
                className="mt-2 py-2.5 px-2 rounded-lg text-left text-ink font-semibold border-b border-[var(--border)]/60"
              >
                Olá, {user.nome.split(" ")[0]}
              </button>
              <button
                onClick={async () => {
                  await signOut();
                  go("home");
                  setOpen(false);
                }}
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
