---
name: code-style
description: 'Multi-language code-style/lint review (formatting, conventions, style rules) and remediation for EUDP trade-imports PRs (EUDPA-*). Reviews Java, GDS/Nunjucks (.njk), Playwright specs, k6 and Node source files, each against its context-appropriate best-practices bundle (Java modern-java + Javadoc; GDS components/styles/patterns; Playwright; k6; Node 17-rule style guide + JSDoc). Supports fresh review, refresh review (re-review after new commits), interactive walker that triages findings one item at a time, and batched implementor that applies queued style fixes. Fans out per-file review and per-file implementation to `general-purpose` Task subagents that follow worker personas under `references/`. Use when the user asks for code style/lint review or to apply agreed style fixes (triggers: "style review EUDPA-", "code style review", "re-style review", "style refresh", "walk style EUDPA-", "triage style", "fix style EUDPA-", "implement style fixes", "lint review"). NOT for correctness/design review across languages or for test-quality review — use the `review` skill for those.'
context: fork
allowed-tools: [Bash, Read, Glob, Grep, Task]
argument-hint: 'EUDPA-XXXXX'
---

Multi-language code-style review and remediation for EUDP trade-imports
tickets (Java, GDS/Nunjucks, Playwright, k6, Node). The per-file reviewer
persona (`references/STYLE_FILE_REVIEWER.md`) is written
language-neutrally and takes its ruleset from the pre-baked
per-(repo,topic) `style-rules.{repo}.{topic}.md` bundle(s) rather than an
inlined catalogue. Discovery and rule-bundling route each file through
`tools/style/file-topics.sh` — a pure path→topic router (java, node, gds,
playwright, k6; additive, so a Playwright spec gets both playwright and
node) that is the single source of truth for the file-type mapping.

Per-repo state lives in
`~/git/defra/trade-imports-workspace/workareas/code-style-reviews/EUDPA-XXX/items.{repo}.json`
— canonical JSON, mutated only via `style-*.sh` helpers. The `## Items`
markdown table in `style-review.{repo}.md` is a rendered view (via
`render-items.sh`). See `assets/items-table.md` for the JSON schema
and allowed Disposition/Status values.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash expands `~` to
your home directory automatically. Scripts under `tools/` resolve the
workspace path against the user's home directory internally — no env
var needed.
Skill-internal references stay relative
(`references/<NAME>.md`, `assets/<NAME>.md`); subagents are addressed
by name via the Task tool.

**Bash call hygiene** — one command per Bash call. Full rule table: [`docs/agent-skills.md`](../../../docs/agent-skills.md) → "Bash call hygiene".

## Workflow modes

| User intent | What to follow |
|---|---|
| "style review EUDPA-X" / "re-style review" / "style refresh" | this SKILL.md — FRESH + REFRESH (start-style.sh dispatches) |
| "walk style EUDPA-X" / "triage style" | `Follow references/STYLE_WALKER.md` |
| "fix style EUDPA-X" / "implement style fixes" | IMPLEMENTATION section below (or `Follow references/STYLE_IMPLEMENTOR.md` per group) |

## Worker references

The skill delegates to three worker personas defined as `references/*.md`
prose. Each is spawned as a `general-purpose` Task subagent with a
`Follow …` reference to the persona file. `general-purpose` carries
`Tools: *` (Write/Edit/Bash) and is not subject to the no-write
guardrail that restricted custom subagents receive — so workers can
write per-file JSONs, run the helper scripts and commit.

| Persona | Used in | Artifact |
|---|---|---|
| `references/STYLE_FILE_REVIEWER.md` | FRESH Step 2 (parallel, up to 100); REFRESH Steps R2/R3/R4 | per-file `.style.json` (schema in `assets/file-style-schema.md`) |
| `references/STYLE_WALKER.md` | `walk style EUDPA-X` triage trigger | item dispositions via `style-mark.sh` |
| `references/STYLE_IMPLEMENTOR.md` | IMPLEMENTATION Step I3 (sequential, one group at a time) | source edits + commit |

Spawn idiom: Task tool with `subagent_type: general-purpose` and a prompt
beginning `Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/code-style/references/<NAME>.md.`

