---
name: skill-creator
description: 'Meta-skill for authoring new workspace skills and auditing existing ones against the 8-pattern checklist. Two modes — CREATE scaffolds a new skill end-to-end (SKILL.md + references/ + tools/<name>/ + assets/ + .claude/settings.json allowlist), AUDIT walks an existing skill (or fans out across all skills) and produces a plan document under workareas/skills-audit/<name>.md. Use when the user wants to add a workspace skill or assess an existing one (triggers: "scaffold skill <name>", "skill-create <name>", "new workspace skill <name>", "audit skill <name>", "audit skills", "review skill <name> against patterns"). Disambiguated from Claude Code''s built-in /init (which scaffolds CLAUDE.md, not workspace skills). NOT for editing skills you already understand — open the SKILL.md and edit directly. NOT for reviewing code correctness/security — use `review`; NOT for JS lint/style review — use `code-style` (AUDIT mode assesses a skill''s own structure against the 8-pattern checklist, not the code a skill produces).'
# context: inline — CREATE runs an interactive interview + scaffolds files in-session with the user (needs Edit/Write in the parent); AUDIT still fans out to Task workers.
context: inline
allowed-tools: [Bash, Read, Glob, Grep, Task, Edit, Write]
argument-hint: '<trigger phrase including skill name>'
---

The meta-skill. Captures the 8-pattern checklist for workspace
skills under `~/git/defra/trade-imports-workspace/.claude/skills/`
and applies it two ways:

- **CREATE** — interview the user, produce a full scaffold with
  TODO placeholders.
- **AUDIT** — walk the checklist against existing skill(s), write
  plan documents under `workareas/skills-audit/`.

Stops at audit. Improvement work is judgment-heavy; the user
resolves Open Questions on the plan and hand-writes the
implementer prompt.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash
expands `~` automatically. Skill-internal references stay
relative (`references/<NAME>.md`, `assets/<NAME>.md`).

