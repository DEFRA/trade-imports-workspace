---
name: spec-catchup
description: 'Catch the Behaviour Spec (openspec/) up with what the code now does — the words are wrong or missing. Judges candidates into findings.json, walks each finding for approval, applies accepted edits (coverage.json and spec.md), then advances the baseline with --require-ruled. Produces workareas/spec-catchup/<date>/. Use when the user asks to catch the spec up or says it is behind (triggers: "catch the spec up", "the spec is behind", "walk catchup", "walk spec-catchup", "spec-catchup", "is the behaviour spec stale"). NOT for writing tests for scenarios that have none — use spec-cover. NOT for a single capability someone already knows is wrong — hand-edit openspec/specs/<path>/spec.md. NOT for validating conventions alone — use tim spec lint.'
context: fork
allowed-tools: [Bash, Read, Glob, Edit, Write]
---

Catch the Behaviour Spec (`openspec/`) up with what tests and source
actually do, for capabilities that changed since the last verify.

**Direction:** *the code does something the spec does not say* — write
`spec.md` + coverage links in this workspace repo. The opposite direction
is `spec-cover` (writes a test in a service repo).

Every deterministic command is `tim spec <cmd>`. This skill is the
judgement + walk + apply loop on top. Nothing gates CI.

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
| "catch the spec up", "the spec is behind", "spec-catchup", "is the behaviour spec stale" | this SKILL.md — full run (judge → seed → walk → apply → baseline) |
| "walk catchup", "walk spec-catchup" | `references/WALKER.md` only (run already seeded) |

Check `tim workspace status`'s staleness line first — if it says 0 changed
files and lint has no unresolved links, say so and stop.

NOT for `tim spec gaps` holes (no test proves the claim) — use
`spec-cover`. NOT for validating structure alone — `tim spec lint`.

## Subagents

None. Judge and walk inline. A typical candidate set fits one context.

## Step 0: Refuse if it is not safe to run

Two checks, in order. Either failing is a hard stop:

1. **`openspec/` must be clean.**
   ```bash
   git -C ~/git/defra/trade-imports-workspace status --porcelain -- openspec/
   ```
   Non-empty means another write is in flight.

2. **No `requirements-pipeline` build run is active.** Check for a
   `build/state.json` under any `~/git/defra/trade-imports-workspace/workareas/*/`
   whose most recent increment phase is `implement`, `review`, or `land`.
   If in doubt, ask the user.

## Step 1: Scope — mechanical

```bash
tim spec candidates --json
```

Call this yourself. Scope = every `workPackets` entry plus every
`unresolvedLinks` entry. `knownGaps` is read-only context — **do not**
turn them into findings (that is `spec-cover`).

If there is nothing in scope, stop.

## Step 2: Declarative pre-pass (three capabilities only)

`journey-flow`, `journey-section-captions` and `page-titles` (per service)
have a mechanical answer — see prior Step 2 in git history / READER.md.
Where source disagrees with `spec.md`, emit a **SPEC WRONG** finding with
a concrete proposed diff.

## Step 3: Judge every other candidate

Follow [`references/READER.md`](references/READER.md). Four verdicts:

| Verdict | Meaning | On accept, apply |
|---|---|---|
| **stale-link** | Behaviour unchanged; test moved | Edit `coverage.json` |
| **spec-wrong** | Behaviour changed; spec stale | Edit `spec.md` (and coverage if needed) |
| **spec-gap** | New behaviour; no requirement yet | Add to `spec.md` + coverage row |
| **no-action** | Copy/layout/refactor only | Nothing — bucket ruled wholesale |

Every finding needs the one-sentence judgement. Ambiguous → leave out of
the seed and list under Unresolved in your completion notes — do not guess.

## Step 4: Seed findings.json

Write a payload JSON (temp file under the run workarea is fine) then:

```bash
tim spec findings seed --skill catchup --file <payload.json>
```

Same-day re-seed of a run that already has rulings is refused — pass
`--force` only when you mean to wipe the walk, or use a new `--date`.

Payload shape:

```json
{
  "date": "YYYY-MM-DD",
  "findings": [
    {
      "id": "F-001",
      "verdict": "stale-link",
      "capability": "live-animals/addresses",
      "anchor": "SCN-ADDR-001-A",
      "judgement": "The behaviour is unchanged and only the test moved.",
      "evidence": { "test": "repos/.../file:line", "commit": "abc1234" },
      "proposal": {
        "file": "openspec/coverage/.../coverage.json",
        "diff": "--- a/...\n+++ b/...\n..."
      }
    }
  ],
  "noActionBucket": { "capabilities": 12 }
}
```

Ids are `F-001`, `F-002`, … in walk order (stale-link first, then
spec-wrong, spec-gap; no-action goes in the bucket, not as individual
findings — or as findings with verdict `no-action` that the walker skips
in favour of `rule-bucket`).

Prefer **individual findings only for stale-link / spec-wrong / spec-gap**.
Count NO ACTION capabilities into `noActionBucket.capabilities`.

`baseline` is optional — seed fills it from `openspec/baseline.json`.

## Step 5: Walk

Follow [`references/WALKER.md`](references/WALKER.md). Do not apply edits
until the user accepts (or edit-accepts) each finding.

## Step 6: Apply accepted findings

Follow [`references/APPLY.md`](references/APPLY.md). After each successful
apply:

```bash
tim spec findings applied F-00N --skill catchup
```

Leave openspec edits **uncommitted** unless the user asked you to commit.

## Step 7: Advance the baseline

When `tim spec findings counts --skill catchup --json` shows
`allRuled: true`:

```bash
tim spec baseline --advance --require-ruled
```

That refuses if anything is still open, deferred, or accepted-but-not-applied.
Commit `openspec/baseline.json` with the coverage/spec edits when the user
asks.

## Completion output

```
Spec catch-up complete for <date>.

<N> findings: <a> stale-link · <b> spec-wrong · <c> spec-gap · bucket <k> capabilities
Ruled: <accepted/applied/rejected/deferred summary>
Baseline: advanced | not advanced (<why>)

Run: ~/git/defra/trade-imports-workspace/workareas/spec-catchup/<date>/
Uncommitted openspec edits: <list or none>
```
