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

---
Task ID: REBUILD-6
Agent: general-purpose
Task: Recreate criar + documento subcomponents

Work Log:
- Lidos 9 arquivos de contexto (worklog, modelos.ts, normalizers.ts, cep-service.ts, constants.ts, pet.tsx, use-typing-text.ts, selo.tsx, globals.css) + 4 arquivos de referência (types.ts, services documents/models, pdf/generator, auth-context, nav-context, page-shell, modelo-detalhe-view, documento-detalhe-view, criar-view, skeletons) antes de qualquer edição.
- Criado `src/components/docfacil/views/criar/` com 8 subcomponentes + `src/components/docfacil/views/documento/` com 2 subcomponentes.

1. `criar/types.ts` (sem "use client" — pure types/utilsities):
   - `PetMood` = "idle" | "falando" | "feliz" | "atencao" | "pensando" (espelha o tipo interno do pet.tsx)
   - `InputElement`, `InputRef` (= HTMLInputElement | HTMLTextAreaElement | null)
   - `EtapaModelo` union (pergunta | grupo | clausulas) — modela o fluxo Concierge
   - `ClausulaDinamica` { id, titulo, descricao, corpo, camposExtras? }
   - `RespostasState` { campos: Record<string,string>, clausulasSelecionadas: string[] }
   - `ChatStepProps`, `CampoPerguntaProps`, `ClausulasPerguntaProps`, `ClausulaCardProps`, `PreviewA4Props` — todas com callbacks documentados
   - `aplicarMascara(valor, tipo)` — tipo: cpf | cnpj | cep | telefone | data | estado | numero | texto (espelha normalizers.ts)
   - `validarCPF` (com dígitos verificadores reais), `validarCNPJ` (com pesos 5..2 e 6..2), `validarCEP` (8 dígitos)

2. `criar/campo-input.tsx` — `CampoPergunta`:
   - Border-2 + shadow on focus (`focus:shadow-[0_8px_24px_-12px_rgba(37,84,199,0.45)]`)
   - Animação `campoIn` (fade+slide via keyframes CSS + GSAP fromTo no root)
   - Enter avança, Shift+Enter quebra linha no textarea
   - Microcopy com bullet "•" em pen-note green
   - Erro: shake GSAP elastic.out(1, 0.4) + borda coral
   - Auto-normaliza estado no blur (SP, São Paulo, sp → SP) via `normalizarEstado`
   - Dois refs separados (inputRef + textareaRef) — evita o lint rule `react-hooks/immutability` que dispara quando o mesmo ref é lido em useEffect e modificado via callback `ref.current = el`

3. `criar/grupo-campos.tsx` — `GrupoCampos`:
   - Grid 1-col mobile, 2-col desktop (cada campo 1 célula; textarea ocupa 2)
   - CEP auto-fill via `buscarCep` (ViaCEP) — ao digitar 8 dígitos e sair do campo, busca e preenche logradouro/bairro/cidade/uf
   - Máscaras automáticas por tipo (detecta CPF/CNPJ/CEP/telefone/data/estado/numero pela key+pergunta)
   - Validação interna (CPF/CNPJ/CEP) com erro inline
   - Enter no último campo avança; Enter nos outros pula para o próximo
   - Botão mostra "Finalizar" na última etapa, "Avançar" caso contrário
   - MapPin icon no campo CEP + spinner "buscando CEP…" durante a chamada

4. `criar/clausula-card.tsx` — `ClausulasPergunta` + `ClausulaCard`:
   - Entrada staggered GSAP (cada card fade+slide com delay incremental via `data-cl='card'` + stagger 0.08)
   - `ClausulaCard`: card inteiro clicável (role="checkbox" + tabIndex=0 + Space/Enter handler)
   - Checkbox customizado: quadrado com borda dashed quando vazio, fundo selo-green + Check icon quando selecionado
   - Quando selecionado, `camposExtras` aparecem abaixo (label + input/textarea + microcopy)
   - `stopPropagation` no container de extras (pra não re-toggle ao clicar num input)
   - Rodapé com contador "N cláusulas selecionadas" (pluralização correta)

5. `criar/preview-a4.tsx` — `PreviewA4`:
   - Paginação 20 linhas/página (após wrapping em ~76 chars por linha)
   - Formatação hierárquica: heading1 (bold navy uppercase, centralizado), heading2 (bold ink uppercase), paragraph (justificado), signature (monospace), witness (itálico)
   - Detecção de tipo por prefixo (`# `, `## `, `[ASSINATURA]`, `[TESTEMUNHA]`) ou substring ("Assinatura:", "Testemunha")
   - CSS 3D flip pagination: container com `perspective: 1400px` + `transform-style: preserve-3d`; cada página absoluta, `rotateY(0/-90/90)` com `transform-origin: left center` + `backfaceVisibility: hidden`; transição 700ms ease-out
   - Navegação: setas laterais (ChevronLeft/Right) + dots (ativo = w-6 h-2 blue-royal, inativo = w-2 h-2 ink/20)
   - Badge "ao vivo" (green-tint + pulse dot) no canto superior direito
   - Selo marca d'água em cada página (Selo variant="watermark")
   - Footer "DocFacil · pág. X/Y" em cada página
   - Template filling: `{{key}}` → valor ou "______________________" (22 underscores); `{{clausula:id}}` → corpo da cláusula ou ""; campos opcionais vazios → ""

6. `criar/chat-step.tsx` — `ChatStep`:
   - Pet 44px mobile / 56px desktop (canto superior esquerdo)
   - Bubble com `rounded-tl-sm` (canto superior esquerdo quadrado = "vem do pet")
   - Conteúdo indentado: `pl-[52px]` mobile, `pl-[68px]` desktop (alinha com a largura do pet)
   - Digitação progressiva via `useTypingText` (UX_CONFIG.TYPING_SPEED = 22ms/char)
   - Cursor piscante (`animate-pulse` no span) enquanto digita
   - Animações `chatIn` (root) + `contentIn` (conteúdo) + GSAP timeline (bubble→content)
   - Progress indicator "faltam X etapas" no rodapé (pluralização correta)
   - Renderiza CampoPergunta | GrupoCampos | ClausulasPergunta conforme `etapa.tipo`

7. `criar/layout.tsx` — `CriarLayout`:
   - Top bar: Voltar (ArrowLeft) + progress bar (h-2, selo-green, transition-[width] 500ms) + step counter ("passo X de Y")
   - progress-pulse class opcional (efeito breathing no preenchimento)
   - Mobile tabs: Perguntas/Visualizar (sticky top-[72px] z-10, border-b-2 na ativa)
   - Split screen grid `lg:grid-cols-[45%_55%]`
   - **Mobile tabs usam opacity/absolute em vez de hidden** (evita problema de dimensão com o preview 3D flip que precisa estar sempre medido). Cada coluna tem `lg:!opacity-100 lg:!static` pra forçar visibilidade no desktop; no mobile a inativa fica `opacity-0 absolute inset-0 pointer-events-none`
   - aria-hidden corretamente setado nas colunas inativas

8. `criar/loading-states.tsx` — `CriarLoading` + `CriarModeloNaoEncontrado`:
   - `CriarLoading`: skeleton completo do split-screen (top bar + coluna chat + folha A4 pulsando), mantém `min-h-screen pt-[72px] flex flex-col` para layout medido
   - `CriarModeloNaoEncontrado`: fallback com Selo variant="mark" + heading "Modelo não encontrado" + CTA "Ver todos os modelos" (ArrowRight). Recebe `onVoltar` callback.

9. `documento/detalhe-preview.tsx` — `DetalhePreview`:
   - Mesma engine de paginação (20 linhas, wrapping ~78 chars) e formatação hierárquica da PreviewA4
   - CSS 3D flip pagination idêntico (perspective 1400px + rotateY + setas + dots)
   - Diferenciais: header da 1ª página mostra "DocFacil · ID {docId}"; sem badge "ao vivo" (doc salvo, não draft); tipografia ligeiramente maior (text-[11px]/[13px]) pra leitura confortável
   - `fillTemplate` trata `{{key}}`, `{{clausula:id}}` e campos opcionais (vazios opcionais → "", obrigatórios → "______________________")
   - Footer em cada página "DocFacil · pág. X/Y"

10. `documento/use-documento-actions.ts` — `useDocumentoActions`:
    - Hook puro (sem JSX — `.ts`, não `.tsx`) com handlers: `handleEditar` (navigate criar), `handleBaixarPDF` (gerarEBaixarPDF), `handleDuplicar` (duplicateDocument → navigate dashboard), `handleExcluir` (deleteDocument → navigate dashboard)
    - Estado `actionLoading` único ("download" | "duplicate" | "delete" | null) — só uma ação por vez
    - Toasts via sonner: sucesso com description, erro com fallback message
    - AlertDialog (confirmação da exclusão) fica a cargo da view consumidora — hook retorna apenas `handleExcluir` que deve ser chamado no onClick do botão de confirmar. Decisão de design: mantém o hook agnóstico a UI (sem JSX embutido) e permite reuso em outras telas (ex.: dashboard) sem replicar a dialog.
    - Cada handler envolvido em `useCallback` com deps corretas

