# Plano de tickets — Mercado Pago

Estado: divisão aprovada e 21 tickets publicados no GitHub em 2026-10-20 com ready-for-agent. Implementação não iniciada nesta etapa.

Branch obrigatória para todos os tickets: `feat/abacatepay-real-billing`. Não criar outras branches nem trocar de checkout sem nova orientação. Preservar alterações locais de PDF. Fonte: especificação de 2026-10-20 aprovada na conversa; não há issue-pai publicada.

Os tickets 01 e 02 são exceções deliberadas: prefatoração corretiva com prova pela interface existente e comprovação externa demonstrável. Os demais entregam fluxos verticais com persistência, operações públicas, interface e testes pertinentes. Cada ticket começa pela frontier de dependências concluídas; a ordem numérica não exige executar tickets independentes em série.

## 01. Preservar compra e assinatura ao corrigir transições financeiras

**Bloqueado por:** Nenhum; pode começar imediatamente.

**Entrega:** Cliente não perde nem reutiliza indevidamente uma compra quando chegam confirmações repetidas.

- [ ] Reproduzir na interface pública a regressão de pedido consumido que volta a pago e corrigi-la sem alterar a entrega atual.
- [ ] Aplicar uma cobrança e um período Pro uma única vez sob notificações concorrentes; permitir atualizações legítimas posteriores.
- [ ] Recuperar processamento interrompido com lease e efeitos idempotentes; transações reais Firestore comprovam a regra.
- [ ] Prefatorar somente o necessário; manter fluxos e verificações existentes funcionando.

## 02. Comprovar desconto e expiração no checkout hospedado de assinatura

**Bloqueado por:** Nenhum; pode começar imediatamente.

**Entrega:** Demonstração restrita ao ambiente de testes de primeiro mês a R$ 29,90, renovação a R$ 39,90 e validade da tentativa.

- [ ] Exercitar criação, checkout, consulta e confirmação de cobrança com interface mínima restrita, sem publicar a oferta.
- [ ] Demonstrar renovação a 39,90, inclusive recuperação de falha na atualização do preço; distinguir simulação de prova externa.
- [ ] Medir invalidação real de link após 30 minutos e corrida com aprovação; prazo local não é prova de bloqueio externo.
- [ ] Documentar solução confiável ou impedimento com evidências; se inviável, a oferta continua bloqueada até revisão aprovada.
- [ ] Sem dinheiro real, secrets no relatório ou alteração de preços públicos.

## 03. Comprar e receber um avulso por Pix dentro do site

**Bloqueado por:** 01

**Entrega:** Comprador paga R$ 19,90 por Pix e recebe o documento do rascunho salvo.

- [ ] Salvar rascunho validado e vincular comprador, modelo e preço antes de criar tentativa idempotente.
- [ ] Exibir QR/copia-e-cola e validade real; guest fornece e-mail, WhatsApp é opcional.
- [ ] Confirmar recurso no Mercado Pago com validações de assinatura aplicáveis, valor, moeda, recebedor e ambiente.
- [ ] Após aprovação iniciar geração persistida e liberar um único documento sem marca-d'água; aba fechada não impede conclusão.
- [ ] Demonstrar E2E de checkout, callback e download autorizado; não implementar apenas um client externo.

## 04. Comprar e receber avulso por crédito à vista hospedado

**Bloqueado por:** 03

**Entrega:** A seleção de cartão abre checkout hospedado e entrega o mesmo tipo de documento comprado por Pix.

- [ ] Selecionar crédito à vista de fato e manter preço 19,90 calculado no servidor.
- [ ] Retorno, rejeição e abandono não marcam pedido pago; aprovação autoritativa entrega documento uma única vez.
- [ ] Tentativas repetidas e URLs de retorno inválidas são tratadas sem cobrança duplicada.
- [ ] E2E cobre cartão selecionado, redirecionamento, retorno e entrega; declarar limitações do ambiente externo.

## 05. Recuperar geração paga que falhou

**Bloqueado por:** 03

**Entrega:** Cliente pode tentar novamente sem pagar, acompanhar falha e escolher aguardar ou solicitar atendimento.

- [ ] Falha preserva compra e snapshot e permite retry imediato sem nova cobrança.
- [ ] Queda entre reserva, arquivo e confirmação não duplica documento ou perde versão válida.
- [ ] Tentativas automáticas são limitadas; falha persistente cria ocorrência acompanhável e oferece aguardar/reembolso solicitado.
- [ ] Testar pela interface pública com falhas injetadas e transação real.

## 06. Entregar acesso guest recuperável por e-mail

**Bloqueado por:** 03

