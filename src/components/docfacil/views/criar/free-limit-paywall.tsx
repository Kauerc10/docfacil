"use client";

import { PLAN_BILLING_DESC } from "@/lib/pricing";

export type AccessPaywallReason =
  | "monthly_limit"
  | "model_not_free"
  | "pro_required";

interface FreeLimitPaywallProps {
  reason: AccessPaywallReason;
  documentName: string;
  onChoosePro: () => void;
  onChooseSingle: () => void;
  onSaveDraft: () => void;
  onContinueEditing: () => void;
}

function getCopy(reason: AccessPaywallReason, documentName: string) {
  if (reason === "model_not_free") {
    return {
      eyebrow: "Modelo fora da seleção grátis",
      title: `${documentName} não está entre os modelos gratuitos deste mês.`,
      description:
        "Nada foi perdido. Seu preenchimento continua aqui e você pode concluir com o Pro, comprar este documento ou salvar como rascunho.",
    };
  }
  if (reason === "pro_required") {
    return {
      eyebrow: "Recurso do Plano Pro",
      title: "Editar e gerar uma nova versão de documento salvo é um recurso Pro.",
      description:
        "Suas alterações continuam preenchidas. Você pode ativar o Pro, salvar como rascunho ou continuar revisando antes de decidir.",
    };
  }
  return {
    eyebrow: "Geração grátis já utilizada",
    title: "Sua geração gratuita deste mês já foi usada.",
    description:
      "Nada foi perdido. Seu preenchimento continua aqui e você pode concluir com o Pro, comprar este documento ou salvar como rascunho.",
  };
}

export function FreeLimitPaywall({
  reason,
  documentName,
  onChoosePro,
  onChooseSingle,
  onSaveDraft,
  onContinueEditing,
}: FreeLimitPaywallProps) {
  const copy = getCopy(reason, documentName);
  const allowSingle = reason !== "pro_required";

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[var(--navy)]/45 p-4 backdrop-blur-[3px]"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-paywall-title"
        aria-describedby="access-paywall-description"
        className="w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--border)] bg-surface shadow-[0_30px_90px_-30px_rgba(14,35,64,0.55)]"
      >
        <div className="border-b border-[var(--border)] bg-[var(--blue-soft)]/45 px-6 py-6 sm:px-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[var(--blue-royal)]">
                {copy.eyebrow}
              </p>
              <h2
                id="access-paywall-title"
                className="mt-1.5 font-[family-name:var(--font-jakarta)] text-2xl font-extrabold tracking-tight text-ink sm:text-3xl"
              >
                {copy.title}
              </h2>
              <p
                id="access-paywall-description"
                className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/65 sm:text-base"
              >
                {copy.description}
              </p>
              {reason !== "pro_required" && (
                <p className="mt-2 text-xs text-ink/50">
                  Os modelos gratuitos podem mudar a cada mês.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onContinueEditing}
              aria-label="Fechar e continuar editando"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--border)] text-xl text-ink/55 transition-colors hover:bg-surface hover:text-ink"
            >
              ×
            </button>
          </div>
        </div>

        <div className={`grid gap-4 p-6 sm:p-8 ${allowSingle ? "sm:grid-cols-2" : "max-w-xl mx-auto"}`}>
          <article className="relative rounded-2xl border-2 border-[var(--blue-royal)] bg-[var(--blue-soft)]/35 p-5">
            <span className="absolute right-4 top-4 rounded-full bg-[var(--blue-royal)] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white">
              Mais liberdade
            </span>
            <p className="text-sm font-bold text-[var(--blue-royal)]">Plano Pro</p>
            <h3 className="mt-5 text-xl font-bold text-ink">Documentos ilimitados</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">
              Gere qualquer modelo e edite documentos salvos criando novas versões quando precisar.
            </p>
            <p className="mt-5 text-lg font-extrabold text-ink">{PLAN_BILLING_DESC.pro}</p>
            <button
              type="button"
              onClick={onChoosePro}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[var(--blue-royal)] px-4 font-bold text-white transition-all hover:bg-[#1e44a8] active:scale-[0.99]"
            >
              Assinar Pro
            </button>
          </article>

          {allowSingle && (
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--paper)]/55 p-5">
              <p className="text-sm font-bold text-ink/55">Documento avulso</p>
              <h3 className="mt-5 text-xl font-bold text-ink">Só preciso deste agora</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                Libere este documento sem mudar seu plano mensal e sem assinatura recorrente.
              </p>
              <p className="mt-5 text-lg font-extrabold text-ink">{PLAN_BILLING_DESC.avulso}</p>
              <button
                type="button"
                onClick={onChooseSingle}
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl border border-[var(--blue-royal)]/35 bg-surface px-4 font-bold text-[var(--blue-royal)] transition-colors hover:bg-[var(--blue-soft)]"
              >
                Comprar documento avulso
              </button>
            </article>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--paper)]/45 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-sm font-semibold text-ink">Quer decidir depois?</p>
            <p className="mt-0.5 text-xs text-ink/55">
              Salve o preenchimento na sua conta e retome em Meus Documentos.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onContinueEditing}
              className="h-10 rounded-xl px-4 text-sm font-semibold text-ink/65 transition-colors hover:bg-surface hover:text-ink"
            >
              Continuar editando
            </button>
            <button
              type="button"
              onClick={onSaveDraft}
              className="h-10 rounded-xl border border-[var(--border)] bg-surface px-4 text-sm font-bold text-ink transition-colors hover:bg-[var(--blue-soft)]"
            >
              Salvar como rascunho
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
