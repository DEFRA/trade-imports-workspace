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

- Progress: 46 of 68 (68%), counted over rows that are not for Sam.
- Landed this run: P31, P32, P35, P36, P39, P40, P41, P42, P43, P44, P45,
  P46, P47, P48, P49, P50, P52, P53 and P54.
- Blocked this run:
  - **P37 (`tim confluence sync`):** an exit code changed that the row's
    risk does not name. A non-numeric `--page-id` or `--root-id` (for
    example `tim confluence sync --page-id abc`) is now refused by
    `pageIdFrom` with a usage error, exit 2: `Cannot find a page id in
    "abc". Give a page id, or a page URL with /pages/<id> in it.` The Bash
    `sync-docs.sh` found no synced file and exited 1; for `--root-id` it
    failed on the API call. The risk also does not say that both options
    now accept a page URL, or that this refusal comes before `--clean`
    removes anything. Fix: name these changes in P37's risk, or map the
    usage error back to exit 1, and add a test either way. The options are
    parsed in `tim/src/commands/confluence/index.js`; `pageIdFrom` is in
    `tim/src/clients/confluence-client.js`.
  - **P55 (Sonar session hooks):** needs Sam. Four hook commands in
    `.claude/settings.json` still run the Bash scripts: line 146
    (PostToolUse `sonar-record-push.sh`), line 164 (UserPromptSubmit
    `sonar-check-pending.sh`), line 175 (SessionStart
    `sonar-check-pending.sh`) and line 180 (SessionStart
    `sonar-remove-stale-mcp-containers.sh`). Agents cannot edit that file.
    Until they switch, the three scripts under `scripts/sonar/` cannot be
    deleted, and the hook section of `docs/agent-onboarding.md` and the
    comment on line 26 of `scripts/sonar/sonar-push-gate.sh` cannot be
    rewritten. The replacement commands and follow-up steps are under
    `## P55` in `settings-followups.md`. They have only run in tests; the
    permission system refused a smoke run. After the switch, one follow-up
    commit deletes the scripts and rewrites the docs and the comment, then
    Sam runs a SessionStart check by hand.
  - **P56 (`tim sonar push-check`):** its proof needs one real run in
    `trade-imports-address-book` and one in
    `trade-imports-animals-frontend`, and a live check that SonarCloud's PR
    list agrees with `gh pr view`. `SONAR_TOKEN` is not set in the session
    or in Sam's shell profile, so someone with a token must run both.
- Why the loop stopped: two rows in a row were blocked (P55 and P56), which
  points at something systemic. Both need Sam: one a settings change agents
  cannot make, the other a SonarCloud token.
- Rows for Sam: P11 and P19B. P26's canary (raising a real govuk ticket)
  still waits for Sam's go-ahead.
- Landing result: none yet.
- Next: Sam switches the four hook commands in `.claude/settings.json` as
  set out under `## P55` in `settings-followups.md`.