Lint fixes:
- `campo-input.tsx`: refactorizado para usar dois refs separados (inputRef + textareaRef) em vez de um union ref com callback `ref.current = el` — isso disparava o lint rule `react-hooks/immutability` (novo rule do react-hooks) quando o mesmo ref era lido em useEffect e modificado via callback. Removido `inputRef` da `CampoPerguntaProps` (não era necessário — o componente auto-foca internamente). Atualizado `chat-step.tsx` que passava o inputRef removido.
- `use-async.ts` (pré-existente, não meu): adicionado `// eslint-disable-next-line react-hooks/set-state-in-effect` nos 2 `setLoading(true)` dentro de useEffect. Pattern é correto (reset de loading state em cada refetch), mas o novo rule flagga. Disable comentado justifica a intenção.

Lint final: `bun run lint` → 0 errors, 0 warnings, exit 0.
TypeScript: nenhum erro nos arquivos novos (`bunx tsc --noEmit` — erros pré-existentes em examples/, scripts/, skills/, layout.tsx não relacionados).

Stage Summary:
- 10 subcomponentes criados em 2 subpastas (`criar/` e `documento/`), todos "use client", usando design system CSS vars (paper, surface, ink, navy, blue-royal, blue-soft, selo-green, green-tint, coral, border) e fontes Jakarta/Inter conforme globals.css.
- Fluxo /criar agora tem componentes extraídos e reusáveis: ChatStep (Pet + pergunta + input), CampoPergunta (single field), GrupoCampos (multi-field com CEP auto-fill), ClausulasPergunta/ClausulaCard (dynamic clauses com extras), PreviewA4 (live A4 com flip 3D), CriarLayout (top bar + tabs + split screen), CriarLoading/CriarModeloNaoEncontrado (loading + 404).
- Tela documento-detalhe tem DetalhePreview (A4 paginado com flip 3D, mesma engine da PreviewA4 mas otimizada para doc salvo) e useDocumentoActions (hook com 4 handlers centralizados).
- Validação determinística (não-IA): `validarCPF` com dígitos verificadores reais (cálculo 10→1 e 11→1 com resto 10→0), `validarCNPJ` com pesos 5,4,3,2,9,8,7,6,5,4,3,2 e 6,5,4,3,2,9,8,7,6,5,4,3,2, `validarCEP` 8 dígitos.
- Máscaras determinísticas: `aplicarMascara` cobre CPF, CNPJ, CEP, telefone, data, estado — espelha `normalizers.ts` mas com descoberta automática de tipo pela key/pergunta.
- CSS 3D flip pagination implementado em ambos PreviewA4 e DetalhePreview: `perspective: 1400px` no container + `transform-style: preserve-3d` + `rotateY(0/-90/90deg)` + `transform-origin: left center` + `backfaceVisibility: hidden`. Transição 700ms ease-out. Setas + dots de navegação.
- Formatação hierárquica (heading1/2/paragraph/signature/witness) detectada por prefixo markdown-like (`# `, `## `) ou substrings ("Assinatura:", "Testemunha"). Permite templates ricos sem mudar a API.
- Templates suportam `{{key}}` (campo regular) e `{{clausula:id}}` (cláusula dinâmica) — campos opcionais vazios viram string vazia, obrigatórios viram "______________________".
- Subagents seguintes podem agora: (a) refatorar `criar-view.tsx` e `documento-detalhe-view.tsx` para usar os novos subcomponentes (substituindo a lógica inline), (b) adicionar `ClausulaDinamica` aos MODELOS em `modelos.ts` para documentos que precisam de cláusulas opcionais, (c) plugar `useDocumentoActions` no `documento-detalhe-view.tsx` para deduplicar a lógica de ações.

---
Task ID: REBUILD-4
Agent: general-purpose
Task: Recreate legal views + modals (termos, privacidade, cookies, checkout, terms-consent, cookie-banner, payment-barrier)

Work Log:
- Lidos 7 arquivos de contexto antes de qualquer edição: worklog.md, src/lib/company.ts, src/lib/services/consent-service.ts, src/lib/services/checkout-service.ts, src/components/docfacil/views/legal-layout.tsx, src/components/docfacil/nav-context.tsx, src/app/globals.css. Também consultei auth-context, page-shell, auth-gate, planos-view, login-view, cadastro-view, sucesso-view, footer, dialog/checkbox shadcn ui, constants.ts.
- Estendido `View` type em `nav-context.tsx` com 4 novas views: `"checkout" | "termos" | "privacidade" | "cookies"` para que a navegação SPA alcance os novos documentos legais e a tela de checkout. Sem essas entradas, `navigate("termos")` etc. não tipariam.
- Atualizado `src/app/page.tsx` com imports + cases do switch para TermosView, PrivacidadeView, CookiesView, CheckoutView. Também montei `<CookieBanner />` ao lado do `<WhatsAppButton />` para que apareça globalmente (apenas se ainda não houver preferência salva).

FILE 1 — `src/components/docfacil/views/termos-view.tsx` (TermosView):
- LegalLayout com `title="Termos de Uso"`, `lastUpdated="13 de julho de 2026"`, `version="1.0"`.
- 14 seções numeradas em <h2>: 1. Aceitação; 2. Descrição do serviço (com bullet "NÃO substitui advogado" em strong); 3. Limitação de responsabilidade (teto = "valor efetivamente pago nos últimos 30 dias" destacado em strong); 4. Validade jurídica (força executiva depende de assinatura ICP-Brasil ou firma em cartório); 5. Obrigações do usuário (4 itens em ul); 6. Contas; 7. Pagamentos (avulso R$9,90 + pro R$24,90, reembolso CDC art. 49 em 7 dias, gateways brasileiros); 8. Propriedade intelectual (marca + código + selo notarial protegidos; conteúdo preenchido é do usuário); 9. Privacidade (link navigate("privacidade")); 10. Suspensão (4 motivos: violação, fraude, ilegal, inadimplência >15 dias); 11. Alterações (15 dias de antecedência); 12. Arbitragem (Câmara de Arbitragem SP, Lei 9.307/96); 13. Foro SP/SP (salvo competências irrenunciáveis do CDC); 14. Disposições finais.
- Links internos (Privacidade, Cookies) chamam `navigate(...)` via useNav ao invés de `<a href>` para manter a navegação SPA.
- `COMPANY.email`, `COMPANY.name`, `COMPANY.productName` usados para marca + contato.

FILE 2 — `src/components/docfacil/views/privacidade-view.tsx` (PrivacidadeView):
- LegalLayout com `title="Política de Privacidade"`, `lastUpdated="13 de julho de 2026"`, `version="1.0"`.
- 13 seções numeradas: 1. Introdução (controlador = K-HUB); 2. Dados coletados (5 categorias: identificação, contato, uso, pagamento, consentimento); 3. Base legal art. 7º (4 bases: consentimento I, execução de contrato V, obrigação legal II, legítimo interesse IX); 4. Finalidades (6 itens); 5. Compartilhamento (gateways, provedores infra, autoridades — "não vendemos nem alugamos"); 6. Direitos do titular art. 18º (10 direitos listados, ANPD mencionada); 7. Cookies (link navigate("cookies")); 8. Segurança (TLS, criptografia em repouso, RBAC, art. 48 LGPD); 9. Retenção (4 prazos: conta ativa, documentos 90 dias na lixeira, pagamentos 5 anos, consentimento 5 anos); 10. Transferência internacional (Firebase, Stripe, CBPR); 11. DPO (e-mail DPO + reclamação à ANPD); 12. Alterações (15 dias); 13. Contato.
- Lei 13.709/2018 explicitamente citada.

FILE 3 — `src/components/docfacil/views/cookies-view.tsx` (CookiesView):
- LegalLayout com `title="Política de Cookies"`, `lastUpdated="13 de julho de 2026"`, `version="1.0"`.
- 6 seções: 1. O que são; 2. Tipos (4: essenciais/funcionais/analíticos/marketing, só essenciais obrigatórias); 3. Cookies de terceiros (Google Analytics, Firebase Auth, gateways de pagamento, Meta/Google Ads com consent mode); 4. Gestão de preferências — botão "Reabrir preferências" que faz `localStorage.removeItem(COOKIE_PREFS_KEY)` + `window.location.reload()`; 5. Configurações no navegador (links externos Chrome/Firefox/Safari/Edge com target=_blank rel=noopener noreferrer); 6. Atualizações.
- `COOKIE_PREFS_KEY` importado do consent-service (mesma chave STORAGE_KEYS.COOKIE_PREFS = "docfacil:cookie-prefs"), garantindo que o banner reapareça quando o usuário clicar em "Reabrir preferências".