## Step 0: Start the review

```bash
~/git/defra/trade-imports-workspace/tools/style/start-style.sh EUDPA-XXXXX
```

Single dispatch — detects FRESH vs REFRESH from workspace state and
runs the appropriate first-step setup script.

First line of output is `MODE: FRESH` or `MODE: REFRESH`. Branch on it:

- `MODE: FRESH` → setup ran `prepare-style.sh`; go to Fresh Review,
  Step 2.
- `MODE: REFRESH` → setup ran `refresh/scope.sh --write-snapshot`; go to
  Refresh Review, Step R3.5.

IMPLEMENT and WALK are separate top-level triggers (Decision 3) — they
do NOT route through start-style.sh.

**On Claude Code auto-backgrounding:** for fresh reviews the setup may
shallow-clone repos via `prepare-review.sh`, which takes 30–90s. If the
Bash tool auto-backgrounds it, **wait for the harness's
`task-notification` (status: completed) — do NOT poll the PID file or
`tail` the output**.

---

# FRESH REVIEW

## Step 1: Workspace prepared (by Step 0)

`start-style.sh` ran `prepare-style.sh` which produced:

- `~/git/defra/trade-imports-workspace/workareas/code-style-reviews/EUDPA-XXXXX/`
  with `.style-meta.json`, per-repo `file-reviews/{repo}/` subtrees,
  per-file `.style.json` placeholders, and per-(repo,topic)
  `style-rules.{repo}.{topic}.md` bundles.

If `.style-meta.json#source_files` is empty, output:

```
No reviewable source files found in this PR. No code style review needed.
```

And stop.

## Step 2: Review Each File

**MANDATORY:** Review EVERY source file in `.style-meta.json#source_files`.
No exceptions. Spawn up to 100 in parallel via the Task tool with
`subagent_type: general-purpose`.

Emit ALL Task calls in a single assistant response — do NOT spawn one, await the result, then spawn the next. Parallelism only works when calls are batched in one turn.

### Spawn prompt template

```markdown
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/code-style/references/STYLE_FILE_REVIEWER.md.

**Mode: FRESH**
**Ticket:** EUDPA-XXXXX - [Ticket Summary]
**Style rules bundle(s):** (one per topic in this file's `.style-meta.json#source_files[].topics`; a Playwright spec lists both its playwright and node bundle)
- ~/git/defra/trade-imports-workspace/workareas/code-style-reviews/EUDPA-XXXXX/style-rules.[repo-name].[topic].md

**Your assigned file:**
- Repository: [repo-name]
- Path: [file-path]
- Topics: [comma-separated topics for this file]
- PR: #[pr-number]
- Snapshot path (read-only): ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/repos/[repo-name]/[file-path]
```

The reviewer writes findings to the per-file JSON placeholder via the
`file-style-add-item.sh` / `file-style-set-verdict.sh` helpers — no
markdown, no placeholder path needed in the spawn prompt.

## Step 3: Verify Coverage

```bash
~/git/defra/trade-imports-workspace/tools/review/verify-style-coverage.sh EUDPA-XXXXX
```

(The script lives under `tools/review/` for cross-skill reasons but
checks the JSON `.verdict != null` field.) **Do not proceed until 100%
coverage.**

## Step 4: Aggregate to items.{repo}.json + render

For each repo with source files:

```bash
~/git/defra/trade-imports-workspace/tools/style/aggregate-file-reviews.sh EUDPA-XXXXX --repo {repo} --write-items
```

This rolls per-file `.style.json` todos into the canonical
`items.{repo}.json` (globally renumbered IDs) and stamps `reconciled_at`
on every reviewed `.style.json` so the refresh reconciler can detect
new work.

## Step 5: Write Per-Repo Summaries

For each repo, write
`~/git/defra/trade-imports-workspace/workareas/code-style-reviews/EUDPA-XXXXX/style-review.{repo}.md`:

```bash
~/git/defra/trade-imports-workspace/tools/style/aggregate-file-reviews.sh EUDPA-XXXXX --repo {repo} --section file-summary
~/git/defra/trade-imports-workspace/tools/style/render-items.sh EUDPA-XXXXX --repo {repo}
```

Skeleton:

```markdown
# Code Style Review: {repo-name}

