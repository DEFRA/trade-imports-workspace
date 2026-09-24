# Design triage: the change list

Triage of 63 critic findings (`critiques/all-findings.json`) and 41 audit proposals (`corrections/r8-merit.md`, `r7-slices.md`, `codex-parity.md`), judged only on R1 to R8 merit. Build effort, file count, diff size and new surface carried no weight in any ruling (R8).

## Source ids

- Audit proposals keep their ids: `r8-merit-NN`, `r7-slices-NN`, `codex-parity-NN`.
- Critic findings have no ids in the JSON. They are named by array and position (1-based): array 1 = `QR-n` (questions and report), array 2 = `RC-n` (recipe), array 3 = `FE-n` (feasibility), array 4 = `CX-n` (Codex parity).

## Groups

- **g1**: DESIGN sections 0 to 3.
- **g2**: DESIGN sections 4 to 6.
- **g3**: DESIGN sections 7 and 8.
- **g4**: DESIGN sections 9 to 12, plus `backlog.json` and `decisions-for-sam.md`.

A change that touches several groups is listed under each, with that group's part spelled out.

## Evidence checks run for this triage

- Principle 12 (DESIGN:116), 4.8's column "Why not extend an existing one" (:970), `direction` (backlog.json:94) and d-001 "Winner: Reuse." (:342): confirmed.
- 4.5 opening "tim never decides the order of stages" (:892) and `STAGE_ORDER` contract item (:947): confirmed.
- P11 layer-chain rule (DESIGN:601) with the "tests repo on every product row" rule (:602): confirmed. Two product rows always share `tests`, so "disjoint repo sets" never holds. **Blocker r7-slices-01 stands.**
- `CONSISTENCY_REVIEWER.md` category table (config, dependency bumps, structural patterns, tests, docs, flags): confirmed. It has no provider and consumer contract method. **Blocker r7-slices-02 stands.**
- `.claude/settings.json:139` PostToolUse `"if": "Bash(git push*)"`, and deny rules `git push --force *` and `-f *` (:51-52): confirmed. Neither matches `git -C <repo> push …`.
- Deny rules for `bash *`, `node *`, `python *` and `chmod *`: confirmed.
- 8.2 Codex watcher runs accept once after exit 0 or 1, and `run-stage.sh` runs only tasks without `output.draft.json` (:1932, :1939): confirmed. **Blocker CX-1 stands.**
- 7.4 stage 21 before 25, and "needs-e2e becomes met when its run is green" (:1609): confirmed. **Blocker RC-2 stands.**
- 7.12 pinned `prompt.md` points at bash tools inside the pin (:1830); the allowlist covers root `tools/**` only: confirmed. **Blocker FE-1 stands.**
- 4.5 accept step 5 fingerprint is HEAD plus `git status --porcelain` (:907), and the workspace repo carries untracked `workareas/shared/` entries (git status at session start): confirmed. **Blocker FE-2 stands.**
- The programme backlog: all atoms `proposed` and unverified; `dv-tooling-commands`, `as-judge-on-codex`, `dv-bootstrap-by-hand` present (backlog.json:110-111, :214): confirmed. **Blocker RC-1 stands.**

All 8 blockers (r8-merit-01, r7-slices-01, r7-slices-02, RC-1, RC-2, FE-1, FE-2, CX-1) are accepted. None is open.

## Canonical build stage order after this triage

C-002, C-017, C-021, C-031 and C-037 all move stages. To stop them drifting, the stage table in 7.4 (and the tim stage table it mirrors) takes this one order. Every entry below that names a stage uses these numbers.

| # | Stage | Change that sets it |
|---|---|---|
| 0 | Resolve (once per run) | unchanged |
| 1 | Next | run in-process by `advance` (C-002) |
| 2 | Ticket | unchanged |
| 3 | Branch | unchanged |
| 4 | Baseline | fingerprint rules from C-065 |
| 5 | Sync | unchanged |
| 6 | Ladder facts | hygiene rule from C-032 |
| 7 | Plan | seams (C-023), invariants (C-008), repos added (C-031) |
| 8 | Plan audit | new objection kinds (C-001, C-063) |
| 9 | Added-repo set-up | only when the plan adds a repo: stages 3 to 6 for those repos (C-031) |
| 10 | Implement | standards union (C-037) |
| 11 | Implement check | watchers run browser and Docker rungs and command invariants; resume the writer on red (C-017, C-008) |
| 12 | Manifest | base = pinned heads (C-068); `rulesGap[]` (C-037); protected paths (C-010) |
| 13 | Review | per-file style and code; one consistency task with seam verdicts (C-022, C-023) |
| 14 | Verify | per file with findings, plus one verify-consistency task (C-024) |
| 15 | Judge | rules on file and consistency findings |
| 16 | Fix | fixer files may span repos (C-024) |
| 17 | Fix verify | re-runs consistency when a fix touches a seam file (C-021) |
| 18 | Ladder | repair plus repair review (C-021); timeout becomes an `environment` hold (C-019) |
| 19 | Secrets | unchanged |
| 20 | Integration proof | watcher command steps, sharded (C-019); record schema (C-020) |
| 21 | Acceptance | fresh task; never receives the plan; maps e2e criteria to passed tests (C-021) |
| 22 | Land | unchanged |
| 23 | PR | unchanged |
| 24 | CI | when `quality.integrationProofSource` is `ci`, stages 20 and 21 run after this one instead (C-035) |
| 25 | Merge | order from `consumes` (C-026) |
| 26 | Record | the state commit writes the Codex handover (C-003) |
| 27 | Checkpoint | unchanged |

The old stages 7, 10 and 13 (routing watchers) are deleted by C-037.

---

## Changes

### C-001 Choose on merit in use, and supersede the reuse verdict

- **Sources:** r8-merit-01 (blocker), r8-merit-03.
- **Decision:** ACCEPT. Evidence confirmed (DESIGN:43, :116, :970; backlog.json:80, :94, :339-351). The judges' `reuse` dimension broke a tie that R8 says it must not.
- **g1:**
  - Principle 12 becomes: "Take the best ideas and proven mechanisms, and choose on merit in use. Options are compared only on output quality, requirements and report quality, Codex parity, vertical slices, correctness and operability under the rails. Build effort, file count, diff size and new surface carry no weight (R8). Collapsing an overhead that every run pays counts. `git mv` is used only to keep history, never as a reason. Headless stages decide and record; a must-answer question blocks what it touches until a person rules."
  - 0.2: replace the first paragraph with a component table. Data model (atoms plus members, `run.json`, drain, no nesting): reuse; merit = no stale acceptance, R5, operability. Requirements method (extract-verify, trace, question editor and critic, combine verifier, report sections): quality; merit = requirements and report quality. Control plane (decision engine `advance`, file-first tasks, receipts, op ids, prompt parity, reading audit, routing as data): codex; merit = parity, a tested state machine, less per-run overhead. Lifecycle execution (Claude watchers run exact commands tim generates): the judges' objection to codex; merit = classifier, guard-bash and allowlist visibility, tim rails. Add one line: "Judge 1 without the reuse row: quality 80, reuse 77, codex 76."
  - 0.1: drop "renamed by `git mv`" as a description of what the skills and workflows are (C-002, C-041 set their real lineage).
- **g2:** 4.8 renamed "The file ledger", column renamed "What it does better in use". Rewrite each row's reason in use terms (for example `run-stage.sh`: "slicing and resume become a tested, committed step instead of prompt prose"). Remove the closing "Nothing else is new." Remove rows deleted by C-037 (`skill-routing.sh`) and add rows added by C-002, C-009, C-038, C-039, C-040.
- **g3:** 7.5 plan audit gains the objection kind `build-cost-reasoning`: a plan choice justified by effort, file count, diff size or new surface.
- **g4:**
  - `backlog.json` `direction` (and its mirror in 11.4): "Choose the option that is better in use: output quality, requirement and report quality, Codex and Claude parity, full-stack slices, correctness, and operability under the rails. Build effort, diff size and the number of new files carry no weight (R8). Collapsing an overhead that every run pays counts."
  - Add source `r8-merit` (`design/corrections/r8-merit.md`, kind decision-record, tier 1). `precedence` becomes `[sam-req, r8-merit, judge-1, judge-2, judge-3, synthesis]`, why "the judges' reuse dimension and build-cost reasons carry no weight".
  - Append d-002: "Adopt the final design as corrected by the R8 merit audit and the triage change list: data model from reuse, requirements method from quality, control plane from codex's decision engine, lifecycle actions run by Claude watchers." d-001 gets `status: superseded`, `supersededBy: d-002`. Every `decisions: ["d-001"]` reference moves to d-002.
  - Add invariant `inv-merit-only`: "No design or plan choice rests on build effort, file count, diff size or new surface." Read by plan, plan audit and judge.
  - 9.3: every "whose verdict it follows" cell that cites reuse, build feasibility or "no change to either skill's tooling" is replaced by the merit reason, or by "overturned by r8-merit" with the change id from this list.

### C-002 One tested decision engine: `tim backlog advance`

