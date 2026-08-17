# DocFacil — Correções Finais Pré-PR do Backend R2 + Firebase

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. Execute this plan task-by-task. Do not skip red tests, do not collapse unrelated changes into one commit, and do not declare the branch merge-ready without remote CI evidence.

**Goal:** Fechar as últimas lacunas encontradas na auditoria da branch `feat/backend-documentos-r2`, consolidando o fluxo guest, consistência R2↔Firestore, regras reais do Firebase Emulator, privacidade de magic links, compartilhamento seguro, duplicação funcional e validação rígida de produção.

**Architecture:** Manter o modular monolith server-first já adotado. O browser coleta dados e apresenta a UX; o backend decide identidade, entitlement, pagamento, versionamento, persistência e autorização. Firestore guarda verdade estruturada; R2 guarda artefatos PDF privados e imutáveis.

**Tech Stack:** Next.js 16 App Router, TypeScript, Bun, Firebase Auth, Firebase Admin, Firestore, Firebase App Check, Cloudflare R2, AWS SDK v3, pdfmake server-side, Zod, Bun Test, Firebase Emulator, Playwright opcional para E2E de UI.

---

# Global Constraints

- Continuar em `feat/backend-documentos-r2`.
- Basear qualquer correção no estado atual da branch, não no relatório anterior.
- Não mover lógica server-side de volta para o client.
- Não criar novo backend paralelo.
- Não adicionar gateway real nesta rodada.
- Não adicionar Cloudflare Workers/Queues nesta rodada.
- Não alterar decisões comerciais já definidas sem necessidade.
- Guest pago recebe uma página de acesso permanente/revogável; a URL R2 continua temporária.
- Share autenticado permanece opt-in.
- PDF continua imutável por versão.
- Pro continua podendo gerar novas versões.
- Free/avulso não edita PDF já finalizado.
- `plan`, `paid`, `watermark`, `userId`, `version`, `artifactState` e `objectKey` nunca são confiados ao browser.
- Falhas críticas de R2/Firestore devem falhar fechado.
- Nenhum teste pode “passar” porque uma dependência crítica não iniciou.
- Testes de segurança não podem conter `if (!testEnv) return`.
- A/B tests não substituem testes funcionais, unitários, integration, E2E ou security.
- Experimentos A/B desta rodada são opcionais e só podem testar UX/copy/ordem de CTA. Nunca testar relaxamento de segurança.
- TDD obrigatório: **teste vermelho → implementação mínima → teste verde → commit**.
- Ao final de cada Task, registrar:
  - arquivos alterados;
  - teste que falhava;
  - comando executado;
  - resultado;
  - commit SHA.

---

# 1. Estado que esta rodada precisa fechar

A auditoria final encontrou os seguintes gaps:

1. Firestore Rules tests podem passar mesmo sem Emulator.
2. Guest pago ainda não completa `draft → checkout → finalize → R2 → magic link`.
3. `checkPaymentStatus()` considera qualquer `orderId` como pago.
4. Exclusão R2 ainda pode engolir erro.
5. Falha pós-upload pode deixar objeto órfão no R2.
6. Magic link guest está expirando em 30 dias apesar da regra comercial ser permanente/revogável.
7. `/d/*` ainda não aplica todos os headers HTTP de privacidade.
8. Produção ainda pode iniciar com App Check desligado ou credenciais críticas incompletas.
9. `SucessoView` ainda pode copiar a URL da SPA em vez do share token.
10. Duplicação cria objeto transitório que pode ser perdido.
11. `documents-service` ainda possui fallback demo em erro real de API, podendo mascarar falha de produção.
12. A CI da feature branch ainda não foi comprovada remotamente em PR.
13. Há espaço para aumentar cobertura com contract/integration/E2E e property-like invariants.

---

# 2. Arquitetura alvo após esta rodada

