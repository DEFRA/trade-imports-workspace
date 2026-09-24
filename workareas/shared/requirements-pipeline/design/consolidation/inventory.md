# Stage inventory: where the current design spends agents

Written 2026-09-19 against `design/DESIGN.md` (sections 2, 4, 5, 7 and 8), `design/backlog.json` (41 increments, 135 atoms), `analysis/a-frontend-alignment.md`, `analysis/b-increment-build-loop.md` and the tim sources.

Sam's steer: an agent is the cost, not a stage. Each spawn has a fixed start-up cost and uses tokens and wall-clock. Deterministic work belongs in scripted, tested tim commands, issued by a cheap Haiku "run this" agent. Judgement agents read the facts tim recorded and never re-run them. R8 applies: build effort carries no weight, but an overhead that every run pays does count.

## How the current design spends an agent

These rules come from the design itself:

- A Workflow script cannot run a command. So each `tim backlog advance` call is made by some agent.
- **Model stage** (8.2): one agent per task. Each agent writes a draft and runs `stage accept` itself.
- **After each model fan-out** (8.8): one Haiku relay calls `advance` to get the next step. There are about 9 per increment.
- **Act step** (7.2 step 3, 4.2, 4.5): "spawn one Haiku watcher per action", which runs "one Bash call each". The watcher then records the result with `advance --record`. The last watcher of a step also fetches the next step.
- **In-process** (4.2): `next`, `heads --strict`, `manifest`, `secrets`, `stage audit`, `status`, `report` and `counts` run inside `advance`, so they cost no agent of their own.

**The design contradicts itself here.** Section 7.2 says one watcher per *action*. Section 8.8 counts "about 8 to 10" watchers, which is one per *stage*. The tables below give both counts. The per-action figure is the one the design actually specifies.

## Typical increment used for the counts

- **Repos:** 3 (frontend on Node, backend on Java, tests). Programme delivery, no ticketing, merge `never`.
- **Rungs:** 6 registry rungs in total: frontend `format:check`, `lint` and `test`; backend `mvn verify`; tests `lint` and `format:check`. The plan adds 1 `command` invariant.
- **Changes:** F = 12 content-changed files. K = 6 of them have findings, and the consistency review has findings too.
- **Rounds:** 1 fix round and no repairs. The plan audit approves first time. Nothing is discovered.
- **Sync:** `main` moved in one repo (the frontend).
- **Integration proof:** 3 shards, all green first time.
- **CI:** green, no fixer.
- **Executor:** Claude preset. Think = Opus at high effort, doer = Sonnet, watcher = Haiku at low effort.

## Build stages 0 to 27

"J" means judgement, "M" means mechanical, and "Mixed" means both (the cell says which part is which). Agent counts are per typical increment. "Per-action" follows 7.2 as written. "Per-stage" follows 8.8's reading.

