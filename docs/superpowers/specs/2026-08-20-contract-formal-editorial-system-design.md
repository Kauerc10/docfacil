# Sistema editorial formal para contratos - Design

## Objetivo

Substituir a composição excessivamente espaçada da família `contract` por um preset formal, compacto e reutilizável. O `contrato-locacao` é a primeira aplicação; o PDF de referência enviado em 20/08/2026 define leitura, hierarquia e paginação. As declarações permanecem inalteradas.

## Problema confirmado

O residencial atual tem seis páginas onde a referência usa quatro. A receita combina margens laterais de 3,15 cm, corpo de 12 pt com line-height 1,62, recuo de primeira linha e espaçamento alto. Além disso, `isLegalQuote` promove qualquer parágrafo com `Lei` ou `art.` a itálico recuado, embora seja prosa contratual normal.

## Direção aprovada

Criar `contractFormal` como variante de `contract`: margens laterais de 2,35 cm, margem superior de 2,25 cm, corpo preto de 10,5 pt, entrelinha 1,26, sem recuo de primeira linha e parágrafos curtos. Azul-marinho fica restrito à hierarquia e dourado discreto ao filete editorial.

- Cabeçalho em todas as páginas: `DocFácil | Documentos jurídicos simplificados`, separado por filete dourado fino.
- Título centralizado sóbrio, 15 pt; subtítulo jurídico em itálico discreto, 10,5 pt.
- Cláusulas em azul-marinho, 10,75 pt, curtas e protegidas contra órfãs.
- Menção a lei/artigo é corpo normal; destaque jurídico só é usado quando marcado explicitamente pelo modelo/engine.
- Fecho, data, assinaturas e testemunhas preservam integridade e não criam página quase vazia por espaçamento do renderer.

## Limites

- Não alterar conteúdo jurídico, perguntas, billing ou lifecycle.
- Não alterar receitas `declaration`.
- Não criar condicionais por slug no renderer.
- Usar o PDF externo como referência editorial, nunca como fonte jurídica copiada.

## Aceitação

1. Locação seleciona `contractFormal`; declarações mantêm receitas existentes.
2. Um parágrafo contratual com `Lei nº` ou `art.` permanece `body`, não `legalQuote`.
3. PDF residencial gerado é revisado visualmente página a página: cabeçalho, filete, corpo, cláusulas, paginação e assinaturas.
