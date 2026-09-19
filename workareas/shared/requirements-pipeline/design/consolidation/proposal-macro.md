# Proposal: maximal determinism, with tim macro commands

Written 2026-09-19, from Sam's steer and the angle "maximal determinism". Read with `consolidation/inventory.md`, which counts where today's design spends its agents.

Sam's steer, in short: what a run costs is its **agents**, not its stages. Every agent pays a fixed start-up cost, uses tokens and takes wall-clock time. So every deterministic step should be a scripted, tested tim command. A cheap model issues that command with a minimal "run this" prompt. Agents are for judgement only. Deterministic work is **never** folded into a judgement agent (Opus or Sonnet) to save a spawn. Sam endorsed a "mega prepare" tim command.

## 0. The proposal in one page

Five changes, each decided on what it is like in use (R8). How much they cost to build carries no weight. A fixed overhead that every run pays does count.

1. **tim runs every local, reversible step itself.** That covers fetch, the `merge-tree` probe, the local merge of `main`, branch cuts, ladder rungs, browser and Docker rungs, the integration-proof stack and its shards, secrets, manifests, local commits, the state commit, receipts, audits, reports and handovers. This reverses the part of C-042 and 4.5 that said "tim runs only read-only git and never executes a lifecycle effect". The bash tools that exist only because tim was not allowed to run commands move into tim: `run-rung.sh`, `pre-push-check.sh`, `run-stage.sh`, `pin-tools.sh`, `self-test.sh`, `pr-ensure-draft.sh` and `wait-for-pr-checks.sh`. That also brings tim into line with its own rails, which forbid shelling out to `../tools/*.sh`.
2. **One cheap runner for each contiguous run of mechanical steps.** A runner is a Haiku agent at low effort with a fixed prompt. It loops one command, `tim backlog advance`. `advance` now executes mechanical stages, not only decides them. It returns only at the next judgement fan-out, at a stop, or when a runner's call budget is spent. The per-action watchers (49 per increment) and the per-stage relays (9) are replaced by 5 runners per increment in a drain.
3. **Outward actions stay visible, and their effect is observed rather than relayed.** Each `git push`, draft PR, merge and Jira write is its own Bash call that tim generated, and the runner runs it exactly as written. The next `advance` call then **observes** the effect: `git ls-remote` for a push, an octokit lookup for a PR, a merge or CI. It never trusts an exit code relayed by a model. PR creation, CI waiting and merging move from bash scripts into tim through octokit. Pushes stay native `git` calls, so guard-bash and the auto-mode classifier see each refspec (section 2).
4. **Dependent tasks are pipelined, so no runner sits between them.** Sometimes a downstream task needs nothing but its upstream task's accepted output, with no shared side effect and no gate between them. Then `stage prepare` prepares both ahead of time, as a small graph in `stage.json`. The script starts the downstream task as soon as the upstream receipt arrives. This removes the runner between plan and plan audit, between review and verify, between judge and fix, and between fix and fix-verify. In distillation it does the same between author and verify, and in five other pairs.
5. **Codex tasks run inside tim.** `tim backlog codex run` is `run-stage.sh` ported into tested JavaScript, and `advance` calls it in-process for every task bound to Codex. A Codex stage therefore costs no Claude agent of its own. Under the `codex` preset a whole increment is one mechanical run: 1 or 2 Haiku runners, and nothing else.

**Agent counts** (the typical increment and distil run from `inventory.md`):

| | Before | After |
|---|---|---|
| Build, one increment, `claude` preset | 97 as 7.2 specifies (39 judgement + 58 Haiku). 59 under 8.8's per-stage reading | **44** in a drain (39 judgement + 5 runners). 45 for a single increment |
| Build, one increment, `codex` preset | about 58 Haiku (per-action), about 20 (per-stage) | **1 to 2** Haiku runners |
| Distil run, `distil-claude` | 81 (58 judgement + 23 Haiku) | **71** (58 judgement + 13 runners) |
| Distil run, `distil-codex` | about 57 (34 Claude judgement + 23 Haiku) | **44** (34 Claude judgement + 10 runners) |
| Increments per 850-agent run, `claude` preset | about 8 | about 19 |

The judgement agents do not change. Every mechanical count is now fixed per increment. It no longer grows with the number of repos, rungs, shards or pull requests, because those become loops inside tim.

## 1. The rules this proposal adds

**D1. tim executes; agents judge.** Every step whose result is fully determined by its inputs is a tim function, tested with vitest on `test-support/git-fixtures.js` repos and fake binaries. A judgement agent never runs one. The one command a judgement agent does run is `stage accept` on its own draft, which is how it is corrected (8.2). That is part of its contract, not a folded stage.

**D2. One runner per mechanical run.** A mechanical run is everything between one judgement fan-out and the next. The Workflow script cannot run a command, so each mechanical run costs exactly one Haiku runner. It never costs a judgement agent. The floor cannot go lower while the script has no shell.

**D3. Outward means visible, and observed.** An outward, hard-to-reverse action is a push, a PR, a merge or a Jira write. Each one reaches the runner as its own generated Bash call. tim records its effect by looking, not by asking a model.

**D4. A pipeline edge replaces a runner only when there is nothing mechanical between the two tasks.** The downstream task's inputs must be only upstream outputs that `stage accept` has accepted. There must be no gate, no shared side effect and no git or rung step in between. Any skip condition is declared in tim's stage table as data. The script evaluates it with one generic, tested helper. Everything else keeps its runner.

**D5. Fact receipts for mechanical steps.** Every mechanical step writes a fact receipt. It is stamped by tim, not relayed by an agent, and carries the same HMAC as a task receipt. The done gate audits fact receipts exactly as it audits task receipts.

## 2. The safety line, decided on merit

What makes an action visible is the **Bash call boundary**, not how many agents there are. So keeping an outward action visible costs one extra Bash call inside the same runner. It never costs an agent. Every row below was decided on what it protects in use.

