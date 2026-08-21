import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppCheck, resolvePrincipal } from "@/lib/server/security";
import { getDemoBillingProvider } from "@/lib/server/billing/demo-provider";
import { BackendError } from "@/lib/server/errors";
import { planPriceToCents } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkoutInputSchema = z.object({
  guestContact: z
    .object({
      email: z.string().email("E-mail inválido.").optional(),
      phone: z.string().min(8, "Telefone inválido.").max(30).optional(),
    })
    .optional(),
  autoPay: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  try {
    await requireAppCheck(req);
    const principal = await resolvePrincipal(req);

    const body = await req.json().catch(() => ({}));
    const parseResult = checkoutInputSchema.safeParse(body);

    if (!parseResult.success) {
      throw new BackendError(
        "INVALID_REQUEST",
        400,
        "Dados de checkout inválidos.",
        { errors: parseResult.error.flatten() }
      );
    }

    const { guestContact, autoPay } = parseResult.data;

    let buyer:
      | { type: "guest"; email?: string; phone?: string }
      | { type: "user"; userId: string; email?: string };

    if (principal.type === "guest") {
      if (!guestContact?.email && !guestContact?.phone) {
        throw new BackendError(
          "INVALID_REQUEST",
          400,
          "Informe ao menos um e-mail ou WhatsApp de contato para continuar."
        );
      }
      buyer = {
        type: "guest",
        email: guestContact.email,
        phone: guestContact.phone,
      };
    } else {
      buyer = {
        type: "user",
        userId: principal.userId,
        email: principal.email,
      };
    }

    const provider = getDemoBillingProvider();
    const order = await provider.createOrder({
      product: "avulso",
      amountCents: planPriceToCents("avulso"),
      buyer,
    });

    const finalOrder = autoPay ? await provider.simulatePayment(order.id!) : order;

    return NextResponse.json(
      {
        order: {
          id: finalOrder.id,
          status: finalOrder.status,
          amountCents: finalOrder.amountCents,
          buyer: finalOrder.buyer,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: unknown) {
    if (err instanceof BackendError) {
      return err.toResponse();
    }
    return BackendError.fromUnknown(err).toResponse();
  }
}
