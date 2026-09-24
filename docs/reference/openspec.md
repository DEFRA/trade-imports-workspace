# OpenSpec commands

Workspace-useful commands for the Behaviour Spec under [`openspec/`](../../openspec/). Conventions (MUST not SHALL, Purpose rules, stable IDs, coverage) live in [`openspec/config.yaml`](../../openspec/config.yaml). Area codes: [`openspec/coverage/AREAS.md`](../../openspec/coverage/AREAS.md).

Run from the workspace root. Prefer `npx` so everyone hits the same package without a global install:

```bash
npx --yes @fission-ai/openspec@latest <command>
```

Below, `openspec` is shorthand for that `npx` line. Package: [@fission-ai/openspec](https://github.com/Fission-AI/OpenSpec).

## How the spec stays in sync

The spec is maintained **per increment, by `frontend-change`** — no change proposals. It finishes its verification ladder, then writes the `openspec/specs/` and `openspec/coverage/` entries the increment touched, validates the spec write with `openspec validate <path> --strict`, and self-checks both writes against the diff it just verified. `journey-builder` inherits this: it invokes `frontend-change` once per increment.

**That is the whole of the automated, per-increment coverage.** `frontend-change` targets frontend repos, and only the two the build loop names (`live-animals`, `high-risk-plants`). A change landed any other way — the `ticket` skill's IMPLEMENT phase, a backend or tests-repo change, a hand edit — still needs a manual spec update, and nothing will remind you in the moment. The periodic sweep that catches the rest is `spec-catchup` (drift: the code says something the spec doesn't) and `spec-cover` (gaps: the spec says something no test proves) — see CLAUDE.md's skill table, or "Periodic sweep" below.

This is the hybrid approach — direct write plus CLI validation. `openspec/changes/` stays empty and the propose → apply → sync → archive lifecycle is not used; the increment already has a planning record (the ticket's AC, or `journey-builder`'s `journey-spec.json`), and a second one would cost agent turns on every increment of a backlog. The rationale, the rejected alternatives and the deferred full re-implementation are recorded in [`.claude/skills/frontend-change/decisions.md`](../../.claude/skills/frontend-change/decisions.md) §9; the merge technique and the recipe-to-capability lookup are in [`.claude/skills/frontend-change/references/SPEC_SYNC.md`](../../.claude/skills/frontend-change/references/SPEC_SYNC.md).

### Where the spec write lands

`frontend-change` writes into a **spec root its caller names**, and commits nothing itself. Who commits afterwards depends on which caller you are:

| Caller | Spec root | What happens next |
|---|---|---|
| Direct — a person, or the `ticket` skill | this checkout | The edit is written and left **uncommitted**, with every file named in the skill's completion output. Commit it with the increment it belongs to. |
| `journey-builder` | `workareas/journey-builder/<run>/workspace-worktree` | Committed per increment on branch `spec/<run-id>`, and carried by **one PR per run** raised at run end. |

So: unexpected `openspec/` entries in `git status` are the first case, not a stray edit. And an unfamiliar worktree under `workareas/` — a worktree of this repo, nested inside its own working tree — is the second. Both are deliberate. `git worktree prune` clears a stale one; `git clean -fdx` at the repo root would destroy a live one.

The split exists because a build run needs a rollback boundary. If every increment wrote this checkout uncommitted, a rolled-back increment would undo the code and keep the spec describing it — a `spec.md` asserting behaviour that exists in no repo, which validates green and is worse than the drift the sync exists to stop. A dirty `openspec/` here also silently stalls `tim`'s `--ff-only` auto-pull.

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
drive. No other `tim spec` subcommand exists — anything else here (the
`jq` snippets below) is a hand query, not a maintained surface.

```bash
tim spec lint --specs --coverage --binding [--capability live-animals|plants|ins|admin]
tim spec gaps [--none|--partial] [--capability live-animals|plants|ins|admin]
```

No args means the whole corpus. `--capability` scopes to that prefix and
its descendants.

| Command | Group/flag | Contract |
|---|---|---|
| `lint` | `--specs` | Conventions: Purpose, Requirements, ≥1 scenario, stable IDs, a THEN, MUST not SHALL, live cross-refs |
| `lint` | `--coverage` | Shape, enums, scenario and requirement rollups, a `none` carries notes, `areaCode`, `specFile` |
| `lint` | `--binding` | A `coverage.json` per `spec.md` and the reverse; ID parity; names verbatim |
| `gaps` | `--none` / `--partial` | Every non-full row (naming neither returns both; naming both unions them) |

The three lint groups are independent — naming any narrows to those,
naming none runs all three, and whatever didn't run is reported as "not
selected" rather than omitted. `--binding` is pairing only; it does not
prove `--specs` or `--coverage` — binding can be green while a THEN is
missing or a rollup is wrong.

Lint has **no `--links` group** — a coverage link naming a test that no
longer exists is not a lint finding. `spec-catchup` is what notices that
(comparing links against the suite report, then the source), not `tim
spec lint`.

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

`coverage: "full"` only means at least one linked test was judged `strength: "full"` after reading the body. Then weigh **which** suites those links come from:

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
