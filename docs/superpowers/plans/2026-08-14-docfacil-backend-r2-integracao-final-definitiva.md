# DocFacil — Integração Final Definitiva Pré-PR

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar definitivamente os últimos gaps de integração encontrados na auditoria do backend R2, garantindo que o fluxo guest funcione de ponta a ponta, duplicação preserve cláusulas, Firestore Rules nunca passe silenciosamente, consistência R2↔Firestore seja transacional após upload e a branch possa seguir para PR com evidência real.

**Architecture:** Manter o modular monolith server-first existente. O browser continua responsável apenas por UI, draft local e transporte de dados; identidade, entitlement, pagamento, persistência, versionamento, compartilhamento e autorização continuam sendo decididos no backend. Para o ponto crítico R2↔Firestore, o upload do PDF ocorre antes de um commit Firestore atômico; se esse commit falhar, o objeto recém-enviado é compensado e removido.

**Tech Stack:** Next.js 16 App Router, TypeScript, Bun, Firebase Auth, Firebase Admin, Firestore, Firebase App Check, Firebase Local Emulator Suite, Cloudflare R2 via AWS SDK v3, pdfmake server-side, Zod, Bun Test e Playwright Chromium.

## Global Constraints

- Trabalhar exclusivamente na branch `feat/backend-documentos-r2`.
- Não alterar `main` diretamente.
- Não reabrir arquitetura nem adicionar serviços paralelos.
- Não adicionar gateway real de pagamento nesta rodada.
- Não adicionar Cloudflare Workers, Queues ou Firebase Functions.
- Não alterar preços, limites de plano ou regras comerciais existentes.
- Guest pago continua sem exigir conta.
- Guest draft continua local até a finalização.
- Guest magic link continua permanente até revogação ou exclusão do documento.
- Signed URL do R2 continua expirada em 300 segundos.
- Compartilhamento autenticado continua opt-in, revogável e fixado na versão compartilhada.
- PDF continua imutável por versão.
- Free/avulso não altera versão já finalizada.
- Pro continua podendo gerar novas versões.
- `paid`, `plan`, `userId`, `watermark`, `artifactState`, `objectKey`, `version` e ownership nunca são confiados ao browser.
- Nenhuma falha real da API pode cair para documento demo.
- Nenhum teste de segurança pode usar early return silencioso para parecer verde.
- Nenhum teste de Rules pode executar sem Firestore Emulator real quando chamado por `test:rules`.
- TDD obrigatório em cada task: teste vermelho → implementação mínima → teste verde → commit.
- Não remover testes existentes para fazer a suíte passar.
- Não reduzir cobertura de autorização, entitlement, R2 ou Rules.
- Não declarar “pronto para merge” sem GitHub Actions do PR verde.
- Não declarar números de testes sem rodar os comandos no HEAD atual.
- Nunca commitar `.env`, service account, chaves R2, tokens ou credenciais.
- Commits pequenos, lógicos e Conventional Commits em português, seguindo `CONTRIBUTING.md`.

---

# 0. Baseline obrigatório antes de tocar no código

No momento da auditoria, a branch estava em:

```text
feat/backend-documentos-r2
HEAD auditado: a1093e47571acaf052d5245c020252a781e6d1c7
main base: 67282e090dac278019f3bc4b0177c287956887d1
```

O agente deve verificar o estado real antes da execução:

```bash
git checkout feat/backend-documentos-r2
git fetch origin
git status
git log -1 --oneline
git rev-list --left-right --count origin/main...HEAD
```

Esperado:

```text
working tree clean
branch atual = feat/backend-documentos-r2
behind origin/main = 0
```

Se houver mudanças não commitadas, divergência inesperada ou commits novos que alterem os arquivos deste plano:

```text
STOP
```

Relatar o drift antes de sobrescrever ou reverter qualquer trabalho.

Criar uma anotação local dos comandos que serão comparados no fim:

```bash
bun run test
bun run test:rules
bun run lint
bun run typecheck
bun run build:ci
```

---

# Mapa de arquivos desta rodada

## Guest checkout/finalização

```text
src/components/docfacil/views/checkout-view.tsx
src/components/docfacil/views/sucesso-view.tsx
src/lib/services/checkout-service.ts
src/lib/documents/client.ts
src/lib/documents/guest-draft.ts               NEW
src/test/documents/guest-checkout-contract.test.ts
src/test/documents/guest-draft.test.ts
```

## Duplicação

```text
src/lib/server/domain/documents.ts
src/app/api/documents/[id]/duplicate/route.ts
src/lib/documents/client.ts
src/lib/services/documents-service.ts
src/components/docfacil/views/documento/use-documento-actions.ts
src/test/server/documents/duplicate-flow.test.ts
```

## Firestore Rules

```text
package.json
firebase.json
src/test/rules/firestore.rules.test.ts
.github/workflows/ci.yml
```

## R2 / Firestore commit

```text
src/lib/server/firestore/interfaces.ts
src/lib/server/firestore/repositories.ts
src/lib/server/firestore/in-memory-repositories.ts
src/lib/server/domain/orchestrator.ts
src/test/server/r2/orphan-compensation.test.ts
src/test/server/documents/generation-commit.test.ts
```

## E2E

```text
package.json
bun.lock
playwright.config.ts                            NEW
e2e/guest-purchase.spec.ts                     NEW
.github/workflows/ci.yml
```

---

# Task 1 — Corrigir definitivamente o contrato de retorno do checkout guest

**Priority:** P0 / merge blocker

**Problem:** O checkout demo recebe uma `successUrl` contendo apenas `slug`. Como `createCheckout()` usa essa URL sem acrescentar o `orderId`, `SucessoView` chega sem `params.orderId` e não finaliza o documento.

**Files:**
- Modify: `src/lib/services/checkout-service.ts`
- Modify: `src/components/docfacil/views/checkout-view.tsx`
- Test: `src/test/documents/guest-checkout-contract.test.ts`

**Interfaces:**
- Consumes: `CheckoutResult.orderId`
- Produces:

```ts
export function buildCheckoutReturnUrl(
  successUrl: string,
  orderId: string
): string;
```

A função deve preservar todos os query params já existentes e sobrescrever/adicionar apenas `orderId`.

---

- [ ] **Step 1: criar teste vermelho para preservar slug e acrescentar orderId**

