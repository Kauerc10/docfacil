"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * DocFacil logo = the brand PNG (a "D" formed by a stamp + pen) used as the
 * first letter of the wordmark, so it reads  [D-png]ocFacil.
 *
 * The PNG already depicts the letter D, so we drop the separate icon and let
 * the image BE the D — the rest of the word ("ocFacil") is rendered as text
 * right beside it. This is the requested "logo ocFacil" effect.
 *
 * Variants:
 *  - "header"   : default, for the sticky header (light context)
 *  - "footer"   : on navy background (forces light text + the PNG keeps its
 *                 own colors, which read well on dark too)
 *  - "compact"  : icon only (favicon-style), for tight spaces
 */
type LogoProps = {
  variant?: "header" | "footer" | "compact";
  className?: string;
};

export function Logo({ variant = "header", className }: LogoProps) {
  if (variant === "compact") {
    return (
      <Image
        src="/logo-docfacil.png"
        alt="DocFacil"
        width={32}
        height={32}
        priority
        className={cn("object-contain", className)}
      />
    );
  }

  const isFooter = variant === "footer";

  return (
    <span className={cn("inline-flex items-center gap-0 select-none", className)}>
      {/* The PNG is the "D" */}
      <Image
        src="/logo-docfacil.png"
        alt=""
        width={isFooter ? 38 : 36}
        height={isFooter ? 38 : 36}
        priority
        className="object-contain -mr-1 shrink-0"
      />
      {/* "ocFacil" — the rest of the wordmark */}
      <span
        className={[
          "font-[family-name:var(--font-jakarta)] font-extrabold tracking-tight leading-none",
          isFooter ? "text-white text-[1.35rem]" : "text-ink text-[1.35rem]",
        ].join(" ")}
      >
        oc
        <span className={isFooter ? "text-[var(--blue-soft)]" : "text-[var(--blue-royal)]"}>
          Facil
        </span>
      </span>
    </span>
  );
}
