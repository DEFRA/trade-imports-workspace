# INCREMENT_IMPLEMENTOR — one backlog increment, end to end

You implement exactly ONE increment of the live-animals journey prototype.
You are given a run-id (EUDPA-X) and an increment id (inc-NNN). Everything
you need is on disk; do not ask questions.

## Where things are

- Backlog: `~/git/defra/trade-imports-workspace/workareas/journey-builder/<run-id>/backlog.json`
  — read your increment's entry (type, page/section, obligations).
- Worktree (ALL edits happen here, never in repos/):
  `~/git/defra/trade-imports-workspace/workareas/journey-builder/<run-id>/frontend-worktree/`
- Prototype: `<worktree>/prototypes/standalone/live-animals/`
- Spec (canonical requirements): `<prototype>/spec/journey-spec.json` — your
  increment's `obligations` ids resolve here: mandate (+ `enforcedAt`),
  `activatedBy`, `wipeOnExit`, `input` hints (widget/values/validators),
  labels, `fieldGroupRef`. `spec/conflicts.json` holds resolved rulings.
- Touch-lists (FOLLOW EXACTLY): `<prototype>/docs/add-a-page.md` (10 steps),
  `docs/add-a-field.md` (5 places), `docs/add-a-collection.md` (7 steps).
  Also `docs/flow-and-gates.md`, `docs/obligation-model.md` for background.

## Rules

- One Bash command per call (no `&&`/`;`); `~/` paths only.
- The model is pure data: obligations.js carries ONLY identity/mandate/
  structure/relationship facts. `input` hints from the spec inform the
  controller schema + template macro — they NEVER appear in obligations.js.
- NEVER author a page/section `gate:` — gates derive from collects (T11).
  An authored gate is only for a flow-level fact the model cannot express,
  and that decision belongs to a design gate, not you.
- Changes under `engine/`, `flow/` (except flow.js) or `lib/` are
  exceptional: only when the spec's declared semantics need it, kept
  backwards compatible, unit-tested, AND recorded as a new entry in the
  prototype's `DESIGN-DELTA.md` in the same commit. If the change would
  alter existing behaviour, STOP and report instead.
- `mandate.enforcedAt`: `submit` → the field may be left blank on Save and
  Continue (obligation stays `required: true` for status roll-up; the
  controller treats blank as "not answered yet", not a validation error).
  `continue` → the controller schema rejects blank. Look at how existing
  pages treat requiredness before inventing a pattern.
- GDS plain English for all copy; pages whose spec entry has
  `provisionalCopy: true` keep that placeholder character — don't polish.
- govuk-frontend toolbox only — macros + govuk-* utilities, no custom CSS.
- Increment types:
  - `add-page` / `add-collection`: follow the matching doc's numbered steps.
  - `remove-car-section`: delete the car feature dir(s) for the section,
    de-register (registry.js, features/index.js, flow/flow.js, hub rows,
    check-answers rows, contract.test.js cases), and fix any test fixture
    that referenced its obligations.
  - `repoint-test-fixtures`: re-point `engine/test-support.js` helpers and
    the root model tests (nested/indexed/item-conditional/store-ops) at
    live-animals obligations per PROVENANCE.md.
- Extend `spec/fixtures/happy-path.json` with one valid value per new
  obligation — the E2E walk grows from it.

## Verification protocol (self-naming failures are the design)

1. Run `~/git/defra/trade-imports-workspace/tools/journey-builder/verify-increment.sh EUDPA-X`.
2. EXPECTED failures while mid-touch-list — read them, they name the next
   step: boot coverage assert (obligation not collected by any page →
   dispatch not wired), contract.test.js naming its page (payload missing),
   ready-fixture blast radius for a new always-live required obligation.
3. Anything OUTSIDE that set: investigate. You get at most 3 self-repair
   attempts; then STOP and report failure (do not force green by weakening
   tests, deleting assertions, or marking things renderOnly/system).
4. Green → run
   `tools/journey-builder/commit-increment.sh EUDPA-X --increment <id> --summary "<what>"`.
   Red after 3 attempts →
   `tools/journey-builder/rollback-increment.sh EUDPA-X --increment <id> --reason "<why>"`.

## Report back (final message)

The commit SHA (or the rollback reason), the files you touched, any spec
ambiguity you hit (cite the obligation id), and anything you noticed that
the NEXT increment should know. No file dumps.
