# Per-file review JSON schema

Canonical artifact written by the file-reviewer worker for each changed
file in a ticket review. Replaces the legacy `.review.md` template.

## Location

```
~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/file-reviews/{repo}/{encoded_path}.review.json
```

`{encoded_path}` is the file path with `/` replaced by `_`
(e.g. `src/server/router.js` → `src_server_router.js`).

## Shape

```jsonc
{
  "file": "src/path/to/file.ext",      // path within the repo
  "repo": "trade-imports-animals-backend",
  "commit": "sha",
  "pr": 35,
  "mode": "FRESH",                     // FRESH | REFRESH | MERGE_RESOLVED
  "reviewed_at": "2026-05-22T13:00:00Z",
  "verdict": "SAFE",                   // SAFE | NEEDS_ATTENTION | RISKY | null
  "verdict_reason": "one sentence",
  "todos": [
    {
      "id": 1,                         // sequential within this file
      "line": 42,
      "severity": "Critical",          // Critical | Major | Minor
      "category": "logging",           // one of the categories below
      "issue": "Logger emits err.message only, with no reference number",
      "fix": "Must: the failure log carries the error and the notification reference. One way: logger.error({ err, referenceNumber }, 'Failed to save notification')",
      "best_practice": "node/pino-logging.md"  // optional, relative path
    }
  ]
}
```

Severity counts derive from `todos` — not stored.

`fix` holds a required **Must** (what must become true) and an
optional **One way** (a suggestion). See `items-table.md` → "The fix
field".

## Category values

`category` is one word from a fixed list, and its kind sets how triage
treats the finding. The build loop's verifier uses the same list, and
`tools/review/finding-categories.sh` holds it: `file-review-add-item.sh`
and `review-add-item.sh` refuse any other word.

| Kind | Category | Use for |
|---|---|---|
| Functional | `correctness` | Behaviour, a broken acceptance criterion, a performance or scope defect, a broken contract between repos, a behaviour-spec scenario that misstates the AC, an absorbed behaviour change, a missing bundle entry |
| Functional | `security` | A security defect |
| Functional | `error-handling` | How an error is caught, surfaced or recovered from |
| Functional | `coverage-gap` | A behaviour no test proves, or a coverage link that does not witness its scenario |
| Code quality | `naming` | A name that does not predict what the code returns and changes; a metaphor; a positional boolean; one concept with several names |
| Code quality | `comments` | A comment or doc comment that is stale, describes other code or decodes a name; a doc, recipe or JSDoc the change makes untrue |
| Code quality | `structure` | Formatting, idiom, convention, the wrong layer, a second mechanism beside an existing one |
| Code quality | `duplication` | One rule, format or guard written in two places; test set-up copied between tests |
| Code quality | `logging` | An outcome-changing branch with no log, a log without the ids support searches by, a lost cause, a body at INFO |
| Code quality | `test-readability` | A test title that claims more than its assertions prove; a test that cannot fail |
| Code quality | `history` | A ticket key, backlog or ruling id, release name, or before-and-after narration in code |
| Design | `design` | Copy, layout or a component the design source sets that a guide such as the GDS style guide disagrees with. Never fixed in code: it goes to the designer |

A functional finding is kept only with evidence: a failure scenario, a
broken acceptance criterion, or a quoted line. A code-quality finding
is fixed unless the code shows it is factually wrong. A design finding
is marked Discuss, for the designer.

## Lifecycle

1. **Init** — `prepare-review.sh` (Fresh) or the refresh tooling
   (List D coverage gap) seeds an empty placeholder via
   `file-review-init.sh`. `verdict: null`, `todos: []`,
   `reviewed_at: null`.
2. **Reviewer adds todos** — each finding goes in via
   `file-review-add-item.sh` (auto-assigns next `id`, handles
   escaping).
3. **Reviewer sets verdict** — final call via
   `file-review-set-verdict.sh` (stamps `reviewed_at`).
4. **Coverage gate** — `verify-coverage.sh` looks for
   `.verdict != null` per file.
5. **Aggregation** — `aggregate-file-reviews.sh` reads all JSONs
   for a repo and emits the markdown table rows used in
   `review.{repo}.md` (File Analysis Summary + consolidated `## Items`).
6. **Refresh** — overwrites the JSON in place with the latest mode's
   findings. The orchestrator compares prior + current JSONs to mark
   items resolved/regressed in the consolidated items table.

## Verdict values

| Value | Meaning |
|---|---|
| `null` | Not yet reviewed (placeholder state) |
| `SAFE` | No Critical or Major findings |
| `NEEDS_ATTENTION` | Major findings, no Criticals |
| `RISKY` | At least one Critical finding |

Rendered to markdown as `NEEDS ATTENTION` (space, not underscore) by
the aggregator.

## Severity values

`Critical` (bug, security, broken AC) > `Major` (quality, missing
test for new behaviour, and every `naming`, `structure`,
`duplication`, `logging` and `test-readability` finding) > `Minor` (a best-practice breach with no effect on
how a reader understands the code).

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
- Empty `todos` + `verdict: SAFE` is the "no findings" terminal state.
- All string fields are valid JSON strings — escaping (including
  literal `|`) is the writer scripts' problem, not the reviewer's.

## Citation convention

`best_practice` is the relative path under
`~/git/defra/trade-imports-workspace/docs/best-practices/` of the rule that was
violated (e.g. `node/pino-logging.md`, `java/spring-boot.md`). Only
set when the finding maps to a best-practices file the reviewer
actually loaded.
