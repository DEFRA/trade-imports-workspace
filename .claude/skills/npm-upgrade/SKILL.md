---
name: npm-upgrade
description: 'Upgrade (non-govuk-frontend) npm packages across the EUDP Live Animals repos via a three-phase workflow plus interactive walker — discover outdated packages, classify each as auto (no code changes) or manual (breaking changes), run automated upgrades with rollback safety, produce a handoff manifest for the remaining manual work, then walk the manual list keystroke-by-keystroke and spawn a per-package implementor worker on demand. Per-package classification and implementation state lives in canonical JSON (`packages.{repo}.json`) — no markdown plan files on disk. Fans out per-package research in Phase 1 to `general-purpose` Task subagents following `references/PACKAGE_PLANNER.md`, and per-package implementation from the walker to subagents following `references/MANUAL_UPGRADE_IMPLEMENTOR.md`. Use when the user asks to bring npm packages up to date across repos (triggers: "upgrade npm deps", "upgrade npm dependencies", "upgrade dependencies", "run npm upgrades", "walk upgrade EUDPA-XXX", "triage upgrade EUDPA-XXX", "implement upgrade EUDPA-XXX"). NOT for one-off `npm install <pkg>` work, and NOT for govuk-frontend specifically — use the `govuk-upgrade` skill for that (single package, changelog-driven, per-version sequencing).'
context: fork
allowed-tools: [Bash, Read, Glob, Grep, Task]
argument-hint: 'EUDPA-XXXXX [--repo R] [--phase 1|2|3]'
---

Three-phase npm dependency upgrade workflow for EUDP Live Animals. Phase
1 discovers + plans, Phase 2 applies the no-code-change upgrades, Phase
3 reports what still needs human work.

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

## Worker references

| Persona | Used in | Artifact |
|---|---|---|
| `references/PACKAGE_PLANNER.md` | `references/DISCOVERY_AND_PLANNING.md` Step 2 — one per outdated package, parallel fan-out | classification row in `packages.{repo}.json` (via `packages-set-classification.sh`) |
| `references/MANUAL_UPGRADE_IMPLEMENTOR.md` | `references/WALKER.md` `I` keystroke — one per package the operator chooses to implement | source edits + commit + JSON status row update |

Spawn idiom: Task tool with `subagent_type: general-purpose` and a prompt
beginning `Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/npm-upgrade/references/<NAME>.md.`
`general-purpose` carries `Tools: *` so workers can WebFetch
changelogs, Grep the codebase, and (for the implementor) edit source
files and run tests.

## Overview

See `references/COMMON.md` for prerequisites, failure types, file
extension conventions, and global rules shared by all phases.

## Safety features

- Sequential processing — one package at a time per repo (no parallel upgrades within a repo).
- Test before commit — baseline test run before each upgrade attempt.
- Automatic rollback — failed upgrades are reverted and marked `.failed`.
- Cascade detection — stops immediately if rollback itself fails.
- No auto-push — all commits stay local until human review.

## Repos

All EUDP Live Animals Node repos under `~/git/defra/trade-imports-workspace/repos/`:

- trade-imports-animals-frontend
- trade-imports-animals-backend
- trade-imports-animals-tests
- trade-imports-animals-admin

## Step 1: Establish Run ID

```bash
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend branch --show-current
```

Parse `EUDPA-XXXXX` from the branch name (e.g.
`feature/EUDPA-20578-...` → `EUDPA-20578`). If not found, ask the user.

## Step 2: Branch Setup

For each repo, ensure it's on `feature/{run-id}-npm-dependency-upgrades`:

Check locally **and** on the remote. `branch --list` only lists local
branches, so a branch a colleague already pushed looks absent, and creating
it below would diverge from theirs.

```bash
# Check local (separate Bash calls — no pipes)
git -C ~/git/defra/trade-imports-workspace/repos/{repo-name} branch --list "feature/{run-id}-npm-dependency-upgrades"
```

```bash
# Check remote
git -C ~/git/defra/trade-imports-workspace/repos/{repo-name} branch --remotes --list "origin/feature/{run-id}-npm-dependency-upgrades"
```

```bash
# Switch if it exists locally
git -C ~/git/defra/trade-imports-workspace/repos/{repo-name} checkout "feature/{run-id}-npm-dependency-upgrades"
```

