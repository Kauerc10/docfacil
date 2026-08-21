# DocFácil/Ninhal — AbacatePay Real Billing Design

## Contexto

A branch `refactor/document-engine-v1` já fecha o lifecycle comercial da V1 em modo demo:

- conta grátis com 1 geração elegível por mês;
- documento avulso por R$ 19,90, inclusive para guest;
- Pro por R$ 39,90/mês, apenas para usuário autenticado;
- `OrderRecord` server-side;
- reserva/consumo atômico de compra avulsa;
- entitlement server-authoritative;
- rascunho preservado ao bater no paywall;
- retomada após checkout;
- geração/versionamento e PDF em R2.

O objetivo desta rodada é substituir o billing demo por pagamento real via AbacatePay v2 sem enfraquecer essas garantias.

A marca será migrada para **Ninhal** antes do lançamento. A integração deve usar conceitos de domínio (`avulso`, `pro`, `order`, `subscription`) e evitar acoplar regras técnicas ao nome atual da marca.

## Fontes autoritativas

1. `https://docs.abacatepay.com/llms.txt` e páginas v2 ligadas por esse índice.
2. Código e testes do repositório `Kauerc10/docfacil`, especialmente a branch `refactor/document-engine-v1`.
3. Skills oficiais da AbacatePay podem orientar implementação, mas não substituem a documentação v2 ao vivo quando houver divergência.

Divergências encontradas durante o design:

- a página de criação de assinatura afirma que assinaturas suportam apenas `CARD`, mas o mesmo schema lista `PIX` e `CARD`;
- a documentação de eventos mostra `subscription.completed` e `subscription.renewed` para PIX e cartão;
- a página de eventos documenta `subscription.payment_failed`, enquanto a enumeração de eventos aceita em outras páginas pode não listá-lo;
- skills mais antigas exemplificam `billing.paid`, enquanto a API v2 atual usa `checkout.completed`, `transparent.completed` e eventos `subscription.*`.

Portanto, nomes e contratos de eventos devem seguir a v2 ao vivo e o handler deve tolerar campos/eventos adicionais sem quebrar.

## Decisões aprovadas

### Avulso R$ 19,90

Estratégia B:

- **PIX:** checkout transparente dentro do Ninhal;
- **Cartão:** checkout hospedado pela AbacatePay;
- boleto não entra na V1;
- parcelamento não entra na V1;
- o navegador nunca recebe a API key;
- retorno do checkout nunca concede acesso sozinho.

### Pro R$ 39,90/mês

- checkout de assinatura hospedado pela AbacatePay;
- cartão suportado desde a primeira versão;
- arquitetura preparada para PIX recorrente;
- `PIX` no Pro fica atrás da capability `ABACATEPAY_SUBSCRIPTION_PIX_ENABLED=false`;
- a capability só passa para `true` depois de Dev Mode comprovar criação, `subscription.completed`, renovação e cancelamento com PIX.

### Autoridade de pagamento

O Firestore do aplicativo continua sendo a fonte de verdade de entitlement.

A AbacatePay informa que ocorreu um evento financeiro. O backend valida esse evento e então atualiza a ordem/assinatura local.

Nunca vale como confirmação de pagamento:

- query string `orderId`;
- retorno para `completionUrl`;
- estado React/localStorage;
- `checkoutUrl` existente;
- botão “já paguei”;
- resposta client-side não confirmada por backend.

## Fluxo final — compra avulsa por PIX

