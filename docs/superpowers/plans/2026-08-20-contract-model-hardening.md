# Robustez dos modelos de contrato Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir lacunas jurídicas e de paginação nos contratos sem criar atrito ou condicionais jurídicas no renderer.

**Architecture:** O catálogo declara perguntas/textos; regras condicionais ficam em `legal-rules.ts`; invariantes bloqueantes ficam no domínio; o `contract-composer` só organiza blocos e geometria. Isso mantém a mesma linha de renderização para preview e PDF final.

**Tech Stack:** TypeScript, Document Engine, pdfmake, Bun tests e renderização PDF em imagem.

**Spec:** `docs/superpowers/specs/2026-08-20-contract-model-hardening-design.md`

## Global Constraints

- Não modificar declarações, billing, ownership, lifecycle, download nem a PR draft.
- Nenhum código de produção é escrito antes do teste RED correspondente.
- Não prometer upload, qualificação PJ ou transferência veicular que não estejam implementados integralmente.
- Não criar condicionais por slug no compositor PDF.

---

### Task 1: Coerência jurídica e decisões de baixo atrito ✅

**Files:**
- Modify: `src/lib/modelos.ts`
- Modify: `src/lib/document-engine/legal-rules.ts`
- Modify: `src/lib/document-engine/template.ts`
- Modify: `src/lib/server/domain/documents.ts`
- Test: `src/test/document-engine/contract-model-hardening.test.ts`
- Test: `src/lib/server/domain/documents.test.ts`

**Interfaces:**
- Consumes: `Modelo`, `fillDocument`, `validateDocumentSemanticInvariants` e cláusulas selecionadas.
- Produces: modelos que só inserem caução, arras e vistoria quando seus dados e escolhas existem; respostas sem sinal não materializam arras.

- [x] **Step 1: Escrever RED para as escolhas condicionais**

```ts
expect(render("contrato-locacao-comercial", {}, [])).toContain("SEM QUALQUER MODALIDADE");
expect(render("contrato-compra-venda-imovel", { possui_sinal: "Não" })).not.toContain("arras confirmatórias");
expect(() => reconstructAndValidateResponses(imovel, validWithoutRegistry, [])).toThrow("matrícula");
```

- [x] **Step 2: Executar RED**

Run: `bun test src/test/document-engine/contract-model-hardening.test.ts src/lib/server/domain/documents.test.ts`

Expected: falhas por ausência de campos/invariantes e por linhas incondicionais.

- [x] **Step 3: Implementar o menor modelo coerente**

Em `modelos.ts`, introduza os campos registral e a escolha `possui_sinal`; a escolha `Sim` revela sinal e forma. Use placeholders de cláusula para inserir a redação de arras apenas quando selecionada internamente pela escolha. Corrija garantia comercial, alienação, vistoria separada, prazo/retorno do comodato e local/data de bem móvel. Em `documents.ts`, bloqueie somente identificação registral ausente e sinal selecionado sem dados. Em `legal-rules.ts`, mantenha apenas redações que dependem de uma resposta.

- [x] **Step 4: Executar GREEN focado**

Run: `bun test src/test/document-engine/contract-model-hardening.test.ts src/lib/server/domain/documents.test.ts src/test/document-engine/model-polish.test.ts`

Expected: 0 falhas.

- [x] **Step 5: Revisar e commitar**

Run: `bun run typecheck`

Commit only relevant files with `fix(contracts): endurece regras e qualificações`.

