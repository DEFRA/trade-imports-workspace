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

- Progress: 65 of 67 (97%), counted over rows whose status is not "person".
- Landed this run: none.
- Blocked this run: none.
- Why the loop stopped: no row was left that it could build. P11, P55 and
  P19B are for Sam. P71 (drop the canonical-path allowlist entries) and
  P72 (skill, rules and docs text stop naming the workspace path) wait on
  P11.
- Rows for Sam:
  - **P11:** test which allowlist patterns match without a prompt. P71 and
    P72 wait on it.
  - **P55:** switch the four Sonar hook commands in
    `.claude/settings.json`, as set out under `## P55` in
    `settings-followups.md`.
  - **P19B:** port the two guard hooks to Node with no dependencies.
  - P26's canary (raising a real govuk ticket) still waits for Sam's
    go-ahead.
- Landing result: all 13 pull requests on `chore/NO_JIRA-bash-to-tim` are
  ready for review. Nothing is merged.
  - Green (12): workspace #263, performance-tests #36, defra-id-stub #15,
    animals-admin #92, reference-data #41, dynamics-gateway #34,
    address-book #27, animals-backend #131, plants-frontend #146,
    ins-frontend #86, animals-frontend #485, ins-tests #113.
  - Red (1): plants-prototype #27. None of its three failures comes from
    this branch, which changes one README there:
    - Design release canary: CI's throwaway release `plants-working`
      clashes with a real release of that name merged on 27 October. Fix:
      rename the throwaway release in
      `.github/workflows/check-pull-request.yml`.
    - Security audit: the new joi and @hapi/content advisories, fixed in
      defra-id-stub the same way.
    - FIT Tests: `fit/sets-chooser.fit.spec.js` gets a 404 for
      `/assets/fonts/*.woff2`.

    No fix can be committed there: its pre-commit hook is already red
    (NEEDS-SAM item 11) and `--no-verify` is banned. The prototype owner
    has to decide.
  - Fixes pushed while landing: four forwarding scripts under
    `scripts/ci/` and `scripts/stack/` so `e2e-tests.yml@main` still runs
    (delete them once the workspace and performance-tests pull requests
    merge, NEEDS-SAM item 12); tim tests made to pass on Linux;
    defra-id-stub joi upgrade and override; dynamics-gateway
    `EventsSendControllerIT` reads only its own session.
  - The four forwarding scripts show as modified locally only because of a
    file-permission difference. Git holds the run permission.
- Next: Sam reviews and merges the 12 green pull requests, and the
  prototype owner decides what to do about #27.