```bash
# Exists only on the remote — create it tracking origin, never bare
git -C ~/git/defra/trade-imports-workspace/repos/{repo-name} checkout -b "feature/{run-id}-npm-dependency-upgrades" --track "origin/feature/{run-id}-npm-dependency-upgrades"
```

```bash
# Missing in both — create it fresh
git -C ~/git/defra/trade-imports-workspace/repos/{repo-name} checkout -b "feature/{run-id}-npm-dependency-upgrades"
```

All repos must be on the feature branch before continuing.

## Phase 1: Discovery and Planning

```
Follow references/DISCOVERY_AND_PLANNING.md. Run ID: {run-id}
```

Phase 1 calls the dispatcher (`start-upgrade.sh --phase 1`) which
runs discovery, pre-bakes per-package context, and emits a JSON spawn
manifest. The persona fans out one PACKAGE_PLANNER subagent per
manifest entry, then runs `verify-classification-coverage.sh` as the
gate.

Emit ALL Task calls in a single assistant response — do NOT spawn one, await the result, then spawn the next. Parallelism only works when calls are batched in one turn.

Present its report verbatim. **Gate:** "Phase 1 complete. Proceed to
Phase 2?"

## Phase 2: Automated Execution

```
Follow references/AUTOMATED_EXECUTION.md. Run ID: {run-id}
```

Phase 2 calls the dispatcher (`start-upgrade.sh --phase 2`) which
fans out `run-automated-upgrades.sh` per repo in parallel and
aggregates JSON status. Per-package demotions to manual happen
automatically.

Present its report verbatim. **Gate:** "Phase 2 complete. Proceed to
Phase 3 handoff?"

If cascade failures are reported, flag them and ask how to handle before
proceeding.

## Phase 3: Manual Handoff

```
Follow references/MANUAL_HANDOFF.md. Run ID: {run-id}
```

Phase 3 calls the dispatcher (`start-upgrade.sh --phase 3`) which
emits a JSON manifest of every manual (and failed-auto) package. The
persona renders the operator report and hands off to the WALKER.

## Walker (manual triage)

```
Follow references/WALKER.md. Run ID: {run-id}
```

The walker presents every manual package in one batch table and
takes I/D/S keystrokes — `I` spawns the
`MANUAL_UPGRADE_IMPLEMENTOR` worker for that package, `D` defers
(file a follow-up ticket), `S` leaves pending.

## Failures

Surface any error to the user with the raw output. Do not retry or
problem-solve. Wait for instruction.

## Scope guidance

See `references/COMMON.md` for the recommended-scope rules — single
repo / single package / planning-only batches.

## References

- `references/COMMON.md` — prerequisites, failure types, global rules.
- `references/DISCOVERY_AND_PLANNING.md` — Phase 1 manager (discovery + fan-out to `PACKAGE_PLANNER.md` workers).
- `references/AUTOMATED_EXECUTION.md` — Phase 2 manager (auto upgrades).
- `references/MANUAL_HANDOFF.md` — Phase 3 manager (manual handoff report).
- `references/WALKER.md` — interactive batch-triage walker over manual + failed-auto packages.
- `references/PACKAGE_PLANNER.md` — per-package research + auto/manual classification (spawned per package as `general-purpose`).
- `references/MANUAL_UPGRADE_IMPLEMENTOR.md` — per-package atomic edit-test-commit-rollback worker (spawned by the WALKER on `I`).
- `assets/packages-table.md` — canonical JSON schema for `packages.{repo}.json`.

Scripts (`~/git/defra/trade-imports-workspace/tools/npm/`):

- `start-upgrade.sh` — single dispatcher (phase 1 / 2 / 3).
- `discover-upgrades.sh` — discovery + seed `packages.{repo}.json`.
- `prebake-context.sh` — per-package context pre-bake (best-effort).
- `bake-best-practices.sh` — per-repo best-practices bundle.
- `packages-init.sh` / `packages-set-classification.sh` / `packages-set-status.sh` — JSON state writers.
- `packages-list.sh` / `packages-counts.sh` — JSON state queries.
- `verify-classification-coverage.sh` — Phase 1 gate.
- `run-automated-upgrades.sh` — Phase 2 per-repo runner.
- `upgrade-one-package.sh` — Phase 2 helper (install + test + commit + rollback; JSON-aware).
- `run-manual-upgrade.sh` — Phase 3 per-package runner (spawned by WALKER on `I`).
