import "server-only";
import type {
  DocumentRecord,
  DocumentArtifactRecord,
  AccessLinkRecord,
  GenerationRequestRecord,
  OrderRecord,
  ArtifactState,
} from "../domain/documents";
import type { CommitGeneratedArtifactInput } from "./interfaces";
import { getServerEnv } from "../env";
import { assertProductionServerConfig } from "../config/assert-production-config";

export interface DocumentStore {
  // Idempotency & Generation Requests
  getOrCreateGenerationRequest(
    requestId: string,
    initData: Omit<
      GenerationRequestRecord,
      "requestId" | "status" | "createdAt" | "updatedAt" | "expiresAt"
    >
  ): Promise<{ request: GenerationRequestRecord; isNew: boolean }>;
  getGenerationRequest(requestId: string): Promise<GenerationRequestRecord | null>;
  markGenerationCompleted(
    requestId: string,
    data: {
      documentId: string;
      targetVersion: number;
      guestAccessPath?: string;
    }
  ): Promise<void>;
  markGenerationFailed(requestId: string, errorCode: string): Promise<void>;

  // Documents & Artifacts
  createDocument(data: Omit<DocumentRecord, "id">): Promise<DocumentRecord>;
  getDocument(documentId: string): Promise<DocumentRecord | null>;
  listUserDocuments(userId: string): Promise<DocumentRecord[]>;
  updateDocumentRespostas(
    documentId: string,
    respostas: Record<string, string>,
    targetVersion: number
  ): Promise<void>;
  setArtifactState(
    documentId: string,
    state: ArtifactState,
    error?: { code: string; at: number }
  ): Promise<void>;
  reserveNextVersion(documentId: string, requestId: string): Promise<number>;
  promoteCurrentVersion(documentId: string, version: number): Promise<void>;
  saveArtifact(documentId: string, artifact: DocumentArtifactRecord): Promise<void>;
  getArtifact(documentId: string, version: number): Promise<DocumentArtifactRecord | null>;
  listArtifacts(documentId: string): Promise<DocumentArtifactRecord[]>;
  deleteDocumentAndArtifacts(documentId: string): Promise<void>;
  markDocumentDeleted(documentId: string, pendingPurge: boolean): Promise<void>;
  countUserMonthlyDocuments(
    userId: string,
    startOfMonthTimestamp: number
  ): Promise<number>;

  // Access & Share Links
  createAccessLink(link: AccessLinkRecord): Promise<void>;
  getAccessLink(tokenHash: string): Promise<AccessLinkRecord | null>;
  findActiveShareLink(
    documentId: string,
    userId: string
  ): Promise<AccessLinkRecord | null>;
  revokeAccessLink(tokenHash: string): Promise<void>;
  revokeDocumentShareLinks(documentId: string): Promise<void>;
  recordAccess(tokenHash: string): Promise<void>;

  // Orders
  createOrder(order: Omit<OrderRecord, "id">): Promise<OrderRecord>;
  getOrder(orderId: string): Promise<OrderRecord | null>;
  markOrderPaid(orderId: string): Promise<OrderRecord>;
  consumeOrder(orderId: string, documentId: string): Promise<void>;
  reservePaidOrder(params: {
    orderId: string;
    requestId: string;
    principalKey: string;
  }): Promise<OrderRecord>;
  consumeReservedOrder(params: {
    orderId: string;
    requestId: string;
    documentId: string;
  }): Promise<void>;
  releaseReservedOrder(params: {
    orderId: string;
    requestId: string;
  }): Promise<void>;

  // User Profiles
  getUserProfile(
    userId: string
  ): Promise<{ plano?: string; email?: string; nome?: string } | null>;

  // Coarse-grained Atomic Transaction
  commitGeneratedArtifact(
    input: CommitGeneratedArtifactInput
  ): Promise<void>;
}

let storeSingleton: DocumentStore | null = null;

