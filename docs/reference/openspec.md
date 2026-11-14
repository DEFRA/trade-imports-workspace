# OpenSpec commands

Workspace-useful commands for the Behaviour Spec under [`openspec/`](../../openspec/). Conventions (MUST not SHALL, Purpose rules, stable IDs, coverage) live in [`openspec/config.yaml`](../../openspec/config.yaml). Area codes: [`openspec/coverage/AREAS.md`](../../openspec/coverage/AREAS.md). The spec prefixes (`live-animals`, `admin`, `ins`, `plants`) and the test domains they match: [Test and spec vocabulary](../testing/test-and-spec-vocabulary.md).

Run from the workspace root. Prefer `npx` so everyone hits the same package without a global install:

```bash
npx --yes @fission-ai/openspec@latest <command>
```

Below, `openspec` is shorthand for that `npx` line. Package: [@fission-ai/openspec](https://github.com/Fission-AI/OpenSpec).

## How the spec stays in sync

The spec is maintained **per increment, by `frontend-change`** — no change proposals. It finishes its verification ladder, then writes the `openspec/specs/` and `openspec/coverage/` entries the increment touched, validates the spec write with `tim spec lint --capability <path>`, which runs `openspec validate <path> --strict`, and self-checks both writes against the diff it just verified. Before it marks a coverage link `strength: "full"` it runs a red probe, as `spec-cover` does: invert the production line the scenario depends on, see the test fail, restore the line, see it pass. The `requirements-pipeline` build loop inherits this: it routes each frontend row through `frontend-change`.

**That is the whole of the automated, per-increment coverage.** `frontend-change` targets frontend repos, and only the sets it lists (`live-animals`, `high-risk-plants`, and `germinal-products` once the Design Release 2.1 programme creates that set in `trade-imports-animals-frontend`; it writes to the `live-animals/`, `plants/` and `germinal-products/` namespaces). A change landed any other way — the `ticket` skill's IMPLEMENT phase, a backend or tests-repo change, a hand edit — still needs a manual spec update, and nothing will remind you in the moment. The periodic sweep that catches the rest is `spec-catchup` (drift: the code says something the spec doesn't) and `spec-cover` (gaps: the spec says something no test proves) — see CLAUDE.md's skill table, or "Periodic sweep" below.

