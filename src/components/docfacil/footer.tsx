"use client";

import { Selo } from "./selo";

const COLS = [
  {
    title: "Produto",
    links: ["Modelos", "Gerador com IA", "Planos", "Meus Documentos"],
  },
  {
    title: "Empresa",
    links: ["Sobre o DocFacil", "Blog", "Carreiras", "Imprensa"],
  },
  {
    title: "Suporte",
    links: ["Central de ajuda", "Falar com atendente", "Status", "Termos"],
  },
];

export function Footer() {
  return (
    <footer id="planos" className="relative bg-[var(--navy)] text-white mt-auto">
      {/* Big "talk to a human" band — the DocFacil differentiator */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="font-[family-name:var(--font-jakarta)] text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
              Prefere falar com uma pessoa?
            </h3>
            <p className="mt-2 text-white/70 text-lg">
              A gente atende no WhatsApp. Sem fila de menu, sem robô. Pessoas de
              verdade por trás do DocFacil.
            </p>
          </div>
          <div className="md:justify-self-end">
            <a
              href="https://wa.me/5511999990000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 h-13 px-6 py-3.5 rounded-xl bg-[#25D366] text-white font-bold text-base hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_12px_30px_-10px_rgba(37,211,102,0.7)]"
            >
              <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
                <path d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.56 4.16 1.6 5.96L4 29l8.2-1.56a12 12 0 0 0 3.84.64h.02C22.7 28.08 28 22.68 28 16.04 28 8.4 22.68 3 16.04 3Zm5.46 14.48c-.3-.15-1.76-.86-2.04-.96-.28-.1-.48-.15-.68.15-.2.3-.78.96-.96 1.16-.18.2-.36.22-.66.07-.3-.15-1.26-.46-2.4-1.48-.88-.78-1.48-1.76-1.66-2.06-.18-.3-.02-.46.13-.6.13-.13.3-.36.45-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.94-2.24-.24-.58-.5-.5-.68-.5l-.58-.02c-.2 0-.53.08-.8.38-.28.3-1.06 1.04-1.06 2.52 0 1.48 1.08 2.92 1.24 3.12.15.2 2.14 3.28 5.2 4.6.72.31 1.3.5 1.74.64.74.23 1.4.2 1.92.12.58-.08 1.76-.72 2.02-1.4.24-.7.24-1.28.16-1.4-.08-.13-.28-.2-.58-.35Z" />
              </svg>
              Chama no zap
            </a>
          </div>
        </div>
      </div>

      {/* Link columns */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <a href="#topo" className="flex items-center gap-2.5">
            <Selo variant="mark" className="w-7 h-7 [&_*]:!text-white" />
            <span className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold tracking-tight">
              Doc<span className="text-[var(--blue-soft)]">Facil</span>
            </span>
          </a>
          <p className="mt-4 text-white/60 text-sm max-w-xs leading-relaxed">
            Documentos legais prontos como numa conversa. Sem juridiquês, com
            gente de verdade por trás.
          </p>
        </div>

        {COLS.map((c) => (
          <div key={c.title}>
            <h4 className="font-semibold text-white/90 text-sm uppercase tracking-wider">
              {c.title}
            </h4>
            <ul className="mt-3 space-y-2.5">
              {c.links.map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-white/60 hover:text-white text-sm transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <p>© {new Date().getFullYear()} DocFacil. Documentos com validade legal.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white/80 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white/80 transition-colors">Termos</a>
            <a href="#" className="hover:text-white/80 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
