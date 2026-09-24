---
name: spec-cover
description: 'Cover Behaviour Spec scenarios that have no adequate test, for one journey set at a time — the direction where the spec says something no test proves. Uses tim spec gaps --none (or --partial if asked) as the work list, maps every Then to an assert, writes the test in the right service repo, proves it with an invert-red/restore-green mutation probe before claiming full, updates the coverage.json link, then commits in both this workspace repo and the service repo on the same branch name. Fans out per-gap judgement to Task subagents when several gaps do not share a test file; the parent writes, probes, lints and commits. Assumes the spec is already true — run spec-catchup first if it might not be. Use when the user asks to cover a journey set''s gaps (triggers: "cover", "cover animals", "cover plants", "cover ins", "cover admin", "catch-up and cover"). NOT for drift between the spec and the code — use spec-catchup. NOT for rewriting a requirement to match a missing test — that hides the hole.'
context: fork
allowed-tools: [Bash, Read, Glob, Edit, Write, Task]
---

Cover Behaviour Spec scenarios one journey set's coverage matrix already
records as `none` or `partial` — no test, or only a weak one, proves the
claim.

**Direction:** *the spec says something no test proves* — write a test
in a **service repo**, then update the `openspec/coverage/` link in this
workspace repo. The opposite direction is `spec-catchup` (edits
`spec.md`). This skill assumes the spec is already true; run
`spec-catchup` first if it might not be.

## Sets

Trigger → prefix → suite/repo table:
[`../spec-catchup/references/SUITES.md`](../spec-catchup/references/SUITES.md).

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash expands `~`
automatically. Skill-internal references stay relative
(`references/<NAME>.md`).

**Bash call hygiene** — one command per Bash call. Full rule table:
[`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call
hygiene".

## When to use

| Trigger | What happens |
|---|---|
| `cover` | All four sets, one at a time, each following this skill |
| `cover animals` / `plants` / `ins` / `admin` | One set |
| `catch-up and cover` | Driven by `spec-catchup`, which follows this skill after finishing catch-up for the same set |

Prefer starting with `none` (unproven). Use `--partial` only when the
user asks to strengthen weak witnesses. NOT for drift since the code
changed — that's `spec-catchup`.

## Subagents

Fan-out judgement only, when several gaps don't share a test file. Emit
**all** Task calls in one assistant turn (`subagent_type:
general-purpose`).

| When | Spawn | Persona | Writes |
|---|---|---|---|
| Several gap rows, no shared test file | One Task per gap | [`references/GAP_JUDGE.md`](references/GAP_JUDGE.md) | `workareas/spec-cover/<date>-<set>/judge-<id>.json` |
| Gaps that share a test file | One Task for that batch, or judge it yourself | same | same |

Never fan out the Docker check, `tim spec gaps`, writing the test,
running the mutation probe, `tim spec lint`, or committing — they share
one test file, one `coverage.json`, and one branch. Workers **propose
only**; the parent writes and probes serially (or fans the write step
out only across gaps touching disjoint test files), then lints and
commits.

Zero or one gap stays inline — no Task spawn required.

## Step 1: Scope

```
tim spec gaps --none --capability <prefix> --json
```

(or `--partial`, or both, when asked). If Docker/OrbStack is required —
only when a proposed test for this set turns out to be E2E — and it's
down, stop and ask the human to start it; never start it yourself. If
there are zero rows, stop — nothing to cover.

## Step 2: Judge every gap

Follow [`references/GAP_JUDGE.md`](references/GAP_JUDGE.md) for each
row: map every Then to an assert (no assert → cannot claim `full`),
pick a tier, and propose the test plus its mutation probe. Fan out per
Subagents above when there are several gaps that don't share a file.

## Step 3: Write, probe, and link

For each proposal, in the parent:

1. Write the test into the named service repo file.
2. Run it — it should pass.
3. Invert the strongest Then's assertion (or, for unit/fit, the
   production line it depends on). Run again — **must go red**. If it
   stays green, the test proves nothing: rework the assertion, do not
   mark `full`.
4. Restore the inversion. Run again — **must go green**.
5. Update `openspec/coverage/<capability>/coverage.json` — add or
   upgrade the link, `strength: "full"` only once the probe above
   passed.

If a proposal can't be made to probe red/green without guessing, mark it
`accept-gap` instead and move on — never claim `full` on a hunch.

## Step 4: Lint must pass

```
tim spec lint --capability <prefix> --json
```

Fix any coverage fallout yourself until this is clean.

## Step 5: Commit — same branch name in both repos

Cross-repo branch parity (workspace rule 2): the service repo commit
must land on a branch with the **exact same name** as this workspace's
current branch.

1. `git branch --show-current` in the workspace — call this `<branch>`.
2. In `repos/<service-repo>`: if `<branch>` already exists there, check
   it out; otherwise create it from that repo's default branch.
3. Commit the test file(s) in `repos/<service-repo>` on `<branch>`.
4. Commit the `openspec/coverage/<prefix>` changes in this workspace
   repo, also on `<branch>`.

Push is manual, in both repos. If this run is the tail end of `catch-up
and cover`, this is the last step for this set — move on to the next
set's catch-up.

## Completion output

```
Spec cover complete for <set> (<date>).

Gaps worked: <n> — write-test: <list or none> · strengthen: <list or none> · accept-gap: <list or none>
Probes: all red→green

Lint: clean
Committed: <workspace sha> (openspec/) · <service repo> <sha> (tests) — branch <branch>
Run: ~/git/defra/trade-imports-workspace/workareas/spec-cover/<date>-<set>/
```
