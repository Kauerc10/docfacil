# Document Access, Billing e Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a política de acesso comercial, billing demo, rascunhos autenticados, edição real e download direto da biblioteca do DocFácil.

**Architecture:** Uma política comercial compartilhada define quota e modelos grátis; o servidor continua autoritativo. Draft autenticado vira recurso próprio com ownership e CRUD server-side. Dashboard e detalhe reutilizam ações reais de documento, e o checkout demo simula tanto avulso quanto Pro.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase Auth/Firestore, pdfmake, Bun, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-19-document-access-billing-lifecycle-design.md`

## Global Constraints

- Documento avulso: R$ 19,90.
- Plano Pro: R$ 39,90/mês.
- Gratuito: 1 geração/mês, somente `declaracao-residencia`, `comodato`, `contrato-locacao-comercial`.
- Geração gratuita exige conta.
- Avulso não exige conta.
- O backend é autoritativo para quota, plano, pagamento e ownership.
- Nenhuma regra comercial entra em `src/lib/modelos.ts` ou nas regras jurídicas.
- Visitante continua usando draft local durante compra avulsa.
- Conta autenticada usa draft persistente no servidor.
- PR #20 permanece draft até os gates finais.

---

### Task 1: Política comercial e preços

**Files:**
- Create: `src/lib/document-access-policy.ts`
- Modify: `src/lib/pricing.ts`
- Modify: `src/lib/server/billing/entitlement.ts`
- Modify: callers de `resolveEntitlement`
- Test: `src/test/document-access-policy.test.ts`
- Test: `src/lib/server/billing/entitlement.test.ts`

**Interfaces:**
- Produces: `FREE_MONTHLY_LIMIT`, `MONTHLY_FREE_MODEL_SLUGS`, `isMonthlyFreeModel(slug)`.
- `resolveEntitlement` passa a consumir `modeloSlug`.

- [ ] **Step 1: Write failing policy tests**

```ts
expect(FREE_MONTHLY_LIMIT).toBe(1);
expect(isMonthlyFreeModel("declaracao-residencia")).toBe(true);
expect(isMonthlyFreeModel("comodato")).toBe(true);
expect(isMonthlyFreeModel("contrato-locacao-comercial")).toBe(true);
expect(isMonthlyFreeModel("contrato-locacao")).toBe(false);
expect(PLAN_PRICES.avulso).toBe(19.9);
expect(PLAN_PRICES.pro).toBe(39.9);
```

- [ ] **Step 2: Write failing entitlement tests**

Cover:

```ts
user gratis + eligible + count 0 -> free
user gratis + eligible + count 1 -> FREE_LIMIT_REACHED
user gratis + non-eligible -> FREE_MODEL_NOT_ELIGIBLE
pro + any slug -> pro
guest without order -> PAYMENT_REQUIRED
paid order + any slug -> single_purchase
```

- [ ] **Step 3: Run tests and observe RED**

Run:

```bash
bun test src/test/document-access-policy.test.ts src/lib/server/billing/entitlement.test.ts
```

Expected: failures for old limit/prices and missing eligibility behavior.

- [ ] **Step 4: Implement shared policy and entitlement**

`src/lib/document-access-policy.ts`:

```ts
export const FREE_MONTHLY_LIMIT = 1;
export const MONTHLY_FREE_MODEL_SLUGS = [
  "declaracao-residencia",
  "comodato",
  "contrato-locacao-comercial",
] as const;

const FREE_MODEL_SET = new Set<string>(MONTHLY_FREE_MODEL_SLUGS);

