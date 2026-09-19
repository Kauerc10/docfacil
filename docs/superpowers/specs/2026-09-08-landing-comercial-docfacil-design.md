# Design: landing comercial do DocFácil

**Status:** aguardando aprovação final  
**Classificação:** reformulação arquitetural de experiência, conteúdo e conversão  
**Direção aprovada:** abordagem A — escolha orientada com prova concreta do produto

## 1. Objetivo

Transformar a página inicial em uma landing comercial clara, confiável, acessível e escalável. A página deve ajudar uma pessoa leiga a entender o produto, escolher um documento, conhecer o fluxo e as condições de acesso e iniciar o preenchimento sem depender de alegações não comprovadas.

## 2. Fonte de verdade e limites

- A implementação deverá partir da `main` remota vigente após confirmação da base.
- O deploy observado em `78b29e1` é a referência funcional e comercial atual: nove modelos, uma geração gratuita mensal com conta entre modelos selecionados, PDF gratuito com marca d'água, rascunhos de conta e edição/versionamento condicionado ao Pro.
- Compra avulsa e assinatura Pro só serão anunciadas como disponíveis depois de confirmar que o pagamento real está operacional na base escolhida.
- A PR #21 e a AbacatePay são referências históricas; nenhuma integração será incorporada. Efí Pro está fora deste escopo.
- O gerador aberto por IA permanece fora da landing enquanto usar provider demonstrativo.
- Números, depoimentos, selos, revisão profissional e disponibilidade de atendimento exigem evidência antes de publicação.
- A landing não promete validade jurídica universal e deixa claro que o serviço não substitui advogado ou cartório quando o caso exigir.

## 3. Posicionamento

### Público prioritário

Pessoas físicas resolvendo situações cotidianas de moradia, declarações, compra e venda, empréstimo de bens, família e representação, especialmente quem tem pouca familiaridade com documentos ou tecnologia. Pequenos negócios são público secundário conforme os modelos existentes.

### Proposta de valor

O DocFácil ajuda a transformar informações do cotidiano em documentos organizados por meio de modelos e preenchimento guiado.

**Documento difícil? Nunca mais.**

Responda perguntas simples e veja seu documento ganhar forma, com orientação do início ao fim.

### Ações principais

- CTA primário: **Escolher meu documento**.
- CTA secundário: **Ver como funciona**.
- CTA de gratuidade: **Ver modelos grátis**, acompanhado das condições de conta, seleção mensal e marca d'água.

### Tom

Português brasileiro simples, adulto, acolhedor e preciso. A copy evita juridiquês, diminutivos recorrentes, medo jurídico, urgência artificial, garantias absolutas e tecnologia como argumento principal.

## 4. Arquitetura de informação

### Rotas públicas propostas

- `/`: landing comercial.
- `/documentos`: catálogo completo.
- `/documentos/[slug]`: página indexável de cada modelo.
- `/planos`, `/ajuda`, `/termos`, `/privacidade` e `/cookies`: rotas públicas existentes, preservadas e alinhadas.

Links antigos baseados em `?view=` devem continuar funcionando durante a migração. Telas internas de criação, biblioteca, conta e checkout deixam de compor o bundle e a arquitetura semântica da landing sempre que a separação puder ser feita sem regressão de fluxo.

### Catálogo híbrido

A home apresenta quatro intenções e até quatro documentos destacados. O catálogo completo oferece:

- busca tolerante a acentos e sinônimos controlados;
- filtros por situação, família de documento e elegibilidade gratuita;
- contagem de resultados e estado vazio útil;
- página individual com quando usar, limites, dados necessários, prévia real, condições de acesso e CTA.

As intenções iniciais são:

1. Alugar um imóvel.
2. Declarar residência.
3. Comprar, vender ou emprestar.
4. Família e representação.

## 5. Estrutura da landing

### Header

Logo, links reais para Documentos, Como funciona, Acesso e Ajuda, além de Entrar/Meus documentos. O CTA usa texto curto no mobile. Menu fechado não pode receber foco nem permanecer exposto à tecnologia assistiva.

### Hero

Apresenta proposta de valor, resultado em PDF e CTAs. Uma nota curta explica a geração gratuita. No desktop, um exemplo documental real ocupa a segunda coluna; no mobile, fica depois dos CTAs e pode ser aberto sob demanda.

