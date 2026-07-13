<div align="center">

# 📄 DocFacil

### Documentos legais prontos como numa conversa.

Plataforma de geração de documentos legais (contratos, declarações, procurações) para o público leigo — sem juridiquês, sem fricção, com a credibilidade de cartório e o calor de atendimento humano.

</div>

---

## 🏢 Sobre

O **DocFacil** é um produto da **K-HUB Soluções Digitais**. O projeto adota a direção de produto **"Concierge Digital + Ateliê de Documentos"**: um chat conversacional guiado como espinha dorsal da experiência de preenchimento, com preview do documento sendo montado em tempo real.

O público-alvo inclui pessoas mais velhas e com baixa intimidade com tecnologia, então a UI é **óbvia antes de ser bonita** — mas com identidade própria para não parecer "mais um SaaS genérico".

### ✨ Diferencial de marca

Para fugir do clichê de IA genérica (gradientes roxo/azul, blobs flutuantes), a marca adota a metáfora do **selo/carimbo notarial** como elemento de assinatura visual:

- Ícone de carregamento = carimbo "batendo"
- Tela de sucesso = carimbo estampa o documento (clímax da experiência)
- Marca d'água sutil nos previews de documento
- Fundo com leve textura de papel (grão sutil, nunca branco estéril)

---

## 🚀 Stack & Tecnologias