| Action | Where it runs | Why |
|---|---|---|
| Fetch, `merge-tree` probe, local merge of `main`, branch cut or checkout, wip commit, increment commit, state commit, `git stash push -u -- <paths>` for local delivery | **tim, in-process**, inside a macro | All local and reversible. Tested on git fixtures, including conflict, dirty tree and detached HEAD. A committed test is a stronger guard than a Haiku typing the command. The rule that replaces C-042 is: "tim writes to local repos; it never pushes, and it performs no outward action except through a single-purpose command the runner issues as its own call" |
| Ladder rungs, browser and Docker rungs, command invariants, stack up and down, E2E shards, secrets scan, manifest, fingerprints, receipts, audit, report, handover | **tim, in-process** | Read-only against remote systems. Exit codes become fact receipts that tim writes, so "the ladder is green" is never a model's claim (7.9) |
| `git push` for the increment branch, the sync merge and the state branch | **Its own visible Bash call for each repo**, generated by `tim backlog land` or `tim backlog record` and issued verbatim by the runner. The push is never inside a tim macro | A push is hard to reverse, starts CI and exposes code. As a native `git -C <repo> push -u origin refs/heads/<b>:refs/heads/<b>`, the auto-mode classifier sees the repo, branch and refspec. guard-bash's deny list does not match `git -C … push --force` (C-042), so tim adds a guard of its own: `land` refuses to generate a push unless the branch proof passes (the checkout is on the branch, the branch is not `main` or `master`, and the refspec names it). It never generates `--force`. That proof was `pre-push-check.sh`; it is now tested tim code, run just before the command is printed. The effect is confirmed with `git ls-remote` on the next `advance` |
| Draft PR create or reuse | **tim through octokit**: `tim backlog pr ensure <p> --inc <id>`, issued as its own call | Library-first is a tim rail, and the idempotency rules (reuse an open PR; exit 3 when only a merged or closed one exists) become tested code. A draft PR can be reversed by closing it. One call covers every repo in the increment, because the command line names the action and the increment, and the classifier judges the call as a whole |
| Waiting for CI checks, SonarCloud from the PR checks | **tim, in-process** (`tim backlog ci wait`), sliced with exit 75 | Read-only. Reuses `gha-client`'s polling loop. Unresolved checks exit 2, no checks exit 4, and neither is ever green |
| PR merge (only under `per-increment` delivery) | **tim through octokit**: `tim backlog merge <p> --inc <id> --repo <key>`, one visible call for each repo in `consumes` order | This is the least reversible action, on a shared `main`. One call per repo keeps each merge its own decision for the classifier. The command refuses unless every PR in the increment is green, and approved where approval is required. A merge is never part of a macro |
| Jira create and transition (only when `ticketing` is set) | **tim through `jira-client`**: `tim jira create` and `tim jira transition`, each its own call | A write other people see, outside the repos |

**Recording by observation.** After every outward call, the runner simply calls `advance` again. `advance` confirms the effect: the remote ref equals the local head, the PR exists as a draft on the right head, the merge commit is on `main`, or the ticket is in the right status. It writes a fact receipt from what it saw. The exit code the runner reports is informational. This removes `advance --record <actionId> --exit <n> --log <file>`, and the relay risk it carried.

**Under the Codex-orchestrated mode** (8.11), none of the Claude hooks or the classifier exist. The same generated commands and tim's own branch proof are what remain. So putting the proof into tested tim code is a gain in that mode as well.

## 3. The build workflow

### 3.1 The new stage list

The canonical ids 0 to 27 stay as **step ids** inside tim's stage table. Resume, holds, receipts and the audit keep their granularity. What changes is who runs each step and how many agents that costs. The steps group into six mechanical runs (M-A to M-F) and five judgement waves (J1 to J5).

