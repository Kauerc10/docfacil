# Global Document Editorial Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar a identidade editorial dos 9 modelos oficiais do DocFácil sem eliminar as diferenças de densidade entre declarações, contratos e instrumentos.

**Architecture:** Extrair uma shell formal independente de família em `visual-recipes.ts`, fazer todas as receitas oficiais herdarem essa shell e desacoplar o header formal do profile `contract` em `styles.ts`. O conteúdo jurídico e o `contract-composer` permanecem intocados; somente geometria, identidade e ritmo editorial mudam.

**Tech Stack:** TypeScript, pdfmake 0.3.x, Bun Test, Next.js.

**Spec:** `docs/superpowers/specs/2026-08-21-global-document-editorial-shell-design.md`

## Global Constraints

- A PR #20 deve continuar Draft e não deve ser mergeada.
- Não alterar conteúdo jurídico, perguntas, validações, billing, entitlement ou lifecycle.
- Os 9 modelos oficiais devem usar a mesma shell formal.
- `declaration`, `contract` e `instrument` continuam existindo como perfis editoriais.
- O `contract-composer` continua exclusivo de `profile === "contract"`.
- A prévia continua usando o PDF real e não recebe um segundo renderer.
- Toda mudança de produção deve nascer de um RED observado pelo motivo correto.

---

### Task 1: Travar a identidade formal global em testes

**Files:**
- Modify: `src/test/pdf/pdf-structure.test.ts`

**Interfaces:**
- Consumes: `getModelo`, `getPdfVisualRecipe`, `buildDocDefinition`.
- Produces: invariantes estruturais para os 9 modelos oficiais.

- [ ] **Step 1: substituir o contrato de teste legado do divisor curto**

Criar uma lista local dos modelos oficiais:

```ts
const officialModelSlugs = [
  "declaracao-residencia",
  "declaracao-residencia-terceiro",
  "contrato-locacao",
  "contrato-locacao-comercial",
  "contrato-compra-venda-imovel",
  "comodato",
  "compra-venda",
  "uniao-estavel",
  "procuracao-simples",
] as const;
```

Trocar o teste que exige divisor curto nas declarações por um teste que percorra os 9 modelos:

```ts
it("mantém a mesma shell editorial formal nos nove modelos oficiais", () => {
  for (const slug of officialModelSlugs) {
    const modelo = getModelo(slug)!;
    const recipe = getPdfVisualRecipe(modelo);
    const ddo = buildDocDefinition(modelo, {}) as {
      header?: (currentPage: number) => unknown;
      content: unknown[];
      defaultStyle: { color?: string };
    };

    expect(recipe.headerStyle).toBe("formal");
    expect(recipe.showTitleDivider).toBe(false);
    expect(recipe.pageMarginsCm[0]).toBe(2);
    expect(recipe.pageMarginsCm[2]).toBe(2);
    expect(recipe.bodyColor).toBe("#181818");
    expect(JSON.stringify(ddo.header?.(1))).toContain("DocFácil");
    expect(JSON.stringify(ddo.header?.(1))).toContain("Documentos jurídicos simplificados");
    expect(JSON.stringify(ddo.header?.(1))).toContain("#b9853d");
  }
});
```

Adicionar um teste específico que impeça o retorno do divisor de título legado:

```ts
it("não reinsere o divisor legado abaixo do título em nenhuma família", () => {
  for (const slug of officialModelSlugs) {
    const modelo = getModelo(slug)!;
    const ddo = buildDocDefinition(modelo, {}) as { content: Array<Record<string, unknown>> };
    expect(ddo.content[1]?.canvas).toBeUndefined();
  }
});
```

- [ ] **Step 2: rodar o arquivo de teste e observar RED**

Run:

```bash
bun test src/test/pdf/pdf-structure.test.ts
```

Expected: FAIL nas declarações e instrumentos porque ainda não usam `headerStyle: "formal"`, ainda têm divisor e ainda possuem margens/bodyColor legados. Os contratos devem continuar passando os invariantes já existentes.

- [ ] **Step 3: commit do RED**

