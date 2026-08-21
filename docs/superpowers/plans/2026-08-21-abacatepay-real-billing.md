# AbacatePay Real Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o billing demo do DocFácil/Ninhal por pagamentos reais via AbacatePay v2, com PIX transparente para avulso, cartão hospedado, assinatura Pro recorrente e webhooks server-authoritative.

**Architecture:** O Firestore continua sendo a fonte de verdade de ordens e entitlement. A AbacatePay fica atrás de um `BillingProvider` server-only; retornos do navegador nunca concedem acesso. Webhooks autenticados por secret + HMAC promovem ordens e assinaturas de forma idempotente, preservando o lifecycle atômico existente de reserva/consumo do documento avulso.

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Bun 1.3.14, Firebase Auth/Admin + Firestore, Zod 4, Vercel, AbacatePay REST API v2, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-21-abacatepay-real-billing-design.md`

## Global Constraints

- Prerequisite: PR #20 must be GREEN and preferably merged before implementation starts.
- Canonical prices remain exactly `avulso=1990` cents and `pro=3990` cents from `src/lib/pricing.ts`.
- Avulso PIX is transparent inside the app; avulso card is hosted by AbacatePay.
- Pro is hosted subscription; CARD enabled first, PIX behind `ABACATEPAY_SUBSCRIPTION_PIX_ENABLED=false` until Dev Mode proves completed + renewed + cancelled.
- No browser code may receive `ABACATEPAY_API_KEY`, webhook secret, signing key or provider-only references not needed for UX.
- Return/completion URLs never mark orders paid.
- A valid webhook must pass URL secret, HMAC, v2 envelope, environment and financial invariant checks before granting entitlement.
- Webhook processing must be idempotent by provider event ID.
- Existing avulso `reserve -> consume` transaction remains authoritative and must not be weakened.
- No boleto, installments, coupons, Apple Pay, Google Pay, PicPay, transparent card, split, automated payouts or automatic product creation in this plan.
- Do not add the AbacatePay SDK unless native `fetch` proves insufficient; YAGNI favors a small typed server client.
- Preserve existing PII log sanitization; never log raw webhook bodies or Pix QR payloads.

---

## File Structure

### New files

- `src/lib/server/billing/provider.ts` — provider-neutral contracts and factory.
- `src/lib/server/billing/subscription.ts` — subscription record, access-window helpers and entitlement helper.
- `src/lib/server/billing/abacate/client.ts` — authenticated REST client for AbacatePay v2.
- `src/lib/server/billing/abacate/provider.ts` — maps provider-neutral operations to transparent checkout, hosted checkout and subscriptions.
- `src/lib/server/billing/abacate/webhook.ts` — signature verification, minimal event parsing and event-specific invariant extraction.
- `src/app/api/checkout/create/route.ts` — real checkout creation route.
- `src/app/api/checkout/status/route.ts` — local order status route for Pix/return polling.
- `src/app/api/webhooks/abacatepay/route.ts` — authenticated webhook endpoint.
- `src/app/api/subscriptions/cancel/route.ts` — owner-only Pro cancellation.
- `src/test/server/billing/abacate-client.test.ts`
- `src/test/server/billing/abacate-provider.test.ts`
- `src/test/server/billing/abacate-webhook.test.ts`
- `src/test/server/billing/subscription-entitlement.test.ts`
- `src/test/server/billing/checkout-status.test.ts`
- `src/test/server/billing/real-checkout-route.test.ts`
- `src/test/server/billing/subscription-cancel.test.ts`
- `e2e/abacatepay-devmode.spec.ts`

### Existing files to modify

- `src/lib/server/domain/documents.ts` — expand `OrderRecord` provider/payment fields.
- `src/lib/server/firestore/interfaces.ts` — order lookup/update plus subscription/webhook repositories.
- `src/lib/server/firestore/repositories.ts` — Firestore implementations and atomic webhook commit.
- `src/lib/server/firestore/in-memory-repositories.ts` — test doubles for new contracts.
- `src/lib/server/env.ts` — AbacatePay server-only configuration.
- `src/lib/server/config/assert-production-config.ts` — fail closed when real billing is selected without required secrets.
- `src/lib/server/billing/entitlement.ts` — real Pro access-window enforcement.
- `src/lib/server/billing/account-plan.ts` — update cached plan plus subscription projection.
- `src/lib/services/checkout-service.ts` — typed Pix/redirect result instead of hard-coded legacy providers.
- `src/components/docfacil/views/checkout-view.tsx` — payment method selection, Pix QR state and hosted redirect.
- `src/components/docfacil/views/perfil-view.tsx` — real subscription state/cancel action.
- `src/lib/types.ts` — UI projection of subscription state if needed.
- `firestore.rules` — deny direct client access to new billing collections.
- `.github/workflows/ci.yml` — only if a dedicated test command is needed; prefer existing gates.

---

### Task 0: Base Gate Before Money Code

**Files:** none unless PR #20 needs a separate fix outside this plan.

**Interfaces:**
- Consumes: PR #20 head and existing CI.
- Produces: a GREEN base commit from which the billing branch is created.

- [ ] **Step 1: Verify the current PR #20 CI is GREEN**

Run/inspect:

```bash
bun run test
bun run test:rules
bun run test:firestore-commit
bun run lint
bun run typecheck
bun run build:ci
bun run test:e2e
```

Expected: all required gates PASS. If `Production Server Configuration Assertions` still fail around `ALLOW_IN_MEMORY_REPOSITORIES`, stop and fix that in the existing PR, not in this billing branch.

- [ ] **Step 2: Merge or pin the exact GREEN base SHA**

Record it at the top of the implementation PR description:

```text
Billing implementation base: <GREEN_SHA>
```

- [ ] **Step 3: Create isolated implementation branch/worktree**

Use `superpowers:using-git-worktrees` at execution time and create:

```bash
git switch -c feat/abacatepay-real-billing
```

Expected: working tree clean and based on the GREEN lifecycle code.

---

### Task 1: Expand the Billing Domain Without Changing Behavior

**Files:**
- Modify: `src/lib/server/domain/documents.ts`
- Create: `src/lib/server/billing/subscription.ts`
- Modify: `src/lib/server/firestore/interfaces.ts`
- Modify: `src/lib/server/firestore/in-memory-repositories.ts`
- Test: `src/test/server/billing/subscription-entitlement.test.ts`
- Test: existing `src/lib/server/billing/demo-provider.test.ts`

**Interfaces:**
- Consumes: existing `OrderRecord`, `IOrdersRepository`, `DemoBillingProvider`.
- Produces: `BillingProviderName`, `PaymentMethod`, provider refs on `OrderRecord`, `BillingSubscriptionRecord`, `IBillingSubscriptionsRepository`, `IBillingWebhookEventsRepository`.

- [ ] **Step 1: Write failing domain tests for expanded order compatibility**

Add assertions equivalent to:

```ts
const order: OrderRecord = {
  provider: "abacatepay",
  product: "avulso",
  amountCents: 1990,
  buyer: { type: "guest", email: "cliente@example.com" },
  status: "pending",
  method: "pix",
  providerPaymentId: "pix_char_123",
  providerDevMode: true,
  createdAt: 1,
};

