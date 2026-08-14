import "server-only";
import type { Principal } from "../security";
import type { OrderRecord, DocumentEntitlement } from "../domain/documents";
import { BackendError } from "../errors";

export type AccountPlan = "gratis" | "pro";
export type PurchaseProduct = "avulso" | "pro";

export const FREE_MONTHLY_LIMIT = 3;

export interface ResolveEntitlementParams {
  principal: Principal;
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
  const { principal, orderId, order, userProfile, currentMonthlyCount = 0 } = params;

  // Se uma ordem de compra foi informada ou é guest
  if (orderId || principal.type === "guest") {
    if (!orderId || !order) {
      throw new BackendError(
        "PAYMENT_REQUIRED",
        402,
        "Pagamento necessário para gerar o documento avulso."
      );
    }

    if (order.status === "consumed") {
      throw new BackendError(
        "ORDER_ALREADY_CONSUMED",
        409,
        "Este pagamento já foi utilizado para gerar outro documento."
      );
    }

    if (order.status !== "paid") {
      throw new BackendError(
        "ORDER_NOT_PAID",
        402,
        "O pagamento informado ainda não foi confirmado."
      );
    }

    // Se a ordem for de usuário autenticado, valida se pertence a ele
    if (principal.type === "user" && order.buyer.type === "user" && order.buyer.userId !== principal.userId) {
      throw new BackendError(
        "DOCUMENT_FORBIDDEN",
        403,
        "Este pagamento pertence a outra conta de usuário."
      );
    }

    return {
      entitlement: "single_purchase",
      watermarked: false,
      orderId: order.id || orderId,
    };
  }

  // Usuário autenticado
  const userPlan = userProfile?.plano;

  if (userPlan === "pro") {
    return {
      entitlement: "pro",
      watermarked: false,
    };
  }

  // Usuário no plano gratuito (ou legacy "avulso" no perfil de conta)
  if (currentMonthlyCount >= FREE_MONTHLY_LIMIT) {
    throw new BackendError(
      "FREE_LIMIT_REACHED",
      402,
      `Você atingiu o limite de ${FREE_MONTHLY_LIMIT} documentos gratuitos deste mês. Faça upgrade para o Pro ou adquira um documento avulso.`
    );
  }

  return {
    entitlement: "free",
    watermarked: true,
  };
}
