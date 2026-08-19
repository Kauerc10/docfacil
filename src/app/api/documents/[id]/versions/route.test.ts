import { describe, expect, it, beforeEach } from "bun:test";
import { POST } from "./route";
import { getRepositories } from "@/lib/server/firestore/repositories";
import { setAdminAuthForTesting } from "@/lib/server/firebase-admin";

describe("POST /api/documents/[id]/versions", () => {
  const repos = getRepositories();

  beforeEach(() => {
    setAdminAuthForTesting(null);
  });

  const validAnswers = {
    declarante_nome: "Maria Silva",
    declarante_cpf: "123.456.789-00",
    declarante_nacionalidade: "Brasileira",
    declarante_estado_civil: "Solteira",
    declarante_profissao: "Autônoma",
    declarante_cep: "01310-100",
    declarante_rua: "Av. Paulista",
    declarante_numero: "1000",
    declarante_bairro: "Bela Vista",
    declarante_cidade: "São Paulo",
    declarante_uf: "SP",
    finalidade: "Comprovante de residência",
    cidade_data: "São Paulo, 14 de agosto de 2026",
  };

  it("creates a new version for Pro owner", async () => {
    (repos.users as any).setUser("usr_pro_owner", { plano: "pro" });

    const doc = await repos.documents.createDocument({
      owner: { type: "user", userId: "usr_pro_owner" },
      modeloSlug: "declaracao-residencia",
      modeloNome: "Declaração de Residência",
      respostas: validAnswers,
      entitlement: { type: "pro", watermarked: false },
      artifactState: "ready",
      currentVersion: 1,
      targetVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    setAdminAuthForTesting({
      verifyIdToken: async () => ({ uid: "usr_pro_owner" } as any),
    } as any);

    const req = new Request(`http://localhost:3000/api/documents/${doc.id}/versions`, {
      method: "POST",
      headers: {
        Authorization: "Bearer pro-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId: "550e8400-e29b-41d4-a716-446655440020",
        respostas: {
          ...validAnswers,
          declarante_nome: "Maria Silva Santos",
        },
      }),
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: doc.id! }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.document.id).toBe(doc.id);
    expect(data.document.version).toBe(2);
    expect(data.document.artifactState).toBe("ready");
  });
});
