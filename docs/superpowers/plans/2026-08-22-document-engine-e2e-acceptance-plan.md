# Document Engine E2E Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatizar os fluxos críticos de homologação do Document Engine V1 com Playwright real, incluindo autenticação, billing, versionamento, rascunhos, condicionais e smoke dos 9 modelos.

**Architecture:** A suíte usará Firebase Auth + Firestore Emulator para identidade real no browser/backend, repositórios de documentos em memória no sandbox atual e helpers E2E reutilizáveis para eliminar duplicação. Cenários profundos ficam separados dos smokes parametrizados dos modelos.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase Auth/Firestore Emulator, Playwright 1.62, Bun, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-22-document-engine-e2e-acceptance-design.md`

## Global Constraints

- Trabalhar somente em `refactor/document-engine-v1`.
- PR #20 permanece Draft e não deve ser mergeada nesta execução.
- RED deve ser observado antes de qualquer mudança de produção necessária.
- Nenhuma credencial real ou dependência de internet pública nos E2Es.
- Sem `waitForTimeout` como sincronização de fluxo.
- CPFs, datas e demais dados estruturais devem ser válidos.
- Commits em português, pequenos e atribuídos a `Kauerc10`.

---

### Task 1: Sessão autenticada real no E2E

**Files:**
- Create: `e2e/support/auth.ts`
- Create: `e2e/authenticated-session.spec.ts`
- Modify: `firebase.json`
- Modify: `playwright.config.ts`
- Modify: `package.json`
- Modify: `src/lib/firebase.ts`

**Interfaces:**
- Produces: `createAuthenticatedAccount(page, options?)` e ambiente Auth/Firestore Emulator disponível em `bun run test:e2e`.

- [ ] Escrever teste que cria conta pela UI e exige que `/api/documents` seja chamado com `Authorization: Bearer ...`.
- [ ] Rodar E2E e observar RED com o sandbox atual em modo demo sem token Firebase real.
- [ ] Adicionar Auth Emulator ao `firebase.json` e ao script `test:e2e`.
- [ ] Conectar `firebase/auth` e `firebase/firestore` aos emuladores somente quando variáveis E2E explícitas existirem.
- [ ] Configurar `playwright.config.ts` com credenciais públicas fictícias e endpoints locais dos emuladores.
- [ ] Rodar o teste isolado e depois a suíte E2E atual.
- [ ] Commitar GREEN.

### Task 2: Helpers determinísticos de documento e checkout

**Files:**
- Create: `e2e/support/navigation.ts`
- Create: `e2e/support/document-form.ts`
- Create: `e2e/support/checkout.ts`
- Create: `e2e/support/test-data.ts`
- Modify: `e2e/guest-purchase.spec.ts`

**Interfaces:**
- Produces: `acceptOptionalCookies`, `waitForSearchParams`, `mockCepLookup`, `fillDocumentUntilFinalization`, `completeDemoCheckout` e geradores de dados válidos.

- [ ] Extrair helpers sem alterar comportamento.
- [ ] Interceptar ViaCEP com resposta local determinística.
- [ ] Garantir geradores/fixtures válidos para CPF, CEP, telefone, data e moeda.
- [ ] Refatorar os dois E2Es guest existentes para os helpers.
- [ ] Rodar os 8 E2Es atuais e exigir paridade verde antes de adicionar cobertura nova.
- [ ] Commitar refactor.

### Task 3: Guest idempotente com reload e download real

**Files:**
- Modify: `e2e/guest-purchase.spec.ts`

- [ ] Escrever cenário que conta requests de `/api/documents/finalize`, conclui checkout e recarrega a página/URL terminal sem nova geração.
- [ ] Exigir resposta 200 da rota de download e botão funcional, não apenas visível.
- [ ] Observar RED caso algum comportamento ainda esteja incompleto.
- [ ] Corrigir produção somente se o RED provar bug real.
- [ ] Rodar cenário + suíte E2E.
- [ ] Commitar.

### Task 4: Conta Free, cota e paywall

**Files:**
- Create: `e2e/free-entitlement.spec.ts`

- [ ] Criar conta real no Auth Emulator.
- [ ] Gerar `declaracao-residencia` gratuitamente e confirmar documento concluído/biblioteca.
- [ ] Tentar nova geração gratuita no mesmo mês e confirmar `FREE_LIMIT_REACHED` convertido em paywall, não erro genérico.
- [ ] Abrir modelo não elegível e confirmar paywall antes de consumo indevido de cota.
- [ ] Rodar isolado e suíte.
- [ ] Commitar.

### Task 5: Avulso autenticado e nova versão após paywall

**Files:**
- Create: `e2e/authenticated-purchase.spec.ts`

- [ ] Criar conta Free real.
- [ ] Comprar um modelo pago autenticado sem novo consentimento de guest.
- [ ] Confirmar geração final e biblioteca.
- [ ] Editar documento existente, cair no paywall de versão e comprar avulso.
- [ ] Confirmar criação de v2, preservação de v1 e ausência de loop/500.
- [ ] Rodar isolado e suíte.
- [ ] Commitar.

### Task 6: Upgrade Pro e histórico de versões

**Files:**
- Create: `e2e/pro-versioning.spec.ts`

- [ ] Criar conta Free.
- [ ] Passar por paywall e ativar Pro pelo provider demo.
- [ ] Confirmar atualização de perfil sem recarregar sessão manualmente.
- [ ] Gerar/editar documento e criar nova versão.
- [ ] Confirmar v1 preservada e v2 atual.
- [ ] Confirmar artefato Pro sem indicação visual de watermark de plano Free quando observável pela UI/metadado.
- [ ] Rodar isolado e suíte.
- [ ] Commitar.

### Task 7: Rascunhos, retomada e duplicação

**Files:**
- Create: `e2e/drafts-library.spec.ts`

- [ ] Criar conta autenticada e preencher parte de um documento.
- [ ] Salvar rascunho, sair do fluxo e retomá-lo pela biblioteca.
- [ ] Confirmar valores hidratados e finalizar.
- [ ] Duplicar documento concluído.
- [ ] Confirmar novo rascunho preenchido, identidade própria e sem criação prematura de novo documento final.
- [ ] Rodar isolado e suíte.
- [ ] Commitar.

### Task 8: Condicionais e moradores adicionais

**Files:**
- Create: `e2e/conditional-fields.spec.ts`

- [ ] Exercitar `Sim -> preencher -> Não` em campo condicional de sinal/arras e confirmar que o dado oculto não reaparece no estado final/preview observável.
- [ ] Exercitar moradores adicionais na locação com nomes contendo espaços.
- [ ] Voltar e avançar etapas para confirmar persistência correta sem travar teclado/campos.
- [ ] Rodar isolado e suíte.
- [ ] Commitar.

### Task 9: Smoke parametrizado dos 9 modelos

**Files:**
- Create: `e2e/support/model-fixtures.ts`
- Create: `e2e/document-models-smoke.spec.ts`

**Interfaces:**
- Produces: lista única `OFFICIAL_MODEL_SLUGS` e overrides mínimos por modelo.

- [ ] Criar fixture semântica explícita para os 9 slugs oficiais.
- [ ] Para cada slug, abrir criação e percorrer todas as etapas com dados válidos.
- [ ] Confirmar que chega ao estado de finalização esperado sem erro de validação inesperado.
- [ ] Para um entitlement autenticado controlado, confirmar geração de PDF para cada modelo sem repetir checkout real nove vezes.
- [ ] Confirmar ausência de placeholders `{{...}}` na representação/preview disponível.
- [ ] Rodar matriz isolada e depois suíte completa.
- [ ] Commitar.

### Task 10: Smoke mobile crítico

**Files:**
- Create: `e2e/mobile-critical-flow.spec.ts`

- [ ] Usar viewport de telefone apenas neste spec.
- [ ] Percorrer criação -> paywall/checkout -> sucesso em um modelo representativo.
- [ ] Confirmar CTA principal visível/clicável, ausência de scroll horizontal e nenhuma tela presa por overflow.
- [ ] Rodar isolado e suíte.
- [ ] Commitar.

### Task 11: Gate final de pré-merge

**Files:**
- Modify: PR #20 body only if needed.

- [ ] Rodar `bun run test`.
- [ ] Rodar Firestore Rules.
- [ ] Rodar Firestore atomic commit integration.
- [ ] Rodar ESLint.
- [ ] Rodar TypeScript.
- [ ] Rodar production build.
- [ ] Rodar `bun run test:e2e` completo duas vezes para detectar flakiness.
- [ ] Confirmar Vercel READY + HTTP 200 no mesmo HEAD.
- [ ] Confirmar author/committer `Kauerc10` no HEAD.
- [ ] Atualizar evidência da PR, mantendo Draft e sem merge.