**Entrega:** Comprador sem conta acessa sua compra em outro aparelho por link temporário e recupera links expirados.

- [ ] Pagamento confirmado cria envio persistido com acesso à compra e ao andamento da geração.
- [ ] Link temporário estabelece sessão restrita; download exige autorização e arquivo privado.
- [ ] Reenvio responde sem enumeração; token expirado ou de outra compra não concede acesso.
- [ ] Falha de e-mail tem retry limitado, não desfaz compra, e gera ocorrência visível persistindo a falha.
- [ ] Documentar TTL e revogação como configuração, com testes de acesso e entrega.

## 07. Incorporar compras guest à conta verificada

**Bloqueado por:** 06

**Entrega:** Cliente reúne compras anteriores ao verificar o e-mail, sem perder direitos ou acessar compras alheias.

- [ ] Exigir verificação de posse do e-mail; CPF/CNPJ informado não transfere documentos.
- [ ] Preservar prazo original de sete dias, versões, direitos e reversões; não restaurar compras reembolsadas.
- [ ] Incorporação repetida ou concorrente não duplica compras e pode recuperar interrupção.
- [ ] E2E demonstra compra guest, cadastro/verificação e acesso na biblioteca.

## 08. Corrigir o mesmo avulso durante sete dias

**Bloqueado por:** 03

**Entrega:** Comprador corrige campos do mesmo documento dentro do prazo e mantém downloads posteriores.

- [ ] Contar sete dias do primeiro sucesso de geração; exibir prazo antes da compra e no documento.
- [ ] Bloquear troca de modelo/partes no backend; permitir ajuste de nome preservando CPF/CNPJ.
- [ ] Correção de identificador vira solicitação acompanhável, sem conceder permissão automaticamente.
- [ ] Mapear regra equivalente em modelos sem CPF/CNPJ; regra sem definição comprovável exige revisão de produto.
- [ ] E2E cobre limites temporais, tentativa direta de bypass, novas versões e downloads depois do prazo.

## 09. Contratar Pro regular e aplicar períodos pagos

**Bloqueado por:** 01

**Entrega:** Conta contrata Pro a R$ 39,90/mês com todos os modelos, gerações ilimitadas e histórico/edição.

- [ ] Checkout hospedado e identidade autenticada/verificada; autorização de assinatura isolada não libera acesso.
- [ ] Primeira cobrança aprovada cria mês completo; renovação confirmada aplica período único.
- [ ] Exibir próxima data e valor; fim do período sem renovação retorna ao grátis sem apagar histórico/downloads existentes.
- [ ] Novas versões exigem direito ativo; nenhuma franquia comercial oculta.
- [ ] E2E e concorrência real demonstram primeiro pagamento, renovação, falha e vencimento.

## 10. Impedir assinaturas simultâneas e recuperar identidade

**Bloqueado por:** 09

**Entrega:** Cliente não recebe cobranças Pro sobrepostas e encontra recuperação segura de vínculo.

- [ ] Controle transacional impede duplicidade entre abas e contas; não depender apenas do campo de plano do perfil.
- [ ] Verificar necessidade de CPF/CNPJ; proteger comparação e armazenamento, sem identificador em logs/interface administrativa.
- [ ] Identidade já vinculada oferece recuperação/transferência com comprovação e sem revelar e-mail de outra conta.
- [ ] Tentativa pendente válida é recuperada sem criar autorização adicional; operações antigas não alteram assinatura atual.
- [ ] Testar concorrência e tentativas de acesso indevido por identidade conhecida.

## 11. Cancelar e continuar Pro preservando período pago

**Bloqueado por:** 10

**Entrega:** Cliente cancela pela conta e acompanha confirmação, ou continua com Pro sem cobrança sobreposta.

- [ ] Mostrar cancelamento em processamento até confirmação externa; timeout/falha são recuperáveis e geram ocorrência quando persistentes.
- [ ] Interromper renovação externa e preservar período legitimamente pago; não cancelar compra histórica como se fosse reembolso.
- [ ] Continuar depende do estado e suporte externo comprovados; não prometer reativação impossível ou cobrança imediata.
- [ ] Testar fim da vigência, callbacks antigos, retries, assinatura substituída e concorrência com renovação.

## 12. Aplicar oferta real de boas-vindas com contador persistido

**Bloqueado por:** 02, 10

**Entrega:** Novo assinante recebe uma única janela de duas horas e primeiro mês a R$ 29,90, seguido de R$ 39,90/mês.

