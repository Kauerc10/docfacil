"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Menu, X } from "lucide-react";
import { Selo } from "./selo";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

const NAV = [
  { label: "Início", href: "#topo" },
  { label: "Modelos", href: "#modelos" },
  { label: "Meus Documentos", href: "#dashboard" },
  { label: "Planos", href: "#planos" },
];

export function Header() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      let last = window.scrollY;
      let hidden = false;
      const onScroll = () => {
        const y = window.scrollY;
        setScrolled(y > 24);
        // hide-on-scroll-down micro behavior (only after threshold)
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
        {/* Logo */}
        <a href="#topo" className="flex items-center gap-2.5 shrink-0">
          <Selo variant="mark" className="w-7 h-7" />
          <span className="font-[family-name:var(--font-jakarta)] text-[1.35rem] font-extrabold tracking-tight text-ink">
            Doc<span className="text-[var(--blue-royal)]">Facil</span>
          </span>
        </a>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              className="px-3.5 py-2 rounded-lg text-[0.975rem] font-medium text-ink/75 hover:text-ink hover:bg-[var(--blue-soft)]/60 transition-colors"
            >
              {n.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          <a
            href="#login"
            className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-lg border border-[var(--blue-royal)]/30 text-[var(--blue-royal)] font-semibold text-[0.925rem] hover:bg-[var(--blue-soft)] transition-colors"
          >
            Entrar
          </a>
          <a
            href="#criar"
            className="inline-flex items-center justify-center h-10 px-4 sm:px-5 rounded-lg bg-[var(--blue-royal)] text-white font-semibold text-[0.925rem] hover:bg-[#1e44a8] active:scale-[0.98] transition-all shadow-[0_6px_18px_-8px_rgba(37,84,199,0.7)]"
          >
            Criar Documento Grátis
          </a>

          {/* Mobile menu toggle */}
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
          open ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <nav className="px-4 py-3 flex flex-col">
          {NAV.map((n) => (
            <a
              key={n.label}
              href={n.href}
              onClick={() => setOpen(false)}
              className="py-3 px-2 rounded-lg text-ink/80 font-medium border-b border-[var(--border)]/60 last:border-0"
            >
              {n.label}
            </a>
          ))}
          <a
            href="#login"
            onClick={() => setOpen(false)}
            className="mt-2 py-2.5 px-2 rounded-lg text-[var(--blue-royal)] font-semibold"
          >
            Entrar
          </a>
        </nav>
      </div>
    </header>
  );
}
