"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { COMPANY } from "@/lib/company";

/**
 * Floating WhatsApp button — "Sempre existe uma saída para o humano."
 * Appears after a small delay so it doesn't compete with the hero,
 * then stays pinned bottom-right on every screen.
 */
export function WhatsAppButton() {
  const [shown, setShown] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setShown(true), 1400);
    const t2 = setTimeout(() => setHintOpen(true), 3200);
    const t3 = setTimeout(() => setHintOpen(false), 10000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed z-50 bottom-5 right-5 sm:bottom-7 sm:right-7 flex items-end gap-2 transition-all duration-500",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      {/* Hint bubble */}
      <div
        className={cn(
          "hidden sm:block mb-1 max-w-[220px] origin-bottom-right transition-all duration-300",
          hintOpen ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
        )}
      >
        <div className="relative bg-surface border border-[var(--border)] shadow-lg rounded-2xl rounded-br-sm px-4 py-3">
          <p className="text-sm text-ink leading-snug">
            Precisa de ajuda? <span className="pen-note">chama no zap 👋</span>
          </p>
          <span className="absolute -bottom-1.5 right-3 w-3 h-3 bg-surface border-r border-b border-[var(--border)] rotate-45" />
        </div>
      </div>

      <a
        href={`${COMPANY.whatsapp}?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20um%20documento.`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com atendente no WhatsApp"
        className="group relative grid place-items-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-8px_rgba(37,211,102,0.6)] hover:scale-105 active:scale-95 transition-transform"
        onMouseEnter={() => {
          if (timer.current) clearTimeout(timer.current);
          setHintOpen(true);
        }}
        onMouseLeave={() => {
          timer.current = setTimeout(() => setHintOpen(false), 1200);
        }}
      >
        {/* ping */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping [animation-duration:2.6s]" />
        <svg viewBox="0 0 32 32" className="relative w-7 h-7 sm:w-8 sm:h-8 fill-current">
          <path d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.56 4.16 1.6 5.96L4 29l8.2-1.56a12 12 0 0 0 3.84.64h.02C22.7 28.08 28 22.68 28 16.04 28 8.4 22.68 3 16.04 3Zm0 21.92c-1.1 0-2.2-.18-3.24-.54l-.24-.08-4.86.92.94-4.74-.16-.24a9.9 9.9 0 0 1-1.52-5.26c0-5.48 4.46-9.94 9.96-9.94 2.66 0 5.16 1.04 7.04 2.92a9.86 9.86 0 0 1 2.92 7.04c0 5.48-4.46 9.94-9.94 9.94Zm5.46-7.44c-.3-.15-1.76-.86-2.04-.96-.28-.1-.48-.15-.68.15-.2.3-.78.96-.96 1.16-.18.2-.36.22-.66.07-.3-.15-1.26-.46-2.4-1.48-.88-.78-1.48-1.76-1.66-2.06-.18-.3-.02-.46.13-.6.13-.13.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.94-2.24-.24-.58-.5-.5-.68-.5l-.58-.02c-.2 0-.53.08-.8.38-.28.3-1.06 1.04-1.06 2.52 0 1.48 1.08 2.92 1.24 3.12.15.2 2.14 3.28 5.2 4.6.72.31 1.3.5 1.74.64.74.23 1.4.2 1.92.12.58-.08 1.76-.72 2.02-1.4.24-.7.24-1.28.16-1.4-.08-.13-.28-.2-.58-.35Z" />
        </svg>
      </a>
    </div>
  );
}