- [ ] Início na primeira visualização autenticada; persistência atômica por cliente e relógio servidor entre dispositivos.
- [ ] Identidade elegível nunca teve Pro pago; consumo somente após aprovação, sem reset por recusa/cancelamento.
- [ ] Preço/validade imutáveis por tentativa; até 30 minutos desde início dentro da janela; retry não estende.
- [ ] Mostrar renovação automática e preço futuro antes de contratar; só habilitar mecanismo comprovado no ticket 02.
- [ ] Teste com relógio adulterado, múltiplas contas/abas e limites exatos de validade.

## 13. Honrar pagamento promocional tardio e conter incidente

**Bloqueado por:** 12

**Entrega:** Cliente recebe o mês pelo valor aceito mesmo fora do prazo, e novas ofertas do fluxo são suspensas até correção.

- [ ] Distinguir timestamp de pagamento do horário de recebimento da notificação; atraso de webhook não dispara incidente indevido.
- [ ] Cobrança realmente tardia de 29,90 entrega um mês sem complemento e cria ocorrência.
- [ ] Suspensão persistida bloqueia novas ofertas do fluxo, preservando acompanhamento e entrega já pagos.
- [ ] Recuperação administrativa é auditada e só reabre fluxo após comprovação da correção.
- [ ] Testes de pagamento pontual notificado tarde, pagamento tardio, múltiplos workers e suspensão concorrente.

## 14. Solicitar e administrar reembolso integral de avulso

**Bloqueado por:** 03

**Entrega:** Cliente solicita reembolso e administrador autorizado decide e executa com acompanhamento.

- [ ] Solicitação com motivo e histórico; suporte analisa sem movimentar fundos.
- [ ] Somente administrador autorizado executa após confirmar valor; registrar responsável/motivo/operação.
- [ ] Persistir operação externa idempotente e reconciliar timeout; apenas confirmação marca reembolsado.
- [ ] Reembolso confirmado bloqueia novos downloads, gerações e edições vinculadas; preserva registros.
- [ ] Parcial externo vira ocorrência sem revogação proporcional inventada; testes de RBAC e reversão.

## 15. Estornar automaticamente cobrança avulsa excedente

**Bloqueado por:** 14

**Entrega:** Duas cobranças aprovadas do mesmo documento entregam um documento e devolvem a excedente.

- [ ] Eleger cobrança que sustenta entrega de forma transacional; não estornar ambas nem a válida por corrida.
- [ ] Estorno automático é regra restrita separada da permissão humana de reembolso.
- [ ] Chave e estado por cobrança excedente impedem repetição; acompanhar confirmação e falha.
- [ ] Falha abre ocorrência e permite recuperação administrativa sem novo estorno indevido.
- [ ] Testar pagamentos Pix/cartão concorrentes e repetição de callbacks da mesma cobrança.

## 16. Reembolsar período Pro sem revogar outros períodos

**Bloqueado por:** 09, 14

**Entrega:** Reembolso integral de uma cobrança Pro remove somente os direitos financiados por ela.

- [ ] Apresentar cobrança, período e valor para administrador; reutilizar autorização e execução financeira seguras.
- [ ] Aplicar reversão por período, preservar outros períodos pagos e histórico e não restaurar promoção consumida.
- [ ] Distinguir reembolso, cancelamento de renovação e vencimento; parcial externo exige análise.
- [ ] Testar períodos sobrepostos/consecutivos, renovação concorrente e callbacks repetidos.

## 17. Tratar contestação e restaurar direitos cabíveis

**Bloqueado por:** 14, 16

**Entrega:** Cliente é avisado de contestação e restrições relacionadas, com restauração quando resolvida favoravelmente.

- [ ] Consultar fato externo e vincular à cobrança; suspender novas gerações/edições relacionadas, sem bloquear toda a conta.
- [ ] Abrir ocorrência com histórico e avisar cliente; não revogar downloads só por contestação.
- [ ] Resolução favorável restaura apenas direitos ainda cabíveis; reversão financeira definitiva respeita períodos/vínculos.
- [ ] Eventos antigos/repetidos não recriam benefício nem desfazem resolução atual.
- [ ] E2E cobre compra avulsa e período Pro, incluindo direitos independentes preservados.

## 18. Resolver solicitações de correção de identidade

**Bloqueado por:** 08

**Entrega:** Suporte distingue erro de CPF/CNPJ de substituição da pessoa e registra decisão auditável.

- [ ] Solicitação fica vinculada ao documento e prazo, com comprovação segura sem expor identificador na listagem.
- [ ] Aprovar erro legítimo permite apenas a correção autorizada; substituir pessoa exige nova compra.
- [ ] Suporte não ganha permissão de reembolso ou transferência automática de conta.
- [ ] Testar autorização, expiração e retries de aprovação e versão corrigida.

## 19. Recuperar pagamentos sem webhook ou navegador

