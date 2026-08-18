# Per-repo govuk-upgrade version state — schema

The canonical state for a govuk-frontend upgrade run is one JSON file
per in-scope repo. Progress is read out via `upgrade-status.sh` /
`list-plans.sh`, both of which query this JSON.

## Location

```
~/git/defra/trade-imports-workspace/workareas/govuk-upgrades/{run-id}/{repo-name}/versions.{repo-name}.json
```

One file per repo. Initial population: `discover-versions.sh`. All
subsequent mutations go through the helper trio in
`~/git/defra/trade-imports-workspace/tools/govuk/`. Never hand-edit.

Per-version pre-baked CHANGELOG sections sit alongside as
`version__{v}.changelog.md`. The per-repo best-practices bundle is
`best-practices.md` in the same directory.

## Shape

```jsonc
{
  "ticket": "EUDPA-XXXXX",
  "repo": "trade-imports-animals-frontend",
  "package": "govuk-frontend",
  "current_version": "5.4.0",
  "target_version": "6.1.0",
  "original_constraint_prefix": "^",     // "" / "^" / "~" / ">=" / "=" (literal prefix from package.json)
  "created_at": "2026-05-26T10:00:00Z",
  "last_discovered_at": "2026-05-26T10:00:00Z",
  "versions": [
    {
      "version": "5.5.0",
      "classification": null,            // null | "todo" | "noop"
      "classified_at": null,
      "implementation_status": null,     // null | "done" | "failed"
      "implemented_at": null,
      "commit_sha": null,
      "failure_reason": null,
      "changelog_path": "version__5.5.0.changelog.md",
      "summary": null,                   // one-line VERSION_PLANNER summary
      "changes": [
        {
          "file": "src/views/header.njk",
          "why": "Breaking change: serviceName param renamed",
          "change": "Rename `serviceName` to `service.name`"
        }
      ]
    }
  ]
}
```

## Classification values

| Value | Meaning | How set |
|---|---|---|
| `null` | Pending — VERSION_PLANNER has not yet seen this version. | Default at `discover-versions.sh` seed. |
| `todo` | Code changes required. `changes[]` populated. | `version-classify.sh --classification todo`. |
| `noop` | No changes needed for the repo. `changes[]` empty. | `version-classify.sh --classification noop`. |

## Implementation status values

| Value | Meaning | How set |
|---|---|---|
| `null` | Not yet applied. | Default. |
| `done` | Version committed; tests green. | `version-mark-implemented.sh` (helper's last action). |
| `failed` | Apply or test step failed. | `version-mark-failed.sh`. |

A version with `classification == "noop"` is short-circuited by
`apply-version.sh` — `version-mark-implemented.sh` is still called
with no commit SHA so the version disappears from the pending list.

## Helper scripts (under `~/git/defra/trade-imports-workspace/tools/govuk/`)

| Script | Purpose |
|---|---|
| `discover-versions.sh` | Seed `versions.{repo}.json` from npm registry + `package.json`. Records `original_constraint_prefix`. |
| `version-classify.sh` | Set `classification` to `todo` or `noop` and stamp `classified_at`. |
| `version-add-change.sh` | Append a `{file, why, change}` entry to `changes[]` for a `todo`-classified version. |
| `version-mark-implemented.sh` | Set `implementation_status = "done"`, stamp `implemented_at`, record `commit_sha`. |
| `version-mark-failed.sh` | Set `implementation_status = "failed"`, stamp `implemented_at`, record `failure_reason`. |
| `render-version-plan.sh` | Render one version's plan as markdown from the JSON (read-only view). |
| `list-plans.sh` | Filterable status view of `versions[]` (Phase 1/2 lens). |
| `upgrade-status.sh` | Combined Phase 1/2/3 status view of `versions[]`. |

All mutating helpers use `> tmp && mv` for atomicity. Single
mutation surface — never `jq -i` or hand-edit the JSON.

## Filtering vocabulary

`list-plans.sh` and `upgrade-status.sh` accept `--filter` with the
following values, derived from the two columns:

| `--filter` | Predicate over a `versions[]` entry |
|---|---|
| `unplanned` | `classification == null` |
| `todo` | `classification == "todo" && implementation_status == null` |
| `noop` | `classification == "noop"` |
| `done` | `implementation_status == "done"` |
| `failed` | `implementation_status == "failed"` |
| `pending` | `implementation_status == null` (i.e. still to apply) |

`--sort-semver` orders by `version` ascending.

## Run-level metadata

`discover-versions.sh` also writes a small per-run metadata file:

```
~/git/defra/trade-imports-workspace/workareas/govuk-upgrades/{run-id}/.run-meta.json
```

Shape:

```jsonc
{
  "ticket": "EUDPA-XXXXX",
  "branch": "chore/EUDPA-XXXXX",
  "repos": [
    "trade-imports-animals-frontend",
    "trade-imports-animals-admin"
  ],
  "target_version": "6.1.0",
  "discovered_at": "2026-05-26T10:00:00Z"
}
```

`repos[]` is auto-detected by globbing `repos/*/package.json` for a
`govuk-frontend` dependency — Phase 2 and Phase 3 iterate from this
list rather than from a hard-coded SKILL.md table.

## Invariants

- `version` values are unique within `versions[]` and stable across
  re-runs of `discover-versions.sh`.
- `implementation_status` may only be `"done"` or `"failed"` when
  `classification != null` (you must classify before applying).
- `original_constraint_prefix` is captured exactly once, at
  discovery time — never mutated by later helpers.
- `changes[]` is empty iff `classification == "noop"`.