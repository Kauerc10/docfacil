# Qualidade documental e menor atrito - Design

## Objetivo

Elevar a confiabilidade dos dados, a qualidade editorial e a conclusão dos documentos do DocFácil sem misturar conteúdo jurídico, perguntas, preview, renderer e regras comerciais.

## Decisão de execução

O trabalho será realizado em frentes sequenciais, cada uma com testes, revisão de código e uma pausa de inspeção visual antes de iniciar a próxima. A primeira frente é exclusivamente de integridade de dados; ela pode ser entregue sem alterar o fluxo visual.

## Frentes

### 1. Integridade de qualificação pessoal

O backend passa a ser a autoridade para estado civil. Valores históricos abreviados conhecidos, inclusive `di`, são canônicos antes de persistência e PDF. Valores não reconhecidos são recusados com erro 400 claro; nenhum PDF pode repetir um valor truncado. A interface continua enviando os rótulos existentes e não ganha mais um campo.

### 2. Auditoria jurídica e editorial dos contratos

Cada contrato recebe cenários válidos representativos e inspeção página a página. Ajustes jurídicos materiais só são feitos depois de consulta a fonte oficial. A família `contract` continua usando receitas e o compositor semântico, sem condicionais espalhadas por slug.

### 3. Preview fiel ao PDF final

O preview de criação deixa de fingir paginação com CSS. Um endpoint autenticado e efêmero produz o mesmo `docDefinition` usado na geração final; o cliente exibe esse PDF com debounce. A página de detalhe, sem respostas, deixa claro que mostra estrutura ilustrativa ou recebe uma fixture real identificada como exemplo.

### 4. Formulário mobile-first e redução de atrito

O fluxo usa uma única indicação de progresso, grupos compreensíveis, microcopy só quando ajuda a decisão e uma escolha de nacionalidade simples: `Brasileira` pré-selecionada, `Outra nacionalidade` revela o campo necessário. A página de modelo apresenta blocos de dados, não uma lista de dezenas de perguntas.

### 5. Regressão visual e fluxo completo

São gerados cenários representativos dos nove modelos, com PDF renderizado em imagem e revisão de quebras, fechamento e assinatura. O fluxo de rascunho, edição/versionamento, paywall e download é validado em browser mobile e desktop.

## Limites e invariantes

- Declarações permanecem visualmente congeladas nesta rodada; qualquer exceção exige etapa específica aprovada.
- A validação semântica permanece no servidor; o cliente só melhora a orientação e previne erro óbvio.
- Não alterar política comercial, billing, ownership, idempotência nem download nesta iniciativa.
- Um morador autorizado continua sendo ocupante identificado, nunca fiador ou parte contratante por acidente.
- As mudanças só são concluídas após testes focados, suíte, lint, typecheck, build, CI e Preview Vercel no mesmo SHA.

## Aceitação da frente 1

1. `di`, `DIV`, `divorciado` e `divorciada` resultam em `divorciado(a)` no documento.
2. Um estado civil não reconhecido falha com `INVALID_REQUEST` antes de ser salvo ou renderizado.
3. Documentos existentes com abreviações conhecidas podem ser editados e versionados sem regressão.
4. Testes de domínio e PDF demonstram o RED/GREEN; não há alteração de interface nessa frente.

## Roteiro de agentes

| Etapa | Agente implementador | Agente revisor | Checkpoint |
| --- | --- | --- | --- |
| 1. Integridade | `data-integrity` | `data-integrity-review` | testes e Preview |
| 2. Contratos | `contract-audit` | `contract-audit-review` | PDF página a página |
| 3. Preview | `preview-fidelity` | `preview-fidelity-review` | comparação PDF/preview |
| 4. UX | `mobile-flow` | `mobile-flow-review` | desktop e mobile |
| 5. Regressão | `release-qa` | `release-qa-review` | CI, E2E e Preview |
