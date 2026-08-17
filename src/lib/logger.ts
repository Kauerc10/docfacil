/**
 * Logger estruturado — substitui console.error espalhados pelo código.
 * Redige e higieniza PII e segredos automaticamente.
 * Em desenvolvimento: loga no console com prefixo [DocFacil:Scope].
 * Em produção: preparado para Sentry/Datadog.
 */
type LogLevel = "error" | "warn" | "info" | "debug";

interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  context?: unknown;
  timestamp: string;
  error?: unknown;
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const SENSITIVE_KEY_REGEX =
  /^(cpf|rg|telefone|celular|phone|email|senha|password|pass|secret|token|auth|authorization|cookie|respostas|answers|contact)$/i;

export function sanitizeLogData<T = unknown>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(sanitizeLogData(error));
  } catch {
    return String(error);
  }
}

function emit(entry: LogEntry): void {
  const prefix = `[DocFacil:${entry.scope}]`;
  const safeContext = entry.context !== undefined ? sanitizeLogData(entry.context) : "";
  const safeError = entry.error ? formatError(entry.error) : "";

  if (IS_PRODUCTION) {
    console[entry.level === "debug" ? "log" : entry.level](
      prefix,
      entry.message,
      safeContext,
      safeError
    );
    return;
  }

  const styles: Record<LogLevel, string> = {
    error: "color: #FF6A4D; font-weight: bold",
    warn: "color: #F59E0B; font-weight: bold",
    info: "color: #2554C7",
    debug: "color: #8A8A8A",
  };

  console[entry.level === "debug" ? "log" : entry.level](
    `%c${prefix}%c ${entry.message}`,
    styles[entry.level],
    "color: inherit",
    safeContext,
    safeError
  );
}

export const logger = {
  error(scope: string, message: string, error?: unknown, context?: unknown): void {
    emit({
      level: "error",
      scope,
      message,
      context,
      error,
      timestamp: new Date().toISOString(),
    });
  },
  warn(scope: string, message: string, context?: unknown): void {
    emit({
      level: "warn",
      scope,
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  },
  info(scope: string, message: string, context?: unknown): void {
    emit({
      level: "info",
      scope,
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  },
  debug(scope: string, message: string, context?: unknown): void {
    if (IS_PRODUCTION) return;
    emit({
      level: "debug",
      scope,
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  },
} as const;
