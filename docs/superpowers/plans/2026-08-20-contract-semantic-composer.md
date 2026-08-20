# Contract Semantic Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir contratos pdfmake com composição e paginação editorial reutilizáveis, começando pela locação residencial.

**Architecture:** A família `contract` passa por um compositor semântico antes de chegar ao pdfmake. Geometria é calculada a partir da receita; cláusulas, fechamento, assinaturas e testemunhas são nós estruturados, não texto inferido de forma genérica.

**Tech Stack:** TypeScript, pdfmake, Bun tests, pdfinfo/pdftoppm, GitHub Actions e Vercel.

**Spec:** `docs/superpowers/specs/2026-08-20-contract-semantic-composer-design.md`

## Global Constraints

- Não alterar conteúdo jurídico, perguntas, billing, lifecycle ou receitas `declaration`.
- Não criar condição por slug no renderer; usar `profile === "contract"` e receita.
- A receita residencial formal usa margens laterais de 2,0 cm.
- Nenhum código de produção é escrito antes do teste RED correspondente.

---

### Task 1: Geometria derivada da receita

**Files:**
- Create: `src/lib/pdf/layout-geometry.ts`
- Modify: `src/lib/pdf/styles.ts`
- Modify: `src/lib/pdf/visual-recipes.ts`
- Test: `src/test/pdf/pdf-structure.test.ts`

**Interfaces:**
- Produces: `getPdfLayoutGeometry(recipe): { contentWidth: number; frameWidth: number; pageMargins: [number, number, number, number] }`.

- [x] **Step 1: Write the failing test**

```ts
expect(getPdfLayoutGeometry(getPdfVisualRecipe(model)).contentWidth)
  .toBeCloseTo(cm(21) - cm(2) * 2, 2);
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test src/test/pdf/pdf-structure.test.ts`

- [x] **Step 3: Write minimal implementation**

```ts
export function getPdfLayoutGeometry(recipe: PdfVisualRecipe) {
  const pageMargins = recipe.pageMarginsCm.map(cm) as [number, number, number, number];
  return { pageMargins, contentWidth: cm(21) - pageMargins[0] - pageMargins[2], frameWidth: cm(21) - cm(4) };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `bun test src/test/pdf/pdf-structure.test.ts`

### Task 2: Compositor semântico da família contract

**Files:**
- Create: `src/lib/pdf/contract-composer.ts`
- Modify: `src/lib/pdf/content-builder.ts`
- Test: `src/test/pdf/contract-composer.test.ts`

**Interfaces:**
- Produces: `buildContractContent(lines, recipe): unknown[]`.
- Consumes: `classifyLine`, `textRuns`, `findClosingSectionIndex` e `PdfVisualRecipe`.

- [x] **Step 1: Write failing tests**

```ts
expect(buildContractContent(lines, recipe)).toContainEqual(expect.objectContaining({ id: "contract-closing", unbreakable: true }));
expect(signatureGrid.table.dontBreakRows).toBe(true);
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test src/test/pdf/contract-composer.test.ts`

- [x] **Step 3: Write minimal composer**

Create heading nodes with `headlineLevel`, render regular lines with the existing rich-text helper, and build signature/witness grids with `noBorders` tables.

- [x] **Step 4: Run test to verify it passes**

Run: `bun test src/test/pdf/contract-composer.test.ts src/test/pdf/pdf-structure.test.ts`

### Task 3: Renderer integration and real pagination

**Files:**
- Modify: `src/lib/pdf/styles.ts`
- Modify: `src/lib/pdf/content-builder.ts`
- Test: `src/test/pdf/pdf-structure.test.ts`
- Test: `src/test/pdf/contract-composer.test.ts`

**Interfaces:**
- Consumes: `getPdfLayoutGeometry` and `buildContractContent`.

- [x] **Step 1: Write failing tests**

```ts
expect(docDefinition.pageBreakBefore({ headlineLevel: 2 }, [], [], [])).toBe(true);
expect(docDefinition.header(1).stack[1].canvas[0].x2).toBeCloseTo(geometry.frameWidth, 2);
```

- [x] **Step 2: Run test to verify it fails**

Run: `bun test src/test/pdf/pdf-structure.test.ts`

- [x] **Step 3: Integrate the composer**

Route `profile === "contract"` through `buildContractContent`, use recipe geometry in header/footer/dividers/watermark, and remove ineffective `keepWithNext` metadata.

- [x] **Step 4: Run test to verify it passes**

Run: `bun test src/test/pdf/contract-composer.test.ts src/test/pdf/pdf-structure.test.ts src/test/pdf/declaration-print-layout.test.ts`

### Task 4: Visual regression and delivery gates

**Files:**
- Test: `src/test/pdf/contract-composer.test.ts`
- Modify: `docs/superpowers/specs/2026-08-20-contract-semantic-composer-design.md` only if the rendered result exposes an explicit design correction.

- [x] **Step 1: Generate the residential contract fixture**

Run: focused PDF generator test and render all pages with `pdftoppm -png -r 150`.

- [x] **Step 2: Inspect page one through final page**

Verify header width, 2,0 cm body margins, hierarchy, clause page starts, closing, signatures and witnesses. If a defect appears, return to a focused RED test.

- [ ] **Step 3: Run full gates**

Run: `bun test src/`, `bun run lint`, `bun run typecheck`, `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build:ci`, `bun run test:e2e`.

- [ ] **Step 4: Commit and publish**

Commit only contract-composer files and tests with `feat(pdf): compõe contratos por blocos editoriais`; wait for GitHub CI, Guest E2E and Vercel Preview on the same SHA.
