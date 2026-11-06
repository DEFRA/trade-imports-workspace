---
name: review
description: 'Code review for correctness, security, error handling, performance, best-practices and test coverage across all languages and repos (Java, Node.js, frontend, tests) for EUDP trade-imports tickets. Handles fresh first-pass review, refresh (re-review after further work, merge conflicts or coverage gaps), interactive walker that triages findings one item at a time, and batched implementor that applies queued fixes. Fans out per-file reviews, per-repo consistency analysis and per-item fixes to `general-purpose` Task subagents that follow worker personas under `references/`. Use when the user says "review EUDPA-XXX", "code review", "re-review EUDPA-XXX", "refresh review", "check fixes", "review this branch", "walk review EUDPA-XXX", "triage review", "implement review EUDPA-XXX", or "apply review fixes". Also runs in Local mode against a `REPO:BRANCH` pair with no ticket and no PR, including when invoked programmatically by another skill. NOT for JS lint/format/style findings — use the code-style skill for those.'
context: fork
model: sonnet
allowed-tools: [Bash, Read, Glob, Grep, Task]
argument-hint: 'EUDPA-XXXXX'
---

Pre-merge code review for EUDP trade-imports tickets across all repos and
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
| "review this branch" / `REPO:BRANCH` | this SKILL.md — Local mode (below); start-review.sh dispatches on `--local` |
| "walk review EUDPA-X" / "triage review" | `Follow references/WALKER.md` |
| "implement review EUDPA-X" / "apply review fixes" | `Follow references/BATCH_IMPLEMENTOR.md` |

NOT for JavaScript lint/format/style findings — use the `code-style`
skill.

## What a review checks

Engineering review checks how the code follows, or breaks, the
patterns the codebase already sets: the feature-folder shape, the
journey platform, controllers, view models and obligations, the
`frontend-change` recipes, `docs/best-practices/`, how sibling features
do the same thing, and tests in the house style. It is not a design
review.

Each file is reviewed for correctness, security, error handling,
performance, best practice and test coverage, and for four
code-quality dimensions defined in `references/FILE_REVIEWER.md`:

| Dimension | What it catches |
|---|---|
| Naming | A name that does not predict what the code returns and changes (predict, then compare) |
| Structure | One rule with two homes, logic in the wrong layer, a second mechanism beside an existing one |
| Logging | An outcome-changing branch that logs nothing, or a log line without the ids support searches by |
| Test truth | A title that claims more than its assertions prove, or a test that cannot fail |

The house rules in `.claude/rules/code-quality.md` apply to every file.

**Code-quality findings are real by default.** Naming, comments,
structure, duplication, logging, test readability and history in code
are never dropped as taste, as pre-existing, as out of scope, because
a comparable file does the same, or because the plan or an earlier
decision chose it. Drop one only when the code shows it is factually
wrong. **Functional findings need evidence**: a failure scenario, a
broken acceptance criterion or a failing line. Every finding carries
one category from a fixed list, shared with the build loop's
verifier; see `assets/file-review-schema.md` → "Category values" and
`references/WALKER.md` → "Defaults by kind".

**Fix, then report.** When the review runs with `fix: true`, or the
walker hands it on, findings are fixed by default and reported after.
Only a genuine engineering trade-off becomes `Discuss`. Where GOV.UK
guidance and the page disagree, follow GOV.UK. Content wording goes to
the business analysts' review, not to the reviewer.

## Local mode (no ticket, no PR)

Triggered by "review this branch", "review `REPO:BRANCH`", or another
skill invoking this one (see "Called by another skill" below). Reviews a
repo checkout under `repos/<repo>/` directly — no Jira ticket, no GitHub
PR, no `gh` call of any kind.

```bash
~/git/defra/trade-imports-workspace/tools/review/start-review.sh --local REPO BRANCH
```

This always runs `prepare-review-local.sh` (there is no separate refresh
pipeline for local mode — re-running IS the refresh: the changed-file
list is recomputed from git every call, and files with a verdict already
set are left alone). State lands under
`~/git/defra/trade-imports-workspace/workareas/reviews/local/REPO/BRANCH/`
— same shape as the ticket flow: `branch.md` in place of `ticket.md`,
`.review-meta.json` (`"local": true`), `best-practices/{repo}.md` (via
the same `detect-tech.sh` the ticket flow uses), and per-file
`file-reviews/{repo}/{safe_path}.review.json` placeholders.

