import "server-only";
import type { Principal } from "../security";
import type { OrderRecord, DocumentEntitlement } from "../domain/documents";
import { BackendError } from "../errors";
import { FREE_MONTHLY_LIMIT, isMonthlyFreeModel } from "@/lib/document-access-policy";

export type AccountPlan = "gratis" | "pro";
export type PurchaseProduct = "avulso" | "pro";

export interface ResolveEntitlementParams {
  principal: Principal;
  modeloSlug: string;
  orderId?: string;
  order?: OrderRecord | null;
  userProfile?: { plano?: string } | null;
  currentMonthlyCount?: number;
}

export interface EntitlementDecision {
  entitlement: DocumentEntitlement;
  watermarked: boolean;
  orderId?: string;
}

export function resolveEntitlement(params: ResolveEntitlementParams): EntitlementDecision {
  const { principal, modeloSlug, orderId, order, userProfile, currentMonthlyCount = 0 } = params;

  if (orderId) {
    if (!order) {
      throw new BackendError("PAYMENT_REQUIRED", 402, "Pagamento necessário para gerar o documento avulso.");
    }
    if (order.product !== "avulso") {
      throw new BackendError("INVALID_REQUEST", 400, "O pedido informado não é de documento avulso.");
    }
    if (order.status === "consumed") {
      throw new BackendError("ORDER_ALREADY_CONSUMED", 409, "Este pagamento já foi utilizado para gerar outro documento.");
    }
    if (order.status !== "paid" && order.status !== "reserved") {
      throw new BackendError("ORDER_NOT_PAID", 402, "O pagamento informado ainda não foi confirmado.");
    }
    if (principal.type === "user" && order.buyer.type === "user" && order.buyer.userId !== principal.userId) {
      throw new BackendError("DOCUMENT_FORBIDDEN", 403, "Este pagamento pertence a outra conta de usuário.");
    }
    return {
      entitlement: "single_purchase",
      watermarked: false,
      orderId: order.id || orderId,
    };
  }

  if (principal.type === "guest") {
    throw new BackendError(
      "PAYMENT_REQUIRED",
      402,
      "Entre ou crie uma conta para usar a geração grátis, ou adquira este documento avulso."
    );
  }

  if (userProfile?.plano === "pro") {
    return { entitlement: "pro", watermarked: false };
  }

  if (!isMonthlyFreeModel(modeloSlug)) {
    throw new BackendError(
      "FREE_MODEL_NOT_ELIGIBLE",
      402,
      "Este modelo não faz parte da seleção gratuita deste mês."
    );
  }

  if (currentMonthlyCount >= FREE_MONTHLY_LIMIT) {
    throw new BackendError(
      "FREE_LIMIT_REACHED",
      402,
      "Você já usou sua geração gratuita deste mês."
    );
  }

  return { entitlement: "free", watermarked: true };
}
