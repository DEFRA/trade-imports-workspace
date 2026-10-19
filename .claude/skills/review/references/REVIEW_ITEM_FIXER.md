Implement **one** fix from an EUDPA review items table. Verify the
violation exists, make the change that makes the item's Must true,
confirm tests are green, commit.

Read `~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md`
in full before you edit. What you write must meet it.

Your prompt specifies the ticket, item, repo, file, line, issue, and fix.

Paths anchored on `~/git/defra/trade-imports-workspace` — compute via the `find_workspace_root`
helper in `docs/agent-skills.md`.

---

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Inputs (from spawn prompt)

- **Ticket:** EUDPA-XXXXX
- **Item:** #N
- **Repo:** trade-imports-animals-{frontend|backend|admin|tests}
- **File:** path/to/file (relative to repo root)
- **Line:** NN
- **Issue:** [description from items table]
- **Fix:** [fix description from items table], written as
  `Must: … One way: …`. Older items may hold one sentence with no
  labels; treat that sentence as the Must.

---

## Step 1: Verify the Violation Exists

Read the file from the live repo:

```
~/git/defra/trade-imports-workspace/repos/{repo}/{file}
```

Check whether the specific violation described in the Issue is present
at or near the reported line. Look for the exact pattern named
(function, variable, operator, attribute, expression, etc.).

**If NOT present** (already fixed or inapplicable):
- Return immediately: `SKIPPED: #N — violation not found in current file`
- Do NOT update docs or commit

**If present:** continue to Step 2.

---

## Step 2: SKIPPED

Pre-check skipped — the batch implementor runs a clean pre-flight test
before spawning fixers. Proceed directly to Step 3.

---

## Step 3: Make the Change

Make the change that makes the **Must** true. The **One way** is a
suggestion: follow it when it is the cleanest route, and choose a
better one when it is not. Do not fix other items in the file, and do
not reformat unrelated code.

Before you add a guard, a helper, a constant or a log line, search the
file and its callers for one that already does the job. If one
exists, use it or extend it. Three review items once became three
guards that failed three different ways; one owner would have done.

### Comment findings

1. **Delete first.** Remove the comment. Re-read the lines below it.
   If they still read clearly, you are done.
2. **If the comment decoded a name**, the finding is the name. Rename
   the function, variable or constant until the comment is not
   needed, or extract the block into a function whose name says what
   it does. Remove the comment in the same change. Rename the
   concept's whole vocabulary (every caller, test and twin), not one
   site.
3. **Never reword and spread.** Do not rewrite the comment in new
   words, move it to another place, or copy it to callers, tests or
   the twin repo.

Bad, then good, from this codebase:

```js
// c-201: an amendment opens with no errors; Continue refused shows them.
const holdsSilently = readOnly || (journey.status === state.AMEND && !refused)
```

```js
const hidesAnswerErrors = readOnly || (journey.status === state.AMEND && !refused)
```

The comment goes. The new name says what the flag does for every
state it covers, so no comment is needed to decode it.

After editing Node.js files, run Prettier to avoid pre-commit hook
failures:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/{repo} run format > /tmp/{repo}-format.log 2>&1
```

---

## Step 4: Run Tests (Post-check)

Always redirect test output to a tmp file and read it once — never grep
streaming output or re-run to check partial results.

### Node.js repos

Unit tests:
```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/{repo} test > /tmp/{repo}-unit-tests-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
Then read the file you just created.

E2E tests (run after any change that could affect the user journey):
```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run test:docker-compose > /tmp/e2e-tests-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
Then read the file you just created for the summary line only. If
failures exist, do NOT grep the output — instead find and read the
structured artifacts:

```bash
find ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests/test-results -name "error-context.md"
```

Read each `error-context.md` to diagnose what actually failed.

### Java repo
```bash
mvn -f ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-backend/pom.xml test > /tmp/backend-unit-tests-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
Then read the file you just created. Surefire also writes per-class
reports to `target/surefire-reports/`.

**If unit tests fail:**
- Revert: `git -C ~/git/defra/trade-imports-workspace/repos/{repo} checkout -- {file}`
- Return: `FAILED: #N — unit tests broke after change, reverted`

**If E2E tests fail:**
- Read `error-context.md` artifacts as above — do not try to diagnose from console tail
- Prove whether your change caused it. Save your change first with
  `git -C ~/git/defra/trade-imports-workspace/repos/{repo} diff --output=/tmp/{repo}-item-{N}.patch -- {file} {every other file you edited}`,
  then revert only those files with
  `git -C ~/git/defra/trade-imports-workspace/repos/{repo} checkout -- {file} {every other file you edited}`.
  Stash nothing. Run the failing spec again to a new file, and read it.
  - Green without your change: your change caused it. Return
    `FAILED: #N — E2E tests broke after change, reverted. Failure: [summary]`.
  - Still red without your change: re-apply your change with
    `git -C ~/git/defra/trade-imports-workspace/repos/{repo} apply /tmp/{repo}-item-{N}.patch`, commit it
    (Step 5), and return `RED` (below) so the batch implementor fixes
    the failure before the next item. Never call it flaky, unrelated
    or pre-existing and carry on.

---

## Step 5: Commit

Each git operation is a separate Bash call — no `cd && git`.

```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} add {file}
```

```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} commit -m "fix(EUDPA-XXXXX): [concise description of what was fixed]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

If the pre-commit hook fails due to Prettier:
```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/{repo} run format > /tmp/{repo}-format.log 2>&1
```
```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} add {file}
```
Then retry the commit (a NEW commit; do NOT `--amend`).

---

## Output

Return exactly one of:

```
DONE: #N — [brief description of change]
Repo: {repo} | File: {file} | Commit: {short-sha}
```

```
SKIPPED: #N — violation not found in current file
```

```
FAILED: #N — [reason]. Change reverted.
```

```
RED: #N — [brief description of change] committed; a test is red without it too.
Repo: {repo} | File: {file} | Commit: {short-sha}
Failing: [spec file and test title] — [one-line cause from error-context.md]
```

```
WON'T FIX: #N — [reason this change would be harmful or incorrect]
Items table NOT updated. The batch implementor will mark Won't Fix.
```

For a code-quality item (`naming`, `comments`, `structure`,
`duplication`, `logging`, `test-readability`, `history`), the reason
must quote the code, with its file:line, that shows the finding is
factually wrong. Taste, "pre-existing", "out of scope", "a nearby file
does it", the plan or an earlier decision is not a reason: fix it.
