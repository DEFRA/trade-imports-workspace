# Consolidated npm-upgrade packages state — schema

The consolidated per-repo packages state is canonical JSON, mutated
only via helper scripts. There is **no rendered markdown plan file** —
if a human needs the plan for a single package, regenerate it on
demand from the JSON.

## Location

```
~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{run-id}/{repo}/packages.{repo}.json
```

One file per repo. Initial population: `packages-init.sh` (called by
`discover-upgrades.sh`). Subsequent mutations: walker, runners,
PACKAGE_PLANNER workers — all via the `packages-*.sh` helpers under
`tools/npm/`. Never hand-edit.

Sister files in the same directory:

- `.context/{normalized-pkg}/{changelog.md,migration.md,usages.txt,package-meta.json}`
  — per-package pre-baked context (best-effort), populated by
  `prebake-context.sh`.
- `best-practices.md` — concatenated dependency-relevant best
  practices for this repo.

`.upgrades-meta.json` is kept as a thin discovery-time header
(repo path, ncu version, strategy, run timestamp). All per-package
state lives in `packages.{repo}.json`.

## Shape

```jsonc
{
  "ticket": "EUDPA-XXXXX",
  "repo": "trade-imports-animals-frontend",
  "discovered_at": "2026-05-26T12:00:00Z",
  "strategy": "latest",
  "ncu_version": "16.14.20",
  "packages": [
    {
      "package": "lodash",
      "current": "4.17.20",
      "target": "4.17.21",
      "upgrade_type": "patch",                // patch | minor | major
      "dependency_type": "dependencies",      // dependencies | devDependencies

      // Set by PACKAGE_PLANNER via packages-set-classification.sh.
      "classification": null,                 // null | "auto" | "manual"
      "risk": null,                           // null | "LOW" | "MEDIUM" | "HIGH"
      "safe_for_automation": null,            // null | true | false
      "rationale": null,                      // free-text, 1 sentence
      "files_affected": null,                 // null | ["path", ...]
      "changes_required_summary": null,       // free-text, 1-2 sentences
      "changelog_url": null,                  // optional
      "migration_guide_url": null,            // optional

      // Set by upgrade-one-package.sh / run-manual-upgrade.sh via
      // packages-set-status.sh.
      "implementation_status": null,          // null | "todo" | "inprogress" | "done" | "failed"
      "failure_reason": null,                 // free-text on failure
      "commit_sha": null,                     // short SHA on success
      "completed_at": null,                   // ISO-8601 on success/failure
      "demoted_from_auto": false,             // true if auto upgrade demoted to manual

      // Set by prebake-context.sh.
      "context_baked": null,                  // null | true | false | "partial"
      "context_missing": []                   // fields prebake couldn't resolve
    }
  ]
}
```

## Classification values

| Value | Meaning | How set |
|---|---|---|
| `null` | Pending — `PACKAGE_PLANNER` has not yet classified. | Default. |
| `"auto"` | No code changes required; safe to upgrade automatically. | `packages-set-classification.sh --classification auto`. |
| `"manual"` | Code changes required, or risk too high for automation. | `packages-set-classification.sh --classification manual`. Auto-set by upgrade-one-package when an auto upgrade demotes (also sets `demoted_from_auto: true`). |

## Implementation status values

| Value | Meaning | How set |
|---|---|---|
| `null` | No implementation attempt yet. | Default. |
| `"todo"` | Queued for the runner (`run-automated-upgrades.sh` or `run-manual-upgrade.sh`). | `packages-set-status.sh --status todo`. |
| `"inprogress"` | Runner has claimed it. | `packages-set-status.sh --status inprogress`. |
| `"done"` | Upgrade committed locally. `commit_sha` populated. | `packages-set-status.sh --status done --commit-sha SHA`. |
| `"failed"` | Upgrade attempted and failed; rolled back. `failure_reason` populated. | `packages-set-status.sh --status failed --failure-reason "..."`. |

## Helper scripts (all under `~/git/defra/trade-imports-workspace/tools/npm/`)

| Script | Purpose |
|---|---|
| `packages-init.sh` | Initial population from ncu output (called by `discover-upgrades.sh`) |
| `packages-set-classification.sh` | Set classification + risk + rationale (+ file list, change summary, urls) for one package |
| `packages-set-status.sh` | Set implementation_status + failure_reason / commit_sha / completed_at |
| `packages-list.sh` | Query packages with filters (`--classification`, `--status`, `--risk`, `--repo`, `--json`) |
| `packages-counts.sh` | Summary counts by classification + risk + status |

