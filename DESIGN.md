---
name: DocFácil
description: Documentos legais claros, com preenchimento guiado e orientação em cada etapa.
colors:
  paper: "#faf7f2"
  surface: "#ffffff"
  ink: "#0e2340"
  navy: "#14315c"
  blue-royal: "#2554c7"
  blue-soft: "#e7eefc"
  selo-green: "#3e8e6e"
  green-tint: "#e7f3ec"
  coral: "#ff6a4d"
  coral-hover: "#e85a3f"
  border: "#e6dccb"
  muted: "#f1ece3"
  muted-foreground: "#5a6b82"
typography:
  display:
    fontFamily: "var(--font-jakarta), Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "var(--font-jakarta), Plus Jakarta Sans, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "var(--font-jakarta), Plus Jakarta Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "var(--font-inter), Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-inter), Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.blue-royal}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "#1e44a8"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  button-coral:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "14px 28px"
  button-coral-hover:
    backgroundColor: "{colors.coral-hover}"
  card-document:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  card-aside:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.3xl}"
    padding: "28px"
---

# Design System: DocFácil

## Overview

**Creative North Star: "O Cartório Acolhedor" (The Warm Registry)**

O DocFácil une a solidez, a autoridade e o rigor notarial da tradição jurídica à leveza, empatia e calor de um serviço digital contemporâneo. A experiência rejeita intencionalmente tanto o formalismo intimidador dos escritórios de advocacia tradicionais quanto a frieza genérica de templates SaaS descartáveis. 

A interface se materializa como uma bancada de documentos bem organizada: o fundo é sempre um papel marfim texturizado (`#faf7f2`), a tinta tipográfica é um azul marinho profundo e nobre (`#0e2340`), e as ações de certeza e orientação são guiadas pelo azul royal e verde selo. A Corujinha oficial é o elemento caloroso e humanizador da marca, recepcionando e guiando o usuário sem infantilizar o produto.

**Key Characteristics:**
- **Papel e Tinta:** Fundo marfim/creme (`var(--paper)`), texto em azul marinho denso (`var(--ink)`) e folhas físicas A4 com sobreposição em profundidade.
- **Selo Notarial Proprietário:** Círculos e molduras tracejadas que conferem sensação tátil de verificação, fé pública e cuidado documental.
- **Acolhimento com Autoridade:** Tipografia geométrica expressiva (Plus Jakarta Sans) nos títulos e leitura cristalina (Inter) no corpo de texto.
- **Hierarquia de Ação Singular:** Azul royal para navegação e preenchimento; coral vibrante reservado como ação única de conclusão/conversão.

---

## Colors

A paleta é dividida entre tintas documentais nobres, superfícies quentes de pergaminho/papel e acentos funcionais de alta confiança.

### Primary
- **Navy Tinta Notarial** (`#14315c`): Tom estrutural de máxima autoridade. Usado no rodapé, títulos de seção institucionais e bordas estruturais.
- **Blue Royal Ação** (`#2554c7`): A cor interativa principal. Usada para links principais, foco de inputs, botões primários de avanço e destaque na headline ("Nunca mais.").
- **Ink Tinta Escrita** (`#0e2340`): Substituto absoluto do preto puro. Cor primária para textos, headings e ícones de alto contraste.

### Secondary
- **Selo Green Validação** (`#3e8e6e`): A cor da aprovação e do documento verificado. Usada em checks de validação, badges de gratuidade e no carimbo notarial.
- **Green Tint Suave** (`#e7f3ec`): Fundo de suporte para mensagens de segurança, rascunho salvo e cards de plano gratuito.
- **Blue Soft Brisa** (`#e7eefc`): Fundo de seleção de texto, badges neutros de informação e containers auxiliares.

### Tertiary (Action Climax)
- **Coral Conclusão** (`#ff6a4d` / hover `#e85a3f`): Usado de forma estrita para ações finais de conversão e pagamento (máximo de 1 por viewport).

