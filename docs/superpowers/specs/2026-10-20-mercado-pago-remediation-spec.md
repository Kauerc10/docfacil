# Especificação Técnica: Remediação, Endurecimento e Fechamento de Lacunas (Mercado Pago)

Esta especificação define as remediações arquiteturais, correções de bugs lógicos e fechamento de requisitos identificados na revisão de código da integração do Mercado Pago no DocFácil (Ninhal), conforme as diretrizes das skills `diagnosing-bugs` e `to-spec`.

---

## Problem Statement

Durante a revisão de código em dois eixos (Standards e Spec) da integração do Mercado Pago na branch `feat/abacatepay-real-billing`, foram identificadas lacunas funcionais, bugs lógicos em transições de assinatura/reconciliação e desvios arquiteturais:
1. **Reconciliação e Pagamentos Promocionais**: O reconciliador e os webhooks rejeitam pagamentos válidos ou tardios da oferta de boas-vindas (R$ 29,90) com erro de valor incompatível (HTTP 409), impedindo a ativação do primeiro mês promocional legitimamente aceito pelo gateway.
2. **Ciclo de Vida da Assinatura Pro**: A ação de "continuar com o Pro" (`continue`) emite erro incondicionalmente e sofre de fallthrough na rota HTTP para erro 400, impossibilitando o usuário de reativar a renovação automática da assinatura vigente.
3. **Segurança Criptográfica de Identidade**: O cálculo de hash de CPF/CNPJ em solicitações de correção de titularidade utiliza SHA-256 bruto sem salting ou segredo de servidor, deixando identificadores vulneráveis a ataques de dicionário ou tabelas arco-íris.
4. **Vazamento de Vendor no Domínio Central**: O orquestrador central de geração de documentos verifica explicitamente a string de provedor `purchase?.provider === "mercadopago"`, quebrando o isolamento de domínio da Clean Architecture.
5. **Oferta de Boas-Vindas Ausente na Interface e API Pública**: A lógica de persistência e expiração em 2 horas existe no backend, mas não possui endpoint público autenticado para consulta da oferta nem integração visual no checkout/preços.
6. **Reembolso Pro Não Contemplado no Backend**: O módulo e rotas de reembolso restringem-se a compras avulsas de R$ 19,90, deixando a revogação proporcional de períodos de assinatura Pro (Ticket 16) sem implementação.
7. **Transparência de Prazos na Experiência do Usuário**: O prazo de retificação gratuita do mesmo documento durante 7 dias não é informado de forma transparente nas telas de checkout e visualização do documento.

---

## Solution

Implementar uma suíte coesa de remediações e melhorias que:
1. **Unifique a Validação Financeira de Cobrança e Assinatura**: O reconciliador passa a aceitar tanto o valor regular (R$ 39,90) quanto o valor de boas-vindas (R$ 29,90) para pedidos Pro promocionais, honrando pagamentos aceitos pelo gateway e auditando incidentes tardios sem bloquear a ativação.
2. **Corrija a Reativação da Assinatura Pro**: Permite reativar a renovação automática (`autoRenew: true`) de assinaturas ativas com retorno de sucesso estruturado e sem fallthrough na rota HTTP.
3. **Endureça a Criptografia de Identificadores Sensíveis**: Substitui o SHA-256 simples por HMAC-SHA256 utilizando segredo de servidor (`SERVER_SECRET`), garantindo proteção irreversível contra buscas por força bruta de CPFs.
4. **Isole o Domínio com Propriedades Agnósticas**: Substitui a checagem de provedor no orquestrador por uma flag de domínio no pedido (`fulfillmentMode === "verified_delivery"` ou `requiresDeliveryVerification`).
5. **Exponha e Integre a Oferta de Boas-Vindas**: Cria o endpoint `GET /api/billing/offer` e conecta o estado da oferta ao checkout do plano Pro com contador regressivo real de 2 horas.
6. **Implemente o Reembolso de Ciclos Pro com Auditoria Contábil**: Permite o estorno administrativo de faturas Pro pelo valor correspondente (R$ 39,90 ou R$ 29,90), ajustando a data limite (`paidThrough`) para o ciclo anterior sem expurgar períodos passados.
7. **Exiba com Clareza o Prazo de 7 Dias para Correções**: Apresenta na tela de checkout e nos cabeçalhos de detalhe do documento a data exata até a qual retificações gratuitas são permitidas.