| Camada | Tecnologia |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Linguagem** | TypeScript 5 |
| **Estilo** | Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com/) (New York) |
| **Animações** | [GSAP 3](https://gsap.com/) + `@gsap/react` (ScrollTrigger) |
| **UI Icons** | Lucide React + ícones desenhados sob medida |
| **Fontes** | Plus Jakarta Sans (display) + Inter (corpo, 18px base) |
| **Banco de Dados** | Prisma ORM (SQLite dev) + Prisma Client |
| **Auth** | NextAuth.js v4 (disponível) |
| **State** | Zustand + TanStack Query |
| **Package Manager** | [Bun](https://bun.sh/) |

---

## 📦 Instalação & Desenvolvimento

### Pré-requisitos

- [Bun](https://bun.sh/) `>= 1.1`
- Node.js `>= 20` (recomendado)
- Git

### Setup local

```bash
# 1. Clonar o repositório
git clone git@github.com:khub-solucoes/docfacil.git
cd docfacil

# 2. Instalar dependências
bun install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# edite .env com seus valores (DATABASE_URL, NEXTAUTH_SECRET, etc.)

# 4. Configurar o banco de dados
bun run db:push

# 5. Rodar o servidor de desenvolvimento
bun run dev
```

A aplicação estará disponível em `http://localhost:3000`.

### Scripts disponíveis

| Script | Descrição |
|---|---|
| `bun run dev` | Inicia o servidor de desenvolvimento (porta 3000) |
| `bun run lint` | Roda o ESLint para verificar qualidade do código |
| `bun run build` | Build de produção |
| `bun run start` | Inicia o servidor de produção |
| `bun run db:push` | Sincroniza o schema Prisma com o banco |
| `bun run db:generate` | Gera o Prisma Client |
| `bun run db:migrate` | Cria uma nova migration |
| `bun run db:reset` | Reseta o banco (cuidado!) |

---

## 🗂️ Estrutura do Projeto

```
docfacil/
├── src/
│   ├── app/                          # App Router (Next.js 16)
│   │   ├── layout.tsx                # Layout raiz (fontes, metadata, bg paper)
│   │   ├── page.tsx                  # Home page
│   │   ├── globals.css               # Design system DocFacil (tokens, utilities)
│   │   └── api/                      # API routes
│   │
│   ├── components/
│   │   ├── docfacil/                 # Componentes de marca (DocFacil)
│   │   │   ├── selo.tsx              # Carimbo notarial (assinatura visual)
│   │   │   ├── header.tsx            # Header fixo c/ shrink no scroll
│   │   │   ├── hero.tsx              # Hero c/ timeline GSAP
│   │   │   ├── catalog.tsx           # Grid de documentos (dog-ear cards)
│   │   │   ├── how-it-works.tsx      # 3 passos + demo split-screen
│   │   │   ├── ai-banner.tsx         # Faixa Gerador IA
│   │   │   ├── social-proof.tsx      # Depoimentos + pills de confiança
│   │   │   ├── success-showcase.tsx  # CLÍMAX: carimbo estampa o doc
│   │   │   ├── footer.tsx            # Footer navy c/ WhatsApp
│   │   │   ├── whatsapp-button.tsx   # CTA flutuante sempre visível
│   │   │   └── gsap-safety.tsx       # Rede de segurança p/ animações
│   │   │
│   │   └── ui/                       # shadcn/ui (componentes base)
│   │
│   ├── lib/
│   │   ├── db.ts                     # Prisma Client
│   │   └── utils.ts                  # Utilities (cn, etc.)
│   │
│   └── hooks/                        # Hooks customizados
│
├── prisma/
│   └── schema.prisma                 # Schema do banco de dados
│
├── public/                           # Assets estáticos
├── mini-services/                    # Microserviços (websocket, etc.)
└── docs/                             # Documentação adicional
```

---

## 🎨 Design System

### Paleta de cores

| Token | HEX | Uso |
|---|---|---|
| `bg-paper` | `#FAF7F2` | Fundo principal (marfim quente com textura) |
| `bg-surface` | `#FFFFFF` | Cards, inputs, superfícies |
| `ink` | `#0E2340` | Texto principal, títulos |
| `navy` | `#14315C` | Header, footer, faixas escuras |
| `blue-royal` | `#2554C7` | CTAs de navegação, links |
| `blue-soft` | `#E7EEFC` | Hovers, tags |
| `selo-green` | `#3E8E6E` | Progresso, checkmarks |
| `green-tint` | `#E7F3EC` | Banners de sucesso |
| `coral` | `#FF6A4D` | **CTA final de conversão (1 por tela)** |

### Regra de proporção (60-30-10 adaptado)

- **Azul/ink domina ~70%** da interface
- **Verde** aparece só em feedback pontual (~10%)
- **Coral** no máximo um botão por tela (~5%)
- Resto é `bg-paper`/branco

### Tipografia

- **Títulos:** Plus Jakarta Sans (SemiBold/Bold)
- **Corpo/UI:** Inter (Regular/Medium), base **18px** (acessibilidade)
- **Inputs:** 20-22px
- Line-height 1.5+, contraste forte, poucos tamanhos na tela

---

## ♿ Acessibilidade

O DocFacil é construído com foco em acessibilidade para o público leigo:

- ✅ `prefers-reduced-motion` respeitado em todas as animações GSAP
- ✅ Contraste alto (texto `ink` sobre `bg-paper`)
- ✅ Base tipográfica de 18px (não 16px)
- ✅ Targets de toque mínimos de 44px
- ✅ HTML semântico (`main`, `header`, `nav`, `section`, `footer`)
- ✅ ARIA labels em elementos interativos
- ✅ Foco visual claro em inputs e botões
- ✅ Layout responsivo mobile-first

---

## 🤝 Contribuindo

Este é um repositório **privado** da K-HUB Soluções Digitais. Apenas colaboradores autorizados podem contribuir.

### Fluxo de trabalho (Git Flow simplificado)

```bash
# 1. Criar branch a partir de main
git checkout main
git pull origin main
git checkout -b feat/sua-feature

# 2. Desenvolver + commitar (Conventional Commits)
git commit -m "feat(modelos): adiciona catálogo completo"

# 3. Push + abrir Pull Request
git push -u origin feat/sua-feature
```

### Conventional Commits

```
feat:      nova funcionalidade
fix:       correção de bug
docs:      documentação
style:     formatação (sem mudança de lógica)
refactor:  refactor sem mudança de comportamento
test:      testes
chore:     build, deps, configs
perf:      performance
```

### Antes de abrir PR

- [ ] `bun run lint` sem erros
- [ ] Self-review feito
- [ ] Sem `console.log` ou código morto
- [ ] Documentação atualizada (se necessário)
- [ ] Testes manuais no browser (desktop + mobile)

---

## 🔒 Licença & Propriedade Intelectual

Copyright © 2026 **K-HUB Soluções Digitais**. Todos os direitos reservados.

Este software é proprietário e confidencial. O uso, cópia, modificação ou
distribuição não autorizada é estritamente proibido. Consulte o arquivo
[`LICENSE`](./LICENSE) para detalhes completos.

**"DocFacil"** e o logotipo do selo são marcas comerciais da K-HUB Soluções Digitais.

---

## 📞 Contato

<div align="center">

**K-HUB Soluções Digitais**

🌐 [khub.com.br](https://khub.com.br)
📧 contato@khub.com.br
💬 [WhatsApp](https://wa.me/5511999990000)

</div>

---

<div align="center">

<sub>Feito com 💙 pela equipe K-HUB Soluções Digitais</sub>

</div>
