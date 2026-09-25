import { expect, test } from "bun:test";
import type { Firestore } from "firebase-admin/firestore";
import { FirestoreAICheckpointer } from "./firestore-checkpointer";

test("persiste checkpoints, escritas pendentes e remove a conversa", async () => {
  const records = new Map<string, Record<string, unknown>>();
  class Ref {
    constructor(readonly path: string) {}
    get id() { return this.path.split("/").at(-1)!; }
    get parent() { return { parent: new Ref(this.path.split("/").slice(0, -1).join("/")) }; }
    collection(name: string) { return new Collection(`${this.path}/${name}`); }
    async get() { return { id: this.id, exists: records.has(this.path), data: () => records.get(this.path) }; }
    async set(value: Record<string, unknown>, options?: { merge: boolean }) {
      records.set(this.path, options?.merge ? { ...records.get(this.path), ...value } : value);
    }
  }
  class Collection {
    private maximum = 100;
    constructor(readonly path: string) {}
    doc(id: string) { return new Ref(`${this.path}/${id}`); }
    get parent() { return new Ref(this.path.split("/").slice(0, -1).join("/")); }
    orderBy() { return this; }
    limit(value: number) { this.maximum = value; return this; }
    async get() {
      const docs = [...records.keys()].filter((path) => path.startsWith(`${this.path}/`) && path.slice(this.path.length + 1).split("/").length === 1)
        .sort().reverse().slice(0, this.maximum).map((path) => new Ref(path));
      return { docs: await Promise.all(docs.map((doc) => doc.get())) };
    }
  }
  const db = {
    collection: (name: string) => new Collection(name),
    runTransaction: async (fn: (tx: { get: (ref: Ref) => ReturnType<Ref["get"]>; set: (ref: Ref, value: Record<string, unknown>, options: { merge: boolean }) => void }) => Promise<void>) => {
      const writes: Array<Promise<void>> = [];
      await fn({ get: (ref) => ref.get(), set: (ref, value, options) => { writes.push(ref.set(value, options)); } });
      await Promise.all(writes);
    },
    recursiveDelete: async (ref: Ref) => {
      for (const key of records.keys()) if (key === ref.path || key.startsWith(`${ref.path}/`)) records.delete(key);
    },
  } as unknown as Firestore;
  const saver = new FirestoreAICheckpointer(db);
  const thread = crypto.randomUUID();
  const config = { configurable: { thread_id: thread } };
  const checkpoint = { v: 4, id: "00000000-0000-0000-0000-000000000001", ts: new Date().toISOString(), channel_values: { answer: "Bruno" }, channel_versions: {}, versions_seen: {} };
  const saved = await saver.put(config, checkpoint, { source: "input", step: 1, parents: {} });
  await saver.putWrites(saved, [["draft", { title: "Comodato" }]], "task-1");
  await saver.putWrites(saved, [["draft", { title: "Comodato" }]], "task-1");
  const tuple = await saver.getTuple(config);
  expect(tuple?.checkpoint.channel_values).toEqual({ answer: "Bruno" });
  expect(tuple?.pendingWrites).toEqual([["task-1", "draft", { title: "Comodato" }]]);
  expect((await Array.fromAsync(saver.list(config)))).toHaveLength(1);
  await saver.deleteThread(thread);
  expect(await saver.getTuple(config)).toBeUndefined();
});
