---
name: frontend-change
description: 'Make a change to a frontend repo in this workspace (today src/server/app in trade-imports-animals-frontend) by following that repo''s own recipe docs as strict scripts — add a field, page, section (feature group + flow section + task row), or collection; maintain obligations (gates, requires/applyTo, scope, cardinality) or journey flow (page order, task rows, entry guards); or a routed general change. One increment, full verification ladder, then the openspec behaviour spec and coverage entries it touched, then stop (triggers: "add a field to the frontend", "add a page to the frontend", "add a section to the frontend", "add a collection to the frontend", "change an obligation", "change the journey flow", "change the frontend", "frontend-change add-field|add-page|add-section|add-collection"). NOT for a multi-increment run over a backlog (use journey-builder, which invokes this skill per increment), NOT for the tests repo''s E2E suite, NOT for planning a Jira ticket (use the ticket skill).'
---

Make one change to a frontend repo in this workspace by following the recipe
that repo already ships. What a change targets is a **repo and a set** — the
`src/server/app` platform is set-agnostic by construction and the commodity
line lives in `sets/<set>`, so the domain is an input here, not something this
skill is welded to. Today the target is `trade-imports-animals-frontend` and
`sets/live-animals`; the workspace already holds a second frontend repo and
expects more, so read the target from the caller (or from the build loop's
target profile) rather than assuming it.

The recipes are the instructions — this skill routes to the right one, adds the
guard rails the docs assume, runs the verification ladder, and records what
landed in the workspace's behaviour spec. Do not restate or
improvise around a recipe: read it and follow it, varying as little as possible.
The outcome is one verified increment staged in the target repo, reported and
stopped — commit is the caller's call unless they said otherwise.

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
  copy, colocated `*.fit.spec.js`) and the journey's flow data.

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

NOT for a multi-increment run over a backlog — that is `journey-builder`, which
invokes this skill once per increment. NOT for the tests repo
(`trade-imports-animals-tests` owns the workspace E2E suite), NOT for ticket
planning (`ticket`).

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
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend run test:fit:features
```

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend run test:fit
```

The Playwright suites self-host the app (stub mode) — no workspace stack
needed. They bind :3050 by default, so a running stack on :3000 is left
alone; set `PORT` only if you need a different one. Run
`npm --prefix ... run format` before any commit — the pre-commit hook enforces
format + lint + full units and will reject otherwise.

## Step 5: Sync the behaviour spec

Only once the ladder is green. A red ladder means there is no verified
behaviour to describe — fix that first.

The Behaviour Spec under `~/git/defra/trade-imports-workspace/openspec/`
records intended behaviour (`specs/`) and which tests witness it
(`coverage/`). An increment that lands without updating it is drift the
next rebuild has to absorb. Read `references/SPEC_SYNC.md` before the
first write — it carries the merge technique, the capability lookup and
the file shapes. `openspec/config.yaml` owns the conventions.

**The approach is the hybrid:** write `spec.md` and `coverage.json`
directly, using the merge technique `references/SPEC_SYNC.md` carries,
and validate the spec write with the CLI. No `openspec/changes/`
proposal per increment — the increment already has a planning record
(the ticket's AC, or `journey-builder`'s `journey-spec.json`), and a
second one costs an agent turn on every increment of a backlog. Do not
spin up a throwaway proposal to reach for a lifecycle skill; those
skills are gone.

### 5.1 Identify the capabilities

Read the diff of what you just verified:

```bash
git -C ~/git/defra/trade-imports-workspace/repos/<target repo> diff
```

Map each touched element to its capability path with the two lookup
tables in `references/SPEC_SYNC.md`. Read the set from the caller or the
target profile — `sets/live-animals` maps to the `live-animals/`
namespace, `sets/high-risk-plants` to `plants/`. Do not assume
live-animals because the examples in this file say so.

One increment usually touches one capability. `add-a-section` touches
three: `journey-flow`, `journey-section-captions`, and a newly minted
`journey-pages/<leaf>`.

