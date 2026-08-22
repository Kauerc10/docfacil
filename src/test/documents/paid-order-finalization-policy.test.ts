import { describe, expect, it } from "bun:test";
import { shouldStartPaidOrderFinalization } from "@/lib/documents/paid-order-finalization";

describe("finalização automática de pedido pago", () => {
  it("não dispara novamente o mesmo orderId depois da primeira tentativa", () => {
    const orderId = "ord_pago_123";

    expect(
      shouldStartPaidOrderFinalization({
        orderId,
        slug: "contrato-locacao",
        attemptedOrderId: null,
      })
    ).toBe(true);

    expect(
      shouldStartPaidOrderFinalization({
        orderId,
        slug: "contrato-locacao",
        attemptedOrderId: orderId,
      })
    ).toBe(false);
  });

  it("não dispara sem orderId ou sem slug", () => {
    expect(
      shouldStartPaidOrderFinalization({
        orderId: undefined,
        slug: "contrato-locacao",
        attemptedOrderId: null,
      })
    ).toBe(false);

    expect(
      shouldStartPaidOrderFinalization({
        orderId: "ord_pago_123",
        slug: "",
        attemptedOrderId: null,
      })
    ).toBe(false);
  });
});