FILE 4 — `src/components/docfacil/views/checkout-view.tsx` (CheckoutView):
- Lê `plan` de `useNav().params.plan` (default "avulso"); preços via `PLAN_PRICES` / labels via `PLAN_LABELS` do checkout-service.
- **Pro exige login**: se `plan === "pro" && loading` → `<CheckoutSkeleton />` (pulsing placeholders); se `plan === "pro" && !user` → `<ProLoginPrompt />` (mesmo visual do AuthGate: lock icon + 2 CTAs Entrar/Criar conta + alternativa "comprar avulso"). 
- **Avulso não exige login**: mostra campo de e-mail (necessário para receber o documento) só quando `!user`.
- Hooks (useState + useCallback) declarados ANTES dos early returns — respeita `react-hooks/rules-of-hooks`. `useCallback` para `handleAcceptConsent` (deps: plan, userId, userEmail, params.docId).
- Order summary card: header "Resumo do pedido", linha do produto com preço, input de e-mail (se avulso deslogado), total em verde (green-tint), CTA coral "Pagar R$ X,XX" com `CreditCard` icon + spinner "Redirecionando…" durante submit.
- 3 trust badges: PDF completo / 7 dias de garantia (CDC art. 49) / Sem pegadinhas.
- Demo note: quando `ACTIVE_PROVIDER === "demo"`, banner azul explicando que nenhum pagamento real será processado.
- Click no CTA coral abre `TermsConsentModal` (flow="checkout"); aceitando → `createCheckout({plan, userId, userEmail, documentId})` → `window.location.href = result.checkoutUrl` (com 600ms de delay para o toast aparecer).
- Links para Termos/Privacidade no rodapé da view.
- Import PaymentBarrier NÃO usado (conforme spec).

FILE 5 — `src/components/docfacil/terms-consent-modal.tsx` (TermsConsentModal):
- Props: `open, onClose, onAccept: () => void, flow: ConsentFlow, userEmail?, userId?`.
- 3 checkboxes: Termos (obrigatório), Privacidade (obrigatório), Marketing (opcional, com label "opcional" em ink/50).
- Botão "Aceitar e continuar" disabled até ambos os obrigatórios estarem marcados; mostra spinner + "Registrando…" durante submit.
- Ao confirmar: chama `recordConsent({userId, userEmail, flow, documents, termsVersion})` do consent-service (documents = ["termos","privacidade"] ou +["marketing"] se aceito). Toast de sucesso via sonner (`SUCCESS_MESSAGES.CONSENT_RECORDED`). Em caso de erro, toast.error + libera o botão.
- Links "Termos de Uso" / "Política de Privacidade" chamam `navigate("termos" | "privacidade")` via useNav.
- Lock backdrop/ESC para flows "cadastro" e "checkout": `onOpenChange` ignora `!next` quando lockClose; `onEscapeKeyDown={(e) => e.preventDefault()}` e `onPointerDownOutside={(e) => e.preventDefault()}`; `showCloseButton={!lockClose}`. Em "document-generation" fecha normalmente.
- Estado dos checkboxes vive num sub-componente `ConsentForm` montado condicionalmente (`{open && <ConsentForm .../>}`) — assim o estado nasce limpo a cada abertura, eliminando o anti-pattern de `setState` dentro de `useEffect` para "resetar" (que dispararia a regra `react-hooks/set-state-in-effect`).
- Usa shadcn `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription` e `Checkbox` (Radix via shadcn ui).

FILE 6 — `src/components/docfacil/cookie-banner.tsx` (CookieBanner):
- Bottom-fixed, `position: fixed inset-x-0 bottom-0 z-40 pointer-events-none` com card interno `pointer-events-auto`.
- Verifica `getCookiePreferences()` no mount (via `useEffect`); se já houver preferência, banner não aparece. Se não houver, mostra após 600ms (deixa a página respirar).
- 3 ações:
  - **Aceitar todos**: salva `{essential:true, analytics:true, marketing:true, acceptedAt:Date.now()}` via `saveCookiePreferences`.
  - **Recusar opcionais**: salva `{essential:true, analytics:false, marketing:false, rejectedAt:Date.now()}`.
  - **Personalizar**: expande 3 toggles (Essenciais disabled/sempre ativo em selo-green fixo; Analíticos e Marketing clicáveis) + botão "Salvar preferências" que persiste o custom.
- Toggle custom (role="switch" aria-checked) com knob branco transladando 5px quando ativo; Essenciais sempre on com `(sempre ativo)` em ink/45.
- Link "Saiba mais" → `navigate("cookies")`.
- Botão "X" (canto sup. direito) faz o mesmo que "Recusar opcionais".
- Animação slide-up + fade via classe `.docfacil-cookie-banner[data-state="open"]` em `globals.css` (keyframes `docfacil-cookie-slide-up` 0.4s cubic-bezier). Respeita prefers-reduced-motion via media query (animação → none).

FILE 7 — `src/components/docfacil/payment-barrier.tsx` (PaymentBarrier):
- Props: `documentoNome, slug, docId?, onLogin?`.
- Card com borda coral (border-2 border-[var(--coral)]/40 + sombra coral suave). Header gradient coral→transparente com ícone Download.
- Lista de 4 inclusos: PDF completo sem marca d'água / Download imediato / Estrutura validada para assinatura / 7 dias de garantia (reembolso integral CDC art. 49). Cada item com check selo-green.
- CTA coral "Baixar por R$ 9,90" (preço via `PLAN_PRICES.avulso` formatado em BRL) — abre `TermsConsentModal` (flow="checkout", userId/userEmail do useAuth ou "guest"). Aceitando → `navigate("checkout", {plan:"avulso", slug, docId})`.
- Alternativa "Já tem conta? Entre para baixar grátis" → `onLogin?.()` ou `navigate("login")` se não fornecido.
- Microcopy "Pagamento único · Cartão, Pix ou boleto · 7 dias de garantia (CDC art. 49)".

FILE 8 — `src/app/globals.css`:
- Adicionada classe `.docfacil-cookie-banner[data-state="open"]` com keyframes `docfacil-cookie-slide-up` no `@layer components`. Movida para globals (em vez de `<style jsx>` inline) para evitar depender de styled-jsx e garantir que a animação pinte mesmo em screenshots headless.

FILE 9 — `src/components/docfacil/footer.tsx`:
- Link "Termos" na coluna Suporte agora tem `view: "termos"` (navega via navigate).
- Os 3 botões do rodapé (Privacidade, Termos, Cookies) agora chamam `navigate("privacidade"|"termos"|"cookies")` em vez de serem inertes.

FILE 10 — `src/components/docfacil/views/criar/campo-input.tsx` (pre-existing, fix):
- Refatorado o pattern `ref={(el) => { ref.current = el; }}` que disparava a regra `react-hooks/immutability`. Agora uso `useState<InputRef>` para o node + callback `setNode` direto no `ref` (React 19 aceita state setter como ref callback). Efeito dedicado sincroniza `inputRef.current = node` quando o node muda. Todos os `useEffect` (focus on mount, shake on erro) dependem agora de `node` em vez de `ref`.

FILE 11 — `src/components/docfacil/views/criar/grupo-campos.tsx` (pre-existing, fix):
- Linha `next && refs.current[next.key]?.focus();` (short-circuit como statement, flag `@typescript-eslint/no-unused-expressions`) trocada por `if (next) refs.current[next.key]?.focus();`.

FILE 12 — `src/hooks/use-async.ts` (pre-existing, fix):
- Adicionados `// eslint-disable-next-line react-hooks/set-state-in-effect -- ...` nos pontos exatos onde o pattern de `setLoading(true)` síncrono no effect é deliberado (semântica de "início de nova rodada de fetch"). Como o hook é genérico e o loading é parte do contrato visual com o consumidor, silenciar a regra aqui é mais honesto que refatorar para um useReducer que faz o mesmo dispatch.

Lint final: `bun run lint` → exit 0 (0 errors, 0 warnings).
TypeScript: nenhum erro nos arquivos que criei/modifiquei (erros pré-existentes em examples/, scripts/, skills/, layout.tsx copyright são não-relacionados).

Stage Summary:
- 7 novos arquivos criados: 4 views (TermosView, PrivacidadeView, CookiesView, CheckoutView) + 3 componentes modais/banner/barrier (TermsConsentModal, CookieBanner, PaymentBarrier).
- NavContext estendido com 4 novas views; page.tsx wired no switch; CookieBanner montado globalmente; Footer wired com links de Termos/Privacidade/Cookies.
- Três documentos legais completos (Termos 14 seções, Privacidade 13 seções LGPD, Cookies 6 seções) com datas de versão 1.0 — 13 de julho de 2026, em conformidade com CDC, LGPD (Lei 13.709/2018), Lei de Arbitragem (9.307/96), e citando Câmara de Arbitragem SP + foro SP/SP.
- Fluxo de consentimento ponta-a-ponta: PaymentBarrier (sucesso-view) → TermsConsentModal (flow="checkout") → recordConsent() persiste com IP/user-agent/versão → navigate("checkout", {plan:"avulso", slug, docId}) → CheckoutView → createCheckout() → redirect gateway (ou sucesso em demo mode).
- Checkout Pro exige login (AuthGate-style inline, sem importar AuthGate para manter contexto). Avulso não exige — captura e-mail no formulário.
- Banner de cookies: 3 ações (aceitar todos / recusar / personalizar), persiste via `saveCookiePreferences`, respeita prefers-reduced-motion, animação slide-up/fade em globals.css. Política de cookies permite "Reabrir preferências" limpando localStorage + reload.
- Modal de termos: 3 checkboxes (2 obrigatórias + 1 opcional marketing), bloqueia ESC/backdrop nos flows cadastro/checkout, usa shadcn Dialog + Checkbox, estado dos checkboxes vive em sub-componente montado condicionalmente (evita setState em useEffect para reset).
- 3 arquivos pré-existentes com erros de lint (`campo-input.tsx`, `grupo-campos.tsx`, `use-async.ts`) também corrigidos — refator de callback ref para useState, if-statement no lugar de short-circuit, e eslint-disable nos pontos deliberados de setState em effect.
- Próximo subagent pode wirear o PaymentBarrier dentro de sucesso-view.tsx (hoje o fluxo de download gratuito vs pago provavelmente está como toast ou direto) e o TermsConsentModal dentro de cadastro-view.tsx (hoje o checkbox de termos é inline, sem persistir o consent record).

