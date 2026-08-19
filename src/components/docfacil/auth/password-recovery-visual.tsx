import Image from "next/image";
import { KeyRound, ShieldAlert } from "lucide-react";
import styles from "./password-recovery-visual.module.css";

export type PasswordRecoveryVisualVariant =
  | "recovery"
  | "reset"
  | "success"
  | "invalid";

export function PasswordRecoveryVisual({
  variant = "recovery",
}: {
  variant?: PasswordRecoveryVisualVariant;
}) {
  if (variant === "recovery") {
    return (
      <div
        className="relative mx-auto grid h-40 w-40 place-items-center"
        aria-hidden="true"
      >
        <div className="absolute inset-5 rounded-full bg-[var(--blue-soft)]/65 blur-2xl" />
        <div className="absolute inset-2 rounded-full border border-dashed border-[var(--blue-royal)]/25 motion-safe:animate-[spin_12s_linear_infinite]" />
        <div className="absolute inset-2 grid place-items-center overflow-hidden rounded-full">
          <Image
            src="/mascotes/coruja-recuperacao-senha.svg"
            alt=""
            width={128}
            height={128}
            priority
            unoptimized
            className={`relative h-32 w-32 object-contain drop-shadow-[0_12px_20px_rgba(37,84,199,0.16)] ${styles.mascotFloat}`}
          />
        </div>
      </div>
    );
  }

  if (variant === "success") {
    return (
      <div
        className="relative mx-auto grid h-40 w-40 place-items-center"
        aria-hidden="true"
      >
        <div className="absolute inset-5 rounded-full bg-[var(--green-tint)]/70 blur-2xl" />
        <div className="absolute inset-2 rounded-full border border-dashed border-[var(--selo-green)]/25 motion-safe:animate-[spin_14s_linear_infinite]" />
        <div className="absolute inset-2 grid place-items-center overflow-hidden rounded-full">
          <Image
            src="/mascotes/coruja-email-enviado.webp"
            alt=""
            width={128}
            height={128}
            className={`relative h-32 w-32 object-contain drop-shadow-[0_12px_20px_rgba(37,84,199,0.14)] ${styles.mascotFloat}`}
          />
        </div>
      </div>
    );
  }

  const Icon = variant === "invalid" ? ShieldAlert : KeyRound;

  return (
    <div
      className="relative mx-auto grid h-28 w-28 place-items-center"
      aria-hidden="true"
    >
      <div className="absolute inset-1 rounded-full border border-[var(--blue-royal)]/15 bg-[var(--blue-soft)]/35" />
      <div className="absolute inset-0 rounded-full border border-dashed border-[var(--blue-royal)]/35 motion-safe:animate-[spin_8s_linear_infinite]" />
      <div className="absolute inset-[14px] rounded-full border border-[var(--selo-green)]/20" />

      <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-surface text-[var(--blue-royal)] shadow-[0_10px_30px_-14px_rgba(37,84,199,0.65)] ring-1 ring-[var(--border)] motion-safe:animate-[bounce_3.6s_ease-in-out_infinite]">
        <Icon className="h-7 w-7" strokeWidth={2} />
      </div>

      {variant === "reset" && (
        <span className="absolute -right-1 bottom-3 grid h-8 w-8 place-items-center rounded-full border-2 border-surface bg-[var(--selo-green)] text-white shadow-sm">
          <KeyRound className="h-4 w-4" strokeWidth={2.25} />
        </span>
      )}
    </div>
  );
}