### Neutral
- **Paper Pergaminho** (`#faf7f2`): O fundo canvas unificado da aplicação. Nunca usar branco estéril (`#ffffff`) no body da página.
- **Surface Folha Limpa** (`#ffffff`): A cor das folhas de documento, cards flutuantes e modais.
- **Border Papel Envelhecido** (`#e6dccb`): Linhas divisórias, bordas de cards e contornos sutis de formulário.
- **Muted Cinza Quente** (`#f1ece3` / texto `#5a6b82`): Estados desabilitados e textos auxiliares de menor peso.

### Named Rules
- **The Never-Pure-Black Rule:** Proibido usar `#000000` ou cinza neutro descolorido (`#333333`). Toda sombra e texto herda a tinta azul marinho (`#0e2340`).
- **The Coral Rarity Rule:** A cor coral (`#ff6a4d`) é uma jóia visual reservada para a etapa final de geração/checkout. Nunca usá-la em navegação secundária.

---

## Typography

A tipografia estabelece um contraste elegante entre títulos geométricos com forte personalidade e parágrafos de alta legibilidade.

**Display & Headings:** Plus Jakarta Sans (`var(--font-jakarta)`), com pesos 700 (Bold) e 800 (ExtraBold).  
**Corpo & Formulários:** Inter (`var(--font-inter)`), com pesos 400 (Regular), 500 (Medium) e 600 (SemiBold).  
**Código & Dados Técnicos:** Geist Mono (`var(--font-geist-mono)`).

**Character:** Formal sem ser antiquado; acolhedor sem perder a firmeza jurídica.

### Hierarchy
- **Display** (`font-extrabold`, `clamp(2.25rem, 5vw, 3.75rem)`, `leading-[1.1]`, `tracking-tight`): Headline principal da landing page e títulos heróicos.
- **Headline / H2** (`font-extrabold`, `2.25rem` a `2.5rem`, `leading-tight`): Títulos de seção ("O nome jurídico pode esperar", "Você sempre sabe o próximo passo").
- **Title / H3** (`font-bold`, `1.25rem` a `1.5rem`, `leading-snug`): Nomes de modelos, cards de benefício e passos do tutorial.
- **Body** (`font-normal`, `1.125rem` / `18px`, `leading-[1.6]`): Parágrafos de orientação e respostas do FAQ. Limite ideal de 65 a 75 caracteres por linha.
- **Label / Tag** (`font-bold`, `0.75rem` a `0.875rem`, `tracking-wider`, `uppercase`): Badges de categoria, status de rascunho e tags notariais.

---

## Layout

- **Canvas e Grid:** Container central com largura máxima de `max-w-7xl` (1280px) e gutters responsivos (`px-4 sm:px-6 lg:px-8`).
- **Ritmo Vertical:** Seções com padding vertical generoso (`py-16 sm:py-20 lg:py-24`), garantindo respiração entre diferentes blocos de conteúdo.
- **Densidade:** Espaçosa no marketing e na descoberta; moderada e focada nos formulários guiados de preenchimento (uma pergunta por etapa).
- **Mobile First:** Todo componente deve ser testado e confortável em viewports de 320px a 390px (iPhone standard), sem qualquer transbordamento lateral (`overflow-x-clip`).

---

## Elevation & Depth

O DocFácil utiliza **profundidade física de papel sobreposto** (Layered Paper) em vez de sombras genéricas flutuantes de software.

- **Camadas em Profundidade:** Elementos importantes (como o Hero Card e os previews de contrato) exibem folhas A4 fisicamente rotacionadas atrás de si (`rotate-[-2.5deg]` e `rotate-[5.5deg]`), simulando uma pasta jurídica aberta.
- **Sombras Táteis com Tinta:** Sombras são sempre colorizadas com a tinta azul marinho (`rgba(14, 35, 64, 0.10)` a `rgba(14, 35, 64, 0.18)`), nunca cinza descolorido.
- **Orelha de Página (Dog-ear):** Detalhe de canto dobrado no canto superior direito de cards selecionados (`.doc-card::before`).