| Run or wave | Step ids | Step | Kind | Runs as |
|---|---|---|---|---|
| **M-A** | 0 | Preflight (first increment of a run only): state branch, tim root, pin check, schemas exported | mechanical | tim, in `advance` (`tim backlog prepare`); issued by runner A |
| M-A | 1 | Next, and bindings | mechanical | tim, in-process |
| M-A | 2 | Ticket, when `ticketing` is set | mechanical, outward | visible call `tim jira create …`, generated by `prepare`; issued by runner A |
| M-A | 3 | Branch: cut or check out the same name in every surface repo | mechanical | tim (`prepare`) |
| M-A | 4 | Baseline heads, tracked files only | mechanical | tim (`prepare`) |
| M-A | 5 | Sync: fetch, `merge-tree` probe, local merge of `main`. A conflict is a hold. The push is deferred to land | mechanical | tim (`prepare`) |
| M-A | 6 | Ladder facts for every surface repo. A red rung becomes a hygiene atom through `discover`, and the increment is held `baseline-red` | mechanical | tim (`prepare`), sliced with exit 75 |
| M-A | 7p, 8p | Prepare the plan task, and the plan-audit task pipelined after it | mechanical | tim (`stage prepare`) |
| **J1** | 7 | Plan | judgement | Opus (or Codex high) |
| J1 | 8 | Plan audit, started when the plan's receipt arrives | judgement | Opus (or Codex high), a different task |
| **M-B** | 8f | Finalise the plan: `build/plans/<id>.md`, `state.plan`. A `revise` verdict returns a second plan task (one round) | mechanical | tim, in `advance`; runner B |
| M-B | 9 | Added repos: surface amendment, then steps 3 to 6 for those repos only | mechanical | tim (`prepare --repos`) |
| M-B | 10p | Prepare implement, with standards for the planned files and every surface repo | mechanical | tim |
| **J2** | 10 | Implement | judgement | Sonnet (or Codex medium) |
| **M-C** | 11 | Implement check: browser and Docker rungs, command invariants. On red, `advance` returns the implement task for resumption (at most 2 rounds) | mechanical | tim (`tim backlog check`); runner C |
| M-C | 12 | Manifest, `rulesGap[]`, protected paths, fingerprints, no commit and no ref moved | mechanical | tim |
| M-C | 13p, 14p | Prepare review (style and code for each file, one consistency task) with verify pipelined per file; `skipWhen: upstream findings = 0` | mechanical | tim |
| **J3** | 13 | Review: 2F Sonnet plus 1 Opus consistency | judgement | Sonnet and Opus (or Codex) |
| J3 | 14 | Verify, started for each file as soon as both of its reviews are accepted with findings; verify-consistency after consistency | judgement | Sonnet (or Codex medium) |
| **M-D** | 14f | Finalise verdicts. A dead verifier is recorded as fail-open "unrefuted". A missing verify task, for example after a misrelayed count, is re-run here, re-derived from disk | mechanical | tim, in `advance`; runner D |
| M-D | 15p, 16p, 17p, 26p | Prepare judge, with fix pipelined after it (`skipWhen: fixNow = 0`), fix-verify after fix, and a discovered-atom verifier after the judge (`skipWhen: discovered = 0`) | mechanical | tim |
| **J4** | 15 | Judge | judgement | Opus (or Codex high) |
| J4 | 16 | Fix (`REVIEW_ITEM_FIXER` and `STYLE_IMPLEMENTOR`). Its `stage accept` saves the fix diff it already computes for the manifest cross-check | judgement | Sonnet (or Codex medium) |
| J4 | 17 | Fix verify, from the saved fix diff | judgement | Sonnet (or Codex medium), a different task |
| J4 | 26d | Discovered-atom verifier (`REQUIREMENT_VERIFIER`), running alongside the fix | judgement | Opus (or Codex high) |
| **M-E** | 11r | Implement check again after the fix. On red, the fixer resumes | mechanical | tim (`check --after fix`); runner E |
| M-E | 13r | When a fix touched a seam file, `advance` returns a consistency task before going on | mechanical decision | tim |
| M-E | 18 | Ladder: registry rungs and plan extras. On red, a repair task, then a repair review | mechanical | tim (`tim backlog prove`) |
| M-E | 19 | Secrets | mechanical | tim (`prove`) |
| M-E | 20 | Integration proof: stack up with the include list, shards, one retry of failed shards, stack down always, and the record from the JSON reporter | mechanical | tim (`prove`), sliced with exit 75 |
| M-E | 21p | Prepare acceptance, which never receives the plan | mechanical | tim |
| **J5** | 21 | Acceptance | judgement | Opus (or Codex high) |
| **M-F** | 22 | Land: commit each repo with `-F` and the trailer, run the branch proof, then generate one push for each repo in merge order | mechanical; the pushes are outward | tim (`tim backlog land`), then visible `git push` calls; runner F |
| M-F | 23 | Draft PRs | outward | visible `tim backlog pr ensure` |
| M-F | 24 | CI: wait on every PR, SonarCloud from the checks. On red, a CI fixer (judgement) and a repair review | mechanical | tim (`tim backlog ci wait`), sliced with exit 75 |
| M-F | 25 | Merge, under `per-increment` only | outward | visible `tim backlog merge`, one call per repo |
| M-F | 26 | Record: adopt verified discovered atoms, `status done` (runs the audit), report, handover, state commit | mechanical | tim (`tim backlog record`) |
| M-F | 26s | Push the state branch | outward | a visible `git push` |
| M-F | 27 | Checkpoint | mechanical | tim |
| M-F → M-A | 1… | In a drain, the same runner goes straight on into the next increment's M-A | mechanical | runner F carries on as the next increment's runner A |

Under programme delivery the done point is still "landed, and CI green" (7.6). When `quality.integrationProofSource` is `ci`, steps 20 and 21 move after step 24 exactly as today (C-035). M-E then ends after the ladder and secrets, and M-F runs the proof from CI before J5. That costs one more runner.

### 3.2 The script loop

```js
// the one runner prompt: fixed text, a constant in both workflow scripts, checked by workflow-contract.test.js
const RUNNER = (cmd) => `${GUARD_RAILS}
You run commands. You make no decisions.
1. Run: ${cmd}   (Bash timeout 600000)
2. If it exits 75, run the same command again, unchanged.
3. If its JSON has status "act", run each string in "commands" exactly as written, one Bash call each,
   in order. Stop at the first one that exits non-zero. Then go back to step 1.
4. Otherwise return the JSON's "step" object exactly as printed, the exit code of every command you ran,
   and the "wrote" paths tim printed.
After ${CALL_CAP} Bash calls, stop and return {"status":"continue"}.`

loop:
  step = agent(RUNNER(`${TIM} backlog advance ${P} --run ${label} --json`), {model:'haiku', effort:'low', schema: STEP_SCHEMA})
  continue  -> spawn a fresh runner (same prompt)
  run       -> check the task count and stage.json sha (C-070), then spawn the tasks as a graph:
               a task starts when every task in its "after" list has returned an accepted receipt,
               unless its declared skipWhen holds on those receipts (D4)
  stop      -> return the stop reason and run summary
```

- `wait` no longer reaches the script. A wait is an exit-75 loop inside the runner.
- The `act` step is handled inside the runner. It never costs a spawn of its own.
- `CALL_CAP` is `quality.runnerCallCap` in `run.json`, 50 by default. It keeps a Haiku context small. Each tim call prints a summary of a kilobyte or less and writes its detail to files.
- The script counts agents for the ceiling as before (7.2).

### 3.3 Why a runner is never a judgement agent, even when that would save one

Two cheaper-looking options were rejected, on Sam's rule and on merit:

- **The last `stage accept` of a fan-out also finalises and prepares the next stage.** That would remove runners B, D and part of C. But it puts a ladder, a stack or a git merge inside an Opus or Sonnet agent's Bash call. That wastes judgement-tier wall-clock, blurs failure attribution (a red rung would show up as a failed review task), and races when two accepts finish together. Rejected.
- **The implementer or fixer runs its own rungs.** Rejected for the same reason, and because it breaks C-017 symmetry: neither executor runs suites itself, so the parity comparison stays fair.

## 4. The distil workflow

### 4.1 The new stage list

