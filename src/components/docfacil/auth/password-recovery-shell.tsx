import { Logo } from "@/components/docfacil/logo";
import {
  PasswordRecoveryVisual,
  type PasswordRecoveryVisualVariant,
} from "./password-recovery-visual";

export function PasswordRecoveryShell({
  eyebrow,
  title,
  description,
  children,
  visual = "recovery",
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: React.ReactNode;
  visual?: PasswordRecoveryVisualVariant;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-paper px-4 py-10 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-[var(--blue-soft)]/55 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <a
          href="/"
          aria-label="Voltar para o início do DocFácil"
          className="mx-auto mb-7 inline-flex rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
        >
          <Logo variant="header" />
        </a>

        <section className="w-full rounded-2xl border border-[var(--border)] bg-surface p-7 shadow-[0_18px_55px_-18px_rgba(14,35,64,0.24)] sm:p-8">
          <PasswordRecoveryVisual variant={visual} />

          {eyebrow && (
            <p className="mt-5 text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--selo-green)]">
              {eyebrow}
            </p>
          )}

          <h1 className="mt-2 text-center font-[family-name:var(--font-jakarta)] text-3xl font-extrabold tracking-tight text-ink text-balance">
            {title}
          </h1>
          <p className="mt-3 text-center text-base leading-relaxed text-ink/65 text-pretty">
            {description}
          </p>

          <div className="mt-7">{children}</div>
        </section>
      </div>
    </main>
  );
}
