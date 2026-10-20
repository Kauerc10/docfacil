# Especificação: pagamentos Mercado Pago, documentos e assinatura Pro

## Problem Statement

O cliente precisa pagar por um documento ou contratar o Pro com confiança, receber o que comprou mesmo fechando o navegador e conseguir resolver problemas sem pagar novamente. A base local analisada ainda utiliza AbacatePay e contém lacunas de confirmação, concorrência e recuperação. A migração deve preservar as funcionalidades úteis, substituindo o gateway e corrigindo os riscos financeiros.

Hoje uma confirmação repetida pode reabrir um pedido consumido; a renovação depende de atualizações sem uma garantia transacional por cobrança; uma reserva de evento interrompida pode bloquear recuperação. Também faltam entrega recuperável por e-mail, gestão administrativa completa de exceções e regras consolidadas para oferta, correções e reversões.

O problema é comercial e operacional: não basta abrir um checkout. Preço, confirmação, entrega, acesso, renovação, cancelamento e atendimento precisam concordar entre si.

## Solution

Integrar Mercado Pago para documento avulso de R$ 19,90 por Pix dentro do site ou cartão de crédito à vista em checkout hospedado. Oferecer Pro mensal de R$ 39,90 com todos os modelos, gerações ilimitadas, histórico, edição e documentos sem marca-d'água.

Oferecer a novos assinantes elegíveis o primeiro mês por R$ 29,90 em uma janela individual real de duas horas. A campanha não tem encerramento global; cada cliente recebe uma única janela, persistida no backend. Renovações de R$ 39,90 e suas datas devem ser claras antes da contratação. A execução do desconto e a expiração externa são condicionadas à comprovação técnica, nunca simuladas apenas na interface.

Confirmar cobranças exclusivamente no backend a partir dos fatos consultados no Mercado Pago. Preservar rascunho antes de pagar, gerar automaticamente depois da aprovação e entregar acesso seguro recuperável. Cobranças, documentos e períodos Pro devem sobreviver a notificações duplicadas, falhas e concorrência.

## User Stories

