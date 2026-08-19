# DocFácil — Document Access, Billing e Lifecycle Design

## Contexto

A PR #20 amadureceu o Document Engine e a composição final dos PDFs. A rodada atual fecha uma camada diferente do produto: acesso comercial ao catálogo, billing em modo demo, persistência de rascunho, edição de documentos já salvos e download direto em "Meus Documentos".

Hoje esses fluxos existem parcialmente, mas não seguem uma política única. O resultado é uma experiência inconsistente: o plano grátis ainda é tratado como 3 documentos/mês sem conta em alguns pontos, o checkout demo cria sempre um avulso mesmo quando o usuário escolhe Pro, o rascunho do fluxo de criação é essencialmente localStorage, editar um documento salvo não hidrata o formulário e o botão de download no dashboard não dispara download real.

## Objetivo

Fechar o lifecycle comercial e operacional da V1 com uma política de acesso única, simples e server-authoritative.

O comportamento final deve ser:

```text
VISITANTE
├─ quer usar a geração gratuita
│  └─ precisa entrar/criar conta
└─ quer qualquer documento
   └─ pode comprar avulso sem conta

CONTA GRÁTIS
├─ modelo gratuito do mês + crédito disponível
│  └─ gera grátis com marca d'água
├─ modelo não gratuito
│  └─ Pro / avulso / salvar rascunho
└─ crédito mensal já consumido
   └─ Pro / avulso / salvar rascunho

PRO
└─ catálogo inteiro ilimitado
   + PDF sem marca d'água
   + histórico
   + edição e nova versão
   + re-download
```

## Princípios

1. **Mais robustez por baixo, menos atrito por cima.**
2. Regras de billing e acesso não ficam espalhadas em telas.
3. O servidor é a autoridade final para quota, plano e pagamento.
4. Compra avulsa não exige conta.
5. Geração gratuita exige conta.
6. Conteúdo jurídico dos modelos não deve carregar regra comercial.
7. Rascunho autenticado deve sobreviver a refresh e troca de dispositivo.
8. O usuário nunca perde o preenchimento ao bater em paywall.
9. O modo demo deve simular o lifecycle real o suficiente para QA de produto.

## Política comercial da V1

### Preços

- Documento avulso: **R$ 19,90**.
- Plano Pro: **R$ 39,90/mês**.
- Plano grátis: **R$ 0**.

Toda exibição e cobrança deve derivar de uma única fonte de verdade.

### Geração gratuita

A conta grátis terá direito a **1 geração gratuita por mês**.

Somente estes modelos são elegíveis neste ciclo:

- `declaracao-residencia`;
- `comodato`;
- `contrato-locacao-comercial`.

A elegibilidade é comercial e deve ficar em um módulo próprio, separado de `src/lib/modelos.ts` e do conteúdo jurídico.

A UI deve comunicar:

- badge curto como **“Grátis este mês”** nos modelos elegíveis;
- apoio curto como **“1 geração grátis/mês com conta”**;
- observação discreta: **“Os modelos gratuitos podem mudar a cada mês.”**

Não é necessário implementar rotação automática dos modelos neste ciclo. A lista será alterada manualmente em uma única fonte de verdade no futuro.

### Modelo não elegível

Usuário grátis autenticado que tentar finalizar um modelo fora da lista não consome quota gratuita e deve receber o mesmo paywall comercial com:

- assinar Pro;
- comprar avulso;
- salvar como rascunho;
- continuar editando.

O backend deve retornar um código comercial específico, diferente de `FREE_LIMIT_REACHED`, para que a UI não dependa de texto ou status HTTP genérico.

## Arquitetura da política de acesso

Criar um módulo compartilhado de política comercial, por exemplo:

```text
src/lib/document-access-policy.ts
```

Responsabilidades:

- `FREE_MONTHLY_LIMIT = 1`;
- slugs elegíveis do mês;
- `isMonthlyFreeModel(slug)`;
- helpers de copy/metadata apenas quando forem verdadeiramente compartilhados;
- nenhuma dependência de React;
- nenhuma regra jurídica.

O backend importa a política para enforcement. A UI importa a mesma política para badges e orientação. O servidor continua autoritativo.

## Entitlement server-side

`resolveEntitlement` deve receber o `modeloSlug` da geração e decidir nesta ordem:

