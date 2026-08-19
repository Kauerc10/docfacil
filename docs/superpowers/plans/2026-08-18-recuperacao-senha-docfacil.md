# Recuperação de Senha DocFácil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um fluxo completo de recuperação de senha com telas próprias do DocFácil, handler customizado para os links de redefinição e mensagens públicas sem vazamento de detalhes técnicos.

**Architecture:** A solicitação de recuperação e a redefinição serão rotas reais do Next App Router (`/esqueci-senha` e `/redefinir-senha`). A lógica de Firebase Authentication fica encapsulada em uma camada focada em recuperação de senha, enquanto os componentes visuais trabalham apenas com estados de produto. O envio continua usando a infraestrutura nativa do provedor; domínio e template de e-mail são configuração operacional documentada, não HTML hard-coded no frontend.

**Tech Stack:** Next.js App Router, React, TypeScript, Firebase Authentication Web SDK, Bun test, Tailwind/CSS existente, Lucide, GSAP apenas se necessário.

**Spec:** `docs/superpowers/specs/2026-08-18-recuperacao-senha-docfacil-design.md`

## Global Constraints

- Não criar JWT, refresh token, token de reset ou armazenamento de senha próprios.
- Não adicionar verificação de e-mail nesta PR.
- Nenhuma copy pública do fluxo pode citar Firebase, SDK, `oobCode`, API key ou nomes técnicos de infraestrutura.
- Resposta de solicitação de reset deve ser neutra para evitar enumeração de contas.
- Nunca persistir ou logar `oobCode` em Firestore, localStorage ou logs de produção.
- Mínimo local de senha continua em 8 caracteres; requisitos adicionais devem ser apresentados em linguagem humana.
- Não fazer login automático após redefinir a senha.
- As novas rotas devem respeitar `prefers-reduced-motion`.
- Não adicionar nova biblioteca de animação apenas para este fluxo.
- Configuração de domínio/remetente/template de e-mail permanece etapa operacional no Console Firebase.

---

## File Structure

- Create: `src/lib/auth/password-reset.ts` — funções focadas em solicitar, validar e confirmar redefinição, com dependências injetáveis para testes.
- Create: `src/test/auth/password-reset.test.ts` — testes unitários da camada de recuperação.
- Create: `src/components/docfacil/auth/password-recovery-shell.tsx` — casca visual reutilizável das duas rotas.
- Create: `src/components/docfacil/auth/password-recovery-visual.tsx` — animação decorativa isolada e acessível.
- Create: `src/app/esqueci-senha/page.tsx` — rota real de solicitação.
- Create: `src/app/esqueci-senha/password-recovery-form.tsx` — estado e interação da solicitação.
- Create: `src/app/redefinir-senha/page.tsx` — rota real de redefinição.
- Create: `src/app/redefinir-senha/password-reset-form.tsx` — validação do link, nova senha e sucesso.
- Modify: `src/components/docfacil/views/login-view.tsx` — botão navega para `/esqueci-senha`.
- Modify: `src/lib/auth-context.tsx` — remover responsabilidade visual de reset se ficar redundante; manter apenas auth geral.
- Modify: `src/lib/auth/password-policy.ts` — expor helper reutilizável para requisitos de senha sem linguagem técnica.
- Modify: `src/app/globals.css` — keyframes/classes da animação, com `prefers-reduced-motion`.
- Create: `src/test/auth/password-recovery-ui-contract.test.ts` — contratos de copy/rota e proteção contra termos técnicos.
- Create: `docs/runbooks/password-reset-email-firebase.md` — configuração operacional do template, domínio, remetente e DNS.

---

### Task 1: Camada de recuperação de senha testável

**Files:**
- Create: `src/lib/auth/password-reset.ts`
- Create: `src/test/auth/password-reset.test.ts`

