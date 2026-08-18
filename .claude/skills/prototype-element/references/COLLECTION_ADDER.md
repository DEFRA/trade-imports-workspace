# COLLECTION_ADDER — add one repeating collection

You add ONE already-agreed collection (a repeating obligation with a list page
and an entry page) as a single TDD increment. Everything you need is in the
recipe; do not ask questions.

Recipe (single source of truth — follow verbatim, do not restate its steps):
`~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/prototypes/standalone/live-animals/docs/add-a-collection.md`
(7 steps; §7 is nesting). Reference implementations: `features/documents/`
(list/entry split) and `features/commodities/` (item-scoped conditional).
`npm run` scripts run from the frontend repo root.

## Loop

1. **Baseline-guard read.** `npm run test:live-animals` *before editing*.
2. **Red-first signal:** the contract case is measured on the **entry append
   handler**, not the list page — the list page declares `collects:['<coll>']`
   but the committing write is the entry page's append. Walk the recipe until it
   clears. Keep both write guards (§5): validate the parent index in any nested
   add controller, and leave the engine's `Number.isInteger` remove guard intact.
3. **No `dispatchPages` entry for sub-obligations** — they inherit the list
   page's `collects` from the nearest collection ancestor.
4. **Blast radius.** `requiredAtLeastOne` (or any `required:true` sub-obligation
   that gates readiness) can flip `readyForCheckYourAnswers` false and redden
   ready-to-submit fixtures. Reseed each plus `spec/fixtures/happy-path.json` and
   extend the happy-path walk (add at least one entry).
5. **Boot-replication.** New test files replicate `buildDispatch(dispatchPages)` +
   `configureReadyForCheckYourAnswers(readyForCheckYourAnswers)` in `beforeAll`;
   import helpers from `engine/test-support.js` — never hand-copy them.
6. **E2E leg.** `npm run test:prototype -g "<leg>"` once (clear a stale :3000:
   `lsof -ti:3000` then `kill`). Never raw `npx playwright`.
7. **Commit one increment.** Pre-commit hook runs format:check + lint + full unit
   suite. Then stop.

## Guardrails

- **G1** consume, never produce — the collection shape is an input.
- **G2** engine read-only, and the hard limit is binding: **no cross-frame
  conditionality** (a sub-field gated on an enclosing frame). `activatedBy`
  resolves same-frame siblings and top-level answers only — anything beyond that,
  or a *new* frame, is a gated model-extension hand-back. Reusing an existing
  `frame:'anyItem'`/`'enclosing'` list is authoring and stays in scope.
- **G3** never force green — never remove the two write guards; ≤3 self-repairs
  then stop.
- **G4** govuk macros only; each list/entry controller hand-builds its own rows
  over `state.collectionView(...)` facts (no uniform-widget projection); Change
  links resolve via `pageOfObligation(id)`.
