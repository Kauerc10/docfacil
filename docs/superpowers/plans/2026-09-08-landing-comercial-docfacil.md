# Landing Comercial do DocFácil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar uma landing comercial mobile-first que explique o produto real, leve ao documento adequado e use prova concreta sem alegações não verificadas.

**Architecture:** Separar páginas públicas indexáveis das views internas controladas por query string, mantendo compatibilidade com links antigos. Dados comerciais virão do catálogo e da política de acesso; a home será composta por seções pequenas e server-rendered, com ilhas client apenas onde houver interação.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, componentes shadcn/Radix, Bun Test e Playwright.

**Spec:** `docs/superpowers/specs/2026-09-08-landing-comercial-docfacil-design.md`

## Global Constraints

- Projetar primeiro para 320–390 px e manter conteúdo essencial equivalente no desktop.
- Não adicionar biblioteca estética.
- Não anunciar IA demonstrativa, pagamento indisponível, atendimento não verificado, estatísticas ou depoimentos sem evidência.
- Acesso gratuito: uma geração mensal com conta, apenas nos modelos selecionados e com marca d'água.
- Analytics nunca recebe consulta livre, respostas, dados pessoais, tokens ou URLs de acesso.
- WCAG 2.2 AA; alvos de toque de pelo menos 44 px; `prefers-reduced-motion` interrompe GSAP, CSS e SMIL.
- Preservar deep links antigos e não alterar backend, autenticação, billing ou infraestrutura sem blocker demonstrado.
- Cada tarefa termina em commit convencional em português e push da branch.

---

### Task 1: Fonte leve do catálogo e busca tolerante

**Files:**
- Create: `src/lib/catalog/search.ts`
- Create: `src/lib/catalog/search.test.ts`
- Create: `src/lib/catalog/public-models.ts`
- Test: `src/lib/catalog/search.test.ts`

**Interfaces:**
- Produces: `normalizeSearch(value: string): string`, `searchPublicModels(models, query): PublicModel[]`, `PublicModel` e `PUBLIC_MODELS`.
- Consumes: `MODELOS` e `isMonthlyFreeModel` existentes.

- [ ] **Step 1: Escrever teste falhando para acentos, caixa e sinônimos**

```ts
import { expect, test } from "bun:test";
import { normalizeSearch, searchPublicModels } from "./search";

test("trata procuracao e procuração como a mesma busca", () => {
  expect(normalizeSearch(" Procuração ")).toBe("procuracao");
});

test("encontra locação por aluguel", () => {
  expect(searchPublicModels([{ slug: "contrato-locacao", nome: "Contrato de Locação", descricao: "Moradia", categoria: "Locação", intent: "alugar", aliases: ["aluguel"], minutes: 7, free: false }], "aluguel")[0]?.slug).toBe("contrato-locacao");
});
```

- [ ] **Step 2: Rodar `bun test src/lib/catalog/search.test.ts` e confirmar FAIL por módulo ausente.**
- [ ] **Step 3: Implementar normalização NFD, remoção de diacríticos e busca apenas nos metadados públicos.**
- [ ] **Step 4: Criar `PUBLIC_MODELS` mapeando slug, nome, descrição, categoria, intenção, aliases, minutos e gratuidade, sem exportar templates ou etapas.**
- [ ] **Step 5: Rodar o teste e `bun run typecheck`; esperar PASS.**
- [ ] **Step 6: Commit e push:** `feat(catalogo): ensina a busca a conviver com acentos`.

### Task 2: Rotas públicas e compatibilidade

**Files:**
- Create: `src/app/documentos/page.tsx`
- Create: `src/app/documentos/[slug]/page.tsx`
- Create: `src/components/docfacil/catalog/document-catalog.tsx`
- Create: `src/test/marketing/public-routes.test.ts`
- Modify: `src/components/docfacil/nav-context.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/robots.ts`

**Interfaces:**
- Consumes: `PUBLIC_MODELS`, `searchPublicModels`, `getModelo(slug)` e navegação legada.
- Produces: páginas públicas SSR e catálogo client com `query`, `intent` e `freeOnly`.

