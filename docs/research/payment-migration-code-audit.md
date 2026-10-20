# Auditoria da migração de pagamentos — 2026-10-20

## Base analisada

Branch `feat/abacatepay-real-billing`, baseada em `6cd99fa`. Análise estática; não comprova operação em produção. Nenhum código de pagamento foi alterado nesta etapa.

## Fluxo existente e componentes a preservar

1. `src/app/api/checkout/create/route.ts`: App Check, identificação do comprador, validação de produto/método, preço calculado no servidor e criação de pedido pendente. Responde com redirecionamento ou QR Pix.
2. `src/lib/server/billing/provider.ts`: contrato para compra avulsa, assinatura e cancelamento. Útil como fronteira, mas faltam dados do pagador, consulta autoritativa e idempotência explícita.
3. `src/lib/services/checkout-service.ts` e views de checkout/Pix: navegação, persistência de sessão, retorno e consulta do pedido. Preservar experiência, substituindo referências e estados do gateway.
4. `src/app/api/checkout/status/route.ts`: autorização de consulta e leitura do estado local. Hoje não reconcilia com o provedor.
5. `src/app/api/webhooks/abacatepay/route.ts`: confirmação do avulso e ciclo Pro. Extrair regras de negócio; substituir integralmente autenticação e interpretação dos eventos.
6. Repositórios Firestore: pedidos, assinaturas e reserva de eventos. Preservar a separação entre persistência e gateway.
7. Entitlements e orquestrador: pedido pago/reservado libera uma compra; consumo vincula o documento; Pro usa período pago. Preservar liberação pelo servidor, nunca pelo retorno do checkout.

## Problemas concretos a resolver durante a migração

- Gateway fixo na rota de criação, nos tipos de pedidos/assinaturas, no cliente e na configuração. Criar seleção explícita e impedir fallback demonstrativo em produção.
- Contato apenas por telefone é permitido no avulso, e o contrato do provider não recebe comprador. Adaptar coleta conforme requisitos reais da API escolhida, sem inventar e-mail.
- Pedido nasce antes da validação da URL de retorno; falhas externas deixam pedidos pendentes. Validar antes, persistir tentativa/chave idempotente e permitir recuperação segura.
- Webhook Pix atual valida status/método, mas não compara o valor efetivamente pago nessa função. Novo processamento deve consultar API e verificar valor, moeda, recebedor, ambiente e referência interna.
- Deduplicação atual é por ID da notificação. Uma mesma cobrança pode gerar notificações diferentes: deduplicar também o efeito financeiro por ID da cobrança.
- `FirestoreOrdersRepository.markOrderPaid` faz update incondicional para `paid`: uma nova notificação após consumo pode reabrir o pedido. Tornar transições condicionais e preservar estados `reserved`/`consumed` e reversões financeiras.
- `renewProSubscription` soma um mês a cada chamada; isso não é seguro sem registro transacional da cobrança aplicada. Não prorrogar acesso duas vezes para o mesmo pagamento.
- Reserva Firestore de evento não tem expiração: queda após claim pode impedir reprocessamento indefinidamente. Implementar lease recuperável e conclusão atômica dos efeitos.
- Assinatura é atualizada por `set(..., merge: true)`, sem transação conjunta com cobrança/evento. Evitar perda de atualização concorrente e estado regressivo por eventos antigos.
- Pro tem valor literal `3990`, provider literal e formato mensal do AbacatePay. Centralizar preço, registrar cobranças por período e separar autorização da assinatura de pagamento aprovado.
- `hasCurrentProAccess` consulta apenas `paidThrough`. Definir revogação para estorno/chargeback; cancelamento de renovação deve preservar apenas o período legitimamente pago.
- Há estado `refunded` no domínio, mas o dispatcher analisado não processa estornos/chargebacks; faltam também fluxos completos de expiração e reconciliação.
- A autorização guest de consulta usa contato e ID do pedido. Considerar credencial opaca por pedido, sem tratar conhecimento do contato como autenticação forte.

## Arquitetura proposta

Frontend → API autenticada/App Check → serviço de checkout → provider Mercado Pago → pedido persistido.

Webhook → validação específica Mercado Pago → consulta autenticada à API → validação da cobrança → transação de cobrança/pedido/assinatura → confirmação local → liberação pelo orquestrador.

Usar o mesmo reconciliador para webhook, recuperação e consulta controlada de pedidos pendentes. Retorno do navegador apenas retoma o acompanhamento.

## Critérios para concluir a implementação

- Avulso Pix e cartão: aprovado, pendente, rejeitado, expirado, retorno interrompido e documento consumido uma única vez.
- Pro: autorização sem pagamento não libera; primeiro pagamento e renovação aprovados liberam apenas o período devido; falha, cancelamento, estorno e chargeback seguem política explícita.
- Webhooks: assinatura inválida, valor/moeda/recebedor incorretos, evento repetido, notificações diferentes da mesma cobrança, eventos fora de ordem e queda durante processamento.
- Integração Firestore com concorrência real e E2E de checkout/status/documento; mocks isolados não provam integração externa.
- Credenciais de teste e produção separadas, URL HTTPS de webhook, configuração validada e evidência real por método antes de declarar operação concluída.

Detalhes e limitações das APIs devem ser cruzados com `mercado-pago-integration-research.md`.
