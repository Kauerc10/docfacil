# Correções Pré-Merge do Backend Firebase + Cloudflare R2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os blockers encontrados na auditoria da branch `feat/backend-documentos-r2`, integrar de ponta a ponta o backend seguro já criado e deixar o fluxo Firebase + Vercel + Cloudflare R2 consistente, testável, fail-closed e pronto para Pull Request.

**Architecture:** Manter o DocFacil como modular monolith no Next.js 16. Firebase Auth continua sendo a identidade, Firestore continua como fonte de verdade de dados estruturados, Route Handlers/Vercel são a autoridade para toda mutação e Cloudflare R2 privado guarda apenas PDFs finais imutáveis. Esta rodada não redesenha a arquitetura: ela fecha os vazamentos entre o backend novo e os fluxos legados do client.

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Bun, Firebase Web SDK, Firebase Admin SDK, Firestore, Firebase App Check, Cloudflare R2 S3 API, AWS SDK v3, pdfmake 0.3.x, Zod, Bun Test, Firebase Emulator/Rules Unit Testing, Vercel Node.js Runtime.

## Global Constraints

- Continuar na branch existente `feat/backend-documentos-r2`.
- Antes de qualquer alteração, atualizar a branch com `main` sem reescrever histórico compartilhado.
- Não abrir o PR final enquanto todos os gates deste documento não estiverem verdes.
- Seguir `CONTRIBUTING.md`: Conventional Commits, mudanças pequenas e revisáveis, CI obrigatória.
- Runtime do backend: `nodejs`; não migrar Firebase Admin, pdfmake server ou AWS SDK para Edge Runtime.
- Node mínimo permanece `>=22`.
- Firestore é a fonte de verdade de dados estruturados.
- R2 armazena exclusivamente artefatos PDF finais e privados.
- Nenhum segredo usa prefixo `NEXT_PUBLIC_`.
- Nenhuma mutação real de `documents`, `orders`, `access_links`, `generation_requests` ou artifacts pode acontecer diretamente pelo Firebase Web SDK.
- Cliente nunca é autoridade para `userId`, `plano`, `entitlement`, `paymentStatus`, `watermark`, `artifactState`, `currentVersion`, `objectKey`, preço ou status de uma compra.
- Usuário autenticado é identificado exclusivamente por Firebase ID Token validado server-side.
- `plano` canônico da conta é `gratis | pro`. `avulso` é produto/entitlement, nunca plano persistente da conta.
- Preço avulso canônico nesta versão: `R$ 9,90` = `990` centavos.
- Plano Pro canônico nesta versão: `R$ 24,90/mês`.
- Plano grátis: máximo de 3 gerações/mês e PDF com watermark.
- Guest pode preencher sem login, mas não persiste um documento autoritativo antes de existir entitlement avulso pago.
- Guest deve fornecer pelo menos e-mail ou WhatsApp antes do checkout.
- Guest avulso recebe magic link após a geração concluída.
- Pro pode gerar novas versões; versões anteriores permanecem imutáveis.
- Downloads reais vêm de URL R2 assinada por 300 segundos.
- Em produção, ausência de Firebase Admin, R2 ou App Check exigidos deve falhar explicitamente; nunca cair silenciosamente em mocks/in-memory.
- Billing demo só pode existir fora de produção e deve ser fail-closed.
- Não usar `?paid=1`, localStorage ou query string como prova de pagamento.
- Não persistir e-mail/telefone em `generation_requests.principalKey`; usar fingerprint SHA-256 normalizado.
- Exclusão só responde sucesso depois de confirmar remoção dos objetos R2 e metadados Firestore.
- Falha parcial após upload deve executar compensação para não deixar objeto órfão.
- `/d/*` deve ser `noindex`, `nofollow`, `noarchive`, `no-store` e `Referrer-Policy: no-referrer`.
- Não adicionar gateway real, webhook real, envio real de e-mail/WhatsApp ou remover Prisma/SQLite nesta rodada.
- Fluxo de implementação por tarefa: **teste falhando → implementação mínima → teste passando → commit**.

---

# 1. Por que esta rodada existe

A primeira implementação acertou a espinha dorsal: Firebase Admin, backend server-side, geração PDF Node, R2 privado, signed URLs, magic links, idempotência, entitlement e versionamento.

A auditoria pós-implementação encontrou, porém, uma camada de “código velho encontrando arquitetura nova”:

1. `firestore.rules` aceita `plano == "free"` na criação enquanto o app cria `plano: "gratis"`.
2. `package.json` chama um teste de Rules que não está versionado.
3. `documents-service.ts` ainda contém escrita direta via Firebase Web SDK.
4. Duplicação ainda usa esse caminho client-side.
5. Dashboard/detalhe ainda trabalham com o schema legado `Documento`, enquanto o backend novo grava `owner`, `artifactState`, `currentVersion`, `createdAt`.
6. Guest termina o formulário, mas o checkout e a finalização server-side ainda não formam um único fluxo.
7. Billing demo ainda possui fallback local e lógica `?paid=1`.
8. Preço avulso diverge entre UI e backend demo.
9. R2 ausente pode cair silenciosamente em memória.
10. Falhas de delete do R2 são engolidas.
11. Order avulsa pode ser disputada por requests concorrentes.
12. `generation_requests.principalKey` pode conter PII.
13. Regras de `users` usam blacklist em vez de whitelist.
14. A UI de share ainda copia a URL da tela em vez do token revogável.
15. `/d/*` não aplica todos os headers HTTP planejados.
16. A idempotência do client não é estável o suficiente para retries reais.

Esta correção deve eliminar esses pontos sem ampliar escopo.

---

# 2. Arquitetura final esperada depois das correções

```text
Browser
│
├── Firebase Auth
├── Firebase App Check
├── formulário / preview
├── draft guest local
│
└── DocFacil API client
        │
        ▼
Next.js Route Handlers — Vercel / Node.js
│
├── verify Firebase ID token
├── verify App Check
├── Zod
├── authorization
├── entitlement
├── order reservation / idempotency
├── document domain
├── Firebase Admin repositories
├── PDF server generator
└── R2 private storage
        │
        ├── Firestore
        │   ├── users
        │   ├── documents
        │   │   └── artifacts
        │   ├── orders
        │   ├── access_links
        │   └── generation_requests
        │
        └── R2
            └── documents/{documentId}/v{version}/document.pdf
```

## Fluxo autenticado

```text
formulário
→ stable requestId
→ POST /api/documents/finalize
→ ID Token + App Check
→ plano lido server-side
→ free/pro resolvido server-side
→ PDF server-side
→ R2 privado
→ artifact Firestore
→ documento ready
→ dashboard
→ POST /download
→ signed GET URL 300s
```

## Fluxo guest avulso

```text
formulário
→ salva draft local + stable requestId
→ sucesso/paywall
→ checkout coleta contato
→ POST /api/checkout/demo
→ order realmente paid no backend
→ sucesso recebe somente orderId
→ lê draft local
→ POST /api/documents/finalize com orderId
→ backend valida buyer + reserva order
→ PDF
→ R2
→ Firestore
→ consome order
→ cria magic token
→ browser navega para /d/<token>
```

Nenhuma etapa acima confia em `paid=1`.

---

# 3. Mapa de arquivos

## Novos arquivos recomendados