1. Como comprador avulso, quero ver o preço de R$ 19,90 antes de pagar, para conhecer o custo total.
2. Como comprador avulso, quero escolher Pix ou crédito à vista, para usar meu meio preferido.
3. Como comprador por Pix, quero QR e código copia-e-cola dentro do site, para pagar sem transcrever dados.
4. Como comprador por Pix, quero saber a validade real da cobrança, para não tentar usar um código vencido.
5. Como comprador por cartão, quero pagar no checkout hospedado, para informar meus dados financeiros diretamente ao provedor.
6. Como visitante, quero comprar um avulso sem criar conta, para concluir com pouca fricção.
7. Como visitante, quero informar e-mail obrigatório e WhatsApp opcional, para receber acesso sem cadastro obrigatório.
8. Como comprador, quero que meu rascunho seja salvo antes do pagamento, para não perder o preenchimento.
9. Como comprador, quero que a compra fique ligada ao documento escolhido, para receber exatamente o que revisei.
10. Como comprador, quero ver que o pagamento está pendente, para não confundir envio com aprovação.
11. Como comprador, quero fechar a página e continuar depois, para não depender de uma aba aberta.
12. Como comprador, quero que o documento seja gerado após a confirmação, para recebê-lo sem uma etapa manual obrigatória.
13. Como comprador, quero receber e-mail com acesso seguro, para recuperar a entrega em outro aparelho.
14. Como comprador, quero solicitar outro link quando o anterior expirar, para não perder minha compra.
15. Como comprador, quero ver o andamento da geração, para distinguir pagamento confirmado de arquivo pronto.
16. Como comprador, quero repetir uma geração que falhou sem nova cobrança, para não pagar por uma falha técnica.
17. Como comprador, quero escolher aguardar suporte ou solicitar reembolso em falha persistente, para resolver a entrega.
18. Como comprador, quero baixar novamente minhas versões sem cobrança adicional, para recuperar meus arquivos.
19. Como comprador avulso, quero corrigir o mesmo documento durante sete dias após sua primeira geração, para ajustar erros.
20. Como comprador avulso, quero ver o prazo de correções antes de pagar e no documento, para entender o direito comprado.
21. Como comprador avulso, quero corrigir nome mantendo CPF/CNPJ, para ajustar erros sem substituir a pessoa.
22. Como comprador avulso, quero solicitar revisão de CPF/CNPJ ao suporte, para corrigir erro legítimo de identificação.
23. Como comprador, quero saber que trocar modelo ou partes exige nova compra, para não ser surpreendido após preencher.
24. Como usuário com e-mail verificado, quero incorporar minhas compras anteriores, para reunir meus documentos na conta.
25. Como comprador, quero que essa incorporação preserve os prazos originais, para ter regras previsíveis.
26. Como usuário, quero contratar Pro apenas após entrar na conta, para vincular a assinatura corretamente.
27. Como assinante Pro, quero todos os modelos e gerações ilimitadas sem marca-d'água, para usar os benefícios contratados.
28. Como assinante Pro, quero histórico e edição, para manter meus documentos organizados.
29. Como assinante, quero acesso somente depois da primeira cobrança aprovada, para ter o início do período claramente definido.
30. Como assinante, quero um mês completo desde a primeira aprovação, para receber o período pago.
31. Como assinante, quero ver data e valor da próxima cobrança, para acompanhar minha renovação.
32. Como assinante, quero impedir uma segunda assinatura simultânea, para evitar cobranças sobrepostas.
33. Como assinante, quero cancelar pela conta, para interromper futuras renovações.
34. Como assinante, quero ver cancelamento em processamento até confirmação, para saber o estado verdadeiro da solicitação.
35. Como assinante que cancelou, quero manter o período pago, para receber o benefício integral.
36. Como assinante que mudou de ideia, quero continuar com o Pro com segurança, para evitar cobrança imediata ou duplicada.
37. Como assinante com renovação recusada, quero receber orientação para regularizar, para retomar o benefício.
38. Como ex-assinante, quero preservar histórico e downloads das versões existentes, para não perder arquivos ao voltar ao grátis.
39. Como ex-assinante, quero saber que novas versões exigem Pro ou compra vinculada, para entender o próximo custo.
40. Como novo assinante elegível, quero o primeiro mês por R$ 29,90, para aproveitar a condição de boas-vindas.
41. Como novo assinante, quero ver a renovação de R$ 39,90 antes de contratar, para consentir com o custo recorrente.
42. Como cliente elegível, quero que o contador de duas horas seja real e igual em todos os aparelhos, para confiar na oferta.
43. Como cliente elegível, quero que a janela comece na primeira visualização autenticada, para saber quando termina.
44. Como cliente com pagamento recusado, quero manter a elegibilidade até a aprovação, respeitado o prazo original, para poder tentar novamente.
45. Como cliente que iniciou a tentativa no prazo, quero até 30 minutos para concluí-la, para terminar o checkout.
46. Como cliente fora da oferta, quero ver o preço vigente antes de nova cobrança, para não pagar um valor inesperado.
47. Como cliente com pagamento dentro do prazo e notificação atrasada, quero recebê-lo normalmente, para não ser prejudicado pela comunicação externa.
48. Como cliente cuja cobrança promocional foi aceita tardiamente, quero que o valor seja honrado, para não receber cobrança complementar.
49. Como titular de conta, quero proteger o vínculo do meu CPF/CNPJ, para impedir contratação duplicada e acesso indevido.
50. Como titular, quero recuperação ou transferência com comprovação, para resolver vínculos sem expor meus dados a terceiros.
51. Como comprador cobrado duas vezes pelo mesmo documento, quero estorno da cobrança excedente, para pagar apenas uma vez.
52. Como comprador, quero solicitar reembolso na página da compra, para registrar motivo e acompanhar o atendimento.
53. Como comprador, quero ver reembolso solicitado, processando, confirmado ou com falha, para conhecer o resultado real.
54. Como comprador reembolsado, quero manter registro da compra e do atendimento, para consultar o histórico.
55. Como assinante com um período reembolsado, quero preservar outros períodos pagos, para não perder direitos independentes.
56. Como cliente com contestação, quero ser avisado da suspensão relacionada à cobrança, para entender as restrições.
57. Como cliente com contestação resolvida favoravelmente, quero a restauração dos direitos cabíveis, para voltar a usar a compra.
58. Como comprador cujo e-mail falhou, quero continuar acessando a compra pela página, para não depender da entrega da mensagem.
59. Como atendente, quero uma fila de ocorrências com responsável e histórico, para resolver falhas sem perder contexto.
60. Como atendente, quero analisar correções e solicitações sem permissão financeira, para exercer minha função com acesso restrito.
61. Como administrador autorizado, quero confirmar valor e motivo antes de reembolsar, para evitar movimentação incorreta.
62. Como administrador, quero acompanhar estornos automáticos e falhas, para agir quando a automação não concluir.
63. Como administrador, quero analisar reembolso parcial externo sem revogação arbitrária, para tratar exceções corretamente.
64. Como operador, quero incidentes de oferta fora do prazo suspenderem novas ofertas daquele fluxo, para não repetir o erro.
65. Como operador, quero recuperar tarefas interrompidas e cobranças não notificadas, para não depender de intervenção no banco.
66. Como mantenedor, quero regras concentradas num módulo profundo e testadas pela interface pública, para corrigir uma vez sem espalhar mudanças.
67. Como responsável pelo produto, quero evidências separadas de testes locais e operação externa, para avaliar o que foi comprovado.
68. Como responsável financeiro, quero aprovar valores e execução de testes reais no momento adequado, para controlar as movimentações.

