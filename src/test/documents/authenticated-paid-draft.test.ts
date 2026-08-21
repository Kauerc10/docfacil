import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("authenticated paid draft continuation", () => {
  it("permite que um usuário autenticado finalize o rascunho avulso ao retornar do checkout", () => {
    const sucesso = source("src/components/docfacil/views/sucesso-view.tsx");

    expect(sucesso).toContain("shouldStartPaidOrderFinalization");
    expect(sucesso).toContain("attemptedOrderId: attemptedPaidOrderId.current");
    expect(sucesso).toContain("loadGuestDraft(slug)");
    expect(sucesso).toContain("guestContact: user ? undefined : draft.guestContact");
    expect(sucesso).toContain("orderId,");
    expect(sucesso).toContain('navigate("sucesso", { slug, id: result.document.id })');
  });

  it("rotaciona também a tentativa terminal do usuário autenticado", () => {
    const sucesso = source("src/components/docfacil/views/sucesso-view.tsx");

    expect(sucesso).not.toContain("!user &&\n          errorCode");
    expect(sucesso).toContain(
      "errorCode &&\n          !shouldPreserveFinalizationRequestId(errorCode)"
    );
    expect(sucesso).toContain("saveGuestDraft(slug");
  });
});
