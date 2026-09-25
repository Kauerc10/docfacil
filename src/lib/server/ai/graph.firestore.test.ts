import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { configureAdminFirestore, setAdminFirestoreForTesting } from "@/lib/server/firebase-admin";

const enabled = process.env.RUN_AI_GRAPH_TESTS === "true";

mock.module("./groq", () => ({
  groqStructured: async (name: string) => name === "classify_document"
    ? { documentType: "Termo de empréstimo de equipamento", blocked: false, reason: "", questions: ["Qual é o nome de quem recebe o equipamento?"], suggestedSlug: "" }
    : { title: "Termo de empréstimo de equipamento", sections: [
      { title: "Entrega", paragraphs: ["Ana entrega o notebook Dell a Bruno para uso pelo prazo informado."] },
      { title: "Devolução", paragraphs: ["Bruno se compromete a devolver o equipamento ao fim do prazo acordado."] },
    ], referenceIds: [] },
}));

describe.skipIf(!enabled)("fluxo LangGraph persistido no Firestore", () => {
  let app: App;
  let db: Firestore;

  beforeAll(() => {
    app = initializeApp({ projectId: "demo-docfacil-ai-graph" }, "ai-graph-emulator-test");
    db = configureAdminFirestore(getFirestore(app));
    setAdminFirestoreForTesting(db);
  });

  afterAll(async () => {
    setAdminFirestoreForTesting(null);
    await deleteApp(app);
  });

  test("coleta, retoma, valida edição e aprova sem perder checkpoint", async () => {
    const { createSession } = await import("./session-store");
    const { runInitial, resumeSession, saveDraft, approveSession } = await import("./controller");
    const session = await createSession("pilot", crypto.randomUUID(), "Preciso registrar um empréstimo de notebook Dell de Ana para Bruno.");
    const collecting = await runInitial(session, crypto.randomUUID());
    expect(collecting.status).toBe("collecting");
    const reviewing = await resumeSession(collecting, collecting.version, crypto.randomUUID(), {
      "Qual é o nome de quem recebe o equipamento?": "Bruno",
    });
    expect(reviewing.status).toBe("reviewing");
    expect(reviewing.draft?.sections).toHaveLength(2);
    const edited = await saveDraft(reviewing, reviewing.version, crypto.randomUUID(), {
      ...reviewing.draft!, sections: [
        { ...reviewing.draft!.sections[0], paragraphs: ["Ana entrega o notebook Dell a Bruno por trinta dias, para uso profissional."] },
        reviewing.draft!.sections[1],
      ],
    });
    expect(edited.approvedVersion).toBeUndefined();
    expect(edited.validation?.version).toBe(edited.version);
    const approved = await approveSession(edited, edited.version, crypto.randomUUID());
    expect(approved.status).toBe("approved");
    expect(approved.draft?.sections[0].paragraphs[0]).toContain("trinta dias");
    expect(approved.approvedVersion).toBe(approved.version);
    expect((await db.collection("ai_sessions").doc(session.id).collection("checkpoints").get()).size).toBeGreaterThan(0);
  }, 60_000);
});
