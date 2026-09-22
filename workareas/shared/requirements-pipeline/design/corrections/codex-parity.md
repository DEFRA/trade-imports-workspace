# Codex parity re-graft: audit of DESIGN.md sections 7 and 8 against the codex candidate

Written 19 September 2026 by the Codex-parity auditor. Headless: every call below is made and recorded, none is gated.

## What was compared

- `candidates/codex.md` sections 1, 2, 7 and 8 (the candidate every judge scored 10/10 on R6).
- `DESIGN.md` sections 0.2, 0.3, 4.5, 7 and 8 (built on the reuse candidate, 7-8 on R6).
- The three judges' objections to codex (`judging/judge-{1,2,3}.md`), re-weighed under R8: effort, new surface and "not a build from zero" carry zero weight; operability under the rails is a real constraint.
- The critic findings on sections 7 and 8 (`critiques/all-findings.json`). Where a critic already proposed the mechanical fix, this audit cites it and grafts only what codex.md adds on top.
- The Codex mechanics as they actually are: `.claude/workflows/increment-build-loop.js:682-800`, `.claude/workflows/codex/{implement,review,fix}.md`, and the installed CLI (`codex-cli 0.155.0`, `codex exec --help`, `codex exec resume --help`, `~/.codex/` listing).

## Verdict in one paragraph

The design already took most of codex's R6 machinery: file-first task folders, one accept command, receipts, prompt parity, the reading audit, op ids, read-only sandboxes, judge and acceptance on Codex, the Codex-orchestrated mode, resume across executors, and a wider parity proof. What it did not take, or took in a weaker form, is the part that makes those mechanisms hold **in use**, especially when Claude is out and a Codex session drives: (1) the transition logic, the resume rule and the retry rules live in the workflow script, so a Codex session has to follow a prose re-description of 28 stages, which is exactly the `HANDOVER-CODEX.md` defect codex set out to retire; (2) a rejected Codex output gets no correction round while a Claude one gets three; (3) a partial review is indistinguishable from a complete one; (4) invariant proofs are model-run, and fail falsely under Codex's read-only sandbox; (5) the Codex profile dropped codex's explicit list of the prohibitions the Claude hooks enforce; (6) switching is increment-grained, and nothing is ready on disk at the moment Sam actually runs out of Claude; (7) the reading audit is a parity-proof statistic, not a per-task gate; (8) the parity proof never measures the thing R6 exists for, Claude usage in the Codex run; (9) a Sonnet agent still runs the end-to-end suite in Codex mode. Each is grafted below in a form that keeps both judge-2 operability guarantees: **every git push, PR, merge and Jira call stays in a Claude watcher running a committed `tools/` script, so the per-call hooks see it; and nothing the pipeline waits on outlives one Bash call.**

## Mechanism by mechanism