export function isMonthlyFreeModel(slug: string): boolean {
  return FREE_MODEL_SET.has(slug);
}
```

Update pricing values and remove competing free-limit constants.

- [ ] **Step 5: Run tests GREEN and commit**

```bash
bun test src/test/document-access-policy.test.ts src/lib/server/billing/entitlement.test.ts
git commit -m "feat: centraliza politica de acesso aos documentos"
```

---

### Task 2: Checkout demo avulso + Pro real no ambiente demo

**Files:**
- Modify: `src/app/api/checkout/demo/route.ts`
- Modify: `src/lib/server/domain/documents.ts`
- Modify: `src/lib/server/firestore/interfaces.ts`
- Modify: repositories de order/user profile
- Modify: `src/lib/services/checkout-service.ts`
- Modify: `src/lib/auth-context.tsx`
- Modify: `src/components/docfacil/views/checkout-view.tsx`
- Test: route/service/domain tests existentes + novo teste focado em demo Pro

**Interfaces:**
- Demo checkout request: `{ product: "avulso" | "pro", guestContact?, autoPay? }`.
- `AuthState.refreshProfile(): Promise<void>`.

- [ ] **Step 1: Write RED tests**

Assert:

```ts
avulso -> amount 1990, order.product === "avulso"
pro -> requires authenticated principal
pro -> amount 3990, order.product === "pro"
pro paid -> user profile plano === "pro"
```

- [ ] **Step 2: Run RED**

```bash
bun test src/lib/server/billing src/app/api/checkout
```

Expected: demo route still hardcodes avulso.

- [ ] **Step 3: Expand order product type and demo route**

`OrderRecord.product` becomes:

```ts
product: "avulso" | "pro";
```

For Pro, authenticated principal is mandatory and profile update is server-side after simulated paid order.

- [ ] **Step 4: Add profile refresh to auth client**

Expose:

```ts
refreshProfile(): Promise<void>
```

Checkout calls it after demo Pro succeeds.

- [ ] **Step 5: GREEN and commit**

```bash
bun test src/lib/server/billing src/app/api/checkout
bun run typecheck
git commit -m "feat: simula ativacao pro no checkout demo"
```

---

### Task 3: Draft autenticado persistente

**Files:**
- Create: `src/lib/server/domain/drafts.ts`
- Extend: `src/lib/server/firestore/interfaces.ts`
- Modify: `src/lib/server/firestore/repositories.ts`
- Modify: `src/lib/server/firestore/in-memory-repositories.ts`
- Create routes: `src/app/api/drafts/route.ts`, `src/app/api/drafts/[id]/route.ts`
- Modify: `firestore.rules` if direct client reads are not used only to document deny policy
- Modify: `src/lib/documents/client.ts`
- Modify: `src/components/docfacil/views/criar-view.tsx`
- Test: domain/repository/API tests

**Interfaces:**

```ts
interface AccountDraft {
  id: string;
  ownerUserId: string;
  modeloSlug: string;
  respostas: Record<string, string>;
  stepIndex: number;
  clausulasSelecionadas: string[];
  extrasPorClausula: Record<string, Record<string, string>>;
  createdAt: number;
  updatedAt: number;
}
```

Client functions:

```ts
saveAccountDraft(input): Promise<AccountDraft>
getAccountDraft(id): Promise<AccountDraft | null>
listAccountDrafts(): Promise<AccountDraft[]>
deleteAccountDraft(id): Promise<void>
```

- [ ] **Step 1: RED ownership + CRUD tests**

Cover save/list/get/update/delete and forbidden cross-user access.

- [ ] **Step 2: Run RED**

```bash
bun test src/lib/server/domain/drafts src/lib/server/firestore
```

- [ ] **Step 3: Implement repository + API**

All routes use resolved authenticated principal. Guest receives 401/403 and continues using localStorage client flow.

- [ ] **Step 4: Wire CriarView**

Authenticated `Salvar como rascunho` uses server draft; if current nav contains `draftId`, update same draft. Guest continues `saveGuestDraft`.

- [ ] **Step 5: GREEN and commit**

```bash
bun test
bun run firestore:rules:test
git commit -m "feat: salva rascunhos da conta no servidor"
```

---

### Task 4: Biblioteca unificada, edição e novas versões

**Files:**
- Modify: `src/components/docfacil/views/dashboard-view.tsx`
- Modify: `src/components/docfacil/views/criar-view.tsx`
- Modify: `src/components/docfacil/views/documento/use-documento-actions.ts`
- Modify: `src/lib/services/documents-service.ts`
- Modify DTOs if needed
- Test: focused UI/contract tests + E2E

**Interfaces:**

```ts
type LibraryItem =
  | { kind: "document"; document: Documento }
  | { kind: "draft"; draft: AccountDraft };
