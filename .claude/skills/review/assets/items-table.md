# Consolidated review items — schema

The consolidated per-repo items table is canonical JSON, mutated only
via helper scripts. The markdown form embedded in `review.{repo}.md`
is a *rendered view* — never the source of truth.

## Location

```
~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/items.{repo}.json
```

One file per repo. Initial population: `aggregate-file-reviews.sh`
(from per-file `.review.json` files). Subsequent mutations: walker,
batch implementor, refresh reconciler — all via the `review-*.sh`
helpers under `tools/review/`. Never hand-edit.

## Shape

```jsonc
{
  "ticket": "EUDPA-XXXXX",
  "repo": "trade-imports-animals-backend",
  "items": [
    {
      "id": 1,
      "file": "src/path/to/file.ext",
      "line": "42",                    // string — allows "12-15" ranges or "—"
      "severity": "Critical",          // Critical | Major | Minor
      "category": "security",          // see file-review-schema.md → "Category values"
      "issue": "...",
      "fix": "Must: ... One way: ...", // see "The fix field" below
      "best_practice": "node/pino-logging.md",  // optional citation
      "disposition": null,             // see below
      "status": null,                  // see below
      "notes": null                    // free-text note
    }
  ]
}
```

## The fix field

`fix` holds two labelled parts:

- **Must:** what must be true when the item is done. Required. It is
  the end state the fixer has to reach and the walker agrees to.
- **One way:** a change that would get there. A suggestion only. The
  fixer may choose a better route that meets the Must.

Example: `Must: one function owns the port label format and every page
calls it. One way: keep formatPortLabel in services/ports/index.js and
delete the two inline copies.`

A `fix` with no labels, from an older review, is read as the Must.

An owner item, whose issue starts `One rule,`, merges findings that
share one root (review `SKILL.md` Step 5a). Its members are `Merged` with the note
`merged into #N`, naming the owner item. `review-mark.sh` refuses
`Merged` without that note.

## Disposition values

| Value | Meaning | How set |
|---|---|---|
| `null` | Pending — walker has not yet seen, user has not hand-marked. | Default for new rows. |
| `Fix` | Apply the fix. | Walker on `F`; user hand-mark via `review-mark.sh`. |
| `Won't Fix` | Decided not to fix. A functional item with no evidence (note `no evidence`), or a code-quality item whose note quotes the code, with its file:line, that shows the finding is factually wrong. | Walker (`references/WALKER.md` → "Defaults by kind"); user hand-mark; fixer's `WON'T FIX` outcome. |
| `Discuss` | Defer to a wider conversation. | Walker on `D`. |
| `Auto-Resolved` | Violation no longer present. | Walker auto-check; refresh reconciler; fixer's `SKIPPED` outcome. |
| `Merged` | Folded into an `owner` item; the owner's fix covers it. Notes hold `merged into #N`. | `review-mark.sh --disposition Merged --note "merged into #N"` (`SKILL.md` Step 5a). |

## Status values

| Value | Meaning | How set |
|---|---|---|
| `null` | No fix attempt yet. | Default before walker / hand-marking. |
| `Not Done` | Queued for the implementor. | `review-mark.sh --disposition Fix` auto-sets this. |
| `Done` | Fix landed (short SHA in `notes`). | `review-set-status.sh --status Done`. |
| `Failed` | Implementor tried and failed. | `review-set-status.sh --status Failed`. |
| `—` | Status doesn't apply (Won't Fix / Auto-Resolved / Merged). | Auto-set by `review-mark.sh` for non-Fix dispositions. |

## Helper scripts (all under `~/git/defra/trade-imports-workspace/tools/review/`)

| Script | Purpose |
|---|---|
| `aggregate-file-reviews.sh` | Initial population — write `items.{repo}.json` from per-file `.review.json` files |
| `review-items.sh` | Query items (filter by disposition / status; TSV or `--json` output) |
| `review-add-item.sh` | Append a new item; auto-assigns `id`; returns the new ID |
| `review-mark.sh` | Set `disposition` (auto-sets `status` per the table above) |
| `review-set-status.sh` | Set `status` only |
| `review-counts.sh` | Breakdown by disposition + status |
| `render-items.sh` | Emit the markdown `## Items` table view of `items.{repo}.json` |

## Refresh interaction

`items.{repo}.json` is the source of truth for "what we already decided":

- `Won't Fix` / `Auto-Resolved` / `Merged` rows are carried forward and
  MUST NOT be re-reported as new findings.
- `Fix + Done` rows are spot-checked — if the pattern is back, log as a
  regression (do not change disposition; let the user re-walk).
- `Fix + Not Done` and `Discuss` rows stay open.
- Pending (`disposition == null`) rows are queued — walker picks them up.

Deleted files: their items are marked `Auto-Resolved` by the refresh
reconciler.

## Markdown view

The `## Items` section in `review.{repo}.md` is rendered from this JSON
by `render-items.sh`, through `tools/review/items-table.jq`. Re-render
whenever items change. Column order:

```
| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
```

The renderer splits `fix` at its labels: the text after `Must:` goes in
Must, the text after `One way:` in One way. A `fix` with no labels goes
in Must and leaves One way empty. It escapes literal `|` as `\|` and
turns newlines into spaces, so JSON cell contents stay clean.
