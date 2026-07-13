"use client";

import { useState, type FormEvent } from "react";
import { ChevronLeft, User as UserIcon, Mail, Phone, Camera, CreditCard, Check } from "lucide-react";
import { useNav } from "@/components/docfacil/nav-context";
import { PageShell, PageHeader } from "@/components/docfacil/views/page-shell";

/** Helper: a single styled text field with leading icon. */
function Field({
  id,
  label,
  type = "text",
  defaultValue,
  autoComplete,
  icon: Icon,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40"
          aria-hidden="true"
        />
        <input
          id={id}
          type={type}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          className="w-full h-12 pl-11 pr-4 text-lg rounded-lg border border-[var(--border)] bg-paper focus:bg-surface outline-none focus:border-[var(--blue-royal)] focus:ring-4 focus:ring-[var(--blue-soft)] transition"
        />
      </div>
    </div>
  );
}

const PAGAMENTOS = [
  { date: "15/07/2026", valor: "R$ 29,90", status: "Pago" },
  { date: "15/06/2026", valor: "R$ 29,90", status: "Pago" },
  { date: "15/05/2026", valor: "R$ 29,90", status: "Pago" },
];

/**
 * PerfilView (spec 4.11) — account / profile.
 * Two-column layout: dados pessoais (left) + plano, histórico e cancelamento (right).
 *
 * The cancel-subscription section is intentionally NOT hidden behind menus
 * or confirmations — transparency is brand credibility.
 */
export function PerfilView() {
  const { navigate } = useNav();
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Prototype: simulate a save.
    setSaving(true);
    window.setTimeout(() => setSaving(false), 900);
  }

  return (
    <PageShell className="bg-paper min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Voltar */}
        <button
          type="button"
          onClick={() => navigate("dashboard")}
          className="inline-flex items-center gap-1 text-sm font-medium text-ink/70 hover:text-ink transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] rounded-md px-1.5 py-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="mt-4">
          <PageHeader
            eyebrow="Sua conta"
            title="Perfil e configurações"
            subtitle="Mantenha seus dados atualizados para receber seus documentos e recibos sem erro."
          />
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-8">
          {/* LEFT — Dados pessoais */}
          <section
            aria-labelledby="perfil-dados-heading"
            className="bg-surface border border-[var(--border)] rounded-2xl p-6 sm:p-8"
          >
            <h2
              id="perfil-dados-heading"
              className="font-[family-name:var(--font-jakarta)] text-xl font-bold text-ink"
            >
              Dados pessoais
            </h2>

            {/* Avatar */}
            <div className="mt-5 flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full bg-[var(--blue-soft)] text-[var(--blue-royal)] grid place-items-center font-[family-name:var(--font-jakarta)] font-extrabold text-xl select-none"
                aria-hidden="true"
              >
                JS
              </div>
              <div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-[var(--border)] bg-paper text-ink text-sm font-semibold hover:bg-[var(--blue-soft)]/60 transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
                >
                  <Camera className="w-4 h-4" />
                  Trocar foto
                </button>
                <p className="mt-1.5 text-xs text-ink/50">JPG ou PNG, até 2 MB.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <Field
                id="perfil-name"
                label="Nome completo"
                defaultValue="João Silva"
                autoComplete="name"
                icon={UserIcon}
              />
              <Field
                id="perfil-email"
                label="E-mail"
                type="email"
                defaultValue="joao@email.com"
                autoComplete="email"
                icon={Mail}
              />
              <Field
                id="perfil-phone"
                label="Telefone"
                type="tel"
                defaultValue="(11) 99999-0000"
                autoComplete="tel"
                icon={Phone}
              />

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-[var(--blue-royal)] text-white font-semibold text-base hover:bg-[var(--navy)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Check className="w-5 h-5" />
                      Salvo!
                    </>
                  ) : (
                    "Salvar alterações"
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* RIGHT — Plano, histórico, cancelamento */}
          <div className="space-y-6">
            {/* Plano atual */}
            <section
              aria-labelledby="perfil-plano-heading"
              className="bg-surface border border-[var(--border)] rounded-2xl p-6 sm:p-7"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--selo-green)]">
                    Plano atual
                  </p>
                  <h2
                    id="perfil-plano-heading"
                    className="mt-1 font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-ink"
                  >
                    Plano Pro
                  </h2>
                  <p className="mt-1 text-sm text-ink/65">
                    R$ 29,90/mês · Renova em 15/08/2026
                  </p>
                </div>
                <CreditCard
                  className="w-7 h-7 text-[var(--blue-royal)] shrink-0"
                  aria-hidden="true"
                />
              </div>

              <button
                type="button"
                onClick={() => navigate("planos")}
                className="mt-5 w-full h-11 rounded-lg border border-[var(--blue-royal)] text-[var(--blue-royal)] font-semibold text-sm hover:bg-[var(--blue-soft)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
              >
                Gerenciar plano
              </button>
            </section>

            {/* Histórico de pagamentos */}
            <section
              aria-labelledby="perfil-historico-heading"
              className="bg-surface border border-[var(--border)] rounded-2xl p-6 sm:p-7"
            >
              <h2
                id="perfil-historico-heading"
                className="font-[family-name:var(--font-jakarta)] text-lg font-bold text-ink"
              >
                Histórico de pagamentos
              </h2>
              <ul className="mt-4 divide-y divide-[var(--border)]">
                {PAGAMENTOS.map((p) => (
                  <li
                    key={p.date}
                    className="flex items-center justify-between py-3 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {p.date}
                      </p>
                      <p className="text-xs text-ink/55">Plano Pro mensal</p>
                    </div>
                    <span className="text-sm font-semibold text-ink tabular-nums">
                      {p.valor}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--green-tint)] text-[var(--selo-green)]"
                      aria-label={`Status: ${p.status}`}
                    >
                      <Check className="w-3 h-3" />
                      {p.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Cancelamento — claro, sem dark pattern */}
            <section
              aria-labelledby="perfil-cancelar-heading"
              className="bg-surface border border-[var(--border)] rounded-2xl p-6 sm:p-7"
            >
              <h2
                id="perfil-cancelar-heading"
                className="font-[family-name:var(--font-jakarta)] text-lg font-bold text-ink"
              >
                Cancelar assinatura
              </h2>
              <p className="mt-2 text-sm text-ink/65 leading-relaxed text-pretty">
                Você manterá acesso até o fim do período já pago. Sem multas,
                sem burocracia.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center text-sm font-semibold text-[var(--coral)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--coral)] rounded px-1 py-0.5"
              >
                Cancelar assinatura
              </button>
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