```text
src/lib/documents/dto.ts
src/lib/documents/idempotency.ts
src/lib/server/billing/order-identity.ts
src/lib/server/config/assert-production-config.ts

src/app/api/documents/route.ts
src/app/api/documents/[id]/duplicate/route.ts

src/test/rules/firestore.rules.test.ts
src/test/server/billing/order-identity.test.ts
src/test/server/billing/order-reservation.test.ts
src/test/server/r2/storage-config.test.ts
src/test/server/r2/delete-consistency.test.ts
src/test/server/documents/idempotency.test.ts
src/test/server/documents/guest-flow.test.ts
src/test/server/documents/duplicate.test.ts
src/test/server/config/production-config.test.ts
```

## Arquivos principais a modificar

```text
firestore.rules
firebase.json
package.json
.github/workflows/ci.yml
next.config.ts

src/lib/firebase.ts
src/lib/auth-context.tsx
src/lib/pricing.ts
src/lib/services/checkout-service.ts
src/lib/services/documents-service.ts

src/lib/documents/client.ts
src/lib/server/env.ts
src/lib/server/security.ts
src/lib/server/errors.ts
src/lib/server/domain/documents.ts
src/lib/server/domain/orchestrator.ts
src/lib/server/billing/entitlement.ts
src/lib/server/billing/demo-provider.ts
src/lib/server/firestore/interfaces.ts
src/lib/server/firestore/repositories.ts
src/lib/server/r2/storage.ts

src/app/api/checkout/demo/route.ts
src/app/api/documents/finalize/route.ts
src/app/api/documents/[id]/route.ts
src/app/api/documents/[id]/download/route.ts
src/app/api/documents/[id]/share/route.ts
src/app/api/documents/[id]/share/revoke/route.ts
src/app/d/[token]/page.tsx

src/components/docfacil/views/criar-view.tsx
src/components/docfacil/views/sucesso-view.tsx
src/components/docfacil/views/checkout-view.tsx
src/components/docfacil/views/dashboard-view.tsx
src/components/docfacil/views/documento/use-documento-actions.ts
src/components/docfacil/payment-barrier.tsx
```

---

# 4. Ordem de execução

A ordem abaixo é intencional. Não começar pelo guest flow antes de estabilizar Rules, preço, DTOs e persistência.

---

## Task 1: Congelar o baseline e transformar a auditoria em testes reproduzíveis

**Files:**
- Create: `src/test/rules/firestore.rules.test.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `firebase.json`

**Produces:**
- Um teste real e versionado de Firestore Rules.
- Um CI que falha de verdade se o arquivo de Rules/testes desaparecer.
- Baseline verificável antes das mudanças funcionais.

- [ ] **Step 1: confirmar branch e sincronização**

```bash
git status
git branch --show-current
git fetch origin
git rebase origin/main
```

Esperado:

```text
feat/backend-documentos-r2
```

Se houver commits compartilhados conflitantes, não usar `git push --force`. Resolver localmente e, somente se rebase for realmente necessário, usar `--force-with-lease` após revisão.

- [ ] **Step 2: criar o teste de Rules que hoje está ausente**

O teste deve cobrir no mínimo:

```ts
describe("users rules", () => {
  test("usuario cria o proprio perfil com plano gratis", async () => {});
  test("usuario nao pode criar perfil com plano pro", async () => {});
  test("usuario pode alterar nome e telefone", async () => {});
  test("usuario nao pode alterar plano", async () => {});
  test("usuario nao pode alterar uid ou email autoritativo", async () => {});
});

describe("documents rules", () => {
  test("cliente autenticado pode ler o proprio documento", async () => {});
  test("cliente nao pode criar documento diretamente", async () => {});
  test("cliente nao pode atualizar documento diretamente", async () => {});
  test("cliente nao pode excluir documento diretamente", async () => {});
});

describe("server-only collections", () => {
  test("access_links bloqueia leitura e escrita client-side", async () => {});
  test("generation_requests bloqueia leitura e escrita client-side", async () => {});
  test("orders bloqueia escrita client-side", async () => {});
});
```

Usar `@firebase/rules-unit-testing`, Firebase Emulator e as Rules reais do repositório.

- [ ] **Step 3: provar que o baseline atual falha onde esperamos**

```bash
bun run test:rules
```

Esperado antes da correção da Task 2:

```text
FAIL: usuario cria o proprio perfil com plano gratis
```

- [ ] **Step 4: garantir que CI chama o arquivo real**

O script deve continuar apontando para um arquivo existente:

```json
{
  "scripts": {
    "test:rules": "bun test src/test/rules/firestore.rules.test.ts"
  }
}
```

- [ ] **Step 5: commit**

```bash
git add src/test/rules/firestore.rules.test.ts package.json .github/workflows/ci.yml firebase.json
git commit -m "test(backend): fixa baseline das firestore rules"
```

**Acceptance gate:**
- O arquivo existe no Git.
- `bun run test:rules` executa.
- Há pelo menos uma falha reproduzindo o bug `free` vs `gratis`.

---

## Task 2: Canonicalizar planos e preços antes de qualquer billing

**Files:**
- Modify: `firestore.rules`
- Modify: `src/lib/pricing.ts`
- Modify: `src/lib/server/billing/entitlement.ts`
- Modify: `src/lib/server/billing/demo-provider.ts`
- Modify: `src/app/api/checkout/demo/route.ts`
- Create: `src/test/server/billing/pricing.test.ts`

**Interfaces:**

```ts
export type AccountPlan = "gratis" | "pro";
export type PurchaseProduct = "avulso" | "pro";

export const PLAN_PRICES = {
  gratis: 0,
  avulso: 9.9,
  pro: 24.9,
} as const;

export function planPriceToCents(plan: keyof typeof PLAN_PRICES): number;
```

- [ ] **Step 1: escrever teste de preço**

```ts
import { expect, test } from "bun:test";
import { planPriceToCents } from "@/lib/pricing";

test("avulso custa exatamente 990 centavos", () => {
  expect(planPriceToCents("avulso")).toBe(990);
});

test("pro custa exatamente 2490 centavos", () => {
  expect(planPriceToCents("pro")).toBe(2490);
});
```

- [ ] **Step 2: implementar conversão canônica**

Em `src/lib/pricing.ts`:

```ts
export function planPriceToCents(plan: Plan): number {
  return Math.round(PLAN_PRICES[plan] * 100);
}
```

- [ ] **Step 3: remover `1990` hardcoded do checkout demo**

Em `/api/checkout/demo`:

```ts
const amountCents = planPriceToCents("avulso");