### Shadow Vocabulary
- **Card Rest:** `box-shadow: 0 1px 3px rgba(14, 35, 64, 0.06), 0 4px 12px -2px rgba(14, 35, 64, 0.08);`
- **Card Hover:** `box-shadow: 0 12px 28px -10px rgba(14, 35, 64, 0.18); transform: translateY(-3px);`
- **Hero Focus Scene:** `box-shadow: 0 20px 40px -15px rgba(20, 49, 92, 0.15);`

---

## Shapes

- **Raio Base:** `0.625rem` (10px).
- **Escala de Cantos:**
  - Botões e inputs: `rounded-xl` (10px a 12px).
  - Cards secundários e caixas de pergunta: `rounded-2xl` (16px).
  - Cards principais e faixas de destaque: `rounded-3xl` (24px).
  - Selos e avatares: `rounded-full` (9999px).
- **Bordas:** Delicadas e nítidas (`1px solid var(--border)` ou `border-slate-200`), garantindo estrutura física para os papéis brancos contra o fundo marfim.

---

## Components

### Buttons
- **Primary:** Fundo `var(--blue-royal)`, texto branco, raio `rounded-xl`, padding `px-6 py-3.5`, sombra sutil. No hover: escurece para `#1e44a8` com transição de 200ms.
- **Secondary / Outline:** Fundo branco, borda `border-slate-300`, texto `text-ink`, hover para `bg-slate-50`.
- **Coral CTA (Final):** Fundo `var(--coral)`, texto branco, animação de pulso opcional (`.coral-pulse`) em momentos de clímax.
- **Acessibilidade:** Altura mínima de toque de 44px (min-h-[44px]), anel de foco `focus-visible:ring-2 focus-visible:ring-blue-700`.

### Cards & Containers
- **Doc Card:** Fundo branco (`var(--surface)`), borda `var(--border)`, cantos `rounded-2xl`. No hover, eleva sutilmente com transição cubic-bezier.
- **Destaque Azul Notarial:** Seção escura em `bg-blue-950` com cartões translúcidos em `bg-white/[0.08]` e anel `ring-white/15` para criar quebra rítmica de alto valor.

### Inputs & Campos de Formulário
- **Campo de Etapa:** Fundo branco, borda `border-slate-300` com cantos `rounded-xl`, tipografia clara e confortável.
- **Foco Ativo:** Anel duplo em azul royal (`ring-2 ring-blue-100 border-blue-500`).
- **Validação:** Ícone de check em verde selo (`bg-emerald-600` / `var(--selo-green)`) dentro de círculo compacto.

### Assinatura da Marca: O Selo Notarial
- Elemento em SVG (`<Selo />`) composto por carimbo tracejado circular, envelope timbrado e inscrição estilizada da DocFácil. Atua como chancela de qualidade nas prévias de documento e cabeçalhos.

---

## Do's and Don'ts

### Do:
- **Do** manter sempre o fundo da página como papel marfim (`var(--paper)` / `#faf7f2`), permitindo que as folhas brancas de documento se destaquem visualmente.
- **Do** colorizar todas as sombras com a tinta navy da marca (`rgba(14, 35, 64, ...)`).
- **Do** posicionar a mascote Corujinha como elemento acolhedor e decorativo (`aria-hidden="true"`, `pointer-events-none`) sem obstruir links, botões ou textos.
- **Do** preservar a linha de Trust Badges e a transparência de gratuidade na landing page.
- **Do** garantir que todo botão ou elemento interativo tenha área de toque mínima de 44px e anel de foco visível para teclado.

### Don't:
- **Don't** usar preto puro (`#000000`) nem cinzas neutros genéricos sem subtom azulado/marrom.
- **Don't** aplicar a cor coral (`#ff6a4d`) em botões secundários ou links genéricos; reserve-a para a ação de conclusão.
- **Don't** criar sombras flutuantes difusas no estilo de software genérico; use a metáfora de folhas físicas apoiadas na mesa.
- **Don't** usar a Corujinha com balões de fala prometendo assessoria jurídica ou atuando como advogada.
- **Don't** permitir que ilustrações ou mascotes causem rolagem horizontal em telas de smartphone (320–390px).
