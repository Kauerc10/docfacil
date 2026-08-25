import "server-only";
import { BackendError } from "../../errors";
import { getServerEnv } from "../../env";
import { logger } from "../../../logger";

const ABACATEPAY_API_BASE_URL = "https://api.abacatepay.com/v2";
const DEFAULT_TIMEOUT_MS = 10_000;

interface ApiEnvelope<T> {
  data: T;
  success: boolean | { message?: string };
  error: unknown;
}

export interface AbacatePayClientOptions {
  timeoutMs?: number;
}

export interface ProviderErrorDetails {
  code?: string;
  message?: string;
  field?: string;
  reason?: string;
}

const SENSITIVE_TEXT = /bearer|token|secret|api[-_ ]?key|authorization|sql\s+trace/i;

function safeDiagnosticText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > maxLength || SENSITIVE_TEXT.test(text)) return null;
  return text;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function extractProviderErrorDetails(value: unknown): ProviderErrorDetails | null {
  const directMessage = safeDiagnosticText(value, 240);
  if (directMessage) return { message: directMessage };

  const record = asRecord(value);
  if (!record) return null;

  const code = safeDiagnosticText(record.code, 80);
  const message = safeDiagnosticText(record.message, 240);

  const details = asRecord(record.details);
  const directField = safeDiagnosticText(details?.field, 120);

  let field = directField;
  let reason: string | null = null;
  const errors = asRecord(record.errors);
  if (!field && errors) {
    for (const [key, candidate] of Object.entries(errors)) {
      const safeField = safeDiagnosticText(key, 120);
      if (!safeField || !Array.isArray(candidate)) continue;
      const safeReason = candidate
        .map((item) => safeDiagnosticText(item, 200))
        .find((item): item is string => Boolean(item));
      if (!safeReason) continue;
      field = safeField;
      reason = safeReason;
      break;
    }
  }

  const result: ProviderErrorDetails = {
    ...(code ? { code } : {}),
    ...(message ? { message } : {}),
    ...(field ? { field } : {}),
    ...(reason ? { reason } : {}),
  };

  return Object.keys(result).length > 0 ? result : null;
}

function providerFailure(): BackendError {
  return new BackendError(
    "BILLING_PROVIDER_FAILED",
    502,
    "Não foi possível processar a operação de pagamento. Tente novamente."
  );
}

export class AbacatePayClient {
  private readonly timeoutMs: number;

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
    options: AbacatePayClientOptions = {}
  ) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  public async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "Caminho inválido para o provedor de pagamentos."
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const callerSignal = init.signal;
    const abortFromCaller = () => controller.abort(callerSignal?.reason);

    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort(callerSignal.reason);
      } else {
        callerSignal.addEventListener("abort", abortFromCaller, { once: true });
      }
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.apiKey}`);
    headers.set("Content-Type", "application/json");

    const url = `${ABACATEPAY_API_BASE_URL}${path}`;
    let response: Response;

    try {
      response = await this.fetchImpl(url, {
        ...init,
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error) {
      logger.warn("Billing", "Falha de transporte ao chamar a AbacatePay", {
        path,
        aborted: controller.signal.aborted,
      });
      throw providerFailure();
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    }

    const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
    const success =
      body !== null &&
      body.error == null &&
      (body.success === true || typeof body.success === "object");

    if (!response.ok || !success) {
      logger.warn("Billing", "AbacatePay respondeu com falha", {
        path,
        status: response.status,
        providerSuccess: body?.success ?? null,
        providerError: extractProviderErrorDetails(body?.error),
      });
      throw providerFailure();
    }

    return body.data;
  }
}

export function getAbacatePayClient(): AbacatePayClient {
  const env = getServerEnv();
  if (!env.ABACATEPAY_API_KEY) {
    throw new BackendError(
      "BILLING_NOT_CONFIGURED",
      503,
      "Pagamento temporariamente indisponível."
    );
  }

  return new AbacatePayClient(env.ABACATEPAY_API_KEY);
}