## Implementation Decisions

### 1. Status e precedência

- As regras comerciais foram confirmadas ao fim da entrevista Q1–Q44. A estratégia de testes pela interface pública foi explicitamente confirmada nesta síntese.
- Este documento especifica o resultado desejado; não declara implementação, publicação, deploy, cobrança ou renovação comprovados.
- Valores monetários internos em centavos inteiros e moeda BRL: avulso 1990, Pro regular 3990, primeiro mês elegível 2990. A conversão ao formato exigido pelo provedor acontece exclusivamente no adapter.
- Datas persistidas como instantes UTC; apresentação ao cliente com fuso explícito/coerente. Um mês de assinatura não é sinônimo universal de 30 dias.
- A entrevista atual prevalece sobre especificações anteriores conflitantes. Trabalho já implementado no remoto deve ser verificado antes de reaproveitar; não pressupor equivalência com o checkout local.

### 2. Vocabulário e dados do domínio

| Conceito | Responsabilidade e invariantes |
| --- | --- |
| Pedido | Intenção comercial vinculada ao comprador, produto e contexto; não prova pagamento. |
| Tentativa | Operação de checkout com preço imutável, validade, chave idempotente e referências externas. |
| Cobrança | Fato financeiro identificado unicamente por provedor, ambiente e ID externo. |
| Assinatura | Autorização e ciclo de renovação; separada do pagamento e do acesso efetivo. |
| Período pago | Intervalo de acesso lastreado em cobrança aprovada; registra suspensões e reversões. |
| Direito ao documento | Vínculo entre compra e documento, versões, prazo de correções e restrições. |
| Oferta individual | Elegibilidade, início, vencimento, consumo e versão comercial persistidos. |
| Ocorrência | Caso operacional com categoria, responsável, histórico e resolução. |
| Trabalho persistido | Efeito externo recuperável de geração, e-mail, cancelamento ou estorno. |

- A forma física das coleções pode aproveitar a persistência existente; a distinção lógica acima é obrigatória. Evitar duplicar fontes autoritativas por conveniência de tela.
- Tentativas armazenam produto, valor, moeda, referência interna, comprador autorizado, método, origem do preço, validade e IDs externos. Não aceitar preço enviado pelo navegador.
- Pedido avulso guarda snapshot validado do rascunho, versão do modelo e política de correção aplicável. O original pago não pode ser silenciosamente substituído por outro conteúdo antes da geração.
- Cobranças e efeitos possuem identificadores determinísticos para garantir unicidade transacional no Firestore. Firestore não oferece unicidade por simples consulta: usar documentos de controle/índices próprios quando necessário.
- Registros de auditoria não armazenam segredos, tokens de acesso, números de cartão, links autenticados ou CPF/CNPJ em claro nos logs.

### 3. Módulos, interface e seams