1. ordem avulsa válida informada → `single_purchase`;
2. conta Pro → `pro`;
3. visitante sem ordem → `PAYMENT_REQUIRED`;
4. usuário grátis + modelo não elegível → erro comercial `FREE_MODEL_NOT_ELIGIBLE`;
5. usuário grátis + elegível + quota já consumida → `FREE_LIMIT_REACHED`;
6. usuário grátis + elegível + quota disponível → `free`.

A quota deve contar somente gerações gratuitas elegíveis do ciclo, e não compras avulsas ou documentos Pro.

## Checkout demo

O modo demo deve aceitar explicitamente o produto:

```ts
product: "avulso" | "pro"
```

### Avulso demo

- cria ordem de R$ 19,90;
- marca como paga quando `autoPay` estiver ativo;
- preserva suporte a guest;
- retorna `orderId` para geração do documento específico.

### Pro demo

- exige conta autenticada;
- cria ordem de R$ 39,90;
- marca como paga;
- ativa `plano: "pro"` no perfil da conta;
- retorna sucesso;
- o frontend atualiza/recarrega o perfil sem exigir logout/login.

A ordem demo precisa representar `product: "avulso" | "pro"`, não apenas `avulso`.

O fluxo demo é QA de produto, não bypass de autorização. O backend deve derivar o usuário autenticado do principal resolvido.

## Auth e refresh de plano

O AuthContext deve expor uma operação focada para atualizar o estado de perfil após mudanças server-side, por exemplo:

```ts
refreshProfile(): Promise<void>
```

Após ativar Pro em demo, o checkout chama essa operação antes de navegar para a confirmação/retorno apropriado.

Não deve existir mutação client-side direta de `plano` como fonte de verdade em produção.

## Rascunho autenticado

### Problema atual

`saveGuestDraft()` armazena um rascunho por slug em localStorage. Isso é adequado para visitante/checkout avulso, mas insuficiente para uma conta que espera encontrar rascunhos em “Meus Documentos”.

### Novo contrato

Para usuário autenticado, criar persistência server-side de rascunho com identidade própria.

Dados mínimos:

```ts
interface AccountDraft {
  id: string;
  ownerUserId: string;
  modeloSlug: string;
  respostas: Record<string, string>;
  stepIndex: number;
  clausulasSelecionadas: string[];
  extrasPorClausula: Record<string, Record<string, string>>;
  createdAt: number;
  updatedAt: number;
}
```

Operações necessárias:

- criar ou atualizar rascunho;
- buscar rascunho por ID;
- listar rascunhos da conta;
- excluir rascunho depois de uma finalização bem-sucedida;
- validar ownership no servidor.

O lifecycle não deve usar um documento final “fake” com artifact inexistente para representar rascunho. Rascunho e documento final são entidades com propósitos diferentes.

### UX de salvar

No paywall ou criação autenticada:

- botão “Salvar como rascunho” persiste no servidor;
- toast confirma “Rascunho salvo em Meus Documentos”;
- usuário pode ir para “Meus Documentos” ou continuar editando;
- salvar novamente atualiza o mesmo rascunho quando a sessão de criação já possui `draftId`.

Visitante continua usando rascunho local para preservar preenchimento durante o fluxo avulso.

## Meus Documentos

A tela deve agregar:

- documentos concluídos;
- rascunhos autenticados.

A aba “Rascunhos” passa a refletir persistência real, não `artifactState` incompleto de documento final.

Cada item deve conhecer seu tipo:

```ts
type LibraryItem =
  | { kind: "document"; ... }
  | { kind: "draft"; ... };
```

Isso evita tratar rascunho como PDF baixável.

## Editar respostas

### Documento concluído

Ao clicar “Editar respostas” em um documento concluído:

```text
navigate criar + documentId
→ GET documento detalhado
→ valida ownership
→ reconstrói respostas/cláusulas/extras
→ hidrata o formulário
→ usuário altera
→ Pro cria nova versão do mesmo documento
```

O formulário deve começar no estado carregado, não do zero.

Quando o usuário não for Pro, a UI pode permitir visualizar o preenchimento, mas a tentativa de gerar nova versão deve direcionar para o paywall Pro. A autorização definitiva para versão continua no backend.

### Rascunho

Ao clicar editar/continuar em rascunho:

```text
navigate criar + draftId
→ GET draft
→ hidrata respostas + stepIndex + cláusulas + extras
→ salvar atualiza o mesmo draft
→ finalizar cria documento e remove draft
```

## Download em Meus Documentos

O botão de download da lista deve chamar a infraestrutura real já usada no detalhe:

```text
POST /api/documents/:id/download
→ signed URL
→ download/navegação
```

