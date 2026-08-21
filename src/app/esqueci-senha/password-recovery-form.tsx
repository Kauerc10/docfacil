"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  RotateCcw,
} from "lucide-react";
import { PasswordRecoveryShell } from "@/components/docfacil/auth/password-recovery-shell";
import {
  maskEmail,
  requestPasswordReset,
} from "@/lib/auth/password-reset";

type RecoveryState = "idle" | "sending" | "sent" | "error";

const RESEND_COOLDOWN_SECONDS = 45;

function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Informe seu e-mail.";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Informe um e-mail válido.";
  return null;
}

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<RecoveryState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (cooldown <= 0) return;

    const interval = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [cooldown]);

  async function send(emailToSend: string) {
    setError(null);
    setState("sending");

    try {
      await requestPasswordReset(emailToSend);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setState("sent");
    } catch {
      setError(
        "Não foi possível enviar as instruções agora. Verifique sua conexão e tente novamente."
      );
      setState("error");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateEmail(email);
    if (validation) {
      setError(validation);
      return;
    }

    await send(email.trim());
  }

  const enter = reduceMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] as const } };
  const initial = reduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 };
  const exit = reduceMotion
    ? { opacity: 1 }
    : { opacity: 0, y: -4, transition: { duration: 0.1, ease: "easeOut" as const } };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state === "sent" ? (
        <motion.div key="sent" initial={initial} animate={enter} exit={exit}>
          <PasswordRecoveryShell
            eyebrow="Recuperação de acesso"
            title="Confira seu e-mail"
            description="Se existir uma conta com esse e-mail, enviaremos as instruções para redefinir sua senha."
            visual="success"
          >
            <div className="rounded-xl border border-[var(--selo-green)]/20 bg-[var(--green-tint)]/55 px-4 py-4 text-center">
              <CheckCircle2
                className="mx-auto h-5 w-5 text-[var(--selo-green)]"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                Confira <strong className="font-semibold text-ink">{maskEmail(email.trim())}</strong> e também a pasta de spam.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void send(email.trim())}
              disabled={cooldown > 0}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-surface px-4 text-sm font-semibold text-ink transition hover:bg-paper focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {cooldown > 0
                ? `Reenviar em ${cooldown}s`
                : "Reenviar instruções"}
            </button>

            <a
              href="/?view=login"
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-[var(--blue-royal)] transition hover:bg-[var(--blue-soft)]/55 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar para entrar
            </a>
          </PasswordRecoveryShell>
        </motion.div>
      ) : (
        <motion.div key="form" initial={initial} animate={enter} exit={exit}>
          <PasswordRecoveryShell
            eyebrow="Recuperação de acesso"
            title="Esqueceu sua senha?"
            description="Informe seu e-mail e enviaremos um acesso seguro para criar uma nova senha."
          >
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label
                  htmlFor="recovery-email"
                  className="mb-1.5 block text-sm font-semibold text-ink"
                >
                  E-mail
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40"
                    aria-hidden="true"
                  />
                  <input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (error) setError(null);
                      if (state === "error") setState("idle");
                    }}
                    placeholder="voce@email.com"
                    disabled={state === "sending"}
                    className="h-12 w-full rounded-lg border border-[var(--border)] bg-paper pl-11 pr-4 text-lg outline-none transition placeholder:text-ink/35 focus:border-[var(--blue-royal)] focus:bg-surface focus:ring-4 focus:ring-[var(--blue-soft)] disabled:opacity-65"
                  />
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
                disabled={state === "sending"}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--blue-royal)] px-5 text-base font-semibold text-white transition hover:bg-[var(--navy)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {state === "sending" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    Enviando...
                  </>
                ) : (
                  "Enviar instruções"
                )}
              </button>

              <a
                href="/?view=login"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-[var(--blue-royal)] transition hover:bg-[var(--blue-soft)]/55 focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Voltar para entrar
              </a>
            </form>
          </PasswordRecoveryShell>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