- Aprofundar o módulo existente de pagamentos: a interface do produto expõe iniciar checkout, acompanhar compra, gerir assinatura e solicitar resolução; a implementação esconde formatos externos, recuperação e reconciliação.
- Preservar as seams existentes de checkout, autorização de documentos e repositórios. Criar seam adicional somente quando indispensável para comportamento real, com justificativa e teste observável.
- Um adapter Mercado Pago traduz protocolos e estados específicos; um adapter Firestore implementa persistência transacional. Não criar uma plataforma genérica de gateways futuros.
- Interface inclui invariantes, configuração necessária, idempotência, autenticação, modos de erro e limites de desempenho, além dos tipos dos argumentos.
- Relógio, gerador de IDs, comunicação externa e persistência são dependências aceitas pela implementação. Testes e chamadores atravessam a mesma interface.
- Rotas tratam transporte/autenticação; telas apresentam estado e ações permitidas. Decisões financeiras não são copiadas para cada rota ou tela. Isso concentra locality e aumenta leverage.
- Não aprofundar módulos de PDF nem refazer o design geral do site nesta entrega.

### 4. Contratos observáveis

| Operação | Entrada autorizada | Resultado observável |
| --- | --- | --- |
| Iniciar avulso | Rascunho validado, método, identidade ou e-mail guest, chave de repetição | Pedido/tentativa e QR ou redirecionamento; preço/validade do servidor. |
| Consultar compra | Identificador e sessão autorizada | Estado financeiro, geração, documento e ações permitidas; sem expor dados de terceiros. |
| Consultar oferta | Conta autenticada e elegibilidade | Início/vencimento e preços; primeira visualização inicia janela uma única vez. |
| Iniciar Pro | Conta verificada, identidade elegível e consentimento | Checkout de assinatura ou indicação da assinatura existente. |
| Gerir Pro | Titular autenticado e ação idempotente | Estado real de cancelamento/continuidade e vigência paga. |
| Solicitar reembolso | Titular/sessão da compra, cobrança e motivo | Ocorrência acompanhável; nenhuma aprovação financeira implícita. |
| Executar reembolso | Administrador autorizado, valor integral e confirmação | Operação externa persistida com estado e auditoria. |
| Retomar acesso guest | Token temporário ou solicitação por e-mail | Sessão restrita ou resposta neutra de reenvio; sem enumeração de compras. |

- Preservar compatibilidade de QR/redirecionamento onde ela já serve ao cliente. Acrescentar versionamento de contrato quando houver mudança incompatível.
- Erros devem distinguir autenticação, falta de permissão, entrada inválida, conflito de estado, oferta encerrada e indisponibilidade recuperável. Não devolver exceções brutas do provedor.
- URLs de retorno são controladas/validadas pelo servidor. Parâmetros de retorno não concedem acesso.
- Consultas financeiras e documentos privados não usam cache público; leituras do navegador observam backoff, cancelamento ao desmontar e parada em estados terminais.

### 5. Compra avulsa, geração e correções

- E-mail obrigatório em compra guest; WhatsApp opcional não substitui e-mail. Normalizar os contatos sem inventar dados ausentes.
- Persistir rascunho antes de chamar Mercado Pago. Clique repetido ou retry retorna a mesma operação lógica quando válida, sem gerar outra cobrança por acidente.
- Pix apresenta QR e copia-e-cola; cartão usa checkout hospedado com método e condições de crédito à vista verificadas. Nenhum dado sensível de cartão é coletado pelo backend do produto.
- Após aprovação autoritativa, reservar a compra e iniciar trabalho de geração persistido. Estado financeiro confirmado é distinto de documento pronto.
- Gerar um único documento lógico por pedido; retries podem completar trabalho interrompido sem consumir de novo a compra. Preservar versões válidas em falhas de atualização.
- O primeiro sucesso define o início do prazo de sete dias. O vencimento é calculado no servidor e não muda com nova versão, incorporação à conta ou reenvio de acesso.
- Correções mantêm modelo e partes. Nome pode mudar mantendo CPF/CNPJ; alterações do identificador exigem análise. Bloqueios de identidade são do backend, não apenas campos desabilitados.
- Antes de habilitar correção em modelo sem CPF/CNPJ, mapear quais campos identificam as partes e documentar uma regra equivalente. Não usar heurística silenciosa para autorizar substituição.
- Downloads posteriores permanecem liberados salvo reversão financeira ou restrição explicitamente aprovada. Não prometer armazenamento eterno sem política de retenção verificada; eventual incompatibilidade deve voltar à decisão de produto antes da publicação.

### 6. Assinatura e períodos