- [ ] **Step 1: Escrever testes que exijam `/documentos`, uma URL por slug, canonical próprio e URLs antigas ainda reconhecidas.**
- [ ] **Step 2: Rodar `bun test src/test/marketing/public-routes.test.ts`; confirmar FAIL.**
- [ ] **Step 3: Implementar o catálogo com input rotulado, filtros pressionáveis, contagem `aria-live`, cards com links e estado vazio com limpar filtros.**
- [ ] **Step 4: Implementar página individual com `generateMetadata`, quando usar, dados necessários, limites, acesso e CTA para o fluxo existente.**
- [ ] **Step 5: Fazer `navigate("modelos")` e `navigate("modelo-detalhe")` redirecionarem às rotas públicas sem invalidar entrada por query antiga.**
- [ ] **Step 6: Atualizar sitemap/robots com o domínio canônico do produto e excluir rotas privadas.**
- [ ] **Step 7: Rodar teste, typecheck e build; esperar PASS.**
- [ ] **Step 8: Commit e push:** `feat(rotas): dá endereço próprio para cada documento`.

### Task 3: Estrutura comercial e copy verificável

**Files:**
- Create: `src/components/docfacil/landing/landing-page.tsx`
- Create: `src/components/docfacil/landing/hero.tsx`
- Create: `src/components/docfacil/landing/intent-navigation.tsx`
- Create: `src/components/docfacil/landing/product-proof.tsx`
- Create: `src/components/docfacil/landing/benefits.tsx`
- Create: `src/components/docfacil/landing/access-summary.tsx`
- Create: `src/components/docfacil/landing/trust-section.tsx`
- Create: `src/components/docfacil/landing/landing-faq.tsx`
- Create: `src/components/docfacil/landing/final-cta.tsx`
- Create: `src/test/marketing/landing-content.test.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `PUBLIC_MODELS`, política de acesso, `Pet`, Accordion e rotas públicas.
- Produces: landing server-first com seções independentes e CTAs reais.

- [ ] **Step 1: Escrever teste de contrato textual exigindo headline aprovada, condições gratuitas, limites jurídicos e ausência de `+48 mil`, depoimentos e gerador com IA.**
- [ ] **Step 2: Rodar o teste e confirmar FAIL contra a home atual.**
- [ ] **Step 3: Montar `LandingPage` na ordem hero → intenções → prova/fluxo → benefícios → acesso → confiança → FAQ → CTA.**
- [ ] **Step 4: Implementar hero com “Crie contratos e declarações com orientação em cada etapa”, CTA para `/documentos` e âncora `#como-funciona`.**
- [ ] **Step 5: Mostrar até quatro modelos editoriais e uma prévia real identificada como exemplo, carregada sob demanda; nenhum controle inerte.**
- [ ] **Step 6: Implementar copy de acesso a partir da política central e omitir opções pagas quando a disponibilidade real não estiver comprovada.**
- [ ] **Step 7: Implementar FAQ com respostas aprovadas sobre conta, gratuidade, edição, celular, privacidade, validade, advogado e cartório.**
- [ ] **Step 8: Rodar teste, typecheck e build; esperar PASS.**
- [ ] **Step 9: Commit e push:** `feat(landing): troca fumaça bonita por produto de verdade`.

### Task 4: Header, footer, mascote e mobile

**Files:**
- Modify: `src/components/docfacil/header.tsx`
- Modify: `src/components/docfacil/footer.tsx`
- Modify: `src/components/docfacil/pet.tsx`
- Modify: `src/components/docfacil/whatsapp-button.tsx`
- Modify: `src/app/globals.css`
- Create: `src/test/marketing/navigation-accessibility.test.ts`

**Interfaces:**
- Consumes: rotas públicas e estados de autenticação.
- Produces: navegação semântica, menu inacessível quando fechado e `Pet` que respeita reduced motion integralmente.

