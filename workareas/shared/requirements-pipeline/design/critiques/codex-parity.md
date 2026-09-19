# Critique: Codex parity

Lens: I walked one product increment (frontend, backend and tests repo, R7) through stages 0 to 28 on paper twice: once under the `claude` preset and once under `codex`. At each stage I asked whether Codex got less context, fewer reviewers, a weaker schema, fewer rules or best-practice files, no persona files, or a weaker recovery path, and whether switching executor needed a backlog edit. I checked the Codex mechanics against `.claude/workflows/increment-build-loop.js:683-825`, `.claude/workflows/codex/{implement,review,fix}.md`, `.claude/settings.json`, `~/.codex/config.toml` and the backend `pom.xml` files.

What holds up: the per-file review fan-out is the same for both executors, personas are read by path, the preset table gives Codex every heavy role, the review roles run read-only, `run.json` sits outside the backlog, and `codex` is reached through `tools/**`, which is allowlisted (`.claude/settings.json:63-64`). The findings below are the places where parity breaks anyway.

---

## Blockers

### B1. A Codex draft that fails `stage accept` can never be fixed. Claude gets three tries.

- **Where:** 4.5 `stage accept` step 7 (DESIGN.md:909), 8.2 Claude adapter (:1913-1918), Codex adapter (:1929-1933), `run-stage.sh` input rule (:1939).
- **Problem:** `stage accept` does more than check the schema. It also:
  - cross-checks ladder claims against the `.exit` files;
  - cross-checks changed files against the manifest;
  - refuses "pre-existing" without a `baselineRef`;
  - checks tree fingerprints.

  A Claude task sees the problems and "corrects its draft and retries, at most three times". A Codex task has no such path:
  - the watcher runs `accept --stage` once, after `run-stage.sh` exits 0 or 1;
  - `run-stage.sh` "runs only tasks whose executor is `codex` and which have **no `output.draft.json`**".

  So a rejected Codex draft stays on disk, the runner skips that task forever, and the task never gets a receipt. The stage audit then holds the increment, for example `review-failed`, where the same stage on Claude would have recovered. Codex fails more often on the stages whose checks are semantic (ladder-repair, ci-fix, e2e-repair, acceptance), because `--output-schema` can express none of those checks.
- **Fix:**
  - On rejection, `stage accept --stage` moves the draft to `rejected-<n>.json` and writes the problems to `input/extras/accept-problems-<n>.json`.
  - It then marks the task `needs-correction` in `runner.json`.
  - `run-stage.sh` treats a `needs-correction` task as unfinished. It resumes the task's own session (`codex exec … resume <id> "Your result was rejected by stage accept. Problems: <file>. Correct it and emit the whole result again."`), up to three times, which matches Claude's limit.
  - The watcher loops `run-stage` then `accept` until accept is clean or the correction budget is spent.
  - `--self-test` gains a case: a fake draft that is valid under the schema but fails a semantic check, then a corrected resume.

---

## Majors

### M1. Codex's implementer, fixer and repairers cannot run the checks that prove their own work. Claude's can.

- **Where:** 7.4 stages 11, 17, 19 and 25 (DESIGN.md:1588, 1594, 1596, 1602), 8.4 "Where commands run" (:2017), 8.2 slice deadline (:1951-1952). The source briefs being moved: `codex/implement.md:83-87` ("run `mvn verify`"), `:123-132` (browser suites cannot start: "Chromium is refused its Mach port"), and `codex/fix.md:45-53`.
- **Problem:** The design keeps rungs in watchers "whatever the preset", but the model tasks still self-verify, and there the two executors differ a lot:
  - **Browser suites.** A Claude doer implementing an R7 slice can run the new Playwright or `test:fit` spec it just wrote and iterate until it passes. Codex cannot start Chromium in its sandbox.
  - **Backend integration tests.** Every backend here uses Testcontainers: `grep -l testcontainers` matches the `pom.xml` of animals-backend, plants-backend, address-book and reference-data. By the design's own statement, "the Codex sandbox does not reach Docker". So Codex cannot run the `mvn verify` its brief tells it to run.
  - **Long suites.** Any suite that runs past the 540-second slice deadline is killed mid-run. The resumed session starts the suite again from the beginning, so a slow suite can use up all five slices.

  The result is that Codex hands work with unproven integration tests and E2E specs to stage 19. There a repair task, also Codex and also blind, gets at most three attempts across the whole ladder. R7 makes an integration proof mandatory for every product increment, so this hits every product increment, not an edge case. The parity bar's "identical ladder results" would measure how much repair budget each side used, not how good the work was.
