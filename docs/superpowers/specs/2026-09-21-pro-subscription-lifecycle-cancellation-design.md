# Spec: Ciclo de Vida de Cancelamento do Plano Pro e Vigência até o Fim do Ciclo Pago

## Problem Statement

Atualmente, quando um assinante do Plano Pro solicita o cancelamento pelo perfil, o backend aciona o gateway de pagamento e executa imediatamente o rebaixamento da conta para o plano gratuito. Esse comportamento viola a garantia expressa na FAQ, na página de planos e nos termos do serviço, que asseguram ao usuário a manutenção do acesso Pro durante todo o período mensal já quitado.

Do ponto de vista do cliente, perder o acesso instantaneamente após ter pago a mensalidade gera frustração, sensação de prejuízo e sobrecarga nos canais de suporte. Além disso, a interface de perfil não oferece indicação clara de cancelamento agendado, permitindo cliques repetidos ou deixando o usuário sem visibilidade sobre a data exata em que seu acesso terminará.

Por fim, parâmetros temporais e regras de ciclo de cobrança estão dispersos em números mágicos por múltiplos módulos de faturamento, dificultando a rastreabilidade e a consistência das políticas temporais do sistema.

## Solution

Alinhar o ciclo de vida do Plano Pro com as promessas contratuais e de experiência do cliente:
1. Ao solicitar o cancelamento, a assinatura recorrente externa é encerrada de imediato no Mercado Pago (garantindo que não ocorram renovações ou cobranças futuras).
2. O usuário mantém todos os privilégios do Plano Pro até a data limite do ciclo pago em vigor (`subscriptionExpiresAt`).
3. O downgrade para o plano gratuito é resolvido de forma estritamente determinística e preguiçosa (*lazy evaluation*) nas camadas de autorização e resolução de permissões, sem necessidade de infraestrutura de cron jobs ou varreduras periódicas em lote.
4. A tela de perfil passa a refletir com transparência o estado de "Cancelamento agendado", informando a data final de vigência dos recursos Pro e prevenindo novas tentativas de cancelamento.
5. As constantes temporais de faturamento, expiração e tolerância são unificadas em um único módulo central de constantes, eliminando tipos fantasmas de gateways inativos.

## User Stories

1. Como assinante do Plano Pro, quero cancelar minha assinatura pelo perfil a qualquer momento, para que nenhuma renovação automática seja cobrada no mês seguinte.
2. Como assinante Pro que solicitou cancelamento, quero continuar gerando documentos sem marca d'água e acessando todos os modelos Pro até o último dia do ciclo mensal já pago, para receber o benefício integral pelo qual paguei.
3. Como assinante Pro que solicitou cancelamento, quero ver no meu perfil a data exata de encerramento do meu acesso Pro, para ter clareza sobre quando meu plano expirará.
4. Como assinante Pro com cancelamento já agendado, quero que o botão de cancelamento seja substituído por um informativo com a data limite, para não ficar na dúvida se o pedido foi processado.
5. Como assinante Pro com cancelamento agendado que mudou de ideia, quero poder iniciar um novo ciclo de assinatura Pro antes ou após o término do período vigente, para manter meu plano sem interrupção de acesso.
6. Como usuário cujo período Pro chegou ao fim após a data de expiração agendada, quero que meu plano seja transicionado suavemente para o plano gratuito sem erros de sistema, para continuar usando os modelos grátis disponíveis do mês.
7. Como sistema, quero cancelar a pré-aprovação no Mercado Pago imediatamente na solicitação, para que nenhuma cobrança seja enviada à operadora de cartão do cliente.
8. Como sistema, quero obter a data do próximo vencimento diretamente da resposta da API do gateway no momento do cancelamento, utilizando fallback de 30 dias a partir do pagamento confirmado caso a informação não esteja presente.
9. Como sistema, quero avaliar o plano efetivo do usuário de forma preguiçosa nas rotas e na resolução de permissões, eliminando custos de leitura contínua e complexidade operacional de cron jobs.
10. Como sistema, quero que webhooks com status `cancelled` ou `paused` emitidos pelo gateway preservem a data de expiração calculada se o ciclo atual ainda estiver vigente, impedindo cancelamentos retroativos indesejados.
11. Como desenvolvedor, quero que as constantes de tempo (duração de ciclo, tolerância de webhooks, janelas de abandono de reservas) residam em um único ponto do domínio, para que alterações futuras propaguem com facilidade e segurança.
12. Como desenvolvedor, quero que a tipagem de provedores de checkout no cliente contenha apenas gateways reais da aplicação, removendo menções a provedores inexistentes.

## Implementation Decisions

### 1. Modelo de Estado e Esquema de Perfil do Usuário
- O perfil de usuário incorpora os campos de controle temporal:
  - `subscriptionStatus`: indicador de ciclo de vida (`"active"` | `"cancelled"`).
  - `subscriptionExpiresAt`: timestamp UTC (em milissegundos) que marca o fim exato da vigência Pro.
  - `cancelledAt`: timestamp UTC (em milissegundos) que registra o instante em que o cancelamento foi solicitado.
- Definição do formato de estado no domínio:
```typescript
export interface UserSubscriptionLifecycle {
  plano: "gratis" | "pro";
  subscriptionStatus?: "active" | "cancelled";
  subscriptionExpiresAt?: number | null;
  cancelledAt?: number | null;
  subscriptionId?: string | null;
  subscriptionOrderId?: string | null;
}
```

