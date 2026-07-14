"use client";

import { useEffect, useState } from "react";
import { Cookie, Settings2, X } from "lucide-react";
import {
  getCookiePreferences,
  saveCookiePreferences,
  type CookiePreferences,
} from "@/lib/services/consent-service";
import { useNav } from "./nav-context";

/**
 * CookieBanner — banner bottom-fixed para coletar o consentimento de
 * cookies do usuário.
 *
 * - Verifica `getCookiePreferences()` no mount; se já houver preferência
 *   salva, o banner não aparece.
 * - 3 ações principais:
 *   - **Personalizar**: expande os toggles (Essenciais disabled/true,
 *     Analíticos, Marketing) e mostra o botão "Salvar preferências".
 *   - **Recusar opcionais**: salva com analytics=false, marketing=false.
 *   - **Aceitar todos**: salva com analytics=true, marketing=true.
 * - Animação CSS slide-up/fade (data-state=open). Respeita
 *   prefers-reduced-motion via media query global do globals.css.
 */
export function CookieBanner() {
  const { navigate } = useNav();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // Lê o estado salvo ao montar — só mostra se ainda não decidiu.
  useEffect(() => {
    const prefs = getCookiePreferences();
    if (!prefs) {
      // Pequeno delay para o banner não aparecer "no nariz" do usuário
      // (deixa a página respirar antes de pedir decisão).
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function persist(prefs: CookiePreferences) {
    saveCookiePreferences(prefs);
    setVisible(false);
    setExpanded(false);
  }

  function acceptAll() {
    persist({
      essential: true,
      analytics: true,
      marketing: true,
      acceptedAt: Date.now(),
    });
  }

  function rejectOptional() {
    persist({
      essential: true,
      analytics: false,
      marketing: false,
      rejectedAt: Date.now(),
    });
  }

  function saveCustom() {
    persist({
      essential: true,
      analytics,
      marketing,
      acceptedAt: Date.now(),
    });
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentimento de cookies"
      data-state={visible ? "open" : "closed"}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-5 sm:pb-5 pointer-events-none"
    >
      <div
        className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-surface shadow-[0_20px_50px_-12px_rgba(14,35,64,0.35)] overflow-hidden docfacil-cookie-banner"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3.5">
            <span
              className="grid place-items-center w-10 h-10 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)] shrink-0"
              aria-hidden="true"
            >
              <Cookie className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-[family-name:var(--font-jakarta)] text-base sm:text-lg font-bold text-ink leading-tight">
                A gente usa cookies
              </h2>
              <p className="mt-1 text-sm text-ink/65 leading-relaxed">
                Cookies essenciais são sempre necessários para a plataforma
                funcionar. Já os analíticos e de marketing são opcionais —
                você decide.{" "}
                <button
                  type="button"
                  onClick={() => navigate("cookies")}
                  className="text-[var(--blue-royal)] font-medium hover:underline"
                >
                  Saiba mais
                </button>
              </p>
            </div>
            <button
              type="button"
              onClick={rejectOptional}
              aria-label="Fechar e recusar opcionais"
              className="shrink-0 rounded-md p-1.5 text-ink/45 hover:text-ink hover:bg-paper transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Toggles (aparecem quando "Personalizar" é clicado) */}
          {expanded && (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-paper p-4 space-y-3">
              <CookieToggle
                id="cookie-essential"
                label="Essenciais"
                description="Login, sessão e funcionalidades básicas. Sempre ativos."
                checked
                disabled
              />
              <CookieToggle
                id="cookie-analytics"
                label="Analíticos"
                description="Métricas agregadas para melhorar o produto."
                checked={analytics}
                onChecked={setAnalytics}
              />
              <CookieToggle
                id="cookie-marketing"
                label="Marketing"
                description="Anúncios relevantes e medição de campanhas."
                checked={marketing}
                onChecked={setMarketing}
              />
              <button
                type="button"
                onClick={saveCustom}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--blue-royal)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--navy)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
              >
                Salvar preferências
              </button>
            </div>
          )}

          {/* Ações principais */}
          {!expanded && (
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={acceptAll}
                className="flex-1 inline-flex items-center justify-center rounded-lg bg-[var(--coral)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--coral-hover)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--coral)]/30"
              >
                Aceitar todos
              </button>
              <button
                type="button"
                onClick={rejectOptional}
                className="flex-1 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-paper transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
              >
                Recusar opcionais
              </button>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-expanded={expanded}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-paper transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
              >
                <Settings2 className="w-4 h-4" aria-hidden="true" />
                Personalizar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CookieToggle({
  id,
  label,
  description,
  checked,
  disabled,
  onChecked,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChecked?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className={`block text-sm font-semibold ${
            disabled ? "text-ink/50" : "text-ink"
          }`}
        >
          {label}
          {disabled && (
            <span className="ml-2 text-xs font-medium text-ink/45">
              (sempre ativo)
            </span>
          )}
        </label>
        <p className="mt-0.5 text-xs text-ink/55 leading-snug">{description}</p>
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={`Ativar ${label}`}
        disabled={disabled}
        onClick={() => onChecked?.(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] ${
          checked ? "bg-[var(--selo-green)]" : "bg-[var(--border)]"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