- **Fix:** Make self-verification symmetric and run it outside the sandbox:
  1. Add a stage 11b, "implement check". A watcher runs, through `run-rung.sh`, the browser rungs and Docker-backed rungs for the files the implement task changed.
  2. On red, it resumes the same implement task with the rung's log and `test-results/*/error-context.md`: `codex exec resume` for Codex, a follow-on agent given the prior summary for Claude. It allows N rounds, and the same N for both executors.
  3. Apply the same pattern to fix, ladder-repair and e2e-repair: a watcher re-runs the rung after each repair attempt, for both executors.
  4. Tell both executors' briefs that watchers run browser and Docker rungs. This stops Claude doers from quietly getting an advantage, and makes the parity proof compare work quality rather than sandbox reach.

### M2. Moving `codex/*.md` into neutral briefs either weakens Claude or loses Codex's hard-won lessons.

- **Where:** 2.2 row "Stage briefs" (DESIGN.md:220), 10 retire table (:2361-2362), 8.3 profile table (:1985-1992).
- **Problem:** `implement.md` and `fix.md` are moved by `git mv` to become the neutral stage briefs, but both contain Codex-only content:
  - "Browser-driven suites are not yours to run … cannot start under your sandbox" and "Do not attempt a sandbox bypass" (`implement.md:123-132`, `fix.md:50-53`);
  - "Always report, even if you did not finish" (`review.md:119-123`), which is the Codex lesson about the final message.

  The 8.3 profile table has six rows and carries none of these. If they stay in the neutral brief, Claude doers are also told not to run browser suites, so parity is reached by making Claude worse. If they are removed, Codex loses the lessons, and a Codex implementer tries Playwright, fails at launch, and reports `ok: false` or burns its self-repair budget. The same applies to the loop's framework-assertion exception at the ladder (`increment-build-loop.js:1405-1415`), which exists because "the implementor cannot run" browser suites.
- **Fix:** Before inc-014 moves the files, sort every sentence of the three Codex briefs into one of three groups:
  - neutral, which stays in the stage brief;
  - Codex-only, which moves to `executors/codex.md`: the sandbox limits, "emit your final message even if unfinished", and no sandbox bypass;
  - Claude-only, which moves to `executors/claude.md`.

  Record the sort as a table in the inc-014 plan. Then add a contract test that fails if a neutral brief contains the words "sandbox", "Codex", "GUARD RAILS" or "Write tool".

### M3. Codex gets rules only for planned files. Claude gets rules for every file it touches.