The changed-file list is `git -C <repo> diff --name-only <merge-base with
origin/main>...HEAD` plus anything staged or unstaged, unless the caller
passes `--files F1,F2,...` to name the exact files itself.

Everything from here on (Step 2's spawn prompts, coverage verification,
Step 4's consistency review, `## Items` rendering) is the **same FRESH
flow** described below — substitute the local id (`local/REPO/BRANCH`)
for `EUDPA-XXXXX` everywhere, and read the file straight from
`~/git/defra/trade-imports-workspace/repos/{repo}/{file}` (there is no
PR-commit snapshot to clone in local mode — the repo checkout IS the
source). The agents and personas are **unchanged**: `write-briefs.sh`
puts the local id and the live-repo read path in each brief.

## Called by another skill

A skill (e.g. `prototype`, working on a designer's branch) can drive a
local-mode review without a human ever saying "review":

- **Inputs**: `repo` (folder under `repos/`), `branch`, optional `files`
  (an explicit list — when given, scope is exactly those files, not the
  whole branch's git diff), `fix` (`true` — also run
  `BATCH_IMPLEMENTOR.md` on any Fix-disposition items found; `false` —
  report only).
- **Call shape**: run Local mode above (`start-review.sh --local REPO
  BRANCH [--files ...]`) through the Fresh Review steps; when `fix:
  true`, continue into `BATCH_IMPLEMENTOR.md` for the items just found.
- **One-line return** to the calling skill:
  - `fix: false` → `review: {N} files, {M} items ({repo}:{branch})`
  - `fix: true`, items fixed → `applied {N} review fixes ({repo}:{branch})`
  - `fix: true`, nothing to fix → `no open items ({repo}:{branch})`
  - nothing changed on the branch → `no changed files to review ({repo}:{branch})`

## Worker references

A Fresh review spawns custom agents from `.claude/agents/review-*.md`:
one per group in Step 2, and `review-consistency` in Step 4. Each has
Bash, Read and Write, no skill list, and a prompt that is only its brief
path. Refresh and the batch implementor still spawn `general-purpose`
Task subagents with a `Follow …` reference to a `references/*.md`
persona.

| Persona | Used in | Artifact |
|---|---|---|
| `.claude/agents/review-<type>.md` (one per review type, named in `assets/routing.json` → `reviewTypes`) | Fresh Step 2 (one per group, parallel up to 2) | per-file `.review.json` via `file-review-write.sh`, plus `ac/<group>.json` from test reviewers |
| `references/FILE_REVIEWER.md` | Refresh Step R4 only (one per file, parallel up to 2) | per-file `.review.json` (schema in `assets/file-review-schema.md`) |
| `.claude/agents/review-consistency.md`, following `references/CONSISTENCY_REVIEWER.md` | Fresh Step 4 (once) | per-repo `_consistency-check.md` and `consistency/{repo}.items.json` |
| `references/REVIEW_ITEM_FIXER.md` | `BATCH_IMPLEMENTOR.md` Step 4 (one per Fix-disposition item, sequential) | source edits + commit |

Spawn idiom outside Fresh Steps 2 and 4: Task tool with
`subagent_type: general-purpose` and a prompt beginning `Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/review/references/<NAME>.md.`

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

**Review only this ticket's own changes.** A ticket review covers the
PRs whose title or head branch carries the ticket key, and nothing else.
GitHub's search also finds PRs for other tickets that only mention this
one; setup leaves those out (`prs.sh --own`) and prints a `Left out
{repo}#{n}` line for each. Do not add them back, and do not review
another ticket's changes that reached this ticket's branch through a
merge from `main` or a sibling branch: findings on them belong to that
ticket's review and muddy this one's verdict and counts. The one
exception is a file hand-resolved in such a merge, which is this
ticket's code (see List C under Step R1-R3). If a PR in
`.review-meta.json` still belongs to another ticket, stop and tell the
user before any reviewer starts.

**Pin the head you review.** For each PR in `.review-meta.json`, read
its current head:

```bash
gh pr view {pr} --repo DEFRA/{repo} --json headRefOid --jq .headRefOid
```

Then read the review clone's head:

```bash
git -C ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/repos/{repo} rev-parse HEAD
```

If they differ, the clone is stale: run Step 0 again (it refetches)
before any reviewer starts. Record the SHA you reviewed for each repo;
Step 7 and the Completion Output state it. Local mode has no PR: record
`git -C ~/git/defra/trade-imports-workspace/repos/{repo} rev-parse HEAD`
instead.

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
- `groups.json` and one `briefs/<group id>.md` per group, plus empty
  `findings/`, `ac/` and `consistency/` folders for the reviewers to
  write into.

**Trial run.** When the user says "trial run", "don't post" or "no
post", run every step except Step 7 and say so in the Completion
Output. Ask once at the start if it is unclear.

Proceed to Step 2.

## Step 2: Review Each Group

Step 0 already sorted every file still to review into groups and wrote a
brief for each: `groups.json` and `briefs/<group id>.md` in the review
workarea (`plan-groups.sh`, `write-briefs.sh`). A group is one repo, one
file type, at most 10 files. Its brief holds everything the reviewer needs.
A brief runs to thousands of lines and one Read call returns about
40-55 KB of it, so the reviewer reads it from line 1 to the end in order.
Its header gives its length in lines, and the guides come last.

Read the group list once:

```bash
jq -c '.groups[] | {id, agent, files: (.files | length)}' ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/groups.json
```

Spawn one Task per group with `subagent_type` set to the group's `agent`.
Up to **2 in parallel**: emit two Task calls in one response, wait for
both, then the next two. The whole prompt is:

```markdown
Your brief: ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/briefs/<group id>.md
Read it from line 1 to the last line its header gives, in order.
```

Each reviewer writes its findings to disk and replies with one line
(`done: 6 files, 9 findings, NEEDS_ATTENTION, read 4120 of 4120 lines`).
Do not read its findings back here: Step 5 reads them from disk. On a
`failed:` reply, spawn that group once more; if it fails again, report it.
A reply that read fewer lines than the brief has is a failed review:
spawn that group once more (`file-review-write.sh` replaces what the
first run wrote), and report it if it happens again.

## Step 3: Verify Coverage

Lockfiles get no reviewer: `groups.json` lists them under `skipped`. Give
them their verdict in one call. Write
`~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/findings/skipped.json`
with one entry per skipped file:

```json
[{"repo": "<repo>", "file": "package-lock.json", "verdict": "SAFE",
  "reason": "Lockfile: no reviewer. Dependency changes are reviewed in the manifest.",
  "findings": []}]
```

then run:

```bash
~/git/defra/trade-imports-workspace/tools/review/file-review-write.sh EUDPA-XXXXX --from ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/findings/skipped.json
```

Skip both when `skipped` is empty. Then:

```bash
~/git/defra/trade-imports-workspace/tools/review/verify-coverage.sh EUDPA-XXXXX
```

**Do NOT proceed to Step 4 until 100% coverage.** A file still uncovered
is in a group whose reviewer failed: spawn that group again.

## Step 4: Consistency Review

Spawn one Task with `subagent_type: review-consistency`. The whole prompt:

```markdown
Review id: EUDPA-XXXXX
Workarea: ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/
Write _consistency-check.md and consistency/{repo}.items.json for every repo in .review-meta.json.
```

Wait for its one-line reply. Then check it wrote both files for every
repo:

```bash
~/git/defra/trade-imports-workspace/tools/review/verify-consistency.sh EUDPA-XXXXX
```

and that `consistency/{repo}.items.json` exists for each repo (`[]` when
it found nothing). Spawn it once more if either is missing. Its items
go in at Step 5a, once `items.{repo}.json` exists.

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

**Then reconcile the items before you render them** (Step 5a below).
Once `review.{repo}.md` is written from the skeleton, run
`render-items.sh EUDPA-XXXXX --repo {repo} --write` to put the table in
it. Never paste the table by hand or splice it in with a script of your
own.

### Step 5a: Reconcile findings

Every write in this step is one batched call. Never add or mark items
one at a time.

**1. Carry in the consistency findings.** The consistency reviewer
already wrote them as `consistency/{repo}.items.json` (Step 4). Put
every repo's list into one file:

```bash
jq -s add ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/consistency/*.items.json > ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/consistency/all.json
```

then add them all in one call (skip it when `all.json` is `[]`):

```bash
~/git/defra/trade-imports-workspace/tools/review/review-add-item.sh EUDPA-XXXXX --from ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/consistency/all.json
```

Do not read `_consistency-check.md` to add items by hand: the list is
the same rows.

**2. Merge findings that share one root.** Read
`review-items.sh EUDPA-XXXXX --repo {repo} --json` across every repo.
Group items whose Musts would each add or change the same rule, guard,
format or name in a different place. Signs of one root:

- several items each add a guard against the same bad input
- several items each fix one copy of the same format or label
- a naming item and a comment item on the same symbol
- the same concept named differently in several files or repos
- items in several files that break the same house rule in the same
  way, such as provenance or history narration (ticket keys, dates, "first
  built on") in each of a skill's docs. Their Must is one decision on
  where that information lives, so they are one root

Example: four items each asked for a guard against the same refusal.
Applied one by one, they became three guards that failed three
different ways.

For each group of two or more, write one "decide the owner" item into
`~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/owners.json`,
all groups in one list:

```json
[{"repo": "{repo of the likely owner}", "file": "{likely owner file}",
  "line": 12, "severity": "{highest in the group}",
  "category": "duplication",
  "issue": "One rule, {N} findings: #{a}, #{b}, #{c} — {the rule in one line}",
  "fix": "Must: one owner holds {the rule}; every other place calls it or is deleted. One way: {the owner you would pick, and why}"}]
```

The owner item is `duplication` when its members are copies of one
rule, and `structure` otherwise. Its issue always starts `One rule,`.
Add them in one call:

```bash
~/git/defra/trade-imports-workspace/tools/review/review-add-item.sh EUDPA-XXXXX --from ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/owners.json
```

It prints one new id per line, in list order. Then close every member
with a pointer to its owner, all of them in
`~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/merges.json`:

```json
[{"repo": "{repo}", "item": 4, "disposition": "Merged", "note": "merged into #{owner item id}"}]
```

and mark them in one call:

```bash
~/git/defra/trade-imports-workspace/tools/review/review-mark.sh EUDPA-XXXXX --from ~/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-XXXXX/merges.json
```

Both calls are all or nothing: when one is refused, fix the list and run
it again. Skip both when no findings share a root. A finding with no
partner stays as it is.

After Step 5, the canonical state is `items.{repo}.json`. Walker /
batch implementor / refresh tools mutate it via `review-*.sh`. The
`## Items` markdown view in `review.{repo}.md` is regenerated by
`render-items.sh --write` whenever the JSON changes.

**Skeleton:**

```markdown
# Repository Review: {repo-name}

**PR:** #{pr-number}
**Commit reviewed:** {sha pinned in Step 0}
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

<!-- items table: `render-items.sh EUDPA-XXXXX --repo {repo} --write` puts it here.
     Full schema and `|` escape rules: assets/items-table.md.
     Disposition / Status / Notes start blank — walker fills them. -->

## Repository Verdict
**Status:** SAFE / NEEDS ATTENTION / RISKY
```

Skip the `review.{repo}.md` summary if only one repository is
involved. Never skip `--write-items`, Step 5a or `render-items.sh`.

## Step 6: Write Index

Build the acceptance-criteria table first. The test reviewers each wrote
`ac/<group id>.json`; this puts every group together, so a criterion
counts as proved when a test in any group or repo proves it:

```bash
~/git/defra/trade-imports-workspace/tools/review/ac-table.sh EUDPA-XXXXX
```

Paste its table as it is. A `No` row means no test proves the
criterion, not that the code misses it. For each `No` row, check the
diff before you set the verdict: if the code meets the criterion, it is
a `coverage-gap`; if it does not, it is missing functionality. When the
script finds no `ac/` files (no tests changed), write "No tests changed:
no criterion is proved by a test in this change." instead of the table.

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
<!-- paste output of `ac-table.sh EUDPA-XXXXX` here -->

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

**Where the PR set touches `openspec/`**, the Acceptance Criteria Check
runs both ways: the code satisfies the AC, *and* the behaviour-spec
update accurately represents it. Added or changed scenarios under
`openspec/specs/` must say what the AC says; `openspec/coverage/` links
on touched scenarios must be backed by test files actually in the PR
set. A mismatch is Critical — the file-reviewers will already have
raised it (`references/FILE_REVIEWER.md` → "Behaviour-spec files");
carry it into the AC table rather than letting it sit only in the items
list. The spec and the code it describes often land in **separate PRs**,
since the spec lives in `trade-imports-workspace` — check across the PR
set, not within one diff.

## Step 7: Post the review (FRESH only)

**Skip this step on a trial run** (see Step 1): post nothing, push no
handoff branch, and go to the Completion Output.

Post the review to every PR in `.review-meta.json` as a PR comment.
This runs after Step 6 because the comment carries the verdict from
`review-index.md`. Who authored each PR decides the shape of the post.

Look up the `gh` user once:

```bash
~/git/defra/trade-imports-workspace/tools/github/whoami.sh
```

Then, for each PR in `.review-meta.json`, look up its author:

```bash
~/git/defra/trade-imports-workspace/tools/github/pr-author.sh {repo} {pr}
```

**Before every post, check the head again.** Run the `gh pr view …
--json headRefOid` call from Step 0 for that PR, immediately before its
`share-review.sh` call. If the head has moved since the SHA you pinned:

- run a refresh review (Step 0 again) and post that instead, or
- post with a first line that names the SHA reviewed and says newer
  commits are not covered.

Never post "not addressed", "not in the diff" or "still present"
against a head that has moved. An author can push several commits
during one long review. Every posted comment names the commit it
reviewed.

**PRs authored by you** — post the review as a comment. No prompt, no
handoff branch: the review state is already in your workspace.

```bash
~/git/defra/trade-imports-workspace/tools/review/share-review.sh EUDPA-XXXXX --repo {repo} --pr {pr} --comment-only
```

**PRs authored by someone else** — show the user a per-PR table and
prompt, because the handoff pushes a branch to the workspace remote:

```markdown
| Repository | PR | Author | Handoff? |
|---|---|---|---|
| {repo} | #{pr} | {author} | [Y/n] |
```

On `Y`, post the comment and push the handoff branch they walk the
review from:

```bash
~/git/defra/trade-imports-workspace/tools/review/share-review.sh EUDPA-XXXXX --repo {repo} --pr {pr}
```

On `n`, skip that PR.

Always pass both `--repo` and `--pr` — PR numbers repeat across repos.
Run one `share-review.sh` call per PR, sequentially: handoff runs
switch the workspace branch and must not overlap.

Capture every PR comment URL, and the handoff branch if one was pushed,
for the Completion Output.

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

Commits reviewed:
  - {repo}#{pr} @ {sha}

PR comments posted (Step 7):
  - {repo}#{pr} → {comment url}
  ...
[On a trial run, in place of the list above:]
PR comments posted (Step 7): none, trial run.

[If a handoff branch was pushed in Step 7, append:]
Handoff branch: chore/EUDPA-XXXXX (pushed to workspace remote)

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

List C is never filtered by ticket. A file hand-resolved in a merge
from `main` or a sibling branch is this PR's code, even when the
commits on each side belong to other tickets: the resolution exists in
neither parent, so neither parent's review covers it.

Pin the head as in Step 0 before spawning reviewers, and record the
SHA for the refresh summary.

## Step R3.5: Load Full Item Inventory

```bash
~/git/defra/trade-imports-workspace/tools/review/review-items.sh EUDPA-XXXXX --json
```

Use this when reconciling agent results in R6:

- `Won't Fix` / `Auto-Resolved` / `Merged` → carry forward; do NOT re-report.
- `Fix` + `Done` → verify the agent confirms the violation is gone.
- `Fix` + `Not Done` (and `Discuss`) → still open.
- Blank disposition → pending (walker will pick up; should appear in List B).

Deleted files: mark their items as `Auto-Resolved` via `review-mark.sh`.

## Step R4: Re-review Files

Spawn `general-purpose` Task subagents in parallel (up to 2), one per
entry in List A (Mode=REFRESH), List C (Mode=MERGE_RESOLVED), and List D
(Mode=FRESH; coverage gap). When more than two files need review, batch two
at a time. Each spawn prompt begins with
`Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/review/references/FILE_REVIEWER.md.`

Within each batch, emit both Task calls in one assistant response — do NOT
spawn one, await the result, then spawn the next inside a batch.

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
~/git/defra/trade-imports-workspace/tools/review/render-items.sh EUDPA-XXXXX --repo {repo} --write
```

Between the two calls, run Fresh Step 5a part 2 (merge findings that
share one root) over the new items together with the open ones, so a
new finding that shares a root with an open item joins its "decide
the owner" item.

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
the prior item's category and an issue starting `Regression of #N:`).

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

**Commit reviewed:** [sha]
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
| `start-review.sh` | Step 0 — detect FRESH/REFRESH and exec the appropriate setup script; `--local REPO BRANCH` for Local mode |
| `prepare-review.sh` | Fresh Step 1 workspace setup; transitively seeds best-practices via `detect-tech.sh`, which reads `assets/routing.json` |
| `prepare-review-local.sh` | Local mode setup — no Jira/GitHub; changed-file list from git, or the caller's `--files` |
| `verify-coverage.sh` | Fresh Step 3 coverage gate |
| `verify-consistency.sh` | Fresh Step 4 consistency gate — `_consistency-check.md`, and `consistency/{repo}.items.json` when the review has that folder |
| `plan-groups.sh` / `write-briefs.sh` | Run by the setup scripts — sort files into `groups.json`, write one brief per group |
| `file-review-write.sh` | Write many per-file verdicts and findings in one call (`--from`); group reviewers and Fresh Step 3's skipped lockfiles |
| `ac-table.sh` | Fresh Step 6 — merge the test reviewers' `ac/*.json` into the acceptance-criteria table |
| `verify-style-coverage.sh` | Cross-domain — style-review coverage check (also consumed by code-style) |
| `diff-since-review.sh` | Refresh helper — per-file diff between snapshot SHA and HEAD |
| `review-items.sh` | Walker / batch / refresh — list items with filters |
| `review-mark.sh` | Set Disposition (auto-sets Status); `--from` marks many in one call |
| `review-set-status.sh` | Set Status only (after fix attempt) |
| `review-add-item.sh` | Append a newly-found violation; returns the new ID; `--from` adds many in one call |
| `review-counts.sh` | Final reports (walker + batch implementor) — breakdown by Disposition+Status |
| `aggregate-file-reviews.sh` | Fresh Step 5 — write `items.{repo}.json` from per-file `.review.json` files; emit File Analysis Summary / Items markdown |
| `share-review.sh` | Fresh Step 7 — post the review as a PR comment; `--comment-only` for PRs you authored, otherwise also push handoff branch `chore/EUDPA-X` to the workspace remote |
| `render-items.sh` | Render `items.{repo}.json` as the `## Items` markdown view; `--write` puts it into `review.{repo}.md` |
| `file-review-init.sh` / `file-review-add-item.sh` / `file-review-set-verdict.sh` | Per-file JSON helpers used by the FILE_REVIEWER persona |
| `refresh/scope.sh` | Refresh Steps R1-R3 orchestrator |
| `refresh/reconcile.sh` | Refresh Step R5 — fold per-file `.review.json` findings into `items.{repo}.json`; emit Fix+Done spot-check advisory |
| `refresh/pull-repos.sh` | Refresh helper — pin PR-ref refspec, fetch + detach per repo (origin/main for merged PRs) |
| `refresh/list-merge-resolved.sh` | Refresh helper — hand-resolved merge files (List C) |
| `refresh/list-coverage-gaps.sh` | Refresh helper — PR files lacking a `.review.md` (List D) |