The phase ids in 5.2 stay. Gates stay in-process inside `advance --distil`. Runners replace relays. Pipeline edges (D4) join these pairs: characterise → extract-verify for each source; author → verify for each slice; verify → added-atom verifier (`skipWhen: added = 0`); gap-audit → gap-verify; the three panel judges → chair → panel critic; critic → question editor → question critic (`skipWhen: critic.newAtoms > 0`, which sends the new atoms back to author and verify instead); combiner → combine-verifier; prose editor → claim verifier for each section group.

| Run or wave | Phases | Kind | Runs as |
|---|---|---|---|
| (main session) | 0 setup, 2 acquire for pasted material | judgement (the skill) | main session |
| **R1** | 1 heads, 2 acquire, prepare 3 and 4 as a graph | mechanical | tim (`advance --distil`); runner |
| W1 | 3 characterise (4), then 4 extract-verify (4) for each source as its characteriser is accepted | judgement | Sonnet or Opus, or Codex |
| **R2** | P1 `units --strict`; 5 carryover and 5a reslice when present (their own wave); prepare 6 | mechanical | tim; runner |
| W2 | 6 slice | judgement | Opus |
| **R3** | P2 `slices --strict`, then stop for the contract (phase 7) | mechanical | tim; runner. **Launch 1 ends** |
| (main session) | 7 contract | judgement | the skill and Sam |
| **R4** | prepare 8 and 9 as a graph for each slice | mechanical | tim; runner |
| W3 | 8 author (6), 9 verify (6), added-atom verifier (2) | judgement | Opus, or Codex |
| **R5** | Finalise verdicts; 10 `yield`, `coverage`; prepare gap-audit and gap-verify for each flagged slice | mechanical | tim; runner |
| W4 | gap-audit, gap-verify | judgement | Opus, or Codex |
| **R6** | P3 `yield --strict`, `coverage --strict`; prepare 11 | mechanical | tim; runner |
| W5 | 11 reconcile | judgement | Opus |
| **R7** | Prepare the 12 panel graph (only when a conflict survives precedence) | mechanical | tim; runner |
| W6 | 12 panel: 3 judges, chair, critic | judgement | Opus |
| **R8** | `rule --by panel`; `duplicates`; prepare 13 | mechanical | tim; runner |
| W7 | 13 dedupe | judgement | Opus |
| **R9** | 14 `ingest --atoms` (P7), 15 `trace --strict` (P4); prepare 16 → 17 as a graph | mechanical | tim; runner |
| W8 | 16 critic, 17 question editor, question critic | judgement | Opus and Sonnet |
| **R10** | `question lint` (P8); `rule --by default`; `candidates --combine`; prepare 18 as a graph | mechanical | tim; runner |
| W9 | 18 combiner, combine verifier | judgement | Opus and Sonnet |
| **R11** | `ingest --increments`, `check --strict` (P9, P11); prepare 19 as a graph for each section group | mechanical | tim; runner |
| W10 | 19 prose editor (4) and claim verifier (4) | judgement | Sonnet |
| **R12** | Apply rewrites through `set`; 20 `report`, `report --lint`; prepare cold readers | mechanical | tim; runner |
| W11 | 20 cold reader (13) | judgement | Sonnet |
| **R13** | Finalise; phase `done`; stop | mechanical | tim; runner. **Launch 2 ends** |

`apply-rulings` (R1 in 5.2) adds one runner and its applier when a free-text ruling is pending.

**Under `distil-codex`**, `advance` runs characterise, extract-verify, carryover, reslice, author, verify and gap-audit in-process through `tim backlog codex run`. W1, W3 and W4 then cost no Claude agent. R1 and R2 merge, and R4, R5 and R6 merge, into the runner that reaches the next Claude-bound phase. That gives 10 runners in all.

### 4.2 What was not consolidated, and why

- **The 13 cold readers and 8 prose agents** are judgement. Whether one cold reader could read the whole report is a quality question. It is outside a proposal about mechanical cost.
- **Reconcile, dedupe and critic stay single agents** (5.2, "Why this cut of fan-out"). Their runners stay because a gate or a shared write sits between each pair.

## 5. The tim commands

Every command takes `<p>` (a registry key), prints a schema-versioned `--json` envelope, and accepts `--op-id`. Every one is idempotent at step granularity. Before re-running a sub-step, it checks the sub-step's fact receipt and the pinned heads. Any macro that can outlast one Bash call takes `--budget-seconds <n>` (540 by default). It persists its progress and exits 75, meaning "call again".

### 5.1 The loop

| Command | Does | Reuses |
|---|---|---|
| `tim backlog advance <p> --run <label> [--distil] [--budget-seconds 540] [--json]` | **Now executes** every mechanical step, in stage-table order, from the resume point to the next judgement fan-out, outward action or stop. It composes the macros below in-process. Returns `{status: run, stage, tasks[], graph}`, `{status: act, commands[]}`, `{status: stop, stopReason}`, or exits 75. Every outward effect is observed on the next call (section 2). `--record` is removed | `tim/src/backlog/advance/**` (the stage table as designed); every macro below |

### 5.2 The build macros (each also a standalone command, for people, tests and the Codex-orchestrated mode)

