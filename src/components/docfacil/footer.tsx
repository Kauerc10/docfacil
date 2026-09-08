"use client";

import Link from "next/link";
import { Logo } from "./logo";
import { useNav } from "./nav-context";
import { COMPANY, COMPANY_DATA_IS_PLACEHOLDER } from "@/lib/company";

const COLS = [
  {
    title: "Produto",
    links: [
      { label: "Documentos", href: "/documentos" },
      { label: "Como funciona", href: "/#como-funciona" },
      { label: "Planos e Preços", href: "/planos" },
    ],
  },
  {
    title: "Ajuda e Suporte",
    links: [
      { label: "Central de Ajuda", href: "/ajuda" },
      { label: "Termos de Uso", href: "/termos" },
      { label: "Política de Privacidade", href: "/privacidade" },
      { label: "Política de Cookies", href: "/cookies" },
    ],
  },
];

export function Footer() {
  const { navigate } = useNav();

  return (
    <footer className="relative bg-[var(--navy)] text-white mt-auto">
      {/* WhatsApp banner only shown if company data is verified and not placeholder */}
      {!COMPANY_DATA_IS_PLACEHOLDER && (
        <div className="border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="font-[family-name:var(--font-jakarta)] text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
                Prefere falar com uma pessoa?
              </h3>
              <p className="mt-2 text-white/70 text-lg">
                Atendimento via WhatsApp. Pessoas de verdade por trás do {COMPANY.productName}.
              </p>
            </div>
            <div className="md:justify-self-end">
              <a
                href={COMPANY.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 h-13 px-6 py-3.5 rounded-xl bg-[#25D366] text-white font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_12px_30px_-10px_rgba(37,211,102,0.7)]"
              >
                <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
                  <path d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.56 4.16 1.6 5.96L4 29l8.2-1.56a12 12 0 0 0 3.84.64h.02C22.7 28.08 28 22.68 28 16.04 28 8.4 22.68 3 16.04 3Zm5.46 14.48c-.3-.15-1.76-.86-2.04-.96-.28-.1-.48-.15-.68.15-.2.3-.78.96-.96 1.16-.18.2-.36.22-.66.07-.3-.15-1.26-.46-2.4-1.48-.88-.78-1.48-1.76-1.66-2.06-.18-.3-.02-.46.13-.6.13-.13.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.94-2.24-.24-.58-.5-.5-.68-.5l-.58-.02c-.2 0-.53.08-.8.38-.28.3-1.06 1.04-1.06 2.52 0 1.48 1.08 2.92 1.24 3.12.15.2 2.14 3.28 5.2 4.6.72.31 1.3.5 1.74.64.74.23 1.4.2 1.92.12.58-.08 1.76-.72 2.02-1.4.24-.7.24-1.28.16-1.4-.08-.13-.28-.2-.58-.35Z" />
                </svg>
                {COMPANY.whatsappLabel}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Link columns */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div className="sm:col-span-2">
          <Link
            href="/"
            onClick={() => navigate("home")}
            className="inline-block hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg"
            aria-label="DocFacil — início"
          >
            <Logo variant="footer" />
          </Link>
          <p className="mt-4 text-white/60 text-sm max-w-sm leading-relaxed">
            Documentos organizados e preparados com orientação em cada etapa.
            Modelos para moradia, declarações, procurações e acordos do cotidiano.
          </p>
        </div>

        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="font-semibold text-white/90 text-sm uppercase tracking-wider">
              {c.title}
            </h4>
            <ul className="mt-3 space-y-2.5">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-white/60 hover:text-white text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
            <p>
              © {COMPANY.copyrightRange()} {COMPANY.productName}. {COMPANY.tagline}
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/privacidade"
                className="hover:text-white/80 transition-colors"
              >
                Privacidade
              </Link>
              <Link
                href="/termos"
                className="hover:text-white/80 transition-colors"
              >
                Termos
              </Link>
              <Link
                href="/cookies"
                className="hover:text-white/80 transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-white/5">
            <p className="text-[0.7rem] text-white/40 leading-relaxed text-center sm:text-left">
              {COMPANY.productName} é um produto da{" "}
              <a
                href={COMPANY.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white font-semibold transition-colors underline-offset-2 hover:underline"
              >
                {COMPANY.name}
              </a>
              . Todos os direitos reservados.
            </p>
            <a
              href={COMPANY.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visitar site da ${COMPANY.name}`}
              className="group inline-flex items-center gap-2 text-[0.7rem] text-white/40 hover:text-white/70 transition-colors"
            >
              <span>Powered by</span>
              <span className="inline-flex items-center gap-1.5 font-semibold tracking-wide">
                <span
                  aria-hidden="true"
                  className="inline-block w-5 h-5 rounded-md bg-gradient-to-br from-[var(--blue-royal)] to-[var(--selo-green)] grid place-items-center text-[0.5rem] text-white font-black shadow-sm group-hover:scale-110 transition-transform"
                >
                  K
                </span>
                {COMPANY.shortName}
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
