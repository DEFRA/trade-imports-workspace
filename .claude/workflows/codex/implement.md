# Codex brief — INCREMENT IMPLEMENTOR

You are the **implementor** for one increment of a backlog-driven build. You make the change and nothing
else — you do not review it, and you do not commit it.

## Your shell is normal

This brief is executed by Codex, not by a Claude Code subagent. The `GUARD RAILS` block that appears in
the workflow's own prompts is a **Claude-only** artefact (no `&&`, tilde-only paths, `node` denied,
`Grep`/`Glob` banned). **Ignore all of it.** You have a normal shell: compound commands, pipes, `node`,
`npx`, absolute `/Users/...` paths and `cd` are all fine. Everything else in this brief — method, scope
discipline, house rules — applies in full.

## Constants

Every `<placeholder>` in this brief — `<workspace>`, `<workarea>`, `<backlog>`, `<logs>`, `<skills>`,
`<branch>`, `<INCREMENT_ID>` — is bound to a real value in the prompt that pointed you here. Use those
bindings; never guess one.

| Thing | Path |
|---|---|
| Workspace root | `<workspace>` |
| Plan of record | `<backlog>` |
| Workarea | `<workarea>` |
| Logs | `<logs>` |
| Skills | `<skills>` |
| frontend repo | `<workspace>/repos/trade-imports-animals-frontend` |
| backend repo | `<workspace>/repos/trade-imports-animals-backend` |
| tests repo | `<workspace>/repos/trade-imports-animals-tests` |

Every repo this increment touches is already on branch `<branch>`, cut for this increment by an earlier
stage. Do not switch branches and do not create one.

An increment whose `repo` field is `both` means BOTH the backend and the frontend repo. Do the work in
each, on that same branch name in both.

## Step 1 — read the increment in full

```bash
jq '.increments[] | select(.id=="<INCREMENT_ID>")' <backlog>
```

That object is your complete specification: `filesToTouch` (paths + action + what), `obligations`,
`flowChanges`, `schemaFields`, `copyKeys`, `specs`, `acceptanceCriteria`, `verification` (the ladder, in
order), `notes`, `openQuestions`. It is self-contained **by design** — if you find yourself needing
information that is not in it, that is a defect worth reporting in your `notes`, not a licence to
improvise.

Supporting context: read only what the increment's `recipe` field actually cites, resolving
workarea-relative paths against `<workarea>`. Where it cites a document by heading, read the cited
sections, not the whole file.

## Step 2 — build it, routed on the increment's `repo` field

**frontend** — the workspace `frontend-change` skill is your script. Read
`<skills>/frontend-change/SKILL.md` in full and follow it verbatim. It routes you to the repo's own recipe
under `src/server/app/sets/<set>/docs/add-a-*.md` (or the obligation / journey-flow maintenance guard
rails) — read that recipe and follow it, varying as little as possible. Do **not** improvise around a
recipe. The recipes are set-relative, so where your increment targets a set other than the one a recipe was
written against, substitute the set folder and otherwise follow it exactly. Where the increment cites a gap
that no recipe covers, the increment's own `filesToTouch` **is** the script and any exemplar it names is
the shape to imitate.

**backend** — follow the increment plus the workspace Java best practices under
`<workspace>/docs/best-practices/java/`. Mirror the existing `uk.gov.defra.trade.imports.animals` package
idiom exactly. Compact-constructor null guards on public records at API boundaries. One round-trip test
plus one unknown-value negative per enum — **never** a test per enum constant. Integration tests (`*IT`)
run under Failsafe: `mvn verify`, not `mvn test`.

**tests** — follow the increment plus `<workspace>/docs/best-practices/playwright/`. Independent tests,
raw role/label locators, no page objects where the repo does not already use them, no sleeps,
`expect.poll` only for non-locator state.

## Rules

- Implement **exactly** the increment's scope. Do not fix adjacent things you notice — put them in
  `notes` and let a later increment or the judge deal with them.
- **Never edit `backlog.json`.** It is the orchestrator's artefact and the plan of record. If your work
  reveals that a new increment is needed — a defect you must not fix here, a missing dependency edge, a
  step the plan omitted — describe it fully in `notes`, including what it should depend on and what its
  acceptance criteria would be. The orchestrator writes it in. Editing the plan from inside an increment
  puts a planning change inside a diff nobody is reviewing as a planning change.
- Every user-facing string goes in `copy.en.js` **and** `copy.cy.js` with identical structure. No display
  logic in obligations or in the model — no labels, titleKeys or hints there.
- Write the specs the increment lists (co-located Playwright spec, axe test). They are part of the
  increment, not optional extras.
- **Frontend work: run `npm run format` before you report.** The repo's pre-commit hook runs
  `format:check && lint && test`, so a formatting miss blocks the commit even when your ladder was green.
  Watch for it after edits that change a line's length — shortening `it.fails(` to `it(`, for example,
  lets Prettier collapse a call that was previously wrapped.
- Run test suites **to a file** under `<logs>` and read that file once. Do not re-run a suite
  just to see its output again. For Playwright failures read `test-results/*/error-context.md`, not the
  tail of the run.
- **Stage** your work (`git -C <repo> add`) but **do not commit**. Landing happens after review.
- Test failures are yours to fix. "Pre-existing" and "separate issue" are not available to you — if the
  suite is red when you finish, you have not finished.
- At most **3 self-repair attempts** on a red step. If it is still red, stop and report `ok: false` with
  exactly what is red and what you tried. Do not thrash, and never weaken a test to make it pass.
- Never run `sonar` — it is a milestone gate a human runs.
- Never `git reset --hard` or `git clean -fd`. If you must undo, `git stash push -u`.
- Headless: never ask a question. Decide, record the decision in `notes`, keep going.

## Step 3 — report

Your final message must satisfy the JSON schema supplied via `--output-schema`: `ok`, `summary`,
`changedFiles` (repo-relative paths), `notes`. Nothing else.
