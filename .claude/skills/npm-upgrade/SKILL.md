---
name: npm-upgrade
description: 'Upgrade (non-govuk-frontend) npm packages across the EUDP trade-imports repos via a three-phase workflow plus interactive walker — discover outdated packages, classify each as auto (no code changes) or manual (breaking changes), run automated upgrades with rollback safety, produce a handoff manifest for the remaining manual work, then walk the manual list keystroke-by-keystroke and spawn a per-package implementor worker on demand. Per-package classification and implementation state lives in canonical JSON (`packages.{repo}.json`) — no markdown plan files on disk. Fans out per-package research in Phase 1 to `general-purpose` Task subagents following `references/PACKAGE_PLANNER.md`, and per-package implementation from the walker to subagents following `references/MANUAL_UPGRADE_IMPLEMENTOR.md`. Use when the user asks to bring npm packages up to date across repos (triggers: "upgrade npm deps", "upgrade npm dependencies", "upgrade dependencies", "run npm upgrades", "walk upgrade EUDPA-XXX", "triage upgrade EUDPA-XXX", "implement upgrade EUDPA-XXX"). NOT for one-off `npm install <pkg>` work, and NOT for govuk-frontend specifically — use the `govuk-upgrade` skill for that (single package, changelog-driven, per-version sequencing).'
context: fork
allowed-tools: [Bash, Read, Glob, Grep, Task]
argument-hint: 'EUDPA-XXXXX [--repo R] [--phase 0|1|2|3|4]'
---

Three-phase npm dependency upgrade workflow for the EUDP trade-imports
workspace. Phase 1 discovers + plans, Phase 2 applies the no-code-change
upgrades, Phase 3 reports what still needs human work. Phase 0 (the
audit baseline) gates Phase 1, and Phase 4 (the override reset) is run
on its own after the upgrades.

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
- Audit before and after — in a repo with `audit-ci.jsonc`, each upgrade is audited; a new advisory with no fix is allowlisted in the same commit, one with a fix rolls the upgrade back.
- Automatic rollback — failed upgrades are reverted (`package.json`, `package-lock.json`, `audit-ci.jsonc`) and marked failed, including a commit the repo's pre-commit hook refuses.
- Cascade detection — stops immediately if rollback itself fails.
- No auto-push — all commits stay local until human review.

## Repos

The workspace roster lives in one place —
`~/git/defra/trade-imports-workspace/repos.json`. This skill covers the
entries flagged `npmUpgradeDefault`, all checked out under
`~/git/defra/trade-imports-workspace/repos/`. `start-upgrade.sh` reads
the same flag, so ask the roster rather than a copied list:

```bash
jq -r '.repos[] | select(.npmUpgradeDefault) | .name' ~/git/defra/trade-imports-workspace/repos.json
```

Pass `--repo <name>` to run against a different set. A repo with no
`package.json` is skipped with a warning.

`trade-imports-plants-prototype` is never upgraded directly: it takes
every dependency change from `trade-imports-plants-frontend` through
its `sync:upstream` script, after the plants-frontend PR merges.

## Step 1: Establish Run ID and branch

The branch is the ticket's branch, the same name in every repo (CLAUDE.md
rule 2): `chore/EUDPA-N-<slug>`, or `feat/` or `fix/` for that kind of
work. Read it from the ticket, or from a repo already on it:

```bash
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend branch --show-current
```

Parse `EUDPA-XXXXX` from the branch name (e.g.
`chore/EUDPA-668-npm-security-sweep` → `EUDPA-668`). If not found, ask
the user for the ticket and the branch name.

Pass the branch to every dispatcher call as `--branch {branch}`.
`start-upgrade.sh` then refuses to run if any repo is on another branch.

## Step 2: Branch Setup

For each repo, ensure it's on `{branch}`:

Check locally **and** on the remote. `branch --list` only lists local
branches, so a branch a colleague already pushed looks absent, and creating
it below would diverge from theirs.

```bash
# Check local (separate Bash calls — no pipes)
git -C ~/git/defra/trade-imports-workspace/repos/{repo-name} branch --list "{branch}"
```

