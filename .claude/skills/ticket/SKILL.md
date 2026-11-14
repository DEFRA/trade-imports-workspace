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

The plan records decisions, homes and owners. It never writes names,
comments, test titles, log strings or code bodies. Before any code
exists it is reviewed against `assets/plan-review-checklist.md`.

### Implement

If the user asks to build / implement / follow the plan, follow
`references/IMPLEMENTOR.md`. Re-checks the plan against the checklist,
makes the change under the house rules in
`~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md`,
runs a delete-first comment pass over touched code, and raises a PR.
Verifies with unit tests, lint, E2E and GitHub Actions. Between a green
verification and the PR it syncs the behaviour spec, as below.

### Sync the behaviour spec

Only once verification is green. The Behaviour Spec under `openspec/`
in this workspace records intended behaviour (`specs/`) and which tests
prove it (`coverage/`). A ticket that changes behaviour without it
leaves drift for the next person to absorb.

The steps are `frontend-change` Step 5, whatever the repo — read
`~/git/defra/trade-imports-workspace/.claude/skills/frontend-change/SKILL.md`
→ "Step 5: Sync the behaviour spec" and its `references/SPEC_SYNC.md`
before the first write. In short:

1. **Find the capabilities** the diff touches, new files included
   (`git -C <repo> add -N .`, then `git -C <repo> diff`).
2. **No observable change** (a refactor, a dependency bump): write
   nothing and report `Spec sync: none` with the reason.
3. **Write `spec.md`** under `openspec/specs/<path>/` for the behaviour
   the ticket changed: merge into an existing capability, or prove a new
   one is new and mint its AREA code.
4. **Write `coverage.json`** under `openspec/coverage/<path>/` for the
   scenarios you touched. A link is `full` only after a red probe.
5. **Validate**, once per capability written, then lint the whole spec:

   ```bash
   tim spec lint --capability <capability-path>
   ```

   ```bash
   tim spec lint
   ```

6. **Self-check** every added or changed scenario against the diff
   hunk that implements its THEN, and every link you wrote against a
   test file in the diff.

A failed validate, lint or self-check is a halt: fix it before the PR.
Commit the spec on the same branch name in the workspace, and raise its
PR beside the repo PRs (`CLAUDE.md` rule 2).

### Refactor

If the user asks to refactor / tidy / clean code (post-GREEN tidy-up),
follow `references/REFACTORER.md`. Starts with the delete-first comment
pass, applies the same house rules, and keeps tests green throughout.

### Working with the ticket in Jira

**Reading is free. Writing needs the user's go in that conversation.**

Fetching the ticket and its comments is part of every phase — do it
without asking. But a comment, a status transition, an assignment or a
link is outward-facing: the ticket is shared with the BAs, the PO and
whoever else watches it, and a write notifies them. "Plan EUDPA-X" or
"implement EUDPA-X" asks for the work, not for a status report sent to
the team. Do the work, report it to the user, and stop. If a Jira write
would help, offer it and let them answer.

This is rule 3's treatment of merging a PR, for the same reason: both
reach other people, and neither is yours to trigger unprompted. It holds
even when the work is finished and the comment would be accurate.

When the user does ask, follow
`~/git/defra/trade-imports-workspace/docs/best-practices/jira/ticket-conventions.md`:
wiki markup with escaping, no "Won't Do" transition, no sprints, and
the Blocks link direction. Check the render afterwards, as that file says.

## Shared tooling

All under `~/git/defra/trade-imports-workspace/tools/` per CC-3:

| Domain | Used by | Purpose |
|---|---|---|
| `tim ticket prepare-plan EUDPA-X [--repos r1,r2] [--json]` | PLANNER | Pre-bake `ticket.md` + `.plan-meta.json` + per-repo `best-practices/<repo>.md` |
| `tim ticket prepare-implement EUDPA-X [--repo R] [--json]` | IMPLEMENTOR | Assert plan, re-validate detect-tech, emit `.implement-meta.json` |
| `tim ticket branch EUDPA-X\|NO_JIRA --repo R --slug S [--type feat\|fix\|chore] [--base B]` | IMPLEMENTOR | One-dispatch fetch → checkout base → pull → checkout `<type>/EUDPA-X-<slug>` (`--type` defaults to `feat`) |
| `tools/jira/` (`ticket.sh`, `comments.sh`) | PLANNER, IMPLEMENTOR | Fetch ticket + comments — read freely |
| `tools/jira/` (`add-comment.sh`, `transition-ticket.sh`) | PLANNER, IMPLEMENTOR | Comment, transition — **only when the user asks in that conversation** (see above) |
| `tools/github/` (`prs.sh`, `pr-details.sh`), `gh pr diff <n> --repo DEFRA/<repo>` | IMPLEMENTOR | PR creation context + inspection |
| `gh workflow run`, `gh run list`, `gh run watch`, `gh run view [--log-failed\|--log]` | IMPLEMENTOR | CI verification |
| `tim review detect-tech <repo-path> [--json]` | used by `tim ticket prepare-plan` / `prepare-implement` | Detect repo tech stack + emit best-practices paths under `docs/best-practices/` |

Check your Jira and Confluence sign-in with `tim auth`, and your GitHub
sign-in with `gh auth status`, before fetching.

## Best practices

PLANNER and IMPLEMENTOR cite a subset of
`~/git/defra/trade-imports-workspace/docs/best-practices/` based on detected tech. The
universe spans `gds/`, `java/`, `node/`, `playwright/`, `k6/`,
`rest-api/`, `doc-comments/`, and `docker-compose.md`. Load only what
applies to the repo being worked on.

## Workareas

| Path | Purpose |
|---|---|
| `workareas/ticket-planning/EUDPA-X/ticket.md` | `tim ticket prepare-plan` writes (Jira metadata + description + comments + Confluence refs) |
| `workareas/ticket-planning/EUDPA-X/plan.md` | PLANNER writes and records its plan review; IMPLEMENTOR reads; both may amend with deviations |
| `workareas/ticket-planning/EUDPA-X/.plan-meta.json` | `tim ticket prepare-plan` writes — ticket metadata + per-repo tech list |
| `workareas/ticket-planning/EUDPA-X/best-practices/<repo>.md` | `tim ticket prepare-plan` writes — concatenated best-practices bundle per repo |
| `workareas/ticket-planning/EUDPA-X/.implement-meta.json` | `tim ticket prepare-implement` writes — re-validated tech |
| `workareas/ticket-planning/EUDPA-X/.diffs/<repo>.diff` | IMPLEMENTOR writes with `gh pr diff` — cached PR diff (when a prior PR exists) |