- **Sources:** r8-merit-02, codex-parity-01, r8-merit-05, CX-8 (the "or directly" and orchestrator-sandbox parts).
- **Decision:** ACCEPT, merged. The stage machine was declined only for rebuild cost (DESIGN:80, :892, :2328), which carries no weight. In use, a second, prose copy of the transition rules in a Codex-orchestrated session is lossy, and resume logic in untestable workflow JS is where the loop has failed before. The merit-based refusals are kept: tim never pushes, merges, calls GitHub or runs `tools/`, and nothing outlives a Bash call. Name: `advance` (codex-parity-01's `stage next` is the same verb; one name).
- **g1:**
  - 0.3 row 3 keeps "tim never pushes, merges or calls GitHub" with the reason from C-042.
  - 0.3 row 5 becomes: "tim decides, Claude watchers execute. `tim backlog advance` holds every transition rule and is tested with vitest on fixture folders. The workflow script is a thin interpreter. Lifecycle commands are generated by tim and run verbatim by watchers."
  - 2.1 diagram and 2.2 parts: add `advance`; `backlog-build.js` and `backlog-distil.js` described as interpreters.
- **g2:**
  - 4.2: add `tim backlog advance <p> --run <label> [--inc <id>] --json` and `advance --distil`, in `tim/src/backlog/advance/`. Each call accepts pending drafts, checks the expected task set, applies the stage table's transition rule, and runs every tim-only stage in-process (next, heads `--strict`, manifest, secrets, stage audit, status, report, counts; for distil: heads, units `--strict`, slices `--strict`, yield, coverage, ingest `--atoms`, trace `--strict`, question lint, candidates `--combine`, ingest `--increments`, check `--strict`, report). It returns one step: `{status: run, stage, tasks[]}`, `{status: act, stage, actions[{id, cmd, repoKey, record}]}`, `{status: wait}` or `{status: stop, stopReason}` (a failed distil gate stops with `gate:<name>` and the missing list).
  - `act` commands are exact single allowlisted commands generated by tim, for example `git -C <tilde repo> push -u origin refs/heads/<b>:refs/heads/<b>`, `tools/github/pr-ensure-draft.sh …`, `tools/backlog/run-rung.sh …`. Results return by `tim backlog advance --record <actionId> --exit <n> --log <file>`, or from run-rung `.exit` files. tim still runs only read-only git.
  - 4.5 opening rewritten: tim decides stage order and transitions; it never executes lifecycle effects. Verify-skip, fix rounds, repair budgets, `ciFixAttempts`, the baseline-red hygiene rule, `systemicHaltAfter`, holds and the resume point are all rules in the stage table plus `advance`.
  - 4.6: delete contract-test item 2 (`STAGE_ORDER`) and the constant.
  - 5.2, 5.11, 5.12: distillation runs through `advance --distil`. Only model phases spawn agents. The `distil-codex` preset works in a Codex-orchestrated session too.
- **g3:**
  - 7.2: `backlog-build.js` is a new interpreter loop (candidates/codex.md 7.3): call `advance`; on `run`, spawn tasks through the adapters; on `act`, spawn one Haiku watcher per action that runs `cmd` verbatim as one Bash call and records it; on `wait`, re-call; on `stop`, return.
  - 7.8 "Resume across runs" and the hold mapping move into `advance` and the stage table, with the loop's rule (`increment-build-loop.js:938-946`) ported and tested.
  - 8.8 recount: about 8 to 10 watchers per increment in the `claude` preset, plus one per Codex model stage in the `codex` preset.
  - 8.11: the Codex-orchestrated loop is "run `advance`; on `run`, `tools/codex/run-stage.sh`; on `act`, run the listed commands verbatim; repeat". Remove "or directly". The orchestrating session must run with full access (it pushes, commits state and starts nested `codex exec`); the handover says so, and `run-stage.sh --check` verifies it. The handover names what this mode gives up: per-call Claude hooks, the auto-mode classifier. A committed pre-push check (`tools/backlog/pre-push-check.sh`, the PUSH RULE's branch proof) is part of every generated push action in both modes.
- **g4:**
  - 9.3 "stage machine" row: "tim decides, Claude watchers execute (r8-merit)".
  - 10: `increment-build-loop.js` is not moved. It stays working for legacy backlogs (the plants loop, frontend alignment) until inc-040 retires it; `backlog-build.js` is written new and names its lineage in the commit message. Merit: live programmes keep an operable loop during the build.
  - 11.3 inc-017 gains an atom: "The next stage of an increment MUST be decided by one tested command from recorded state, the same for a Workflow run and a Codex-orchestrated session." e2e criterion: one fixture increment driven by the interpreter and by a scripted handover loop reaches byte-identical `state.json` and receipts. inc-023's Codex-orchestrated criterion depends on it.
  - inc-029 outcome amended per C-036.

### C-003 Executor switches apply from the next stage; the Codex handover always exists

- **Sources:** r8-merit-06, codex-parity-06.
- **Decision:** ACCEPT, merged. R6's "Codex for the rest" is said when Claude runs out mid-increment. Presets already mix executors within an increment, so the increment boundary serves no quality purpose.
- **g2:** 4.5 audit's last bullet becomes: "Every prepared task has an accepted receipt whose executor equals the executor `stage.json` recorded for it."
- **g3:**
  - 7.8 "Across executors": bindings resolve per task at every stage prepare (and every `advance`) and are recorded in `stage.json`. A running task finishes on its executor. Prepared but unstarted tasks are re-prepared under the new binding. Partial Codex task folders are archived as `abandoned-codex-<n>/`, as today.
  - 7.11: the record stage and every hold write `build/HANDOVER-CODEX.md` with `tim backlog handover --executor codex --md --out`, included in the state commit, so Sam can start Codex with no Claude session. The skill prints the regeneration command once per run. New stop `claude-unavailable`: two or more Claude tasks in one stage die with no receipt while Codex tasks in the run succeed. It does not count toward `systemicHaltAfter`.
  - 8.9 rows: "Finish this one on Codex" → `run bind <p> --ids <current> --preset codex` (applies from the next stage); "Back to Claude after this one" → `--from after-current`; "I'm out of Claude" → `handover --executor codex --md`.
- **g4:** inc-023 criterion: "a binding written mid-increment applies from the next stage, with no backlog change".

### C-004 Codex gets the same three correction rounds as Claude

- **Sources:** CX-1 (blocker), codex-parity-02.
- **Decision:** ACCEPT, merged. Confirmed at DESIGN:909, :1932, :1939. The semantic checks cannot be expressed in `--output-schema`, so today a rejected Codex draft is never fixed.
- **g2:** 4.5 accept step 7: on rejection, accept moves the draft to `rejected-<n>.json`, writes `input/extras/accept-problems-<n>.json` and marks the task `needs-correction` in `runner.json`. Both executors get at most three corrections. The receipt records `attemptsToAccept` for both.
- **g3:** 8.2: `run-stage.sh` calls `tim backlog stage accept <taskDir> --json` after each draft, and treats `needs-correction` as unfinished: it resumes the task's own session with "tim rejected your output: <problems verbatim>. Correct it and write your final result." A task with no output gets one fresh start. The watcher loops run-stage then accept. 8.10 shows `attemptsToAccept` per role (C-018).
- **g4:** inc-015 criterion: the self-test covers a draft valid under the schema but failing a semantic check, then a corrected resume that is accepted.

### C-005 Per-task accept touches only its task folder

- **Sources:** FE-5.
- **Decision:** ACCEPT. Up to 16 concurrent accepts writing shared state under a lock that exits 4 is a real failure path, and "correct the draft" is the wrong response to a lock.
- **g2:** 4.3 and 4.5: per-task `stage accept` writes only `output.json` and `receipt.json` in the task folder. All shared-state side effects (`state.plan`, plan file, counts, atom moves) move to `stage accept --stage <dir> --finalise`, called once after the fan-out (by `advance` in-process, per C-002). Exit 4 means "rerun unchanged".
- **g3:** 8.2 Claude adapter text: "If it exits 4, run the same command again unchanged."

### C-006 Every checking output says whether it finished

- **Sources:** codex-parity-03, r8-merit-09 (the `completed` part).
- **Decision:** ACCEPT, merged. A partial review looks identical to a thorough one today, on either executor.
- **g2:** 4.5 audit requires `completed: true` on every review-style, review-code, consistency, verify, fix-verify and acceptance receipt.
- **g3:**
  - 8.1: add `completed: boolean` and `notReached: string[]` to those six schemas.
  - A `completed: false` output gets a partial receipt: one resume for Codex, or one follow-on task for Claude naming `notReached`. A second partial output holds `review-failed`.
  - 8.3: both profiles say "Always report, even if you did not finish, and list what you did not reach."
  - 7.9 table gains the row "A reviewer runs out mid-review | Reads as complete | `completed` and `notReached`".

### C-007 Stage briefs are written fresh, with executor text sorted into the profiles

- **Sources:** r8-merit-09 (the brief part), CX-3.
- **Decision:** ACCEPT, except the timing of deleting `codex/*.md` (see C-072). `git mv` lineage decided content: the neutral briefs would carry Codex-only rules (browser suites are not yours, no sandbox bypass), so parity would come from making Claude worse, or Codex would lose them.
- **g1:** 2.2: `.claude/workflows/stages/*.md` are written fresh from the 8.1 contract; none is a moved Codex brief.
- **g2:** 4.6 contract test gains item: a neutral brief that mentions sandbox, Codex, Claude, GUARD RAILS or the Write tool fails.
- **g3:** 8.3: before inc-014, every sentence of `codex/implement.md`, `fix.md` and `review.md` is sorted into neutral (stage brief), Codex-only (`executors/codex.md`) or Claude-only (`executors/claude.md`). The sort table is recorded in the inc-014 plan. The Codex profile gains "Browser suites and Docker are run by the workflow's watchers, not by you" (codex/implement.md:123-132), and the Claude profile gains the same sentence so the comparison is symmetric (C-017).
- **g4:** 10 retire table: the three `codex/*.md` briefs are not moved; they stay for the legacy loop and are deleted in inc-040 with it. inc-014 criterion names the sort table and the contract test.

### C-008 Plan invariants are recorded facts or acceptance judgements

- **Sources:** r8-merit-12, codex-parity-04 (the command-fact part).
- **Decision:** ACCEPT r8-merit-12 plus codex-parity-04's "invariant results are tool facts, never a read-only model's run". Reject codex-parity-04's stage 12b and consistency `invariantVerdicts` (C-071). Principle 8: a mechanical invariant checked by an LLM is a claim. Under Codex `-s read-only`, checks that write (coverage, `target/`) fail falsely.
- **g2:** 4.5 audit: every plan invariant has a rung `.exit` (command kind) or an acceptance verdict (judgement kind).
- **g3:**
  - 7.5 plan schema: `invariants[{id, kind: command | judgement, repoKey, rung, why}]`. A command invariant names an npm script or a committed script runnable by `run-rung.sh`; accept refuses one that is not. It joins `ladderExtras`, so it runs at stage 11 (implement check) and stage 18 (ladder).
  - A judgement invariant is assessed by the acceptance task from the header invariants in `brief.json` (acceptance still never reads the plan, C-021).
  - 8.1 consistency schema drops `invariantChecks`; 8.5's granularity bullet drops "and runs the plan's invariant checks".
  - 7.5 plan audit refuses an invariant with neither a runnable rung nor the judgement kind.

### C-009 A pipeline-owned Codex home, recorded configuration, and a full self-test

- **Sources:** CX-7, codex-parity-09, CX-15.
- **Decision:** ACCEPT, merged. Every `codex exec` inherits `~/.codex` (model, notify, unreachable MCP servers, plugins, memories, skills, hooks), so parity is skewed by hidden context and the run cannot detect a configuration change.
- **g1:** 0.4 "What agents receive at start": Codex receives only what the pipeline-owned `CODEX_HOME` carries, and nothing from `~/.codex`.
- **g2:** 4.6: `tools/codex/home/` holds a committed `config.toml` with no MCP servers, plugins, notify, memories or skills and an explicit model; `hooks.json` (C-010); `auth.json` symlinked at run time by `run-stage.sh`.
- **g3:**
  - 8.2: `run-stage.sh` sets `CODEX_HOME` to it. `--self-test` checks both `exec --help` and `exec resume --help` for every flag used. `--check` prints the effective configuration and runs one real no-op resume.
  - `runner.json` and every receipt record `codexVersion`, `model`, `effort` and a config hash. `compare` fails a measure on mismatch.
  - 8.3: correct "No rules load by themselves" to "Nothing loads by itself: the pipeline's Codex home carries no rules, memory or skills."
  - 8.4: "the Codex model is the CLI's configured default" becomes "the model named in the pipeline's `config.toml`, or `codex.model` in `run.json`".
- **g4:** 12.2 item 4 (live canary) asserts: effort and model read back from the `--json` header event; a resumed read-only session refuses a write; `-o` is written under read-only; the `--json` session id matches. 12.1 risk row for Codex config drift updated.

### C-010 Codex writes are fenced, and per-call guards are probed

- **Sources:** FE-8, codex-parity-05.
- **Decision:** ACCEPT, merged. `workspace-write` over the whole workspace lets a Codex task edit `.claude/settings*.json` or hooks, weakening every later Claude agent.
- **g2:** 4.5 accept and manifest refuse, as a hold `stage-failed`, any task change under `backlog*.json`, `decisions.json`, `build/**` outside the task folder, `.claude/**`, `docker/stack/.staged/**` or any `.git/hooks/**`. This applies to both executors.
- **g3:**
  - 8.2 write-mode table: implement, fix and repair tasks run with `-C <first planned repo>` and `--add-dir` for every other planned repo (the workspace root only when the workspace repo is itself in the plan). The self-test checks `--add-dir` exists.
  - 8.3: restore codex.md's prohibition list verbatim into `executors/codex.md`: no secret reads, no credential writes, no edits to the backlog, decisions, `build/`, `.claude/settings` or hooks, `docker/stack/.staged`, no `sonar`, no global installs, no CDP platform repos.
  - `tools/codex/home/hooks.json` runs `tools/codex/guard.sh` on PreToolUse, adapting Codex hook input to `guard-bash.sh`, `guard-edits.sh` and the secrets-read check.
  - 8.7 row 2 states which of these holds. If the inc-015 probe fails, 8.7 says plainly "Codex has no per-call guard; it is fenced by writable roots, the profile's prohibitions and accept's refusals".
- **g4:** inc-015 criterion: probe the Codex hook input shape, deny handling in `exec` and hook trust; the fixture proves a denied command is refused.

### C-011 The reading audit is deterministic and enforced at accept

- **Sources:** FE-9, CX-10, codex-parity-07, CX-13.
- **Decision:** ACCEPT, merged. The exact bar "no unread must file" cannot be computed without a task-to-transcript mapping, a structured Codex log and a coverage rule. Detecting it only after the increment wastes the check.
- **g2:** 4.2 `audit-reading`: a file counts as read only when reads cover its full line range, singly or cumulatively; the same rule applies to Claude `Read` offset and limit and to Codex command output. Fixture tests cover sed ranges, cat, `rg -l` and a loop. 4.5 accept returns missing must-files as problems inside the three correction rounds (C-004), for both executors. The stage audit requires a clean reading record on every review, implement and fix receipt.
- **g3:**
  - 8.2: `codex exec --json` writes `events.jsonl`; the session id comes from the `thread.started` event, not a log grep.
  - Claude: a committed PostToolUse `Read` hook appends `{session_id, transcript_path, file_path, offset, limit}` to `build/reads/<session_id>.jsonl`. The adapter's first instruction is "Read <taskDir>/prompt.md", which ties the session to the task. If inc-019's fixture shows `session_id` is shared across workflow agents, fall back to transcript mapping at record time from the transcript directory the Workflow result names, with hold `record-failed` on failure.
  - 8.6: the memory index is a "must" file for every writing and reviewing task, for both executors.
  - 7.7 `readingAudit` meaning becomes "enforced at accept; summarised after each run".
- **g4:** inc-019 criterion: a two-agent fixture proves the mapping. `decisions-for-sam.md` "Owed to you" gains the `settings.json` Read hook edit (guard-edits blocks agents from making it).

### C-012 Receipts cannot be hand-written

- **Sources:** codex-parity-10.
- **Decision:** ACCEPT. The done gate cannot tell a hand-written receipt from tim's today.
- **g2:** 4.5: receipts carry `acceptMac`, an HMAC over task id and `outputSha256`, keyed by the gitignored `build/.accept-key` that run start creates. The stage audit verifies it and verifies `outputSha256` against `output.json`.
- **g3:** 8.2 Claude adapter and profile: "Never write output.json or receipt.json yourself."
- **g4:** "Owed to you": add `build/runs/**/receipt.json`, `output.json` and `build/.accept-key` to guard-edits and the secrets-read check.

### C-013 Codex scheduling that grows with the task count

- **Sources:** CX-5.
- **Decision:** ACCEPT. A fixed 12-call limit cannot cover 61 review tasks, and a late-starting task loses slices it never used.
- **g3:** 8.2 watcher text: loop while `runner.json` shows progress; stop after two calls in a row with none, with named stop `codex-stalled`. Slices count by each task's own wall-clock time. No new task starts in the last 60 seconds of a call. Each failed task gets one fresh start. 7.7: `codexParallel` becomes `{readOnly: 8, write: 2}` by default.

### C-014 One runner per stage folder

- **Sources:** CX-6.
- **Decision:** ACCEPT. Two Codex sessions editing one tree is a correctness failure.
- **g2:** 4.6 `run-stage.sh` self-test covers a live lock and a stale lock.
- **g3:** 8.2: `run-stage.sh` takes `mkdir <stageDir>/.run.lock` holding `{pid, startedAt}`. A live lock exits 3 ("already running"); a stale lock is broken with a note in `runner.json`. Each task's child pid is recorded; a task whose pid is alive is not restarted.

### C-015 The whole process tree stops at the slice deadline

- **Sources:** CX-14.
- **Decision:** ACCEPT. Surviving grandchildren hold ports and `target/` locks.
- **g3:** 8.2 "stops every child it started, by process group" becomes "stops the whole descendant tree, walking `pgrep -P` recursively". The fake-codex self-test spawns a grandchild in a new process group.

### C-016 zod and the Codex-strict export accept the same drafts

- **Sources:** CX-11.
- **Decision:** ACCEPT. If zod uses `.optional()` where the export demands null, every Codex draft fails while Claude's pass.
- **g2:** 4.5 `stage schemas`: a contract test per stage schema asserts a document valid under the export with every nullable field null passes zod, and the reverse after normalisation. Stage schemas use `.nullish()`, never `.optional()`. `.refine` is allowed only when the refinement is also stated in the neutral stage brief; a test lists them.
- **g3:** 8.1 notes the rule.

### C-017 Watchers run the checks writers cannot, for both executors

- **Sources:** CX-2.
- **Decision:** ACCEPT. Codex writers cannot start Chromium or reach Docker, so they hand unproven specs to the ladder, where one repair budget covers everything; the parity comparison would measure repair budget, not quality.
- **g3:**
  - 7.4 stage 11, Implement check: a watcher runs the browser and Docker rungs for the changed repos, and the command invariants (C-008), through `run-rung.sh`. On red it resumes the same implement task with the log and `error-context.md` (Codex `exec resume`, or a Claude follow-on task), with the same number of rounds (2) for both executors.
  - The same watcher re-run follows every fix, ladder-repair and e2e-repair attempt.
  - 8.3 and 8.4: both profiles say watchers run browser and Docker rungs, so neither executor runs them itself.

### C-018 The parity proof measures Claude usage and uses a measured bar

- **Sources:** codex-parity-11, QR-10.
- **Decision:** ACCEPT, merged. Take QR-10's option D as the default, not its alternative of a blocking question with no default (the measured bar serves R6 better than making Sam pick a number). Fixed 90/80 thresholds cannot tell "as good" from "worse" without knowing how far two Claude runs differ, and the proof never measures the Claude usage R6 exists to save.
- **g3:** 8.10:
  - New measures: task counts per role; Claude agent count by tier in the Codex run; `attemptsToAccept` per role; `completed` rate and `notReached` size; verifier confirm rate and fix applied rate; recorded Codex version, model, effort and config hash (C-009); standards shas (C-037).
  - A second Claude build of the three canaries gives the Claude-to-Claude spread on findings and judge rulings.
  - Exact bar adds: equal task counts per role; no Sonnet or Opus agent in the `codex`-preset run; every review receipt `completed`; no confirmed critical or major finding in either final diff under cross-examination.
  - Relative bar (option D): Codex's fix-now recall and judge agreement fall within the Claude-to-Claude spread; 90% and 80% remain as floors.
  - Each failed measure becomes a discovered hygiene increment against the named profile, brief or stage through `tim backlog discover`.
- **g4:** `q-parity-bar` gains option D (sources: sam-req R6), recommended and default; option A stays as an option. 9.2 S4 and `decisions-for-sam.md` updated. inc-028 criteria name option D and the second Claude build.

### C-019 The end-to-end run is sharded watcher commands; long rungs have a route out

- **Sources:** codex-parity-08, FE-13.
- **Decision:** ACCEPT, merged. A Sonnet agent running the suite exercises no judgement, and its result is a model's report (principle 8). A rung over 570 seconds today holds an increment forever.
- **g2:** 4.6 `run-rung.sh`: a timeout records `could-not-run:timeout`, and `advance` turns it into hold `environment` naming the rung, with a release command. A repo's ladder entry (moved to the registry by C-058) may declare `shards` for a long rung.
- **g3:**
  - 7.4 stage 20: `act` steps for a Haiku watcher, each one foreground call: `tim docker dev` (with the include list, C-020); `run-rung.sh <tests> . npm test:docker-compose -- --shard=i/n` per shard, `n` sized from the last recorded suite duration so each shard ends under 540 seconds (the standard script, never raw npx); one retry of failed shards; `tim docker down`, always last. The proof is the merged shard `.exit` files, logs and JSON reporter output. e2e-repair stays a bindable model task.
  - 8.8: the `codex` preset spawns no Sonnet or Opus agent.
- **g4:** inc-021 criterion: measure the backend `mvn verify` time and the tests-repo suite time, and record the shard sizing.

### C-020 The integration proof is a record of what ran, on what, proving which criteria

- **Sources:** r7-slices-10, RC-2 (per-test results).
- **Decision:** ACCEPT. A green run of existing specs proves nothing about the new behaviour; `tim docker dev` builds untouched mid-spike checkouts; `-b` silently falls back to `:latest`.
- **g2:** 4.5 audit requires: every touched repo's service built from its head for the attempt, or an image resolved to its branch tag and never a `:latest` fallback; every untouched service from `:latest` or a clean checkout of its base; every `e2e` or `contract` member criterion mapped by acceptance (C-021) to a passed spec in the record; at least one new or changed spec, unless the plan's evidence check names an existing spec that already proves the criterion.
- **g3:** 7.4 stage 20 writes `state.integrationProof`: `{mode, stack[{service, repoKey, source: local | image, ref}], specs[{path, title, result}], newOrChanged[path], run, at}`, with specs from the runner's JSON reporter. 7.9 row "The integration proof is skipped" names the record.
- **g4:** inc-021 gains an atom: the workspace stack wrapper takes an include list, so only the touched repos are built from source (`scripts/stack/run-stack.sh`), with an e2e criterion on a fixture.

### C-021 Prove, then accept, then land; acceptance never sees the plan; repairs are reviewed

- **Sources:** r7-slices-15, RC-2 (blocker).
- **Decision:** ACCEPT, merged. Confirmed: acceptance runs before the proof (:1598, :1602, :1609), plans are read by "every later stage" (3.1), and the only criterion-to-test link is the plan's `acceptanceMap`. A slice that fails its proof is already pushed today, and a repair touching a seam reaches done unreviewed.
- **g1:**
  - 3.1: `build/plans/<id>.md` is read by the stages C-022 lists, never by acceptance.
  - Principle 10 adds: "The acceptance checker never receives the plan."
- **g3:**
  - 7.4 order as in the canonical table: ladder (18), secrets (19), integration proof (20), acceptance (21), then land, PR, CI, merge. `needs-e2e` is removed from the acceptance schema. The CI-sourced proof (C-035) moves stages 20 and 21 after CI.
  - Acceptance inputs: `brief.json`, the manifest diffs, the ladder and proof logs, and per-test results. `stage prepare` never copies the plan or plan output into an acceptance task, and the audit checks that.
  - For each `e2e` or `contract` criterion, acceptance names a passing test it has read and judged to exercise the criterion, without using `acceptanceMap`. With no such test the criterion is `not-met`.
  - Repair review: every repair diff (ladder-repair, e2e-repair, ci-fix) gets style and code review per changed file, plus the consistency task again when the diff touches a plan seam or more than one repo, with findings through verify and judge. Stage 17 re-runs consistency after any fix touching a seam file. The audit requires a repair-review receipt for every repair diff.
  - 8.1: acceptance schema `result: met | not-met`, plus `test{path, title}` per e2e criterion.
- **g4:** req-067 criterion ac-1 rewritten so it can fail for e2e criteria: "given a change whose suite is green but no test exercises criterion X, acceptance records X not-met".

### C-022 Each stage receives exactly the inputs its persona needs

- **Sources:** RC-3, r7-slices-02 (item 4).
- **Decision:** ACCEPT, merged. The live personas read `ticket.md` for AC and intent, and the seam has no mapping for it. The judge cannot tell a deliberate deferral from a fix-now without the plan's out-of-scope list.
- **g3:**
  - 8.1: a per-stage input matrix, enforced by `stage prepare` and checked by the audit. plan-audit, review-style, review-code, consistency, verify, judge and fix get `brief.json` and `input/upstream/plan.md`; acceptance gets the brief only (C-021).
  - Every per-file review task also gets `input/slice.json`: the plan's seams (C-023) and every changed file in every repo. The review-file brief says: read the counterpart before ruling on a seam file.
  - 8.5 seam table row: "`ticket.md` (AC and intent) → `input/brief.json` (acceptance, decisions, invariants) plus `input/upstream/plan.md` (approach, decisions, out of scope)".

### C-023 The consistency reviewer checks the contract between repos

- **Sources:** r7-slices-02 (blocker).
- **Decision:** ACCEPT. Confirmed: the live persona checks peer patterns only. R2 forbids putting a contract method in a brief, so it goes into the persona itself, where people running the review skill gain it too.
- **g2:** 4.5 audit requires a seam verdict other than `not-checked` for every plan seam.
- **g3:**
  - 8.5: add a method section "Contract between repos" to `.claude/skills/review/references/CONSISTENCY_REVIEWER.md`. The reviewer enumerates every seam in the diffs (HTTP routes and methods with request and response fields, types, optionality, enums, status and error codes; messages and events; persisted documents another service reads; reference-data lookups; the tests repo's page objects, fixtures and API clients against the DOM and API), checks that provider and consumer agree, and cites both sides as `repo:path:line`.
  - 7.5 plan schema: `seams[{id, kind, provider{repoKey, what}, consumer{repoKey, what}, change}]`. The plan audit refuses a plan touching two or more product repos with no seam.
  - 8.1 consistency schema: `seams[{seamId, verdict: agrees | disagrees | not-checked, providerRef, consumerRef}]`.
- **g4:** req-063 criterion: "when a backend field is renamed and the frontend still sends the old name, the consistency result names the mismatch with both sides". Lands with inc-019, on the multi-repo fixture (C-036).

### C-024 Cross-repo findings go through verify, judge and fix

- **Sources:** r7-slices-03.
- **Decision:** ACCEPT. Today `contractFindings[]` never reach a verifier, the judge or a fixer, so R7's most valuable findings can drop without trace.
- **g2:** 4.5 audit requires a ruling for every verified consistency finding.
- **g3:** 8.1: consistency findings take the review finding shape `{id, severity, claim, failureScenario, fix, confidence, refs[repo:path:line]}`. 7.4 stage 14 adds one verify-consistency task when the consistency output has findings (default refuted). The judge rules on them; fixes go to `REVIEW_ITEM_FIXER`, whose files may span repos; fix-verify confirms them.

### C-025 P11 catches real layer splits

- **Sources:** r7-slices-01 (blocker).
- **Decision:** ACCEPT. Confirmed (DESIGN:601-602): with the tests repo forced onto every product row, no two product rows have disjoint repo sets, so the layer-chain check never fires.
- **g1:** 3.12 P11 table, "Layer chain" row rewritten:
  1. Each row's product repo set = `surface.repos` filtered to role `product`. Refuse any `dependsOn` edge (on atoms, and on lifted increment edges) between two rows whose product repo sets are both non-empty and disjoint, whatever their areas.
  2. Refuse any dependency path of two or more edges that steps from provider to consumer (using `consumes`, C-026) or ends in a tests-only row.
  3. For every other cross-repo edge, an `edgeCheck {observableWithout, why}` record is required: "can the dependant's acceptance be observed at its boundary before the dependency lands?". `check --strict` refuses an edge with no record, and one whose dependency is provider-only, cannot be observed by its own actor, and has `observableWithout: false`.
  4. The exception stays: a decision that names the edge.
  5. Increment class `test` only for rows whose members are all `hygiene`.
- **g2:** 4.2 `check` implements it. 5.4: `REQUIREMENT_VERIFIER` writes `edgeCheck` on atoms; 5.7: `COMBINE_VERIFIER` writes it on increments.
- **g4:** req-115's acceptance rewritten around a backend-and-tests increment and a frontend-and-tests increment for the same behaviour (refused), plus a chain criterion. inc-011 criteria follow. 12.1 risk row "P11 passes a layer split" updated.

### C-026 Repos declare what they consume; merge order and the merge plan derive from it

- **Sources:** r7-slices-05, r7-slices-16.
- **Decision:** ACCEPT, merged. No role distinguishes provider from consumer, so "providers first" cannot be derived as written, and the chain check needs the same fact.
- **g1:** 3.3 repo entry gains `consumes[repoKey]`: the repos it calls at run time (for example `plantsFrontend` consumes `plantsBackend` and `referenceData`; `tests` consumes every product repo). Classed meta: it describes the system and never assigns work. `check` refuses a cycle in `consumes`.
- **g2:** 4.2 adds `tim backlog report --merge-plan`. 5.3 and the interviewer fill `consumes` from the `docker/stack` service dependencies, then confirm it with the person. 6.2 section 1(b) lists, when every increment is done, the PRs in merge order with the rule "all green, then merge in this order, no partial merge".
- **g3:** 7.6: merge order is the topological order of `consumes`, providers first; the tests repo keeps its rank before the frontends unless `delivery.merge.order` overrides. 7.11 handover carries the merge plan.

### C-027 Combining is justified by behaviour, never by repos or components

- **Sources:** r7-slices-04, RC-10.
- **Decision:** ACCEPT, merged. Under R7 nearly every product atom touches the same repos, so `cr-same-repo-set` is either no signal or a licence to combine unrelated behaviour. The programme's own combinations cite implementation components (inc-006 "same lock", inc-014 "one task-folder contract", inc-021 "inputs to the done gate").
- **g1:** 3.13 example 2 re-justified by `cr-same-surface` or `cr-same-acceptance-boundary`.
- **g2:**
  - 5.7: remove `cr-same-repo-set` from the default rules. `COMBINER` reads only atoms, ledgers and `candidates --combine` output (never `build/plans`, DESIGN or code). `combination.why` must cite candidate signal ids.
  - `COMBINE_VERIFIER` fails a group whose only shared signal is its repos, a group justified by a shared implementation component, and a `declined[]` entry whose reason is a repo or layer difference.
  - 4.2: remove the repo-set signal from `candidates --combine` and `duplicates`; `check --strict` refuses a combination rule keyed on repos; the recipe lint covers `combination.why` (C-056).
- **g4:** `backlog.json` `combination.rules` drops `cr-same-repo-set`. Re-combine the programme under the new rules, re-justifying inc-001, inc-006, inc-022 and inc-040 and re-examining inc-014, inc-015, inc-017 and inc-021 (attributability). 11.3 and 11.4 follow the result.

### C-028 Slices are areas of behaviour, never repos or layers

- **Sources:** r7-slices-06.
- **Decision:** ACCEPT. Nothing stops a slice being "the backend", and every atom authored in it is then a layer atom.
- **g2:**
  - 5.9 `SLICER` rule: a slice is an area of behaviour someone observes (a journey section, a page group, a capability, an exchange with an outside system), never a repo, layer, technology or source. Units from code sources with roles constraint, consistency-anchor and current-behaviour go to the behaviour slice they inform.
  - Slice schema (8.1 distil list, and 5.2) gains `behaviour`: one sentence naming the observer and the outcome.
  - 4.2 `slices --strict` flags a slice whose units all come from one code repo, or whose id or brief names a repo key or a layer word; a flagged slice fails unless its record carries a written reason.
  - 5.3: the contract phase shows the slice list with each behaviour sentence.
- **g3:** 8.1 slice output `{slices[{id, behaviour, units[], brief, crossCutting}]}`.

### C-029 Every atom kind is defined by who observes it

- **Sources:** r7-slices-07.
- **Decision:** ACCEPT. "The backend stores X" is a provider layer disguised as a `data` atom.
- **g1:** 3.4 kind enum: `data` is a persisted or published shape that a system outside the programme, or an operator, observes at a boundary; `reference-data` is values a user sees or a rule applies, observed through that behaviour; `integration` is an exchange with a system outside the programme's repos.
- **g2:** 5.3 contract template "What is not a requirement" gains: "a store, collection, endpoint or list that only this programme's own frontend reads". 5.4: `REQUIREMENT_VERIFIER` merges an atom whose only observer is another atom of the same programme into the behaviour that observes it. 5.9 profile text follows.

### C-030 Repos the distiller missed are measured

- **Sources:** r7-slices-08.
- **Decision:** ACCEPT. Nothing checks whether a repo was left out, so distiller slice quality is never measured.
- **g1:** 3.4: the author's brief includes the header repos with role and `consumes`.
- **g2:** 5.4 verifier question: "which repo would a person have to change for each criterion to be observed?". 6.2 section 12 shows "repos the distiller missed" per increment; section 6 shows the total.
- **g3:** 7.5: the plan's additions persist as `state.plan.reposAdded[{repoKey, why}]` (C-031).

### C-031 A repo the plan adds is set up, recorded and held to branch parity

- **Sources:** r7-slices-09, RC-12.
- **Decision:** ACCEPT, merged. Take r7-slices-09's in-place set-up (no restart: the existing repos' stages are unaffected) and RC-12's rule that the requirement's surface is corrected in the backlog (the surface is requirement context used by P11 and merge order, R5). The plan's file list never writes the backlog.
- **g1:** 3.4 `surface.repos` may be amended by a recorded surface-change write naming the increment, attempt and reason.
- **g2:** 4.5 audit: every repo in the manifest has the same `state.branches` name, equal to the delivery or increment branch, plus a baseline record and ladder results. 4.2: `tim backlog rule --subject surface:<atom> --add-repo <key> --why <text> --by build` writes the amendment.
- **g3:**
  - 7.4 stage 9: after the plan audit approves, when `plan.repos` holds a repo not in `state.branches`, `advance` writes the surface amendment on the member atom, records `state.plan.reposAdded`, and runs stages 3 to 6 for the added repos before implement.
  - When the manifest shows a changed repo not in the plan, hold `stage-failed` naming it.
  - 7.5: "A repo the plan adds to the surface is allowed" becomes a reference to this flow.
- **g4:** req-117 criterion: "a repo the plan adds is branched, baselined and laddered before implement runs, and its atom's surface names it".

### C-032 A hygiene fix in one product repo proves regression instead of integration

- **Sources:** r7-slices-11.
- **Decision:** ACCEPT. A baseline-red hygiene increment in the backend is refused by P11 today, so the held increment waits forever.
- **g1:** 3.12 "No integration proof" exception: a `hygiene` increment in a product repo needs a regression proof (the rung that was red is green and, when the stack serves the repo, the existing end-to-end suite is green on the slice's stack). It does not need the tests repo; it is the only single-repo product increment P11 allows.
- **g2:** 5.4: the verifier refuses a hygiene atom whose statement adds behaviour.
- **g3:** 7.4 stage 6 writes the discovered hygiene item with that regression criterion.

### C-033 Tooling programmes' integration proof is enforced, not just stated

- **Sources:** r7-slices-13.
- **Decision:** ACCEPT. 3.12:605 states the rule but P11 fires only for product repos; inc-013's only criterion is review-witnessed.
- **g1:** 3.12 "No integration proof" extended: a `feat` or `fix` increment whose repos are all workspace or tooling needs at least one member criterion witnessed `e2e` that runs the tool's real entry point (CLI, workflow or skill) against a fixture programme. `docs`, `chore` and `hygiene` are exempt.
- **g2:** 4.5 audit records that run's exit code and output as the integration proof.

### C-034 Migration re-slices legacy layer rows into vertical atoms

- **Sources:** r7-slices-12, RC-13.
- **Decision:** ACCEPT, merged. Combining only joins atoms, so frontend, backend and tests rows never become one vertical statement; `carriedFrom` cannot hold several rows; and "plan notes" (req-085) is an undefined destination that would become a stale recipe.
- **g1:** 3.4 `carriedFrom: string[]`.
- **g2:**
  - 5.2: new distil phase `reslice` (think tier), after migrate. `RESLICER` persona (5.9) is cut from `COMBINER`. It authors one vertical atom per behaviour, `carriedFrom` naming every legacy row; a different task verifies it; the layer atoms become `superseded` by it.
  - `migrate` writes unbuilt legacy rows as proposed legacy atoms plus `distil/reslice.json` (candidate behaviour groups from shared areas and titles, dependency edges across different repo tags, tests-for relations).
  - Legacy recipe fields go to an existing-backlog source (`distil/sources/<legacy-id>/units.json`, role current-behaviour). They can be cited and never enter `brief.json` or `standards.json`.
  - Built rows stay done as history. Where part of a behaviour is built, the vertical atom cites that code as current-behaviour evidence and covers the whole behaviour; the plan's evidence check records the built part as met.
  - P11 at ingest refuses any migrated row still layer-split.
- **g4:** 10 migrate row rewritten. req-085 reworded ("legacy recipe fields become a current-behaviour source, never plan input"). req-120 criterion: "one frontend row, one backend row and one tests row for a behaviour become one adopted vertical atom whose `carriedFrom` lists all three, and no layer row stays buildable". inc-026 follows.

### C-035 Proof sources live in run state; owed proofs block dependants

- **Sources:** r7-slices-17, CX-8 (partial), CX-9.
- **Decision:** ACCEPT r7-slices-17 and CX-9; accept CX-8's full-access orchestrator and browser-rung parts (in C-002 and here); reject CX-8's "landed satisfies `dependsOn`" (C-073). Where the proof comes from is an executor and run choice, so it cannot live in `delivery` (R5). One stack run over N slices cannot say which broke.
- **g1:** 3.9: a `proof-owed` increment is not done, so its dependants are not buildable; independent increments continue. 3.14 `delivery` holds branches, PRs and merges only; `crossRepoE2e` leaves the backlog.
- **g3:**
  - 7.7 `quality.integrationProofSource: local | ci | either` (default `local`), plus the CI workflow reference that `crossRepoE2e` held.
  - 8.11: a full-access Codex orchestrator can reach Docker, so it runs the integration proof and browser rungs itself through the same committed commands and records them; nothing is owed. When it cannot, the increment holds `proof-owed` (browser rungs included). The next Claude session proves each owed increment separately, in build order, on a stack built at that increment's heads, with its own record (C-020).
- **g4:** `decisions-for-sam.md` item 14 rewritten: the choice is a run knob (`run set quality.integrationProofSource ci`), not a backlog ruling. req-024 acceptance extended: switching into Codex-orchestrated mode leaves the backlog hash unchanged. `delivery.crossRepoE2e` removed from `backlog.json`.

### C-036 The programme's own build backlog is vertical too

- **Sources:** r7-slices-14, r8-merit-05 (inc-029 part), r8-merit-02 (inc-017 part).
- **Decision:** ACCEPT. The distiller is built one pipeline layer per increment with the first end-to-end run at inc-038, the R7 anti-pattern applied to tooling.
- **g4:**
  - inc-029 becomes a walking skeleton, "One markdown source distils end to end into a backlog and a report": NEW mode and `backlog-distil.js`, driven by `advance --distil`, run heads, characterise, author, verify, ingest, solo increments and report on a one-source fixture; only model phases spawn agents.
  - inc-030 to inc-037 each widen that skeleton, each with an e2e criterion that runs `backlog-distil.js` on a fixture and shows the new behaviour in the rendered backlog or report. Reword req-086, req-093 and req-104 accordingly.
  - Merge req-044 (persona seam) into inc-019 and drop declined pair 4.
  - At inc-017, add a multi-repo fixture programme (a provider, a consumer and a tests repo as small local git repos with a real contract test). Point req-063 and req-117 to req-119 at it. 12.2 adds "R7 on the fixture" between steps 5 and 6.
  - List the canaries' product repos in the surfaces of inc-027 and inc-028.
  - inc-038's canary reports how many distilled increments are vertical, against the digest's 47 frontend-only and 10 tests-only rows, and maps each digest row to the vertical increment that absorbs it.
  - Rewrite 11.1 to 11.5 and `backlog.json` `increments[]`, `dependsOn` and milestones to match, together with C-027's re-combine and C-053's re-ordering.

### C-037 Review routing is data each skill owns; one standards resolver

- **Sources:** r8-merit-04, CX-4, CX-12.
- **Decision:** ACCEPT, merged. The bash composer was chosen for "no change to either skill's tooling" (least change). In use it costs three watcher stages per increment, splits routing across untested bash and tim, records no content hashes (so parity cannot prove both executors read the same standards), and gives Codex writers rules only for planned files. R2 holds: each skill owns its routing, read live by path.
- **g1:** 2.1 diagram and 2.2 parts: remove `skill-routing.sh` and the three routing stages; add `tim backlog standards`.
- **g2:**
  - Move the path-to-topic map (`file-topics.sh:34-58`) and topic-to-files lists (`bake-rules-bundle.sh:37-73`) into `.claude/skills/code-style/assets/routing.json`. Move the `detect-tech.sh` detectors and best-practice lists (`:53-265`) into `.claude/skills/review/assets/routing.json` as data (`fileContains`, `anyFileContains`, `fileExists`).
  - The three bash scripts become thin jq readers of those files, with golden tests: old output equals new output on every fixture path, so a person running either skill sees no change.
  - Rename `tim backlog rules` to `tim backlog standards`: the single resolver over both routing files, rule globs, pointers, the CLAUDE.md chain and the memory index. `stage prepare` calls it in-process and bakes `build/runs/<run>/standards/<repoKey>.<topic>.md` from the live files, with a header listing each source and its blob sha; `standards.json` records the shas.
  - Every writing task's standards are the union of its planned-file routing and repo-level routing for every repo in the surface.
  - 4.6 and 4.8: delete `tools/backlog/skill-routing.sh`.
- **g3:**
  - 7.4: delete old stages 7, 10 and 13. Stage 12 (manifest) records `rulesGap[]`: changed files whose rules were missing from the writing task's list. The audit fails on a non-empty gap for either executor.
  - 8.5 "The skills' own routing, unchanged" rewritten to this. Seam row added: "best-practice source (per-PR bundle, `FILE_REVIEWER.md:71-81`) → the 'must' files in `input/standards.json`, which replace the per-PR bundle".
  - 8.6 renames the command. 8.10: `compare` fails a measure when the two sides' standards shas differ.
- **g4:** 9.3 "Skill routing" row gets the merit reason. inc-012 gains the atom "The review skills' routing is data each skill owns, read live by the skill's own scripts and by the pipeline", with an e2e golden-output criterion.

### C-038 The distiller owns its prose personas

- **Sources:** r8-merit-07.
- **Decision:** ACCEPT. Parity's `COPY_EDITOR.md`, `CLAIM_VERIFIER.md` and `DUPLICATE_SWEEPER.md` are finding-shaped and screen-shaped (`COPY_EDITOR.md:21-67` slots, `CLAIM_VERIFIER.md:17-19` EUDPA-328). The distiller's prose would get no slot rules or budgets, and a parity edit would silently change distillation. Report quality is R1's top priority.
- **g2:**
  - 5.9: add `.claude/skills/requirements-distiller/references/PROSE_EDITOR.md`, `PROSE_CLAIM_VERIFIER.md` and `ATOM_DEDUPER.md`, each cut from the parity method (quote conservation I5, the polarity list I10, "would one person, doing one piece of work, close both"), with a "Method from" line naming the parity file by path.
  - Each defines the distiller's slots and budgets: headline a question of 90 characters or fewer; option text 40 words; consequence 40; ifNobodyAnswers 40; outcome 60; combination why 40.
  - Remove the planned "When the requirements distiller runs this persona" sections and the edit to `CLAIM_VERIFIER.md:17`; parity stays untouched.
  - 5.2 phase 13 and 19 rows name the new personas. 6.6 adds a `tim backlog report --lint` slot-budget check.
- **g4:** inc-037 criteria name the three personas and the budget lint.

### C-039 Visual units carry crop images

- **Sources:** r8-merit-08.
- **Decision:** ACCEPT. Nothing can produce a crop under the deny list, so the promised visual evidence never exists; a decision about something visual must carry the picture. Keeping the dependency list short is not a reason.
- **g1:** 3.6 example keeps `distil/sources/mural/crops/list.png` and adds `{crop, box, sha256}` on the unit.
- **g2:**
  - 4.2: `tim backlog source crop <p> <sourceId> <unitToken> --box x,y,w,h --name <slug> --json`, library-first with `sharp`, writing `distil/sources/<id>/crops/<slug>.png` and recording `{crop, box, sha256}` on the unit. 4.7 adds `sharp`.
  - 5.10: characterise calls it for every visual unit; `QUESTION_EDITOR` attaches crops by unit.
  - 5.6 question lint (P8) fails a question in a visual cluster with no crop. 6.5: a renderer test that every `visual[]` entry resolves to an existing file.
- **g4:** 9.1 Q36 answer: "Crops are produced by `source crop` at characterise and hashed". inc-030 (req-090) criterion: "given an image-board source, when characterised, every visual unit has a crop file whose hash is recorded".

### C-040 Every usual source kind can be acquired, and no linked source vanishes

- **Sources:** FE-7, QR-7, QR-8.
- **Decision:** ACCEPT, merged. Word conversion relies on `unzip` and a sed chain that agents cannot run; spreadsheets and slide decks (the usual loose sources here) have no kind; the plants run lost its requirements workbook as an unfollowed link; prototypes are named but cannot be acquired, and `live` is not a kind.
- **g1:**
  - 3.8 kind enum adds `spreadsheet` (xlsx and csv, cited by sheet, row and column), `slides` (pptx) and `live-service` (a URL plus capture).
  - 3.12 role check: `observed` needs a `prototype`, `trace-corpus` or `live-service` source.
- **g2:**
  - 4.7 adds `fflate`. `tim backlog source acquire` converts docx, xlsx and pptx to `raw/<id>.txt` with paragraph, row, cell and slide markers, tested on fixtures.
  - 5.10 rows for Word, spreadsheet, slides, prototype (a pinned repo plus rendered capture through parity's capture specs; token `<prototype>:<route>/<region>@<sha>`; role requirement; `observed` for rendered behaviour, `stated` for copy) and live-service.
  - 5.9 adds `source-types/spreadsheet.md`, `slides.md`, `prototype.md` and `live-service.md`. The characteriser asks for an export when it meets a SharePoint or OneDrive link.
  - P1 fails while any pointer unit on a requirement-role source is not registered as a source, stated absent with a reason, or raised as a question.
- **g4:** inc-030 criteria: a docx fixture and an xlsx fixture acquire with markers; an unfetched workbook link fails P1 until raised as a question.

### C-041 The distiller is a new skill; journey-builder is frozen, not moved

- **Sources:** r8-merit-10.
- **Decision:** ACCEPT. `git mv` would put journey-builder's frontend-engine vocabulary, targets and frozen-corpus tools inside the distiller agents load.
- **g1:** 0.1: the distiller is "a new skill"; lineage via 5.9's "Cut from" column.
- **g2:** 5.1: `.claude/skills/requirements-distiller/` is a new folder holding only the distiller. `.claude/skills/journey-builder/` stays in place, frozen, with a one-line banner pointing to `requirements-distiller` and `backlog-implementor`.
- **g4:** Q18 reason: "one clean skill; the frozen corpus keeps its own tools". 10 row: journey-builder BUILD mode is retired in inc-040, and the folder is deleted once the EUDPA-409 spec is migrated or ruled history.

### C-042 State the real reason lifecycle stays with Claude watchers; record the Sonar deviation

- **Sources:** r8-merit-11, FE-15.
- **Decision:** ACCEPT, merged. Confirmed: the PostToolUse hook's `if` is `Bash(git push*)` (settings.json:139), and the loop pushes with `git -C <repo> push …`, so the hook never fires; the force-push deny rules do not match `-C` either. Agents commit without `sonar analyze --staged`, breaking CLAUDE.md rule 3 with no recorded deviation.
- **g1:** 0.3 row 3 reason becomes: "the auto-mode classifier, guard-bash and the allowlist see each push, PR and merge as its own call, and tim's rails forbid it running `tools/`". 0.4 "Sonar" adds: the push-record hook does not fire for `git -C` pushes.
- **g2:** 4.6 canonical rails add: "Force-push is refused by the PUSH RULE and the refspec form; the deny list's `git push --force` pattern does not match `git -C`." The COMMIT RULE states that agents commit without `sonar analyze --staged` (it is not runnable by agents) and that SonarCloud results come from PR checks.
- **g3:** 8.7 row 3: "does not fire for the loop's `git -C` pushes; stage 24 reads PR checks instead". 8.11 "No per-call Claude hooks" row corrected the same way.
- **g4:** 9.3 "Lifecycle actions" row gets the merit reason. `backlog.json` adds assumption `as-push-hook-scope` ("the push-record hook matches only `git push…`; the pipeline's own SonarCloud evidence comes from PR checks"), read by inc-022. `decisions-for-sam.md` "Owed to you" lists the deviation from CLAUDE.md rule 3 for Sam to accept or refuse.

### C-043 The writer core is judged on serving requirement backlogs too

- **Sources:** r8-merit-13.
- **Decision:** ACCEPT. Generalising the parity writer stands on merit (proven id-stable, ruling-safe ingest; one core for locks, op ids and lost-update refusal), but inc-004's proof is build safety alone.
- **g2:** 4.1: delete "judged on that alone"; restate the choice with its merit reason.
- **g4:** req-008 adds an e2e criterion: "given a fixture requirements-v2 programme found through the registry, when atoms are ingested twice with one inserted ahead, every existing id is unchanged and every refusal names its field". Parity non-regression stays one criterion among several.

### C-044 A question either must be answered, or has a default that is applied

- **Sources:** QR-1, RC-6.
- **Decision:** ACCEPT, merged. "Blocking with a default" has no meaning, keeps inc-016 and inc-039 blocked for ever, and hides the default's real consequence. Options with identical effects cannot be re-derived or checked.
- **g1:**
  - 3.6 and 3.10: two behaviours only. A must-answer question has `ifNobodyAnswers.option: null` and blocks. Any other question has its default applied by `tim backlog rule --by default`, which writes a decision with status `defaulted` and runs its effects; the report lists it in section 2 with "To reverse", and the question stays in section 1 under "Has a default in force".
  - Every behaviour-changing option supersedes to variant atoms whose acceptance encodes the option.
- **g2:** 5.6 lint: the default's effects must agree with its consequence text (checked by `QUESTION_CRITIC`); a default that differs from `recommended` needs `defaultWhy`; identical effects across options of a question are refused.
- **g4:**
  - `q-house-rules-source`: correct the default effect to match its text, add `defaultWhy` or align default with the recommendation (B), and give B and C distinct variant atoms.
  - `q-dr1u-remainder`: the default's effect and text agree.
  - `q-conversation-retention`: options A and B supersede req-091 by variants whose acceptance encodes retention (for example "the tracked backlog holds no conversational quote").
  - Re-derive inc-016 and inc-039 as dropped, deferred or todo under their defaults; update 11.1 item 5, 9.2 and `decisions-for-sam.md`.

### C-045 Sam's own words are a brief; only third parties' words need a ruling

- **Sources:** QR-2.
- **Decision:** ACCEPT. The gate blocks Sam's main channel, contradicts 5.10, and is bypassed by relabelling (this programme's own brief is registered as `markdown`). Option A (quotes local, paraphrase tracked) protects third parties and still accepts the sources.
- **g1:** 3.8 kind enum adds `brief` (the requester's own instructions: tracked, stated, role requirement). Retention keys on the speaker, not the source kind. `decisions[].words` is exempt as the ruler's own words.
- **g2:** 5.10: other people's utterances stay local whatever the container; a paraphrase goes to git.
- **g4:** 9.2 S5 and Q35: option A in force as the default now; a must-answer question remains only for "may third parties' words enter git?" (option B). `backlog.json`: `sam-req` becomes kind `brief`; `q-conversation-retention` reshaped; inc-031 unblocked. `decisions-for-sam.md` section 1 follows.

### C-046 The answer sheet stands alone, and "tentative" is parsed precisely

- **Sources:** QR-3, QR-14.
- **Decision:** ACCEPT, merged. Ids alone break the design's own rule 6.1(3); any "?" turning a firm answer tentative mis-records Sam's rulings.
- **g2:**
  - 6.4: above each answer line, generated comment lines give the headline, each lettered option in one line with its source count, the recommendation and "If nobody answers". The report lint runs over the sheet too.
  - An answer is tentative only when "?" directly follows the option letter, or a hedge word appears (maybe, probably, not sure, perhaps). The mapping shows "recorded as tentative because: <token>". The sheet's preamble text changes to match.
  - 6.5: renderer tests that every sheet id comes with its headline and every option letter, and that "C. Why would we accept less?" records as firm.

### C-047 Every call Sam may reverse carries a paste-ready command

- **Sources:** QR-4.
- **Decision:** ACCEPT. Section 2 exists so Sam can overturn machine calls, yet each reversal needs an agent to work out the command, and none can be batched.
- **g1:** 3.8: conflicts and combinations gain predeclared `reverseEffects`.
- **g2:**
  - 4.2 `tim backlog rule` accepts `--subject conflict:<id> --choose <side>` and `--subject combination:<key> --split`.
  - 6.2 and 6.3: every section 2 entry shows a generated command and a batch checkbox.
  - 6.4: answer-sheet lines for reversals ("c-004: reverse <words>") and holds ("inc-015: release <words>").
  - 6.5: a renderer test that every section 2 entry carries a command that parses.

### C-048 Defaulted questions keep all four parts

- **Sources:** QR-5.
- **Decision:** ACCEPT. Defaulted questions are the most common class and currently reach Sam without lettered options.
- **g2:** 6.3: each defaulted question renders as a compact card (headline, one line of "In play", lettered options with count and consequence, then "In force: A"). 6.5: a renderer test that every question, whatever its class, shows all four parts.

### C-049 "Not a requirement" dismissals are verified and shown

- **Sources:** QR-6.
- **Decision:** ACCEPT. The author alone decides it, and it is the largest route by which a unit drops silently.
- **g2:** 5.4: the verify task returns a verdict on every dismissal (agree, or dispute with an added atom). 4.2 coverage (P4) fails on any dismissal nobody verified. 6.2 section 6 lists dismissals grouped by reason, each expanding to its units and quotes; section 3 counts dismissals from requirement-role sources.

### C-050 The report's prose is checked as a reader meets it

- **Sources:** QR-13, QR-15.
- **Decision:** ACCEPT, merged. Nothing checks that each section stands alone or that prose is plain; option counts mix a tier-1 requirement source with current-behaviour code.
- **g1:** 3.6: an option's count is by role ("2 requirement sources, 1 current behaviour"), each source with its precedence tier.
- **g2:** 6.6 lint: sentences over 25 words outside quotes; abbreviations used without expansion on first use, with a glossary in the profile. A `COLD_READER` task on each render reads every section on its own and fails any term that section does not define. 6.3 skeleton shows counts by role.

### C-051 This programme's own questions pass the question checks now

- **Sources:** QR-9.
- **Decision:** ACCEPT. They are the only questions Sam sees before inc-025, and they fail P8.
- **g4:** Run a `QUESTION_CRITIC` pass by hand now, as a different agent, and record `lint` on each question. Mark unsourced options "no source". Give `q-dr1u-remainder` a recommendation. Restate its scope as 37 unbuilt increments (34 blocked, 3 deferred) and name the 6 ruled-out rows as staying ruled. `decisions-for-sam.md` follows.

### C-052 The decisions page is a view of the JSON

- **Sources:** QR-11.
- **Decision:** ACCEPT. Three hand-written copies already disagree.
- **g1:** 3.6 `blastRadius` splits into `blocks` (from `needs`) and `restsOnDefault` (from assumptions); both print.
- **g2:** 4.2 `tim backlog report` renders the decisions page from `questions[]` once inc-025 exists.
- **g4:** Until then, `decisions-for-sam.md` is stamped "hand-written bootstrap view of `backlog.json` questions[]", and 9.2 is reduced to a pointer to it. inc-009 gains a criterion: a check that the page's ids, defaults and blocked increments match the JSON.

### C-053 This programme's own requirements are verified, re-sourced and sealed before the build

- **Sources:** RC-1 (blocker), QR-12, FE-10.
- **Decision:** ACCEPT, merged. Confirmed: 92 of 120 atoms cite no requirement-role source, quotes are method ("Base the one writer on tim parity ingest…"), every atom is unverified, and the `sam-req` seal was typed in. inc-010 cannot record a registered run before task folders exist (inc-014).
- **g2:** 4.3 registered-run guard: a bootstrap verification record under `distil/bootstrap-verify/` is accepted as upstream input to inc-010's registered run, never as a verification on its own.
- **g4:**
  - Before inc-001, a different agent walks `sam-requirements.md` sentence by sentence and records the atom citing each sentence or why it was dismissed; a second agent checks every dismissal. Results go under `distil/bootstrap-verify/`.
  - Reseal every `sam-req` citation from `git hash-object`.
  - Replace every method quote with the need it serves. Re-source atoms to `sam-req` (or the new `r8-merit` source) where they rest on it; mark the rest `inferred`, adopted by a named decision whose `appliesTo` lists them.
  - inc-007's acceptance adds: `check --strict` over `design/backlog.json` passes before inc-010.
  - Move inc-010 after inc-014: it runs the verifiers through `stage prepare` and `accept` from an inline main-session Workflow (the main session spawns them; subagents cannot call Workflow). 11.1 item 2 and `as-bootstrap-unverified` updated.

### C-054 Ids survive rulings

- **Sources:** RC-4.
- **Decision:** ACCEPT. Solo keys embed the atom key, which changes when a variant supersedes it; the three blocked rows rulings will hit are all solo.
- **g1:** 3.12: resolve each member through `supersededBy` to its root; solo increments are keyed `solo--<root atom key>`. 3.9 gives a solo whose member is superseded by a variant the status it keeps (unchanged id, member swapped).
- **g2:** 4.4 and 5.7: groups match by the set of member roots; ingest carries keys forward whatever the combiner writes. A test rules a variant onto a solo member and onto a combined member and asserts both ids are unchanged.

### C-055 A ruling that touches built work re-opens it explicitly

- **Sources:** RC-5.
- **Decision:** ACCEPT. The design gives three conflicting stories, and ingest refuses to strike started items.
- **g1:** 3.4: `statement` freezes at first adopted ingest, not at migrate. 3.9: no done-to-todo transition; re-opening is a new follow-up.
- **g2:** 4.3: `tim backlog rule` refuses an effect on a member of a started or done increment unless the decision carries `reopens: true`, which creates a variant atom and a follow-up solo increment depending on the done one, leaving `doneBy` untouched.
- **g4:** `as-bootstrap-unverified` and 11.1 item 2 say the same thing: a corrected atom of a built increment becomes a variant and a follow-up increment.

### C-056 No executor or build-mode vocabulary anywhere in the backlog

- **Sources:** RC-7.
- **Decision:** ACCEPT. Executor detail sits in `backlog.json` prose (`as-judge-on-codex`, `dv-bootstrap-by-hand`), which R5 forbids; the lint covers only acceptance and statement.
- **g1:** 3.14: the recipe and executor lint covers every prose field (assumptions, deviations, invariants, direction, outcome, why, `combination.why`, `statusNote`, question text), with an executor vocabulary (Claude, Codex, preset, Opus, Sonnet, Haiku, sandbox, main session, by hand).
- **g2:** 4.2 `check` implements it.
- **g4:** Move `as-judge-on-codex` to `presets.json` notes; move `dv-bootstrap-by-hand` to `run.json` or the journal and handover; recast `as-house-rules-by-path` neutrally. req-024 extended: "the backlog contains no executor vocabulary".

### C-057 The tooling deviation is an enumerated interface, not a lint switch

- **Sources:** RC-8.
- **Decision:** ACCEPT. `dv-tooling-commands` switches off the recipe lint for the whole programme by allowing file paths.
- **g1:** 3.12: an override names an enumerated contract, and the lint allow-list is driven from it.
- **g4:** Narrow `dv-tooling-commands` to the interface contract: `tim backlog` verbs and flags, documented exit codes, skill trigger phrases and stop reasons. File paths stay refused. Rewrite acceptance that names paths.

### C-058 Repo how-facts leave the backlog; DESIGN.md is the programme's knowledge

- **Sources:** RC-9, RC-14.
- **Decision:** ACCEPT, merged. Take RC-9's preferred option (ladders, generated globs and reading lists describe repos, not requirements, contradicting principle 1). RC-14's addition of DESIGN.md as the sanctioned how-channel lands in the moved knowledge list, not on the backlog header.
- **g1:** Principle 1 and 3.3: the header repo entry keeps `{key, path, role, consumes}` only. `ladder`, `generated` and `knowledge` move to the registry entry (`tools/backlog/registry.json`), read by `stage prepare`.
- **g4:** `backlog.json` `repos.workspace` loses `ladder`, `generated` and `knowledge`. The registry entry for this programme lists `workareas/shared/requirements-pipeline/design/DESIGN.md` in `knowledge`, with `generated` covering the programme's state paths (C-065). `inv-no-recipe` stays as written and now holds.

### C-059 Discovered atoms are verified like any other

- **Sources:** RC-11.
- **Decision:** ACCEPT. They are born adopted without the recipe rubric and carry file and line coordinates.
- **g2:** 4.2 `discover` writes atoms `proposed`.
- **g3:** 7.10: the record stage runs a separate `REQUIREMENT_VERIFIER` task and the recipe lint before adoption. `source.file` and `source.line` go to `build/state.json` and the journal, never into atom sources.

### C-060 The plan audit derives the requirement from the row

- **Sources:** RC-15.
- **Decision:** ACCEPT.
- **g1:** 2.1 diagram line 188 reads "derives the requirement from the row, never from the plan's restatement of it".
- **g3:** 7.5 uses the same wording.
- **g4:** req-060's citation text follows.

### C-061 Example 3's option A carries its full effects

- **Sources:** RC-16.
- **Decision:** ACCEPT.
- **g1:** 3.6 option A adds `{op: supersede, target: req-044, by: req-045}`; option B gets the matching variant; 3.7 unchanged.

### C-062 A solo increment's outcome is rendered, not stored

- **Sources:** RC-17.
- **Decision:** ACCEPT. A stored copy drifts under the prose phase, against "Nothing is copied".
- **g1:** 3.5: a solo increment's outcome is rendered from its member at read time.
- **g2:** 4.1: solo outcomes are not a prose slot.
- **g4:** Remove stored outcomes from solo increments in `backlog.json` (inc-003, inc-010, inc-013 and the rest).

### C-063 Code citations are labelled as evidence, not templates

- **Sources:** RC-18.
- **Decision:** ACCEPT. Code refs reach the planner through `brief.json` and act as an exemplar slot under another name.
- **g1:** 3.4 and 0.3 row 6: non-requirement citations are labelled.
- **g2:** 4.2 `show --brief` labels them "evidence of current behaviour, not a design to copy".
- **g3:** 7.5 plan audit objects when the plan adopts a cited file as a template without a stated decision.

### C-064 The pinned copy is callable headless

- **Sources:** FE-1 (blocker), FE-11.
- **Decision:** ACCEPT. Confirmed: pinned bash tools prompt headless agents, agents cannot add the rule, and the root copy is denied while it differs from HEAD. Take FE-1's allow-rule route (the build then really runs tools as they stood at launch), not "commit before calling", which would run half-built tools.
- **g2:** 4.6 `pin-tools.sh`: the prefix is `npm --prefix … run --silent tim -- …`, with a test that the pinned form's stdout parses as JSON.
- **g3:** 7.12: pin tim (allowlisted `npm --prefix` form), the briefs, profiles and workflow scripts as files, and the bash tools under `workareas/clones/pipeline-pin/tools/`. Stage 0 preflight runs a pinned tool's `--check` and stops with `environment` if it would prompt. Remove "No allow rule needs adding".
- **g4:** 9.2 and `decisions-for-sam.md` "Owed to you": add `Bash(~/git/defra/trade-imports-workspace/workareas/clones/pipeline-pin/tools/**)` and its `:*` twin.

### C-065 A shared checkout does not fail the build: tracked-only fingerprints and a clones mode

- **Sources:** FE-2 (blocker).
- **Decision:** ACCEPT. Confirmed: the fingerprint includes untracked files, the workspace carries other sessions' untracked `workareas/shared/` entries, and the build writes its own tracked state mid-increment, so every self-hosted increment starts dirty or fails its read-only stages.
- **g2:**
  - 4.2 `heads --strict` and 4.5 accept step 5: fingerprints and dirty checks use tracked files only (`--untracked-files=no`), scoped to the increment's plan and manifest paths.
  - `workareas/shared/<p>/**` is excluded from the workspace repo's fingerprint, dirty check and manifest by rule (via the registry's `generated`, C-058).
  - Step 5 compares before step 4's writes (with C-005, per-task accept writes only its task folder).
- **g3:** 7.7 `run.json` gains `checkout: live | clones`; `clones` (FA's mode) is the default when the programme changes the pipeline's own tools.
- **g4:** 11.1 item 3 names `checkout: clones` for self-hosting.

### C-066 New scripts get their execute bit in the working tree too

- **Sources:** FE-3.
- **Decision:** ACCEPT. `git add --chmod=+x` sets only the index; the Write tool makes 644 files and chmod is denied.
- **g2:** 4.6 states the full sequence: `git add`, `git update-index --chmod=+x`, commit, `git checkout -- <path>`, then check "create mode 100755". The tool self-test fails if any `tools/backlog` or `tools/codex` script is not 100755 at HEAD.
- **g4:** inc-001, inc-015, inc-017, inc-021 and inc-024 carry the criterion that their scripts are 100755 at HEAD and in the tree.

### C-067 Script rungs run only committed, unchanged scripts

- **Sources:** FE-4.
- **Decision:** ACCEPT. Running an uncommitted rung is either denied or the write-then-execute laundering the guard exists to stop.
- **g1:** 3.3 ladder rungs (now in the registry, C-058): `tool: script` names only committed files.
- **g2:** 4.6 `run-rung.sh` refuses a script rung whose file is uncommitted or differs from HEAD (`could-not-run:uncommitted`). For a self-hosted build the tool self-test runs from the pinned copy (C-064).

### C-068 The manifest diffs from the attempt's pinned heads

- **Sources:** FE-6.
- **Decision:** ACCEPT. Under programme delivery, `main...HEAD` holds every earlier increment's files, so review cost grows every increment.
- **g2:** 4.5 manifest: base is the attempt's pinned baseline heads (`state.heads` from stage 4) per repo, recorded in `stage.json` so the audit re-derives the same set.

### C-069 The workflow contract test parses real workflow scripts

- **Sources:** FE-12.
- **Decision:** ACCEPT.
- **g2:** 4.6: parse with `sourceType: 'module'` and `allowReturnOutsideFunction: true`, with a fixture using both.

### C-070 A relayed fan-out list is checked before fan-out

- **Sources:** FE-14.
- **Decision:** ACCEPT. A dropped row surfaces only later as a hold.
- **g2:** 4.5 `stage prepare` (and `advance`'s `run` step) prints a compact task list plus a count and the sha256 of `stage.json`.
- **g3:** 8.2: the script checks the relayed count and hash before it fans out; a mismatch re-calls once, then holds `stage-failed`.

---

## Rejected parts

### C-071 REJECT: a separate invariant stage whose results the consistency reviewer rules on

- **Sources:** codex-parity-04 (stage 12b and `invariantVerdicts`).
- **Decision:** REJECT this part; the rest is in C-008.
- **Merit reason:** The live `CONSISTENCY_REVIEWER.md` has no method for judging invariant results, so ruling on them would be prompt glue outside R2's live personas. Command invariants are already recorded facts from `run-rung.sh` at stages 11 and 18, and judgement invariants are judged by the acceptance task, which already reads the header invariants. A second consumer adds no quality.

### C-072 REJECT: deleting the Codex briefs in inc-014

- **Sources:** r8-merit-09 (the "delete `codex/*.md` in inc-014" part).
- **Decision:** REJECT this part; the rest is in C-006 and C-007.
- **Merit reason:** Operability. The legacy `increment-build-loop.js` keeps serving live programmes (the plants loop, frontend alignment) until inc-040, and its Codex mode reads those briefs. Deleting them in inc-014 breaks a running loop. They go with the loop in inc-040.

### C-073 REJECT: a landed but unproven increment satisfies `dependsOn`

- **Sources:** CX-8 (the "per-criterion owed mark" part).
- **Decision:** REJECT this part; its other parts are in C-002 and C-035.
- **Merit reason:** R7 correctness. Building on a slice whose integration is unproven lets a contract defect compound across increments, and one later stack run over several slices cannot say which broke. The stall CX-8 feared is removed instead by a full-access orchestrator running the proof itself (C-035) and by `integrationProofSource: ci`.

---

## Ids by group

- **g1:** C-001, C-002, C-007, C-009, C-021, C-025, C-026, C-027, C-029, C-030, C-031, C-032, C-033, C-034, C-035, C-037, C-039, C-040, C-041, C-042, C-044, C-045, C-047, C-050, C-052, C-054, C-055, C-056, C-057, C-058, C-060, C-061, C-062, C-063, C-067
- **g2:** C-001, C-002, C-003, C-004, C-005, C-006, C-007, C-008, C-009, C-010, C-011, C-012, C-014, C-016, C-019, C-020, C-023, C-024, C-025, C-026, C-027, C-028, C-029, C-030, C-031, C-032, C-033, C-034, C-037, C-038, C-039, C-040, C-041, C-042, C-043, C-044, C-045, C-046, C-047, C-048, C-049, C-050, C-052, C-053, C-054, C-055, C-056, C-059, C-062, C-063, C-064, C-065, C-066, C-067, C-068, C-069, C-070
- **g3:** C-001, C-002, C-003, C-004, C-005, C-006, C-007, C-008, C-009, C-010, C-011, C-012, C-013, C-014, C-015, C-016, C-017, C-018, C-019, C-020, C-021, C-022, C-023, C-024, C-026, C-028, C-030, C-031, C-032, C-035, C-037, C-042, C-059, C-060, C-063, C-064, C-065, C-070
- **g4:** C-001, C-002, C-003, C-004, C-007, C-009, C-010, C-011, C-012, C-018, C-019, C-020, C-021, C-023, C-025, C-027, C-031, C-034, C-035, C-036, C-037, C-038, C-039, C-040, C-041, C-042, C-043, C-044, C-045, C-051, C-052, C-053, C-055, C-056, C-057, C-058, C-060, C-062, C-064, C-065, C-066

## Tally

- 104 inputs (63 critic findings, 41 audit proposals), merged into 70 accepted changes (C-001 to C-070) and 3 rejected parts (C-071 to C-073).
- Every input is covered by at least one accepted change. No input is rejected whole.
- Blockers: 8 (5 critic, 3 audit). All accepted. None open.

