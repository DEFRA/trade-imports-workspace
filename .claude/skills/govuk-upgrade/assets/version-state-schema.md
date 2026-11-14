# Per-repo govuk-upgrade version state — schema

The canonical state for a govuk-frontend upgrade run is one JSON file
per in-scope repo. Progress is read out via `tim govuk plans`, which
queries this JSON.

## Location

```
~/git/defra/trade-imports-workspace/workareas/govuk-upgrades/{run-id}/{repo-name}/versions.{repo-name}.json
```

One file per repo. Initial population: `tim govuk start`. All
subsequent mutations go through the `tim govuk` write commands below.
Never hand-edit.

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
| `null` | Pending — VERSION_PLANNER has not yet seen this version. | Default at the `tim govuk start` seed. |
| `todo` | Code changes required. `changes[]` populated. | `tim govuk classify --classification todo`. |
| `noop` | No changes needed for the repo. `changes[]` empty. | `tim govuk classify --classification noop`. |

## Implementation status values

| Value | Meaning | How set |
|---|---|---|
| `null` | Not yet applied. | Default. |
| `done` | Version committed; tests green. | `tim govuk mark-done` (the last action of `tim govuk apply`). |
| `failed` | Apply or test step failed. | `tim govuk mark-failed`. |

An intermediate version with `classification == "noop"` is
short-circuited by `tim govuk apply`: it is still marked done, with no
commit SHA, so the version disappears from the pending list. The target
version is applied and committed even when it is a noop, so the upgrade
lands in `package.json`.

## tim govuk commands

The seed is in tim:

| Command | Purpose |
|---|---|
| `tim govuk start` | Seed `versions.{repo}.json` from the npm registry + `package.json`. Records `original_constraint_prefix`. A re-run keeps each version's state unless `--force`. |

The read-only views are in tim:

| Command | Purpose |
|---|---|
| `tim govuk render-plan` | Render one version's plan as markdown from the JSON. |
| `tim govuk plans` | Filterable status view of `versions[]`: classification and implementation. |
| `tim govuk summaries` | One row per version still to apply that is not a noop (the walker's work list). |

The writes are in tim too:

| Command | Purpose |
|---|---|
| `tim govuk classify` | Set `classification` to `todo` or `noop` and stamp `classified_at`. |
| `tim govuk add-change` | Append a `{file, why, change}` entry to `changes[]` for a `todo`-classified version. |
| `tim govuk mark-done` | Set `implementation_status = "done"`, stamp `implemented_at`, record `commit_sha`. |
| `tim govuk mark-failed` | Set `implementation_status = "failed"`, stamp `implemented_at`, record `failure_reason`. |
| `tim govuk apply` | Apply one version to a repo: package.json, `npm install`, `npm test`, commit, then mark it done (or failed). |

Every write goes through a temporary file and a rename, so a
half-written file is never left behind. Single mutation surface —
never `jq -i` or hand-edit the JSON. Two writes to one repo's file at
the same moment can still lose one of them.

## Filtering vocabulary

`tim govuk plans` accepts `--filter` with the
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

`tim govuk start` also writes a small per-run metadata file:

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
  re-runs of `tim govuk start`.
- `implementation_status` may only be `"done"` or `"failed"` when
  `classification != null` (you must classify before applying).
- `original_constraint_prefix` is captured exactly once, at
  discovery time — never mutated by later helpers.
- `changes[]` is empty iff `classification == "noop"`.