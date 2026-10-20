# Ticket 02 — prova do desconto e validade do checkout

Data da consulta: 2026-10-20. Branch usada: `feat/abacatepay-real-billing`.

## Resultado

O harness local passou as invariantes comerciais, mas isso **não é uma prova externa**. Nenhuma requisição foi feita ao Mercado Pago, nenhum token foi usado e nenhuma cobrança foi criada. A oferta de R$ 29,90 no primeiro mês e R$ 39,90 nas renovações continua bloqueada para publicação até uma execução controlada em contas de teste que demonstre os dois valores e a transição real.

Também não foi encontrada, na documentação consultada, uma garantia de que um link de checkout de assinatura pendente possa ser invalidado exatamente 30 minutos depois do início da tentativa. Um timer persistido no DocFácil só controla a nossa interface; ele não impede o provedor de aceitar um link já emitido. A corrida entre expiração local e aprovação externa permanece um caso obrigatório.

## Evidência oficial consultada

- A [referência da API de Assinaturas](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/overview) documenta `/preapproval`, consulta/atualização de assinatura, planos e faturas. Ela confirma que o valor recorrente é parte da assinatura, mas não descreve uma programação automática “primeiro ciclo com valor A, demais com valor B”.
- A documentação de [assinaturas sem plano associado](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/introduction) permite assinaturas específicas por pagador, inclusive um mês com desconto como exemplo conceitual, porém exige comprovação do comportamento no ambiente de teste.
- Em [pagamento pendente](https://www.mercadopago.com.br/developers/en/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments), a assinatura é criada com status `pending` e o cliente conclui por um link ou por atualização da assinatura. A página não promete expiração de 30 minutos do link.
- Em [pagamento autorizado](https://www.mercadopago.com.br/developers/en/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments), o primeiro débito ocorre aproximadamente uma hora após a criação e o Mercado Pago controla novas tentativas. Isso impede tratar uma autorização como cobrança aprovada no nosso domínio.
- A [referência de criação de plano](https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/create-preapproval-plan/post) mostra `transaction_amount` fixo no `auto_recurring` e `free_trial` como período gratuito; não documenta desconto monetário exclusivo no primeiro ciclo.
- O [teste de compra de assinatura](https://www.mercadopago.com.br/developers/en/docs/subscriptions/integration-test/payment-approval) é a próxima etapa para uma execução com contas de teste. Essa execução requer credenciais fornecidas fora do repositório e deve ser registrada sem tokens.

## Harness seguro

`scripts/mercadopago-proof/promo-proof.mjs` contém apenas regras determinísticas e não importa SDK, não lê `.env`, não chama a rede e não tem fallback de produção. O teste pode ser executado com:

```text
node --test scripts/mercadopago-proof/promo-proof.test.mjs
node scripts/mercadopago-proof/promo-proof.mjs
```

Ele comprova localmente:

- aprovação dentro da janela escolhe R$ 29,90;
- benefício consumido escolhe R$ 39,90;
- tentativa expira após 30 minutos;
- pagamento promocional aceito fora da janela é honrado e marcado para incidente, conforme a decisão de produto;
- recusa não consome o benefício.

O output sempre identifica a execução como “local rule proof only”. Não deve ser usado como evidência de sandbox, webhook, checkout hospedado ou renovação.

## Critério para desbloquear a oferta

Antes de liberar a oferta, executar com contas de teste do Mercado Pago e registrar, com identificadores anonimizados:

1. criar uma assinatura pendente ou autorizada usando o caminho escolhido;
2. concluir a primeira cobrança no valor de R$ 29,90;
3. consultar a assinatura e a fatura/pagamento para confirmar o valor efetivamente aceito;
4. demonstrar a cobrança seguinte de R$ 39,90, ou documentar que a API não suporta a troca sem uma operação controlada e definir a alternativa aprovada;
5. iniciar uma tentativa, aguardar 30 minutos no relógio do provedor ou usar um mecanismo de expiração oficialmente suportado, e verificar se o link é rejeitado após a validade;
6. testar a corrida de aprovação próxima ao limite e registrar se o pagamento tardio precisa ser honrado e se o incidente/suspensão local é acionado;
7. repetir consulta e webhook para provar que o backend não duplica o período.

Se qualquer passo não puder ser demonstrado sem uma inferência local, a oferta de 2 horas/30 minutos e o preço introdutório não devem ser publicados. Uma primeira cobrança aprovada nunca substitui a prova da renovação.

## Limitações e próximo passo

Não há credenciais no workspace e não houve prova externa nesta execução. O ticket 02 permanece incompleto até que um executor autorizado rode o roteiro com contas de teste. O harness é deliberadamente um apoio de especificação, não uma implementação de gateway.

## Runtime local verificado

Para habilitar testes Firestore locais sem tocar em produção, o Firebase CLI `15.34.0` foi instalado em `local-tools` com cache em `local-npm-cache`. O CLI tentou baixar o Firestore Emulator `v1.22.0`, mas a descarga terminou com `An unexpected error has occurred`. Como havia um JAR já presente no cache local, o emulador foi iniciado diretamente com a versão `v1.19.8`:

```text
java -jar C:\Users\Kauerc\.cache\firebase\emulators\cloud-firestore-emulator-v1.19.8.jar --host=127.0.0.1 --port=8089 --project_id=demo-docfacil-billing --single_project_mode=true --rules=<workspace>\local-runtime\firestore.rules
```

Processo ativo no momento da verificação: PID `17792`. Endpoint respondeu `HTTP 200` em `http://127.0.0.1:8089`. O projeto é explicitamente `demo-docfacil-billing`, e o bind é somente `127.0.0.1`; não há deploy nem acesso a projeto real. O arquivo de configuração e logs ficam em `local-runtime/`, ignorado pelo Git.

Essa execução prova apenas disponibilidade do emulador Firestore local. Ela não prova Mercado Pago, checkout hospedado, webhook ou renovação.
