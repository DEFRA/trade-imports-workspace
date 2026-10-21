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
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run test:docker-compose > /tmp/e2e-tests-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
Then read the file you just created for the summary. If failures exist,
do NOT grep the console output — find and read the structured Playwright
artifacts instead:
```bash
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests/test-results -name "error-context.md"
```

### Java repo (backend)
Runs surefire (unit `*Test`) and failsafe (integration `*IT`,
Testcontainers-backed) in one pass:
```bash
mvn -f ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-backend/pom.xml verify > /tmp/backend-tests-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
Then read the file you just created. Confirm both `Tests run:` totals
(surefire and failsafe) and `BUILD SUCCESS`.

**If tests fail in any repo: fix first, then continue.** A red test on
the branch is ours to fix, whoever caused it and whenever. "Pre-existing",
"flaky", "unrelated" and "separate issue" are not reasons to stop or
skip.

1. Report what is red:
   ```
   RED BEFORE FIXES: {repo}
   Unit: [pass/fail summary]
   Integration: [pass/fail summary, backend only]
   E2E: [pass/fail summary]
   Fixing these first.
   ```
2. Diagnose from the structured artifacts (`error-context.md`,
   Surefire and Failsafe reports), never from console output. A test
   that fails differently on each run points to a race to find, not
   to the environment.
3. Fix the cause in the repo it lives in, on the current branch. Commit
   it on its own, before any review item, with a message that names
   the failing test.
4. Re-run the same suite to a new file and read it. Repeat until
   green.
5. Continue to Step 4.

Stop only when the fix needs something you cannot do from here (a
credential, a platform change, a decision that belongs to someone
else). Then report exactly what is red, what you tried, and what is
needed.

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

Pass the Fix text whole. Its **Must** is what the fixer has to make
true; its **One way** is a suggestion the fixer may improve on.

Fixes are applied by default and reported after. Use `Discuss` only for
a genuine engineering trade-off. A choice between GOV.UK guidance and
what the page does is not one: follow GOV.UK.

Wait for the subagent to return before spawning the next one (fixes
within the same repo may affect shared files or tests).

### Handling fixer results

| Result | Action |
|--------|--------|
| `DONE` | `~/git/defra/trade-imports-workspace/tools/review/review-set-status.sh EUDPA-XXXXX --repo {repo} --item {N} --status Done --note "{short-sha}"` |
| `SKIPPED` | `~/git/defra/trade-imports-workspace/tools/review/review-mark.sh EUDPA-XXXXX --repo {repo} --item {N} --disposition "Auto-Resolved" --note "{what was found}"` |
| `FAILED` | `~/git/defra/trade-imports-workspace/tools/review/review-set-status.sh EUDPA-XXXXX --repo {repo} --item {N} --status Failed --note "{reason}"` |
| `RED` | `review-set-status.sh ... --status Done --note "{short-sha}"` for the item, then fix the failing test as in Step 3 (fix first, then continue) before spawning the next fixer. |
| `WON'T FIX` | `~/git/defra/trade-imports-workspace/tools/review/review-mark.sh EUDPA-XXXXX --repo {repo} --item {N} --disposition "Won't Fix" --note "{reason}"` |

---

## Step 4.5: Handoff branch detection

Before the final report, check whether this implementor session is
running on a review-handoff branch (set up by `share-review.sh` during
the reviewer's FRESH Step 7 for a PR the reviewer didn't author):

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
  🧪 Red tests fixed: N (commits listed below)

Fixed:
  #{N} [{repo}] — {description} ({short-sha})
  ...

Failed (Status=Failed in the items table — re-run to retry):
  #{N} [{repo}] — {reason}
  ...

Red tests fixed:
  [{repo}] {spec or test class} — {cause} ({short-sha})
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
