# STYLE_IMPLEMENTOR

## Goal

Implement **all open Fix items for a single file** in one batch — read
the file once, verify each violation, run pre-tests once, apply every
applicable fix in a single editing pass, run post-tests once, mark each
item's outcome, and commit once.

Your prompt specifies the ticket, repo, file, and a JSON array of items.

Paths anchored on `~/git/defra/trade-imports-workspace` — compute via the `find_workspace_root`
helper in `docs/agent-skills.md`.

## Success criteria

- Every applicable Fix item is either applied (status `Done`, tagged with the commit SHA) or explicitly dispositioned (`Auto-Resolved` / `Won't Fix`) — no item left silently untouched.
- Only the listed items change; no unrelated reformatting, no fixes invented beyond the input array.
- The file's tests (unit + E2E) pass after your edits; if your change breaks them you revert and mark the items `Failed` rather than leaving the tree red.
- Exactly one commit for the file, referencing the item IDs.
- Every item's canonical JSON status reflects what actually happened.

## Required output

Artefact: item outcomes written to the canonical JSON via
`style-set-status.sh` / `style-mark.sh`, and one commit for the file.

Return a per-item summary — use whichever of these shapes matches the
result, verbatim:

```
{repo}/{file}: {N_done} done, {N_skipped} auto-resolved, {N_failed} failed
  #117 → Done (commit abc123)
  #121 → Done (commit abc123)
  #92  → Auto-Resolved (already fixed)
  #58  → Won't Fix (deliberate codebase choice — type augmentation)
```

Or on pre-existing failure:
```
CANNOT START: {repo}/{file} — pre-existing test failures
```

Or on broken-by-fix:
```
{repo}/{file}: 0 done, 0 auto-resolved, {N} failed
Reason: unit tests broke after change, all items reverted
  #117 → Failed (reverted)
  #121 → Failed (reverted)
```

---

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Inputs (from spawn prompt)

- **Ticket:** EUDPA-XXXXX
- **Repo:** trade-imports-animals-{frontend|admin|...}
- **File:** path/to/file.js (relative to repo root)
- **Items:** JSON array of `{id, rule, severity, issue, fix, line, notes}` objects.

---

## Step 1: Verify Each Violation

Read the file at `~/git/defra/trade-imports-workspace/repos/{repo}/{file}` once.

For each item in the input array, decide whether the violation is
**still present** in the current file:

- Search for the specific pattern named in the issue (function name, variable name, literal value, `function` declaration, `||` operator, etc.).
- Build two lists:
  - `applicable_items` — violations that are present and you intend to fix
  - `skipped_items` — violations that are no longer present (already fixed by earlier work, or inapplicable now)

If `applicable_items` is empty (every item is already fixed):

- For each item in `skipped_items`:
  ```bash
  ~/git/defra/trade-imports-workspace/tools/style/style-mark.sh EUDPA-XXXXX --repo {repo} --item {id} \
    --disposition Auto-Resolved --note "violation not found"
  ```
- Return: `{repo}/{file}: 0 done, {N} auto-resolved, 0 failed` and stop.

---

## Step 2: Pre-Check Tests

> Note: the `npm` test commands below are for the Node repos
> (frontend/admin/tests). For a `.java` file in a Java repo, substitute
> the repo's Maven test (`mvn -f ~/git/defra/trade-imports-workspace/repos/{repo} test`)
> and skip the E2E `test:docker-compose` step unless the change is behavioural.

Run unit tests in the relevant repo:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/{repo} test > /tmp/style-pre-{repo}.log 2>&1
```

Run E2E tests:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run test:docker-compose > /tmp/style-pre-e2e.log 2>&1
```

Read each log file once.

**If any tests fail:** do NOT proceed. Return:
```
CANNOT START: {repo}/{file} — pre-existing test failures
Unit: [pass/fail]
E2E: [pass/fail]
```

For E2E failures, also read
`~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests/test-results/*/error-context.md`
to confirm the failure isn't related to the file you're about to touch.

