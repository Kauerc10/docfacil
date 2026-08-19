"use client";

import { useEffect, useState } from "react";
import {
  estimatePasswordStrength,
  type PasswordStrengthResult,
  type PasswordStrengthScore,
} from "@/lib/auth/password-strength";

const EMPTY: PasswordStrengthResult = {
  score: null,
  label: "",
  feedback: "",
  percent: 0,
};

type EvaluatedPassword = {
  password: string;
  name: string;
  email: string;
  result: PasswordStrengthResult;
};

function activeSegmentClass(score: PasswordStrengthScore): string {
  if (score <= 1) return "bg-[var(--coral)]";
  if (score === 2) return "bg-[var(--blue-royal)]";
  return "bg-[var(--selo-green)]";
}

function labelClass(score: PasswordStrengthScore): string {
  if (score <= 1) return "text-[var(--coral)]";
  if (score === 2) return "text-[var(--blue-royal)]";
  return "text-[var(--selo-green)]";
}

export function PasswordStrengthMeter({
  password,
  name,
  email,
}: {
  password: string;
  name?: string;
  email?: string;
}) {
  const normalizedName = name?.trim() ?? "";
  const normalizedEmail = email?.trim() ?? "";
  const [evaluated, setEvaluated] = useState<EvaluatedPassword | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!password) return;

    const currentPassword = password;
    const currentName = normalizedName;
    const currentEmail = normalizedEmail;

    const timeout = window.setTimeout(() => {
      void estimatePasswordStrength(currentPassword, [currentName, currentEmail]).then(
        (result) => {
          if (cancelled) return;
          setEvaluated({
            password: currentPassword,
            name: currentName,
            email: currentEmail,
            result,
          });
        }
      );
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [password, normalizedName, normalizedEmail]);

  if (!password) return null;

  const isCurrent =
    evaluated?.password === password &&
    evaluated.name === normalizedName &&
    evaluated.email === normalizedEmail;
  const strength = isCurrent ? evaluated.result : EMPTY;
  const loading = !isCurrent;
  const score = strength.score;
  const activeClass = score === null ? "" : activeSegmentClass(score);

  return (
    <div className="mt-3" aria-live="polite">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-ink/55">Força da senha</span>
        <span
          className={
            score === null
              ? "font-semibold text-ink/45"
              : `font-semibold ${labelClass(score)}`
          }
        >
          {loading ? "Analisando..." : strength.label}
        </span>
      </div>

      <div
        role="meter"
        aria-label="Força da senha"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score ?? 0}
        aria-valuetext={strength.label || "Ainda não analisada"}
        className="grid grid-cols-5 gap-1.5"
      >
        {Array.from({ length: 5 }, (_, index) => {
          const active = score !== null && index <= score;
          return (
            <span
              key={index}
              aria-hidden="true"
              className={`h-1.5 rounded-full transition-colors duration-200 ${
                active ? activeClass : "bg-[var(--border)]/75"
              }`}
            />
          );
        })}
      </div>

      {strength.feedback && (
        <p className="mt-1.5 text-xs leading-relaxed text-ink/55">
          {strength.feedback}
        </p>
      )}
    </div>
  );
}
