import { describe, expect, it } from "bun:test";
import { GET as getOffer } from "@/app/api/billing/offer/route";
import { POST as handleAdminRefund } from "@/app/api/billing/admin/refunds/route";
import { executeAvulsoRefund } from "@/lib/server/billing/refunds";
import type { OrderRecord } from "@/lib/server/domain/documents";

describe("Mercado Pago Welcome Offer & Pro Refund Remediations", () => {
  it("GET /api/billing/offer returns default offer state for non-authenticated or guest requests", async () => {
    const req = new Request("http://localhost:3000/api/billing/offer", {
      headers: {
        "x-firebase-appcheck": "test",
      },
    });

    const res = await getOffer(req);
    expect(res.status).toBe(200);
    const body = await res.json() as { active: boolean; priceCents: number; regularPriceCents: number };
    expect(body.priceCents).toBe(3990);
    expect(body.regularPriceCents).toBe(3990);
    expect(body.active).toBe(false);
  });

  it("executeAvulsoRefund validates correct Pro refund amount (3990 cents)", async () => {
    const proOrder: OrderRecord = {
      id: "pro-order-1",
      provider: "mercadopago",
      product: "pro",
      amountCents: 3990,
      buyer: { type: "user", userId: "u-pro-refund", email: "user@example.com" },
      status: "paid",
      providerPaymentId: "pay-pro-1",
      createdAt: Date.now(),
    };

    // If caller sends 1990 for a 3990 Pro order, it must reject with 400
    await expect(
      executeAvulsoRefund({
        order: proOrder,
        request: {
          id: "manual:pro-order-1",
          orderId: "pro-order-1",
          reason: "Cancelamento CDC",
          status: "requested",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        reviewerId: "admin-1",
        confirmedAmountCents: 1990,
        provider: {
          getPayment: async () => ({ id: "pay-pro-1" }),
          refundPayment: async () => ({ id: "ref-1", status: "approved" }),
        },
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST", status: 400 });
  });
});
