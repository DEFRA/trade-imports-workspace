# Bash to tim: handover

This programme replaces every Bash script in the workspace repo with `tim`
or plain `gh`, or deletes it. That covers `scripts/`, `tools/` and
`.claude/hooks/`.

Once that is done, the workspace no longer has to live at
`~/git/defra/trade-imports-workspace`. Several clones can then work at
once, while only one owns the Docker stack. The others get their E2E from
GitHub Actions.

## Why the path was fixed

- **Claude Code's permission system is the cause.** It asks before running
  any command the model types that contains `$VAR`, even an allowed one
  (GH#51001). So skills spelt out `~/git/defra/trade-imports-workspace/...`
  in full, and the allowlist was built on that path
  (`docs/agent-skills.md`, commit eb8f0f44).
- **The scripts copied the path "for consistency".** Bash never needed it.
- **`tim` removes the need for it.** A command like `tim review start` names
  no path. `tim` finds the workspace by walking up from the current folder,
  and it reads the same environment variables the Bash does.

## Files in this folder

| File | What it is |
|---|---|
| `backlog.json` | The state: 70 rows, each with its status, dependencies, scripts, callers, tokens, risk, proof and checks |
| `BRIEF.md` | What the builder, verifier and fixer agents do, and the rules that bite |
| `loop.js` | The loop, a Workflow script |
| `findings.json` | The investigation of 13 Nov 2026: the script catalogue, the plan for each folder and the parallel-clone blockers, each checked by two agents |

## How the loop works

The loop takes ideas from the increment build loop, but it is lighter.
These changes are workspace tooling, so the proof is `tim`'s own tests
plus golden parity with the Bash. No stack-backed E2E runs for each row.

For each row:

1. A builder makes the change and commits it.
2. A verifier, who did not build it, tries to prove it wrong.
3. If the verifier finds problems, a fixer has one attempt, and the
   verifier checks again.
4. If the row lands, its status becomes `done` and the branch is pushed.
   If not, its commits are undone and its status becomes `blocked`, with
   a reason.

The loop works rows one at a time, on one branch: `chore/NO_JIRA-bash-to-tim`.
That branch name is used in every repo a row touches.

It stops when any of these happens:

- `maxRows` rows have landed
- no row is left that it can build
- two rows in a row are blocked

**E2E runs once, at the end, in GitHub Actions.** It never runs while the
work is under way, locally or in CI. The pull requests stay as drafts
until every row the loop can build is done. Then the loop marks them
ready, watches the checks, fixes anything red, and stops at green without
merging.

## How to run it

Run these from a Claude Code session opened at the workspace root:

```
git fetch && git checkout chore/NO_JIRA-bash-to-tim && git pull --ff-only
Workflow({ scriptPath: "<workspace>/workareas/shared/bash-to-tim/loop.js", args: { maxRows: 10 } })
```

`args` is optional. It accepts `workspace` (default
`~/git/defra/trade-imports-workspace`), `branch` and `maxRows` (default 10).
Launch it again to continue: it picks up from `backlog.json`.

**On a new machine, you need:**

- the workspace cloned, with `tim workspace setup` run and `tim` linked
  from this clone
- `JIRA_*`, `CONFLUENCE_*` and `SONAR_TOKEN` set in `~/.zshrc`
- `gh auth status` green
- Docker, which only the 7 stack rows start

To retry a `blocked` row, set it back to `todo` once its reason is dealt
with.

## Rows for Sam

Agents cannot do these two rows, so the loop skips them:

- **P11: test which allowlist patterns match without a prompt.** A session
  cannot see its own permission prompts. P71 (drop the fixed-path allowlist
  entries) and P72 (remove the path from the skill text) wait on it.
- **P19B: port the two guard hooks to Node with no dependencies.**
  `guard-edits.sh` blocks agents from editing `.claude/hooks/**`. P19
  writes the test corpus that proves the port.

## Calls made when planning

- **Out of scope:** JavaScript workflows and scripts stay JavaScript. P05
  changes only how they find the workspace.
- **Dropped:** P02, P03 and P04 would have fixed paths inside Bash first.
  Each port or deletion removes the path anyway.
- **The PR-checks waiter is deleted, not kept.** The build loop calls
  `gh pr checks --watch` directly, under rule 8.
- **journey-builder is retired (P63).** If you would rather keep it, the
  rows to port it are in `findings.json`.
- **`docker-local-branches` is retired, not ported.** It built
  `local/<repo>` images that nothing reads.
- **`dockws/` at the workspace root** is a tim test fixture that leaked out.
  It is safe to delete, and unrelated to this work.

## State

- Progress: 19 of 68 (28%), counted over rows that are not for Sam.
- Landed this run: P19, P21, P22, P23 and P24.
- Blocked this run:
  - **P20:** the no-checks watch tests in
    `tim/src/backlog/workflow-contract.test.js` (`watchAgainstStubGh`) would
    pass against a wrong implementation. The stub gh prints only the
    capitalised "No checks reported on the 'feat/x' branch", but when the
    watch is redirected into a log, as the prompt's command does, real gh
    (2.104.0) prints it in lowercase and exits 1. Only a terminal gets the
    capital N. So a case-sensitive `grep -q 'No checks reported'` passes both
    new tests yet never matches the real log, which brings back the race
    264e8578 closed. Fix: have the stub print gh's lowercase redirected form,
    or run both cases in both forms, so dropping `-i` or matching the
    capitalised text turns a test red.
  - **P25:** with an unknown board, the deleted Bash printed Jira's
    errorMessages to stderr and exited 1. `tim jira epics --board 999999999`
    and `tim jira labels --board 999999999` now exit 2 and print only
    "listBoardEpics(999999999): not found." (404 maps to NOT_FOUND, which
    `envelope.js` turns into exit 2). The row's risk does not name this.
    Fix either way: (a) exit 1 and pass Jira's errorMessages through, as P22's
    fixer did, or (b) amend the row's risk and commit message to name the
    change. Either way, add a golden for the Bash's 404 output and exit code
    to `board-epics-labels-bash-goldens.json` (it holds only success cases)
    and a CLI-level test that compares tim against it. Everything else
    passed: tests, lint, format, no callers left, and live output for board
    13780 matches the goldens.
  - **P26:** ticket-creator's `SKILL.md` still asks for
    `**Assignee:** [Self or None]` (line 227), but with the
    `create-ticket.sh -a` fallback gone no step acts on Self, so such a
    ticket is raised unassigned. Fix: in "After Creation", say that when the
    draft's Assignee is Self, the next step is `tim jira assign EUDPA-XXXXX me`
    (a dry run), then `--confirm`; and change "someone else" (line 369) to
    cover self too, matching `tim/README.md`. Nothing else was found.
- Why the loop stopped: two rows in a row were blocked, which points at
  something systemic. Here all three are verification gaps the builder could
  have closed: tests that do not pin real behaviour, and skill text left
  behind by a deleted script.
- Rows for Sam: P11 and P19B.
- Landing result: none yet.
- Next: fix P20, P25 and P26 as set out above, set each back to `todo`, and
  run the loop again.
