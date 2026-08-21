# Global Document Editorial Shell Design

## Contexto

O DocFácil possui três famílias editoriais no PDF (`declaration`, `contract` e `instrument`), mas a evolução visual recente ficou concentrada na família `contract`. Os contratos passaram a usar cabeçalho formal já na primeira página, filete editorial, margens mais equilibradas, corpo escuro, título compacto e footer consistente. Declarações e instrumentos continuam usando a moldura anterior, com margens mais estreitas de conteúdo, divisor curto abaixo do título, corpo azulado e cabeçalho de continuação somente após a primeira página.

O resultado é tecnicamente coerente por família, mas visualmente parece que o produto possui dois sistemas de PDF diferentes.

## Objetivo

Todos os 9 modelos oficiais devem parecer documentos produzidos pelo mesmo produto, preservando diferenças de densidade necessárias a cada natureza documental.

A identidade comum deve abranger:

- cabeçalho DocFácil desde a primeira página;
- filete editorial superior;
- mesmas margens estruturais de folha;
- mesma cor base de corpo;
- mesma linguagem de título;
- mesmo footer e paginação;
- ausência do divisor legado curto sob o título;
- mesma lógica de prévia, pois a prévia já usa o PDF real.

As diferenças entre famílias devem se limitar a ritmo, tamanho de corpo, line-height, espaçamento de parágrafos, data e fechamento.

## Decisão arquitetural

### 1. Uma shell formal compartilhada

`src/lib/pdf/visual-recipes.ts` passa a ter uma base editorial independente da família, conceitualmente:

```text
DOCUMENT_FORMAL_BASE_RECIPE
  -> declaration airy/balanced
  -> contract standard/dense/formal/property
  -> instrument airy/balanced
  -> model-specific overrides
```

A base formal controla somente decisões de identidade comuns. Ela não conhece slug, regra jurídica, billing ou conteúdo.

### 2. Famílias continuam semânticas

`profile` permanece com três valores:

```text
declaration
contract
instrument
```

O profile continua escolhendo o compositor apropriado e ajuda a calibrar densidade. Ele não determina mais se o documento recebe a identidade formal.

### 3. Header formal não pode depender de `contract`

Hoje `styles.ts` considera formal apenas:

```ts
recipe.profile === "contract" && recipe.headerStyle === "formal"
```

A nova regra será baseada exclusivamente na receita visual:

```ts
recipe.headerStyle === "formal"
```

Assim qualquer família pode usar a mesma shell sem condicionais por slug.

### 4. Presets de família

As declarações herdam a shell formal e mantêm uma leitura mais arejada. A autodeclaração própria continua mais espaçosa que a declaração por terceiro.

Os instrumentos herdam a mesma shell, mas mantêm solenidade maior na união estável e ritmo mais compacto na procuração simples.

Os contratos preservam os quatro presets existentes e seu `contract-composer` sem alterações jurídicas ou semânticas.

## Métricas editoriais

A shell formal usa como referência a geometria já aprovada nos contratos:

- margens horizontais: `2 cm`;
- margem superior do corpo: `2.3 cm`;
- margem inferior: `2 cm`;
- footer inset: `2 cm`;
- footer inferior: `0.55 cm`;
- `headerStyle: "formal"`;
- `showTitleDivider: false`;
- corpo base escuro `#181818`;
- título em azul institucional `#14315c`;
- filete superior em `#b9853d`.

As declarações e instrumentos podem sobrescrever tamanhos e espaçamentos, mas não a shell.

## Declarações

### Autodeclaração de residência

Direção:

- `bodyFontSize` em torno de `11.25`;
- `bodyLineHeight` em torno de `1.55`;
- título em `15 pt` com baixo character spacing;
- data centralizada;
- assinatura com respiro maior;
- fechamento com espaço branco intencional, sem forçar uma segunda página por margens excessivas.

### Declaração de residência por terceiro

Mantém a mesma shell, ligeiramente mais densa:

- corpo em torno de `11.1 pt`;
- line-height em torno de `1.48`;
- espaçamento de parágrafo menor que a declaração própria.

## Instrumentos

### União estável

- shell formal compartilhada;
- corpo em torno de `11.25 pt`;
- line-height em torno de `1.5`;
- maior respiro de fechamento que a procuração.

### Procuração simples

- shell formal compartilhada;
- corpo em torno de `11.1 pt`;
- line-height em torno de `1.42`;
- fechamento mais compacto.

## Contratos

Nenhuma regra jurídica ou semântica deve mudar. Os presets existentes continuam usando o `contract-composer` e apenas passam a herdar a mesma base global que agora também serve às demais famílias.

## Renderer

`src/lib/pdf/styles.ts` continua sendo a single source of truth da folha.

Mudanças:

1. renomear a noção local `isFormalContract` para algo equivalente a `usesFormalShell`;
2. aplicar header formal quando a receita solicitar `headerStyle: "formal"`, independentemente do profile;
3. aplicar tipografia compacta de headings/labels pela shell formal, não pela família contract;
4. manter footer único e paginação existentes;
5. manter `contract-composer` somente para `profile === "contract"`.

## Testes e invariantes

Os testes estruturais devem impedir regressões futuras.

Para os 9 modelos oficiais:

- `headerStyle` deve ser `formal`;
- `showTitleDivider` deve ser `false`;
- margens horizontais devem ser a mesma shell formal;
- `bodyColor` deve ser `#181818`;
- `header(1)` deve conter `DocFácil` e `Documentos jurídicos simplificados`;
- o header deve conter o filete editorial;
- o título não deve ser seguido pelo divisor curto legado.

Também devem continuar válidos:

- declaração própria mais arejada que declaração por terceiro;
- declaração e instrumento mais arejados que contrato formal;
- união estável mais solene que procuração simples;
- proteção de paginação, assinaturas, fechamento e footer;
- `contract-composer` e regras jurídicas intactos.

## Fora de escopo

- alterar textos jurídicos;
- alterar perguntas ou validações;
- billing, entitlement ou lifecycle;
- mudar o preview novamente;
- adicionar logos/imagens ao PDF;
- redesenhar landing;
- merge da PR #20.

## Critério de aceite

Ao abrir a prévia real de qualquer um dos 9 modelos, a primeira página deve ser reconhecível como parte da mesma família DocFácil: header, filete, geometria, título e footer iguais em linguagem visual. A diferença percebida deve ser somente a densidade apropriada ao tipo documental, não uma mudança de template ou geração.