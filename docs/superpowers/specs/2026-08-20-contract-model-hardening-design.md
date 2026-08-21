# Robustez dos modelos de contrato - Design

## Objetivo

Elevar os quatro contratos ainda auditados (locação comercial, compromisso de compra e venda de imóvel, comodato e compra e venda de bem móvel) ao mesmo patamar de precisão jurídica e acabamento editorial da locação residencial, sem misturar regras jurídicas, perguntas e pdfmake.

## Rulings de produto e conteúdo

- A locação comercial terá fluxo de pessoa física nesta rodada. A alternativa PJ exige coleta de representação e poderes e será oferecida quando o modelo tiver uma qualificação societária completa; não haverá um ramo PJ incompleto.
- A opção de garantia comercial será realmente opcional: sem modalidade escolhida, o contrato declara a ausência de garantia e não mantém texto de vigência de garantia inexistente. A caução informa depósito em poupança e reversão dos rendimentos ao locatário.
- A cláusula de alienação comercial não promete continuidade automática. Ela registra que a vigência perante adquirente depende dos requisitos legais aplicáveis, inclusive prazo determinado, cláusula de vigência em caso de alienação e averbação quando cabível.
- Vistoria continua sem upload nesta rodada. Quando marcada, o documento afirma que o termo e o registro fotográfico são documentos apartados, assinados e juntados pelas partes; nunca finge que um arquivo foi enviado pela plataforma.
- O compromisso de imóvel solicita identificação registral suficiente (matrícula, Registro de Imóveis e descrição complementar). Sinal/arras vira escolha simples: sem sinal não há cláusula de arras; com sinal, valor e forma de pagamento são obrigatórios.
- Comodato pede um prazo por extenso, não mascara a unidade. A restituição ressalva o desgaste natural; a cláusula opcional trata danos imputáveis ao comodatário e não o torna segurador por furto ou roubo.
- Compra e venda permanece modelo de bem móvel genérico. A pergunta guia detalhes de identificação, mas não promete transferência veicular sem RENAVAM/placa/obrigações próprias. O fechamento usa cidade/UF do vendedor e data centralizada.

## Arquitetura

O catálogo em `modelos.ts` continua como fonte de perguntas e texto-base. `legal-rules.ts` contém apenas redações condicionais compartilhadas e `documents.ts` mantém as invariantes que bloqueiam um documento incoerente. O compositor recebe linhas finais já preenchidas: ele só corrige geometria, sem conhecer slug ou regra jurídica.

## Paginação e assinatura

O fechamento deixa de depender de um `unbreakable` total. A introdução pode quebrar antes do grupo de assinatura; assinaturas e testemunhas usam grupos seguros de tabela, com `dontBreakRows`, e uma quebra de página explícita somente quando a região final não comporta o conjunto. As larguras das linhas são proporcionais à largura útil da receita.

## Fora de escopo

- Não alterar declarações, billing, ownership, lifecycle, download ou idempotência.
- Não adicionar upload de anexos nem fluxo PJ parcial.
- Não alterar a política da locação residencial, exceto reaproveitar a semântica segura de vistoria/garantia onde aplicável.

## Aceitação

1. Nenhum contrato auditado afirma garantia, vistoria, continuidade de alienação, arras ou quitação que não decorra da escolha e dos dados existentes.
2. O compromisso de imóvel não rende placeholders em uma resposta válida e não inclui arras quando o usuário escolhe não dar sinal.
3. Fechos longos não invadem header/footer e assinatura/testemunhas não extrapolam a largura útil em receitas dense/property.
4. Testes unitários cobrem os dois caminhos de cada decisão e a auditoria PDF visual cobre os cinco contratos.
