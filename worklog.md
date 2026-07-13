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
