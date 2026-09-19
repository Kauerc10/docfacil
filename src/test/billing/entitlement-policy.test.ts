import { describe, expect, it } from "bun:test";
import {
  BILLING_TIME_ZONE,
  getStartOfBillingMonthTimestamp,
  countBillingMonthDocuments,
  resolveDocumentWatermark,
  canDownloadClean,
  evaluateCreationEntitlement,
  canCreateDocument,
  remainingDocumentsThisMonth,
} from "@/lib/billing/entitlement-policy";
import { FREE_MONTHLY_LIMIT } from "@/lib/document-access-policy";

describe("entitlement-policy: timezone de faturamento (America/Sao_Paulo)", () => {
  it("tem o fuso horário oficial definido como America/Sao_Paulo", () => {
    expect(BILLING_TIME_ZONE).toBe("America/Sao_Paulo");
  });

  it("calcula o início do mês civil de São Paulo mesmo quando em UTC já virou o mês", () => {
    // 2026-09-01T02:30:00.000Z em UTC é 2026-08-31T23:30:00 em São Paulo (UTC-3).
    // O mês vigente ainda é Agosto de 2026.
    const dateStillInAugustSP = new Date("2026-09-01T02:30:00.000Z");
    const startOfAugustSP = getStartOfBillingMonthTimestamp(dateStillInAugustSP);

    // O início de Agosto em SP é 2026-08-01 00:00:00 BRT = 2026-08-01T03:00:00.000Z
    expect(new Date(startOfAugustSP).toISOString()).toBe("2026-08-01T03:00:00.000Z");
  });

  it("calcula o início de Setembro quando passa da meia-noite em São Paulo", () => {
    // 2026-09-01T03:01:00.000Z em UTC é 2026-09-01T00:01:00 em São Paulo (UTC-3).
    // O mês vigente é Setembro de 2026.
    const dateInSeptemberSP = new Date("2026-09-01T03:01:00.000Z");
    const startOfSeptemberSP = getStartOfBillingMonthTimestamp(dateInSeptemberSP);

    // O início de Setembro em SP é 2026-09-01 00:00:00 BRT = 2026-09-01T03:00:00.000Z
    expect(new Date(startOfSeptemberSP).toISOString()).toBe("2026-09-01T03:00:00.000Z");
  });

  it("conta documentos do mês vigente usando o fuso de São Paulo", () => {
    const now = new Date("2026-09-01T02:30:00.000Z"); // ainda agosto em SP
    const docs = [
      { criadoEm: Date.parse("2026-08-15T10:00:00.000Z") }, // agosto em SP -> conta!
      { criadoEm: Date.parse("2026-07-20T10:00:00.000Z") }, // julho -> não conta
    ];

    expect(countBillingMonthDocuments(docs, now)).toBe(1);
  });
});

describe("entitlement-policy: resolução de marca d'água e download limpo", () => {
  it("respeita documento avulso pago mesmo se a conta atual for grátis", () => {
    const user = { plano: "gratis" as const };
    const docPaid = {
      watermarked: false,
      entitlement: { type: "single_purchase" as const, watermarked: false },
    };

    expect(resolveDocumentWatermark(docPaid, user)).toBe(false);
    expect(canDownloadClean(user, docPaid)).toBe(true);
  });

  it("marca d'água é aplicada se o documento foi gerado grátis, mesmo que o usuário seja grátis", () => {
    const user = { plano: "gratis" as const };
    const docFree = {
      watermarked: true,
      entitlement: { type: "free" as const, watermarked: true },
    };

    expect(resolveDocumentWatermark(docFree, user)).toBe(true);
    expect(canDownloadClean(user, docFree)).toBe(false);
  });

  it("usuário Pro baixa qualquer documento sem marca d'água", () => {
    const userPro = { plano: "pro" as const };
    const doc = { watermarked: true };

    expect(resolveDocumentWatermark(doc, userPro)).toBe(false);
    expect(canDownloadClean(userPro, doc)).toBe(true);
  });

  it("usa fallback para plano do usuário quando o documento não tem metadados de watermark", () => {
    expect(resolveDocumentWatermark(null, { plano: "gratis" })).toBe(true);
    expect(resolveDocumentWatermark(null, { plano: "pro" })).toBe(false);
    expect(resolveDocumentWatermark(null, { plano: "avulso" })).toBe(false);
  });
});

