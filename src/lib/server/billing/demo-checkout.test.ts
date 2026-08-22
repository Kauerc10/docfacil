import { describe, expect, it } from "bun:test";
import { completeDemoCheckout } from "./demo-checkout";
import type { BillingProvider, CreateOrderInput } from "./demo-provider";
import type { OrderRecord } from "../domain/documents";

class FakeBillingProvider implements BillingProvider {
  public lastInput: CreateOrderInput | null = null;
  private order: OrderRecord | null = null;

  async createOrder(input: CreateOrderInput): Promise<OrderRecord> {
    this.lastInput = input;
    this.order = {
      id: "ord_demo",
      provider: "demo",
      product: input.product,
      amountCents: input.amountCents,
      buyer: input.buyer,
      status: "pending",
      createdAt: 1,
    };
    return { ...this.order };
  }

  async simulatePayment(): Promise<OrderRecord> {
    if (!this.order) throw new Error("order missing");
    this.order = { ...this.order, status: "paid", paidAt: 2 };
    return { ...this.order };
  }
}

describe("completeDemoCheckout", () => {
  it("creates avulso for guest at R$ 19,90 without requiring an account", async () => {
    const provider = new FakeBillingProvider();

    const order = await completeDemoCheckout({
      principal: { type: "guest" },
      product: "avulso",
      guestContact: { email: "guest@example.com" },
      provider,
    });

    expect(order.product).toBe("avulso");
    expect(order.amountCents).toBe(1990);
    expect(order.status).toBe("paid");
    expect(provider.lastInput?.buyer.type).toBe("guest");
  });

  it("creates Pro at R$ 39,90 and activates the authenticated account", async () => {
    const provider = new FakeBillingProvider();
    const activations: string[] = [];

    const order = await completeDemoCheckout({
      principal: { type: "user", userId: "usr_pro_demo", email: "pro@example.com" },
      product: "pro",
      provider,
      activatePro: async (userId) => {
        activations.push(userId);
      },
    });

    expect(order.product).toBe("pro");
    expect(order.amountCents).toBe(3990);
    expect(order.status).toBe("paid");
    expect(activations).toEqual(["usr_pro_demo"]);
  });

  it("rejects Pro for guests", async () => {
    const provider = new FakeBillingProvider();

    try {
      await completeDemoCheckout({
        principal: { type: "guest" },
        product: "pro",
        provider,
      });
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe("INVALID_AUTH_TOKEN");
      expect(error.status).toBe(401);
    }
  });
});