```text
Browser
│
├── Firebase Auth
├── Firebase App Check
├── guest draft local
├── UI / formulário
└── DocFacil API Client
        │
        ▼
Next.js Route Handlers
│
├── request security
│   ├── Firebase ID Token
│   └── App Check
│
├── domain
│   ├── entitlement
│   ├── idempotency
│   ├── versioning
│   ├── access/share
│   └── deletion
│
├── billing
│   └── demo provider
│
├── repositories
│   └── Firebase Admin / Firestore
│
├── PDF server generator
│
└── R2 private storage
    ├── immutable PDFs
    └── signed GET 300s
```

### Guest

```text
draft local
→ checkout
→ order paid
→ finalize
→ order reserve
→ PDF
→ R2
→ artifact metadata
→ currentVersion
→ order consumed
→ permanent guest access token
→ /d/<token>
```

### Authenticated

```text
login
→ finalize
→ server entitlement
→ R2
→ dashboard
→ signed download
→ optional share
```

---

# Task 1 — Tornar Firestore Rules tests reais e fail-closed

**Priority:** P0 / blocker

**Files**
- Modify: `package.json`
- Modify: `firebase.json`
- Modify: `src/test/rules/firestore.rules.test.ts`
- Modify: `.github/workflows/ci.yml`

## Goal

Nenhuma Rule pode ser considerada testada se o Firebase Emulator não estiver realmente disponível.

## Steps

- [ ] **1. Criar teste que comprova conexão com Emulator**

Adicionar um teste explícito:

```ts
it("runs against the Firestore Emulator", async () => {
  if (!testEnv) {
    throw new Error("Firestore Emulator não inicializado.");
  }

  const context = testEnv.unauthenticatedContext();
  const ref = context.firestore().collection("__health").doc("probe");

  await expect(ref.get()).resolves.toBeDefined();
});
```

- [ ] **2. Remover todos os silent skips**

Eliminar completamente:

```ts
if (!testEnv) return;
```

e:

```ts
catch {
  testEnv = null;
}
```

O `beforeAll` deve lançar erro se não conectar.

- [ ] **3. Fazer `test:rules` iniciar o Emulator**

```json
{
  "scripts": {
    "test:rules": "firebase emulators:exec --only firestore \"bun test src/test/rules/firestore.rules.test.ts\""
  }
}
```

- [ ] **4. Garantir config de emulator em `firebase.json`**

```json
{
  "emulators": {
    "firestore": {
      "host": "127.0.0.1",
      "port": 8080
    }
  }
}
```

- [ ] **5. CI usa o mesmo comando**

Não iniciar o teste direto sem `emulators:exec`.

- [ ] **6. Expandir matriz de Rules**

```text
✓ user creates profile with gratis
✗ user creates profile with pro
✓ update nome/telefone/foto
✗ update plano
✗ update uid
✗ update email
✗ update role
✗ update subscription

✓ owner reads own document
✗ other user reads document
✗ client creates document
✗ client updates document
✗ client deletes document

✗ client reads access_links
✗ client writes access_links
✗ client writes orders
✗ client reads generation_requests
✗ client writes generation_requests
```

- [ ] **7. Run**

```bash
bun run test:rules
```

Expected:
- Emulator inicia.
- Testes realmente executam.
- 0 skipped silenciosamente.
- 0 fail.

- [ ] **8. Commit**

```bash
git add package.json firebase.json src/test/rules/firestore.rules.test.ts .github/workflows/ci.yml
git commit -m "test(firestore): executa rules contra emulator real"
```

---

# Task 2 — Finalizar guest flow de ponta a ponta

**Priority:** P0 / blocker

**Files**
- Modify: `src/components/docfacil/views/criar-view.tsx`
- Modify: `src/components/docfacil/payment-barrier.tsx`
- Modify: `src/components/docfacil/views/checkout-view.tsx`
- Modify: `src/components/docfacil/views/sucesso-view.tsx`
- Modify: `src/lib/documents/client.ts`
- Modify: `src/lib/services/checkout-service.ts`
- Modify: `src/app/api/documents/finalize/route.ts`
- Create: `src/test/server/documents/guest-purchase-flow.test.ts`

## Goal

Guest deve realmente poder:

```text
preencher
→ pagar
→ gerar
→ receber magic link
→ baixar
```

sem criar conta.

## Data contract