### Porta de entrada

Pergunta “Qual situação você precisa resolver?”, seguida das intenções, documentos destacados e acesso ao catálogo. A busca deve navegar ou filtrar de verdade; não haverá formulário inerte.

### Fluxo e prova concreta

Quatro etapas: escolher o modelo, preencher com orientação, revisar e concluir conforme a modalidade de acesso, baixar o PDF. A prova visual usa uma prévia gerada pelo produto e identificada como exemplo. Controles demonstrativos não podem parecer ações funcionais.

### Benefícios e continuidade

Três benefícios principais: não começar do zero; receber informação organizada em PDF; reunir documentos e rascunhos na conta. Recursos condicionais usam linguagem explícita sobre conta e plano.

### Acesso e preços

A landing explica gratuidade e marca d'água antes do usuário começar. Compra avulsa, Pro, preços e meios de pagamento vêm da fonte central do produto e só aparecem se o fluxo real estiver habilitado e validado.

### Confiança, privacidade e limites

A seção explica quem opera o produto, acesso privado aos documentos, links temporários de download e caminhos para políticas. Dados institucionais e WhatsApp precisam ser reais. O texto diferencia preparação documental de assessoria jurídica e atos cartoriais.

### FAQ, CTA final e footer

A FAQ responde conhecimento jurídico, risco de erro, validade, privacidade, edição, conta, gratuidade, celular, resultado e limites profissionais. O CTA final retorna à escolha do documento. O footer contém apenas destinos existentes e informações institucionais verificadas.

## 6. Experiência responsiva e acessibilidade

- Projetar primeiro em 320–390 px; adaptar o mesmo conteúdo para tablet e desktop.
- CTA primário visível cedo, sem quebra ou corte; alvos de toque com pelo menos 44 px.
- Nenhuma rolagem horizontal ou sobreposição por CTA flutuante.
- Hierarquia de headings, landmarks, links e botões semanticamente corretos.
- Foco visível, navegação por teclado, menu com gerenciamento de foco e estados anunciados.
- Contraste WCAG 2.2 AA.
- `prefers-reduced-motion` desativa GSAP, CSS, SMIL e animações decorativas contínuas.
- Cards mantêm ação explícita e não dependem de hover.
- Conteúdo essencial e condições comerciais são equivalentes em mobile e desktop.

## 7. Corujinha

A corujinha é uma guia de preenchimento, não um selo de validade, advogada ou representante do suporte humano.

- Home: até duas aparições, no hero/fluxo e em uma orientação contextual.
- Produto: ajuda em conceitos, erros, revisão, salvamento confirmado e estados vazios.
- Tom: paciente, curto e objetivo.
- A informação nunca depende da imagem; SVG decorativo usa `aria-hidden` e mensagens relevantes vivem em texto anunciado.
- Não comemora erros, não promete que “está tudo certo” e não confirma salvamento antes da resposta real.

## 8. Conteúdo de confiança

Copy inicial:

- “Você não começa de uma página em branco. Escolha um modelo para sua situação e siga as perguntas.”
- “As informações ficam organizadas no documento. Confira os dados antes de concluir.”
- “Com uma conta DocFácil, você pode usar a geração gratuita do mês entre os modelos selecionados. O PDF gratuito inclui marca d'água.”
- “A validade e as formalidades dependem do documento e da situação. O DocFácil não substitui orientação jurídica individual nem atos que precisem de cartório.”

O produto não publica depoimentos, estatísticas, avaliações ou distintivos sem origem verificável e autorização de uso.

## 9. Analytics e privacidade

Após consentimento aplicável, registrar apenas eventos necessários:

- `landing_cta_click` com posição;
- `catalog_search` sem o texto digitado;
- `category_select`;
- `model_select` com slug público;
- `product_example_open`;
- `access_option_select`;
- `faq_open` com ID estável;
- conversão por etapas já existentes, sem respostas do documento.

Nunca enviar nome, CPF, e-mail, telefone, resposta, conteúdo documental, token, URL de acesso ou consulta livre.

## 10. Componentes e dados

### Reutilizar

