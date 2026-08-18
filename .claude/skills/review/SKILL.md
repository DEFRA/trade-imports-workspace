---
name: review
description: 'Code review for correctness, security, error handling, performance, best-practices and test coverage across all languages and repos (Java, Node.js, frontend, tests) for EUDP Live Animals tickets. Handles fresh first-pass review, refresh (re-review after further work, merge conflicts or coverage gaps), interactive walker that triages findings one item at a time, and batched implementor that applies queued fixes. Fans out per-file reviews, per-repo consistency analysis and per-item fixes to `general-purpose` Task subagents that follow worker personas under `references/`. Use when the user says "review EUDPA-XXX", "code review", "re-review EUDPA-XXX", "refresh review", "check fixes", "walk review EUDPA-XXX", "triage review", "implement review EUDPA-XXX", or "apply review fixes". NOT for JS lint/format/style findings — use the code-style skill for those.'
context: fork
allowed-tools: [Bash, Read, Glob, Grep, Task]
argument-hint: 'EUDPA-XXXXX'
---

Pre-merge code review for EUDP Live Animals tickets across all repos and
languages.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash expands `~` to
your home directory automatically. Scripts under `tools/` hardcode the workspace path as
`$HOME/git/defra/trade-imports-workspace/...` — no env var needed.
Skill-internal references stay relative
(`references/<NAME>.md`, `assets/<NAME>.md`); subagents are addressed
by name via the Task tool.

