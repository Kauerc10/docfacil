import "server-only";
import { getAdminFirestore } from "../firebase-admin";
import { BackendError } from "../errors";
import type { AccountDraft, AccountDraftInput } from "../domain/drafts";

export interface DraftStore {
  save(userId: string, input: AccountDraftInput): Promise<AccountDraft>;
  get(userId: string, draftId: string): Promise<AccountDraft | null>;
  list(userId: string): Promise<AccountDraft[]>;
  delete(userId: string, draftId: string): Promise<void>;
}

function assertOwner(draft: AccountDraft, userId: string): void {
  if (draft.ownerUserId !== userId) {
    throw new BackendError(
      "DRAFT_FORBIDDEN",
      403,
      "Você não tem permissão para acessar este rascunho."
    );
  }
}

export class InMemoryDraftStore implements DraftStore {
  private readonly drafts = new Map<string, AccountDraft>();
  private nextId = 1;

  async save(userId: string, input: AccountDraftInput): Promise<AccountDraft> {
    const now = Date.now();
    const existing = input.draftId ? this.drafts.get(input.draftId) : undefined;

    if (input.draftId && !existing) {
      throw new BackendError("DRAFT_NOT_FOUND", 404, "Rascunho não encontrado.");
    }
    if (existing) assertOwner(existing, userId);

    const id = existing?.id ?? `draft_${this.nextId++}`;
    const draft: AccountDraft = {
      id,
      ownerUserId: userId,
      modeloSlug: input.modeloSlug,
      sourceDocumentId: input.sourceDocumentId ?? existing?.sourceDocumentId,
      respostas: { ...input.respostas },
      stepIndex: input.stepIndex,
      clausulasSelecionadas: [...input.clausulasSelecionadas],
      extrasPorClausula: JSON.parse(JSON.stringify(input.extrasPorClausula)),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.drafts.set(id, draft);
    return JSON.parse(JSON.stringify(draft));
  }

  async get(userId: string, draftId: string): Promise<AccountDraft | null> {
    const draft = this.drafts.get(draftId);
    if (!draft) return null;
    assertOwner(draft, userId);
    return JSON.parse(JSON.stringify(draft));
  }

  async list(userId: string): Promise<AccountDraft[]> {
    return [...this.drafts.values()]
      .filter((draft) => draft.ownerUserId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((draft) => JSON.parse(JSON.stringify(draft)));
  }

  async delete(userId: string, draftId: string): Promise<void> {
    const draft = this.drafts.get(draftId);
    if (!draft) return;
    assertOwner(draft, userId);
    this.drafts.delete(draftId);
  }
}

export class FirestoreDraftStore implements DraftStore {
  private collection() {
    return getAdminFirestore().collection("drafts");
  }

  async save(userId: string, input: AccountDraftInput): Promise<AccountDraft> {
    const ref = input.draftId
      ? this.collection().doc(input.draftId)
      : this.collection().doc();
    const now = Date.now();
    let createdAt = now;
    let existingSourceDocumentId: string | undefined;

    if (input.draftId) {
      const existingSnap = await ref.get();
      if (!existingSnap.exists) {
        throw new BackendError("DRAFT_NOT_FOUND", 404, "Rascunho não encontrado.");
      }
      const existing = existingSnap.data() as AccountDraft;
      assertOwner({ ...existing, id: ref.id }, userId);
      createdAt = existing.createdAt;
      existingSourceDocumentId = existing.sourceDocumentId;
    }

    const draft: AccountDraft = {
      id: ref.id,
      ownerUserId: userId,
      modeloSlug: input.modeloSlug,
      sourceDocumentId: input.sourceDocumentId ?? existingSourceDocumentId,
      respostas: input.respostas,
      stepIndex: input.stepIndex,
      clausulasSelecionadas: input.clausulasSelecionadas,
      extrasPorClausula: input.extrasPorClausula,
      createdAt,
      updatedAt: now,
    };

    await ref.set(draft, { merge: false });
    return draft;
  }

  async get(userId: string, draftId: string): Promise<AccountDraft | null> {
    const snap = await this.collection().doc(draftId).get();
    if (!snap.exists) return null;
    const draft = { ...(snap.data() as Omit<AccountDraft, "id">), id: snap.id } as AccountDraft;
    assertOwner(draft, userId);
    return draft;
  }

  async list(userId: string): Promise<AccountDraft[]> {
    const snap = await this.collection().where("ownerUserId", "==", userId).get();
    return snap.docs
      .map((doc) => ({ ...(doc.data() as Omit<AccountDraft, "id">), id: doc.id }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async delete(userId: string, draftId: string): Promise<void> {
    const ref = this.collection().doc(draftId);
    const snap = await ref.get();
    if (!snap.exists) return;
    const draft = { ...(snap.data() as Omit<AccountDraft, "id">), id: snap.id } as AccountDraft;
    assertOwner(draft, userId);
    await ref.delete();
  }
}

let singleton: DraftStore | null = null;

export function getDraftStore(): DraftStore {
  if (singleton) return singleton;

  const useInMemory =
    process.env.ALLOW_IN_MEMORY_REPOSITORIES === "true" ||
    (process.env.NODE_ENV === "test" && !process.env.FIRESTORE_EMULATOR_HOST);

  singleton = useInMemory ? new InMemoryDraftStore() : new FirestoreDraftStore();
  return singleton;
}

export function setDraftStoreForTesting(store: DraftStore | null): void {
  singleton = store;
}