```ts
interface GuestCheckoutReturn {
  orderId: string;
  modeloSlug: string;
}
```

Não transportar respostas completas pela URL.

## Steps

- [ ] **1. Garantir draft completo no localStorage**

```ts
interface GuestDraftData {
  requestId: string;
  modeloSlug: string;
  answers: Record<string, string>;
  clausulasSelecionadas: string[];
  extrasPorClausula: Record<string, Record<string, string>>;
  updatedAt: number;
}
```

- [ ] **2. Checkout precisa preservar `slug`**

```ts
navigate("checkout", {
  plan: "avulso",
  slug,
});
```

- [ ] **3. Checkout retorna `orderId + slug`**

```ts
navigate("sucesso", {
  slug,
  orderId: result.orderId,
});
```

- [ ] **4. `SucessoView` detecta compra guest pendente de finalização**

```ts
const orderId = params.orderId;
const draft = slug ? loadGuestDraft(slug) : null;

const shouldFinalizeGuest =
  !user &&
  Boolean(orderId) &&
  Boolean(draft);
```

- [ ] **5. Finalização acontece uma única vez**

```ts
const result = await finalizeDocument({
  requestId: draft.requestId,
  modeloSlug: draft.modeloSlug,
  respostas: reconstructClientPreviewAnswers(draft),
  clausulasSelecionadas: draft.clausulasSelecionadas,
  guestContact: checkoutContact,
  orderId,
});
```

- [ ] **6. Contato não pode ser inventado**

Remover fallback:

```ts
guest@docfacil.com
```

Guest checkout deve exigir contato real.

- [ ] **7. Navegar para `/d/<token>`**

```ts
if (!result.document.guestAccessPath) {
  throw new Error("Magic link não retornado.");
}

clearGuestDraft(slug);
clearFinalizationRequestId(slug);

window.location.assign(result.document.guestAccessPath);
```

- [ ] **8. Em erro, preservar draft + requestId**

Não limpar local state em:
- timeout;
- 500;
- R2 fail;
- order conflict.

- [ ] **9. Integration test**

```text
draft
→ order paid
→ finalize
→ order reserved
→ artifact ready
→ order consumed
→ access link exists
```

Negativos:

```text
guest no contact -> 400
guest no order -> 402
guest fake order -> 404/402
guest pending order -> 402
different buyer fingerprint -> blocked
retry same requestId -> same document
```

- [ ] **10. Commit**

```bash
git add src/components/docfacil src/lib/documents src/lib/services/checkout-service.ts src/app/api/documents/finalize src/test/server/documents
git commit -m "fix(guest): conclui fluxo de compra e magic link"
```

---

# Task 3 — Eliminar `checkPaymentStatus()` fake

**Priority:** P0

**Files**
- Modify: `src/lib/services/checkout-service.ts`
- Search/Modify: all consumers
- Optional Create: `src/app/api/orders/[id]/route.ts`
- Create: `src/test/server/billing/payment-status.test.ts`

## Goal

Nenhuma função deve declarar pagamento confirmado só porque existe um `orderId`.

## Preferred approach

Se a UI realmente precisa consultar status, criar:

```text
GET /api/orders/:id
```

Se não precisa, remover `checkPaymentStatus`.

## Steps

- [ ] **1. Procurar consumidores**

```bash
git grep -n "checkPaymentStatus" -- src
```

- [ ] **2A. Se não houver consumidor necessário**

Excluir a função.

- [ ] **2B. Se houver consumidor necessário**

Criar endpoint autoritativo server-side.

Nunca:

```ts
paid: Boolean(orderId)
```

- [ ] **3. Teste estrutural**

```ts
test("checkout-service não infere pagamento a partir de orderId", async () => {
  const source = await Bun.file("src/lib/services/checkout-service.ts").text();
  expect(source).not.toContain("paid: Boolean(orderId)");
});
```

- [ ] **4. Commit**

```bash
git add src/lib/services/checkout-service.ts src/app/api/orders src/test/server/billing
git commit -m "fix(billing): remove inferencia client-side de pagamento"
```

---

# Task 4 — Consistência real R2 ↔ Firestore em delete e geração

