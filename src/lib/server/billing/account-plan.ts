import "server-only";
import { getAdminFirestore } from "../firebase-admin";
import { getRepositories } from "../firestore/repositories";

type MutableRuntimeUsersRepository = {
  getUserProfile: (
    userId: string
  ) => Promise<{ plano?: string; email?: string; nome?: string } | null>;
  setUserProfile?: (
    userId: string,
    profile: { plano?: string; email?: string; nome?: string }
  ) => void | Promise<void>;
};

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
    });
  }
}