Tokens de marca, tipografia, logo, componentes UI, catálogo oficial, política central de acesso, motor documental, prévia em PDF, consentimento e componentes legais.

### Refatorar

`Header`, `Hero`, `Catalog`, `HowItWorks`, `SuccessShowcase`, `Footer`, roteamento público e carregamento da home. A refatoração deve manter componentes pequenos e separar conteúdo, apresentação e regras de disponibilidade.

### Criar

`DocumentSearch`, `IntentNavigation`, `DocumentCard`, `ProductExample`, `AccessSummary`, `TrustSection` e `LandingFAQ`, com nomes finais ajustados ao padrão encontrado durante a implementação.

O catálogo deve expor metadados leves para a landing sem enviar templates completos e regras do motor ao cliente apenas para montar cards.

## 11. SEO e performance

- Renderização server-side das páginas comerciais e dos modelos.
- `metadata`, canonical, Open Graph, sitemap e robots com o domínio correto do produto.
- Links internos reais e uma única `h1` por página.
- Dados estruturados somente quando corresponderem ao conteúdo visível e verificável; sem `Review` ou `AggregateRating` inventados.
- Prévia pesada e PDF carregados sob demanda, com espaço reservado.
- Sem nova biblioteca estética.
- Metas no percentil 75: LCP ≤ 2,5 s, INP ≤ 200 ms e CLS ≤ 0,1.

## 12. Testes e validação

O desenvolvimento seguirá TDD nos comportamentos novos:

- busca com e sem acento, sinônimos, filtros e estado vazio;
- CTAs, rotas públicas, compatibilidade de deep links e navegação;
- consistência entre política gratuita, catálogo, FAQ e planos;
- teclado, foco, semântica e reduced motion;
- visitante, autenticado, carregando, erro e vazio;
- fluxo entre landing, detalhe e criação;
- regressão de rascunho, versão, biblioteca e download.

Antes da PR: testes unitários e integração, E2E, rules/Firestore quando afetadas, lint, typecheck, build, inspeção visual em mobile pequeno, mobile comum, tablet, desktop e desktop largo, revisão do diff e revisão independente.

## 13. Critérios de sucesso

- Quatro de cinco pessoas do público explicam produto, entrega e próximo passo após breve exposição.
- Quatro de cinco encontram o modelo correto em até 30 segundos em tarefas definidas.
- `procuracao` e `procuração` retornam resultados equivalentes.
- Funil mensurável: landing → modelo → início → conclusão, segmentado por dispositivo e origem.
- Zero CTA cortado, sobreposição ou overflow horizontal nos tamanhos definidos.
- WCAG 2.2 AA e Core Web Vitals dentro das metas desta spec.
- Cada página de modelo possui URL, metadata, conteúdo e canonical próprios.
- Zero alegação comercial, jurídica ou social sem evidência.

## 14. Estratégia de entrega

Após aprovação desta spec:

1. criar e revisar o plano detalhado do Superpowers;
2. confirmar a `main` remota correta e sincronizar sem tocar nos arquivos locais não relacionados;
3. criar `feat/landing-comercial-docfacil` a partir da base aprovada;
4. implementar em fatias pequenas com TDD;
5. usar commits convencionais em português, imperativos, curtos e com corpo explicando o motivo;
6. preparar PR conforme o template, com evidências, testes e comparações visuais;
7. não fazer merge nem deploy sem autorização explícita.

O humor nos commits será leve e pontual, preferencialmente no corpo, sem prejudicar busca, automação ou leitura técnica. Exemplo de tom: `fix(catalogo): ensina a busca a conviver com acentos`.

## 15. Riscos e mitigação

- **Base local atrás da produção:** confirmar e atualizar a base antes da branch.
- **Oferta divergente do billing:** derivar todo conteúdo da política central e esconder opções indisponíveis.
- **Migração de rotas quebrar links:** manter compatibilidade e cobrir deep links por E2E.
- **Prévia prejudicar LCP:** carregar sob demanda e medir antes/depois.
- **Redesign expandir escopo:** backend, autenticação, billing e infraestrutura só mudam se uma necessidade aprovada impedir o fluxo público.
- **Dados institucionais incompletos:** bloquear alegações de atendimento e confiança dependentes desses dados até serem preenchidos.