expect(order.provider).toBe("abacatepay");
expect(order.method).toBe("pix");
```

Also keep one existing demo-order test compiling unchanged.

- [ ] **Step 2: Run focused tests and observe RED**

```bash
bun test src/lib/server/billing/demo-provider.test.ts src/test/server/billing/subscription-entitlement.test.ts
```

Expected: compile/type failure because provider/order/subscription types do not exist yet.

- [ ] **Step 3: Expand `OrderRecord` minimally**

Implement in `documents.ts`:

```ts
export type BillingProviderName = "demo" | "abacatepay";
export type PaymentMethod = "pix" | "card";

export interface OrderRecord {
  id?: string;
  provider: BillingProviderName;
  product: "avulso" | "pro";
  amountCents: number;
  buyer:
    | { type: "guest"; email?: string; phone?: string }
    | { type: "user"; userId: string; email?: string };
  status: OrderStatus;
  method?: PaymentMethod;
  providerPaymentId?: string;
  providerCheckoutId?: string;
  providerSubscriptionId?: string;
  providerStatus?: string;
  providerDevMode?: boolean;
  pix?: {
    brCode: string;
    brCodeBase64: string;
    expiresAt: number;
  };
  documentId?: string;
  reservedByRequestId?: string;
  reservedAt?: number;
  createdAt: number;
  paidAt?: number;
  consumedAt?: number;
}
```

- [ ] **Step 4: Add subscription types and pure access helper**

Create `subscription.ts`:

```ts
export interface BillingSubscriptionRecord {
  userId: string;
  provider: "abacatepay";
  providerSubscriptionId: string;
  providerCheckoutId?: string;
  providerProductId: string;
  product: "pro";
  method: "pix" | "card";
  status: "active" | "cancelled" | "past_due";
  autoRenew: boolean;
  amountCents: 3990;
  paidThrough: number;
  lastPaidAt: number;
  lastPaymentId?: string;
  lastFailureAt?: number;
  createdAt: number;
  updatedAt: number;
}

export function hasCurrentProAccess(
  subscription: BillingSubscriptionRecord | null | undefined,
  now = Date.now()
): boolean {
  return Boolean(subscription && subscription.paidThrough > now);
}
```

- [ ] **Step 5: Extend repository interfaces without Firestore implementation yet**

Add exact capabilities:

```ts
export interface IBillingSubscriptionsRepository {
  getByUserId(userId: string): Promise<BillingSubscriptionRecord | null>;
  getByProviderSubscriptionId(id: string): Promise<BillingSubscriptionRecord | null>;
  upsert(record: BillingSubscriptionRecord): Promise<void>;
}

export interface IBillingWebhookEventsRepository {
  exists(eventId: string): Promise<boolean>;
}
```

Extend `IOrdersRepository` with:

```ts
updateProviderRefs(orderId: string, refs: Partial<Pick<OrderRecord,
  "method" | "providerPaymentId" | "providerCheckoutId" |
  "providerSubscriptionId" | "providerStatus" | "providerDevMode" | "pix"
>>): Promise<OrderRecord>;

findByProviderCheckoutId(providerCheckoutId: string): Promise<OrderRecord | null>;
```

- [ ] **Step 6: Add in-memory implementations and run GREEN**

```bash
bun test src/lib/server/billing/demo-provider.test.ts src/test/server/billing/subscription-entitlement.test.ts src/lib/server/firestore/repositories.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/domain/documents.ts src/lib/server/billing/subscription.ts src/lib/server/firestore/interfaces.ts src/lib/server/firestore/in-memory-repositories.ts src/test/server/billing/subscription-entitlement.test.ts
git commit -m "refactor(billing): prepare real provider domain"
```

---

### Task 2: Add Fail-Closed AbacatePay Configuration

**Files:**
- Modify: `src/lib/server/env.ts`
- Modify: `src/lib/server/config/assert-production-config.ts`
- Test: `src/lib/server/env.test.ts`
- Test: `src/test/server/config/production-config.test.ts`

**Interfaces:**
- Consumes: `ServerEnv`, production config assertion.
- Produces: parsed AbacatePay config and `isAbacatePayConfigured()` semantics.

- [ ] **Step 1: Write RED tests for new env variables**

Test that parsing accepts:

```ts
{
  ABACATEPAY_API_KEY: "dev_test_key",
  ABACATEPAY_WEBHOOK_SECRET: "secret-value",
  ABACATEPAY_WEBHOOK_HMAC_KEY: "public-signing-key",
  ABACATEPAY_AVULSO_PRODUCT_ID: "prod_avulso",
  ABACATEPAY_PRO_PRODUCT_ID: "prod_pro",
  ABACATEPAY_SUBSCRIPTION_PIX_ENABLED: "false"
}
```

and that final production with `NEXT_PUBLIC_CHECKOUT_PROVIDER=abacatepay` fails if any required server secret/product ID is missing.

- [ ] **Step 2: Run RED**

```bash
bun test src/lib/server/env.test.ts src/test/server/config/production-config.test.ts
```

Expected: missing fields/assertions.

- [ ] **Step 3: Extend `serverEnvSchema`**

Add:

```ts
ABACATEPAY_API_KEY: z.string().min(1).optional(),
ABACATEPAY_WEBHOOK_SECRET: z.string().min(16).optional(),
ABACATEPAY_WEBHOOK_HMAC_KEY: z.string().min(1).optional(),
ABACATEPAY_AVULSO_PRODUCT_ID: z.string().min(1).optional(),
ABACATEPAY_PRO_PRODUCT_ID: z.string().min(1).optional(),
ABACATEPAY_SUBSCRIPTION_PIX_ENABLED: booleanString.default(false),
NEXT_PUBLIC_CHECKOUT_PROVIDER: z.enum(["demo", "abacatepay"]).optional(),
```

- [ ] **Step 4: Fail closed only when real provider is selected**

In `assertProductionServerConfig` add the Abacate variables to required configuration when:

```ts
const usesRealBilling = env.NEXT_PUBLIC_CHECKOUT_PROVIDER === "abacatepay";
```

Do not make tests/dev require production secrets when provider is demo.

- [ ] **Step 5: Run GREEN**

```bash
bun test src/lib/server/env.test.ts src/test/server/config/production-config.test.ts
```

Expected: PASS, including the pre-existing in-memory fail-closed tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/env.ts src/lib/server/config/assert-production-config.ts src/lib/server/env.test.ts src/test/server/config/production-config.test.ts
git commit -m "feat(billing): validate AbacatePay server config"
```