All mutations use `mktemp + mv` for atomicity. None of the helpers
take the markdown plan body as input — there is no markdown plan.

## Removed concepts (vs the previous filename-as-state model)

- `.auto.md` / `.manual.md` extensions — gone. Classification lives in
  the JSON `classification` field.
- `.todo` / `.inprogress` / `.done` / `.failed` marker files — gone.
  Implementation state lives in `implementation_status`.
- `cat >> *.inprogress` body annotations — gone. Failure reason +
  commit SHA live in dedicated JSON fields.
- `find ... | wc -l` status queries — replaced by
  `packages-counts.sh --json` / `packages-list.sh --json`.

## Audit and override state (phase 0, 2 and 4)

Written by the audit and override scripts, beside `packages.{repo}.json`
unless noted. All are runtime cache under `workareas/` (gitignored).

### `{run-id}/phase0.json` (one per run, not per repo)

Appended by `start-upgrade.sh --phase 0`. Phase 1 reads the last run;
phase 3 reports the first and last as `audit_before` / `audit_after`.

```jsonc
{
  "runs": [
    {
      "ran_at": "2026-10-05T12:00:00Z",
      "label": "phase0-20261005T120000Z",   // names each repo's audit snapshot
      "branch": "chore/EUDPA-668-npm-security-sweep",
      "green": true,
      "red": [],                             // repos that failed
      "repos": ["trade-imports-animals-admin"],
      "per_repo": [
        // audit-baseline.sh summary (below) + head + exit_code
        {"repo": "...", "green": true, "failing": [], "allowlisted": ["GHSA-…"],
         "stale": [], "fixable_allowlisted": [], "head": "<sha>", "exit_code": 0}
      ]
    }
  ]
}
```

### `audit.{repo}.{label}.json` and `audit.{repo}.{label}.summary.json`

The npm audit report (v2) as audit-ci returned it, and the
`audit-baseline.sh` summary of it: `green`, `failing`, `allowlisted`,
`stale`, `inactive_allowlist` (GHSA lists), `fixable_allowlisted`,
`blocked_allowlisted`, `failing_fixable` (`[{ghsa, package, fixes,
fixed_version}]`), `failing_no_fix` (`[{ghsa, package, title}]`),
`advisories` (`[{ghsa, package, severity, ranges, title}]` at the audit
threshold) and `snapshot` (the report's path). Labels:
`phase0-<timestamp>`, `before-<package>-<target>` and
`upgrade-<package>-<target>` (the per-upgrade gate), `refresh-lockfile`,
`override-trial-<n>`.

### `allowlist.{repo}.json`

Written by `audit-allowlist-add.sh`, one row per GHSA it wrote or
renewed in this run. The entry itself lives in the repo's
`audit-ci.jsonc`; this records why.

```jsonc
{
  "ticket": "EUDPA-668",
  "repo": "trade-imports-animals-frontend",
  "entries": [
    {
      "ghsa": "GHSA-c475-qrg2-pj4r",
      "package": "basic-ftp",
      "kind": "fix_blocked_upstream",        // no_fix | fix_blocked_upstream
      "blocked_by": "get-uri pins basic-ftp ^5", // null for no_fix
      "fixed_version": "6.2.1",              // null for no_fix
      "reason": "basic-ftp FTP command injection; dev only",
      "owner": "Sam Farrington",
      "notes": "<the notes written to audit-ci.jsonc>",
      "expiry": "2027-01-03",
      "added_at": "2026-10-05T12:00:00Z",    // kept on renewal
      "stage": 1,                            // --stage when first added, or null
      "renewed_at": null,                    // set on renewal
      "renewed_stage": null
    }
  ]
}
```

A rolled-back upgrade removes the rows it added.

### `overrides.{repo}.json`

Written by `reset-overrides.sh` (phase 4): one row per leaf override in
the repo's `package.json` at HEAD.

```jsonc
[
  {
    "path": "lighthouse/.",                  // readable form
    "key_path": ["lighthouse", "."],         // jq path into "overrides"
    "value": "13.4.1",
    "status": "kept",                        // pending | kept | removed | undecided (run stopped)
    "kept_for": "audit-path",                // audit-direct | audit-path | check
    "reason": "GHSA-jmr9-qjv8-65gv (extract-zip, high) fails the audit without it; this override pins lighthouse, which depends on it",
    "evidence": "<end of the failing trial's log>"
  }
]
```

Trial logs sit in `override-trial-logs/`; the throwaway worktree is
`override-trial/` (removed on success, kept when the run stops).
