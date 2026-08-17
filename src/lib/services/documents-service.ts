/**
 * Documents service — Fachada de acesso a documentos para a UI.
 *
 * Modo Real (Firebase/API):
 *   - Toda operação real é intermediada pelas rotas server-side (/api/documents)
 *   - Zero mutações client-side no Firestore.
 *
 * Modo Demo (sem Firebase / IDs demo-*):
 *   - Armazenamento em localStorage para preview e desenvolvimento local.
 */
import { IS_FIREBASE_CONFIGURED } from "../firebase";
import type { Documento } from "../types";
import {
  listDocumentsApi,
  getDocumentApi,
  deleteDocumentApi,
  duplicateDocumentApi,
} from "../documents/client";

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

function saveDemoDocs(docs: Documento[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(docs));
  } catch {
    // ignore
  }
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
  if (!IS_FIREBASE_CONFIGURED) {
    return loadDemoDocs().filter((d) => d.userId === userId || d.userId === "demo");
  }

  try {
    const dtos = await listDocumentsApi();
    const serverDocs: Documento[] = dtos.map((dto) => ({
      id: dto.id,
      modeloSlug: dto.modeloSlug,
      modeloNome: dto.modeloNome,
      respostas: {},
      status: dto.status,
      userId,
      criadoEm: dto.criadoEm,
      atualizadoEm: dto.atualizadoEm,
    }));
    const localDocs = loadDemoDocs().filter((d) => d.userId === userId || d.userId === "demo");
    const existingIds = new Set(serverDocs.map((d) => d.id));
    return [...serverDocs, ...localDocs.filter((d) => !existingIds.has(d.id))];
  } catch (err) {
    console.warn("[DocumentsService] Não foi possível consultar a API de documentos, usando cache local:", err);
    return loadDemoDocs().filter((d) => d.userId === userId || d.userId === "demo");
  }
}

export async function getDocument(id: string): Promise<Documento | null> {
  if (!IS_FIREBASE_CONFIGURED || id.startsWith("demo-")) {
    return loadDemoDocs().find((d) => d.id === id) || null;
  }

  const dto = await getDocumentApi(id);
  if (!dto) return null;

  return {
    id: dto.id,
    modeloSlug: dto.modeloSlug,
    modeloNome: dto.modeloNome,
    respostas: dto.respostas,
    status: dto.status,
    userId: "",
    criadoEm: dto.criadoEm,
    atualizadoEm: dto.atualizadoEm,
  };
}

export async function deleteDocument(id: string): Promise<void> {
  if (!IS_FIREBASE_CONFIGURED || id.startsWith("demo-")) {
    const docs = loadDemoDocs().filter((d) => d.id !== id);
    saveDemoDocs(docs);
    return;
  }

  await deleteDocumentApi(id);
}

export interface DuplicateDraftResult {
  modeloSlug: string;
  respostas: Record<string, string>;
  clausulasSelecionadas: string[];
  extrasPorClausula: Record<string, Record<string, string>>;
}

export async function duplicateDocument(id: string): Promise<DuplicateDraftResult | null> {
  if (!IS_FIREBASE_CONFIGURED || id.startsWith("demo-")) {
    const original = loadDemoDocs().find((d) => d.id === id);
    if (!original) return null;
    return {
      modeloSlug: original.modeloSlug,
      respostas: original.respostas || {},
      clausulasSelecionadas: [],
      extrasPorClausula: {},
    };
  }

  const result = await duplicateDocumentApi(id);
  return result.duplicateDraft;
}
