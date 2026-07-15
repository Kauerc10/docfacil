"use client";

import { COOKIE_PREFS_KEY } from "@/lib/services/consent-service";

/**
 * ReopenPrefsButton — botão "Reabrir preferências" de cookies.
 *
 * Client Component separado porque usa onClick + localStorage.
 * Consumido por CookiesContent (Server Component) via composição.
 */
export function ReopenPrefsButton() {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem(COOKIE_PREFS_KEY);
        } catch {
          /* ignore */
        }
        window.location.reload();
      }}
      className="inline-flex items-center justify-center rounded-xl bg-[var(--blue-royal)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--navy)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
    >
      Reabrir preferências
    </button>
  );
}