```bash
# Check remote
git -C ~/git/defra/trade-imports-workspace/repos/{repo-name} branch --remotes --list "origin/{branch}"
```

```bash
# Switch if it exists locally
git -C ~/git/defra/trade-imports-workspace/repos/{repo-name} checkout "{branch}"
```

```bash
# Exists only on the remote — create it tracking origin, never bare
git -C ~/git/defra/trade-imports-workspace/repos/{repo-name} checkout -b "{branch}" --track "origin/{branch}"
```

```bash
# Missing in both — create it fresh
git -C ~/git/defra/trade-imports-workspace/repos/{repo-name} checkout -b "{branch}"
```

All repos must be on `{branch}` before continuing.

## Phase 0: Audit baseline

Every repo with an `audit-ci.jsonc` must start green. One call audits
them all and records the run in `{run-id}/phase0.json`:

```bash
~/git/defra/trade-imports-workspace/tools/npm/start-upgrade.sh {run-id} --phase 0 --branch {branch}
```

It exits 1 if any repo's audit fails, or an allowlisted advisory now
has a fixed version (`fixable_allowlisted`: take the fix and drop the
entry). Phase 1 refuses to start unless the last phase 0 run covered
every repo at its current HEAD and was green. Write or renew an
allowlist entry only with `audit-allowlist-add.sh` (see
`references/COMMON.md`); the repo's CI checks the entry rules.

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
automatically. Each package is audited after its tests; pass
`--allowlist-owner` and `--expiry-days` so a new advisory with no fix
is allowlisted rather than demoting the package. Each repo's batch
ends with `refresh-lockfile.sh` (transitive dependencies within their
ranges).

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
`MANUAL_UPGRADE_IMPLEMENTOR` worker for that package, `D` holds it
back with the reason the user gives (file a follow-up ticket), `S`
leaves pending.

## Phase 4: Override reset

Run on its own, once the upgrades are in, to take each repo back to
no `overrides` and keep only the ones it can prove it needs:

```bash
~/git/defra/trade-imports-workspace/tools/npm/start-upgrade.sh {run-id} --phase 4 --branch {branch}
```

Per repo (in parallel), `reset-overrides.sh` does every trial in a
throwaway git worktree under the run's workarea, so the repo checkout
never sees a red state. With no overrides it runs install, update,
audit, test, lint and `build:frontend`. A failing advisory (high and
above) puts back the override for its package; a failing test, lint
or build puts overrides back one at a time, then drops any that turn
out not to matter. It commits "Remove overrides" with a table of kept
overrides and their reasons, and records each override in
`overrides.{repo}.json`. A repo that stops (an advisory no override
covers, or a check that fails with every override back) is reported
for a decision, with its worktree kept.

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

- `start-upgrade.sh` — single dispatcher (phase 0 / 1 / 2 / 3 / 4).
- `audit-baseline.sh` — Phase 0 and per-upgrade audit check (audit-ci, plus whether each advisory has a fix).
- `audit-allowlist-add.sh` — write or renew one `audit-ci.jsonc` allowlist entry.
- `refresh-lockfile.sh` — Phase 2 end-of-batch transitive refresh.
- `reset-overrides.sh` — Phase 4 per-repo override reset.
- `discover-upgrades.sh` — discovery + seed `packages.{repo}.json`.
- `prebake-context.sh` — per-package context pre-bake (best-effort).
- `bake-best-practices.sh` — per-repo best-practices bundle.
- `packages-init.sh` / `packages-set-classification.sh` / `packages-set-status.sh` — JSON state writers.
- `packages-list.sh` / `packages-counts.sh` — JSON state queries.
- `verify-classification-coverage.sh` — Phase 1 gate.
- `run-automated-upgrades.sh` — Phase 2 per-repo runner.
- `upgrade-one-package.sh` — Phase 2 helper (install + test + commit + rollback; JSON-aware).
- `run-manual-upgrade.sh` — Phase 3 per-package runner (spawned by WALKER on `I`).