| Command | Covers steps | Does | Reuses |
|---|---|---|---|
| `tim backlog prepare <p> --inc <id> [--repos <key>…] [--preflight]` | 0 to 6, 7p and 8p; step 9 with `--repos` | Preflight on the first call of a run. Next and bindings. The ticket as a generated `act` when `ticketing` is set. Branch cut or checkout under one name in every surface repo. `heads --for --strict`. Parallel fetch. `merge-tree` probe, then a local merge of `main`, or hold `sync-blocked`. Ladder facts through `rung`, or hygiene `discover` plus hold `baseline-red`. Then `stage prepare` for plan and plan audit | `exec/exec.js` `run`; `exec/parallel.js` `runAcross` for fetch across repos; `commands/workspace/branch.js` checkout logic, extended to create a branch and take a repo set; `heads.js`; the registry; `git-fixtures.js` in tests |
| `tim backlog rung <p> --inc <id> --repo <key> --name <rung> [--shard i/n] [--phase baseline\|check\|ladder]` | a single rung | `run-rung.sh` in tim: runs one npm, mvn or committed-script rung in the foreground and writes the log and a fact receipt. An undefined script gives `skipped-undefined`, an uncommitted script `could-not-run:uncommitted` (C-067), and a rung past the budget `could-not-run:timeout` | `exec.js` `runStreamed`; `workspace/_task-output.js` for result records |
| `tim backlog check <p> --inc <id> --after implement\|fix\|repair` | 11 and 12 | Browser and Docker rungs of the changed repos, command invariants, then `stage manifest` with `rulesGap[]`, protected paths and fingerprints | `rung`; `stage manifest`; `tim docker` include list |
| `tim backlog prove <p> --inc <id> [--budget-seconds]` | 18 to 20, 21p | The ladder (registry rungs, then plan extras), `secrets --inc`, then `tim docker dev --include <touched repos>`. It runs one shard per `rung` call, sized from the last recorded durations, retries failed shards once, and always runs `tim docker down`. It writes `state.integrationProof` from the JSON reporter, then prepares acceptance | `exec/stack.js` `runStackScript` (the include list is new); `rung`; `secrets` |
| `tim backlog land <p> --inc <id>` | 22 | Commits each touched repo with `-F` and the trailer from `run.json`, in merge order. It never commits a repo that has already landed. It runs the branch proof and returns the refspec push commands as `act`. Under `local` delivery it commits only, and never generates a push | `exec.js`; `report --merge-plan` ordering from `consumes` |
| `tim backlog pr <p> --inc <id> ensure` | 23 | Creates or reuses a draft PR for each repo through octokit, with the body from `report --pr-body`. Exits 3 when only a merged or closed PR exists | `clients/github-client.js`, gaining `findPrForHead`, `createDraftPr`, `updatePrBody` |
| `tim backlog ci <p> --inc <id> wait [--budget-seconds]` | 24 | Check runs and statuses for every PR head, and the SonarCloud check or "no report". Exit 2 means unresolved and exit 4 means no checks; neither is ever green. A red check returns a `run` step for the CI fixer | `clients/gha-client.js` polling loop; `github-client` gaining `listCheckRunsForRef`, `getCombinedStatus` |
| `tim backlog merge <p> --inc <id> --repo <key>` | 25 | Refuses unless every PR in the increment is green, and approved where required. Merges one PR through octokit, in `consumes` order, then stops with `pr-left-open` if a later one fails | `github-client` gaining `mergePr`, `getReviews` |
| `tim backlog record <p> --inc <id>` | 26, 27 | Adopts verified discovered atoms, runs `status done --done-by build` (the audit), writes `report`, writes `handover --executor codex --md --out build/HANDOVER-CODEX.md`, commits the state files by name on the state branch, and returns the state push as `act` when `record` is `commit-push` | the writer core; `exec.js` |
| `tim jira create \| transition` | 2 and done | Jira writes through `jira-client`. Each is issued as its own visible call | `clients/jira-client.js` (gaining write methods) |

### 5.3 Shared macros

| Command | Does | Reuses, or replaces |
|---|---|---|
| `tim backlog codex run <stageDir> [--budget-seconds 540]` | `run-stage.sh` in tim: the lock, concurrency by sandbox, `codex exec --json` starts and resumes, accept after every draft with three correction rounds, the process-tree kill at the deadline, five slices, `runner.json`. `advance` calls it in-process for every task bound to Codex. `--check` and the self-test run against a fake `codex` binary | `exec.js` (execa, with `detached` and tree kill); replaces `tools/codex/run-stage.sh`; `fake-codex.sh` becomes `test-support/fake-codex.js` |
| `tim backlog pin --commit <sha>` | `pin-tools.sh` in tim: clones the workspace at the commit into `workareas/clones/pipeline-pin/`, installs tim through the canonical real path (`pwd -P`, fixing the lockfile trap), and prints the pinned prefix | `exec.js`; replaces `tools/backlog/pin-tools.sh` and `npm-in-repo.sh --clone` for this use |
| `tim backlog run open <p> --label --mode build\|distil --at --trailer [--pin]` | The main session's launch in one call: preflight, the pin, `run start`, and the Workflow args object printed as JSON | replaces four separate main-session steps (7.1) |
| `tim backlog run close <p> --label --stop <reason>` | `run end`, `counts` and the handover print | replaces three steps |
| `tim backlog run bind …` | As designed. It also commits `run.json` and the journal by name (local), and prints the state push for the skill to issue visibly | 7.6 binding commit |

### 5.4 Retired, or reduced to a thin caller

| Tool | Fate |
|---|---|
| `tools/backlog/run-rung.sh` | Replaced by `tim backlog rung` |
| `tools/backlog/pre-push-check.sh` | Replaced by the branch proof inside `land` and `record` |
| `tools/codex/run-stage.sh`, `fake-codex.sh` | Replaced by `tim backlog codex run` and `test-support/fake-codex.js` |
| `tools/backlog/pin-tools.sh` | Replaced by `tim backlog pin` |
| `tools/backlog/self-test.sh` | Mostly vitest. What remains checks the execute bit and `--self-test` of the two bash files that must stay |
| `tools/github/pr-ensure-draft.sh`, `tools/github-actions/wait-for-pr-checks.sh` | Not ported from the FA branch for this pipeline: `tim backlog pr ensure` and `ci wait` carry their exit-code contracts. The FA branch keeps its own copies for the legacy loop until inc-040 |
| **Stays bash** | `tools/codex/guard.sh` (a Codex PreToolUse hook adapter to guard-bash) and `tools/backlog/record-read.sh` (a Claude PostToolUse hook). Hooks are shell by contract |

**A consequence for the tool pin** (7.12). With the bash tools in tim, a pinned run calls only the pinned tim, through the `npm --prefix … run --silent tim --` form that is already allowed. The allow rule `Bash(~/…/pipeline-pin/tools/**)`, owed to Sam in 9.2, is no longer needed. The preflight check becomes "the pinned tim answers `--version` in JSON".

