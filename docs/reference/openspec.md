# OpenSpec commands

Workspace-useful commands for the Behaviour Spec under [`openspec/`](../../openspec/). Conventions (MUST not SHALL, Purpose rules, stable IDs, coverage) live in [`openspec/config.yaml`](../../openspec/config.yaml). Area codes: [`openspec/coverage/AREAS.md`](../../openspec/coverage/AREAS.md).

Run from the workspace root. Prefer `npx` so everyone hits the same package without a global install:

```bash
npx --yes @fission-ai/openspec@latest <command>
```

Below, `openspec` is shorthand for that `npx` line. Package: [@fission-ai/openspec](https://github.com/Fission-AI/OpenSpec).

## How the spec stays in sync

The spec is maintained **per increment, by `frontend-change`** — no change proposals. It finishes its verification ladder, then writes the `openspec/specs/` and `openspec/coverage/` entries the increment touched, validates the spec write with `openspec validate <path> --strict`, and self-checks both writes against the diff it just verified. `journey-builder` inherits this: it invokes `frontend-change` once per increment.

**That is the whole of the automated coverage.** `frontend-change` targets frontend repos, and only the two the build loop names (`live-animals`, `high-risk-plants`). A change landed any other way — the `ticket` skill's IMPLEMENT phase, a backend or tests-repo change, a hand edit — still needs a manual spec update, and nothing will remind you at the time. What catches the rest is the periodic catch-up — `tim workspace status`'s staleness line says when one is due, and `spec-catchup` runs it. See [`tim spec`](#tim-spec--validating-and-maintaining-the-binding) below.

This is the hybrid approach — direct write plus CLI validation. `openspec/changes/` stays empty and the propose → apply → sync → archive lifecycle is not used; the increment already has a planning record (the ticket's AC, or `journey-builder`'s `journey-spec.json`), and a second one would cost agent turns on every increment of a backlog. The rationale, the rejected alternatives and the deferred full re-implementation are recorded in [`.claude/skills/frontend-change/decisions.md`](../../.claude/skills/frontend-change/decisions.md) §9; the merge technique and the recipe-to-capability lookup are in [`.claude/skills/frontend-change/references/SPEC_SYNC.md`](../../.claude/skills/frontend-change/references/SPEC_SYNC.md).

### Where the spec write lands

`frontend-change` writes into a **spec root its caller names**, and commits nothing itself. Who commits afterwards depends on which caller you are:

| Caller | Spec root | What happens next |
|---|---|---|
| Direct — a person, or the `ticket` skill | this checkout | The edit is written and left **uncommitted**, with every file named in the skill's completion output. Commit it with the increment it belongs to. |
| `journey-builder` | `workareas/journey-builder/<run>/workspace-worktree` | Committed per increment on branch `spec/<run-id>`, and carried by **one PR per run** raised at run end. |
| `requirements-pipeline` BUILD | this checkout | Committed **per increment**, on whatever branch the workspace is on, straight from the increment build loop's land stage. It **never pushes** and raises **no PR** — so `review`'s `openspec/` checks never fire for a pipeline run, since they only fire where a PR set touches `openspec/`. The periodic catch-up (`spec-catchup`, below) is what covers this path. |

So: unexpected `openspec/` entries in `git status` are the first case, not a stray edit. And an unfamiliar worktree under `workareas/` — a worktree of this repo, nested inside its own working tree — is the second. Both are deliberate. `git worktree prune` clears a stale one; `git clean -fdx` at the repo root would destroy a live one. Unpushed local commits from the third case accumulate on `main` until someone pushes.

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

## Coverage gaps (workspace-owned)

Coverage is not an OpenSpec CLI feature. It lives in `openspec/coverage/<capability-path>/coverage.json`, mirroring each `spec.md`. Query the JSON; do not re-derive gaps by hand.

**Every non-full scenario:**

```bash
find openspec/coverage -name coverage.json -exec jq -r '
  .capability as $cap
  | .requirements[].scenarios[]
  | select(.coverage != "full")
  | "\(.coverage)\t\($cap)\t\(.id)\t\(.name)"
' {} \;
```

**Only uncovered (`none`):**

```bash
find openspec/coverage -name coverage.json -exec jq -r '
  .capability as $cap
  | .requirements[].scenarios[]
  | select(.coverage == "none")
  | "\($cap)\t\(.id)\t\(.name)\t\(.notes // "")"
' {} \;
```

**Specs still missing stable IDs** (expect empty — IDs are required on every requirement and scenario):

```bash
grep -rL '\*\*ID\*\*:' openspec/specs --include=spec.md
```

**Coverage files missing for a capability:**

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

## `tim spec` — validating and maintaining the binding

`frontend-change` keeps the spec honest **per increment**. What was missing was a way to check the
`coverage.json` binding itself — nothing validated it, and `openspec validate --specs --strict` still
reports `0 failed` against a corpus with dangling links — and a periodic sweep for drift no single
increment owns: coverage links whose tests moved, holes nothing has filled, code nobody touched this
week. Both are now built as `tim spec` (no AI) and the `spec-catchup` skill (the one AI piece). Nothing
here gates a PR, a push, a merge or a build run — every command is run by a person or by the sweep, and
every output is a report.

| Command | Job | AI |
|---|---|---|
| `tim spec lint` | Validates the spec ↔ test binding — shape, ID parity, both rollups, prose cross-refs, and (where the repos are cloned) that every link's file exists and its test title resolves. Delegates `## Purpose` / `## Requirements` / ≥1-scenario checks to `openspec validate --specs --strict --json` and merges its issues. Exits non-zero on any finding. Takes a **check-group selector** — see below | none |
| `tim spec status` | Baseline sha and date per repo (from `openspec/baseline.json`), current HEAD, and how many **linked** test files changed since | none |
| `tim spec gaps` | Every scenario that is not `full`, clustered and risk-ordered, rendering each row's existing `notes` verbatim — the diagnosis is already written when the coverage was built | none |
| `tim spec candidates` | What the next sweep should look at: linked files changed since the baseline, `lint`'s unresolved list, `gaps` as known-holes context, grouped into work packets per capability | none |
| `tim spec baseline` / `--advance` | Print the baseline, or move it — only a person runs `--advance`, after accepting a sweep's findings | none |
| `tim spec e2e-overlap` | E2E tests whose every witnessed scenario also has a full-strength `fit` or `unit` witness — a shortlist for judgement, not a delete list | none |

### `tim spec lint`'s check groups

The twelve checks fall into four groups, named for what each one reads. Three are file-local and
finish in about a second; the fourth reads `repos/` and builds a test-title index per repo, which is
the whole cost of a full run.

| Group | Checks | Reads | Cost |
|---|---|---|---|
| `specs` | `## Purpose` / `## Requirements` present · ≥1 scenario per requirement · stable IDs present and globally unique · a `THEN` in every scenario · MUST not SHALL · prose cross-references resolve | `openspec/specs/` | ~1s |
| `coverage` | shape and enums · scenario rollup · requirement rollup · a `none` carries `notes` · `areaCode` against `AREAS.md` · `specFile` path | `openspec/coverage/` | ~0.2s |
| `binding` | a `coverage.json` per `spec.md` and the reverse · ID parity · names verbatim | **both files** | ~0.2s |
| `links` | every link's `file` exists · every link's `test` resolves to a real test title | `openspec/coverage/` + `repos/` + the test runners | **~6 min** |

```bash
tim spec lint                    # all four groups
tim spec lint --skip-links       # the three file-local groups — ~1.5s
tim spec lint --specs            # spec.md conventions only
tim spec lint --specs --coverage # naming more than one unions them
tim spec lint --links            # the repo-reading checks only
```

Naming any group narrows to those; naming none runs all four. `--links` and `--skip-links` together
is refused rather than resolved silently. `--capability` composes with every selector.

**Whatever does not run is reported**, as `Skipped: links: not selected` in text and as a `skipped`
entry plus a `groups` array in `--json`. A narrow pass must never read like a full one — the same rule
that makes a `coverage: "none"` carry a note.

`binding` cannot run in a `specs`-only or `coverage`-only pass: ID parity, name parity and the pairing
check each need both files, which is why the groups are four and not three.

`spec-catchup` (`.claude/skills/spec-catchup/`) calls `tim spec candidates --json` itself, judges only the
work packets it returns, and emits one of four verdicts per finding: **STALE LINK** (fixes
`coverage.json`, applied), **SPEC WRONG** / **SPEC GAP** (proposes a `spec.md` edit, never applies it),
**NO ACTION**. It never advances the baseline itself — it prints `tim spec baseline --advance` for a
person to run after accepting the report.

## Leave out of day-to-day use

`view`, `workset`, `store`, `schema` / `schemas`, `templates`, `instructions`, `completion`, `feedback` — upstream surfaces. Reach for them only when a skill or upstream docs say so; they are not part of the Behaviour Spec maintenance loop.

`init` and `update` too, and for a stronger reason: they regenerate the six `openspec-*` skills this workspace deliberately removed (see [above](#the-openspec--skills-were-removed-on-purpose)). Running either re-pollutes the skill routing surface silently.
