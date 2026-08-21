# Prévia fiel ao PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a simulação CSS da criação por PDF nativo efêmero do mesmo renderer final.

**Architecture:** Uma route autenticada valida e gera sem escrever; um cliente de preview controla debounce, cancelamento e Blob URL; a tela apenas apresenta o resultado em `iframe`. A regra visual de marca d'água é extraída como função pura compartilhada com a finalização.

**Tech Stack:** Next.js App Router, Firebase Auth/App Check, TypeScript, pdfmake, React, Bun tests.

**Spec:** `docs/superpowers/specs/2026-08-20-pdf-preview-fidelity-design.md`

## Global Constraints

- Não persistir conteúdo de prévia nem aceitar PII por URL.
- Guest não chama a route de preview fiel; o formulário continua utilizável.
- Não alterar billing, reserva de quota, order, rascunho, versionamento ou download.
- Nenhum código de produção é escrito antes do teste RED correspondente.

---

### Task 1: Route de PDF efêmero e política visual compartilhada

**Files:**
- Create: `src/app/api/documents/preview/route.ts`
- Create: `src/app/api/documents/preview/route.test.ts`
- Create: `src/lib/server/domain/preview-render-policy.ts`
- Modify: `src/lib/server/domain/orchestrator.ts`
- Test: `src/lib/server/domain/preview-render-policy.test.ts`

**Interfaces:**
- Produces: `POST /api/documents/preview` receiving `{ modeloSlug, respostas, clausulasSelecionadas }` and returning a PDF `Response`.
- Produces: `resolveDocumentWatermark(entitlement): boolean`, pure and shared.
- Consumes: `reconstructAndValidateResponses`, `MODELOS`, `generatePdfServer`, App Check and principal helpers.

- [ ] **Step 1: Write route and policy RED tests**

```ts
expect((await POST(noBearerRequest)).status).toBe(401);
expect((await POST(validRequest)).headers.get("Content-Type")).toContain("application/pdf");
expect(await response.arrayBuffer()).toStartWithPdfHeader();
expect(repositories.documents.createDocument).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run RED**

Run: `bun test src/app/api/documents/preview/route.test.ts src/lib/server/domain/preview-render-policy.test.ts`

- [ ] **Step 3: Implement the no-write route**

Set `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `maxDuration = 8`; reject over-sized bodies before JSON parse, authenticate, resolve only a catalog model, reconstruct responses and produce `new Response(pdf)`. Apply all no-cache/privacy headers and catch `BackendError` without logging body data.

- [ ] **Step 4: Run GREEN**

Run: `bun test src/app/api/documents/preview/route.test.ts src/lib/server/domain/preview-render-policy.test.ts src/lib/server/domain/orchestrator.test.ts`

- [ ] **Step 5: Commit**

Commit only route/domain/tests with `feat(preview): gera PDF efêmero autenticado`.

### Task 2: Cliente cancelável e visualizador nativo

**Files:**
- Create: `src/lib/documents/preview-client.ts`
- Create: `src/components/docfacil/views/criar/pdf-preview.tsx`
- Modify: `src/components/docfacil/views/criar-view.tsx`
- Modify: `src/components/docfacil/views/criar/types.ts`
- Test: `src/lib/documents/preview-client.test.ts`
- Test: `src/components/docfacil/views/criar/pdf-preview.test.tsx`

**Interfaces:**
- Produces: `requestPdfPreview(payload, signal): Promise<Blob>` and `PdfPreview` props based on answers/clauses/model.
- Consumes: `apiFetch`, `AbortController`, `URL.createObjectURL`, `URL.revokeObjectURL`.

- [ ] **Step 1: Write client RED tests**

```ts
expect(apiFetch).toHaveBeenCalledWith("/api/documents/preview", expect.objectContaining({ signal }));
expect(revokeObjectURL).toHaveBeenCalledWith(previousUrl);
expect(lastResolvedUrl).toBe(newestUrl);
```

- [ ] **Step 2: Run RED**

Run: `bun test src/lib/documents/preview-client.test.ts src/components/docfacil/views/criar/pdf-preview.test.tsx`

- [ ] **Step 3: Implement the smallest UI integration**

Debounce 600 ms only after minimum fields are present. Abort prior request, compare monotonic request sequence before setting state, replace/revoke Blob URL, and render an accessible `iframe title="Prévia fiel do documento"`. For guest render a short locked state and do not call the endpoint. Remove `PreviewA4` from `/criar`; it may remain unused for non-creation structural contexts.

- [ ] **Step 4: Run GREEN**

Run: `bun test src/lib/documents/preview-client.test.ts src/components/docfacil/views/criar/pdf-preview.test.tsx`

- [ ] **Step 5: Commit**

Commit only client/view/tests with `feat(preview): exibe documento pelo renderer final`.

### Task 3: Paridade e browser verification

**Files:**
- Modify: `src/app/api/documents/preview/route.test.ts`
- Modify: `src/components/docfacil/views/criar/pdf-preview.test.tsx`

- [ ] **Step 1: Add parity coverage for representative models**

For all nine catalog slugs, verify the route renders a PDF with the same sanitized response path used by `generatePdfServer`; include watermark true/false policy cases.

- [ ] **Step 2: Run focused tests**

Run: `bun test src/app/api/documents/preview/route.test.ts src/components/docfacil/views/criar/pdf-preview.test.tsx`

- [ ] **Step 3: Browser verification**

Use the Vercel browser verification flow: authenticated desktop and 375 px mobile; alter a field rapidly, switch tab, and confirm only the newest PDF appears. Verify guest sees no network call to `/api/documents/preview`.

- [ ] **Step 4: Record gates**

Run: `bun test src/ && bun run lint && bun run typecheck && NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 bun run build:ci`.
