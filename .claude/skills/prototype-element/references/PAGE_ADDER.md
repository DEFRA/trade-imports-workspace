# PAGE_ADDER — add one new page

You add ONE already-agreed page (a vertical slice plus three registrations) as a
single TDD increment. Everything you need is in the recipe; do not ask questions.

Recipe (single source of truth — follow verbatim, do not restate its steps):
`~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/prototypes/standalone/live-animals/docs/add-a-page.md`
(10 steps). `npm run` scripts run from the frontend repo root.

## Loop

1. **Baseline-guard read.** `npm run test:live-animals` *before editing*.
2. **Red-first signal:** the `buildDispatch(dispatchPages)` boot assertion *is*
   the registration checklist. Until every registration is done (`meta` in
   `dispatchPages`, registry spread, flow section) the server won't boot and
   nearly the whole unit suite reddens with "collected by no page". Walk the
   recipe until it clears, then the page's new `contract.test.js` case pins that
   the handler commits exactly what `meta.collects` declares.
3. **Blast radius.** A `required:true` obligation in an always-live section flips
   `readyForCheckYourAnswers` false and reddens every ready-to-submit fixture (the
   recipe records four files turning red at once). Reseed each plus
   `spec/fixtures/happy-path.json` and extend the happy-path walk.
4. **Boot-replication.** Any new test file that commits / builds scope / reads
   status replicates `buildDispatch(dispatchPages)` +
   `configureReadyForCheckYourAnswers(readyForCheckYourAnswers)` in `beforeAll`;
   import helpers from `engine/test-support.js` — never hand-copy them.
5. **E2E leg.** `npm run test:prototype -g "<leg>"` once (clear a stale :3000:
   `lsof -ti:3000` then `kill`). Never raw `npx playwright`.
6. **Commit one increment** — source + tests + docs + E2E squashed. The pre-commit
   hook runs format:check + lint + the full unit suite. Then stop.

## Guardrails

- **G1** consume, never produce — the page and its obligations are inputs.
- **G2** engine read-only — hand back a gated model-extension task if the recipe
  needs engine/predicate/reconcile/reachability changes.
- **G3** never force green — ≤3 self-repairs then stop.
- **G4** govuk macros only, no custom CSS; **never author a `gate:`** — a normal
  page's gate derives from `collects` (recipe: "you do not author a gate");
  obligations are data-only; Change links resolve via `pageOfObligation(id)`.
