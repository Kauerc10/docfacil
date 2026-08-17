# Backend seguro + Cloudflare R2 para artefatos PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o DocFacil em um backend confiável para geração, persistência, autorização e download de PDFs, usando Firebase Auth + Firestore como camada de identidade/dados estruturados, Next.js Route Handlers/Vercel como autoridade server-side e Cloudflare R2 privado como armazenamento dos PDFs finais.

**Architecture:** Modular monolith no próprio projeto Next.js. Toda mutação de documentos passa pelo backend; leituras autenticadas simples podem continuar usando Firestore protegido por rules. PDFs são artefatos imutáveis versionados, armazenados somente no R2 privado. Guests recebem um magic link permanente por posse; usuários autenticados permanecem privados e só ganham link compartilhável quando acionam explicitamente “Compartilhar”.

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Bun, Firebase Web SDK, Firebase Admin SDK, Firestore, Firebase App Check, Cloudflare R2 S3 API, AWS SDK v3, pdfmake 0.3.x, Zod, Bun Test, Firebase Emulator/Rules Unit Testing, Vercel Node.js Runtime.

## Global Constraints

- Branch: `feat/backend-documentos-r2`, criada de `main@67282e090dac278019f3bc4b0177c287956887d1`.
- Seguir `CONTRIBUTING.md`: Conventional Commits, uma ideia lógica por commit, CI verde e squash merge.
- Runtime server-side: Node.js; não usar Edge Runtime para Firebase Admin, pdfmake server ou AWS SDK.
- Elevar o piso de Node para `>=22`.
- Firestore é a fonte de verdade dos dados estruturados; R2 guarda somente PDFs finais.
- Bucket R2 sempre privado. Não habilitar `r2.dev` público para os PDFs.
- Nenhum segredo R2/Firebase Admin usa `NEXT_PUBLIC_`.
- Toda mutação de `documents` passa por Route Handlers.
- Cliente nunca é autoridade para `userId`, `plan`, `entitlement`, `paymentStatus`, `watermark`, `currentVersion`, `artifactState` ou `objectKey`.
- UID autenticado sempre vem de Firebase ID Token validado no servidor.
- Firebase App Check protege endpoints customizados em produção.
- Guest pode preencher tudo sem login; rascunho guest permanece local até finalização.
- Guest informa pelo menos e-mail ou WhatsApp.
- Guest avulso só gera com entitlement pago; nesta branch billing real é substituído por provider `demo` server-side e bloqueado em produção.
- Pro gera/regenera sem cobrança por geração.
- Free mantém limite mensal e watermark, com decisão server-side.
- Guest/avulso/free finalizado é imutável; Pro pode criar novas versões.
- PDF nunca é sobrescrito; cada geração cria um artefato imutável.
- Guest recebe magic link automático; usuário autenticado não recebe share link por padrão.
- Share autenticado é opt-in e revogável.
- Share link fica fixado na versão compartilhada.
- Access/share token usa 256 bits de entropia e somente SHA-256 é persistido.
- SHA-256 do PDF é integridade/auditoria, nunca credencial.
- Presigned URL R2 expira em 300 segundos.
- `/d/*` deve ser `noindex`, `nofollow`, `noarchive`, `no-store` e `Referrer-Policy: no-referrer`.
- Billing real, webhook real, envio real de e-mail/WhatsApp e remoção total do Prisma/SQLite ficam fora desta branch.
- Fluxo de implementação: teste falhando → implementação mínima → teste passando → commit.

---

## Estado atual que esta feature corrige

1. `src/lib/services/documents-service.ts` ainda faz CRUD direto no Firestore pelo browser.
2. `src/lib/firebase.ts` possui somente Firebase Web SDK.
3. `criar-view.tsx` ainda persiste `user?.uid || "demo"`.
4. `plan-service.ts` aplica gating client-side embora já reconheça a necessidade de enforcement server-side.
5. `firestore.rules` permite update amplo de `users/{uid}`, inclusive risco de promoção de `plano` pelo cliente.
6. `checkout-service.ts` ainda possui demo com `?paid=1` como confirmação client-side.
7. `src/lib/pdf/loader.ts` usa build/VFS orientado ao browser.
8. `Documento` pressupõe `userId: string` e não modela guest.
9. “Avulso” está misturado entre plano da conta e direito de uma compra.

---

## Arquitetura alvo