```text
CheckoutView
  -> POST /api/checkout/create { product: avulso, method: pix }
  -> backend deriva R$ 19,90 de pricing.ts
  -> cria OrderRecord pending
  -> POST AbacatePay /v2/transparents/create
       method=PIX
       data.amount=1990
       data.externalId=<orderId>
       data.metadata.product=avulso
  <- providerPaymentId + brCode + brCodeBase64 + expiresAt
  -> persiste provider ref na ordem
  <- devolve QR/copia-e-cola ao browser

Browser exibe QR dentro do Ninhal
  -> consulta apenas o status da ordem local

AbacatePay
  -> POST /api/webhooks/abacatepay?webhookSecret=...
     event=transparent.completed

Webhook
  -> valida secret da URL
  -> valida X-Webhook-Signature sobre raw body
  -> valida apiVersion=2 e ambiente esperado
  -> usa event.id para idempotência
  -> resolve order por externalId
  -> exige product=avulso
  -> exige amount=paidAmount=1990
  -> exige método PIX e status PAID
  -> marca ordem paid
  -> grava evento processado
  -> 200

Browser percebe order=paid
  -> retoma draft
  -> chama finalize/versions com orderId
  -> lifecycle existente reserva e consome a ordem atomicamente
  -> PDF limpo é produzido
```

## Fluxo final — compra avulsa por cartão

```text
CheckoutView
  -> POST /api/checkout/create { product: avulso, method: card }
  -> backend cria OrderRecord pending
  -> POST /v2/checkouts/create
       items=[ABACATEPAY_AVULSO_PRODUCT_ID]
       methods=[CARD]
       externalId=<orderId>
       completionUrl=<origem confiável>/...?billingReturn=1&orderId=...
       returnUrl=<mesma origem confiável>
  <- bill_* + url
  -> persiste providerCheckoutId
  <- browser recebe somente hosted checkout URL

Browser redireciona para AbacatePay

AbacatePay
  -> checkout.completed webhook

Webhook
  -> valida assinatura/secret/idempotência
  -> localiza order por externalId ou providerCheckoutId
  -> valida produto, valor, paidAmount, status e ambiente
  -> marca order paid

Usuário retorna
  -> tela não assume sucesso
  -> consulta status local
  -> só retoma finalização quando order=paid
```

## Fluxo final — Pro

```text
Usuário autenticado
  -> POST /api/checkout/create { product: pro, method: card }
  -> backend exige principal autenticado
  -> cria OrderRecord product=pro pending
  -> POST /v2/subscriptions/create
       items=[ABACATEPAY_PRO_PRODUCT_ID]
       methods=[CARD]  // PIX somente quando capability aprovada
       completionUrl=<origem confiável>/...?billingReturn=1&orderId=...
  <- hosted checkout id/url
  -> order.providerCheckoutId = bill_*

AbacatePay
  -> subscription.completed

Webhook
  -> encontra order pelo checkout.id (não depender de checkout.externalId)
  -> valida item do Pro, amount=3990, currency=BRL, frequency=MONTHLY, status=ACTIVE
  -> marca order paid
  -> cria/atualiza BillingSubscription do usuário
  -> plano cacheado passa para pro
  -> define paidThrough/accessUntil

subscription.renewed
  -> valida subscriptionId, item, valor e pagamento
  -> avança paidThrough/accessUntil
  -> mantém Pro

subscription.payment_failed, se entregue
  -> registra falha/retry sem revogar período já pago

subscription.cancelled
  -> autoRenew=false / providerStatus=CANCELLED
  -> não apaga imediatamente o período já pago do Ninhal
  -> entitlement Pro continua somente até accessUntil
```

## Cancelamento e período já pago

A API atual da AbacatePay cancela a assinatura imediatamente (`cancelPolicy: NOW`). Para não retirar do cliente um período já pago:

- a chamada ao provider interrompe cobranças futuras imediatamente;
- o Ninhal mantém o entitlement até `accessUntil` calculado a partir do último pagamento confirmado;
- após `accessUntil`, o backend deixa de conceder Pro mesmo que o campo de UI `plano` ainda esteja desatualizado;
- `plano` é um cache de apresentação, não a autoridade final da assinatura real.

Não será necessário cron apenas para expirar acesso: `resolveEntitlement` verifica `accessUntil > now` em cada operação protegida.

