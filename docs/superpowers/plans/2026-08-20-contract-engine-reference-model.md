# Contract Engine Reference Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved residential lease reference into a reusable, legally conditional contract-engine baseline without coupling legal rules to the PDF renderer.

**Architecture:** `contrato-locacao` owns contract content and questions; the existing `legal-rules.ts` layer derives mutually exclusive lease text from answers. The PDF keeps consuming normalized lines, while a `contractProperty` recipe improves family-level composition and signatures.

**Tech Stack:** Next.js, TypeScript, Bun tests, pdfmake.

**Spec:** `docs/superpowers/specs/2026-08-20-contract-engine-reference-model-design.md`

## Global Constraints

- Keep PR #20 draft and do not touch billing, declarations or document ownership.
- Preserve server-side guarantee validations.
- Do not claim a real annex, averbação or electronic-signature legal effect unless the flow supports it.
- No model-slug legal branches in the PDF renderer.
- Every behavior change starts RED and is verified in GitHub Actions before the next implementation commit.

---

### Task 1: Lease legal-text derivation

**Files:**
- Modify: `src/lib/document-engine/legal-rules.ts`
- Test: `src/test/document-engine/legal-rules.test.ts`

**Interfaces:**
- Extends `applyLegalTemplateRule(modelSlug, line, answers)` with the reference-model lines.
- Returns mutually exclusive legal text before placeholders are filled.

- [ ] Write failing tests for a 12-month regime, a 30-month regime, default no-inspection/no-alienation output, and the no-guarantee payment wording.
- [ ] Run focused test and confirm RED.
- [ ] Implement only the reference-model legal substitutions in the existing shared rule layer.
- [ ] Run focused test and confirm GREEN.

### Task 2: Reference-model contract structure

**Files:**
- Modify: `src/lib/modelos.ts`
- Test: `src/test/document-engine/characterization-smoke.test.ts`

**Interfaces:**
- Consumes derived placeholders from Task 1.
- Produces a residential lease with explicit object, term, rent, charges, guarantee, maintenance, use, rescission, return, conditional inspection, privacy, communications, optional alienation, venue and signing sections.

- [ ] Add failing snapshot-style assertions for the two term regimes and excluded conditional clauses.
- [ ] Run focused test and confirm RED.
- [ ] Replace only the residential lease stages/template with the approved reference structure and conditional markers.
- [ ] Run focused test and confirm GREEN.

### Task 3: Contract-family editorial preset

**Files:**
- Modify: `src/lib/pdf/visual-recipes.ts`
- Modify: `src/lib/pdf/content-builder.ts`
- Test: `src/test/pdf/pdf-structure.test.ts`

**Interfaces:**
- Produces `contractProperty` behavior through the existing recipe resolver.
- Keeps individual signature blocks atomic while allowing paired party signatures to share a row.

- [ ] Add failing PDF-structure tests for the property recipe and paired signatures.
- [ ] Run focused test and confirm RED.
- [ ] Implement the smallest recipe and signature-layout changes.
- [ ] Run focused test and confirm GREEN.

### Task 4: Integration verification

**Files:**
- Test: existing contract, PDF and smoke suites.

- [ ] Run unit/domain tests for document engine and PDF structure.
- [ ] Run lint, typecheck, build and E2E through CI.
- [ ] Inspect the generated residential lease PDF page by page in Preview/CI artifact.
- [ ] Record actual check results in the PR conversation only if the user requests an update.