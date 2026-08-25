import { describe, expect, it } from "bun:test";
import {
  buildPixPaymentUrl,
  parsePixPaymentSession,
  type PixPaymentSession,
} from "@/lib/services/pix-payment-session";

describe("Pix payment session", () => {
  it("builds a dedicated Pix page while preserving checkout context", () => {
    const url = buildPixPaymentUrl(
      "https://docfacil.test/?view=checkout&plan=avulso&slug=locacao&draftId=draft_123",
      "ord_pix_123"
    );

    expect(url).toBe(
      "https://docfacil.test/?view=pagamento-pix&plan=avulso&slug=locacao&draftId=draft_123&orderId=ord_pix_123"
    );
  });

  it("parses a complete persisted Pix session and rejects malformed payloads", () => {
    const session: PixPaymentSession = {
      orderId: "ord_pix_123",
      authenticated: false,
      guestEmail: "cliente@example.com",
      returnUrl: "https://docfacil.test/?view=checkout&plan=avulso&slug=locacao",
      pix: {
        brCode: "000201pix",
        brCodeBase64: "data:image/png;base64,abc",
        expiresAt: 1787659200000,
      },
    };

    expect(parsePixPaymentSession(JSON.stringify(session))).toEqual(session);
    expect(parsePixPaymentSession("{}" )).toBeNull();
    expect(parsePixPaymentSession("not-json")).toBeNull();
  });
});