```text
Browser
│
├── Firebase Auth
├── Firebase App Check
├── UI / formulário
├── guest draft local
└── Firestore client reads permitidas
        │
        ▼
Next.js Route Handlers — Node.js / Vercel
│
├── request security
├── document domain
├── entitlement
├── idempotency
├── Firebase Admin repositories
├── PDF server adapter
└── R2 private storage adapter
```

### Guest avulso

```text
preenche localmente
→ informa contato
→ checkout demo
→ backend observa order paid
→ POST /api/documents/finalize
→ valida e normaliza respostas
→ gera PDF server-side
→ SHA-256
→ upload R2 privado
→ persiste artifact v1
→ cria guest access token
→ retorna /d/<token>
```

### Usuário autenticado

```text
Firebase login
→ ID Token + App Check
→ POST /api/documents/finalize
→ backend lê plano real
→ free: limite mensal + watermark
→ pro: unlimited + clean PDF
→ R2
→ dashboard privado
```

### Regeneração Pro

```text
v1 permanece intacta
→ usuário altera dados
→ POST /api/documents/:id/versions
→ backend reconfirma Pro
→ gera v2
→ currentVersion só muda após persistência completa
```

---

## Modelo Firestore

### `documents/{documentId}`

```ts
export type DocumentOwner =
  | { type: "guest"; contact: { email?: string; phone?: string } }
  | { type: "user"; userId: string };

export type DocumentEntitlement = "free" | "single_purchase" | "pro";
export type ArtifactState = "generating" | "ready" | "failed";

export interface DocumentRecord {
  owner: DocumentOwner;
  modeloSlug: string;
  modeloNome: string;
  respostas: Record<string, string>;
  entitlement: {
    type: DocumentEntitlement;
    orderId?: string;
    watermarked: boolean;
  };
  artifactState: ArtifactState;
  currentVersion: number | null;
  targetVersion: number | null;
  lastGenerationError?: { code: string; at: number };
  createdAt: number;
  updatedAt: number;
}
```

### `documents/{documentId}/artifacts/{version}`

```ts
export interface DocumentArtifactRecord {
  version: number;
  objectKey: string;
  sha256: string;
  sizeBytes: number;
  mimeType: "application/pdf";
  filename: string;
  watermarked: boolean;
  sourceHash: string;
  modelSnapshotHash: string;
  generatedAt: number;
}
```

### `access_links/{tokenHash}`

```ts
export interface AccessLinkRecord {
  kind: "guest" | "share";
  documentId: string;
  version: number;
  active: boolean;
  createdByUserId?: string;
  createdAt: number;
  revokedAt?: number;
}
```

### `generation_requests/{requestId}`

```ts
export interface GenerationRequestRecord {
  requestId: string;
  operation: "initial" | "pro_regeneration";
  principalKey: string;
  status: "processing" | "completed" | "failed";
  documentId: string;
  targetVersion: number;
  result?: { guestAccessPath?: string };
  errorCode?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}
```

### `orders/{orderId}`

```ts
export interface OrderRecord {
  provider: "demo";
  product: "avulso";
  amountCents: number;
  buyer:
    | { type: "guest"; email?: string; phone?: string }
    | { type: "user"; userId: string; email?: string };
  status: "pending" | "paid" | "consumed" | "failed" | "refunded";
  documentId?: string;
  createdAt: number;
  paidAt?: number;
  consumedAt?: number;
}
```

---

## Estrutura alvo

```text
src/
├── app/api/
│   ├── checkout/demo/route.ts
│   ├── documents/finalize/route.ts
│   ├── documents/[id]/download/route.ts
│   ├── documents/[id]/versions/route.ts
│   ├── documents/[id]/share/route.ts
│   ├── documents/[id]/share/revoke/route.ts
│   ├── documents/[id]/route.ts
│   └── access/download/route.ts
├── app/d/[token]/page.tsx
├── lib/backend/
├── lib/billing/
├── lib/documents/
├── lib/server/firebase-admin.ts
├── lib/server/firestore/
├── lib/server/r2/
└── lib/pdf/
    ├── browser/generator.ts
    └── server/generator.ts
```

---

## Task 1 — Runtime, dependências e env

- [ ] Adicionar `firebase-admin`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `server-only`.
- [ ] Adicionar dev deps `@firebase/rules-unit-testing` e `firebase-tools`.
- [ ] Criar `src/lib/server/env.ts` com Zod e testes.
- [ ] Adicionar secrets Admin/R2/AppCheck/Billing em `.env.example`.
- [ ] `engines.node >=22`.
- [ ] Configurar tracing de fontes do pdfmake server-side.
- [ ] Rodar teste, lint, typecheck.
- [ ] Commit: `chore(backend): prepara runtime e dependencias server-side`.

