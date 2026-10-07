# Handover: build the INS performance-testing backlog

You are taking over the build of k6 load tests for the Import Notification Service (INS), epic EUDPA-641. You orchestrate and verify. The build loop and its agents write the code. Use the `requirements-pipeline` skill's BUILD phase.

## Summary (6 October 2026)

- **16 of 23 landed (70%).** 3 to do, 3 blocked, 1 deferred. **Nothing is buildable.** inc-023, inc-011, inc-012 and inc-017 landed on 5 and 6 October; see `OVERNIGHT-2026-10-05.md`.
- **inc-014 is deferred** until the frontends' npm security audit (another session) and ins-frontend's Lighthouse fix are on `main`. Lighthouse fails because ins-frontend's `.npmrc` has `ignore-scripts=true`. Sam ruled to remove only that line, but agents are denied access to `.npmrc`, so the edit is his. Then set inc-014 back to todo: the loop resumes it at `ci` on its 6 open PRs. inc-015 depends on it.
- **inc-016 and inc-018** wait on inc-003 (INS deployed to CDP perf-test). **inc-022** waits on a test-environment `DEVELOPER_API_KEY`.
- **Workspace #97 merged:** planners now write only check forms the deny list allows, and a plan with a denied form is sent back once, then refused.
- **No approval gate anywhere (Sam, 6 October 2026: "we should have no such thing").** The workspace repo's `requireApproval: true` was taken out of the envelope. Pass `requireApproval: false` and no per-repo flag. Every green increment merges itself, the workspace included.
- **Closing tickets:** the last run's done stage closed EUDPA-665 itself. If a run still ends at `done-failed`, close the ticket and mark the row done by hand (see "After every run").

## Where things stand

- **Landed today:**
  - inc-021: the smoke run reaches CDP dev from a laptop. Perf-tests #8, EUDPA-661. All four scenarios passed every threshold against CDP dev.
  - inc-020: the IUU profile is removed everywhere. Perf-tests #9, EUDPA-666.
- **Blocked:**
  - inc-022 (CDP test run): needs a test-environment `DEVELOPER_API_KEY` from Sam. Set it to todo when he adds it to `repos/trade-imports-performance-tests/.env`.
  - inc-003: INS is not deployed to CDP perf-test. inc-016 and inc-018 depend on it.
  - inc-013: the session API, permissions service and routing proxy are not built yet.
- **Factory fixes merged today:**
  - workspace #90: `tim build start` keeps its JSON line small however dirty the workspace is. Before this, a workspace build stopped at `derive-failed`.
  - workspace #91: the routing-golden test is 8× faster. It used to time out under gate load.
- **Docker crashed once** during inc-020's first ladder, on the p99-burst run. The cause is unknown and it is not the Rosetta problem. The relaunch ran clean. If it happens again, investigate before retrying.

Count the statuses from the workspace root:

```bash
jq -r '[.increments[].status] | group_by(.) | map({(.[0]): length}) | add' workareas/shared/ins-performance-testing/backlog.json
```

## Not this programme's work

Leave these alone. They are tracked elsewhere:

- **npm security audit** (the braces advisory) is failing on the frontends. Another session owns it. animals-frontend #386 and plants-frontend #85 wait on it, and then on Sam's go-ahead to merge.
- **EUDPA-667** owns blank-save behaviour (mandatory to proceed vs mandatory to submit). animals-frontend #387 and ins-tests #11 were closed in its favour.

## Launch

Check that the stack is down and unleased (`tim docker lease status`). Then launch once, by `scriptPath`:

```
Workflow({ scriptPath: ".claude/skills/requirements-pipeline/workflow/increment-build-loop.js", args: <the object below> })
```

```js
{
  workarea: 'shared/ins-performance-testing',
  branch: 'main',
  lifecycle: 'full',
  scope: 'ins-performance-testing',
  executor: 'claude',
  planOnly: false,
  jiraProject: 'EUDPA',
  epic: 'EUDPA-641',
  jiraInDevStatus: 'In Dev',
  jiraDoneStatus: 'Done',
  jiraBoard: 13780,
  ciFixAttempts: 3,
  ciWatchMinutes: 30,
  requireApproval: false,
  approvalWaitMinutes: 20,
  repos: <exactly what `jq '.repos' workareas/shared/ins-performance-testing/backlog.json` prints: 10 keys, including workspace, with no requireApproval anywhere>,
  models: {},
  increments: null,
  stopAfter: 1
}
```

Use `stopAfter: 1` while the Jira permission stops every run at `done-failed`.

## After every run

1. Check the PR merged: `gh pr view <n> -R <repo>`.
2. Close the ticket: `tools/jira/transition-ticket.sh <KEY> Done`.
3. Mark the row: `tim backlog set shared/ins-performance-testing <id> --status done --commit <merge sha>`.
4. `tim build runs archive <runId>`, then `tim build runs report <runId>`.
5. A killed run leaves its lease behind: `tim docker lease release --holder <run id>`.

## Rules that matter

- **Orchestrate, never implement.** Every file change goes to a subagent or the loop, with a GUARD RAILS block. If the loop cannot do something, fix the loop first.
- **Merging.** The loop merges every green increment itself, in every repo, the workspace included. There is no human approval gate. A PR you raise by hand outside the loop (a factory fix, say) still waits for Sam's go-ahead.
- **Scope.**
  - One stubbed user, no distinct identities.
  - IUU is out of scope.
  - No stack performance work beyond inc-023.
  - Address Lookup waits until it is wired in.
  - The k6 smoke job keeps its own runner and stack.
  - Leave the permission allowlist alone, and don't speed up gate layer 1.
- **Missing access or tokens while Sam is away:** set the row to deferred with a note, chain its dependents, and relaunch.
- **Public repos.** `trade-imports-workspace` and `trade-imports-performance-tests` are public. Never push transcripts, Confluence copies or security findings. `sources.json`, `sources/` and `distil/` stay local.
- **Reports.** Progress as N of 23 (P%). Put only what needs Sam at the top. The review page is https://claude.ai/artifact/1oTLrwBCMQN8un1kxxQKs3 — republish it rather than creating a new one.

## Read first

- `report.md`: the open questions, their defaults and what is out of scope.
- `backlog.json`: the rows. The envelope's `invariants` are rules every increment keeps.
- `.claude/skills/requirements-pipeline/references/BUILD.md`: how the loop runs, and its stop reasons.
