import "server-only";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { getAdminFirestore } from "../firebase-admin";
import { BackendError } from "../errors";
import type {
  IDocumentsRepository,
  IAccessRepository,
  IOrdersRepository,
  IGenerationRequestsRepository,
  IUsersRepository,
  IGenerationCommitRepository,
  CommitGeneratedArtifactInput,
} from "./interfaces";
import type {
  DocumentRecord,
  DocumentArtifactRecord,
  AccessLinkRecord,
  GenerationRequestRecord,
  OrderRecord,
  ArtifactState,
} from "../domain/documents";
import {
  InMemoryDocumentsRepository,
  InMemoryAccessRepository,
  InMemoryOrdersRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryUsersRepository,
  InMemoryGenerationCommitRepository,
} from "./in-memory-repositories";

export class FirestoreDocumentsRepository implements IDocumentsRepository {
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async createDocument(data: Omit<DocumentRecord, "id">): Promise<DocumentRecord> {
    const docRef = this.db.collection("documents").doc();
    const record: DocumentRecord = {
      ...data,
      id: docRef.id,
    };
    await docRef.set(record);
    return record;
  }

  public async getDocument(documentId: string): Promise<DocumentRecord | null> {
    const snap = await this.db.collection("documents").doc(documentId).get();
    if (!snap.exists) return null;
    return { ...snap.data(), id: snap.id } as DocumentRecord;
  }

  public async listUserDocuments(userId: string): Promise<DocumentRecord[]> {
    const snap = await this.db
      .collection("documents")
      .where("owner.type", "==", "user")
      .where("owner.userId", "==", userId)
      .get();

    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as DocumentRecord))
      .filter((d) => d.status !== "deleted")
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public async markDocumentDeleted(documentId: string, pendingPurge: boolean): Promise<void> {
    await this.db.collection("documents").doc(documentId).update({
      status: "deleted",
      deletedAt: Date.now(),
      pendingPurge,
      updatedAt: Date.now(),
    });
  }

  public async updateDocumentRespostas(
    documentId: string,
    respostas: Record<string, string>,
    targetVersion: number
  ): Promise<void> {
    await this.db.collection("documents").doc(documentId).update({
      respostas,
      targetVersion,
      updatedAt: Date.now(),
    });
  }

  public async setArtifactState(
    documentId: string,
    state: ArtifactState,
    error?: { code: string; at: number }
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      artifactState: state,
      updatedAt: Date.now(),
    };
    if (error) {
      updates.lastGenerationError = error;
    }
    await this.db.collection("documents").doc(documentId).update(updates);
  }

  public async promoteCurrentVersion(documentId: string, version: number): Promise<void> {
    await this.db.collection("documents").doc(documentId).update({
      currentVersion: version,
      artifactState: "ready",
      updatedAt: Date.now(),
    });
  }

  public async saveArtifact(
    documentId: string,
    artifact: DocumentArtifactRecord
  ): Promise<void> {
    await this.db
      .collection("documents")
      .doc(documentId)
      .collection("artifacts")
      .doc(String(artifact.version))
      .set(artifact);
  }

  public async getArtifact(
    documentId: string,
    version: number
  ): Promise<DocumentArtifactRecord | null> {
    const snap = await this.db
      .collection("documents")
      .doc(documentId)
      .collection("artifacts")
      .doc(String(version))
      .get();

    if (!snap.exists) return null;
    return snap.data() as DocumentArtifactRecord;
  }

  public async listArtifacts(documentId: string): Promise<DocumentArtifactRecord[]> {
    const snaps = await this.db
      .collection("documents")
      .doc(documentId)
      .collection("artifacts")
      .orderBy("version", "asc")
      .get();

    return snaps.docs.map((d) => d.data() as DocumentArtifactRecord);
  }

  public async deleteDocumentAndArtifacts(documentId: string): Promise<void> {
    const docRef = this.db.collection("documents").doc(documentId);
    const artifactsSnap = await docRef.collection("artifacts").get();

    const batch = this.db.batch();
    for (const art of artifactsSnap.docs) {
      batch.delete(art.ref);
    }
    batch.delete(docRef);
    await batch.commit();
  }

  public async countUserMonthlyDocuments(
    userId: string,
    startOfMonthTimestamp: number
  ): Promise<number> {
    const snaps = await this.db
      .collection("documents")
      .where("owner.type", "==", "user")
      .where("owner.userId", "==", userId)
      .where("createdAt", ">=", startOfMonthTimestamp)
      .count()
      .get();

    return snaps.data().count;
  }
}

