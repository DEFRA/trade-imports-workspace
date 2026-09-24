---
name: spec-catchup
description: 'Catch the Behaviour Spec (openspec/) up with what the code now does — the words are wrong or missing. Judges candidates into findings.json, auto-applies every finding (spec.md + coverage.json), auto-fixes lint fallout, then advances the baseline with --require-ruled. No human walk. Produces workareas/spec-catchup/<date>/. Use when the user asks to catch the spec up or says it is behind (triggers: "catch the spec up", "the spec is behind", "spec-catchup", "is the behaviour spec stale"). NOT for writing tests for scenarios that have none — use spec-cover. NOT for a single capability someone already knows is wrong — hand-edit openspec/specs/<path>/spec.md. NOT for validating conventions alone — use tim spec lint.'
context: fork
allowed-tools: [Bash, Read, Glob, Edit, Write, Task]
---

Catch the Behaviour Spec (`openspec/`) up with what tests and source
actually do, for capabilities that changed since the last verify.

**Direction:** *the code does something the spec does not say* — write
`spec.md` + coverage links in this workspace repo. The opposite direction
is `spec-cover` (writes a test in a service repo).

Every deterministic command is `tim spec <cmd>`. This skill is the
judgement + auto-apply loop on top. Nothing gates CI. **No walk** —
seeded findings are auto-accepted and applied by the agent.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash expands `~`
automatically. Skill-internal references stay relative
(`references/<NAME>.md`).

**Run directory** — every artifact for a run lives under
`~/git/defra/trade-imports-workspace/workareas/spec-catchup/<YYYY-MM-DD>/`
(`findings.json`, `report.md`, `candidates.json`, `payload.json`,
`judge-*.json`, scratch). Do **not** write judge/payload/candidates files
directly under `workareas/spec-catchup/`.

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## When to use

| Trigger | What to follow |
|---------|----------------|
| "catch the spec up", "the spec is behind", "spec-catchup", "is the behaviour spec stale" | this SKILL.md — full run (judge → seed → auto-apply → baseline) |

Check `tim workspace status`'s staleness line first — if it says 0 changed
files and lint has no unresolved links, say so and stop.

NOT for `tim spec gaps` holes (no test proves the claim) — use
`spec-cover`. NOT for validating structure alone — `tim spec lint`.

## Subagents

Fan-out when it pays off. Emit **all** Task calls in one assistant
turn (`subagent_type: general-purpose`).

| When | Spawn | Persona | Writes |
|---|---|---|---|
| ≥ ~8 work packets still need judgement (after Step 2) | One Task per batch of packets (≈5–10 each) | [`references/READER.md`](references/READER.md) | `workareas/spec-catchup/<date>/judge-<label>.json` |
| ≥ 2 accepted findings touch **disjoint** capabilities | One Task per capability (or per finding if files don't overlap) | [`references/APPLY.md`](references/APPLY.md) | `openspec/specs/**`, `openspec/coverage/**` |

Parent session: merge judge files into `payload.json`, seed, then
auto-accept; after apply workers finish, mark `applied` and advance
baseline. Keep apply **serial** when two findings share one
`spec.md` / `coverage.json` (e.g. two address gaps).

Small runs stay inline — no Task spawn required.

## Step 0: Refuse if it is not safe to run

Two checks, in order. Either failing is a hard stop:

1. **`openspec/` must be clean — unless continuing today's run.**
   ```bash
   git -C ~/git/defra/trade-imports-workspace status --porcelain -- openspec/
   ```
   Non-empty is OK only when
   `workareas/spec-catchup/<today>/findings.json` already exists and you
   are finishing that run. Otherwise another write is in flight — stop.

2. **No `requirements-pipeline` build run is active.** Check for a
   `build/state.json` under any `~/git/defra/trade-imports-workspace/workareas/*/`
   whose most recent increment phase is `implement`, `review`, or `land`.
   If in doubt, ask the user.

## Step 1: Scope — mechanical

```bash
tim spec candidates --json
```

Call this yourself. Persist the envelope under the run dir as
`candidates.json`. Scope = every `workPackets` entry plus every
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

| Verdict | Meaning | Auto-apply |
|---|---|---|
| **stale-link** | Behaviour unchanged; test moved | Edit `coverage.json` |
| **spec-wrong** | Behaviour changed; spec stale | Edit `spec.md` (and coverage if needed) |
| **spec-gap** | New behaviour; no requirement yet | Add to `spec.md` + coverage row |
| **no-action** | Copy/layout/refactor only | Nothing — bucket ruled wholesale |

Every finding needs the one-sentence judgement. Ambiguous → leave out of
the seed and list under Unresolved in your completion notes — do not guess.

Write intermediate judge notes as
`workareas/spec-catchup/<date>/judge-*.json` (never beside the date folder).

## Step 4: Seed findings.json

Write the payload under the run dir (`payload.json`) then:

```bash
tim spec findings seed --skill catchup --file ~/git/defra/trade-imports-workspace/workareas/spec-catchup/<date>/payload.json
```

Same-day re-seed of a run that already has rulings is refused — pass
`--force` only when you mean to wipe progress, or use a new `--date`.

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

Ids are `F-001`, `F-002`, … (stale-link first, then spec-wrong, spec-gap).
Prefer **individual findings only for stale-link / spec-wrong / spec-gap**.
Count NO ACTION capabilities into `noActionBucket.capabilities`.

`baseline` is optional — seed fills it from `openspec/baseline.json`.

## Step 5: Auto-apply every finding

No human approval. For each pending finding, in id order:

1. `tim spec findings rule F-00N --skill catchup --accept`
2. Follow [`references/APPLY.md`](references/APPLY.md) — land the
   proposal, run `tim spec lint` for the capability, **fix any lint
   failure yourself** (IDs, names, coverage rollups, binding) until lint
   is clean, then `tim spec findings applied F-00N --skill catchup`.
3. If the proposal cannot be made lint-clean after a reasonable fix
   attempt, `--defer` with a note and continue — do not leave openspec
   half-broken; revert that finding's edits if needed.

Then rule the NO ACTION bucket:

```bash
tim spec findings rule-bucket --skill catchup --accept
```

Leave openspec edits **uncommitted** unless the user asked you to commit.

## Step 6: Advance the baseline

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
Applied: <list> · Deferred: <list or none>
Baseline: advanced | not advanced (<why>)

Run: ~/git/defra/trade-imports-workspace/workareas/spec-catchup/<date>/
Uncommitted openspec edits: <list or none>
```