| # | Mechanism | codex.md | DESIGN.md | Better in use | Graft |
|---|---|---|---|---|---|
| 1 | Stage contract: who decides the next stage | `tim build advance` decides from disk, runs deterministic stages itself, returns model steps; the script is a ~250-line interpreter (7.3, 7.4) | The stage order and transitions live in `backlog-build.js`; tim prepares, accepts and audits only (4.5: "tim never decides the order of stages") | codex, for resume, Codex-orchestrated mode and testability | P1: `tim backlog stage next` owns transitions; effects stay in watchers |
| 2 | File-first receipts | task folder, `stage accept`, receipt, "Never write output.json or receipt.json yourself" | same, grafted (0.2 row 1) | equal, minus one line | P10 |
| 3 | Correction on a rejected output | one automatic retry for a task with no receipt | Claude gets up to three self-corrections; Codex gets none (8.2) | neither; asymmetric in DESIGN | P2 |
| 4 | Operation ids | every write | grafted (4.3) | equal | none |
| 5 | Prompt parity | profile + brief + bindings + manifest; everything but the profile byte-identical | same (8.1) | equal on the prompt; unequal on hidden context (user Codex config, memories, skills, hooks, global AGENTS.md) | P9, with the critic's CODEX_HOME fix |
| 6 | Reading audit | parity-report measure, mined from transcripts and log.txt | the same, plus a done-gate row that names it (7.9), but computed only in 8.10 and after the run | neither gates a task | P7 |
| 7 | Facts from tools | ladder, baseline, CI, Sonar, E2E all tool facts; invariant proofs model-run (`invariantProofs[{id, exit, matched}]`) | the same, invariant checks model-run (`invariantChecks[{id, result, evidence}]`) | neither for invariants | P4 |
| 8 | Per-file review granularity | one style and one code task per file, consistency, acceptance; `completed` and `notReached[]` in every review output | same fan-out; no `completed` or `notReached` | codex | P3 |
| 9 | Verify, judge, fix on Codex | all bindable; judge on Codex by default | the same (8.4) | equal | none |
| 10 | Codex profile | explicit list of what the Claude hooks enforce, which Codex enforces itself; browser suites are not yours; always report | six rows; none of the hook list, no browser line, no "always report" | codex | P5 |
| 11 | How Claude stays thin | Haiku only in Codex mode; local E2E runner deterministic | ~29 Haiku plus one Sonnet end-to-end runner per increment | codex | P8 (E2E runner) and P6 (usage measured) |
| 12 | Resume across executors | from receipts, at stage granularity, under the bindings resolved now | increment granularity; exception only for held increments; resume logic in the script | codex | P1 and P6 |
| 13 | Switching UX | adds "switch back after this one", "finish this increment on Codex", "I'm out of Claude" | no mid-increment switch, no "out of Claude" row | codex | P6 |
| 14 | Parity proof | granularity equal, Claude usage by tier, confirm and applied rates, `completed`, absolute bar on cross-examination; a failure becomes a hygiene item | wider canaries and 90/80 thresholds, but none of those five | both; merge them | P11 |
| 15 | Codex exec mechanics | runner and batch scripts, exit 3 | `run-stage.sh`, exit 75 | DESIGN, after the fixes below | P9 |

## The judges' objections, re-weighed

