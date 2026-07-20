<div align="center">
 
<img src="public/logo.svg" alt="DocFacil" width="280" />
 
**Documentos legais prontos como numa simples conversa.**
 
Plataforma SaaS de geração de documentos legais para o público leigo brasileiro.
Sem juridiquês, sem fricção — o assistente conversacional guia o preenchimento
e o PDF sai formatado, profissional e pronto para uso.
 
[![CI](https://github.com/Kauerc10/docfacil/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Kauerc10/docfacil/actions/workflows/ci.yml)
[![Release](https://img.shields.io/badge/release-v1.0.0-blue?style=flat-square&logo=github)](https://github.com/Kauerc10/docfacil/releases)
[![License](https://img.shields.io/badge/license-proprietary-%23ff6a4d?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-5-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/next.js-16-black?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![Bun](https://img.shields.io/badge/bun-1.3-%23fbf0df?style=flat-square&logo=bun)](https://bun.sh/)
 
Produto da **[K-HUB Soluções Digitais](https://khub.com.br)**
 
</div>
 
---
 
## ✨ Visão geral
 
O DocFacil nasceu da frustração de quem precisa de um contrato simples e
acaba preso em modelos genéricos do Google, advogados caros ou plataformas
complicadas. A proposta é outra:
 
- 🦉 **Chat conversacional** — responde perguntas como uma pessoa, não como um formulário
- 📄 **Preview ao vivo** — vê o documento sendo montado enquanto responde
- 🖨️ **PDF premium** — tipografia profissional, hierarquia visual, citações legais formatadas
- 🔒 **LGPD compliant** — consentimento com hash SHA-256, DPO, portabilidade
- 💬 **Humano quando precisa** — WhatsApp real como diferencial de marca
 
O público-alvo inclui pessoas com pouca intimidade com tecnologia. A UI é
**óbvia antes de ser bonita** — mas com identidade própria (metáfora do selo
notarial carimbado, textura de papel, corujinha mascote).
 
---
 
## 🛠️ Stack técnica
 
| Camada | Tecnologia | Observação |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) | App Router, roteamento híbrido SSR + SPA |
| **Linguagem** | [TypeScript 5](https://www.typescriptlang.org/) | Strict mode em todo o projeto |
| **Estilo** | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) | Design system custom, New York variant |
| **Animações** | [GSAP 3](https://gsap.com/) + @gsap/react | ScrollTrigger, mood animations |
| **PDF** | [pdfmake 0.3](https://pdfmake.github.io/) | 7 módulos, tipografia legal, carimbo |
| **Auth + DB** | [Firebase](https://firebase.google.com/) (Auth + Firestore) | Fallback demo via localStorage |
| **IA** | Provider-agnostic | Interface swapável (OpenAI / Gemini / Anthropic) |
| **CEP** | [ViaCEP API](https://viacep.com.br/) | Auto-fill de endereços |
| **Pagamentos** | Stripe (preparado) | Checkout service, webhook ready |
| **Package Manager** | [Bun 1.3](https://bun.sh/) | Instalação + scripts |
 
---
 
## 📁 Estrutura do projeto
 
```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Layout raiz (fontes, meta, Toaster)
│   ├── page.tsx                      # Router SPA (NavProvider → views)
│   ├── globals.css                   # Design system tokens + utilities
│   ├── robots.ts / sitemap.ts        # SEO crawling
│   ├── api/                          # API routes (IA, consentimento)
│   └── (marketing)/                  # Rotas SSR crawláveis (termos, privacidade…)
│
├── components/
│   ├── docfacil/                     # 🎨 Componentes de marca
│   │   ├── pet.tsx                   #   Mascote corujinha "Selo"
│   │   ├── selo.tsx                  #   Carimbo notarial (3 variantes)
│   │   ├── logo.tsx                  #   Wordmark D + "ocFacil"
│   │   ├── header.tsx / footer.tsx   #   Nav fixa + footer navy
│   │   ├── hero.tsx / catalog.tsx    #   Home: hero animado + grid
│   │   ├── cookie-banner.tsx         #   Cookie consent LGPD
│   │   └── terms-consent-modal.tsx   #   Modal de consentimento
│   │
│   ├── docfacil/views/               # 📱 Views (17 telas)
│   │   ├── criar/                    #   Subcomponentes do fluxo de criação
│   │   │   ├── campo-input.tsx        #     Input com máscara + validação
│   │   │   ├── grupo-campos.tsx       #     Multi-campos (CEP auto-fill)
│   │   │   ├── clausula-card.tsx      #     Cláusulas dinâmicas
│   │   │   ├── preview-a4.tsx         #     Preview A4 com flip 3D
│   │   │   ├── chat-step.tsx          #     Bolha de chat + pet
│   │   │   ├── layout.tsx             #     Split-screen + stepper
│   │   │   └── types.ts / use-*.ts    #     Tipos e hooks compartilhados
│   │   └── documento/                #   Subcomponentes de detalhe
│   │       ├── detalhe-preview.tsx    #     A4 paginado do documento salvo
│   │       └── use-documento-actions.ts #   Hook de ações (PDF, duplicar…)
│   │
│   └── ui/                           # shadcn/ui (componentes base)
│
├── lib/
│   ├── document-engine/              # ⚙️ Motor de documentos (6 módulos)
│   │   ├── classify.ts                #   Classifica linhas do template
│   │   ├── compose.ts / render.ts     #   Composição + render
│   │   ├── paginate.ts / template.ts  #   Paginação + templates
│   │   └── types.ts / index.ts        #   Tipos + barrel
│   │
│   ├── pdf/                           # 🖨️ Geração de PDF (7 módulos)
│   │   ├── content-builder.ts         #   Transforma template → nós pdfmake
│   │   ├── styles.ts                  #   DocDefinition (A4, tipografia)
│   │   ├── fonts.ts / loader.ts        #   Fontes Roboto + singleton
│   │   ├── generate.ts / index.ts      #   Orquestrador + barrel público
│   │   └── types.ts                   #   Tipos
│   │
│   ├── services/                      # 🔌 Camada de serviços
│   │   ├── documents-service.ts       #   CRUD de documentos
│   │   ├── models-service.ts          #   Catálogo de modelos
│   │   ├── users-service.ts           #   Perfis + pagamentos
│   │   ├── checkout-service.ts        #   Checkout + planos
│   │   ├── consent-service.ts         #   Consentimento LGPD
│   │   ├── cep-service.ts             #   Busca CEP (ViaCEP)
│   │   └── ai/                        #   Provider de IA (swapável)
│   │
│   ├── legal/                         # ⚖️ Conteúdo legal SSR
│   ├── auth-context.tsx               #   Auth provider (Firebase + demo)
│   ├── company.ts                     #   Dados da empresa (single source)
│   ├── constants.ts                   #   Constantes centralizadas
│   ├── pricing.ts                     #   Preços e planos
│   ├── modelos.ts                     #   Catálogo de modelos legais
│   └── types.ts                       #   Tipos compartilhados
│
├── hooks/                             # Hooks customizados
│
public/
│   ├── logo.svg                       # Logo SVG
│   └── logo-docfacil.png              # Logo PNG
│
.github/
│   ├── workflows/                     # CI + Release automático
│   ├── ISSUE_TEMPLATE/                 # Templates de bug e feature
│   ├── PULL_REQUEST_TEMPLATE.md        # Template de PR
│   ├── CODEOWNERS                     # Review obrigatório por área
│   └── dependabot.yml                 # Updates automáticos de deps
```
 
---
 
## 🚀 Quick start
 
```bash
# Clonar
git clone https://github.com/Kauerc10/docfacil.git
cd docfacil
 
# Instalar dependências
bun install
 
# Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env (opcional — sem Firebase o app roda em demo mode)
 
# Rodar
bun run dev
# → http://localhost:3000
```
 
> **Sem configurar o Firebase**, o app roda em **demo mode** com dados locais
> e localStorage. Basta instalar e rodar para explorar.
 
### Scripts
 
| Comando | O que faz |
|---|---|
| `bun run dev` | Servidor de desenvolvimento (porta 3000) |
| `bun run build` | Build de produção |
| `bun run build:ci` | Build leve (CI — sem cp que quebra no Windows) |
| `bun run start` | Servidor de produção |
| `bun run lint` | ESLint |
| `bun run typecheck` | TypeScript type-check (`tsc --noEmit`) |
 
---
 
## 🎨 Design system
 
### Paleta
 
| Token | Cor | Uso |
|---|---|---|
| `bg-paper` | `#FAF7F2` | Fundo principal (marfim com textura) |
| `ink` | `#0E2340` | Texto, títulos |
| `navy` | `#14315C` | Header, footer, faixas |
| `blue-royal` | `#2554C7` | CTAs de navegação |
| `selo-green` | `#3E8E6E` | Progresso, confirmação |
| `coral` | `#FF6A4D` | **1 CTA de conversão por tela** |
 
### Tipografia
 
- **Plus Jakarta Sans** — títulos (SemiBold/Bold)
- **Inter** — corpo e UI (base 18px para acessibilidade)
- **Inputs** — 20-22px (público leigo)
 
---
 
## 🗺️ Roadmap
 
[![Project](https://img.shields.io/badge/roadmap-project_board-6e40c9?style=flat-square&logo=github)](https://github.com/users/Kauerc10/projects/3)
 
| Versão | Escopo | Status |
|---|---|---|
| [v0.1.0](https://github.com/Kauerc10/docfacil/releases/tag/v0.1.0) | MVP — fluxo completo, PDF, Firebase | ✅ Lançado |
| [v0.2.0](https://github.com/Kauerc10/docfacil/milestone/1) | IA real, dados empresa, UX polish | 🏗️ Em desenvolvimento |
| [v0.3.0](https://github.com/Kauerc10/docfacil/milestone/2) | Stripe/Pix, deploy produção, testes | 📋 Planejado |
| [v1.0.0](https://github.com/Kauerc10/docfacil/milestone/3) | GA — onboarding, performance, LGPD completo | 🔮 Futuro |
 
---
 
## 🤝 Contribuindo
 
Repositório privado da **K-HUB Soluções Digitais**. Consulte o
[`CONTRIBUTING.md`](./CONTRIBUTING.md) para o fluxo completo de trabalho.
 
Resumo rápido:
 
```
main ← (PR com review + CI verde) ← feat/fix/chore/*
```
 
- **Conventional Commits** (`feat(chat): adiciona validação de CPF`)
- **Squash merge only** — `main` sempre com histórico limpo
- **CI obrigatório** — lint + typecheck + build em toda PR
- **CODEOWNERS** — review automático em `pdf/`, `document-engine/`, `.github/`
 
---
 
## 📋 Documentos do projeto
 
| Arquivo | O que é |
|---|---|
| [`CHANGELOG.md`](./CHANGELOG.md) | Histórico de versões (Keep a Changelog) |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Guia de contribuição e boas práticas |
| [`LICENSE`](./LICENSE) | Licença proprietária K-HUB |
| [`worklog.md`](./worklog.md) | Log detalhado de desenvolvimento |
| [`.env.example`](./.env.example) | Template de variáveis de ambiente |
 
---
 
## 📜 Licença
 
Copyright © 2026 **K-HUB Soluções Digitais**. Todos os direitos reservados.
 
Software proprietário e confidencial. Consulte o
[`LICENSE`](./LICENSE) para detalhes.
 
**"DocFacil"** é marca comercial da K-HUB Soluções Digitais.
 
---
 
<div align="center">
 
**K-HUB Soluções Digitais**
 
📧 contato@khub.com.br
💬 [WhatsApp](https://wa.me/5511999990000)
 
<sub>Construído com 💙 no Brasil</sub>
 
</div>
 