```

- [ ] **Step 1: RED tests for edit hydration**

Assert document ID loads detail and hydrates answers/clause state instead of empty defaults. Draft ID restores `stepIndex` and extras.

- [ ] **Step 2: RED test for dashboard navigation**

Document edit must navigate with `{ slug, id }`; draft resume with `{ slug, draftId }`.

- [ ] **Step 3: Implement hydration modes**

Priority:

```text
document id > draft id > local guest draft > empty form
```

Pro document edit finalization calls `createDocumentVersion(documentId, ...)`; draft finalization creates normal document then deletes draft.

- [ ] **Step 4: GREEN and commit**

```bash
bun test
bun run typecheck
git commit -m "feat: retoma rascunhos e edita documentos salvos"
```

---

### Task 5: Download real no dashboard

**Files:**
- Create or extract shared helper/hook under `src/components/docfacil/views/documento/`
- Modify: `src/components/docfacil/views/dashboard-view.tsx`
- Modify: `src/components/docfacil/views/documento/use-documento-actions.ts`
- Test: focused action tests

**Interfaces:**

Shared action performs:

```ts
const { downloadUrl } = await getDocumentDownloadUrl(documentId);
window.location.href = downloadUrl;
```

- [ ] **Step 1: RED test**

Clicking dashboard download calls real download API. Draft card exposes no download action.

- [ ] **Step 2: Implement shared download**

Use loading per document and real error toast.

- [ ] **Step 3: GREEN and commit**

```bash
bun test
bun run typecheck
git commit -m "fix: baixa documentos direto pela biblioteca"
```

---

### Task 6: Catálogo, paywall e copy comercial

**Files:**
- Modify: `src/components/docfacil/views/modelos-view.tsx`
- Modify: `src/components/docfacil/views/planos-view.tsx`
- Modify: `src/components/docfacil/views/criar/free-limit-paywall.tsx`
- Modify: checkout/profile/help/legal copies that cite old price/limit where product-facing
- Test: copy/contract tests

- [ ] **Step 1: RED tests**

Assert only three selected slugs show free badge, page contains `1 geração`, requires account, and prices are centralized.

- [ ] **Step 2: Generalize paywall reason**

```ts
type AccessPaywallReason = "monthly_limit" | "model_not_free";
```

Headline/copy changes by reason; actions stay identical.

- [ ] **Step 3: Update product copy**

Remove claims of 3 free docs/no account. Add “Os modelos gratuitos podem mudar a cada mês.”

- [ ] **Step 4: GREEN and commit**

```bash
bun test
bun run lint
bun run typecheck
git commit -m "feat: alinha catalogo e planos a nova politica"
```

---

### Task 7: E2E e gate final

**Files:**
- Modify/add: `e2e/*.spec.ts`
- Update PR #20 body/comment with final evidence

- [ ] **Step 1: Add E2E coverage**

Required flows:

```text
account free + eligible -> one free generation
second eligible -> paywall
account free + non-eligible -> paywall without consuming free quota
save authenticated draft -> dashboard -> resume with answers
Pro demo checkout -> profile Pro -> unlimited generation
avulso guest -> checkout -> document success
document dashboard -> edit prefilled -> Pro new version
document dashboard -> direct download
```

- [ ] **Step 2: Run full local/CI-equivalent gates**

```bash
bun test
bun run firestore:rules:test
bun run firestore:commit:test
bun run lint
bun run typecheck
bun run build:ci
bun run test:e2e
```

Expected: all green.

- [ ] **Step 3: Push final commit and verify GitHub Actions**

Confirm the workflow is running against the exact branch head and both main + Guest E2E jobs complete successfully.

- [ ] **Step 4: Verify Vercel if deployment quota allows**

If Vercel is blocked by account build-rate limit, report it as external and do not claim preview validation.

- [ ] **Step 5: Update PR #20**

Record new policy, billing demo, drafts, edit/download fixes, TDD RED/GREEN evidence, final CI SHA and any remaining visual/manual QA.
