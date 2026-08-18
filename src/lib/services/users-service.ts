/**
 * Users service — reads/writes the user profile in Firestore (collection "users").
 * Demo mode: returns a mock profile derived from the demo auth user.
 *
 * Payments (collection "payments") are read-only here — populated by the
 * billing integration (Stripe/Pix) when that lands.
 */
import { collection, doc, getDoc, getDocs, query, where, setDoc } from "firebase/firestore";
import { db, IS_FIREBASE_CONFIGURED } from "../firebase";
import type { PerfilUsuario, Pagamento } from "../types";

export async function getPerfil(uid: string): Promise<PerfilUsuario | null> {
  if (!IS_FIREBASE_CONFIGURED || !db) {
    return {
      uid,
      nome: "Usuário Demo",
      email: "demo@docfacil.com",
      plano: "gratis",
      criadoEm: Date.now(),
      atualizadoEm: Date.now(),
    };
  }
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as PerfilUsuario) : null;
}

export async function savePerfil(uid: string, data: Partial<PerfilUsuario>): Promise<void> {
  if (!IS_FIREBASE_CONFIGURED || !db) return;
  const cleanData: Record<string, unknown> = { atualizadoEm: Date.now() };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  await setDoc(doc(db, "users", uid), cleanData, { merge: true });
}

export async function listPagamentos(uid: string): Promise<Pagamento[]> {
  if (!IS_FIREBASE_CONFIGURED || !db) {
    // Mock histórico
    const now = Date.now();
    const month = 30 * 24 * 60 * 60 * 1000;
    return [
      { id: "p1", data: now, valor: 29.9, plano: "pro", status: "pago", metodo: "pix" },
      { id: "p2", data: now - month, valor: 29.9, plano: "pro", status: "pago", metodo: "cartao" },
      { id: "p3", data: now - 2 * month, valor: 19.9, plano: "avulso", status: "pago", metodo: "pix" },
    ];
  }
  const q = query(collection(db, "payments"), where("userId", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Pagamento).sort((a, b) => b.data - a.data);
}
