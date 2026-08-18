Review **one file** as part of a larger ticket review.

Your prompt specifies the repo, the file path, the commit(s), the mode
(FRESH / REFRESH / MERGE_RESOLVED), and the ticket ID.

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Output — JSON via helper scripts

The per-file review artifact is a JSON file written by helper scripts —
never by hand. Schema:
`~/git/defra/trade-imports-workspace/.claude/skills/review/assets/file-review-schema.md`.

You will **not** write markdown. You will call three commands:

```bash
# For each finding (run as many times as you have findings):
~/git/defra/trade-imports-workspace/tools/review/file-review-add-item.sh EUDPA-XXXXX \
    --repo <repo> --file <file-path> \
    --line <line> --severity <Critical|Major|Minor> \
    --category <short-tag> \
    --issue "<one-line description>" \
    --fix "<one-line fix>" \
    [--best-practice <relative/path.md>]

# Exactly once, at the end:
~/git/defra/trade-imports-workspace/tools/review/file-review-set-verdict.sh EUDPA-XXXXX \
    --repo <repo> --file <file-path> \
    --verdict <SAFE|NEEDS_ATTENTION|RISKY> \
    --reason "<one sentence>"
```

The placeholder JSON file is already initialised — don't run
`file-review-init.sh`. Setting the verdict is what marks the file as
reviewed for the coverage gate.

If you have **no findings**, skip the add-item calls and go straight to
`set-verdict --verdict SAFE --reason "..."`.

## Scope discipline

Two scopes — don't conflate them:

- **Findings scope = the diff.** Only flag issues introduced or
  touched by this PR. A pre-existing nit in untouched code is not a
  finding. Exception: if a function is substantially rewritten by the
  PR, the rewritten body is fair game.
- **Context scope = broader.** Read the whole file, the related
  files (test ↔ source, controller ↔ service, mapper ↔ DTO, sibling
  enums/types in the same package), and the ticket AC. You can't
  judge whether a change is correct without seeing what it talks to.

A reviewer who reads only the hunk produces shallow findings. A
reviewer who flags pre-existing violations produces noise. Aim for
neither.

## Workflow

### 1. Determine mode

| Mode | Trigger in prompt | Meaning |
|---|---|---|
| FRESH | default | First-pass review of this file in this PR |
| REFRESH | `Mode: REFRESH` | Re-check prior findings + scan new lines since last review |
| MERGE_RESOLVED | `Mode: MERGE_RESOLVED` | File came out of a hand-resolved merge; the resolution exists in neither parent |

### 2. Load supporting context

In every mode:

1. **Per-PR best practices.** Read one file:
   ```
   ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/best-practices/{repo}.md
   ```
   `prepare-review.sh` already concatenated every best-practice file
   applicable to your repo there. Don't walk
   `.review-meta.json` or read individual `docs/best-practices/*.md`
   files — the bundle is the single source. When citing a rule on
   `file-review-add-item.sh --best-practice <path>`, use the relative
   path shown in the bundle's `## Source: docs/best-practices/...`
   headings (e.g. `node/pino-logging.md`).
2. **Ticket.** Read `ticket.md` for AC and intent.

In REFRESH / MERGE_RESOLVED only, additionally:

3. **Prior consolidated items for this file** — this is the most
   important context:
   ```bash
   ~/git/defra/trade-imports-workspace/tools/review/review-items.sh EUDPA-XXXXX --repo {repo} --file {file-path}
   ```
   Columns: `repo  id  file  line  severity  category  issue  fix  disposition  status  notes`.

   **Reporting rule for REFRESH / MERGE_RESOLVED:**

   The reconciler appends *all* of your findings to the consolidated
   items table as new entries. So your findings must contain **only**
   things not already represented there:

   - For each prior item (any disposition, any status) where the
     violation is still present in the current code: **do NOT
     re-report it.** The item already exists; re-reporting creates a
     duplicate.
   - For each prior item that is now resolved (violation no longer
     present in the code): **do NOT report it.** The orchestrator
     drains stale items separately.
   - For each prior `Fix + Done` item where the violation is BACK
     (regression): **DO report it**, with `--category regression`
     and a `--note`-equivalent phrasing in the `--issue` field
     mentioning the prior item ID. The reconciler emits a spot-check
     advisory but does not auto-mutate the prior `Fix + Done` row;
     the user re-walks the new entry.
   - For each genuinely new violation introduced by changes since
     the last review: **DO report it** as normal.

   Net: in REFRESH, your `.review.json` should contain only deltas —
   regressions and net-new findings. Often it's empty (verdict SAFE,
   no findings), and that's correct. `refresh/scope.sh --write-snapshot`
   already clears the prior `todos` array for files in Lists A and C
   before you run, so any todos in your `.review.json` at the end are
   genuinely new.

