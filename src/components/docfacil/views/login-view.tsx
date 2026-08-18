"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { useNav } from "@/components/docfacil/nav-context";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/docfacil/logo";

/** The standard 4-color Google "G" mark as inline SVG. */
function GoogleGIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09a6.51 6.51 0 0 1 0-4.18V7.07H2.18a10.01 10.01 0 0 0 0 8.86l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function LoginView() {
  const { navigate } = useNav();
  const { signInWithEmail, signInWithGoogle, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function validate(): string | null {
    if (!email.trim()) return "Informe seu e-mail.";
    if (!email.includes("@")) return "E-mail inválido.";
    if (!password) return "Informe sua senha.";
    return null;
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    if (validationError) setValidationError(null);
    if (error) clearError();
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (validationError) setValidationError(null);
    if (error) clearError();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validation = validate();
    if (validation) {
      setValidationError(validation);
      return;
    }

    setValidationError(null);
    setSubmitting(true);
    try {
      await signInWithEmail(email.trim(), password);
      navigate("dashboard");
    } catch {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setValidationError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate("dashboard");
    } catch {
      setSubmitting(false);
    }
  }

  const shownError = validationError || error;

  return (
    <div className="min-h-[calc(100vh-72px)] bg-paper flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-surface border border-[var(--border)] rounded-2xl p-7 sm:p-8 shadow-[0_12px_40px_-12px_rgba(14,35,64,0.18)]">
          <div className="flex justify-center">
            <Logo variant="header" />
          </div>

          <div className="mt-6 text-center">
            <h1 className="font-[family-name:var(--font-jakarta)] text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-ink/65 text-base leading-relaxed text-pretty">
              Guarde seus documentos com segurança para editar depois.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-ink mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="voce@email.com"
                  className="w-full h-12 pl-11 pr-4 text-xl rounded-lg border border-[var(--border)] bg-paper focus:bg-surface outline-none focus:border-[var(--blue-royal)] focus:ring-4 focus:ring-[var(--blue-soft)] transition placeholder:text-ink/35"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-ink mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40" aria-hidden="true" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-11 pr-12 text-xl rounded-lg border border-[var(--border)] bg-paper focus:bg-surface outline-none focus:border-[var(--blue-royal)] focus:ring-4 focus:ring-[var(--blue-soft)] transition placeholder:text-ink/35"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-ink/50 hover:text-ink hover:bg-[var(--blue-soft)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end -mt-1">
              <a
                href="/esqueci-senha"
                className="text-sm font-medium text-[var(--blue-royal)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] rounded px-1"
              >
                Esqueci minha senha
              </a>
            </div>

            {shownError && (
              <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-[var(--coral)]/30 bg-[var(--coral)]/8 px-3.5 py-3 text-sm text-[var(--coral)]">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="leading-relaxed">{shownError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-lg bg-[var(--blue-royal)] text-white font-semibold text-lg hover:bg-[var(--navy)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-sm text-ink/50 font-medium">ou</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full h-12 rounded-lg border border-[var(--border)] bg-surface text-ink font-semibold text-lg hover:bg-paper transition inline-flex items-center justify-center gap-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <GoogleGIcon className="w-5 h-5" />
            Continuar com Google
          </button>
        </div>

        <p className="mt-6 text-center text-ink/70 text-base">
          Ainda não tem conta?{" "}
          <button
            type="button"
            onClick={() => navigate("cadastro")}
            className="font-semibold text-[var(--blue-royal)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] rounded px-1"
          >
            Criar conta grátis
          </button>
        </p>
      </div>
    </div>
  );
}