## Modelo de domínio

### OrderRecord

Evoluir o registro atual para:

```ts
export type BillingProviderName = "demo" | "abacatepay";
export type PaymentMethod = "pix" | "card";

export interface OrderRecord {
  id?: string;
  provider: BillingProviderName;
  product: "avulso" | "pro";
  amountCents: number;
  buyer:
    | { type: "guest"; email?: string; phone?: string }
    | { type: "user"; userId: string; email?: string };
  status: "pending" | "paid" | "reserved" | "consumed" | "failed" | "refunded";
  method?: PaymentMethod;
  providerPaymentId?: string;
  providerCheckoutId?: string;
  providerSubscriptionId?: string;
  providerStatus?: string;
  providerDevMode?: boolean;
  documentId?: string;
  reservedByRequestId?: string;
  reservedAt?: number;
  createdAt: number;
  paidAt?: number;
  consumedAt?: number;
}
```

O lifecycle `reserved/consumed` continua exclusivo da compra avulsa usada para gerar um documento.

### BillingSubscription

Nova entidade server-only, uma assinatura real por usuário:

```ts
export interface BillingSubscriptionRecord {
  userId: string;
  provider: "abacatepay";
  providerSubscriptionId: string;
  providerCheckoutId?: string;
  product: "pro";
  providerProductId: string;
  method: "pix" | "card";
  status: "active" | "cancelled" | "past_due";
  autoRenew: boolean;
  amountCents: 3990;
  paidThrough: number;
  lastPaidAt: number;
  lastPaymentId?: string;
  lastFailureAt?: number;
  updatedAt: number;
  createdAt: number;
}
```

### BillingWebhookEvent

Coleção server-only para idempotência:

```ts
export interface BillingWebhookEventRecord {
  id: string; // log_*
  provider: "abacatepay";
  event: string;
  devMode: boolean;
  processedAt: number;
  targetId?: string;
}
```

Não é necessário persistir o payload completo com PII. Logs devem continuar usando a sanitização já existente.

## BillingProvider

A interface real deve modelar capacidades, não endpoints da AbacatePay:

```ts
export interface BillingProvider {
  createOneTimePayment(input: CreateOneTimePaymentInput): Promise<OneTimePaymentResult>;
  createSubscription(input: CreateSubscriptionInput): Promise<HostedSubscriptionResult>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
}
```

Resultados de pagamento avulso são discriminados:

```ts
type OneTimePaymentResult =
  | {
      kind: "pix";
      providerPaymentId: string;
      brCode: string;
      brCodeBase64: string;
      expiresAt: string;
    }
  | {
      kind: "hosted";
      providerCheckoutId: string;
      checkoutUrl: string;
    };
```

O `DemoBillingProvider` continua existindo para desenvolvimento/testes e Preview controlado, mas produção final continua fail-closed.

## Cliente AbacatePay

Usar `fetch` server-side com um cliente pequeno e tipado, em vez de introduzir SDK como dependência apenas por conveniência.

Regras:

- base URL fixa `https://api.abacatepay.com/v2`;
- `Authorization: Bearer ${ABACATEPAY_API_KEY}`;
- timeout explícito via `AbortSignal.timeout`;
- erro do provider é mapeado para erro interno seguro;
- nunca logar API key, CPF, cartão, QR payload inteiro ou raw webhook;
- respostas críticas devem ser validadas de forma focada;
- webhooks não devem usar schema rígido do payload inteiro, para tolerar novos campos.

## Webhook

Endpoint:

```text
POST /api/webhooks/abacatepay?webhookSecret=<secret>
```

Ordem de processamento:

