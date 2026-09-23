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
The outcome is one verified increment written but uncommitted in the target
repo, reported and stopped — commit is the caller's call unless they said
otherwise.

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

**The repo path and the unit script are inputs, not constants.** The
command above is the live-animals target spelled out; for any other
target, take the checkout and the script name from the caller or from the
build loop's target profile (`tools/journey-builder/targets.json` →
`repo`, `verify.unit`), exactly as Step 5 takes the set. Under
`journey-builder` the checkout is the run's worktree, not `repos/<name>`.
Every `npm --prefix` and every repo path in Steps 2 and 4 substitutes the
same way.

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
The repo path and the unit script substitute per target, as Step 2 says.

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

The Behaviour Spec under `openspec/` records intended behaviour
(`specs/`) and which tests witness it (`coverage/`). An increment that
lands without updating it is drift the next rebuild has to absorb. Read
`references/SPEC_SYNC.md` before the first write — it carries the merge
technique, the capability lookup and the file shapes.
`openspec/config.yaml` owns the conventions.

**The approach is the hybrid:** write `spec.md` and `coverage.json`
directly, using the merge technique `references/SPEC_SYNC.md` carries,
and validate the spec write with the CLI. No `openspec/changes/`
proposal per increment — the increment already has a planning record
(the ticket's AC, or `journey-builder`'s `journey-spec.json`), and a
second one costs an agent turn on every increment of a backlog. Do not
spin up a throwaway proposal to reach for a lifecycle skill; those
skills are gone.

### 5.0 Resolve the two roots

This is the one step that touches **two git repositories**, so name both
checkouts before writing anything.

| Root | What it is | Default |
|---|---|---|
| **Target repo** | the checkout you just implemented and verified in | the caller's repo — `repos/<name>` on a direct invocation, the run's worktree under `journey-builder` |
| **Spec root** | the checkout whose `openspec/` this increment writes | `~/git/defra/trade-imports-workspace` unless the caller named one |

Under `journey-builder` **both** are worktrees, not the `repos/…` and
workspace checkouts — the loop passes them. Resolve every path in this
step, and the `--root` argument in 5.4, against these two. Hardcoding
either validates and self-checks the wrong tree, silently and green.

Who commits afterwards differs by caller, and 5.8 is where that is
settled. This skill runs no `git add` and no `git commit` on either
checkout, on either path.

### 5.1 Identify the capabilities

Read the diff of what you just verified. **`git diff` alone is wrong
here** — it shows modified tracked files only, and an `add-a-page` or
`add-a-section` increment creates an entire untracked feature folder
(`controller.js`, `copy/`, `template.njk`, `<name>.fit.spec.js`). That is
exactly the new-capability case, so a plain `git diff` would show nothing
for the increments that need this step most, and 5.5 and 5.6 would both
misfire. Intent-to-add first, so new files appear in the diff:

```bash
git -C <target repo> add -N .
```

```bash
git -C <target repo> diff
```

`add -N` records the path in the index and nothing else — the content
stays unstaged, so this does not commit anything or change what 5.8
promises. Throughout 5.5 and 5.6, "the diff's file list" therefore means
tracked modifications **and** newly created files.

One consequence worth knowing: an intent-to-add path is no longer
*untracked*, so a bare `git clean -fd` walks straight past it. Anything
undoing an increment must `git reset` the paths first or the new files
survive the rollback — `journey-builder`'s `rollback-increment.sh` does.

Map each touched element to its capability path with the lookup tables in
`references/SPEC_SYNC.md`. Read the set from the caller or the target
profile — `sets/live-animals` maps to the `live-animals/` namespace,
`sets/high-risk-plants` to `plants/`. Do not assume live-animals because
the examples in this file say so. The leaf is named for the page the user
sees, not the feature directory; `SPEC_SYNC.md` has the mismatch table
and the explicit judgement it demands.

One increment usually touches one capability. `add-a-section` touches
three: `journey-flow`, `journey-section-captions`, and a newly minted
`journey-pages/<leaf>`.

### 5.1a When the increment changes no observable behaviour

Some increments have nothing to say here: an L2 platform refactor, a
dependency bump, a routed "change the frontend" that moves code without
changing what a user can observe. The Behaviour Spec records observable
behaviour only, so for those the correct spec write is **none**.

If the diff changes no observable behaviour, write nothing, skip 5.2–5.6,
and report `Spec sync: none` with the reason. Do not invent a scenario to
fill the line — a spec that describes a refactor is worse than one that
stays silent about it, because it validates green and misleads.

This is a judgement you make once and state, not a way out of a hard
mapping. If a user could see the difference, it belongs in the spec.

### 5.2 Write the spec

Existing capability — merge into
`<spec root>/openspec/specs/<path>/spec.md`. New capability — prove it is
genuinely new (both greps), mint an AREA code, add the `AREAS.md` row,
author the initial Purpose / Requirement / Scenario, and create both
files. Both paths are in `references/SPEC_SYNC.md`.

### 5.3 Write the coverage

