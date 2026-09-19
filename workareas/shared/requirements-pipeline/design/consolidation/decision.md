# Consolidation: the decision

Written 2026-09-19 by the judge. Reads `consolidation/inventory.md`, `proposal-macro.md` and `proposal-minimal-agents.md`, checked against `design/DESIGN.md`, `design/backlog.json`, `.claude/settings.json` and the tim sources. Judged on merit in use only: agents and wall-clock per run, reliability, the safety and visibility of outward actions, quality, Codex parity and resume. Build effort carries no weight (R8). A fixed overhead paid on every run or every increment does count (R8, `sam-requirements.md:134`).

Sam's steer, as it reached this judge: the cost of a run is its **agents**, not its stages. Deterministic work is a scripted, tested tim command issued by a cheap step agent with a "run this" prompt. It is never folded into a judgement agent to save a spawn. Judgement agents read the facts tim recorded and never re-run them. A tim "mega prepare" is endorsed.

---

## 1. The decision in one page

1. **tim executes every local, reversible step; agents only judge** (C-075). Fetch, the `merge-tree` probe, the local merge of base, branch cuts, baseline and ladder rungs, browser and Docker rungs, command invariants, the integration-proof stack and shards, secrets, manifests, local commits, wip commits, the state commit, fact records, audits, reports and handovers all run in-process inside `tim backlog advance`, through tested macros that people and a Codex-orchestrated session can also call on their own. This reverses the "tim runs only read-only git" and "tim never executes a lifecycle effect" sentences of 4.5 and C-042. It keeps C-042's reason: every outward action stays its own visible Bash call.
2. **One cheap step agent per gap between judgement spans** (C-074). A step agent is Haiku at low effort with one fixed prompt: loop `advance`, run any `act` commands verbatim, stop at the first non-zero exit, return the step. It makes no decision. It replaces the per-action watcher (7.2), the per-stage watcher (8.8), the relay after each fan-out, the stage 0 resolve watcher and the Codex stage watcher. tim counts each step agent's calls and hands back at `quality.stepBudget` (40).
3. **Judgement stages with nothing mechanical between them run as one span** (C-077). `advance` returns a small task graph; the script walks it, starting a task when its upstream receipts are accepted and its `when` holds. Review, verify, judge, fix, fix-verify, the seam consistency re-check and the discovered-atom verifier are one span. `advance` stays the only authority: it re-derives the span from disk on its next call and the audit re-derives every skip.
4. **Outward actions are generated, visible and observed** (C-076). Each push, draft PR, merge and Jira write is its own Bash call that tim generated after its own refusals passed. The next `advance` records the effect by looking (remote ref, PR, check, ticket). `advance --record` and the `wait` step go.
5. **Codex tasks run inside tim** (C-078). `tools/codex/run-stage.sh` becomes `tim backlog codex run`, called in-process by `advance` for every task bound to Codex. A span that mixes executors adds one Haiku Codex runner beside the Claude tasks.
6. **The bash lifecycle tools are never written; tim carries them** (C-079): `run-rung.sh`, `pre-push-check.sh`, `run-stage.sh`, `fake-codex.sh`, `pin-tools.sh`, and the PR and CI helper ports. Only the two hook adapters stay bash. Sam's owed pin allow rules go.
7. **The launching session absorbs only light bookkeeping** (C-080). `tim backlog run open` and `run close` do stage 0, the pin and registration, and any leading or trailing run of sub-steps whose stage-table `cost` is `light`. Heavy work (rungs, stack, Codex, network, git writes in product repos) is never run in the launching session.
8. **Fact records, and skip rules on disk** (C-081, C-082). Every mechanical sub-step writes a MACed fact record; every conditional stage has a skip rule the audit re-derives. Cold readers skip report sections that render empty.