---

### Task 3: Implement the Typed AbacatePay REST Client

**Files:**
- Create: `src/lib/server/billing/abacate/client.ts`
- Test: `src/test/server/billing/abacate-client.test.ts`

**Interfaces:**
- Consumes: `getServerEnv()`.
- Produces: `AbacatePayClient.request<T>()`, `AbacatePayApiError`.

- [ ] **Step 1: Write RED tests with injected fetch**

Cover:

```ts
expect(headers.Authorization).toBe("Bearer dev_key");
expect(url).toBe("https://api.abacatepay.com/v2/transparents/create");
```

and provider error mapping:

```ts
await expect(client.request("/x", { method: "POST" }))
  .rejects.toMatchObject({ code: "ABACATEPAY_REQUEST_FAILED" });
```

- [ ] **Step 2: Run RED**

```bash
bun test src/test/server/billing/abacate-client.test.ts
```

- [ ] **Step 3: Implement small server-only client**

Core shape:

```ts
import "server-only";

const BASE_URL = "https://api.abacatepay.com/v2";

type ApiEnvelope<T> = {
  data: T;
  success: boolean | { message?: string };
  error: string | null;
};

export class AbacatePayClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
    if (!response.ok || !body || body.error) {
      throw new BackendError(
        "ABACATEPAY_REQUEST_FAILED",
        502,
        "Não foi possível iniciar o pagamento. Tente novamente."
      );
    }
    return body.data;
  }
}
```

Do not leak provider response bodies into error messages.

- [ ] **Step 4: Add factory using env**

```ts
export function getAbacatePayClient(): AbacatePayClient {
  const env = getServerEnv();
  if (!env.ABACATEPAY_API_KEY) {
    throw new BackendError("BILLING_NOT_CONFIGURED", 503, "Pagamento temporariamente indisponível.");
  }
  return new AbacatePayClient(env.ABACATEPAY_API_KEY);
}
```

- [ ] **Step 5: Run GREEN**

```bash
bun test src/test/server/billing/abacate-client.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/billing/abacate/client.ts src/test/server/billing/abacate-client.test.ts
git commit -m "feat(billing): add AbacatePay REST client"
```

---

### Task 4: Implement Provider-Neutral Checkout Capabilities

**Files:**
- Create: `src/lib/server/billing/provider.ts`
- Create: `src/lib/server/billing/abacate/provider.ts`
- Modify: `src/lib/server/billing/demo-provider.ts`
- Test: `src/test/server/billing/abacate-provider.test.ts`
- Test: existing demo provider tests.

**Interfaces:**
- Consumes: Abacate client, canonical cents.
- Produces: `BillingProvider.createOneTimePayment`, `createSubscription`, `cancelSubscription`.

- [ ] **Step 1: Write RED provider contract tests**

Required one-time Pix call:

```ts
await provider.createOneTimePayment({
  orderId: "order_1",
  product: "avulso",
  amountCents: 1990,
  method: "pix",
  completionUrl: "https://example.com/?billingReturn=1&orderId=order_1",
});
```

Assert request contains:

```json
{
  "method": "PIX",
  "data": {
    "amount": 1990,
    "externalId": "order_1",
    "description": "Documento avulso",
    "expiresIn": 1800,
    "metadata": { "product": "avulso" }
  }
}
```

For card assert `/checkouts/create`, `methods:["CARD"]`, avulso `prod_*`, `externalId=orderId`.

For Pro assert `/subscriptions/create`, exactly one Pro item and `methods:["CARD"]` while capability is false.

- [ ] **Step 2: Run RED**

```bash
bun test src/test/server/billing/abacate-provider.test.ts
```

- [ ] **Step 3: Define provider-neutral interfaces**

```ts
export interface CreateOneTimePaymentInput {
  orderId: string;
  product: "avulso";
  amountCents: number;
  method: "pix" | "card";
  completionUrl: string;
}

export type OneTimePaymentResult =
  | { kind: "pix"; providerPaymentId: string; brCode: string; brCodeBase64: string; expiresAt: string; devMode: boolean }
  | { kind: "hosted"; providerCheckoutId: string; checkoutUrl: string; devMode: boolean };

export interface CreateSubscriptionInput {
  orderId: string;
  amountCents: number;
  methods: Array<"pix" | "card">;
  completionUrl: string;
}
```

- [ ] **Step 4: Implement `AbacatePayBillingProvider`**

Map:

```text
pix avulso -> POST /transparents/create
card avulso -> POST /checkouts/create
pro -> POST /subscriptions/create
cancel -> POST /subscriptions/cancel
```

Reject if caller supplies an amount inconsistent with canonical product price even though route should already derive it.

- [ ] **Step 5: Keep demo compatibility**

