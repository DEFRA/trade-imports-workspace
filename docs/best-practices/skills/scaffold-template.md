# SKILL.md scaffold template

The skeleton CREATE mode emits at `.claude/skills/<name>/SKILL.md`.
Substitution placeholders are written in ALL-CAPS double-brace form
(`{{NAME}}`). TODO markers flag prose the user must replace before
the skill is shippable.

The companion [`patterns.md`](patterns.md) explains when each
section is load-bearing; [`anti-patterns.md`](anti-patterns.md) is
read at session start by `skill-creator` so the patterns stay
current.

## Skill directory layout (full)

```
.claude/skills/{{NAME}}/
├── SKILL.md
├── references/
│   └── {{WORKER}}.md          # if fan-out: pattern 5
└── assets/
    └── {{SCHEMA}}.md           # if JSON state: pattern 1

tools/{{NAME}}/
├── start-{{NAME}}.sh           # if dispatcher: pattern 2
├── prepare-{{NAME}}.sh         # if pre-bake: pattern 3
├── {{OP}}.sh                   # per mutation: pattern 6
└── render-{{NAME}}.sh          # if JSON state has a markdown view: pattern 1
```

`.claude/settings.json` allowlist entries (pattern 8):

```
Bash(~/git/defra/trade-imports-workspace/tools/{{NAME}}/*)
Bash(~/git/defra/trade-imports-workspace/tools/{{NAME}}/*:*)
```

## SKILL.md template

```markdown
---
name: {{NAME}}
description: '{{ONE_LINE_PURPOSE}} {{WHEN_TO_USE}} (triggers: "{{TRIGGER_1}}", "{{TRIGGER_2}}"). NOT for {{OUT_OF_SCOPE}} — use the {{OTHER_SKILL}} skill for that.'
---

<!-- TODO: one-paragraph intro. State the audience (which tickets,
     which work) and the outcome (what artifact lands where). -->

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash
expands `~` automatically. Skill-internal references stay
relative (`references/<NAME>.md`, `assets/<NAME>.md`).

**Bash call hygiene** — one command per Bash call. Full rule
table: [`docs/agent-skills.md`](../../../docs/agent-skills.md) →
"Bash call hygiene".

## When to use

| Trigger | What to follow |
|---------|----------------|
| "{{TRIGGER_1}}" | this SKILL.md — {{SECTION_1}} |
<!-- TODO: extra rows per trigger / branch -->

NOT for {{OUT_OF_SCOPE}} — use the `{{OTHER_SKILL}}` skill.

## Worker references

<!-- TODO: drop this section if no fan-out (pattern 5).
     Otherwise list each persona, when it runs, and what it
     writes. Spawn idiom is `subagent_type: general-purpose`,
     prompt begins:
     `Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/{{NAME}}/references/<NAME>.md.` -->

| Persona | Used in | Artifact |
|---|---|---|
| `references/{{WORKER}}.md` | {{STEP}} (one per {{UNIT}}, parallel up to N) | {{ARTIFACT}} |

## Step 0: Start

<!-- TODO: drop this section if no dispatcher (pattern 2). -->

```bash
~/git/defra/trade-imports-workspace/tools/{{NAME}}/start-{{NAME}}.sh {{ARGS}}
```

First line of output is `MODE: <BRANCH>` — branch on it.

## Step 1: {{STEP_TITLE}}

<!-- TODO: per-step instructions. One step per logical
     deliverable. -->

## Completion output

<!-- TODO: the final report the parent session prints. Keep it
     tight: verdict + artifact paths + next-step hint. -->

```
{{NAME}} complete for {{ID}}.

Summary:
- {{KEY_METRIC_1}}
- {{KEY_METRIC_2}}

Artifacts: ~/git/defra/trade-imports-workspace/workareas/{{NAME}}/{{ID}}/...

Next: {{NEXT_HINT}}
```

## Scripts cheat-sheet

All under `~/git/defra/trade-imports-workspace/tools/{{NAME}}/`:

| Script | Purpose |
|---|---|
| `start-{{NAME}}.sh` | Step 0 dispatcher |
<!-- TODO: one row per helper script. -->
```

## decisions.md sidecar (CREATE writes alongside SKILL.md)

CREATE mode emits a `decisions.md` next to SKILL.md recording why
each shape choice was made. Schema mirrors the 8 interview
questions; the rationale is what a future audit / refactor pass
reads to avoid re-deriving the framework.

```markdown
# {{NAME}} skill — decisions

Recorded during scaffold. Update if a shape choice changes; do not
delete entries (they explain the original judgment).

## 1. State shape

**Choice:** {{JSON | PROSE}}
**Why:** {{ONE_LINE_RATIONALE}}

## 2. Dispatcher

**Choice:** {{YES | NO}}
**Why:** {{ONE_LINE_RATIONALE}}

## 3. Pre-baked context

**Choice:** {{YES | NO}}
**Why:** {{ONE_LINE_RATIONALE}}

## 4. Worker fan-out

**Choice:** {{YES — N workers | NO}}
**Why:** {{ONE_LINE_RATIONALE}}

## 5. Walker

**Choice:** {{YES | NO}}
**Why:** {{ONE_LINE_RATIONALE}}

## 6. Helpers introduced

{{LIST}}

## 7. Triggers (disambiguation)

{{TRIGGER_LIST}} — distinct from {{NEIGHBOUR_SKILLS}} because
{{ONE_LINE_RATIONALE}}.

## 8. Allowlist entries added

- `Bash(~/git/defra/trade-imports-workspace/tools/{{NAME}}/*)`
- `Bash(~/git/defra/trade-imports-workspace/tools/{{NAME}}/*:*)`
```