## 6. Agent counts

### 6.1 Build, typical increment (3 repos, 6 rungs plus 1 invariant, F = 12, K = 6, one fix round, three shards, CI green, programme delivery)

| Agent | Before, per-action (7.2) | Before, per-stage (8.8) | After, `claude` preset |
|---|---|---|---|
| Opus: plan, plan audit, consistency, judge, acceptance | 5 | 5 | 5 |
| Sonnet: implement, 24 reviews, 7 verifies, fix, fix verify | 34 | 34 | 34 |
| Haiku relays after a fan-out | 9 | 9 | 0 |
| Haiku action watchers | 49 | 11 | 0 |
| Haiku runners | 0 | 0 | 5 in a drain (B, C, D, E, and F carrying on as the next A); 6 for a single increment |
| **Total** | **97** | **59** | **44** (45) |
| Grows with repos, rungs, shards or PRs | yes | no | no |

Conditional additions: +1 runner and the repair agents for each red rung, red implement check, second plan round or CI fix. +1 runner when a fix touches a seam. +1 runner under `integrationProofSource: ci`. A discovered atom's verifier (Opus) runs in wave J4 and needs no runner of its own.

### 6.2 Build, `codex` preset

Every model task runs inside `advance`, so the increment is one mechanical run from M-A to M-F. It needs **1 runner**, plus a fresh one each time `CALL_CAP` (50 Bash calls) is reached: 2 in a typical increment. No Sonnet or Opus agent runs, as 8.4 requires. Before: about 58 Haiku (per-action) or about 20 (per-stage). Mixed presets such as `codex-claude-checks` add one runner at each boundary with a Claude-bound stage.

### 6.3 Distil, typical run (4 sources, 6 slices, 1 panel docket, 1 flagged slice, 4 prose groups, 13 report sections)

| | Before | After |
|---|---|---|
| Judgement agents | 58 | 58 |
| Relays and first calls (Haiku) | 21 + 2 = 23 (up to 33 with per-slice pipelining relays) | 13 runners (R1 to R13) |
| **Total, `distil-claude`** | **81** | **71** |
| **Total, `distil-codex`** | about 57 | **44** |

### 6.4 Fixed overhead per run

- **Stage 0 resolve watcher:** gone. It becomes `advance`'s first call in runner A.
- **Main session:** eight separate steps become `run open`, the Workflow call and `run close`.
- **Relaunches:** at 44 agents an increment, an 850-agent run builds about 19 increments rather than 8. The relaunch cost (new label, `run start`, pin clone and `npm` install) is paid less than half as often.

## 7. What survives, and how

- **Resume.** `advance` still works out the resume point from persisted state alone. Within a macro, each sub-step checks its fact receipt and the pinned heads, so a runner killed mid-macro is replaced by a fresh runner, which carries on at the next sub-step. Outward steps are idempotent by observation: a push whose remote ref already matches is recorded, not repeated, and an existing draft PR is reused. `resumeFromRunId` replays completed agents as before. With fewer agents the replay is coarser, but nothing depends on replay granularity, because the disk is the record.
- **Task receipts** are unchanged (8.1): the HMAC, `outputSha256`, the executor as bound at prepare, and `completed`. A pipelined downstream task's `stage.json` names its `after` tasks. `stage accept` refuses a downstream draft unless every upstream receipt was accepted before the downstream task's first read. The reading record gives that time.
- **Fact receipts** (new, D5) are one per mechanical sub-step, under `build/runs/<label>/<inc>/a<n>/facts/<step>.json`: `{step, argv, cwd, exit, log, startedAt, endedAt, headsBefore, headsAfter, observed, factMac}`. They replace `run-rung.sh`'s `.exit` files and `advance --record`.
- **The done-gate audit** (4.5) gains two checks. Every mechanical step the stage table requires has a fact receipt with a valid MAC. Every outward step has an `observed` record, meaning the remote ref, PR, check or merge was seen by tim. The existing checks are unchanged: review coverage, verify for each file with findings (now re-derived even if a relayed receipt misreported `findingsCount`), rulings, fix and fix-verify, repairs, invariants, ladder, secrets, acceptance, integration proof, and branches. A runner cannot misrelay anything the audit trusts, because the audit trusts only files tim wrote.
- **The relayed task-list check (C-070)** stays, for the `run` step's task graph. The graph's edges and `skipWhen` predicates are part of the hashed `stage.json`.
- **Codex parity (R6).** Parity gets stronger, for three reasons. (1) Both executors meet exactly the same mechanical layer, because tim runs it whatever the binding. There is no watcher prompt on one side and a runner script on the other. (2) Under the `codex` preset Claude's usage drops to 1 or 2 Haiku runners an increment, which is the saving R6 exists for, and `compare` measures it from the journal (8.10). (3) The Codex-orchestrated mode (8.11) becomes almost the same loop as the Workflow: "run `tim backlog advance`; on exit 75 run it again; on `act` run each command verbatim; stop on `stop`". Codex tasks run inside `advance` in both modes, so req-121's "byte-identical run state and receipts" compares one code path with itself. What differs is named in 8.11: in the Codex-orchestrated mode the script does not start Claude-bound tasks, so every binding must be Codex, and `advance` holds `claude-unavailable` if one is not.
- **Full-stack slices (R7).** Every macro acts on the increment's whole surface: one branch name in every repo, the ladder in every touched repo, one stack with the include list, landing and PRs in `consumes` order, merge only when everything is green. No step fans out per repo, as a watcher or anything else. Added repos go through `prepare --repos` for the added repos only. The multi-repo fixture programme (inc-017) proves this with no model tasks: req-055 ac-2 already reads that way.
- **Hooks (R4).** guard-bash and the classifier see every outward call. They no longer see the local git writes, which are now inside tim. The loss is small: those were local and reversible, and tim's tests cover them. The Sonar push-record hook did not fire for `git -C` pushes before either (C-042). Per-call Claude guards still apply to every judgement agent.
- **Nothing succeeds silently (7.9).** Two rows change. "The ladder is green" is now tim's fact receipt, where it was a `.exit` file. "A watcher relays a wrong exit code or count" is now "recorded by observation, and re-derived from disk".
- **Rails.** The runner prompt carries GUARD RAILS as every agent does. It is one constant in both scripts, and `workflow-contract.test.js` asserts it byte for byte. Runners run only `tim …`, `git -C … push …` or the pinned prefix. Nothing new needs allowlisting.