| # | Stage | What it does | Kind | Agents, per-action (7.2) | Agents, per-stage (8.8) | tim today | tim would do the mechanical part |
|---|---|---|---|---|---|---|---|
| 0 | Resolve | Registry, `run show`, `stage schemas --out`, preflight (state branch, tim root, pin `--check`) | M | 1 per run (not per increment) | 1 per run | `--workspace` root resolution (`env/workspace-root.js`); nothing for `backlog` yet | `tim backlog run preflight` inside `advance` on its first call |
| 1 | Next | Applies the buildability rule and resolves the bindings | M | 0 (in-process) | 0 | none (`tim/src/backlog` does not exist yet) | already in-process in `advance` |
| 2 | Ticket | `tools/jira/*` when `ticketing` is set | M, outward (Jira write) | 0 here (no ticketing); 1 when set | 0 / 1 | `tim jira ticket`, `tim jira comments` (read-only) | a new `tim jira create` or `transition` through `jira-client`, issued as its own visible call |
| 3 | Branch | Checks out or cuts the same branch name in every surface repo | M (local, reversible) | 3 (one per repo) | 1 | `tim workspace branch` checks out a matching branch in every repo and moves the others to their default. It cannot create a branch or scope to a repo set | part of `tim backlog prepare` |
| 4 | Baseline | `heads --for --strict`: tracked-only fingerprints | M | 0 (in-process) | 0 | `tim/src/parity/heads.js` (moves into `backlog`) | in-process |
| 5 | Sync | Fetch, `merge-tree` probe, clean merge of `main`, rungs, pre-push check, push. A conflict becomes a hold | M. The push is outward | 11: 3 fetches, 3 probes, 1 merge, 3 rungs, 1 push (the pre-push check runs inside the push action) | 1 | `tim workspace update` runs `fetch` plus `pull --rebase` on every repo. That is not a merge of `main` into a feature branch | `tim backlog prepare` does the fetch, probe and local merge. The push is deferred to the land step (see the safety section) |
| 6 | Ladder facts | `run-rung.sh` for each rung of every touched repo. A red rung becomes a hygiene item and a `baseline-red` hold | M | 6 | 1 | `tim workspace test` / `lint` run over every repo, serially, with no exit files per rung | `tim backlog prepare` runs the rungs in-process through `exec.js` and writes the `.exit` files |
| 7 | Plan | Plans the whole slice: seams, invariants, `reposAdded` | J | 1 Opus + 1 relay | 1 + 1 | none | none |
| 8 | Plan audit | A different task derives the requirement from the row and approves or asks for a revision | J | 1 Opus + 1 relay | 1 + 1 | none | none |
| 9 | Added-repo set-up | Only when the plan adds a repo: surface amendment, then stages 3 to 6 for that repo | M | 0 (typical) | 0 | none | `tim backlog prepare --repos <added>` |
| 10 | Implement | Writes the change across every surface repo | J | 1 Sonnet + 1 relay | 1 + 1 | none | none |
| 11 | Implement check | Browser, Docker and invariant rungs. On red, resumes the implement task (up to 2 rounds) | Mixed: rungs M; the resume on red is J (the implementer) | 2 (after implement and after fix, 1 invariant rung each) | 2 | `exec.js`, `docker dev` | `tim backlog check --implement`: runs the rungs and writes the `.exit` files |
| 12 | Manifest | Diff from the pinned heads, `rulesGap`, protected-path refusal | M | 0 (in-process) | 0 | `parity/manifest.js` is the screen manifest, a different thing | in-process |
| 13 | Review | One style and one code task per file (2F); one consistency task | J | 24 Sonnet + 1 Opus + 1 relay | 26 | none | none |
| 14 | Verify | One task per file with findings (K), plus verify-consistency | J | 7 Sonnet + 1 relay | 8 | none | none |
| 15 | Judge | Rules fix-now, defer or reject; writes `discovered[]` | J | 1 Opus + 1 relay | 2 | none | none |
| 16 | Fix | `REVIEW_ITEM_FIXER` / `STYLE_IMPLEMENTOR`, then the stage 11 re-run (counted under 11) | J | 1 Sonnet + 1 relay | 2 | none | none |
| 17 | Fix verify | A different task confirms each fix | J | 1 Sonnet + 1 relay | 2 | none | none |
| 18 | Ladder | Registry rungs plus plan extras. On red, a repair task (up to 3), each followed by a repair review | Mixed: rungs M; repair and repair review J | 7 (6 rungs + 1 invariant) | 1 | `tim workspace test` / `lint` (not per rung) | `tim backlog prove`: runs the ladder |
| 19 | Secrets | Credential scan of the diff | M | 0 (in-process) | 0 | none | in-process |
| 20 | Integration proof | `tim docker dev` with the include list, one call per shard, one retry, `tim docker down`. On red, an e2e-repair task | Mixed: stack and shards M; repair J | 5 (dev, 3 shards, down) | 1 | `tim docker dev` / `down` wrap `run-stack.sh`. There is no include list yet | `tim backlog prove`: stack up, shards, retry, down, JSON reporter record. Sliced under the 600 s Bash limit with exit 75 |
| 21 | Acceptance | A fresh task judges each criterion against the proof record, and never sees the plan | J | 1 Opus + 1 relay | 2 | none | none |
| 22 | Land | Commits with `-F` and the trailer, then a pre-push check and a refspec push for each repo, in merge order | M. The commit is local and reversible; the push is outward | 6 (3 commits, 3 pushes) | 1 | none (tim runs read-only git only, by design C-042) | `tim backlog land` does the commits. The pushes stay visible calls |
| 23 | PR | `pr-ensure-draft.sh` for each repo | M, outward | 3 | 1 | `github-client` is read-only (whoami, find, get, diff, runs) | `tim github pr ensure-draft` through octokit, issued as its own visible call |
| 24 | CI | `wait-for-pr-checks.sh` for each repo; a CI fixer on red; `sonar-check-pending.sh` (advisory) | Mixed: waiting M (read-only); fixer J | 4 (3 waits + sonar) | 1 | `tim gha wait <repo> <runId>` polls one workflow run (`gha-client.waitForRun`) | `tim backlog ci-wait`: every PR's checks through octokit, sliced with exit 75 |
| 25 | Merge | Every PR green, then merges in `consumes` order | M, outward | 0 (merge `never`); 3 under `per-increment` | 0 | none | stays its own visible call for each repo |
| 26 | Record | `status done` (runs the audit), report, handover, discover (a verifier task for each discovered atom), state commit and push | Mixed: tim writes M; verifying discovered atoms J | 2 (state commit, state push). `status`, `report` and `handover` run in-process per 4.2. The stage table in 7.4 lists them as watcher work | 1 | none | `tim backlog record` does the audit, status, report, handover and the local state commit. The push is a visible call |
| 27 | Checkpoint | Stops the drain | M | 0 (in-process) | 0 | none | in-process |

