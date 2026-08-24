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
