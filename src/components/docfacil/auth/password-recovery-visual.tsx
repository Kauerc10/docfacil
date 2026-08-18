import { Check, KeyRound, Mail, ShieldAlert } from "lucide-react";

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
  const Icon =
    variant === "success"
      ? Check
      : variant === "invalid"
        ? ShieldAlert
        : variant === "reset"
          ? KeyRound
          : Mail;

  return (
    <div className="relative mx-auto grid h-28 w-28 place-items-center" aria-hidden="true">
      <div className="absolute inset-1 rounded-full border border-[var(--blue-royal)]/15 bg-[var(--blue-soft)]/35" />
      <div className="absolute inset-0 rounded-full border border-dashed border-[var(--blue-royal)]/35 motion-safe:animate-[spin_8s_linear_infinite]" />
      <div className="absolute inset-[14px] rounded-full border border-[var(--selo-green)]/20" />

      <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-surface text-[var(--blue-royal)] shadow-[0_10px_30px_-14px_rgba(37,84,199,0.65)] ring-1 ring-[var(--border)] motion-safe:animate-[bounce_3.6s_ease-in-out_infinite]">
        <Icon className="h-7 w-7" strokeWidth={2} />
      </div>

      {(variant === "recovery" || variant === "reset") && (
        <span className="absolute -right-1 bottom-3 grid h-8 w-8 place-items-center rounded-full border-2 border-surface bg-[var(--selo-green)] text-white shadow-sm">
          <KeyRound className="h-4 w-4" strokeWidth={2.25} />
        </span>
      )}
    </div>
  );
}