Criar `src/test/documents/guest-checkout-contract.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { buildCheckoutReturnUrl } from "@/lib/services/checkout-service";

describe("guest checkout return contract", () => {
  it("preserves slug and appends the authoritative orderId", () => {
    const url = buildCheckoutReturnUrl(
      "https://docfacil.test/?view=sucesso&slug=declaracao-residencia",
      "order_123"
    );

    const parsed = new URL(url);

    expect(parsed.searchParams.get("view")).toBe("sucesso");
    expect(parsed.searchParams.get("slug")).toBe("declaracao-residencia");
    expect(parsed.searchParams.get("orderId")).toBe("order_123");
  });

  it("replaces a stale orderId instead of duplicating it", () => {
    const url = buildCheckoutReturnUrl(
      "https://docfacil.test/?view=sucesso&slug=declaracao-residencia&orderId=stale",
      "order_real"
    );

    const parsed = new URL(url);

    expect(parsed.searchParams.getAll("orderId")).toEqual(["order_real"]);
  });
});
```

- [ ] **Step 2: rodar teste e confirmar RED**

```bash
bun test src/test/documents/guest-checkout-contract.test.ts
```

Expected:

```text
FAIL
buildCheckoutReturnUrl is missing
```

- [ ] **Step 3: implementar helper determinístico**

Em `src/lib/services/checkout-service.ts`:

```ts
export function buildCheckoutReturnUrl(
  successUrl: string,
  orderId: string
): string {
  const url = new URL(successUrl);
  url.searchParams.set("orderId", orderId);
  return url.toString();
}
```

No caminho demo, substituir:

```ts
const successUrl =
  params.successUrl ||
  `${window.location.origin}/?view=sucesso&orderId=${data.order.id}`;
```

por:

```ts
const baseSuccessUrl =
  params.successUrl ||
  `${window.location.origin}/?view=sucesso`;

const successUrl = buildCheckoutReturnUrl(
  baseSuccessUrl,
  data.order.id
);
```

- [ ] **Step 4: manter `slug` na URL criada por `CheckoutView`**

Em `checkout-view.tsx`, manter a construção:

```ts
const successUrl =
  typeof window !== "undefined"
    ? `${window.location.origin}/?view=sucesso${slug ? `&slug=${encodeURIComponent(slug)}` : ""}`
    : undefined;
```

Não adicionar um `orderId` no client antes da criação da order. O `orderId` confiável só existe depois da resposta do backend.

- [ ] **Step 5: adicionar teste estrutural contra regressão**

No mesmo arquivo:

```ts
it("does not return a guest checkout without orderId", async () => {
  const source = await Bun.file(
    "src/lib/services/checkout-service.ts"
  ).text();

  expect(source).toContain("buildCheckoutReturnUrl");
  expect(source).not.toContain(
    "params.successUrl || `${window.location.origin}/?view=sucesso&orderId=${data.order.id}`"
  );
});
```

- [ ] **Step 6: rodar GREEN**

```bash
bun test src/test/documents/guest-checkout-contract.test.ts
```

Expected:

```text
PASS
```

- [ ] **Step 7: commit**

```bash
git add src/lib/services/checkout-service.ts src/components/docfacil/views/checkout-view.tsx src/test/documents/guest-checkout-contract.test.ts
git commit -m "fix(checkout): preserva order id no retorno guest"
```

---

# Task 2 — Canonicalizar o draft guest antes da finalização

**Priority:** P0 / merge blocker

**Problem:** `extrasPorClausula` é salvo separadamente no draft, mas `SucessoView` envia apenas `draft.answers`. Um guest que seleciona uma cláusula com campos extras pode chegar ao backend sem esses campos e receber `INVALID_REQUEST`.

**Files:**
- Create: `src/lib/documents/guest-draft.ts`
- Modify: `src/components/docfacil/views/sucesso-view.tsx`
- Modify: `src/lib/documents/client.ts`
- Test: `src/test/documents/guest-draft.test.ts`

**Interfaces:**
- Consumes: `GuestDraftData`
- Produces:

```ts
export function buildGuestFinalizationAnswers(
  draft: GuestDraftData
): Record<string, string>;
```

Regra:

```text
answers base
+
somente extras das cláusulas atualmente selecionadas
=
payload para /api/documents/finalize
```

Extras de cláusulas desmarcadas não podem vazar para o backend.

---

- [ ] **Step 1: escrever RED para extras selecionados**

Criar `src/test/documents/guest-draft.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { buildGuestFinalizationAnswers } from "@/lib/documents/guest-draft";
import type { GuestDraftData } from "@/lib/documents/client";

function makeDraft(): GuestDraftData {
  return {
    requestId: crypto.randomUUID(),
    modeloSlug: "contrato-locacao",
    answers: {
      locador_nome: "Maria",
      locatario_nome: "João",
    },
    stepIndex: 4,
    clausulasSelecionadas: ["fiador"],
    extrasPorClausula: {
      fiador: {
        fiador_nome: "Carlos",
        fiador_cpf: "123.456.789-00",
      },
      animais: {
        animal_descricao: "Gato",
      },
    },
    updatedAt: Date.now(),
  };
}

describe("buildGuestFinalizationAnswers", () => {
  it("flattens extras from selected clauses into the final payload", () => {
    const result = buildGuestFinalizationAnswers(makeDraft());

    expect(result.fiador_nome).toBe("Carlos");
    expect(result.fiador_cpf).toBe("123.456.789-00");
  });

  it("does not include stale extras from unselected clauses", () => {
    const result = buildGuestFinalizationAnswers(makeDraft());

    expect(result.animal_descricao).toBeUndefined();
  });

  it("never injects internal clause markers from the client", () => {
    const draft = makeDraft();
    draft.answers.__clausula_fiador = "true";

    const result = buildGuestFinalizationAnswers(draft);

    expect(result.__clausula_fiador).toBeUndefined();
  });
});
```

- [ ] **Step 2: rodar RED**

```bash
bun test src/test/documents/guest-draft.test.ts
```

Expected:

```text
FAIL
module/function missing
```

- [ ] **Step 3: implementar helper puro**

Criar `src/lib/documents/guest-draft.ts`:

