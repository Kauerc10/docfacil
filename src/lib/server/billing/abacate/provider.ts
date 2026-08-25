import "server-only";
import { BackendError } from "../../errors";
import { getServerEnv } from "../../env";
import { logger } from "../../../logger";
import type {
  BillingProvider,
  CreateOneTimePaymentInput,
  CreateSubscriptionInput,
  OneTimePaymentResult,
  SubscriptionPaymentResult,
} from "../provider";
import { AbacatePayClient, getAbacatePayClient } from "./client";

interface AbacatePayProviderConfig {
  avulsoProductId?: string;
  proProductId?: string;
}

interface PixCreateResponse {
  id: string;
  status: string;
  devMode: boolean;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
}

interface HostedCheckoutResponse {
  id: string;
  url: string;
  status: string;
  devMode: boolean;
}

const PRODUCT_ID_PATTERN = /^prod_[A-Za-z0-9_-]+$/;

function requiredProductId(value: string | undefined, product: string): string {
  const normalized = value?.trim();
  if (!normalized || !PRODUCT_ID_PATTERN.test(normalized)) {
    throw new BackendError(
      "BILLING_NOT_CONFIGURED",
      503,
      `Pagamento ${product} temporariamente indisponível.`
    );
  }
  return normalized;
}

export class AbacatePayBillingProvider implements BillingProvider {
  constructor(
    private readonly client: AbacatePayClient,
    private readonly config: AbacatePayProviderConfig
  ) {}

  public async createOneTimePayment(
    input: CreateOneTimePaymentInput
  ): Promise<OneTimePaymentResult> {
    if (input.method === "pix") {
      const response = await this.client.request<PixCreateResponse>(
        "/transparents/create",
        {
          method: "POST",
          body: JSON.stringify({
            method: "PIX",
            data: {
              amount: input.amountCents,
              externalId: input.orderId,
              description: "Documento avulso",
              expiresIn: 1800,
              metadata: {
                product: "avulso",
                orderId: input.orderId,
              },
            },
          }),
        }
      );

      return {
        kind: "pix",
        providerPaymentId: response.id,
        providerStatus: response.status,
        brCode: response.brCode,
        brCodeBase64: response.brCodeBase64,
        expiresAt: response.expiresAt,
        devMode: response.devMode,
      };
    }

    const productId = requiredProductId(
      this.config.avulsoProductId,
      "avulso"
    );

    let response: HostedCheckoutResponse;
    try {
      response = await this.client.request<HostedCheckoutResponse>(
        "/checkouts/create",
        {
          method: "POST",
          body: JSON.stringify({
            items: [{ id: productId, quantity: 1 }],
            methods: ["CARD"],
            externalId: input.orderId,
            completionUrl: input.completionUrl,
            returnUrl: input.completionUrl,
            metadata: {
              product: "avulso",
              orderId: input.orderId,
            },
          }),
        }
      );
    } catch (error) {
      logger.warn("Billing", "Checkout de cartão avulso falhou", {
        providerProductId: productId,
      });
      throw error;
    }

    return {
      kind: "hosted",
      providerCheckoutId: response.id,
      providerStatus: response.status,
      checkoutUrl: response.url,
      devMode: response.devMode,
    };
  }

  public async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<SubscriptionPaymentResult> {
    const productId = requiredProductId(this.config.proProductId, "Pro");

    let response: HostedCheckoutResponse;
    try {
      response = await this.client.request<HostedCheckoutResponse>(
        "/subscriptions/create",
        {
          method: "POST",
          body: JSON.stringify({
            items: [{ id: productId, quantity: 1 }],
            methods: ["CARD"],
            externalId: input.orderId,
            completionUrl: input.completionUrl,
            metadata: {
              product: "pro",
              orderId: input.orderId,
            },
          }),
        }
      );
    } catch (error) {
      logger.warn("Billing", "Checkout de assinatura Pro falhou", {
        providerProductId: productId,
      });
      throw error;
    }

    return {
      kind: "hosted",
      providerCheckoutId: response.id,
      providerStatus: response.status,
      checkoutUrl: response.url,
      devMode: response.devMode,
    };
  }

  public async cancelSubscription(input: {
    providerSubscriptionId: string;
  }): Promise<void> {
    await this.client.request("/subscriptions/cancel", {
      method: "POST",
      body: JSON.stringify({ id: input.providerSubscriptionId }),
    });
  }
}

export function getAbacatePayBillingProvider(): AbacatePayBillingProvider {
  const env = getServerEnv();
  return new AbacatePayBillingProvider(getAbacatePayClient(), {
    avulsoProductId: env.ABACATEPAY_AVULSO_PRODUCT_ID,
    proProductId: env.ABACATEPAY_PRO_PRODUCT_ID,
  });
}
