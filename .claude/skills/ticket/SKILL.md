---
name: ticket
description: 'Plan, implement, or refactor work for an existing Jira ticket (EUDPA-XXXXX) end-to-end. Use when the user asks to scope, plan, build, follow a plan for, refactor, tidy up, or clean code for a specific ticket (triggers: "plan EUDPA-", "how should I implement EUDPA-", "implement EUDPA-", "build EUDPA-", "follow the plan", "refactor", "tidy up", "clean"). Covers the full plan -> implement -> refactor cycle for one existing ticket. NOT for creating new tickets (use ticket-creator), NOT for assessing whether a ticket is ready for refinement (use ticket-refiner), NOT for reviewing an existing PR (use review or code-style).'
context: inline
allowed-tools: [Bash, Read, Edit, Write, Glob, Grep]
argument-hint: 'EUDPA-XXXXX'
---

Plan, implement, or refactor work for an existing Jira ticket. Three
peer phases share triggers but split on verb.

## When to use

| Verb | Phase |
|---|---|
| plan / scope / "how should I" | PLAN |
| implement / build / follow the plan | IMPLEMENT |
| refactor / tidy / clean | REFACTOR |

NOT for creating new tickets — use `ticket-creator`. NOT for assessing
whether a ticket is ready for refinement — use `ticket-refiner`. NOT for
reviewing someone's PR — use `review` (correctness across languages) or
`code-style` (JS lint/style).

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash expands `~` to
your home directory automatically. Scripts under `tools/` hardcode the workspace path as
`$HOME/git/defra/trade-imports-workspace/...` — no env var needed.
Skill-internal references stay relative
(`references/<NAME>.md`, `assets/<NAME>.md`); subagents are addressed
by name via the Task tool.

**Bash call hygiene** — one command per Bash call. Full rule table: [`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## Phases

### Plan

If the user asks to plan / scope / "how should I" an EUDPA ticket,
follow `references/PLANNER.md`. Produces
`~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-X/plan.md`. No
implementation.

### Implement

If the user asks to build / implement / follow the plan, follow
`references/IMPLEMENTOR.md`. Reads the plan, makes the change, raises a
PR. Verifies via GitHub Actions.

### Refactor

If the user asks to refactor / tidy / clean code (post-GREEN tidy-up),
follow `references/REFACTORER.md`. Tests must stay green throughout.

## Shared tooling

All under `~/git/defra/trade-imports-workspace/tools/` per CC-3:

| Domain | Used by | Purpose |
|---|---|---|
| `tools/ticket/prepare-plan.sh EUDPA-X [--repos r1,r2] [--json]` | PLANNER | Pre-bake `ticket.md` + `.plan-meta.json` + per-repo `best-practices/<repo>.md` |
| `tools/ticket/prepare-implement.sh EUDPA-X [--repo R] [--json]` | IMPLEMENTOR | Assert plan, re-validate detect-tech, cache prior PR diff, emit `.implement-meta.json` |
| `tools/ticket/setup-branch.sh EUDPA-X --repo R --slug S [--base B]` | IMPLEMENTOR | One-dispatch fetch → checkout base → pull → checkout -b `feature/EUDPA-X-<slug>` |
| `tools/jira/` (`ticket.sh`, `comments.sh`, `add-comment.sh`, `transition-ticket.sh`) | PLANNER, IMPLEMENTOR | Fetch ticket + comments; post completion comments; transition status |
| `tools/github/` (`prs.sh`, `pr-details.sh`, `diff.sh`) | IMPLEMENTOR | PR creation context + inspection |
| `tools/github-actions/` (`trigger-workflow.sh`, `wait-for-run.sh`, `get-failure.sh`, `run-status.sh`, `get-logs.sh`) | IMPLEMENTOR | CI verification |
| `tools/review/detect-tech.sh` | called by `prepare-plan.sh` / `prepare-implement.sh` | Detect repo tech stack + emit best-practices paths under `docs/best-practices/` |

Authenticate to Jira/GitHub before fetching (or run the umbrella
`~/git/defra/trade-imports-workspace/tools/auth.sh`).

## Best practices

PLANNER and IMPLEMENTOR cite a subset of
`~/git/defra/trade-imports-workspace/docs/best-practices/` based on detected tech. The
universe spans `gds/`, `java/`, `node/`, `playwright/`, `k6/`,
`rest-api/`, `doc-comments/`, and `docker-compose.md`. Load only what
applies to the repo being worked on.

## Workareas

| Path | Purpose |
|---|---|
| `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-X/ticket.md` | `prepare-plan.sh` writes (Jira metadata + description + comments + Confluence refs) |
| `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-X/plan.md` | PLANNER writes; IMPLEMENTOR reads; both may amend with deviations |
| `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-X/.plan-meta.json` | `prepare-plan.sh` writes — ticket metadata + per-repo tech list |
| `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-X/best-practices/<repo>.md` | `prepare-plan.sh` writes — concatenated best-practices bundle per repo |
| `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-X/.implement-meta.json` | `prepare-implement.sh` writes — re-validated tech + cached PR diffs |
| `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-X/.diffs/<repo>.diff` | `prepare-implement.sh` writes — cached PR diff (when a prior PR exists) |