```ts
import type { GuestDraftData } from "./client";

export function buildGuestFinalizationAnswers(
  draft: GuestDraftData
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(draft.answers)) {
    if (!key.startsWith("__")) {
      result[key] = value;
    }
  }

  for (const clauseId of draft.clausulasSelecionadas) {
    const extras = draft.extrasPorClausula[clauseId];
    if (!extras) continue;

    for (const [key, value] of Object.entries(extras)) {
      if (!key.startsWith("__")) {
        result[key] = value;
      }
    }
  }

  return result;
}
```

- [ ] **Step 4: usar helper na `SucessoView`**

Importar:

```ts
import { buildGuestFinalizationAnswers } from "@/lib/documents/guest-draft";
```

Trocar:

```ts
respostas: draft.answers,
```

por:

```ts
respostas: buildGuestFinalizationAnswers(draft),
```

Continuar enviando separadamente:

```ts
clausulasSelecionadas: draft.clausulasSelecionadas,
```

- [ ] **Step 5: retirar side effect de limpeza do API client**

Hoje `finalizeDocument()` limpa o draft genericamente depois de qualquer `200`.

Remover de `src/lib/documents/client.ts`:

```ts
clearGuestDraft(input.modeloSlug);
```

O API client deve apenas fazer I/O.

A responsabilidade da UI guest fica:

```text
200
+ guestAccessPath presente
+ redirect pronto
→ limpar draft
→ limpar requestId
→ navegar para /d/<token>
```

Para usuário autenticado, `CriarView` pode continuar limpando explicitamente seu estado após a finalização.

- [ ] **Step 6: garantir erro sem magic link não apaga o draft**

Na `SucessoView`:

```ts
if (!result.document?.guestAccessPath) {
  throw new Error("Magic link guest ausente após finalização.");
}

clearGuestDraft(slug);
clearFinalizationRequestId(slug);
window.location.assign(result.document.guestAccessPath);
```

Não limpar antes desse `if`.

- [ ] **Step 7: GREEN**

```bash
bun test src/test/documents/guest-draft.test.ts
bun test src/lib/documents/client.test.ts
```

Expected:

```text
PASS
```

- [ ] **Step 8: commit**

```bash
git add src/lib/documents/guest-draft.ts src/lib/documents/client.ts src/components/docfacil/views/sucesso-view.tsx src/test/documents/guest-draft.test.ts
git commit -m "fix(guest): preserva extras de clausulas na finalizacao"
```

---

# Task 3 — Duplicação deve reconstruir cláusulas sem reenviar chaves internas

**Priority:** P0 / merge blocker

**Problem:** A API atual devolve todas as `respostas` armazenadas e sempre retorna `clausulasSelecionadas: []`. Documentos persistidos possuem marcadores internos `__clausula_<id> = "true"`, enquanto o schema server-side bloqueia o browser de reenviá-los.

**Files:**
- Modify: `src/lib/server/domain/documents.ts`
- Modify: `src/app/api/documents/[id]/duplicate/route.ts`
- Modify: `src/lib/documents/client.ts`
- Modify: `src/lib/services/documents-service.ts`
- Modify: `src/components/docfacil/views/documento/use-documento-actions.ts`
- Test: `src/test/server/documents/duplicate-flow.test.ts`

**Interfaces:**
- Produces server helper:

```ts
export interface ReconstructedDuplicateDraft {
  respostas: Record<string, string>;
  clausulasSelecionadas: string[];
  extrasPorClausula: Record<string, Record<string, string>>;
}

export function reconstructDuplicateDraft(
  modelo: Modelo,
  storedRespostas: Record<string, string>
): ReconstructedDuplicateDraft;
```

---

- [ ] **Step 1: escrever RED para cláusula dinâmica**

Adicionar ao `duplicate-flow.test.ts` um documento com respostas:

```ts
respostas: {
  locador_nome: "Maria",
  locatario_nome: "João",
  fiador_nome: "Carlos",
  fiador_cpf: "123.456.789-00",
  __clausula_fiador: "true",
},
```

Validar:

```ts
expect(data.duplicateDraft.clausulasSelecionadas).toContain("fiador");
expect(data.duplicateDraft.respostas.__clausula_fiador).toBeUndefined();
expect(
  data.duplicateDraft.extrasPorClausula.fiador.fiador_nome
).toBe("Carlos");
```

- [ ] **Step 2: RED**

```bash
bun test src/test/server/documents/duplicate-flow.test.ts
```

Expected:

```text
FAIL
clausulasSelecionadas is []
```

- [ ] **Step 3: implementar `reconstructDuplicateDraft`**

Em `documents.ts`:

```ts
export function reconstructDuplicateDraft(
  modelo: Modelo,
  storedRespostas: Record<string, string>
): ReconstructedDuplicateDraft {
  const respostas: Record<string, string> = {};
  const clausulasSelecionadas: string[] = [];
  const extrasPorClausula: Record<
    string,
    Record<string, string>
  > = {};

  for (const [key, value] of Object.entries(storedRespostas)) {
    if (!key.startsWith("__")) {
      respostas[key] = value;
    }
  }

  for (const etapa of modelo.etapas || []) {
    if (etapa.tipo !== "clausulas") continue;

    for (const clausula of etapa.clausulas) {
      const marker = `__clausula_${clausula.id}`;

      if (storedRespostas[marker] !== "true") {
        continue;
      }

      clausulasSelecionadas.push(clausula.id);

      const extras: Record<string, string> = {};

      for (const campo of clausula.camposExtras || []) {
        const value = storedRespostas[campo.key];

        if (typeof value === "string") {
          extras[campo.key] = value;
          delete respostas[campo.key];
        }
      }

      if (Object.keys(extras).length > 0) {
        extrasPorClausula[clausula.id] = extras;
      }
    }
  }

  return {
    respostas,
    clausulasSelecionadas,
    extrasPorClausula,
  };
}
```

- [ ] **Step 4: API carrega o modelo confiável**

Na rota `/duplicate`:

```ts
const modelo = MODELOS.find(
  (candidate) => candidate.slug === original.modeloSlug
);

if (!modelo) {
  throw new BackendError(
    "INVALID_REQUEST",
    400,
    "Modelo original não está mais disponível."
  );
}

const duplicateDraft = reconstructDuplicateDraft(
  modelo,
  original.respostas
);
```

Retornar:

