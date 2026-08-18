"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { validatePassword } from "firebase/auth";
import { PasswordRecoveryShell } from "@/components/docfacil/auth/password-recovery-shell";
import { auth } from "@/lib/firebase";
import { validateSignupPassword } from "@/lib/auth/password-policy";
import {
  completePasswordReset,
  maskEmail,
  verifyPasswordReset,
} from "@/lib/auth/password-reset";

type ResetState =
  | "checking"
  | "form"
  | "saving"
  | "success"
  | "invalid"
  | "error";

function isInvalidActionError(error: unknown): boolean {
  const code = (error as { code?: string })?.code || "";
  return (
    code === "auth/expired-action-code" ||
    code === "auth/invalid-action-code" ||
    code === "auth/user-disabled" ||
    code === "auth/user-not-found"
  );
}

export function PasswordResetForm({ code }: { code: string | null }) {
  const [state, setState] = useState<ResetState>(code ? "checking" : "invalid");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    let cancelled = false;
    void verifyPasswordReset(code)
      .then((result) => {
        if (cancelled) return;
        setEmail(result.email);
        setState("form");
      })
      .catch(() => {
        if (!cancelled) setState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code || state === "saving") return;

    setError(null);

    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    const policyError = await validateSignupPassword(password, {
      validateFirebasePassword: async () => {
        if (!auth) return { isValid: true };
        return validatePassword(auth, password);
      },
    });

    if (policyError) {
      setError(policyError);
      return;
    }

    setState("saving");

    try {
      await completePasswordReset(code, password);
      setPassword("");
      setConfirmation("");
      setState("success");
    } catch (resetError) {
      if (isInvalidActionError(resetError)) {
        setState("invalid");
        return;
      }

      setError(
        "Não foi possível salvar sua nova senha agora. Tente novamente em instantes."
      );
      setState("error");
    }
  }

  if (state === "checking") {
    return (
      <PasswordRecoveryShell
        eyebrow="Segurança da conta"
        title="Validando seu acesso"
        description="Só um instante enquanto confirmamos que este acesso ainda é válido."
        visual="reset"
      >
        <div
          role="status"
          className="flex items-center justify-center gap-2 text-sm font-medium text-ink/65"
        >
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          Verificando...
        </div>
      </PasswordRecoveryShell>
    );
  }

  if (state === "invalid") {
    return (
      <PasswordRecoveryShell
        eyebrow="Segurança da conta"
        title="Esse link não é mais válido"
        description="Por segurança, links de recuperação têm validade limitada. Solicite um novo acesso para continuar."
        visual="invalid"
      >
        <a
          href="/esqueci-senha"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--blue-royal)] px-5 text-base font-semibold text-white transition hover:bg-[var(--navy)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          Solicitar novo link
        </a>
        <a
          href="/?view=login"
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-[var(--blue-royal)] transition hover:bg-[var(--blue-soft)]/55 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para entrar
        </a>
      </PasswordRecoveryShell>
    );
  }

  if (state === "success") {
    return (
      <PasswordRecoveryShell
        eyebrow="Tudo certo"
        title="Senha atualizada!"
        description="Sua nova senha já pode ser usada para acessar sua conta."
        visual="success"
      >
        <div className="rounded-xl border border-[var(--selo-green)]/20 bg-[var(--green-tint)]/55 px-4 py-4 text-center">
          <CheckCircle2
            className="mx-auto h-5 w-5 text-[var(--selo-green)]"
            aria-hidden="true"
          />
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            A alteração foi concluída com segurança.
          </p>
        </div>
        <a
          href="/?view=login"
          className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-lg bg-[var(--blue-royal)] px-5 text-base font-semibold text-white transition hover:bg-[var(--navy)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
        >
          Entrar no DocFácil
        </a>
      </PasswordRecoveryShell>
    );
  }

  return (
    <PasswordRecoveryShell
      eyebrow="Segurança da conta"
      title="Crie uma nova senha"
      description={
        email
          ? `Defina uma nova senha para ${maskEmail(email)}.`
          : "Defina uma nova senha para sua conta."
      }
      visual="reset"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="new-password"
            className="mb-1.5 block text-sm font-semibold text-ink"
          >
            Nova senha
          </label>
          <div className="relative">
            <LockKeyhole
              className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40"
              aria-hidden="true"
            />
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (error) setError(null);
                if (state === "error") setState("form");
              }}
              disabled={state === "saving"}
              className="h-12 w-full rounded-lg border border-[var(--border)] bg-paper pl-11 pr-12 text-lg outline-none transition focus:border-[var(--blue-royal)] focus:bg-surface focus:ring-4 focus:ring-[var(--blue-soft)] disabled:opacity-65"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Esconder nova senha" : "Mostrar nova senha"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink/50 transition hover:bg-[var(--blue-soft)] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink/50">Mínimo 8 caracteres.</p>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1.5 block text-sm font-semibold text-ink"
          >
            Confirmar nova senha
          </label>
          <div className="relative">
            <LockKeyhole
              className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40"
              aria-hidden="true"
            />
            <input
              id="confirm-password"
              type={showConfirmation ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value);
                if (error) setError(null);
                if (state === "error") setState("form");
              }}
              disabled={state === "saving"}
              className="h-12 w-full rounded-lg border border-[var(--border)] bg-paper pl-11 pr-12 text-lg outline-none transition focus:border-[var(--blue-royal)] focus:bg-surface focus:ring-4 focus:ring-[var(--blue-soft)] disabled:opacity-65"
            />
            <button
              type="button"
              onClick={() => setShowConfirmation((value) => !value)}
              aria-label={
                showConfirmation
                  ? "Esconder confirmação de senha"
                  : "Mostrar confirmação de senha"
              }
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink/50 transition hover:bg-[var(--blue-soft)] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
            >
              {showConfirmation ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--coral)]/25 bg-[var(--coral)]/8 px-3.5 py-3 text-sm leading-relaxed text-[var(--coral)]"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={state === "saving"}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--blue-royal)] px-5 text-base font-semibold text-white transition hover:bg-[var(--navy)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {state === "saving" ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              Salvando...
            </>
          ) : (
            "Salvar nova senha"
          )}
        </button>
      </form>
    </PasswordRecoveryShell>
  );
}
