# NPM Dependency Upgrade Tools

Tools for discovering and managing npm dependency upgrades across the EUDP trade-imports repositories.

## Scripts

### discover-upgrades.sh

Discovers outdated npm dependencies and creates a workspace with zero-byte marker files for parallel agent processing.

**Usage:**
```bash
./discover-upgrades.sh <repo-path> [options]

Options:
  --strategy LEVEL       Upgrade strategy: latest|minor|patch (default: latest)
  --json                 Output JSON format instead of human-readable
  --workspace-dir DIR    Custom workspace directory (default: npm-upgrades/)
  --force                Force re-discovery (recreate workspace)
  --help                 Show help message
```

**Examples:**
```bash
# Discover all outdated dependencies
./discover-upgrades.sh ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend

# Only find minor and patch upgrades
./discover-upgrades.sh ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend --strategy minor

# Output JSON for programmatic use
./discover-upgrades.sh ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend --json

# Force re-discovery (preserves completed work)
./discover-upgrades.sh ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend --force
```

**Workspace Structure:**
```
npm-upgrades/
└── {repo-name}/
    ├── .upgrades-meta.json                           # State tracking
    ├── upgrade__winston__3.8.2__3.12.0.md           # Zero-byte marker
    ├── upgrade__@types__node__24.10.10__25.2.1.md   # Scoped package
    └── ...
```

**Marker File Naming:**
- Format: `upgrade__{package}__{current}__{target}.md`
- Scoped packages: `@types/node` → `@types__node`
- Version prefixes stripped: `^24.10.10` → `24.10.10`

**Completion Tracking:**

Files start as zero-byte markers. Agents research each dependency and write migration plans to the files. File size > 0 indicates completion.

```bash
# Count pending (zero-byte files)
find npm-upgrades/{repo} -name "upgrade__*.md" -size 0 | wc -l

# Count completed (non-zero files)
find npm-upgrades/{repo} -name "upgrade__*.md" -size +0 | wc -l

# Get next pending task
find npm-upgrades/{repo} -name "upgrade__*.md" -size 0 | head -1
```

**Idempotency:**

Re-running the script:
- Preserves existing workspace
- Only creates NEW marker files for NEW upgrades
- Skips files with content (already processed by agents)
- Updates `.upgrades-meta.json` with new discovery date

With `--force`:
- Recreates workspace from scratch
- Still preserves marker files with content

**Requirements:**
- `npm-check-updates` (ncu): `npm install -g npm-check-updates`
- `jq`: JSON processing

**Metadata JSON:**

`.upgrades-meta.json` tracks all upgrade details:
```json
{
  "repo_name": "trade-imports-animals-frontend",
  "repo_path": "/path/to/repo",
  "workspace_dir": "/path/to/workspace",
  "created": "2026-02-06T13:10:05Z",
  "last_discovered": "2026-02-06T13:12:39Z",
  "ncu_version": "16.14.12",
  "upgrade_strategy": "latest",
  "total_upgrades": 3,
  "upgrades": [
    {
      "package": "@types/node",
      "current": "24.10.10",
      "target": "25.2.1",
      "upgrade_type": "major",
      "marker_file": "upgrade__@types__node__24.10.10__25.2.1.md",
      "status": "pending",
      "dependency_type": "devDependencies",
      "size_bytes": 0,
      "created": "2026-02-06T13:10:05Z"
    }
  ],
  "summary": {
    "total": 3,
    "pending": 2,
    "completed": 1,
    "by_type": {
      "dependencies": 0,
      "devDependencies": 3
    },
    "by_upgrade_type": {
      "patch": 2,
      "minor": 0,
      "major": 1
    }
  }
}
```

**Key Features:**
- ✅ Deterministic discovery (no AI, just parse `ncu --jsonUpgraded`)
- ✅ Zero-byte markers enable parallel agent processing
- ✅ Metadata encoded in filenames (no need to read files to know what to do)
- ✅ Idempotent re-runs (safe to call multiple times)
- ✅ Read-only (never modifies package.json or package-lock.json)
- ✅ Machine-parseable JSON output mode

**Non-Goals:**
- Does NOT modify package.json or run npm install
- Does NOT implement agents (only creates marker files for them)
- Does NOT handle multi-repo orchestration (call script once per repo)
- Does NOT detect breaking changes (agents do this when researching)

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