**Bash call hygiene** — one command per Bash call. Full rule table: [`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## Session start — Read these references

Before either mode, Read these into context (the checklist must
be live; anti-patterns drift over time):

- `~/git/defra/trade-imports-workspace/docs/best-practices/skills/patterns.md`
  — the 8-pattern checklist (canonical reference).
- `~/git/defra/trade-imports-workspace/docs/best-practices/skills/anti-patterns.md`
  — known mis-applications. Grows over time.
- `~/git/defra/trade-imports-workspace/docs/best-practices/skills/scaffold-template.md`
  — only Read in CREATE mode (the SKILL.md skeleton + decisions.md
  sidecar).

## When to use

| Trigger | Mode | What to follow |
|---------|------|----------------|
| "scaffold skill `<name>`", "skill-create `<name>`", "new workspace skill `<name>`" | CREATE | Step 0 dispatch → `references/INTERVIEWER.md` (parent-loaded) |
| "audit skill `<name>`", "review skill `<name>` against patterns" | AUDIT (single) | Step 0 dispatch → spawn one AUDITOR worker |
| "audit skills" (no name) | AUDIT (all) | Step 0 dispatch → enumerate skills, fan out one AUDITOR per skill |

Disambiguated from Claude Code's built-in `/init` (which
scaffolds `CLAUDE.md`). Use one of the trigger phrases above —
none of them match the `/init` keyword.

NOT for hand-editing a skill you already understand — open
`SKILL.md` and edit. NOT for adding a worker reference to an
existing skill — edit the skill's `references/` folder directly.

## Worker references

| Persona | Loaded by | Spawn model | Artifact |
|---|---|---|---|
| `references/INTERVIEWER.md` | CREATE mode parent session | parent-loaded (no Task spawn) | populates `decisions.json` then invokes `scaffold-skill.sh` |
| `references/AUDITOR.md` | AUDIT mode parent session | Task `subagent_type: general-purpose`, one per skill | per-skill plan at `workareas/skills-audit/<name>.md` |

Spawn idiom for AUDITOR — prompt begins:

```
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/skill-creator/references/AUDITOR.md.

**Target skill:** <name>
**SKILL.md path:** ~/git/defra/trade-imports-workspace/.claude/skills/<name>/SKILL.md
**Output path:** ~/git/defra/trade-imports-workspace/workareas/skills-audit/<name>.md
```

`general-purpose` carries `Tools: *` so the worker can Read /
Write / Bash freely — required because the AUDITOR doesn't see
this SKILL.md (it has its own hygiene block at the top of
`AUDITOR.md`).

## Step 0: Dispatch

```bash
~/git/defra/trade-imports-workspace/tools/skill-creator/start-skill-creator.sh "<trigger phrase>"
```

The dispatcher writes `MODE: CREATE`, `MODE: AUDIT_ONE`, or
`MODE: AUDIT_ALL` as the first stdout line, then prints a JSON
payload with mode-specific parameters (`skill_name`, `targets[]`,
`decisions_path`).

Branch on the mode:

- `MODE: CREATE` → CREATE flow below.
- `MODE: AUDIT_ONE` → AUDIT flow, single target.
- `MODE: AUDIT_ALL` → AUDIT flow, fan-out.

---

# CREATE flow

The parent session loads `references/INTERVIEWER.md` and follows
it. The interviewer:

1. Walks the 8 shape questions one at a time (serial, not batched).
2. Records each answer atomically via `interview-add-answer.sh`
   into `workareas/skill-creator/<name>/decisions.json`.
3. When all 8 are answered, invokes
   `scaffold-skill.sh --run-id <name>` which materialises the full
   scaffold (`.claude/skills/<name>/`, `tools/<name>/`, allowlist
   entries, `decisions.md` sidecar).
4. Prints the artifact paths and a short list of TODO markers the
   user must fill in before the skill is shippable.

CREATE does **not** auto-fill the skill's actual logic. The
scaffold is structural placeholders; the user takes the scaffold
and writes the prose.

## CREATE completion output

```
Skill scaffolded: <name>
Paths:
  .claude/skills/<name>/SKILL.md
  .claude/skills/<name>/references/<WORKER>.md   (if fan-out)
  .claude/skills/<name>/assets/...                (if JSON state)
  tools/<name>/start-<name>.sh                     (if dispatcher)
  tools/<name>/<other helpers>.sh

Allowlist entries appended to .claude/settings.json.
Decisions sidecar: .claude/skills/<name>/decisions.md

TODO markers remaining: N
Next: open .claude/skills/<name>/SKILL.md and fill in the TODOs.
```

---

# AUDIT flow

## Step A1: Enumerate targets

`AUDIT_ONE` — targets is a single skill name from the trigger.

`AUDIT_ALL` — `start-skill-creator.sh` already listed every
`.claude/skills/*/SKILL.md` (excluding `skill-creator` itself) in
the JSON payload's `targets[]`.

## Step A2: Spawn one AUDITOR per target

Spawn `general-purpose` Task subagents in parallel (up to one per
target). Each spawn prompt:

Emit ALL Task calls in a single assistant response — do NOT spawn one, await the result, then spawn the next. Parallelism only works when calls are batched in one turn.

```
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/skill-creator/references/AUDITOR.md.

**Target skill:** <name>
**SKILL.md path:** ~/git/defra/trade-imports-workspace/.claude/skills/<name>/SKILL.md
**Output path:** ~/git/defra/trade-imports-workspace/workareas/skills-audit/<name>.md
```

Wait for all workers to finish (the harness emits
`task-notification` per worker — wait for the `completed` set, do
not poll).

## Step A3: Aggregate

Read each `workareas/skills-audit/<name>.md` produced. Emit a
summary table:

```markdown
# Skill audit — <date>

| Skill | Plan | Pattern gaps | Open questions |
|---|---|---|---|
| <name> | [<name>.md](workareas/skills-audit/<name>.md) | <N> | <K> |
```

## AUDIT completion output

```
Audit complete for <N> skill(s).

Plans:
  workareas/skills-audit/<name>.md  (pattern gaps: G, open questions: Q)
  ...

Headline gaps (top 3 by severity):
  - <skill>: <one-line summary>
  ...

Next: read each plan. Resolve Open Questions, then hand-write the
implementer prompt (no auto-chaining audit → implement).
```

## Scripts cheat-sheet

All under `~/git/defra/trade-imports-workspace/tools/skill-creator/`:

| Script | Purpose |
|---|---|
| `start-skill-creator.sh` | Step 0 dispatcher — parses trigger, emits `MODE: ...` + JSON payload |
| `scaffold-skill.sh` | CREATE step 3 — reads `decisions.json`, writes the scaffold + allowlist entries + `decisions.md` |
| `interview-add-answer.sh` | CREATE — atomic mutation of `decisions.json` (one shape question per call) |
| `render-interview.sh` | CREATE — markdown view of `decisions.json` (used for `decisions.md` sidecar and mid-interview recaps) |