### 2. Módulo de Cancelamento de Assinatura
- O handler de cancelamento obtém os dados do preapproval antes de desativá-lo.
- Caso a API do Mercado Pago informe `next_payment_date`, ela é utilizada como referência de `subscriptionExpiresAt`. Caso indisponível, o sistema recorre à data de aprovação do pedido associado (`order.paidAt + 30 dias`) ou `agora + 30 dias`.
- A assinatura no Mercado Pago é cancelada via `client.cancelPreapproval(subscriptionId)`.
- O pedido correspondente é marcado como `cancelled` no histórico de faturamento.
- O plano do usuário é mantido como `plano: "pro"` com `subscriptionStatus: "cancelled"` e `subscriptionExpiresAt` gravado, não rebaixando o campo `plano` imediatamente para `"gratis"`.

### 3. Resolução Preguiçosa de Entitlement (Lazy Evaluation)
- A verificação de permissão Pro (`isPro`, `canCreateDocument`, `resolveEntitlement`) passa a avaliar tanto `plano === "pro"` quanto a validade temporal:
  - Se `plano === "pro"` e `subscriptionExpiresAt` estiver definido no passado (`Date.now() > subscriptionExpiresAt`), o usuário é considerado efetivamente `"gratis"`.
  - No momento da leitura, uma sincronização silenciosa no Firestore atualiza `plano: "gratis"` e limpa os ponteiros obsoletos, garantindo consistência eventual sem onerar chamadas síncronas com bloqueios desnecessários.

### 4. Módulo de Recepção de Webhook
- Quando um webhook de `preapproval` cancelado ou pausado for processado:
  - Se o usuário possui `subscriptionExpiresAt` no futuro, o webhook respeita a vigência contratada e não apaga o acesso Pro imediatamente.
  - Caso o preapproval cancelado pertença a uma assinatura antiga ou substituída, o comportamento defensivo já implementado em commits anteriores permanece resguardado.

### 5. Interface de Apresentação no Perfil
- A view de perfil analisa se o usuário possui assinatura com cancelamento agendado (`subscriptionStatus === 'cancelled'` e `subscriptionExpiresAt > Date.now()`).
- Em caso afirmativo:
  - Substitui o formulário/botão de cancelamento por um banner explicativo com a data formatada (ex.: "Seu plano Pro foi cancelado e permanecerá ativo até 21/10/2026. Nenhuma nova cobrança será realizada.").
  - Oferece atalho claro para o catálogo de planos caso o usuário decida assinar novamente.

### 6. Módulo Central de Constantes de Faturamento
- Centralização de valores em um módulo dedicado de constantes de billing:
  - `DEFAULT_SUBSCRIPTION_CYCLE_MS = 30 * 24 * 60 * 60 * 1000` (30 dias).
  - `RESERVATION_STALENESS_MS = 60_000` (60 segundos para reservas órfãs).
  - `DEFAULT_PIX_EXPIRATION_MS = 30 * 60 * 1000` (30 minutos).
  - `WEBHOOK_REPLAY_TOLERANCE_MS = 10 * 60 * 1000` (10 minutos).
- Limpeza dos tipos literais no serviço cliente de checkout, restringindo o union `CheckoutProvider` estritamente a `"mercadopago" | "demo"`.

## Testing Decisions

- **Testes de Comportamento Externo:** Os testes devem focar na observação externa através dos endpoints HTTP e das funções públicas de autorização, sem se acoplar à implementação interna do Firestore ou do cliente HTTP.
- **Cenários Cobertos:**
  1. *Cancelamento bem-sucedido preserva Pro:* Chamar `POST /api/subscription/cancel` deve retornar sucesso, manter `plano: "pro"`, gravar `subscriptionExpiresAt` no futuro e acionar o cancelamento no gateway.
  2. *Entitlement Pro durante vigência agendada:* Avaliar `resolveEntitlement` com usuário cancelado antes de `subscriptionExpiresAt` deve autorizar geração sem marca d'água.
  3. *Entitlement Grátis após expiração:* Avaliar `resolveEntitlement` com usuário cancelado cujo `subscriptionExpiresAt` já passou deve tratar como plano grátis (aplicando limites de cota mensal).
  4. *Webhook de cancelamento respeita ciclo:* Enviar notificação de preapproval cancelado não deve zerar a vigência restante do assinante.
  5. *Renderização do perfil com cancelamento pendente:* Teste de componente validando exibição da data de expiração e ocultação do botão de cancelamento.
- **Arte Prévia de Testes:** Os testes seguirão a estrutura já consagrada em `src/app/api/subscription/cancel/route.test.ts` e `src/app/api/webhooks/mercadopago/route.test.ts`.

## Out of Scope

- Estorno pro-rata de valores já cobrados (política padrão de assinatura digital).
- Criação de rotinas agendadas (cron jobs ou Cloud Functions) para varredura em massa.
- Planos anuais ou semestrais com regras diferenciadas de ciclo.
- Notificações automáticas por e-mail no encerramento da vigência (pode ser desenhado em spec futura).

## Further Notes

- Rastreada pela issue #37 (https://github.com/Kauerc10/docfacil/issues/37).
- Esta especificação resolve a discrepância identificada na auditoria arquitetural entre as promessas contratuais da FAQ e o comportamento imediato de cancelamento do backend.
- A execução desta spec será realizada de forma atômica e validada com suíte completa de testes antes de ser integrada à branch principal.
