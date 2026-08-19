import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("cadastro - experiência de senha", () => {
  it("exige confirmação sem bloquear colar ou gerenciadores de senha", () => {
    const cadastro = source("src/components/docfacil/views/cadastro-view.tsx");

    expect(cadastro).toContain("confirmPassword");
    expect(cadastro).toContain("Confirmar senha");
    expect(cadastro).toContain('autoComplete="new-password"');
    expect(cadastro).toContain("As senhas não coincidem");
    expect(cadastro).not.toContain("onPaste");
  });

  it("exibe medidor orientativo sem torná-lo uma regra de bloqueio", () => {
    const cadastro = source("src/components/docfacil/views/cadastro-view.tsx");
    const meter = source("src/components/docfacil/auth/password-strength-meter.tsx");

    expect(cadastro).toContain("PasswordStrengthMeter");
    expect(meter).toContain('role="meter"');
    expect(meter).toContain("Muito fraca");
    expect(meter).toContain("Forte");
    expect(meter).toContain("aria-live");
    expect(cadastro).not.toContain("strength.score >=");
  });

  it("usa zxcvbn com dicionários comum, inglês e português carregados sob demanda", () => {
    const strength = source("src/lib/auth/password-strength.ts");
    const packageJson = source("package.json");

    expect(strength).toContain("@zxcvbn-ts/core");
    expect(strength).toContain("@zxcvbn-ts/language-common");
    expect(strength).toContain("@zxcvbn-ts/language-en");
    expect(strength).toContain("@zxcvbn-ts/language-pt-br");
    expect(strength).toContain("Promise.all");
    expect(packageJson).toContain('"@zxcvbn-ts/core"');
  });
});