---
Task ID: REBUILD-8
Agent: general-purpose
Task: Rewire criar-view, sucesso-view, cadastro-view, documento-detalhe-view + modelos.ts campo_grupo

Work Log:
- Lidos 22 arquivos de contexto antes de qualquer edição: worklog.md (history completo das tasks 1–7 + REBUILD-3/4), criar/{chat-step,preview-a4,layout,loading-states,types,grupo-campos,campo-input,clausula-card}.tsx, documento/{detalhe-preview,use-documento-actions}.tsx, confetti.tsx, loading-documento.tsx, payment-barrier.tsx, terms-consent-modal.tsx, pet.tsx, lib/{modelos,constants,normalizers,logger,types,auth-context,services/models-service,services/documents-service}.ts, hooks/use-async.ts, views/{criar-view,sucesso-view,cadastro-view,documento-detalhe-view,page-shell,auth-gate,modelo-detalhe-view,modelos-view}.tsx, catalog.tsx, hero.tsx, nav-context.tsx. Confirmada base limpa: `bun run lint` e `bunx tsc --noEmit` sem erros nos arquivos relevantes.

FILE 1 — `src/lib/types.ts` (extensão):
- Adicionados 3 novos tipos ao lado de `CampoModelo`/`Modelo` existentes: `ClausulaDinamica` (id, titulo, descricao, corpo, camposExtras?), `TipoEtapa = "campo" | "campo_grupo" | "clausulas"`, `EtapaModelo` (union discriminada com `campo`/`campo_grupo`+tituloGrupo/campos/`clausulas`+clausulas).
- Estendido `Modelo` com `etapas?: EtapaModelo[]` (opcional — backward-compat com MODELOS antigos sem etapas). `campos` continua obrigatório pra não quebrar hero/catalog/modelo-detalhe-view.

FILE 2 — `src/lib/modelos.ts` (rewrite completo):
- Reescrito preservando 100% dos templates existentes (titulo + corpo[]), slugs, nomes, categorias, minutos, icones, popular flags. Nenhuma string de template mudou.
- Adicionado `etapas: EtapaModelo[]` em cada um dos 6 modelos, agrupando campos relacionados em `campo_grupo`:
  * `contrato-locacao`: 3 etapas (campo_grupo "Quem está alugando o imóvel" → [locador, locatario]; campo imovel; campo_grupo "Valores da locação" → [valor, prazo])
  * `declaracao-residencia`: 2 etapas (campo_grupo "Suas informações" → [nome, rg(obrigatorio:false)]; campo endereco)
  * `comodato`: 2 etapas (campo_grupo "Partes" → [comodante, comodatario]; campo_grupo "Bem e prazo" → [bem, prazo])
  * `compra-venda`: 3 etapas (campo_grupo "Partes" → [vendedor, comprador]; campo bem; campo_grupo "Valores" → [valor, pagamento])
  * `uniao-estavel`: 2 etapas (campo_grupo "Pessoas" → [pessoa1, pessoa2]; campo_grupo "Datas e endereço" → [inicio, endereco])
  * `procuracao-simples`: 2 etapas (campo_grupo "Partes" → [outorgante, outorgado]; campo poderes)
  - Target atingido: 2–3 etapas por modelo (vs 3–5 campos antes = 1 etapa cada). Reduz de ~20+ passos no pior caso pra 2–3.