```bash
git add src/test/pdf/pdf-structure.test.ts
git commit -m "test(pdf): trava identidade editorial dos nove modelos"
```

---

### Task 2: Extrair a shell formal global e migrar as receitas

**Files:**
- Modify: `src/lib/pdf/visual-recipes.ts`

**Interfaces:**
- Consumes: `PdfVisualRecipe`.
- Produces: `DOCUMENT_FORMAL_BASE_RECIPE` compartilhada e presets de família.

- [ ] **Step 1: extrair uma base independente de profile**

Criar:

```ts
type PdfVisualBaseRecipe = Omit<PdfVisualRecipe, "profile" | "density" | "contractVariant">;

const DOCUMENT_FORMAL_BASE_RECIPE: PdfVisualBaseRecipe = {
  pageMarginsCm: [2, 2.3, 2, 2],
  footerHorizontalInsetCm: 2,
  footerBottomMarginCm: 0.55,
  bodyFontSize: 10.5,
  bodyLineHeight: 1.3,
  signatureLineHeight: 1,
  signatureCharacterSpacing: 0.2,
  titleFontSize: 15,
  titleCharacterSpacing: 0.2,
  titleBottomMargin: 7,
  dividerBottomMargin: 8,
  dividerWidthCm: null,
  closingTopMargin: 14,
  closingBottomMargin: 0,
  paragraphBottomMargin: 7,
  firstLineIndentSpaces: 0,
  legalQuoteIndent: 0,
  legalQuoteLineHeight: 1.26,
  dateAlignment: "right",
  dateTopMargin: 14,
  dateBottomMargin: 14,
  clauseHeadingTopMargin: 10,
  clauseHeadingBottomMargin: 4,
  bodyColor: "#181818",
  headerStyle: "formal",
  showTitleDivider: false,
};
```

- [ ] **Step 2: fazer os presets contratuais herdarem a base global**

`CONTRACT_FORMAL_BASE_RECIPE` deixa de duplicar a shell e passa a ser:

```ts
const CONTRACT_FORMAL_BASE_RECIPE: PdfVisualRecipe = {
  ...DOCUMENT_FORMAL_BASE_RECIPE,
  profile: "contract",
  density: "balanced",
  contractVariant: "standard",
};
```

Preservar os overrides existentes de `standard`, `dense`, `formal` e `property`.

- [ ] **Step 3: criar presets de declaração**

```ts
const DECLARATION_AIRY_RECIPE: PdfVisualRecipe = {
  ...DOCUMENT_FORMAL_BASE_RECIPE,
  profile: "declaration",
  density: "airy",
  bodyFontSize: 11.25,
  bodyLineHeight: 1.55,
  signatureLineHeight: 1.08,
  titleBottomMargin: 8,
  closingTopMargin: 15,
  closingBottomMargin: 24,
  paragraphBottomMargin: 10,
  legalQuoteLineHeight: 1.45,
  dateAlignment: "center",
  dateTopMargin: 16,
  dateBottomMargin: 26,
};

const DECLARATION_BALANCED_RECIPE: PdfVisualRecipe = {
  ...DOCUMENT_FORMAL_BASE_RECIPE,
  profile: "declaration",
  density: "balanced",
  bodyFontSize: 11.1,
  bodyLineHeight: 1.48,
  signatureLineHeight: 1.06,
  titleBottomMargin: 8,
  closingTopMargin: 14,
  closingBottomMargin: 18,
  paragraphBottomMargin: 8,
  legalQuoteLineHeight: 1.42,
  dateAlignment: "center",
  dateTopMargin: 14,
  dateBottomMargin: 22,
};
```

Mapear `declaracao-residencia` para airy e `declaracao-residencia-terceiro` para balanced.

- [ ] **Step 4: criar presets de instrumento**