> Evidência da Task 1 (2026-08-20): RED executado com os testes de hardening e domínio, com 9 falhas esperadas por condicionais/invariantes ausentes. GREEN focado: 29 testes, 0 falhas. `bun run typecheck`: concluído sem erros.
>
> Fix round 1 (2026-08-20): RED adicional observado para a visibilidade declarativa de sinal e para placeholders/cláusulas resolvidos por regras de renderização. GREEN: `bun run typecheck` e 76 testes focados (criação, engine, integridade/snapshots e domínio), 0 falhas. Compatibilidade legada cobre `prazo` do comodato, inferência de sinal imobiliário e bem móvel sem cidade/UF inventadas.
>
> Fix round 2 (2026-08-20): RED observado para renderização de respostas legadas salvas e para sinal obrigatório após a transição `Não` → `Sim` no PDF. GREEN: `bun run typecheck` e 40 testes focados (criação, engine, PDF, integridade e domínio), 0 falhas. A normalização mecânica foi extraída para o engine e é aplicada antes das composições de preview/PDF, sem sintetizar matrícula, Registro de Imóveis, cidade ou UF.
>
> Fix round 3 (2026-08-20): RED observado para imóvel pré-mudança com `sinal` e sem forma de pagamento, que antes renderizava placeholder de método. GREEN: `bun run typecheck` e 32 testes focados, 0 falhas. Esse formato legado rende `pago nesta data`; respostas novas com `possui_sinal=Sim` continuam exigindo a forma de pagamento.

### Task 2: Fechamento responsivo à receita

**Files:**
- Modify: `src/lib/pdf/contract-composer.ts`
- Test: `src/test/pdf/contract-composer.test.ts`
- Test: `src/test/pdf/pdf-structure.test.ts`

**Interfaces:**
- Consumes: `PdfVisualRecipe` e `getPdfLayoutGeometry(recipe)`.
- Produces: `buildContractContent(lines, recipe)` com fechamento em grupos seguros e grids proporcionais.

- [x] **Step 1: Escrever RED para fechamento longo e largura densa**

```ts
const closing = buildContractContent(longClosingLines, denseRecipe).at(-1);
expect(closing).not.toMatchObject({ unbreakable: true });
expect(JSON.stringify(closing)).not.toContain('"widths":[16,"*",36,112,26,84]');
```

- [x] **Step 2: Executar RED**

Run: `bun test src/test/pdf/contract-composer.test.ts`

- [x] **Step 3: Implementar grupos e geometria**

Faça a introdução do fechamento quebrável, mantenha a tabela de assinaturas/testemunhas como linhas indivisíveis e calcule as linhas pelo `contentWidth`. Preserve `headlineLevel` e nunca faça o compositor depender de slug.

- [x] **Step 4: Executar GREEN**

Run: `bun test src/test/pdf/contract-composer.test.ts src/test/pdf/pdf-structure.test.ts`

- [x] **Step 5: Revisar e commitar**

Commit only composer/tests with `fix(pdf): estabiliza fechamento de contratos`.

> Evidência da Task 2 (2026-08-20): RED observado com 4 falhas esperadas no compositor: fechamento comum marcado como `unbreakable`, grade de assinatura sem largura calculada, grade testemunhal fixa e data sem vírgula não centralizada. RED adicional observado para as colunas `Nome:`/`CPF:` em receita dense (31,19pt, menor que os 43pt necessários). GREEN: `npm exec --yes bun -- test src/test/pdf/contract-composer.test.ts src/test/pdf/pdf-structure.test.ts` com 26 testes e 79 asserções, 0 falhas; `npm run typecheck` sem erros. Auditoria visual atualizada para residencial, comercial, imóvel, comodato e bem móvel em `tmp/model-audit/rendered-task2-final` com `pdftoppm -png -r 150`; os artefatos não são versionados.

### Task 3: Auditoria visual de contratos

**Files:**
- Test: `src/test/pdf/contract-composer.test.ts`
- Create: `tmp/model-audit/*` (não versionado; evidência local)

- [ ] **Step 1: Gerar fixtures representativas**

Run the server PDF path for residencial, comercial, imóvel, comodato e bem móvel with long names, optional paths and max closing details.

- [ ] **Step 2: Renderizar cada página**

Run: `pdftoppm -png -r 150 <pdf> <prefix>`

Check: cabeçalho/rodapé livres, título e cláusulas sem órfãos, página final útil, assinatura/testemunhas completas.

- [ ] **Step 3: Corrigir somente defeito reproduzido**

Add a focused RED case before any correction.

- [ ] **Step 4: Gates do plano**

Run: `bun test src/ && bun run lint && bun run typecheck && NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 bun run build:ci`

- [ ] **Step 5: Registrar evidência**

Update this plan and the SDD ledger with commands, results, commit SHAs and any rendering limitation.