export class FirestoreAccessRepository implements IAccessRepository {
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async createAccessLink(link: AccessLinkRecord): Promise<void> {
    await this.db.collection("access_links").doc(link.tokenHash).set(link);
  }

  public async getAccessLink(tokenHash: string): Promise<AccessLinkRecord | null> {
    const snap = await this.db.collection("access_links").doc(tokenHash).get();
    if (!snap.exists) return null;
    return snap.data() as AccessLinkRecord;
  }

  public async findActiveShareLink(
    documentId: string,
    userId: string
  ): Promise<AccessLinkRecord | null> {
    const snaps = await this.db
      .collection("access_links")
      .where("documentId", "==", documentId)
      .where("kind", "==", "share")
      .where("active", "==", true)
      .where("createdByUserId", "==", userId)
      .limit(1)
      .get();

    if (snaps.empty) return null;
    return snaps.docs[0].data() as AccessLinkRecord;
  }

  public async revokeAccessLink(tokenHash: string): Promise<void> {
    await this.db.collection("access_links").doc(tokenHash).update({
      active: false,
      revokedAt: Date.now(),
    });
  }

  public async revokeDocumentShareLinks(documentId: string): Promise<void> {
    const snaps = await this.db
      .collection("access_links")
      .where("documentId", "==", documentId)
      .where("kind", "==", "share")
      .where("active", "==", true)
      .get();

    if (snaps.empty) return;

    const batch = this.db.batch();
    const now = Date.now();
    for (const doc of snaps.docs) {
      batch.update(doc.ref, { active: false, revokedAt: now });
    }
    await batch.commit();
  }

  public async recordAccess(tokenHash: string): Promise<void> {
    await this.db.collection("access_links").doc(tokenHash).update({
      accessCount: FieldValue.increment(1),
      lastAccessedAt: Date.now(),
    });
  }
}

export class FirestoreOrdersRepository implements IOrdersRepository {
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async createOrder(order: Omit<OrderRecord, "id">): Promise<OrderRecord> {
    const docRef = this.db.collection("orders").doc();
    const record: OrderRecord = {
      ...order,
      id: docRef.id,
    };
    await docRef.set(record);
    return record;
  }

  public async getOrder(orderId: string): Promise<OrderRecord | null> {
    const snap = await this.db.collection("orders").doc(orderId).get();
    if (!snap.exists) return null;
    return { ...snap.data(), id: snap.id } as OrderRecord;
  }

  public async markOrderPaid(orderId: string): Promise<OrderRecord> {
    const docRef = this.db.collection("orders").doc(orderId);
    const paidAt = Date.now();
    await docRef.update({
      status: "paid",
      paidAt,
    });
    const snap = await docRef.get();
    return { ...snap.data(), id: snap.id } as OrderRecord;
  }

  public async consumeOrder(orderId: string, documentId: string): Promise<void> {
    await this.db.collection("orders").doc(orderId).update({
      status: "consumed",
      documentId,
      consumedAt: Date.now(),
    });
  }

  public async reservePaidOrder(params: {
    orderId: string;
    requestId: string;
    principalKey: string;
  }): Promise<OrderRecord> {
    const docRef = this.db.collection("orders").doc(params.orderId);

    return await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) {
        throw new BackendError("ORDER_NOT_FOUND", 404, "Pedido de compra não encontrado.");
      }

      const order = { ...snap.data(), id: snap.id } as OrderRecord;

      if (order.status === "reserved" && order.reservedByRequestId === params.requestId) {
        return order;
      }

      if (order.status === "reserved") {
        throw new BackendError(
          "ORDER_ALREADY_RESERVED",
          409,
          "Este pagamento já está sendo processado por outra solicitação."
        );
      }

