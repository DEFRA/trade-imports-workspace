# NPM Dependency Upgrade Tools

Tools for discovering and managing npm dependency upgrades across the EUDP trade-imports repositories.

## Discovery and planner context

Discovery and the planners' context are tim commands: `tim npm discover`
seeds `packages.{repo}.json` from npm-check-updates, which tim pins, and
`tim npm context best-practices|prebake` writes what the planners read.
See `tim npm discover --help` and `tim npm context --help`.

## Audit and override tooling (EUDPA-668)

These scripts serve the `npm-upgrade` skill's phase 0 (audit baseline),
the audit gate inside phase 2, and phase 4 (override reset). Each repo
that has adopted audit-ci keeps a comment-free `audit-ci.jsonc` at its
root, so `jq` can read it. State goes under
`~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{run-id}/{repo}/`.
Every script takes `--repo-path PATH` to work on a scratch checkout
instead of `repos/<repo>`. Shared helpers live in `audit-lib.sh`
(sourced, not run) and `audit-fix-check.mjs` (the semver check for
"does a fixed version exist").

### audit-baseline.sh

```bash
./audit-baseline.sh --run-id EUDPA-668 --repo trade-imports-animals-admin [--label LABEL]
```

Runs `npx --no-install audit-ci --config audit-ci.jsonc --report-type full
--output-format json` in the repo, saves the npm audit report as
`audit.{repo}.{label}.json`, and prints (and saves as
`audit.{repo}.{label}.summary.json`) one JSON summary:
`green`, `failing`, `allowlisted`, `stale`, `inactive_allowlist`,
`fixable_allowlisted`, `blocked_allowlisted`, `failing_fixable`,
`failing_no_fix` and `advisories`. A "fixed version" is a published,
non-prerelease version newer than the installed one and outside every
vulnerable range (`npm view` against the repo's registry). An
allowlisted advisory with a fix is `fixable_allowlisted`, unless its
notes say "Fix blocked upstream:" (then `blocked_allowlisted`).
Exit 0 green with no `fixable_allowlisted`; 1 otherwise; 2 if the audit
could not run. It does not check the allowlist rules (shape, owner,
expiry): each repo's CI "Check audit allowlist" step does.

### audit-allowlist-add.sh

```bash
./audit-allowlist-add.sh --run-id EUDPA-668 --repo trade-imports-animals-frontend \
  --ghsa GHSA-c475-qrg2-pj4r --reason "basic-ftp FTP command injection; dev only" \
  --owner "Sam Farrington" --expiry-days 90 \
  [--blocked-by "get-uri pins basic-ftp ^5"] [--stage 1]
```

Writes or renews (in place) one entry:
`{"GHSA-…": {"active": true, "notes": "<reason>. Owner: <owner>", "expiry": "YYYY-MM-DD"}}`.
Refuses an expiry more than 3 calendar months away, a GHSA the repo's
audit does not report, and an advisory that has a fixed version unless
`--blocked-by` names the parent that stops the repo taking it (kind
`fix_blocked_upstream`, and the notes gain "Fix blocked upstream: …").
Records the entry, its kind, `added_at` and `stage` in
`allowlist.{repo}.json`. It stages and commits nothing.

### refresh-lockfile.sh

```bash
./refresh-lockfile.sh --run-id EUDPA-668 --repo trade-imports-schemas
```

`npm update` (lockfile only; it rolls back if `package.json` changes),
then `npm test` (not in trade-imports-ins-tests), `npm run lint` and
`audit-baseline.sh`, then commits "Refresh transitive dependencies".
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