Requisitos:

- estado de loading por card;
- toast de erro apenas em falha real;
- nenhum toast “Preparando...” sem ação posterior;
- rascunhos não exibem download;
- o fluxo deve respeitar entitlement do artefato já salvo.

A lógica compartilhada deve ser extraída para não duplicar comportamento entre dashboard e detalhe.

## Catálogo e Planos

### Catálogo

Nos três modelos elegíveis:

- badge “Grátis este mês”;
- indicação curta “com conta DocFácil” quando necessário;
- observação global discreta de que a seleção pode mudar mensalmente.

Nos demais modelos não usar badge de gratuidade.

### Página de planos

Plano Grátis:

- 1 geração grátis por mês;
- entre modelos selecionados;
- exige conta;
- PDF com marca d'água.

Avulso:

- R$ 19,90 por documento;
- sem conta obrigatória;
- PDF sem marca d'água.

Pro:

- R$ 39,90/mês;
- documentos ilimitados;
- PDF sem marca d'água;
- histórico;
- editar e rebaixar quando quiser.

FAQ e demais copies comerciais devem ser atualizadas para não repetir a regra antiga de 3 documentos sem cadastro.

## Paywall

O paywall deve ser reutilizável para pelo menos dois motivos:

- quota grátis mensal consumida;
- modelo fora da seleção gratuita.

A headline muda conforme o motivo, mas as ações permanecem:

1. Pro;
2. avulso;
3. salvar rascunho;
4. continuar editando.

Para visitante que tenta a opção grátis, antes do formulário final deve haver orientação de login/cadastro, preservando o slug de retorno.

## Migração e compatibilidade

- documentos existentes continuam legíveis;
- ordens avulsas existentes continuam válidas;
- o campo legado `plano: "avulso"` no perfil não ganha novos privilégios;
- não é necessário migrar rascunhos locais antigos para o servidor automaticamente;
- localStorage continua existindo para guest/avulso sem conta;
- constantes antigas de limite devem deixar de competir entre si.

## Segurança

- ownership de draft/documento é validado no servidor;
- quota é enforced em transação/commit autoritativo;
- produto/valor da ordem são derivados de configuração server-side;
- ativação Pro demo exige principal autenticado;
- o frontend não concede entitlement por estado local;
- download continua usando signed URL de vida curta;
- compra avulsa continua consumível apenas uma vez.

## TDD e gates

Cada fatia deve começar com RED observável e terminar com GREEN antes da seguinte.

Cobertura mínima:

1. política de 1 grátis/mês + 3 slugs elegíveis;
2. modelo não elegível não consome quota e exige compra/Pro;
3. visitante não usa quota grátis;
4. Pro ignora quota/modelo elegível;
5. checkout demo avulso usa R$ 19,90;
6. checkout demo Pro usa R$ 39,90 e ativa a conta;
7. rascunho autenticado salva, lista, carrega, atualiza e exclui com ownership;
8. editar documento carrega respostas/cláusulas/extras;
9. finalizar edição Pro cria nova versão;
10. dashboard download chama signed URL real;
11. rascunho não mostra download;
12. catálogo marca apenas os três modelos selecionados;
13. copies de planos não anunciam mais 3 grátis sem conta.

Gate final:

- unit/domain tests;
- Firestore Security Rules;
- integração Firestore;
- ESLint;
- TypeScript;
- Next.js production build;
- Playwright E2E cobrindo grátis autenticado, paywall, avulso guest, Pro demo, rascunho/retomada, edição e download da biblioteca.

## Fora do escopo

- gateway de pagamento real em produção;
- cobrança recorrente real/cancelamento real do Pro;
- rotação automática mensal dos modelos gratuitos;
- migração automática de drafts locais antigos;
- redesign completo da página de documentos;
- reconstrução do chat/preview;
- analytics de conversão.

## Critério de pronto

A rodada está pronta quando um usuário consegue, sem estados falsos:

1. identificar quais modelos estão gratuitos no mês;
2. criar conta e usar exatamente 1 geração gratuita elegível;
3. bater em paywall coerente fora da elegibilidade ou depois da quota;
4. salvar o preenchimento como rascunho real na conta e retomá-lo;
5. comprar um avulso sem conta e concluir o documento;
6. ativar Pro em demo e imediatamente receber os privilégios Pro;
7. abrir um documento salvo, editar as respostas sem começar do zero e gerar nova versão quando Pro;
8. baixar o PDF diretamente em “Meus Documentos”.