Do not route real production through `simulatePayment`. Adapt the demo provider/factory to the new interface only as much as needed to keep Preview QA and existing tests intact.

- [ ] **Step 6: Run GREEN**

```bash
bun test src/test/server/billing/abacate-provider.test.ts src/lib/server/billing/demo-provider.test.ts src/lib/server/billing/demo-checkout.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/billing/provider.ts src/lib/server/billing/abacate/provider.ts src/lib/server/billing/demo-provider.ts src/test/server/billing/abacate-provider.test.ts
git commit -m "feat(billing): implement AbacatePay provider"
```

---

### Task 5: Persist Provider References in Firestore

**Files:**
- Modify: `src/lib/server/firestore/repositories.ts`
- Modify: `src/lib/server/firestore/in-memory-repositories.ts`
- Test: `src/lib/server/firestore/repositories.test.ts`

**Interfaces:**
- Consumes: Task 1 repository methods.
- Produces: lookup by provider checkout ID and update of provider/Pix references.

- [ ] **Step 1: Write RED repository tests**

```ts
const created = await orders.createOrder({...});
await orders.updateProviderRefs(created.id!, {
  method: "card",
  providerCheckoutId: "bill_123",
});
expect((await orders.findByProviderCheckoutId("bill_123"))?.id).toBe(created.id);
```

Also verify Pix fields round-trip.

- [ ] **Step 2: Run RED**

```bash
bun test src/lib/server/firestore/repositories.test.ts
```

- [ ] **Step 3: Implement in-memory methods**

Update a copied record and never mutate caller-owned objects.

- [ ] **Step 4: Implement Firestore methods**

`findByProviderCheckoutId`:

```ts
const snap = await this.db.collection("orders")
  .where("providerCheckoutId", "==", providerCheckoutId)
  .limit(1)
  .get();
```

`updateProviderRefs` must reject unknown order IDs and return the updated order.

- [ ] **Step 5: Run GREEN**

```bash
bun test src/lib/server/firestore/repositories.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/firestore/repositories.ts src/lib/server/firestore/in-memory-repositories.ts src/lib/server/firestore/repositories.test.ts
git commit -m "feat(billing): persist provider payment references"
```

---

### Task 6: Replace the Demo-Only Checkout Route With Real Creation + Safe Status

**Files:**
- Create: `src/app/api/checkout/create/route.ts`
- Create: `src/app/api/checkout/status/route.ts`
- Modify: `src/lib/services/checkout-service.ts`
- Test: `src/test/server/billing/real-checkout-route.test.ts`
- Test: `src/test/server/billing/checkout-status.test.ts`
- Preserve: `src/app/api/checkout/demo/route.ts`

**Interfaces:**
- Consumes: provider, orders repo, auth/App Check, `PLAN_PRICES`.
- Produces: typed `pix | redirect` checkout result and local status polling API.

- [ ] **Step 1: Write RED route tests**

Input schema:

```ts
{
  product: "avulso" | "pro",
  method: "pix" | "card",
  guestContact?: { email?: string; phone?: string }
}
```

Tests must prove:

```text
browser-supplied amount is ignored/not accepted
Pro guest -> 401/403
avulso guest without contact -> 400
avulso Pix -> order created before provider call
provider failure -> local order not marked paid
return URL is derived from trusted request origin, not body URL
```

- [ ] **Step 2: Run RED**

```bash
bun test src/test/server/billing/real-checkout-route.test.ts src/test/server/billing/checkout-status.test.ts
```

- [ ] **Step 3: Implement real create route**

Core ordering:

```ts
const amountCents = planPriceToCents(product);
const order = await repos.orders.createOrder({
  provider: "abacatepay",
  product,
  amountCents,
  buyer,
  method,
  status: "pending",
  createdAt: Date.now(),
});

const origin = new URL(req.url).origin;
const completionUrl = `${origin}/?view=checkout&billingReturn=1&orderId=${encodeURIComponent(order.id!)}`;
```

Then call provider and persist refs. For Pix persist QR response in server-only order so refresh can recover the same pending charge instead of creating another one.

- [ ] **Step 4: Implement status route with ownership**

Prefer `POST /api/checkout/status` so guest contact is not placed in URL logs:

```ts
const statusSchema = z.object({
  orderId: z.string().min(1),
  guestContact: z.object({
    email: z.string().email().optional(),
    phone: z.string().min(8).optional(),
  }).optional(),
});
```

Use the existing order identity/fingerprint helper. Response must be deliberately small:

```ts
{
  orderId,
  product,
  status,
  method,
  pix: pendingPix ? { brCode, brCodeBase64, expiresAt } : undefined
}
```

Never return API keys or provider subscription IDs.

- [ ] **Step 5: Update client checkout service to a discriminated union**

```ts
export type CheckoutResult =
  | { kind: "pix"; orderId: string; product: CheckoutPlan; amount: number; brCode: string; brCodeBase64: string; expiresAt: number }
  | { kind: "redirect"; orderId: string; product: CheckoutPlan; amount: number; checkoutUrl: string }
  | { kind: "demo"; ... };
```

Remove legacy provider union `kirvano | perfectpay | stripe`; active real provider is `abacatepay`.

- [ ] **Step 6: Run GREEN and auth regression tests**

```bash
bun test src/test/server/billing/real-checkout-route.test.ts src/test/server/billing/checkout-status.test.ts src/test/auth/authenticated-api-contract.test.ts src/test/documents/guest-checkout-contract.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/checkout/create/route.ts src/app/api/checkout/status/route.ts src/lib/services/checkout-service.ts src/test/server/billing/real-checkout-route.test.ts src/test/server/billing/checkout-status.test.ts
git commit -m "feat(billing): create real checkout sessions"
```

---

### Task 7: Authenticate Webhooks Before Any Business Logic

**Files:**
- Create: `src/lib/server/billing/abacate/webhook.ts`
- Create: `src/app/api/webhooks/abacatepay/route.ts`
- Test: `src/test/server/billing/abacate-webhook.test.ts`

**Interfaces:**
- Consumes: webhook secret/signing env.
- Produces: `verifyWebhookRequest(rawBody, urlSecret, signature)`, minimal `AbacateWebhookEnvelope`.