const order = await provider.createOrder({
  product: "avulso",
  amountCents,
  buyer,
});
```

- [ ] **Step 4: corrigir vocabulário de plano em Rules**

Trocar a criação de usuário para aceitar o valor real do produto:

```rules
request.resource.data.plano == 'gratis'
```

Nunca persistir `"free"`.

- [ ] **Step 5: rodar testes**

```bash
bun test src/test/server/billing/pricing.test.ts
bun run test:rules
```

Esperado:

```text
PASS pricing
PASS perfil com plano gratis
```

- [ ] **Step 6: commit**

```bash
git add firestore.rules src/lib/pricing.ts src/lib/server/billing src/app/api/checkout/demo/route.ts src/test/server/billing/pricing.test.ts
git commit -m "fix(billing): alinha planos e preco avulso"
```

---

## Task 3: Endurecer `users/{uid}` com whitelist, não blacklist

**Files:**
- Modify: `firestore.rules`
- Modify: `src/test/rules/firestore.rules.test.ts`

**Goal:** O Firebase Web SDK pode alterar somente campos de perfil explicitamente seguros.

- [ ] **Step 1: adicionar testes de campos autoritativos**

```ts
test("usuario nao pode mudar email persistido", async () => {});
test("usuario nao pode mudar uid persistido", async () => {});
test("usuario nao pode criar role", async () => {});
test("usuario nao pode criar subscription", async () => {});
test("usuario nao pode mudar criadoEm", async () => {});
test("usuario pode mudar nome telefone e fotoUrl", async () => {});
```

- [ ] **Step 2: substituir blacklist por whitelist**

A intenção da Rule deve ficar equivalente a:

```rules
function onlyEditableProfileFields() {
  return request.resource.data
    .diff(resource.data)
    .affectedKeys()
    .hasOnly(['nome', 'telefone', 'fotoUrl', 'atualizadoEm']);
}
```

Update:

```rules
allow update: if request.auth != null
  && request.auth.uid == uid
  && onlyEditableProfileFields();
```

Create deve exigir identidade coerente:

```rules
allow create: if request.auth != null
  && request.auth.uid == uid
  && request.resource.data.uid == request.auth.uid
  && request.resource.data.plano == 'gratis';
```

- [ ] **Step 3: executar Rules tests**

```bash
bun run test:rules
```

- [ ] **Step 4: commit**

```bash
git add firestore.rules src/test/rules/firestore.rules.test.ts
git commit -m "fix(security): restringe campos editaveis do perfil"
```

---

## Task 4: Eliminar definitivamente CRUD real de documentos pelo Firebase Web SDK

**Files:**
- Create: `src/lib/documents/dto.ts`
- Create: `src/app/api/documents/route.ts`
- Create: `src/app/api/documents/[id]/duplicate/route.ts`
- Modify: `src/app/api/documents/[id]/route.ts`
- Modify: `src/lib/documents/client.ts`
- Modify: `src/lib/services/documents-service.ts`
- Modify: `src/lib/server/firestore/interfaces.ts`
- Modify: `src/lib/server/firestore/repositories.ts`
- Create: `src/test/server/documents/duplicate.test.ts`

**Architecture decision:** `documents-service.ts` pode continuar existindo como fachada de UI/demo, mas no modo Firebase real não importa `addDoc`, `updateDoc`, `deleteDoc` ou qualquer writer do Firestore.

**DTO:**

```ts
export interface DocumentSummaryDto {
  id: string;
  modeloSlug: string;
  modeloNome: string;
  status: "rascunho" | "concluido";
  artifactState: "generating" | "ready" | "failed";
  currentVersion: number | null;
  watermarked: boolean;
  criadoEm: number;
  atualizadoEm: number;
}

export interface DocumentDetailDto extends DocumentSummaryDto {
  respostas: Record<string, string>;
}
```

- [ ] **Step 1: teste estrutural para impedir regressão**

Criar teste que leia `documents-service.ts` e garanta ausência de writers:

```ts
test("documents-service nao importa writers do firestore", async () => {
  const source = await Bun.file(
    "src/lib/services/documents-service.ts"
  ).text();

  expect(source).not.toContain("addDoc");
  expect(source).not.toContain("updateDoc");
  expect(source).not.toContain("deleteDoc");
  expect(source).not.toContain("setDoc");
});
```

- [ ] **Step 2: criar `GET /api/documents`**

Contrato:

```json
{
  "documents": [
    {
      "id": "abc",
      "modeloSlug": "contrato-locacao",
      "modeloNome": "Contrato de Locação",
      "status": "concluido",
      "artifactState": "ready",
      "currentVersion": 1,
      "watermarked": true,
      "criadoEm": 1780000000000,
      "atualizadoEm": 1780000000000
    }
  ]
}
```

A rota:
1. exige App Check;
2. exige Firebase user;
3. lista apenas `owner.userId == token.uid`;
4. nunca aceita `userId` de query/body.

- [ ] **Step 3: adicionar repository method**

```ts
listUserDocuments(userId: string): Promise<DocumentRecord[]>;
```

Firestore query:

```ts
this.db
  .collection("documents")
  .where("owner.type", "==", "user")
  .where("owner.userId", "==", userId)
  .orderBy("updatedAt", "desc");
```

Se índice composto for exigido, documentar e adicionar `firestore.indexes.json`.

- [ ] **Step 4: criar duplicação server-side**

Endpoint:

```text
POST /api/documents/:id/duplicate
```

Sem body autoritativo.

Backend:
1. autentica;
2. carrega original;
3. valida ownership;
4. cria um draft/local intent ou novo documento somente conforme regra do produto.

**Nesta branch, duplicar não deve criar artefato nem cobrar.** A resposta deve fornecer os dados para abrir o formulário preenchido, não criar um registro Firestore incompleto.

Contrato recomendado:

```json
{
  "duplicateDraft": {
    "modeloSlug": "contrato-locacao",
    "respostas": {},
    "clausulasSelecionadas": []
  }
}
```

A UI salva esse conteúdo no draft local e abre `criar`.

Assim `documents` continua significando documento finalizado, não rascunho incompleto.

- [ ] **Step 5: `documents-service.ts` vira fachada**

Pseudo-estrutura:

```ts
export async function listDocuments(userId: string): Promise<Documento[]> {
  if (!IS_FIREBASE_CONFIGURED) {
    return listDemoDocuments(userId);
  }

  return await listDocumentsApi();
}

export async function getDocument(id: string): Promise<Documento | null> {
  if (id.startsWith("demo-")) {
    return getDemoDocument(id);
  }

  return await getDocumentApi(id);
}
```

Remover writers Firestore reais.

- [ ] **Step 6: executar testes**

```bash
bun test src/test/server/documents/duplicate.test.ts
bun test src/test/server/documents
bun run typecheck
```

- [ ] **Step 7: commit**

```bash
git add src/lib/documents src/lib/services/documents-service.ts src/lib/server/firestore src/app/api/documents src/test/server/documents
git commit -m "refactor(documents): move operacoes reais para api server-side"
```

---

## Task 5: Adaptar UI ao schema novo e impedir “documento invisível” no dashboard

**Files:**
- Modify: `src/components/docfacil/views/dashboard-view.tsx`
- Modify: `src/components/docfacil/views/documento-detalhe-view.tsx`
- Modify: `src/components/docfacil/views/sucesso-view.tsx`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/documents/dto.ts`
- Create: `src/test/documents/dto.test.ts`

**Problem:** O backend novo grava `owner`, `createdAt`, `updatedAt`, `artifactState`; a UI antiga espera `userId`, `criadoEm`, `atualizadoEm`, `status`.

- [ ] **Step 1: criar adaptador explícito**

```ts
export function documentDetailDtoToUi(
  dto: DocumentDetailDto
): Documento {
  return {
    id: dto.id,
    modeloSlug: dto.modeloSlug,
    modeloNome: dto.modeloNome,
    respostas: dto.respostas,
    status: dto.status,
    userId: "",
    criadoEm: dto.criadoEm,
    atualizadoEm: dto.atualizadoEm,
  };
}
```

**Importante:** `userId: ""` é somente compatibilidade temporária do tipo UI; nenhum fluxo de autorização pode usar esse campo.