**Bloqueado por:** 04, 06, 09

**Entrega:** Compras e assinaturas continuam convergindo mesmo quando faltam notificações ou há tarefas interrompidas.

- [ ] Reutilizar reconciliador já empregado nos fluxos; não implementar outra regra financeira.
- [ ] Execução agendada autenticada, paginada e limitada recupera pendências/leases e efeitos sem depender de aba aberta.
- [ ] Backoff, deduplicação e limites impedem consultas por tick e tempestades de retries.
- [ ] Cliente vê estado recuperado e administrador encontra falhas persistentes com correlação sem dados sensíveis.
- [ ] Teste integrado interrompe callback e worker, retoma execução e demonstra efeitos únicos.

## 20. Operar fila administrativa e revisar configuração de publicação

**Bloqueado por:** 05, 06, 11, 13, 15, 16, 17, 18, 19

**Entrega:** Administração acompanha todas as exceções e produto só habilita caminhos externos configurados e operáveis.

- [ ] Consolidar ocorrências já produzidas nos tickets anteriores com responsável, histórico, filtros e ações por permissão.
- [ ] Verificar segredos server-only, ambientes segregados, modo demo bloqueado indevidamente em produção e tarefas protegidas.
- [ ] Revisar textos de compra, promoção, correções, cancelamento e políticas conforme comportamento, sem inventar direitos legais.
- [ ] Preparar procedimentos de recuperação, suspensão da oferta e tratamento de falha; medir sinais operacionais relevantes.
- [ ] Demonstração com usuário suporte e administrador comprova RBAC, histórico e ações recuperáveis.

## 21. Validar integração completa e preparar liberação controlada

**Bloqueado por:** 07, 20

**Entrega:** Responsável recebe evidência reproduzível dos fluxos completos antes de liberar produção.

- [ ] Executar regressão, lint, typecheck, build e E2E reais de autenticação/Firestore/rotas, distinguindo mocks e contratos externos.
- [ ] Comprovar Pix, cartão, geração, acesso guest, correções, Pro, renovação, oferta, cancelamento, reembolsos e contestação.
- [ ] Registrar prova externa do primeiro mês e renovação nos valores corretos; não chamar primeira cobrança de prova de recorrência.
- [ ] Validação com dinheiro real só após aprovação específica de valores e execução naquele momento; sem autorização registrar pendência e concluir checks independentes.
- [ ] Não inferir merge/deploy a partir do ticket; entregar riscos e evidências para decisão de liberação.

## Publicação concluída

Publicada uma issue por ticket após aprovação da divisão. Todas possuem ready-for-agent e a branch obrigatória. Dependências constam em Blocked by com números reais; as ferramentas disponíveis não expõem relações nativas de bloqueio. Nenhuma issue anterior foi modificada ou encerrada e não há issue-pai publicada.

| Ticket | Issue |
| --- | --- |
| 01 | [#43](https://github.com/Kauerc10/docfacil/issues/43) |
| 02 | [#44](https://github.com/Kauerc10/docfacil/issues/44) |
| 03 | [#45](https://github.com/Kauerc10/docfacil/issues/45) |
| 04 | [#46](https://github.com/Kauerc10/docfacil/issues/46) |
| 05 | [#47](https://github.com/Kauerc10/docfacil/issues/47) |
| 06 | [#48](https://github.com/Kauerc10/docfacil/issues/48) |
| 07 | [#49](https://github.com/Kauerc10/docfacil/issues/49) |
| 08 | [#50](https://github.com/Kauerc10/docfacil/issues/50) |
| 09 | [#51](https://github.com/Kauerc10/docfacil/issues/51) |
| 10 | [#52](https://github.com/Kauerc10/docfacil/issues/52) |
| 11 | [#53](https://github.com/Kauerc10/docfacil/issues/53) |
| 12 | [#54](https://github.com/Kauerc10/docfacil/issues/54) |
| 13 | [#55](https://github.com/Kauerc10/docfacil/issues/55) |
| 14 | [#56](https://github.com/Kauerc10/docfacil/issues/56) |
| 15 | [#57](https://github.com/Kauerc10/docfacil/issues/57) |
| 16 | [#58](https://github.com/Kauerc10/docfacil/issues/58) |
| 17 | [#59](https://github.com/Kauerc10/docfacil/issues/59) |
| 18 | [#60](https://github.com/Kauerc10/docfacil/issues/60) |
| 19 | [#61](https://github.com/Kauerc10/docfacil/issues/61) |
| 20 | [#62](https://github.com/Kauerc10/docfacil/issues/62) |
| 21 | [#63](https://github.com/Kauerc10/docfacil/issues/63) |

