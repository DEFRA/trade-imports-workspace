# Per-file style review JSON schema

Canonical artifact written by the file-reviewer worker for each `.js`
file in a style review. Replaces the legacy hand-written `.style.md`
paper trail.

## Location

```
~/git/defra/trade-imports-workspace/workareas/code-style-reviews/EUDPA-XXXXX/file-reviews/{repo}/{encoded_path}.style.json
```

`{encoded_path}` is the file path with `/` replaced by `_`
(e.g. `src/server/router.js` → `src_server_router.js`).

## Shape

```jsonc
{
  "file": "src/path/to/file.js",      // path within the repo
  "repo": "trade-imports-animals-frontend",
  "commit": "sha",
  "pr": 35,
  "mode": "FRESH",                    // FRESH | REFRESH | MERGE_RESOLVED
  "reviewed_at": "2026-05-22T13:00:00Z",
  "verdict": "COMPLIANT",             // COMPLIANT | MINOR_ISSUES | NEEDS_WORK | null
  "verdict_reason": "one sentence",
  "todos": [
    {
      "id": 1,                        // sequential within this file
      "line": "42",                   // string — allows "12-15" ranges or ""
      "rule": "2",                    // 16-rule style guide number, another bundle's rule id, or "code-quality" (string)
      "category": "structure",        // one of the code-quality categories below
      "severity": "FAIL",             // FAIL | WARN
      "issue": "function declaration where fat-arrow is appropriate",
      "fix": "rewrite as const getRows = () => ...",
      "best_practice": "node/code-style.md"  // optional, relative path
    }
  ]
}
```

FAIL / WARN counts derive from `todos` — not stored.

## Category values

Every style finding is a code-quality finding, so `category` is one of
the code-quality categories the review skill and the build loop's
verifier use (`tools/review/finding-categories.sh`).
`file-style-add-item.sh` refuses any other word, including the
functional ones.

| Category | Use for |
|---|---|
| `naming` | A name that does not predict what the code returns and changes; a generic name, a metaphor, a positional boolean |
| `comments` | A comment or doc comment that is stale, describes other code, decodes a name, or a JSDoc or Javadoc that is wrong |
| `structure` | Formatting, idiom and convention: fat arrows, early returns, `const`, `async`/`await`, magic values, exports, nesting |
| `duplication` | One rule or format written in two places; test set-up copied between tests |
| `logging` | A log line without its ids, a lost cause, a body at INFO, `console.log` |
| `test-readability` | A test title that claims more than its assertions prove |
| `history` | A ticket key, backlog or ruling id, release name, or before-and-after narration in code |

A code-quality finding is fixed unless the code shows it is factually
wrong.

## Lifecycle

1. **Init** — `prepare-style.sh` (Fresh) or the refresh tooling
   (List D coverage gap) seeds an empty placeholder via
   `file-style-init.sh`. `verdict: null`, `todos: []`,
   `reviewed_at: null`.
2. **Reviewer adds todos** — each finding goes in via
   `file-style-add-item.sh` (auto-assigns next `id`, handles
   escaping).
3. **Reviewer sets verdict** — final call via
   `file-style-set-verdict.sh` (stamps `reviewed_at`).
4. **Coverage gate** — `verify-style-coverage.sh` looks for
   `.verdict != null` per file.
5. **Aggregation** — `aggregate-file-reviews.sh` reads all JSONs
   for a repo and writes `items.{repo}.json` (canonical consolidated
   store) plus emits the markdown table view via `render-items.sh`.
6. **Refresh** — overwrites the JSON in place with the latest mode's
   findings. The reconciler folds new findings into the consolidated
   items file and uses `reconciled_at` as an idempotency marker.

## Verdict values

| Value | Meaning |
|---|---|
| `null` | Not yet reviewed (placeholder state) |
| `COMPLIANT` | No FAIL or WARN findings |
| `MINOR_ISSUES` | 1-3 WARN-only findings |
| `NEEDS_WORK` | Any FAIL, or ≥4 WARN |

Rendered to markdown as `MINOR ISSUES` / `NEEDS WORK` (space, not
underscore) by the aggregator.

## Severity values

`FAIL` — clear violation of a stated rule (e.g. `var` declarations,
`.then()` chains where async/await is the rule).

`WARN` — borderline case or guideline-level violation.

## Mode values

| Value | When |
|---|---|
| `FRESH` | First-pass review of this file |
| `REFRESH` | Re-check after further commits |
| `MERGE_RESOLVED` | File came out of a hand-resolved merge |

## Schema invariants

- `id`s are unique within the file and stable across writes (the
  add-item script always assigns `max(id) + 1`).
- `verdict` is non-null iff the file has been reviewed.
- Empty `todos` + `verdict: COMPLIANT` is the "no findings" terminal
  state.
- All string fields are valid JSON strings — escaping (including
  literal `|`) is the writer scripts' problem, not the reviewer's.

## Citation convention

`best_practice` is the relative path under
`~/git/defra/trade-imports-workspace/docs/best-practices/` of the rule
that was violated (e.g. `node/code-style.md`,
`doc-comments/jsdoc.md`). Only set when the finding maps to a
best-practices file the reviewer actually loaded.