      if (order.status === "consumed") {
        throw new BackendError(
          "ORDER_ALREADY_CONSUMED",
          409,
          "Este pagamento já foi utilizado para gerar outro documento."
        );
      }

      if (order.status !== "paid") {
        throw new BackendError(
          "ORDER_NOT_PAID",
          402,
          "O pagamento informado ainda não foi confirmado."
        );
      }

      tx.update(docRef, {
        status: "reserved",
        reservedByRequestId: params.requestId,
        reservedAt: Date.now(),
      });

      return {
        ...order,
        status: "reserved",
        reservedByRequestId: params.requestId,
        reservedAt: Date.now(),
      };
    });
  }

  public async consumeReservedOrder(params: {
    orderId: string;
    requestId: string;
    documentId: string;
  }): Promise<void> {
    const docRef = this.db.collection("orders").doc(params.orderId);
    await docRef.update({
      status: "consumed",
      documentId: params.documentId,
      consumedAt: Date.now(),
    });
  }

  public async releaseReservedOrder(params: {
    orderId: string;
    requestId: string;
  }): Promise<void> {
    const docRef = this.db.collection("orders").doc(params.orderId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (snap.exists) {
        const order = snap.data() as OrderRecord;
        if (order.status === "reserved" && order.reservedByRequestId === params.requestId) {
          tx.update(docRef, {
            status: "paid",
            reservedByRequestId: FieldValue.delete(),
            reservedAt: FieldValue.delete(),
          });
        }
      }
    });
  }
}

export class FirestoreGenerationRequestsRepository
  implements IGenerationRequestsRepository
{
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async getOrCreateRequest(
    requestId: string,
    initData: Omit<
      GenerationRequestRecord,
      "requestId" | "status" | "createdAt" | "updatedAt" | "expiresAt"
    >
  ): Promise<{ request: GenerationRequestRecord; isNew: boolean }> {
    const docRef = this.db.collection("generation_requests").doc(requestId);

    return await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (snap.exists) {
        return { request: snap.data() as GenerationRequestRecord, isNew: false };
      }

      const now = Date.now();
      const newRecord: GenerationRequestRecord = {
        ...initData,
        requestId,
        status: "processing",
        createdAt: now,
        updatedAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000,
      };

      tx.set(docRef, newRecord);
      return { request: newRecord, isNew: true };
    });
  }

  public async getRequest(
    requestId: string
  ): Promise<GenerationRequestRecord | null> {
    const snap = await this.db.collection("generation_requests").doc(requestId).get();
    if (!snap.exists) return null;
    return snap.data() as GenerationRequestRecord;
  }

  public async markCompleted(
    requestId: string,
    data: {
      documentId: string;
      targetVersion: number;
      guestAccessPath?: string;
    }
  ): Promise<void> {
    const updates: Record<string, unknown> = {
      status: "completed",
      documentId: data.documentId,
      targetVersion: data.targetVersion,
      updatedAt: Date.now(),
    };
    if (data.guestAccessPath) {
      updates.result = { guestAccessPath: data.guestAccessPath };
    }
    await this.db.collection("generation_requests").doc(requestId).update(updates);
  }

  public async markFailed(requestId: string, errorCode: string): Promise<void> {
    await this.db.collection("generation_requests").doc(requestId).update({
      status: "failed",
      errorCode,
      updatedAt: Date.now(),
    });
  }
}

export class FirestoreUsersRepository implements IUsersRepository {
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async getUserProfile(
    userId: string
  ): Promise<{ plano?: string; email?: string; nome?: string } | null> {
    const snap = await this.db.collection("users").doc(userId).get();
    if (!snap.exists) return null;
    return snap.data() as { plano?: string; email?: string; nome?: string };
  }
}

export class FirestoreGenerationCommitRepository implements IGenerationCommitRepository {
  private readonly db: Firestore;

  constructor(db: Firestore = getAdminFirestore()) {
    this.db = db;
  }

