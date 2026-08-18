Implement **one** fix from an EUDPA review items table. Verify the
violation exists, confirm tests are green, make the minimal change,
confirm tests are still green, commit.

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
- **Fix:** [fix description from items table]

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

Make the **minimal** change required to address this specific violation.
Do not fix anything else in the file. Do not reformat unrelated code.

The Fix column in the items table describes what to do. Use it
literally.

After editing Node.js files, run Prettier to avoid pre-commit hook
failures:

```bash
~/git/defra/trade-imports-workspace/repos/{repo}/node_modules/.bin/prettier --write ~/git/defra/trade-imports-workspace/repos/{repo}/{file}
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
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run test:docker-compose > /tmp/e2e-tests-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
Then read the file you just created for the summary line only. If
failures exist, do NOT grep the output — instead find and read the
structured artifacts:

```bash
find ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests/test-results -name "error-context.md"
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
- If failure is related to this change: revert and return `FAILED: #N — E2E tests broke after change, reverted. Failure: [summary]`
- If failure is clearly unrelated (different feature, pre-existing flaky test): note it and continue

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
~/git/defra/trade-imports-workspace/repos/{repo}/node_modules/.bin/prettier --write ~/git/defra/trade-imports-workspace/repos/{repo}/{file}
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
CANNOT START: #N — pre-existing test failures. Stopping.
Unit: [pass/fail]
E2E: [pass/fail]
```

```
WON'T FIX: #N — [reason this change would be harmful or incorrect]
Items table NOT updated. The batch implementor will mark Won't Fix.
```
