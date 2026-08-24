import { describe, expect, it } from "bun:test";
import {
  buildGuestContact,
  buildStatusRequestPayload,
} from "@/lib/services/checkout-service";

describe("checkout payload hygiene", () => {
  it("omits guestContact entirely for authenticated status polling", () => {
    expect(
      buildStatusRequestPayload({
        orderId: "ord_auth",
        authenticated: true,
        email: "user@example.com",
        phone: "",
      })
    ).toEqual({ orderId: "ord_auth" });
  });

  it("keeps only a valid guest e-mail and never serializes empty phone", () => {
    expect(
      buildGuestContact({
        email: " guest@example.com ",
        phone: "   ",
      })
    ).toEqual({ email: "guest@example.com" });
  });

  it("keeps only a valid guest phone and never serializes empty e-mail", () => {
    expect(
      buildGuestContact({
        email: " ",
        phone: " 47999999999 ",
      })
    ).toEqual({ phone: "47999999999" });
  });

  it("omits guestContact when both fields are blank", () => {
    expect(buildGuestContact({ email: "", phone: "" })).toBeUndefined();
  });

  it("serializes guest contact only for guest status polling", () => {
    expect(
      buildStatusRequestPayload({
        orderId: "ord_guest",
        authenticated: false,
        email: "guest@example.com",
        phone: "",
      })
    ).toEqual({
      orderId: "ord_guest",
      guestContact: { email: "guest@example.com" },
    });
  });
});