**Bash call hygiene** — one command per Bash call. Full rule table: [`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## What this skill is for

- Fresh review of a new ticket's PR set across all repos.
- Refresh review after further commits, merge conflict resolutions, or new
  files needing coverage.
- Interactive walker to triage findings one item at a time
  (`Follow references/WALKER.md`).
- Batched implementor to apply queued `Fix`-disposition items
  (`Follow references/BATCH_IMPLEMENTOR.md`).

Per-repo state lives in
`~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXX/items.{repo}.json`
— canonical JSON, mutated only via `review-*.sh` helpers. The
`## Items` markdown table in `review.{repo}.md` is a rendered view
(via `render-items.sh`). See `assets/items-table.md` for the JSON
schema and allowed Disposition/Status values.

## When to use

| Trigger | What to follow |
|---------|----------------|
| "review EUDPA-X" / "re-review EUDPA-X" / "refresh review" / "check fixes" | this SKILL.md — Fresh + Refresh sections |
| "walk review EUDPA-X" / "triage review" | `Follow references/WALKER.md` |
| "implement review EUDPA-X" / "apply review fixes" | `Follow references/BATCH_IMPLEMENTOR.md` |

NOT for JavaScript lint/format/style findings — use the `code-style`
skill.

## Worker references

The parent SKILL.md (and `references/BATCH_IMPLEMENTOR.md`) delegate to
three worker personas defined as `references/*.md` prose. Each is spawned
as a `general-purpose` Task subagent with a `Follow …` reference to the
persona file. `general-purpose` carries `Tools: *` (it has Write/Edit/Bash)
and is not subject to the no-write guardrail that restricted custom
subagents receive — so workers can write their on-disk artifacts.

| Persona | Used in | Artifact |
|---|---|---|
| `references/FILE_REVIEWER.md` | Fresh Step 2, Refresh Step R4 (one per file, parallel up to 100) | per-file `.review.json` (schema in `assets/file-review-schema.md`) |
| `references/CONSISTENCY_REVIEWER.md` | Fresh Step 4 (one per repo) | per-repo `_consistency-check.md` |
| `references/REVIEW_ITEM_FIXER.md` | `BATCH_IMPLEMENTOR.md` Step 4 (one per Fix-disposition item, sequential) | source edits + commit |

Spawn idiom: Task tool with `subagent_type: general-purpose` and a prompt
beginning `Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/review/references/<NAME>.md.`

## Step 0: Start the review

```bash
~/git/defra/trade-imports-workspace/tools/review/start-review.sh EUDPA-XXXXX
```

Single dispatch — detects mode and runs the appropriate first-step
setup script.

First line of output is `MODE: FRESH` or `MODE: REFRESH`. Branch on it:

- `MODE: FRESH` → setup ran `prepare-review.sh`; go to Fresh Review,
  Step 2.
- `MODE: REFRESH` → setup ran `refresh/scope.sh --write-snapshot`; go to
  Refresh Review, Step R3.5.

**On Claude Code auto-backgrounding:** for fresh reviews the setup
clones repos in parallel but can still take 30–90s. If the Bash tool
auto-backgrounds it, **wait for the harness's `task-notification`
(status: completed) — do NOT poll the PID file or `tail` the output**.
The notification arrives automatically.

---

# FRESH REVIEW

## Step 1: Workspace prepared (by Step 0)

`start-review.sh` already ran `prepare-review.sh` and produced:

- `~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/` with
  ticket.md, repos/, file-reviews/ placeholders, and
  `.review-meta.json` (detected tech + best-practices paths under
  `~/git/defra/trade-imports-workspace/docs/best-practices/`).

Proceed to Step 2.

## Step 2: Review Each File

**MANDATORY:** create a review for EVERY changed file. No exceptions.

### Parallel Execution

Spawn up to **100 in parallel** via the Task tool with
`subagent_type: general-purpose`.

Emit ALL Task calls in a single assistant response — do NOT spawn one, await the result, then spawn the next. Parallelism only works when calls are batched in one turn.

#### Spawn prompt template

```markdown
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/review/references/FILE_REVIEWER.md.

**Mode:** FRESH
**Ticket:** EUDPA-XXXXX - [Ticket Summary]

**Your assigned file:**
- Repository: [repo-name]
- Path: [file-path]
- PR: [pr-number]
- Commit: [sha]
```

The reviewer writes findings to the per-file JSON placeholder via the
`file-review-add-item.sh` / `file-review-set-verdict.sh` helpers — no
markdown, no placeholder path needed in the spawn prompt.

## Step 3: Verify Coverage

```bash
~/git/defra/trade-imports-workspace/tools/review/verify-coverage.sh EUDPA-XXXXX
```

**Do NOT proceed to Step 4 until 100% coverage.**

## Step 4: Consistency Review

Spawn one Task subagent with `subagent_type: general-purpose`. Spawn prompt:

```markdown
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/review/references/CONSISTENCY_REVIEWER.md.

**Ticket:** EUDPA-XXXXX - [Ticket Summary]
**Review workspace:** ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/

Read .review-meta.json for all repos and PR numbers.
Write _consistency-check.md for every repo listed.
```

Wait for completion. Verify `_consistency-check.md` exists for every repo
before proceeding.

## Step 5: Create Repository Summaries

For each repository, write
`~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/review.{repo}.md`.
Two sections are generated deterministically from the per-file JSONs
via the aggregator; the rest is your synthesis from reading the
per-file JSONs and the diff.

**Populate the consolidated items file and the deterministic sections:**

```bash
# Write items.{repo}.json from per-file .review.json (initial population).
# Globally renumbers IDs across the repo's files; preserves no prior
# disposition/status — call this ONCE per repo at FRESH Step 5.
~/git/defra/trade-imports-workspace/tools/review/aggregate-file-reviews.sh EUDPA-XXXXX --repo {repo} --write-items

# File Analysis Summary table (markdown)
~/git/defra/trade-imports-workspace/tools/review/aggregate-file-reviews.sh EUDPA-XXXXX --repo {repo} --section file-summary

# ## Items markdown view (rendered from items.{repo}.json)
~/git/defra/trade-imports-workspace/tools/review/render-items.sh EUDPA-XXXXX --repo {repo}
```

After Step 5, the canonical state is `items.{repo}.json`. Walker /
batch implementor / refresh tools mutate it via `review-*.sh`. The
`## Items` markdown view in `review.{repo}.md` is regenerated by
`render-items.sh` whenever the JSON changes.

**Skeleton:**

```markdown
# Repository Review: {repo-name}

**PR:** #{pr-number}
**Commit:** {sha}
**Files Changed:** {count}

## Summary
[2-3 sentences about changes in this repository]

<!-- paste output of `aggregate-file-reviews.sh ... --section file-summary` here -->

## Positive Observations
[What was done well]

## Test Coverage
- Unit tests: [assessment]
- Integration tests: [assessment]

## Risk Assessment
**Overall Risk:** Low / Medium / High
**Rationale:** [One sentence]

<!-- paste output of `render-items.sh EUDPA-XXXXX --repo {repo}` here.
     Full schema and `|` escape rules: assets/items-table.md.
     Disposition / Status / Notes start blank — walker fills them. -->

## Repository Verdict
**Status:** SAFE / NEEDS ATTENTION / RISKY
```

Skip this step if only one repository is involved.

## Step 5.5: Handoff check (FRESH only)

Before writing the index and finishing, determine whether the PRs you
just reviewed are yours or someone else's. If any are someone else's,
offer to hand off the review to them via a workspace branch +
inline PR comment.

For each PR in `.review-meta.json`:

```bash
~/git/defra/trade-imports-workspace/tools/github/pr-author.sh {repo} {pr}
```

```bash
~/git/defra/trade-imports-workspace/tools/github/whoami.sh
```

Compare authors against the `gh` user:

- **All PRs authored by you** — print
  `PRs authored by you — proceeding to walker.` and continue to
  Step 6. No prompt.
- **Any PR not authored by you** — show the user a per-PR table and
  prompt:

  ```markdown
  | Repository | PR | Author | Handoff? |
  |---|---|---|---|
  | {repo} | #{pr} | {author} | [Y/n] |
  ```

  On `Y` for at least one PR, run the handoff for the matching subset:

  ```bash
  ~/git/defra/trade-imports-workspace/tools/review/share-review.sh EUDPA-XXXXX [--pr N]
  ```

  Omit `--pr` if every non-yours PR is being handed off; pass `--pr N`
  per-PR if the user only wants a subset.

  On `n` for every non-yours PR, fall through to Step 6 / walker.

Capture the printed handoff branch URL and PR comment URLs — include
them in the Completion Output.

## Step 6: Write Index

Create `~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/review-index.md` —
a thin navigation index only, no item rows:

```markdown
# Code Review: EUDPA-XXXXX

**Ticket:** [Summary]
**Reviewer:** Claude Code Agent
**Date:** [Date]
**Verdict:** PASS / PASS WITH NOTES / CONCERNS / FAIL

## Summary
[2-3 sentences]

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| {repo-name} | #{pr} | {sha} | {N} | SAFE/NEEDS ATTENTION/RISKY | [review.{repo}.md](review.{repo}.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|

## Test Coverage Assessment
- **Unit Tests:** Present/Missing/Partial
- **Integration Tests:** Present/Missing/Partial

## Configuration & Environment
- **New Environment Variables:**
- **Database Changes:**

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Low/Medium/High |
| Code Quality | Low/Medium/High |
| Security | Low/Medium/High |
| Test Coverage | Low/Medium/High |

## Conclusion
[2-3 sentences. Full todo lists and item details are in each `review.{repo}.md`.]
```

## Verdict Guidelines (Fresh)

| Verdict | Criteria |
|---------|----------|
| **PASS** | All AC met, good quality, adequate tests |
| **PASS WITH NOTES** | AC met, minor non-blocking suggestions |
| **CONCERNS** | Issues to address before merge |
| **FAIL** | Critical bugs, security issues, missing functionality |

## Completion Output (Fresh)

```
Review complete for EUDPA-XXXXX.

Summary:
- Verdict: [VERDICT]
- Files changed: [X]
- Review files created: [X] (verified 100% coverage)
- Consistency checks: [X repos]
- Repositories: [list]
- Repository summaries: [X review.{repo}.md files]
- Critical findings: [X]
- Total todo items: [X]

Index: ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/review-index.md
Repo reviews: ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/review.{repo}.md (one per repo)

[If a handoff happened in Step 5.5, append:]
Handoff branch: chore/EUDPA-XXXXX (pushed to workspace remote)
PR comments posted:
  - {repo}#{pr} → {comment url}
  ...

Next: run `walk review EUDPA-XXXXX` to triage items. (Don't hand-edit
the markdown items table — it's rendered from items.{repo}.json by
render-items.sh and gets overwritten.)
```

**Bulk-marking shortcut:** the markdown `## Items` table in
`review.{repo}.md` is a rendered view of `items.{repo}.json` —
hand-edits there get overwritten by the next `render-items.sh`.
To pre-decide items before walking, call `review-mark.sh` directly
for each (or run `walk review EUDPA-XXXXX` and rattle through with
F / W / D keystrokes — that's normally faster). The walker only
shows items with `disposition: null`, so pre-marked items are
skipped.

---

# REFRESH REVIEW

Used when `review-index.md` already exists. Updates the existing doc in
place — verifies prior feedback has been addressed, catches new issues
after further work or merge conflicts.

## Step R1-R3: Refresh scope built (by Step 0)

`start-review.sh` already ran `refresh/scope.sh --write-snapshot` and
emitted a JSON object on stdout. Read it from there.

Each `repos[]` entry has `prior_sha`, `current_sha`, `no_changes`,
and `lists.{A,B,C,D}`:

- **List A** — `[{ file, old_sha, new_sha }]` — file changed in window, not merge-resolved
- **List B** — `[{ id, file, line, issue, fix, disposition, status, ... }]` — open items whose file did *not* change
- **List C** — `[{ file, merge_sha, old_sha, new_sha }]` — hand-resolved merge files (non-trivial resolution)
- **List D** — `[{ file }]` — PR files lacking a `.review.md`

`prior_sha` is the most recent re_review snapshot's `current_commit` that
differs from today's HEAD; falls back to `prs[].commit` on the first
refresh.

If all four lists are empty across all repos: report the branch is
unchanged since the last refresh and stop.

## Step R3.5: Load Full Item Inventory

```bash
~/git/defra/trade-imports-workspace/tools/review/review-items.sh EUDPA-XXXXX --json
```

Use this when reconciling agent results in R6:

- `Won't Fix` / `Auto-Resolved` → carry forward; do NOT re-report.
- `Fix` + `Done` → verify the agent confirms the violation is gone.
- `Fix` + `Not Done` (and `Discuss`) → still open.
- Blank disposition → pending (walker will pick up; should appear in List B).

Deleted files: mark their items as `Auto-Resolved` via `review-mark.sh`.

## Step R4: Re-review Files

Spawn `general-purpose` Task subagents in parallel (up to 100), one per
entry in List A (Mode=REFRESH), List C (Mode=MERGE_RESOLVED), and List D
(Mode=FRESH; coverage gap). Each spawn prompt begins with
`Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/review/references/FILE_REVIEWER.md.`

Emit ALL Task calls in a single assistant response — do NOT spawn one, await the result, then spawn the next. Parallelism only works when calls are batched in one turn.

### Spawn prompt — REFRESH (List A)

```markdown
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/review/references/FILE_REVIEWER.md.

**Mode:** REFRESH
**Ticket:** EUDPA-XXXXX - [Ticket Summary]

**Your assigned file:**
- Repository: [repo-name]
- Path: [file-path]
- PR: [pr-number]
- Previous commit: [old-sha]
- Current commit: [new-sha]
```

### Spawn prompt — MERGE_RESOLVED (List C)

```markdown
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/review/references/FILE_REVIEWER.md.

**Mode:** MERGE_RESOLVED
**Ticket:** EUDPA-XXXXX - [Ticket Summary]

**Your assigned file:**
- Repository: [repo-name]
- Path: [file-path]
- PR: [pr-number]
- Previous reviewed commit: [old-sha]
- Current commit: [new-sha]
- Merge commit: [merge-sha]
```

### Spawn prompt — FRESH (List D, coverage gap)

Use the FRESH-mode prompt from Step 2 of the Fresh Review section above.
Note in the prompt that the file is in PR diff but had no prior per-file
review — this is a coverage gap, not a fresh PR.

## Step R5: Reconcile and re-render

Once all refresh reviewers finish, fold their findings into the
consolidated items file and re-render the markdown view:

```bash
# Append new findings from .review.json files; emit Fix+Done
# spot-check advisory for refreshed files (potential regressions).
~/git/defra/trade-imports-workspace/tools/review/refresh/reconcile.sh EUDPA-XXXXX --repo {repo} --json > /tmp/refresh-summary-{repo}.json

# Re-render the ## Items markdown view from items.{repo}.json
~/git/defra/trade-imports-workspace/tools/review/render-items.sh EUDPA-XXXXX --repo {repo}
```

The reconciler trusts the FILE_REVIEWER persona contract: each
refresh reviewer's `.review.json` contains **only deltas** —
regressions and net-new findings. Items that exist in items.json and
are still present in the code are NOT re-reported (the persona
instructs this). The reconciler simply appends every todo it finds.

`/tmp/refresh-summary-{repo}.json` shape:
```json
{
  "added_count": N,
  "added": ["file:line [severity] issue", ...],
  "added_ids": [12, 13, ...],
  "spot_check": [{ "id": 6, "file": "...", "line": 42, "issue": "...", "notes": "abc1234" }, ...],
  "skipped_already_reconciled": N,
  "skipped_unreviewed": N
}
```

`spot_check` lists prior `Fix + Done` items in files that were
refreshed — verify they have not regressed. If any have, the user
re-walks the corresponding new item the reviewer added (with
`--category regression`).

**Stale items not addressed automatically:** the simplified
reconciler does NOT auto-mark prior open items as Auto-Resolved when
they're missing from the new findings. The persona tells the
reviewer to NOT re-report still-present items, so absence is
indistinguishable from "I missed it". Stale items get drained by the
user during the next walker run (hit `S` to leave pending, or `W`
with note "already done").

## Step R6: Update review.{repo}.md cosmetics

Populate the Refresh Summary section in `review.{repo}.md` from
the reconciler's JSON output:

```markdown
## Refresh Summary ([date])

**Files refreshed:** [N]
**New items added:** [M]
**Spot-check (Fix+Done items in refreshed files):** [K]

| # | Change | File:Line | Severity | Issue |
|---|--------|-----------|----------|-------|
| 1 | ➕ New | `path:N` | Critical | ... |
| 2 | ⚠️ Spot-check | `path:N` | Major | ... (prior Fix+Done #6) |
```

Then:

1. Add `**Refreshed:** [today]` line near the top.
2. Update the Repository Verdict if warranted.

**Also update `~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/review-index.md`:**

1. Add `**Last Updated:** [today]` line.
2. Update the Repositories table verdicts.
3. Update the top-level Verdict if warranted.
4. Update the AC Check table if any AC status has changed.

## Refresh Verdict Guidelines

| Verdict | Criteria |
|---------|----------|
| **APPROVED** | All Critical/Major items fixed or Won't Fixed; no new blockers; AC met |
| **STILL HAS CONCERNS** | Critical/Major fixed; Minor items remain (non-blocking) |
| **NEEDS MORE WORK** | Critical/Major items unaddressed, or new blockers found |

## Completion Output (Refresh)

```
Review refresh complete for EUDPA-XXXXX.

Summary:
- Previous verdict: [VERDICT] → New verdict: [VERDICT]
- Files re-reviewed: [X]
- Todo items resolved: [N] / [M]
- New issues found: [N]

Updated: ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/review-index.md + review.{repo}.md files
```

## Scripts cheat-sheet

All under `~/git/defra/trade-imports-workspace/tools/review/`:

| Script | Purpose |
|---|---|
| `start-review.sh` | Step 0 — detect FRESH/REFRESH and exec the appropriate setup script |
| `prepare-review.sh` | Fresh Step 1 workspace setup; transitively seeds best-practices via `detect-tech.sh` |
| `verify-coverage.sh` | Fresh Step 3 coverage gate |
| `verify-consistency.sh` | Fresh Step 4 consistency gate |
| `verify-style-coverage.sh` | Cross-domain — style-review coverage check (also consumed by code-style) |
| `diff-since-review.sh` | Refresh helper — per-file diff between snapshot SHA and HEAD |
| `review-items.sh` | Walker / batch / refresh — list items with filters |
| `review-mark.sh` | Set Disposition (auto-sets Status) |
| `review-set-status.sh` | Set Status only (after fix attempt) |
| `review-add-item.sh` | Append a newly-found violation; returns the new ID |
| `review-counts.sh` | Final reports (walker + batch implementor) — breakdown by Disposition+Status |
| `aggregate-file-reviews.sh` | Fresh Step 5 — write `items.{repo}.json` from per-file `.review.json` files; emit File Analysis Summary / Items markdown |
| `share-review.sh` | Fresh Step 5.5 — push handoff branch `chore/EUDPA-X` to workspace remote + post PR comment(s) for PRs you didn't author |
| `render-items.sh` | Render `items.{repo}.json` as the `## Items` markdown view |
| `file-review-init.sh` / `file-review-add-item.sh` / `file-review-set-verdict.sh` | Per-file JSON helpers used by the FILE_REVIEWER persona |
| `refresh/scope.sh` | Refresh Steps R1-R3 orchestrator |
| `refresh/reconcile.sh` | Refresh Step R5 — fold per-file `.review.json` findings into `items.{repo}.json`; emit Fix+Done spot-check advisory |
| `refresh/pull-repos.sh` | Refresh helper — pin PR-ref refspec, fetch + detach per repo (origin/main for merged PRs) |
| `refresh/list-merge-resolved.sh` | Refresh helper — hand-resolved merge files (List C) |
| `refresh/list-coverage-gaps.sh` | Refresh helper — PR files lacking a `.review.md` (List D) |