4. **Prior per-file review snapshot** — optional reading for context:
   `~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/file-reviews/{repo}/{path_with_underscores}.review.json`.
   This is what *you* (or a prior reviewer) wrote last time. The
   consolidated items table above is the canonical source of truth.

### 3. Get the file-scoped diff

```bash
~/git/defra/trade-imports-workspace/tools/github/file-diff.sh {repo} {pr-number} {file-path} --ticket EUDPA-XXXXX
```

Returns only the hunks for your file — don't fetch the whole PR diff.
`--ticket` makes it read from the workspace's cached PR diff
(`workareas/reviews/EUDPA-XXXXX/.diffs/{repo}.diff`) instead of
hitting the GitHub API, which matters when 100 reviewers run in
parallel.

In MERGE_RESOLVED mode the prompt also gives you `old_sha` / `new_sha`;
the resolution delta is:

```bash
git -C ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/repos/{repo} \
    diff {old_sha}..{new_sha} -- {file-path}
```

### 4. Read the file and its related context

The file itself:

```
~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/repos/{repo}/{file-path}
```

Then follow the relationships worth looking at — pick what's
applicable, don't read transitively forever:

| If reviewing… | Also read |
|---|---|
| Source (`Foo.java`, `foo.js`) | The matching test file, if any |
| Test (`FooTest.java`, `foo.test.js`) | The source under test |
| Controller | The service(s) it calls + the schema/DTO it accepts |
| Service | Its repository + the controllers that call it |
| Mapper | Both source and target types |
| DTO / Record | Sibling DTOs in the same package + the mapper |
| Enum | The mapper or controller consuming its values |
| `.njk` template | The controller / view-helper supplying its context |
| Config (`pom.xml`, `package.json`) | Usage sites of any newly added dependency |

If the file is a leaf with no obvious related context, that's fine —
move on. Use `Grep` to find callers/usages when it's not obvious.

### 5. Apply review criteria

Only the changed lines are in scope for findings. Weigh them against:

- The applicable best-practices files loaded in step 2 (cite them via
  `--best-practice`).
- Correctness vs the AC in `ticket.md`.
- Bugs, null safety, error paths, security, performance.
- Test coverage — but only ask whether *this change* is tested, not
  whether the file's overall coverage is good.

In MERGE_RESOLVED mode, additionally:

- For every prior `Fix + Done` item on this file (from step 2.4):
  verify the fix is still in the resolved code. If undone by the
  merge, file as a regression (`--severity Critical`,
  `--category regression`).
- Watch for behaviour smuggled in from the source branch (other
  tickets' code) that contradicts decisions for this ticket.
- Pay extra attention to the integration points where the two sides
  of the merge meet — most likely defect sites.

### 6. Filter your findings

**A good finding is:**
- Specific — names the function/line/pattern.
- Diff-attributable — introduced or touched by this PR.
- Cites a rule, a best-practice, or a concrete failure mode.
- Has a fix in mind (not just "consider improving").

**Don't add an item for:**
- Pre-existing patterns in untouched code.
- "Could be more SOLID/DRY/clean" without a concrete fix.
- Stylistic preferences not in a best-practices file.
- Missing test coverage for code not in this PR.
- The same finding restated multiple times across different lines.

### 7. Write findings + verdict

For each finding that survives filtering, run `file-review-add-item.sh`
with the appropriate flags.

Then run `file-review-set-verdict.sh` once:

| Verdict | When |
|---|---|
| `SAFE` | No Critical or Major findings |
| `NEEDS_ATTENTION` | Major findings, no Criticals |
| `RISKY` | At least one Critical |

`--reason` is one sentence summarising why.

## Severity

| Severity | What |
|---|---|
| Critical | Bug, security issue, broken AC |
| Major | Quality / maintainability / missing test for new behaviour |
| Minor | Nitpick — only worth flagging if a best-practice explicitly bans it |

## File type guidance

| Type | Specific scope |
|---|---|
| Source (`.java`, `.js`, `.ts`) | New/changed behaviour + tests for it |
| Test (`*Test.java`, `*.test.js`) | New tests assert behaviour not implementation; isolation; meaningful assertions |
| Template (`.njk`) | govuk-frontend usage, accessibility, content style |
| Config (`.yml`, `.json`, `pom.xml`, `package.json`) | New keys correct, no secrets, dep versions; do not flag missing comments |
| Lockfile (`package-lock.json`) | Only flag if a transitive dep has a known CVE; do not flag drift |

## Completion check

When you're done, your placeholder JSON file should have:

- `verdict` set (SAFE / NEEDS_ATTENTION / RISKY), not `null`.
- `reviewed_at` populated (`set-verdict` stamps it).
- `todos` populated for every finding (each with `id`, `line`,
  `severity`, `category`, `issue`, `fix`, and optionally
  `best_practice`).

The parent skill runs `verify-coverage.sh` afterwards — it checks
`.verdict != null`. If your file still has `verdict: null`, coverage
fails and you'll be re-spawned.
