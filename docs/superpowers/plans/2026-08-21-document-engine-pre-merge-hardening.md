# Document Engine Pre-Merge Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar os últimos riscos de integridade, validação e rastreabilidade do Document Engine antes de tirar a PR #20 do Draft.

**Architecture:** Manter o servidor como autoridade final e validar dados puros antes de qualquer side effect de billing, versionamento ou persistência. Regras de integridade de modelo ficam no CI gate, validadores determinísticos ficam em módulo compartilhado browser/server, e o renderer usa semântica explícita em vez de heurísticas amplas para citações legais. A fronteira mensal é calculada em timezone de negócio explícito e o snapshot de geração passa a representar também a versão editorial do PDF.

**Tech Stack:** Next.js, TypeScript, Bun tests, pdfmake, Firestore, Cloudflare R2, GitHub Actions, Playwright, Vercel.

**Spec:** PR #20 + auditoria pré-merge de 21/08/2026 registrada na conversa de desenvolvimento.

## Global Constraints

- Trabalhar somente em `refactor/document-engine-v1`; não fazer merge.
- RED antes de cada mudança de produção; confirmar que falha pelo motivo correto.
- Não alterar conteúdo jurídico material dos 9 modelos nesta rodada.
- Não alterar política comercial: Free 1/mês, avulso R$ 19,90, Pro R$ 39,90/mês.
- Não reintroduzir reutilização de requestId terminal após paywall.
- Commits devem permanecer atribuídos ao usuário GitHub `Kauerc10` e usar mensagens naturais/humanizadas.
- Ao final: suíte completa, Firestore Rules, integração atômica, lint, typecheck, build, Guest E2E, Vercel no mesmo SHA e Codex Security standard scan.

---

### Task 1: Validar antes de efeitos colaterais e preservar documento atual

**Files:**
- Modify: `src/lib/server/domain/orchestrator.ts`
- Test: `src/lib/server/domain/orchestrator.test.ts`

**Interfaces:**
- Consumes: `reconstructAndValidateResponses(modelo, respostas, clausulasSelecionadas)`.
- Produces: respostas canônicas validadas antes de reservar versão, pedido ou criar documento; defesa contra `modeloSlug` incompatível em regeneração.

- [ ] **Step 1: Write the failing tests**
  - Nova geração inválida não cria `DocumentRecord`.
  - Regeneração inválida preserva `currentVersion` e `artifactState: ready`.
  - Regeneração interna com slug diferente do documento salvo falha antes de reservar nova versão.

- [ ] **Step 2: Run RED**
  - CI deve falhar somente nos novos contratos de lifecycle.

- [ ] **Step 3: Implement minimal fix**
  - Resolver modelo e ownership primeiro.
  - Reconstruir/validar respostas antes de billing reservation, `reserveNextVersion` e `createDocument`.
  - Reutilizar `sanitizedAnswers` no PDF/commit.

- [ ] **Step 4: Run GREEN**
  - Novos testes + suíte anterior verdes.

- [ ] **Step 5: Commit**
  - `fix(engine): valida geração antes de reservar estado`

### Task 2: Fechar integridade de cláusulas dinâmicas

**Files:**
- Modify: `src/lib/server/domain/documents.ts`
- Modify: `src/lib/document-engine/model-validator.ts`
- Test: `src/lib/server/domain/documents.test.ts`
- Test: `src/test/models/models-integrity.test.ts`

**Interfaces:**
- Produces: `clausulasSelecionadas` só aceita IDs declarados; CI valida placeholders presentes no `corpo` de cada cláusula dinâmica.

- [ ] **Step 1: Write RED tests**
  - ID de cláusula desconhecido gera `INVALID_REQUEST` e não vira marcador `__clausula_*`.
  - Placeholder fantasma dentro de `clausula.corpo` gera `UNREGISTERED_VARIABLE`.
  - Placeholder de `camposExtras` válido dentro da cláusula continua aceito.

- [ ] **Step 2: Run RED**
  - Confirmar falha pelas lacunas atuais.

- [ ] **Step 3: Implement minimal fix**
  - Derivar conjunto de clause IDs do modelo e rejeitar subset inválido.
  - Incluir corpos das cláusulas na varredura estática do model validator.

- [ ] **Step 4: Run GREEN**

- [ ] **Step 5: Commit**
  - `fix(engine): fecha integridade das cláusulas dinâmicas`

### Task 3: Compartilhar validadores de campos entre browser e servidor

**Files:**
- Create: `src/lib/validation/document-fields.ts`
- Modify: `src/components/docfacil/views/criar/types.ts`
- Modify: `src/lib/server/domain/documents.ts`
- Test: `src/lib/validation/document-fields.test.ts`
- Test: `src/lib/server/domain/documents.test.ts`

**Interfaces:**
- Produces: `validarCPF`, `validarCNPJ`, `validarCEP`, `validarTelefone`, `validarData`, `validarCampoDocumento` em módulo sem dependência de React/browser.
- `criar/types.ts` reexporta os validadores para manter compatibilidade de imports existentes.

