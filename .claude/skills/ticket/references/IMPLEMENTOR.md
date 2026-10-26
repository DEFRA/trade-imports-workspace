# Implementor — apply the plan

Role: Implement ticket following a plan. Produce clean, well-tested code.

**Critical:** Follow the plan's decisions, homes and owners. Names and
code shape are yours: the plan describes jobs, and you choose names
that say what the code returns and changes. Verify assumptions, adapt
as needed, document deviations.

Every line you write or touch meets the house rules in
`~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md`.
Read that file before you start.

**Bash call hygiene** — one command per Bash call. Full rule table: `~/git/defra/trade-imports-workspace/docs/agent-skills.md` → "Bash call hygiene".

## Before You Start

One dispatch — asserts the plan exists, re-validates detect-tech per
repo, caches the PR diff if a prior PR for the ticket exists, and emits
`.implement-meta.json`:

```bash
~/git/defra/trade-imports-workspace/tools/ticket/prepare-implement.sh EUDPA-XXXXX
```

Then read in this order:

1. `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/plan.md`
2. `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/ticket.md`
3. `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/.implement-meta.json` (tech list per repo)
4. `~/git/defra/trade-imports-workspace/workareas/ticket-planning/EUDPA-XXXXX/best-practices/<repo>.md` (pre-baked at plan time)
5. `~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md` (house rules)
6. Check the plan against
   `~/git/defra/trade-imports-workspace/.claude/skills/ticket/assets/plan-review-checklist.md`.
   If an item fails, fix the plan first and note the change under
   `## Implementation Notes`.
7. Verify `[ASSUMPTION]` and `[NEEDS VERIFICATION]` items in the plan
8. **Run all tests.** A failing test is yours to fix before you start, in
   its own commit (`CLAUDE.md` rule 6). Showing the same failure on
   `origin/main` tells you the cause, not that you may leave it.

Redirect output to a tmp file and read the file once — don't grep streaming output:

```bash
# Java (backend / stub / reference-data)
mvn -f ~/git/defra/trade-imports-workspace/repos/<repo>/pom.xml verify > /tmp/<repo>-pre-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
```bash
# Node unit (frontend / admin)
npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> test > /tmp/<repo>-pre-$(date +%Y%m%d-%H%M%S).txt 2>&1
```
```bash
# E2E (only when changing tests repo or cross-cutting code)
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run test:docker-compose > /tmp/e2e-pre-$(date +%Y%m%d-%H%M%S).txt 2>&1
```

## Implementation

### Branch Setup

One allowlisted dispatch — fetch / checkout base / pull / checkout -b. The
helper produces `<type>/EUDPA-XXXXX-<slug>`, where `--type` is `feat`
(the default), `fix` or `chore`, and keeps the EUDPA-* prefix as given
(don't strip it on split branches). Use the same branch name in every
repo the ticket touches.

```bash
~/git/defra/trade-imports-workspace/tools/ticket/setup-branch.sh EUDPA-XXXXX --repo <repo-name> --slug <description> --type feat
```

Optional `--base <branch>` if branching from anything other than `main`.

### For Each Step

1. Run tests (baseline)
2. Read existing code, find the owner the plan names
3. Make the change through that owner
4. Run tests again
5. Add tests for new functionality, extending the shared helper the
   plan names
6. Comment pass (below)

### Code Standards

The house rules in `.claude/rules/code-quality.md` apply to every line
you write or touch. In short:

- A name predicts what the code returns and changes. No positional
  boolean flags, no metaphors. One concept keeps one name across
  layers and twin repos; a rename covers the whole vocabulary.
- No ticket keys, backlog or AC ids, release names or session words in
  code, comments or test titles. No history: no before/after
  narration, no `REMOVED_*`, no "renamed from".
- Set-up used by two tests goes in the shared helper. Promoting a
  helper deletes the local copies. Never paste a shared helper's body
  into a test file.
- Every branch that changes an outcome logs once, with the ids support
  searches by. Log the throwable or `{ err }`, never only
  `getMessage()`. No request or response bodies at INFO.
- A test title states what its assertions prove, and the test fails
  without the change it covers.
- Follow tech-specific best practices at `~/git/defra/trade-imports-workspace/docs/best-practices/`: `gds/`, `java/`, `node/`, `playwright/`, `k6/`, `rest-api/`, `doc-comments/`, `docker-compose.md`. Where a nearby file breaks a house rule, do not copy it.

### Comment pass: delete first

After each step, walk every comment in the code you touched: the
hunks you changed, about 10 lines either side, and the JSDoc or
Javadoc of every function you changed.

1. **Delete** any comment that describes callers, other modules, the
   backend, a library, the UI or a test; that counts things ("the one",
   "the only"); that narrates history; or that carries a ticket or
   backlog id.
2. If a comment explains what a name means, the name is the problem.
   Rename or extract, then delete the comment. Never reword it.
3. Keep a comment only when it describes the lines directly below it
   and no name or extraction can say the same.

Add no new explanatory comments. Rationale belongs in the repo's
`docs/`, the plan or the commit message.

Example, from `check-answers/controller.js`:

```javascript
// Bad
// c-201: an amendment opens with no errors; Continue refused shows them.
const holdsSilently = readOnly || (journey.status === state.AMEND && !refused)

// Good
const hidesAnswerErrors = readOnly || (journey.status === state.AMEND && !refused)
```

The comment carried a backlog id and decoded a name that hid what the
value decides. The fix is the name, and no comment.

### Verification

Unit tests, lint and the E2E suite. Never verify by hand in a browser.
If a behaviour has no E2E cover, add or extend a spec in
`repos/trade-imports-ins-tests` and run it with
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run test:docker-compose`.

## When Plan is Wrong

**Minor:** Fix and note in plan under "## Implementation Notes"
**Significant:** Stop, update plan with reasoning
**Blocker:** Ask user for guidance

```markdown
## Implementation Notes
### Deviations
**Step X - Planned:** [X] **Actual:** [Y] **Reason:** [Z]
### Discoveries
- [Something learned]
```

## GitHub Actions Verification

```bash
~/git/defra/trade-imports-workspace/tools/github-actions/trigger-workflow.sh <repo-name> ci.yml <branch-name>
~/git/defra/trade-imports-workspace/tools/github-actions/wait-for-run.sh <repo-name> <run-id> 1800
```

A red e2e check on the PR comes from the repo's `e2e-tests.yml`, which runs
after Publish Branch Image, not from `ci.yml`. Read it against the repo's
entry in `~/git/defra/trade-imports-workspace/config/e2e-tests-pr-scope.json`
and `~/git/defra/trade-imports-workspace/docs/testing/e2e-tests-gh-actions.md`.
PR runs leave out `@a11y`, `@active` and `@dynamics`.

## Completion Checklist

- [ ] All AC met
- [ ] Tests pass (before and after), E2E included
- [ ] Comment pass done on every touched file
- [ ] No ticket keys, ids or history in code, comments or test titles
- [ ] Docs, recipes and JSDoc the plan listed as made untrue are updated
- [ ] Build succeeds / GitHub Actions green
- [ ] Plan updated with deviations

## Output

```
Complete: EUDPA-XXXXX
Repos: [list] | Files: [count] | Tests added: [count]
Deviations: [list or none]
Next: Create PR, request review
```

## Don'ts

- Don't blindly follow plan - verify as you go
- Don't keep a name from the plan, or from a sibling file, that does
  not say what the code does
- Don't skip tests or ignore failures
- Don't reword a stale comment; delete it
- Don't make unrelated changes
- Don't leave plan outdated
