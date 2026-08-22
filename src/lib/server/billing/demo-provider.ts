import "server-only";
import type { IOrdersRepository } from "../firestore/interfaces";
import type { OrderRecord } from "../domain/documents";
import { BackendError } from "../errors";
import { getServerEnv } from "../env";
import { getRepositories } from "../firestore/repositories";

export interface CreateOrderInput {
  product: "avulso" | "pro";
  amountCents: number;
  buyer:
    | { type: "guest"; email?: string; phone?: string }
    | { type: "user"; userId: string; email?: string };
}

export interface BillingProvider {
  createOrder(input: CreateOrderInput): Promise<OrderRecord>;
  simulatePayment(orderId: string): Promise<OrderRecord>;
}

export interface DemoBillingConfig {
  allowDemoBilling: boolean;
  nodeEnv: string;
  vercelEnv?: string;
}

export class DemoBillingProvider implements BillingProvider {
  private readonly ordersRepo: IOrdersRepository;
  private readonly config: DemoBillingConfig;

  constructor(
    ordersRepo: IOrdersRepository,
    config?: DemoBillingConfig
  ) {
    this.ordersRepo = ordersRepo;
    if (config) {
      this.config = config;
    } else {
      const env = getServerEnv();
      this.config = {
        allowDemoBilling: env.ALLOW_DEMO_BILLING,
        nodeEnv: env.NODE_ENV,
        vercelEnv: env.VERCEL_ENV,
      };
    }
  }

  private assertAllowed(): void {
    const isPreview = this.config.vercelEnv === "preview";
    const isFinalProduction =
      this.config.nodeEnv === "production" && !isPreview;
    const isDemoAllowed =
      isPreview || (!isFinalProduction && this.config.allowDemoBilling);

    if (!isDemoAllowed) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "O provedor de checkout demo está desativado neste ambiente."
      );
    }
  }

  public async createOrder(input: CreateOrderInput): Promise<OrderRecord> {
    this.assertAllowed();

    return await this.ordersRepo.createOrder({
      provider: "demo",
      product: input.product,
      amountCents: input.amountCents,
      buyer: input.buyer,
      status: "pending",
      createdAt: Date.now(),
    });
  }

  public async simulatePayment(orderId: string): Promise<OrderRecord> {
    this.assertAllowed();

    const order = await this.ordersRepo.getOrder(orderId);
    if (!order) {
      throw new BackendError("ORDER_NOT_FOUND", 404, "Pedido de compra não encontrado.");
    }

    if (order.status === "consumed") {
      throw new BackendError(
        "ORDER_ALREADY_CONSUMED",
        409,
        "Este pedido já foi utilizado."
      );
    }

    return await this.ordersRepo.markOrderPaid(orderId);
  }
}

export function getDemoBillingProvider(): DemoBillingProvider {
  const repos = getRepositories();
  return new DemoBillingProvider(repos.orders);
}