**Interfaces:**
- Produces: `requestPasswordReset(email: string): Promise<void>`
- Produces: `verifyPasswordReset(code: string): Promise<{ email: string }>`
- Produces: `completePasswordReset(code: string, newPassword: string): Promise<void>`
- Produces: `maskEmail(email: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "bun:test";
import {
  maskEmail,
  createPasswordResetService,
} from "@/lib/auth/password-reset";

describe("password reset service", () => {
  it("mantém feedback neutro quando o provedor informa usuário inexistente", async () => {
    const service = createPasswordResetService({
      sendReset: async () => {
        const error = new Error("not found") as Error & { code?: string };
        error.code = "auth/user-not-found";
        throw error;
      },
      verifyCode: async () => "teste@example.com",
      confirmReset: async () => undefined,
    });

    await expect(service.requestPasswordReset("teste@example.com")).resolves.toBeUndefined();
  });

  it("valida código e devolve apenas o e-mail associado", async () => {
    const service = createPasswordResetService({
      sendReset: async () => undefined,
      verifyCode: async () => "teste@example.com",
      confirmReset: async () => undefined,
    });

    await expect(service.verifyPasswordReset("codigo-valido")).resolves.toEqual({
      email: "teste@example.com",
    });
  });

  it("confirma nova senha com o código recebido", async () => {
    let received: [string, string] | null = null;
    const service = createPasswordResetService({
      sendReset: async () => undefined,
      verifyCode: async () => "teste@example.com",
      confirmReset: async (code, password) => {
        received = [code, password];
      },
    });

    await service.completePasswordReset("codigo", "NovaSenha123");
    expect(received).toEqual(["codigo", "NovaSenha123"]);
  });

  it("mascara e-mail sem revelar o endereço inteiro", () => {
    expect(maskEmail("kauerruon@gmail.com")).toBe("ka***@gmail.com");
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
bun test src/test/auth/password-reset.test.ts
```

Expected: FAIL porque `@/lib/auth/password-reset` ainda não existe.

- [ ] **Step 3: Implement the minimal service**

```ts
import {
  confirmPasswordReset,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth, ensureAuthPersistence, IS_FIREBASE_CONFIGURED } from "@/lib/firebase";

type PasswordResetDependencies = {
  sendReset: (email: string) => Promise<void>;
  verifyCode: (code: string) => Promise<string>;
  confirmReset: (code: string, password: string) => Promise<void>;
};

function authErrorCode(error: unknown): string {
  return (error as { code?: string })?.code || "";
}

export function createPasswordResetService(deps: PasswordResetDependencies) {
  return {
    async requestPasswordReset(email: string) {
      try {
        await deps.sendReset(email.trim());
      } catch (error) {
        if (authErrorCode(error) === "auth/user-not-found") return;
        throw error;
      }
    },
    async verifyPasswordReset(code: string) {
      return { email: await deps.verifyCode(code) };
    },
    async completePasswordReset(code: string, newPassword: string) {
      await deps.confirmReset(code, newPassword);
    },
  };
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "seu e-mail";
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}***@${domain}`;
}

