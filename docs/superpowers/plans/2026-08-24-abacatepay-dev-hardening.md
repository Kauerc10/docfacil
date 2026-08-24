# AbacatePay Dev Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realinhar a integração AbacatePay sobre a `main` atual e homologar PIX avulso, cartão avulso e Pro mensal CARD-only em modo Dev com autoridade server-side, webhook idempotente e suíte completa verde.

**Architecture:** A `main` é a fonte autoritativa para Document Engine e lifecycle de documentos. A camada AbacatePay entra como provider server-side, criando `OrderRecord` local antes do gateway e alterando entitlement somente por eventos autenticados. O frontend apenas inicia checkout e consulta estado persistido.

**Tech Stack:** Next.js, TypeScript, Bun, Firebase Auth/Admin, Firestore, Vercel, Playwright, AbacatePay API v2.

**Spec:** `docs/superpowers/specs/2026-08-24-abacatepay-dev-hardening-design.md`

## Global Constraints

- Avulso: PIX e cartão.
- Pro R$ 39,90/mês: somente cartão e exige usuário autenticado.
- PIX recorrente fica fora de escopo.
- Toda correção segue RED -> GREEN e commit pequeno.
- O navegador nunca é autoridade de pagamento.
- Nenhum segredo pode aparecer no bundle, logs públicos, testes ou smoke scripts.
- A `main` atual vence conflitos não relacionados a billing.
- O retorno do hosted checkout não concede acesso por si só.

---

### Task 1: Realinhar a branch sobre a `main`

- [x] Criar `backup/abacatepay-pre-main-sync`.
- [x] Mover a branch de billing para `main@78b29e18987addbc0677d432cd2b9183096274e8`.
- [x] Confirmar Production Vercel READY nessa base.
- [x] Regravar spec e plano sobre a branch limpa.

### Task 2: Reintroduzir domínio mínimo de billing real

**Files:** `src/lib/server/domain/documents.ts`, `src/lib/server/firestore/interfaces.ts`, repositories Firestore/in-memory, `src/lib/server/billing/provider.ts`, `subscription.ts`, `account-plan.ts` e testes de billing.

- [ ] RED: `OrderRecord` aceita provider `abacatepay`, método e refs externas.
- [ ] RED: repositories suportam lookup/update por checkout/provider e subscriptions.
- [ ] GREEN: extensão mínima sem quebrar reserva/consumo/quota da `main`.
- [ ] Commit `feat(billing): prepara domínio para cobranças reais`.

### Task 3: Cliente AbacatePay seguro e observável

**Files:** `src/lib/server/billing/abacate/client.ts`, `src/lib/server/env.ts`, `src/lib/server/config/assert-production-config.ts`, testes.

- [ ] RED para headers, timeout, erro 4xx/5xx e ausência de segredo em mensagem pública.
- [ ] GREEN com `AbacatePayClient.request<T>()` e fail-closed de produção.
- [ ] Commit `feat(billing): adiciona cliente seguro da AbacatePay`.

### Task 4: Provider v2 correto para PIX, cartão e Pro CARD-only

**Files:** `src/lib/server/billing/abacate/provider.ts`, `src/test/server/billing/abacate-provider.test.ts`.

- [ ] RED: cartão avulso envia `items: [{id, quantity:1}]` e `methods:["CARD"]`.
- [ ] RED: Pro envia item recorrente, somente CARD, com correlação ao order local.
- [ ] RED: PIX avulso usa transparent payment.
- [ ] GREEN conforme API v2 vigente.
- [ ] Commit `feat(billing): integra pagamentos v2 da AbacatePay`.

### Task 5: Rotas de checkout e polling sem contato vazio

**Files:** `src/app/api/checkout/create/route.ts`, `src/app/api/checkout/status/route.ts`, `src/lib/services/checkout-service.ts`, testes.

- [ ] RED: auth consulta sem `guestContact`.
- [ ] RED: guest email-only e phone-only.
- [ ] RED: strings vazias não são serializadas.
- [ ] RED: Pro + PIX rejeitado; guest Pro rejeitado antes do provider.
- [ ] GREEN e commit `fix(checkout): estabiliza criação e polling de pedidos`.

### Task 6: Webhook v2 autenticado e idempotente

**Files:** `src/lib/server/billing/abacate/webhook.ts`, `src/app/api/webhooks/abacatepay/route.ts`, repository de webhook events e testes.

- [ ] RED: assinatura/secret/body inválidos.
- [ ] RED: replay do mesmo event id não repete efeito.
- [ ] RED: PIX, checkout e subscription usam envelope v2 real.
- [ ] GREEN com raw body, HMAC oficial, idempotência e logs mínimos.
- [ ] Commit `feat(billing): processa webhooks v2 com idempotência`.

### Task 7: Entitlement Pro e cancelamento mensal

**Files:** `subscription.ts`, rota cancel, `entitlement.ts`, perfil e testes.

- [ ] RED: mês civil, fevereiro, bissexto e dia 31.
- [ ] RED: cancelamento mantém acesso até `paidThrough`.
- [ ] GREEN e commit `feat(billing): fecha lifecycle mensal do plano Pro`.

### Task 8: Checkout UI real preservando lifecycle da `main`

**Files:** `checkout-view.tsx`, `checkout-service.ts`, E2E guest/authenticated purchase.

- [ ] RED: matriz de métodos Avulso PIX/Card e Pro Card-only.
- [ ] RED: retorno pago preserva draft/sourceDocumentId.
- [ ] GREEN: QR/copia-e-cola/polling e hosted redirect usando lifecycle atual.
- [ ] Commit `feat(checkout): conecta experiência real de pagamento`.

### Task 9: Smoke Dev e higiene de segredos

**Files:** `scripts/test-abacatepay-live.ts`, `.env.example`, teste de segurança.

- [ ] RED: nenhum `abc_dev_` hardcoded e falha sem env.
- [ ] GREEN: store -> PIX -> check -> simulate -> check.
- [ ] Executar smoke real Dev com segredo apenas no ambiente autorizado.
- [ ] Commit `test(billing): adiciona smoke seguro da AbacatePay`.

### Task 10: Homologação e gate final

- [ ] `bun test` completo.
- [ ] lint.
- [ ] typecheck.
- [ ] build CI.
- [ ] E2E críticos de auth/guest/authenticated/document lifecycle.
- [ ] Preview Vercel READY e logs 4xx/5xx revisados.
- [ ] PIX Dev real ponta a ponta.
- [ ] Cartão avulso sandbox sucesso e rejeição.
- [ ] Pro CARD-only e cancelamento.
- [ ] Atualizar PR com números e evidências reais; manter Draft se qualquer gate falhar.

## Self-review

A spec inteira está coberta, não há placeholders e a ordem mantém domínio/provider/webhook antes da UI. Cada mudança funcional exige RED explícito antes do GREEN.
