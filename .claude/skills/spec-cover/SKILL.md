---
name: spec-cover
description: 'Cover Behaviour Spec scenarios that have no adequate test — the spec says something no test proves. Uses tim spec gaps, proposes a concrete test per gap, auto-writes the test in a service repo, updates coverage.json links, auto-fixes lint/test fallout. No human walk. Does not advance the baseline. Produces workareas/spec-cover/<date>/. Use when the user asks to cover gaps, prove the spec, or fill coverage holes (triggers: "cover the gaps", "prove the spec", "spec-cover", "fill coverage holes", "write tests for open gaps"). NOT for catching the spec up with moved code — use spec-catchup. NOT for linting the binding — use tim spec lint.'
context: fork
allowed-tools: [Bash, Read, Glob, Edit, Write, Task]
---

Cover holes the coverage matrix already records: scenarios that are
`none` or `partial` because no test (or only a weak one) proves the
claim.

**Direction:** *the spec says something no test proves* — write a test
in a **service repo**, then update `openspec/coverage/` links in this
workspace. The opposite direction is `spec-catchup` (writes `spec.md`).

Nothing gates CI. Baseline stays put — only catch-up advances it.
**No walk** — seeded findings are auto-accepted and applied by the agent.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash expands `~`
automatically. Skill-internal references stay relative
(`references/<NAME>.md`).

**Run directory** — every artifact for a run lives under
`~/git/defra/trade-imports-workspace/workareas/spec-cover/<YYYY-MM-DD>/`
(`findings.json`, `report.md`, `gaps.json`, `payload.json`,
`judge-*.json`, scratch). Do **not** write those files directly under
`workareas/spec-cover/`.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## When to use

| Trigger | What to follow |
|---------|----------------|
| "cover the gaps", "prove the spec", "spec-cover", "fill coverage holes", "write tests for open gaps" | this SKILL.md — full run |

Prefer starting with `none` (unproven). Use `--partial` when the user
asks to strengthen weak witnesses.

NOT for drift since the baseline — use `spec-catchup`. NOT for rewriting
requirements to match missing tests — that hides the hole.

## Subagents

Fan-out when it pays off. Emit **all** Task calls in one assistant
turn (`subagent_type: general-purpose`).

| When | Spawn | Persona | Writes |
|---|---|---|---|
| ≥ ~4 gap rows | One Task per gap (or a small batch that shares one test file) | [`references/PROPOSER.md`](references/PROPOSER.md) then [`references/APPLY.md`](references/APPLY.md) in the same worker | test under `repos/<repo>/`, matching `coverage.json`, `workareas/spec-cover/<date>/judge-<id>.json` |

Parent session: collect proposals into `payload.json`, seed, auto-accept,
mark `applied` once each worker's lint is clean. Serialize workers that
would edit the same coverage.json or the same test file.

Zero or one gap stays inline.

## Step 0: Refuse if unsafe

1. **`openspec/` must be clean — unless continuing today's cover run.**
   ```bash
   git -C ~/git/defra/trade-imports-workspace status --porcelain -- openspec/
   ```
   Non-empty is OK only when
   `workareas/spec-cover/<today>/findings.json` already exists and you
   are finishing that run.
2. Target service repo(s) should be on a sensible branch (usually
   `main` or the ticket branch). If dirty in a way that risks clobbering
   work, ask before writing tests.

## Step 1: Scope — mechanical

```bash
tim spec gaps --none --json
```

Or `tim spec gaps --partial --json` / `tim spec gaps --json` when asked.
Persist under the run dir as `gaps.json`. Each row is a candidate gap.

If zero rows, stop — nothing to cover.

## Step 2: Propose a test per gap

Follow [`references/PROPOSER.md`](references/PROPOSER.md). For each gap
produce one finding:

| Verdict | When |
|---|---|
| **write-test** | `coverage: none` — need a new witness |
| **strengthen** | `coverage: partial` — add or upgrade a witness toward `full` |
| **accept-gap** | Honest call that we will not cover this now (notes may improve) |

Every finding needs:

- One-sentence judgement (what is unproven, and why this test tier)
- `proposal.repo`, `proposal.type` (`e2e` \| `fit` \| `unit`), `proposal.file`
- `proposal.diff` — the test to add (unified diff or `+` lines)
- Optional `proposal.coverageFile` + `proposal.coverageDiff` for the
  coverage.json link update

Prefer **fit** for page behaviour in stub mode, **e2e** for integrated
paths, **unit** for mechanism only — see
`docs/reference/openspec.md` → "Reading a coverage row". Do not claim
`strength: "full"` for a weak assertion.

Ambiguous gaps → leave out of the seed; list under Unresolved in
completion notes. Write judge scratch as
`workareas/spec-cover/<date>/judge-*.json`.

## Step 3: Seed

```bash
tim spec findings seed --skill cover --file ~/git/defra/trade-imports-workspace/workareas/spec-cover/<date>/payload.json
```

Re-seeding a date that already has rulings needs `--force` (or a new date).

Payload:

```json
{
  "date": "YYYY-MM-DD",
  "findings": [
    {
      "id": "F-001",
      "verdict": "write-test",
      "capability": "plants/authentication",
      "anchor": "SCN-PLANTS-AUTH-002-A",
      "judgement": "No plants test asserts the invalid-credentials message.",
      "evidence": { "notes": "<verbatim gap notes from tim spec gaps>" },
      "proposal": {
        "repo": "trade-imports-animals-tests",
        "type": "e2e",
        "file": "tests/e2e/plants/auth-invalid.spec.ts",
        "diff": "+…",
        "coverageFile": "openspec/coverage/plants/authentication/coverage.json",
        "coverageDiff": "+…"
      }
    }
  ]
}
```

## Step 4: Auto-apply every finding

No human approval. For each pending finding, in id order:

1. `tim spec findings rule F-00N --skill cover --accept`
2. Follow [`references/APPLY.md`](references/APPLY.md) — write the test,
   run the narrowest relevant test command, update coverage.json, run
   `tim spec lint --coverage --binding --capability <path>`, **fix any
   red test or lint failure yourself** until clean, then
   `tim spec findings applied F-00N --skill cover`.
3. If it cannot be made green after a reasonable fix attempt, `--defer`
   with a note, revert that finding's edits if needed, and continue.

Do **not** run `tim spec baseline --advance` — cover does not own the
baseline.

## Completion output

```
Spec cover complete for <date>.

<N> findings: <a> write-test · <b> strengthen · <c> accept-gap
Applied: <list of test files> · Deferred: <list or none>
Coverage updates (uncommitted): <list>
Baseline: unchanged (catch-up only)

Run: ~/git/defra/trade-imports-workspace/workareas/spec-cover/<date>/
```