This is the hybrid approach — direct write plus CLI validation. `openspec/changes/` stays empty and the propose → apply → sync → archive lifecycle is not used; the increment already has a planning record (the ticket's AC, or the backlog row), and a second one would cost agent turns on every increment of a backlog. The rationale, the rejected alternatives and the deferred full re-implementation are recorded in [`.claude/skills/frontend-change/decisions.md`](../../.claude/skills/frontend-change/decisions.md) §9; the merge technique and the recipe-to-capability lookup are in [`.claude/skills/frontend-change/references/SPEC_SYNC.md`](../../.claude/skills/frontend-change/references/SPEC_SYNC.md).

### The spec on `main` matches the code on `main`

The spec on workspace `main` says only what the service repos' `main` code does.

- Spec changes for a code branch go on a workspace branch with the same name as that code branch.
- That workspace branch merges to `main` when the code merges, never before.
- Never put spec for unmerged code on workspace `main`.

### Where the spec write lands

`frontend-change` writes into a **spec root its caller names** — this checkout unless the caller names another — and commits nothing itself. The edit is left **uncommitted**, with every file named in the skill's completion output; the caller commits it with the increment it belongs to. So unexpected `openspec/` entries in `git status` are deliberate, not a stray edit.

The spec root is an input so that a caller that rolls back an increment rolls back its spec with it. If every increment wrote this checkout, a rolled-back increment would undo the code and keep the spec describing it — a `spec.md` asserting behaviour that exists in no repo, which validates green and is worse than the drift the sync exists to stop. A dirty `openspec/` here also silently stalls `tim`'s `--ff-only` auto-pull.

### Reviewing a PR that touches `openspec/`

The `review` skill checks the spec update against the ticket's AC and the coverage links against the PR set's tests, at Critical severity. See `.claude/skills/review/references/FILE_REVIEWER.md` → "Behaviour-spec files".

### The `openspec-*` skills were removed on purpose

Six CLI-generated lifecycle skills (`openspec-propose`, `-apply-change`, `-update-change`, `-sync-specs`, `-archive-change`, `-explore`) used to live under `.claude/skills/`. EUDPA-574 deleted them: with no change proposals there is nothing for them to act on, and `openspec-sync-specs`'s merge technique now lives in `frontend-change`'s own `references/SPEC_SYNC.md`.

They were generated, not written, so **`openspec init` and `openspec update` will put them back** — those commands re-emit OpenSpec's instruction files for every tool they detect. If they reappear, delete them again; their return is not a decision anyone made.

## Specs day-to-day

| Command | What it does |
|---------|--------------|
| `openspec list --specs` | List every capability under `openspec/specs/` |
| `openspec list --specs --json` | Same, machine-readable |
| `openspec show <path> --type spec` | Print one capability (e.g. `live-animals/journey-pages/origin-of-import`) |
| `openspec validate --specs --strict` | Validate all specs; must stay `0 failed` after edits |
| `openspec validate <path> --strict` | Validate one capability after editing it |
| `openspec doctor` | Relationship health for the resolved OpenSpec root |
| `openspec context` | Working context for the resolved root (path, schema) |

Aliases also exist under `openspec spec list|show|validate` — same idea.

## `tim spec` — lint and gaps

The two deterministic checks the `spec-catchup` and `spec-cover` skills
drive. `tim spec diff` (see `tim spec diff --help`) reports what commits
changed in the spec. Anything else here (the `jq` snippets below) is a
hand query, not a maintained surface.

```bash
tim spec lint --specs --coverage --binding [--capability live-animals|plants|germinal-products|ins|admin]
tim spec gaps [--none|--partial] [--capability live-animals|plants|germinal-products|ins|admin]
```

No args means the whole corpus. `--capability` scopes to that prefix and
its descendants. `germinal-products` has no capabilities until the Design
Release 2.1 build writes the first one, so until then `--capability
germinal-products` exits 2 with `Can't find capability
"germinal-products"` — that means "nothing written yet", not a broken
spec.

| Command | Group/flag | Contract |
|---|---|---|
| `lint` | `--specs` | Conventions: Purpose, Requirements, ≥1 scenario, stable IDs, a THEN, MUST not SHALL, live cross-refs, a page spec's Maturity and Page lines, well-formed Signed off marks, Signed off marks on a page spec only at `agreed` or `readyForLive` |
| `lint` | `--coverage` | Shape, enums, scenario and requirement rollups, a `none` carries notes, `areaCode`, `specFile`, no id twice in one `coverage.json` |
| `lint` | `--binding` | A `coverage.json` per `spec.md` and the reverse; ID parity; names verbatim; every link's file and test title present under `repos/`; each page spec's Maturity matches its page's `maturity` in the frontend under `repos/` |
| `gaps` | `--none` / `--partial` | Every non-full row (naming neither returns both; naming both unions them) |

The three lint groups are independent — naming any narrows to those,
naming none runs all three, and whatever didn't run is reported as "not
selected" rather than omitted. `--binding` only checks the joins — between
spec.md and coverage.json (pairing, ID parity, names verbatim), and between
each coverage link and its test file; it does not prove `--specs` or
`--coverage` — binding can be green while a THEN is missing or a rollup is
wrong.

The link check reads the test file in the local checkout under `repos/`,
on whatever branch it is on. A title passes when the file, or a module it
imports by a relative path, holds it word for word, as a parameterised
title (`%s`, `$name`, `${…}`) that expands to it, or as a method name. A
link into a repo that is not checked out is not checked, and its repo is
listed under `skipped`. It proves the named test exists, not that it
witnesses the scenario: that is still the red probe's job.

### Page maturity and signed-off scenarios

Two marks tie the spec to a page's maturity banner. The full rules are in
[`openspec/config.yaml`](../../openspec/config.yaml).

| Mark | Where | Lint checks |
|---|---|---|
| `**Maturity**: exploring` | First line under `## Purpose` in every `journey-pages` page spec | Present once, under Purpose, one of `exploring`, `detailing`, `agreed`, `readyForLive`. Admin page specs may leave it out. No other spec carries one. |
| `**Page**: hub` | Under `## Purpose` in a `journey-pages` page spec whose folder name is not its page's `id` | At most once, under Purpose, only in a page spec, one word: the `id` in the page's `page.js`, declared by one `page.js` only. |
| `**Signed off**: 2026-11-11` | The line directly after a scenario's ID line, in any spec | Once per scenario, directly after the ID line, a real `YYYY-MM-DD` date. Never on a requirement or outside a scenario. In a page spec, only when its Maturity is `agreed` or `readyForLive`. |

With the frontend checked out under `repos/`, the binding group also
checks each page spec's Maturity line matches the `maturity` its page
declares. The page is the one in a `page.js` under the frontend's `src/`
whose `id` is the spec's folder name, or the one its Page line names.

| Spec prefix | Frontend |
|---|---|
| `live-animals` | `trade-imports-animals-frontend` |
| `plants` | `trade-imports-plants-frontend` |
| `ins` | `trade-imports-ins-frontend` |

Admin page specs are not checked. A frontend that is not checked out is
listed under `skipped`, as `page-maturity`.

A signed-off scenario is part of a signed-off page's contract, and the
tests its coverage links are that contract's evidence. Only the
increment build loop checks for a change to either, before it merges:
see [`.claude/rules/signed-off-pages.md`](../../.claude/rules/signed-off-pages.md).

### The spec check on pull requests

[`.github/workflows/spec-check.yml`](../../.github/workflows/spec-check.yml)
runs `tim spec lint` on every workspace pull request that touches
`openspec/`, `tim/src/spec/` or the workflow itself. It fails when lint
finds anything, and writes its report to the job summary. It is not a
required check.

No service repo is checked out. The job creates an empty `repos/`, which
`tim` needs to recognise the workspace root, so lint lists every repo's
test-title check under `skipped`.

`tim spec gaps` is **not** the `spec-catchup` work list — a scenario can
be `coverage: "full"` and still have drifted words. It's `spec-cover`'s
work list: `tim spec gaps --none` is what to cover next; `--partial` only
when asked to strengthen an existing weak witness.

## Coverage gaps — hand fallback

Prefer `tim spec gaps` and `tim spec lint` above — they're the
maintained surface, with `--capability` scoping and `--json` output a
skill can consume. What follows is the same four queries run by hand:
reach for one when `tim` isn't on `PATH`, or for a one-off check outside
a skill run. Coverage is not an OpenSpec CLI feature either way — it
lives in `openspec/coverage/<capability-path>/coverage.json`, mirroring
each `spec.md`. Query the JSON; do not re-derive gaps by hand.

**Every non-full scenario** — same as `tim spec gaps`:

```bash
find openspec/coverage -name coverage.json -exec jq -r '
  .capability as $cap
  | .requirements[].scenarios[]
  | select(.coverage != "full")
  | "\(.coverage)\t\($cap)\t\(.id)\t\(.name)"
' {} \;
```

**Only uncovered (`none`)** — same as `tim spec gaps --none`:

```bash
find openspec/coverage -name coverage.json -exec jq -r '
  .capability as $cap
  | .requirements[].scenarios[]
  | select(.coverage == "none")
  | "\($cap)\t\(.id)\t\(.name)\t\(.notes // "")"
' {} \;
```

**Specs still missing stable IDs** — same as `tim spec lint --specs`
(expect empty — IDs are required on every requirement and scenario):

```bash
grep -rL '\*\*ID\*\*:' openspec/specs --include=spec.md
```

**Coverage files missing for a capability** — same as `tim spec lint
--binding`'s pairing check:

```bash
comm -23 \
  <(find openspec/specs -name spec.md | sed 's|specs|coverage|;s|spec.md|coverage.json|' | sort) \
  <(find openspec/coverage -name coverage.json | sort)
```

## Changes

Not used here — see [How the spec stays in sync](#how-the-spec-stays-in-sync). `openspec/changes/` holds nothing but its `archive/.gitkeep`, so `openspec list`, `openspec status --change` and `openspec validate --changes` have nothing to report. `openspec validate --specs --strict` is the one you want, and it is in the table above.

## Reading a coverage row

`coverage: "full"` only means at least one linked test was judged `strength: "full"` after reading the body. Links written by `frontend-change` or `spec-cover` were also probed red. Older links may not have been, so a `full` link to a test you have never seen fail is worth probing before you rely on it. Then weigh **which** suites those links come from:

| Evidence | Confidence that *this scenario* is verified |
|---|---|
| Fit **and** E2E both full | Highest — page shape + integrated path |
| E2E full, no fit | High for integration / lifecycle / obligation negatives; medium for fine-grained UI |
| Fit full, no E2E | High for page behaviour in stub mode; weaker for real services |
| Unit only | Mechanism / config — not product observation |

Prefer **E2E** when the scenario is about the system; **fit** when it’s about the page; **both** when the requirement is load-bearing.

## Periodic sweep

`frontend-change` keeps the spec honest **per increment**; the periodic
sweep that catches what no single increment owns — drift in code
nobody touched this week, coverage links whose tests moved, holes
nothing has filled — is `spec-catchup` and `spec-cover`, one journey
set at a time. Triggers, the shared loop, and the suite table live in
each skill's own `SKILL.md` (`.claude/skills/spec-catchup/`,
`.claude/skills/spec-cover/`); routing is in CLAUDE.md's skill table.

`tim spec lint`'s three groups also catch most of what a capability
rename would otherwise silently break — a dangling cross-reference
(`--specs`), a stale `AREAS.md` row or `specFile` mismatch
(`--coverage`), an orphaned `spec.md`/`coverage.json` pair
(`--binding`) — and `spec-catchup` won't let you commit until lint is
clean for the prefix you're sweeping.

## Leave out of day-to-day use

`view`, `workset`, `store`, `schema` / `schemas`, `templates`, `instructions`, `completion`, `feedback` — upstream surfaces. Reach for them only when a skill or upstream docs say so; they are not part of the Behaviour Spec maintenance loop.

`init` and `update` too, and for a stronger reason: they regenerate the six `openspec-*` skills this workspace deliberately removed (see [above](#the-openspec--skills-were-removed-on-purpose)). Running either re-pollutes the skill routing surface silently.
