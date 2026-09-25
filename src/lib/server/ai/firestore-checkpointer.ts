import "server-only";
import { BaseCheckpointSaver, type Checkpoint, type CheckpointTuple, type CheckpointListOptions, type CheckpointMetadata, type PendingWrite } from "@langchain/langgraph-checkpoint";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/server/firebase-admin";

type Stored = {
  checkpoint: string;
  metadata: string;
  parentId?: string;
  writes?: Array<{ taskId: string; index: number; channel: string; value: string }>;
};

function threadId(config: RunnableConfig): string {
  const id = config.configurable?.thread_id;
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Invalid AI thread ID");
  return id;
}

export class FirestoreAICheckpointer extends BaseCheckpointSaver {
  constructor(private readonly db?: Firestore) { super(); }

  private database(): Firestore { return this.db ?? getAdminFirestore(); }

  private collection(config: RunnableConfig) {
    return this.database().collection("ai_sessions").doc(threadId(config)).collection("checkpoints");
  }

  private async encode(value: unknown): Promise<string> {
    const [type, data] = await this.serde.dumpsTyped(value);
    return JSON.stringify({ type, data: Buffer.from(data).toString("base64") });
  }

  private async decode(value: string): Promise<unknown> {
    const encoded = JSON.parse(value) as { type: string; data: string };
    return this.serde.loadsTyped(encoded.type, Buffer.from(encoded.data, "base64"));
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const requested = config.configurable?.checkpoint_id;
    const snap = requested
      ? await this.collection(config).doc(String(requested)).get()
      : (await this.collection(config).orderBy("__name__", "desc").limit(1).get()).docs[0];
    if (!snap?.exists) return undefined;
    const stored = snap.data() as Stored;
    const base = { thread_id: threadId(config), checkpoint_id: snap.id };
    return {
      config: { configurable: base },
      checkpoint: await this.decode(stored.checkpoint) as Checkpoint,
      metadata: await this.decode(stored.metadata) as CheckpointMetadata,
      parentConfig: stored.parentId ? { configurable: { thread_id: base.thread_id, checkpoint_id: stored.parentId } } : undefined,
      pendingWrites: await Promise.all((stored.writes ?? []).map(async (write) => [write.taskId, write.channel, await this.decode(write.value)] as [string, string, unknown])),
    };
  }

  async *list(config: RunnableConfig, options?: CheckpointListOptions): AsyncGenerator<CheckpointTuple> {
    const snaps = await this.collection(config).orderBy("__name__", "desc").limit(options?.limit ?? 100).get();
    for (const snap of snaps.docs) {
      if (options?.before?.configurable?.checkpoint_id && snap.id >= options.before.configurable.checkpoint_id) continue;
      const tuple = await this.getTuple({ configurable: { thread_id: threadId(config), checkpoint_id: snap.id } });
      if (tuple) yield tuple;
    }
  }

  async put(config: RunnableConfig, checkpoint: Checkpoint, metadata: CheckpointMetadata): Promise<RunnableConfig> {
    const ref = this.collection(config).doc(checkpoint.id);
    await ref.set({
      checkpoint: await this.encode(checkpoint),
      metadata: await this.encode(metadata),
      ...(config.configurable?.checkpoint_id ? { parentId: String(config.configurable.checkpoint_id) } : {}),
    } satisfies Stored, { merge: true });
    return { configurable: { thread_id: threadId(config), checkpoint_id: checkpoint.id } };
  }

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    const checkpointId = config.configurable?.checkpoint_id;
    if (!checkpointId) throw new Error("Missing checkpoint ID");
    const ref = this.collection(config).doc(String(checkpointId));
    const encoded = await Promise.all(writes.map(async ([channel, value], index) => ({ taskId, index, channel, value: await this.encode(value) })));
    await this.database().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const previous = ((snap.data() as Stored | undefined)?.writes ?? []);
      const existing = new Set(previous.map((write) => `${write.taskId}:${write.index}`));
      tx.set(ref, { writes: [...previous, ...encoded.filter((write) => !existing.has(`${write.taskId}:${write.index}`))] }, { merge: true });
    });
  }

  async deleteThread(id: string): Promise<void> {
    await this.database().recursiveDelete(this.collection({ configurable: { thread_id: id } }).parent!);
  }
}
