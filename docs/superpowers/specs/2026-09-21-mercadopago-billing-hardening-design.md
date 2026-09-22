# Spec: Hardening do Mercado Pago (Webhooks, Assinatura Recorrente, Retorno de Checkout e Cartão Avulso)

## Problem Statement

Na análise técnica do PR #33, foram identificados quatro gaps no fluxo de cobrança do Mercado Pago:
1. **Webhooks de aprovação bloqueados:** A deduplicação por ID do pagamento (`event.id`) bloqueava a notificação `payment.updated` subsequente à criação `payment.created`, impedindo a marcação de pedidos Pix como pagos via webhook.
2. **Assinatura Pro não-recorrente:** O método criava uma preferência comum de cobrança avulsa no Checkout Pro em vez de uma assinatura recorrente real (preapproval), concedendo plano vitalício com apenas um pagamento de R$ 34,90.
3. **Retorno do Checkout Pro caindo em tela de erro:** O redirecionamento pós-checkout enviava o usuário para `?view=sucesso`, que espera um documento finalizado e exibe "Documento não encontrado" para assinaturas Pro, contornando a `CheckoutView`.
4. **Método Cartão no Avulso ignorado:** Ao selecionar cartão no documento avulso, o backend ignorava o método e sempre gerava um Pix.

## Solution

Implementar o endurecimento completo da integração:
1. Granularizar a chave de deduplicação de webhooks e permitir reprocessar atualizações de status para pedidos `pending`.
2. Integrar a API de Assinaturas Recorrentes (`/preapproval`) do Mercado Pago para o Plano Pro (R$ 34,90/mês), tratando ciclo de renovação e status ativo.
3. Ajustar o fluxo de retorno de checkouts hospedados para apontar para a `CheckoutView` (`?view=checkout&plan=...&billingReturn=1&orderId=...`), permitindo verificação segura do pedido e finalização de rascunhos.
4. Suportar pagamento avulso por cartão de crédito gerando preferência no Checkout Pro quando `method === 'credit_card'`.

## User Stories

1. Como comprador de documento avulso via Pix, quero que o pagamento seja confirmado automaticamente pelo webhook mesmo após notificações prévias de criação, para que meu documento seja liberado sem depender apenas de polling no navegador.
2. Como comprador de documento avulso via Cartão de Crédito, quero ser direcionado para o checkout seguro do Mercado Pago para pagar com cartão de crédito, sem receber um QR Code Pix indesejado.
3. Como assinante do Plano Pro, quero contratar uma assinatura mensal recorrente de R$ 34,90/mês debitada automaticamente todo mês, mantendo meu plano ativo de forma transparente.
4. Como assinante do Plano Pro retornando do Mercado Pago, quero ser direcionado para a tela de checkout com confirmação e atualização do perfil, sem erros de "Documento não encontrado".
5. Como usuário que assinou o Pro a partir da edição de um rascunho, quero retornar ao meu rascunho para finalizá-lo com os benefícios Pro ativos.
6. Como sistema, quero garantir idempotência na recepção de webhooks sem descartar atualizações legítimas de status (`payment.updated` e `subscription_preapproval`).
7. Como desenvolvedor, quero que o modo demo (`DemoBillingProviderAdapter`) continue atendendo os testes locais e suítes E2E sem dependências externas.

## Implementation Decisions

- **Deduplicação de Webhooks:** Chave de deduplicação granular (`${event.type}:${event.id}:${event.action || 'status'}`) e reconsulta de pedidos não-terminais (`pending`).
- **Assinatura Recorrente (/preapproval):** Implementação de chamadas ao endpoint `/preapproval` do Mercado Pago com frequência mensal (`frequency: 1, frequency_type: 'months', transaction_amount: 34.90`) e tratamento do evento `subscription_preapproval`.
- **Retorno do Checkout:** `buildCompletionUrl` e `CheckoutView` forçam retorno para `view=checkout` com `billingReturn=1` e parâmetros de contexto.
- **Cartão no Avulso:** `createOneTimePayment` ramifica: se `method === 'credit_card'`, gera preferência no Checkout Pro e retorna `kind: 'hosted'`.

## Testing Decisions

- Testes de API Route em `route.test.ts` cobrindo entrega sequencial de webhooks, criação de preapproval e compra avulsa com cartão.
- Testes de contrato de UI garantindo URLs de retorno e seleção de método.
- Manutenção de 100% de cobertura nos testes existentes.

## Out of Scope

- Formulário de cartão transparente in-app via MercadoPago Elements (PCI compliance).
- Métodos alternativos como Boleto Bancário.

## Further Notes

- Trabalho executado na branch `fix/mercadopago-billing-hardening`.
- Revisão do Codex será solicitada e verificada antes de qualquer merge.
