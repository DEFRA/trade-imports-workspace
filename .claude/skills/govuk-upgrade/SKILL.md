---
name: govuk-upgrade
description: 'Upgrade the govuk-frontend package across every EUDP trade-imports Node.js repo that consumes it. A four-stage workflow driven by canonical per-repo JSON state (`versions.{repo}.json`): Phase 1 = `tim govuk start` (ticket → branch → discover repos → seed state + pre-bake CHANGELOG sections + best-practices bundle), Phase 2 = fan-out one `general-purpose` Task subagent per pending version following `references/VERSION_PLANNER.md` (uses `tim govuk classify` + `tim govuk add-change`), optional Walker = batch triage of pending plans following `references/PLAN_WALKER.md`, Phase 3 = strict-semver-order `tim govuk apply` per `todo` version (package.json + npm install + npm test + commit + state transition), then E2E once at the end. Stays inside the govuk-frontend toolbox — Nunjucks macros, govuk-* utility classes, no custom CSS or hand-rolled components. Triggers: "upgrade govuk-frontend", "govuk upgrade", "govuk-frontend upgrade", "bump govuk-frontend", "walk govuk EUDPA-XXX", "tim govuk start". NOT for non-govuk-frontend npm bumps — use `npm-upgrade`. NOT for raising the tracking ticket itself — use `ticket-creator`.'
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
| "upgrade govuk-frontend" / "govuk upgrade" / "bump govuk-frontend" | Start a fresh run | Step 1 below → `tim govuk start` |
| "continue govuk EUDPA-XXX" | Resume mid-run | Re-enter at the next gate (Phase 2 / walker / Phase 3) |
| "walk govuk EUDPA-XXX" | Batch-triage pending plans | `references/PLAN_WALKER.md` |
| "implement govuk EUDPA-XXX" / "apply govuk EUDPA-XXX" | Run Phase 3 | `references/PHASE_3_MANAGER.md` |
| "govuk status EUDPA-XXX" | Status snapshot | `tim govuk plans --run-id EUDPA-XXX` |

## Repos in scope

Auto-detected at Phase 1 by `tim govuk start` — any repo under
`repos/*` whose `package.json` lists `govuk-frontend` is in scope. The
list is written to
`workareas/govuk-upgrades/{run-id}/.run-meta.json` as `repos[]`.
Phase 2 and Phase 3 iterate that list; no skill prose hard-codes repo
membership.

## Worker references

| Persona | Used in | Mutation surface |
|---|---|---|
| `references/VERSION_PLANNER.md` | `references/PHASE_2_MANAGER.md` Step 2 — one per unplanned version, parallel fan-out | `tim govuk classify` + `tim govuk add-change` against `versions.{repo}.json` |

Spawn idiom inside Phase 2: Task tool with `subagent_type: general-purpose`
and a prompt beginning `Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/govuk-upgrade/references/VERSION_PLANNER.md.`
`general-purpose` carries `Tools: *` so the worker can Read the pre-baked
changelog, Grep the repo, and call `tim govuk classify` and `tim govuk add-change`.

## Step 1: Establish ticket + branch

Ask the user which ticket this upgrade tracks. Three paths:

1. **Existing ticket** — they give an `EUDPA-XXXXX`. Branch is
   `chore/EUDPA-XXXXX`. Proceed to Step 2.
2. **Create a new ticket** — write a `tim-ticket/1` manifest with
   DevOps conventions (`project` from `JIRA_PROJECT_KEY`, type `Task`,
   parent `EUDPA-144`, labels `DevOps` + `tech-improvement`, priority
   `Medium`) and raise it with
   `tim jira create --from ticket.json` (a dry run), then
   `--confirm <planId>` once the user approves. See the
   `ticket-creator` skill for the manifest and the GDS
   question-gathering flow. Capture the new ticket key from
   `ticket.created.json`, then Branch is `chore/EUDPA-XXXXX`.
3. **Custom branch name (no Jira ticket)** — accept the user-supplied
   branch verbatim. Use this only when there's a deliberate reason not
   to track work in Jira.

## Step 2: Run Phase 1 dispatcher

```bash
tim govuk start --ticket EUDPA-XXXXX [--target 6.1.0]
```

Or with a custom branch:

```bash
tim govuk start --branch <branch-name> [--target 6.1.0]
```

`tim govuk start` writes `.run-meta.json`, ensures every in-scope repo
is on the branch, and seeds `versions.{repo}.json` + pre-bakes the
per-version changelog and best-practices files. It prints `PHASE: 1`
on the first line so you can confirm the dispatch. `--force` downloads
the changelog again and reseeds every version, losing any plan already
made.

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

- `references/PHASE_1_MANAGER.md` — Phase 1 gate (`tim govuk start` wrapper).
- `references/PHASE_2_MANAGER.md` — fan-out to `VERSION_PLANNER.md` workers.
- `references/PLAN_WALKER.md` — batch triage of Phase 2 output before Phase 3.
- `references/PHASE_3_MANAGER.md` — implementation in strict semver order (delegates to `tim govuk apply`).
- `references/VERSION_PLANNER.md` — single-version CHANGELOG analysis + per-repo plan classification (spawned per version as `general-purpose`).

Best-practices (load when the changelog warrants):

- `~/git/defra/trade-imports-workspace/docs/best-practices/node/govuk-frontend.md` — primary technical reference.
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/components.md` — GDS component rules.
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/patterns.md` — question-page / task-list patterns.
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/accessibility.md` — WCAG / a11y.
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/styles.md` — typography + colour utilities.

Phase 1, in tim:

- `tim govuk start` — Phase 1 dispatcher: `.run-meta.json` (every repo under `repos/` whose `package.json` lists govuk-frontend), branch setup per repo, version discovery from the npm registry (`npm_config_registry` when set), the cached CHANGELOG with its per-version sections, the best-practices bundle and the security pre-flight (`npm audit` per repo).

Read-only views of the canonical JSON, in tim:

- `tim govuk plans` — filterable status view: each repo's counts and versions (`--filter`, `--sort-semver`, `--json`).
- `tim govuk summaries` — the walker's work list: one row per version still to apply that is not a noop.
- `tim govuk render-plan` — markdown view of one version's plan.

Writes to the canonical JSON and the repos, in tim:

- `tim govuk classify` / `tim govuk add-change` — VERSION_PLANNER's mutation surface for `versions.{repo}.json`.
- `tim govuk apply` — Phase 3 per-version: update package.json, `npm install`, `npm test`, commit, mark done (last action).
- `tim govuk mark-done` / `tim govuk mark-failed` — state transitions, used by `tim govuk apply` and the walker.

Each takes the version as `--govuk-version`, since `--version` prints tim's own version.