**Priority:** P0 / blocker

**Files**
- Modify: `src/lib/server/r2/storage.ts`
- Modify: `src/lib/server/domain/orchestrator.ts`
- Modify: `src/app/api/documents/[id]/route.ts`
- Modify: `src/lib/server/errors.ts`
- Create: `src/test/server/r2/delete-failure.test.ts`
- Create: `src/test/server/r2/orphan-compensation.test.ts`

## Part A — Delete

- [ ] **1. R2 delete precisa lançar erro**

```ts
public async deleteArtifact(objectKey: string): Promise<void> {
  try {
    await this.s3Client.send(...);
  } catch {
    throw new BackendError(
      "R2_DELETE_FAILED",
      500,
      "Falha ao remover o artefato."
    );
  }
}
```

- [ ] **2. `deleteDocumentArtifacts()` também propaga**

Sem `best effort` silencioso.

- [ ] **3. Preferir artifact keys persistidas**

```ts
const artifacts = await repos.documents.listArtifacts(documentId);

for (const artifact of artifacts) {
  await storage.deleteArtifact(artifact.objectKey);
}
```

- [ ] **4. Soft delete só quando purge realmente falhar**

Se R2 falha:
- `status = deleted`;
- `pendingPurge = true`;
- access links revogados;
- metadata preservada para retry;
- `purged = false`.

Se R2 sucesso:
- `pendingPurge = false`.

## Part B — Compensation

- [ ] **5. Guardar object key logo após upload**

```ts
let uploadedObjectKey: string | null = null;

const putResult = await storage.putArtifact(...);
uploadedObjectKey = putResult.objectKey;
```

- [ ] **6. Se persistência posterior falhar, tentar cleanup**

```ts
catch (err) {
  if (uploadedObjectKey) {
    try {
      await storage.deleteArtifact(uploadedObjectKey);
    } catch (cleanupErr) {
      logger.error("orchestrator", "falha na compensacao r2", cleanupErr);
    }
  }

  throw err;
}
```

- [ ] **7. Tests**

```text
R2 delete fails -> purged=false
R2 delete fails -> pendingPurge=true
R2 delete succeeds -> purged=true
Firestore save fails after upload -> deleteArtifact called
cleanup failure does not hide original failure
```

- [ ] **8. Commit**

```bash
git add src/lib/server/r2 src/lib/server/domain/orchestrator.ts src/app/api/documents/[id]/route.ts src/lib/server/errors.ts src/test/server/r2
git commit -m "fix(storage): fecha consistencia entre r2 e firestore"
```

---

# Task 5 — Magic link guest permanente e revogável

**Priority:** P0

**Files**
- Modify: `src/lib/server/domain/orchestrator.ts`
- Modify: `src/lib/server/domain/documents.ts`
- Modify: `src/app/api/access/download/route.ts`
- Modify: `src/app/d/[token]/page.tsx`
- Modify: relevant tests

## Product rule

Guest comprou um PDF:

```text
/d/<token>
```

é a página estável daquele documento.

O R2 signed URL:

```text
5 min
```

continua temporário.

## Steps

- [ ] **1. Não setar `expiresAt` para guest**

```ts
kind: "guest",
active: true,
expiresAt: undefined,
```

- [ ] **2. Access API diferencia guest de share**

```ts
if (
  link.kind === "share" &&
  link.expiresAt &&
  Date.now() > link.expiresAt
) {
  ...
}
```

- [ ] **3. Guest termina apenas se revoked/deleted**

- [ ] **4. Tests**

```text
guest link works after simulated 31 days
revoked guest link fails
deleted document fails
signed R2 URL remains 300s
```

- [ ] **5. Commit**

```bash
git add src/lib/server/domain src/app/api/access src/app/d src/test/server/access
git commit -m "fix(access): torna magic link guest permanente e revogavel"
```

---

# Task 6 — Headers reais de privacidade em `/d/*`

**Priority:** P1

**Files**
- Modify: `next.config.ts`
- Modify: `src/app/d/[token]/page.tsx`
- Create: `src/test/server/security/shared-page-headers.test.ts`

