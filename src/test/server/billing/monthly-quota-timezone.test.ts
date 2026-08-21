import { describe, expect, it } from "bun:test";
import { generateDocumentArtifact } from "@/lib/server/domain/orchestrator";
import {
  InMemoryAccessRepository,
  InMemoryDocumentsRepository,
  InMemoryGenerationRequestsRepository,
  InMemoryOrdersRepository,
  InMemoryUsersRepository,
} from "@/lib/server/firestore/in-memory-repositories";
import { InMemoryArtifactStorage } from "@/lib/server/r2/storage";

const validAnswers = {
  declarante_nome: "Maria Silva",
  declarante_cpf: "111.444.777-35",
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
  cidade_data: "São Paulo, 31 de agosto de 2026",
};

describe("cota mensal no calendário comercial do Brasil", () => {
  it("ainda considera agosto antes da meia-noite em America/Sao_Paulo", async () => {
    const RealDate = Date;
    const fixedNow = RealDate.parse("2026-09-01T02:30:00.000Z");

    class FixedDate extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(fixedNow);
        } else if (args.length === 1) {
          super(args[0]);
        } else {
          super(
            args[0],
            args[1],
            args[2] ?? 1,
            args[3] ?? 0,
            args[4] ?? 0,
            args[5] ?? 0,
            args[6] ?? 0
          );
        }
      }

      static now() {
        return fixedNow;
      }
    }

    globalThis.Date = FixedDate as DateConstructor;

    try {
      const documents = new InMemoryDocumentsRepository();
      const orders = new InMemoryOrdersRepository();
      const access = new InMemoryAccessRepository();
      const generationRequests = new InMemoryGenerationRequestsRepository();
      const users = new InMemoryUsersRepository();
      const storage = new InMemoryArtifactStorage();
      const userId = "usr_quota_sp";

      users.setUser(userId, { plano: "gratis" });

      await documents.createDocument({
        owner: { type: "user", userId },
        modeloSlug: "declaracao-residencia",
        modeloNome: "Declaração de Residência",
        respostas: validAnswers,
        entitlement: { type: "free", watermarked: true },
        artifactState: "ready",
        currentVersion: 1,
        targetVersion: 1,
        createdAt: RealDate.parse("2026-08-15T15:00:00.000Z"),
        updatedAt: RealDate.parse("2026-08-15T15:00:00.000Z"),
      });

      let thrown: unknown;
      try {
        await generateDocumentArtifact({
          requestId: "550e8400-e29b-41d4-a716-446655440080",
          principal: { type: "user", userId },
          modeloSlug: "declaracao-residencia",
          respostas: validAnswers,
          clausulasSelecionadas: [],
          deps: {
            repositories: {
              documents,
              orders,
              access,
              generationRequests,
              users,
            },
            storage,
          },
        });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toMatchObject({
        code: "FREE_LIMIT_REACHED",
        status: 402,
      });
      expect(await documents.listUserDocuments(userId)).toHaveLength(1);
    } finally {
      globalThis.Date = RealDate;
    }
  });
});