Melhor ainda, se o impacto for controlável, remover `userId` de `Documento` e migrar os consumidores. Preferir esta segunda opção.

- [ ] **Step 2: testes de adaptação**

```ts
test("ready vira concluido", () => {});
test("generating nao aparece como concluido", () => {});
test("timestamps server-side viram campos da UI", () => {});
```

Regra:

```ts
status =
  artifactState === "ready"
    ? "concluido"
    : "rascunho";
```

- [ ] **Step 3: dashboard deve carregar API nova**

Não executar:

```ts
where("userId", "==", user.uid)
```

em documentos novos.

- [ ] **Step 4: detalhe deve carregar `GET /api/documents/:id`**

O client só recebe DTO sanitizado; não recebe `objectKey`.

- [ ] **Step 5: testes + typecheck**

```bash
bun test src/test/documents/dto.test.ts
bun run typecheck
bun run lint
```

- [ ] **Step 6: commit**

```bash
git add src/lib/types.ts src/lib/documents/dto.ts src/components/docfacil/views src/test/documents/dto.test.ts
git commit -m "fix(documents): alinha ui ao schema server-side"
```

---

## Task 6: Tornar idempotência do client estável em retries

**Files:**
- Create: `src/lib/documents/idempotency.ts`
- Modify: `src/lib/documents/client.ts`
- Modify: `src/components/docfacil/views/criar-view.tsx`
- Modify: `src/lib/server/domain/orchestrator.ts`
- Create: `src/test/server/documents/idempotency.test.ts`

**Interface:**

```ts
export interface FinalizationIntent {
  requestId: string;
  modeloSlug: string;
  createdAt: number;
}

export function getOrCreateFinalizationRequestId(
  modeloSlug: string
): string;

export function clearFinalizationRequestId(
  modeloSlug: string
): void;
```

- [ ] **Step 1: teste de retry**

```ts
test("retry do mesmo submit reutiliza requestId", () => {
  const a = getOrCreateFinalizationRequestId("contrato-locacao");
  const b = getOrCreateFinalizationRequestId("contrato-locacao");

  expect(a).toBe(b);
});
```

- [ ] **Step 2: `finalizeDocument` deixa de inventar ID diferente a cada chamada**

Remover fallback:

```ts
"req_" + Date.now()
```

O caller fornece UUID estável:

```ts
const requestId = getOrCreateFinalizationRequestId(modelo.slug);

await finalizeDocument({
  requestId,
  modeloSlug: modelo.slug,
  respostas,
  clausulasSelecionadas,
});
```

- [ ] **Step 3: limpar somente depois de sucesso real**

```ts
clearFinalizationRequestId(modelo.slug);
```

Nunca limpar em timeout/network error.

- [ ] **Step 4: corrigir idempotência de regeneração**

Ao criar `generation_requests`, `targetVersion` precisa refletir a versão que realmente será criada. Não inicializar sempre com `1` para `pro_regeneration`.

Fluxo seguro:
1. carregar documento;
2. resolver `targetVersion`;
3. criar/consultar `generation_request` com esse valor;
4. seguir geração.

- [ ] **Step 5: testes**

```bash
bun test src/test/server/documents/idempotency.test.ts
```

Casos:
- retry completed retorna mesmo `documentId`;
- retry processing retorna `GENERATION_IN_PROGRESS`;
- regeneração v2 nunca responde como v1;
- requestId novo cria operação nova.

- [ ] **Step 6: commit**

```bash
git add src/lib/documents/idempotency.ts src/lib/documents/client.ts src/components/docfacil/views/criar-view.tsx src/lib/server/domain/orchestrator.ts src/test/server/documents/idempotency.test.ts
git commit -m "fix(documents): estabiliza idempotencia de finalizacao"
```

---

## Task 7: Fechar billing demo e remover qualquer prova client-side de pagamento

**Files:**
- Modify: `src/lib/services/checkout-service.ts`
- Modify: `src/components/docfacil/views/checkout-view.tsx`
- Modify: `src/app/api/checkout/demo/route.ts`
- Modify: `src/lib/server/billing/demo-provider.ts`
- Create: `src/test/server/billing/demo-provider.test.ts`

- [ ] **Step 1: teste fail-closed**

```ts
test("demo billing recusa production", async () => {});
test("checkout client nao fabrica orderId quando api falha", async () => {});
test("payment status nao usa query paid=1", async () => {});
```

- [ ] **Step 2: remover fallback local**

Eliminar:

```ts
const orderId = `df-${Date.now()}-${Math.random()...}`;
return { checkoutUrl, orderId, ... };
```

Quando `/api/checkout/demo` falhar:

```ts
throw new Error("Não foi possível criar o pedido.");
```

- [ ] **Step 3: remover `checkPaymentStatus()` baseado em URL**

Excluir lógica:

```ts
url.searchParams.get("paid") === "1"
```

Se algum consumidor ainda precisar de status:

```ts
GET /api/orders/:orderId
```

ou usar a resposta autoritativa do demo provider nesta branch.

- [ ] **Step 4: `autoPay` só existe em demo fora de produção**

O server já deve recusar production, e teste precisa provar isso.

- [ ] **Step 5: testes**

```bash
bun test src/test/server/billing/demo-provider.test.ts
bun run typecheck
```

- [ ] **Step 6: commit**

```bash
git add src/lib/services/checkout-service.ts src/components/docfacil/views/checkout-view.tsx src/app/api/checkout/demo/route.ts src/lib/server/billing/demo-provider.ts src/test/server/billing/demo-provider.test.ts
git commit -m "fix(billing): remove confirmacao de pagamento client-side"
```

---

## Task 8: Vincular order ao comprador e reservar pagamento atomicamente

**Files:**
- Create: `src/lib/server/billing/order-identity.ts`
- Modify: `src/lib/server/domain/documents.ts`
- Modify: `src/lib/server/billing/entitlement.ts`
- Modify: `src/lib/server/firestore/interfaces.ts`
- Modify: `src/lib/server/firestore/repositories.ts`
- Modify: `src/lib/server/domain/orchestrator.ts`
- Create: `src/test/server/billing/order-identity.test.ts`
- Create: `src/test/server/billing/order-reservation.test.ts`

**Interfaces:**

```ts
export function normalizeEmail(email: string): string;
export function normalizePhone(phone: string): string;

export function createBuyerFingerprint(input: {
  email?: string;
  phone?: string;
}): string;
```

Fingerprint:

```ts
sha256(
  JSON.stringify({
    email: normalizedEmail || null,
    phone: normalizedPhone || null,
  })
)
```

**Order status:**

```ts
type OrderStatus =
  | "pending"
  | "paid"
  | "reserved"
  | "consumed"
  | "failed"
  | "refunded";
```

Reserva:

```ts
reservePaidOrder(params: {
  orderId: string;
  requestId: string;
  principalKey: string;
}): Promise<OrderRecord>;
```

Finalização:

```ts
consumeReservedOrder(params: {
  orderId: string;
  requestId: string;
  documentId: string;
}): Promise<void>;
```

Liberação em falha:

```ts
releaseReservedOrder(params: {
  orderId: string;
  requestId: string;
}): Promise<void>;
```

- [ ] **Step 1: testes de identidade**

```ts
test("email é case insensitive", () => {});
test("telefone ignora mascara", () => {});
test("fingerprint nao contem email em texto", () => {});
test("guest nao usa order de outro contato", async () => {});
```