## Required headers

```text
Cache-Control: private, no-store, max-age=0
Referrer-Policy: no-referrer
X-Robots-Tag: noindex, nofollow, noarchive
```

## Steps

- [ ] **1. Add Next headers**

```ts
async headers() {
  return [
    {
      source: "/d/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "private, no-store, max-age=0",
        },
        {
          key: "Referrer-Policy",
          value: "no-referrer",
        },
        {
          key: "X-Robots-Tag",
          value: "noindex, nofollow, noarchive",
        },
      ],
    },
  ];
}
```

- [ ] **2. Manter Metadata defensiva**

```ts
robots: {
  index: false,
  follow: false,
  nocache: true,
  noarchive: true,
},
referrer: "no-referrer",
```

- [ ] **3. Manual Preview**

```bash
curl -I https://<preview>/d/token-invalido
```

- [ ] **4. Commit**

```bash
git add next.config.ts src/app/d src/test/server/security
git commit -m "fix(security): adiciona headers de privacidade aos magic links"
```

---

# Task 7 — Production config e App Check fail-closed

**Priority:** P0 security

**Files**
- Create: `src/lib/server/config/assert-production-config.ts`
- Create: `src/test/server/config/production-config.test.ts`
- Modify: `src/lib/server/env.ts`
- Modify: `src/lib/server/firebase-admin.ts`
- Modify: `src/lib/server/r2/storage.ts`
- Modify: `.env.example`

## Production requirements

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY

R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME

