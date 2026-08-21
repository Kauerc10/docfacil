# Civil-status data integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir que estados civis truncados ou inválidos sejam persistidos e apareçam em documentos gerados.

**Architecture:** A normalização fica na reconstrução server-side de respostas, antes da composição e persistência. O preenchimento do template mantém compatibilidade defensiva para documentos legados, mas não é a autoridade de validação.

**Tech Stack:** TypeScript, validação de domínio, Document Engine, pdfmake e Bun tests.

**Spec:** `docs/superpowers/specs/2026-08-20-document-quality-and-low-friction-design.md`

## Global Constraints

- Preservar os valores exibidos pela interface atual; não criar campos ou telas nesta etapa.
- Normalizar `di`, `DIV`, `divorciado` e `divorciada` para `divorciado(a)`.
- Rejeitar valores de estado civil não reconhecidos com `BackendError("INVALID_REQUEST", 400, ...)` antes da persistência.
- Compatibilizar documentos legados com abreviações conhecidas sem gerar um PDF com abreviação.
- Não alterar textos jurídicos, receitas PDF, billing, lifecycle, ownership ou declarações.
- Nenhum código de produção é escrito antes do teste RED correspondente.

---

### Task 1: Canonicalização server-side de estado civil

**Files:**
- Create: `src/lib/document-engine/civil-status.ts`
- Modify: `src/lib/server/domain/documents.ts`
- Modify: `src/lib/document-engine/template.ts`
- Test: `src/test/document-engine/civil-status.test.ts`
- Test: `src/lib/server/domain/documents.test.ts`

**Interfaces:**
- Produces: `normalizeCivilStatus(value: string): string | null`.
- Consumes: chaves de resposta que terminam em `_estado_civil` e a chave histórica `estado_civil`.
- Guarantees: o servidor recebe respostas canônicas ou lança `BackendError` antes de sanitizá-las; `fillTemplate` nunca preserva uma abreviação conhecida truncada.

- [ ] **Step 1: Escrever o teste RED da tabela canônica**

```ts
import { describe, expect, test } from "bun:test";
import { normalizeCivilStatus } from "@/lib/document-engine/civil-status";

describe("normalizeCivilStatus", () => {
  test.each([
    ["di", "divorciado(a)"],
    ["DIV", "divorciado(a)"],
    ["divorciada", "divorciado(a)"],
    ["casado(a)", "casado(a)"],
  ])("normaliza %s", (input, expected) => {
    expect(normalizeCivilStatus(input)).toBe(expected);
  });

  test("recusa valor desconhecido", () => {
    expect(normalizeCivilStatus("casadinho")).toBeNull();
  });
});
```

- [ ] **Step 2: Executar para confirmar RED**

Run: `bun test src/test/document-engine/civil-status.test.ts`

Expected: falha porque o módulo `civil-status` ainda não existe.

- [ ] **Step 3: Implementar a normalização mínima**

```ts
function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\\p{Diacritic}/gu, "");
}

export function normalizeCivilStatus(value: string): string | null {
  const aliases: Record<string, string> = {
    so: "solteiro(a)", solteiro: "solteiro(a)", solteira: "solteiro(a)", "solteiro(a)": "solteiro(a)",
    ca: "casado(a)", casado: "casado(a)", casada: "casado(a)", "casado(a)": "casado(a)",
    di: "divorciado(a)", div: "divorciado(a)", divorciado: "divorciado(a)", divorciada: "divorciado(a)", "divorciado(a)": "divorciado(a)",
    vi: "viúvo(a)", viuvo: "viúvo(a)", viuva: "viúvo(a)", "viuvo(a)": "viúvo(a)",
    ue: "em união estável", "uniao estavel": "em união estável", "em uniao estavel": "em união estável",
    separado: "separado(a) judicialmente", separada: "separado(a) judicialmente", "separado(a) judicialmente": "separado(a) judicialmente",
  };
  return aliases[normalize(value)] ?? null;
}
```

Os valores exibidos pela interface atual, inclusive `viúvo(a)` e `em união estável`, passam pela mesma normalização de acentos antes da busca.

- [ ] **Step 4: Executar o teste GREEN**

Run: `bun test src/test/document-engine/civil-status.test.ts`

Expected: todos os casos passam.

- [ ] **Step 5: Escrever RED de fronteira no domínio e no PDF**

```ts
it("normaliza o estado civil legado antes de sanitizar", () => {
  const cleaned = reconstructAndValidateResponses(modelo, { ...validAnswers, locador_estado_civil: "di" }, []);
  expect(cleaned.locador_estado_civil).toBe("divorciado(a)");
});

it("rejeita estado civil desconhecido", () => {
  expect(() => reconstructAndValidateResponses(modelo, { ...validAnswers, locador_estado_civil: "casadinho" }, []))
    .toThrow("Estado civil inválido");
});
```

Adicione uma asserção de `fillDocument` para `locador_estado_civil: "di"` não conter `", di,"`.

- [ ] **Step 6: Executar para confirmar RED**

Run: `bun test src/lib/server/domain/documents.test.ts src/test/document-engine/civil-status.test.ts`

Expected: a entrada desconhecida ainda é aceita e a abreviação ainda chega ao documento.

- [ ] **Step 7: Integrar no domínio e no renderer defensivo**

Em `reconstructAndValidateResponses`, normalize toda chave `estado_civil` antes da composição; se o normalizador devolver `null`, lance `BackendError("INVALID_REQUEST", 400, "Estado civil inválido.")`. Em `fillTemplate`, substitua o bloco local de aliases por `normalizeCivilStatus`; mantenha valor original somente para chaves que não são de estado civil.

- [ ] **Step 8: Executar regressões focadas**

Run: `bun test src/lib/server/domain/documents.test.ts src/test/document-engine/civil-status.test.ts src/test/document-engine/document-engine.test.ts`

Expected: 0 falhas.

- [ ] **Step 9: Revisar, commitar e registrar evidência**

Run: `bun run typecheck && bun run lint`

Commit only the files desta tarefa with:

```bash
git add src/lib/document-engine/civil-status.ts src/lib/document-engine/template.ts src/lib/server/domain/documents.ts src/test/document-engine/civil-status.test.ts src/lib/server/domain/documents.test.ts docs/superpowers/specs/2026-08-20-document-quality-and-low-friction-design.md docs/superpowers/plans/2026-08-20-data-integrity-civil-status.md
git commit -m "fix(legal): normaliza estado civil em documentos"
```
