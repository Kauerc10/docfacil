import { describe, expect, it } from "bun:test";
import { estimatePasswordStrength } from "@/lib/auth/password-strength";

describe("password strength", () => {
  it("não exibe força para senha vazia", async () => {
    const result = await estimatePasswordStrength("");

    expect(result.score).toBeNull();
    expect(result.label).toBe("");
    expect(result.percent).toBe(0);
  });

  it("classifica senha comum como fraca", async () => {
    const result = await estimatePasswordStrength("12345678");

    expect(result.score).not.toBeNull();
    expect(result.score!).toBeLessThanOrEqual(1);
    expect(["Muito fraca", "Fraca"]).toContain(result.label);
  });

  it("reconhece uma frase-senha longa como boa ou forte", async () => {
    const result = await estimatePasswordStrength(
      "Canoa violeta atravessa 7 luas no inverno!"
    );

    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThanOrEqual(3);
    expect(["Boa", "Forte"]).toContain(result.label);
  });

  it("considera nome e e-mail como contexto pessoal", async () => {
    const semContexto = await estimatePasswordStrength("Kauer2026!Segredo");
    const comContexto = await estimatePasswordStrength("Kauer2026!Segredo", [
      "Kauer",
      "kauer@example.com",
    ]);

    expect(comContexto.score ?? 0).toBeLessThanOrEqual(semContexto.score ?? 0);
  });
});