APP_CHECK_ENFORCED=true
ALLOW_DEMO_BILLING=false
ALLOW_IN_MEMORY_ARTIFACT_STORAGE=false
```

## Steps

- [ ] **1. Criar assertion**

```ts
export function assertProductionServerConfig(env: ServerEnv): void {
  if (env.NODE_ENV !== "production") return;

  const missing = [
    ["FIREBASE_PROJECT_ID", env.FIREBASE_PROJECT_ID],
    ["FIREBASE_CLIENT_EMAIL", env.FIREBASE_CLIENT_EMAIL],
    ["FIREBASE_PRIVATE_KEY", env.FIREBASE_PRIVATE_KEY],
    ["R2_ACCOUNT_ID", env.R2_ACCOUNT_ID],
    ["R2_ACCESS_KEY_ID", env.R2_ACCESS_KEY_ID],
    ["R2_SECRET_ACCESS_KEY", env.R2_SECRET_ACCESS_KEY],
    ["R2_BUCKET_NAME", env.R2_BUCKET_NAME],
  ].filter(([, value]) => !value);

  if (missing.length) {
    throw new Error("DocFacil production backend configuration incomplete.");
  }

  if (!env.APP_CHECK_ENFORCED) {
    throw new Error("APP_CHECK_ENFORCED must be true in production.");
  }

  if (env.ALLOW_DEMO_BILLING) {
    throw new Error("Demo billing cannot be enabled in production.");
  }

  if (env.ALLOW_IN_MEMORY_ARTIFACT_STORAGE) {
    throw new Error("In-memory artifact storage cannot be enabled in production.");
  }
}
```

- [ ] **2. Aplicar nas factories server-side críticas**

- [ ] **3. Test matrix**

```text
production missing Firebase -> fail
production missing R2 -> fail
production AppCheck false -> fail
production demo billing true -> fail
production memory storage true -> fail
development partial config -> allowed
test -> allowed
```

- [ ] **4. Commit**

```bash
git add src/lib/server/config src/lib/server/env.ts src/lib/server/firebase-admin.ts src/lib/server/r2 .env.example src/test/server/config
git commit -m "fix(config): valida backend obrigatorio em producao"
```

---

# Task 8 — Compartilhamento seguro na `SucessoView`

**Priority:** P1

**Files**
- Modify: `src/components/docfacil/views/sucesso-view.tsx`
- Modify: `src/lib/documents/client.ts`
- Create: `src/test/documents/share-ui-contract.test.ts`

## Goal

Documento real autenticado nunca deve compartilhar:

```text
/?view=sucesso&id=...
```

Deve compartilhar:

```text
/d/<opaque-token>
```

## Steps

- [ ] **1. Centralizar `ensureShareUrl`**

```ts
async function ensureShareUrl(docId: string): Promise<string> {
  const result = await shareDocument(docId);
  return `${window.location.origin}${result.shareUrl}`;
}
```

- [ ] **2. Copy**

```ts
const url = await ensureShareUrl(docId);
await navigator.clipboard.writeText(url);
```

- [ ] **3. WhatsApp e email usam a mesma URL segura**

- [ ] **4. Teste estrutural**

```ts
expect(source).not.toContain(
  "navigator.clipboard.writeText(window.location.href)"
);
```

- [ ] **5. Commit**

```bash
git add src/components/docfacil/views/sucesso-view.tsx src/lib/documents/client.ts src/test/documents/share-ui-contract.test.ts
git commit -m "fix(sharing): usa links revogaveis na tela de sucesso"
```

---

# Task 9 — Duplicação deve gerar draft real e navegável

**Priority:** P1

**Files**
- Modify: `src/lib/services/documents-service.ts`
- Modify: `src/lib/documents/client.ts`
- Modify: `src/components/docfacil/views/documento/use-documento-actions.ts`
- Modify: `src/components/docfacil/views/criar-view.tsx`
- Create: `src/test/server/documents/duplicate-flow.test.ts`

## Desired UX

```text
Documento final
→ Duplicar
→ backend valida owner
→ retorna duplicateDraft
→ client salva draft local
→ abre CriarView
→ dados pré-preenchidos
→ usuário ajusta
→ nova geração normal
```

## Steps

- [ ] **1. Reutilizar mecanismo de draft local**

- [ ] **2. `duplicateDocument()` retorna draft, não `Documento` falso**

```ts
interface DuplicateDraftResult {
  modeloSlug: string;
  respostas: Record<string, string>;
  clausulasSelecionadas: string[];
}
```

- [ ] **3. Action salva draft e abre CriarView**

- [ ] **4. CriarView restaura valores**

- [ ] **5. Tests**

```text
duplicate owner -> draft
duplicate non-owner -> 403
draft survives navigation
CriarView restores fields
duplicate does not create Firestore document
```

- [ ] **6. Commit**

```bash
git add src/lib/services/documents-service.ts src/lib/documents src/components/docfacil/views src/test/server/documents
git commit -m "fix(documents): transforma duplicacao em draft editavel"
```

---

# Task 10 — Remover fallback demo em erro de API real

**Priority:** P1 reliability

**Files**
- Modify: `src/lib/services/documents-service.ts`
- Create: `src/test/server/documents/no-production-demo-fallback.test.ts`

## Rule

Demo fallback só pode ocorrer quando:

```ts
!IS_FIREBASE_CONFIGURED
```

Nunca quando backend real falha.

## Steps

- [ ] **1. Remover catch com demo fallback do caminho Firebase**
- [ ] **2. UI mostra erro e retry**
- [ ] **3. Test**

```ts
test("Firebase real não cai para demo quando API falha", async () => {});
```

- [ ] **4. Commit**

```bash
git add src/lib/services/documents-service.ts src/test/server/documents/no-production-demo-fallback.test.ts
git commit -m "fix(documents): remove fallback demo de erros reais"
```

---

# Task 11 — Expandir testes críticos de backend

**Priority:** P1 quality

## Required cases

### Idempotency

```text
same requestId + same operation -> same result
same order + different requestId concurrent -> only one reservation
```

### R2

```text
upload success + Firestore fail -> cleanup attempted
delete fail -> pendingPurge
signed URL expiresIn == 300
versions never overwrite
```

### Guest

```text
guest no contact -> fail
guest paid -> permanent access
guest revoked -> fail
guest deleted -> fail
```

### Share

```text
share default absent
share explicit creates token
new share revokes previous
share pinned to version
```

### Authorization

```text
owner allowed
non-owner forbidden
invalid token 401
invalid bearer does not become guest
```

- [ ] **Run**

```bash
bun run test
```

- [ ] **Commit**

```bash
git add src/test
git commit -m "test(backend): amplia cobertura de fluxos criticos"
```

---

# Task 12 — Property-style tests para invariantes

**Priority:** P2 but recommended

Pode usar Bun Test puro ou adicionar `fast-check`.

## Targets

```text
normalizeEmail
normalizePhone
buyer fingerprint
hashToken
artifact object key
filename sanitization
canonical source hash
model snapshot hash
```

## Properties

```text
same email different casing -> same fingerprint
same phone different punctuation -> same fingerprint
fingerprint contains no raw PII
same answers different insertion order -> same source hash
changed answer -> different source hash
version N path != version N+1 path
tokens are unique across samples
```

- [ ] **Commit**

```bash
git add package.json bun.lock src/test src/lib/server
git commit -m "test(domain): adiciona invariantes de hashing e identidade"
```

---

# Task 13 — E2E Playwright mínimo

**Priority:** P1 if time permits, otherwise immediate follow-up PR

**Files**
- Add: `playwright.config.ts`
- Add: `e2e/guest-purchase.spec.ts`
- Add: `e2e/share.spec.ts`
- Modify: `package.json`

## Start small

Chromium only.

## Guest flow

```text
open model
fill
finish
payment barrier
checkout demo
finalize
land on /d/<token>
download available
```

## Share

```text
auth document
share
anonymous access
revoke
old link invalid
```

Script:

```json
{
  "scripts": {
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Commit**

```bash
git add playwright.config.ts e2e package.json bun.lock
git commit -m "test(e2e): cobre fluxo guest e compartilhamento"
```

---

# Task 14 — Experimentos A/B opcionais de UX

**Priority:** P3 / non-blocking

> A/B não entra como critério de correção funcional ou segurança.

## Experiment A — CTA do paywall

A:

```text
Baixar por R$ 9,90
```

B:

```text
Gerar meu PDF por R$ 9,90
```

Metric:
- checkout start rate.

## Experiment B — momento de pedir contato

A:
- pedir no checkout.

B:
- pedir logo antes do paywall.

Metrics:
- checkout started;
- checkout completed;
- PDF generated.

## Experiment C — share copy

A:

```text
Compartilhar documento
```

B:

```text
Criar link seguro
```

Metric:
- share creation.

## Never A/B test

```text
auth
App Check
entitlement
payment validation
R2 privacy
signed URL duration
watermark
authorization
token secrecy
```

Preferir PR separada se aumentar o diff.

---

# Task 15 — Quality gate local final

```bash
bun install --frozen-lockfile
bun run test
bun run test:rules
bun run lint
bun run typecheck
bun run build:ci
```

Se Playwright entrou:

```bash
bun run test:e2e
```

## Forbidden regression scan

```bash
git grep -n "paid=1" -- src || true
git grep -n "paid: Boolean(orderId)" -- src || true
git grep -n "guest@docfacil.com" -- src || true
git grep -n "if (!testEnv) return" -- src/test || true
git grep -n "Best effort deletion" -- src/lib/server/r2 || true
git grep -n "navigator.clipboard.writeText(window.location.href)" -- src || true
```

Expected:
- zero prohibited matches.

---

# Task 16 — Preview validation manual

## Guest

- [ ] preencher;
- [ ] draft sobrevive refresh;
- [ ] checkout exige contato;
- [ ] order criada no backend;
- [ ] finalização real;
- [ ] redirect `/d/<token>`;
- [ ] download;
- [ ] guest link permanece válido;
- [ ] revoke invalida.

## Free

- [ ] login;
- [ ] perfil `gratis`;
- [ ] geração;
- [ ] watermark;
- [ ] dashboard;
- [ ] signed download.

## Pro

- [ ] v1;
- [ ] v2;
- [ ] v1 preservada;
- [ ] currentVersion v2.

## Share

- [ ] privado por padrão;
- [ ] create share;
- [ ] anonymous access;
- [ ] revoke;
- [ ] old link invalid.

## Failure

- [ ] quebrar R2 env no Preview;
- [ ] falha explícita;
- [ ] nenhum fake success;
- [ ] nenhum memory fallback.

---

# Task 17 — Remote CI and PR gate

```bash
git push origin feat/backend-documentos-r2
```

Open PR to `main`.

Required:

```text
✓ Unit/integration tests
✓ Firestore Rules via real Emulator
✓ ESLint
✓ Typecheck
✓ Build
✓ Playwright if included
✓ Vercel Preview READY
```

Do not claim:
- “all tests pass” without current CI;
- “production ready” before production env;
- “LGPD compliant” without formal evidence;
- “payment production ready” while provider real is absent.

---

# Suggested commit sequence

```text
test(firestore): executa rules contra emulator real
fix(guest): conclui fluxo de compra e magic link
fix(billing): remove inferencia client-side de pagamento
fix(storage): fecha consistencia entre r2 e firestore
fix(access): torna magic link guest permanente e revogavel
fix(security): adiciona headers de privacidade aos magic links
fix(config): valida backend obrigatorio em producao
fix(sharing): usa links revogaveis na tela de sucesso
fix(documents): transforma duplicacao em draft editavel
fix(documents): remove fallback demo de erros reais
test(backend): amplia cobertura de fluxos criticos
test(domain): adiciona invariantes de hashing e identidade
test(e2e): cobre fluxo guest e compartilhamento
```

---

# Final acceptance checklist

## Firestore
- [ ] Rules test usa Emulator real.
- [ ] Sem silent skip.
- [ ] Client não escreve documents.
- [ ] User não altera plano.

## Guest
- [ ] Sem conta.
- [ ] Draft local.
- [ ] Contato real.
- [ ] Order server-side.
- [ ] Paid required.
- [ ] Finalize real.
- [ ] PDF R2.
- [ ] `/d/<token>`.
- [ ] Token guest permanente/revogável.
- [ ] R2 signed URL = 300s.

## Billing
- [ ] Sem `?paid=1`.
- [ ] Sem `Boolean(orderId)`.
- [ ] Sem fake order browser.
- [ ] Reservation atômica.

## R2
- [ ] Production fail-closed.
- [ ] Delete não engole erro.
- [ ] pendingPurge correto.
- [ ] Compensation pós-upload.

## Privacy
- [ ] `/d/*` no-store.
- [ ] no-referrer.
- [ ] noindex.
- [ ] token plaintext fora do DB.
- [ ] PII fora de principalKey.

## Share
- [ ] Private by default.
- [ ] Opt-in.
- [ ] SuccessView usa share token.
- [ ] Revogável.
- [ ] Version pinned.

## Duplicate
- [ ] Draft persistido localmente.
- [ ] CriarView restaura.
- [ ] Não cria Firestore doc antes da finalização.

## Reliability
- [ ] API real não cai para demo.
- [ ] Production config validation.
- [ ] App Check enforced em prod.

## Quality
- [ ] `bun run test` PASS.
- [ ] `bun run test:rules` PASS com Emulator.
- [ ] `bun run lint` PASS.
- [ ] `bun run typecheck` PASS.
- [ ] `bun run build:ci` PASS.
- [ ] Playwright guest E2E PASS se incluído.
- [ ] GitHub Actions verde.
- [ ] Vercel Preview READY.
- [ ] Manual guest/free/pro/share concluído.

---

# Out of scope

```text
gateway real
webhook real
email provider
WhatsApp API
refund automation
Cloudflare Workers
Firebase Functions
queues
admin panel
attachment upload
electronic signature
```

---

# Handoff

Antes de começar:

```bash
git checkout feat/backend-documentos-r2
git fetch origin
git status
git log -1 --oneline
```

Execute task por task.

No relatório final, incluir:

```text
Task
Files changed
Red test before
Implementation
Green test after
Commit SHA
```

E outputs atuais de:

```bash
bun run test
bun run test:rules
bun run lint
bun run typecheck
bun run build:ci
```

Se adicionado:

```bash
bun run test:e2e
```

Também incluir:
- GitHub Actions;
- Vercel Preview;
- guest manual flow;
- qualquer limitação restante.

**Não declarar “100% concluído”, “pronto para merge” ou número específico de testes sem evidência do HEAD atual.**