1. capturar `rawBody` via `req.text()`;
2. validar `webhookSecret` com comparação constante;
3. validar `X-Webhook-Signature` HMAC-SHA256 conforme documentação atual;
4. parsear JSON apenas depois da autenticação do corpo;
5. validar envelope mínimo: `id`, `event`, `apiVersion`, `devMode`, `data`;
6. recusar `apiVersion !== 2`;
7. recusar evento de ambiente incompatível com a configuração atual;
8. iniciar transação Firestore;
9. se `billing_webhook_events/{eventId}` já existir, retornar 200 sem reprocessar;
10. validar invariantes financeiras do evento;
11. atualizar ordem/assinatura/plano;
12. criar `billing_webhook_events/{eventId}` na mesma transação;
13. retornar 200 apenas depois do commit.

Eventos V1:

- `transparent.completed`;
- `transparent.refunded`;
- `transparent.disputed`;
- `transparent.lost` quando configurável;
- `checkout.completed`;
- `checkout.refunded`;
- `checkout.disputed`;
- `checkout.lost`;
- `subscription.completed`;
- `subscription.renewed`;
- `subscription.cancelled`;
- `subscription.payment_failed` se a AbacatePay permitir cadastrá-lo/entregá-lo no ambiente usado.

Eventos desconhecidos autenticados devem resultar em 200 com `ignored: true`, nunca derrubar o endpoint.

## Validações financeiras obrigatórias

Antes de conceder entitlement:

### Avulso

- ordem existe;
- `order.provider === "abacatepay"`;
- `order.product === "avulso"`;
- `order.amountCents === 1990`;
- evento confirma `amount === 1990`;
- evento confirma `paidAmount === 1990`;
- método esperado coincide;
- status provider é pago;
- `devMode` coincide com ambiente esperado;
- para cartão, item deve conter `ABACATEPAY_AVULSO_PRODUCT_ID`.

### Pro

- order pertence a usuário autenticado;
- `order.product === "pro"`;
- valor esperado é 3990;
- `subscription.amount === 3990`;
- `currency === "BRL"`;
- `frequency === "MONTHLY"`;
- checkout contém `ABACATEPAY_PRO_PRODUCT_ID`;
- `subscription.status === "ACTIVE"` em completed/renewed;
- providerSubscriptionId deve corresponder à assinatura já vinculada em renovações/cancelamentos.

Qualquer mismatch financeiro retorna erro server-side e não concede acesso.

## UX do checkout

### Avulso

A tela passa a oferecer duas escolhas claras:

```text
Como prefere pagar?

[ PIX — recomendado ]
Aprovação rápida

[ Cartão de crédito ]
Pagamento seguro pela AbacatePay
```

Ao escolher PIX:

- cria cobrança apenas quando usuário confirma;
- exibe QR Code e copia-e-cola;
- botão “Copiar código Pix”;
- relógio/estado de expiração baseado em `expiresAt`;
- polling leve do status local, nunca da API key no browser;
- ao detectar `paid`, retoma automaticamente a finalização preservada;
- refresh da página deve conseguir recuperar ordem pendente usando `orderId` e não criar uma nova cobrança automaticamente.

Ao escolher cartão:

- redireciona para hosted checkout;
- retorno mostra “Confirmando pagamento…” enquanto aguarda webhook;
- só prossegue quando o status local for `paid`.

### Pro

- exige login como já ocorre hoje;
- botão principal cria assinatura hospedada;
- capability define os métodos enviados;
- retorno aguarda `subscription.completed` antes de `refreshProfile()`;
- Perfil mostra método, estado de renovação e ação de cancelar quando houver assinatura real.

## Endpoint de status local

Criar rota autenticada/guest-safe limitada ao pedido:

```text
GET /api/checkout/status?orderId=...
```

Ela retorna apenas:

```ts
{
  orderId: string;
  product: "avulso" | "pro";
  status: "pending" | "paid" | "reserved" | "consumed" | "failed" | "refunded";
  method?: "pix" | "card";
}
```

Ownership:

- ordem de usuário exige mesmo usuário;
- ordem guest exige fingerprint seguro derivado do contato preservado, nunca apenas conhecer o `orderId`;
- nenhuma referência sensível do provider é necessária no browser.

