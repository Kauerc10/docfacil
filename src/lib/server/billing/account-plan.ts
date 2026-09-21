import "server-only";
import { getAdminFirestore } from "../firebase-admin";
import { getRepositories } from "../firestore/repositories";

import type { UserProfileRecord } from "../firestore/interfaces";

import { getServerEnv } from "../env";

type MutableRuntimeUsersRepository = {
  getUserProfile: (
    userId: string
  ) => Promise<UserProfileRecord | null>;
  setUserProfile?: (
    userId: string,
    profile: UserProfileRecord
  ) => void | Promise<void>;
};

export async function setServerUserPlan(
  userId: string,
  plan: "gratis" | "pro",
  subscriptionId?: string | null,
  subscriptionOrderId?: string | null,
  preservePendingOrder: boolean = false
): Promise<void> {
  const env = getServerEnv();
  const isUnitTestWithoutEmulator =
    env.NODE_ENV === "test" && !env.FIRESTORE_EMULATOR_HOST;

  const dataToSet: Record<string, unknown> = {
    plano: plan,
    atualizadoEm: Date.now(),
  };

  if (subscriptionId !== undefined) {
    dataToSet.subscriptionId = subscriptionId;
  }
  if (subscriptionOrderId !== undefined) {
    dataToSet.subscriptionOrderId = subscriptionOrderId;
  }
  if (!preservePendingOrder && (plan === "pro" || plan === "gratis")) {
    dataToSet.pendingProOrderId = null;
  }

  if (!isUnitTestWithoutEmulator) {
    const db = getAdminFirestore();
    await db.collection("users").doc(userId).set(dataToSet, { merge: true });
  }

  // O sandbox E2E mantém documentos/pedidos efêmeros, mas identidade e perfil
  // no Firestore Emulator real. Quando o runtime usa um repositório de usuários
  // em memória, espelhamos a mudança de plano para que a autorização do backend
  // enxergue a mesma verdade que a conta exibida na interface.
  const runtimeUsers = getRepositories().users as MutableRuntimeUsersRepository;
  if (typeof runtimeUsers.setUserProfile === "function") {
    const currentProfile = await runtimeUsers.getUserProfile(userId);
    await runtimeUsers.setUserProfile(userId, {
      ...currentProfile,
      plano: plan,
      ...(subscriptionId !== undefined ? { subscriptionId } : {}),
      ...(subscriptionOrderId !== undefined ? { subscriptionOrderId } : {}),
      ...(!preservePendingOrder && (plan === "pro" || plan === "gratis")
        ? { pendingProOrderId: null }
        : {}),
    });
  }
}

export async function setServerUserPendingOrder(
  userId: string,
  orderId: string
): Promise<void> {
  const env = getServerEnv();
  const isUnitTestWithoutEmulator =
    env.NODE_ENV === "test" && !env.FIRESTORE_EMULATOR_HOST;

  if (!isUnitTestWithoutEmulator) {
    const db = getAdminFirestore();
    await db.collection("users").doc(userId).set(
      {
        pendingProOrderId: orderId,
        atualizadoEm: Date.now(),
      },
      { merge: true }
    );
  }

  const runtimeUsers = getRepositories().users as MutableRuntimeUsersRepository;
  if (typeof runtimeUsers.setUserProfile === "function") {
    const currentProfile = await runtimeUsers.getUserProfile(userId);
    await runtimeUsers.setUserProfile(userId, {
      ...currentProfile,
      pendingProOrderId: orderId,
    });
  }
}