- [ ] **Step 1: Write RED signature/security tests**

Cover:

```text
missing query secret -> 401
wrong query secret -> 401
missing X-Webhook-Signature -> 401
bad HMAC -> 401
valid HMAC but apiVersion != 2 -> 400
valid event from wrong devMode -> 409/400 and no state mutation
unknown authenticated event -> 200 ignored
```

Use a test signing key and build the signature with Node `createHmac("sha256", key).digest("base64")`.

- [ ] **Step 2: Run RED**

```bash
bun test src/test/server/billing/abacate-webhook.test.ts
```

- [ ] **Step 3: Implement constant-time comparisons**

Use `crypto.timingSafeEqual` after checking equal buffer lengths for URL secret and HMAC string comparison.

- [ ] **Step 4: Parse only a minimal envelope**

Do not rigidly validate every provider field. Validate only:

```ts
{
  id: string;
  event: string;
  apiVersion: number;
  devMode: boolean;
  data: unknown;
}
```

Then event-specific functions validate the fields they consume.

- [ ] **Step 5: Implement route with raw body first**

```ts
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature");
  const url = new URL(req.url);
  // verify before JSON.parse
}
```

- [ ] **Step 6: Run GREEN**

```bash
bun test src/test/server/billing/abacate-webhook.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/billing/abacate/webhook.ts src/app/api/webhooks/abacatepay/route.ts src/test/server/billing/abacate-webhook.test.ts
git commit -m "feat(billing): authenticate AbacatePay webhooks"
```

---

### Task 8: Process Avulso Payment Events Atomically and Idempotently

**Files:**
- Modify: `src/lib/server/firestore/interfaces.ts`
- Modify: `src/lib/server/firestore/repositories.ts`
- Modify: `src/lib/server/firestore/in-memory-repositories.ts`
- Modify: `src/app/api/webhooks/abacatepay/route.ts`
- Test: `src/test/server/billing/abacate-webhook.test.ts`
- Test: new/extend Firestore integration test.

**Interfaces:**
- Consumes: authenticated webhook envelope, order refs.
- Produces: `processAbacateWebhookEvent()` and atomic event+order commit.

- [ ] **Step 1: Write RED happy-path test for `transparent.completed`**

Fixture must contain:

```ts
{
  id: "log_pix_1",
  event: "transparent.completed",
  apiVersion: 2,
  devMode: true,
  data: {
    transparent: {
      id: "pix_char_1",
      externalId: order.id,
      amount: 1990,
      paidAmount: 1990,
      status: "PAID",
      methods: ["PIX"],
      devMode: true,
    }
  }
}
```

Expected: order `paid`, `paidAt` set, event recorded once.

- [ ] **Step 2: Add RED adversarial cases**

```text
amount=1989 -> not paid
paidAmount<1990 -> not paid
wrong order product -> not paid
wrong method -> not paid
wrong devMode -> not paid
duplicate log id -> 200, no second mutation
```

Add card fixture for `checkout.completed` that validates configured avulso product ID.

- [ ] **Step 3: Define atomic repository operation**

Prefer one explicit method instead of orchestrating multiple repositories outside a transaction:

```ts
export interface ApplyOneTimePaymentEventInput {
  eventId: string;
  eventName: string;
  devMode: boolean;
  orderId: string;
  expectedProduct: "avulso";
  expectedAmountCents: 1990;
  providerPaymentId?: string;
  providerCheckoutId?: string;
  providerStatus: string;
  paidAt: number;
}

applyOneTimePaymentEvent(input: ApplyOneTimePaymentEventInput): Promise<"processed" | "duplicate">;
```

- [ ] **Step 4: Implement Firestore transaction**

Within one transaction:

```text
read billing_webhook_events/eventId
read orders/orderId
if event exists -> duplicate
validate order still pending/paid-compatible
update order -> paid
create billing_webhook_events/eventId
```

Never downgrade `consumed` back to `paid` on a late duplicate.

- [ ] **Step 5: Handle refund/dispute without deleting documents**

Implement minimal financial state projection:

```text
*.refunded -> order.status=refunded when safe; retain document artifact
*.disputed/*.lost -> providerStatus updated + warning log
```

Do not automate PDF deletion.

- [ ] **Step 6: Run unit + emulator tests**

```bash
bun test src/test/server/billing/abacate-webhook.test.ts
bun run test:firestore-commit
```

Expected: duplicate/concurrent webhook behavior proven.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/firestore/interfaces.ts src/lib/server/firestore/repositories.ts src/lib/server/firestore/in-memory-repositories.ts src/app/api/webhooks/abacatepay/route.ts src/test/server/billing/abacate-webhook.test.ts src/test/server/firestore/generation-commit.firestore.test.ts
git commit -m "feat(billing): confirm avulso by webhook atomically"
```

---

### Task 9: Build the Pix-First Avulso UX

**Files:**
- Modify: `src/components/docfacil/views/checkout-view.tsx`
- Modify: `src/lib/services/checkout-service.ts`
- Test: add `src/test/billing/checkout-view-contract.test.tsx` or nearest UI contract suite.

**Interfaces:**
- Consumes: Task 6 checkout union and status API.
- Produces: Pix QR state, copy button, local polling, hosted card redirect.

- [ ] **Step 1: Write RED UI contract tests**

Assert copy and structure include:

```text
PIX — recomendado
Cartão de crédito
Copiar código Pix
Confirmando pagamento…
```

And prove card never renders a card-number field inside Ninhal.

- [ ] **Step 2: Run RED**

```bash
bun test src/test/billing/checkout-view-contract.test.tsx
```

- [ ] **Step 3: Add explicit method selection**

Use local state:

```ts
const [method, setMethod] = useState<"pix" | "card">("pix");
const [pixPayment, setPixPayment] = useState<PixCheckoutResult | null>(null);
```

- [ ] **Step 4: Render Pix QR directly from provider base64**

```tsx
<img
  src={pixPayment.brCodeBase64}
  alt="QR Code Pix para pagamento do documento"
  className="mx-auto size-56"
