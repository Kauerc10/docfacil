# Changelog

Todas as mudanças notáveis do DocFacil ficam documentadas aqui.
O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o versionamento é [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Não lançado]

### Em desenvolvimento
- Integração com provedor de IA real (provedor a definir)
- Dados reais da empresa (CNPJ, endereço, WhatsApp) em `company.ts`

---

## [0.1.0] — 2026-07-17

Primeira versão funcional do produto. Fluxo completo de ponta a ponta:
catálogo → criação conversacional → sucesso → download de PDF.

### ✨ Adicionado

**Fundação**
- Home page com GSAP (hero, catálogo, how-it-works, IA banner, prova social, clímax do carimbo)
- Design system completo: paleta papel/ink/navy/blue-royal/selo-green/coral, fontes Plus Jakarta Sans + Inter
- Navegação SPA via NavProvider (17 views)
- Mascote corujinha "Selo" com animações de mood (falando, feliz, atenção, pensando)

**Fluxo de criação de documentos**
- Assistente conversacional com perguntas guiadas e preview A4 ao vivo
- Motor modular de documentos (`document-engine/`): preenche template, classifica linhas, pagina
- 9 modelos profissionais (locação, compra-venda, comodato, declaração, procuração, união estável)
- Cláusulas dinâmicas com campos extras inline (fiador, multa, reajuste, etc.)
- Máscaras e validação de CPF/CNPJ/CEP/telefone/data
- Auto-fill de endereço via ViaCEP com fallback honesto
- Autosave de rascunho e stepper dots para navegação entre etapas

**PDF Premium**
- Geração via pdfmake modularizada em 7 arquivos (`pdf/`)
- Tipografia 12pt com lineHeight 1.6, hierarquia visual com filete lateral em seções
- Citações legais com regex ampliado (art., lei, código, CP, CC, CDC, CF/88)
- Listas com bullet points, recuo de primeira linha tipográfico
- Marca d'água em carimbo circular para plano gratuito
- Header com identidade de marca (símbolo "D" + double rule)

**Backend e Auth**
- Firebase (Auth + Firestore) com fallback demo (localStorage)
- Services layer: documentos, usuários, modelos, consentimento, checkout, planos
- Paywall real: marca d'água + limite mensal + gating de download/edição
- Preço em fonte única de verdade (`pricing.ts`)

**LGPD e Legal**
- Termos de Uso, Política de Privacidade, Política de Cookies em rotas SSR crawláveis
- Consentimento com hash SHA-256 dos termos (prova forense)
- Analytics (GA4 + Meta Pixel) gated por consentimento
- Sitemap dinâmico, robots.txt, JSON-LD (Organization, WebSite, SoftwareApplication)

**SEO e Roteamento**
- Roteamento híbrido: rotas legais como páginas reais (SSR), views dinâmicas como SPA
- Deep linking via `history.pushState` + `popstate`

### 🔧 Alterado
- Refatoração do monolito `generator.ts` (~950 linhas) em módulos com responsabilidade única
- `detectarMascara` unificado (antes duplicado entre GrupoCampos e types.ts)
- Latência artificial de 1.5s no salvamento removida

### 🛠️ Corrigido
- Shake de validação que era código morto agora dispara no campo correto
- Bug do `useTypingText` que ignorava o parâmetro `deps`
- Extras de cláusulas não eram refletidos na UI após re-render
- Marca d'água do PDF era texto simples; agora é carimbo circular
- Detecção de citações legais perdia `art.` minúsculo, CF/88, Código Penal

---

## Como versionar a próxima release

Ao lançar `0.2.0`, mova "[Não lançado]" para uma seção datada e crie um novo
"[Não lançado]" vazio no topo. Verifique o `worklog.md` para o histórico
detalhado de desenvolvimento.
