import "server-only";
import type { Principal } from "../security";
import { requireUser } from "../security";
import type { BillingProvider } from "./demo-provider";
import { getDemoBillingProvider } from "./demo-provider";
import { setServerUserPlan } from "./account-plan";
import { BackendError } from "../errors";
import { planPriceToCents, type PurchaseProduct } from "@/lib/pricing";
import type { OrderRecord } from "../domain/documents";

export interface CompleteDemoCheckoutInput {
  principal: Principal;
  product: PurchaseProduct;
  guestContact?: { email?: string; phone?: string };
  autoPay?: boolean;
  provider?: BillingProvider;
  activatePro?: (userId: string) => Promise<void>;
}

export async function completeDemoCheckout(
  input: CompleteDemoCheckoutInput
): Promise<OrderRecord> {
  const {
    principal,
    product,
    guestContact,
    autoPay = true,
    provider = getDemoBillingProvider(),
    activatePro = (userId) => setServerUserPlan(userId, "pro"),
  } = input;

  let buyer: OrderRecord["buyer"];

  if (product === "pro") {
    const user = requireUser(principal);
    buyer = {
      type: "user",
      userId: user.userId,
      email: user.email,
    };
  } else if (principal.type === "user") {
    buyer = {
      type: "user",
      userId: principal.userId,
      email: principal.email,
    };
  } else {
    if (!guestContact?.email && !guestContact?.phone) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "Informe ao menos um e-mail ou WhatsApp de contato para continuar."
      );
    }
    buyer = {
      type: "guest",
      email: guestContact.email,
      phone: guestContact.phone,
    };
  }

  const order = await provider.createOrder({
    product,
    amountCents: planPriceToCents(product),
    buyer,
  });

  const finalOrder = autoPay ? await provider.simulatePayment(order.id!) : order;

  if (product === "pro" && finalOrder.status === "paid") {
    const user = requireUser(principal);
    await activatePro(user.userId);
  }

  return finalOrder;
}
