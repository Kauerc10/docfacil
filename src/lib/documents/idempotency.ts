export interface FinalizationIntent {
  requestId: string;
  modeloSlug: string;
  createdAt: number;
}

const memoryIntentStorage: Record<string, string> = {};

function getIntentStorageKey(modeloSlug: string): string {
  return `docfacil:intent:v1:${modeloSlug}`;
}

export function getOrCreateFinalizationRequestId(modeloSlug: string): string {
  const key = getIntentStorageKey(modeloSlug);

  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as FinalizationIntent;
        if (parsed.requestId) {
          return parsed.requestId;
        }
      }
    } catch {
      // ignore
    }
  } else if (memoryIntentStorage[key]) {
    try {
      const parsed = JSON.parse(memoryIntentStorage[key]) as FinalizationIntent;
      if (parsed.requestId) {
        return parsed.requestId;
      }
    } catch {
      // ignore
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