- Pro exige conta; impedir assinatura simultânea com controle transacional por titular. Duas abas não podem superar a verificação.
- Uma assinatura autorizada não equivale a cobrança aprovada. Só um fato financeiro confirmado cria período pago.
- R$ 39,90/mês regularmente, com gerações ilimitadas dos modelos existentes. Proteção contra automação abusiva não cria franquia comercial oculta.
- Registrar cada cobrança e seu período; não adicionar um mês por recebimento de evento. Renovações repetidas da mesma cobrança não estendem a vigência.
- A decisão de acesso considera períodos efetivamente pagos, estornos e suspensões. Campo de plano no perfil pode ser projeção; não é autoridade suficiente.
- Cancelar solicita interrupção da renovação externa e mantém período pago. Solicitação, execução externa e confirmação são estados distintos e recuperáveis.
- Erro/timeout no cancelamento nunca vira confirmação de sucesso. Persistir intenção, reconciliar resultado e abrir ocorrência se necessário.
- “Continuar com o Pro” depende do estado externo: não presumir que uma assinatura cancelada possa ser reativada nem criar outra cobrança imediata. Comprovar o caminho seguro antes de habilitar.
- Vencimento sem renovação retorna ao grátis sem dias extras. Preservar histórico e downloads; bloquear novas versões sem direito ativo. A compra avulsa vinculada segue suas próprias regras.

### 7. Oferta e relógio autoritativo

- Campanha de boas-vindas sem prazo global; uma única janela individual de duas horas, iniciada na primeira visualização autenticada da oferta.
- O backend persiste início/vencimento de forma atômica. O navegador apenas apresenta tempo restante; alteração do relógio local não estende elegibilidade.
- Elegibilidade exige ausência de assinatura Pro paga anteriormente. A janela e o consumo pertencem ao cliente, não à aba ou sessão.
- E-mail verificado e CPF/CNPJ são a identificação aprovada, condicionada à necessidade confirmada no desenho. Não coletar o identificador sem finalidade necessária; eventual impedimento dessa estratégia exige revisão, não fallback invisível para e-mail.
- Se o CPF/CNPJ ainda não estava disponível no início da oferta, vincular a janela à identidade posteriormente sem ampliar a janela original nem permitir várias janelas pelo mesmo cliente.
- Após a primeira aprovação, marcar benefício consumido transacionalmente. Recusa não consome, mas também não reinicia relógio. Cancelamento/retorno não restauram benefício já usado.
- Tentativa iniciada antes de vencer recebe até 30 minutos desde seu próprio início; repetição da mesma tentativa não renova validade. Novas tentativas fora da oferta cobram preço normal informado antes da contratação.
- Mostrar “R$ 29,90 no primeiro mês. Depois, R$ 39,90/mês, com renovação automática.” Não simular exclusividade individual além da elegibilidade real.
- Comparar momento confirmado do pagamento com validade da tentativa; atraso no webhook não significa atraso no pagamento.
- Pagamento promocional realmente aceito fora da janela é honrado por um mês sem complemento. Registrar incidente e suspender novas ofertas desse fluxo; impedir que a suspensão bloqueie atendimento de pagamentos já aprovados.
- Comprovar expiração externa e atualização do preço recorrente antes de publicar a oferta. Não prometer desconto e prazos que dependam apenas de um timer visual.

### 8. Reconciliação, estados e concorrência

| Fato | Efeito permitido | Efeito proibido |
| --- | --- | --- |
| Retorno de navegador | Retomar acompanhamento | Marcar pago ou ativar Pro. |
| Webhook válido | Consultar recurso e reconciliar | Confiar só no status do payload. |
| Aprovação confirmada | Aplicar cobrança uma vez | Reabrir pedido reservado/consumido. |
| Autorização de assinatura | Atualizar autorização | Conceder período sem cobrança. |
| Mesma cobrança novamente | Atualizar fatos legitimamente novos | Duplicar geração ou período. |
| Cancelamento confirmado | Interromper renovação | Apagar período legitimamente pago. |
| Reembolso integral confirmado | Revogar direitos vinculados | Revogar outro período independente. |
| Contestação | Suspender gerações/edições relacionadas | Bloquear toda a conta indiscriminadamente. |