### Build totals, typical increment

| | Per-action (7.2, as specified) | Per-stage (8.8's reading) |
|---|---|---|
| Judgement agents (model tasks: 8 + 2F + K + 1) | 39: 5 Opus (plan, audit, consistency, judge, acceptance) and 34 Sonnet | 39 |
| Relays after a model fan-out (Haiku) | 9 | 9 |
| Action watchers (Haiku) | 49: branch 3, sync 11, ladder facts 6, implement check 2, ladder 7, proof 5, land 6, PR 3, CI 4, record 2 | 11 |
| **Total per increment** | **97** | **59** (8.8 itself says about 56 to 58) |
| Per run, on top | 1 resolve watcher. The pin clone and `npm` install happen on every launch, in the main session | same |

Of the 97 agents, 58 are Haiku agents doing no judgement: 9 relays and 49 watchers. That is 60% of the increment's agents. None of them needs its own spawn. For comparison, `frontend-alignment` used 348 agents over 13 stages, about 27 a stage (`analysis/a-frontend-alignment.md:30`). The legacy loop quotes 15 + 3n (`b-increment-build-loop.md:165`), which is 51 for n = 12.

**Under the `codex` preset**, the 39 model tasks become Codex processes. Each Codex model stage adds one Haiku stage watcher (about 9), and the stage watchers take over the relays. That leaves about 58 Haiku agents per increment under the per-action reading, or about 20 under the per-stage reading. The watcher count does not shrink when Codex does the thinking.

## Distil phases

Typical run: 4 sources, 6 slices, 60 atoms, no earlier distillation, 1 panel docket, 1 slice flagged by `yield`, 2 slices with added atoms, 4 prose section groups. The design does not fix the number of prose groups. The cold reader runs once per report section, and the report has 13 sections (2.1 says "COLD_READER per section").

| # | Phase | What it does | Kind | Agents | tim today | tim does the mechanical part |
|---|---|---|---|---|---|---|
| 0 | setup | Interview, `init`, `source add`, contract drafted | J (main session, the skill) | 0 (main session) | none | `tim backlog init` / `source add` (planned) |
| 1 | heads | `heads --write` | M | 0 (in-process) | `parity/heads.js` | in-process |
| 2 | acquire | Confluence and Jira through the clients; docx, xlsx and pptx conversion; seal | M | 0 (in-process) | `confluence-client`, `jira-client`, `parity/seals.js` | in-process |
| 3 | characterise | Units for each source; crops for visual units | J (calls `source crop`, M, inside the task) | 4 | none | `source crop` inside the task |
| 4 | extract-verify | A different task for each source gives a verdict per unit; P1 `units --strict` gate | J; the gate is M | 4 | `parity/coverage.js` | the gate runs in-process |
| 5 | carryover | Triages earlier work | J | 0 (fresh run); 1 otherwise | `citations/carry-forward.js` | none |
| 5a | reslice | Turns migrated layer rows into vertical atoms, then a different task verifies them | J | 0 (no migrate) | none | none |
| 6 | slice | Slices by behaviour; P2 `slices --strict` | J; the gate is M | 1 | `parity/slices.js` | in-process gate |
| 7 | contract | PER-RUN answers from the skill and Sam. The workflow stops here and is relaunched | J (main session) | 0 | none | none |
| 8 | author | One task per slice | J | 6 | none | none |
| 9 | verify | A different task per slice; a second verifier for added atoms | J | 6 + 2 | none | `verify-record` inside accept |
| 10 | yield | `yield` / `coverage` (M); a gap auditor per flagged slice, then its verifier (J) | Mixed | 2 | `parity/yield.js`, `coverage.js` | in-process gates |
| 11 | reconcile | Conflicts, precedence, assumptions, invariants, draft questions | J | 1 | none | none |
| 12 | panel | For each docket, 3 judges and a chair; then 1 critic; rulings through `rule --by panel` | J; applying the rulings is M | 5 | none | `rule` in-process |
| 13 | dedupe | `duplicates` (M), then `ATOM_DEDUPER` (J) | Mixed | 1 | `parity/duplicates.js` | in-process |
| 14 | ingest-atoms | P7: ids, refusals, statement freeze, P11 | M | 0 | `parity/ingest.js` | in-process |
| 15 | trace | P4 `trace --strict` | M | 0 | none (new) | in-process |
| 16 | critic | `COMPLETENESS_CRITIC` | J | 1 | none | none |
| 17 | questions | Editor (J), critic (J), `question lint` (M), `rule --by default` (M) | Mixed | 2 | none | in-process |
| 18 | combine | `candidates` (M), combiner (J), combine verifier (J), `ingest --increments`, `check --strict` (M) | Mixed | 2 | `duplicates.js` pair machinery | in-process |
| 19 | prose | `PROSE_EDITOR` then `PROSE_CLAIM_VERIFIER` for each section group | J | 8 | none | `set` in-process |
| 20 | report | `report`, `report --lint` (M), then a `COLD_READER` for each section (J) | Mixed | 13 | `parity/render/*` | in-process render and lint |
| R1 | apply-rulings | `RULING_APPLIER` for free-text rulings | J | 0 (first run) | none | `rule --effects-file` in-process |

### Distil totals, typical run

| | Agents |
|---|---|
| Judgement agents | 58: characterise 4, extract-verify 4, slice 1, author 6, verify 8, gap 2, reconcile 1, panel 5, dedupe 1, critic 1, questions 2, combine 2, prose 8, cold reader 13 |
| Relays after each sequential model step (Haiku) | 21. Characterise, extract-verify, slice, author, verify, added-verify, gap-audit, gap-verify, reconcile, panel judges, chair, panel critic, dedupe, critic, question editor, question critic, combiner, combine verifier, prose editor, prose verifier, cold reader. If author and verify are pipelined for each slice through `advance`, the author–verify pair needs up to 6 relays instead of 2 |
| First `advance` call of each launch (Haiku) | 2 (heads to slice; then author to report, after the contract stop) |
| **Total per distil run** | **81** (up to about 91 with per-slice pipelining relays) |

Distillation already runs every tim phase in-process (5.2). So its mechanical overhead is the relays alone. Every relay sits between two judgement steps, and needs tim (`accept --finalise`, then `prepare` for the next step) between them. That is the floor, unless a judgement agent does it, which Sam rules out. The count that grows with the run is judgement: 13 cold readers and 8 prose agents. That is a question of quality versus fan-out, not something to consolidate. It is listed here, not recommended.

## Mechanical runs, and the floor

A contiguous run of mechanical steps needs exactly one cheap "run this" agent (a runtime fact). In the build, those runs fall between judgement stages as follows:

| Run | Contains (stage numbers) | Today, per-action | Floor | Macro tim command |
|---|---|---|---|---|
| A. Before the plan | the previous increment's 26 (record) and 27, then 1, 3, 4, 5 (fetch, probe, merge), 6 | 1 + 11 + 3 + 6 = 21 (record's 2 + branch 3 + sync 11 + ladder facts 6, minus the shared `advance`) | 1 | `tim backlog prepare <p> --inc <id> --json`: next, branch cut, heads, fetch, merge-tree probe, local merge, rung facts, holds. This is Sam's "mega prepare" |
| B. Plan to audit | `accept --finalise`, then `prepare` for the audit | 1 relay | 1 | `advance` |
| C. Audit to implement | the same | 1 | 1 | `advance` |
| D. After implement | 11 (rungs), 12 (manifest) | 1 relay + 1 watcher | 1 | `tim backlog check --implement` (then `advance`) |
| E–G. Review to verify, verify to judge, judge to fix | `finalise` and `prepare` | 3 relays | 3 | `advance` |
| H. After fix | 11 re-run | 1 relay + 1 watcher | 1 | `tim backlog check --implement` |
| I. After fix-verify | 18, 19, 20 | 1 relay + 7 + 5 watchers | 1 (it loops the same command on exit 75) | `tim backlog prove <p> --inc <id>`: ladder, secrets, stack, shards, retry, down, proof record |
| J. After acceptance | 22 to 26, then run A for the next increment | 1 relay + 6 + 3 + 4 + 2 watchers | 1, and it can be the same agent as run A | `tim backlog land` (commits), then visible pushes, then `tim github pr ensure-draft` (visible), `tim backlog ci-wait`, `tim backlog record`, then the state push (visible), then `tim backlog prepare` for the next increment |