**Ticket:** EUDPA-XXXXX
**PR:** #{pr-number}
**Files Reviewed:** {count}
**Verdict:** [VERDICT — see Verdict Guidelines]

<!-- paste output of `aggregate-file-reviews.sh ... --section file-summary` here -->

<!-- paste output of `render-items.sh EUDPA-XXXXX --repo {repo}` here.
     Full schema and `|` escape rules: assets/items-table.md.
     Disposition / Status / Notes start blank — walker fills them. -->
```

After Step 5, `items.{repo}.json` is the canonical state. Walker /
implementor / refresh tools mutate it via `style-*.sh`. The `## Items`
markdown view is regenerated by `render-items.sh` whenever the JSON
changes.

## Step 6: Set Per-Repo Verdicts

```bash
~/git/defra/trade-imports-workspace/tools/style/style-counts.sh EUDPA-XXXXX --repo {repo} --json
```

Use the breakdown to set the verdict line in the per-repo file header
(see Verdict Guidelines below).

## Step 7: Done

Output the completion summary (see "Completion Output" below).

---

# REFRESH REVIEW

## Steps R1-R3: Refresh scope built (by Step 0)

`start-style.sh` already ran `refresh/scope.sh --write-snapshot` and
emitted a JSON object on stdout. Read it from there.

Each `repos[]` entry has `prior_sha`, `current_sha`, `no_changes`,
and `lists.{A,B,C,D}`:

- **List A** — `[{ file, old_sha, new_sha, prior_items }]` — source file changed in window, not merge-resolved
- **List B** — `[{ id, file, line, rule, severity, ... }]` — open items whose file did *not* change
- **List C** — `[{ file, merge_sha, old_sha, new_sha, prior_items }]` — hand-resolved merge files (mapped source only)
- **List D** — `[{ file }]` — PR source files lacking a `.style.json` verdict

If totals are all zero across all repos: report the branch is unchanged
since the last refresh and stop.

## Step R3.5: Load full item inventory

```bash
~/git/defra/trade-imports-workspace/tools/style/style-items.sh EUDPA-XXXXX --json
```

Use this when reconciling agent results in R6:

- `Won't Fix` / `Auto-Resolved` → carry forward; do NOT re-report.
- `Fix` + `Done` → spot-check after refresh (reconciler emits a list).
- `Fix` + `Not Done` and `Discuss` → still open.
- Blank disposition → pending (walker will pick up; should appear in List B).

Deleted files: mark their items as `Auto-Resolved` via `style-mark.sh`.

## Step R4: Re-review files

Spawn `general-purpose` Task subagents in parallel (up to 100), one per
entry in List A (Mode=REFRESH), List C (Mode=MERGE_RESOLVED), and List D
(Mode=FRESH; coverage gap). Each spawn prompt begins with
`Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/code-style/references/STYLE_FILE_REVIEWER.md.`

Emit ALL Task calls in a single assistant response — do NOT spawn one, await the result, then spawn the next. Parallelism only works when calls are batched in one turn.

### Spawn prompt — REFRESH (List A)

```markdown
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/code-style/references/STYLE_FILE_REVIEWER.md.

**Mode: REFRESH**
**Ticket:** EUDPA-XXXXX - [Ticket Summary]
**Style rules bundle(s):** (one per topic in this file's `.style-meta.json#source_files[].topics`; a Playwright spec lists both its playwright and node bundle)
- ~/git/defra/trade-imports-workspace/workareas/code-style-reviews/EUDPA-XXXXX/style-rules.[repo].[topic].md

**Your assigned file:**
- Repository: [repo]
- Path: [entry.file]
- Topics: [comma-separated topics for this file]
- PR: #[pr]
- Previous commit: [entry.old_sha]
- Current commit: [entry.new_sha]

