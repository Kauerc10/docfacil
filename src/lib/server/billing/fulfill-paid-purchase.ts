import "server-only";
import { getBillingRepositories } from "../firestore/billing-repositories";
import { getAdminFirestore } from "../firebase-admin";
import { ensurePurchaseReceipt } from "./purchase-access";
import { deliverPaidPurchase } from "./purchase-delivery";

/** Falha de comunicação não desfaz pagamento nem impede a entrega. */
export async function fulfillPaidPurchase(orderId: string): Promise<void> {
  const order = await getBillingRepositories().orders.getOrder(orderId);
  if (!order || !["paid", "reserved", "consumed"].includes(order.status)) return;
  try {
    await ensurePurchaseReceipt(order);
  } catch {
    await getAdminFirestore().collection("billing_occurrences").doc(`mail:${orderId}`).set({
      orderId, category: "mail", status: "open", errorCode: "RECEIPT_NOT_QUEUED", updatedAt: Date.now(),
    }, { merge: true });
  }
  await deliverPaidPurchase(orderId);
}
