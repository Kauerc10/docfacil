# Prévia fiel ao PDF - Design

## Objetivo

Fazer a aba de prévia de criação mostrar o PDF realmente produzido pelo Document Engine e pelo pdfmake, eliminando a paginação CSS aproximada.

## Decisão

O servidor expõe uma geração efêmera, sem persistência, que recebe apenas slug, respostas e cláusulas. Ele recupera o modelo do catálogo, reaplica `reconstructAndValidateResponses()` e chama `generatePdfServer()`; não aceita definição de PDF, modelo completo ou decisão de marca d'água do navegador.

A autenticação é obrigatória para a prévia fiel. Um guest continua podendo explorar o formulário sem seus dados serem enviados a um endpoint de PDF; nessa condição a interface explica de maneira simples que o PDF fiel aparece após entrar. Essa escolha evita persistir, registrar, cachear ou disponibilizar por URL uma composição de dados pessoais anônimos.

## Fluxo

```text
respostas locais válidas
  → debounce de 600 ms / abortar tentativa anterior
  → POST autenticado /api/documents/preview
  → reconstrução e validação compartilhadas
  → pdfmake / Buffer efêmero
  → Blob URL local / iframe nativo
```

O componente guarda apenas a última `blob:` URL em memória, revoga a anterior na troca e no unmount, e conserva a última prévia válida se uma nova entrada ainda estiver incompleta. A geração não cria rascunho, versão, pedido, artefato R2, quota ou requestId.

## Segurança e paridade

- Route Node dinâmica com `requireAppCheck`, `resolvePrincipal` e `requireUser`.
- Payload limitado a 256 KiB e PDF limitado a 3 MiB; falha clara se exceder limites.
- Resposta inline com `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff` e `X-Robots-Tag: noindex, nofollow`.
- Logs de erro não contêm respostas, conteúdo do PDF, URL Blob ou hash de dados pessoais.
- A marca d'água é uma política visual pura compartilhada com a finalização, nunca um valor enviado pelo cliente. Durante a prévia autenticada, ela corresponde ao entitlement atual; qualquer alteração posterior de plano/cota é comunicada como mudança comercial, não como quebra de layout.

## Aceitação

1. As páginas, margens, header, footer, marca d'água, quebras, assinaturas e cláusulas vistos na criação provêm do mesmo renderer da geração final.
2. A route não grava Firestore/R2 nem muta quota, ordem, requestId, rascunho ou documento.
3. Trocas rápidas de resposta não exibem uma prévia vencida e não deixam Blob URLs abandonadas.
4. Guest não envia dados para a route e recebe explicação curta, sem bloquear o preenchimento.
