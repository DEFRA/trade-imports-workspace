---
name: spec-catchup
description: 'Catch the Behaviour Spec (openspec/) up with what one journey set''s tests and source now show — the direction where the code does something the spec does not say. Runs that set''s full suite (fit + e2e, or vitest + e2e for admin), then walks every spec.md under the set''s prefix against the report and source, editing, adding, updating a coverage link, or deleting spec.md + coverage.json as the evidence dictates — never using tim spec gaps as the work list. Fans out per-capability judgement to Task subagents when a set has more than a handful of capabilities; the parent applies and commits in this workspace repo. Also drives "catch-up and cover": for each set, finishes catch-up then follows spec-cover before moving to the next set. Use when the user asks to catch a journey set''s spec up (triggers: "catch-up", "catch-up animals", "catch-up plants", "catch-up ins", "catch-up admin", "catch-up and cover"). NOT for writing a test for a scenario whose spec wording is already correct — that is spec-cover. NOT for validating conventions alone — use tim spec lint directly.'
context: fork
allowed-tools: [Bash, Read, Glob, Edit, Write, Task]
---

Catch the Behaviour Spec (`openspec/`) up with what one journey set's
tests and source now show.

**Direction:** *the code does something the spec does not say* — edit
`spec.md` and `openspec/coverage/` in this workspace repo. The opposite
direction is `spec-cover` (writes a test in a service repo). Running
spec-cover alone assumes the spec is already true; run spec-catchup
first when it might not be.

## Sets

Trigger → prefix → suite table: [`references/SUITES.md`](references/SUITES.md).

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
| `catch-up` | All four sets, one at a time, each following this skill |
| `catch-up animals` / `plants` / `ins` / `admin` | One set |
| `catch-up and cover` (with or without a set name) | For each set: finish this skill, then follow `spec-cover` for that same set, before moving to the next |

NOT for `tim spec gaps` holes (no test proves an already-correct claim)
— that is `spec-cover`. NOT for validating structure alone — `tim spec
lint`.

## Subagents

Fan-out judgement only, when a set has more than a handful of
capabilities under its prefix. Emit **all** Task calls in one assistant
turn (`subagent_type: general-purpose`).

| When | Spawn | Persona | Writes |
|---|---|---|---|
| More than ~5 capabilities still need judging | One Task per capability, or a batch of ~5 that share no file | [`references/CAPABILITY_JUDGE.md`](references/CAPABILITY_JUDGE.md) | `workareas/spec-catchup/<date>-<set>/judge-<capability>.json` |
| Capabilities that share a file | One Task for that batch, or judge it yourself | same | same |

Never fan out the Docker check, the suite run, `tim spec lint`, applying
a verdict, or running two sets in parallel — they share `openspec/` and,
for E2E, `trade-imports-animals-tests`. Workers **propose only**; the
parent reads every `judge-*.json`, applies serially (or fans out the
apply step only across verdicts touching disjoint files), then lints
and commits.

Small sets stay inline — no Task spawn required.

## Step 1: Get a green report

Follow [`references/SUITES.md`](references/SUITES.md) — Docker/OrbStack
check, SHA-gated report reuse, run the full suite (never
`--only-changed`) when reuse doesn't apply. Record the SHAs you ran
against in `workareas/spec-catchup/<date>-<set>/shas.json`. A red suite
is a hard stop — report the failures and do not touch `openspec/`.

## Step 2: Hygiene lint

```
tim spec lint --capability <prefix> --json
```

This is a hygiene pass only (conventions, coverage shape, binding) —
`tim spec lint` has no `--links` group, so it will not tell you a
coverage link is dead. That's Step 3's job.

## Step 3: Walk every spec in the prefix

List every `openspec/specs/<prefix>/**/spec.md` (Glob) — the full set,
not `tim spec gaps`'s non-full rows; a scenario can be marked `full` and
still have drifted words. Judge each capability against the report and
source using the table in
[`references/CAPABILITY_JUDGE.md`](references/CAPABILITY_JUDGE.md#verdicts),
fanning out per Subagents above when the set is large. Apply each
verdict as it resolves:

- `edit-spec` — edit `spec.md`; edit `coverage.json` too if the ID or
  name changed
- `add-spec` — add the requirement/scenario to `spec.md` and its
  `coverage.json` row
- `update-link` — fix the moved/renamed `file`/`test` in `coverage.json`
- `remove-dead-link` — strip the dead test entry from `coverage.json`
  and leave `spec.md` alone (hands the hole to `spec-cover`)
- `delete-spec` — delete `spec.md` and `coverage.json` together
- `no-action` — nothing
- `uncertain` — leave the spec; note it for the completion output,
  never guess

## Step 4: Lint must pass

```
tim spec lint --capability <prefix> --json
```

Fix any fallout yourself (IDs, names, rollups, binding) until this is
clean before committing.

## Step 5: Commit

Commit the `openspec/specs/<prefix>` and `openspec/coverage/<prefix>`
changes in this workspace repo:

```
git add openspec/specs/<prefix> openspec/coverage/<prefix>
git commit -m "chore(spec-catchup): catch <set> up with <date>'s suite"
```

Push is manual. If this run is part of `catch-up and cover`, now follow
`spec-cover` for this same set before moving to the next one.

## Completion output

```
Spec catch-up complete for <set> (<date>).

Capabilities walked: <n>
edit-spec: <list or none> · add-spec: <list or none>
update-link: <list or none> · remove-dead-link: <list or none>
delete-spec: <list or none>
Uncertain (left as-is): <list or none>

Lint: clean
Committed: <sha> — <files changed>
Run: ~/git/defra/trade-imports-workspace/workareas/spec-catchup/<date>-<set>/
```
