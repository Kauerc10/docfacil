import "server-only";
import type { PaymentMethod } from "../domain/documents";

export interface CreateOneTimePaymentInput {
  orderId: string;
  product: "avulso";
  amountCents: number;
  method: PaymentMethod;
  completionUrl: string;
}

export type OneTimePaymentResult =
  | {
      kind: "pix";
      providerPaymentId: string;
      providerStatus: string;
      brCode: string;
      brCodeBase64: string;
      expiresAt: string;
      devMode: boolean;
    }
  | {
      kind: "hosted";
      providerCheckoutId: string;
      providerStatus: string;
      checkoutUrl: string;
      devMode: boolean;
    };

export interface CreateSubscriptionInput {
  orderId: string;
  amountCents: number;
  completionUrl: string;
}

export interface SubscriptionPaymentResult {
  kind: "hosted";
  providerCheckoutId: string;
  providerStatus: string;
  checkoutUrl: string;
  devMode: boolean;
}

export interface BillingProvider {
  createOneTimePayment(
    input: CreateOneTimePaymentInput
  ): Promise<OneTimePaymentResult>;
  createSubscription(
    input: CreateSubscriptionInput
  ): Promise<SubscriptionPaymentResult>;
  cancelSubscription(input: { providerSubscriptionId: string }): Promise<void>;
}