function firebaseService() {
  if (!IS_FIREBASE_CONFIGURED || !auth) return null;
  return createPasswordResetService({
    sendReset: async (email) => {
      await ensureAuthPersistence();
      auth.languageCode = "pt-BR";
      await sendPasswordResetEmail(auth, email);
    },
    verifyCode: (code) => verifyPasswordResetCode(auth, code),
    confirmReset: (code, password) => confirmPasswordReset(auth, code, password),
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  const service = firebaseService();
  if (!service) return;
  return service.requestPasswordReset(email);
}

export async function verifyPasswordReset(code: string): Promise<{ email: string }> {
  const service = firebaseService();
  if (!service) throw new Error("RESET_UNAVAILABLE");
  return service.verifyPasswordReset(code);
}

export async function completePasswordReset(code: string, newPassword: string): Promise<void> {
  const service = firebaseService();
  if (!service) throw new Error("RESET_UNAVAILABLE");
  return service.completePasswordReset(code, newPassword);
}
```

- [ ] **Step 4: Run tests to verify GREEN**

```bash
bun test src/test/auth/password-reset.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/password-reset.ts src/test/auth/password-reset.test.ts
git commit -m "feat(auth): isola fluxo de recuperacao de senha"
```

---

### Task 2: Transformar o botão do login em navegação para recuperação

**Files:**
- Modify: `src/components/docfacil/views/login-view.tsx`
- Modify: `src/lib/auth-context.tsx`
- Modify: `src/test/auth/auth-account-hardening-contract.test.ts`

**Interfaces:**
- Consumes: rota `/esqueci-senha`
- Removes from UI flow: envio direto de reset dentro de `LoginView`

- [ ] **Step 1: Write the failing contract test**

```ts
it("esqueci minha senha abre a rota dedicada", () => {
  const login = source("src/components/docfacil/views/login-view.tsx");
  expect(login).toContain('href="/esqueci-senha"');
  expect(login).not.toContain("requestPasswordReset");
  expect(login).not.toContain("resetFeedback");
});
```

- [ ] **Step 2: Run RED**

```bash
bun test src/test/auth/auth-account-hardening-contract.test.ts
```

Expected: FAIL porque o login ainda envia o reset diretamente.

- [ ] **Step 3: Simplify LoginView**

Substituir o botão por link real:

```tsx
<a
  href="/esqueci-senha"
  className="text-sm font-medium text-[var(--blue-royal)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-royal)] rounded px-1"
>
  Esqueci minha senha
</a>
```

Remover de `LoginView`: `requestPasswordReset`, `resetSubmitting`, `resetFeedback`, `handlePasswordReset` e UI associada.

Se `requestPasswordReset` não tiver outros consumidores no `AuthContext`, remover a função do contrato do contexto e delegar a recuperação apenas ao novo módulo `src/lib/auth/password-reset.ts`.

- [ ] **Step 4: Run GREEN**

```bash
bun test src/test/auth/auth-account-hardening-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/docfacil/views/login-view.tsx src/lib/auth-context.tsx src/test/auth/auth-account-hardening-contract.test.ts
git commit -m "refactor(auth): leva recuperacao para rota dedicada"
```

---

### Task 3: Criar shell visual e animação acessível

**Files:**
- Create: `src/components/docfacil/auth/password-recovery-shell.tsx`
- Create: `src/components/docfacil/auth/password-recovery-visual.tsx`
- Modify: `src/app/globals.css`
- Create: `src/test/auth/password-recovery-ui-contract.test.ts`

**Interfaces:**
- Produces: `PasswordRecoveryShell`
- Produces: `PasswordRecoveryVisual`

- [ ] **Step 1: Write failing UI contract**

```ts
it("shell de recuperacao respeita reduced motion e nao vaza termos tecnicos", () => {
  const shell = source("src/components/docfacil/auth/password-recovery-shell.tsx");
  const visual = source("src/components/docfacil/auth/password-recovery-visual.tsx");
  const css = source("src/app/globals.css");

  for (const forbidden of ["Firebase", "oobCode", "apiKey", "SDK"]) {
    expect(shell).not.toContain(forbidden);
    expect(visual).not.toContain(forbidden);
  }
  expect(css).toContain("prefers-reduced-motion");
});
```

- [ ] **Step 2: Run RED**

```bash
bun test src/test/auth/password-recovery-ui-contract.test.ts
```

Expected: FAIL porque os arquivos não existem.

- [ ] **Step 3: Implement shared shell**

Responsabilidade do shell:

```tsx
export function PasswordRecoveryShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper grid place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-surface p-7 sm:p-8 shadow-[0_18px_55px_-18px_rgba(14,35,64,0.24)]">
        <PasswordRecoveryVisual />
        {eyebrow && <p className="mt-5 text-center text-xs font-bold uppercase tracking-[0.16em] text-[var(--selo-green)]">{eyebrow}</p>}
        <h1 className="mt-2 text-center font-[family-name:var(--font-jakarta)] text-3xl font-extrabold text-ink tracking-tight">{title}</h1>
        <p className="mt-3 text-center text-base leading-relaxed text-ink/65">{description}</p>
        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}
```

O visual deve usar envelope + chave com classes CSS próprias e `aria-hidden="true"`.

- [ ] **Step 4: Add CSS animation with reduced motion**

Adicionar keyframes focados, por exemplo:

```css
@keyframes password-recovery-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes password-recovery-orbit {
  to { transform: rotate(360deg); }
}

.password-recovery-float {
  animation: password-recovery-float 3.6s ease-in-out infinite;
}

.password-recovery-orbit {
  animation: password-recovery-orbit 8s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .password-recovery-float,
  .password-recovery-orbit {
    animation: none !important;
  }
}
```

- [ ] **Step 5: Run GREEN**

```bash
bun test src/test/auth/password-recovery-ui-contract.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/docfacil/auth src/app/globals.css src/test/auth/password-recovery-ui-contract.test.ts
git commit -m "feat(auth): cria experiencia visual de recuperacao"
```

---

### Task 4: Criar rota `/esqueci-senha`

**Files:**
- Create: `src/app/esqueci-senha/page.tsx`
- Create: `src/app/esqueci-senha/password-recovery-form.tsx`
- Modify: `src/test/auth/password-recovery-ui-contract.test.ts`

**Interfaces:**
- Consumes: `requestPasswordReset(email)` and `maskEmail(email)`
- Produces: public route `/esqueci-senha`

- [ ] **Step 1: Write failing source contracts**

```ts
it("rota de solicitacao usa feedback neutro e link de volta", () => {
  const form = source("src/app/esqueci-senha/password-recovery-form.tsx");
  expect(form).toContain("Se existir uma conta com esse e-mail");
  expect(form).toContain('href="/?view=login"');
  expect(form).toContain("requestPasswordReset");
  expect(form).not.toContain("Firebase");
});
```

- [ ] **Step 2: Run RED**

```bash
bun test src/test/auth/password-recovery-ui-contract.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement page and form**

Estados mínimos:

```ts
type RecoveryState = "idle" | "sending" | "sent" | "error";
```

Validação local:

```ts
function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Informe seu e-mail.";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Informe um e-mail válido.";
  return null;
}
```

Ao sucesso mostrar:

```tsx
<p>Se existir uma conta com esse e-mail, enviaremos as instruções para redefinir sua senha.</p>
<p>Confira {maskEmail(email)} e também a pasta de spam.</p>
```

Implementar cooldown visual de 45 segundos para reenvio sem prometer que ele seja a proteção real contra abuso.

- [ ] **Step 4: Run GREEN**

```bash
bun test src/test/auth/password-recovery-ui-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/esqueci-senha src/test/auth/password-recovery-ui-contract.test.ts
git commit -m "feat(auth): adiciona tela dedicada de esqueci senha"
```

---

### Task 5: Criar rota `/redefinir-senha` e validar link

**Files:**
- Create: `src/app/redefinir-senha/page.tsx`
- Create: `src/app/redefinir-senha/password-reset-form.tsx`
- Modify: `src/test/auth/password-recovery-ui-contract.test.ts`

**Interfaces:**
- Consumes: `verifyPasswordReset(code)`
- Consumes: `completePasswordReset(code, password)`
- Consumes: `validateSignupPassword(password, deps)`
- Produces: public route `/redefinir-senha`

- [ ] **Step 1: Write failing contracts**

```ts
it("redefinicao cobre link ausente, expirado e sucesso sem vazar parametros", () => {
  const form = source("src/app/redefinir-senha/password-reset-form.tsx");
  expect(form).toContain("verifyPasswordReset");
  expect(form).toContain("completePasswordReset");
  expect(form).toContain("Esse link não é mais válido");
  expect(form).toContain("Entrar no DocFácil");
  expect(form).not.toContain("Firebase");
  expect(form).not.toContain("apiKey");
});
```

- [ ] **Step 2: Run RED**

```bash
bun test src/test/auth/password-recovery-ui-contract.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement link parsing and validation**

Ler apenas no client:

```ts
const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");
const code = params.get("oobCode");
```

Aceitar apenas `mode === "resetPassword"` e `code` não vazio. Não renderizar os valores.

Estados:

```ts
type ResetState = "checking" | "form" | "saving" | "success" | "invalid" | "error";
```

Ao montar, executar `verifyPasswordReset(code)`. Qualquer código inválido/expirado deve cair em `invalid` com copy humana.

- [ ] **Step 4: Validate matching passwords and policy**

Antes de confirmar:

```ts
if (password !== confirmation) {
  setError("As senhas não coincidem.");
  return;
}

const policyError = await validateSignupPassword(password, {
  validateFirebasePassword: () => validatePassword(auth!, password),
});
if (policyError) {
  setError(policyError);
  return;
}
```

A UI nunca cita o nome do provedor.

- [ ] **Step 5: Confirm and show success**

```ts
await completePasswordReset(code, password);
setState("success");
```

CTA final:

```tsx
<a href="/?view=login">Entrar no DocFácil</a>
```

- [ ] **Step 6: Run GREEN**

```bash
bun test src/test/auth/password-recovery-ui-contract.test.ts src/test/auth/password-reset.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/redefinir-senha src/test/auth/password-recovery-ui-contract.test.ts
git commit -m "feat(auth): adiciona redefinicao de senha no DocFacil"
```

---

### Task 6: Reusar política de senha sem vazamento técnico

**Files:**
- Modify: `src/lib/auth/password-policy.ts`
- Modify: `src/test/auth/auth-account-hardening-contract.test.ts`
- Modify: `src/test/auth/password-recovery-ui-contract.test.ts`

**Interfaces:**
- Produces: `validateSignupPassword` continua sendo a única tradução pública de requisitos.

- [ ] **Step 1: Write failing copy guards**

```ts
it("mensagens publicas da politica de senha nao citam implementacao", async () => {
  const mod = await loadPolicyModule();
  if (!mod.validateSignupPassword) return;

  const result = await mod.validateSignupPassword("abcdefgh", {
    validateFirebasePassword: async () => ({
      isValid: false,
      containsUppercaseLetter: false,
      containsNumericCharacter: false,
    }),
  });

  expect(result).toContain("letra maiúscula");
  expect(result).toContain("número");
  expect(result).not.toContain("Firebase");
  expect(result).not.toContain("política configurada");
});
```

- [ ] **Step 2: Run RED if necessary**

```bash
bun test src/test/auth/auth-account-hardening-contract.test.ts
```

- [ ] **Step 3: Normalize fallback copy**

Trocar fallback técnico por copy de produto:

```ts
if (requirements.length === 0) {
  return "Escolha uma senha mais forte e tente novamente.";
}
```

- [ ] **Step 4: Run GREEN**

```bash
bun test src/test/auth/auth-account-hardening-contract.test.ts src/test/auth/password-recovery-ui-contract.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/password-policy.ts src/test/auth
git commit -m "fix(auth): remove linguagem tecnica da politica de senha"
```

---

### Task 7: Documentar configuração do e-mail e domínio

**Files:**
- Create: `docs/runbooks/password-reset-email-firebase.md`
- Modify: PR #18 description after implementation

**Interfaces:**
- Produces: runbook operacional para concluir identidade e entregabilidade do e-mail.

- [ ] **Step 1: Create exact runbook**

O runbook deve conter:

```markdown
# E-mail de redefinição de senha — configuração operacional

## Objetivo
Fazer o e-mail de recuperação usar identidade DocFácil e apontar para `/redefinir-senha`.

## Authentication > Templates > Password reset
- Sender name: DocFácil
- Subject: Redefina sua senha do DocFácil
- Action URL / custom handler: https://SEU_DOMINIO/redefinir-senha
- Idioma: pt-BR

## Domínio personalizado
1. Abrir Authentication > Templates > Custom domain.
2. Informar o domínio de envio escolhido.
3. Copiar exatamente os registros TXT/CNAME apresentados pelo console.
4. Criar os registros no DNS sem apagar registros existentes necessários.
5. Garantir que exista apenas um registro SPF consolidado para o domínio.
6. Aguardar verificação e aplicar o domínio aos templates.

## Teste manual
1. Solicitar reset para uma conta real.
2. Confirmar assunto e remetente.
3. Confirmar que o link abre `/redefinir-senha`.
4. Definir nova senha.
5. Entrar com a nova senha.
6. Conferir Caixa de entrada e Spam.
```

Não registrar valores inventados de DNS. Os registros devem ser copiados do Console Firebase no momento da configuração.

- [ ] **Step 2: Commit**

```bash
git add docs/runbooks/password-reset-email-firebase.md
git commit -m "docs: adiciona runbook do email de recuperacao"
```

---

### Task 8: Verificação completa e preparação da PR

**Files:**
- No source file required unless a gate reveals a bug.

**Interfaces:**
- Produces: HEAD verificável e PR #18 pronta para teste manual.

- [ ] **Step 1: Run focused auth tests**

```bash
bun test src/test/auth
```

Expected: PASS.

- [ ] **Step 2: Run full unit suite**

```bash
bun test
```

Expected: PASS.

- [ ] **Step 3: Run Firestore Rules**

```bash
bun run test:rules
```

Expected: PASS in CI/emulator environment.

- [ ] **Step 4: Run lint**

```bash
bun run lint
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

```bash
bun run typecheck
```

Expected: PASS.

- [ ] **Step 6: Run production build**

```bash
bun run build:ci
```

Expected: PASS with both `/esqueci-senha` and `/redefinir-senha` in route output.

- [ ] **Step 7: Run Guest E2E**

```bash
bun run e2e
```

Expected: existing guest creation/checkout/magic-link/download flow remains green.

- [ ] **Step 8: Verify public-copy guard**

Search changed public UI files for forbidden terms:

```bash
grep -RniE "Firebase|Firestore|oobCode|apiKey|Bearer|App Check|R2" \
  src/app/esqueci-senha \
  src/app/redefinir-senha \
  src/components/docfacil/auth \
  src/components/docfacil/views/login-view.tsx
```

Expected: no user-visible occurrences.

- [ ] **Step 9: Verify Vercel preview**

Confirm the exact HEAD deployment is `READY` and manually open:

```text
/esqueci-senha
/redefinir-senha
```

- [ ] **Step 10: Update PR #18**

PR body must record:

```text
- recuperação em rota dedicada
- redefinição em rota dedicada
- handler customizado pronto para template de e-mail
- copy pública sem detalhes técnicos
- runbook de domínio/remetente/template
- verificação de e-mail permanece fora de escopo
- configuração DNS/template continua pendência operacional até validação manual
```

Keep PR in draft until the real e-mail is tested end-to-end.

---

## Self-Review

### Spec coverage

- Solicitação dedicada: Task 4.
- Redefinição dedicada: Task 5.
- Handler de código: Tasks 1 and 5.
- Feedback neutro/anti-enumeração: Tasks 1 and 4.
- Animação + reduced motion: Task 3.
- Política de senha: Tasks 5 and 6.
- Sem login automático: Task 5.
- Sem vazamento técnico: Tasks 3, 4, 5, 6 and 8.
- Template/domínio/DNS: Task 7.
- Teste real e PR draft até validação: Task 8.
- Verificação de e-mail fora de escopo: Global Constraints and Task 8.

### Placeholder scan

O plano não contém `TBD`, `TODO`, dados DNS inventados ou passos genéricos de implementação. Registros DNS são deliberadamente lidos do Console no momento operacional, pois seus valores não existem no repositório e não devem ser fabricados.

### Type consistency

As funções compartilhadas mantêm assinaturas únicas em todas as tarefas:

```ts
requestPasswordReset(email: string): Promise<void>
verifyPasswordReset(code: string): Promise<{ email: string }>
completePasswordReset(code: string, newPassword: string): Promise<void>
maskEmail(email: string): string
```
