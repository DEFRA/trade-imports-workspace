# Common Reference — NPM Upgrade

Shared reference for all npm-upgrade phases.

All scripts referenced below live at `~/git/defra/trade-imports-workspace/tools/npm/` per
the parent SKILL.md's path-conventions preamble. The phase managers
invoke them by absolute path.

## Prerequisites

- VPN connected (Defra/Artifactory access)
- On the feature branch with a clean working directory
- Node version correct (`nvm use`)

## Scripts (cheat-sheet)

| Script | Phase | Purpose |
|--------|-------|---------|
| `start-upgrade.sh` | All | Single dispatcher (`--phase 1\|2\|3`) |
| `discover-upgrades.sh` | 1 | Find outdated packages + seed `packages.{repo}.json` |
| `prebake-context.sh` | 1 | Per-package context bundle (best-effort) |
| `bake-best-practices.sh` | 1 | Per-repo best-practices bundle |
| `packages-init.sh` / `packages-set-classification.sh` / `packages-set-status.sh` | All | JSON state writers (atomic) |
| `packages-list.sh` / `packages-counts.sh` | All | JSON state queries |
| `verify-classification-coverage.sh` | 1 | Phase 1 gate |
| `run-automated-upgrades.sh` | 2 | Per-repo automated runner |
| `upgrade-one-package.sh` | 2 | Internal: install + test + commit + rollback, JSON-aware |
| `run-manual-upgrade.sh` | 3 | Per-package manual runner (spawned by WALKER) |

## State model

All per-package state is in `packages.{repo}.json` under
`~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{run-id}/{repo}/`.
Schema: `assets/packages-table.md`.

There are no `.auto.md` / `.manual.md` plan files on disk — the
classification, risk, rationale, files_affected and change summary
all live in the JSON. `packages-list.sh --classification manual --json`
is the canonical query for "what needs manual work".

There are no `.todo` / `.inprogress` / `.done` / `.failed` marker
files either — implementation status lives on `implementation_status`
in the same JSON row.

## Tests-repo exception

`trade-imports-animals-tests` has **no unit-test suite** — it IS the
E2E suite (Playwright runner against the live stack). The per-package
`npm test` baseline + post-upgrade checks are SKIPPED for this repo
inside both `upgrade-one-package.sh` and `run-manual-upgrade.sh`.

Instead, the orchestrating runner — `run-automated-upgrades.sh` for
the auto side, and the WALKER for the manual side — runs
`npm run test:docker-compose` **once at end of batch** as the integration
gate. A failure there means at least one of the just-landed
upgrades broke E2E; the upgrades are already committed, so the
operator decides whether to revert or fix forward (read
`test-results/*/error-context.md` to diagnose — never grep the
streaming log tail).

## Failure Types

| Type | Cause | Action |
|------|-------|--------|
| Connectivity | VPN/Artifactory down | Stop, report to user |
| Baseline failure | Repo tests already broken | Stop, report — not an upgrade issue |
| Install failure | Peer conflict etc. | Auto-demote: classification → manual, `demoted_from_auto: true`, failure_reason populated |
| Test failure after upgrade | Breaking change | Rollback, auto-demote (same as above) |
| Cascade failure | Rollback itself fails | Stop immediately, report — repo is in an inconsistent state |

## Workspace Layout

```
~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{run-id}/{repo}/
  packages.{repo}.json              — canonical per-repo state (schema in assets/packages-table.md)
  .upgrades-meta.json               — thin discovery header
  best-practices.md                 — per-repo dependency-relevant best practices
  .context/{normalized-pkg}/
    package-meta.json
    usages.txt
    changelog.md                    — present iff prebake found one
    migration.md                    — rare; worker normally hydrates
```

Ephemeral runtime cache (gitignored).

## Scope guidance

The workflow works best when scoped tightly. Running across many repos
and many packages simultaneously generates too much concurrent work for
an agent to coordinate without human guidance.

Recommended scope per run:

- Single repo for initial exploration or high-risk packages.
- All repos, single package (e.g. upgrade lodash everywhere) — works well automated.
- All repos, full audit — use for planning only; implement in smaller batches.

## Global Rules

- Never push commits — all changes stay local until human review.
- Never skip test runs.
- Summaries in reports, not full logs.