## 8. Risks, and what to probe

1. **Haiku copying a generated command.** An `act` command may be mis-copied. Mitigation: commands are short, because tim prints them with tilde paths and no quoting traps. Observation catches a wrong effect, since a push to the wrong ref leaves the expected ref unmatched and the step holds `land-failed`. A mis-copied command that does something else is a real risk for pushes only, and guard-bash plus the classifier see that call. Probe it on the fixture in inc-017.
2. **Rungs longer than one Bash call.** `mvn verify` and E2E shards are sized under 540 seconds (C-019), as today. An option to probe, not assumed: tim starts long rungs detached and polls them across calls, which would lift the cap. Whether a detached child survives the Bash tool's end of call is not known. So sharding stays the design, and detached rungs are a probe in inc-041.
3. **A runner's context.** `CALL_CAP` bounds it, and tim's summaries are kept to a kilobyte or less.
4. **Pipelining and correctness.** A misrelayed receipt can only start or skip a downstream task wrongly. The next runner's `advance` re-derives the task set from disk and runs what is missing. The audit refuses done otherwise. The worst case is one extra runner round.

## 9. Changes to DESIGN.md

| Section | Change |
|---|---|
| 0.3 row 3, 0.4 | Replace "tim never pushes, merges or calls GitHub; lifecycle stays with Claude watchers" with D1 and D3: tim writes local repos and runs every mechanical step; outward actions are single-purpose visible calls, observed afterwards. Record it as C-074 (below) |
| 2.1 diagram | Build box: "act → one Haiku watcher per action" becomes "one Haiku runner per mechanical run loops `advance`, which executes mechanical steps and returns `run` (a task graph), `act` (visible outward commands, run inside the same runner) or `stop`". Replace the stage list with 3.1's runs and waves. Distil box: runners R1 to R13 and the pipelined pairs. Codex: "`advance` runs Codex-bound tasks through `tim backlog codex run`" |
| 2.2 | Delete the rows for `run-rung.sh`, `pre-push-check.sh`, `pin-tools.sh`, `run-stage.sh` and the PR and CI helpers. Add rows for `tim/src/backlog/macros/**` (`prepare`, `rung`, `check`, `prove`, `land`, `pr`, `ci`, `merge`, `record`), `tim/src/backlog/codex/**` and `tim/src/backlog/facts.js`. "Decision engine" becomes "decides **and executes** every mechanical step" |
| 4.2 | The `advance` rows as in 5.1. Delete `advance --record`. Add the tables in 5.2 and 5.3. Change the paragraph under the table to: "An `act` command is always an outward action; every local step runs in tim" |
| 4.5 | Opening paragraph: tim executes. Stage table fields: `kind: mechanical \| outward \| model`, `macro`, and, for model stages, `after[]` and `skipWhen` (D4). `stage prepare` step 5 writes the task graph into `stage.json`. `stage accept` step 2 persists the fix diff it computes. Audit: the two new checks in section 7. Delete the last paragraph ("tim runs only read-only git commands …") |
| 4.6 | The tools table as in 5.4. PUSH RULE: "the branch proof runs inside `tim backlog land` and `record`; a push is generated only after it passes, and never with `--force`". COMMIT RULE: "tim commits with `-F` and the trailer from `run.json`; no agent commits". Rails now name the runner prompt as a fourth canonical text |
| 4.7, 4.8 | Testing on git fixtures now covers write operations (branch cut, merge, commit, conflict). `test-support/fake-codex.js`. No new dependency: `execa` is already in `exec.js`. File-ledger rows for the macros and `facts.js` |
| 5.2 | "Runs in" gains the pipelined pairs. Replace the sentence on relays with "one runner per run of in-process phases between two waves" |
| 5.11 | Codex-bound distil tasks run inside `advance --distil`, so `distil-codex` costs no Claude agent for those phases |
| 5.12 | Add fact receipts and observation to resume |
| 7.1 | Procedure steps 1, 3, 5.2 and 5.3 become `run open` and `run close` |
| 7.2 | The loop as in 3.2. The runner replaces watchers and relays. The ceiling arithmetic uses 44 an increment |
| 7.4 | The stage table as in 3.1: keep the ids, change "Runs as" to tim macro, runner or tier, and add the run or wave column. "Watcher" disappears from the table |
| 7.6 | The state commit is made by `tim backlog record`. The state push is a visible call |
| 7.7 | Add `quality.runnerCallCap` (50) |
| 7.8 | Resume across runs adds "within a mechanical run, the first sub-step without a fact receipt" |
| 7.9 | The two changed rows in section 7 |
| 7.12 | The pin covers tim and the workflow files only. Delete the `tools/**` allow rule from what is owed. Preflight becomes "the pinned tim answers in JSON" |
| 8.2 | Codex adapter: delete the per-stage Haiku watcher. `run-stage.sh` becomes `tim backlog codex run`, called by `advance` |
| 8.4 | "Where commands run": in tim, inside the runner's shell. "No Sonnet or Opus under `codex`" stays true, and there are now 1 or 2 Haiku agents per increment |
| 8.7 | PreToolUse row: local git writes are now inside tim calls. Pushes, PRs, merges and Jira writes are still their own calls |
| 8.8 | Replace the table with section 6 |
| 8.11 | The loop as in section 7. Delete `--record`. Docker and browsers: the orchestrator runs `advance`, which runs them |
| 9.2 | Owed item: delete the pinned-tools allow rule |
| 9.3 | "Lifecycle actions" row: the merit case from section 2 |
| 12 | Add risks 1 and 2 from section 8 |

