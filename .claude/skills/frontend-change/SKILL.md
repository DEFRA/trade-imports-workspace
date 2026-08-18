---
name: frontend-change
description: 'Make a change to the live-animals frontend (src/server/app in trade-imports-animals-frontend) by following the repo''s own recipe docs as strict scripts — add a field, page, section (feature group + flow section + task row), or collection; maintain obligations (gates, requires/applyTo, scope, cardinality) or journey flow (page order, task rows, entry guards); or a routed general change. One increment, full verification ladder, then stop (triggers: "add a field to the frontend", "add a page to the frontend", "add a section to the frontend", "add a collection to the frontend", "change an obligation", "change the journey flow", "change the frontend", "frontend-change add-field|add-page|add-section|add-collection"). NOT for the prototype (use prototype-element / journey-builder), NOT for the tests repo''s E2E suite, NOT for planning a Jira ticket (use the ticket skill).'
---

Make one change to the live-animals frontend by following the recipe the repo
already ships. The recipes are the instructions — this skill routes to the right
one, adds the guard rails the docs assume, and runs the verification ladder. Do
not restate or improvise around a recipe: read it and follow it, varying as
little as possible. The outcome is one verified increment staged in
`repos/trade-imports-animals-frontend`, reported and stopped — commit is the
caller's call unless they said otherwise.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/...`.
Bash expands `~` automatically. Skill-internal references stay relative.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".
For this repo that means `npm --prefix
~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend run <script>`
— never `cd`.

## The architecture in one breath

`src/server/app/` is a four-layer platform — read
`src/server/app/docs/architecture.md` in the frontend repo if any of this is
unfamiliar:

- **L1** `app/` root — composition. `routes.js` is the ONLY file that may name
  the set; it injects everything through the `configure*` seams.
- **L2** `app/{engine,model,bridge,flow,services,lib,shared,analysis}` —
  set-agnostic platform. Never imports `sets/**`, never contains live-animals
  copy or vocabulary.
- **L3** `app/sets/live-animals/obligations/` — the set's manifest and section
  data. No display copy, no journey knowledge.
- **L4** `app/sets/live-animals/journeys/linear/` — features (pages, views,
  copy, colocated `*.e2e.spec.js`) and the journey's flow data.

Dependency-cruiser enforces this (`npm run lint:arch`). If your change fights a
rule, the change is in the wrong layer — stop and reconsider before touching
the rules or the baseline.

## When to use

All recipe/guide paths below are inside
`~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/app/`.

| Trigger | Recipe to follow verbatim |
|---------|---------------------------|
| "add a field to the frontend" | `sets/live-animals/docs/add-a-field.md` |
| "add a page to the frontend" | `sets/live-animals/docs/add-a-page.md` |
| "add a section to the frontend" (feature group + flow section + task row) | `sets/live-animals/docs/add-a-section.md` |
| "add a collection to the frontend" (repeatable records) | `sets/live-animals/docs/add-a-collection.md` |
| "change an obligation" (gate condition, `requires`/`applyTo`, scope, status, cardinality) | Obligation-maintenance guard rails below + `sets/live-animals/docs/obligation-model.md`, `docs/obligation-model.md`, `docs/scope-and-wipe.md`, `docs/cardinality.md` |
| "change the journey flow" (page order, task rows, entry guards, section gating) | Flow-maintenance guard rails below + `sets/live-animals/docs/journey-flow-and-gates.md`, `docs/flow-and-gates.md` |
| "change the frontend" (anything else) | Step 1 routing below — pick the guide(s) for the layer you are touching |

NOT for `prototypes/` work (`prototype-element`, `journey-builder`), NOT for the
tests repo (`trade-imports-animals-tests` owns the workspace E2E suite), NOT for
ticket planning (`ticket`).

## Step 1: Route and read

1. Identify the change type. For the four recipe triggers, Read the recipe
   end-to-end BEFORE editing anything — each recipe names its exemplar files,
   the convention tests that drive the order, and its own Playwright and
   accessibility test sections.
2. For a general change, decide the layer first (L1–L4 above), then Read the
   matching guide(s): platform work → the `docs/README.md` platform index
   (engine, flow-and-gates, scope-and-wipe, validation, persistence,
   cardinality, limits, testing); set/journey work → the
   `sets/live-animals/docs/README.md` set index (obligation-model, features,
   journey-flow-and-gates, services, limits, testing).
3. Read the recipe's exemplar files. The exemplars are the idiom — match them,
   don't invent.

## Step 2: Baseline guard