### 5.2 Write the spec

Existing capability — merge into
`openspec/specs/<path>/spec.md`. New capability — mint an AREA code,
prove no collision, add the `AREAS.md` row, author the initial
Purpose / Requirement / Scenario, and create both files. Both paths are
in `references/SPEC_SYNC.md`.

### 5.3 Write the coverage

Update `openspec/coverage/<path>/coverage.json` for the scenarios you
touched. Links attach to scenarios; the increment's own co-located
`*.fit.spec.js` tests are `fit` links. Never add an `e2e` link for a
test this increment did not write — the E2E suite lives in the tests
repo, which this skill does not touch.

### 5.4 Validate the spec write

Once per capability written:

```bash
~/git/defra/trade-imports-workspace/tools/frontend-change/openspec-validate.sh <capability-path> [<capability-path> ...]
```

Non-zero exit is a halt, not a warning — go to 5.7. `coverage.json` is
not validated: the CLI does not resolve against `openspec/coverage/`.
The self-check in 5.6 is its only gate, so read that write carefully.

### 5.5 Self-check the spec against the diff

The spec must be an account of what the diff implements, not a
copy-forward from a prior increment and not a guess. Make the check
falsifiable: for every scenario you added or changed, name the diff hunk
that implements its THEN clause.

```
SCN-CONSIGN-ADDR-002-A ← src/server/app/sets/<set>/journeys/linear/features/<f>/copy.en.js:31
```

Two ways this fails, both halts:

- A scenario with no diff line behind it — you described behaviour this
  increment did not implement.
- A behavioural change visible in the diff that no scenario covers — you
  implemented behaviour the spec does not record.

### 5.6 Self-check the coverage against the diff

For every `tests[]` link on a scenario this increment touched, confirm
the `file` appears in the diff's file list and the named `test` exists in
that file's current body. A link whose file is not in the diff, on a
scenario you touched, was carried forward without re-verification —
halt.

An untouched scenario's existing links are not in scope. Only what this
increment claims.

### 5.7 On a halt

Do not print the Completion output — the increment is not complete.
Print a mismatch report instead and hand it to the caller:

```
frontend-change HALTED at spec sync: <what disagreed>.

Capability: <capability-path>
Check: 5.4 validate | 5.5 spec vs diff | 5.6 coverage vs diff
Detail: <scenario ID, and the evidence that was missing>
Written so far (uncommitted, workspace repo): <paths>
```

`journey-builder`'s loop re-verifies rather than trusting a worker's
green, so a non-completion lands as a failed increment and the target
repo is rolled back. The workspace-side spec write is **not** rolled
back with it — say what you wrote so the caller can decide.

### 5.8 Staged, not committed

The spec write lands in the workspace checkout and stays there. Do not
`git add` and do not `git commit` in
`~/git/defra/trade-imports-workspace` — the commit decision belongs to
the caller, exactly as it already does for the target repo. This is the
one point where an increment touches two git repositories, so the
Completion output names both.

## Completion output

```
frontend-change complete: <one-line description of the increment>.

Recipe followed: <path>
Files touched: <N> (<key paths>)
Ladder: <unit script> <n>/<n> · npm test <n>/<n> · lint green ·
        features <n>/<n> · e2e <n>/<n>
Spec sync: <capability-path> (<n> scenarios)<, AREA <CODE> minted> ·
           validate green
Design calls: <flagged decisions, or "none — recipe followed verbatim">

Staged, not committed — in TWO checkouts, each needing its own commit:
  <target repo>: <key paths>
  workspace:     openspec/specs/<path>/spec.md,
                 openspec/coverage/<path>/coverage.json
                 <, openspec/coverage/AREAS.md>

Next: review both diffs, then commit (conventional message, EUDPA ticket
prefix).
```

Name every workspace file you wrote. The caller cannot commit what it
has not been told about, and it was not otherwise watching that
checkout.

One increment per invocation. If the request implies several elements, do the
first, stop, and list the remainder for the caller to re-invoke.
