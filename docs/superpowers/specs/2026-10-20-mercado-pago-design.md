# Integração Mercado Pago — consolidação da entrevista

Estado: regras Q1–Q44 respondidas; aguardando confirmação do entendimento consolidado. Não é prova de integração implementada nem autorização para publicar ou movimentar dinheiro real.

Base: `feat/abacatepay-real-billing`. Preservar alterações locais de PDF. Referências: `docs/research/payment-migration-code-audit.md` e `docs/research/mercado-pago-integration-research.md`.

## Decisões de produto aprovadas

### Compra avulsa — Q1–Q5, Q9–Q13, Q15, Q18–Q20, Q29–Q31

- R$ 19,90 por documento; Pix dentro do site e crédito à vista em checkout hospedado. Sem boleto, parcelamento ou débito nesta primeira versão.
- Cadastro dispensável para avulso; e-mail obrigatório, WhatsApp opcional. Pro exige conta.
- Salvar versão completa e validada do rascunho antes de criar a tentativa. Vincular a compra ao modelo, rascunho e partes; não transformar pagamento em crédito genérico.
- Após confirmação autoritativa, iniciar geração automaticamente. Página e e-mail mostram documento ou andamento. Fechar a página não impede conclusão.
- Permitir downloads posteriores sem cobrança e correções por sete dias após a primeira geração bem-sucedida. Não reiniciar prazo por reenvio, nova versão ou vínculo posterior à conta.
- Correções dos campos são permitidas sem trocar modelo ou partes principais. Ajustes de nome mantendo CPF/CNPJ são automáticos; mudança de CPF/CNPJ exige análise do suporte. Modelos sem identificador precisam de regra equivalente explicitada antes de sua implementação.
- Falha na geração permite nova tentativa sem pagamento; persistindo, abrir pendência e oferecer aguardar ou solicitar reembolso. Sem tentativas infinitas.
- Acesso guest por link temporário que cria sessão restrita à compra; reemissão por e-mail. Arquivos protegidos, sem endereço público permanente.
- Após verificação do e-mail, incorporar compras anteriores à conta com os direitos e prazos originais; não restaurar compras reembolsadas. Informar CPF/CNPJ não concede acesso aos documentos de outra conta.

### Pro — Q6–Q8, Q12, Q14, Q26–Q28, Q33–Q35, Q39–Q40, Q44

- R$ 39,90 por mês; todos os modelos disponíveis, gerações ilimitadas, sem marca-d'água, histórico e edição. Sem franquia comercial; controles técnicos contra abuso não podem se tornar uma franquia oculta.
- Acesso começa com primeira cobrança aprovada, por um período mensal completo. Autorização da assinatura sozinha não libera Pro.
- Mostrar valor e data da próxima cobrança. Renovação automática, sem parcelar mensalidade.
- Cancelamento pela conta interrompe futuras renovações e preserva período pago. Mostrar processamento até confirmação externa; falha gera aviso e pendência. Não informar cancelamento concluído prematuramente.
- Retomada pelo comando “Continuar com o Pro”, respeitando estado externo, período pago e ausência de cobrança imediata ou sobreposição indevida.
- Falha de renovação não encerra o período já pago nem concede dias extras. Ao vencer, retornar ao grátis, preservar histórico/downloads de versões existentes e oferecer regularização.
- Novas edições/versões após vencer exigem Pro ativo ou compra avulsa vinculada, sujeita às regras do avulso.
- Impedir assinaturas simultâneas. Identificação proposta: e-mail verificado e CPF/CNPJ, condicionada à necessidade confirmada na integração; não usar apenas cartão/e-mail para elegibilidade promocional.
- CPF/CNPJ já vinculado a outra conta impede contratação/desconto duplicados e oferece recuperação/transferência com comprovação; não expor e-mail da outra conta.

### Oferta de boas-vindas — Q26, Q32–Q40, Q43