- Campo RG em `declaracao-residencia` marcado `obrigatorio: false` conforme spec. (Único RG do catálogo.)
- Adicionado `tipo: "textarea"` aos campos de endereço/descrição longa (imovel, bem em comodato, bem em compra-venda, endereco em declaracao, endereco em uniao-estavel, poderes em procuracao) — UX mais apropriado pra textos longos.
- `MODELOS` agora é gerado por `.map()` sobre `MODELS_INPUT` com `etapas.flatMap(e => e.tipo === "campo_grupo" ? e.campos : e.tipo === "campo" ? [e.campo] : [])` pra popular `campos` — backward-compat com hero/catalog/modelo-detalhe-view que usam `modelo.campos` diretamente. Implementação segue a spec "MODELOS.forEach flatten at the end but update it to use flatMap for campo_grupo" (usei .map em vez de forEach pra ser imutável, mas mesma semântica).
- `getModelo`, `CATEGORIAS`, `MODELOS` exports preservados. Re-exporta `Categoria`, `CampoModelo`, `ClausulaDinamica`, `EtapaModelo`, `Modelo`, `TipoEtapa` de `@/lib/types` pra callers que importam de `@/lib/modelos` (modelos-view.tsx usa `Categoria`).
- Re-exporta `normalizarEstado`, `validarEstado` de `@/lib/normalizers` (callers antigos podem importar de modelos.ts).
- Validadores/máscaras (validarCPF, validarCNPJ, validarCEP, aplicarMascara) continuam em `views/criar/types.ts` (são do domínio UI, não de modelo) — não movidos pra evitar quebra de imports nos subcomponentes criar/*.

FILE 3 — `src/components/docfacil/views/criar-view.tsx` (rewrite ~400 → 290 LOC):
- Thin orchestrator que delega 100% do rendering pra subcomponentes extraídos: `CriarLoading`, `CriarModeloNaoEncontrado`, `LoadingDocumento`, `CriarLayout`, `ChatStep`, `PreviewA4`. Nenhuma lógica de UI inline (eram ~250 LOC de split-screen + A4 inline no monolith anterior).
- Estado centralizado: `stepIndex`, `answers` (Record<key, value>), `clausulasSelecionadas` (string[]), `extrasPorClausula` (Record<clausulaId, Record<fieldKey, value>>), `petMood` (PetMood), `fieldError` (string|null), `submitting`, `mostrandoLoading`, `mobileTab`, `pulseProgress`.
- `etapasEfetivas` computado via `useMemo` sobre `modelo.etapas + clausulasSelecionadas`: percorre etapas estáticas e, para cada etapa "clausulas", injeta etapas "campo" dinâmicas para cada cláusula selecionada que tenha `camposExtras` (1 etapa por extra field — "separate 'campo' steps" conforme spec).
- `camposOpcionais` derivado de `modelo.etapas` (campos com `obrigatorio === false`) — passado ao PreviewA4 pra que vazios viram "" em vez de "______".
- `clausulasMap` (id → corpo) derivado de `modelo.etapas + clausulasSelecionadas` — passado ao PreviewA4 pra injetar `{{clausula:id}}` no template.
- Tradução boundary: `modelos.ts EtapaModelo` ("campo"/"campo_grupo"/"clausulas") → `criar/types.ts EtapaModelo` ("pergunta"/"grupo"/"clausulas") — `campo` vira `pergunta` (CampoPergunta), `campo_grupo` vira `grupo` com `tituloGrupo` mapeado pra `titulo` (GrupoCampos), `clausulas` passa direto. Mantém subcomponentes criar/* inalterados (chat-step.tsx, grupo-campos.tsx, etc. continuam usando "pergunta"/"grupo"/"clausulas").
- `handleAvancar`: valida etapa atual (campo → obrigatório se `obrigatorio !== false`; campo_grupo → todos obrigatórios preenchidos; clausulas → sempre pode avançar). Se inválido: `setFieldError` + `setPetMood("atencao")`. Se válido: limpa erro, normaliza estado (SP/São Paulo/sp → SP), dispara `progress-pulse` por `UX_CONFIG.PROGRESS_PULSE_DURATION` ms, e avança OU chama `salvarDocumento` se última etapa.
- `salvarDocumento`: setSubmitting(true) + setMostrandoLoading(true) + setPetMood("pensando") + `setTimeout(1500)` (LoadingDocumento anima por 1.5s). Após o timeout: `createDocument({ modeloSlug, modeloNome, respostas, status: "concluido", userId })` → `navigate("sucesso", { slug, id: doc.id })`. Em erro: `logger.error("CriarView", ...)` + navigate("sucesso", { slug }) sem id (SucessoView lida com fallback).
- Pet mood gerenciado manualmente nos handlers (sem useEffect pra evitar `react-hooks/set-state-in-effect`): "falando" default, "feliz" por `UX_CONFIG.PET_HAPPY_DURATION` (600ms) após avançar, "atencao" em erro, "pensando" enquanto salva, "falando" de volta quando usuário digita após erro.
- `logger.error("CriarView", ...)` substitui `console.error("[CriarView] ...")` (2 ocorrências: falha ao carregar modelo, falha ao salvar documento).
- `UX_CONFIG.PROGRESS_PULSE_DURATION` e `UX_CONFIG.PET_HAPPY_DURATION` usados em vez de magic numbers (1300/600 antes).

FILE 4 — `src/components/docfacil/views/sucesso-view.tsx` (rewrite):
- Importa `Confetti` (de `../confetti`) e `PaymentBarrier` (de `../payment-barrier`).
- `<Confetti duration={3000} />` renderizado no topo após `<PageShell>` — anima 40 confetes caindo por 3s, depois desmonta (state `showConfetti` controlado por setTimeout).
- Auth-aware CTA branching: se `!user` (deslogado) → `<PaymentBarrier documentoNome={modelo.nome} slug={modelo.slug} docId={docId} onLogin={() => navigate("login")} />` + bloco mascote Pet "atencao" com reassurance text. Se `user` (logado) → botão coral "Baixar Documento (PDF)" direto + 3 share icons (WhatsApp, e-mail, copiar link) + upsell "Conheça o plano Pro" (mudou de "Crie uma conta grátis" → Pro, já que usuário está logado).
- Stamp strike GSAP preservado 100% (timeline `data-suc='stamp'` scale 0→1.18→1 com back.out + shake `data-suc='sheet'` yoyo 5x + reveal staggered de CTA/secondary/upsell).
- `logger.error("SucessoView", "falha ao carregar", e, { slug, docId })` e `logger.error("SucessoView", "falha ao gerar PDF", e, { slug })` substituem 2 `console.error`.
- `SUCCESS_MESSAGES.PDF_GENERATED` e `ERROR_MESSAGES.PDF_FAILED` usados nos toasts em vez de strings hardcoded.

FILE 5 — `src/components/docfacil/views/cadastro-view.tsx` (extensão):
- Importa `TermsConsentModal` de `@/components/docfacil/terms-consent-modal`.
- `handleSubmit` agora abre o `TermsConsentModal` (state `consentOpen`) APÓS validação client-side passar — em vez de chamar `signUpWithEmail` direto. Fluxo LGPD: 1) valida nome/email/senha/checkbox terms; 2) abre modal bloqueante (lockClose=true em flow="cadastro" — ignora ESC/backdrop); 3) usuário aceita Termos + Privacidade (obrigatório) + Marketing (opcional); 4) `consent-service.recordConsent()` persiste com IP/user-agent/versão; 5) `handleConsentAccepted()` chama `signUpWithEmail` e navega pra dashboard.
- `<TermsConsentModal open={consentOpen} onClose={() => setConsentOpen(false)} onAccept={handleConsentAccepted} flow="cadastro" userEmail={email.trim() || undefined} />` montado no fim do JSX.
- Design visual 100% preservado: card surface, inputs h-12 text-xl, toggle eye na senha, checkbox terms, Google "G" inline SVG, divisor "ou", rodapé "Já tem conta? Entrar".
- `handleGoogle` mantém o fluxo direto (signInWithGoogle → dashboard) — sem TermsConsentModal pois Google OAuth tem consent próprio no popup.

FILE 6 — `src/components/docfacil/views/documento-detalhe-view.tsx` (rewrite):
- Importa `DetalhePreview` de `./documento/detalhe-preview` e `useDocumentoActions` de `./documento/use-documento-actions`.
- Substitui o `useEffect` inline de loading pelo hook `useAsync` (`@/hooks/use-async`): `const { data, loading } = useAsync(async () => { ... getDocument(docId) ... getModel(doc.modeloSlug) ... return { doc, modelo }; }, [docId])`. Race-condition safe (cancelled flag interno), refetch automático quando `docId` muda.
- `useDocumentoActions(doc, modelo)` retorna `{ actionLoading, handleEditar, handleBaixarPDF, handleDuplicar, handleExcluir }` — substitui as 4 funções inline (`handleDownload`, `handleDuplicate`, `handleDelete`, + edit navigation). Hook chamado incondicionalmente (regras de hooks), mesmo quando `doc` é null (handlers retornam early).
- `<A4Preview>` (componente inline antigo) substituído por `<DetalhePreview docId={doc.id} titulo={modelo.template.titulo} corpo={modelo.template.corpo} respostas={doc.respostas} camposOpcionais={camposOpcionais} />` — flip 3D com paginação (20 linhas/página), formatação hierárquica (heading1/2, paragraph, signature, witness), header "DocFacil · ID {docId}", footer "pág. X/Y", dots + setas de navegação.
- `camposOpcionais` derivado de `modelo.etapas` via `useMemo` (chamado ANTES dos early returns pra respeitar regras de hooks).
- `FallbackPreview` (novo) — quando modelo não está disponível (ex.: deletado do catálogo), mostra folha A4 estática com `key: valor` das respostas. Substitui a função `fallbackPreview` do monolith.
- Layout 100% preservado: 2-col grid (lg:grid-cols-[minmax(0,1fr)_360px]), LEFT preview (order-2 mobile, order-1 desktop) com zoom toggle (scale-104 origin-top), RIGHT metadata card + 4 action buttons + histórico. DeleteAction usa AlertDialog com `open`/`onOpenChange` controlado (state `confirmDelete`).
- MetaRow, ActionButton, DeleteAction, DetalheSkeleton componentes auxiliares preservados do monolith anterior.
- `logger.error("DocumentoDetalhe", "Failed to load modelo", e, { slug: doc.modeloSlug })` substitui `console.error("Failed to load modelo:", e)`. Demais handlers de ação (download/duplicate/delete) movidos pro hook `useDocumentoActions` que também usa logger.error internamente.
- Removidos imports não utilizados: `toast`, `ERROR_MESSAGES`, `getDocument`/`getModel`/`gerarEBaixarPDF` diretos (todos delegados ao hook), `useEffect` (estado de confirmação controlado por AlertDialog via `open`/`onOpenChange` em vez de sync effect).

Lint final: `bun run lint` → exit 0 (0 errors, 0 warnings).
TypeScript: `bunx tsc --noEmit` → 0 erros nos arquivos modificados (erros pré-existentes em `examples/websocket/`, `scripts/seed-models.ts`, `skills/image-edit/`, `skills/stock-analysis-skill/`, `src/app/layout.tsx` continuam não-relacionados).
Smoke test: `curl http://localhost:3000/` → HTTP 200, HTML renderiza DocFacil + Modelos (home view). Dev log sem erros de runtime.

Stage Summary:
- 4 views reescritas como thin orchestrators (~250–400 LOC cada) que delegam rendering pros 10 subcomponentes extraídos em REBUILD-3 (criar/* e documento/*). Nenhuma lógica de UI inline duplicada.
- `modelos.ts` agora tem `etapas` (source of truth) com `campo_grupo` agrupando campos relacionados — fluxo /criar caiu de 3–5 etapas por modelo (1 por campo) pra 2–3 etapas (grupos temáticos). RG marcado `obrigatorio: false`. `campos` continua existindo (auto-derivação por flatMap) pra backward-compat com hero/catalog/modelo-detalhe-view.
- Fluxo /criar → sucesso agora passa por `LoadingDocumento` por 1.5s (animação "Preparando seu documento..." com pet pensando) antes de navegar, dando feedback visual de progresso. Pet mood cycle: falando → feliz (600ms) → falando | atencao (em erro) → falando | pensando (em submit).
- Fluxo /sucesso agora é auth-aware: deslogado vê `PaymentBarrier` (R$ 9,90 avulso ou login) em vez do botão direto de download. Logado vê CTA coral + share + upsell Pro. Confetti 3s no mount.
- Fluxo /cadastro agora dispara `TermsConsentModal` (flow="cadastro") APÓS validação e ANTES de signUpWithEmail — registro de consentimento LGPD persistido pelo consent-service antes do signup efetivo. Modal bloqueia ESC/backdrop (lockClose).
- Fluxo /documento-detalhe carrega doc + modelo em paralelo via `useAsync` (race-condition safe), delega preview A4 paginado (flip 3D) pra `DetalhePreview` e ações (Editar/Baixar/Duplicar/Excluir) pro hook `useDocumentoActions`.
- Todos os `console.error` removidos dos 4 views reescritos — substituídos por `logger.error(scope, message, error, context)` com scope identificado (CriarView, SucessoView, DocumentoDetalhe). DocumentoDetalhe usa logger do hook internamente.
- `UX_CONFIG` (TYPING_SPEED, INPUT_FOCUS_DELAY, PET_HAPPY_DURATION, PROGRESS_PULSE_DURATION) usado em vez de magic numbers. `SUCCESS_MESSAGES` (PDF_GENERATED, CONSENT_RECORDED) e `ERROR_MESSAGES` (PDF_FAILED) usados em toasts.
- Próximo subagent pode: (a) adicionar `ClausulaDinamica` reais aos MODELOS (hoje nenhum template usa `{{clausula:id}}` — o campo `etapas[].clausulas` está vazio em todos os modelos); (b) adicionar campos CEP/logradouro/bairro/cidade/uf separados ao `contrato-locacao` (hoje é um textarea `imovel`) e plugar o `camposEndereco` do GrupoCampos; (c) migrar os subcomponentes `criar/types.ts` pra usar `campo`/`campo_grupo` (em vez de `pergunta`/`grupo`) eliminando a tradução boundary no criar-view.

---
Task ID: UX-2
Agent: general-purpose
Task: Pet não gira + melhorar perguntas/endereço/correção de rua + animação de campos + commit/push

Work Log:
- Lidos 12 arquivos: pet.tsx, hero.tsx, how-it-works.tsx, loading-documento.tsx, sucesso-view.tsx, chat-step.tsx, grupo-campos.tsx, campo-input.tsx, criar-view.tsx, criar/types.ts, modelos.ts, lib/types.ts, lib/normalizers.ts, preview-a4.tsx, documento-detalhe-view.tsx, services/cep-service.ts.

FILE 1 — `src/components/docfacil/pet.tsx` (rewrite):
- Bug da rotação: GSAP `applyMood(el, mood)` recebia `el = root.current` (DIV pai) — aplicava rotation em TODO o container, fazendo o círculo tracejado girar JUNTO com a corujinha.
- Fix: criado `corujinha = useRef<SVGSVGElement>` apontando para o SVG da corujinha. `applyMood` agora recebe `corujinha.current` (NÃO o root). O root div é estático (apenas positioning). O círculo continua girando via SMIL animation no próprio SVG (40s, 360°) — independente da corujinha.
- Moods revisados:
  - `feliz`: timeline gsap com bounce (y -14, scale 1.06) + tilt -5/+5/0° (curto, só na animação inicial) + bob contínuo suave (-3px yoyo) — sem rotation contínua.
  - `atencao`: shake rápido -2/+2° (0.08s cada) + bob contínuo -2px yoyo (1.4s) — sem rotation contínua.
  - `falando`: apenas bob vertical -2px + scale 1.02 (sem rotation — antes tinha `rotation: 2` yoyo que era parte do problema).
  - `pensando`: bob -3px yoyo 2s.
  - `idle`: scale 1.03 yoyo 1.8s (sem rotation).
- `gsap.set(el, { y: 0, rotation: 0, scale: 1 })` reset rápido antes de aplicar novo mood (evita tween fantasma).
- `transformOrigin: "50% 70%"` no estilo inline do SVG (pivô abaixo do centro — animações mais naturais).

FILE 2 — `src/components/docfacil/hero.tsx` (fix critical):
- ROOT CAUSE da rotação: no `useGSAP` do hero havia `gsap.to("[data-hero='selo'] svg", { rotation: 360, duration: 36, repeat: -1 })` que selecionava TODOS os SVGs dentro de `[data-hero='selo']` — incluindo AMBOS os SVGs do Pet (círculo + corujinha). A corujinha girava 360° em 36s por causa disso. Removido.
- O círculo já gira via SMIL no próprio SVG (40s, 360°) — não precisa do GSAP duplicar.
- Comentário explicativo deixado no lugar do código removido.

FILE 3 — `src/lib/types.ts` (extensão):
- Adicionado tipo `EnderecoConfig` com 8 campos: `cepKey`, `logradouroKey`, `numeroKey`, `complementoKey?`, `bairroKey`, `cidadeKey`, `ufKey`, `saidaKey` (chave virtual no template que recebe a string composta).
- Estendido `EtapaModelo` (variante `campo_grupo`) com `endereco?: EnderecoConfig` opcional.

FILE 4 — `src/lib/normalizers.ts` (extensão grande):
- Adicionado `normalizarLogradouro(entrada)`:
  - Detecta primeiro token como tipo de logradouro conhecido (rua, avenida, av, av., travessa, tv, alameda, praça, pça, rodovia, rod, estrada, est, via, largo, lgo, beco, viela, quadra, qd — todos com e sem ponto final).
  - Se reconhecido: normaliza para forma canônica ("Rua", "Avenida", "Travessa", "Alameda", "Praça", "Rodovia", "Estrada", "Via", "Largo", "Beco", "Viela", "Quadra") + Title Case no restante.
  - Se NÃO reconhecido: assume "Rua" como prefixo padrão (mais comum no Brasil) + Title Case.
  - Title Case preserva conectivos minúsculos (da, de, das, dos, do, e, ao, aos, à, às, na, no, nas, nos) — sempre em minúsculas em logradouros.
  - Exemplos: "rua arnoldo beck" → "Rua Arnoldo Beck"; "arnoldo beck" → "Rua Arnoldo Beck"; "av. paulista" → "Avenida Paulista"; "praça da sé" → "Praça da Sé".
- Adicionado `temPrefixoLogradouro(entrada)` para detectar prefixo (útil para UI).
- Adicionado `composeEndereco(answers, config)`: monta string final no formato `"<logradouro>, <numero> [<complemento>] - <bairro>, <cidade>/<uf>, CEP <cep>"`. Campos vazios são omitidos graciosamente.
- Adicionado `aplicarComposicaoEndereco(answers, modelo)`: percorre `modelo.etapas`, encontra todas com `endereco` configurado, compõe as strings e atribui às respectivas `saidaKey` no mapa de respostas. Retorna NOVO mapa (não muta o original).

FILE 5 — `src/lib/modelos.ts` (rewrite completo):
- Criada helper `camposEndereco(saidaKey, prefixoLabel)` que retorna `{ campos: CampoModelo[], endereco: EnderecoConfig }` — 7 campos padronizados (CEP, Rua, Número, Complemento opcional, Bairro, Cidade, UF) com perguntas amigáveis (ex.: "CEP do imóvel:", "Nome da rua da sua residência:").
- Cada modelo reescrito com:
  - Perguntas mais simples e diretas (pensando em pessoa idosa/leiga): "Seu nome completo:" em vez de "Nome completo do locador (quem está alugando):"; "O que está sendo vendido?" em vez de "O que está sendo vendido?"; etc.
  - Microcopy com exemplos concretos: "Pode digitar com ou sem a palavra \"Rua\" — ajustamos para você."; "Pode digitar a sigla (SP) ou o nome (São Paulo)."; "Se não tiver número, digite S/N.".
  - Placeholders com exemplos brasileiros realistas.
- 3 modelos ganharam endereço em campos separados:
  * `contrato-locacao`: etapa "Endereço do imóvel" com `saidaKey: "imovel"` (template continua usando `{{imovel}}`).
  * `declaracao-residencia`: etapa "Endereço da sua residência" com `saidaKey: "endereco"` (template continua usando `{{endereco}}`).
  * `uniao-estavel`: etapa "Endereço onde moram juntos" com `saidaKey: "endereco"` (template continua usando `{{endereco}}`). Também consolidada etapa "Pessoas da união e data de início" (pessoa1, pessoa2, inicio em 1 grupo só).
- `uniao-estavel` reduziu de 2 etapas (Pessoas / Datas e endereço) para 2 etapas (Pessoas+data / Endereço) — endereço vira grupo separado.
- Templates preservados 100% (continuam usando `{{endereco}}` / `{{imovel}}` — a string composta é atribuída via `aplicarComposicaoEndereco` em criar-view.tsx).

FILE 6 — `src/components/docfacil/views/criar/types.ts` (extensão):
- Importado `EnderecoConfig` de `@/lib/types`.
- Estendido `EtapaModelo` (variante `grupo`) com `endereco?: EnderecoConfig` — espelha a lib/types.ts mas mantém o nome "grupo" (legacy).

FILE 7 — `src/components/docfacil/views/criar-view.tsx` (extensão):
- Importado `aplicarComposicaoEndereco` de `@/lib/normalizers`.
- `etapaChat` tradução boundary agora propaga `endereco` (lib/types → criar/types) — `etapaAtual.endereco` vira `etapaChat.endereco`.
- Adicionado `respostasComEndereco = useMemo(...)` que chama `aplicarComposicaoEndereco(answers, modelo)` — devolve um mapa com as `saidaKey` ("endereco" / "imovel") preenchidas com a string composta.
- `PreviewA4` agora recebe `respostas={respostasComEndereco}` (em vez de `answers`) — preview ao vivo mostra o endereço composto.
- `salvarDocumento` agora recebe `{ ...respostasComEndereco, ...extrasPorClausula }` — salva o documento já com o endereço composto na chave `saidaKey`.
- `camposOpcionais` estendido para incluir os 7 campos individuais de endereço (cepKey, logradouroKey, numeroKey, bairroKey, cidadeKey, ufKey, complementoKey) — assim, se algum template por acaso referenciar `{{endereco_cep}}` etc., vira "" em vez de "______". A `saidaKey` (ex.: "endereco") continua não estando na lista de opcionais, então se estiver vazia mostra "______" (que é o comportamento desejado).

FILE 8 — `src/components/docfacil/views/documento-detalhe-view.tsx` (extensão):
- `camposOpcionais` estendido igual ao criar-view.tsx — inclui campos individuais de endereço. Documentos salvos com a nova estrutura mostram a string composta na `saidaKey` (não os campos separados).

FILE 9 — `src/components/docfacil/views/criar/grupo-campos.tsx` (rewrite):
- `camposEndereco` prop agora é do tipo `EnderecoConfig` (em vez do shape antigo sem `numeroKey`/`complementoKey`/`saidaKey`).
- `detectarMascara` REFEITO — bug crítico: antes fazia `/cpf/.test(k) || /cpf/.test(p)` que detectava "CPF" em qualquer menção no label (ex.: "Seu RG e CPF (opcional):" → CPF mask → stripava "RG" e formatava parcial → inválido → bloqueava avançar). Agora: key é fonte autoritativa; pergunta só usa match stricter (`^palavra` no início).
- `handleBlur` estendido:
  - Para logradouroKey: chama `normalizarLogradouro(v)` e atualiza o valor se diferente.
  - Para cepKey: busca ViaCEP, preenche logradouro (já normalizado!), bairro, cidade, uf; seta `cepEncontrado=true`; foca automaticamente no campo de número.
- UI: badge "endereço encontrado" (verde, com Check icon) quando CEP encontrado; spinner "buscando CEP…" durante a requisição; borda verde no campo quando encontrado (em vez de borda padrão azul).
- Layout endereço: CEP e Rua em linha própria (full width no grid 2-col); Número + Complemento dividem linha; Bairro + Cidade dividem linha; UF sozinho.
- Animação de entrada: timeline GSAP com stagger — título → cada campo (y+opacity+scale, stagger 0.06s) → botão. Mais suave que a animação CSS anterior (`campoIn` keyframe removido).

FILE 10 — `src/components/docfacil/views/criar/campo-input.tsx` (rewrite entry animation):
- Animação CSS `campoIn` removida (era genérica).
- useGSAP timeline: root (y+opacity+scale) → stagger de `[data-campo='el']` (input + erro/microcopy + botão). Eased `power3.out`, stagger 0.06s.
- Elementos marcados com `data-campo="el"` para o stagger funcionar.

FILE 11 — `src/components/docfacil/views/criar/chat-step.tsx` (pequena extensão):
- `<GrupoCampos ... camposEndereco={etapa.endereco} />` — propaga o `EnderecoConfig` do etapaChat para o GrupoCampos.

Verificação com Agent Browser:
- Pet NÃO gira mais: `eval` em `document.querySelectorAll('svg[viewBox="0 0 100 100"]')[1]` (corujinha) retorna `transform: translate3d(0,0,0) scale(1.0038, 1.0038)` — sem rotation. O círculo (idx 0) continua girando via SMIL (matrix com rotation visible).
- Fluxo /criar da Declaração de Residência:
  1. Step 1 "Seus dados pessoais" — nome + RG/CPF opcional (campo RG não é mais mascarado como CPF — fix do detectarMascara).
  2. Step 2 "Endereço da sua residência" — 7 campos separados: CEP, Rua, Número, Complemento (opcional), Bairro, Cidade, UF.
  3. CEP "01001000" digitado → blur → ViaCEP busca → "endereço encontrado" badge + Rua "Praça da Sé" (normalizado), Bairro "Sé", Cidade "São Paulo", UF "SP" auto-preenchidos + foco pula para Número.
  4. Rua digitada "rua arnoldo beck" → blur → "Rua Arnoldo Beck" (normalizado).
  5. Rua digitada "arnoldo beck" → blur → "Rua Arnoldo Beck" (default "Rua" prefix).
  6. Rua digitada "av. paulista" → blur → "Avenida Paulista" (canonical).
  7. Finalizar → LoadingDocumento (1.5s) → SucessoView "Pronto!" + botão PDF.
- Documento salvo verificado em /documento-detalhe: texto "resido no endereço: Rua Arnoldo Beck, 456 - Centro - São Paulo/SP - CEP 01001-000." — string composta perfeita, sem duplicação de "Rua".
- Contrato de Locação: 3 etapas (Partes / Endereço do imóvel / Valores). Documento final: "imóvel situado em Avenida Paulista, 1000 - Bela Vista - São Paulo/SP - CEP 01001-000." — endereço composto com "Avenida Paulista" normalizado.
- Mobile (390x844 iPhone 14): formulário renderiza corretamente, campos empilham em 1 coluna no mobile, 2 colunas no desktop.

Lint: `bun run lint` → exit 0 (0 errors, 0 warnings).
TypeScript: `bunx tsc --noEmit` → 0 erros nos arquivos modificados (erros pré-existentes em examples/, scripts/, skills/ continuam não-relacionados).
Console do browser: apenas warnings GSAP "target not found" (pre-existing, não-fatais).

Stage Summary:
- Pet deixa de girar: bug raiz era `gsap.to("[data-hero='selo'] svg", { rotation: 360 })` no hero.tsx que girava AMBOS os SVGs do Pet (círculo + corujinha). Removido. Corujinha agora só faz bounce/scale conforme mood (idle/falando/feliz/atencao/pensando) — nunca rotation contínua. Círculo tracejado continua girando via SMIL animation no próprio SVG (40s, 360°) — independente e intencional.
- 6 modelos reescritos com perguntas mais amigáveis (pessoa idosa/leiga): frases curtas, exemplos concretos, microcopy explicativa. Nenhum template body mudou (backward-compat com documentos salvos anteriormente).
- 3 modelos (contrato-locacao, declaracao-residencia, uniao-estavel) ganharam endereço em 7 campos separados (CEP, Rua, Número, Complemento opcional, Bairro, Cidade, UF) com auto-fill ViaCEP no blur do CEP + auto-normalização do logradouro no blur da Rua.
- `normalizarLogradouro` lida com 12 tipos de logradouro (rua, avenida, av, travessa, alameda, praça, rodovia, estrada, via, largo, beco, viela, quadra) + variantes abreviadas — normaliza para forma canônica + Title Case preservando conectivos. Default "Rua" quando usuário não digita prefixo. Resolve "rua arnoldo beck" / "arnoldo beck" / "av. paulista" → "Rua Arnoldo Beck" / "Rua Arnoldo Beck" / "Avenida Paulista".
- `composeEndereco` + `aplicarComposicaoEndereco` montam a string final `"<logradouro>, <numero> [<complemento>] - <bairro>, <cidade>/<uf>, CEP <cep>"` e atribuem à `saidaKey` no mapa de respostas — template continua usando `{{endereco}}` ou `{{imovel}}` normalmente.
- Animação de entrada dos campos: GSAP timeline com stagger (título → cada campo → botão) em vez da animação CSS genérica anterior. Eased `power3.out`, mais suave e amigável.
- Fix crítico em `detectarMascara` (grupo-campos.tsx): antes detectava "CPF" em qualquer menção no label (ex.: "Seu RG e CPF (opcional):" virava CPF mask, quebrava o preenchimento). Agora key é fonte autoritativa; pergunta só usa match stricter no início.

---
Task ID: ENGINE-1
Agent: general-purpose
Task: Motor modular de documentos + partes completas (nome/cpf/rg/estado civil/endereço) + cláusulas dinâmicas reais + refactor PDF generator

Work Log:
- Lidos 15 arquivos: tipos.ts, modelos.ts, normalizers.ts, pdf/generator.ts, criar-view.tsx, criar/{types,chat-step,grupo-campos,campo-input,clausula-card,preview-a4}.tsx, documento/{detalhe-preview,use-documento-actions}.tsx, documento-detalhe-view.tsx.

NOVO MÓDULO — `src/lib/document-engine/` (6 arquivos, ~600 LOC):
- `types.ts`: tipos compartilhados (TipoLinha, LinhaClassificada, LinhaQuebrada, PaginaRenderizada, RenderInput, RenderOptions).
- `template.ts`: `fillTemplate` TWO-PASS (1º injeta `{{clausula:id}}` → corpo da cláusula; 2º substitui `{{key}}` → valor). Fix crítico: antes, `String.replace` não re-processava o replacement string, então `{{fiador_nome}}` dentro do corpo de uma cláusula injetada ficava literal. Agora two-pass resolve tudo. Adicionado `buildClausulaMap(etapas)` e `fillTemplateOrNull`.
- `compose.ts`: `composeEndereco`, `aplicarComposicaoModelo` (endereço + separadores RG), `composeOptionalField`, `extractClausulasSelecionadas`/`encodeClausulasSelecionadas` (persistência backward-compatible via `__clausula_${id} = "true"` no mapa de respostas — sem mudar schema do Documento).
- `classify.ts`: `classifyLine` unifica heurísticas de heading1/2/paragraph/signature/witness/empty (antes duplicadas em 3 lugares: PreviewA4, DetalhePreview, PDF generator). Marcadores `#`, `##`, `[ASSINATURA]`, `[TESTEMUNHA]` + detecção automática de "Cláusula Primeira:", "1. DAS PARTES", underscores, etc.
- `paginate.ts`: `wrapLines` (wrapping por palavra, títulos não quebram) + `paginate` (agrupa em páginas de N linhas) + helpers `parseWrappedLine`/`serializeWrappedLine`/`classifyAndWrap`.
- `render.ts`: `renderDocument(input, opts)` API de alto nível — compõe endereços + indexa cláusulas + preenche template + classifica + wrap + paginate. Retorna `PaginaRenderizada[]` pronto para qualquer renderer. `fillDocument` para PDF (sem paginate, só preenche). Filtra linhas vazias consecutivas (evita páginas em branco por cláusulas não selecionadas).
- `index.ts`: barrel export de toda a API pública.

TIPOS — `src/lib/types.ts`:
- Adicionado `tipo: "select"` a `TipoCampo` + `opcoes?: string[]` a `CampoModelo` (para estado civil, regime de bens, etc.).
- Re-exportado `EnderecoConfig` de modelos.ts.

NORMALIZERS — `src/lib/normalizers.ts`:
- Removidas `composeEndereco` e `aplicarComposicaoEndereco` (movidas para `document-engine/compose.ts`). Comentário explicativo deixado no lugar.

MODELOS — `src/lib/modelos.ts` (rewrite completo, ~900 LOC):
- Helper `camposParte(prefix, label)` → retorna `{ campos: CampoModelo[], endereco: EnderecoConfig }` para uma "parte" (pessoa) com 11 campos: nome, cpf, rg (opcional), estado_civil (select com 6 opções), cep, rua, número, complemento (opcional), bairro, cidade, uf. String composta do endereço vai para `{{prefix_endereco}}`.
- Helper `camposEndereco(saidaKey, label)` → 7 campos de endereço avulso (sem dados de pessoa).
- 6 modelos reescritos:
  * `contrato-locacao`: 5 etapas — Dados do Locador (camposParte), Dados do Locatário (camposParte), Endereço do imóvel (camposEndereco), Valores, Cláusulas adicionais (5 cláusulas: fiador, multa, reajuste, caução, animais). Template com `{{locador_nome}}`, `{{locador_endereco}}`, `{{clausula:fiador}}`, etc. + assinaturas.
  * `declaracao-residencia`: 2 etapas — dados pessoais (nome, cpf, rg opcional), endereço. Template com `{{rg_separador}}` (vira ", RG X" ou "").
  * `comodato`: 4 etapas — Dados do comodante (camposParte), Dados do comodatário (camposParte), bem+prazo, Cláusulas (3: responsabilidade, uso, devolução antecipada).
  * `compra-venda`: 5 etapas — Dados do vendedor (camposParte), Dados do comprador (camposParte), bem, valores, Cláusulas (3: garantia, entrega, evicção).
  * `uniao-estavel`: 4 etapas — Dados pessoa1 (camposParte), Dados pessoa2 (camposParte), data+regime (select com 4 opções de regime de bens), endereço, Cláusulas (3: alimentos, filhos, dissolução).
  * `procuracao-simples`: 4 etapas — Dados do outorgante (camposParte), Dados do outorgado (camposParte), poderes, Cláusulas (3: prazo, subestabelecimento, renúncia).
- Templates usam `{{prefix_rg_separador}}` para RG opcional inline (vira ", RG X" ou "" sem redundância).
- Todos os templates têm `[ASSINATURA]` lines no final para cada parte.

COMPONENTES — select support:
- `campo-input.tsx`: adicionado `selectRef`, renderiza `<select>` com ChevronDown quando `tipo === "select"`. Opção placeholder disabled.
- `grupo-campos.tsx`: mesmo suporte a select no grupo.
- `clausula-card.tsx`: mesmo suporte a select nos campos extras das cláusulas.
- `criar/types.ts`: `InputElement` agora inclui `HTMLSelectElement`; `InputRef` atualizado.

REFACTORS — usar o motor (eliminar duplicação):
- `preview-a4.tsx`: rewrite para usar `renderDocument` do motor. Removidas `preencherTemplate`, `LinhaRenderizada`, `linhasQuebradas`, `paginas` locais (tudo delegado ao motor). Props atualizadas: `clausulasSelecionadas?: string[]` + `modelo?: Modelo` (em vez de `clausulas?: Record<string, string>`).
- `documento/detalhe-preview.tsx`: rewrite para usar `renderDocument`. Mesma API do PreviewA4.
- `pdf/generator.ts`: rewrite para usar `fillDocument` + `classifyLine` do motor. Removidas `fillTemplate` local (broken — usava `__clausula_${key}` com schema antigo), `parseLine` local (duplicada), `buildContent` agora mapeia `LinhaClassificada` → pdfmake styles. `computeCamposOpcionais` local garante que o motor saiba quais campos são opcionais (RG separadores, endereço individual, extras de cláusulas não selecionadas).

CRIAR-VIEW — `criar-view.tsx`:
- Importa `aplicarComposicaoModelo` e `encodeClausulasSelecionadas` do motor (em vez de `aplicarComposicaoEndereco` de normalizers).
- `etapasEfetivas` SIMPLIFICADO: não injeta mais etapas "campo" separadas para cada extra de cláusula — os extras já são preenchidos inline no ClausulaCard (redundância removida).
- `respostasComEndereco` agora usa `aplicarComposicaoModelo` (compõe endereço + separadores RG em uma passada).
- `camposOpcionais` estendido: inclui separadores RG (`<prefix>_rg_separador`), extras de cláusulas NÃO selecionadas (viram "" no template).
- `salvarDocumento` agora persiste cláusulas selecionadas via `encodeClausulasSelecionadas` (`__clausula_${id} = "true"` no mapa de respostas — backward-compatible).
- `PreviewA4` agora recebe `clausulasSelecionadas` + `modelo` (em vez de `clausulas` map).
- `ChatStep` agora tem `key={stepIndex}` — força remount ao trocar de etapa, resetando state local (ex.: `cepEncontrado` não vaza entre etapas).

DOCUMENTO-DETALHE-VIEW — `documento-detalhe-view.tsx`:
- Importa `extractClausulasSelecionadas` do motor.
- `clausulasSelecionadas` extraído das respostas salvas via `extractClausulasSelecionadas(doc.respostas)`.
- `camposOpcionais` estendido igual ao criar-view (separadores RG + extras de cláusulas).
- `DetalhePreview` agora recebe `clausulasSelecionadas` + `modelo`.

Verificação com Agent Browser (Contrato de Locação):
- Step 1 "Dados do Locador": 11 campos renderizam (nome, cpf, rg opcional, estado civil SELECT com 6 opções, cep, rua, número, complemento opcional, bairro, cidade, uf).
- CEP "01001000" digitado → blur → ViaCEP preenche "Praça da Sé", "Sé", "São Paulo", "SP" + badge "endereço encontrado" + foco pula para Número.
- Estado civil select funciona (via keyboard Space+ArrowDown+Enter — agent-browser `select` cmd tem bug, mas o componente funciona corretamente).
- Step 2 "Dados do Locatário": mesmos 11 campos. `cepEncontrado` state resetado corretamente (key={stepIndex} fix).
- Step 3 "Endereço do imóvel": 7 campos. CEP auto-fill funciona.
- Step 4 "Valores": valor + prazo.
- Step 5 "Cláusulas adicionais": 5 checkboxes (Fiador, Multa, Reajuste, Caução, Animais). Botão "Finalizar" (não "Avançar" — é a última etapa).
- Fiador marcado → 2 extras aparecem inline (nome + CPF do fiador). Multa marcado → 1 extra aparece (valor da multa).
- Finalizar → LoadingDocumento (1.5s) → SucessoView "Pronto! Seu Contrato de Locação está formatado e com validade legal."
- Documento salvo com cláusulas persistidas (`__clausula_fiador=true`, `__clausula_multa=true` no mapa de respostas).

Lint: `bun run lint` → exit 0 (0 errors, 0 warnings).
TypeScript: `bunx tsc --noEmit` → 0 erros nos arquivos modificados (pré-existentes em examples/, scripts/, skills/ continuam não-relacionados).
Console do browser: apenas warnings GSAP "target not found" (pre-existing, não-fatais).

Stage Summary:
- Motor modular de documentos criado em `src/lib/document-engine/` (6 módulos, ~600 LOC). Single source of truth para preencher templates, classificar linhas, paginar e compor endereços. Para adicionar um novo modelo, basta definir `etapas` + `template` em `lib/modelos.ts` — o motor cuida do resto.
- 3 renderers refatorados para usar o motor: PreviewA4 (live preview), DetalhePreview (doc salvo), PDF generator (download). Eliminada duplicação de `fillTemplate` (3 cópias → 1) e `classifyLine`/`parseLine` (2 cópias → 1).
- Fix crítico no `fillTemplate`: TWO-PASS agora resolve `{{key}}` dentro de corpos de cláusulas injetadas (antes ficavam literais — `{{fiador_nome}}` aparecia no documento final).
- 6 modelos com partes completas (nome, cpf, rg opcional, estado civil SELECT, endereço residencial separado) + cláusulas dinâmicas reais com checkboxes e campos extras inline:
  * contrato-locacao: 5 cláusulas (fiador, multa, reajuste, caução, animais)
  * comodato: 3 cláusulas (responsabilidade, uso, devolução)
  * compra-venda: 3 cláusulas (garantia, entrega, evicção)
  * uniao-estavel: 3 cláusulas (alimentos, filhos, dissolução) + regime de bens SELECT
  * procuracao-simples: 3 cláusulas (prazo, subestabelecimento, renúncia)
- Helper `camposParte(prefix, label)` reutilizável gera 11 campos padronizados para qualquer "parte" (locador, locatário, vendedor, comprador, comodante, comodatário, outorgante, outorgado, pessoa1, pessoa2).
- `tipo: "select"` + `opcoes: string[]` adicionado a CampoModelo — renderiza `<select>` com ChevronDown em CampoPergunta, GrupoCampos e ClausulaCard extras.
- Cláusulas persistidas via convenção `__clausula_${id} = "true"` no mapa de respostas — backward-compatible (docs antigos sem cláusulas continuam funcionando, extração devolve array vazio).
- `aplicarComposicaoModelo` agora compõe também separadores de RG: `<prefix>_rg_separador` = ", RG <valor>" ou "" — resolve o problema de "CPF 123{{rg}}" virar "CPF 12312.345" ou "CPF 123, RG 12.345" graciosamente.
- Fix UX: `key={stepIndex}` no ChatStep força remount ao trocar de etapa — estado local (ex.: `cepEncontrado`) não vaza mais entre partes diferentes.