```ts
{
  duplicateDraft: {
    modeloSlug: original.modeloSlug,
    respostas: duplicateDraft.respostas,
    clausulasSelecionadas: duplicateDraft.clausulasSelecionadas,
    extrasPorClausula: duplicateDraft.extrasPorClausula,
  }
}
```

- [ ] **Step 5: atualizar contratos client-side**

Atualizar `duplicateDocumentApi` e `DuplicateDraftResult` para incluir:

```ts
extrasPorClausula: Record<string, Record<string, string>>;
```

- [ ] **Step 6: persistir extras no draft local**

No `handleDuplicar`:

```ts
saveGuestDraft(draft.modeloSlug, {
  requestId,
  modeloSlug: draft.modeloSlug,
  answers: draft.respostas,
  stepIndex: 0,
  clausulasSelecionadas: draft.clausulasSelecionadas,
  extrasPorClausula: draft.extrasPorClausula,
});
```

- [ ] **Step 7: validar que nenhuma chave `__*` chega ao draft client**

Adicionar:

```ts
for (const key of Object.keys(data.duplicateDraft.respostas)) {
  expect(key.startsWith("__")).toBe(false);
}
```

- [ ] **Step 8: GREEN**

```bash
bun test src/test/server/documents/duplicate-flow.test.ts
bun test src/test/documents/guest-draft.test.ts
```

- [ ] **Step 9: commit**

```bash
git add src/lib/server/domain/documents.ts src/app/api/documents/[id]/duplicate/route.ts src/lib/documents/client.ts src/lib/services/documents-service.ts src/components/docfacil/views/documento/use-documento-actions.ts src/test/server/documents/duplicate-flow.test.ts
git commit -m "fix(documents): preserva clausulas ao duplicar documento"
```

---

# Task 4 — Tornar Firestore Rules realmente fail-closed sem silent return

**Priority:** P0 security / merge blocker

**Problem:** `test:rules` agora inicia o Emulator corretamente, mas o arquivo ainda contém múltiplos:

```ts
if (!testEnv) return;
```

Isso contraria o contrato de segurança do próprio plano.