The consolidated floor for a typical increment is 9 or 10 Haiku agents (runs A to J, with J and the next A sharing one agent in a drain), against 58 today. The 39 judgement agents are unchanged. The **total goes from 97 to about 48**. The per-increment count no longer grows with rungs, repos or shards: those become loops inside tim.

## Safety line: outward-facing actions, decided on merit

Visibility to guard-bash, the auto-mode classifier and the allowlist comes from the **Bash call boundary**, not from the number of agents. So an outward action can stay its own visible call inside the same cheap watcher, and needs no agent of its own.

| Action | Decision | Why |
|---|---|---|
| Fetch, `merge-tree` probe, local merge of `main`, branch cut, local commits, wip commits, the state commit, rungs, secrets, manifests, receipts, audits | tim | All are local and reversible, and tested on git fixtures (`test-support/git-fixtures.js`). **This reverses C-042's "tim runs only read-only git"** for local writes. Sam's steer puts branch creation in tim, so the rule becomes "tim never pushes, merges a PR or writes to Jira" |
| `git push`: increment branches, sync merges, the state branch | Its own visible Bash call for each repo, issued in sequence by the one publish watcher (run J). The push after a sync merge is deferred to land, so a sync never needs a push of its own | Pushing is hard to reverse, starts CI and exposes code. As a separate call, guard-bash and the classifier see the refspec and the branch. The `sonar-record-push.sh` hook matches only `Bash(git push*)` and never fires for `git -C … push` (8.7, C-042). So its reach is not a reason either way. The branch proof (`pre-push-check.sh`) can move into tim as `tim backlog push-check`, run just before each push |
| Draft PR create or reuse | Moves into tim (`tim github pr ensure-draft` through octokit), and stays its own visible call | Library-first is a tim rule (no `gh`, no `tools/*.sh`). Idempotency (reuse, exit 3 on merged or closed) becomes tested code. The PR is visible to the team, so the call stays separate and names what it does |
| Waiting for CI checks | tim (`tim backlog ci-wait`, octokit, sliced with exit 75), batched with the rest | Read-only. `gha-client.waitForRun` already polls |
| PR merge (`per-increment` only) | Its own visible call for each repo, in `consumes` order, in the publish watcher. It never runs inside a tim macro | This is the least reversible action in the pipeline, and `main` is shared |
| Jira create and transition | Its own visible call (a new write to `tim jira` through `jira-client`), in run A for create and run J for done | A write outside the repos that other people see |