| Objection | Judge | Real under R8? | How the graft meets it |
|---|---|---|---|
| tim pushes and merges internally, outside `guard-bash`, the push hook and the auto-mode classifier | 1, 2, 3 | **Real.** Operability under the rails is a criterion, and the hooks are the rails. | P1 keeps every side effect in a Claude watcher running a committed script. tim returns the command; it never runs it. |
| Deterministic ladders, CI waits and E2E inside `advance` need processes that outlive a Bash call | 2 | **Real.** A Haiku agent cannot wait on a background job (`increment-build-loop.js:746-750`). | P1's `stage next` never runs a rung itself; it names one command per step, each a foreground call under the 570-second guard. P8 splits a long E2E suite into Playwright shards so each call ends by itself. |
| It rebuilds the proven lifecycle from zero | 3 | **Contaminated.** This is build cost (R8: zero weight). What survives is the risk of losing proven behaviour. | P1 ports the loop's transition rules verbatim into tim with behaviour tests, and leaves the proven effects (the `tools/` scripts) unchanged. |
| It moves the skills' routing into JSON | 1, 3 | Out of scope for this audit (R2 routing). DESIGN's call (the skills' routers used unchanged) stands. | none |
| Sonar stage leans on `sonar` | 1 | Real; DESIGN already fixed it (0.3). | none |

## Verification of the Codex exec mechanics

Checked against `increment-build-loop.js:744-800`, `codex/*.md` and `codex-cli 0.155.0` on this machine.

| Claim in DESIGN 8.2 | Result |
|---|---|
| `-C`, `--skip-git-repo-check`, `-s read-only\|workspace-write`, `-c key=value`, `-m`, `--output-schema`, `-o` exist on `codex exec` | **True** (`codex exec --help`). |
| `codex exec resume -C` is rejected, so every flag goes before `resume` (`:768`) | **True, and sharper than stated.** `resume` has no `-C` and no `-s`. It does accept `-c`, `-m`, `--output-schema`, `-o` and `--skip-git-repo-check` itself. The self-test must check `exec resume --help` too (the critic's minor finding). |
| `model_reasoning_effort` is set by `-c` | **Unverifiable by `--help`.** It is a config key, not a flag, so the self-test's `--help` check cannot catch a rename. The live canary must read the effort back from the exec header (or the `--json` session event) and fail on a mismatch. |
| A resumed session keeps the sandbox of its first slice | **Unproven.** `resume` takes no `-s`. The loop only ever resumed `workspace-write` (`:767`). The live canary must attempt a write in a resumed `read-only` session and expect a refusal. |
| `-o` works under `-s read-only` | **Unproven in the loop**, which only uses `workspace-write` (`:756`). Already on DESIGN's prove-first list (12.2 item 4); keep it there. |
| The session id comes from the log's `session id:` line | **True for the text log** (`:762`). `--json` exists and prints JSONL events to stdout, which gives a structured session id and structured command events. Adopt it (the critic's reading-audit fix; P7 depends on it). |
| The runner's own 540-second deadline replaces the loop's "Bash timeout 570000, auto-backgrounded, then `pkill ... ; grep`" (`:755-770`) | **True and better.** The loop's shell relies on the Bash tool moving the call to the background and on a compound `pkill ; grep` that breaks the rails. DESIGN's script-owned deadline is the right replacement. |
| Codex cannot run browser suites | **True** (`codex/implement.md:123-132`: "Chromium is refused its Mach port"; `codex/fix.md:50-52`). DESIGN states it in 8.4 but not in the Codex profile (P5). |
| Codex receives nothing automatically | **False as stated.** `~/.codex/` holds `config.toml`, `hooks.json` (SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, SubagentStart, SubagentStop, Stop), `memories`, `skills`, `rules` and `plugins`. Every `codex exec` inherits them unless `CODEX_HOME` is replaced. They are Sam's personal Codex context, not the workspace's, so they skew parity in unrecorded ways (P9). |
| Codex has no per-call hooks | **False for this CLI.** Codex 0.155 runs `PreToolUse` and `PostToolUse` hooks, and `exec` has `--dangerously-bypass-hook-trust`, so hooks need trust. A pipeline-owned `CODEX_HOME` can carry a committed `hooks.json` that runs the workspace's own guards for Codex tasks. That gives the Codex tasks the same per-call guards the Claude tasks get, instead of relying on the sandbox alone (P5). It must be probed first: hook input shape and trust are not yet known. |

## Proposals

### P1 (major). `tim backlog stage next`: the transition function lives in tim; every effect stays in a Claude watcher

**Current decision.** 4.5: "tim never decides the order of stages and never runs the lifecycle." 0.3: "The stage order lives in the workflow script." 7.8: "The script works out where to resume from persisted state alone." 8.11 describes the Codex-orchestrated loop as six prose steps.

**Problem in use.**
- **The Codex session reimplements the machine from prose.** When Claude is out, the Codex-orchestrated session must reproduce what `backlog-build.js` does: which stage comes next, when verify is skipped, fix and fix-verify rounds, the three ladder repairs, CI fix attempts, holds, and the resume point. 8.11 lists six steps and none of these rules. This is the `HANDOVER-CODEX.md` defect codex retired: "It replaces `HANDOVER-CODEX.md`'s hand-written re-description of twelve stages".
- **The resume rule cannot be tested.** Resume across runs and executors is script logic, which only a live run exercises.
- **Mid-increment switching is impossible** (P6), because only the script knows where an increment is.

**The graft, keeping the operability guarantees.**
- **A new command.** `tim backlog stage next <p> <inc> --json` reads `stage table + state.json + receipts + fact files + run.json`. It returns one step:
  - `{kind: "model", stage, tasks[]}`: it has already run `stage prepare` for the bound executor.
  - `{kind: "command", stage, commands[{tool, args, factFile, timeoutMs}]}`: lifecycle and fact stages. It names the committed `tools/` script and its arguments, for example `tools/backlog/run-rung.sh ...`, `tools/github/pr-ensure-draft.sh ...` or the land script's push. It **never runs them**.
  - `{kind: "wait", reason, command}`: CI still pending, for example. The watcher runs the named wait tool's next slice.
  - `{kind: "hold" | "stop", reason, release}`.
- **What the command owns.** Every transition rule now in the script: skip verify when there are no findings, fix due, repair budgets, `ciFixAttempts`, the `baseline-red` hygiene emission, the systemic-halt count, and the resume rule of 7.8. The resume rule includes the loop's "PRs merged means done, PRs present means CI, commits and no PRs means PR" (`increment-build-loop.js:938-946`), ported verbatim, with behaviour tests on fixture folders.
- **The script** (`backlog-build.js`) becomes the interpreter codex.md 7.3 shows. It loops: a watcher runs `stage next`, then fans out the model tasks, or a watcher runs the named commands, and repeats. It keeps only transport, fan-out, concurrency caps and the agent ceiling.
- **The Codex-orchestrated mode** (8.11) becomes "run `tim backlog stage next`, do what it says, repeat". The handover no longer describes stages.
- **Unchanged.**
  - tim runs no git write, no `gh` and no Jira call.
  - Every push is a Claude watcher's Bash call to a committed script, so the `PostToolUse` push hook and `guard-bash` see it (judge 2).
  - No step runs longer than one foreground call. `timeoutMs` is at most 570000, and a longer job is sliced by its tool (the runner's exit 75, or P8's shards).
- **Where it lands.** Split inc-014 or inc-017 per the backlog's combine rules. The acceptance: the same fixture increment, driven by (a) the workflow and (b) a scripted loop that calls `stage next` and runs the named commands, reaches byte-identical `state.json`. Replace 0.3 row 5 and 4.5's first paragraph accordingly.

### P2 (major). The same correction budget for both executors when `stage accept` rejects an output

**Current decision.** 8.2 Claude adapter: "If it prints problems, correct the draft and run it again, at most three times." Codex adapter: "Exit 0 or 1: run `tim backlog stage accept` and return its summary."

**Problem.** `--output-schema` guarantees shape only. tim's zod checks are richer: refinements, cross-checks against manifests and `.exit` files, a "pre-existing" claim refused without a baseline record. A Codex output that fails them has no correction round. The task then fails and, for review, retries once from scratch. A Claude output with the same fault gets three in-context corrections. Codex looks worse for a reason that is the harness's, not the model's. This is the R6 complaint in a new place.

**Change.**
- **`run-stage.sh --accept`.** After a draft lands, `run-stage.sh` calls `tim backlog stage accept <taskDir> --json` itself; tim is allowlisted and the script is committed.
- **On problems,** it resumes the same Codex session: `codex exec <flags> resume <id> "tim rejected your output: <problems verbatim>. Correct it and write your final result."` It does this at most three times, the same count as Claude, and records `attemptsToAccept` in the receipt for both executors.
- **A task with no output after its slices** gets one fresh start, matching Claude's "retries that task once" (the critic's fix, taken).
- **The parity report shows `attemptsToAccept` per role** for each side.

