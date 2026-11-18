# Consolidated npm-upgrade packages state — schema

The consolidated per-repo packages state is canonical JSON, mutated
only via helper scripts. There is **no rendered markdown plan file** —
if a human needs the plan for a single package, regenerate it on
demand from the JSON.

## Location

```
workareas/npm-upgrades/{run-id}/{repo}/packages.{repo}.json
```

One file per repo. Initial population: `tim npm discover`.
Subsequent mutations: walker, runners,
PACKAGE_PLANNER workers — all via the `tim npm packages` helpers.
Never hand-edit.

Sister files in the same directory:

- `.context/{normalized-pkg}/{changelog.md,migration.md,usages.txt,package-meta.json}`
  — per-package pre-baked context (best-effort), populated by
  `tim npm context prebake`.
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

      // Set by PACKAGE_PLANNER via `tim npm packages set-classification`.
      "classification": null,                 // null | "auto" | "manual"
      "risk": null,                           // null | "LOW" | "MEDIUM" | "HIGH"
      "safe_for_automation": null,            // null | true | false
      "rationale": null,                      // free-text, 1 sentence
      "files_affected": null,                 // null | ["path", ...]
      "changes_required_summary": null,       // free-text, 1-2 sentences
      "changelog_url": null,                  // optional
      "migration_guide_url": null,            // optional

      // Set by tim npm upgrade-one / tim npm run-manual via
      // `tim npm packages set-status`.
      "implementation_status": null,          // null | "todo" | "inprogress" | "done" | "failed"
      "failure_reason": null,                 // free-text on failure
      "commit_sha": null,                     // short SHA on success
      "completed_at": null,                   // ISO-8601 on success/failure
      "demoted_from_auto": false,             // true if auto upgrade demoted to manual

      // Set by tim npm context prebake.
      "context_baked": null,                  // null | true | false | "partial"
      "context_missing": [],                  // fields prebake couldn't resolve

      // Unattended runs, or tim npm discover --record-policy. Set by
      // tim npm packages set-policy.
      "policy": "changelog-driven",           // "ci-is-enough" | "changelog-driven"
      "set": "eslint",                        // the coupled set it belongs to, or null
      "set_scope": "repo",                    // "repo" | "cross-repo" | null
      "policy_reason": "..."                  // why that policy, in a sentence
    }
  ]
}
```

## Evidence (unattended mode)

`tim npm packages add-evidence` writes each package's rows to its own
file beside `packages.{repo}.json`, so planners can record at once. It
is never folded into the packages file.

```
workareas/npm-upgrades/{run-id}/{repo}/evidence/{normalized-pkg}.json
```

```jsonc
{
  "package": "eslint",
  "target": "10.0.0",                         // the target the rows were recorded for
  "checked_at": "2026-11-14T02:30:00Z",       // set by check-evidence; null until then
  "rows": [
    {
      "item": "Remove the no-old-rule rule",
      "pattern": "no-old-rule",               // fixed string, or null
      "outcome": "applied",                   // "applied" | "not-applicable" | "needs-a-person"
      "reason": "",                           // needed for not-applicable and needs-a-person
      "hitsBefore": 2,                        // counted by add-evidence; null with no pattern
      "hitsAfter": 0                          // counted by check-evidence; null until then
    }
  ]
}
```

`add-evidence` and `check-evidence` refuse rows recorded for another
target: delete the file and record them again. `check-evidence` exits 1
unless every row is clean.

| `outcome` | Clean when |
|---|---|
| `applied` | its pattern has 0 hits after the change |
| `not-applicable` | it has a reason, and its pattern, if any, still has 0 hits |
| `needs-a-person` | never |

`tim npm packages render-evidence` treats a package as clean when it is
classified, has a policy recorded and is upgraded, and every evidence
row is clean. A `changelog-driven` package also needs evidence.

## Classification values

| Value | Meaning | How set |
|---|---|---|
| `null` | Pending — `PACKAGE_PLANNER` has not yet classified. | Default. |
| `"auto"` | No code changes required; safe to upgrade automatically. | `tim npm packages set-classification --classification auto`. |
| `"manual"` | Code changes required, or risk too high for automation. | `tim npm packages set-classification --classification manual`. Auto-set by `tim npm upgrade-one` when an auto upgrade demotes (also sets `demoted_from_auto: true`). |

## Implementation status values

| Value | Meaning | How set |
|---|---|---|
| `null` | No implementation attempt yet. | Default. |
| `"todo"` | Queued for the runner (`tim npm run-auto` or `tim npm run-manual`). | `tim npm packages set-status --status todo`. |
| `"inprogress"` | Runner has claimed it. | `tim npm packages set-status --status inprogress`. |
| `"done"` | Upgrade committed locally. `commit_sha` populated. | `tim npm packages set-status --status done --commit-sha SHA`. |
| `"failed"` | Upgrade attempted and failed; rolled back. `failure_reason` populated. | `tim npm packages set-status --status failed --failure-reason "..."`. |

## Helpers (`tim npm discover` and `tim npm packages`)

| Command | Purpose |
|---|---|
| `tim npm discover` | Initial population from npm-check-updates; a re-run keeps each package's work |
| `tim npm packages set-classification` | Set classification + risk + rationale (+ file list, change summary, urls) for one package |
| `tim npm packages set-status` | Set implementation_status + failure_reason / commit_sha / completed_at |
| `tim npm packages list` | Query packages with filters (`--classification`, `--status`, `--risk`, `--repo`, `--json`) |
| `tim npm packages counts` | Summary counts by classification + risk + status |
| `tim npm packages aggregate` | Fold the per-package classification files into `packages.{repo}.json` |
| `tim npm packages verify` | Phase 1 gate: aggregate, then exit 1 while any package is not classified |
| `tim npm packages set-policy` | Set `policy`, `set`, `set_scope` and `policy_reason` on every row, from `config/dependency-sets.json` |
| `tim npm packages add-evidence` | Unattended: append one evidence row to the package's `evidence/` file |
| `tim npm packages check-evidence` | Unattended: count a package's evidence again and record `hitsAfter` |
| `tim npm packages render-evidence` | Unattended: read-only packages and evidence tables, or `--json` with the clean flags |

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
  `tim npm packages counts --json` / `tim npm packages list --json`,
  read from the envelope's `.result`.

## Audit and override state (phase 0, 2 and 4)

Written by the audit and override scripts, beside `packages.{repo}.json`
unless noted. All are runtime cache under `workareas/` (gitignored).

### `{run-id}/phase0.json` (one per run, not per repo)

Appended by `tim npm upgrade --phase 0`. Phase 1 reads the last run;
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
        // tim npm audit baseline summary (below) + head + exit_code
        {"repo": "...", "green": true, "failing": [], "allowlisted": ["GHSA-…"],
         "stale": [], "fixable_allowlisted": [], "head": "<sha>", "exit_code": 0}
      ]
    }
  ]
}
```

### `audit.{repo}.{label}.json` and `audit.{repo}.{label}.summary.json`

The npm audit report (v2) as audit-ci returned it, and the
`tim npm audit baseline` summary of it: `green`, `failing`, `allowlisted`,
`stale`, `inactive_allowlist` (GHSA lists), `fixable_allowlisted`,
`blocked_allowlisted`, `failing_fixable` (`[{ghsa, package, fixes,
fixed_version}]`), `failing_no_fix` (`[{ghsa, package, title}]`),
`advisories` (`[{ghsa, package, severity, ranges, title}]` at the audit
threshold) and `snapshot` (the report's path). Labels:
`phase0-<timestamp>`, `before-<package>-<target>` and
`upgrade-<package>-<target>` (the per-upgrade gate), `refresh-lockfile`,
`override-trial-<n>`.

### `allowlist.{repo}.json`

Written by `tim npm audit allow`, one row per GHSA it wrote or
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

Written by `tim npm reset-overrides` (phase 4): one row per leaf override in
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
