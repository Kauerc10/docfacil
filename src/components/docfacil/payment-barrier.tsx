"use client";

import {
  Download,
  FileText,
  LogIn,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useNav } from "./nav-context";
import { PLAN_PRICES } from "@/lib/services/checkout-service";
import { isMonthlyFreeModel } from "@/lib/document-access-policy";

export interface PaymentBarrierProps {
  documentoNome: string;
  slug: string;
  docId?: string;
  onLogin?: () => void;
}

export function PaymentBarrier({
  documentoNome,
  slug,
  docId,
  onLogin,
}: PaymentBarrierProps) {
  const { navigate } = useNav();
  const eligibleForFree = isMonthlyFreeModel(slug);
  const priceLabel = PLAN_PRICES.avulso.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const included = [
    { icon: FileText, text: "PDF completo, sem marca d'água" },
    { icon: Zap, text: "Download imediato após o pagamento" },
    { icon: ShieldCheck, text: "Estrutura e formatação final do documento" },
    { icon: Sparkles, text: "Pagamento único, sem assinatura" },
  ];

  function handlePayClick() {
    navigate("checkout", { plan: "avulso", slug, docId });
  }

  function handleLogin() {
    if (onLogin) {
      onLogin();
      return;
    }
    navigate("login");
  }

  return (
    <section className="px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl bg-surface border-2 border-[var(--coral)]/40 shadow-[0_18px_44px_-18px_rgba(255,106,77,0.45)] overflow-hidden">
          <div className="bg-gradient-to-br from-[var(--coral)]/8 to-transparent px-6 py-5 border-b border-[var(--coral)]/15">
            <div className="flex items-start gap-3.5">
              <span
                className="grid place-items-center w-11 h-11 rounded-xl bg-[var(--coral)]/15 text-[var(--coral)] shrink-0"
                aria-hidden="true"
              >
                <Download className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[var(--coral)] font-semibold text-xs uppercase tracking-wider">
                  Quase lá!
                </p>
                <h3 className="mt-0.5 font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink leading-tight">
                  Libere o PDF completo
                </h3>
                <p className="mt-1 text-sm text-ink/65 leading-snug">
                  Documento:{" "}
                  <span className="font-semibold text-ink">{documentoNome}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <ul className="space-y-2.5">
              {included.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-sm text-ink/80">
                  <span
                    className="mt-0.5 grid place-items-center w-5 h-5 rounded-full bg-[var(--green-tint)] text-[var(--selo-green)] shrink-0"
                    aria-hidden="true"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handlePayClick}
              className="mt-5 w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[var(--coral)] px-6 py-3.5 text-white font-bold text-base hover:bg-[var(--coral-hover)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--coral)]/30"
            >
              <Download className="w-5 h-5" aria-hidden="true" />
              Comprar por {priceLabel}
            </button>

            <button
              type="button"
              onClick={handleLogin}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-[var(--blue-royal)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] rounded px-2 py-1"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              {eligibleForFree
                ? "Entrar ou criar conta para usar a geração grátis"
                : "Já tem conta? Entre para continuar"}
            </button>

            {eligibleForFree && (
              <p className="mt-2 text-center text-xs text-[var(--selo-green)]/90 leading-relaxed">
                Este modelo está grátis neste mês para contas elegíveis, limitado a 1 geração gratuita mensal.
              </p>
            )}

            <p className="mt-3 text-center text-xs text-ink/45 leading-relaxed">
              Avulso sem conta obrigatória. Os modelos gratuitos selecionados podem mudar a cada mês.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