- [ ] **Step 1: Write RED tests**
  - CPF/CNPJ/CEP/data inválidos são rejeitados no domínio quando o campo correspondente está preenchido.
  - Campos opcionais vazios continuam aceitos.
  - Campos de texto que apenas mencionam “CPF” no label não são falsamente tratados como CPF.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Extract shared pure validators**
  - Sem `window`, React ou side effects.
  - Aplicar no backend sobre campos declarados e extras de cláusulas selecionadas.

- [ ] **Step 4: Update fixtures to valid synthetic identifiers where necessary**
  - Usar CPFs/CNPJs de teste com dígitos verificadores válidos, nunca dados pessoais reais.

- [ ] **Step 5: Run GREEN**

- [ ] **Step 6: Commit**
  - `refactor(validation): torna formatos de documento autoritativos no servidor`

### Task 4: Tornar citações legais semânticas no renderer

**Files:**
- Modify: `src/lib/pdf/content-builder.ts`
- Test: `src/test/pdf/document-structure.test.ts` ou teste estrutural equivalente já existente.

**Interfaces:**
- Produces: `isLegalQuote()` só classifica transcrição legal explícita, não parágrafo comum que apenas referencia artigo/lei.

- [ ] **Step 1: Write RED tests**
  - `Art. 299 - ...` é citação.
  - `Pena - reclusão...` é citação.
  - `...nos termos do art. 1.724 do Código Civil.` não é citação.
  - União Estável mantém parágrafos jurídicos normais em `body` justificado.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Narrow heuristic**
  - Preferir início explícito de transcrição (`Art.`, `Artigo`, `Pena`) em vez de presença de palavras jurídicas no meio do texto.

- [ ] **Step 4: Run GREEN**

- [ ] **Step 5: Commit**
  - `fix(pdf): diferencia referência legal de citação transcrita`

### Task 5: Fixar fronteira mensal no timezone de negócio

**Files:**
- Create: `src/lib/server/domain/billing-period.ts`
- Modify: `src/lib/server/domain/orchestrator.ts`
- Test: `src/lib/server/domain/billing-period.test.ts`

**Interfaces:**
- Produces: `getBillingMonthStartTimestamp(now?: Date, timeZone?: string): number` com default `America/Sao_Paulo`.

- [ ] **Step 1: Write RED tests**
  - Instantes na virada UTC que ainda pertencem ao mês anterior em São Paulo produzem a fronteira correta.
  - A chave mensal permanece determinística durante o mês.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Implement timezone-explicit helper**
  - Sem dependência nova; usar `Intl.DateTimeFormat`/offset determinístico ou helper puro equivalente.

- [ ] **Step 4: Wire orchestrator and run GREEN**

- [ ] **Step 5: Commit**
  - `fix(billing): fixa ciclo mensal no horário de São Paulo`

### Task 6: Melhorar rastreabilidade editorial do artefato

**Files:**
- Modify: `src/lib/pdf/visual-recipes.ts`
- Modify: `src/lib/server/domain/documents.ts`
- Test: `src/test/models/snapshots.test.ts` ou teste de hash equivalente.

**Interfaces:**
- Produces: `PDF_RENDER_RULES_VERSION` e snapshot incluindo receita visual efetiva + versão do renderer, sem confundir isso com conteúdo jurídico.

- [ ] **Step 1: Write RED test**
  - Mudança de receita/versão editorial altera `modelSnapshotHash`; ordenação de objetos continua determinística.

- [ ] **Step 2: Run RED**

- [ ] **Step 3: Include visual recipe + renderer version in canonical snapshot**

- [ ] **Step 4: Run GREEN**

- [ ] **Step 5: Commit**
  - `refactor(pdf): inclui identidade editorial no snapshot de geração`

### Task 7: Gates finais e segurança

**Files:**
- Modify if necessary: PR #20 description only after code gates are green.

- [ ] **Step 1: Run full GitHub Actions on final HEAD**
  - Unit/domain, Firestore Rules, atomic integration, ESLint, TypeScript, Next build, Guest E2E.

- [ ] **Step 2: Validate Vercel deployment for exact final SHA**
  - Deployment `READY`, smoke HTTP success, inspect recent runtime errors.

- [ ] **Step 3: Run Codex Security standard repository scan**
  - Scan the repository source with focus on document generation, auth/ownership, billing/order reservation, access links, R2 artifact lifecycle and server/client trust boundaries.
  - Any validated High/Critical or plausible merge-blocking Medium returns the PR to remediation/TDD.

- [ ] **Step 4: Verify commit attribution**
  - HEAD author/committer must resolve to `Kauerc10`.

- [ ] **Step 5: Refresh PR #20 body**
  - Replace stale SHA/CI/Preview references with final evidence and concise architecture summary.

- [ ] **Step 6: Mark PR ready for review**
  - Only if every gate above is green and security scan has no merge blocker.