### P3 (major). Every review-shaped output says whether it finished: `completed` and `notReached[]`

**Current decision.** 8.1 review schema: `{file, findings[...], rulesRead[], verdict}`. There is no completion field. Verify, consistency and acceptance have none either.

**Problem.**
- A Codex review cut off at its fifth slice, or a Claude reviewer that ran out of turns, can return a valid object with the findings it had so far. That looks exactly like a thorough review that found little.
- The existing Codex brief already knows this: "**Always report, even if you did not finish.**" (`codex/review.md:119`). codex.md made it a schema field: `completed`, `notReached[]` ("set `completed: false` and list `notReached`").
- DESIGN dropped it, so the most likely Codex failure mode is silent. That breaks principle 8 and the 7.9 table.

**Change.**
- **The fields.** Add `completed: boolean` and `notReached: string[]` (hunks, files, repos or criteria not examined) to review-style, review-code, consistency, verify, fix-verify and acceptance.
- **Accept records a partial output as a partial receipt.** For Codex, the runner resumes the session once, naming `notReached`. For Claude, the script spawns one follow-on task with the draft and `notReached` in `input/extras/`. A second partial output holds the increment `review-failed`, listing what was not reached.
- **`stage audit`** requires `completed: true` on every accepted review-shaped receipt.
- **The profiles.** The Codex profile gains "Always report, even if you did not finish" verbatim. The Claude profile gains the same line, because it is executor-neutral in effect.

