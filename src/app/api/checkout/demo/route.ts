import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAppCheck, resolvePrincipal } from "@/lib/server/security";
import { completeDemoCheckout } from "@/lib/server/billing/demo-checkout";
import { BackendError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const checkoutInputSchema = z.object({
  product: z.enum(["avulso", "pro"]).optional().default("avulso"),
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

    const finalOrder = await completeDemoCheckout({
      principal,
      product: parseResult.data.product,
      guestContact: parseResult.data.guestContact,
      autoPay: parseResult.data.autoPay,
    });

    return NextResponse.json(
      {
        order: {
          id: finalOrder.id,
          product: finalOrder.product,
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