**Files:**
- Modify: `src/test/rules/firestore.rules.test.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- `test:rules` é o único caminho autoritativo para executar a suíte real de Rules.
- O arquivo de Rules nunca torna `testEnv` opcional durante a suíte real.

---

- [ ] **Step 1: criar helper de assertion que falha**

Substituir:

```ts
let testEnv: RulesTestEnvironment | null = null;
```

por:

```ts
let testEnv: RulesTestEnvironment;
```

O `beforeAll` deve ser:

```ts
beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-docfacil-rules-test",
    firestore: {
      rules,
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
```

Não usar `try/catch` que converta falha do Emulator em `null`.

- [ ] **Step 2: remover todos os early returns**

O arquivo deve terminar com:

```bash
git grep -n "if (!testEnv) return" -- src/test/rules/firestore.rules.test.ts
```

Expected:

```text
no matches
```

- [ ] **Step 3: impedir a suíte Rules de ser descoberta no `bun run test` sem Emulator**

Criar um gate explícito no topo:

```ts
const RUN_FIRESTORE_RULES =
  process.env.RUN_FIRESTORE_RULES === "true";

describe.skipIf(!RUN_FIRESTORE_RULES)(
  "Firestore Security Rules",
  () => {
    // tests
  }
);
```

Isso é **skip explícito e visível**, não um passe silencioso dentro de cada teste.

- [ ] **Step 4: atualizar scripts**

Em `package.json`:

```json
{
  "scripts": {
    "test:rules": "firebase emulators:exec --only firestore \"RUN_FIRESTORE_RULES=true bun test src/test/rules/firestore.rules.test.ts\""
  }
}
```

O comando autoritativo de Rules continua sendo `test:rules`.

- [ ] **Step 5: adicionar structural guard**

Criar teste unitário pequeno, por exemplo em:

```text
src/test/server/security/firestore-rules-suite-contract.test.ts
```

com:

```ts
import { expect, test } from "bun:test";

test("Firestore Rules suite contains no silent testEnv early return", async () => {
  const source = await Bun.file(
    "src/test/rules/firestore.rules.test.ts"
  ).text();

  expect(source).not.toContain("if (!testEnv) return");
  expect(source).not.toContain("testEnv = null");
  expect(source).toContain("RUN_FIRESTORE_RULES");
});
```

- [ ] **Step 6: executar sem Emulator**

```bash
bun run test
```

Expected:

```text
general suite does not pretend to execute Rules
Rules suite is explicitly skipped in this command
all remaining tests pass
```

- [ ] **Step 7: executar Rules com Emulator real**

```bash
bun run test:rules
```

Expected:

```text
Firestore Emulator starts
security tests execute
0 silent skips
0 fail
```

- [ ] **Step 8: CI mantém Java e `test:rules`**

Em `.github/workflows/ci.yml`, preservar:

```yaml
- uses: actions/setup-java@v4
  with:
    distribution: temurin
    java-version: "21"

- name: Firestore Security Rules
  run: bun run test:rules
```

- [ ] **Step 9: commit**

```bash
git add src/test/rules/firestore.rules.test.ts src/test/server/security/firestore-rules-suite-contract.test.ts package.json .github/workflows/ci.yml
git commit -m "test(firestore): remove skips silenciosos das security rules"
```

---

# Task 5 — Tornar o commit pós-upload atômico dentro do Firestore

**Priority:** P0 data integrity / merge blocker

**Problem:** O orquestrador compensa o PDF em qualquer erro após o upload. Hoje um erro tardio, por exemplo ao criar access link depois de `saveArtifact`, `promoteCurrentVersion` e consumo da order, pode apagar um PDF que já possui metadados persistidos e deixar Firestore apontando para um objeto inexistente.

A solução definitiva desta rodada:

```text
R2 upload
↓
1 transaction Firestore
  artifact metadata
  responses
  currentVersion
  artifactState
  order consume
  guest access link
  generation request complete
↓
COMMIT
```

Se a transação falha:

```text
R2 cleanup
release order reservation
mark failure
```

Se a transação confirma:

```text
R2 never compensated
```

**Files:**
- Modify: `src/lib/server/firestore/interfaces.ts`
- Modify: `src/lib/server/firestore/repositories.ts`
- Modify: `src/lib/server/firestore/in-memory-repositories.ts`
- Modify: `src/lib/server/domain/orchestrator.ts`
- Modify: `src/test/server/r2/orphan-compensation.test.ts`
- Create: `src/test/server/documents/generation-commit.test.ts`

**Interfaces:**

Adicionar:

```ts
export interface CommitGeneratedArtifactInput {
  requestId: string;
  documentId: string;
  targetVersion: number;
  respostas: Record<string, string>;
  artifact: DocumentArtifactRecord;
  singlePurchase?: {
    orderId: string;
    requestId: string;
  };
  guestAccess?: {
    tokenHash: string;
  };
  guestAccessPath?: string;
  now: number;
}

export interface IGenerationCommitRepository {
  commitGeneratedArtifact(
    input: CommitGeneratedArtifactInput
  ): Promise<void>;
}
```

Adicionar em `BackendRepositories`:

```ts
generationCommit: IGenerationCommitRepository;
```

---

- [ ] **Step 1: RED para falha antes do commit**

No `orphan-compensation.test.ts`, manter e reforçar:

```text
upload succeeds
Firestore generation commit fails
deleteArtifact is called
order is released
generation request is failed
```

- [ ] **Step 2: RED para falha tardia não deixar estado parcial**

Criar `generation-commit.test.ts`.

No repositório in-memory, injetar uma falha no commit completo:

```ts
generationCommit.failNextCommit(
  new Error("transaction aborted")
);
```

Após a falha:

```ts
expect(await docsRepo.getArtifact(docId, 1)).toBeNull();
expect(document.currentVersion).toBeNull();
expect(order.status).toBe("paid");
expect(accessRepo.size()).toBe(0);
```

- [ ] **Step 3: implementar transação Firestore real**

Em `repositories.ts`:

```ts
class FirestoreGenerationCommitRepository
  implements IGenerationCommitRepository
{
  constructor(private readonly db: Firestore) {}

  async commitGeneratedArtifact(
    input: CommitGeneratedArtifactInput
  ): Promise<void> {
    await this.db.runTransaction(async (tx) => {
      const documentRef = this.db
        .collection("documents")
        .doc(input.documentId);

      const artifactRef = documentRef
        .collection("artifacts")
        .doc(String(input.targetVersion));

      const requestRef = this.db
        .collection("generation_requests")
        .doc(input.requestId);

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
        const orderRef = this.db
          .collection("orders")
          .doc(input.singlePurchase.orderId);

        const orderSnapshot = await tx.get(orderRef);

        if (!orderSnapshot.exists) {
          throw new BackendError(
            "ORDER_NOT_FOUND",
            404,
            "Pedido não encontrado durante commit."
          );
        }

        const order = orderSnapshot.data();

        if (
          order?.status !== "reserved" ||
          order?.reservedByRequestId !== input.requestId
        ) {
          throw new BackendError(
            "ORDER_CONFLICT",
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
        const accessRef = this.db
          .collection("access_links")
          .doc(input.guestAccess.tokenHash);

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
        result: input.guestAccessPath
          ? { guestAccessPath: input.guestAccessPath }
          : {},
        updatedAt: input.now,
      });
    });
  }
}
```

Se o projeto já usa wrappers/timestamps padronizados, adaptar aos helpers existentes, mas preservar **uma única transação** para todos os writes acima.

- [ ] **Step 4: implementação in-memory precisa ser atomic-like**

Não fazer alterações gradualmente.

Construir cópias temporárias:

```ts
const nextState = cloneCurrentState();
validateEverything(nextState, input);
applyEverything(nextState, input);
replaceState(nextState);
```

Se a validação ou fail injection lançar:

```text
nenhuma alteração é publicada
```

- [ ] **Step 5: orquestrador prepara token antes do commit**

Depois do upload e dos hashes:

```ts
let guestAccessToken: string | undefined;
let guestAccessPath: string | undefined;
let guestAccessTokenHash: string | undefined;

if (principal.type === "guest") {
  const generated = generateAccessToken();

  guestAccessToken = generated.token;
  guestAccessTokenHash = generated.tokenHash;
  guestAccessPath = `/d/${generated.token}`;
}
```

Nenhum plaintext token vai para o banco.

- [ ] **Step 6: substituir writes pós-upload separados por um commit**

Remover do caminho de sucesso:

```text
saveArtifact
updateDocumentRespostas
promoteCurrentVersion
consumeReservedOrder
createAccessLink
markCompleted
```

e substituir por:

```ts
await repos.generationCommit.commitGeneratedArtifact({
  requestId,
  documentId,
  targetVersion,
  respostas: sanitizedAnswers,
  artifact: {
    version: targetVersion,
    objectKey: putResult.objectKey,
    sha256: putResult.sha256,
    sizeBytes: putResult.sizeBytes,
    mimeType: "application/pdf",
    filename,
    watermarked: entitlementDecision.watermarked,
    sourceHash,
    modelSnapshotHash,
    generatedAt: now,
  },
  singlePurchase:
    entitlementDecision.entitlement === "single_purchase" &&
    entitlementDecision.orderId
      ? {
          orderId: entitlementDecision.orderId,
          requestId,
        }
      : undefined,
  guestAccess: guestAccessTokenHash
    ? { tokenHash: guestAccessTokenHash }
    : undefined,
  guestAccessPath,
  now,
});
```

- [ ] **Step 7: definir commit boundary explícito**

No orquestrador:

```ts
let uploadedObjectKey: string | null = null;
let firestoreCommitSucceeded = false;
```

Após `putArtifact`:

```ts
uploadedObjectKey = putResult.objectKey;
```

Após `commitGeneratedArtifact`:

```ts
firestoreCommitSucceeded = true;
```

No `catch`:

```ts
if (uploadedObjectKey && !firestoreCommitSucceeded) {
  try {
    await storage.deleteArtifact(uploadedObjectKey);
  } catch (cleanupErr) {
    logger.error(
      "orchestrator",
      "falha na compensacao r2 antes do commit firestore",
      cleanupErr
    );
  }
}
```

Nunca apagar R2 quando:

```ts
firestoreCommitSucceeded === true
```

- [ ] **Step 8: release de order só antes do commit**

```ts
if (
  !firestoreCommitSucceeded &&
  entitlementDecision.entitlement === "single_purchase" &&
  entitlementDecision.orderId
) {
  await repos.orders.releaseReservedOrder({
    orderId: entitlementDecision.orderId,
    requestId,
  });
}
```

Após commit, a order já foi consumida atomicamente.

- [ ] **Step 9: teste do caso crítico encontrado na auditoria**

Criar caso:

```text
R2 upload ✓
Firestore commit ✓
retorno da função ✓
```

e outro:

```text
R2 upload ✓
Firestore transaction aborts
R2 delete ✓
artifact absent
currentVersion unchanged
order released
access link absent
```

Não simular apenas `saveArtifact` isolado, porque ele deixa de ser o boundary real.

- [ ] **Step 10: GREEN**

```bash
bun test src/test/server/r2/orphan-compensation.test.ts
bun test src/test/server/documents/generation-commit.test.ts
bun test src/lib/server/domain/orchestrator.test.ts
```

- [ ] **Step 11: commit**

```bash
git add src/lib/server/firestore/interfaces.ts src/lib/server/firestore/repositories.ts src/lib/server/firestore/in-memory-repositories.ts src/lib/server/domain/orchestrator.ts src/test/server/r2/orphan-compensation.test.ts src/test/server/documents/generation-commit.test.ts
git commit -m "fix(documents): torna commit pos-upload atomico no firestore"
```

---

# Task 6 — Fixar semantics de share para não depender de interpretação

**Priority:** P1 correctness/documentation

**Problem:** A rota de download suporta `expiresAt` para share, mas o endpoint de criação não define expiração. O relatório anterior chamou isso de “controle estrito de expiração”, o que não representa o comportamento atual.

**Decision desta rodada:**

```text
guest magic link:
permanente até revogação/exclusão

authenticated share:
permanente até revogação/reemissão
pinned na versão compartilhada

R2 signed URL:
300 segundos
```

`expiresAt` pode permanecer no schema como compatibilidade futura, mas não é requisito da experiência atual.

**Files:**
- Modify: `docs/backend-architecture.md`
- Modify: `docs/superpowers/specs/2026-08-14-backend-documentos-r2-design.md`
- Test: `src/test/server/access/access-links.test.ts`

---

- [ ] **Step 1: adicionar teste explícito**

```ts
it("share link without expiresAt stays valid until revoked", async () => {
  // create active share with no expiresAt
  // request download
  // expect 200
});
```

- [ ] **Step 2: manter proteção para futuros links expiráveis**

A rota continua aceitando:

```ts
if (
  link.kind === "share" &&
  link.expiresAt &&
  Date.now() > link.expiresAt
) {
  throw ...
}
```

- [ ] **Step 3: documentação deve usar a regra correta**

Documentar:

```text
Links de compartilhamento não possuem TTL automático nesta versão.
Eles são revogados explicitamente e uma reemissão revoga o link anterior.
A URL R2 continua curta e temporária.
```

- [ ] **Step 4: GREEN**

```bash
bun test src/test/server/access/access-links.test.ts
```

- [ ] **Step 5: commit**

```bash
git add docs/backend-architecture.md docs/superpowers/specs/2026-08-14-backend-documentos-r2-design.md src/test/server/access/access-links.test.ts
git commit -m "docs(access): fixa semantica de links revogaveis"
```

---

# Task 7 — Adicionar E2E real para o bug cross-component que escapou

**Priority:** P0 quality gate

**Problem:** O integration test atual começa dentro do backend, por isso não detectou que `CheckoutView` perdia `orderId`. Precisamos de um navegador real atravessando UI → checkout → retorno → finalize → `/d/<token>`.

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Create: `playwright.config.ts`
- Create: `e2e/guest-purchase.spec.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- `test:e2e` usa Firestore Emulator.
- Next dev roda com billing demo e storage em memória apenas no ambiente E2E.
- Chromium only nesta rodada.

---

- [ ] **Step 1: adicionar Playwright**

```bash
bun add -d @playwright/test
```

Não instalar bibliotecas de browser automation concorrentes.

- [ ] **Step 2: criar config**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["list"]]
    : "list",

  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  webServer: {
    command: "bun run dev -- -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: "development",
      FIREBASE_PROJECT_ID: "demo-docfacil-e2e",
      ALLOW_DEMO_BILLING: "true",
      ALLOW_IN_MEMORY_ARTIFACT_STORAGE: "true",
      APP_CHECK_ENFORCED: "false",
      NEXT_PUBLIC_CHECKOUT_PROVIDER: "demo",
    },
  },
});
```

Não colocar credenciais reais.

- [ ] **Step 3: script E2E sobe Emulator antes do browser**

Em `package.json`:

```json
{
  "scripts": {
    "test:e2e": "firebase emulators:exec --only firestore \"playwright test\""
  }
}
```

O `FIRESTORE_EMULATOR_HOST` fornecido pelo Emulator Suite deve ser herdado pelo processo do Playwright e pelo `webServer`.

- [ ] **Step 4: criar primeiro teste E2E mínimo**

`e2e/guest-purchase.spec.ts` deve:

```text
1. abrir modelo conhecido
2. preencher campos obrigatórios
3. finalizar como guest
4. chegar à barreira de pagamento
5. iniciar checkout avulso
6. informar email real sintático de teste
7. concluir demo checkout
8. observar geração
9. esperar URL /d/<opaque-token>
10. clicar em download
```

Exemplo de assertions obrigatórias:

```ts
await expect(page).toHaveURL(/\/d\/[A-Za-z0-9_-]{20,}/);

