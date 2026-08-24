import "server-only";
import type { Principal } from "../security";
import { BackendError } from "../errors";
import type { PaymentMethod } from "../domain/documents";

export type CheckoutProduct = "avulso" | "pro";

export interface CheckoutSelection {
  product: CheckoutProduct;
  method: PaymentMethod;
  principal: Principal;
  guestContact?: {
    email?: string;
    phone?: string;
  };
}

export function validateCheckoutSelection(input: CheckoutSelection): void {
  if (input.product === "pro" && input.principal.type === "guest") {
    throw new BackendError(
      "INVALID_AUTH_TOKEN",
      401,
      "Faça login ou crie uma conta para assinar o Plano Pro."
    );
  }

  if (input.product === "pro" && input.method !== "card") {
    throw new BackendError(
      "INVALID_REQUEST",
      400,
      "O Plano Pro está disponível somente no cartão de crédito."
    );
  }

  if (input.product === "avulso" && input.principal.type === "guest") {
    const email = input.guestContact?.email?.trim();
    const phone = input.guestContact?.phone?.trim();

    if (!email && !phone) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "Informe seu e-mail ou telefone para vincular o documento avulso."
      );
    }
  }
}
