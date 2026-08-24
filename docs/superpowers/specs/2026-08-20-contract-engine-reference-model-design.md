# Contract Engine Reference Model Design

## Objective

Use the approved residential lease reference as the structural and editorial baseline for DocFácil contracts while preserving the existing separation between legal content, question flow, semantic validation and PDF rendering.

## Scope

This increment starts with `contrato-locacao` and establishes reusable contract-family infrastructure. Declarations, billing, ownership, download and existing lifecycle behavior remain unchanged.

## Product rules

- Ask only for facts that change the generated contract.
- Never assert an attachment, a property-registration effect, a payment arrangement or a signature mode that the user did not select.
- The engine, not the PDF renderer, owns legal conditional text.
- The renderer receives semantic lines plus an editorial preset; it must not contain model-slug legal branches.

## Residential lease rules

- A written residential lease of 30 months or more uses the art. 46 regime; a shorter term uses the art. 47 regime.
- A lease without a statutory guarantee may use the advance-payment wording allowed by art. 42; the normal due-date wording must not contradict it.
- The existing one-guarantee and maximum-three-month cash-deposit server validation remains authoritative.
- The tenant is liable for damage it causes; normal wear, previous defects and structural repairs are not recast as tenant repairs.
- Inspection and annex language renders only when the chosen flow provides it.
- The alienation/vigency clause renders only as an optional clause with an explicit averbação prerequisite.
- Contract privacy language is purpose-based and does not make a generic promise of specific consent.
- Physical and electronic signing remain distinct. The document does not promise enforceability; it presents the correct signature/witness block for the selected mode.

## Editorial system

`contract` becomes a family with reusable variants:

```
contractBase
├─ contractStandard
├─ contractCompact
└─ contractProperty
```

A model maps to one variant and may supply narrowly scoped overrides. `contrato-locacao` uses `contractProperty`. The preset controls type scale, paragraph rhythm, header/footer behavior, clause hierarchy and signature geometry. Contract body text remains in the model.

## Acceptance criteria

1. The two legal term regimes render mutually exclusive text.
2. The contract does not claim a vistoria/anexo or alienation protection by default.
3. Maintenance and privacy clauses use the approved safe wording.
4. The final signature section can compose two parties in columns while keeping individual signature blocks atomic.
5. Every changed behavior has a focused regression test that first fails.
6. Existing PDF-structure protections and the nine-model smoke suite remain green.