Agent counts (the inventory's typical increment and distil run):

| Run | Before, as 7.2 specifies | Before, as 8.8 reads it | After |
|---|---|---|---|
| Build increment, `claude` preset, in a drain | **97**: 39 judgement, 9 relays, 49 watchers | **59**: 39, 9, 11 | **43**: 39 judgement, 4 step agents |
| Build increment, `claude`, alone or first of a run | 97, plus 1 resolve watcher per run | 59, plus 1 | **44**: 39 judgement, 5 step agents |
| Clean build increment (reviews find nothing) | 82 | about 45 | **33**: 29 judgement, 4 step agents |
| Build increment, `codex` preset | about 58 Haiku | about 20 Haiku | **about 2** step agents (1, plus a handback on a long increment) |
| Build increment, `codex-claude-checks` | about 62 | about 24 | **about 9**: 4 judgement, about 5 step agents |
| Distil run, `distil-claude` | **81** (up to 91 pipelined) | same | **66**: 56 judgement, 10 step agents |
| Distil run, `distil-codex` | about 57 | same | **about 40 to 42**: 32 judgement, 8 step agents, plus handbacks |
| Build increments per 850-agent run (200-agent reserve kept) | about 7 | about 13 | **about 16** |

The judgement tasks are unchanged: per-file style and code review, per-file verification, one consistency task, plan audit, judge, fix-verify and acceptance all stay. The two judgement agents that go in the distil run are cold readers of sections that render empty. The step-agent count per increment is fixed: it does not grow with repos, rungs, shards, PRs or files.

---

## 2. What was checked, and what the proposals got wrong

### 2.1 Claims confirmed

- **The design contradicts itself on watchers.** 7.2 step 3 (`DESIGN.md:1804`) spawns "one Haiku watcher per action". 8.8 (`DESIGN.md:2582`) counts "about 8 to 10" watchers, one per stage. The inventory's 97 and 59 are both faithful readings.
- **tim already spawns processes** through execa (`tim/src/exec/exec.js:1, 24, 52`), runs tasks across repos (`exec/parallel.js:12` `runAcross`, `:50` `runSerial`) and wraps the stack scripts (`exec/stack.js:35` `runStackScript`).
- **The GitHub and Jira clients are read-only today**: `github-client.js` has `whoami`, `findPrsForTicket`, `getPr`, `getPrDiff`, `listWorkflowRuns`, `getRunStatus` (`:80-163`); `jira-client.js` has `whoami`, `getTicket`, `getComments` (`:76-100`); `gha-client.waitForRun` polls one run (`:25`).
- **Git fixtures exist**: `createBareRepo`, `pushCommit`, `createFatClone` (`test-support/git-fixtures.js:31, 80, 97`), and `test-support/http-mock.js` gives undici MockAgent for the octokit writes.
- **The review skill has no verifier persona** (`.claude/skills/review/SKILL.md:65-67`), so verification granularity is the pipeline's to choose.
- **The push-record hook** matches only `Bash(git push*)` (`.claude/settings.json:139`), so it never fires for `git -C` pushes, and `sonar-check-pending.sh` can only ever report nothing for this pipeline.

### 2.2 Claims corrected

- **`tim workspace branch` can create a branch, but only a tracking one.** `checkoutArgs` runs `checkout -b <b> --track origin/<b>` when the remote branch exists (`branch.js:146-151`). It cannot cut a new branch from base and cannot scope to a repo set. The inventory's "cannot create a branch" is too strong; the conclusion (a new `prepare` is needed) stands. `prepare` reuses `checkoutArgs` for the tracking case.
- **The allowlist does not gate these outward calls.** `Bash(tim:*)` (`settings.json:88`) and `Bash(git -C ~/git/defra/trade-imports-workspace/*:*)` (`:83`) are both allowed. So a `tim github pr merge` call and a `git -C … push` call are auto-approved. The minimal proposal's "it is not allowlisted, so the classifier judges each one" is wrong, and DESIGN 0.3's "the allowlist sees each push" overstates it. What a separate call actually buys: **guard-bash** (`PreToolUse` on every Bash call, `settings.json:100-109`, not skipped by the allowlist) sees the full command text; the call and its exit are in the transcript and the journal; and the auto-mode classifier may see it, which this design does not rely on. The real guards on an outward call are therefore tim's own refusals before it generates the call, guard-bash, and observation afterwards.
- **A process-group kill does not satisfy C-015.** The minimal proposal's `process.kill(-pid)` kills the child's group, but C-015's fixture is a grandchild **in its own new process group**. `tim backlog codex run` keeps the recursive descendant walk: it parses `ps -A -o pid=,ppid=` through `exec.js` and kills every descendant, then the child. No new dependency.
- **The macro proposal's runner counts its own calls** (`CALL_CAP` in the prompt). A low-effort Haiku counting its Bash calls is not reliable. tim counts calls per `--agent` id in run state and returns `handback`.
- **The macro proposal's one PR call for every repo** (`tim backlog pr ensure --inc`) hides which repo a PR is opened in. One call per repo names the repo, head and base, at no agent cost.
- **The macro proposal's `inc-001` gains a dependency on `tim backlog`.** Placing the PR and check commands under `tim github` (the existing command group) avoids it: inc-001 stays in m0 with no new dependency.

---

## 3. The final build stage list

The canonical ids 0 to 27 stay as sub-step ids in tim's stage table, so holds, fact records, receipts, resume and the audit keep their granularity. What changes is who runs each one. Mechanical runs are M0 to M5; judgement spans are J1 to J4.

| Run or span | Ids | Sub-step | Kind | Runs as | Cost |
|---|---|---|---|---|---|
| **M0** | 0 | Preflight (state branch, tim root, pin at the launch commit, reused when present), `run start`, stage schemas exported | mechanical | `tim backlog run open`, in the launching session | light; **no agent** (was 1 resolve watcher per run) |
| **M1** | 1 | Next, and bindings | mechanical | `tim backlog prepare`, in-process in `advance` | step agent: the first of a run; in a drain, the previous increment's M5 agent carries on |
| M1 | 2 | Jira create, when `ticketing` is set | outward | visible call `tim jira create …`, returned as `act` | same agent |
| M1 | 3 | Branch: check out, track or cut the same name in every surface repo | mechanical | `prepare` | same |
| M1 | 4 | Baseline heads, tracked files only | mechanical | `prepare` | same |
| M1 | 5 | Sync: parallel fetch, `merge-tree --write-tree` probe, local merge of base or hold `sync-blocked` with no partial merge left. **No push: the merge travels with land** | mechanical | `prepare` | same |
| M1 | 6 | Ladder facts: every surface repo's rungs, in parallel across repos except rungs the registry marks `exclusive`; a red rung becomes a hygiene atom through `discover` and hold `baseline-red` | mechanical | `prepare`, sliced with exit 75 | same |
| M1 | 7p | Prepare the J1 span | mechanical | `stage prepare --span plan` | same |
| **J1** | 7, 8 | Plan (think); plan audit (think, a different task) when the plan is accepted; on `revise`, one more plan and audit, in the same span | judgement | the adapters | 2 (4 on a revise) |
| **M2** | 7f, 8f | Finalise: `build/plans/<id>.md`, `state.plan` | mechanical | `advance` | 1 step agent |
| M2 | 9 | Added repos: surface amendment, then 3 to 6 for those repos only | mechanical | `prepare --repos <keys>` | same |
| M2 | 10p | Prepare implement, standards from the planned files and every surface repo | mechanical | `stage prepare` | same |
| **J2** | 10 | Implement (doer) | judgement | the adapters | 1 |
| **M3** | 11 | Implement check: browser and Docker rungs of the changed repos, command invariants. On red, `run` resumes the implement task (at most 2 rounds) | mechanical | `tim backlog check --after implement` | 1 step agent (+1 per red round) |
| M3 | 12 | Manifest from the pinned heads, `rulesGap[]`, protected paths, no commit or ref moved | mechanical | `check` | same |
| M3 | 13p | Prepare the J3 span, every task folder at once, with `after`, `when` and `mustIf` | mechanical | `stage prepare --span review` | same |
| **J3** | 13 | Style and code review per content-changed file (doer), one consistency task (think) | judgement | span | 2F + 1 |
| J3 | 14 | Verify per file with findings, started when both of that file's reviews are accepted; verify-consistency when consistency has findings | judgement | span, `when: findings > 0` | K + 1 |
| J3 | 15 | Judge (think), when any finding stands or is unsure | judgement | span | 1 |
| J3 | 26d | Discovered-atom verifier (`REQUIREMENT_VERIFIER`, think), when the judge discovered work | judgement | span, `when: discovered > 0` | 0 typical |
| J3 | 16 | Fix (`REVIEW_ITEM_FIXER`, `STYLE_IMPLEMENTOR`), when any fix-now ruling exists; its `stage accept` saves the fix diff | judgement | span, `when: fixNow > 0` | 1 |
| J3 | 17 | Fix verify (doer, a different task) from the saved diff; the consistency task again when the fix touched a seam file; one more fix round and fix-verify when a fix is refuted | judgement | span | 1 |
| **M4** | 11r | Implement check after the fix. On red, `run` resumes the fixer, and the fix-verify is re-run because its upstream sha no longer matches | mechanical | `check --after fix` | 1 step agent |
| M4 | 18 | Ladder: registry rungs, then plan extras. On red, `run` returns a repair task, then `check --after repair`, then a repair-review span | mechanical | `tim backlog prove` | same (+1 per repair round) |
| M4 | 19 | Secrets | mechanical | `prove` | same |
| M4 | 20 | Integration proof: `tim docker dev` with the include list, one shard per call sized from recorded durations, one retry of failed shards, `tim docker down` always, the record from the JSON reporter. On red, e2e-repair as above | mechanical | `prove`, sliced with exit 75 | same |
| M4 | 21p | Prepare acceptance, never with the plan | mechanical | `stage prepare` | same |
| **J4** | 21 | Acceptance (think) | judgement | the adapters | 1 |
| **M5** | 22 | Land: commit each touched repo by name with `-F`, the trailer and a `Backlog-Increment:` trailer, in merge order; branch proof and fast-forward check; then one push per repo | mechanical, then outward | `tim backlog land`, then visible `git -C … push` calls | 1 step agent |
| M5 | 23 | Draft PR per repo, only where tim observes no open PR | outward | visible `tim github pr ensure-draft …` per repo | same |
| M5 | 24 | CI: every PR's checks for its head; SonarCloud from the PR checks. On red, `run` returns a CI fixer, then a repair-review span | mechanical | `tim backlog ci-wait`, in-process, sliced | same |
| M5 | 25 | Merge, under `per-increment` only, after every PR is green and approved where required | outward | visible `tim github pr merge …` per repo, `consumes` order | same |
| M5 | 26 | Record: adopt verified discovered atoms, `status done` (the audit), report, handover, the state commit by name | mechanical | `tim backlog record` | same |
| M5 | 26s | Push the state branch, when `record` is `commit-push` | outward | visible `git -C … push` | same |
| M5 | 27 | Checkpoint | mechanical | in-process | same |
| M5 → M1 | 1… | Next increment | mechanical | the same step agent carries on into M1 | none extra |

- **Typical increment** (3 repos, F = 12, K = 6, consistency findings, one fix round, CI green): J1 2, J2 1, J3 24 + 1 + 7 + 1 + 1 + 1 = 35, J4 1: **39 judgement**; M2, M3, M4 and M5 (carrying the next M1): **4 step agents. Total 43.**
- **Clean increment**: J1 2, J2 1, J3 25, J4 1 = 29; 4 step agents; **33**.
- **Under `quality.integrationProofSource: ci`**: M4 runs ladder and secrets only; M5 lands, publishes and waits for CI, then returns J4 as `run`; a second M5 agent records. One more step agent per increment in that mode.
- **Conditional additions**: +1 step agent per red implement check, repair round, CI fix or post-fix red. A seam re-check, a second fix round, a discovered-atom verifier and a plan revise cost judgement tasks only, inside their spans.

### 3.1 The script loop (`backlog-build.js`; `backlog-distil.js` is the same over `--distil`)

1. Take `firstStep` from args when `run open` returned one; otherwise spawn a step agent.
2. On `run`: check the relayed count and `stage.json` sha (C-070); walk the span graph with the one walker helper (4.6 contract item 6), spawning Claude tasks through the Claude adapter, and one Haiku Codex runner beside them when the span has Codex-bound tasks. A task starts when every `after` task has an accepted receipt and its `when` holds on their counts. An upstream that dies or is refused ends the walk for its dependants; the next `advance` re-derives them.
3. When the span is walked: if `stage.json` says `then: close`, return to the launching session; otherwise spawn a step agent.
4. On `handback`: spawn a fresh step agent. On `stop`: return the stop reason and the run summary.

There is no `act` and no `wait` branch in the script: the step agent runs outward calls itself and loops exit 75 itself.

### 3.2 The step agent's prompt (a fourth canonical text in `docs/agent-rails/GUARD-RAILS.md`)

```
${GUARD_RAILS}
You run the pipeline's commands. You make no decisions.
1. Run: ${TIM} backlog advance ${P} --run ${LABEL} --agent ${AGENT_ID} --json   (Bash timeout 600000)
2. If it exits 75, run exactly the same command again.
3. If "status" is "act": run each commands[i] exactly as given, one Bash call each, in order.
   Stop at the first that exits non-zero. Then go to step 1.
4. If "status" is "run", "handback" or "stop": return the JSON's "step" object exactly as printed,
   with the exit code of every command you ran and the "wrote" paths tim printed.
Never run any other command. Never change a command. Never read or edit a file.
```

`${AGENT_ID}` is `<runLabel>:<n>`, from the script's counter. The exit codes it reports are journal notes only; tim establishes every result by observation.

---

## 4. The final distil stage list

Phase ids of 5.2 stay. Gates stay in-process. Spans join every pair of model phases with nothing mechanical between them.

| Run or span | Phases | Kind | Runs as | Agents, typical |
|---|---|---|---|---|
| (launching session) | 0 setup; 2 acquire for pasted material | judgement (the skill) | the skill | 0 |
| (launching session) | `run open --mode distil` | light | tim | 0 |
| **DM0** | 1 heads; 2 acquire (network); prepare the DJ1 span | mechanical | step agent | 1 |
| **DJ1** | 3 characterise per source; 4 extract-verify per source, started when its own characteriser is accepted; 5 carryover after every characterise, only when earlier work exists | judgement | span | 8 |
| **DM1** | P1 `units --strict`; prepare 5a reslice (own span, when migrated rows exist) or 6 slice | mechanical | step agent | 1 |
| **DJ2** | 6 slice; `then: close` | judgement | span | 1 |
| (launching session) | `run close`: P2 `slices --strict`, stop `contract`. **Launch 1 ends** | light | tim | 0 |
| (launching session) | 7 contract; then `run open`, which prepares the DJ3 span and returns `firstStep` | judgement, then light | the skill and Sam | 0 |
| **DJ3** | 8 author per slice; 9 verify per slice when its author is accepted; the added-atom verifier when the first verifier added atoms | judgement | span | 6 + 6 + 2 |
| **DM3** | Finalise verdicts; 10 `yield`, `coverage`; prepare the gap span, or skip to reconcile | mechanical | step agent | 1 |
| **DJ4** | Gap auditor, then its verifier, per flagged slice | judgement | span | 2 |
| **DM4** | P3 `yield --strict`, `coverage --strict`; prepare 11 | mechanical | step agent | 1 |
| **DJ5** | 11 reconcile | judgement | span | 1 |
| **DM5** | Precedence picks recorded; a panel span when a conflict survives, else `duplicates` and the dedupe span | mechanical | step agent | 1 |
| **DJ6** | 12 panel: per docket 3 judges at once, then the chair, dockets one at a time (Opus cap); then the critic | judgement | span | 5 |
| **DM6** | `rule --by panel`, escalations as questions, `duplicates`; prepare 13 | mechanical | step agent | 1 |
| **DJ7** | 13 dedupe | judgement | span | 1 |
| **DM7** | 14 `ingest --atoms` (P7, P11), 15 `trace --strict` (P4); prepare 16 and 17 as one span | mechanical | step agent | 1 |
| **DJ8** | 16 critic; 17 question editor then question critic, `when: critic.newAtoms = 0` (otherwise the span ends and `advance` returns the new atoms to author and verify, at most two rounds) | judgement | span | 3 |
| **DM8** | P8 `question lint`, `rule --by default`, `candidates --combine`; prepare 18 | mechanical | step agent | 1 |
| **DJ9** | 18 combiner, then combine verifier; the combiner again and a second verifier only when the first found failures | judgement | span | 2 |
| **DM9** | `ingest --increments`, `check --strict` (P9, P11); prepare 19 as one span | mechanical | step agent | 1 |
| **DJ10** | 19 per section group: prose editor, then claim verifier when its editor is accepted | judgement | span | 8 |
| **DM10** | Rewrites through `set`; 20 `report`, `report --lint`; prepare cold readers for non-empty sections only | mechanical | step agent | 1 |
| **DJ11** | 20 cold reader per non-empty section; `then: close` | judgement | span | 11 |
| (launching session) | `run close`: finalise, phase `done`, final render, the state commit by name. **Launch 2 ends** | light | tim | 0 |
| R1 | `apply-rulings` | judgement | one span plus one step agent, only when a free-text ruling is pending | 0 typical |

**Typical run**: judgement 4 + 4 characterise and extract-verify, 1 slice, 14 author and verify, 2 gap, 1 reconcile, 5 panel, 1 dedupe, 3 critic and questions, 2 combine, 8 prose, 11 cold readers = **56**; step agents DM0, DM1, DM3, DM4, DM5, DM6, DM7, DM8, DM9, DM10 = **10**; **66** against 81. With no flagged slice, DJ4 and DM4 go and DM3 prepares reconcile: 64.

**Under `distil-codex`**: DJ1, DJ3 and DJ4 run inside `advance` through `tim backlog codex run`. DM0 and DM1 merge into one step agent; DM3 and DM4 merge with the step agent that `run open` hands to after the contract (the author span is heavy, so `run open` returns `handback` rather than `firstStep`). About 8 step agents plus handbacks on long Codex phases, and 32 Claude judgement tasks: about 40 to 42.

---

## 5. The tim commands

All follow `tim/CLAUDE.md`: a sibling `*.test.js`, input and output tests, git fixtures for git, undici MockAgent for HTTP, no shell-out to `gh`, `jq`, `curl` or `tools/*.sh`, GDS plain English, the schema-versioned `--json` envelope. Every command takes `--op-id`, is idempotent at sub-step granularity (it checks the sub-step's fact record and the pinned heads before re-running it), writes fact records, and stops itself with exit 75 before 540 seconds. Each is callable on its own; `advance` calls the same functions in-process.

### 5.1 The loop and launch

| Command | Does |
|---|---|
| `tim backlog advance <p> --run <label> --agent <id> [--distil] [--budget-seconds 540] [--json]` | Accepts pending drafts and finalises; re-derives the resume point; **executes** every mechanical sub-step in stage-table order until it reaches `{status: run, span, tasks[], count, stageSha, then}`, `{status: act, commands[]}`, `{status: handback}` (this agent reached `quality.stepBudget` calls, counted per `--agent`), `{status: stop, stopReason}`, or exits 75. Observes every outward effect on the next call. `--record` and `wait` are removed |
| `tim backlog run open <p> --label <l> --mode build\|distil --at <ISO> --trailer-file <f> [--pin] --json` | Preflight (state branch, tim root, the pinned tim answers `--version --json`), the pin, `run start`, stage schemas exported, then `advance` while the next sub-steps are `light`. Prints the Workflow args, with `firstStep` when it reached a `run` |
| `tim backlog run close <p> --label <l> --json` | `advance` while the remaining sub-steps are `light` and end in a stop; then `run end`, `counts` and the handover print |
| `tim backlog pin --commit <sha> [--json]` | Clones the workspace at the commit into `workareas/clones/pipeline-pin/`, installs tim through the canonical real path (`pwd -P`, so the lockfile trap cannot corrupt it), reuses an intact pin at the same commit, prints the pinned prefix. Replaces `pin-tools.sh` |

### 5.2 Build macros

| Command | Ids | Does | Reuses |
|---|---|---|---|
| `tim backlog prepare <p> --run <l> [--inc <id>] [--repos <key>...] --json` | 1-6, 7p; 9 with `--repos` | Sam's mega prepare: next and bindings; the Jira create as `act` when `ticketing` is set; branch checkout, track or cut under one name; `heads --for --strict`; parallel fetch; `merge-tree` probe; local merge of base, or abort and hold `sync-blocked`; baseline rungs; hygiene `discover` and hold `baseline-red`; fact records; `stage prepare --span plan` | `workspace/branch.js` (`inspectAll`, `fetchAll`, `checkoutArgs`), `exec/exec.js`, `exec/parallel.js` `runAcross`, `backlog/heads.js`, new `backlog/git/{branch,merge,commit,stash}.js` |
| `tim backlog rung <p> --run <l> --inc <id> --repo <key> --rung <name> [--shard <i>/<n>] [--phase baseline\|check\|ladder\|proof] --json` | one rung | Runs one npm, mvn or committed-script rung in the foreground; log and fact record; `skipped-undefined`; `could-not-run:uncommitted` (C-067); `could-not-run:timeout` becomes hold `environment` with a release command. Replaces `run-rung.sh` | `workspace/test.js` npm and Maven detection, `exec.js` with a timeout |
| `tim backlog check <p> --run <l> --inc <id> --after implement\|fix\|repair --json` | 11, 12 | Browser, Docker and command-invariant rungs of the changed repos; the manifest from the pinned heads with `rulesGap[]`, protected-path refusal and the proof that no HEAD or remote ref moved; prepares the next span | `rung`, `exec/stack.js`, `stage manifest` |
| `tim backlog prove <p> --run <l> --inc <id> [--budget-seconds 540] --json` | 18-20, 21p | Ladder and plan extras; `secrets --inc`; `tim docker dev --include <touched>`; shards; one retry; `tim docker down` always; `state.integrationProof` from the JSON reporter; prepares acceptance | `rung`, `exec/stack.js`, `commands/docker` (gains `--include`), `backlog/secrets.js` |
| `tim backlog land <p> --run <l> --inc <id> --json` | 22 | Commits each touched repo by name with `-F` and the trailer from `run.json`, plus `Backlog-Increment: <p>/<inc>/a<n>` so a re-run finds it and never commits twice; wip commits and named-path stashes for red work; branch proof (on `<b>`, not `main` or `master`, refspec names it) and fast-forward check against the observed remote ref; returns the push commands as `act`, or none under `local` delivery | `backlog/git/commit.js`, `graph.js` merge order |
| `tim backlog ci-wait <p> --run <l> --inc <id> [--budget-seconds 540] --json` | 24 | Every PR's check runs and statuses for its head through octokit; SonarCloud from the checks or "no report"; exit 2 unresolved, 4 none, never green; a red check returns the CI fixer as `run` | `github-client` (gains `listCheckRunsForRef`, `getCombinedStatus`), `gha-client` polling |
| `tim backlog record <p> --run <l> --inc <id> --json` | 26, 27 | Adopts verified discovered atoms, `status done --done-by build`, report, handover, the state commit by name; returns the state push as `act` when `record` is `commit-push` | the writer core, `backlog/git/commit.js` |
| `tim backlog codex run <p> <stageDir> [--budget-seconds 540] [--check] --json` | any Codex stage | `run-stage.sh` in tested JavaScript, same contract and exit codes (8.2): `CODEX_HOME`, the stage lock, concurrency by sandbox, starts and resumes, accept after every draft with three correction rounds, the descendant-tree kill, five slices, `runner.json` | `exec.js`; `test-support/fake-codex.js` replaces `fake-codex.sh` |
| `tim backlog stage prepare <p> … --span <name>` | any span | Prepares every task of a span: upstream references by path, `after`, `when`, `mustIf` standards entries, `then` | `stage prepare` |

### 5.3 Outward commands (each issued only as its own visible call)

| Command | Does |
|---|---|
| `git -C <tilde repo> push -u origin refs/heads/<b>:refs/heads/<b>` | Native git, generated by `land` or `record` only after the branch proof and fast-forward check. Never `--force`, never a `+` refspec |
| `tim github pr ensure-draft --repo <slug> --head <b> --base <b> --title-file <f> --body-file <f> --json` | Creates or reuses a draft PR; exit 3 when only a merged or closed PR exists; never marks ready. `github-client` gains `pulls.list`, `pulls.create`, `pulls.update` |
| `tim github pr checks --repo <slug> --head <sha> [--wait] [--budget-seconds 540] --json` | Read-only check waiter with the exit-2-and-4 contract (req-001). `ci-wait` calls the same function in-process |
| `tim github pr merge --repo <slug> --number <n> --expect-head <sha> [--method merge] --json` | Merges one PR only if its head equals `--expect-head`, it is green, and it is approved where required. `github-client` gains `pulls.merge`, `pulls.listReviews` |
| `tim jira create --type <t> --summary-file <f> --description-file <f> [--parent <key>] --json`; `tim jira transition <key> --to <status> --json` | Jira writes. `jira-client` gains POST for issues and transitions |

### 5.4 Retired or never written

`tools/backlog/run-rung.sh`, `tools/backlog/pre-push-check.sh`, `tools/codex/run-stage.sh`, `tools/codex/fake-codex.sh` and `tools/backlog/pin-tools.sh` are not written. The ports of `tools/github/pr-ensure-draft.sh` and `tools/github-actions/wait-for-pr-checks.sh` are not made: the FA branch keeps its own copies for the legacy loop, and main's legacy loop does not call them (0.4). `tools/backlog/self-test.sh` shrinks to the two scripts that stay bash, `tools/codex/guard.sh` (a Codex hook adapter) and `tools/backlog/record-read.sh` (a Claude `PostToolUse` hook): their execute bit and `guard.sh --self-test`. `scripts/sonar/sonar-check-pending.sh` leaves the pipeline. `tools/npm/npm-in-repo.sh --clone` (req-002) stays for people; `tim backlog pin` follows the same canonical-path rule.

---

## 6. Agent counts, before and after

### 6.1 Build, typical increment, `claude` preset

| Agent | Before, per action (7.2) | Before, per stage (8.8) | After |
|---|---|---|---|
| Opus: plan, audit, consistency, judge, acceptance | 5 | 5 | 5 |
| Sonnet: implement, 24 reviews, 7 verifies, fix, fix verify | 34 | 34 | 34 |
| Haiku relays after a fan-out | 9 | 9 | 0 |
| Haiku action watchers | 49 | 11 | 0 |
| Haiku step agents | 0 | 0 | 4 in a drain (5 alone) |
| **Total** | **97** | **59** | **43** (44) |
| tim start-ups for mechanical work | about 100 (2 per action) plus 9 relays | about 30 | about 10 to 15 `advance` calls, one process each |
| Grows with repos, rungs, shards or PRs | yes | no | no |

### 6.2 Other presets and runs

| Run | Before (7.2) | After | How |
|---|---|---|---|
| `codex` preset | about 58 Haiku | about 2 Haiku | every model task runs inside `advance`; one step agent loops to the stop, plus a handback on a long increment |
| `codex-claude-checks` | about 62 | about 9 | 4 Claude judgement tasks (plan audit, judge, fix-verify, acceptance), one step agent after each, plus handbacks |
| `codex-review-only` | about 69 | about 12 | 6 Claude judgement tasks (plan, audit, implement, judge, fix, acceptance; 8.4's table), 4 step agents, and 1 or 2 Haiku Codex runners for the J3 span, where Codex reviews, verifies and fix-verifies beside the Claude judge and fixer. (The minimal proposal's "consistency stays on Claude" misreads 8.4: consistency is Codex high in this preset) |
| Distil, `distil-claude` | 81 | 66 | section 4 |
| Distil, `distil-codex` | about 57 | about 40 to 42 | section 4 |
| Per run, fixed | 1 resolve watcher, 8 main-session steps | 0 agents; `run open`, the Workflow call, `run close` | C-080 |

### 6.3 Why not fewer

- **The floor is one agent per gap.** A Workflow script cannot run a command. After every judgement span, something must accept, finalise and run the next mechanical step, and it must not be a judgement agent (Sam's rule).
- **M2 is a real gap.** Implement's standards depend on the plan's files, and an added repo needs a branch, merge and baseline first.
- **M3 is a real gap.** Reviews need the manifest, and the manifest needs the implement check.
- **M4 is a real gap.** The ladder and proof must pass before acceptance reads the proof record.
- **M5 is a real gap.** Land needs acceptance.

---

## 7. The safety line, per outward action

Visibility comes from the Bash call boundary, not from the number of agents, so keeping an action separate costs a Bash call inside the same step agent and never an agent. Every call below is allowlisted (`tim:*`, `git -C ~/…:*`), so the allowlist is not a gate. The gates are tim's refusals before the call is generated, guard-bash on the call, and observation after it.

| # | Action | Where it runs | Why | Observed by | To reverse |
|---|---|---|---|---|---|
| S1 | Push of the increment branch, per repo | **Its own visible call**, native `git -C … push -u origin refs/heads/<b>:refs/heads/<b>`, generated by `land`, in merge order | Hard to reverse, starts CI, exposes code. The refspec form cannot push `main` or force whatever the checkout does between check and push. guard-bash sees the refspec. Inside tim it would be invisible to every per-call guard, and octokit cannot push | `git ls-remote`: remote ref equals the landed head; a second unobserved attempt holds `land-failed`, naming the repo | Add `--push` to `land` so tim pushes in-process. One flag and its tests; guard-bash would no longer see the push |
| S2 | Push of the sync merge | **Not a separate push.** The merge commit travels with the increment's push at land | A sync that must be pushed on its own doubles the pushes and exposes an unproven merge. Nothing needs the merge remote before land | as S1 | `run set <p> quality.pushSyncMerge true` makes `prepare` return a push `act` after a clean merge |
| S3 | Push of the state branch | **Its own visible call**, generated by `record` | Shared state other sessions read; hard to reverse cleanly | `git ls-remote` | `run set <p> record commit` keeps the state commit local |
| S4 | Draft PR create or reuse | **Its own visible call per repo**, `tim github pr ensure-draft`, emitted only where no open PR is observed | Team-visible. Library-first is a tim rail (no `gh`, no `tools/*.sh`). The exit-3 idempotency becomes tested code. Per repo, so each call names its repo, head and base | octokit: an open draft PR on that head | Emit one `tim backlog pr ensure --inc` call for all repos instead: fewer calls, less legible |
| S5 | Waiting for CI | **tim, in-process** in `ci-wait` | Read-only | octokit check runs | Return `tim github pr checks --wait` as an `act` call |
| S6 | PR merge (`per-increment` only) | **Its own visible call per repo**, `tim github pr merge --expect-head`, in `consumes` order, never inside a macro. tim emits merges only when `delivery.merge` carries a person's decision, every PR in the increment is green and approved where required; a refused merge stops the rest with `pr-left-open` | The least reversible action, on a shared `main`. `--expect-head` makes merging anything but the proven head impossible. One call per repo keeps each merge a separate, named call | octokit: merge commit on base | Set `delivery.merge` to `never` (this programme's setting): no merge is ever emitted |
| S7 | Jira create and transition (when `ticketing` is set) | **Its own visible call**, `tim jira create` in M1, `tim jira transition` in M5 | A write other people see, outside the repos | `jira-client`: the ticket by label `<p>/<inc>`, and its status | Leave `ticketing` unset (this programme's setting) |
| S8 | Local git writes: branch cut, merge of base, increment commits, wip commits, named-path stashes, the state commit | **tim, in-process** | Local and reversible, tested on fixtures (conflict, dirty tree, detached HEAD, commit found again by trailer). A committed test guards them better than a Haiku typing the command. guard-bash no longer sees them; C-042's rule is revised to "tim never pushes, never opens or merges a PR, never writes to Jira itself" | fact records with heads before and after | Stage-table flag `localGit: act` returns each as a visible `act` call: no agent cost, more Bash calls |

Under the Codex-orchestrated mode (8.11) no Claude hook runs, so tim's refusals and observation are what remain. Putting them in tested code is a gain there too.

---

## 8. What survives

- **Quality.** No judgement stage is lost or merged. Per-file style and code review, per-file verification, consistency, judge, fix, fix-verify, plan audit and acceptance run exactly as 7.4 and R6 specify. Fix-verify now runs before the post-fix implement check, still before the ladder (req-065); a red check resumes the fixer and the audit refuses a fix-verify whose upstream sha no longer matches the final fix diff. Judgement agents never run a rung, a diff, a scan or a stack: they read the fact records.
- **Reliability.** Every rung, merge, commit, push-generation and observation is tested tim code. No Haiku relays an exit code the audit trusts. A misrelayed span graph or count is caught by the C-070 sha check, or corrected by the next `advance`, which re-derives the span from disk.
- **Resume.** `advance` derives the resume point from persisted state. Each macro skips a sub-step whose fact record exists at the same heads and tree fingerprint. Outward steps are idempotent by observation. A step agent killed mid-macro is replaced; the next one carries on at the next sub-step. `resumeFromRunId` replays harmlessly.
- **Codex parity (R6).** Both executors meet the same mechanical layer, the same spans, the same `when` rules and the same per-file granularity. `compare` gains "cheap agents per increment" from the journal, which is the saving R6 exists for. The Codex-orchestrated loop is the step agent's loop, with a Claude-bound task stopping it `claude-needed`.
- **Full-stack slices (R7).** Nothing fans out per repo. One branch name everywhere, one stack with the include list, landing and PRs in `consumes` order, merges only when everything is green.
- **Hooks (R4).** Per-call hooks see every outward call and every judgement agent's calls. Local git writes are inside tim calls.

### 8.1 Considered and not adopted

| Idea | From | Why not | To reverse |
|---|---|---|---|
| Verify batched per repo and review family | minimal | Saves 2 Sonnet agents an increment but weakens per-file attention, the granularity R6 sets as the bar for review, and a judgement-quality change is outside a consolidation of mechanical cost | Add `fanOut: per-repo-family` to the verify stage and `quality.verifyBatch` |
| The launching session runs the build's first `prepare` | minimal | It is heavy (rungs, fetch, merges) and would run deterministic work in the orchestrating Opus session | Mark `prepare`'s sub-steps `light` |
| Detached rungs that outlive a Bash call | macro (as a probe) | Escapes per-call guards and breaks 0.3's "nothing outlives a Bash call". Shards under one call already serve | none needed |
| Last `stage accept` finalises and prepares the next stage | both rejected | Deterministic work inside a judgement agent, which Sam ruled out | none |
| One PR command for every repo | macro | Less legible per call, at no agent saving | S4 |

---

## 9. Change list

C-ids added to the change list by this decision: **C-074** one step agent per gap; **C-075** tim executes local effects, outward stays visible (revises C-002's and C-042's wording, keeps C-042's reason); **C-076** outward results by observation, `--record` and `wait` go, branch proof and fast-forward check in tim, `sonar-check-pending.sh` leaves the pipeline; **C-077** judgement spans; **C-078** Codex runner in tim; **C-079** bash lifecycle tools retire into tim, the pin allow rule goes; **C-080** `run open` and `run close` absorb light work; **C-081** skip rules on disk, cold readers skip empty sections; **C-082** MACed fact records.

### g1: DESIGN §0 to §3

- **K-001** Preamble (line 3): after "changes C-001 to C-073" add "; the consolidation (`design/consolidation/decision.md`, C-074 to C-082) then removed every mechanical agent but one per gap between judgement spans".
- **K-002** §0.1, bullet "tim decides, Claude watchers execute": replace with "**tim decides and executes; agents judge.** `tim backlog advance` holds every transition rule and runs every local, reversible step itself: branches, merges of base, rungs, the stack, manifests, commits, fact records and audits. One cheap step agent per gap between judgement spans runs it in a loop. Each push, pull request, merge and Jira write is generated by tim and run as its own visible call, and tim records its effect by looking (C-074 to C-076)."
- **K-003** §0.2 component table, row "Lifecycle execution": "Taken from" becomes "the judges' objection to codex, revised by the consolidation"; "What it covers" becomes "tim executes every local effect; each outward action is a separate generated call run by the step agent and observed afterwards"; "Merit in use" becomes "every outward action stays a call guard-bash sees, local steps become tested code, and a run spends 4 cheap agents an increment instead of 58 (C-075, C-076)".
- **K-004** §0.3 row 2 (Sonar): "through the allowlisted CI waiter. The allowlisted `scripts/sonar/sonar-check-pending.sh` is an advisory reader, and its silence…" becomes "through tim's CI check waiter; silence is recorded as "no report", never "clean". `sonar-check-pending.sh` is not used: its records come from a hook that never fires for the build's pushes (C-076)."
- **K-005** §0.3 row 3 (push and merge into tim): replace the right cell with "tim never pushes, merges a PR or writes to Jira. Each is its own Bash call that tim generates only after its own refusals pass (branch proof, fast-forward, expected head, every PR green), run verbatim by the step agent, so guard-bash sees each one; tim then observes the effect. Every one of these calls is allowlisted (`settings.json:83, 88`), so the allowlist is not the gate (C-042, C-075, C-076)."
- **K-006** §0.3 row 4 (outlive a Bash call): replace "Ladder rungs run one per call." with "Every tim macro and the Codex runner end their call before 540 seconds with exit 75, killing every descendant process first."
- **K-007** §0.3 row 5 (stage machine): replace "tim decides, Claude watchers execute." with "tim decides and executes; agents judge." and "Lifecycle commands are generated by tim and run verbatim by watchers." with "Outward commands are generated by tim and run verbatim by the step agent." and "tim never pushes, merges, calls GitHub or runs `tools/`" with "tim never pushes, merges a PR or writes to Jira itself, and never runs `tools/`".
- **K-008** §0.4: add a bullet "**Consolidation facts** (19 September): tim spawns through execa (`exec/exec.js:24, 52`) and runs across repos (`exec/parallel.js:12`); `workspace/branch.js:146-151` creates only a tracking branch; `github-client.js` and `jira-client.js` are read-only; `Bash(tim:*)` and `Bash(git -C ~/…:*)` are allowlisted (`settings.json:83, 88`), so outward tim and git calls are auto-approved and guard-bash (`settings.json:100-109`) is the per-call hook that sees them; the review skill has no verifier persona (`review/SKILL.md:65-67`)." In the "Branch-only helpers" bullet add "They are not ported: tim's `github pr` commands carry their contracts (C-079)."
- **K-009** §1 principle 8: after "the next stage is decided by one tested command (`tim backlog advance`, C-002)" insert ", which also runs every deterministic step, issued by one cheap step agent per gap and never by a judgement task (C-074, C-075)".
- **K-010** §2.1 distil main-session lines (145): `tim backlog run start … ; Workflow(...)` becomes `tim backlog run open <p> --label <runLabel> --mode distil --at <ISO> … ; Workflow({scriptPath, args}) ; tim backlog run close`.
- **K-011** §2.1 distil box lines 149-150: "a thin interpreter: loop tim backlog advance --distil --json -> run | wait | stop" becomes "a thin interpreter: a step agent per gap loops advance --distil -> run (a span) | act | handback | stop"; "[Claude agent | Codex via run-stage.sh]" becomes "[Claude agent | Codex inside advance: tim backlog codex run]". Add a line under 151: "spans: characterise -> extract-verify per source ; author -> verify per slice ; gap -> gap-verify ; judges -> chair -> critic ; critic -> questions ; combiner -> verifier ; editor -> claim verifier". Line 176: "COLD_READER per section" becomes "COLD_READER per non-empty section (C-081)".
- **K-012** §2.1 build main-session lines 196-198: `tim backlog run start …` becomes `tim backlog run open …`, and add `tim backlog run close` after the Workflow line.
- **K-013** §2.1 build box lines 202-204: replace with "LOOP one step agent per gap: tim backlog advance <p> --run <label> --agent <id> --json (C-002, C-074) / run -> walk the span graph through the adapters ; act -> the step agent runs each outward command as its own call, observed on the next advance ; handback -> fresh step agent ; stop -> return".
- **K-014** §2.1 build stage lines 206-234: prefix the groups with their runs and spans (M0 launch; M1 1-6; J1 7-8; M2 9; J2 10; M3 11-12; J3 13-17 with 26d; M4 18-20; J4 21; M5 22-27). Line 206 "0 resolve (once)" becomes "0 run open (launching session)". Line 208 "ladder facts via run-rung.sh" becomes "ladder facts: tim backlog prepare, in-process". Line 215 "watchers run browser and Docker rungs" becomes "tim backlog check runs browser and Docker rungs". Line 227 "watcher commands, sharded" becomes "tim backlog prove, sharded". Lines 229-230: add "push, draft PR and merge are visible calls; CI wait in-process".
- **K-015** §2.1 lines 235-238 (model stage): replace the Codex line with "Codex: advance runs the tasks in-process (tim backlog codex run) ; a span mixing executors adds one Haiku Codex runner".
- **K-016** §2.2 table: Decision engine row, "returns one step: `run`, `act`, `wait` or `stop`" becomes "executes every local mechanical step and returns `run`, `act`, `handback` or `stop`, or exits 75". Codex runner row: path becomes `tim backlog codex run` (`tim/src/backlog/codex/`) and `tools/codex/guard.sh`; `fake-codex.sh` becomes `tim/src/test-support/fake-codex.js`. Delete the rows "Rung runner" and "Pre-push check". Tool pin row: path becomes `tim backlog pin`. PR and CI helpers row: becomes "`tim github pr ensure-draft | checks | merge`, `tim jira create | transition` | tim commands | new writes through octokit and `jira-client`; the bash helpers are not ported (C-079)"; keep `npm-in-repo.sh --clone` as its own row, "ported". Add rows: "Step agent prompt | Canonical text | `docs/agent-rails/GUARD-RAILS.md`, fourth text | New (C-074)"; "Span walker | Workflow helper | both workflow scripts, between marker comments | New (C-077); byte-identical, run on fixture graphs by the contract test"; "Mechanical macros | tim commands | `tim backlog prepare | rung | check | prove | land | ci-wait | record | run open | run close`, `tim/src/backlog/macros/**`, `tim/src/backlog/git/**`, `tim/src/backlog/facts.js` | New (C-075, C-082)".
- **K-017** §3.1 files table: add a row "`build/runs/<label>/<inc>/a<n>/facts/<step>.json` | One fact record per mechanical sub-step: `{step, argv, cwd, exit, log, logSha, startedAt, endedAt, headsBefore, headsAfter, observed, factMac}` (C-082) | tim only | `stage accept`, `stage audit`, resume | no (inside `build/runs/`)". In the `build/state.json` row, "Written by" adds "the macros". In the `build/.accept-key` row, "Read by" adds "fact records".

### g2: DESIGN §4 to §6

- **K-018** §4.2 decision-engine table: replace the `advance` row's command with `advance <p> --run <label> --agent <id> [--inc <id>] [--budget-seconds 540] [--json]` and its text with section 5.1's `advance` row, keeping "the loop's resume rule … ported and tested" in Reuses. The `advance --distil` row: "Only model phases come back as `run`" becomes "Model phases come back as spans; a stage whose remaining work to a stop is light carries `then: close`". Delete the `advance --record` row.
- **K-019** §4.2 paragraph at line 943: replace with "An `act` command is always an outward action: a native refspec push generated after tim's branch proof and fast-forward check, `tim github pr ensure-draft`, `tim github pr merge --expect-head`, or `tim jira create | transition`. The step agent runs each verbatim as its own call, and the next `advance` observes its effect. Every local step runs inside tim (C-075, C-076)." Keep the sentences from "Verify-skip, fix rounds…" to the end.
- **K-020** §4.2: add a table "**Mechanical macros and outward commands** (C-074 to C-079)" holding section 5.2 and 5.3's rows, and `tim backlog codex run` and `tim backlog pin`.
- **K-021** §4.2 "Build state and run configuration" table, `run` row: add `open` and `close` with section 5.1's text. "Stages, context and proofs" table, `stage prepare` row: add `[--span <name>]`, "prepares every task of a span with upstream references, `after`, `when`, `mustIf` and `then`".
- **K-022** §4.3: line 1005 "The workflows also serialise writes through one watcher at a time." becomes "Only one step agent is in flight at a time, so mechanical writes are serial." Exit codes: add "75 slice boundary, call again".
- **K-023** §4.5 opening paragraph: "tim decides the order of stages and every transition; it never executes a lifecycle effect (C-002)" becomes "tim decides every transition and executes every local, reversible effect; outward effects are generated, run as visible calls and observed (C-002, C-075)". Replace its last sentence with "Outward commands (push, PR, merge, Jira) are generated by tim and run verbatim by the step agent, one Bash call each, so guard-bash sees every one (C-042, C-076)."
- **K-024** §4.5 stage table bullet: fields become `{id, kind: mechanical | outward | model, cost: light | heavy, span, role, fanOut, requires[], inputs[], brief, schema, bindable, sandbox, after[], when, transitions}`. Add: "`cost` is `heavy` for any sub-step that runs a rung, the stack, Codex, a network call or a git write in a product repo; `run open` and `run close` run only `light` sub-steps (C-080). Every conditional stage's `when` is data the audit re-derives (C-081)."
- **K-025** §4.5 `stage prepare`: step 6 "what the watcher relays" becomes "what the step agent relays". Add step 8: "With `--span`, it prepares every task of the span at once: a downstream task's `input/upstream/` holds references by path to its upstream outputs, and its `standards.json` marks entries `mustIf` a ruled file, so the reading audit requires only those that apply (C-077)."
- **K-026** §4.5 `stage accept`: step 2 "ladder results against the recorded `.exit` files" becomes "ladder results against tim's fact records". Add to step 7: "The receipt carries `counts` (`findings`, `standing`, `fixNow`, `added`, `discovered`, `newAtoms`) and `upstreamShas`. A fix task's accept saves its diff from the pre-fix fingerprint for fix-verify."
- **K-027** §4.5 `stage audit`: add three bullets. "**Facts.** Every mechanical sub-step the stage table requires has a fact record whose `factMac` verifies (C-082)." "**Observation.** Every outward action has an `observed` record: remote ref, PR, check, merge or ticket (C-076)." "**Spans and skips.** Every span task's `upstreamShas` equal its upstreams' accepted outputs, and every skipped conditional task's `when` is false on disk (C-077, C-081)." Line 1061: "even if a watcher misrelays a count" becomes "even if a step agent misrelays a count".
- **K-028** §4.5 line 1065: replace with "tim runs git through `src/exec`. It writes only to local repos: branches, merges of base, commits, wip commits, named-path stashes and the state commit, each tested on git fixtures. It never pushes, opens or merges a PR, or writes to Jira itself; it generates those as visible calls (C-075)."
- **K-029** §4.6 tools table: delete the rows for `tools/codex/run-stage.sh`, `tools/backlog/run-rung.sh`, `tools/backlog/pre-push-check.sh`, `tools/backlog/pin-tools.sh`, and the `pr-ensure-draft.sh` / `wait-for-pr-checks.sh` part of the ported row (keep `npm-in-repo.sh --clone`). Codex home row: "symlinked in at run time by `run-stage.sh`" becomes "by `tim backlog codex run`". `self-test.sh` row: "Runs `--self-test` for `guard.sh` and checks that `guard.sh` and `record-read.sh` are mode 100755 at HEAD". Unchanged row: remove `scripts/sonar/sonar-check-pending.sh`.
- **K-030** §4.6 canonical rails: "three texts" becomes "four texts". PUSH RULE: "with the proof run by `tools/backlog/pre-push-check.sh`" becomes "with the proof and a fast-forward check run by `tim backlog land` and `record` before any push is generated; no push is ever generated with `--force` or a `+` refspec". COMMIT RULE: "commit with `-F <file>`…" gains "tim makes every commit (`land`, `record`); no agent commits". Add "**STEP AGENT:** the prompt in `consolidation/decision.md` 3.2." Contract test: item 1 covers four texts; add "6. The span walker helper, extracted with acorn, run on fixture graphs with a fake `agent()`: `after`, `when`, a dead upstream and a misrelayed count."
- **K-031** §4.6 "New scripts and the execute bit": "The tool self-test fails if any `tools/backlog` or `tools/codex` script is not 100755" becomes "…if `tools/codex/guard.sh` or `tools/backlog/record-read.sh` is not 100755".
- **K-032** §4.7: "git fixtures" bullet gains "including write operations: branch cut tracking a remote, clean and conflicting merges of base, commits found again by trailer, named-path stash, and the refusal to generate a push from `main` or a non-fast-forward". Add "octokit writes and `jira-client` POSTs tested with undici MockAgent (`test-support/http-mock.js`)" and "a fake Codex binary under `test-support/`". New dependencies: add "none for the consolidation: the descendant walk parses `ps -A -o pid=,ppid=` through `exec.js`".
- **K-033** §4.8 file ledger: delete the rows for `tools/codex/run-stage.sh, fake-codex.sh`, `tools/backlog/run-rung.sh`, `pre-push-check.sh`, `pin-tools.sh`; `self-test.sh` row: "the two remaining bash scripts". Rewrite the `advance/**` row: "…and executes every local mechanical step, so a run spends one cheap agent per gap between judgement spans rather than one per action (C-074, C-075)". Workflow rows: "run, act, wait or stop" becomes "run (a span), act, handback or stop". Add rows for `tim/src/backlog/macros/**`, `git/**`, `codex/runner.js`, `facts.js`, the span walker, and the `tim github pr` and `tim jira` write verbs, each with its in-use merit from section 5 and 7 here.
- **K-034** §5.1 NEW and RESUME modes: "`tim backlog run start`" becomes "`tim backlog run open`", passing `firstStep` into args when it returns one; after the Workflow returns, the skill runs `tim backlog run close`.
- **K-035** §5.2 intro paragraph (line 1181): "no watcher agent is spent relaying a tim command" becomes "a run of in-process phases between two model spans costs one step agent, and none at the start or end of a launch when its work is light (C-074, C-080)"; "watcher is Haiku at low effort" becomes "step is Haiku at low effort". "Runs in" column: name each phase's span or step run as in section 4 here. Phase 20: "COLD_READER (doer), a fresh task that reads each section on its own" gains "; a section that renders empty is recorded "not read: empty" (C-081)". Gate paragraph (line 1211): "This removes a watcher round trip per tim phase" becomes "A gate is where a span ends, and so where a step agent is spent".
- **K-036** §5.11: add "Codex-bound distil phases run inside `advance --distil`, so under `distil-codex` they cost no Claude agent; the Opus cap also governs span walking."
- **K-037** §5.12: add "Fact records and `upstreamShas` are part of the resume point: a step agent that dies mid-run is replaced and carries on at the first sub-step with no fact record."
- **K-038** §6.2, section 11 "How this was checked": add "cold readers: sections read, and sections not read because they rendered empty".

### g3: DESIGN §7 and §8

- **K-039** §7.1 procedure: the preflight, pin and `run start` steps become one `tim backlog run open` step; `run end`, `counts` and the handover print become `tim backlog run close`. Line 1785: "a pinned tool's `--check` runs without a permission prompt" becomes "the pinned tim answers `--version --json` without a permission prompt".
- **K-040** §7.2 loop: replace steps 1 to 5 with section 3.1 here. Replace the ceiling bullet's arithmetic with "a typical increment spends about 43 agents, so a run covers about 16 increments before the 200-agent reserve".
- **K-041** §7.3: args gain optional `firstStep`. Preflight moves to `run open`; its third check becomes "with `args.pin` set, the pinned tim answers `--version --json` headless".
- **K-042** §7.4 intro paragraph: replace the "Watcher" definition with "'Step agent' means the one cheap agent for the run of mechanical sub-steps the row sits in (C-074). 'Visible call' means an outward command the step agent runs as its own Bash call (C-076)." Add a "Run or span" column filled from section 3 here.
- **K-043** §7.4 table "Runs as" cells: 0 "`tim backlog run open`, launching session"; 2 "visible call `tim jira create`, generated by `prepare`"; 3 and 5 "tim, `prepare`; the sync merge is pushed with land"; 6 "tim, `prepare`, via `rung`"; 11 "tim, `check --after implement`"; 16 "…then `check --after fix` after fix-verify"; 17 "in span J3, before the post-fix check"; 18 "tim, `prove`"; 20 "tim, `prove`, sliced with exit 75"; 22 "tim, `land`, then one visible push per repo"; 23 "visible `tim github pr ensure-draft` per repo"; 24 "tim, `ci-wait`; SonarCloud from PR checks" (drop `sonar-check-pending.sh`); 25 "visible `tim github pr merge --expect-head` per repo"; 26 "tim, `record`; the discovered-atom verifier runs in span J3".
- **K-044** §7.4 stage details: Sharding, "one `run-rung.sh <tests> . npm test:docker-compose -- --shard=i/n` call" becomes "one `tim backlog rung --shard i/n` sub-step running the standard `test:docker-compose` script"; "so the suite now runs as watcher commands" becomes "so the suite now runs inside tim". Tooling increments: "through `run-rung.sh`" becomes "through `tim backlog rung`".
- **K-045** §7.6: line 1993 "a watcher commits these files by name … and pushes with the push rule" becomes "`tim backlog record` commits these files by name, and returns the state push as a visible call". Table row "Pull requests": "exit 3 from `pr-ensure-draft.sh`" becomes "exit 3 from `tim github pr ensure-draft`".
- **K-046** §7.7: add knobs `stepBudget` 40 (calls per step agent before handback), `rungParallel` true (rungs of different repos run at once, except registry rungs marked `exclusive`), `pushSyncMerge` false. `codexParallel` purpose: "by `run-stage.sh`" becomes "by `tim backlog codex run`".
- **K-047** §7.8: add "Within a mechanical run, resume starts at the first sub-step without a fact record at the current heads; outward steps already observed are not repeated."
- **K-048** §7.9 table: row "A watcher relays a wrong count" becomes "A step agent relays a wrong count, exit or span graph | Trusted | The audit re-derives it from disk; exits are hints, results are observed". Row "CI is green": `wait-for-pr-checks.sh` becomes `tim github pr checks`. Add row "A conditional task is skipped wrongly | Not checked | The next `advance` re-derives the span and runs it; the audit fails otherwise".
- **K-049** §7.10: the verifier for a discovered atom runs in span J3 when the judge discovered work, and `record` adopts it.
- **K-050** §7.12: `pin-tools.sh` becomes `tim backlog pin`, which reuses an intact pin at the same commit. Delete the sentence that the pinned bash tools need allow rules; the pinned tim runs through the allowed `npm --prefix` form.
- **K-051** §8.1: folder layout adds `facts/`. Receipt fields add `counts` and `upstreamShas`.
- **K-052** §8.2 Claude adapter: "relayed by a watcher" becomes "relayed by the step agent". Codex adapter: replace the watcher block and "`tools/codex/run-stage.sh <stageDir>` in full" with "`tim backlog codex run <p> <stageDir>`, called in-process by `advance`", keeping every behaviour bullet and the exit-code table; the slices bullet's "walking `pgrep -P` recursively" becomes "walking every descendant from `ps -A -o pid=,ppid=`"; `--self-test` becomes vitest against `test-support/fake-codex.js`; delete the `${PIN_TOOLS}` bullet. Add: "A span with both Claude and Codex tasks adds one Haiku Codex runner beside the Claude tasks, running `tim backlog codex run` (C-078)."
- **K-053** §8.3 profiles table: "Browser suites and Docker are run by the workflow's watchers, not by you" becomes "…are run by the pipeline's own commands, not by you" in both columns.
- **K-054** §8.4: tiers, "watcher is Haiku at low effort" becomes "step is Haiku at low effort". Line 2443 "Claude keeps only the watchers and the tool facts" becomes "Claude keeps only the step agents". "Where commands run" becomes "Rungs, browser suites, CI waits and the local stack run inside tim, started by the step agent's Bash call, whatever the preset. Neither executor runs them itself, so the comparison is symmetric. Each push, PR, merge and Jira write is its own visible call (0.3, C-075, C-076)." "No Sonnet or Opus under `codex`": "only Haiku watchers" becomes "about 2 Haiku step agents per increment".
- **K-055** §8.7 hooks table, PreToolUse row: add "Local git writes now run inside tim calls, tested on fixtures; every push, PR, merge and Jira write is still its own call guard-bash sees. These calls are allowlisted, so guard-bash, tim's refusals and observation are the gates (C-075, C-076)."
- **K-056** §8.8: replace the table and its paragraph with section 6.1 and 6.2 here.
- **K-057** §8.10: "Claude usage" gains "cheap agents per increment, by tier, from the journal".
- **K-058** §8.11: the loop is the step agent's loop (3.2 here) with `--record` removed; a Claude-bound task stops it `claude-needed`. Line 2699: "through the same committed commands (`run-rung.sh`, `tim docker dev` and `down`), and records them as a watcher would" becomes "through `advance`, which runs them inside tim".

### g4: DESIGN §9 to §12, `backlog.json` and `decisions-for-sam.md`

- **K-059** §9.2: delete owed item 2 (pinned tools allow rules) and renumber; in the SonarCloud item, "the advisory pending script" goes.
- **K-060** §9.3 rows: "Who owns the stage order" (line 2779): "tim decides, Claude watchers execute" becomes "tim decides and executes; agents judge"; "tim never pushes, merges, calls GitHub or runs `tools/`" becomes "tim never pushes, merges a PR or writes to Jira itself, and never runs `tools/`". "SonarCloud" (line 2791): drop "plus the advisory pending script". "Lifecycle actions" (line 2795): the right cell becomes section 7 here in two sentences: local effects in tim, tested; each outward action a generated visible call, observed; the allowlist is not the gate, guard-bash and tim's refusals are (C-075, C-076).
- **K-061** §10: strike any listed creation of `run-rung.sh`, `pre-push-check.sh`, `run-stage.sh`, `fake-codex.sh`, `pin-tools.sh` and the PR and CI helper ports; add "inc-040 retires nothing of these: they are never written (C-079)".
- **K-062** §11.1 item 3: delete "The pinned tools run headless only once Sam adds the pin allow rule (C-064, "Owed to you")."
- **K-063** §11.3 increments table: criteria column inc-001 5, inc-017 9, inc-019 12, inc-022 11, inc-029 6, inc-037 8, inc-041 5; members lists as K-073 to K-079; add inc-042 after inc-024: "Mechanical work costs no judgement and one cheap agent per gap | req-136, req-137 | inc-015, inc-019, inc-020, inc-022, inc-041 | m1 | todo | none | 6".
- **K-064** §11.3 "Where each change-list criterion landed": row "C-064, C-066" becomes "req-077 ac-2 and ac-3 in inc-024; the execute-bit criterion in inc-015 (req-050 ac-6, the Codex guard)". Add rows: C-074 "req-137 in inc-042"; C-075 "req-140 in inc-017, req-136 in inc-042"; C-076 "req-138 in inc-022"; C-077 "req-139 in inc-019"; C-078 "req-050 (reworded) in inc-015, req-137 ac-3 in inc-042"; C-079 "req-001 (reworded) in inc-001, req-077 ac-3 in inc-024"; C-080 "req-137 ac-4 in inc-042"; C-081 "req-139 ac-1, req-142 in inc-037"; C-082 "req-068 (reworded) in inc-021".
- **K-065** §11.4: "41 increments, inc-001 to inc-041" becomes "42 increments, inc-001 to inc-042". §11.5 atoms table: add rows req-136 to req-142 with key, title and increment from K-072. §11.6: "no increment exceeds 12 criteria (the largest has 10)" becomes "(the largest, inc-019, has 12)"; add "the new source `sam-steer` is quoted by req-136 to req-142, and its quotes were checked against its lines".
- **K-066** §12.1 risks: add "A step agent alters a generated command | the prompt forbids it, commands are short with tilde paths, every result is observed, and a push to the wrong ref leaves the expected ref unmatched and holds `land-failed` | inc-017, inc-022"; "The span walker diverges from `advance` | contract test on fixture graphs; the next `advance` re-derives the span; the audit re-derives every skip | inc-019"; "A relayed span graph is large | compact index encoding, count and sha checked (C-070), one re-call then hold | inc-019"; "Outward calls are allowlisted | tim refuses before generating (branch proof, fast-forward, expected head, every PR green, a person's merge decision), guard-bash sees each call, observation records it | inc-022". §12.2 prove-first: item 5 becomes "…drained by step agents only through `tim backlog advance`, with one step agent per gap"; add "Local git writes in tim on fixtures, including a push reported failed that reached the remote (inc-017, inc-022)" and "Agent counts per increment by tier from the journal of the first canary builds (inc-027), against decision section 6".
- **K-067** `backlog.json` `sources[]`: add `{"id":"sam-steer","kind":"brief","role":"requirement","locator":"workareas/shared/requirements-pipeline/design/consolidation/sam-steer.md","seal":null}` in the same shape as `sam-req`, and write that file with Sam's steer lines exactly as relayed in the consolidation task, one per line, headed "Relayed to the consolidation agents on 2026-09-19; the line "good shout on the tim mega prepare step" was relayed by the harness as Sam's own words".
- **K-068** `req-001`: statement becomes "The draft pull request command and the CI check waiter MUST be available in the writer's command line with the helpers' exit-code contracts." ac-1 "draft pull request helper" becomes "draft pull request command"; ac-2 "CI waiter" becomes "check waiter"; delete ac-3.
- **K-069** `req-050`: ac-6 becomes "Given the Codex guard on the branch, when its file mode is read at HEAD and in the working tree, then it is executable in both." Statement unchanged.
- **K-070** `req-055`: delete ac-3. `req-118`: delete ac-4.
- **K-071** `req-068`: statement becomes "Every ladder result MUST be the recorded exit code of its rung, written by the writer as a signed fact record, never an agent's report." ac-2 becomes "Given a fact record edited after the writer wrote it, when the increment is marked done, then the change is refused, naming the record." (witness `e2e`, source `sam-req` as ac-1). `req-077`: ac-1 "its watchers call the writer" becomes "the agents that run the pipeline's commands call the writer"; ac-2 "a watcher calls a pinned tool" becomes "an agent calls the pinned writer"; ac-3 becomes "Given a relaunch at the same commit, when the run starts, then the pinned copy is reused and not cloned or installed again." `req-121`: statement becomes "The next step of an increment MUST be decided by one tested command from recorded state, the same for a workflow run and a Codex-orchestrated session; that command MUST carry out every local, reversible step itself and MUST generate every outward action to be run verbatim as its own call." ac-2 becomes "Given recorded state after any stage, when the next step is asked for, then exactly one of run, act, handback or stop is returned, or the command asks to be called again; and every act names a generated outward command whose result is then established by reading the remote state."
- **K-072** `backlog.json` `requirements[]`: append seven atoms shaped like req-135 (`slice`, `kind: rule`, `actor`, `why`, `falsifiedBy`, `surface {service: requirements-pipeline, area, repos: [workspace]}`, `status: proposed`, `provenance {authoredBy {phase: design, task: consolidation-judge, run: null}, verifiedBy: null, verdict: unverified}`), sources `sam-steer` and `sam-req` line 134 ("Collapsing a fixed per-run overhead **is** a valid criterion, because it pays back on every run."), every criterion witness `e2e` on the multi-repo fixture, no model-tier or build-mode words:
  - **req-136** `build--mechanical-outside-judgement`, area build, dependsOn [req-139]. "Every deterministic step of a build or a distillation (branch set-up, merging the base branch, rungs, change lists, scans, stack runs, commits and state writes) MUST run as a tested writer command, and no planning, implementing, reviewing, verifying, judging, fixing or acceptance task MUST run any such step other than accepting its own output." ac-1: "Given the multi-repo fixture increment built end to end, when every judgement task's commands are read from its transcript or event log, then none ran anything but reading files and accepting its own output." ac-2: "Given the same run, when the journal is read, then every rung, merge, commit and scan has a fact record the writer wrote, and none rests on an agent's report."
  - **req-137** `build--one-agent-per-gap`, area build, dependsOn [req-064, req-065, req-072, req-118, req-050, req-121]. "Each run of mechanical steps between two judgement stages MUST be carried out by at most one agent that runs only the commands the decision command gives it, and the number of such agents MUST NOT grow with the number of repos, rungs, shards or files." ac-1: "Given fixture increments touching one repo and three repos, with one rung and six rungs and three shards, when both are built, then both spend the same number of such agents, one per gap between judgement stages." ac-2: "Given an increment whose reviews find nothing, when it is built, then no verify, judge, fix or fix-verify task runs and no agent is spent for them." ac-3: "Given an increment with every model role bound to Codex, when the journal is read, then at most two agents were spent on it." ac-4: "Given a run launched on a fixture, when the journal is read, then exactly one agent ran before the first judgement task, and it ran only the decision command."
  - **req-138** `lifecycle--outward-visible-observed`, area lifecycle, dependsOn [req-072]. "Every push, pull request creation, merge and ticket write MUST be its own shell call that names what it does, and the build MUST establish its result by reading the remote state, never from a relayed exit code." ac-1: "Given the land step on the fixture, when it finishes, then no remote branch has moved until the separate push calls run." ac-2: "Given a push reported as failed that in fact reached the remote, when the next step is asked for, then it is recorded as pushed and not pushed again." ac-3: "Given a checkout on main, or a push that is not a fast-forward of the remote branch, when push commands are generated, then none is generated and the increment is held."
  - **req-139** `build--judgement-spans`, area build, dependsOn [req-064]. "Review, verification, judging, fixing and fix confirmation MUST run as one fan-out whose later tasks start as soon as their inputs are accepted, and a task whose inputs hold nothing to act on MUST NOT run." ac-1: "Given the fixture with findings in one file of one repo, when the review fan-out runs, then one verification task runs for that file, the judge runs once, and no verification runs for a file with no findings." ac-2: "Given a relayed result that wrongly reports no findings, when the next step is asked for, then the missing verification is prepared and run before any ruling is used."
  - **req-140** `build--local-git-in-writer`, area build, dependsOn []. "Branch set-up, merges of the base branch, increment commits and state commits MUST be made by the writer and tested on fixture repos, and a merge conflict MUST leave no partial merge." ac-1: "Given a base branch that conflicts with the increment branch in one of three repos, when the increment is prepared, then it is held as sync-blocked naming that repo, and no repo is left mid-merge." ac-2: "Given an increment whose commit was made before the run stopped, when the run resumes, then the commit is found and not made again."
  - **req-141** `distil--dependent-tasks-without-agent`, area distil, dependsOn [req-088]. "When a distillation task's only input is another task's accepted output, it MUST start as soon as that output is accepted, with no agent spent between them." ac-1: "Given a fixture with two sources and two slices, when the distil workflow runs, then each source's check starts when its characterisation is accepted and each slice's verification when its authoring is accepted, and the journal shows no agent between them."
  - **req-142** `report--empty-section-not-cold-read`, area report, dependsOn [req-037]. "The cold reader MUST read every report section that has content, and a section that renders empty MUST be recorded as not read, with that reason, in the report's account of how it was checked." ac-1: "Given a first distillation with no rulings, when the report is cold-read, then no reader runs for "Rulings applied" and the report says it was empty."
- **K-073** `inc-001`: size basis "5 criteria, 1 area, 1 repo".
- **K-074** `inc-017`: members add req-140; size basis "9 criteria, 1 area, 1 repo"; `combination.why` gains "req-140's branch set-up and merges are what the drain fixture's same-named branches prove"; the `split` reverse effect's `into` gains `["build--local-git-in-writer"]`.
- **K-075** `inc-019`: members add req-139; size "12 criteria, 3 areas, 1 repo"; `why` and `split` as K-074.
- **K-076** `inc-022`: members add req-138; size "11 criteria, 1 area, 1 repo"; `why` and `split` as K-074.
- **K-077** `inc-029`: members add req-141; size "6 criteria, 1 area, 1 repo"; `why` and `split`.
- **K-078** `inc-037`: members add req-142; size "8 criteria, 1 area, 1 repo"; `why` and `split`.
- **K-079** `inc-041`: size "5 criteria, 1 area, 1 repo". `inc-024` basis unchanged at 3.
- **K-080** `increments[]`: insert after inc-024 `{"id":"inc-042","key":"mechanical-work-one-agent-per-gap","title":"Mechanical work costs no judgement and one cheap agent per gap","outcome":"Every deterministic step runs as the writer's tested commands, one cheap agent runs each gap between judgement stages, and the count no longer grows with repos, rungs, shards or files.","why":"A fixed overhead every increment pays counts; the agents are the cost of a run.","members":["req-136","req-137"],"class":"feat","surface":{"repos":["workspace"],"areas":["build"]},"milestone":"m1","dependsOn":["inc-015","inc-019","inc-020","inc-022","inc-041"],"sequence":null,"needs":[],"checkpoint":null,"size":{"class":"M","basis":"6 criteria, 1 area, 1 repo"},"combination":{"rules":["cr-same-surface","cr-same-acceptance-boundary"],"why":"cr-same-surface: both are the build workflow's agent spend. cr-same-acceptance-boundary: one journal of one fixture build shows both.","risk":"low","attributability":"Each fails only on agent spend or a missing fact record, and the journal names which.","reverseEffects":[{"op":"split","target":"mechanical-work-one-agent-per-gap","into":[["build--mechanical-outside-judgement"],["build--one-agent-per-gap"]]}]},"status":"todo","doneBy":null,"statusNote":null}`. Then run `jq empty` and the 11.6 checks (lifted dependencies equal `dependsOn` exactly; no new cross-repo edge, so no `edgeChecks` record is needed).
- **K-081** `decisions-for-sam.md` "Owed to you": delete item 2 (pin allow rules) and renumber; item 5 (now 4): drop the push-record sentence's reliance on the pending script.
- **K-082** `decisions-for-sam.md` "Calls we made that you may want to reverse": append, each with its "To reverse:" line from section 7 and 8.1 here:
  - 20. tim now runs every local git step itself, including commits and merges of base; every push, PR, merge and Jira write stays its own call. To reverse: stage-table flag `localGit: act`.
  - 21. The sync merge is pushed with the increment, not on its own. To reverse: `run set <p> quality.pushSyncMerge true`.
  - 22. One draft-PR call per repo rather than one per increment. To reverse: section 7, S4.
  - 23. Verification stays one task per file with findings; batching it was declined. To reverse: 8.1.
  - 24. Fix-verify runs straight after the fix, before the post-fix checks; a red check re-runs it. To reverse: move the fix-check back between fix and fix-verify in the stage table (one more cheap agent on increments with fixes).
  - 25. The consolidation rests on your steer as relayed to the design agents (`consolidation/sam-steer.md`). If a line misquotes you, correct that file; inc-010's verification re-checks the seven atoms that cite it.
