export interface PaidOrderFinalizationGateInput {
  orderId?: string;
  slug: string;
  attemptedOrderId: string | null;
}

/**
 * Permite no máximo um disparo automático por orderId durante a montagem da
 * tela de sucesso. Falhas terminais podem ser tentadas novamente por uma ação
 * explícita/reload, mas nunca por um ciclo de renderização do React.
 */
export function shouldStartPaidOrderFinalization({
  orderId,
  slug,
  attemptedOrderId,
}: PaidOrderFinalizationGateInput): boolean {
  return Boolean(orderId && slug && attemptedOrderId !== orderId);
}