## Task 2 — Firebase Admin e request security

- [ ] Criar singleton Firebase Admin.
- [ ] Criar `BackendError`.
- [ ] Criar `resolvePrincipal()` e `requireAppCheck()`.
- [ ] Sem Authorization = guest; token inválido = 401.
- [ ] UID vem somente de `verifyIdToken()`.
- [ ] Nunca logar Authorization/App Check token.
- [ ] Tests.
- [ ] Commit: `feat(auth): adiciona autenticacao server-side com Firebase Admin`.

## Task 3 — Cloudflare R2 privado

- [ ] Criar S3Client singleton com region `auto` e endpoint da conta R2.
- [ ] Criar `ArtifactStorage`.
- [ ] Object key: `documents/<documentId>/v<version>/document.pdf`.
- [ ] `PutObject` com `application/pdf`, attachment, `private,no-store`.
- [ ] `GetObject` presigned por 300s.
- [ ] Fake storage somente para testes.
- [ ] Commit: `feat(storage): adiciona adapter privado para Cloudflare R2`.

## Task 4 — Separar PDF browser/server

- [ ] Preservar VFS apenas no adapter browser.
- [ ] Criar adapter Node server-side usando fontes reais do pacote pdfmake.
- [ ] Compartilhar `buildDocDefinition`.
- [ ] Testar `%PDF`, Buffer e ausência de `window`.
- [ ] Commit: `refactor(pdf): separa geradores browser e server`.

## Task 5 — Document domain/input/tokens

- [ ] Criar schema de `DocumentDraftInput`.
- [ ] Validar UUID, limites de chaves/strings, cláusulas, extras e required fields.
- [ ] Servidor reconstrói respostas finais a partir de `campos`, cláusulas e modelo confiável.
- [ ] Bloquear injeção client de `__clausula_*`.
- [ ] `randomBytes(32).toString("base64url")` para access tokens.
- [ ] Persistir apenas SHA-256 do token.
- [ ] Criar `sourceHash` e `modelSnapshotHash` determinísticos.
- [ ] Commit: `feat(documents): adiciona dominio e validacao server-side`.

## Task 6 — Entitlement server-side

- [ ] Separar `AccountPlan = gratis|pro` de `PurchaseProduct = avulso|pro`.
- [ ] Guest sem order/pendente = 402.
- [ ] Guest paid = single purchase.
- [ ] Free abaixo limite = watermark.
- [ ] Free acima limite = 402.
- [ ] Pro = clean/unlimited.
- [ ] Nunca tratar legacy `avulso` como Pro.
- [ ] Contagem mensal via Firestore Admin.
- [ ] Commit: `refactor(billing): separa plano de conta e compra avulsa`.

## Task 7 — Repositórios Firestore Admin

- [ ] Documents repository.
- [ ] Access repository.
- [ ] Orders repository.
- [ ] Generation requests repository.
- [ ] Contract tests com fake.
- [ ] `currentVersion` só muda na promoção final.
- [ ] Owner nunca muda.
- [ ] Idempotency por UUID requestId.
- [ ] generation request TTL field `expiresAt` +24h.
- [ ] Commit: `feat(db): adiciona repositorios server-side do Firestore`.

## Task 8 — Billing provider demo fail-closed

- [ ] Interface `BillingProvider`.
- [ ] Provider demo server-side.
- [ ] Demo exige `ALLOW_DEMO_BILLING=true` e não funciona em production.
- [ ] Order é single-use.
- [ ] Remover `?paid=1` como fonte de verdade.
- [ ] Commit: `feat(billing): cria provider demo server-side`.

## Task 9 — Orchestrator de geração

- [ ] Happy path guest: idempotency → order → doc → PDF → SHA → R2 → artifact → promote → consume order → guest link.
- [ ] R2 fail não promove/consome/cria link.
- [ ] Firestore fail pós-upload não cria falso sucesso.
- [ ] Retry não cria versão extra.
- [ ] Pro v2 preserva v1.
- [ ] Commit: `feat(documents): orquestra geracao idempotente de artefatos`.

## Task 10 — APIs de documentos

- [ ] `POST /api/documents/finalize`.
- [ ] `POST /api/documents/:id/versions` Pro-only.
- [ ] `POST /api/documents/:id/download` owner-only.
- [ ] `runtime=nodejs`, `maxDuration=60`.
- [ ] Error contract estável.
- [ ] Signed URL 300s + `no-store`.
- [ ] Commit: `feat(api): adiciona endpoints seguros de documentos`.

