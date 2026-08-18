# Batch implementor — apply queued fixes

Apply all queued `Fix`-disposition items from a completed walker session.
Reads the consolidated items table, delegates to a `general-purpose` Task
subagent following `references/REVIEW_ITEM_FIXER.md` one item at a time,
and updates the table with results — no user input required during the
run.

**Trigger:** `"implement review EUDPA-XXXXX"` or `"implement review
EUDPA-XXXXX {repo}"` (optional repo filter).

---

## Step 1: Load the Fix List

Pull every item with Disposition=`Fix` and Status=`Not Done` (or
`Failed` from a prior run that should be retried):

```bash
~/git/defra/trade-imports-workspace/tools/review/review-items.sh EUDPA-XXXXX --filter fix --status not-done --json
```

Apply any filters from the trigger:
- `{repo}` — add `--repo {repo}`

If the fix list is empty:
```
No Fix-disposition items pending for EUDPA-XXXXX [{repo filter}]. Run `walk review EUDPA-XXXXX` first, or call `review-mark.sh --disposition Fix` directly for items you've already triaged.
```
And stop.

---

## Step 2: Report Starting State

```
Implementing fixes for EUDPA-XXXXX [{repo filter}]
Queued fixes: [N] ([breakdown by repo])

Order: [list of item numbers]

No input needed — running all fixes now.
```

---

## Step 3: Pre-flight Test Check

Before making any changes, run tests for each repo that has queued
fixes. Always redirect output to a tmp file and read it once — never
grep streaming output or re-run to check partial results.

### Node.js repos (frontend, admin, tests)

Unit tests:
```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/{repo} test > /tmp/{repo}-unit-tests-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
Then read the file you just created.

E2E tests:
```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run test:docker-compose > /tmp/e2e-tests-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
Then read the file you just created for the summary. If failures exist,
do NOT grep the console output — find and read the structured Playwright
artifacts instead:
```bash
find ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests/test-results -name "error-context.md"
```

### Java repo (backend)
Runs surefire (unit `*Test`) and failsafe (integration `*IT`,
Testcontainers-backed) in one pass:
```bash
mvn -f ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-backend/pom.xml verify > /tmp/backend-tests-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
Then read the file you just created. Confirm both `Tests run:` totals
(surefire and failsafe) and `BUILD SUCCESS`.

**If tests fail in any repo:**
```
CANNOT START: pre-existing test failures in {repo}
Unit: [pass/fail summary]
Integration: [pass/fail summary, backend only]
E2E: [pass/fail summary]

Resolve failures before running the implementor.
```
And stop. Do not attempt any fixes.

---

## Step 4: Apply Fixes (one at a time, sequential)

Process fixes in item-number order within each repo.

For each item, spawn a `general-purpose` Task subagent. Spawn prompt:

```
Follow the instructions in ~/git/defra/trade-imports-workspace/.claude/skills/review/references/REVIEW_ITEM_FIXER.md.

**Ticket:** EUDPA-XXXXX
**Item:** #{N}
**Repo:** {repo-name}
**File:** {path/to/file}
**Line:** {NN}
**Issue:** {issue text from the items table}
**Fix:** {fix text from the items table}
```

Wait for the subagent to return before spawning the next one (fixes
within the same repo may affect shared files or tests).

### Handling fixer results

| Result | Action |
|--------|--------|
| `DONE` | `~/git/defra/trade-imports-workspace/tools/review/review-set-status.sh EUDPA-XXXXX --repo {repo} --item {N} --status Done --note "{short-sha}"` |
| `SKIPPED` | `~/git/defra/trade-imports-workspace/tools/review/review-mark.sh EUDPA-XXXXX --repo {repo} --item {N} --disposition "Auto-Resolved" --note "{what was found}"` |
| `FAILED` | `~/git/defra/trade-imports-workspace/tools/review/review-set-status.sh EUDPA-XXXXX --repo {repo} --item {N} --status Failed --note "{reason}"` |
| `CANNOT START` | **Stop immediately.** Report pre-existing failures. Ask user to resolve before re-running. |
| `WON'T FIX` | `~/git/defra/trade-imports-workspace/tools/review/review-mark.sh EUDPA-XXXXX --repo {repo} --item {N} --disposition "Won't Fix" --note "{reason}"` |

---

## Step 4.5: Handoff branch detection

Before the final report, check whether this implementor session is
running on a review-handoff branch (set up by `share-review.sh` during
the reviewer's FRESH Step 5.5):

```bash
git -C ~/git/defra/trade-imports-workspace rev-parse --abbrev-ref HEAD
```

If the branch name is exactly `chore/EUDPA-XXXXX` (matching this
ticket), the session is running in **handoff context** — note that
fact for Step 5.

The handoff branch lives on the workspace repo (not on any sub-repo),
so detection runs against the workspace, not `repos/{repo}`.

---

## Step 5: Final Report

```
Implementation complete for EUDPA-XXXXX [{filters}].

Results:
  ✅ Fixed:          N items
  🔍 Auto-resolved:  N items (already fixed in code)
  ❌ Won't Fix:      N items (fixer determined not applicable)
  🔥 Failed:         N items

Fixed:
  #{N} [{repo}] — {description} ({short-sha})
  ...

Failed (Status=Failed in the items table — re-run to retry):
  #{N} [{repo}] — {reason}
  ...

Run `~/git/defra/trade-imports-workspace/tools/review/review-counts.sh EUDPA-XXXXX` for the updated breakdown.
```

---

## Step 6: Handoff branch cleanup (handoff context only)

If Step 4.5 flagged this session as handoff context, offer cleanup now.
Skip this step entirely otherwise.

Prompt the user:

```
This session ran on the handoff branch chore/EUDPA-XXXXX. The review
items have been actioned and committed in the sub-repos. Clean up the
handoff branch?

Delete local handoff branch and switch back to main? [Y/n]
```

On `Y` (default): switch the workspace back and delete the local
branch.

```bash
git -C ~/git/defra/trade-imports-workspace checkout main
```

```bash
git -C ~/git/defra/trade-imports-workspace branch -D chore/EUDPA-XXXXX
```

On `n`: skip both prompts.

Then ask about the remote:

```
Delete the remote handoff branch (origin/chore/EUDPA-XXXXX) too? [y/N]
```

Default is **No** — the reviewer may still want to refer back to it.
On `y`:

```bash
~/git/defra/trade-imports-workspace/tools/github/delete-remote-branch.sh trade-imports-workspace chore/EUDPA-XXXXX
```