- Usar um reconciliador para webhook, recuperação agendada e consulta controlada. Reconsultar recurso atual antes de aplicar transição para evitar regressão por evento antigo.
- Verificar assinatura/autenticação de acordo com a modalidade, referência interna, valor imutável da tentativa, moeda, recebedor e ambiente. Separar recursos de teste e produção.
- ID do recurso não é ID único de notificação. Não deduplicar permanentemente por recurso e ação, pois a mesma ação pode trazer aprovação posterior a pendência.
- Aplicar efeito financeiro com chave única por cobrança e tipo de efeito. Eventos repetidos não reexecutam o efeito; mudanças legítimas continuam possíveis.
- Operações de saída mantêm chave idempotente da mesma operação durante retries. Nova chave só para nova operação, conforme suporte de cada operação externa.
- Reservas de processamento têm lease recuperável; um crash não bloqueia permanentemente o evento. A conclusão transacional e a posse da lease impedem dois processadores de concluir efeitos concorrentes.
- Não executar rede dentro de callback transacional Firestore. Persistir intenção e trabalho; executar fora da transação e reconciliar resultados, inclusive resultado desconhecido por timeout.
- Reconciliação de pendências é limitada, paginada e observável, com retries/backoff. Não depender exclusivamente da navegação do cliente ou de um webhook perfeito.
- Requisições de infraestrutura e callbacks agendados exigem autenticação própria; App Check não substitui identificação nem autorização.

### 9. Reembolso, contestação e atendimento

- Cobrança excedente aprovada do mesmo documento aciona estorno integral automático restrito, identificado por cobrança. Não estornar a mesma cobrança duas vezes nem a cobrança escolhida para entrega.
- Solicitação comum coleta motivo e gera ocorrência; administrador confirma valor integral e execução. Suporte pode analisar sem permissão para movimentar fundos.
- Resultado externo desconhecido ou pendente permanece em processamento. Informar “reembolsado” apenas após confirmação autoritativa.
- Reembolso integral confirmado revoga novos downloads, edições e gerações vinculados, preservando registro e versões para fins internos legítimos. Não há recolhimento de arquivos já baixados.
- Reembolso de Pro revoga o período afetado, mantendo outros períodos pagos. Não implementar apenas um booleano global que apague todo o histórico de acesso.
- Reembolso parcial externo registra fato e ocorrência; não inferir proporcionalidade ou dias a retirar. Execução parcial pela administração está fora da primeira versão.
- Contestação suspende novas gerações/edições relacionadas e gera aviso/ocorrência. Downloads não são automaticamente revogados por essa regra; reversão integral confirmada segue regra de reembolso. Resolução favorável restaura direitos ainda cabíveis sem recriar benefício promocional.
- Fila administrativa reúne geração, confirmação, e-mail, cancelamento, estorno, contestação e correção de identificador, com responsável, linha do tempo, resultado e ações permitidas.

### 10. Acesso, e-mail e dados pessoais

- Links guest temporários estabelecem sessão restrita. Tokens de alta entropia, armazenamento protegido/derivado, expiração e revogação; não registrar token ou URL completa em logs.
- TTL e duração de sessão são configuração de segurança documentada, ainda não números comerciais aprovados. Não apresentá-los como decisão prévia da entrevista.
- Reenvio de link responde de forma neutra para evitar enumeração; aplicar limites contra abuso sem impedir recuperação legítima.
- Validar autorização em cada leitura/download/correção. IDs de pedido, e-mail conhecido e App Check isoladamente não provam titularidade.
- Vínculo à conta exige e-mail verificado e atualização atômica/recuperável dos direitos. CPF/CNPJ informado não transfere acesso a outra conta.
- Identidade já vinculada a outra conta bloqueia contratação/desconto duplicados, oferece recuperação e não revela e-mail. Transferência exige comprovação de acesso.
- Minimizar CPF/CNPJ armazenado; proteger dado necessário e usar derivação com chave para comparação quando apropriado. Hash simples de identificador previsível não é proteção suficiente.
- E-mail transacional é trabalho persistido, com chave de deduplicação, retries limitados e acompanhamento. Falha de envio não desfaz pagamento nem repete geração.
- Verificar armazenamento privado e mecanismo de URLs/sessões de download. Retenção, termos e privacidade devem ser coerentes com o acesso vendido antes de publicar.

### 11. Incertezas externas que impedem concluir a integração