### P4 (major). Invariant proofs are tool facts, run by a watcher, and judged by the consistency reviewer

**Current decision.**
- 7.5: the plan returns `invariants[{id, check}]`, with the check as prose.
- 8.1: the consistency task returns `invariantChecks[{id, result, evidence}]`, so the model runs the checks and reports the result.
- 8.2: consistency runs Codex `-s read-only`.

**Problem.**
- **A self-reported fact.** An invariant result is the model's word, the very pattern principle 8 bans for ladders.
- **False failures on Codex only.** Under `-s read-only` a Codex consistency task cannot run a check that writes anything: `npm test` coverage, `target/`, caches or temp files. Codex reports a false failure or no evidence, while a Claude consistency task with the same check succeeds. The Codex candidate's own note, "read-only sandbox still allows running commands", missed that the commands cannot write.
- **Neither candidate got this right.** codex.md also had the model run `invariantsToProve[{id, command, expect}]`.

**Change.**
- **The plan's shape.** The plan returns `invariants[{id, repoKey, command, expect}]` in codex's shape: a runnable command and an expected outcome.
- **`stage accept` for the plan** refuses a command that is not a `run-rung.sh`-runnable form.
- **Stage 12b, "invariant facts".** It comes after the manifest. A watcher runs each invariant through `tools/backlog/run-rung.sh` with a `check` kind, writing `.exit` and log files.
- **The consistency task** receives the results in `input/extras/invariants/` and returns `invariantVerdicts[{id, holds, evidence}]`, judging the recorded result against `expect`. It never runs a check itself.
- **`stage audit`** requires a `.exit` record for every planned invariant.

The same result then reaches both executors, and the read-only sandbox no longer decides the outcome.

### P5 (major). The Codex profile carries the hook-enforced prohibitions, and a pipeline-owned Codex hooks file enforces them per call

**Current decision.** 8.3 codex.md profile has six rows. 8.7 row 2: "Codex is fenced by its sandbox, the manifest and tree fingerprints."

**Problem.**
- **The prohibition list was dropped.** codex.md's profile listed what the Claude hooks enforce and Codex must enforce itself:
  - never read `.env*`, `credentials*`, `secrets*`, `.ssh`, `.aws`, `.npmrc` or `.netrc`;
  - never write a credential-shaped value;
  - never edit `backlog.json`, `decisions.json` or anything under `build/` except its own task folder;
  - never edit `.claude/settings*.json`, `.claude/hooks/**` or `docker/stack/.staged/`;
  - never run `sonar`, never install global packages, never write to CDP platform repos.

  DESIGN's profile has none of these.
- **The sandbox does not cover it.** `workspace-write` with the workspace as the working directory permits every one of those writes, and reads are unrestricted.
- **The manifest covers only part of it.** It proves no commit or push happened. It does not refuse edits to state files or settings (critic finding, 8.2 write modes).
- **The two executors are not held to the same rules.** A Claude implementer is stopped per call by `guard-edits` and the Sonar Read hook. A Codex implementer is stopped by nothing until accept, and a secret it read is already in its context.

