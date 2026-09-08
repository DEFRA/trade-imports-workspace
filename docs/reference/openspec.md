# OpenSpec commands

Workspace-useful commands for the Behaviour Spec under [`openspec/`](../../openspec/). Conventions (MUST not SHALL, Purpose rules, stable IDs, coverage) live in [`openspec/config.yaml`](../../openspec/config.yaml). Area codes: [`openspec/coverage/AREAS.md`](../../openspec/coverage/AREAS.md).

Run from the workspace root. Prefer `npx` so everyone hits the same package without a global install:

```bash
npx --yes @fission-ai/openspec@latest <command>
```

Below, `openspec` is shorthand for that `npx` line. Package: [@fission-ai/openspec](https://github.com/Fission-AI/OpenSpec).

For change proposals (propose / apply / sync / archive), use the workspace `openspec-*` skills — not this sheet.

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

## Changes (thin)

Only when you need the CLI without a skill:

| Command | What it does |
|---------|--------------|
| `openspec list` | List active changes (default; not specs) |
| `openspec status --change <name>` | Artifact completion for one change |
| `openspec validate --changes` | Validate all changes |
| `openspec validate --all` | Validate changes and specs |

Prefer the `openspec-propose`, `openspec-apply-change`, `openspec-update-change`, `openspec-sync-specs`, and `openspec-archive-change` skills for the full lifecycle.

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

Existing `openspec-*` skills cover planned deltas. Still missing: keep **main** specs and coverage honest day-to-day.

Build first: `coverage-gaps` → `coverage-refresh` → `spec-drift`.

| Skill | Job |
|---|---|
| `coverage-gaps` | `jq` inventory of none/partial; analysis-only backlog |
| `coverage-refresh` | Re-read test bodies for capabilities whose tests changed; fix rollups / broken links |
| `coverage-audit` | Per-capability: links still assert the THEN clauses? |
| `coverage-for-scenario` | Given `SCN-…`, find witnesses or confirm `none` |
| `missing-tests` | Turn none/partial into a test plan (implement only if asked) |
| `spec-drift` | Spec ↔ code: CLEAN / DRIFT / SPEC GAP |
| `spec-from-tests` | New test proves behaviour → propose small spec delta |
| `spec-change` | Propose/update wrapper that respects `AREAS.md` + `config.yaml` |
| `spec-rename-guard` | After a capability rename: refs, `AREAS.md`, coverage paths (IDs stay) |

Rules: never put test names in `spec.md`; never invent AREA codes; report skills before apply modes; scope by capability except the gaps inventory.

## Leave out of day-to-day use

`view`, `workset`, `store`, `schema` / `schemas`, `templates`, `instructions`, `completion`, `feedback` — upstream surfaces. Reach for them only when a skill or upstream docs say so; they are not part of the Behaviour Spec maintenance loop.
