# Document Engine V1 Editorial + Legal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** elevar os documentos finais do DocFácil para uma V1 comercialmente sólida, com validação semântica, modelos mais robustos e paginação editorial melhor, preservando um fluxo simples para leigos.

**Architecture:** manter os modelos TypeScript atuais como fonte de verdade, acrescentando somente metadados pequenos para seleção/layout. Regras de domínio críticas rodam novamente no backend antes da geração. O pdfmake continua sendo o renderer final, com perfis editoriais e proteção de quebras mais granular.

**Tech Stack:** Next.js, TypeScript, Bun test, pdfmake, Firebase/Firestore, Vercel.

**Spec:** `docs/superpowers/specs/2026-08-19-document-engine-v1-editorial-legal-design.md`

## Global Constraints

- Mais robustez por baixo, menos atrito por cima.
- Não criar etapas novas quando a regra puder ser inferida ou validada.
- Perguntas devem ser entendidas por clientes leigos/idosos.
- Backend continua autoridade para consistência do documento.
- TDD RED → GREEN para cada comportamento novo.
- A PR #20 permanece draft até a validação completa.

---

### Task 1: Invariantes P0 de locação

**Files:**
- Modify: `src/lib/server/domain/documents.ts`
- Modify: `src/lib/server/domain/documents.test.ts`

**Produces:** rejeição server-side de múltiplas garantias e caução acima de três meses.

- [x] Escrever testes que rejeitam `caucao + fiador` e `caucao_meses=4`.
- [x] Executar CI e observar RED apenas nas regressões novas.
- [ ] Implementar validação semântica mínima.
- [ ] Executar CI completa e observar GREEN.

### Task 2: Escolha única de garantia sem atrito

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/components/docfacil/views/criar/types.ts`
- Modify: `src/components/docfacil/views/criar-view.tsx`
- Modify: `src/components/docfacil/views/criar/clausula-card.tsx`
- Modify: `src/lib/modelos.ts`
- Test: `src/test/document-engine/rental-guarantee-selection.test.ts`

**Produces:** `selectionMode: "single" | "multiple"` e UI de garantia com uma única escolha.

- [ ] Escrever regressão de contrato da etapa de garantia.
- [ ] Implementar metadata e tradução para UI.
- [ ] Trocar semântica visual/ARIA para opção única quando aplicável.
- [ ] Garantir que selecionar uma garantia remova a anterior.
- [ ] Rodar suíte/CI.

### Task 3: Textos jurídicos condicionais e correções de locação

**Files:**
- Create: `src/lib/document-engine/semantic-render.ts`
- Modify: `src/lib/document-engine/template.ts`
- Modify: `src/lib/modelos.ts`
- Test: `src/test/document-engine/rental-legal-text.test.ts`

**Produces:** texto residencial compatível com prazo <30 e >=30 meses e encargos condominiais coerentes.

- [ ] Testar prazo 12 meses e 30 meses em RED.
- [ ] Implementar bloco condicional simples, sem AST.
- [ ] Corrigir extraordinárias/fundo de reserva nos modelos.
- [ ] Validar textos gerados sem tokens pendentes.
- [ ] Rodar CI.

### Task 4: Paginação e identidade editorial

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/pdf/content-builder.ts`
- Modify: `src/lib/pdf/styles.ts`
- Modify: `src/lib/modelos.ts`
- Test: `src/test/pdf/pdf-structure.test.ts`
- Test: `src/lib/pdf/server/generator.test.ts`

**Produces:** perfis `declaration | contract | instrument`, fechamento granular, heading protegido e branding discreto.

- [ ] Escrever testes de estrutura/paginação em RED.
- [ ] Remover `unbreakable` do fechamento inteiro, mantendo pares de assinaturas atômicos.
- [ ] Adicionar `pageBreakBefore`/proteção de heading.
- [ ] Remover `VALIDADE LEGAL` da marca d'água.
- [ ] Aplicar perfil editorial por modelo.
- [ ] Gerar PDFs reais em teste e rodar CI.

### Task 5: Lapidação dos nove modelos

**Files:**
- Modify: `src/lib/modelos.ts`
- Modify: `src/lib/document-engine/template.ts` quando necessário
- Test: `src/test/document-engine/characterization-smoke.test.ts`
- Create/Modify: testes focados por modelo.

**Produces:** modelos mais claros e robustos sem aumentar etapas desnecessárias.

- [ ] Residência: base Lei 7.115/1983 e linguagem editorial melhor.
- [ ] Residência por terceiro: remover gênero hardcoded e esclarecer relação/condição sem obrigar campos extras desnecessários.
- [ ] Locação residencial: robustez de prazo/garantia/encargos/fiador.
- [ ] Locação comercial: extraordinárias no locador e texto PJ/PF sem sobrecarregar a V1.
- [ ] Compra/venda imóvel: reposicionar como compromisso, eliminar texto com `/`, melhorar posse/sinal sem excesso de etapas.
- [ ] Compra/venda bens móveis: separar quitação do que foi efetivamente pago e melhorar entrega/estado do bem.
- [ ] Comodato: reforçar entrega/restituição sem formulário gigante.
- [ ] União estável: linguagem neutra e copy prudente para regime patrimonial.
- [ ] Procuração: substabelecimento não pode ser concedido automaticamente.
- [ ] Rodar smoke dos nove modelos e CI.

### Task 6: Verificação final e PR

**Files:**
- Modify: PR #20 body

- [ ] Rodar CI completa no HEAD final.
- [ ] Confirmar Vercel Preview `READY` no mesmo SHA.
- [ ] Revisar diff da #20 contra `main`.
- [ ] Atualizar descrição da PR no padrão das #16/#17/#18 com contexto, decisões, TDD, validações e fora de escopo.
- [ ] Manter PR em draft para validação visual/manual dos documentos antes do merge.
