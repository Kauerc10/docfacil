/**
 * Models service — reads document templates from Firestore (collection "models")
 * or falls back to the local MODELOS array when Firebase isn't configured.
 *
 * In production, models are stored in Firestore so non-devs can edit them
 * without redeploying. Run `bun run seed:models` to populate the collection.
 */
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, IS_FIREBASE_CONFIGURED } from "../firebase";
import { MODELOS } from "../modelos";
import type { Modelo } from "../types";

export async function getModels(): Promise<Modelo[]> {
  if (!IS_FIREBASE_CONFIGURED || !db) {
    return MODELOS;
  }
  const snap = await getDocs(collection(db, "models"));
  const models = snap.docs.map((d) => d.data() as Modelo);
  // Sort: populares primeiro, depois alfabético
  return models.sort((a, b) => {
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return a.nome.localeCompare(b.nome);
  });
}

export async function getModel(slug: string): Promise<Modelo | null> {
  if (!IS_FIREBASE_CONFIGURED || !db) {
    return MODELOS.find((m) => m.slug === slug) || null;
  }
  const snap = await getDoc(doc(db, "models", slug));
  return snap.exists() ? (snap.data() as Modelo) : null;
}

/** Usado pelo seed script e por testes. */
export { MODELOS as LOCAL_MODELOS };