---

## User Stories

1. Como comprador avulso, quero ver no checkout e no resumo do documento o prazo exato de 7 dias para correções gratuitas, para entender com clareza o direito adquirido.
2. Como comprador avulso, quero que o resumo do documento exiba um alerta visual informando quantos dias ou horas restam para retificar meus dados sem custo adicional.
3. Como novo usuário elegível à oferta de boas-vindas, quero consultar minha elegibilidade via API, para que o frontend saiba se tenho direito ao desconto de R$ 29,90 no primeiro mês.
4. Como novo usuário elegível, quero ver um contador regressivo real de até 2 horas na página de contratação Pro, para aproveitar a oferta promocional antes que expire.
5. Como novo usuário elegível, quero que ao selecionar o plano Pro durante a janela ativa o checkout seja criado pelo valor promocional de R$ 29,90, para pagar o valor anunciado.
6. Como sistema de billing, quero que a reconciliação e os webhooks reconheçam pedidos Pro de R$ 29,90 como legítimos, para não rejeitar a ativação da assinatura com erro de valor divergente.
7. Como sistema de billing, quero que pagamentos promocionais de R$ 29,90 aceitos pelo Mercado Pago mesmo após o término da janela sejam honrados por 30 dias e sinalizados como ocorrência administrativa, para respeitar a boa-fé do consumidor sem travar o acesso.
8. Como assinante Pro que havia cancelado a renovação automática, quero clicar em "Continuar com o Pro" durante a vigência paga, para reativar a renovação sem precisar recadastrar o cartão antes do término do período.
9. Como assinante Pro, quero receber uma resposta clara e sem erros 400 ou 409 ao reativar a renovação da minha assinatura vigente.
10. Como administrador da plataforma, quero solicitar o estorno integral de uma cobrança Pro indevida ou cancelada no período de reflexão, para devolver o dinheiro ao cliente via gateway.
11. Como administrador da plataforma, quero que o estorno de um ciclo Pro ajuste o `paidThrough` do usuário para o término do ciclo anterior sem revogar períodos passados do histórico.
12. Como titular de dados (LGPD), quero que o hash do meu CPF/CNPJ em solicitações de correção cadastral utilize HMAC com segredo do servidor, para que terceiros não consigam descobrir meu documento por enumeração reversa.
13. Como desenvolvedor do sistema, quero que o orquestrador do motor de documentos verifique apenas regras de domínio sobre o modo de entrega sem citar o Mercado Pago, para manter a arquitetura desacoplada e limpa.
14. Como desenvolvedor do sistema, quero que o polling de Pix e os cookies de pedido sejam centralizados em módulos utilitários compartilhados, para evitar duplicação de lógica entre telas.

---

## Implementation Decisions

### 1. Reconciliação Financeira Flexível com Auditoria
- **Decisão**: A validação em `validatePayment` e `reconcileMercadoPagoPayment` aceitará o valor registrado no pedido (`order.amountCents`), que pode ser `PRO_CENTS` (3990), `WELCOME_PRO_CENTS` (2990) ou `AVULSO_CENTS` (1990).
- **Contrato de Assinatura**: O valor base da assinatura recorrente no Mercado Pago continua configurado para R$ 39,90 nas renovações, enquanto o primeiro ciclo reflete o valor cobrado do pedido promocional.
- **Incidentes**: Se o pagamento de R$ 29,90 for confirmado fora da janela da oferta, uma ocorrência do tipo `late_promotional_payment` é gravada em `billing_occurrences`, ativando o plano por 30 dias conforme a especificação.

### 2. Ação de Continuidade da Assinatura Pro (`continue`)
- **Decisão**: Em `subscription-management.ts`, `continueMercadoPagoSubscription` verifica se a assinatura ainda está dentro do período pago e se seu status no Mercado Pago permite retomada. Se sim, reativa `autoRenew: true` via `repos.subscriptions.resumeAutoRenew(userId)` e retorna `{ status: "active", autoRenew: true, paidThrough }`.
- **Rota HTTP**: Em `src/app/api/billing/subscription/route.ts`, o bloco `action === "continue"` retorna explicitamente `NextResponse.json(result)` com cabeçalhos `Cache-Control: no-store`.

