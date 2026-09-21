# OpenSpec commands

Workspace-useful commands for the Behaviour Spec under [`openspec/`](../../openspec/). Conventions (MUST not SHALL, Purpose rules, stable IDs, coverage) live in [`openspec/config.yaml`](../../openspec/config.yaml). Area codes: [`openspec/coverage/AREAS.md`](../../openspec/coverage/AREAS.md).

Run from the workspace root. Prefer `npx` so everyone hits the same package without a global install:

```bash
npx --yes @fission-ai/openspec@latest <command>
```

Below, `openspec` is shorthand for that `npx` line. Package: [@fission-ai/openspec](https://github.com/Fission-AI/OpenSpec).

## How the spec stays in sync

The spec is maintained **per increment, by the skill that lands the increment** — no change proposals. `frontend-change` finishes its verification ladder, then writes the `openspec/specs/` and `openspec/coverage/` entries the increment touched, validates the spec write with `openspec validate <path> --strict`, and self-checks both writes against the diff it just verified. `journey-builder` gets this for free: it invokes `frontend-change` once per increment.

This is the hybrid approach — direct write plus CLI validation. `openspec/changes/` stays empty and the propose → apply → sync → archive lifecycle is not used; the increment already has a planning record (the ticket's AC, or `journey-builder`'s `journey-spec.json`), and a second one would cost agent turns on every increment of a backlog. The rationale, the rejected alternatives and the deferred full re-implementation are recorded in [`.claude/skills/frontend-change/decisions.md`](../../.claude/skills/frontend-change/decisions.md) §9; the merge technique and the recipe-to-capability lookup are in [`.claude/skills/frontend-change/references/SPEC_SYNC.md`](../../.claude/skills/frontend-change/references/SPEC_SYNC.md).

**The spec write lands uncommitted.** The Behaviour Spec is in this repo; the frontend code is in its own. `frontend-change` stages the `openspec/` edit in the workspace checkout and names the files in its completion output, but does not commit it — the commit is the caller's, exactly as it is for the target repo. So unexpected `openspec/` entries in `git status` after a build run are that, not a stray edit. Commit them with the increment they belong to.

Reviewing a PR that touches `openspec/`? The `review` skill checks the spec update against the ticket's AC and the coverage links against the PR set's tests, at Critical severity. See `.claude/skills/review/references/FILE_REVIEWER.md` → "Behaviour-spec files".

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

## Next skills (remove when implemented)

`frontend-change` keeps the spec honest **per increment**. Still missing: the periodic sweeps that catch what no single increment owns — drift in code nobody touched this week, coverage links whose tests moved, holes nothing has filled.

**The periodic full-drift-detection sweep is out of scope for EUDPA-574** (which built the per-increment half) and wants its own ticket. `spec-drift` and `coverage-refresh` below are where it belongs.

Build first: `coverage-gaps` → `coverage-refresh` → `spec-drift`.

| Skill | Job |
|---|---|
| `coverage-gaps` | `jq` inventory of none/partial; analysis-only backlog |
| `coverage-refresh` | Re-read test bodies for capabilities whose tests changed; fix rollups / broken links |
| `coverage-audit` | Per-capability: links still assert the THEN clauses? |
| `coverage-for-scenario` | Given `SCN-…`, find witnesses or confirm `none` |
| `missing-tests` | Turn none/partial into a test plan (implement only if asked) |
| `spec-drift` | Spec ↔ code: CLEAN / DRIFT / SPEC GAP |
| `spec-from-tests` | New test proves behaviour → small spec edit, same technique as `frontend-change` Step 5 |
| `spec-rename-guard` | After a capability rename: refs, `AREAS.md`, coverage paths (IDs stay) |

Rules: never put test names in `spec.md`; never invent AREA codes; report before apply; scope by capability except the gaps inventory.

## Leave out of day-to-day use

`view`, `workset`, `store`, `schema` / `schemas`, `templates`, `instructions`, `completion`, `feedback` — upstream surfaces. Reach for them only when a skill or upstream docs say so; they are not part of the Behaviour Spec maintenance loop.