await expect(
  page.getByRole("button", {
    name: /baixar|download/i,
  })
).toBeVisible();
```

Não validar token exato.

- [ ] **Step 5: incluir uma cláusula dinâmica com extra**

Usar um modelo que possua cláusula dinâmica.

O teste deve selecionar pelo menos uma cláusula com campo extra e preenchê-la, provando Task 2:

```text
cláusula marcada
campo extra preenchido
checkout
magic link
download disponível
```

- [ ] **Step 6: validar que retorno possui orderId durante o fluxo**

Interceptar/navegação:

```ts
await page.waitForURL((url) => {
  return (
    url.searchParams.get("view") === "sucesso" &&
    Boolean(url.searchParams.get("orderId"))
  );
});
```

Depois esperar o redirect `/d/...`.

Isso reproduz exatamente o bug encontrado pela auditoria.

- [ ] **Step 7: RED antes das correções**

Se possível durante TDD, executar o teste contra o commit pré-correção e registrar no relatório:

```text
FAIL: orderId missing from success URL
```

Não reescrever histórico Git só para demonstrar RED.

- [ ] **Step 8: executar GREEN**

```bash
bunx playwright install chromium
bun run test:e2e
```

Expected:

```text
1+ guest E2E PASS
```

- [ ] **Step 9: CI E2E em job separado**

Adicionar:

```yaml
e2e:
  name: Guest E2E
  runs-on: ubuntu-latest
  timeout-minutes: 15
  needs: quality

  steps:
    - uses: actions/checkout@v4

    - uses: oven-sh/setup-bun@v2
      with:
        bun-version: 1.3.14

    - uses: actions/setup-java@v4
      with:
        distribution: temurin
        java-version: "21"

    - run: bun install --frozen-lockfile

    - run: bunx playwright install --with-deps chromium

    - run: bun run test:e2e
