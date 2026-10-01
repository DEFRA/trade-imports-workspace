# Handover: build the INS performance-testing backlog

You are taking over the build of 19 increments of k6 load tests for the Import Notification Service (INS). You orchestrate and verify. The build loop and its agents write the code. Use the `requirements-pipeline` skill's BUILD phase.

## Summary

- **1 of 19 landed (5%).** 16 to do, 2 blocked.
- **inc-001 is waiting for Sam's review.** Do not launch until he says to carry on.
- **Next is inc-002:** the same smoke run, pointed at CDP dev and CDP test, signing in through the real OIDC flow against the Defra ID stub.
- **Workspace PR DEFRA/trade-imports-workspace#77 is open,** waiting for Sam to merge. It holds this backlog, the new repo's set-up and the build-loop changes.

## Where things stand

- **Step 0 is done.** The k6 suite repo is set up (DEFRA/trade-imports-performance-tests#1, merged) and the build loop takes this backlog's repos.
- **inc-001 landed:** DEFRA/trade-imports-performance-tests#2, merged; ticket EUDPA-642, Done. It is a review point, so the loop stopped after it. Sam is to:

  > Look at the walking skeleton before anything builds on it: how the performance suite repo is laid out and runs in CDP, how a run is pointed at an environment, the smoke path through both journeys and the front door, the interim thresholds, and a pull-request run that fails on a deliberately breached threshold.

- **Blocked:**
  - inc-003 waits for INS to be deployed to CDP perf-test. inc-016 and inc-018 depend on it.
  - inc-013 waits for the session API, permissions service and routing proxy to be built.
- **Review points still to come:** inc-003 and inc-009. The loop lands each, then stops. Bring each to Sam with the row's `gate` text.

Count the statuses from the workspace root:

```bash
jq -r '[.increments[].status] | group_by(.) | map({(.[0]): length}) | add' workareas/shared/ins-performance-testing/backlog.json
```

## Sam's answers

- The epic is EUDPA-641.
- Build every open-question default in `report.md` as written.
- INS is not deployed to CDP perf-test yet.

## Read first

- `report.md`: the summary, the 12 open questions and their defaults, the increments, what is out of scope.
- `backlog.json`: the rows. The envelope's `invariants` are rules every increment keeps.
- `.claude/skills/requirements-pipeline/references/BUILD.md` and `workflow/README.md`: how the loop runs, its stop reasons and the stack lease.

## Refresh the machine

This machine already has the workspace, `tim` and credentials. Bring it up to date in this order.

1. Get the workspace branch:
   - `git -C ~/git/defra/trade-imports-workspace fetch origin`
   - check out `feat/NO_JIRA-ins-performance-testing`, or `main` if #77 has merged, then `git -C ~/git/defra/trade-imports-workspace pull`
2. Bring `tim` up to date if its lockfile changed. A hook blocks `npm --prefix … ci`, so run it by hand from inside `tim/`:
   - `cd ~/git/defra/trade-imports-workspace/tim` then `npm ci`
   - `npm --prefix ~/git/defra/trade-imports-workspace/tim link` if `tim` is not on your PATH, or `readlink -f "$(which tim)"` points at another clone
3. `tim workspace setup` clones any repo that is missing, including `trade-imports-performance-tests` and `trade-imports-ins-tests`.
4. `tim workspace update` pulls every repo.
5. Install the programme's Node repos, one `--repo` each: `tim workspace install --repo trade-imports-ins-tests --repo trade-imports-animals-frontend --repo trade-imports-plants-frontend --repo trade-imports-ins-frontend --repo trade-imports-defra-id-stub --repo trade-imports-performance-tests`
6. Check every repo is on `main` and clean: `tim workspace status --json`.
7. Check the stack is down and unleased: `docker ps` lists nothing, and `tim docker lease status` shows no lease. FIT needs its ports free.
8. Raise **Dynamic workflow size** in `/config`.
9. Run the baseline gate: `tim build gate shared/ins-performance-testing --phase all`. It must be green before you launch. It starts and stops its own stack for the E2E phase.

## Launch

When Sam has reviewed inc-001 and says to carry on, launch the loop once, by `scriptPath`, never by name:

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
  repos: {
    perftests: { path: 'repos/trade-imports-performance-tests', github: 'DEFRA/trade-imports-performance-tests' },
    stub: { path: 'repos/trade-imports-stub', github: 'DEFRA/trade-imports-stub' },
    idstub: { path: 'repos/trade-imports-defra-id-stub', github: 'DEFRA/trade-imports-defra-id-stub' },
    insfrontend: { path: 'repos/trade-imports-ins-frontend', github: 'DEFRA/trade-imports-ins-frontend' },
    animalsfrontend: { path: 'repos/trade-imports-animals-frontend', github: 'DEFRA/trade-imports-animals-frontend' },
    plantsfrontend: { path: 'repos/trade-imports-plants-frontend', github: 'DEFRA/trade-imports-plants-frontend' },
    referencedata: { path: 'repos/trade-imports-reference-data', github: 'DEFRA/trade-imports-reference-data' },
    gateway: { path: 'repos/trade-imports-dynamics-gateway', github: 'DEFRA/trade-imports-dynamics-gateway' },
    instests: { path: 'repos/trade-imports-ins-tests', github: 'DEFRA/trade-imports-ins-tests' }
  },
  models: {},
  increments: null,
  stopAfter: 'all'
}
```

These are the keys the loop requires today. If `increment-build-loop.js`'s `ALWAYS_REQUIRED` list has changed, follow it. `repos` must match the envelope exactly (`jq '.repos' backlog.json`): all 9 keys, including `instests`, which BUILD.md's example leaves out.

## Rules that matter

- **Orchestrate, never implement.** Every file change goes to a subagent, and every subagent prompt carries a GUARD RAILS block: tilde paths in Bash, absolute paths in Read and Write, one command per Bash call, no `cd`, `git -C` and `npm --prefix`, no `sonar`, no subagents or forks, finish your own task if a user message is relayed.
- **Merging.** PRs in `trade-imports-performance-tests` may be merged without asking. Every other repo needs Sam's go-ahead.
- **The stack lease.** One lease file per machine records who holds the workspace stack. The loop's stages and the gate take it and give it back. While it is held, `tim docker up`, `dev`, `down`, `restart` and `bounce-backend` refuse. Their `--force` is for a person only; never pass it. A stack started by hand has no lease, so it counts as somebody else's and stops the run at `stack-held`. Check with `tim docker lease status`.
- **After every run,** run `tim build runs archive <runId>`, then `tim build runs report <runId>`.
- **Status names.** Configure the board's status names, the right-hand column of `tools/jira/transition-ticket.sh <KEY> --list`, not the transition names.
- **Keep sensitive material out of public repos.** `trade-imports-workspace` and `trade-imports-performance-tests` are public. Never push meeting transcripts, Confluence copies or detail of the access-control finding.
- **Reporting.** Progress as N of 19 (P%), plain English. Flag the calls you made rather than waiting on them.

## What stays on the old machine

- `sources.json`, `sources/` and `distil/`. You only need them to re-distil. They hold a meeting transcript and a security finding, so they are never pushed; Sam copies them privately if wanted.
- The build-telemetry archive, `workareas/build-telemetry/`.
- The stack lease file.

Claude Code deletes old sessions after 30 days unless `cleanupPeriodDays` is raised, so archive a run before then.

## Open items

- **Address Lookup.** The inc-014 dry run found that the INS backend calls Address Lookup outside the boundary. `trade-imports-ins-backend` is not in this programme's repos. Should a row measure it?
- **Where the smoke job runs.** In the workspace E2E workflow the k6 smoke job runs on its own runner and stack, not beside the Playwright shards on one stack. Sam to confirm.
- **Codex stages take no stack lease.**
- **The branch lifecycle** still uses its separate derive and branch agents, not `tim build start`.

## Loop snags already fixed

You may see these in older logs. Each is fixed on the programme branch.

- **Status name and transition name.** On EUDPA the In Progress transition leads to the status In Dev. A run given In Progress stopped at `ticket-failed`. The key is now `jiraInDevStatus`, set to the status name.
- **A reviewer left the stack up.** On inc-001's first attempt the consistency reviewer started the stack and left it running, so the ladder's FIT phase found port 3000 taken. The stack lease now stops this.
- **The PR stage checked every configured repo.** A one-repo increment raised its PR, then walked on to the other repos and stopped at `pr-failed`. It now checks only the row's repos.

## The handover prompt

````
Resume the ins-performance-testing build with the requirements-pipeline skill's BUILD phase.

workarea     shared/ins-performance-testing
branch       main
lifecycle    full
scope        ins-performance-testing
executor     claude
jiraProject  EUDPA
epic         EUDPA-641
inDev        In Dev
doneStatus   Done
board        13780
repos        {"perftests":{"path":"repos/trade-imports-performance-tests","github":"DEFRA/trade-imports-performance-tests"},"stub":{"path":"repos/trade-imports-stub","github":"DEFRA/trade-imports-stub"},"idstub":{"path":"repos/trade-imports-defra-id-stub","github":"DEFRA/trade-imports-defra-id-stub"},"insfrontend":{"path":"repos/trade-imports-ins-frontend","github":"DEFRA/trade-imports-ins-frontend"},"animalsfrontend":{"path":"repos/trade-imports-animals-frontend","github":"DEFRA/trade-imports-animals-frontend"},"plantsfrontend":{"path":"repos/trade-imports-plants-frontend","github":"DEFRA/trade-imports-plants-frontend"},"referencedata":{"path":"repos/trade-imports-reference-data","github":"DEFRA/trade-imports-reference-data"},"gateway":{"path":"repos/trade-imports-dynamics-gateway","github":"DEFRA/trade-imports-dynamics-gateway"},"instests":{"path":"repos/trade-imports-ins-tests","github":"DEFRA/trade-imports-ins-tests"}}
models       {}, the recommended split (think opus, code sonnet, light haiku)
stopAfter    all

Stopped: gate. Last landed inc-001 (https://github.com/DEFRA/trade-imports-performance-tests/pull/2, EUDPA-642).
16 todo remain, 2 blocked, 0 dropped.
Owed to a human: Sam's review of inc-001's walking skeleton before the build continues.

Read workareas/shared/ins-performance-testing/HANDOFF.md before the first increment.
Raise Dynamic workflow size in /config first.
````
