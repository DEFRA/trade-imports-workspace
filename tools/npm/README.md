# NPM Dependency Upgrade Tools

Tools for discovering and managing npm dependency upgrades across the EUDP trade-imports repositories.

## Discovery and planner context

Discovery and the planners' context are tim commands: `tim npm discover`
seeds `packages.{repo}.json` from npm-check-updates, which tim pins, and
`tim npm context best-practices|prebake` writes what the planners read.
See `tim npm discover --help` and `tim npm context --help`.

## Audit

The audit is a tim command too: `tim npm audit baseline` runs a repo's
audit-ci check and summarises it, `tim npm audit allow` writes or renews
one `audit-ci.jsonc` allowlist entry, `tim npm audit forget` drops
entries from a run's allowlist state, and `tim npm audit gate` is the
check after one package upgrade. `tim npm exec --repo R -- <npm args>`
runs npm in a repo at its real path. See `tim npm audit --help` and
`tim npm exec --help`.

## Override and lockfile tooling (EUDPA-668)

These scripts serve the `npm-upgrade` skill's phase 2 lockfile refresh
and phase 4 (override reset). Each repo that has adopted audit-ci keeps
a comment-free `audit-ci.jsonc` at its root. State goes under
`workareas/npm-upgrades/{run-id}/{repo}/`. Every script takes
`--repo-path PATH` to work on a scratch checkout instead of
`repos/<repo>`.

### refresh-lockfile.sh

```bash
./refresh-lockfile.sh --run-id EUDPA-668 --repo trade-imports-schemas
```

`npm update` (lockfile only; it rolls back if `package.json` changes),
then `npm test` (not in trade-imports-ins-tests), `npm run lint` and
`tim npm audit baseline`, then commits "Refresh transitive dependencies".
Any failure, including a refused commit, restores `package.json` and
`package-lock.json` from HEAD. Prints `{repo, status:
committed|no_change|rolled_back, commit, reason, log}`.
`run-automated-upgrades.sh` calls it at the end of each repo's batch.

### reset-overrides.sh

```bash
./reset-overrides.sh --run-id EUDPA-668 --repo trade-imports-animals-frontend
```

Saves the repo's `overrides`, flattened per leaf
(`lighthouse/.`, `lighthouse/ws`), to `overrides.{repo}.json`, then
works in a throwaway `git worktree` under the run's workarea: with no
overrides, `npm install`, `npm update`, the audit, `npm test`,
`npm run lint` and `npm run build:frontend`. A failing advisory puts
back the overrides on its package or on a package that depends on it (reason: the GHSA); a failing check
puts overrides back one at a time and then drops any that were not
needed (reason: the check, evidence: the log tail). It copies
`package.json` and `package-lock.json` back, commits "Remove overrides"
with a table of the kept ones, and prints `{repo, status, commit, kept,
removed, below_threshold, reason, worktree}`. It stops (exit 1, worktree
kept) on an advisory no override covers, or a check that fails with
every override back. `start-upgrade.sh --phase 4` runs it per repo in
parallel.
