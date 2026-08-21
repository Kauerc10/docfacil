export interface PaidOrderFinalizationGateInput {
  orderId?: string;
  slug: string;
  attemptedOrderId: string | null;
}

/**
 * Política de disparo automático da finalização pós-checkout.
 *
 * RED inicial: ainda não considera a tentativa já consumida. O teste de
 * regressão abaixo exige que o mesmo orderId seja executado no máximo uma vez
 * por montagem da tela.
 */
export function shouldStartPaidOrderFinalization({
  orderId,
  slug,
}: PaidOrderFinalizationGateInput): boolean {
  return Boolean(orderId && slug);
}