## 10. Changes to the programme backlog (`design/backlog.json`)

### 10.1 Atoms reworded (statement frozen: none of these is adopted by a registered run yet, so they can be reworded before inc-010)

| Atom | Change |
|---|---|
| req-001 | "The draft PR and CI check **commands** keep the helpers' exit-code contracts". The acceptance keeps exit 3, and exit 2 or 4. ac-3 (execute bit) is dropped, because there are no bash helpers to port. inc-001 becomes tim work |
| req-050 | The Codex runner is a tim command. ac-6 (execute bit) moves to `guard.sh` only |
| req-055 ac-2 | Adds: "and the journal shows one runner for each mechanical run and no other agent" |
| req-057 | Unchanged in words. The fixture uses the new count |
| req-068 | "the recorded exit code of its rung, written by the writer's rung runner as a fact receipt". ac-2 (execute bit) is dropped |
| req-077 | ac-2: "a pinned run calls only the pinned writer, through the already-allowed form, with no prompt". ac-3 (execute bit) is dropped |
| req-118 ac-4, req-055 ac-3 | Execute-bit criteria are dropped where the scripts become tim modules. They are kept for `guard.sh` and `record-read.sh` (in inc-015 and inc-019) |
| req-121 ac-2 | "exactly one of run, act or stop is returned, or the command asks to be called again; every mechanical step leaves a fact receipt; every act is an outward command whose effect the next call observes" |

### 10.2 New atoms (vertical and verified like any other; ids from the writer)

| Key | Statement | Acceptance (sketch) | Increment |
|---|---|---|---|
| `mechanical-steps-cost-no-judgement-agent` | Every mechanical build and distil step MUST be run by the writer's commands, issued by one cheap runner per contiguous run of such steps, and never by a judgement agent | Given the multi-repo fixture with one file changed and no findings, when it is built, then the journal shows exactly the runners section 6 predicts and every mechanical step has a fact receipt | inc-017 |
| `outward-effects-are-observed` | Every push, pull request, merge and ticket write MUST be its own generated call, and its effect MUST be recorded from what the writer observes, never from an agent's report | Given a runner that reports a push as done when the remote ref did not move, when the next step is asked for, then the increment is held `land-failed` naming the repo | inc-022 |
| `dependent-tasks-start-without-a-runner` | A task whose inputs are only accepted outputs of other tasks MUST start when those are accepted, with no runner between them, and a skipped task MUST be re-derived from recorded state | Given a review with findings in 2 of 5 files, when the stage runs, then exactly 2 verify tasks start without a runner between; and given a relayed receipt that under-reports findings, the next step runs the missing verify | inc-019 |
| `local-git-steps-are-tested-writer-code` | Branch cuts, merges of main, increment commits and state commits MUST be made by the writer, tested on fixture repos, and the writer MUST NOT generate a push unless the branch proof passes, and never a forced one | Given a checkout on main, when land runs, then no push is generated and the increment is held; given a sync conflict, it is held `sync-blocked` with no partial merge left | inc-017 (sync, branch), inc-022 (land, state commit) |
| `codex-tasks-run-inside-the-writer` | Codex tasks MUST be run by the writer's own tested runner, so a Codex stage needs no Claude agent | Given the `codex` preset on the fixture, when an increment is built, then no Sonnet or Opus agent ran and the Haiku runner count is at most 2 | inc-015 |

### 10.3 Increments

| Increment | Change |
|---|---|
| inc-001 | Now builds `tim backlog pr ensure` and `ci wait` with the helpers' contracts (req-001 reworded), instead of porting the bash helpers. Still m0, but it gains a dependency on inc-004, because tim `backlog` must exist. Recheck `sequence` |
| inc-015 | Gains `codex-tasks-run-inside-the-writer`. The runner is a tim module. The guard probe is unchanged |
| inc-017 | Gains `mechanical-steps-cost-no-judgement-agent` and the sync and branch half of `local-git-steps-are-tested-writer-code`. `advance` executes, and the runner prompt lands here |
| inc-019 | Gains `dependent-tasks-start-without-a-runner` (task graphs in `stage.json`, the script's generic graph helper) |
| inc-021 | The audit's fact-receipt and observation checks. req-068 reworded |
| inc-022 | Gains `outward-effects-are-observed` and the land and state-commit half of `local-git-steps-are-tested-writer-code`. `pr`, `ci wait` and `merge` through octokit |
| inc-024 | `tim backlog pin`. The owed allow rule goes |
| inc-041 | `tim backlog prove`. The detached-rung probe (section 8, risk 2) |
| inc-029 | The distil runner loop, and the pipelined pairs for characterise → extract-verify and author → verify |
| inc-040 | Also retires `run-rung.sh`, `pre-push-check.sh` and `run-stage.sh` if an earlier bootstrap commit created them |

After the edits, `check --strict` must still pass. In particular, each new atom must be a vertical tooling slice with an `e2e` criterion that runs the tool's real entry point against a fixture programme (C-033). Every sketch above does this, through the build or distil workflow on the multi-repo fixture.

### 10.4 Change-list entries to add

- **C-074: tim executes mechanical steps; outward actions stay visible and are observed.** Supersedes the "tim runs only read-only git" part of C-002 and C-042. It keeps C-042's finding that the push hook and the force deny rule do not match `git -C`, and answers it with tim's own branch proof.
- **C-075: one runner per mechanical run.** Replaces 7.2's watcher per action and 8.8's relay per fan-out. It resolves the contradiction `inventory.md` found between them.
- **C-076: pipelined dependent tasks** (D4).
- **C-077: Codex tasks run inside tim.** `run-stage.sh` becomes `tim backlog codex run`.
- **C-078: the bash lifecycle tools retire into tim.** This is consistent with tim's rail against shelling out to `../tools/*.sh`, and drops the pinned-tools allow rule that is owed to Sam.