```

Não passar secrets.

- [ ] **Step 10: commit**

```bash
git add package.json bun.lock playwright.config.ts e2e/guest-purchase.spec.ts .github/workflows/ci.yml
git commit -m "test(e2e): cobre compra guest ate o magic link"
```

---

# Task 8 — Regressão integrada completa

**Priority:** P0

Não modificar código durante esta task, exceto correção de regressão encontrada.

---

- [ ] **Step 1: forbidden-pattern scan**

```bash
git grep -n "paid=1" -- src || true
git grep -n "paid: Boolean(orderId)" -- src || true
git grep -n "guest@docfacil.com" -- src || true
git grep -n "if (!testEnv) return" -- src/test || true
git grep -n "testEnv = null" -- src/test/rules || true
git grep -n "navigator.clipboard.writeText(window.location.href)" -- src || true
```

Expected:

```text
zero prohibited matches
```

- [ ] **Step 2: verificar client trust**

```bash
git grep -nE "addDoc|setDoc|updateDoc|deleteDoc" -- src/lib/services/documents-service.ts src/lib/documents || true
```

Expected:

```text
no direct Firestore document mutation in real client path
```

- [ ] **Step 3: verificar markers internos**

```bash
git grep -n "__clausula_" -- src/components src/lib/documents
```

Permissível:

```text
test assertions
server/domain utilities
```

Não permissível:

```text
client finalization payload manually creating internal markers
```

- [ ] **Step 4: executar suíte unit/integration**

```bash
bun run test
```

Registrar:

```text
pass count
fail count
skip count
elapsed time
```

Se Rules aparecer como skip nesta suíte geral, isso é aceitável desde que seja **explícito** e `test:rules` execute em seguida.

- [ ] **Step 5: Rules reais**

```bash
bun run test:rules
```

Registrar:

```text
Emulator startup
security test pass count
0 fail
```

- [ ] **Step 6: lint**

```bash
bun run lint
```

Expected:

```text
0 errors
```

- [ ] **Step 7: typecheck**

```bash
bun run typecheck
```

Expected:

```text
0 errors
```

- [ ] **Step 8: build**

```bash
bun run build:ci
```

Expected:

```text
exit 0
```

- [ ] **Step 9: Playwright**

```bash
bun run test:e2e
```

Expected:

```text
guest browser flow PASS
```

- [ ] **Step 10: diff review**

```bash
git diff origin/main...HEAD --stat
git diff origin/main...HEAD --check
git status
```

Expected:

```text
no whitespace errors
working tree clean after final commit
```

- [ ] **Step 11: commit de qualquer ajuste de regressão**

Somente se necessário, com mensagem específica ao problema.

Não usar:

```text
fix: final fixes
fix: misc
chore: stuff
```

---

# Task 9 — Atualizar documentação e fechar o plano

**Priority:** P1

**Files:**
- Modify: `docs/backend-architecture.md`
- Modify: `docs/superpowers/plans/2026-08-14-docfacil-backend-r2-integracao-final-definitiva.md`

---

- [ ] **Step 1: documentar fluxo guest final**

```text
draft local
→ checkout
→ orderId no return URL
→ SucessoView
→ canonical draft answers
→ server finalize
→ R2 upload
→ atomic Firestore commit
→ guest magic link
→ /d/token
```

- [ ] **Step 2: documentar commit boundary**

```text
Antes do Firestore transaction commit:
R2 pode ser compensado.

Depois do Firestore transaction commit:
R2 não é removido por catch genérico.
```

- [ ] **Step 3: documentar duplicação**

```text
markers internos são extraídos server-side
client recebe:
respostas limpas
clausulasSelecionadas
extrasPorClausula
```

- [ ] **Step 4: marcar checkboxes concluídos somente com evidência**

Não marcar task como completa antes do respectivo teste verde.

- [ ] **Step 5: commit**

```bash
git add docs/backend-architecture.md docs/superpowers/plans/2026-08-14-docfacil-backend-r2-integracao-final-definitiva.md
git commit -m "docs(backend): registra fechamento final da integracao r2"
```

---

# Task 10 — Push e gate remoto de PR

**Priority:** P0 before merge

A implementação pode ser considerada pronta para **abrir PR** após os gates locais.

Ainda não pode ser considerada pronta para **merge**.

---

- [ ] **Step 1: push**

```bash
git push origin feat/backend-documentos-r2
```

- [ ] **Step 2: confirmar sincronização**

```bash
git status
git rev-parse HEAD
git rev-parse origin/feat/backend-documentos-r2
```

Os dois SHAs devem ser idênticos.

- [ ] **Step 3: abrir PR para `main` somente quando autorizado**

PR:

```text
feat/backend-documentos-r2
→ main
```

Não fazer squash local nem reescrever os  commits anteriores só para “limpar” o histórico.

- [ ] **Step 4: GitHub Actions obrigatório**

Aguardar:

```text
quality
✓ tests
✓ Firestore Emulator Rules
✓ lint
✓ typecheck
✓ build

e2e
✓ Playwright Chromium guest purchase
```

- [ ] **Step 5: Vercel Preview**

Validar:

```text
deployment READY
```

- [ ] **Step 6: revisão manual no Preview**

Executar:

```text
guest:
form
clause extra
checkout
success return with orderId
/d/token
download

authenticated:
login
free generation
watermark
dashboard
share
revoke

