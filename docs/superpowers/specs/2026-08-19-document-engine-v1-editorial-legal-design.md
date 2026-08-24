# Document Engine V1 — Design editorial e semântico

## Objetivo

Transformar o motor atual em uma base de produção que gere documentos juridicamente mais coerentes, visualmente profissionais e bem distribuídos em A4, sem aumentar desnecessariamente o atrito do fluxo de criação.

## Princípio de produto

**Mais robustez por baixo, menos atrito por cima.**

O fluxo deve continuar utilizável por clientes leigos e idosos. Só perguntamos algo quando a resposta altera materialmente o documento. Regras jurídicas deriváveis ou validáveis pelo sistema permanecem no engine/backend.

## Escopo

1. validação semântica server-side para invariantes de locação;
2. seleção exclusiva para modalidades de garantia, sem novas etapas;
3. texto residencial condicionado ao prazo inferior ou igual/superior a 30 meses;
4. correção de encargos condominiais e fundo de reserva;
5. perfis editoriais `declaration`, `contract` e `instrument`;
6. paginação que evita heading órfão e espaço branco causado por fechamento inteiro `unbreakable`;
7. identidade DocFácil discreta, sem promessa de `VALIDADE LEGAL`;
8. lapidação dos nove modelos oficiais com foco em clareza, robustez e escolhas materiais;
9. regressões de domínio e PDF real.

## Regras de UX

- nenhuma regra de domínio nova deve obrigar uma etapa adicional quando puder ser inferida;
- opções mutuamente exclusivas aparecem como escolha única;
- campos avançados ficam opcionais ou condicionais;
- linguagem de pergunta deve ser humana, sem exigir conhecimento jurídico;
- erros devem aparecer próximos da decisão que os causou;
- a sensação de progresso do fluxo atual deve ser preservada.

## Arquitetura

A estrutura existente de `Modelo`, `CampoModelo`, `EtapaModelo` e `ClausulaDinamica` continua sendo a fonte de verdade. Adicionamos apenas metadados pequenos para comportamento de seleção e perfil de layout. A validação semântica é executada no backend depois da composição das respostas e antes da persistência/geração.

O PDF continua em pdfmake, mas passa a usar perfil editorial por modelo. Blocos de assinatura continuam atômicos por linha/par; o fechamento completo deixa de ser indivisível para não empurrar grandes áreas em branco para a página anterior.

## Critérios de aceite

- servidor rejeita mais de uma garantia locatícia;
- caução em dinheiro acima de três aluguéis é rejeitada;
- UI de garantia permite apenas uma modalidade por vez sem adicionar etapa;
- locação residencial usa texto compatível com prazo abaixo de 30 meses e com 30 meses ou mais;
- locador permanece responsável por despesas condominiais extraordinárias nos modelos de locação;
- documentos curtos usam composição vertical adequada e contratos evitam espaços artificiais grandes;
- `VALIDADE LEGAL` não aparece como selo/marca d'água do DocFácil;
- os nove modelos continuam renderizando sem tokens pendentes;
- testes unitários, Rules, Firestore integration, lint, typecheck, build e E2E permanecem verdes.