- **Where:** 7.4 stage 10 "Routing (planned files) → implement `standards.json`" (DESIGN.md:1587), 8.6 "Who reads what" (:2082-2085), rules probe conclusion 1.
- **Problem:** A Claude implementer or fixer gets the matching `.claude/rules` file natively whenever it reads any file, including one the plan never named: a spec in the tests repo it decides to update (the `implement.md:97-103` rule about the preceding page's E2E spec is exactly this case), a Java record, or a new `copy.cy.js`. Codex gets only what `standards.json` lists, and for implement that list comes from the planned files. Stage 13 re-routes changed files for the reviewers, but by then Codex has already written the file without its rules. Fix, ladder-repair and ci-fix are the same, and those tasks routinely touch files no plan named.
- **Fix:**
  - For every writing task (implement, fix, the three repairs), `standards.json` is the union of the planned-file routing and the repo-level routing (stage 7) for every repo in the surface. `tim backlog rules --repo-level` already exists for this.
  - Stage 13 writes a `rulesGap[]` record: changed files whose matching rules were not in the writing task's `standards.json`.
  - The stage audit fails on a non-empty gap for either executor.

### M4. The watcher's 12-call limit does not grow with the number of tasks, and slice counting penalises tasks that start late.

- **Where:** Codex adapter "at most 12 calls in all" (DESIGN.md:1931), slices (:1951-1953), `codexParallel: 4` (:1726), `reviewCap: null` (:1728), Claude concurrency 16 (:1922), and 7.4 stage 14 "a missing receipt retries that task once" (:1591).
- **Problem:** Codex review runs 2F + 1 tasks, four at a time. A combined R7 increment of 30 changed files is 61 tasks. At a realistic 5 to 8 minutes per Codex review of the full standards list, that is about 15 waves: over 75 minutes, or 9 to 14 calls of 540 seconds. The limit of 12 runs out on exactly the large, full-stack increments R7 produces. The design never says what happens when the watcher reaches 12 with `run-stage.sh` still returning 75.

  Separately, the deadline is 540 seconds from the start of the call, not from the start of the task, and every task running at the deadline is killed and counted as having used a slice. A task that starts 20 seconds before the deadline therefore uses one of its five slices on 20 seconds of work.

  Finally, Claude's "missing receipt retries that task once" has no Codex equivalent: a Codex task that failed after five slices has no draft, but `runner.json` already counts it as failed.
- **Fix:**
  - Make the watcher loop while `runner.json` shows progress: at least one new draft since the last call. Stop after two calls in a row with no progress, not after a fixed count. Report 75 at the cap as a named stop, `codex-stalled`, never as success.
  - Count slices by the wall-clock time each task has used (fail at 5 × 540 seconds of that task's own runtime).
  - Start no new task in the last 60 seconds of a call.
  - Give failed tasks one fresh start, with a new session and a reset slice count, matching Claude's retry.
  - Allow `codexParallel` per sandbox mode, for example 8 for read-only and 2 for workspace-write. Four concurrent read-only reviews is an arbitrary throttle compared with Claude's 16.

### M5. Nothing stops two `run-stage.sh` processes from running on the same stage folder.

- **Where:** 8.2 `run-stage.sh` (DESIGN.md:1937-1969), 4.3 locks (:873), which cover only tim's canonical files.
- **Problem:** The Codex watcher is a Haiku agent told to pass `timeout 600000`. The loop's own experience (`increment-build-loop.js:746-759`) is that these calls are moved to the background when the timeout is missed or too short. Also, when a watcher agent dies, `agent()` returns null and its foreground child is not guaranteed to die with it. Either way, a second call to `run-stage.sh` (the next slice, or a relaunched run resuming from receipts) sees tasks with no draft and starts a second `codex exec` for the same task. For implement or fix, which have workspace write access, that means two Codex sessions editing one working tree at once. A Claude task has no equivalent failure mode, because one `agent()` is one task.
- **Fix:**
  - `run-stage.sh` takes an exclusive lock with `mkdir <stageDir>/.run.lock` and writes `{pid, startedAt}` into it.
  - A live lock exits with a new code, 3, meaning "already running: do not start another".
  - A stale lock, whose pid is gone, is broken with a note in `runner.json`.
  - Per task, before starting Codex, it records the child's pid and refuses to start a task whose recorded pid is still alive.
  - Add both cases to `--self-test`.

### M6. Every `codex exec` inherits Sam's personal Codex configuration, so Codex runs can't be reproduced or bounded.

- **Where:** 8.2 start command (DESIGN.md:1943-1946), 8.4 "The Codex model is the CLI's configured default unless `run set codex.model`" (:1996), receipt (:1900-1903).
- **Problem:** `~/.codex/config.toml` today sets:
  - `model = "gpt-6-astra"`, `personality = "pragmatic"` and a `notify` program run on every turn;
  - MCP servers: `idea` at `http://127.0.0.1:64342`, which failed to connect in this very session, and `node_repl` with `startup_timeout_sec = 120`;
  - the `browser` and `computer-use` plugins.

  Every task and every resumed slice starts these MCP servers, which can take up to 120 seconds of each 540-second slice. MCP servers and plugins also run outside the Codex sandbox, so the "read-only" review roles can act through tools the sandbox does not cover. Only the tree fingerprint would notice, and only inside repos.

  The receipt records `tier: medium`, never the model or CLI version. So `tim backlog compare` cannot tell whether the left and right runs, or two slices of one task, used the same model. Sam changing his config between inc-027 and inc-028 would quietly invalidate the parity proof. The prompt-parity check also compares `prompt.md` only, and ignores the personality and tool instructions the user config adds on the Codex side.
- **Fix:**
  - `run-stage.sh` runs Codex against a pipeline-owned configuration: a `CODEX_HOME` under `workareas/` with `auth.json` symlinked and a minimal committed `config.toml`, with no MCP servers, plugins or notify, and with the model named explicitly. Alternatively, pass `-c` overrides that clear `mcp_servers` and plugins, if the CLI supports that, which the self-test must prove.
  - `runner.json` and the receipt record `codex --version` and the model from the `model:` line of the exec header.
  - `compare` treats a model or version mismatch between sides as a failed measure.
  - `--check` reports the effective configuration.

### M7. Codex-orchestrated mode (8.11) stops at the first dependent product increment, and never says what sandbox it runs in.

- **Where:** 8.11 (DESIGN.md:2186-2204), 3.9 buildability rule 4 "every `dependsOn` increment is `done`" and rule 5 "no hold" (:537-541), 0.3 "Lifecycle stays in Claude watcher agents … so every per-call hook sees every push" (:78).
- **Problem:**
  1. **It stalls.** A product increment waits at the `proof-owed` hold, and `next` withholds anything that depends on it. So "delegate this batch to Codex" builds one increment per dependency chain and then stops at `none-buildable`. That is the opposite of R6's "no hand-holding".
  2. **The ladder is left out.** Stage 19 browser rungs (`test:fit`) need Chromium just as much as stage 25 does. In this mode they go red as `ladder-red`, not `proof-owed`, and nothing marks them as owed.
  3. **The session's sandbox is never named.** The orchestrating Codex session must push, call GitHub and Jira, commit state on `delivery.stateBranch` in the workspace repo, and start nested `codex exec` processes that write `~/.codex/sessions` and need network. A workspace-write sandbox cannot do the nested Codex writes outside the workspace. A full-access session can reach Docker and Chromium, in which case the `proof-owed` hold is unnecessary.
  4. **"Through `run-stage.sh` or directly"** lets the orchestrating session do a task inside its own context. A plan audit, verify or fix-verify done that way is not "a different task", and the receipt cannot tell the difference.
  5. **The push safeguards are gone.** Pushes by a Codex orchestrator bypass `guard-bash` and the push hook, which contradicts the safety argument in 0.3.
- **Fix:**
  - Name the required mode: the orchestrating Codex session runs with full access, which the handover states and `--check` verifies.
  - Remove "or directly": every model task goes through `run-stage.sh`, so every task is a separate session with its own receipt.
  - Replace the `proof-owed` hold with a per-criterion `owed` mark that does not withhold dependants. The done gate stays closed (the increment is `landed`, not `done`), while `next` treats "landed with proof owed" as satisfying `dependsOn` for build ordering only. Add browser ladder rungs to the owed set.
  - State in 8.11 which 0.3 guarantees this mode gives up, and have the Codex handover run `guard-bash`-equivalent checks through a committed pre-push script.

### M8. Unblocking Codex-orchestrated mode requires a backlog edit, which breaks R5.

- **Where:** `decisions-for-sam.md:147-148`: "To reverse: set `delivery.crossRepoE2e` so the workspace PR's end-to-end check counts as the proof. That is one ruling." 3.14 classes `delivery` as a backlog field, a ruled policy (DESIGN.md:750). 7.4 integration proof (:1610).
- **Problem:** R5 says "switching executor part-way through a backlog must need no backlog edit". The only way the design offers to let Codex-orchestrated builds move past `proof-owed` is to change `delivery` in `backlog.json`, through a ruling. The change is made because of which executor is driving, so executor-driven configuration has leaked into the backlog. req-024's hash check would not catch it, because the edit goes through `rule`, not `run bind`.
- **Fix:** Move the choice of where the integration proof may come from (local stack, or the workspace PR's CI against branch-tagged images) into `build/run.json` as `quality.integrationProofSource: local | ci | either`, where it is set per run. Keep `delivery` purely about branches, PRs and merges. Then 8.11's handover can set `either` with no backlog write, and req-024's acceptance extends to cover a switch into Codex-orchestrated mode.

### M9. The reading audit parses Codex's human-readable log, but the parity bar requires it to be exact.

- **Where:** 8.10 "Reading … against the read commands in Codex logs" (DESIGN.md:2168), the bar "no unread 'must' file on either side" must hold exactly (:2176), req-084.
- **Problem:** `log.txt` is plain `codex exec` stdout and stderr, appended across resumed slices. Codex reads files with `sed -n '1,200p'`, `cat`, `nl`, `head`, `rg -n` and heredoc scripts, and the plain-text format shortens long commands and output. A text parser will produce two kinds of error:
  - false misses, such as two partial `sed` ranges, or a read inside a `for` loop;
  - false hits, such as `rg -l pattern file` counted as a read.

  Claude's side is structured transcript JSON. With an exact bar, how accurate the parser is decides whether Codex is called equal.
- **Fix:**
  - Run `codex exec --json` and write the event stream to `events.jsonl` next to `log.txt`. The session id is then taken from the structured `thread.started` event, not by grepping.
  - `audit-reading` reads `command_execution` items and counts a file as read only when a command's output covers its full line range, or covers it cumulatively across commands. Apply the same rule to Claude `Read` calls with `offset` and `limit`.
  - Add fixture tests for `sed` ranges, `cat`, `rg -l` and a loop.

### M10. Nothing proves the zod source and its Codex-strict export accept the same drafts.

- **Where:** 4.5 `stage schemas` (DESIGN.md:920), 8.1 "optional values nullable" (:1880), 8.3 Codex profile "`null` for anything that does not apply" (:1990).
- **Problem:** Codex is forced by `--output-schema` to emit every key, with `null` for the ones that are optional. `stage accept` validates against the zod source. If a zod field is `.optional()` rather than `.nullish()`, every Codex draft that uses `null` there fails accept, for every task of that stage, every time. Claude drafts, which leave the key out, pass. The loop's relay has exactly this mismatch today ("omit `line` where Codex returned null", `increment-build-loop.js:698`). With B1 in place this only costs a correction round, but it is systematic. Also, any zod `.refine`/`.superRefine` rule is invisible in the exported schema, so only the Claude side learns about it, from accept's messages.
- **Fix:** Add a contract test, per stage schema:
  - generate a document that is valid under the export and has every nullable field set to `null`, and assert zod accepts it;
  - generate a minimal valid zod document and assert it passes the export's validator after normalisation.

  Forbid `.refine` in stage schemas, or list each refinement in the stage brief, which both executors read, so the rule is stated in a way both executors can see.

---

## Minors

### m1. The persona seam leaves in place a rule that contradicts the "must" list.

`review/references/FILE_REVIEWER.md:71-81` says the per-PR bundle "is the single source. Don't walk `.review-meta.json` or read individual `docs/best-practices/*.md` files". But `standards.json` hands both executors individual best-practice files as "must" reads (8.6), and the 8.5 seam table (DESIGN.md:2048-2054) has no row for this instruction. Claude still gets the rules injected. A Codex reviewer that obeys the persona reads nothing, and the reading audit fails it.

**Fix:** Add a seam row: "Best-practice source → the files listed under `must` in `input/standards.json`, which replace the per-PR bundle".

### m2. The memory index is required reading only by implication, for Codex.

Claude workflow agents receive the auto-memory index at start (0.4). It holds about a dozen code rules beyond the four house rules: test behaviour not implementation, no per-enum tests, Java record null guards, REST nouns, no display logic in the model, never seed journey tests. Codex sees them only if it reads the index. 8.6 lists `memory` in the rules output, but never says it is "must".

**Fix:** Put the memory index in every writing and reviewing task's `must` list for both executors, and have the reading audit check it.

### m3. Killing a process group may leave grandchildren running.

At the deadline, `run-stage.sh` "stops every child it started, by process group" (DESIGN.md:1952). Codex runs its tool commands under the sandbox wrapper, and they may not share Codex's process group. So `mvn`, vitest workers or a Testcontainers-started Docker container can outlive the slice, holding ports and `target/` locks when the resumed session re-runs the suite.

**Fix:** Kill the whole descendant tree, walking `pgrep -P` recursively, and add a fake-codex self-test that spawns a grandchild in a new process group.

### m4. The self-test checks the flags of `exec --help` but not those of `exec resume`.

The runner depends on `resume` accepting `-o`, `--output-schema` and `-s`, all placed before the subcommand (`increment-build-loop.js:767-768`).

**Fix:** Have `--self-test` also check `codex exec resume --help`, and run one real no-op resume against the installed CLI under `--check`.
