# AbacatePay Dev Hardening Design

**Data:** 2026-08-24

## Objetivo

Deixar o checkout real do DocFácil/Ninhal totalmente funcional em modo Dev da AbacatePay, com comportamento reproduzível, observável e coberto por testes antes de qualquer promoção para produção.

A integração deve preservar a autoridade server-side do produto: o navegador nunca concede pagamento, plano Pro ou acesso a documento por conta própria. O frontend apenas inicia operações e consulta estado; a confirmação vem do backend após processamento de eventos confiáveis do gateway.

## Escopo aprovado

### Matriz comercial

| Identidade | Produto | PIX | Cartão |
| --- | --- | --- | --- |
| Visitante | Avulso R$ 19,90 | Sim | Sim |
| Usuário autenticado | Avulso R$ 19,90 | Sim | Sim |
| Visitante | Pro R$ 39,90/mês | Não, exige login | Não, exige login |
| Usuário autenticado | Pro R$ 39,90/mês | Não | Sim, assinatura mensal |

PIX recorrente para Pro fica explicitamente fora de escopo nesta versão.

## Estratégia de branch

A `main` recebeu o Document Engine V1 via squash no commit `78b29e18987addbc0677d432cd2b9183096274e8`. A branch `feat/abacatepay-real-billing` foi realinhada para essa base, preservando o estado anterior em `backup/abacatepay-pre-main-sync`.

A estratégia é reintroduzir apenas mudanças exclusivas da integração de pagamentos e suas integrações necessárias com UI, domínio, repositories, config e testes, sempre preferindo a implementação da `main` para Document Engine, drafts, PDF, UX de criação e contratos quando houver sobreposição não relacionada a billing.

Não serão reintroduzidos os commits de sanitização de Firebase/env que já foram revertidos. A proteção global de DOM contra extensões do Chrome também fica fora do escopo final de billing.

## Arquitetura de pagamento

```text
Checkout UI
   |
   v
POST /api/checkout/create
   |
   +--> cria OrderRecord local = pending
   |
   v
BillingProvider
   |
   +--> PIX avulso: AbacatePay transparent
   +--> cartão avulso: hosted checkout
   +--> Pro: subscription hosted checkout CARD-only

AbacatePay
   |
   v
POST /api/webhooks/abacatepay
   |
   +--> autenticação do webhook
   +--> idempotência por event id
   +--> transição de Order/Subscription
   |
   v
Order paid / Subscription active
   |
   v
/api/checkout/status + regras de entitlement
   |
   v
liberação do documento / atualização do plano
```

O polling não consulta o gateway para conceder acesso e não é autoridade sobre pagamento. Ele lê somente o estado persistido pelo backend.

## Correções obrigatórias

### 1. Polling e guestContact

O frontend não pode enviar strings vazias como `phone: ""` ou `email: ""`. Usuários autenticados não devem enviar `guestContact` ao consultar pedidos próprios. Guests devem enviar apenas campos não vazios.

Casos obrigatórios: usuário autenticado sem `guestContact`, guest email-only, guest phone-only, strings vazias omitidas e contato divergente negado.

### 2. Cartão avulso

O hosted checkout deve usar o contrato atual da API v2, incluindo `items` como objetos com `id` e `quantity`, nunca lista de strings. O `externalId` continua sendo o ID local do pedido.

### 3. Plano Pro

Pro é CARD-only em todas as camadas: UI não oferece PIX, rota rejeita Pro + PIX, provider envia somente `CARD`, assinatura usa produto recorrente configurado e guest é rejeitado antes de criar cobrança.

### 4. Cliente AbacatePay e observabilidade

O browser recebe mensagens seguras. No servidor, erros do gateway preservam somente operação/endpoint, status HTTP e código/mensagem sanitizados. Authorization, API key, webhook secret, material HMAC e corpos sensíveis nunca aparecem em logs públicos.

### 5. Webhook

O webhook segue o contrato oficial v2 vigente, operando sobre raw body, verificando autenticidade conforme a documentação, usando comparação em tempo constante, deduplicando por `event.id`, rejeitando evento inválido e rejeitando payload `devMode` em produção final.

Eventos cobertos: PIX concluído, checkout avulso concluído, assinatura criada/concluída, renovada, cancelada e falha de pagamento/renovação suportada pelo gateway. O parser usa `data.subscription`, `data.checkout` e `data.payment` reais.

### 6. Entitlement e período Pro

A ativação do Pro deriva somente de evento autenticado. O período mensal usa mês civil, não `30 * 24h`, com testes para fevereiro comum/bissexto, dia 31 e renovação quando `paidThrough` ainda está no futuro. Cancelamento desliga auto-renovação mas mantém acesso até `paidThrough`.

### 7. Smoke Dev real

O smoke script não contém segredo hardcoded. `ABACATEPAY_API_KEY` é obrigatória via ambiente.

PIX deve percorrer create -> pending -> simulate -> webhook -> paid -> polling -> finalização. Cartão avulso deve provar sucesso e rejeição sem confiar no retorno do browser. Pro deve provar assinatura CARD-only, entitlement e cancelamento.

## Segurança

- Nenhum segredo AbacatePay em código, teste, documentação executável ou bundle público.
- Production permanece fail-closed.
- O retorno do checkout não prova pagamento.
- Replay de webhook não duplica entitlement ou consumo.
- Compra avulsa continua vinculada ao comprador e ao lifecycle da `main`.

## Testes e disciplina RED -> GREEN

Cada correção segue: teste falhando pelo motivo esperado, implementação mínima, teste focal verde, regressões relacionadas verdes e commit pequeno.

## Gates para sair de Draft

A PR só fica pronta quando branch limpa sobre `main`, unitários, rotas, repositories, webhook/idempotência, lint, TypeScript, build e E2E críticos estiverem verdes; PIX Dev real, cartão avulso Dev, Pro CARD-only e cancelamento estiverem homologados; Preview Vercel estiver READY; logs não vazarem segredos; e a PR registrar evidências reais.

## Fora de escopo

PIX recorrente para Pro, novos gateways, redesign amplo, alterações desnecessárias em Firebase Auth, monkeypatch global do DOM e refatorações do Document Engine sem relação com billing.
