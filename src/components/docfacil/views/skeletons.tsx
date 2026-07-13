"use client";

/**
 * Skeletons compartilhados para os estados de loading das views que
 * dependem do services layer (getModels / getModel / getDocument).
 *
 * Mantêm o layout medido (mesmo grid, mesma aspect-ratio do A4) pra que
 * a página não "pule" quando os dados chegam — a transição loading →
 * conteúdo fica visualmente contínua.
 */

/** Pulso base reutilizável (usa o token --blue-soft p/ não brigar com a paleta). */
function pulse(className: string) {
  return `animate-pulse ${className}`;
}

/** Card de modelo — formato e proporções idênticas ao .doc-card real. */
export function DocCardSkeleton() {
  return (
    <div
      className={pulse(
        "doc-card p-6 flex flex-col border border-[var(--border)] rounded-[var(--radius)]"
      )}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between">
        <div className="w-14 h-14 rounded-xl bg-[var(--blue-soft)]/70" />
        <div className="h-6 w-20 rounded-full bg-[var(--paper)] border border-[var(--border)]" />
      </div>
      <div className="mt-5 h-6 w-3/4 rounded-md bg-[var(--blue-soft)]/60" />
      <div className="mt-3 h-4 w-full rounded-md bg-[var(--blue-soft)]/40" />
      <div className="mt-2 h-4 w-2/3 rounded-md bg-[var(--blue-soft)]/40" />
      <div className="mt-auto pt-4 border-t border-[var(--border)]/70 flex items-center justify-between">
        <div className="h-4 w-14 rounded-md bg-[var(--blue-soft)]/50" />
        <div className="h-4 w-24 rounded-md bg-[var(--blue-soft)]/50" />
      </div>
    </div>
  );
}

/** Grade de N cards — usa 6 por padrão (mesma contagem do catálogo inicial). */
export function DocGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando modelos"
      className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <DocCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Esqueleto da coluna esquerda da página de detalhe (info + checklist). */
export function DetalheInfoSkeleton() {
  return (
    <div aria-hidden="true" className={pulse("space-y-6")}>
      <div className="h-6 w-24 rounded-full bg-[var(--blue-soft)]/70" />
      <div className="h-10 w-3/4 rounded-md bg-[var(--blue-soft)]/60" />
      <div className="space-y-2">
        <div className="h-4 w-40 rounded-md bg-[var(--green-tint)]" />
        <div className="h-4 w-full rounded-md bg-[var(--blue-soft)]/40" />
        <div className="h-4 w-5/6 rounded-md bg-[var(--blue-soft)]/40" />
      </div>
      <div className="space-y-3 pt-2">
        <div className="h-4 w-44 rounded-md bg-[var(--blue-soft)]/60" />
        <div className="rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)]/70 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-[var(--green-tint)]" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="h-4 w-2/3 rounded-md bg-[var(--blue-soft)]/50" />
                <div className="h-3 w-1/2 rounded-md bg-[var(--blue-soft)]/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="h-14 w-44 rounded-2xl bg-[var(--blue-royal)]/30" />
    </div>
  );
}

/** Esqueleto da folha A4 (mesma aspect-ratio). */
export function A4Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={pulse(
        `relative w-full aspect-[1/1.414] bg-white rounded-md shadow-[0_10px_40px_-12px_rgba(14,35,64,0.18)] border border-[var(--border)] overflow-hidden ${className}`
      )}
    >
      <div className="h-full p-[8%] flex flex-col">
        <div className="mx-auto h-3 w-32 rounded bg-[var(--blue-soft)]/70" />
        <div className="mx-auto mt-3 h-px w-16 bg-ink/10" />
        <div className="mt-5 space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-2.5 rounded bg-[var(--blue-soft)]/55"
              style={{ width: `${72 + ((i * 13) % 28)}%` }}
            />
          ))}
        </div>
        <div className="mt-auto pt-3 grid grid-cols-2 gap-3">
          <div className="h-6 border-t border-ink/15" />
          <div className="h-6 border-t border-ink/15" />
        </div>
      </div>
    </div>
  );
}

/** Container de erro padrão — ícone + mensagem + retry. */
export function ErrorState({
  message,
  onRetry,
  retryLabel = "Tentar novamente",
}: {
  message: string;
  onRetry: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role="alert"
      className="mt-10 mx-auto max-w-xl text-center bg-surface border border-[var(--border)] rounded-2xl px-6 py-12"
    >
      <div className="mx-auto grid place-items-center w-12 h-12 rounded-full bg-[var(--coral)]/12 text-[var(--coral)]">
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
          <path
            d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="mt-4 font-[family-name:var(--font-jakarta)] text-xl font-bold text-ink">
        Algo deu errado
      </h3>
      <p className="mt-2 text-ink/65">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[var(--blue-royal)] text-white font-semibold hover:bg-[var(--navy)] transition-colors"
      >
        {retryLabel}
      </button>
    </div>
  );
}
