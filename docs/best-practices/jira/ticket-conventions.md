# EUDPA Jira ticket conventions

Project-policy guidance for tickets in the **EUDPA** Jira project.
Shared by the `ticket-creator`, `ticket-refiner`, and `ticket` skills.

For GDS writing style applied to summaries, descriptions, and AC, see
[`../gds/writing.md`](../gds/writing.md).

## Type guidance

| Type | Use when |
|------|----------|
| **Bug** | An existing feature is broken — wrong output, error, regression, deviates from documented behaviour. |
| **Story** | A user-facing capability or behaviour change. Phrased around what the user can do once shipped. |
| **Task** | Technical or operational work with no direct user-visible change — refactor, tech debt, infrastructure, investigation. |

If it could land as either Story or Task, prefer **Story** when there
is observable behaviour for an end user, **Task** otherwise.

## Priority guidance

| Priority | Use when |
|----------|----------|
| **Highest** | Production-blocking or live-incident workstream. |
| **High** | Blocks a sprint goal or another team. |
| **Medium** | Default. Normal sprint work. |
| **Low** | Nice-to-have; can drift without harm. |
| **Lowest** | Backlog hygiene, opportunistic clean-up, Tech Debt Board (see below). |

## Labels

Labels are camelCase by convention in this project — `technicalImprovement`,
not `tech-improvement` or `technical_improvement`. The authoritative
list of accepted EUDPA labels lives in
[`~/git/defra/trade-imports-workspace/.claude/skills/ticket-creator/assets/known-labels.md`](../../../.claude/skills/ticket-creator/assets/known-labels.md).
Prefer reusing an existing label over coining a new one.

## Acceptance criteria style

Acceptance criteria are **free-form bullets** — there is no project-wide
Gherkin mandate. Each bullet should be observable and verifiable:

- Good: `Page returns 400 with body "code-too-short" when commodity code <6 digits`
- Bad: `Validation works correctly`

Type-specific templates (`assets/templates/{bug,story,task}.md`) may
suggest a shape (e.g. *Given / When / Then* for some Stories) but do
not enforce one. Bullets are fine across all Types.

## EUDPA project shape

EUDPA is a feature/capability project. Every ticket — Bug, Story, or
Task — sits under one of ~20 active feature epics on the EUDPA board
(board 13780). There is no dedicated tech-debt board or tech-debt
epic; tech-debt work is parented under whichever feature epic owns
the area, with a `technicalImprovement` label as the discriminator.

The set of active epics drifts as the project progresses. Do not
hard-code epic keys in skill prose — discover them at interview time
via the recipe in [Listing active epics](#listing-active-epics).

### Listing active epics

When the user needs help picking a parent epic, list the open epics
on the EUDPA board via `tools/jira/list-board-epics.sh`:

```bash
~/git/defra/trade-imports-workspace/tools/jira/list-board-epics.sh 13780
```

That prints `KEY — summary` lines for each open epic. Pass `json`
as a second arg for `[{key, summary, done}]`, or `--include-done`
to include closed epics.

Pair with `tools/jira/ticket.sh EUDPA-X summary` for verification
(Step 1.5 of the skill does this automatically).

## Field-default modifiers (opt-in)

When the user describes their Task as tech-debt, the skill defaults
two fields without re-asking:

| Field | Default | Why |
|-------|---------|-----|
| Label | `technicalImprovement` | Canonical EUDPA tech-debt label (8 backlog issues on 2026-05-26 used it). |
| Priority | `Lowest` | EUDPA convention for tech-debt — tracked but not urgent. |

Parent epic is still asked for normally — the modifier does not
suggest a specific key. The user picks the feature epic that owns
the area. Step 1.5 then verifies it.

The modifier is **opt-in only** — never auto-apply it. Confirm with
the user before applying.