- [ ] **Step 2: testes de concorrência**

Simular duas requests:

```text
request A -> reserve -> success
request B -> reserve -> ORDER_ALREADY_RESERVED
```

- [ ] **Step 3: implementar reserva com Firestore transaction**

Dentro da transaction:

```ts
const order = await tx.get(orderRef);

if (order.status !== "paid") {
  throw ...
}

tx.update(orderRef, {
  status: "reserved",
  reservedByRequestId: requestId,
  reservedAt: Date.now(),
});
```

Retry do **mesmo** requestId deve ser idempotente.

- [ ] **Step 4: consumo só depois da persistência do artifact**

```text
PDF pronto
→ R2 pronto
→ artifact metadata pronto
→ currentVersion promovida
→ consumeReservedOrder()
```

- [ ] **Step 5: falha libera reserva**

Em catch:

```ts
await repos.orders.releaseReservedOrder({
  orderId,
  requestId,
});
```

Somente se a order ainda pertence àquela reservation.

- [ ] **Step 6: `generation_requests.principalKey` usa fingerprint**

Não fazer:

```ts
guest:${guestContact.email}
```

Fazer:

```ts
guest:${createBuyerFingerprint(guestContact)}
```

- [ ] **Step 7: testes**

```bash
bun test src/test/server/billing/order-identity.test.ts
bun test src/test/server/billing/order-reservation.test.ts
```

- [ ] **Step 8: commit**

```bash
git add src/lib/server/billing src/lib/server/domain src/lib/server/firestore src/test/server/billing
git commit -m "fix(billing): reserva compra avulsa de forma atomica"
```

---

## Task 9: Tornar R2 fail-closed e impedir persistência fantasma em memória

**Files:**
- Modify: `src/lib/server/env.ts`
- Modify: `src/lib/server/r2/storage.ts`
- Modify: `src/lib/server/errors.ts`
- Create: `src/test/server/r2/storage-config.test.ts`

**New env:**

```env
ALLOW_IN_MEMORY_ARTIFACT_STORAGE=false
```

Regra:
- `test`: memória permitida para dependências injetadas.
- `development`: memória somente com flag explícita.
- `production`: memória proibida.

- [ ] **Step 1: testes**

```ts
test("production sem credenciais R2 falha", () => {});
test("development sem flag nao cai silenciosamente em memoria", () => {});
test("development com flag explicita pode usar memoria", () => {});
test("credenciais completas criam R2ArtifactStorage", () => {});
```

- [ ] **Step 2: implementar fail-closed**

Pseudo-regra:

```ts
const hasAllR2Credentials =
  env.R2_ACCOUNT_ID &&
  env.R2_ACCESS_KEY_ID &&
  env.R2_SECRET_ACCESS_KEY &&
  env.R2_BUCKET_NAME;

if (hasAllR2Credentials) {
  return new R2ArtifactStorage(...);
}

if (
  env.NODE_ENV !== "production" &&
  env.ALLOW_IN_MEMORY_ARTIFACT_STORAGE
) {
  return new InMemoryArtifactStorage();
}

throw new BackendError(
  "SERVER_MISCONFIGURED",
  500,
  "Armazenamento de artefatos não configurado."
);
```

- [ ] **Step 3: garantir que segredo parcial também falha**

Exemplo inválido:

```text
R2_ACCOUNT_ID presente
R2_ACCESS_KEY_ID presente
R2_SECRET_ACCESS_KEY ausente
```

Não tratar como memory.

- [ ] **Step 4: testes**

```bash
bun test src/test/server/r2/storage-config.test.ts
```

- [ ] **Step 5: commit**

```bash
git add src/lib/server/env.ts src/lib/server/r2/storage.ts src/lib/server/errors.ts src/test/server/r2/storage-config.test.ts
git commit -m "fix(storage): torna configuracao r2 fail-closed"
```

---

## Task 10: Fazer delete e compensação R2 realmente consistentes

**Files:**
- Modify: `src/lib/server/r2/storage.ts`
- Modify: `src/lib/server/domain/orchestrator.ts`
- Modify: `src/app/api/documents/[id]/route.ts`
- Create: `src/test/server/r2/delete-consistency.test.ts`

**Rule:** Nenhum método de persistência crítica engole exception.

- [ ] **Step 1: testes de delete**

```ts
test("deleteArtifact propaga falha do provider", async () => {});
test("delete document nao remove firestore se r2 falhar", async () => {});
test("delete inexistente permanece idempotente", async () => {});
```

- [ ] **Step 2: remover catches silenciosos**

Não fazer:

```ts
catch {
  // Best effort
}
```

Fazer:

```ts
catch {
  throw new BackendError(
    "R2_DELETE_FAILED",
    500,
    "Não foi possível remover o artefato do armazenamento."
  );
}
```

- [ ] **Step 3: deletar pelas chaves persistidas**

No DELETE:
1. `listArtifacts(documentId)`;
2. para cada artifact, `deleteArtifact(artifact.objectKey)`;
3. somente depois `deleteDocumentAndArtifacts`.

Não depender de `ListObjectsV2` como única fonte de verdade.

- [ ] **Step 4: compensar upload órfão durante geração**

No orchestrator:

```ts
let uploadedObjectKey: string | null = null;

try {
  const putResult = await storage.putArtifact(...);
  uploadedObjectKey = putResult.objectKey;

  await repos.documents.saveArtifact(...);
  ...
} catch (err) {
  if (uploadedObjectKey) {
    await storage.deleteArtifact(uploadedObjectKey).catch(() => {});
  }
  ...
  throw err;
}
```

Para a compensação, o erro original continua sendo o principal. Registrar falha de cleanup sem expor PII.

- [ ] **Step 5: testes**

```bash
bun test src/test/server/r2/delete-consistency.test.ts
```

- [ ] **Step 6: commit**

```bash
git add src/lib/server/r2/storage.ts src/lib/server/domain/orchestrator.ts src/app/api/documents/[id]/route.ts src/test/server/r2/delete-consistency.test.ts
git commit -m "fix(storage): garante consistencia entre r2 e firestore"
```

---

## Task 11: Integrar o guest flow inteiro, do draft ao magic link

**Files:**
- Modify: `src/lib/documents/client.ts`
- Modify: `src/components/docfacil/views/criar-view.tsx`
- Modify: `src/components/docfacil/payment-barrier.tsx`
- Modify: `src/components/docfacil/views/checkout-view.tsx`
- Modify: `src/components/docfacil/views/sucesso-view.tsx`
- Modify: `src/app/api/documents/finalize/route.ts`
- Modify: `src/lib/server/domain/documents.ts`
- Create: `src/test/server/documents/guest-flow.test.ts`

**Draft shape:**

```ts
export interface GuestDraftData {
  requestId: string;
  modeloSlug: string;
  answers: Record<string, string>;
  stepIndex: number;
  clausulasSelecionadas: string[];
  extrasPorClausula: Record<string, Record<string, string>>;
  updatedAt: number;
}
```

- [ ] **Step 1: tornar contato obrigatório para guest no domínio**

O schema pode manter `guestContact` opcional em chamadas autenticadas, mas após resolver principal:

```ts
if (
  principal.type === "guest" &&
  !guestContact?.email &&
  !guestContact?.phone
) {
  throw new BackendError(
    "INVALID_REQUEST",
    400,
    "Informe e-mail ou WhatsApp para continuar."
  );
}
```

- [ ] **Step 2: `CriarView` salva draft completo com requestId**

Guest termina formulário:

```ts
saveGuestDraft(slug, {
  requestId,
  modeloSlug: slug,
  answers,
  stepIndex,
  clausulasSelecionadas,
  extrasPorClausula,
});
```

Nenhum documento Firestore é criado aqui.

- [ ] **Step 3: checkout retorna `orderId` autoritativo**

Depois de pedido demo realmente pago:

```ts
navigate("sucesso", {
  slug,
  orderId: result.orderId,
});
```

Não adicionar `paid=1`.

- [ ] **Step 4: `SucessoView` detecta guest + orderId + draft**

Fluxo:

```ts
const draft = loadGuestDraft(slug);

const result = await finalizeDocument({
  requestId: draft.requestId,
  modeloSlug: slug,
  respostas: respostasFinais,
  clausulasSelecionadas: draft.clausulasSelecionadas,
  guestContact: { email: checkoutEmail },
  orderId,
});
```

O contato usado na geração deve corresponder ao comprador da order.

- [ ] **Step 5: navegar para magic link**

Após sucesso:

```ts
window.location.assign(result.document.guestAccessPath!);
```

Não deixar o guest dependente da tela interna `sucesso` para recuperar o PDF.

- [ ] **Step 6: limpar draft somente depois da geração pronta**

```ts
clearGuestDraft(slug);
```

Se geração falhar, manter draft + requestId.

- [ ] **Step 7: teste E2E de domínio**

Cobrir:

```text
guest draft
→ create order
→ paid
→ reserve
→ finalize
→ artifact ready
→ order consumed
→ access_link criado
→ /d/token disponível
```

E negativos:

```text
guest sem contato -> 400
guest sem order -> 402
guest order pending -> 402
guest usa order de outro contato -> 403/409
mesmo requestId retry -> mesmo documento
```

- [ ] **Step 8: commit**

```bash
git add src/lib/documents/client.ts src/components/docfacil src/app/api/documents/finalize/route.ts src/lib/server/domain src/test/server/documents/guest-flow.test.ts
git commit -m "fix(guest): conecta checkout geracao e magic link"
```

---

## Task 12: Integrar compartilhamento revogável na UI real

**Files:**
- Modify: `src/components/docfacil/views/sucesso-view.tsx`
- Modify: `src/components/docfacil/views/documento/use-documento-actions.ts`
- Modify: `src/lib/documents/client.ts`
- Modify: `src/app/api/documents/[id]/share/route.ts`
- Modify: `src/app/api/documents/[id]/share/revoke/route.ts`

**Rule:** Para documento autenticado real, “copiar link”, WhatsApp e e-mail devem compartilhar `/d/<token>`, não a URL da SPA.

- [ ] **Step 1: centralizar criação do share URL**

```ts
async function ensureShareUrl(documentId: string): Promise<string> {
  const { shareUrl } = await shareDocument(documentId);
  return `${window.location.origin}${shareUrl}`;
}
```

- [ ] **Step 2: botão copiar**

Substituir:

```ts
navigator.clipboard.writeText(window.location.href)
```

por:

```ts
const url = await ensureShareUrl(docId);
await navigator.clipboard.writeText(url);
```

- [ ] **Step 3: WhatsApp**

```ts
const url = await ensureShareUrl(docId);
const text = encodeURIComponent(
  `Seu documento DocFacil está disponível aqui: ${url}`
);
window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
```

- [ ] **Step 4: e-mail**

```ts
const url = await ensureShareUrl(docId);
const subject = encodeURIComponent("Documento compartilhado pelo DocFacil");
const body = encodeURIComponent(
  `Acesse o documento pelo link seguro:\n${url}`
);
window.location.href = `mailto:?subject=${subject}&body=${body}`;
```

- [ ] **Step 5: revogação**

Após revogar:
- limpar URL local;
- um novo share deve gerar token diferente;
- URL antiga precisa deixar de funcionar.

- [ ] **Step 6: commit**

```bash
git add src/components/docfacil/views/sucesso-view.tsx src/components/docfacil/views/documento/use-documento-actions.ts src/lib/documents/client.ts src/app/api/documents/[id]/share
git commit -m "fix(sharing): usa magic links revogaveis na interface"
```

---

## Task 13: Aplicar headers de privacidade reais em `/d/*`

**Files:**
- Modify: `next.config.ts`
- Modify: `src/app/d/[token]/page.tsx`
- Create: `src/test/server/security/shared-document-headers.test.ts`

- [ ] **Step 1: configurar headers**

Adicionar:

```ts
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdfmake", "firebase-admin"],
  reactStrictMode: false,
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
  },
};
```

- [ ] **Step 2: manter metadata defensiva na página**

Continuar com:

```ts
robots: {
  index: false,
  follow: false,
  nocache: true,
  noarchive: true,
},
referrer: "no-referrer",
```

- [ ] **Step 3: remover import não usado**

`CheckCircle2` está importado na página atual sem necessidade. Limpar durante esta tarefa.

- [ ] **Step 4: teste**

No mínimo testar `next.config.ts` como unidade ou validar em preview:

```bash
curl -I https://<preview>/d/token-invalido
```

Esperado:

```text
cache-control: private, no-store, max-age=0
referrer-policy: no-referrer
x-robots-tag: noindex, nofollow, noarchive
```

- [ ] **Step 5: commit**

```bash
git add next.config.ts src/app/d/[token]/page.tsx src/test/server/security/shared-document-headers.test.ts
git commit -m "fix(security): protege magic links contra cache e indexacao"
```

---

## Task 14: Validar configuração de produção antes de servir requests críticos

**Files:**
- Create: `src/lib/server/config/assert-production-config.ts`
- Modify: `src/lib/server/env.ts`
- Modify: `src/lib/server/security.ts`
- Modify: `.env.example`
- Create: `src/test/server/config/production-config.test.ts`

**Required in production:**

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
APP_CHECK_ENFORCED=true
```

- [ ] **Step 1: teste de config incompleta**

```ts
test("production rejeita firebase admin incompleto", () => {});
test("production rejeita r2 incompleto", () => {});
test("production rejeita app check desabilitado", () => {});
test("development aceita config parcial para frontend demo", () => {});
```

- [ ] **Step 2: implementar assertion**

```ts
export function assertProductionServerConfig(
  env: ServerEnv
): void {
  if (env.NODE_ENV !== "production") return;

  const required = [
    env.FIREBASE_PROJECT_ID,
    env.FIREBASE_CLIENT_EMAIL,
    env.FIREBASE_PRIVATE_KEY,
    env.R2_ACCOUNT_ID,
    env.R2_ACCESS_KEY_ID,
    env.R2_SECRET_ACCESS_KEY,
    env.R2_BUCKET_NAME,
  ];

  if (required.some((value) => !value)) {
    throw new Error(
      "DocFacil backend production configuration is incomplete."
    );
  }

  if (!env.APP_CHECK_ENFORCED) {
    throw new Error(
      "APP_CHECK_ENFORCED must be true in production."
    );
  }
}
```

- [ ] **Step 3: aplicar em factories server-side críticas**

Antes de criar Admin/R2 ou processar geração:

```ts
assertProductionServerConfig(getServerEnv());
```

Não executar essa assertion no bundle client.

- [ ] **Step 4: documentar `.env.example`**

Separar visualmente:

```env
# Client-safe Firebase Web SDK
NEXT_PUBLIC_FIREBASE_...

