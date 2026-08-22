# Contract Formal Editorial System Implementation Plan

**Goal:** Transformar os contratos em documentos formais, compactos e reutilizáveis, começando pela locação residencial.

**Architecture:** A variante `formal` deixa de ser uma microvariação de line-height e passa a concentrar toda a receita editorial. `visual-recipes.ts` contém métricas; `styles.ts` usa a receita para identidade e cabeçalho; `content-builder.ts` preserva semântica e não infere blocos jurídicos pela presença de palavras legais.

**Spec:** `docs/superpowers/specs/2026-08-20-contract-formal-editorial-system-design.md`

## Global constraints

- Não alterar conteúdo jurídico, perguntas, billing ou lifecycle.
- Não alterar receitas `declaration`.
- Não criar condicionais por slug no renderer.
- Renderizar e revisar o contrato residencial antes de concluir.

## Task 1 - Criar a receita editorial formal

Arquivos: `src/lib/pdf/visual-recipes.ts`, `src/lib/pdf/styles.ts`, `src/test/pdf/pdf-structure.test.ts`.

1. Escrever teste RED: `getPdfVisualRecipe(getModelo("contrato-locacao")!)` deve retornar variante `formal`, margem lateral inferior a 3 cm e `firstLineIndentSpaces` igual a zero.
2. Rodar `bun test src/test/pdf/pdf-structure.test.ts`; deve falhar porque a receita atual usa `standard`, 3,15 cm e recuo.
3. Implementar `CONTRACT_FORMAL_RECIPE` com margens `[2.35, 2.25, 2.35, 2.15]`, corpo 10,5 pt, line-height 1,26, sem recuo, parágrafo 6, e títulos de cláusula 10/4. Selecionar essa receita para a locação e usar a receita em `styles.ts` para cabeçalho formal + filete dourado em todas as páginas.
4. Rodar novamente o teste focado e confirmar verde.
5. Commit: `feat(pdf): aplica preset formal aos contratos`.

## Task 2 - Remover falso destaque de cláusulas legais

Arquivos: `src/lib/pdf/content-builder.ts`, `src/test/pdf/pdf-structure.test.ts`.

1. Escrever teste RED: `renderLineNode("A locação observará o art. 47 da Lei nº 8.245/1991.", [], 0, recipe)` deve produzir `{ style: "body", alignment: "justify" }`.
2. Rodar `bun test src/test/pdf/pdf-structure.test.ts`; deve falhar porque `isLegalQuote` escolhe `legalQuote`.
3. Remover a ramificação genérica que usa `isLegalQuote(classified.texto)` no renderer de parágrafo. O estilo continua disponível para futura classificação semântica explícita.
4. Rodar o teste focado e confirmar verde.
5. Commit: `fix(pdf): preserva cláusulas legais como corpo`.

## Task 3 - Validar PDF físico e regressões

Arquivos: `src/test/pdf/pdf-structure.test.ts`, `src/test/pdf/declaration-print-layout.test.ts`, `src/lib/pdf/server/generator.test.ts`.

1. Adicionar regressão: a declaração residencial mantém `density: "airy"` e recuo positivo.
2. Rodar testes PDF focados.
3. Gerar contrato residencial real, renderizar todas as páginas com `pdftocairo -png -r 150` e inspecionar cabeçalho, filete, corpo preto, paginação, rodapé e assinaturas. Retornar ao teste RED específico se aparecer cláusula órfã, assinatura cortada, corpo azul/itálico ou página quase vazia acidental.
4. Rodar `bun test src/`, `bun run lint`, `bun run typecheck`, `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 bun run build:ci` e `bun run test:e2e`.
5. Commit: `test(pdf): protege composição formal de contratos`.
