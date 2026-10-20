import "server-only";
import { BackendError } from "../../errors";
import { logger } from "../../../logger";
import type { MercadoPagoClientConfig, MercadoPagoEnvironment } from "./types";

const DEFAULT_BASE_URL = "https://api.mercadopago.com";
const DEFAULT_TIMEOUT_MS = 10_000;
const TOKEN_PATTERN = /^(?:TEST-|APP_USR-)[A-Za-z0-9_.-]{16,}$/;

interface ProviderErrorBody {
  message?: unknown;
  error?: unknown;
  cause?: unknown;
  [key: string]: unknown;
}

function safeText(value: unknown, max = 180): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text || text.length > max || /bearer|token|secret|authorization|api[-_ ]?key/i.test(text)) {
    return undefined;
  }
  return text;
}

function providerFailure(): BackendError {
  return new BackendError(
    "BILLING_PROVIDER_FAILED",
    502,
    "Não foi possível processar a operação de pagamento. Tente novamente."
  );
}

function validateConfig(config: MercadoPagoClientConfig): void {
  if (!TOKEN_PATTERN.test(config.accessToken.trim())) {
    throw new BackendError("BILLING_NOT_CONFIGURED", 503, "Pagamento temporariamente indisponível.");
  }
  if (!config.sellerId.trim() || !/^[A-Za-z0-9_-]{3,100}$/.test(config.sellerId.trim())) {
    throw new BackendError("BILLING_NOT_CONFIGURED", 503, "Pagamento temporariamente indisponível.");
  }
  // APP_USR também é emitido para contas de teste; prefixo não atesta ambiente.
  // A reconciliação deve conferir live_mode do recurso consultado.
  if (config.environment === "production" && config.accessToken.startsWith("TEST-")) {
    throw new BackendError("BILLING_NOT_CONFIGURED", 503, "Pagamento temporariamente indisponível.");
  }
  const base = config.baseUrl ?? DEFAULT_BASE_URL;
  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    throw new BackendError("BILLING_NOT_CONFIGURED", 503, "Pagamento temporariamente indisponível.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new BackendError("BILLING_NOT_CONFIGURED", 503, "Pagamento temporariamente indisponível.");
  }
}

export class MercadoPagoClient {
  private readonly timeoutMs: number;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  public readonly environment: MercadoPagoEnvironment;

  constructor(private readonly config: MercadoPagoClientConfig) {
    validateConfig(config);
    this.environment = config.environment;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  public async request<T>(
    path: string,
    init: RequestInit = {},
    options: { idempotencyKey?: string } = {}
  ): Promise<T> {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
      throw new BackendError("INVALID_REQUEST", 400, "Caminho inválido para o provedor de pagamentos.");
    }
    if (options.idempotencyKey !== undefined && !/^[A-Za-z0-9_.:-]{8,200}$/.test(options.idempotencyKey)) {
      throw new BackendError("INVALID_REQUEST", 400, "Chave de repetição inválida.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const callerSignal = init.signal;
    const abortFromCaller = () => controller.abort(callerSignal?.reason);
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort(callerSignal.reason);
      else callerSignal.addEventListener("abort", abortFromCaller, { once: true });
    }
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.config.accessToken}`);
    headers.set("Accept", "application/json");
    if (init.body !== undefined) headers.set("Content-Type", "application/json");
    if (options.idempotencyKey) headers.set("X-Idempotency-Key", options.idempotencyKey);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
        cache: "no-store",
      });
    } catch {
      logger.warn("Billing", "Falha de transporte ao chamar o Mercado Pago", {
        path,
        aborted: controller.signal.aborted,
      });
      throw providerFailure();
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    }

    const body = (await response.json().catch(() => null)) as ProviderErrorBody | null;
    if (!response.ok) {
      const message = safeText(body?.message) ?? safeText(body?.error);
      logger.warn("Billing", "Mercado Pago respondeu com falha", {
        path,
        status: response.status,
        message,
      });
      throw providerFailure();
    }
    return body as T;
  }
}

export function getMercadoPagoClient(): MercadoPagoClient {
  const environment = (process.env.MERCADOPAGO_ENVIRONMENT ??
    (process.env.NODE_ENV === "production" ? "production" : "test")) as MercadoPagoEnvironment;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const sellerId = process.env.MERCADOPAGO_COLLECTOR_ID;
  if (!accessToken || !sellerId || !["test", "production"].includes(environment)) {
    throw new BackendError("BILLING_NOT_CONFIGURED", 503, "Pagamento temporariamente indisponível.");
  }
  return new MercadoPagoClient({ accessToken, sellerId, environment });
}