## Task 11 — Magic link e share opt-in

- [ ] `POST /api/access/download`.
- [ ] `/d/[token]` server-side.
- [ ] Headers privacy/noindex/no-referrer/no-store.
- [ ] Guest link automático e fixado na versão paga.
- [ ] Auth share somente por clique explícito.
- [ ] Share fixa currentVersion do momento da criação.
- [ ] Revogação.
- [ ] Como token puro não é persistido, UI futura mostra link ativo e permite gerar novo/revogar, não reconstruir o anterior.
- [ ] Commit: `feat(sharing): adiciona magic links e compartilhamento revogavel`.

## Task 12 — Exclusão autenticada coordenada

- [ ] Auth/ownership.
- [ ] Tombstone/deleting.
- [ ] Revoke share.
- [ ] Delete R2 artifacts.
- [ ] Delete artifact/document metadata.
- [ ] Se R2 falhar, não retornar sucesso falso.
- [ ] Guest delete por magic link fora do escopo.
- [ ] Commit: `feat(documents): coordena exclusao privada de artefatos`.

## Task 13 — Migrar client

- [ ] Criar `src/lib/documents/client.ts`.
- [ ] Enviar ID Token + App Check nas APIs.
- [ ] Guest draft: `docfacil:draft:v1:<modeloSlug>`.
- [ ] Remover `user?.uid || "demo"`.
- [ ] Remover mutations Firestore diretas.
- [ ] Final download usa R2 artifact, não client PDF generation.
- [ ] Pro edit gera nova versão.
- [ ] Free/avulso não editam documento final.
- [ ] UI share/revoke.
- [ ] Commit: `refactor(client): move mutacoes de documentos para API`.

## Task 14 — Firestore Rules

- [ ] Owner lê próprio profile.
- [ ] Owner altera somente nome/telefone/foto/updatedAt.
- [ ] Client não altera plano/uid/email/createdAt.
- [ ] Client não escreve documents.
- [ ] Client lê apenas seus documents user-owned.
- [ ] Deny all client access a artifacts/access_links/orders/generation_requests.
- [ ] Adicionar Rules Unit Tests via emulator.
- [ ] Commit: `security(firestore): bloqueia mutacoes e promocao de plano no client`.

## Task 15 — App Check

- [ ] Inicializar App Check no browser com provider adequado.
- [ ] Client helper envia token.
- [ ] Preview primeiro, enforcement depois.
- [ ] Nunca ligar enforcement antes do cliente enviar token.
- [ ] Commit: `security(app-check): protege chamadas ao backend customizado`.

## Task 16 — CI/integration

- [ ] Integration flow guest com fakes.
- [ ] Integration flow Pro v1/v2/share/v3/revoke.
- [ ] CI: test → rules test → lint → typecheck → build.
- [ ] Nenhum teste chama Firebase/R2 reais.
- [ ] Commit: `ci: amplia barreira para backend e Firestore Rules`.

## Task 17 — Docs operacionais

- [ ] Documentar bucket `docfacil-pdfs`, privado, token scoped ao bucket.
- [ ] Documentar Firebase Admin/Vercel secrets.
- [ ] Documentar App Check rollout.
- [ ] Documentar demo billing como dev/preview only.
- [ ] Não usar claims sem evidência como “LGPD compliant”, “enterprise-grade” ou “pagamentos em produção”.
- [ ] Commit: `docs(backend): documenta Firebase Admin e Cloudflare R2`.

## Task 18 — Validação final

- [ ] `bun run test`
- [ ] `bun run test:rules`
- [ ] `bun run lint`
- [ ] `bun run typecheck`
- [ ] `bun run build:ci`
- [ ] Manual guest.
- [ ] Manual free.
- [ ] Manual Pro/versioning/share/revoke.
- [ ] Testes manuais de autorização.
- [ ] Inspecionar logs para garantir ausência de tokens/PII.
- [ ] Revisar diff e arquivos secretos antes do PR.

---

## State machine

```text
generation_request processing
→ document generating
→ PDF
→ R2
→ artifact metadata
→ promote currentVersion
→ consume order if single purchase
→ create guest access if guest
→ generation_request completed
```

Em regeneração Pro, falha de v3 deixa `currentVersion` em v2.

---

## Error contract

