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

- Progress: 21 of 68 (31%), counted over rows that are not for Sam.
- Landed this run: P20 and P25.
- Blocked this run:
  - **P26:** a behaviour change for existing callers is not in the commit
    message. `buildPlan` in `plan.js` now strips trailing newlines from the
    description file (`withoutTrailingNewlines`) for every `tim jira create`,
    not only for the manifests that replace `create-ticket.sh`. Before
    4ca31111, theme-ticket, the prototype hand-off and the build loop sent the
    description file byte for byte. Now its trailing newlines are removed, and
    the planId for an unchanged manifest changes too. The commit message
    records the matching priority-default change for these callers but not
    this one, and the builder's deviations leave it out as well. Fix: amend
    4ca31111 so its message says that `tim jira create` now drops the
    description file's trailing newlines, as `$(cat file)` did in
    `create-ticket.sh`, and that this applies to the existing callers.
    Everything else checked out: tim tests green, lint and format clean, no
    callers of `create-ticket.sh` left, no new fixed path or `.sh` file, and
    the goldens match the deleted script's payload. The row's canary (raising
    a real govuk ticket) has not run and needs Sam's go-ahead.
  - **P27:** an output changed without the row saying so, and no golden
    covers it. `reviewItemsJsonText(items)` in `store.js` returns an empty
    string for any empty array. `review-items.sh` prints nothing only when no
    items file matches. When an items file exists but holds no items (for
    example `items.<repo>.json` with `"items": []`), the Bash prints `[]` and
    a newline, while the JS prints nothing. The function only sees the
    flattened items, so it cannot tell the two cases apart. Fix: have
    `readReviewItems` (or the text function) report whether any items file
    matched, or drop the empty-to-nothing mapping and handle "no files"
    separately. Add a golden for an items file with `"items": []`, recorded
    from the unmodified Bash, and a store test that compares against it. The
    verifier could not run the Bash probe (the sandbox refused it), so record
    the golden by hand. Nothing else blocks the row: tests, lint and format
    are green, and keeping `finding-categories.sh` until P56 is deliberate.
- Why the loop stopped: two rows in a row were blocked, which points at
  something systemic. Both are behaviour changes for existing callers that
  the builder made without recording them or pinning them with a golden.
- Rows for Sam: P11 and P19B. P26's canary also waits for Sam's go-ahead.
- Landing result: none yet.
- Next: fix P26 (amend the commit message) and P27 (empty-items output and
  its golden) as set out above, set both back to `todo`, and run the loop
  again.