**Prior items reported for this file (JSON):**
[entry.prior_items]
```

### Spawn prompt — MERGE_RESOLVED (List C)

Same as REFRESH but with `**Mode: REFRESH (merge-resolved)**` and an
extra `**Merge commit:** [entry.merge_sha]` header line.

### Spawn prompt — FRESH (List D, coverage gap)

Use the FRESH-mode prompt from Step 2 of the Fresh Review section above.
Note in the prompt that the file is in PR diff but had no prior per-file
review — this is a coverage gap, not a fresh PR.

Workers write deltas (new findings + regressions) to their per-file
`.style.json` exclusively — no direct `style-add-item.sh` calls. The
reconciler folds those deltas into `items.{repo}.json` in R5.

## Step R5: Reconcile and re-render

Once all refresh reviewers finish, fold their findings into the
consolidated items file and re-render the markdown view:

```bash
~/git/defra/trade-imports-workspace/tools/style/refresh/reconcile.sh EUDPA-XXXXX --repo {repo} --json > /tmp/refresh-summary-{repo}.json
~/git/defra/trade-imports-workspace/tools/style/render-items.sh EUDPA-XXXXX --repo {repo}
```

The reconciler trusts the STYLE_FILE_REVIEWER persona contract: each
refresh reviewer's `.style.json` contains **only deltas** — regressions
and net-new findings. Items already in `items.{repo}.json` and still
present are NOT re-reported (the persona instructs this).

## Step R6: Update per-repo verdicts and refresh notes

Recompute verdicts as in Step 6 of FRESH REVIEW. Add a `## Refresh
Summary ({date})` section to `style-review.{repo}.md` with counts from
`/tmp/refresh-summary-{repo}.json` and a spot-check list of prior
`Fix+Done` items in refreshed files (the reconciler emits these as
potential regressions).

---

# IMPLEMENTATION

Apply all open Fix items for a ticket by delegating one
`STYLE_IMPLEMENTOR.md`-following `general-purpose` Task subagent per
file (not per item). All open Fix items for a single file are handed to
one subagent so that file is read once, edited once, tested once, and
committed once.

**Prerequisite:** Services must be running (frontend, backend, admin)
for E2E tests to pass.

## Step I1: Build the Work Plan

Group all open Fix items by `(repo, file)`:

```bash
~/git/defra/trade-imports-workspace/tools/style/style-items.sh EUDPA-XXXXX --filter fix --status not-done --by-file --json
```

Output is `[{repo, file, items: [...]}, ...]`. Each group is one work
unit for one implementor subagent.

If the array is empty, output:
```
Nothing to do — no open Fix items.
```
And stop.

## Step I2: Report Starting State

```
Starting code style implementation for EUDPA-XXXXX.

Open files: [N]  Items across them: [M]
By repo:
  {repo}: {file_count} file(s), {item_count} item(s)

First few groups:
  {repo}/{file}: items #N, #M, #K
  ...
```

## Step I3: Implement Groups Sequentially

For each group in the work list, in order (frontend before other repos,
then alphabetical by file):

Spawn a `general-purpose` Task subagent. Spawn prompt:

```
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/code-style/references/STYLE_IMPLEMENTOR.md.

**Ticket:** EUDPA-XXXXX
**Repo:** {repo}
**File:** {file}
**Items (JSON):**
{indented JSON array of items from --by-file output, e.g.}
[
  {"id": 117, "rule": "2", "severity": "FAIL",
   "issue": "function getPendingRows() ...", "fix": "const getPendingRows = () => ...",
   "line": "14", "notes": ""},
  {"id": 121, "rule": "13", "severity": "WARN",
   "issue": "bare 'PENDING' literal", "fix": "extract to SCAN_STATUS_PENDING",
   "line": "23", "notes": ""}
]
```

**Wait for the subagent to return before starting the next group.**

### Handling Results

The implementor itself updates each item's Status (or Disposition) via
`style-set-status.sh` / `style-mark.sh`. Log the per-group outcome.

Each subagent returns a summary like:

```
{repo}/{file}: 3 done, 1 auto-resolved, 0 failed
  #117 → Done (commit abc123)
  #121 → Done (commit abc123)
  #145 → Done (commit abc123)
  #92  → Auto-Resolved (already fixed by earlier work)