## Firestore e regras

Coleções server-only adicionais:

```text
billing_subscriptions/{userId}
billing_webhook_events/{eventId}
```

As regras devem negar leitura/escrita direta do client nessas coleções.

`orders` continua server-only para escrita. O status público do checkout é servido por API server-side com ownership explícito.

## Variáveis de ambiente

Server-only:

```text
ABACATEPAY_API_KEY
ABACATEPAY_WEBHOOK_SECRET
ABACATEPAY_WEBHOOK_HMAC_KEY
ABACATEPAY_AVULSO_PRODUCT_ID
ABACATEPAY_PRO_PRODUCT_ID
ABACATEPAY_SUBSCRIPTION_PIX_ENABLED=false
```

`ABACATEPAY_WEBHOOK_HMAC_KEY` começa com o valor público vigente documentado pela AbacatePay, mas fica configurável para permitir rotação sem alteração de código.

Nenhuma dessas variáveis usa prefixo `NEXT_PUBLIC_`.

### Vercel Preview

- API key Dev Mode;
- produtos criados no Dev Mode;
- webhook Dev Mode apontando para um alias HTTPS estável da branch de integração;
- `ABACATEPAY_SUBSCRIPTION_PIX_ENABLED=false` até os gates de PIX recorrente passarem.

### Vercel Production

- API key de produção distinta;
- produtos de produção distintos;
- webhook de produção distinto;
- secrets configurados como Sensitive;
- produção não pode iniciar se credenciais reais necessárias estiverem ausentes quando o provider ativo for `abacatepay`.

## Produtos da AbacatePay

Criar manualmente uma vez por ambiente, nunca durante request de checkout:

### Avulso

```text
externalId: ninhal-avulso-v1
name: Documento avulso
price: 1990
currency: BRL
cycle: omitido
```

### Pro

```text
externalId: ninhal-pro-monthly-v1
name: Ninhal Pro
price: 3990
currency: BRL
cycle: MONTHLY
```

Os IDs `prod_*` resultantes são armazenados nas env vars de cada ambiente.

## Permissões da API key

Aplicar menor privilégio. A documentação v2 mostra permissões específicas por recurso e há divergência com listas antigas. A chave do app deve receber somente as permissões exigidas pelos endpoints efetivamente usados, incluindo criação/leitura de checkout/transparent e criação/cancelamento de subscription quando os nomes atuais estiverem disponíveis no dashboard.

Não conceder saque, transferência PIX, Connect, Store mutation, cupom ou deleção de produto ao runtime do Ninhal.

## Tratamento de refund/disputa

V1 deve registrar os eventos financeiros, sem tentar apagar PDFs já emitidos.

- `*.refunded`: ordem muda para `refunded`; Pro não recebe novo período a partir do pagamento reembolsado;
- `*.disputed`: registrar providerStatus e sinalizar para observabilidade;
- `*.lost`: revogar entitlement futuro relacionado quando aplicável;
- documento avulso já consumido não é apagado automaticamente por webhook financeiro.

Política comercial/jurídica de retirada de acesso de artefato após refund fica fora desta integração técnica e deve ser definida separadamente antes de automatizar deleção.

## Observabilidade

Logs estruturados e sanitizados:

- `billing.checkout.created`;
- `billing.webhook.accepted`;
- `billing.webhook.duplicate`;
- `billing.webhook.rejected`;
- `billing.payment.confirmed`;
- `billing.subscription.activated`;
- `billing.subscription.renewed`;
- `billing.subscription.cancelled`;
- `billing.provider.error`.

Nunca logar raw webhook nem dados de documento.

## Prérequisito de execução

A PR #20 deve estar GREEN e preferencialmente mergeada antes da branch de implementação de billing real.

