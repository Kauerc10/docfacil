import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { OrderRecord } from "../domain/documents";
import type { Principal } from "../security";
import { authorizePurchaseSession } from "./purchase-access";
import { FirestoreCheckoutSessions, checkoutTokenHash } from "./mercadopago/checkout-store";

export const purchaseOrderCookie = (id: string) => `mp_order_${id}`;

/** O contato conhecido não concede acesso; exige sessão ou conta proprietária. */
export async function authorizePurchaseRequest(req: Request, order: OrderRecord, principal: Principal): Promise<boolean> {
  if (!order.id || order.provider !== "mercadopago") return false;
  if (principal.type === "user" && order.buyer.type === "user" && order.buyer.userId === principal.userId) return true;
  if (authorizePurchaseSession(req, order.id)) return true;
  const name = purchaseOrderCookie(order.id);
  const token = (req.headers.get("cookie") ?? "").split(";").map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const session = await new FirestoreCheckoutSessions().get(order.id);
  if (!session || Date.now() > session.createdAt + 86400_000) return false;
  const expected = Buffer.from(session.tokenHash);
  const actual = Buffer.from(checkoutTokenHash(token));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
