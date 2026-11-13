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

- Progress: 26 of 68 (38%), counted over rows that are not for Sam.
- Landed this run: P26, P27, P28, P29 and P30.
- Blocked this run:
  - **P32 (`tim capabilities extract`):** two output changes that the row's
    risk does not name.
    1. File missing and `--format` invalid together (for example
       `tim capabilities extract no-such.md --format csv`). The Bash checked
       the file first: `Error: file not found: no-such.md`, exit 1. tim checks
       `--format` in `parseOptions` (`checkedFormat`, in
       `tim/src/commands/capabilities/index.js`) before `run()` reads the
       file, so it prints `Error: --format must be 'list' or 'tsv', got: csv`,
       exit 2.
    2. An empty file argument (`tim capabilities extract ''`). The Bash
       printed its usage line and exited 1. Commander accepts `''`, so tim
       prints `Error: file not found: ` and exits 2. The risk only covers the
       missing argument that commander catches.
    Fix: for each, either match the Bash (check the file before the format;
    refuse an empty path as usage) or name the change in P32's risk, and add
    a test for each case. Nothing else blocks it: tim tests (259 files, 4483
    tests), lint and format are green, nothing outside `workareas/` still
    names `extract-capabilities`, and the two hand-derived violations rows
    (CAP-04.1, CAP-04.2) match the Perl source. Neither builder nor verifier
    could re-run the Perl for parity, because the permission classifier
    refused it.
  - **P34 (`tim service-tag`):** the only problem is two allowlist entries
    for the deleted `tools/service-tag` scripts, at `.claude/settings.json`
    lines 92 and 93. A hook stops agents editing permission config, so Sam
    has to make this change: delete lines 92 and 93 and the trailing comma
    at the end of line 91
    (`"Bash(~/git/defra/trade-imports-workspace/tools/theme-ticket/*:*)",`),
    then commit it as a follow-up `chore(NO_JIRA)` commit on
    `chore/NO_JIRA-bash-to-tim`, or amend it into 12827163. No other commits
    were made for this.
- Why the loop stopped: two rows in a row were blocked, which points at
  something systemic. P32 is again an output change for existing callers
  that the risk does not name. P34 needs a change only Sam can make.
- Rows for Sam: P11 and P19B. P26's canary (raising a real govuk ticket)
  still waits for Sam's go-ahead.
- Landing result: none yet.
- Next: Sam removes the two `tools/service-tag` allowlist entries from
  `.claude/settings.json` and commits it, so P34 can be set to `done`; then
  fix P32 as set out above, set it back to `todo`, and run the loop again.
