import { describe, expect, it } from "bun:test";
import { classifyFinalizationError } from "@/components/docfacil/views/criar/finalization-error";

async function readSource(path: string): Promise<string> {
  return await Bun.file(path).text();
}

describe("document access product contract", () => {
  it("classifica separadamente limite, modelo nao gratis e edicao Pro", () => {
    expect(
      classifyFinalizationError(Object.assign(new Error("limit"), { code: "FREE_LIMIT_REACHED", status: 402 }))
    ).toBe("free_limit");
    expect(
      classifyFinalizationError(Object.assign(new Error("model"), { code: "FREE_MODEL_NOT_ELIGIBLE", status: 402 }))
    ).toBe("model_not_free");
    expect(
      classifyFinalizationError(Object.assign(new Error("pro"), { code: "PRO_REQUIRED", status: 402 }))
    ).toBe("pro_required");
    expect(
      classifyFinalizationError(Object.assign(new Error("payment"), { code: "ORDER_NOT_PAID", status: 402 }))
    ).toBe("generic");
  });

  it("catalogo mostra selo mensal usando a politica compartilhada", async () => {
    const source = await readSource("src/components/docfacil/views/modelos-view.tsx");
    expect(source).toContain("isMonthlyFreeModel");
    expect(source).toContain("Grátis este mês");
    expect(source).toContain("1 geração grátis por mês com uma conta DocFácil");
    expect(source).toContain("pode mudar mensalmente");
  });

  it("planos nao anunciam mais a regra antiga", async () => {
    const source = await readSource("src/components/docfacil/views/planos-view.tsx");
    expect(source).toContain("1 geração grátis por mês");
    expect(source).toContain("Conta DocFácil necessária");
    expect(source).toContain("Sem conta obrigatória");
    expect(source).toContain("formatPlanPrice(\"avulso\")");
    expect(source).toContain("formatPlanPrice(\"pro\")");
    expect(source).not.toContain("3 documentos por mês");
    expect(source).not.toContain("Sem necessidade de conta");
    expect(source).not.toContain("R$ 9,90");
    expect(source).not.toContain("R$ 24,90");
  });

  it("barreira avulsa oferece login gratis somente com politica por slug", async () => {
    const source = await readSource("src/components/docfacil/payment-barrier.tsx");
    expect(source).toContain("isMonthlyFreeModel(slug)");
    expect(source).toContain("Comprar por");
    expect(source).toContain("Entrar ou criar conta para usar a geração grátis");
    expect(source).toContain("Avulso sem conta obrigatória");
  });

  it("dashboard executa download real e edita com document id", async () => {
    const source = await readSource("src/components/docfacil/views/dashboard-view.tsx");
    expect(source).toContain("getDocumentDownloadUrl(doc.id)");
    expect(source).toContain('navigate("criar", { slug: doc.modeloSlug, id: doc.id })');
    expect(source).toContain("listAccountDrafts()");
    expect(source).not.toContain("Preparando PDF... Abrirá em instantes.");
  });

  it("CriarView hidrata documento ou rascunho e preserva a identidade na finalizacao", async () => {
    const source = await readSource("src/components/docfacil/views/criar-view.tsx");
    expect(source).toContain("duplicateDocument(requestedDocumentId)");
    expect(source).toContain("getAccountDraft(requestedDraftId)");
    expect(source).toContain("setActiveDocumentId(draft.sourceDocumentId)");
    expect(source).toContain("createDocumentVersion(activeDocumentId");
    expect(source).toContain("sourceDocumentId: activeDocumentId");
  });

  it("manda as cláusulas selecionadas separadamente das respostas validadas pela API", async () => {
    const source = await readSource("src/components/docfacil/views/criar-view.tsx");

    expect(source).toContain("clausulasSelecionadas,");
    expect(source).not.toContain("...encodeClausulasSelecionadas(clausulasSelecionadas)");
  });

  it("paywall sempre oferece avulso e mantem acoes secundarias legiveis", async () => {
    const source = await readSource("src/components/docfacil/views/criar/free-limit-paywall.tsx");
    expect(source).toContain("Comprar documento avulso");
    expect(source).toContain("pagar apenas por esta nova versão");
    expect(source).not.toContain('const allowSingle = reason !== "pro_required"');
    expect(source).toContain("lg:grid-cols-[1fr_auto]");
    expect(source).toContain("whitespace-nowrap");
  });

  it("checkout demo retoma o draft depois de ativar Pro ou pagar avulso", async () => {
    const source = await readSource("src/components/docfacil/views/checkout-view.tsx");
    expect(source).toContain('navigate("criar", { slug, draftId })');
    expect(source).toContain("getAccountDraft(draftId)");
    expect(source).toContain("draft.sourceDocumentId");
    expect(source).toContain("createDocumentVersion(draft.sourceDocumentId");
    expect(source).toContain("orderId: result.orderId");
    expect(source).toContain("deleteAccountDraft(draft.id)");
  });

  it("checkout autenticado nao repete consentimento e guest avulso continua pedindo aceite", async () => {
    const source = await readSource("src/components/docfacil/views/checkout-view.tsx");
    expect(source).toContain('const requiresCheckoutConsent = !user && plan === "avulso"');
    expect(source).toContain("if (!requiresCheckoutConsent) {");
    expect(source).toContain("void handleAcceptConsent();");
    expect(source).toContain("setConsentOpen(true);");
  });
});