- **Preço introdutório:** checkout hospedado e alteração de valor de assinatura foram encontrados na pesquisa; programação nativa de dois preços não foi comprovada. A hipótese de criar a 29,90 e alterar para 39,90 após a aprovação precisa demonstrar persistência, retries, concorrência e próxima cobrança correta. Não fixar essa hipótese como implementação aprovada.
- **Expiração:** prazo no banco não comprova invalidação de link hospedado. Demonstrar expiração/cancelamento, corrida com aprovação e tratamento da cobrança tardia.
- **Pix:** verificar requisitos e estados da modalidade on-line escolhida. Não transpor exceções de autenticação de QR presencial para Pix on-line. Não misturar estado `approved` de Payments com `processed` de Orders.
- **Ciclo:** confirmar relação entre autorização, cobrança recorrente e datas efetivamente pagas. Não liberar Pro com `authorized` isoladamente nem inventar período com “agora mais 30 dias”.
- **Operação:** verificar configuração existente de e-mail, tarefas persistidas, agendamento e permissões; selecionar a execução compatível com a infraestrutura real.
- Se uma promessa não tiver implementação confiável, apresentar a limitação e proposta de revisão ao responsável antes de publicar. Não reduzir escopo comercial silenciosamente.

## Testing Decisions

### Superfície e qualidade

- Seam principal confirmada pelo usuário: fluxos públicos de checkout, acompanhamento, assinatura e documento. Testar resultados observáveis e permissões; não estrutura de classes, texto do código ou contagem de chamadas internas sem significado externo.
- Complementar com transações Firestore reais em emulador, contratos do adapter externo e validações no ambiente do Mercado Pago. Um adapter falso não demonstra concorrência real nem aceitação externa.
- Prior art existente: contratos de criação/status de checkout, idempotência de documentos, reserva e consumo de pedidos, entitlement Pro, ciclo de assinatura, segurança de webhook e E2E de compra autenticada/mobile e versionamento Pro. Reaproveitar os helpers úteis, substituindo premissas antigas conflitantes.
- Usar relógio controlado para validade/ciclos e dados sintéticos. Verificar o efeito financeiro persistido além da resposta HTTP.

### Matriz mínima de aceitação

| Grupo | Casos necessários | Evidência exigida |
| --- | --- | --- |
| Checkout avulso | Guest com e-mail, conta, Pix, cartão à vista, input inválido, repetição e falha externa | Preço autoritativo, tentativa recuperável, método correto e ausência de cobrança duplicada. |
| Aprovação e entrega | Aba fechada, webhook atrasado, geração automática, crash e retry | Um documento lógico, conteúdo do snapshot pago e nenhuma cobrança adicional. |
| Documento | Correções antes/no/depois do limite, troca de partes/modelo, CPF/CNPJ e modelos sem identificador | Regra no backend e direitos observáveis; nenhum bypass por requisição direta. |
| Acesso guest | Link expirado/inválido, reenvio, sessão, terceiro, e-mail não verificado e incorporação | Sem enumeração/vazamento e preservação dos prazos e reversões. |
| Pro | Autorizado sem pagamento, primeira aprovação, renovação, duplicata, falha e vencimento | Nenhum acesso gratuito indevido ou extensão duplicada. |
| Cancelamento | Sucesso, timeout, retry, webhook antigo, continuidade e duas abas | Estado verdadeiro, período preservado e nenhuma assinatura sobreposta. |
| Oferta | Limites de 2h/30min, relógio adulterado, aparelhos, recusa, identidade vinculada e múltiplas tentativas | Janela única autoritativa e valor imutável por tentativa. |
| Oferta tardia | Pagamento pontual com webhook tardio e pagamento realmente tardio | Primeiro normal; segundo honrado com incidente e suspensão de novas ofertas do fluxo. |
| Financeiro | Duas cobranças, estorno retry, timeout desconhecido, parcial externo, contestação e restauração | Efeito único, direitos restritos ao vínculo e fila administrativa. |
| Concorrência | Notificações diferentes da mesma cobrança, ordem invertida, crash após claim e workers concorrentes | Sem reabrir consumido, sem duplicar período, lease recuperável. |
| Segurança | Titularidade, RBAC, assinatura inválida, valor/moeda/recebedor/ambiente incorretos, segredos e redirecionamentos | Rejeição sem efeito financeiro ou acesso indevido. |
| Operação | E-mail falhando, trabalho interrompido, reconciliação sem webhook e sem navegador | Recuperação limitada e observável com caso de suporte ao esgotar tentativas. |