```

Or on failure:
```
{repo}/{file}: 0 done, 0 auto-resolved, 3 failed
Reason: unit tests broke after change, all items reverted
```

Or on pre-existing-failures:
```
CANNOT START: {repo}/{file} — pre-existing test failures
```
**Stop immediately on `CANNOT START`** — pre-existing failures must be
resolved before continuing.

## Step I4: Final Report

After all groups are processed (or stopped early):

```
Code style implementation complete for EUDPA-XXXXX.

Results:
  ✅ Done:          {N} items across {F} files
  ⏭️  Auto-Resolved: {N} items (already fixed)
  ❌ Failed:        {N} items
  🚫 Stopped:       [yes/no — pre-existing failures]

Done:
  {repo}/{file} → items #...,#... (commit {sha})
  ...

Auto-Resolved:
  {repo}/{file} → items #..., reason: ...
  ...

Failed (reverted, marked Status=Failed):
  {repo}/{file} → items #..., reason: ...
  ...
```

---

## Verdict Guidelines

| Verdict | Criteria |
|---------|----------|
| **COMPLIANT** | No open Fix items |
| **MINOR ISSUES** | 1-3 open Fix items, no FAIL severity |
| **NEEDS WORK** | ≥4 open Fix items, or any FAIL severity |

---

## Completion Output

**Fresh review:**
```
Code style review complete for EUDPA-XXXXX.

Summary:
- Per-repo verdicts:
  - {repo}: [VERDICT] ({N} items)
- Total items: [X]
- Files reviewed: [X] (verified 100% coverage)

Per-repo files: ~/git/defra/trade-imports-workspace/workareas/code-style-reviews/EUDPA-XXXXX/style-review.{repo}.md
```

**Refresh review:**
```
Code style refresh complete for EUDPA-XXXXX.

Summary:
- Lists processed: A={N} (changed) C={N} (merge) D={N} (gaps)
- List B carry-forward: {N} open items in unchanged files
- New violations added: {N}
- Auto-resolved: {N}
- Per-repo verdicts:
  - {repo}: [VERDICT] ({N} items)

Per-repo files: ~/git/defra/trade-imports-workspace/workareas/code-style-reviews/EUDPA-XXXXX/style-review.{repo}.md
```

## Scripts cheat-sheet

All under `~/git/defra/trade-imports-workspace/tools/style/`:

| Script | Purpose |
|---|---|
| `start-style.sh` | Step 0 — detect FRESH/REFRESH and exec the appropriate setup script |
| `prepare-style.sh` | Fresh Step 1 workspace setup; init `.style.json` placeholders; bake per-(repo,topic) rules bundles |
| `file-topics.sh` | Pure path→topic router (java/node/gds/playwright/k6, additive); single source of truth for the file-type mapping |
| `bake-rules-bundle.sh` | Concatenate `docs/best-practices/` files into per-(repo,topic) `style-rules.{repo}.{topic}.md` |
| `aggregate-file-reviews.sh` | Fresh Step 4 — write `items.{repo}.json` from per-file `.style.json` files; emit File Analysis Summary / Items markdown |
| `render-items.sh` | Render `items.{repo}.json` as the `## Items` markdown view |
| `style-items.sh` | Walker / implementor / refresh — list items with filters |
| `style-add-item.sh` | Append a new item to `items.{repo}.json`; auto-assigns `id`; returns the new ID |
| `style-mark.sh` | Set Disposition (auto-sets Status) |
| `style-set-status.sh` | Set Status only (after fix attempt) |
| `style-counts.sh` | Breakdown by Disposition + Status — used in per-repo verdict |
| `file-style-init.sh` / `file-style-add-item.sh` / `file-style-set-verdict.sh` | Per-file `.style.json` helpers used by the STYLE_FILE_REVIEWER persona |
| `refresh/scope.sh` | Refresh Steps R1-R3 orchestrator |
| `refresh/reconcile.sh` | Refresh Step R5 — fold per-file `.style.json` findings into `items.{repo}.json`; emit Fix+Done spot-check advisory |

Cross-domain script under `tools/review/`:

| Script | Purpose |
|---|---|
| `verify-style-coverage.sh` | Fresh Step 3 coverage gate — checks `.verdict != null` on each per-file `.style.json` |
