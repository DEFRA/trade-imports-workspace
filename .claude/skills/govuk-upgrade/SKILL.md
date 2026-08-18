---
name: govuk-upgrade
description: 'Upgrade the govuk-frontend package across every EUDP Live Animals Node.js repo that consumes it. A four-stage workflow driven by canonical per-repo JSON state (`versions.{repo}.json`): Phase 1 = `start-upgrade.sh` (ticket → branch → discover repos → seed state + pre-bake CHANGELOG sections + best-practices bundle), Phase 2 = fan-out one `general-purpose` Task subagent per pending version following `references/VERSION_PLANNER.md` (uses `version-classify.sh` + `version-add-change.sh`), optional Walker = batch triage of pending plans following `references/PLAN_WALKER.md`, Phase 3 = strict-semver-order `apply-version.sh` per `todo` version (package.json + npm install + npm test + commit + state transition), then E2E once at the end. Stays inside the govuk-frontend toolbox — Nunjucks macros, govuk-* utility classes, no custom CSS or hand-rolled components. Triggers: "upgrade govuk-frontend", "govuk upgrade", "govuk-frontend upgrade", "bump govuk-frontend", "walk govuk EUDPA-XXX", "start-upgrade.sh". NOT for non-govuk-frontend npm bumps — use `npm-upgrade`. NOT for raising the tracking ticket itself — use `ticket-creator`.'
context: fork
allowed-tools: [Bash, Read, Glob, Grep, Task]
argument-hint: 'EUDPA-XXXXX [--target X.Y.Z]'
---

Upgrade `govuk-frontend` across the Node.js repos that consume it. The
workflow walks every intermediate semver between current and target,
plans per-repo code changes from each release's CHANGELOG, and applies
them in strict order with a commit per version.

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

## When to use

This is for `govuk-frontend` specifically (Nunjucks macros + GDS
components + the SCSS utility classes). For non-govuk-frontend npm bumps,
use the `npm-upgrade` skill.

| Trigger | Stage | Entry point |
|---|---|---|
| "upgrade govuk-frontend" / "govuk upgrade" / "bump govuk-frontend" | Start a fresh run | Step 1 below → `tools/govuk/start-upgrade.sh` |
| "continue govuk EUDPA-XXX" | Resume mid-run | Re-enter at the next gate (Phase 2 / walker / Phase 3) |
| "walk govuk EUDPA-XXX" | Batch-triage pending plans | `references/PLAN_WALKER.md` |
| "implement govuk EUDPA-XXX" / "apply govuk EUDPA-XXX" | Run Phase 3 | `references/PHASE_3_MANAGER.md` |
| "govuk status EUDPA-XXX" | Status snapshot | `tools/govuk/upgrade-status.sh --run-id EUDPA-XXX` |

## Repos in scope

Auto-detected at Phase 1 by `discover-repos.sh` — any repo under
`repos/*` whose `package.json` lists `govuk-frontend` is in scope. The
list is written to
`workareas/govuk-upgrades/{run-id}/.run-meta.json` as `repos[]`.
Phase 2 and Phase 3 iterate that list; no skill prose hard-codes repo
membership.

## Worker references

| Persona | Used in | Mutation surface |
|---|---|---|
| `references/VERSION_PLANNER.md` | `references/PHASE_2_MANAGER.md` Step 2 — one per unplanned version, parallel fan-out | `version-classify.sh` + `version-add-change.sh` against `versions.{repo}.json` |

Spawn idiom inside Phase 2: Task tool with `subagent_type: general-purpose`
and a prompt beginning `Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/govuk-upgrade/references/VERSION_PLANNER.md.`
`general-purpose` carries `Tools: *` so the worker can Read the pre-baked
changelog, Grep the repo, and call the `version-*` helpers.

## Step 1: Establish ticket + branch

Ask the user which ticket this upgrade tracks. Three paths:

1. **Existing ticket** — they give an `EUDPA-XXXXX`. Branch is
   `chore/EUDPA-XXXXX`. Proceed to Step 2.
2. **Create a new ticket** — call
   `~/git/defra/trade-imports-workspace/tools/jira/create-ticket.sh`
   with DevOps conventions: parent `EUDPA-144`, labels
   `DevOps` + `tech-improvement`, priority Medium, type Task. See the
   `ticket-creator` skill for the GDS question-gathering flow. Capture
   the new ticket key, then Branch is `chore/EUDPA-XXXXX`.
