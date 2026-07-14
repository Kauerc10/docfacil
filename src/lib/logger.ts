/**
 * Logger estruturado — substitui console.error espalhados pelo código.
 * Em desenvolvimento: loga no console com prefixo [DocFacil:Scope].
 * Em produção: preparado para Sentry/Datadog.
 */
type LogLevel = "error" | "warn" | "info" | "debug";
interface LogEntry {
  level: LogLevel; scope: string; message: string;
  context?: unknown; timestamp: string; error?: unknown;
}
const IS_PRODUCTION = process.env.NODE_ENV === "production";
function formatError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  try { return JSON.stringify(error); } catch { return String(error); }
}
function emit(entry: LogEntry): void {
  const prefix = `[DocFacil:${entry.scope}]`;
  if (IS_PRODUCTION) {
    console[entry.level === "debug" ? "log" : entry.level](prefix, entry.message, entry.context ?? "", entry.error ? formatError(entry.error) : "");
    return;
  }
  const styles: Record<LogLevel, string> = {
    error: "color: #FF6A4D; font-weight: bold", warn: "color: #F59E0B; font-weight: bold",
    info: "color: #2554C7", debug: "color: #8A8A8A",
  };
  console[entry.level === "debug" ? "log" : entry.level](
    `%c${prefix}%c ${entry.message}`, styles[entry.level], "color: inherit",
    entry.context ?? "", entry.error ? formatError(entry.error) : ""
  );
}
export const logger = {
  error(scope: string, message: string, error?: unknown, context?: unknown): void {
    emit({ level: "error", scope, message, context, error, timestamp: new Date().toISOString() });
  },
  warn(scope: string, message: string, context?: unknown): void {
    emit({ level: "warn", scope, message, context, timestamp: new Date().toISOString() });
  },
  info(scope: string, message: string, context?: unknown): void {
    emit({ level: "info", scope, message, context, timestamp: new Date().toISOString() });
  },
  debug(scope: string, message: string, context?: unknown): void {
    if (IS_PRODUCTION) return;
    emit({ level: "debug", scope, message, context, timestamp: new Date().toISOString() });
  },
} as const;
