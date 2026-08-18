# Consolidated style items — schema

The consolidated per-repo style-items table is canonical JSON, mutated
only via helper scripts. The markdown form embedded in
`style-review.{repo}.md` is a *rendered view* — never the source of
truth.

## Location

```
~/git/defra/trade-imports-workspace/workareas/code-style-reviews/EUDPA-XXXXX/items.{repo}.json
```

One file per repo. Initial population: `aggregate-file-reviews.sh`
(from per-file `.style.json` files). Subsequent mutations: walker,
batch implementor, refresh reconciler — all via the `style-*.sh`
helpers under `tools/style/`. Never hand-edit.

## Shape

```jsonc
{
  "ticket": "EUDPA-XXXXX",
  "repo": "trade-imports-animals-frontend",
  "items": [
    {
      "id": 1,
      "file": "src/path/to/file.js",
      "line": "42",                    // string — allows "12-15" ranges or ""
      "rule": "2",                     // 17-rule style guide number (string)
      "severity": "FAIL",              // FAIL | WARN
      "issue": "...",
      "fix": "...",
      "best_practice": "node/code-style.md",  // optional citation
      "disposition": null,             // see below
      "status": null,                  // see below
      "notes": null                    // free-text note
    }
  ]
}
```

## Severity values (style-specific)

Style uses **FAIL** and **WARN** — deliberately different from the
review skill's Critical/Major/Minor. Walker badges and counts use the
style vocabulary.

| Value | Meaning |
|---|---|
| `FAIL` | A rule the 17-rule guide marks as a hard violation. |
| `WARN` | A guideline / softer convention; reviewer surface for triage. |

## Disposition values

| Value | Meaning | How set |
|---|---|---|
| `null` | Pending — walker has not yet seen, user has not hand-marked. | Default for new rows. |
| `Fix` | Apply the fix. | Walker on `F`; user hand-mark via `style-mark.sh`. |
| `Won't Fix` | Decided not to fix. | Walker on `W`; user hand-mark. |
| `Discuss` | Defer to a wider conversation. | Walker on `D`. |
| `Auto-Resolved` | Violation no longer present. | Walker auto-check; refresh reconciler; implementor `SKIPPED` outcome. |

## Status values

| Value | Meaning | How set |
|---|---|---|
| `null` | No fix attempt yet. | Default before walker / hand-marking. |
| `Not Done` | Queued for the implementor. | `style-mark.sh --disposition Fix` auto-sets this. |
| `Done` | Fix landed (short SHA in `notes`). | `style-set-status.sh --status Done`. |
| `Failed` | Implementor tried and failed. | `style-set-status.sh --status Failed`. |
| `—` | Status doesn't apply (Won't Fix / Auto-Resolved). | Auto-set by `style-mark.sh` for non-Fix dispositions. |

## Helper scripts (all under `~/git/defra/trade-imports-workspace/tools/style/`)

| Script | Purpose |
|---|---|
| `aggregate-file-reviews.sh` | Initial population — write `items.{repo}.json` from per-file `.style.json` files |
| `style-items.sh` | Query items (filter by disposition / status; TSV or `--json` output) |
| `style-add-item.sh` | Append a new item; auto-assigns `id`; returns the new ID |
| `style-mark.sh` | Set `disposition` (auto-sets `status` per the table above) |
| `style-set-status.sh` | Set `status` only |
| `style-counts.sh` | Breakdown by disposition + status |
| `render-items.sh` | Emit the markdown `## Items` table view of `items.{repo}.json` |

## Refresh interaction

`items.{repo}.json` is the source of truth for "what we already decided":

- `Won't Fix` / `Auto-Resolved` rows are carried forward and MUST NOT be
  re-reported as new findings.
- `Fix + Done` rows are spot-checked — if the pattern is back, log as a
  regression (do not change disposition; let the user re-walk).
- `Fix + Not Done` and `Discuss` rows stay open.
- Pending (`disposition == null`) rows are queued — walker picks them up.

Deleted files: their items are marked `Auto-Resolved` by the refresh
reconciler.

## Markdown view

The `## Items` section in `style-review.{repo}.md` is rendered from
this JSON by `render-items.sh`. Re-render whenever items change.
Column order in the rendered table:

```
| # | File | Line | Rule | Severity | Issue | Fix | Disposition | Status | Notes |
```

The renderer applies the markdown table escapes (literal `|` → `\|`) —
JSON cell contents stay clean.