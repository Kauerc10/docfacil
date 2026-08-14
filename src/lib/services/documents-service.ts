/**
 * Documents service — CRUD for user-generated documents.
 *
 * Firestore collection: "documents" (one doc per generated document)
 *   - id (auto)
 *   - modeloSlug, modeloNome
 *   - respostas: Record<string, string>
 *   - status: "rascunho" | "concluido"
 *   - userId: Firebase Auth uid
 *   - criadoEm, atualizadoEm: timestamps
 *
 * Security rules (to deploy with Firebase):
 *   match /documents/{id} {
 *     allow read: if request.auth.uid == resource.data.userId;
 *     allow create: if request.auth.uid == request.resource.data.userId;
 *     allow update, delete: if request.auth.uid == resource.data.userId;
 *   }
 *
 * Demo mode (no Firebase): in-memory array + localStorage persistence so the
 * dashboard flow works end-to-end for the team today.
 */
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
} from "firebase/firestore";
import { db, IS_FIREBASE_CONFIGURED } from "../firebase";
import type { Documento } from "../types";

const DEMO_KEY = "docfacil:demo-documents";

// --- Demo-mode storage (localStorage) ---
function loadDemoDocs(): Documento[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? (JSON.parse(raw) as Documento[]) : seedDemoDocs();
  } catch {
    return [];
  }
}
function saveDemoDocs(docs: Documento[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_KEY, JSON.stringify(docs));
}
function seedDemoDocs(): Documento[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const seed: Documento[] = [
    {
      id: "demo-1",
      modeloSlug: "contrato-locacao",
      modeloNome: "Contrato de Locação",
      respostas: {
        locador: "Maria Aparecida da Silva",
        locatario: "João Pereira Santos",
        imovel: "Rua das Flores, 123 — São Paulo/SP",
        valor: "1.450,00",
        prazo: "30",
      },
      status: "concluido",
      userId: "demo",
      criadoEm: now - 5 * day,
      atualizadoEm: now - 5 * day,
    },
    {
      id: "demo-2",
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: {
        nome: "Carlos Eduardo Lima",
        rg: "RG 12.345.678-9 / CPF 123.456.789-00",
        endereco: "Av. Paulista, 1000 — São Paulo/SP",
      },
      status: "concluido",
      userId: "demo",
      criadoEm: now - 2 * day,
      atualizadoEm: now - 2 * day,
    },
    {
      id: "demo-3",
      modeloSlug: "procuracao-simples",
      modeloNome: "Procuração Simples",
      respostas: {
        outorgante: "Ana Souza",
        outorgado: "Pedro Lima",
        poderes: "Assinar documentos em meu nome",
      },
      status: "rascunho",
      userId: "demo",
      criadoEm: now - 1 * day,
      atualizadoEm: now - 1 * day,
    },
  ];
  saveDemoDocs(seed);
  return seed;
}

export async function listDocuments(userId: string): Promise<Documento[]> {
  if (!IS_FIREBASE_CONFIGURED || !db) {
    return loadDemoDocs().filter((d) => d.userId === userId || d.userId === "demo");
  }
  const q = query(collection(db, "documents"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Documento, "id">) }))
    .sort((a, b) => b.atualizadoEm - a.atualizadoEm);
}

export async function getDocument(id: string): Promise<Documento | null> {
  if (!IS_FIREBASE_CONFIGURED || !db) {
    return loadDemoDocs().find((d) => d.id === id) || null;
  }
  const ref = doc(db, "documents", id);
  const s = await getDoc(ref);
  if (s.exists()) return { id: s.id, ...(s.data() as Omit<Documento, "id">) };
  return null;
}

export async function createDocument(
  data: Omit<Documento, "id" | "criadoEm" | "atualizadoEm">
): Promise<Documento> {
  const now = Date.now();
  if (!IS_FIREBASE_CONFIGURED || !db) {
    const docs = loadDemoDocs();
    const novo: Documento = { ...data, id: `demo-${now}`, criadoEm: now, atualizadoEm: now };
    docs.unshift(novo);
    saveDemoDocs(docs);
    return novo;
  }
  const ref = await addDoc(collection(db, "documents"), {
    ...data,
    criadoEm: now,
    atualizadoEm: now,
  });
  return { ...data, id: ref.id, criadoEm: now, atualizadoEm: now };
}

export async function updateDocument(
  id: string,
  data: Partial<Pick<Documento, "respostas" | "status">>
): Promise<void> {
  if (!IS_FIREBASE_CONFIGURED || !db) {
    const docs = loadDemoDocs();
    const idx = docs.findIndex((d) => d.id === id);
    if (idx >= 0) {
      docs[idx] = { ...docs[idx], ...data, atualizadoEm: Date.now() };
      saveDemoDocs(docs);
    }
    return;
  }
  await updateDoc(doc(db, "documents", id), { ...data, atualizadoEm: Date.now() });
}

export async function deleteDocument(id: string): Promise<void> {
  if (id.startsWith("demo-")) {
    const docs = loadDemoDocs().filter((d) => d.id !== id);
    saveDemoDocs(docs);
    return;
  }
  const { deleteDocumentApi } = await import("@/lib/documents/client");
  await deleteDocumentApi(id);
}

export async function duplicateDocument(id: string): Promise<Documento | null> {
  const original = await getDocument(id);
  if (!original) return null;
  return createDocument({
    modeloSlug: original.modeloSlug,
    modeloNome: original.modeloNome,
    respostas: { ...original.respostas },
    status: "rascunho",
    userId: original.userId,
  });
}

export { setDoc };
