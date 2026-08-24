import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { BackendError } from "@/lib/server/errors";
import { requireAppCheck, resolvePrincipal } from "@/lib/server/security";
import { createOrderBuyerPrincipalKey } from "@/lib/server/billing/order-identity";
import { getBillingRepositories } from "@/lib/server/firestore/billing-repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || undefined : value),
  z.string().email("E-mail inválido.").optional()
);

const optionalPhone = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || undefined : value),
  z.string().min(8, "Telefone inválido.").max(30).optional()
);

const statusSchema = z.object({
  orderId: z.string().min(1, "orderId obrigatório."),
  guestContact: z
    .object({
      email: optionalEmail,
      phone: optionalPhone,
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);
    const body = await req.json().catch(() => ({}));
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "Dados de consulta inválidos.",
        { errors: parsed.error.flatten() }
      );
    }

    const { orderId, guestContact } = parsed.data;
    const order = await getBillingRepositories().orders.getOrder(orderId);

    if (!order) {
      throw new BackendError(
        "ORDER_NOT_FOUND",
        404,
        "Pedido de compra não encontrado."
      );
    }

    let authorized = false;

    if (principal.type === "user") {
      authorized =
        (order.buyer.type === "user" && order.buyer.userId === principal.userId) ||
        (order.buyer.type === "guest" &&
          Boolean(principal.email) &&
          Boolean(order.buyer.email) &&
          principal.email!.trim().toLowerCase() ===
            order.buyer.email!.trim().toLowerCase());
    } else if (guestContact?.email || guestContact?.phone) {
      const callerKey = createOrderBuyerPrincipalKey({
        type: "guest",
        ...(guestContact.email ? { email: guestContact.email } : {}),
        ...(guestContact.phone ? { phone: guestContact.phone } : {}),
      });
      const buyerKey = createOrderBuyerPrincipalKey(order.buyer);
      authorized = callerKey === buyerKey;
    }

    if (!authorized) {
      throw new BackendError(
        "ORDER_FORBIDDEN",
        403,
        "Você não tem permissão para consultar o status deste pedido."
      );
    }

    return NextResponse.json(
      {
        orderId: order.id,
        product: order.product,
        status: order.status,
        method: order.method,
        amountCents: order.amountCents,
        pix: order.status === "pending" ? order.pix : undefined,
        documentId: order.status === "consumed" ? order.documentId : undefined,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error: unknown) {
    if (error instanceof BackendError) {
      return error.toResponse();
    }
    return BackendError.fromUnknown(error).toResponse();
  }
}