Update `<spec root>/openspec/coverage/<path>/coverage.json` for the
scenarios you touched. Links attach to scenarios; the increment's own
co-located `*.fit.spec.js` tests are `fit` links. Never add an `e2e` link
for a test this increment did not write — the E2E suite lives in the
tests repo, which this skill does not touch. `SPEC_SYNC.md` carries the
full object shape; `tim spec lint` can check it later, but nothing
checks it here, so copy the exemplar key-for-key.

### 5.4 Validate the spec write

Once per capability written, rooted at the spec root from 5.0:

```bash
~/git/defra/trade-imports-workspace/tools/frontend-change/openspec-validate.sh --root <spec root> <capability-path> [<capability-path> ...]
```

The helper itself always lives in the workspace checkout — that path is
literal. `--root` is what points it at the tree you actually wrote.

Non-zero exit is a halt, not a warning — go to 5.7. `coverage.json` is
not validated here: the OpenSpec CLI does not resolve against
`openspec/coverage/`. The self-check in 5.6 is this step's only gate —
`tim spec lint` checks coverage.json corpus-wide, but that runs on
demand or in the periodic sweep, not per increment — so read that write
carefully.

### 5.5 Self-check the spec against the diff

The spec must be an account of what the diff implements, not a
copy-forward from a prior increment and not a guess. Make the check
falsifiable: for every scenario you added or changed, name the diff hunk
that implements its THEN clause.

```
SCN-CONSIGN-ADDR-002-A ← src/server/app/sets/<set>/journeys/linear/features/<f>/copy/copy.en.js:31
```

Two ways this fails, both halts:

- A scenario with no diff line behind it — you described behaviour this
  increment did not implement.
- A behavioural change visible in the diff that no scenario covers — you
  implemented behaviour the spec does not record.

### 5.6 Self-check the coverage against the diff

For every `tests[]` link on a scenario this increment touched, confirm
the `file` appears in the diff's file list (5.1's sense: modified **or**
newly created) and the named `test` exists in that file's current body. A
link whose file is not in the diff, on a scenario you touched, was
carried forward without re-verification — halt.

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
Spec root: <path>
Written so far (uncommitted): <paths>
```

`journey-builder`'s loop re-verifies rather than trusting a worker's
green, so a non-completion lands as a failed increment: it rolls back the
target worktree **and** the spec write in its workspace worktree. Name
what you wrote either way — on the direct path that line is the caller's
to act on; under the loop it is where the rollback will look.

### 5.8 Written, not committed — by this skill

The spec write lands in the spec root and stays there. Do not `git add`
(beyond 5.1's `add -N`, which stages nothing) and do not `git commit`, in
either checkout, on either path. The commit decision belongs to the
caller — exactly as it already does for the target repo.

What the caller then does with it differs, and the Completion output says
which case you are in:

| Caller | Spec root | Who commits |
|---|---|---|
| Direct — a person, or the `ticket` skill | `~/git/defra/trade-imports-workspace` | Nobody yet. Left uncommitted and named in the Completion output; the caller commits it with the rest of their work. |
| `journey-builder` | the run's workspace worktree | `commit-increment.sh`, per increment, on the run's `spec/<run-id>` branch. One PR at run end. |

**Why the spec root is an input and not a constant.** If this step always
wrote the main workspace checkout, a `journey-builder` rollback would undo
the code and keep the spec describing it — a `spec.md` asserting behaviour
that exists in no repo. That is drift-by-assertion, and it is worse than
the drift-by-omission this step exists to stop, because it validates
green. A later edit that "tidies" the root back to a constant
reintroduces exactly that bug.

## Completion output

```
frontend-change complete: <one-line description of the increment>.

Recipe followed: <path>
Files touched: <N> (<key paths>)
Ladder: <unit script> <n>/<n> · npm test <n>/<n> · lint green ·
        features <n>/<n> · e2e <n>/<n>
Spec sync: <capability-path> (<n> scenarios)<, AREA <CODE> minted> ·
           validate green
Spec root: <path>
Spec files: openspec/specs/<path>/spec.md,
            openspec/coverage/<path>/coverage.json
            <, openspec/coverage/AREAS.md>
Design calls: <flagged decisions, or "none — recipe followed verbatim">

Uncommitted, in TWO checkouts:
  <target repo>: <key paths>
  <spec root>:   <the spec files above>

Next: review both diffs, then commit (conventional message, EUDPA ticket
prefix).
```

Where 5.1a applied, the spec lines collapse to one and the rest of the
block is unchanged:

```
Spec sync: none — no observable behaviour change (<one clause: why>)
```

On the `journey-builder` path the closing line reads
`Uncommitted — journey-builder commits both` instead: telling the loop to
go and commit by hand would be wrong, and the skill knows which path it
is on because the caller passed a spec root.

Name every spec file you wrote. The caller cannot commit or review what
it has not been told about, and on the direct path it was not otherwise
watching that checkout.

One increment per invocation. If the request implies several elements, do the
first, stop, and list the remainder for the caller to re-invoke.
