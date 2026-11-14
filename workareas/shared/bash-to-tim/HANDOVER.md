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
3. If the verifier finds problems, a fixer has up to two attempts, and
   the verifier checks again after each.
4. If the row lands, its status becomes `done` and the branch is pushed.
   If not, its commits are undone and its status becomes `blocked`, with
   a reason and the SHAs of the undone commits, which stay in the reflog.

The loop works rows one at a time, on one branch: `chore/NO_JIRA-bash-to-tim`.
That branch name is used in every repo a row touches.

It stops when any of these happens:

- `maxRows` rows have landed
- no row is left that it can build
- `maxBlockedInARow` rows in a row are blocked (default 4)

A blocked row does not stop it: the loop moves on to the next row it can
build. Everything waiting on Sam is listed in `NEEDS-SAM.md`.

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
`~/git/defra/trade-imports-workspace`), `branch`, `maxRows` (default 10)
and `maxBlockedInARow` (default 4).
Launch it again to continue: it picks up from `backlog.json`.

**On a new machine, you need:**

- the workspace cloned, with `tim workspace setup` run and `tim` linked
  from this clone
- `JIRA_*`, `CONFLUENCE_*` and `SONAR_TOKEN` set in `~/.zshrc`
- `gh auth status` green
- Docker, which only the 7 stack rows start

To retry a `blocked` row, set it back to `todo` and rename its
`blockedReason` to `previousBlockedReason`. The builder cherry-picks the
`recoverableCommits` and fixes only that reason. The reflog is local, so
retry on the machine that ran the blocked attempt.

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

- Progress: 62 of 67 (93%), counted over rows whose status is not "person".
- Landed this run: P61.
- Blocked this run:
  - **P62:** it can't be finished until Sam decides how to fix a failing
    test in the plants prototype. The verifier's only problem is the
    `run-stack.sh` mention at
    `repos/trade-imports-plants-prototype/README.md:300`. Changing that
    line means a commit in the prototype, and the prototype's pre-commit
    hook runs format:check, lint and the full test suite. One test in that
    suite fails today: in
    `src/server/app/services/ins-address-book/ins-address-book.test.js`,
    the check against the sibling repo fails because
    `trade-imports-ins-frontend`'s barrel exports `addressTypeOfRole` and
    `keepRolesOfferedBy`, and the prototype has neither. Fixing it means
    either porting the ins-frontend typed address-book model
    (`address-types.js`) into the repo designers own, or changing the test
    so it no longer tracks the sibling. That is a product and ownership
    decision under rule 6. Skipping the hook with `--no-verify` would get
    round it without that decision, so it was not done.
- Why the loop stopped: no buildable row was left. P11, P55 and P19B are
  for Sam, P62 is blocked, and P69, P70, P71 and P72 are still to do but
  wait on those.
- Rows for Sam:
  - **P11:** test which allowlist patterns match without a prompt. P71 and
    P72 wait on it.
  - **P55:** switch the four Sonar hook commands in
    `.claude/settings.json`, as set out under `## P55` in
    `settings-followups.md`.
  - **P19B:** port the two guard hooks to Node with no dependencies.
  - P26's canary (raising a real govuk ticket) still waits for Sam's
    go-ahead.
- Landing result: none yet.
- Next: Sam decides how to fix the failing prototype test for P62 (port
  `address-types.js` from ins-frontend into the prototype, or stop the
  test tracking the sibling), then relaunch the loop to finish P62.
