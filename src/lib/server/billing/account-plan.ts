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

export interface SetServerUserPlanOptions {
  subscriptionStatus?: "active" | "cancelled" | null;
  subscriptionExpiresAt?: number | null;
  cancelledAt?: number | null;
}

export async function setServerUserPlan(
  userId: string,
  plan: "gratis" | "pro",
  subscriptionId?: string | null,
  subscriptionOrderId?: string | null,
  preservePendingOrder: boolean = false,
  options?: SetServerUserPlanOptions
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

  if (options?.subscriptionStatus !== undefined) {
    dataToSet.subscriptionStatus = options.subscriptionStatus;
  } else if (plan === "pro") {
    dataToSet.subscriptionStatus = "active";
  } else {
    dataToSet.subscriptionStatus = null;
  }

  if (options?.subscriptionExpiresAt !== undefined) {
    dataToSet.subscriptionExpiresAt = options.subscriptionExpiresAt;
  } else if (plan === "pro") {
    dataToSet.subscriptionExpiresAt = null;
  } else {
    dataToSet.subscriptionExpiresAt = null;
  }

  if (options?.cancelledAt !== undefined) {
    dataToSet.cancelledAt = options.cancelledAt;
  } else if (plan === "pro") {
    dataToSet.cancelledAt = null;
  } else {
    dataToSet.cancelledAt = null;
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
      subscriptionStatus: (dataToSet.subscriptionStatus as "active" | "cancelled" | undefined) ?? undefined,
      subscriptionExpiresAt: (dataToSet.subscriptionExpiresAt as number | undefined) ?? undefined,
      cancelledAt: (dataToSet.cancelledAt as number | undefined) ?? undefined,
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
