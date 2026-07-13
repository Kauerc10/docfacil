"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * PageShell — wrapper padronizado para todas as "telas" internas.
 *
 * - Adiciona o padding-top para não ficar embaixo do header fixo (72px).
 * - Faz a entrada suave da página (fade + slide-up) via GSAP, respeitando
 *   prefers-reduced-motion.
 * - Mantém min-height para o footer sempre grudar no bottom.
 */
export function PageShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        root.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }
      );
    },
    { scope: root }
  );

  return (
    <div ref={root} className={`pt-[72px] ${className}`}>
      {children}
    </div>
  );
}

/** Cabeçalho de página interno — eyebrow + título + subtítulo. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      {eyebrow && (
        <p className="text-[var(--selo-green)] font-semibold text-sm uppercase tracking-wider">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-ink tracking-tight text-balance">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-ink/65 text-lg leading-relaxed text-pretty">
          {subtitle}
        </p>
      )}
    </div>
  );
}