---

## Step 3: Apply All Fixes in One Pass

Make the **minimal** change for each item in `applicable_items`. Don't
fix anything not in the input list. Don't reformat unrelated code.

The common per-rule fix patterns and the ordering rule (shape-changing
fixes before renames) live in the sibling cheat-sheet:
`~/git/defra/trade-imports-workspace/.claude/skills/code-style/assets/style-implementor-cheat-sheet.md`.
Those patterns are **JS/Node examples — illustrative, not universal law**.
Consult the best-practices file for your file's language for the full
rule text, e.g.
`~/git/defra/trade-imports-workspace/docs/best-practices/node/code-style.md` for JS,
`~/git/defra/trade-imports-workspace/docs/best-practices/java/modern-java.md` for Java.

After all edits, format the file. **Prettier applies to JS/`.njk` files
only — never run a `.java` file through Prettier.** For a
`.js`/`.mjs`/`.cjs`/`.jsx`/`.njk`/spec file:

```bash
~/git/defra/trade-imports-workspace/repos/{repo}/node_modules/.bin/prettier --write ~/git/defra/trade-imports-workspace/repos/{repo}/{file}
```

For a `.java` file, skip Prettier — the repo's own build/format step
(e.g. Spotless via `mvn`) owns formatting; do not reformat by hand.

---

## Step 4: Post-Check Tests

Run unit tests:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/{repo} test > /tmp/style-post-{repo}.log 2>&1
```

Run E2E tests:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests run test:docker-compose > /tmp/style-post-e2e.log 2>&1
```

**If unit tests fail:**

- Revert the file: `git -C ~/git/defra/trade-imports-workspace/repos/{repo} checkout -- {file}`
- For each item in `applicable_items`:
  ```bash
  ~/git/defra/trade-imports-workspace/tools/style/style-set-status.sh EUDPA-XXXXX --repo {repo} --item {id} \
    --status Failed --note "unit tests broke after change, reverted"
  ```
- Return: `{repo}/{file}: 0 done, 0 auto-resolved, {N} failed`

**If E2E tests fail:**

- Read `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-tests/test-results/*/error-context.md` to determine if the failure is related to your change.
- If related: revert as above and mark all `applicable_items` Failed.
- If unrelated (pre-existing flaky test or different feature): note it and continue.

---

## Step 5: Commit

One commit per file. Use the Item IDs in the message. Each git op
is a separate Bash call — no `cd && git`.

```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} add {file}
```

```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} commit -m "style(EUDPA-XXXXX): {file} — {N} items

Items: #{id1}, #{id2}, #{id3}

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

If the pre-commit hook fails due to Prettier (JS/`.njk` only — a `.java`
file is never Prettier-formatted):
```bash
~/git/defra/trade-imports-workspace/repos/{repo}/node_modules/.bin/prettier --write ~/git/defra/trade-imports-workspace/repos/{repo}/{file}
```
```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} add {file}
```
Then create a NEW commit (do NOT amend).

Capture the short SHA:
```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} rev-parse --short HEAD
```

---

## Step 6: Mark Each Item's Outcome

For each item in `applicable_items`:

```bash
~/git/defra/trade-imports-workspace/tools/style/style-set-status.sh EUDPA-XXXXX --repo {repo} --item {id} \
  --status Done --note "{short-sha}"
```

For each item in `skipped_items`:

```bash
~/git/defra/trade-imports-workspace/tools/style/style-mark.sh EUDPA-XXXXX --repo {repo} --item {id} \
  --disposition Auto-Resolved --note "violation not found"
```

If during Step 1 you decided an item is a **per-item judgement won't-fix**
(e.g. the suggested fix would harm correctness or contradicts a
deliberate codebase choice):

```bash
~/git/defra/trade-imports-workspace/tools/style/style-mark.sh EUDPA-XXXXX --repo {repo} --item {id} \
  --disposition "Won't Fix" --note "<one-line reason>"
```
