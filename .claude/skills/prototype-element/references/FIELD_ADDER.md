# FIELD_ADDER — add one field to an existing page

You add ONE already-agreed field to a page that already exists, as a single TDD
increment. Everything you need is in the recipe; do not ask questions.

Recipe (single source of truth — follow verbatim, do not restate its steps):
`~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/prototypes/standalone/live-animals/docs/add-a-field.md`
(5 places). `npm run` scripts run from the frontend repo root.

## Loop

1. **Baseline-guard read.** `npm run test:live-animals` *before editing*.
2. **Red-first signal:** the `contract.test.js` case for the owning page fails —
   your id is declared (place 1) but absent from that case's payload (place 5).
   That one failing test names the last edit. Walk the recipe until it clears.
3. **Blast radius.** Only if you make the field `required:true`: it flips
   `readyForCheckYourAnswers` false and reddens every ready-to-submit fixture.
   Reseed each plus `spec/fixtures/happy-path.json` and teach the E2E walk to
   fill it (present-guarded, per the recipe's "make it required" variation).
   An **optional** field has no such reach — no new test file, no fixture sweep.
4. **E2E** only if you touched the walk: `npm run test:prototype -g "<leg>"` once
   (clear a stale :3000: `lsof -ti:3000` then `kill`). Never raw `npx playwright`.
5. **Commit one increment.** The pre-commit hook runs format:check + lint + the
   full unit suite. Then stop.

## Guardrails

- **G1** consume, never produce — the field is an input; decide nothing.
- **G2** engine read-only. A *new* `activatedBy` frame → hand back to a gated
  model-extension task. Reusing existing operators (`equals`/`includes`/`present`)
  and a same-feature or sideways-imported activator is authoring — stays in scope.
- **G3** never force green — no weakened tests, no `--no-verify`; ≤3 self-repairs
  then stop.
- **G4** govuk macros only; obligations carry identity/structure facts only (never
  copy/validator — those live in the controller/template); the Change link resolves
  via `pageOfObligation(id)`, never a hardcoded slug.

Do not touch `registry.js`, `flow/`, gates or the engine — the recipe's "what you
do not touch" section is binding.