export function getDocumentStore(): DocumentStore {
  if (storeSingleton) {
    return storeSingleton;
  }

  const env = getServerEnv();
  assertProductionServerConfig(env);

  const useInMemory =
    env.ALLOW_IN_MEMORY_REPOSITORIES ||
    (env.NODE_ENV === "test" && !env.FIRESTORE_EMULATOR_HOST);

  if (useInMemory) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { InMemoryDocumentStore } = require("./in-memory-document-store");
    storeSingleton = new InMemoryDocumentStore(false);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { FirestoreDocumentStore } = require("./firestore-document-store");
    storeSingleton = new FirestoreDocumentStore();
  }

  return storeSingleton!;
}

export function setDocumentStoreForTesting(store: DocumentStore | null): void {
  storeSingleton = store;
  if (!store && typeof (globalThis as any).__resetRepositoriesSingleton === "function") {
    (globalThis as any).__resetRepositoriesSingleton();
  }
}

export function adaptRepositoriesToStore(repos: any): DocumentStore {
  if (repos && typeof repos.commitGeneratedArtifact === "function") {
    return repos as DocumentStore;
  }

  let generationCommit = repos.generationCommit;
  if (!generationCommit && repos.documents && repos.orders) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { InMemoryGenerationCommitRepository } = require("./in-memory-repositories");
    generationCommit = new InMemoryGenerationCommitRepository(
      repos.documents,
      repos.access,
      repos.orders,
      repos.generationRequests
    );
  }

  return {
    getOrCreateGenerationRequest: (id, data) => repos.generationRequests.getOrCreateRequest(id, data),
    getGenerationRequest: (id) => repos.generationRequests.getRequest(id),
    markGenerationCompleted: (id, data) => repos.generationRequests.markCompleted(id, data),
    markGenerationFailed: (id, err) => repos.generationRequests.markFailed(id, err),

    createDocument: (data) => repos.documents.createDocument(data),
    getDocument: (id) => repos.documents.getDocument(id),
    listUserDocuments: (userId) => repos.documents.listUserDocuments(userId),
    updateDocumentRespostas: (id, resp, ver) => repos.documents.updateDocumentRespostas(id, resp, ver),
    setArtifactState: (id, state, err) => repos.documents.setArtifactState(id, state, err),
    reserveNextVersion: (id, reqId) => repos.documents.reserveNextVersion(id, reqId),
    promoteCurrentVersion: (id, ver) => repos.documents.promoteCurrentVersion(id, ver),
    saveArtifact: (id, art) => repos.documents.saveArtifact(id, art),
    getArtifact: (id, ver) => repos.documents.getArtifact(id, ver),
    listArtifacts: (id) => repos.documents.listArtifacts(id),
    deleteDocumentAndArtifacts: (id) => repos.documents.deleteDocumentAndArtifacts(id),
    markDocumentDeleted: (id, purge) => repos.documents.markDocumentDeleted(id, purge),
    countUserMonthlyDocuments: (userId, ts) => repos.documents.countUserMonthlyDocuments(userId, ts),

    createAccessLink: (link) => repos.access.createAccessLink(link),
    getAccessLink: (hash) => repos.access.getAccessLink(hash),
    findActiveShareLink: (id, userId) => repos.access.findActiveShareLink(id, userId),
    revokeAccessLink: (hash) => repos.access.revokeAccessLink(hash),
    revokeDocumentShareLinks: (id) => repos.access.revokeDocumentShareLinks(id),
    recordAccess: (hash) => repos.access.recordAccess(hash),

    createOrder: (order) => repos.orders.createOrder(order),
    getOrder: (id) => repos.orders.getOrder(id),
    markOrderPaid: (id) => repos.orders.markOrderPaid(id),
    consumeOrder: (id, docId) => repos.orders.consumeOrder(id, docId),
    reservePaidOrder: (p) => repos.orders.reservePaidOrder(p),
    consumeReservedOrder: (p) => repos.orders.consumeReservedOrder(p),
    releaseReservedOrder: (p) => repos.orders.releaseReservedOrder(p),

    getUserProfile: (id) => repos.users.getUserProfile(id),

    commitGeneratedArtifact: (input) => generationCommit.commitGeneratedArtifact(input),
  };
}

