---
name: prototype-element
description: Add one already-agreed element — a field, page, collection or service — to a frontend repo's journey prototype (today prototypes/standalone/live-animals in trade-imports-animals-frontend), one TDD increment at a time. Four modes parameterised by element type; each follows the vendored docs/add-a-{field,page,collection}.md recipe (or docs/services.md) verbatim rather than restating it. The value-add over the docs is the baseline-guard read (run the unit suite first so buildDispatch + contract.test go red and name the next edit), the required-field blast-radius reseed, the boot-replication rule, ≤3-self-repair discipline and one E2E leg — then one commit and stop. Use when the user asks to add a field/page/collection/service to the prototype (triggers: "add a field to the prototype", "add a page", "add a collection", "add a service", "prototype-element add-{field,page,collection,service}"). NOT for producing or regenerating the spec/backlog, NOT for a serial multi-increment build loop, and NOT for growing the engine — those are journey-builder.
---

# prototype-element

Author ONE increment against the live-animals prototype and stop: read the
baseline-guard output, follow the vendored `docs/add-a-*.md` recipe verbatim,
reach green without weakening a test, reseed the blast radius, run one E2E leg,
commit. Gating and the next increment are the caller's call. Prototype:
`~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/prototypes/standalone/live-animals/`;
`npm run` scripts run from the frontend **repo root**. One command per Bash call
(no `&&`/`;`/`|`); literal `~/git/...` paths (never `$VAR` or `/Users/...`).

## Preconditions + mode dispatch

The element is an **input** — already agreed in the spec/backlog; this skill
consumes it and never decides what to add (G1). The frontend repo and the
matching `docs/add-a-{element}.md` must exist. Parse the trigger into
`{ mode, target }` — dispatch is a **lookup**, not a state machine:

| Mode | Recipe (single source of truth) | Persona |
|---|---|---|
| `add-field` | `docs/add-a-field.md` (5 places) | `references/FIELD_ADDER.md` |
| `add-page` | `docs/add-a-page.md` (10 steps) | `references/PAGE_ADDER.md` |
| `add-collection` | `docs/add-a-collection.md` (7 steps) | `references/COLLECTION_ADDER.md` |
| `add-service` | `docs/services.md` (folder-per-service) | `references/SERVICE_ADDER.md` |

Load the one persona and run its loop; never restate the recipe's numbered steps
here or in the persona — cite and defer.

## The TDD loop (field / page / collection)

1. **Baseline-guard read** (the core value): run `npm run test:live-animals`
   *before editing*. The `buildDispatch(dispatchPages)` boot assertion and
   `contract.test.js` go red and **name the next edit**.
2. **Apply the recipe** verbatim until the named redness clears.
3. **Blast radius**: a `required:true` obligation in an always-live section flips
   `readyForCheckYourAnswers` false and reddens every ready-to-submit fixture —
   reseed each plus `spec/fixtures/happy-path.json` and extend the walk.
4. **Boot-replication**: any new test that commits / builds scope / reads status
   replicates `buildDispatch(dispatchPages)` +
   `configureReadyForCheckYourAnswers(readyForCheckYourAnswers)` in `beforeAll`;
   import helpers from `engine/test-support.js` — never hand-copy them.
5. **E2E leg** (page / collection): `npm run test:prototype -g "<leg>"` once against
   its own :3000 server (clear a stale one: `lsof -ti:3000` then `kill`; never raw
   `npx playwright`).
6. **Commit one increment** — source + tests + docs + E2E squashed; the pre-commit
   hook runs whole-tree format:check + lint + full unit suite. Stop.

`add-service` has no baseline red — see `SERVICE_ADDER.md` (thinnest mode).

## Guardrails

- **G1 — consume, never produce.** The spec/backlog is an input; emit neither. No
  3-source ingestion, no reconcile, no precedence vocabulary.
- **G2 — engine is read-only.** Hand back to a gated model-extension task if the
  recipe needs `predicate.js`/`reconcile.js`/reachability or a *new* `activatedBy`
  frame. Reusing existing frame vocabulary (`frame:'anyItem'`, `'enclosing'`) is
  authoring, not extension — in scope.
- **G3 — never force green.** No weakening tests, no `--no-verify`; ≤3 self-repairs
  then stop and report.
- **G4 — stay in the toolbox.** govuk-frontend macros/utilities only (no custom
  CSS); obligations are data-only (never copy/type/validator); Change links
  resolve via `pageOfObligation(id)`, never a hardcoded slug.

Done means one increment, one commit, then stop.