3. **Custom branch name (no Jira ticket)** — accept the user-supplied
   branch verbatim. Use this only when there's a deliberate reason not
   to track work in Jira.

## Step 2: Run Phase 1 dispatcher

```bash
~/git/defra/trade-imports-workspace/tools/govuk/start-upgrade.sh --ticket EUDPA-XXXXX [--target 6.1.0]
```

Or with a custom branch:

```bash
~/git/defra/trade-imports-workspace/tools/govuk/start-upgrade.sh --branch <branch-name> [--target 6.1.0]
```

`start-upgrade.sh` writes `.run-meta.json`, ensures every in-scope repo
is on the branch, and seeds `versions.{repo}.json` + pre-bakes the
per-version changelog and best-practices files. It prints `PHASE: 1`
on the first line so you can confirm the dispatch.

Present its report verbatim. **Gate:** "Phase 1 complete. Proceed to
Phase 2 (changelog analysis)?"

## Phase 2: Changelog Analysis and Planning

```
Follow references/PHASE_2_MANAGER.md. Run ID: {run-id}
```

Phase 2 delegates per-version analysis to `general-purpose` Task
subagents following `references/VERSION_PLANNER.md` — one instance per
version stub, parallel fan-out.

Emit ALL Task calls in a single assistant response — do NOT spawn one, await the result, then spawn the next. Parallelism only works when calls are batched in one turn.

Present its report verbatim. **Gate:** "Phase 2 complete. Walk the
plans before Phase 3?"

## Walker (Phase 2 → Phase 3 batch triage)

```
Follow references/PLAN_WALKER.md. Run ID: {run-id}
```

The walker presents every pending version's plan in one batch table
and takes a single keystroke string from the user
(`A`pply / `S`kip / `D`iscuss / `Q`uarantine). INCOMPLETE versions
from Phase 2 land here as `unplanned` rows — the user can re-plan,
skip, or quarantine them per Decision 5.

The walker is optional. If the user is happy with the Phase 2 report,
proceed straight to Phase 3.

## Phase 3: Implementation

```
Follow references/PHASE_3_MANAGER.md. Run ID: {run-id}
```

Present its report verbatim. End of automated work.

## Failures

Surface any error to the user with the raw output. Do not retry or
problem-solve. Wait for instruction.

## References

- `references/PHASE_1_MANAGER.md` — Phase 1 gate (start-upgrade.sh wrapper).
- `references/PHASE_2_MANAGER.md` — fan-out to `VERSION_PLANNER.md` workers.
- `references/PLAN_WALKER.md` — batch triage of Phase 2 output before Phase 3.
- `references/PHASE_3_MANAGER.md` — implementation in strict semver order (delegates to `apply-version.sh`).
- `references/VERSION_PLANNER.md` — single-version CHANGELOG analysis + per-repo plan classification (spawned per version as `general-purpose`).

Best-practices (load when the changelog warrants):

- `~/git/defra/trade-imports-workspace/docs/best-practices/node/govuk-frontend.md` — primary technical reference.
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/components.md` — GDS component rules.
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/patterns.md` — question-page / task-list patterns.
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/accessibility.md` — WCAG / a11y.
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/styles.md` — typography + colour utilities.

Scripts (`~/git/defra/trade-imports-workspace/tools/govuk/`):

- `start-upgrade.sh` — Phase 1 dispatcher: `.run-meta.json`, branch setup, version discovery, security pre-flight (`npm audit` per repo).
- `discover-repos.sh` — write run-level `.run-meta.json` (in-scope repos).
- `discover-versions.sh` — seed `versions.{repo}.json` + cache CHANGELOG + pre-bake per-version sections + best-practices bundle.
- `setup-branch.sh` — idempotent `git checkout` for one repo + branch.
- `version-classify.sh` / `version-add-change.sh` — VERSION_PLANNER's mutation surface for `versions.{repo}.json`.
- `apply-version.sh` — Phase 3 per-version: update package.json, `npm install`, `npm test`, commit, mark implemented (last action).
- `version-mark-implemented.sh` / `version-mark-failed.sh` — state transitions used by `apply-version.sh`.
- `render-version-plan.sh` — read-only markdown view of one version's plan.
- `list-plans.sh` / `upgrade-status.sh` — filterable status views of the canonical JSON.