### 3. Criptografia Salted/HMAC para Identificadores
- **Decisão**: Em `identity-correction.ts`, a função `hashIdentifier` passa a computar `crypto.createHmac("sha256", getIdentitySecret()).update(digits).digest("hex")`. O segredo é derivado do `SERVER_SECRET` configurado no ambiente, tornando impossível a geração de rainbow tables externas.

### 4. Desacoplamento no Orquestrador de Documentos
- **Decisão**: No modelo de `OrderRecord`, institui-se o campo de domínio `fulfillmentMode: "verified_delivery" | "instant"`.
- O orquestrador substitui a verificação por fornecedor por `if (purchase?.fulfillmentMode === "verified_delivery" && deps?.purchaseDeliveryOrderId !== orderId)`.

### 5. API e Interface da Oferta de Boas-Vindas
- **Decisão**: Criação da rota `GET /api/billing/offer`, que exige autenticação de usuário e App Check, invoca `getOrCreateWelcomeOffer` e retorna `{ eligible: boolean, priceCents: number, regularPriceCents: number, expiresAt: number | null, remainingSeconds: number }`.
- No frontend, o componente de checkout Pro consome esse estado e renderiza o badge de desconto e a contagem regressiva quando ativo.

### 6. Suporte a Reembolso de Assinatura Pro
- **Decisão**: Em `refunds.ts`, a função `requestAdminRefund` aceita pedidos de produto `pro` além de `avulso`.
- Ao confirmar o reembolso de um pedido Pro:
  - Invoca o gateway de reembolso para o `paymentId`.
  - Calcula o novo `paidThrough` do usuário: reduz 1 mês da vigência atual, sem remover faturas anteriores já quitadas.
  - Registra a operação financeira com tipo `pro_refund`.

### 7. Apresentação do Prazo de 7 Dias para Correções
- **Decisão**: No componente `checkout-view.tsx`, adiciona-se item explicativo: "Correções ilimitadas do mesmo modelo e partes garantidas por 7 dias corridos após a compra".
- Na visualização do documento (`detalhe-preview.tsx`), exibe-se um banner informativo com a data limite de retificação gratuita caso a compra tenha menos de 7 dias.

---

## Testing Decisions

- **Filosofia de Teste**: Testar exclusivamente o comportamento externo observável por meio dos contratos de API e das funções de serviço de domínio de alto nível. Mocks e emuladores em memória devem simular fielmente o provedor e os repositórios sem testar detalhes internos de implementação.
- **Seams Utilizados**:
  1. **Seam de Reconciliação / Webhooks**: `reconcileMercadoPagoPayment` e `reconcileMercadoPagoWebhookEvent` recebendo payloads simulados de pagamentos de R$ 29,90 e validando o estado final em `orders` e `subscriptions`.
  2. **Seam de Gestão de Assinatura**: Endpoint `/api/billing/subscription` e rotinas de cancelamento/continuidade.
  3. **Seam de Oferta de Boas-Vindas**: Endpoint `/api/billing/offer` e transições de expiração após 2 horas.
  4. **Seam de Reembolso**: `/api/billing/admin/refunds` com pedidos avulsos e Pro.
  5. **Seam Criptográfico**: Teste unitário de `hashIdentifier` demonstrando que strings iguais geram digests previsíveis com o segredo mas resistentes a hashes de valor estático sem segredo.

---

## Out of Scope

- Alterações na infraestrutura de envio de e-mails de produção ou gateways alternativos.
- Mudanças profundas no motor de renderização PDF que não estejam relacionadas à exibição do status e prazos do documento.
- Migrações de banco de dados fora das coleções de billing já aprovadas.

---

## Further Notes

Esta especificação assegura o cumprimento rigoroso dos princípios do Código de Defesa do Consumidor, das diretrizes de segurança da LGPD para identificadores civis, e dos padrões de estabilidade operacional antes da abertura definitiva de tráfego de produção.