duplicate:
document with clause
duplicate
form restored
clause restored
extra restored
new finalization

failure:
R2 unavailable
no fake success
no demo fallback
```

- [ ] **Step 7: só então usar a expressão “merge-ready”**

Critério:

```text
local gates green
+
PR GitHub Actions green
+
Vercel Preview READY
+
manual smoke green
```

---

# Acceptance Matrix

## Guest checkout

- [ ] `slug` sobrevive checkout.
- [ ] `orderId` autoritativo é acrescentado após criação da order.
- [ ] `SucessoView` recebe `slug + orderId`.
- [ ] Nenhuma order é considerada paga pelo client.
- [ ] Draft não é limpo antes de magic link existir.
- [ ] Retry conserva o mesmo requestId enquanto a tentativa não conclui.

## Clause extras

- [ ] Extras de cláusulas selecionadas são enviados.
- [ ] Extras de cláusulas desmarcadas não são enviados.
- [ ] Client não cria `__clausula_*`.
- [ ] Backend continua reconstruindo markers internos.

## Duplicate

- [ ] `__clausula_*` não chega ao client.
- [ ] `clausulasSelecionadas` é reconstruído.
- [ ] `extrasPorClausula` é reconstruído.
- [ ] Formulário restaura cláusula.
- [ ] Formulário restaura extras.
- [ ] Duplicar não cria Firestore doc antes da nova finalização.

## Firestore Rules

- [ ] `test:rules` sempre sobe Emulator.
- [ ] `testEnv` não é nullable na suíte real.
- [ ] Sem `if (!testEnv) return`.
- [ ] Sem `testEnv = null`.
- [ ] Unit suite não mascara Rules como pass.
- [ ] Rules suite real passa no Emulator.

## R2 ↔ Firestore

- [ ] Upload ocorre antes do commit estruturado.
- [ ] Post-upload Firestore writes estão em uma única transação.
- [ ] Artifact metadata está no mesmo commit.
- [ ] `currentVersion` está no mesmo commit.
- [ ] Order consume está no mesmo commit.
- [ ] Guest access hash está no mesmo commit.
- [ ] Generation request completion está no mesmo commit.
- [ ] Transaction failure remove objeto R2.
- [ ] Transaction failure libera order.
- [ ] Transaction failure não promove currentVersion.
- [ ] Transaction failure não cria access link.
- [ ] Transaction success nunca sofre cleanup R2 genérico.

## Share

- [ ] Private by default.
- [ ] Explicit opt-in.
- [ ] Pinned version.
- [ ] Revogável.
- [ ] Reemissão invalida link anterior.
- [ ] Sem promessa falsa de TTL automático.
- [ ] R2 signed URL continua 300s.

## E2E

- [ ] Chromium configurado.
- [ ] Firestore Emulator usado.
- [ ] Demo billing apenas no ambiente de teste.
- [ ] Memory R2 apenas no ambiente de teste/dev.
- [ ] Guest UI realmente passa por checkout.
- [ ] `orderId` aparece na return URL.
- [ ] Fluxo chega a `/d/<token>`.
- [ ] Cláusula com extra é coberta.
- [ ] CI roda Playwright.

## Final quality gate

- [ ] `bun run test`
- [ ] `bun run test:rules`
- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun run build:ci`
- [ ] `bun run test:e2e`
- [ ] `git diff --check`
- [ ] GitHub Actions green
- [ ] Vercel Preview READY
- [ ] manual smoke green

---

# Suggested Commit Sequence

```text
fix(checkout): preserva order id no retorno guest
fix(guest): preserva extras de clausulas na finalizacao
fix(documents): preserva clausulas ao duplicar documento
test(firestore): remove skips silenciosos das security rules
fix(documents): torna commit pos-upload atomico no firestore
docs(access): fixa semantica de links revogaveis
test(e2e): cobre compra guest ate o magic link
docs(backend): registra fechamento final da integracao r2
```

Evitar um único mega-commit.

---

# Non-goals desta rodada

Não implementar:

```text
gateway real
webhooks de pagamento
email transacional
WhatsApp API
refund automation
Cloudflare Workers
queues
Firebase Functions
dashboard admin
upload de anexos
assinatura eletrônica
OCR
A/B test
analytics novo
Gitleaks
CodeQL
Dependabot extra
observability SaaS
```

Esses itens podem entrar em PRs posteriores.

O objetivo aqui é tornar o backend atual **integrado, testável e consistente**, não transformá-lo em outro produto.

---

# Relatório obrigatório do agente ao terminar

O relatório deve conter uma seção por task:

```text
Task:
Commit:
Arquivos:
Teste vermelho:
Implementação:
Teste verde:
Resultado:
```

Depois incluir outputs atuais de:

```bash
bun run test
bun run test:rules
bun run lint
bun run typecheck
bun run build:ci
bun run test:e2e
git diff --check
git status
```

Também incluir:

```text
HEAD SHA
origin branch SHA
GitHub Actions status
Vercel Preview status
manual smoke status
```

Se ainda não houver PR:

```text
GitHub Actions de pull_request ainda não comprovado
```

Não substituir isso por “CI local equivalente”.

---

# Stop Conditions

Interromper e reportar antes de continuar se ocorrer qualquer um destes casos:

```text
main avançou e a branch ficou behind
schema Firestore mudou fora do plano
order model mudou
R2 object key mudou
document-engine mudou a forma de representar cláusulas
Firebase Emulator não inicializa
Playwright exige credencial real
produção seria necessária para validar billing demo
uma correção exige gateway real
```

Não improvisar uma arquitetura nova para contornar um blocker.

---

# Final Definition of Done

Este plano só está concluído quando:

```text
1. checkout guest conserva orderId
2. guest clause extras chegam à finalização
3. duplicate restaura cláusulas e extras sem internal markers no client
4. Rules não possuem silent early return
5. Firestore Emulator executa Rules de verdade
6. post-upload Firestore state é committed atomicamente
7. falha antes do commit compensa R2
8. sucesso do commit nunca dispara compensação destrutiva
9. Playwright reproduz o fluxo que antes quebrava
10. todas as suites locais passam
11. branch está sincronizada com origin
12. PR CI passa
13. Vercel Preview está READY
14. smoke manual passa
```

Somente depois desses 14 itens a branch pode ser classificada como:

```text
MERGE-READY
```