/>
```

Do not persist or log the base64 outside the server order/client state needed for UX.

- [ ] **Step 5: Poll only local order status**

Use a 2–3 second interval while pending, abort on unmount, stop on terminal status. Do not poll AbacatePay directly from the browser.

When `paid`, reuse the existing draft/finalization code path with the authoritative `orderId` and rotate the finalization request ID as the current lifecycle requires.

- [ ] **Step 6: Recover after refresh without a second charge**

If `billingReturn/orderId` or stored pending order exists, call status first. If server returns pending Pix details, restore the same QR. Never auto-create a second Pix merely because React remounted.

- [ ] **Step 7: Run GREEN + existing guest checkout tests**

```bash
bun test src/test/billing/checkout-view-contract.test.tsx src/test/documents/guest-checkout-contract.test.ts src/test/documents/paid-order-finalization-policy.test.ts src/test/documents/authenticated-paid-draft.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/components/docfacil/views/checkout-view.tsx src/lib/services/checkout-service.ts src/test/billing/checkout-view-contract.test.tsx
git commit -m "feat(checkout): add Pix-first avulso flow"
```

---

### Task 10: Add Real Pro Subscription Lifecycle

**Files:**
- Modify: `src/lib/server/firestore/interfaces.ts`
- Modify: `src/lib/server/firestore/repositories.ts`
- Modify: `src/lib/server/firestore/in-memory-repositories.ts`
- Modify: `src/lib/server/billing/account-plan.ts`
- Modify: `src/lib/server/billing/entitlement.ts`
- Modify: `src/app/api/webhooks/abacatepay/route.ts`
- Test: `src/test/server/billing/subscription-entitlement.test.ts`
- Test: `src/test/server/billing/abacate-webhook.test.ts`

**Interfaces:**
- Consumes: subscription provider events and current user profile.
- Produces: real `BillingSubscriptionRecord` projection and time-bounded Pro entitlement.

- [ ] **Step 1: Write RED `subscription.completed` test**

Fixture must use:

```ts
subscription: {
  id: "subs_1",
  amount: 3990,
  currency: "BRL",
  method: "CARD",
  status: "ACTIVE",
  frequency: "MONTHLY",
  updatedAt: "2026-08-21T20:00:00.000Z"
},
checkout: {
  id: order.providerCheckoutId,
  items: [{ id: "prod_pro", quantity: 1 }],
  amount: 3990,
  paidAmount: 3990,
  status: "PAID"
}
```

Expected: initial Pro order paid, subscription stored, user projection becomes Pro, `paidThrough > paidAt`.

- [ ] **Step 2: Write RED renewal/cancel/failure tests**

Required behavior:

```text
renewed -> advances paidThrough, idempotent
payment_failed -> records failure/past_due marker but does not remove a still-paid window
cancelled -> autoRenew=false/status cancelled, paidThrough preserved
now > paidThrough -> entitlement is no longer Pro
```

- [ ] **Step 3: Implement calendar-month paid-through helper**

Use `date-fns/addMonths` already available:

```ts
export function nextMonthlyPaidThrough(lastPaidAt: number): number {
  return addMonths(new Date(lastPaidAt), 1).getTime();
}
```

For renewal use:

```ts
Math.max(existing.paidThrough, nextMonthlyPaidThrough(paymentPaidAt));
```

- [ ] **Step 4: Implement subscription repositories**

Firestore path:

```text
billing_subscriptions/{userId}
```

Lookup by provider subscription ID can use an indexed equality query.

- [ ] **Step 5: Update entitlement to require live paid-through for real Pro**

Do not let `userProfile.plano === "pro"` alone grant permanent real access.

Introduce input:

```ts
billingSubscription?: BillingSubscriptionRecord | null;
now?: number;
```

Policy:

```ts
if (userProfile?.plano === "pro" &&
    (isDemoContext || hasCurrentProAccess(billingSubscription, now))) {
  return { entitlement: "pro", watermarked: false };
}
```

Preserve the existing demo path via an explicit demo flag/source, not by accidentally weakening production.

- [ ] **Step 6: Make orchestrator/routes load subscription when resolving entitlement**

Find every server call to `resolveEntitlement` and pass the real subscription for authenticated users. Do not fetch from client.

- [ ] **Step 7: Run GREEN**

```bash
bun test src/test/server/billing/subscription-entitlement.test.ts src/test/server/billing/abacate-webhook.test.ts src/lib/server/billing/entitlement.test.ts src/test/server/documents/watermark-enforcement.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/firestore/interfaces.ts src/lib/server/firestore/repositories.ts src/lib/server/firestore/in-memory-repositories.ts src/lib/server/billing/account-plan.ts src/lib/server/billing/entitlement.ts src/app/api/webhooks/abacatepay/route.ts src/test/server/billing/subscription-entitlement.test.ts src/test/server/billing/abacate-webhook.test.ts
git commit -m "feat(billing): activate time-bounded Pro subscriptions"
```

---

### Task 11: Add Owner-Only Pro Cancellation and Profile Projection

**Files:**
- Create: `src/app/api/subscriptions/cancel/route.ts`
- Modify: `src/components/docfacil/views/perfil-view.tsx`
- Modify: `src/lib/types.ts`
- Test: `src/test/server/billing/subscription-cancel.test.ts`
- Test: UI contract test for profile.

**Interfaces:**
- Consumes: current authenticated user's subscription.
- Produces: safe cancellation action that stops future charges but preserves paid-through access.

- [ ] **Step 1: Write RED route tests**

Prove:

```text
guest -> rejected
user without subscription -> 404/409
user cannot pass arbitrary providerSubscriptionId for another account
provider cancel is called only with subscription linked to authenticated user
local subscription is not granted extra time by cancel request
```

- [ ] **Step 2: Run RED**

```bash
bun test src/test/server/billing/subscription-cancel.test.ts
```

- [ ] **Step 3: Implement cancel route**

Input can be empty; derive everything from authenticated principal:

```ts
const user = requireUser(await resolvePrincipal(req));
const subscription = await repos.billingSubscriptions.getByUserId(user.userId);
await provider.cancelSubscription(subscription.providerSubscriptionId);
```

Do not trust a subscription ID from browser input.

The webhook remains the preferred confirmation of provider state. The route may optimistically mark `autoRenew=false` only after successful provider response, while preserving `paidThrough`.

- [ ] **Step 4: Project subscription to profile UI**

Expose via a server-backed profile/billing status path only the necessary fields:

```ts
{
  plan: "pro",
  method: "card" | "pix",
  autoRenew: boolean,
  accessUntil: number,
  status: "active" | "cancelled" | "past_due"
}
```

- [ ] **Step 5: Update profile copy accurately**

If cancelled but paid-through remains:

```text
Pro ativo até 21/09/2026
Renovação cancelada
```

Do not say access ended immediately if it did not.

- [ ] **Step 6: Run GREEN**

```bash
bun test src/test/server/billing/subscription-cancel.test.ts src/test/billing/profile-subscription-contract.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/subscriptions/cancel/route.ts src/components/docfacil/views/perfil-view.tsx src/lib/types.ts src/test/server/billing/subscription-cancel.test.ts src/test/billing/profile-subscription-contract.test.tsx
git commit -m "feat(billing): let users cancel Pro safely"
```

---

### Task 12: Lock New Billing Collections With Firestore Rules

**Files:**
- Modify: `firestore.rules`
- Modify: `src/test/rules/firestore.rules.test.ts`

**Interfaces:**
- Consumes: `billing_subscriptions`, `billing_webhook_events` Firestore paths.
- Produces: client-deny, server-only billing storage.

- [ ] **Step 1: Write RED rules tests**

Attempt direct Firebase client reads/writes to:

```text
/billing_subscriptions/{uid}
/billing_webhook_events/{eventId}
```

Expected: denied for owner and non-owner alike.

- [ ] **Step 2: Run RED**

```bash
bun run test:rules
```

- [ ] **Step 3: Add explicit server-only locks**

Follow existing style for `orders`, `generation_requests`, `access_links`:

```rules
match /billing_subscriptions/{document=**} {
  allow read, write: if false;
}