Before editing, prove the ground is green so failures are yours:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend run test:live-animals
```

If this is red at baseline, STOP and report — do not build on a broken tree.

## Step 3: Implement, recipe-verbatim

Standing constraints the recipes assume (violating any is a defect even if
tests pass):

- **No display logic in the model or obligations** — copy lives in the feature
  (`copy.en.js` + `copy.cy.js`, both, structure-identical; the copy-parity
  convention test enforces it). GDS plain English.
- **L2 stays set-agnostic** — if your change wants live-animals knowledge in
  engine/model/bridge/flow/services/shared, the knowledge belongs in the set or
  journey and reaches L2 through the existing `configure*` seams in `routes.js`.
- **Client-side JS needs a webpack entry** (`webpack.config.js`) or the bundle
  404s silently — the add-a-field recipe covers this; it applies to any change
  that adds browser JS.
- **The convention tests are the recipe's rails**: contract, copy-convention,
  copy-parity and the dynamically-counted suites react to new files. A test
  count that DROPS with unchanged file count means discovery silently narrowed
  — hunt it, never shrug.
- Every recipe change includes its co-located Playwright feature spec and axe
  accessibility test per the recipe's own sections — self-contained specs, raw
  locators, no page objects, auto-waiting (no sleeps).

### Obligation-maintenance guard rails ("change an obligation")

Obligation definitions live in `sets/live-animals/obligations/sections/*` and
aggregate in `sets/live-animals/obligations/index.js` (the manifest). When
changing one:

- Obligations are pure data-first definitions: id/name/status/within/requires/
  applyTo. NO copy, NO journey imports, NO IO at module load — reference-data
  bindings resolve lazily at gate execution (the commodities gates are the
  exemplar). `obligation-purity` and the boot guard enforce this.
- A gate or scope change ripples: re-read `docs/scope-and-wipe.md` for what an
  answer leaving scope wipes, and `docs/cardinality.md` for collection floors/
  caps (`requires.maxEntries`, `recordCountEquals`). Changing `applyTo` can
  strand previously-entered answers — the engine's purge behaviour is the
  contract, not your intuition.
- The reachability analysis (`analysis/`, run inside `npm test`) proves every
  obligation can be both satisfied and violated. If your change makes a state
  unreachable, those suites go red — that is the tripwire working, not noise.
  Fix the model, don't weaken the prover.
- Set-pinned tests (`whitelists`, `coverage` beside the manifest) walk the
  concrete manifest — update them WITH the change, in the same increment.

### Flow-maintenance guard rails ("change the journey flow")

The journey owns its flow data (`sets/live-animals/journeys/linear/flow/` —
`flow.js` sections/page order, `task-rows.js` hub rows, entry guard) and its
`config.js`; the machinery in `app/flow/` is generic and consumes the data via
`configureJourneyFlow` in `routes.js`:

- Page order, section membership, task rows and entry-guard policy change in
  the JOURNEY's files. If a change seems to need editing `app/flow/*`
  machinery, that is a platform change — different blast radius, treat it as
  L2 work and re-read `docs/flow-and-gates.md` first.
- Task rows drive both the hub AND submit readiness — a row change is
  behaviour, not presentation. The `task-rows` tests and the hub feature specs
  pin it.
- Adding entries to existing flow/task-row arrays needs no new L1 wiring
  (routes.js injects the whole exports); new EXPORT SHAPES do.

Self-repair budget: at most 3 fix attempts per red step. Past that, stop and
report the failure honestly.

## Step 4: Verification ladder

Run in order; each must be green before the next. One Playwright run at a time.

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend run test:live-animals
```

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend test
```

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend run lint
```

```bash
PORT=3050 npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend run test:features
```

```bash
PORT=3050 npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend run test:e2e
```

The Playwright suites self-host the app (stub mode) — no workspace stack
needed. `PORT=3050` avoids colliding with a running stack on :3000. Run
`npm --prefix ... run format` before any commit — the pre-commit hook enforces
format + lint + full units and will reject otherwise.

## Completion output

```
frontend-change complete: <one-line description of the increment>.

Recipe followed: <path>
Files touched: <N> (<key paths>)
Ladder: test:live-animals <n>/<n> · npm test <n>/<n> · lint green ·
        features <n>/<n> · e2e <n>/<n>
Design calls: <flagged decisions, or "none — recipe followed verbatim">

Staged, not committed. Next: review the diff, then commit (conventional
message, EUDPA ticket prefix).
```

One increment per invocation. If the request implies several elements, do the
first, stop, and list the remainder for the caller to re-invoke.
