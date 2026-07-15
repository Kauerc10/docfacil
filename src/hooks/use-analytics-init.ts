"use client";

import { useEffect } from "react";
import { initAnalyticsOnConsent } from "@/lib/services/analytics-loader";

/**
 * useAnalyticsInit — hook client-side que inicializa scripts de
 * analytics/marketing conforme o consentimento LGPD do usuário.
 *
 * Roda uma vez no mount. Deve ser usado num componente próximo da raiz
 * (ex.: Home em page.tsx) para que o consentimento seja avaliado cedo,
 * mas depois do banner de cookies ter chance de registrar a preferência.
 */
export function useAnalyticsInit(): void {
  useEffect(() => {
    // Pequeno delay para garantir que o banner já tenha lido/gravado prefs.
    const timer = setTimeout(initAnalyticsOnConsent, 800);
    return () => clearTimeout(timer);
  }, []);
}