- Primeiro mês R$ 29,90; seguintes R$ 39,90/mês. Exibir antes de confirmar: “R$ 29,90 no primeiro mês. Depois, R$ 39,90/mês, com renovação automática.”
- Campanha sem data final global; oferta individual real de duas horas iniciada na primeira visualização por usuário autenticado, com relógio e vencimento persistidos pelo backend.
- Não reiniciar ao trocar aparelho/navegador, atualizar página ou receber recusa.
- Apenas clientes sem assinatura Pro paga anteriormente; benefício uma única vez. Consumir elegibilidade somente com pagamento aprovado; cancelamento e retorno não recuperam desconto.
- Tentativa iniciada dentro da oferta pode concluir em até 30 minutos desde seu início. Novas tentativas fora da oferta apresentam preço normal antes de cobrar.
- Pagamento realizado dentro do prazo com notificação tardia é válido normalmente.
- Se o provedor aceitar R$ 29,90 fora da janela, honrar o mês pelo valor cobrado, sem diferença; registrar incidente e suspender novas ofertas desse fluxo até corrigir. Não confundir validade da oferta com validade de um pagamento já realizado.

### Exceções e administração — Q16–Q25, Q41–Q42

- Cobranças aprovadas excedentes do mesmo documento não geram outro documento: solicitar estorno automático da excedente e acompanhar; falha abre pendência administrativa.
- Solicitação de reembolso pela compra com motivo, acompanhamento e análise. Duplicidade e falha definitiva de entrega têm tratamento específico.
- Primeira versão executa reembolso integral por cobrança. Reembolso parcial externo vira caso para análise, sem redução arbitrária de direitos.
- Só administrador autorizado executa reembolso comum, com confirmação de valor e auditoria de responsável, motivo e resultado. Suporte analisa sem movimentar dinheiro. Estorno automático de duplicidade usa regra restrita aprovada, separada dessa permissão humana.
- Reembolso integral confirmado preserva registros e encerra novas edições, gerações e downloads vinculados. Arquivos já baixados não podem ser recolhidos. No Pro, atingir o período reembolsado e preservar outros períodos pagos.
- Contestação suspende temporariamente novas gerações/edições relacionadas à cobrança, avisa cliente e abre pendência. Resolução favorável restaura direitos cabíveis.
- E-mail falhando não desfaz pagamento nem acesso; reenvios limitados e pendência em falha persistente.
- Fila administrativa: geração, confirmação, e-mail, cancelamento, estorno, contestação e correção de CPF/CNPJ; responsável, histórico e resolução.
- Validação real controlada após testes, com valores e execução aprovados pelo usuário naquele momento. Renovação precisa de evidência própria.

## Arquitetura proposta — ainda não implementada

Aplicar `codebase-design`: um módulo de pagamentos profundo cuja interface concentra início de checkout, acompanhamento e gestão; rotas e telas não conhecem detalhes financeiros do Mercado Pago. A implementação concentra estado financeiro, elegibilidade, autorização e recuperação para produzir locality e leverage.

- Manter interfaces pequenas orientadas ao produto, com invariantes e erros explícitos; não criar camada genérica de múltiplos gateways apenas para um futuro hipotético.
- Usar adapter externo na seam real de comunicação com Mercado Pago e adapter de persistência Firestore; dependências, relógio e identificadores injetados nos testes. Dados brutos do provedor não atravessam a interface do produto.
- Separar pedido comercial, tentativa de pagamento, cobrança efetiva, assinatura, período pago e direito ao documento. Estado de geração não substitui estado financeiro.
- Um único reconciliador aplica fatos confirmados pelo provedor para webhooks, consulta controlada e recuperação. Retorno do navegador nunca confirma pagamento.
- Validar autenticação do webhook conforme modalidade e consultar o recurso externamente; conferir referência, valor esperado daquela tentativa, moeda, recebedor e ambiente.
- Chave idempotente por operação lógica, reutilizada em retries; efeito financeiro deduplicado por cobrança, sem ignorar futuras mudanças legítimas de estado do mesmo recurso.
- Aplicação transacional de cobranças/direitos/eventos; não reabrir pedido consumido, não duplicar período Pro, recuperar leases vencidas e impedir regressão por notificações antigas.
- Efeitos externos como geração, e-mail e estorno têm trabalho persistido com recuperação e tentativas limitadas. Não fazer HTTP externo dentro de transação Firestore.
- Consulta do navegador com backoff e parada em estados terminais; reconciliação agendada com limites e recuperação independente da aba aberta.
- Segredos server-only, configuração de produção fail-closed, credenciais segregadas, logs sem identificadores pessoais e sem links de acesso. Validar proteção/armazenamento mínimo de CPF/CNPJ; identificador derivado com chave para comparação quando aplicável, nunca hash simples como proteção suficiente.
- Auditoria e métricas correlacionadas por IDs internos, com alertas de divergência e fila operacional.

