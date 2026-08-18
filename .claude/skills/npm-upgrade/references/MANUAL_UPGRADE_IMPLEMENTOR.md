Implement **one** manual npm package upgrade end-to-end. Read the
planner's notes, install + edit the minimum needed to make the
target version work, run tests, commit. On failure: revert and
record why.

Your prompt names the run, repo, package, current/target versions,
files-affected hint and required-changes summary, plus the
context-bundle directory.

Paths anchored on `~/git/defra/trade-imports-workspace` — compute via the
`find_workspace_root` helper in `docs/agent-skills.md`.

---

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Boundaries

- One package. No scope creep into unrelated tidy-ups.
- Minimal edits. Address the breaking change; do not reformat
  surrounding code.
- Never skip tests.
- Never push commits — local commits only.
- Never `git --amend` an earlier commit; create a new one.

## Inputs (from spawn prompt)

- `{run-id}`, `{repo}`, `{package}`, `{current}`, `{target}`
- `files_affected` — list of paths the planner identified
- `changes_required_summary` — one-line description from the planner
- Context bundle: `~/git/defra/trade-imports-workspace/workareas/npm-upgrades/{run-id}/{repo}/.context/{normalized-package}/`

---

## Step 1: Mark inprogress + claim the lane

```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-set-status.sh \
  --run-id {run-id} --repo {repo} --package {package} --status inprogress
```

---

## Step 2: Pre-flight checks

```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} status --porcelain -uno
```

If non-empty: stop. Return `CANNOT START: uncommitted changes`.

**Skip the baseline `npm test` when `{repo}` is
`trade-imports-animals-tests`.** That repo has no unit-test suite —
it IS the E2E suite. The WALKER runs `npm run test:docker-compose` once
at end of batch as the integration gate.

For every other repo:

```bash
~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo {repo} test > /tmp/baseline-{repo}-{package-normalized}.log 2>&1
```

If baseline fails: stop. Mark status=failed with reason "baseline
broken; not an upgrade issue". Return `CANNOT START: baseline broken`.

---

## Step 3: Read the context

- `.context/{normalized-package}/package-meta.json`
- `.context/{normalized-package}/changelog.md` (if present)
- `.context/{normalized-package}/usages.txt`

Cross-reference `files_affected` from the planner with `usages.txt`.
If usages.txt found more files than the planner listed, include the
extras in your edit pass.

---

## Step 4: Install the target

```bash
~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo {repo} install {package}@{target}
```

If install fails (peer conflict, network etc.):

- Mark status=failed with reason "install failed: {brief error}".
- Return `FAILED: {package} — install error: {brief}`.

---

## Step 5: Make the code changes

Open every file in `files_affected` (plus any usages.txt hits the
planner missed). Apply the **minimal** changes described in
`changes_required_summary` and the changelog.

After editing Node.js files, run Prettier to avoid pre-commit hook
failures:

```bash
~/git/defra/trade-imports-workspace/repos/{repo}/node_modules/.bin/prettier --write {edited-file}
```

(One Bash call per file.)

---

## Step 6: Run tests

**Skip this entire step when `{repo}` is `trade-imports-animals-tests`** —
no unit-test suite exists. Commit straight through to Step 7; the
WALKER runs `npm run test:docker-compose` once at end of batch and reports
any regression there.

For every other repo:

```bash
~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo {repo} test > /tmp/upgrade-{repo}-{package-normalized}.log 2>&1
```

Read the log file you just created.

If unit tests pass: continue to Step 7.

If unit tests fail:

```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} checkout -- .
```

```bash
~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo {repo} install
```

Verify rollback:

```bash
~/git/defra/trade-imports-workspace/tools/npm/npm-in-repo.sh --repo {repo} test > /tmp/rollback-verify-{repo}-{package-normalized}.log 2>&1
```

If rollback verification passes:
- Mark status=failed with reason "tests failed after upgrade: {brief}".
- Return `FAILED: {package} — tests broke, reverted. {brief failure}`.

If rollback verification ALSO fails — cascade:
- Mark status=failed with reason "CASCADE: rollback failed; repo is in inconsistent state".
- Return `CASCADE: {package} — rollback failed, manual intervention required`.

---

## Step 7: Commit

```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} add package.json package-lock.json
```

```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} add {each-edited-file}
```

(One add per edited file is fine — keeps the staged diff explicit.)

```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} commit -m "Upgrade {package} {current} → {target}

{short description of the API changes you made}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

If the pre-commit hook fails due to Prettier, re-run prettier on
the offending file, re-add, and create a NEW commit (do NOT --amend).

Capture the short SHA:

```bash
git -C ~/git/defra/trade-imports-workspace/repos/{repo} rev-parse --short HEAD
```

Mark done:

```bash
~/git/defra/trade-imports-workspace/tools/npm/packages-set-status.sh \
  --run-id {run-id} --repo {repo} --package {package} --status done --commit-sha {short-sha}
```

---

## Output

Return exactly one of:

```
DONE: {package} → {target}
Repo: {repo} | Commit: {short-sha}
```

```
FAILED: {package} — {reason}. {Reverted | Demoted}.
```

```
CASCADE: {package} — rollback failed, manual intervention required.
```

```
CANNOT START: {package} — {pre-flight failure}.
```

```
SKIPPED: {package} — {reason this upgrade should not be applied}.
```

The walker reads these strings to roll up the batch summary.