## Fixed costs every agent pays

These are per spawn or per round trip, whatever the agent does:

1. **Context at spawn.** The system prompt and tool schemas, the workspace `CLAUDE.md` (about 12 KB) and the nested `CLAUDE.md` chain, the auto-memory `MEMORY.md` index (about 15 KB, loaded into every agent in this workspace), and the GUARD RAILS constant inlined into every spawn prompt. A Haiku watcher pays all of this to run one or two Bash calls, 58 times per increment.
2. **The judgement agent's must-read list** (8.5, 8.6; the reading audit). Every review, verify, judge and fix task must read in full: the owning skill's `SKILL.md`, the persona, the routed best-practice files, the `CLAUDE.md` chain and the memory index. On top of that come `prompt.md`, `brief.json`, `standards.json` and `upstream/plan.md` (FA's s17 plan was 1,076 lines). The 25 review tasks re-read almost the same bundle each. This is a cost of judgement agents, not of mechanical ones. It is listed because it scales with 2F.
3. **The accept round trip** (8.2). One Write of `output.draft.json`, then one Bash call to `tim backlog stage accept`, up to 3 correction rounds. Exit 4 means rerun unchanged. Under `toolPin`, every call pays `npm --prefix … run --silent tim --` start-up (npm, Node, loading tim), about 1 to 2 s each.
4. **The relay round trip after each fan-out.** A Haiku spawn and an `advance` call. `advance` re-reads and parses `backlog.json` (about 300 KB for this programme), `state.json` and `run.json` with zod, runs `accept --finalise`, then `stage prepare` for the next stage. `prepare` calls the standards resolver for each task: picomatch over the rules, the `CLAUDE.md` chain, and a blob sha for every must file. There are 9 per increment and 21 per distil run.
5. **The watcher round trip for each action** (7.2). A spawn, the command, then `advance --record --exit --log`: two tim start-ups for one command, 49 times per increment.
6. **The relayed task-list check** (C-070). `advance`'s `run` step travels through a Haiku agent's output, and the script checks it against the count and the sha of `stage.json`. A mismatch re-calls `advance` once, then holds. The check itself costs nothing, but it exists only because a relay is in the loop.
7. **Codex stages.** One Haiku stage watcher for each Codex model stage, plus a `codex exec` cold start and `--json` stream for each task. `run-stage.sh` slices at 540 s.
8. **The agent ceiling** (7.2). The run stops at 850 agents, below the runtime's 1,000. At 97 agents an increment, that is about 8 increments a run. Each relaunch pays: a new run label, `run start`, the Workflow launch, the stage 0 resolve watcher, and `pin-tools.sh` (a workspace clone plus the `npm` install for tim) under `toolPin: launch-commit`. At about 48 an increment, one run covers about 17 increments.
9. **Per run in the main session.** Preflight, the binding commit and its push, `run start`, `run end`, `counts` and the handover print. This is not agent cost, but it is paid on every launch, so the ceiling's relaunch count multiplies it.
10. **The read hook.** `tools/backlog/record-read.sh` fires on every `Read` by every Claude agent (`PostToolUse`). It is small, but paid on every read of every must file.

## Facts checked in tim

- `tim/src/exec/exec.js` runs processes through `execa` (`run`, `runStreamed`). `exec/parallel.js` and `exec/stack.js` exist.
- `tim/src/commands/workspace/` has `branch`, `update`, `test`, `lint`, `status`, `install`, `reset`, `clean` and `setup`:
  - `branch` checks out a matching branch in every repo, or moves a repo to its default; it cannot create a branch.
  - `update` is `fetch` plus `pull --rebase`.
  - `test` runs `npm test` or `mvn verify` in every repo, serially.
- `tim docker` has `up`, `dev`, `down`, `restart` and `bounce-backend`, wrapping `scripts/stack/*.sh`. There is no include list.
- `tim/src/clients/github-client.js` (octokit) is read-only: `whoami`, `findPrsForTicket`, `getPr`, `getPrDiff`, `listWorkflowRuns`, `getRunStatus`. `gha-client.waitForRun` polls one run.
- `jira-client` and `confluence-client` exist. The `tim jira` commands are read-only.
- `tim/src/test-support/git-fixtures.js` exists.
- `tim/src/backlog/` does not exist yet. `heads.js`, `ingest.js`, `slices.js`, `yield.js`, `coverage.js`, `duplicates.js`, `seals.js` and `manifest.js` (screens) are under `tim/src/parity/`.
- `tim/CLAUDE.md` rails: library-first; never shell out to `gh`, `jq`, `curl` or `../tools/*.sh`; test on input and output with vitest.