## Comprovações técnicas pendentes

1. **Primeiro mês promocional:** pesquisa confirma criação de assinatura pendente com checkout hospedado e alteração de valor. Não comprova dois valores programados nativamente. Criar em 29,90 e alterar depois é hipótese, não decisão final: demonstrar primeira cobrança, atualização recuperável e renovação a 39,90 sem nova autorização/cobrança indevida. Replanejar com o usuário se não houver execução confiável.
2. **Validade de 30 minutos:** prazo local não invalida automaticamente `init_point`. Verificar expiração/cancelamento real e corrida com pagamento; não negar entrega de pagamento aprovado. Não publicar contador prometendo controle que não foi demonstrado.
3. **Pix no site:** escolher e verificar a modalidade oficial adequada, requisitos do pagador, QR, expiração, autenticação de notificações e estados. Não misturar notificações de QR presencial com Pix de checkout on-line nem copiar exceções de assinatura entre modalidades.
4. **Ciclo mensal:** confirmar calendário de cobrança, cobrança autorizada versus efetivamente aprovada e cálculo dos períodos a partir dos fatos externos; não somar mês por notificação.
5. **Ambiente operacional:** verificar infraestrutura existente para e-mail, execução persistente/agendada, permissões administrativas, retenção e recuperação. Não pressupor fornecedores configurados nem exigir que o usuário descubra fatos disponíveis no projeto.
6. **Regras de modelos:** mapear campos de identificação por modelo, inclusive sem CPF/CNPJ, e apresentar decisões adicionais de produto quando não forem dedutíveis das regras aprovadas.
7. **Políticas publicadas:** revisar condições de compra, privacidade, cancelamento e reembolso antes de publicar, sem tratar o fluxo administrativo como definição de direitos legais.

## Evidência de aceitação

- Testes pela mesma interface dos módulos usada pelos chamadores; testes de regras e de integração transacional real Firestore para concorrência, duplicidade, reservas expiradas e retomada.
- E2E de avulso guest/autenticado: rascunho persistido, Pix/cartão, retorno interrompido, confirmação, geração única, falha e retry, acesso por e-mail e vínculo verificado.
- Correções dentro/fora dos sete dias, modelo/partes protegidos e correção administrativa de identificador.
- Pro: primeira cobrança normal/promocional, renovação, duplicidade, falha, cancelamento pendente/concluído, retomada e período reembolsado/contestado.
- Oferta: duas horas persistidas, relógio do cliente adulterado, múltiplas abas/aparelhos, retries, 30 minutos, notificação tardia, pagamento realmente tardio e suspensão do fluxo.
- Reembolso automático restrito por duplicidade; comum com RBAC; parcial externo; falha de e-mail; acesso indevido e links expirados/reutilizados conforme política de sessão definida na implementação.
- Validações externas por modalidade e recorrência; separar claramente prova local, emuladores, ambiente de testes e produção. Nenhum teste foi executado para esta consolidação documental.

## Sequência proposta

1. Confirmar este entendimento; comprovar desconto/renovação e expiração em ambiente de testes antes de fixar a estratégia externa.
2. Refinar contratos e transições com testes de invariantes; corrigir regressões financeiras existentes.
3. Implementar avulso e recuperação de geração/acesso; depois assinatura e oferta comprovada.
4. Integrar administração, reversões financeiras, e-mail e reconciliação; executar E2E e verificar configuração.
5. Executar validação real somente com autorização específica; apresentar evidências e limites antes de publicação.