describe("entitlement-policy: avaliação de elegibilidade e cotas de criação", () => {
  it("bloqueia visitante para criação grátis mas permite avulso pago", () => {
    const resGuest = evaluateCreationEntitlement({
      isUserLoggedIn: false,
      modelSlug: "declaracao-residencia",
      monthDocCount: 0,
    });
    expect(resGuest.allowed).toBe(false);
    expect(resGuest.reason).toBe("login_or_payment_required");

    const resGuestPaid = evaluateCreationEntitlement({
      isUserLoggedIn: false,
      modelSlug: "declaracao-residencia",
      hasPaidOrder: true,
      monthDocCount: 0,
    });
    expect(resGuestPaid.allowed).toBe(true);
    expect(resGuestPaid.entitlement).toBe("single_purchase");
    expect(resGuestPaid.watermarked).toBe(false);
  });

  it("permite 1 geração gratuita por mês para usuário grátis em modelo elegível", () => {
    const res = evaluateCreationEntitlement({
      isUserLoggedIn: true,
      userPlan: "gratis",
      modelSlug: "declaracao-residencia",
      monthDocCount: 0,
    });
    expect(res.allowed).toBe(true);
    expect(res.entitlement).toBe("free");
    expect(res.watermarked).toBe(true);
  });

  it("bloqueia com free_limit_reached quando a cota mensal é atingida", () => {
    const res = evaluateCreationEntitlement({
      isUserLoggedIn: true,
      userPlan: "gratis",
      modelSlug: "declaracao-residencia",
      monthDocCount: FREE_MONTHLY_LIMIT,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("free_limit_reached");
  });

  it("bloqueia com model_not_eligible quando o modelo não é da seleção gratuita", () => {
    const res = evaluateCreationEntitlement({
      isUserLoggedIn: true,
      userPlan: "gratis",
      modelSlug: "procuracao-simples", // não elegível
      monthDocCount: 0,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("model_not_eligible");
  });

  it("usuário Pro tem acesso irrestrito e sem marca d'água a qualquer modelo", () => {
    const res = evaluateCreationEntitlement({
      isUserLoggedIn: true,
      userPlan: "pro",
      modelSlug: "qualquer-modelo-pro",
      monthDocCount: 99,
    });
    expect(res.allowed).toBe(true);
    expect(res.entitlement).toBe("pro");
    expect(res.watermarked).toBe(false);
  });

  it("calcula corretamente documentos restantes", () => {
    expect(remainingDocumentsThisMonth({ plano: "pro" }, 10)).toBe(null);
    expect(remainingDocumentsThisMonth({ plano: "gratis" }, 0)).toBe(1);
    expect(remainingDocumentsThisMonth({ plano: "gratis" }, 1)).toBe(0);
    expect(remainingDocumentsThisMonth({ plano: "gratis" }, 5)).toBe(0);
  });

  it("avalia canCreateDocument respeitando modelo elegível quando fornecido", () => {
    expect(canCreateDocument({ plano: "gratis" }, 0, "declaracao-residencia")).toBe(true);
    expect(canCreateDocument({ plano: "gratis" }, 0, "procuracao-simples")).toBe(false);
    expect(canCreateDocument({ plano: "gratis" }, 1, "declaracao-residencia")).toBe(false);
    expect(canCreateDocument({ plano: "pro" }, 5, "procuracao-simples")).toBe(true);
  });
});