match /billing_webhook_events/{document=**} {
  allow read, write: if false;
}
```

- [ ] **Step 4: Run GREEN**

```bash
bun run test:rules
```

- [ ] **Step 5: Commit**

```bash
git add firestore.rules src/test/rules/firestore.rules.test.ts
git commit -m "test(security): lock billing collections server-side"
```

---

### Task 13: Prove Webhook Concurrency With the Firestore Emulator

**Files:**
- Create or extend: `src/test/server/firestore/billing-webhook.firestore.test.ts`
- Modify test scripts only if necessary.

**Interfaces:**
- Consumes: atomic webhook repository operations.
- Produces: emulator proof against duplicate/concurrent provider delivery.

- [ ] **Step 1: Write RED concurrent webhook test**

Run the same `eventId` twice concurrently:

```ts
const [a, b] = await Promise.all([
  repo.applyOneTimePaymentEvent(input),
  repo.applyOneTimePaymentEvent(input),
]);

expect([a, b].sort()).toEqual(["duplicate", "processed"]);
```

Assert one event doc and one final order transition.

- [ ] **Step 2: Add concurrent subscription activation test**

Two simultaneous `subscription.completed` deliveries must result in one subscription record with one paid-through advancement, not two months.

- [ ] **Step 3: Run RED then implement any transaction corrections**

```bash
firebase emulators:exec --only firestore "RUN_FIRESTORE_BILLING_TESTS=true bun test src/test/server/firestore/billing-webhook.firestore.test.ts"
```

- [ ] **Step 4: Run all Firestore gates**

```bash
bun run test:rules
bun run test:firestore-commit
firebase emulators:exec --only firestore "RUN_FIRESTORE_BILLING_TESTS=true bun test src/test/server/firestore/billing-webhook.firestore.test.ts"
```

- [ ] **Step 5: Commit**

```bash
git add src/test/server/firestore/billing-webhook.firestore.test.ts package.json
git commit -m "test(billing): prove webhook idempotency in Firestore"
```

Only add a `package.json` script if it improves repeatability; otherwise do not touch it.

---

### Task 14: Dev Mode Integration Test and PIX Subscription Capability Gate

**Files:**
- Create: `e2e/abacatepay-devmode.spec.ts`
- Modify: test setup/config only if necessary.
- No production key is used.

**Interfaces:**
- Consumes: deployed Preview URL, Dev Mode API key/products/webhook.
- Produces: real provider evidence that documented flows work against AbacatePay.

- [ ] **Step 1: Create Dev Mode products manually**

Using dashboard or API with a development/admin key, create:

```text
ninhal-avulso-v1 = 1990 BRL, no cycle
ninhal-pro-monthly-v1 = 3990 BRL, cycle MONTHLY
```

Record resulting `prod_*` IDs in Vercel Preview env only.

- [ ] **Step 2: Configure Preview secrets**

Required:

```text
NEXT_PUBLIC_CHECKOUT_PROVIDER=abacatepay
ABACATEPAY_API_KEY=<DEV_MODE_KEY>
ABACATEPAY_WEBHOOK_SECRET=<RANDOM_32+_CHAR_SECRET>
ABACATEPAY_WEBHOOK_HMAC_KEY=<CURRENT_DOCUMENTED_SIGNING_KEY>
ABACATEPAY_AVULSO_PRODUCT_ID=<DEV_PROD_ID>
ABACATEPAY_PRO_PRODUCT_ID=<DEV_PRO_ID>
ABACATEPAY_SUBSCRIPTION_PIX_ENABLED=false
```

Secrets must be server-only; use Vercel Sensitive values where supported.

- [ ] **Step 3: Deploy Preview and configure Dev webhook**

Use a stable HTTPS branch alias and subscribe at least to:

```text
transparent.completed
transparent.refunded
transparent.disputed
checkout.completed
checkout.refunded
checkout.disputed
subscription.completed
subscription.renewed
subscription.cancelled
```

Add `subscription.payment_failed` only if the current API/dashboard accepts that event name.

- [ ] **Step 4: Execute real Dev Mode avulso Pix**

Flow:

```text
create pending Pix -> QR visible -> call /v2/transparents/simulate-payment with the created payment id -> webhook arrives -> local order paid -> document finalizes
```

Expected: provider `devMode=true`, one webhook event record, one consumed avulso order after PDF finalization.

- [ ] **Step 5: Execute hosted card happy and failure paths**

Approved card:

```text
4242 4242 4242 4242
future expiry
any 3/4 digit CVV
```

Rejected card: use one current rejected Dev Mode number from the AbacatePay docs.

Expected: approved flow becomes paid only by webhook; rejected flow never grants entitlement.

- [ ] **Step 6: Execute Pro CARD**

Expected:

```text
subscription.completed -> local Pro active -> refreshProfile -> generation without watermark
```

Then cancel through Ninhal and verify renewal disabled while paid-through remains.

- [ ] **Step 7: Probe Pro PIX without enabling production capability**

In Dev Mode only, temporarily call subscription creation with `methods:["PIX"]` from an isolated test/helper, not by toggling production behavior.

Gate requires all four proofs:

```text
creation accepted
subscription.completed method=PIX
subscription.renewed method=PIX
subscription.cancelled method=PIX
```

Only after all four are observed may `ABACATEPAY_SUBSCRIPTION_PIX_ENABLED=true` be considered for Preview/Production.

- [ ] **Step 8: Record evidence in implementation PR**

Include provider IDs with sensitive parts omitted, deployment URL, event names observed and screenshots/log excerpts without secrets/PII.

- [ ] **Step 9: Commit E2E harness**

```bash
git add e2e/abacatepay-devmode.spec.ts
git commit -m "test(billing): cover AbacatePay Dev Mode flows"
```

---

### Task 15: Final Regression Gates and Production Runbook

**Files:**
- Create: `docs/runbooks/abacatepay-production.md`
- Modify docs/copy only if tests expose mismatch.

**Interfaces:**
- Consumes: all implementation tasks.
- Produces: deploy checklist and rollback path.

- [ ] **Step 1: Write the production runbook before enabling the key**

The document must include exact order:

```text
1. Verify account approved for production.
2. Create production avulso + Pro products and record prod_* IDs.
3. Create production API key with minimum required permissions.
4. Set Production sensitive env vars in Vercel.
5. Deploy with provider still demo/off if a staged flag is available.
6. Create production HTTPS webhook with distinct secret.
7. Verify webhook endpoint rejects invalid secret/signature.
8. Enable abacatepay provider.
9. Perform one low-risk real Pix purchase.
10. Confirm Firestore order/event/PDF lifecycle.
11. Perform one real card transaction if acceptable.
12. Confirm subscription only after explicit launch approval.
```

Rollback:

```text
NEXT_PUBLIC_CHECKOUT_PROVIDER -> demo/offline-safe mode
revoke production API key if compromise suspected
keep paid orders already confirmed immutable/auditable
never delete documents as rollback
```

Do not enable fake billing in final production.

- [ ] **Step 2: Run complete unit/domain suite**

```bash
bun run test
```

Expected: 0 failures.

- [ ] **Step 3: Run security and Firestore gates**

```bash
bun run test:rules
bun run test:firestore-commit
```

Expected: PASS.

- [ ] **Step 4: Run static gates**

```bash
bun run lint
bun run typecheck
bun run build:ci
```

Expected: 0 errors; only explicitly accepted pre-existing warnings.

- [ ] **Step 5: Run E2E twice**

```bash
bun run test:e2e
bun run test:e2e
```

Expected: two consecutive green runs, including guest avulso, authenticated avulso, Pro, drafts, versioning and existing document lifecycle.

- [ ] **Step 6: Inspect Vercel Preview runtime errors**

Check the exact deployment for:

```text
/api/checkout/create
/api/checkout/status
/api/webhooks/abacatepay
/api/subscriptions/cancel
```

Expected: no unexplained 5xx; webhook duplicates return 2xx without duplicate mutations.

- [ ] **Step 7: Verify no secret/client leakage**

Search built/client source and repo:

```bash
git grep -n "ABACATEPAY_API_KEY\|ABACATEPAY_WEBHOOK_SECRET\|ABACATEPAY_WEBHOOK_HMAC_KEY"
```

Expected: only server-only modules/tests/docs refer to names; no literal secret values committed.

- [ ] **Step 8: Commit runbook**

```bash
git add docs/runbooks/abacatepay-production.md
git commit -m "docs(billing): add AbacatePay production runbook"
```

- [ ] **Step 9: Request code review**

Use `superpowers:requesting-code-review` and specifically ask reviewer to challenge:

```text
payment authority
webhook signature verification
idempotency
amount/product mismatches
Dev vs Prod isolation
guest order ownership
subscription expiry/cancellation semantics
secret exposure
```

---

## Self-Review Checklist

### Spec coverage

- [x] Avulso PIX transparent.
- [x] Avulso card hosted.
- [x] Pro hosted subscription.
- [x] Pro PIX capability gate.
- [x] Guest avulso preserved.
- [x] Pro authenticated only.
- [x] Server-derived price.
- [x] Webhook authority and HMAC.
- [x] Event idempotency.
- [x] Amount/product/environment validation.
- [x] Existing reserve/consume lifecycle preserved.
- [x] Refund/dispute minimal projection without destructive PDF behavior.
- [x] Cancellation preserves already-paid access window.
- [x] Firestore client locks.
- [x] Preview/Production isolation.
- [x] Dev Mode E2E and rejected card.
- [x] Production runbook and rollback.

### Type consistency

Canonical names used throughout:

```text
BillingProvider
AbacatePayBillingProvider
BillingSubscriptionRecord
IBillingSubscriptionsRepository
IBillingWebhookEventsRepository
OrderRecord.provider = "demo" | "abacatepay"
PaymentMethod = "pix" | "card"
ABACATEPAY_SUBSCRIPTION_PIX_ENABLED
```

### Implementation order

Do not jump directly to UI. The safe order is:

```text
GREEN base
-> domain/config
-> provider client
-> local checkout/order persistence
-> webhook authentication
-> atomic payment processing
-> avulso UX
-> subscription lifecycle
-> cancellation
-> rules/concurrency
-> real Dev Mode E2E
-> production runbook/gates
```