- E2E integrados usam identidade verificada, Firestore e rotas reais sem bypass de autorização. Mocks do provedor em testes locais devem ser declarados como tais.
- Validar geração/retomada em desktop e mobile; não exigir performance por números inventados. Medir latência, leituras e fan-out para evitar regressões e consultas externas por cada tick de tela.
- Executar lint, typecheck, testes focados e build compatíveis com o projeto; ampliar para regressão integrada quando os módulos compartilhados forem alterados.
- Provar por separado Pix, cartão e reembolso externos. Comprovar renovação a 39,90, não apenas primeiro pagamento a 29,90. Registrar IDs, ambiente e resultados com dados sensíveis removidos.
- A validação com dinheiro real requer aprovação específica de valores e execução naquele momento. A publicação da especificação não concede essa autorização.

### Definition of Done

1. Todos os critérios comerciais acima estão implementados ou uma alteração de escopo foi explicitamente aprovada.
2. Preço promocional/renovação e expiração têm prova externa suficiente para sustentar as promessas publicadas.
3. Testes transacionais e E2E comprovam invariantes, acesso e recuperação; CI e build passam no conteúdo entregue.
4. Configuração de produção rejeita modo demonstrativo indevido; segredos, RBAC, tarefas e observabilidade estão verificados.
5. Administração consegue tratar exceções; existe procedimento de recuperação e suspensão de novas ofertas sem bloquear compras pagas.
6. Políticas publicadas e textos de preço/cancelamento/correção são coerentes com o funcionamento.
7. Evidências distinguem local, emuladores, testes externos e produção. Merge, deploy e movimentação real não são inferidos de testes verdes.

## Out of Scope

- Cartão transparente dentro do site, boleto, débito, parcelamento, outras moedas, planos anuais e gateways adicionais.
- Franquia mensal Pro, geração de modelos externos ao catálogo e créditos avulsos intercambiáveis.
- Substituir modelo/partes como correção gratuita ou ampliar indefinidamente a janela de sete dias.
- Executar reembolso parcial administrativo, criar cálculo proporcional automático ou conceder tolerância Pro após o período pago.
- Contador que reinicia, falsa escassez, nova promoção após cancelamento e cobrança complementar do primeiro mês tardio honrado.
- Refazer marca, landing ou motor de PDF sem necessidade concreta da integração.
- Encerrar issues antigas, substituir código remoto não inspecionado, merge, deploy e testes com dinheiro real como efeito desta especificação.

## Further Notes

### Histórico e conflitos conhecidos

Há trabalho anterior no rastreador que não estava nas referências locais inicialmente consultadas:

- [Issue #5 — integração Mercado Pago](https://github.com/Kauerc10/docfacil/issues/5).
- [Issue #34 — hardening Mercado Pago](https://github.com/Kauerc10/docfacil/issues/34).
- [Issue #36 — ciclo e cancelamento](https://github.com/Kauerc10/docfacil/issues/36).
- [Issue #37 — vigência após cancelamento](https://github.com/Kauerc10/docfacil/issues/37).

Esses documentos são referências de contexto, não prova do estado atual nem decisões automaticamente herdadas. Preço Pro 34,90, acesso concedido apenas por autorização, fallback demonstrativo por falta de segredo, downgrade imediato ao cancelar e vigência inventada sem pagamento não prevalecem sobre a entrevista atual. Não fechar ou alterar essas issues automaticamente.

### Fontes externas para verificação da implementação

- [Assinatura pendente com checkout hospedado](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments).
- [Gestão de assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/subscription-management).
- [Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/overview).

As fontes orientam as comprovações; esta especificação não substitui a validação dos contratos específicos no momento da implementação.

### Execução e entrega sugeridas

1. Verificar estado remoto e prior art, sem abandonar a base autorizada ou sobrescrever alterações locais de PDF.
2. Comprovar assinatura promocional, renovação e validade externa; registrar evidência e decidir a implementação confiável.
3. Consolidar invariantes, dados e interface do módulo; corrigir regressões de deduplicação e consumo com testes.
4. Entregar avulso com geração/acesso recuperáveis, depois Pro e oferta comprovada, preservando integração contínua dos fluxos.
5. Completar exceções, administração, e-mail e reconciliação; executar regressão e E2E.
6. Apresentar resultado revisável, pendências e prova externa; pedir autorização específica para validação real e publicação quando aplicável.

O rótulo `ready-for-agent` indica especificação pronta para execução começando pelas comprovações e inspeções acima. Não significa pagamento em produção aprovado ou ausência de incertezas externas.
