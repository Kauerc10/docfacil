import { beforeEach, describe, expect, it } from "bun:test";
import { generateDocumentArtifact } from "@/lib/server/domain/orchestrator";
import {
  InMemoryAccessRepository,
  InMemoryDocumentsRepository,
  InMemoryGenerationCommitRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryOrdersRepository,
  InMemoryUsersRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import { InMemoryArtifactStorage } from "@/lib/server/r2/storage";

const validResidenceAnswers = {
  declarante_nome: "Maria Silva",
  declarante_cpf: "529.982.247-25",
  declarante_nacionalidade: "Brasileira",
  declarante_estado_civil: "Solteira",
  declarante_profissao: "Autônoma",
  declarante_cep: "01310-100",
  declarante_rua: "Av. Paulista",
  declarante_numero: "1000",
  declarante_bairro: "Bela Vista",
  declarante_cidade: "São Paulo",
  declarante_uf: "SP",
  finalidade: "Comprovante de residência para matrícula",
  cidade_data: "São Paulo, 21 de agosto de 2026",
};

describe("pre-merge hardening: generation lifecycle", () => {
  let documents: InMemoryDocumentsRepository;
  let access: InMemoryAccessRepository;
  let orders: InMemoryOrdersRepository;
  let generationRequests: InMemoryGenerationRequestsRepository;
  let users: InMemoryUsersRepository;
  let generationCommit: InMemoryGenerationCommitRepository;
  let storage: InMemoryArtifactStorage;

  beforeEach(() => {
    documents = new InMemoryDocumentsRepository();
    access = new InMemoryAccessRepository();
    orders = new InMemoryOrdersRepository();
    generationRequests = new InMemoryGenerationRequestsRepository();
    users = new InMemoryUsersRepository();
    generationCommit = new InMemoryGenerationCommitRepository(
      documents,
      access,
      orders,
      generationRequests
    );
    storage = new InMemoryArtifactStorage();
    users.setUser("usr_pro", { plano: "pro" });
  });

  const deps = () => ({
    repositories: {
      documents,
      access,
      orders,
      generationRequests,
      users,
      generationCommit,
    },
    storage,
  });

  it("does not create a document record when a new generation has invalid answers", async () => {
    await expect(
      generateDocumentArtifact({
        requestId: "550e8400-e29b-41d4-a716-446655441001",
        principal: { type: "user", userId: "usr_pro" },
        modeloSlug: "declaracao-residencia",
        respostas: { ...validResidenceAnswers, declarante_nome: "" },
        deps: deps(),
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST", status: 400 });

    expect(await documents.listUserDocuments("usr_pro")).toEqual([]);
  });

  it("keeps the current ready version intact when regeneration answers are invalid", async () => {
    const first = await generateDocumentArtifact({
      requestId: "550e8400-e29b-41d4-a716-446655441002",
      principal: { type: "user", userId: "usr_pro" },
      modeloSlug: "declaracao-residencia",
      respostas: validResidenceAnswers,
      deps: deps(),
    });

    await expect(
      generateDocumentArtifact({
        requestId: "550e8400-e29b-41d4-a716-446655441003",
        principal: { type: "user", userId: "usr_pro" },
        modeloSlug: "declaracao-residencia",
        respostas: { ...validResidenceAnswers, declarante_nome: "" },
        existingDocumentId: first.documentId,
        deps: deps(),
      })
    ).rejects.toMatchObject({ code: "INVALID_REQUEST", status: 400 });

    const stored = await documents.getDocument(first.documentId);
    expect(stored?.currentVersion).toBe(1);
    expect(stored?.targetVersion).toBe(1);
    expect(stored?.artifactState).toBe("ready");
    expect((await documents.listArtifacts(first.documentId)).map((item) => item.version)).toEqual([1]);
  });

  it("rejects an internal regeneration request whose model does not match the stored document", async () => {
    const first = await generateDocumentArtifact({
      requestId: "550e8400-e29b-41d4-a716-446655441004",
      principal: { type: "user", userId: "usr_pro" },
      modeloSlug: "declaracao-residencia",
      respostas: validResidenceAnswers,
      deps: deps(),
    });

    await expect(
      generateDocumentArtifact({
        requestId: "550e8400-e29b-41d4-a716-446655441005",
        principal: { type: "user", userId: "usr_pro" },
        modeloSlug: "comodato",
        respostas: validResidenceAnswers,
        existingDocumentId: first.documentId,
        deps: deps(),
      })
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      status: 400,
      message: expect.stringContaining("modelo"),
    });

    const stored = await documents.getDocument(first.documentId);
    expect(stored?.currentVersion).toBe(1);
    expect(stored?.artifactState).toBe("ready");
  });
});
