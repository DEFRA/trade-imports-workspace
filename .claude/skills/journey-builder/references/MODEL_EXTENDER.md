# MODEL_EXTENDER — grow the obligation model's vocabulary for one gated gap

You implement ONE `model-extension` increment: a deliberate, gated growth of
the engine's obligation vocabulary to express something the current model
cannot. This is the HIGHEST-RISK change type in the programme — it touches
`engine/` core (predicate / reconcile / status). Rigour over speed.

You are given a run-id (EUDPA-X) and an increment id (inc-NNN) whose `gap`
names the growth (e.g. `cross-frame-conditionality`, `sibling-at-least-one`).

## Where things are
- Backlog entry: `~/git/defra/.../workareas/journey-builder/<run-id>/backlog.json`
- Worktree (ALL edits happen here, never in `repos/`):
  `~/git/defra/trade-imports-workspace/workareas/journey-builder/<run-id>/frontend-worktree/`
- Target scope and spec dir come from the run's target profile
  (`tools/journey-builder/targets.json`) — do not hardcode a path.
- Verify with `tools/journey-builder/verify-increment.sh <run-id>`, then
  `commit-increment.sh` on green or `rollback-increment.sh` after three failed
  self-repair attempts. Never force green by weakening tests.
- The spec already PROPOSES vocabulary for each gap (e.g.
  `activatedBy: { obligation, frame: "enclosing" | "anyItem", ... }`). Grep
  `modelGap` in `spec/journey-spec.json` to see every obligation waiting on
  this gap, and read the `docs/limits.md` entry describing the gap.
- The spike's own discipline: read `docs/decisions.md` and `docs/engine.md`
  for how `predicate.js` / `reconcile.js` currently resolve `activatedBy`
  (same-frame sibling by object identity today).

## Design rules
- **Backwards compatible, always.** Every existing obligation and test must
  behave identically. A new `frame` value or mandate fact is opt-in; absence
  = today's behaviour. If you cannot add the capability without changing
  existing behaviour, STOP and report — do not weaken existing semantics.
- **Smallest vocabulary that covers the spec's need.** Implement exactly what
  the waiting obligations require, not a general framework. `frame:
  "enclosing"` = walk outward from the current instance frame to the nearest
  enclosing frame that contains the referenced obligation, resolve there.
  `frame: "anyItem"` = the predicate holds if ANY item of the named collection
  satisfies it. Don't invent frames no obligation uses.
- **The invariant is scope+wipe.** A cross-frame conditional field must be
  per-instance scoped AND wiped when its gating value leaves scope, at the
  correct path depth. This is the part most likely to be subtly wrong — test
  it explicitly (flip the gate on one instance, assert siblings untouched;
  flip off, assert that instance's data destroyed not hidden).
- Keep the model pure data: the extension is new INTERPRETATION in the engine
  of a declarative fact, never imperative logic in an obligation.

## Steps
1. Design: write the vocabulary + resolution rule as a short note in your
   final message (what key, what the engine does, why backwards compatible).
2. Implement in `engine/evaluate/predicate.js` (+ `reconcile.js` /
   `analysis/reachability.js#gateValue` if scope enumeration is affected).
3. Add engine unit tests that pin the new behaviour AND the backwards-compat
   cases — in the relevant `engine/` test file, following the house style.
4. Add a `DESIGN-DELTA.md` entry (this IS an engine divergence from the spike).
5. Run `tools/journey-builder/verify-increment.sh EUDPA-X`. Green → commit via
   `commit-increment.sh`. Red after bounded self-repair → rollback + report.
6. Do NOT also build the dependent pages — the extension increment only grows
   the engine + proves it with tests. The pages that USE it are separate
   increments.

## Adversarial self-check before committing
Ask, and answer in your report: (a) name one existing obligation that must be
unaffected — did a test prove it? (b) what happens at depth-2 (a cross-frame
gate referencing two frames out)? (c) does a wiped cross-frame field leave any
orphan data at any path? If any answer is uncertain, add a test or STOP.

## Report back
The design note, files touched, the three adversarial answers, commit SHA (or
rollback reason), and anything the dependent-page increments must know.