```ts
const INSTRUMENT_AIRY_RECIPE: PdfVisualRecipe = {
  ...DOCUMENT_FORMAL_BASE_RECIPE,
  profile: "instrument",
  density: "airy",
  bodyFontSize: 11.25,
  bodyLineHeight: 1.5,
  signatureLineHeight: 1.06,
  closingTopMargin: 20,
  paragraphBottomMargin: 9,
  legalQuoteLineHeight: 1.44,
  dateAlignment: "right",
  dateTopMargin: 18,
  dateBottomMargin: 16,
};

const INSTRUMENT_BALANCED_RECIPE: PdfVisualRecipe = {
  ...DOCUMENT_FORMAL_BASE_RECIPE,
  profile: "instrument",
  density: "balanced",
  bodyFontSize: 11.1,
  bodyLineHeight: 1.42,
  signatureLineHeight: 1.04,
  closingTopMargin: 17,
  paragraphBottomMargin: 8,
  legalQuoteLineHeight: 1.4,
  dateAlignment: "right",
  dateTopMargin: 16,
  dateBottomMargin: 14,
};
```

Mapear `uniao-estavel` para airy e `procuracao-simples` para balanced.

- [ ] **Step 5: rodar o teste focal**

Run:

```bash
bun test src/test/pdf/pdf-structure.test.ts
```

Expected: ainda pode falhar no header das famílias não contratuais, porque `styles.ts` ainda exige `profile === "contract"`. As receitas e invariantes estáticos já devem passar.

- [ ] **Step 6: commit das receitas**

```bash
git add src/lib/pdf/visual-recipes.ts
git commit -m "refactor(pdf): compartilha shell formal entre famílias"
```

---

### Task 3: Desacoplar a shell formal do profile contract

**Files:**
- Modify: `src/lib/pdf/styles.ts`

**Interfaces:**
- Consumes: `PdfVisualRecipe.headerStyle`.
- Produces: header e tipografia formal para qualquer profile que use a shell.

- [ ] **Step 1: trocar a condição de shell**

Substituir:

```ts
const isFormalContract = recipe.profile === "contract" && recipe.headerStyle === "formal";
```

por:

```ts
const usesFormalShell = recipe.headerStyle === "formal";
```

Aplicar `usesFormalShell` no header e nos estilos `clauseHeading` e `label`.

Não mudar a condição do compositor:

```ts
const contentNodes = recipe.profile === "contract"
  ? buildContractContentForModel(...)
  : applyClosingRhythm(...);
```

- [ ] **Step 2: rodar o teste focal e observar GREEN**

Run:

```bash
bun test src/test/pdf/pdf-structure.test.ts
```

Expected: PASS, inclusive os invariantes globais e os testes de diferença de densidade entre famílias.

- [ ] **Step 3: rodar toda a suíte unitária**

Run:

```bash
bun test
```

Expected: 0 failures. Ajustar somente testes que codificavam explicitamente a identidade visual legada; não alterar testes jurídicos para acomodar regressões.

- [ ] **Step 4: commit do renderer**

```bash
git add src/lib/pdf/styles.ts src/test/pdf/pdf-structure.test.ts
git commit -m "refactor(pdf): aplica identidade formal a todos os documentos"
```

---

### Task 4: Gates completos e preview

**Files:**
- Modify only if a gate exposes regression real.

**Interfaces:**
- Produces: evidência de CI e deployment do mesmo HEAD.

- [ ] **Step 1: aguardar GitHub Actions do HEAD**

Exigir sucesso em:

```text
unit/domain
Firestore Security Rules
Firestore commit integration
ESLint
TypeScript
Next.js Build
Guest E2E
```

- [ ] **Step 2: se houver falha, diagnosticar antes de corrigir**

Abrir apenas o primeiro job vermelho, identificar causa raiz e criar/ajustar teste que reproduza a falha antes de qualquer correção de produção.

- [ ] **Step 3: verificar deployment Vercel do mesmo SHA**

O deployment da branch deve estar `READY` e responder `HTTP 200`.

- [ ] **Step 4: confirmar estado da PR**

PR #20 deve permanecer:

```text
open
draft
not merged
```

- [ ] **Step 5: não fazer merge**

A rodada termina com a branch validada, pronta para inspeção visual pelo usuário, mas a PR continua Draft.
