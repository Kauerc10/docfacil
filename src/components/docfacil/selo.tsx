"use client";

import { cn } from "@/lib/utils";

/**
 * Selo — the notarial stamp that is DocFacil's brand signature.
 * Used as a credibility mark, watermark, and (in success screens) the climax animation.
 *
 * Variantes:
 *  - "mark"      : ícone compacto (header, badges)
 *  - "credibility": selo tracejado com texto circular (hero)
 *  - "watermark" : marca d'água grande para previews de documento
 */
type SeloProps = {
  variant?: "mark" | "credibility" | "watermark";
  className?: string;
  label?: string;
};

export function Selo({
  variant = "mark",
  className,
  label = "documento com validade legal",
}: SeloProps) {
  if (variant === "watermark") {
    return (
      <div className={cn("selo-watermark", className)} aria-hidden="true">
        <SeloGlyph className="w-1/3 h-1/3 opacity-70" />
      </div>
    );
  }

  if (variant === "credibility") {
    return (
      <div
        className={cn(
          "relative grid place-items-center select-none",
          className
        )}
        aria-label={`Selo: ${label}`}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <defs>
            <path
              id="selo-arc"
              d="M 60,60 m -44,0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
              fill="none"
            />
          </defs>
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--blue-royal)"
            strokeWidth="1.4"
            strokeDasharray="3 4"
            opacity="0.85"
          />
          <circle
            cx="60"
            cy="60"
            r="44"
            fill="none"
            stroke="var(--blue-royal)"
            strokeWidth="1"
            opacity="0.5"
          />
          <text
            fill="var(--ink)"
            fontSize="9.2"
            fontWeight="600"
            letterSpacing="1.4"
            fontFamily="var(--font-jakarta), sans-serif"
          >
            <textPath href="#selo-arc" startOffset="0%">
              {label.toUpperCase()} · DOCFACIL ·{" "}
            </textPath>
          </text>
        </svg>
        <SeloGlyph className="absolute w-7 h-7 text-[var(--blue-royal)]" />
      </div>
    );
  }

  // mark
  return <SeloGlyph className={cn("w-6 h-6 text-[var(--blue-royal)]", className)} />;
}

/** The glyph drawn from scratch — a sealed envelope + stamp notch.
 *  Not a generic icon-pack shape. */
function SeloGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="4"
        y="8"
        width="24"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4 10 L16 18 L28 10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="24"
        cy="22"
        r="6.5"
        fill="var(--selo-green)"
        opacity="0.95"
      />
      <circle
        cx="24"
        cy="22"
        r="6.5"
        fill="none"
        stroke="var(--surface)"
        strokeWidth="1"
        strokeDasharray="1.5 1.5"
      />
      <path
        d="M21.5 22 L23.3 23.8 L26.8 20.2"
        stroke="var(--surface)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
