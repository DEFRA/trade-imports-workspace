# Walker — cover findings

Walk pending cover findings for approval, then hand accepts to
[`APPLY.md`](APPLY.md).

**Trigger:** after seed in `SKILL.md`, or `"walk cover"` /
`"walk spec-cover"`.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../../docs/agent-skills.md) → "Bash call hygiene".

## Step 1: Load pending

```bash
tim spec findings list --skill cover --pending --json
```

```bash
tim spec findings counts --skill cover --json
```

If empty and `allRuled`, stop — report completion. Cover does not
advance the baseline.

## Step 2: Present one finding

```markdown
**Cover walk** — <id> (<i> of <n> pending)

| Field | Value |
|---|---|
| Verdict | write-test / strengthen / accept-gap |
| Capability | … |
| Anchor | SCN-… |
| Judgement | <one sentence> |
| Repo / type | <repo> · e2e\|fit\|unit |
| Test file | <path> |

**Gap notes:** …
**Proposed test:**
```diff
…
```

**Proposed coverage link:** (if any)
```diff
…
```

**Triage:** `A` = accept · `R` = reject · `E` = edit · `D` = defer · `S` = skip

Your input:
```

## Step 3: Record + apply

| Input | Action |
|---|---|
| `A` | `tim spec findings rule F-00N --skill cover --accept` → APPLY → `applied` |
| `R` | `… --reject --note "…"` |
| `E` | Revise proposal, `--edit`, then APPLY → `applied` |
| `D` | `… --defer --note "…"` |
| `S` | Leave pending |

For **accept-gap** accepts: APPLY may only update `notes` on the
coverage row (no new test). Still mark `applied` after the notes edit.

## Step 4: Done

```bash
tim spec findings counts --skill cover --json
```

Report applied test paths and uncommitted coverage files. Remind that
baseline is unchanged.