- [ ] **Step 1: Escrever testes para links reais, ausência de destinos fictícios, menu fechado com `hidden/inert` equivalente e animações do mascote sem SMIL quando reduced motion estiver ativo.**
- [ ] **Step 2: Rodar os testes e confirmar FAIL.**
- [ ] **Step 3: Refatorar header para CTA curto, links reais, foco visível e fechamento por Escape/seleção.**
- [ ] **Step 4: Refatorar footer para conter apenas produto, ajuda, operador e políticas verificadas.**
- [ ] **Step 5: Limitar a corujinha a duas aparições na landing e tornar suas falas informativas; interromper animações GSAP/CSS/SMIL em reduced motion.**
- [ ] **Step 6: Impedir que o WhatsApp flutuante cubra conteúdo e esconder a promessa de atendimento enquanto número/operação não forem confirmados.**
- [ ] **Step 7: Validar 320, 390, 768, 1280 e 1536 px sem overflow, corte ou sobreposição.**
- [ ] **Step 8: Rodar testes, lint e typecheck; esperar PASS.**
- [ ] **Step 9: Commit e push:** `fix(mobile): devolve espaço e sossego para os polegares`.

### Task 5: SEO, analytics e performance

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/robots.ts`
- Modify: `src/lib/services/analytics-loader.ts`
- Create: `src/lib/services/marketing-events.ts`
- Create: `src/lib/services/marketing-events.test.ts`
- Create: `src/test/marketing/seo-contract.test.ts`

**Interfaces:**
- Produces: `trackMarketingEvent(name, safeParams)` com allowlist de eventos e parâmetros.
- Consumes: consentimento existente e domínio canônico configurado.

- [ ] **Step 1: Escrever testes que rejeitem `query`, `email`, `token`, `answers` e aceitem apenas posição, slug, categoria, opção e ID de FAQ.**
- [ ] **Step 2: Escrever contrato de metadata/canonical/sitemap sem review schema e sem domínio institucional incorreto.**
- [ ] **Step 3: Rodar testes e confirmar FAIL.**
- [ ] **Step 4: Implementar allowlist de eventos, condicionada ao consentimento, e conectar CTAs/filtros/FAQ.**
- [ ] **Step 5: Corrigir metadata e dados estruturados verificáveis; carregar prévia pesada dinamicamente com dimensões reservadas.**
- [ ] **Step 6: Rodar testes, typecheck e build; esperar PASS.**
- [ ] **Step 7: Commit e push:** `perf(marketing): deixa a home contar a história sem carregar a mudança`.

### Task 6: E2E, revisão visual e acabamento da PR

**Files:**
- Create: `e2e/landing-commercial.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `CHANGELOG.md` se exigido pelo padrão da versão
- Modify: `worklog.md` se houver decisão nova relevante

**Interfaces:**
- Consumes: landing, catálogo, páginas de modelo e fluxo de criação concluídos.
- Produces: cobertura do funil público e evidências da PR.

- [ ] **Step 1: Criar E2E para home → catálogo → busca `procuracao` → Procuração Simples → começar, além de menu por teclado e compatibilidade do deep link antigo.**
- [ ] **Step 2: Rodar `bunx playwright test e2e/landing-commercial.spec.ts`; corrigir apenas falhas dentro do escopo até PASS.**
- [ ] **Step 3: Rodar `bun run test`, `bun run test:rules`, `bun run test:firestore-commit`, `bun run lint`, `bun run typecheck`, `bun run build:ci` e `bun run test:e2e`.**
- [ ] **Step 4: Inspecionar visualmente visitante, autenticado, loading, erro e vazio nos cinco tamanhos; salvar screenshots comparativas fora do bundle da aplicação.**
- [ ] **Step 5: Revisar o diff, procurar alegações sem fonte, controles inertes, dados pessoais em eventos, arquivos secretos e mudanças alheias.**
- [ ] **Step 6: Solicitar revisão independente e corrigir achados relevantes.**
- [ ] **Step 7: Commit e push:** `test(landing): confere o caminho inteiro até o documento`.
- [ ] **Step 8: Abrir PR usando `.github/PULL_REQUEST_TEMPLATE.md`, anexar evidências e não fazer merge ou deploy.**