  public async commitGeneratedArtifact(input: CommitGeneratedArtifactInput): Promise<void> {
    await this.db.runTransaction(async (tx) => {
      const documentRef = this.db.collection("documents").doc(input.documentId);
      const artifactRef = documentRef.collection("artifacts").doc(String(input.targetVersion));
      const requestRef = this.db.collection("generation_requests").doc(input.requestId);

      const docSnapshot = await tx.get(documentRef);
      if (!docSnapshot.exists) {
        throw new BackendError(
          "DOCUMENT_NOT_FOUND",
          404,
          "Documento não encontrado durante commit da geração."
        );
      }

      tx.set(artifactRef, input.artifact);

      tx.update(documentRef, {
        respostas: input.respostas,
        currentVersion: input.targetVersion,
        targetVersion: input.targetVersion,
        artifactState: "ready",
        updatedAt: input.now,
        lastGenerationError: FieldValue.delete(),
      });

      if (input.singlePurchase) {
        const orderRef = this.db.collection("orders").doc(input.singlePurchase.orderId);
        const orderSnapshot = await tx.get(orderRef);

        if (!orderSnapshot.exists) {
          throw new BackendError(
            "ORDER_NOT_FOUND",
            404,
            "Pedido não encontrado durante commit."
          );
        }

        const order = orderSnapshot.data();
        if (order?.status !== "reserved" || order?.reservedByRequestId !== input.requestId) {
          throw new BackendError(
            "ORDER_ALREADY_RESERVED",
            409,
            "Pedido não está reservado por esta geração."
          );
        }

        tx.update(orderRef, {
          status: "consumed",
          documentId: input.documentId,
          consumedAt: input.now,
        });
      }

      if (input.guestAccess) {
        const accessRef = this.db.collection("access_links").doc(input.guestAccess.tokenHash);
        tx.create(accessRef, {
          tokenHash: input.guestAccess.tokenHash,
          kind: "guest",
          documentId: input.documentId,
          version: input.targetVersion,
          active: true,
          createdAt: input.now,
        });
      }

      tx.update(requestRef, {
        status: "completed",
        documentId: input.documentId,
        targetVersion: input.targetVersion,
        result: input.guestAccessPath ? { guestAccessPath: input.guestAccessPath } : {},
        updatedAt: input.now,
      });
    });
  }
}

export interface BackendRepositories {
  documents: IDocumentsRepository;
  access: IAccessRepository;
  orders: IOrdersRepository;
  generationRequests: IGenerationRequestsRepository;
  users: IUsersRepository;
  generationCommit: IGenerationCommitRepository;
}

let repositoriesSingleton: BackendRepositories | null = null;

export function getRepositories(): BackendRepositories {
  if (repositoriesSingleton) {
    return repositoriesSingleton;
  }

  if (process.env.NODE_ENV === "test" && !process.env.FIRESTORE_EMULATOR_HOST) {
    const docs = new InMemoryDocumentsRepository();
    const access = new InMemoryAccessRepository();
    const orders = new InMemoryOrdersRepository();
    const generationRequests = new InMemoryGenerationRequestsRepository();
    const users = new InMemoryUsersRepository();
    const generationCommit = new InMemoryGenerationCommitRepository(
      docs,
      access,
      orders,
      generationRequests
    );

    repositoriesSingleton = {
      documents: docs,
      access,
      orders,
      generationRequests,
      users,
      generationCommit,
    };
  } else {
    repositoriesSingleton = {
      documents: new FirestoreDocumentsRepository(),
      access: new FirestoreAccessRepository(),
      orders: new FirestoreOrdersRepository(),
      generationRequests: new FirestoreGenerationRequestsRepository(),
      users: new FirestoreUsersRepository(),
      generationCommit: new FirestoreGenerationCommitRepository(),
    };
  }

  return repositoriesSingleton;
}

export function setTestRepositories(repos: BackendRepositories | null): void {
  repositoriesSingleton = repos;
}

export function setRepositoriesForTesting(repos: Partial<BackendRepositories> | null): void {
  if (!repos) {
    repositoriesSingleton = null;
    return;
  }
  const current = getRepositories();
  repositoriesSingleton = {
    ...current,
    ...repos,
  };
}
