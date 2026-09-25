# Piloto de criação documental com IA

O fluxo de modelos existentes permanece determinístico. A criação com IA usa LangGraph, uma base textual derivada do catálogo e referências oficiais, sessões privadas no Firestore e o motor PDF atual.

## Configuração

1. Configure `GROQ_API_KEY`, `AI_PILOT_UIDS` com o UID Firebase da conta piloto e `CRON_SECRET` no ambiente do servidor. Não use valores `NEXT_PUBLIC_` para segredos.
2. Ative **Zero Data Retention** nas configurações da organização Groq; depois defina `AI_GROQ_ZDR_CONFIRMED=true`.
3. Execute `bun run evaluate:ai` com a chave configurada. O script usa 20 pedidos fictícios e grava `test-results/ai-pilot-evaluation.json`.
4. Exija oito bloqueios corretos, ao menos onze dos doze casos admitidos sem falha técnica e zero identificação ou citação inventada. Leia também os rascunhos do relatório para identificar nomes, fatos ou citações que a verificação automática não detecta. Somente depois defina `AI_PILOT_EVALUATED=true`.
5. Configure o Firebase App Check para que as rotas de IA aceitem chamadas da aplicação. Publique as regras do Firestore e configure o cron diário da Vercel com `CRON_SECRET`.

Sem chave, UID, confirmação de retenção zero e avaliação liberada, o servidor não permite acesso ao piloto.

## Corpus

`src/lib/ai/corpus.ts` indexa cláusulas do catálogo versionado em Git e recortes identificados do Código Civil, da Lei do Inquilinato e da LGPD. Um exemplo público de comodato do CRECI-MS entra como referência contextual. A busca filtra e pontua categorias e termos normalizados; não consulta a web durante pedidos de usuários.

Ao atualizar fontes, confira texto vigente, codificação, contexto de aplicação e eventual revogação. Atualize origem e versão de cada recorte; nunca trate exemplos de contratos institucionais como cláusulas gerais entre particulares. Os modelos padrão devem continuar sem chamadas de IA.

## Operação

O servidor impõe três sessões novas e três PDFs por dia para cada conta piloto, duas revisões por IA por rascunho e até 20 chamadas de modelo por sessão, limitadas também a 60 chamadas globais diárias. O limite externo da conta Groq pode ser menor. Erros `429` preservam a sessão para retomada.

Sessões expiram após 30 dias sem atividade. A rota `/api/ai/purge`, chamada diariamente pelo cron da Vercel, apaga sessões e checkpoints expirados. Documentos finalizados mantêm o conteúdo e a proveniência no ciclo de vida dos documentos existentes.

Para testar a persistência real do grafo, execute o teste `src/lib/server/ai/graph.firestore.test.ts` com `RUN_AI_GRAPH_TESTS=true` no emulador Firestore. Esse teste requer Java instalado.
