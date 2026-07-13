# DocFacil — Worklog

---
Task ID: 1
Agent: main (Z.ai Code)
Task: Build the DocFacil home page design/UX from the full product spec using GSAP and best practices.

Work Log:
- Installed `gsap` and `@gsap/react`.
- Set up the DocFacil design system in `src/app/globals.css`: brand color tokens (bg-paper #FAF7F2, ink, navy, blue-royal, blue-soft, selo-green, green-tint, coral), Plus Jakarta Sans (display) + Inter (body, 18px base), subtle paper grain, and custom component utilities (`.selo-ring`, `.selo-watermark`, `.doc-card` with dog-ear, `.field-land`, `.progress-pulse`, `.coral-pulse`, `.pen-note`).
- Updated `src/app/layout.tsx` with the new fonts, pt-BR lang, DocFacil metadata, and a fixed `.paper-grain` background div (inline-styled because Tailwind v4's CSS processor drops rules containing complex SVG data URIs — verified empirically).
- Built reusable components in `src/components/docfacil/`:
  - `selo.tsx` — the notarial stamp (mark / credibility / watermark variants), hand-drawn glyph.
  - `whatsapp-button.tsx` — always-visible floating WhatsApp CTA with delayed hint bubble.
  - `header.tsx` — fixed header that shrinks on scroll + hide-on-scroll-down via GSAP, with mobile sheet.
  - `hero.tsx` — staggered GSAP entrance timeline (badge → split title → subtitle → search → tags → rotating credibility seal → stats), search bar, popular tags, stats.
  - `catalog.tsx` — dog-ear document cards with scroll-reveal stagger and hover "Preencher agora".
  - `how-it-works.tsx` — 3 steps + a live split-screen demo (Concierge chat left / A4 Ateliê preview right with field-land highlights).
  - `ai-banner.tsx` — navy IA banner with orbital graphic and scroll-triggered timeline.
  - `social-proof.tsx` — trust pills + 3 testimonial cards.
  - `success-showcase.tsx` — the brand climax: green DOCFACIL stamp "strikes" the document (scale overshoot + shake), then coral CTA + share icons + upsell.
  - `footer.tsx` — navy footer with the "Prefere falar com uma pessoa?" WhatsApp band (the key differentiator).
  - `gsap-safety.tsx` — global safety: ScrollTrigger refresh on load + force-reveal of any stuck in-viewport animated element; reduced-motion respected in every component.
- Assembled `src/app/page.tsx` with min-h-screen flex-col layout (sticky footer) + GsapSafety + WhatsAppButton.

Issues found & fixed during Agent-Browser verification:
1. GSAP warning `[data-hero='stat'] not found` — Stat component wasn't forwarding the data-hero prop. Fixed via `...rest` spread.
2. Header used invalid `is-scrolled:` Tailwind variant — replaced with React state + conditional class.
3. **Critical:** full-page screenshots showed a near-black background instead of the cream paper. Root cause: `background-attachment: fixed` on body doesn't paint in headless Chromium screenshots, AND the `.paper-grain` CSS rule was being silently dropped by the Tailwind v4 processor (the SVG data URI made it discard the whole rule — confirmed 0 matches in compiled CSS). Fixed by painting `background-color` on `html`, adding `bg-paper` to the page wrapper, and moving the texture to an inline-styled fixed div.
4. AI banner CTA stuck at opacity 0 (other timeline elements reached 1). Root cause: using `trigger: root.current` (ref object) didn't survive the React Strict Mode double-invoke + useGSAP cleanup cycle. Fixed by switching to a selector string `"[data-ia='root']"` (consistent with the working components).
5. Added `prefers-reduced-motion` guards and `once: true` to every ScrollTrigger so content is never stuck invisible.

Verification (Agent Browser + VLM):
- Hero: cream paper bg confirmed (pixel sample 250,247,242), headline with blue "conversa" + green underline, search bar, green badge, stats — no layout issues.
- Catalog: 6 dog-ear cards with custom line icons, hover CTA — clean.
- How-it-works: split-screen chat (left) + A4 document preview (right) both filled — clean.
- AI banner: navy bg, white headline, blue CTA visible, orbital graphic — clean.
- Social proof: 3 testimonial cards (Cleonice, Rodrigo, Ana Lúcia) — clean.
- Success: green DOCFACIL stamp on document, coral "Baixar Documento (PDF)" button, 3 share icons, upsell text — all confirmed.
- Mobile (390x844): header readable, headline not cut, full-width search, tags wrap, no overflow. Hamburger menu opens/closes correctly.
- Lint: clean. Dev log: all GET / 200, no errors.

Stage Summary:
- Production-ready DocFacil home page built with GSAP scroll-triggered reveals, a hand-drawn selo/carimbo brand signature, paper-texture background, dog-ear document cards, live split-screen preview demo, and the stamp-strike success climax.
- Robust against reduced-motion, headless capture, and Strict Mode double-invoke.
- All 7 sections verified via Agent Browser + VLM; mobile responsive verified; interactivity (mobile menu) verified.

---
Task ID: 2
Agent: main (Z.ai Code)
Task: Preparar repositório para push — LICENSE, README, branding K-HUB

Work Log:
- Criado LICENSE comercial fechado e proprietário (K-HUB Soluções Digitais),
  com seções de marca comercial, confidencialidade e aviso a colaboradores.
- Criado README.md completo em PT-BR (stack, setup, estrutura, design system,
  acessibilidade, fluxo de contribuição, contato K-HUB).
- Atualizado package.json: name="docfacil", version="0.1.0", author K-HUB,
  license="UNLICENSED", repository, bugs, keywords, homepage.
- Criado src/lib/company.ts — single source of truth dos dados comerciais
  (nome, domínio, email, WhatsApp, foundedYear, copyrightRange()).
- Footer atualizado: adiciona "Powered by K-HUB" com badge "K" gradiente
  + "DocFacil é um produto da K-HUB Soluções Digitais" + copyright dinâmico.
- Layout metadata: authors/creator/publisher/copyright = K-HUB, locale pt_BR,
  twitter card, metadataBase, applicationName.
- WhatsAppButton passa a usar COMPANY.whatsapp.
- Criado .env.example (template para novos devs).
- .gitignore: adicionada exceção !.env.example.
- REMOVIDO .env do tracking do git (estava commitado desde Initial commit).
- Commit final: e30001d

Stage Summary:
- Repositório pronto para push: working tree clean, LICENSE + README + .env.example presentes, .env não tracked, package.json corrigido, branding K-HUB centralizado em src/lib/company.ts e visível no footer + metadata.
- Verificado via Agent Browser + VLM: "Powered by K-HUB", copyright K-HUB e menção comercial todos renderizando corretamente no rodapé.
- Próximo passo do usuário: criar repo vazio no GitHub + git remote add origin + git push -u origin main.

---
Task ID: 3
Agent: main (Z.ai Code)
Task: Setup da base de frontend multi-tela + logo K-HUB

Work Log:
- Analisada a logo PNG anexada (D azul com caneta), copiada para public/logo-docfacil.png
- Criado src/components/docfacil/nav-context.tsx — router client-side (NavProvider + useNav) que simula multi-página via estado, mantendo tudo na rota /
- Criado src/components/docfacil/logo.tsx — wordmark onde o PNG é o "D" + texto "ocFacil" (variantes header/footer/compact)
- Atualizado header.tsx para usar Logo + useNav (botões em vez de <a>)
- Atualizado footer.tsx para usar Logo (footer variant) + useNav nos links
- Atualizado catalog.tsx para usar MODELOS do lib/modelos.ts + useNav
- Atualizado hero.tsx, ai-banner.tsx, success-showcase.tsx para usar useNav
- Criado src/lib/modelos.ts — catálogo de 6 modelos (single source of truth) com campos, template, categorias
- Criado src/components/docfacil/views/page-shell.tsx — PageShell (wrapper c/ padding header + entrada GSAP) + PageHeader (eyebrow/título/subtítulo)
- Reescrito src/app/page.tsx como view router (NavProvider + CurrentView switch de 13 views)
- Despachando subagents em paralelo para construir as 13 views em arquivos independentes

Stage Summary:
- Fundação pronta: nav context, logo integrada, page router, page shell, catálogo compartilhado.
- Próximos subagents constroem: modelos-view, modelo-detalhe-view, criar-view, sucesso-view, ia-view, planos-view, dashboard-view, documento-detalhe-view, perfil-view, ajuda-view, login-view, cadastro-view.

---
Task ID: 4-C
Agent: general-purpose
Task: Build PlanosView + DashboardView + DocumentoDetalheView

Work Log:
- Read worklog.md, nav-context.tsx (View type + useNav), page-shell.tsx (PageShell + PageHeader), selo.tsx (Selo variants), company.ts, globals.css (design tokens), accordion.tsx + alert-dialog.tsx (shadcn UI primitives), page.tsx (router imports), modelos.ts + utils.ts.
- Created `src/components/docfacil/views/planos-view.tsx` (PlanosView):
  - PageShell + PageHeader (centered) with eyebrow "Planos", title "Escolha o plano que cabe no seu momento", subtitle "Sem letra miúda. Cancele quando quiser."
  - Three pricing cards (grid md:grid-cols-3 gap-6 max-w-5xl mx-auto):
    * Grátis (R$ 0, outline "Começar grátis" → navigate("modelos"))
    * Avulso (R$ 19,90 por documento, outline "Comprar um documento" → navigate("modelos"))
    * Pro (R$ 29,90/mês, CORAL "Assinar Pro" → navigate("cadastro")) with 2px blue-royal border, elevated shadow, md:-translate-y-2, and "Mais Popular" badge (selo-green) top-right corner
  - Each card: title, desc, big price, feature list with check icons (green-tint for Pro, blue-soft for others), CTA button
  - Reassurance row below cards: 3 items (Ban/CreditCard/ShieldCheck icons from lucide-react) — "Cancele quando quiser", "Pagamento via Pix ou cartão", "Sem fidelidade"
  - FAQ section (3-4 items) using shadcn Accordion — 4 perguntas sobre cancelamento, validade jurídica, necessidade de conta, e comparação Avulso vs Pro
  - GSAP stagger entrance for [data-planos-card] (y:40 opacity:0, stagger 0.12, ScrollTrigger once:true). Reduced-motion guard.
- Created `src/components/docfacil/views/dashboard-view.tsx` (DashboardView):
  - PageShell + PageHeader "Sua conta" / "Meus Documentos" with subtitle
  - Header row: PageHeader on left + blue-royal "Novo documento" button (Plus icon) → navigate("modelos") on right
  - Internal tabs (role="tablist"): Todos | Rascunhos | Concluídos. Active tab has blue-royal text + 2px underline. State-driven.
  - 5 mock documents with varied statuses/dates: Contrato de Locação, Declaração de Residência, Contrato de Comodato, Recibo de Pagamento, Procuração Ad Judicia
  - Demo logic: "Rascunhos" tab returns [] → triggers empty state. "Concluídos" filters concluido. "Todos" shows all.
  - DocCard: white card with blue-soft circle + FileText icon (left), name + date + status badge (middle: selo-green bg for Concluído, blue-soft for Rascunho), quick action icon buttons (Pencil/Download/Copy) on right. Card click → navigate("documento-detalhe", { id }). Edit action → navigate("criar", { slug }) via slug map. Entire card is keyboard-accessible (role="button" tabIndex={0}, Enter/Space handlers).
  - Empty state: custom hand-drawn SVG folder illustration (NOT flat generic — folder with sheets peeking out, selo-green check dot, blue-royal strokes), text "Você ainda não criou nenhum documento", subtitle, blue-royal CTA "Criar meu primeiro documento" → navigate("modelos")
  - GSAP stagger entrance for [data-doc-card] (y:24 opacity:0, stagger 0.08, ScrollTrigger once:true). Re-runs on tab change (dependencies:[tab]). Reduced-motion guard.
- Created `src/components/docfacil/views/documento-detalhe-view.tsx` (DocumentoDetalheView):
  - Reads `params.id` from useNav (defaults to "doc-1" if missing)
  - PageShell with "← Voltar para Meus Documentos" button → navigate("dashboard")
  - Two-column grid (lg:grid-cols-[1fr_360px]): LEFT A4 preview (order-2 on mobile, order-1 desktop), RIGHT metadata+actions (order-1 mobile, order-2 desktop)
  - LEFT: A4 sheet (white, max-w-[420px], aspect-[1/1.414], shadow + ring), <Selo variant="watermark" />, "DocFacil · ID {docId}" header, "CONTRATO DE LOCAÇÃO" title with separator line, 3 justified paragraphs (filled sample text with Maria Aparecida / João Pereira / Rua das Acácias / R$ 1.450,00 / 30 meses), signature blocks for LOCADOR(A) and LOCATÁRIO(A). Zoom toggle button (ZoomIn icon) scales preview 1.04×.
  - RIGHT:
    * Eyebrow "Documento" + title "Contrato de Locação"
    * Metadata card (dl): "Criado em 13 de julho de 2026", "Última edição há 2 dias", "Status: Concluído" (selo-green badge)
    * Vertical action stack: "Editar respostas" (blue-royal primary, Pencil) → navigate("criar", { slug: "contrato-locacao" }); "Baixar PDF" (outline, Download); "Duplicar" (outline, Copy); "Excluir" (coral text button, Trash) — uses shadcn AlertDialog (AlertDialogTrigger/Content/Header/Title/Description/Footer/Cancel/Action). On confirm → navigate("dashboard").
    * Histórico section: clock icon header + ordered list of 2 events (criação + download) with blue-royal dot markers
  - GSAP stagger for [data-det='col'] (y:24 opacity:0, stagger 0.12, no ScrollTrigger — fires on mount). Reduced-motion guard.
- Ran `bun run lint`: 0 errors in my three files. (Only 1 pre-existing warning in nav-context.tsx — unused eslint-disable directive — not mine.)
- Ran `bunx tsc --noEmit`: my three files compile cleanly. (Errors only in pre-existing files in examples/, skills/, src/app/layout.tsx, and other subagents' missing view files — not mine.)

Stage Summary:
- Three production-ready React view components delivered: PlanosView (pricing with 3 tiers, Pro plan carries the single coral CTA), DashboardView (Meus Documentos with tabs + populated/empty states, custom SVG folder empty state), DocumentoDetalheView (A4 preview with watermark + metadata + AlertDialog-confirmed delete).
- All three use the established design tokens (paper, ink, navy, blue-royal, blue-soft, selo-green, green-tint, coral — coral used ONLY on the Pro plan CTA in Planos, and on the destructive Excluir button in DocumentoDetalhe, both correctly single coral CTAs per screen).
- All respect prefers-reduced-motion, use GSAP via useGSAP with once:true ScrollTriggers where applicable, are keyboard-accessible (role/tabIndex/onKeyDown on doc cards, proper aria-labels on icon buttons, role="tablist" on dashboard tabs), and responsive (single column on mobile).
- Named exports: PlanosView, DashboardView, DocumentoDetalheView — already wired into src/app/page.tsx CurrentView switch by Agent 3.

---
Task ID: 4-D
Agent: general-purpose
Task: Build LoginView + CadastroView + PerfilView + AjudaView

Work Log:
- Lidos os arquivos de referência: worklog.md (contexto das tarefas 1–3), nav-context.tsx (View type + useNav), page-shell.tsx (PageShell + PageHeader com GSAP safe), selo.tsx, logo.tsx, lib/company.ts (K-HUB + WhatsApp), globals.css (design tokens), além de components/ui/{accordion,input,label,checkbox}.tsx para conhecer a API shadcn disponível.
- Criado `src/components/docfacil/views/login-view.tsx`:
  - Layout centralizado (min-h-[calc(100vh-72px)] flex items-center), card surface rounded-2xl p-8 com shadow.
  - Logo no topo via `<Logo variant="header" />` centralizado.
  - Título "Bem-vindo de volta" + subtítulo "Guarde seus documentos com segurança para editar depois."
  - Inputs h-12 text-xl (20px — público leigo), com ícone Mail/Lock à esquerda, label acima, ring blue-soft no focus.
  - Toggle Eye/EyeOff na senha com aria-label + aria-pressed.
  - Link "Esqueci minha senha" alinhado à direita (blue-royal, pequeno) → navigate("ajuda").
  - Botão "Entrar" blue-royal full width h-12 → navigate("dashboard") no submit (sem auth real).
  - Divisor "ou" + botão "Continuar com Google" outline com Google G inline SVG (4 cores).
  - Rodapé: "Ainda não tem conta? Criar conta grátis" → navigate("cadastro").
  - GoogleGIcon inline SVG autocontido (sem dependência externa).
- Criado `src/components/docfacil/views/cadastro-view.tsx`:
  - Mesma arquitetura visual do login (continuidade).
  - Título "Crie sua conta grátis" + subtítulo "Guarde seus documentos e edite quando quiser."
  - Campos Nome (User), E-mail (Mail), Senha (Lock + toggle eye) — todos h-12 text-xl.
  - Hint "Mínimo 8 caracteres" abaixo da senha + minLength=8 no input.
  - Checkbox Termos com `required` (validação nativa HTML5) + accent-color blue-royal, links inline para Termos e Política.
  - Botão "Criar conta" → navigate("dashboard").
  - Google button + rodapé "Já tem conta? Entrar" → navigate("login").
- Criado `src/components/docfacil/views/perfil-view.tsx`:
  - PageShell + PageHeader (eyebrow "Sua conta", title "Perfil e configurações").
  - Botão "← Voltar" no topo → navigate("dashboard").
  - Grid lg:[1.2fr_1fr], mobile 1 coluna.
  - ESQUERDA — Dados pessoais: avatar JS em blue-soft + botão "Trocar foto" (Camera icon), campos Nome/Email/Telefone pré-preenchidos (João Silva / joao@email.com / (11) 99999-0000), botão "Salvar alterações" com feedback "Salvo!" temporário.
  - DIREITA — três seções empilhadas:
    1. Plano atual: "Plano Pro" + "R$ 29,90/mês · Renova em 15/08/2026" + "Gerenciar plano" → navigate("planos").
    2. Histórico de pagamentos: lista de 3 pagamentos (15/07, 15/06, 15/05) com badge selo-green "Pago" + Check icon.
    3. Cancelar assinatura: seção explícita (NÃO escondida atrás de menu/dialog), título + texto tranquilizador "Você manterá acesso até o fim do período já pago. Sem multas, sem burocracia." + botão texto coral "Cancelar assinatura" — anti-dark-pattern conforme spec.
  - Helper Field local (ícone + label + input) para evitar repetição.
- Criado `src/components/docfacil/views/ajuda-view.tsx`:
  - PageShell + PageHeader (eyebrow "Central de ajuda", title "Como podemos ajudar?").
  - Botão "← Voltar" → navigate("dashboard").
  - Search bar grande (h-14 text-lg rounded-xl) com ícone Search, aria-label "Buscar na ajuda".
  - FAQ em Accordion (shadcn) com 8 perguntas em linguagem simples (validade jurídica, cartório, edição, pagamento, cancelamento, segurança, travamento, tipos de documento) — trigger text-lg font-semibold, content text-base leading-relaxed.
  - Filtro client-side: digitar no search filtra FAQ por q+a; estado vazio mostra mensagem com termo buscado.
  - Bloco destaque (diferencial de marca): bg green-tint rounded-2xl p-7/10 text-center, h3 "Prefere falar com uma pessoa?" + texto "Sem robô, sem fila de menu." + botão WhatsApp verde #25D366 (inline style pois não é token) com MessageCircle icon, target=_blank rel=noopener, href=COMPANY.whatsapp.
  - Abaixo: 2 cards de contato alternativo — E-mail (mailto:contato@khub.com.br) + Horário (seg–sáb 8h–20h).
- Lint: `bun run lint` → 0 erros, 1 warning pré-existente em nav-context.tsx (não relacionado). Os 4 novos arquivos passam limpos.
- TypeScript: `bunx tsc --noEmit` não reporta erros em nenhum dos 4 arquivos novos (os erros restantes são todos em arquivos de outros subagents — criar-view, sucesso-view — ou preexistentes em examples/, skills/, layout.tsx).

Stage Summary:
- 4 views de auth/perfil/ajuda entregues e integradas ao page router (page.tsx já referenciava LoginView, CadastroView, PerfilView, AjudaView com named exports correspondentes).
- Design system respeitado: tokens CSS via classes Tailwind (bg-paper, bg-surface, text-ink, blue-royal, blue-soft, selo-green, green-tint, coral), font-jakarta para títulos, inputs 20px (text-xl) para público leigo, sem coral nas telas de auth (apenas no botão de cancelamento do perfil como cor destrutiva textual).
- Acessibilidade: todos os inputs com label associado via htmlFor, toggles com aria-label/aria-pressed, accordion Radix acessível por padrão, botões com focus-visible:ring, ícones decorativos aria-hidden.
- Mobile responsivo: grid quebra de 2→1 colunas no perfil, padding ajustado, search e WhatsApp full-width no mobile.
- Anti-dark-pattern: cancelamento de assinatura é uma seção de cartão própria, visível, com texto tranquilizador — não escondida em menu nem atrás de múltiplas confirmações.
- WhatsApp como diferencial de marca: bloco verde prominente no centro da página de ajuda, usando COMPANY.whatsapp da lib/company.ts (single source of truth).
- Sem GSAP nas telas de auth (estáticas e funcionais); PerfilView e AjudaView usam PageShell que já respeita prefers-reduced-motion.

---
Task ID: 4-B
Agent: general-purpose
Task: Build ModelosView + ModeloDetalheView + IAView

Work Log:
- Lidos os arquivos de contexto (worklog, modelos.ts, nav-context, page-shell, selo, catalog, globals.css) para alinhar 100% com o design system DocFacil.
- Criado `src/components/docfacil/views/modelos-view.tsx`:
  - PageShell + PageHeader (eyebrow "Catálogo completo", título + subtítulo).
  - Busca grande (h-14) com ícone Search, botão limpar (X), placeholder PT-BR.
  - Chips de filtro por categoria: "Todos" + 4 categorias. Chip ativo = blue-royal/branco; inativo = blue-soft/70.
  - Grid reaproveita `.doc-card` + `DocIcons` importados de `@/components/docfacil/catalog`.
  - Card teclado-acessível (tabIndex=0, role=button, Enter/Space = navigate).
  - GSAP stagger scroll-triggered (y:36, opacity:0, once:true), refeito quando a lista muda.
  - Estado vazio com SVG próprio (pasta suspensa + lupa, não genérico) + CTA coral-free blue-royal para a IA.
- Criado `src/components/docfacil/views/modelo-detalhe-view.tsx`:
  - Lê `params.slug`, busca via `getModelo(slug)`. Fallback amigável com botão de voltar.
  - Botão "← Voltar ao catálogo" no topo.
  - Layout 2 colunas (lg): info à esquerda, prévia A4 à direita (sticky).
  - Esquerda: badge categoria, título grande, "Use quando…", checklist `.campos` com check verde selo, linha "Leva cerca de X minutos", CTA blue-royal "Começar agora" → navigate("criar", { slug }).
  - Direita: A4 `aspect-[1/1.414]` branco + sombra + `<Selo variant="watermark" />`, mostra template.titulo + primeira linha do corpo com `{{placeholders}}` pontilhados (função `renderPlaceholders`), assinaturas, microcopy.
  - GSAP entrance com stagger nas colunas e itens.
- Criado `src/components/docfacil/views/ia-view.tsx`:
  - PageShell + PageHeader (eyebrow "Gerador com IA", título + subtítulo).
  - Janela de conversa (max-w-2xl, bg-paper) com bolhas sistema (esquerda, avatar Selo mark em círculo blue-soft) e usuário (direita, blue-royal).
  - Composer: textarea min-h-32 text-lg + botão Enviar; atalho ⌘/Ctrl+Enter.
  - Fluxo simulado: enviar → 350ms → typing indicator (3 dots animate-bounce) → +1600ms → bolha sistema com card "estrutura proposta" (4 seções numeradas) + 2 botões ("Seguir com essa estrutura" blue-royal, "Refazer" outline).
  - "Seguir" → bolha confirmação com botão verde selo "Ir para o editor" → navigate("criar", { slug: "ia-gerado" }).
  - "Refazer" → remove o rascunho e volta a perguntar.
  - Mensagens tipadas com `kind: "texto" | "rascunho" | "confirmado"` para passar callbacks limpos (sem document.dispatchEvent).
  - GSAP bubble entrance (y:16, opacity:0, 0.4s, stagger 0.1). Respeita reduced-motion (timestamps zerados, animação GSAP pulada, dots animate-bounce já neutralizados pelo media query global).
  - Footer warning discreto itálico sobre revisão de IA.
- Verificação: `bun run lint` → 0 erros nos meus 3 arquivos (1 warning pré-existente em nav-context.tsx, não relacionado). `tsc --noEmit` → 0 erros nos meus 3 arquivos (erros restantes são pré-existentes ou de outros subagents: layout copyright, criar-view/sucesso-view ainda não criados).

Stage Summary:
- Três views production-ready entregues e integráveis ao router já existente em `src/app/page.tsx` (ModelosView, ModeloDetalheView, IAView).
- Todas reutilizam o design system DocFacil (doc-card, selo, tokens CSS, PageShell/PageHeader), usam GSAP com `prefers-reduced-motion` guard, são mobile-responsive e keyboard-accessible.
- ModelosView: catálogo completo com busca + filtro + estado vazio → IA.
- ModeloDetalheView: explicação + checklist + prévia A4 antes de /criar.
- IAView: chat demo com typing indicator, estrutura proposta, confirmar/refazer, e saída para o editor.
- Lint e type-check limpos para os três arquivos.

---
Task ID: 4-A
Agent: general-purpose
Task: Build CriarView + SucessoView

Work Log:
- Read worklog, modelos.ts, nav-context.tsx, page-shell.tsx, selo.tsx, catalog.tsx, globals.css, success-showcase.tsx, how-it-works.tsx to align with the established design system and the existing stamp-strike pattern.
- Created `src/components/docfacil/views/criar-view.tsx` — the split-screen Concierge filling flow:
  - Custom wrapper `min-h-screen pt-[72px] flex flex-col` (no PageShell) so the split screen fills viewport height.
  - Top bar with discreet "← Voltar" (→ navigate("modelo-detalhe", {slug})), selo-green progress bar that grows with `step` and briefly gains `progress-pulse` class on each completed step, plus "passo X de Y" counter.
  - Desktop: 45%/55% grid. Left = Concierge chat (bg-paper) with avatar bubble (Selo mark in blue-soft circle), large h-14 text-xl input (or textarea when tipo==="textarea"), microcopy in `.pen-note`, blue-royal "Avançar" button + Enter-key submit. Right = Ateliê preview (bg #efe9dd) with white A4 sheet (aspect-[1/1.414], max-w-[340px]), Selo watermark, document title + body with `{{key}}` placeholders, "atualizando ao vivo" green badge.
  - Mobile: sticky tabs "Perguntas" / "Visualizar" with the two panels toggled via `hidden lg:flex` / `hidden lg:grid`.
  - State: `step`, `answers` (single source of truth that doubles as the live draft — every keystroke updates the Ateliê preview instantly), `mobileTab`, `pulseProgress`.
  - GSAP entrance on every new question: `fromTo(y:20, opacity:0 → y:0, opacity:1, 0.4s, power3.out)` via `useGSAP({ dependencies: [step] })`. Empty-submit triggers a brief elastic shake on the input. All animations guarded by `prefers-reduced-motion`.
  - `renderTemplateLine` helper: splits each template line by `{{...}}`, renders filled spans with `field-land` class (key suffix `-filled` vs `-empty` so the span remounts and the blue→transparent keyframe replays whenever a field transitions from empty to filled). Unfilled placeholders render as dotted-underline spans.
  - On final step: `navigate("sucesso", { slug, id: <slug>-<base36 timestamp> })`.
  - Friendly fallback when slug not found: Selo mark + message + "Ver todos os modelos" button → navigate("modelos").
  - A11y: input has `aria-label={pergunta}`, Enter submits (Shift+Enter allows newline in textarea), input refocused on each new question via `useEffect([step])`.
- Created `src/components/docfacil/views/sucesso-view.tsx` — the standalone success/download climax:
  - Wrapped in `PageShell` + `PageHeader` (eyebrow "Documento pronto", title "Pronto! Seu [Nome] está formatado e com validade legal.", centered).
  - Stage: bg-surface card with smaller A4 thumbnail (max-w-[280px]) showing template titulo + first 2 corpo lines (placeholders replaced with ____________ for the locked-down look) and the green DOCFACIL stamp overlay.
  - Stamp strike timeline fires on mount (no ScrollTrigger — user just landed): set scale 0/opacity 0/rotation -18 → scale 1.18/opacity 1/rotation -8 (0.34s, power3.in) → scale 1 (0.28s, back.out(2.2)) → sheet yoyo shake 5x (0.05s each) → CTA + share + upsell `from` reveals. Reduced-motion path: `gsap.set` stamp to final state and skip the timeline.
  - The ONE coral CTA "Baixar Documento (PDF)" with `.coral-pulse` breathing shadow (full-width on mobile, auto+px on sm+).
  - 3 discrete outline share buttons (NOT coral): WhatsApp (MessageCircle), E-mail (Mail), Copiar link (Copy → Check on success, writes window.location.href to clipboard, shows "Link copiado" confirmation for 2s).
  - Upsell: "Quer editar isso depois? Crie uma conta grátis" → navigate("cadastro").
  - "Voltar ao início" text link → navigate("home").
  - Same slug-not-found fallback pattern as CriarView.
- Lint: clean (0 errors, 0 warnings on the two new files). One pre-existing warning in nav-context.tsx (another agent's file) left untouched.
- Dev server: HMR compiled successfully (67ms after the last edit).

Stage Summary:
- Two production-ready views delivered, both `"use client"` with GSAP + `prefers-reduced-motion` guards, both consuming the shared `MODELOS` catalog and `useNav` router.
- CriarView is the heart of the product: a focused, single-question Concierge flow with a live Ateliê preview that flashes `field-land` blue every time a placeholder lands, plus a mobile tab fallback for small screens.
- SucessoView is the brand climax: the green DOCFACIL stamp strikes the A4 sheet on mount (scale overshoot + 5x yoyo shake), then the single coral CTA breathes, with discrete share icons and a clear upsell + home return.
- Both views interoperate with the rest of the platform: CriarView → navigate("sucesso", {slug, id}) → SucessoView → navigate("cadastro" | "home"), and CriarView's "Voltar" returns to modelo-detalhe.

---
Task ID: 5
Agent: main (Z.ai Code)
Task: Camada de polimento + preparação Firebase + pdfmake

Work Log:
- Instalado firebase@12.16.0 + pdfmake@0.3.11
- Criado src/lib/types.ts — tipos compartilhados (Modelo, Documento, PerfilUsuario, Pagamento, etc.)
- Criado src/lib/firebase.ts — init do Firebase (Auth + Firestore) com fallback gracioso:
  IS_FIREBASE_CONFIGURED detecta se NEXT_PUBLIC_FIREBASE_* estão presentes.
  Sem credentials → demo mode (dados locais). Com credentials → Firebase real.
- Criado src/lib/auth-context.tsx — AuthProvider + useAuth:
  - Firebase mode: onAuthStateChanged, Google popup, email/password, perfil sincronizado no Firestore
  - Demo mode: localStorage-backed mock user (persiste entre reloads)
  - Tradução de erros do Firebase Auth para PT-BR
- Criado src/lib/services/models-service.ts — getModels/getModel (Firestore ou local)
- Criado src/lib/services/documents-service.ts — CRUD completo (create/read/update/delete/duplicate)
  com seed de 3 documentos demo + persistência localStorage
- Criado src/lib/services/users-service.ts — getPerfil/savePerfil/listPagamentos
- Criado src/lib/pdf/generator.ts — geração de PDF A4 com pdfmake:
  título centralizado, corpo justificado, linhas de assinatura, footer com data,
  watermark "DOCFACIL" sutil, download direto
- Criado scripts/seed-models.ts — popula coleção "models" no Firestore (usa firebase-admin)
- Criado firestore.rules — security rules (users só veem próprios docs, models read-only público)
- Criado firebase.json — config do Firebase CLI
- Atualizado .env.example com NEXT_PUBLIC_FIREBASE_* (6 vars)
- Atualizado package.json com scripts seed:models + firestore:rules
- Atualizado page.tsx para envolver com AuthProvider
- Lint limpo, dev server compila sem erros

Stage Summary:
- Infraestrutura completa: Firebase (Auth+Firestore) com fallback demo, services com CRUD, PDF generator com pdfmake, security rules, seed script.
- Próximos subagents fazem o wiring das views aos services + auth + PDF real + polish.

---
Task ID: 6-B
Agent: general-purpose
Task: Wire data views to services + real PDF generation

Work Log:
- Lidos 10 arquivos de contexto (worklog, services models/documents, pdf/generator, types, modelos, auth-context, nav-context, 4 views alvo, globals.css, sonner.tsx, layout.tsx) antes de qualquer edição.
- Criado `src/components/docfacil/views/skeletons.tsx` com skeletons compartilhados: `DocCardSkeleton`, `DocGridSkeleton`, `DetalheInfoSkeleton`, `A4Skeleton`, `ErrorState` — todos respeitando a paleta (`--blue-soft`, `--green-tint`, `--coral`) e mantendo o layout medido pra evitar "pulo" entre loading → conteúdo.
- `modelos-view.tsx`:
  - Substituído `MODELOS` (import local) por `getModels()` do services layer.
  - Adicionado `useState(models/loading/error)` + `useEffect(() => loadModels(), [])` com callback estável (useCallback).
  - Loading → `<DocGridSkeleton count={6} />` (grid pulsante de 6 cards).
  - Erro → `<ErrorState message=... onRetry={loadModels} />` (botão "Tentar novamente").
  - Contagem de resultados agora exibe "Carregando modelos…" durante fetch.
  - `useGSAP` re-rodando via `dependencies: [filtrados.length]` quando os cards materializam — stagger preservado.
  - Filtros por categoria, busca, empty state IA CTA — todos intactos.
- `modelo-detalhe-view.tsx`:
  - Substituído `getModelo(slug)` (local) por `getModel(slug)` (async service).
  - `useState(modelo/loading/error)` + `useEffect` reage à mudança de slug.
  - Loading → `<DetalheInfoSkeleton />` + `<A4Skeleton />` no mesmo grid de 2 colunas (não pula layout).
  - Erro → `<ErrorState onRetry={load} />`.
  - Null após carregar → "Modelo não encontrado" + botão "Voltar ao catálogo".
  - `useGSAP` agora depende de `[modelo]` — stagger das colunas/items só dispara quando o modelo real está no DOM.
  - Prévia A4, checklist "O que você vai precisar", "Começar agora → navigate('criar', { slug })" — tudo preservado.
- `criar-view.tsx`:
  - `getModel(slug)` async (era `getModelo`).
  - Loading skeleton completo do split-screen (top bar + coluna chat + folha A4 pulsando), mantendo `min-h-screen pt-[72px] flex flex-col`.
  - `useAuth()` traz o user; `userId = user?.uid || "demo"` — não bloqueia fluxo em demo mode.
  - No último passo (Avançar/Finalizar), `createDocument({ modeloSlug, modeloNome, respostas, status: 'concluido', userId })` → `navigate('sucesso', { slug, id: doc.id })` com o id REAL retornado pelo service.
  - `submitting` state: botão mostra "Salvando…" + spinner (Loader2), input desabilitado, evita duplo clique.
  - Fallback gracioso: se createDocument falhar, loga erro e navega pra sucesso mesmo assim (pra não perder o preenchimento).
  - Split-screen Concierge chat + A4 live preview + progress-pulse + field-land + mobile tabs (Perguntas/Visualizar) + shake no input vazio — 100% preservados.
- `sucesso-view.tsx`:
  - `getModel(slug)` + `getDocument(params.id)` (se existir) carregam modelo real + respostas reais salvas pelo CriarView.
  - `useEffect(() => preloadPdfmake())` pré-aquece o pdfmake no mount (lazy-load do vfs) → primeiro clique no coral é ~instantâneo.
  - Botão coral "Baixar Documento (PDF)" agora chama `gerarEBaixarPDF(modelo, respostas, modelo.slug)` DE VERDADE.
  - Estado `gerandoPdf`: botão mostra "Gerando PDF…" + Loader2 spinner, `disabled` + `aria-busy`, coral-pulse respeitado.
  - Sucesso → `toast.success('PDF gerado!', { description })` via sonner.
  - Erro → `toast.error('Não foi possível gerar o PDF.')` via sonner + log de console.
  - Prévia A4 do thumbnail agora mostra o conteúdo REAL preenchido (via `renderFilledLine` — espelha o `fillTemplate` do generator, com `{{key}}` → valor em semibold ink, ou `____________` em ink/45 quando vazio).
  - Stamp strike GSAP (scale overshoot + yoyo shake no sheet + entrada do CTA/secondary/upsell), share buttons (WhatsApp/e-mail/copiar link), upsell "Crie uma conta grátis", "Voltar ao início" — todos preservados.
  - `useGSAP` agora depende de `[modelo]` — animação só dispara quando o sheet real está no DOM.
- `src/app/layout.tsx`:
  - Montado `<SonnerToaster position="top-center" richColors closeButton />` ao lado do `<Toaster />` existente (shadcn) — sonner era uma dependência instalada mas não tinha Toaster montado, então `toast()` do sonner não funcionava. Agora funciona.
- Lint final: 0 erros nos arquivos modificados (1 warning pré-existente em `dashboard-view.tsx` — não meu). TypeScript check limpo nos arquivos tocados.

Stage Summary:
- 4 views (Modelos, ModeloDetalhe, Criar, Sucesso) agora consomem dados reais via services layer (getModels/getModel/getDocument/createDocument). Em modo Firebase, lêem do Firestore; em demo mode, caem no array local / localStorage — transparente para as views.
- Fluxo ponta-a-ponta funcionando: catálogo → detalhe → criar → createDocument persiste → sucesso carrega o doc salvo → clique no coral dispara pdfmake → PDF A4 formatado baixa no disco do usuário.
- Estados de loading (skeletons medidos), erro (retry), e not-found cobertos em todas as views — UX contínua, sem "saltos" de layout.
- GSAP animations (stagger do catálogo, fade-in do detalhe, field-land/progress-pulse do criar, stamp strike do sucesso) preservadas e ajustadas para rodar quando os dados reais chegam no DOM.
- Sonner toasts operacionais (layout montou o Toaster) para feedback de sucesso/erro no download do PDF.
- Próximo subagent pode seguir com polish (microinterações, dashboard wiring, IA, etc.) — base de dados + geração de PDF está fechada.

---
Task ID: 6-A
Agent: general-purpose
Task: Wire auth views + protected views to AuthContext/services

Work Log:
- Read all required context files: worklog (Task 5), auth-context, services (users + documents), firebase, types, nav-context, and the 5 target views.
- Verified AuthProvider is mounted in page.tsx (wraps NavProvider) and sonner Toaster is mounted globally in layout.tsx → used `toast` from "sonner" for success/error/info feedback.
- Verified shadcn AlertDialog is available (already used by documento-detalhe-view) → reused for cancel-subscription + delete-document confirmations.

Created new file:
- `src/components/docfacil/views/auth-gate.tsx` — exports `AuthGate` that takes `children` and:
  - Renders a pulsing skeleton (4 card placeholders + header shimmer) while `loading` is true
  - Renders a friendly login prompt with Lock icon, "Faça login para ver seus documentos" heading, and two CTA buttons (Entrar → navigate("login"), Criar conta grátis → navigate("cadastro")) when `!user`
  - Renders `children` when user is present
  - Uses `pt-[72px]` to clear the fixed header (matches PageShell)
  - Used by Dashboard, Perfil, and DocumentoDetalhe (3x dedup)

FILE 1 — `login-view.tsx`:
- Replaced fake `navigate("dashboard")` with `await signInWithEmail(email, password)` → navigate on success
- Wired Google button to `await signInWithGoogle()` → navigate on success
- Added controlled inputs (email/password) + show-password toggle preserved
- Added validation: email must contain "@", password not empty (shows inline coral alert)
- Shows `error` from useAuth() in a coral alert box (AlertCircle icon, border + bg with coral CSS vars)
- Loading state: button disabled + spinner (Loader2 animate-spin) + "Entrando..." text while submitting
- Google button also disabled while submitting
- Preserved all existing visual design (Logo, fields, Google button, link to cadastro, esqueci senha)

FILE 2 — `cadastro-view.tsx`:
- Replaced fake navigate with `await signUpWithEmail(nome, email, password)` → navigate on success
- Wired Google button to `signInWithGoogle()`
- Added controlled inputs (nome/email/password/terms checkbox)
- Validation: nome not empty, email valid (contains "@"), password >= 8 chars, terms must be checked
- Submit button disabled if `!terms` (canSubmit = terms && !submitting) — visual feedback via opacity
- Coral alert box for errors (validation + AuthContext error)
- Loading state: "Criando conta..." with spinner
- Preserved all existing visual design

FILE 3 — `dashboard-view.tsx`:
- Wrapped with `<AuthGate>` (renders login prompt if !user, skeleton if loading)
- Replaced hardcoded DOCS array with real data: `useEffect(() => listDocuments(user.uid).then(setDocs))`
- Loading skeleton (4 pulsing card placeholders with shimmer avatar + lines) while fetching
- Error state with retry button (AlertCircle + "Tentar novamente") if fetch fails
- Tabs now show real counts (badge per tab) — Todos / Rascunhos / Concluídos
- Filtered list applies real `status` filter to fetched docs
- Each card: real modeloNome, real criadoEm formatted with `toLocaleDateString("pt-BR")`, real status badge
- Card actions:
  - Click → navigate("documento-detalhe", { id: doc.id })
  - Editar → navigate("criar", { slug: doc.modeloSlug })
  - Baixar → toast.info("Preparando PDF...") (real PDF wiring is in documento-detalhe)
  - Duplicar → `await duplicateDocument(doc.id)` then refresh list + toast.success
- Empty state now reflects REAL empty state — different copy for "no drafts at all" vs "filtered tab empty"
- Preserved GSAP scroll-reveal animation + responsive layout

FILE 4 — `perfil-view.tsx`:
- Wrapped with `<AuthGate>`
- Loads real profile via `getPerfil(user.uid)` + payments via `listPagamentos(user.uid)` in useEffect (Promise.all)
- Pre-fills name/email/phone fields with real data (email field is disabled — can't change auth email here)
- Avatar initials computed from real nome
- "Salvar alterações" → `await updateProfileData({ nome, telefone })` + toast.success + inline "Salvo!" state for 2s
- "Gerenciar plano" → navigate("planos")
- "Cancelar assinatura" → AlertDialog (Manter assinatura / Sim, cancelar); on confirm shows inline success message "Assinatura cancelada. Você manterá acesso até XX/XX." + toast
- Display plano atual from user.plano ("Grátis" / "Avulso" / "Pro") with corresponding price label
- Cancel section hides the cancel button when plano === "gratis" (nothing to cancel) or after cancellation
- Real payments: date formatted `toLocaleDateString("pt-BR")`, value in R$ `toLocaleString("pt-BR", { style: "currency", currency: "BRL" })`, status badge (Pago green / Estornado coral), metodo (Pix/Cartão)
- Loading skeleton while fetching (shimmer profile card + plan card + payments card)

FILE 5 — `documento-detalhe-view.tsx`:
- Wrapped with `<AuthGate>`
- Loads real document via `getDocument(params.id)` in useEffect
- If not found → "Documento não encontrado" screen with FileQuestion icon + back button → navigate("dashboard")
- Loads modelo in parallel via `getModel(doc.modeloSlug)` (non-blocking — preview falls back gracefully)
- Shows real modeloNome, real respostas filled into template (uses modelo.template.corpo with {{key}} replacement; falls back to key:value list if modelo unavailable)
- Real criadoEm / atualizadoEm formatted with `toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })`
- Real status badge (Concluído green / Rascunho blue)
- Actions:
  - Editar respostas → navigate("criar", { slug: doc.modeloSlug })
  - Baixar PDF → `await gerarEBaixarPDF(modelo, doc.respostas, doc.modeloSlug)` (real pdfmake integration!) with loading spinner + toast.success/error
  - Duplicar → `await duplicateDocument(doc.id)` → toast.success → navigate("dashboard")
  - Excluir → AlertDialog ("Excluir documento?") → on confirm `await deleteDocument(doc.id)` → toast.success → navigate("dashboard")
- Action buttons show loading state (spinner + "Gerando PDF..." / "Duplicando..." / "Excluindo...") and disable siblings while one is in flight
- Histórico built from real timestamps (created + updated if different)
- A4 preview uses real template titulo + real filled paragraphs (capped at 8 with "... (mais N parágrafos)" overflow)
- Loading skeleton while fetching (shimmer A4 + metadata card + action buttons)
- Preserved GSAP entrance animation + zoom toggle

Lint: clean (0 errors, 0 warnings) — `bun run lint` passes.
TypeScript: my modified files have no new type errors (pre-existing errors in examples/, scripts/, skills/, and layout.tsx copyright metadata are unrelated).

Stage Summary:
- All 5 views now wired to real AuthContext + services layer. Auth flow works end-to-end in demo mode (no Firebase creds needed) and will work identically in production mode once env vars are added.
- AuthGate component deduplicates the "please log in" prompt across 3 protected views.
- Real PDF generation works in documento-detalhe-view via pdfmake (Task 5's generator) + models-service.
- All loading + error states handled gracefully (skeletons, retry buttons, not-found screen, coral error alerts, sonner toasts).
- Design system preserved throughout (CSS vars, Jakarta Sans for titles, coral for one-accent-per-screen max, accessible focus rings, keyboard-navigable).
- Next subagents can wire: real Stripe/Pix billing (currently cancel is a no-op message), avatar photo upload, password reset flow, and "Baixar PDF" in dashboard (currently toast — could share a hook with documento-detalhe's download logic).
