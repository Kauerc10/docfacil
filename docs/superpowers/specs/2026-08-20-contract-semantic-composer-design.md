# Compositor semântico de contratos - Design

## Objetivo

Evoluir a família editorial `contract` para que o pdfmake receba blocos contratuais semanticamente compostos, com paginação e fechamento previsíveis. A locação residencial é a referência inicial; declarações não fazem parte desta mudança.

## Diagnóstico

O renderer atual transforma linhas preenchidas em nós genéricos. Isso perde a diferença entre abertura, qualificação, cláusula, fechamento, assinatura e testemunha. A geometria visual também usa `CONTENT_WIDTH` calculada para margens de 3,15 cm, embora a receita formal use outra margem. Por fim, `keepWithNext` não é suportado pelo pdfmake instalado e, portanto, não protege headings nem o fechamento.

## Decisão

Manter pdfmake como renderer server-side e introduzir uma camada `contract-composer` exclusivamente para a família `contract`.

```text
modelo jurídico preenchido
  -> linhas classificadas pelo Document Engine
  -> contract-composer
  -> nós pdfmake (opening, clause, closing, signature grid, witness grid)
```

O conteúdo jurídico, respostas, regras comerciais, ownership e receitas de declaração permanecem fora dessa camada.

## Componentes

### Geometria editorial

`layout-geometry.ts` calcula largura útil, largura de filetes e posições a partir de `pageMarginsCm`. Nenhum elemento do contrato usa uma largura A4 fixa. A receita formal residencial passa a usar margem lateral de 2,0 cm, margem superior de 2,3 cm e margem inferior de 2,0 cm.

### Contract composer

`contract-composer.ts` recebe linhas já preenchidas e devolve nós pdfmake estruturados:

- abertura: título, subtítulo, introdução e qualificações;
- cláusula: heading com `headlineLevel` e parágrafos de corpo;
- fechamento: texto final, data, grade de assinaturas e grade de testemunhas.

As qualificações continuam usando `TextRun` para preservar ênfases sem restringir quebra de linha.

### Paginação

- headings usam `pageBreakBefore` com `headlineLevel` para impedir órfãos;
- o fechamento padrão de duas partes e duas testemunhas é um bloco `unbreakable`, por caber em uma página A4;
- fechamentos extensos usam grades em linhas indivisíveis, nunca uma página de testemunha isolada;
- assinaturas e testemunhas usam tabelas `noBorders`, `dontBreakRows` e células com linhas desenhadas por `canvas`.

### Identidade visual

O contrato formal usa corpo preto, hierarchy azul-marinho, filete dourado fino e header editorial em todas as páginas. Título/subtítulo têm bloco próprio. A assinatura e as testemunhas usam grade, não sublinhados de texto.

## Limites

- Não modificar texto jurídico nem perguntas nesta etapa.
- Não migrar declarações ou instrumentos para o compositor.
- Não introduzir condicionais por slug no renderer; a seleção é por `profile` e variante da receita.
- Não usar conversão DOCX/LibreOffice em produção.

## Aceitação

1. Toda geometria formal acompanha as margens da receita.
2. `keepWithNext` deixa de ser a suposta proteção de paginação.
3. O fechamento comum não separa assinaturas e testemunhas em páginas diferentes.
4. A locação residencial é comparada visualmente, página a página, com a referência enviada.
5. Unitários, integração, lint, typecheck, build, Guest E2E e Preview Vercel passam antes da conclusão.