No momento deste design, o Preview da branch está `READY`, porém o GitHub Actions mais recente observado ainda falha em dois testes de `Production Server Configuration Assertions` ligados a `ALLOW_IN_MEMORY_REPOSITORIES`. Esse problema é anterior à integração AbacatePay e deve ser resolvido primeiro para não introduzir dinheiro real sobre uma base com fail-closed vermelho.

## Testes mínimos

### Unit/domain

- preços 1990/3990 permanecem canônicos;
- provider nunca recebe preço vindo do browser;
- guest Pro é rejeitado;
- avulso PIX cria order antes da cobrança externa;
- avulso card cria checkout com apenas CARD;
- Pro cria subscription com apenas CARD quando capability=false;
- capability=true adiciona PIX somente ao Pro;
- webhook HMAC inválido é 401;
- secret inválido é 401;
- ambiente incompatível é rejeitado;
- duplicate event ID é idempotente;
- valor errado nunca marca paid;
- produto errado nunca marca paid;
- checkout return sem webhook não marca paid;
- `subscription.completed` ativa Pro;
- `subscription.renewed` estende accessUntil;
- `subscription.cancelled` para renovação mas preserva accessUntil já pago;
- entitlement Pro expira por relógio mesmo sem cron.

### Firestore emulator

- order + billing event são atualizados atomicamente;
- dois webhooks iguais não pagam duas vezes;
- dois eventos concorrentes não criam duas subscriptions;
- collections novas são server-only;
- reserva/consumo avulso existente continua atômico.

### E2E Dev Mode

1. guest avulso PIX -> QR -> simulate-payment -> webhook -> PDF;
2. usuário autenticado avulso PIX -> pagamento -> documento/versão;
3. guest avulso cartão -> hosted checkout teste `4242` -> retorno -> PDF;
4. cartão rejeitado -> order não fica paid;
5. Pro cartão -> subscription.completed -> refresh profile -> recursos Pro;
6. Pro cancel -> cobrança futura cancelada, acesso preservado até accessUntil;
7. repetir webhook -> nenhum efeito duplicado;
8. Pro PIX somente após capability gate, validando completed + renewed + cancelled.

## Gates de lançamento

Antes de Production:

```text
bun run test
bun run test:rules
bun run test:firestore-commit
bun run lint
bun run typecheck
bun run build:ci
bun run test:e2e
```

Além disso:

- smoke real no Vercel Preview com chave Dev Mode;
- webhook HMAC real recebido pelo Preview;
- cartão aprovado e recusado testados;
- PIX transparente simulado e confirmado por webhook;
- nenhuma chave exposta em bundle/client logs;
- produtos e valores conferidos no dashboard;
- produção final continua recusando demo billing.

## Fora de escopo

- boleto;
- parcelamento;
- Apple Pay/Google Pay/PicPay;
- cupons;
- upsell;
- checkout transparente de cartão;
- split;
- emissão automática de NFS-e;
- saques automáticos;
- transferência PIX;
- criação automática de produtos em runtime;
- analytics/Meta Pixel;
- rebranding completo DocFácil -> Ninhal;
- política comercial de refund além da atualização financeira mínima;
- migração de dados históricos demo para cobranças reais.

## Critério de pronto

A integração está pronta quando:

1. uma compra avulsa por PIX permanece inteiramente dentro do Ninhal até a confirmação;
2. cartão avulso usa checkout hospedado e retorno não concede acesso sozinho;
3. pagamento confirmado por webhook transforma a ordem local em `paid` uma única vez;
4. o lifecycle atual reserva/consome a ordem e gera PDF sem marca d'água;
5. assinatura Pro só ativa após `subscription.completed` válido;
6. renovação mantém acesso e cancelamento impede renovação sem confiscar período já pago;
7. ambientes Dev/Prod ficam isolados por chave, produto e webhook;
8. nenhum segredo chega ao client;
9. todos os gates automatizados e o E2E Dev Mode estão verdes.