```text
INVALID_REQUEST
INVALID_AUTH_TOKEN
APP_CHECK_REQUIRED
APP_CHECK_INVALID
DOCUMENT_NOT_FOUND
DOCUMENT_FORBIDDEN
DOCUMENT_IMMUTABLE
PRO_REQUIRED
FREE_LIMIT_REACHED
PAYMENT_REQUIRED
ORDER_NOT_FOUND
ORDER_NOT_PAID
ORDER_ALREADY_CONSUMED
GENERATION_IN_PROGRESS
GENERATION_FAILED
ARTIFACT_NOT_FOUND
ACCESS_LINK_INVALID
R2_UPLOAD_FAILED
R2_SIGN_FAILED
```

HTTP:
- 400 input
- 401 auth/app-check
- 402 entitlement/payment
- 403 authorization
- 404 recurso/token
- 409 idempotency/generation conflict
- 500 internal
- 503 dependency unavailable

Nunca retornar stack trace/erro cru Firebase/R2.

---

## Observabilidade

Logs podem conter:

```text
requestId
documentId
version
errorCode
durationMs
sizeBytes
```

Nunca logar respostas completas, CPF/RG/endereço, contact completo ou tokens.

---

## R2 setup

```text
Bucket: docfacil-pdfs
Access: PRIVATE
Object key: documents/<documentId>/v<version>/document.pdf
API token: Object Read & Write, scoped ao bucket
Presigned GET: 300s
```

Sem CORS para PUT browser nesta fase porque o upload é server → R2.

---

## Trust boundary Firebase

Web SDK pode autenticar, ler models, ler perfil próprio permitido e ler seus documents.

Web SDK não pode mudar plano, escrever documents, ler artifacts/access_links/orders/generation_requests.

Firebase Admin bypassa Security Rules, então authorization explícita no backend é obrigatória.

---

## Billing futuro

Gateway real entra como adapter de `BillingProvider` com webhook assinado e idempotente. Redirect/success URL nunca será prova de pagamento.

---

## Magic-link delivery futuro

Nesta branch coletar contato e mostrar/copiar magic link. Email/WhatsApp real entram depois via providers/outbox. Não persistir token puro para “reenviar depois”; reenvio deve gerar/rotacionar uma credencial nova com verificação apropriada.

---

## Não fazer

```text
❌ bucket R2 público
❌ URL R2 permanente
❌ SHA do PDF como senha
❌ token de acesso em plaintext
❌ userId/plan/paid/watermark vindos do client
❌ ?paid=1 como verdade server-side
❌ Admin SDK no client
❌ VFS como adapter PDF server oficial
❌ sobrescrever v1 com v2
❌ auto-share de usuário autenticado
❌ share acompanhar latest silenciosamente
❌ client alterar users.plano
❌ demo billing em produção
❌ PII/respostas completas em logs
```

---

## Acceptance checklist

- [ ] Guest gera sem conta.
- [ ] Guest draft fica fora do Firestore até finalização.
- [ ] Guest sem order paga não gera.
- [ ] Order avulsa é single-use.
- [ ] Guest recebe magic link permanente do DocFacil.
- [ ] R2 permanece privado.
- [ ] Download usa signed URL 300s.
- [ ] PDF SHA-256 é persistido como integridade.
- [ ] Tokens puros não são persistidos.
- [ ] Free/avulso final não é editável no mesmo documento.
- [ ] Pro gera versões imutáveis.
- [ ] Documentos autenticados são privados por padrão.
- [ ] Share é opt-in, fixado na versão e revogável.
- [ ] Client não altera plano.
- [ ] Client não escreve documents.
- [ ] Auth inválida não degrada para guest.
- [ ] App Check pode ser enforced.
- [ ] Segredos ficam server-only.
- [ ] Logs não contêm PII/tokens.
- [ ] Unit tests, rules tests, lint, typecheck e build passam.

---

## Ordem de implementação

```text
1 runtime/env
2 Firebase Admin/security
3 R2 adapter
4 PDF server adapter
5 document domain
6 entitlement
7 Firestore repositories
8 billing demo
9 generation orchestrator
10 APIs
11 magic/share
12 deletion
13 client migration
14 Firestore Rules
15 App Check
16 CI/integration
17 docs
18 final verification
```

---

## Handoff

```bash
git checkout feat/backend-documentos-r2
git status
git log -1 --oneline
```

Base esperada:

```text
67282e090dac278019f3bc4b0177c287956887d1
```

Antes do PR:

```bash
bun run test
bun run test:rules
bun run lint
bun run typecheck
bun run build:ci
```

PR recomendado:

```text
feat(backend): adiciona artefatos PDF privados com Firebase e R2
```