# Server-only Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Server-only Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=docfacil-pdfs

# Security
APP_CHECK_ENFORCED=false
ALLOW_DEMO_BILLING=false
ALLOW_IN_MEMORY_ARTIFACT_STORAGE=false
```

- [ ] **Step 5: commit**

```bash
git add src/lib/server/config src/lib/server/env.ts src/lib/server/security.ts .env.example src/test/server/config
git commit -m "fix(config): valida backend obrigatorio em producao"
```

---

## Task 15: Reduzir caminhos legados que podem burlar a arquitetura nova

**Files:**
- Modify: `src/components/docfacil/views/sucesso-view.tsx`
- Modify: `src/components/docfacil/views/documento/use-documento-actions.ts`
- Modify: `src/lib/services/plan-service.ts`
- Modify: `src/lib/pdf/generator.ts`

**Goal:** Geração client-side continua somente para demos locais claramente identificados.

- [ ] **Step 1: não preloadar pdfmake para documento real**

Hoje `SucessoView` pode preloadar browser pdfmake mesmo quando download real virá do R2.

Fazer:

```ts
if (!docId || docId.startsWith("demo-")) {
  preloadPdfmake().catch(() => {});
}
```

- [ ] **Step 2: watermark client-side somente em demo**

Produção real:

```text
backend entitlement
→ artifact.watermarked
```

Nunca:

```text
AuthContext user.plano
→ decisão autoritativa de watermark
```

O `shouldWatermark(user)` pode continuar existindo apenas para showcase/demo local.

- [ ] **Step 3: adicionar comentário de boundary**

No generator browser:

```ts
/**
 * Demo/local preview only.
 * Artefatos reais são gerados por src/lib/pdf/server/generator.ts.
 */