**Change.**
1. **The profile list.** Restore codex.md's list, and its browser line ("Browser suites are not yours to run", citing `codex/implement.md:123-132`), verbatim into `.claude/workflows/executors/codex.md`.
2. **Accept refuses protected-path changes** (the critic's fix, taken). `stage accept` for any write task refuses changes under `backlog*.json`, `decisions.json`, `build/**` (outside the task's own folder), `.claude/**`, `docker/stack/.staged/**` and any `.git/hooks/**`.
3. **Per-call parity (new).**
   - The pipeline-owned `CODEX_HOME` (the critic's fix for config drift) carries a committed `hooks.json`. Its `PreToolUse` runs a `tools/codex/guard.sh` adapter that feeds Codex's hook input to the workspace's existing `guard-bash.sh`, `guard-edits.sh` and secrets-read logic.
   - Codex 0.155 supports `PreToolUse` and `PostToolUse` hooks, as Sam's own `~/.codex/hooks.json` shows. Hook trust is persisted or granted per run (`--dangerously-bypass-hook-trust` exists for automation that vets its hook sources; here the sources are committed).
   - **Probe first** in inc-015: the hook input shape, whether a deny is honoured in `exec`, and trust. If the probe fails, items 1 and 2 still stand, and 8.7 states plainly that Codex has no per-call guard.

### P6 (major). Switching at stage granularity, and a Codex handover always waiting on disk

**Current decision.** 7.8: "A binding change takes effect at the next increment, never in the middle of one", except for a held increment. 8.9 has six sentences. 7.11 prints the handover only when the skill regains control at a stop. 4.5's audit accepts "a receipt whose executor matches the binding in force".

**Problem.**
- **R6's trigger is running out of Claude, and that happens mid-increment.**
  - When the weekly limit hits, the workflow's Claude agents die, and so does the main session that would print the handover.
  - DESIGN's handover exists only if Claude survives to print it.
  - Its resume across executors works only once the increment is held, and "held" is decided by a script that has just lost its agents.
- **codex.md handles it:**
  - "Finish this increment on Codex": stages not yet prepared switch at once.
  - "I'm out of Claude" gives the Codex handover.
  - Bindings are read at every `advance`.
- **The audit rule blocks mixing.** The rule "executor matches the binding in force" makes a mixed-executor increment unauditable, though mixing roles is what the presets already do.

**Change.**
- **Stage-grained switching.** Bindings are resolved per task at `stage prepare`, and the resolved executor is recorded in `stage.json`. The audit rule becomes "every receipt's executor equals the executor `stage.json` recorded when that task was prepared". So a switch takes effect at the next stage prepared, with P1 computing the resume point. A running task always finishes on its executor. A prepared task that has not started is re-prepared.
- **Three new rows in 8.9:**
  - "Finish this one on Codex": `run bind --ids <current> --preset codex`.
  - "Back to Claude after this one": `run bind --from after-current --preset claude`, resolved to a concrete id when written.
  - "I'm out of Claude": the skill prints `tim backlog handover <p> --executor codex --md`, if it still can.
- **The handover is always on disk.** The record stage and every hold write `build/HANDOVER-CODEX.md` through `tim backlog handover --executor codex --md --out`, together with the state commit. Sam can start Codex from that file with no Claude session at all. The skill tells him once per run the terminal command that regenerates it: `tim backlog handover <p> --executor codex --md`.
- **A distinct stop.** Two or more Claude tasks in one stage that die with no receipt, while Codex tasks in the same run succeed, stop the drain as `claude-unavailable`. It is not counted toward `systemicHaltAfter`, and the handover names it.

### P7 (major). The reading audit gates each task, for both executors, and does not only score the parity proof

**Current decision.** 7.7 `readingAudit: true` "mine transcripts and Codex logs after each run". 7.9 names the audit as what catches "standards files are not read". 8.10 makes "no unread must file" an exact bar. `audit-reading` runs after the run from the skill (4.2, and the critic's fix).

**Problem.**
- **Nothing makes the task read it.** An unread must-file is detected, at best, after the increment is done and landed. For Codex this is the most likely quality gap: the existing brief even rations reading ("Read each file at most once... Budget your reading for the diff", `codex/review.md:48-51`). A review that skipped `docs/best-practices/java/testing/unit.md` should be sent back, not scored.
- **codex.md measured reading only in the parity report,** and DESIGN inherited that.

**Change.**
- **Codex, at accept.** `run-stage.sh` runs `codex exec --json` and writes `events.jsonl` (the critic's fix). `stage accept` for a Codex task computes the reads from the command events, using the critic's rule: full or cumulative line coverage. A missing "must" file triggers a resume inside P2's correction budget: "You have not read: <paths>. Read them, re-check your findings against them, and write your final result."
- **Claude, at accept.**
  - A committed workspace `PostToolUse` hook on `Read` appends `{session_id, transcript_path, file_path, offset, limit}` to `build/reads/<session_id>.jsonl`. Per-call hooks fire in workflow agents (R4).
  - The adapter's first instruction is to Read `<taskDir>/prompt.md` (the critic's fix), which ties the session to the task.
  - `stage accept`, run by the same agent, then checks the must-list and returns the missing files as problems, inside Claude's three corrections.
  - Adding the hook to `.claude/settings.json` is owed to Sam, because guard-edits blocks agents from it. List it under "Owed to Sam". If the fixture in inc-019 shows `session_id` is shared across workflow agents, fall back to the critic's transcript mapping at record time, and hold the increment `record-failed` on a gap.
- **Both executors.** `stage audit` requires a clean reading record on every review, implement and fix receipt. The parity proof then reports reading as a check that already passed, not a surprise.

### P8 (major). The local end-to-end run is a watcher-run tool fact in Playwright shards, with no Sonnet runner

**Current decision.** 7.4 stage 25 is a "doer runner", Sonnet. 8.8: in the `codex` preset, "Claude doers (Sonnet): the end-to-end runner only".

**Problem.**
- **Claude is not thin.** R6: in Codex mode "Claude keeps only thin orchestration: the shell and relay agents on the cheapest tier". A Sonnet agent per product increment is the one non-watcher Claude cost left in Codex mode, and it runs no judgement: start the stack, run the suite, retry once, tear down.
- **The result is a model's report.** An E2E result relayed by a model is the "agent's word" principle 8 bans.
- **codex.md made the runner deterministic,** with a model only for `e2e-repair`.
- **The judges' real objection** was a job that outlives a Bash call.

**Change.**
- **Stage 25 becomes `command` steps (P1)** for a Haiku watcher. The steps, each one foreground call, are:
  1. `tim docker dev` (the stack runs under Docker's daemon, as it does today, so no agent waits on a background job);
  2. `tools/backlog/run-rung.sh <tests> . npm test:docker-compose -- --shard=<i>/<n> ...`, one call per shard, with `n` chosen from the last recorded suite duration so each shard ends under the 540-second slice. It uses the tests repo's standard script with its own argument pass-through (`package.json:34`, memory "use the standard test script"), never raw npx;
  3. one retry of failed shards (the fresh-stack 500s rule);
  4. `tim docker down`, always last.
- **The integration-proof record** is the merged shard `.exit` files and logs.
- **`e2e-repair`** stays a bindable model task that reads `error-context.md`.
- **8.8 changes.** The `codex` preset runs no Sonnet or Opus agent at all, and the parity proof (P11) checks that.

### P9 (major). Codex exec mechanics: fix the claims this audit disproved, and record the effective Codex configuration

**Current decision.** 8.2 `run-stage.sh`. `--self-test` "checks that the installed Codex's `exec --help` lists every flag the runner uses". 8.3: "No rules load by themselves". 0.4 and 8.6: "Codex receives neither [CLAUDE.md chain nor memory]".

**Problem.**
- **The claims.** See the verification table above:
  - `model_reasoning_effort` is a config key, which `--help` cannot verify;
  - `resume` has no `-s`, so sandbox persistence across a resume is unproven;
  - `resume --help` goes unchecked;
  - Codex does receive context automatically, from `~/.codex` (`memories`, `skills`, `rules`, `plugins`, `hooks.json`, `config.toml`, and a global `AGENTS.md` if one is ever added).
- **Parity cannot be measured.** Prompt parity is byte-checked, but this hidden Codex context is neither controlled nor recorded, so two Codex runs on different days, or on Sam's and a colleague's machines, can differ with identical prompts.

**Change.**
- **The pipeline-owned `CODEX_HOME`** (the critic's fix, taken in full) is `tools/codex/home/`. It holds:
  - `config.toml`, committed, with no MCP servers, plugins, notify, memories or skills, and an explicit model;
  - `hooks.json` (P5);
  - `auth.json`, symlinked at run time and never committed.
- **`--check`** prints the effective model, effort, sandbox default and CLI version.
- **`--self-test`** checks `exec --help` **and** `exec resume --help` for every flag used.
- **The live canary** (12.2 item 4) asserts four things:
  - the effort and model read back from the session header or the `--json` session event;
  - a resumed `read-only` session refuses a write;
  - `-o` is written under `read-only`;
  - the `--json` session id matches the text log's.
- **The records.** `runner.json` and every Codex receipt record `codexVersion`, `model`, `effort` and a hash of the effective config. `tim backlog compare` fails on a mismatch between the parity runs.
- **Text corrections.** 8.3's "No rules load by themselves" becomes "No workspace rules load by themselves; the pipeline's Codex home loads nothing else", and 0.4's claim is qualified the same way.

### P10 (minor). The Claude adapter forbids hand-written receipts, and accept verifies receipt integrity

**Current decision.** 8.2 Claude adapter text.

**Problem.** codex.md's adapter said "Never write output.json or receipt.json yourself." DESIGN's does not. A Claude agent that fails accept three times, or hits the lock exit, could write `receipt.json` with the Write tool, and the script trusts "only the small receipt". The done gate re-reads from disk, but it cannot tell a hand-written receipt from tim's.

**Change.**
- **The adapter line.** Add codex.md's sentence verbatim to the Claude adapter, and to the Claude profile.
- **Integrity checks.** `stage audit` checks that each receipt's `outputSha256` equals the hash of `output.json`, and that the receipt carries an `acceptRun` token. The token is an HMAC of the task id and output hash, under a key held in `build/.accept-key`, which is gitignored and created by `run start`. So a receipt tim did not write fails the audit.
- **The guard.** `guard-edits` already denies agent writes outside allowed paths. Add `**/receipt.json` and `**/output.json` under `build/runs/` to its deny list; this is owed to Sam, since hooks are protected.

### P11 (major). The parity proof takes codex's measures DESIGN left out, above all Claude usage in the Codex run

**Current decision.** 8.10 measures and bar (S4 default A).

**Problem.** R6's reason for existing is "The purpose is to save Claude usage". DESIGN's proof never measures Claude usage in the Codex run. codex.md did: "Claude usage in the Codex run: agent count by tier (Haiku only expected)". DESIGN also dropped four of codex's measures:
- **granularity:** task counts per role equal;
- the verifier's confirm rate and the fixer's applied rate;
- `completed` and `notReached`;
- codex's absolute bar: "no confirmed critical or major finding in either final diff under cross-examination". The 90/80 relative bar can pass two equally weak reviewers.

**Change.** Add to 8.10's measures:

| Measure | How |
|---|---|
| Granularity | Task counts per role are equal |
| Claude usage in the Codex run | Agent count by tier, from the workflow result |
| Accept attempts | `attemptsToAccept` per role (P2) |
| Completion | `completed` rate and the size of `notReached` (P3) |
| Rates | Verifier confirm rate and fix applied rate |
| Codex configuration | Recorded version, model and effort (P9) |

Add to the exact bar:
- task counts equal;
- the Codex run spawned no Sonnet or Opus agent (P8);
- every review receipt `completed`;
- no confirmed critical or major finding in either final diff under cross-examination, alongside the 90/80 thresholds.

A failed measure is written as a discovered hygiene increment against the named profile, brief or stage through `tim backlog discover`, as codex.md did. It is not only a line in `report/parity.md`, so the fix is tracked.

## Not grafted, and why

- **`tim build` running the lifecycle itself** (codex 7.4 step 4). Rejected on operability, not cost. The hooks must see pushes, and nothing may outlive a Bash call. P1 takes the decision logic and leaves the effects in watchers.
- **Codex's `run-batch.sh` as a second script.** DESIGN's single `run-stage.sh` over a stage folder does the same job, with the critic's lock and progress-based loop.
- **Codex's plan on `workspace-write`.** DESIGN's `read-only` plan, returning `planMarkdown` through `-o`, is better: a planner has no reason to write.
- **Acceptance inside the review fan-out** (codex 7.5 stage 8). DESIGN's separate acceptance stage after the ladder and E2E judges the finished change against the row. That is better in use.
