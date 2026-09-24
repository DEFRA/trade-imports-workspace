---
name: spec-cover
description: 'Cover Behaviour Spec scenarios that have no adequate test — the spec says something no test proves. Uses tim spec gaps, proposes a concrete test per gap, walks for approval, writes the test in a service repo, updates coverage.json links, does not advance the baseline. Produces workareas/spec-cover/<date>/. Use when the user asks to cover gaps, prove the spec, or fill coverage holes (triggers: "cover the gaps", "prove the spec", "spec-cover", "walk cover", "fill coverage holes", "write tests for open gaps"). NOT for catching the spec up with moved code — use spec-catchup. NOT for linting the binding — use tim spec lint.'
context: fork
allowed-tools: [Bash, Read, Glob, Edit, Write]
---

Cover holes the coverage matrix already records: scenarios that are
`none` or `partial` because no test (or only a weak one) proves the
claim.

**Direction:** *the spec says something no test proves* — write a test
in a **service repo**, then update `openspec/coverage/` links in this
workspace. The opposite direction is `spec-catchup` (writes `spec.md`).

Nothing gates CI. Baseline stays put — only catch-up advances it.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash expands `~`
automatically. Skill-internal references stay relative
(`references/<NAME>.md`).

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## When to use

| Trigger | What to follow |
|---------|----------------|
| "cover the gaps", "prove the spec", "spec-cover", "fill coverage holes", "write tests for open gaps" | this SKILL.md — full run |
| "walk cover", "walk spec-cover" | `references/WALKER.md` only |

Prefer starting with `none` (unproven). Use `--partial` when the user
asks to strengthen weak witnesses.

NOT for drift since the baseline — use `spec-catchup`. NOT for rewriting
requirements to match missing tests — that hides the hole.

## Subagents

None. Judge and walk inline.

## Step 0: Refuse if unsafe

1. **`openspec/` must be clean** in the workspace checkout.
   ```bash
   git -C ~/git/defra/trade-imports-workspace status --porcelain -- openspec/
   ```
2. Target service repo(s) should be on a sensible branch (usually
   `main` or the ticket branch). If dirty in a way that risks clobbering
   work, ask before writing tests.

## Step 1: Scope — mechanical

```bash
tim spec gaps --none --json
```

Or `tim spec gaps --partial --json` / `tim spec gaps --json` when asked.
Each row is a candidate gap. Risk order from `tim` is the walk order.

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

## Step 3: Seed

```bash
tim spec findings seed --skill cover --file <payload.json>
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

## Step 4: Walk

Follow [`references/WALKER.md`](references/WALKER.md).

## Step 5: Apply accepted findings

Follow [`references/APPLY.md`](references/APPLY.md): write the test under
`repos/<repo>/`, run the narrowest relevant test command you can, update
coverage.json, then:

```bash
tim spec findings applied F-00N --skill cover
```

Do **not** run `tim spec baseline --advance` — cover does not own the
baseline.

## Completion output

```
Spec cover complete for <date>.

<N> findings: <a> write-test · <b> strengthen · <c> accept-gap
Applied: <list of test files>
Coverage updates (uncommitted): <list>
Baseline: unchanged (catch-up only)

Run: ~/git/defra/trade-imports-workspace/workareas/spec-cover/<date>/
```