```

- [ ] **Step 4: teste estrutural**

Garantir que rotas reais de download não importem `gerarEBaixarPDF`.

- [ ] **Step 5: commit**

```bash
git add src/components/docfacil/views/sucesso-view.tsx src/components/docfacil/views/documento/use-documento-actions.ts src/lib/services/plan-service.ts src/lib/pdf/generator.ts
git commit -m "refactor(pdf): limita geracao client-side ao modo demo"
```

---

## Task 16: Teste de contrato das rotas críticas

**Files:**
- Create: `src/test/server/routes/documents-finalize.test.ts`
- Create: `src/test/server/routes/documents-download.test.ts`
- Create: `src/test/server/routes/documents-delete.test.ts`
- Create: `src/test/server/routes/documents-share.test.ts`

**Matrix mínima:**

### Finalize

```text
sem App Check em produção -> 401/403
token Firebase inválido -> 401
body inválido -> 400
modelo inválido -> 400
free dentro do limite -> ready + watermark
free acima do limite -> 402
pro -> ready clean
guest sem order -> 402
guest order pending -> 402
guest order alheia -> bloqueado
retry -> mesmo resultado
```

### Download

```text
não-owner -> 403
documento inexistente -> 404
artifact inexistente -> 404
owner -> signed URL 300s
objectKey nunca aparece na resposta
```

### Delete

```text
não-owner -> 403
R2 falha -> 500 e Firestore permanece
R2 ok -> Firestore removido
repetição segura -> resposta consistente
```

### Share

```text
não-owner -> 403
sem artifact -> 404
share -> token
novo share -> token antigo revogado
share version pinning -> versão permanece fixa
```

- [ ] **Step 1: escrever matriz como testes**

Não mockar authorization de forma que bypassa o comportamento a ser testado. Injetar repositories/storage onde necessário.

- [ ] **Step 2: executar somente rotas**

```bash
bun test src/test/server/routes
```

- [ ] **Step 3: commit**

```bash
git add src/test/server/routes
git commit -m "test(api): cobre contratos criticos do backend"
```

---

## Task 17: Quality gate local completo

**Files:** nenhum código novo por padrão.

- [ ] **Step 1: testes unitários**

```bash
bun run test
```

Esperado:

```text
0 fail
```

- [ ] **Step 2: Firestore Rules**

```bash
bun run test:rules
```

Esperado:

```text
0 fail
```

- [ ] **Step 3: lint**

```bash
bun run lint
```

Aceitar warnings preexistentes somente se já existiam em `main`. Nenhum erro novo.

- [ ] **Step 4: TypeScript**

```bash
bun run typecheck
```

Esperado:

```text
exit 0
```

- [ ] **Step 5: build**

```bash
bun run build:ci
```

Esperado:

```text
exit 0
```

- [ ] **Step 6: diff hygiene**

```bash
git diff --check origin/main...HEAD
git status
```

Esperado:

```text
working tree clean
```

- [ ] **Step 7: procurar regressões proibidas**

```bash
git grep -n "paid=1" -- src || true
git grep -n "addDoc\\|updateDoc\\|deleteDoc" -- src/lib/services/documents-service.ts || true
git grep -n "guest:" -- src/lib/server/domain src/lib/server/billing || true
git grep -n "1990" -- src || true
```

Esperado:
- nenhum `paid=1`;
- nenhum writer Firestore em documents-service real;
- nenhum e-mail/telefone concatenado em `principalKey`;
- nenhum `1990` representando preço avulso.

---

## Task 18: Teste manual no Preview da Vercel

**Files:** nenhum.

Usar Preview Deployment da própria branch.

### Cenário A — usuário grátis

- [ ] cadastrar/login real;
- [ ] confirmar que perfil nasce `gratis`;
- [ ] gerar documento;
- [ ] confirmar artifact `ready`;
- [ ] baixar signed URL;
- [ ] confirmar watermark;
- [ ] dashboard mostra o novo documento;
- [ ] recarregar página e confirmar persistência;
- [ ] excluir e confirmar que download antigo não funciona.

### Cenário B — Pro simulado server-side

- [ ] usar perfil de teste Pro configurado diretamente no backend/Firestore Admin;
- [ ] gerar PDF clean;
- [ ] editar e gerar v2;
- [ ] confirmar v1 ainda existe;
- [ ] confirmar dashboard aponta para currentVersion v2.

### Cenário C — guest avulso demo

- [ ] abrir anônimo;
- [ ] preencher documento;
- [ ] chegar ao paywall;
- [ ] informar contato;
- [ ] pagar via demo backend;
- [ ] confirmar geração;
- [ ] ser redirecionado para `/d/<token>`;
- [ ] baixar PDF;
- [ ] recarregar `/d/<token>` e confirmar acesso;
- [ ] confirmar que nenhuma conta Firebase foi criada.

### Cenário D — share autenticado

- [ ] gerar share;
- [ ] abrir em navegador anônimo;
- [ ] baixar;
- [ ] revogar;
- [ ] confirmar token antigo inválido;
- [ ] gerar token novo e confirmar funcionamento.

### Cenário E — falhas

- [ ] remover temporariamente uma credencial R2 do Preview de teste;
- [ ] confirmar erro explícito;
- [ ] confirmar que nenhum documento aparece como `ready`;
- [ ] restaurar env;
- [ ] repetir request com mesmo requestId e confirmar comportamento previsível.

---

## Task 19: Validar headers, runtime e observabilidade

**Files:**
- Modify only if tests reveal gaps: `next.config.ts`, logger/server errors.

- [ ] **Step 1: headers `/d`**

```bash
curl -I https://PREVIEW.vercel.app/d/token-invalido
```

Obrigatório:

```text
Cache-Control: private, no-store, max-age=0
Referrer-Policy: no-referrer
X-Robots-Tag: noindex, nofollow, noarchive
```

- [ ] **Step 2: conferir runtime Node**

Rotas de:
- finalize;
- download;
- delete;
- versions;

devem declarar:

```ts
export const runtime = "nodejs";
```

- [ ] **Step 3: logs não podem conter**

```text
Authorization
Firebase ID Token
App Check token
R2 signed URL completa
respostas do documento
CPF/RG/endereço
guest e-mail/telefone em generation_request logs
R2 secret
Firebase private key
```

- [ ] **Step 4: erros devem usar códigos sanitizados**

Exemplos permitidos:

```text
INVALID_REQUEST
PAYMENT_REQUIRED
ORDER_NOT_PAID
ORDER_ALREADY_RESERVED
DOCUMENT_FORBIDDEN
R2_UPLOAD_FAILED
R2_DELETE_FAILED
SERVER_MISCONFIGURED
GENERATION_FAILED
```

---

## Task 20: CI remota e Pull Request final

**Files:** somente ajustes que a CI exigir.

- [ ] **Step 1: push normal**

```bash
git push origin feat/backend-documentos-r2
```

- [ ] **Step 2: confirmar GitHub Actions**

Obrigatório:

```text
Testes unitários ........ PASS
Firestore Rules ......... PASS
ESLint .................. PASS
TypeScript .............. PASS
Next.js Build ........... PASS
Vercel Preview .......... READY
```

- [ ] **Step 3: abrir PR para `main`**

Título recomendado:

```text
feat(backend): protege geração de documentos com Firebase Admin e R2
```

- [ ] **Step 4: descrição do PR deve separar**

```markdown
## Problema
## Arquitetura
## Segurança
## Fluxo guest
## Fluxo autenticado
## Cloudflare R2
## Billing demo
## Testes
## Como validar
## Fora de escopo
## Rollback
```

- [ ] **Step 5: não afirmar números de testes manualmente sem copiar o resultado atual da CI**

Não escrever:

```text
76 testes passando
```

se a CI atual não comprovar exatamente isso.

- [ ] **Step 6: revisar diff inteiro antes de merge**

```bash
git diff --stat origin/main...HEAD
git log --oneline origin/main..HEAD
```

- [ ] **Step 7: squash merge somente com todos os checks verdes**

Commit de merge sugerido:

```text
feat(backend): protege documentos com Firebase Admin e R2
```

---

# 5. Critérios objetivos de “pronto para merge”

A branch só está pronta quando **todos** os itens abaixo forem verdadeiros:

| Gate | Obrigatório |
|---|---:|
| Perfil Firebase real cria com `plano: gratis` | ✅ |
| Cliente não escreve `documents` via Firestore Web SDK | ✅ |
| Dashboard enxerga documentos do schema novo | ✅ |
| Duplicate não faz client write | ✅ |
| Guest draft não cria documento antes de entitlement | ✅ |
| Guest pago gera artifact R2 + magic link | ✅ |
| Nenhum `?paid=1` | ✅ |
| Nenhum orderId inventado no browser | ✅ |
| Avulso = R$ 9,90 / 990 centavos em todas as camadas | ✅ |
| Order tem buyer binding | ✅ |
| Order é reservada atomicamente | ✅ |
| Retry do mesmo request é idempotente | ✅ |
| `principalKey` guest não contém PII | ✅ |
| R2 production é fail-closed | ✅ |
| Delete R2 não engole erro | ✅ |
| Falha pós-upload executa compensação | ✅ |
| Signed URL = 300s | ✅ |
| Share autenticado usa token revogável | ✅ |
| Share fixa versão | ✅ |
| `/d/*` no-store + noindex + no-referrer | ✅ |
| Rules test existe e roda | ✅ |
| `bun run test` verde | ✅ |
| `bun run test:rules` verde | ✅ |
| `bun run lint` sem erros | ✅ |
| `bun run typecheck` verde | ✅ |
| `bun run build:ci` verde | ✅ |
| Vercel Preview READY | ✅ |
| Teste manual guest/free/pro/share concluído | ✅ |

---

# 6. Não fazer nesta rodada

Para evitar uma branch “buraco negro” de escopo, **não incluir**:

- Stripe/Kirvano/PerfectPay reais;
- webhook real;
- reembolso automático;
- e-mail transacional;
- WhatsApp API;
- upload de anexos pelo usuário;
- assinatura eletrônica;
- Firebase Cloud Functions;
- Cloudflare Workers;
- fila externa;
- cron de limpeza;
- migração completa de Prisma;
- remoção de SQLite;
- redesign do DocFacil;
- IA geradora de novos templates;
- painel administrativo.

Esses itens podem nascer em planos próprios depois que esta fundação estiver estável.

---

# 7. Estratégia de commits

Sequência recomendada:

```text
test(backend): fixa baseline das firestore rules
fix(billing): alinha planos e preco avulso
fix(security): restringe campos editaveis do perfil
refactor(documents): move operacoes reais para api server-side
fix(documents): alinha ui ao schema server-side
fix(documents): estabiliza idempotencia de finalizacao
fix(billing): remove confirmacao de pagamento client-side
fix(billing): reserva compra avulsa de forma atomica
fix(storage): torna configuracao r2 fail-closed
fix(storage): garante consistencia entre r2 e firestore
fix(guest): conecta checkout geracao e magic link
fix(sharing): usa magic links revogaveis na interface
fix(security): protege magic links contra cache e indexacao
fix(config): valida backend obrigatorio em producao
refactor(pdf): limita geracao client-side ao modo demo
test(api): cobre contratos criticos do backend
```

Não fazer um único commit “fix everything”.

---

# 8. Resultado esperado

Ao final desta rodada, o DocFacil deve ter uma propriedade simples de explicar:

> **O browser coleta dados e apresenta a experiência. O servidor decide identidade, autorização, entitlement, geração, versionamento e armazenamento. O Firestore guarda verdade estruturada. O R2 guarda PDFs privados. Nenhuma camada client-side consegue se autopromover, inventar pagamento ou persistir um documento real por fora das regras do backend.**

Isso fecha a diferença entre “backend novo existe” e “produto inteiro realmente usa esse backend”.

---

# 9. Handoff para o agente

Executar este plano **task por task**, sem pular os testes vermelhos iniciais.

Preferência:

1. `superpowers:subagent-driven-development` para uma unidade por vez com revisão;
2. `superpowers:executing-plans` se for executar em uma sessão contínua.

Antes de declarar uma Task concluída, anexar:

```text
arquivos alterados
teste que falhava antes
teste passando depois
comando executado
resultado
commit SHA
```

Antes de declarar o plano concluído, anexar:

```text
bun run test
bun run test:rules
bun run lint
bun run typecheck
bun run build:ci
git diff --check origin/main...HEAD
status GitHub Actions
status Vercel Preview
```

Nenhuma afirmação de “100% concluído”, “X testes passando” ou “pronto para merge” deve ser feita sem a evidência correspondente do estado atual da branch.
