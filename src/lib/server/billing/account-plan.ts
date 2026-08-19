import "server-only";
import { getAdminFirestore } from "../firebase-admin";

export async function setServerUserPlan(
  userId: string,
  plan: "gratis" | "pro"
): Promise<void> {
  const db = getAdminFirestore();
  await db.collection("users").doc(userId).set(
    {
      plano: plan,
      atualizadoEm: Date.now(),
    },
    { merge: true }
  );
}
