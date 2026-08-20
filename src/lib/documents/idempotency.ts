export interface FinalizationIntent {
  requestId: string;
  modeloSlug: string;
  createdAt: number;
}

export const FINALIZATION_INTENT_TTL_MS = 2 * 60 * 1000;

const memoryIntentStorage: Record<string, string> = {};

function getIntentStorageKey(modeloSlug: string): string {
  return `docfacil:intent:v1:${modeloSlug}`;
}

function isReusableIntent(
  intent: FinalizationIntent,
  modeloSlug: string,
  now = Date.now()
): boolean {
  if (!intent.requestId || intent.modeloSlug !== modeloSlug) return false;
  if (!Number.isFinite(intent.createdAt)) return false;

  const age = now - intent.createdAt;
  return age >= 0 && age < FINALIZATION_INTENT_TTL_MS;
}

export function shouldPreserveFinalizationRequestId(code?: string): boolean {
  return code === "GENERATION_IN_PROGRESS";
}

export function getOrCreateFinalizationRequestId(modeloSlug: string): string {
  const key = getIntentStorageKey(modeloSlug);

  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as FinalizationIntent;
        if (isReusableIntent(parsed, modeloSlug)) {
          return parsed.requestId;
        }

        localStorage.removeItem(key);
        delete memoryIntentStorage[key];
      }
    } catch {
      // ignore
    }
  } else if (memoryIntentStorage[key]) {
    try {
      const parsed = JSON.parse(memoryIntentStorage[key]) as FinalizationIntent;
      if (isReusableIntent(parsed, modeloSlug)) {
        return parsed.requestId;
      }
      delete memoryIntentStorage[key];
    } catch {
      delete memoryIntentStorage[key];
    }
  }

  const newRequestId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "req_" + Math.random().toString(36).substring(2) + Date.now().toString(36);

  const payload: FinalizationIntent = {
    requestId: newRequestId,
    modeloSlug,
    createdAt: Date.now(),
  };

  const str = JSON.stringify(payload);
  memoryIntentStorage[key] = str;

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(key, str);
    } catch {
      // ignore
    }
  }

  return newRequestId;
}

export function clearFinalizationRequestId(modeloSlug: string): void {
  const key = getIntentStorageKey(modeloSlug);
  delete memoryIntentStorage[key];

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}
