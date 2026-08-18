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
