import { describe, expect, it } from "bun:test";
import { resolveNavAction } from "@/components/docfacil/nav-context";

describe("resolveNavAction — roteamento seguro entre rotas Next.js e SPA", () => {
  it("redireciona para /?view=login via assign quando chamado fora da raiz (ex: /documentos)", () => {
    const action = resolveNavAction("login", {}, "/documentos");
    expect(action).toEqual({
      type: "assign",
      url: "/?view=login",
    });
  });

  it("redireciona para /?view=dashboard via assign quando chamado de /documentos/contrato-locacao", () => {
    const action = resolveNavAction("dashboard", {}, "/documentos/contrato-locacao");
    expect(action).toEqual({
      type: "assign",
      url: "/?view=dashboard",
    });
  });

  it("redireciona para /?view=cadastro com parâmetros via assign quando chamado de /planos", () => {
    const action = resolveNavAction("cadastro", { ref: "pricing" }, "/planos");
    expect(action).toEqual({
      type: "assign",
      url: "/?view=cadastro&ref=pricing",
    });
  });

  it("mantém pushState sem recarregar quando já está na home (/)", () => {
    const action = resolveNavAction("login", {}, "/");
    expect(action).toEqual({
      type: "pushState",
      url: "/?view=login",
    });
  });

  it("mantém pushState para dashboard quando chamado da home (/)", () => {
    const action = resolveNavAction("dashboard", {}, "/");
    expect(action).toEqual({
      type: "pushState",
      url: "/?view=dashboard",
    });
  });

  it("redireciona 'modelos' para /documentos independente da rota atual", () => {
    expect(resolveNavAction("modelos", {}, "/")).toEqual({
      type: "assign",
      url: "/documentos",
    });
    expect(resolveNavAction("modelos", {}, "/documentos")).toEqual({
      type: "assign",
      url: "/documentos",
    });
  });

  it("redireciona 'modelo-detalhe' para /documentos/:slug", () => {
    expect(resolveNavAction("modelo-detalhe", { slug: "recibo-aluguel" }, "/")).toEqual({
      type: "assign",
      url: "/documentos/recibo-aluguel",
    });
  });
});
