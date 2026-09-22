# Critique: feasibility under the rails

18 September 2026. Lens: can each mechanism actually run under the guard hooks, the allowlist, the Workflow runtime, tim's rails and Codex? Checked against `.claude/settings.json`, `.claude/hooks/guard-bash.sh`, `.claude/hooks/guard-edits.sh`, `tim/CLAUDE.md`, `tim/package.json`, `tim/src/cli.js`, `increment-build-loop.js`, FA on `feat/NO_JIRA-frontend-alignment`, `tools/style/bake-rules-bundle.sh`, `scripts/sonar/sonar-record-push.sh`, the header of `design/backlog.json`, and the workspace's memory notes on executables and prompts.

Two blockers, eight majors, five minors.

---

## Blockers

### B1. Pinned tools are not allowlisted, so "no allow rule needs adding" is false

- **Section:** 7.12, 4.6 (`pin-tools.sh`), 8.2, 9.2 "Owed to Sam", decisions-for-sam "Owed to you".
- **Problem:** with `toolPin: launch-commit`, "`prompt.md` points at briefs, profiles and bash tools inside the pin" (7.12 step 4). So watchers run `~/git/defra/trade-imports-workspace/workareas/clones/pipeline-pin/tools/codex/run-stage.sh`, `.../tools/backlog/run-rung.sh` and `.../skill-routing.sh`. The allowlist covers only `Bash(~/git/defra/trade-imports-workspace/tools/**)` and `scripts/**` at the root (`settings.json` allow list). Every pinned tool call therefore raises a permission prompt in a headless workflow agent. Agents cannot fix this, because `guard-edits.sh` blocks edits to `settings.json`. FA already records the constraint: "the allowlisted helper scripts are always read from the root, because the permission allowlist names tools/** at the root path only" (FA:73-76).
- **The alternative also fails.** Running the root copy while the increment edits it gets denied by `guard-bash.sh` check 2: "differs from HEAD … Commit the change before executing it". That is exactly the case the pin exists for, because this programme edits `tools/codex/`, `tools/backlog/` and `run-rung.sh` from inc-025 onwards.
- **Evidence:** `settings.json` allow entries 1 to 4; `guard-bash.sh:106-129`; FA:73-76; DESIGN 7.12 step 4; DESIGN 9.2 "No allow rule needs adding".
- **Fix:** pin only tim, which is reached through the allowlisted `npm --prefix ~/git/defra/trade-imports-workspace/*:*` form, and pin briefs and profiles as read-only files. Pinned bash tools need one of two things:
  - Sam adds `Bash(~/git/defra/trade-imports-workspace/workareas/clones/pipeline-pin/tools/**)` and its `:*` twin to `settings.json`. List this under "Owed to Sam" and remove "No allow rule needs adding" from 9.2 and from decisions-for-sam.md.
  - Or a self-hosted increment that changes a bash tool must commit that tool before any stage that calls it. The pin then covers tim only.

  Add a preflight in stage 0: dry-run one pinned tool with `--check` and stop with `environment` if it would prompt.

### B2. Tree fingerprints and dirty checks cannot pass on the live workspace checkout

- **Section:** 4.5 `stage accept` step 5, 4.2 `heads --strict`, 4.5 `stage manifest`, 11.1 step 3 (self-hosting from inc-025).
- **Problem 1: other sessions' files.** A read-only stage fails when "HEAD plus `git status --porcelain`" differs between prepare and accept, and `heads --strict` "exits 1 … on dirty-at-start". The design drops FA's `checkouts: 'clones'` mode, so every build runs on the live workspace checkout and the live `repos/*`. The workspace checkout carries other sessions' untracked files under the tracked `workareas/shared/`: this session's git status shows 11 `??` entries, and memory notes parallel sessions and "repos/ checkouts move mid-session". Every self-hosted increment (repo `workspace`, path `.`) therefore starts `dirty-tree`. Any parallel session writing under `workareas/shared/` during a read-only stage fails it. Three holds in a row trip `systemicHaltAfter`.
- **Problem 2: the build's own state files.** During a self-hosted increment the workflow itself writes tracked files inside the same repo between prepare and accept: `build/state.json`, `build/journal.jsonl`, `build/plans/<id>.md` and `backlog.json` (all tracked, 3.1). Accept step 4 writes the plan and state before step 5 compares fingerprints. The workspace repo's `generated[]` in `design/backlog.json` lists only `tim/package-lock.json` and `workareas/**/report/*.html`. So the manifest also hands the programme's own state files to per-file style and code reviewers.
- **Evidence:** DESIGN 4.5 steps 4 and 5, 3.1 table, 4.2 `heads`; `jq .repos design/backlog.json`; the gitStatus snapshot; FA:31-45 and FA:77-79 (the clones mode the design drops).
- **Fix:**
  - Scope every fingerprint and dirty check to tracked paths (`--untracked-files=no`) and to the increment's plan and manifest paths.
  - Exclude the programme workarea (`workareas/shared/<p>/**`) from the workspace repo's fingerprint, dirty check and manifest by rule, not by per-programme `generated[]`.
  - Bring back FA's `clones` checkout mode as a `run.json` knob, and make it the default for self-hosting, so a build never shares a tree with Sam's live sessions.

---

## Majors

### M1. The exec-bit recipe is missing its checkout step

- **Section:** 4.6, last paragraph.
- **Problem:** "New scripts are committed with the execute bit set through git before any agent runs them (`git add --chmod=+x`)". That sets the mode in the index only. The Write tool creates files as 644, and `chmod` is denied. So the working tree stays 644, `git diff HEAD` shows a mode change, and `guard-bash.sh` check 2 denies the script as "differs from HEAD".
- **Evidence:** memory `reference_write_tool_drops_execute_bit.md` and `reference_new_executables_chmod_and_guard.md`, which need `update-index --chmod=+x` and then `git checkout -- <path>`, plus a check that the commit says "create mode 100755". Also `settings.json` deny `Bash(chmod *)`.
- **Fix:** state the full four-command sequence (add, update-index `--chmod=+x`, commit, `checkout -- <path>`) in 4.6 and in every increment that adds a tool: inc-001, inc-015, inc-017, inc-021 and inc-024. Make `tools/backlog/self-test.sh` fail if any `tools/backlog/*.sh` or `tools/codex/*.sh` is not 100755 at HEAD.

### M2. `script` ladder rungs either fail or get round guard check 2

- **Section:** 3.3 Repo `ladder[]` (`tool: script`), 4.6 `run-rung.sh`, 7.4 stage 19; the workspace ladder in `design/backlog.json` (`tools/backlog/self-test.sh`).
- **Problem:** stage 19 runs before land (stage 22), so a rung script the increment created or edited is uncommitted when it runs.
  - Invoked directly, `guard-bash.sh` check 2 denies it.
  - Invoked as a child of the committed `run-rung.sh`, the guard never sees it. A Write-created file is 644, so it fails with "permission denied" and is recorded as a red rung, not `skipped-undefined`. If `run-rung.sh` works round that with `bash <file>`, the result is the write-then-execute laundering the guard was written to stop ("a denied `node scan.mjs` was re-run by copying the script into an allowlisted scripts/** path", `guard-bash.sh:5-6`). Memory `feedback_never_bypass_deny_rules` forbids that.
- **Fix:** `run-rung.sh` refuses a `script` rung whose path is uncommitted or differs from HEAD, recording `could-not-run:uncommitted`. Move the workspace's self-test behind a named npm script (for example `tim` `test:tools`, which runs `tools/backlog/self-test.sh`), because named npm scripts are the sanctioned route for running changed code (`feedback_pipeline_calls_named_ci_script`). Drop `tool: script` from the v2 schema, or limit it to rungs the increment cannot touch.

### M3. Concurrent `stage accept` calls collide on the state lock

- **Section:** 8.2 Claude adapter, 4.3 Lock, 4.5 `stage accept` step 4.
- **Problem:** in the Claude adapter, each per-file task agent runs `tim backlog stage accept` itself, up to 16 at once. Accept "applies deterministic side effects … persists `state.plan` … records counts" into `build/state.json`, under a lock that retries three times and then exits 4 (`LOCKED`). The agent is told "If it prints problems, correct the draft and run it again, at most three times", but a lock timeout is not a draft problem. Under per-file fan-out, LOCKED exits are likely, so drafts get rewritten needlessly and receipts go missing. 4.3's "The workflows also serialise writes through one watcher at a time" contradicts 8.2.
- **Fix:**
  - Make per-task accept write only inside its own task folder (`output.json`, `receipt.json`), with no shared-state write. Move every shared-state side effect (plan persistence, counts, verdict application) into one `stage accept --stage <dir> --finalise` call that a single watcher makes after the fan-out.
  - Tell agents that exit 4 means "run the same command again, draft unchanged".

### M4. The manifest's `<base>` is undefined, and under `programme` delivery it grows every increment

- **Section:** 4.5 `stage manifest`, 3.3 Delivery `base`.
- **Problem:** "the files changed in `<base>...HEAD`". Under `programme` delivery (the default, and this programme's), `delivery.base` is `main` and the branch accumulates every earlier increment. Each increment's manifest then contains every file changed since `main`, including earlier increments' code and every state commit. The stage audit then demands a style and a code task for each of them, so the review cost and the agent count grow with every increment toward the 850 ceiling.
- **Fix:** define the base as the attempt's pinned baseline heads (`state.heads`, stage 4) per repo. Record it in `stage.json` so the audit re-derives the same set.

### M5. Word sources have no allowlisted converter, and the default canary needs them

- **Section:** 5.10 (Word row), 5.2 phases 2 and 3, 9.2 S6 default A ("exercises Word, design-board and Jira sources").
- **Problem:** the design assigns conversion to `unzip -p <file> word/document.xml`, then marking `</w:p>` and similar tags "before stripping tags", which is a sed pass (`SOURCE_EXTRACTOR.md:29, 125-126`). `unzip` is not allowlisted, so a workflow watcher gets prompted. The sed and redirect chain breaks the GUARD RAILS (no sed or awk, one command per call). `tim backlog source acquire` cannot do it either: tim has no zip library, and the new-dependency list names only `picomatch` and `acorn` (4.7).
- **Fix:** give conversion to tim, which is library-first: add a zip dependency such as `fflate` or `jszip` to the 4.7 ledger, and make `source acquire --kind docx` write `raw/<id>.txt` with paragraph, row and cell markers, tested on a fixture. Alternatively, add a committed `tools/backlog/docx-to-text.sh` to the new-file ledger. Prove it in inc-030, not first at the inc-038 canary.

### M6. Codex write tasks can edit the guard config, and nothing refuses it

- **Section:** 8.2 "Where each Codex task may write" (workspace-write, working directory the workspace), 8.7 row 2, 4.5 manifest.
- **Problem:** implement, fix, ladder-repair, ci-fix and e2e-repair run Codex with write access to the whole workspace. `guard-edits.sh` never runs for Codex, so a Codex task can change `.claude/settings.json`, `.claude/settings.local.json` or `.claude/hooks/**`. 8.7 says Codex "is fenced by its sandbox, the manifest and tree fingerprints". But for write stages the manifest only lists such a change as one more file to review, and no rule refuses it. The next Claude agent would then run under weakened guards.
- **Fix:**
  - `stage manifest` and `stage accept` refuse, and hold as `secrets-red` or a new reason `guard-touched`, any change by any task, of either executor, under `.claude/settings*.json`, `.claude/hooks/**` or any repo's `.git/hooks/**`.
  - Run Codex write tasks with `--add-dir` limited to the planned repos rather than the workspace root where the CLI allows it.

### M7. The reading audit cannot map a Claude transcript to its task

- **Section:** 8.10 "Reading" measure, 4.2 `audit-reading`, 7.7 `readingAudit`.
- **Problem:** the parity bar's exact check "no unread 'must' file on either side" depends on `audit-reading --transcripts <dir>` matching each Claude agent's Read calls to a task's `standards.json`. Two things are missing:
  - The workflow script has no clock, run id or session id, so it cannot tell tim where its transcripts are.
  - Nothing establishes that a workflow agent's transcript carries the `label` passed to `agent()`.

  Without a deterministic mapping, the exact check cannot be computed.
- **Fix:**
  - Make the adapter's first instruction "Read `<taskDir>/prompt.md`". The first Read in each transcript then names the task folder, which is a deterministic key.
  - Run `audit-reading` from the skill in the main session after the Workflow returns, passing the transcript directory the result names.
  - Prove the mapping on a two-agent fixture run in inc-019 before inc-028 relies on it.

### M8. inc-010 needs task identities that do not exist until inc-014

- **Section:** 11.1 step 2, 3.4 and 4.3 (the registered-run guard), 4.2 `verify-record`, req-081.
- **Problem:** inc-010 must record every atom's verification as "a registered run's task other than its author", and it is built by hand in the main session. Task identity, meaning task folders, `stage.json` and receipts, arrives with `stage prepare` and `accept` in inc-014, which depends on inc-005 and inc-012 but comes after inc-010. `backlog-distil.js` does not exist until m4. So inc-010 either invents task ids that the ingest guard cannot check, or cannot pass req-081's criterion "every verification names a registered run".
- **Fix:** specify inc-010's mechanism. Either:
  - make `tim backlog run start --mode verify` issue task ids (`run task add <label> --persona REQUIREMENT_VERIFIER --slice <s>`) in inc-008, for `verify-record` to check; or
  - move inc-010 after inc-014 and run the verifiers through `stage prepare` and `accept` from an inline main-session Workflow.

  Either way, say that the main session spawns the verifiers, because subagents cannot call Workflow.

---

## Minors

### m1. `npm run` prints its banner before tim's `--json` line

- **Section:** 7.12 step 3 (the pinned prefix).
- **Problem:** `npm --prefix … run tim -- … --json` prints npm's `> tim@0.0.0 tim` lines to stdout before tim's JSON, so any jq consumer and any "one JSON line" contract breaks.
- **Evidence:** `tim/package.json` `"tim": "node src/cli.js"`.
- **Fix:** use `npm --prefix … run --silent tim -- …` in the pinned prefix, and test that the pinned form's stdout parses as JSON.

### m2. The contract test's acorn call needs two options

- **Section:** 4.6 `workflow-contract.test.js`.
- **Problem:** workflow scripts use `export const meta` and a top-level `return` (`increment-build-loop.js:1925`). Plain acorn rejects the pair.
- **Fix:** parse with `sourceType: 'module'` and `allowReturnOutsideFunction: true`, and wrap the parse in a test fixture that uses both.

### m3. Rungs longer than 570 seconds can never pass

- **Section:** 4.6 `run-rung.sh`, 4.5 audit.
- **Problem:** a rung that outlives the guard is recorded `could-not-run:timeout`. The audit accepts only `pass` or `skipped-undefined`, so a long `mvn verify` with Testcontainers or a full tests-repo suite holds the increment forever, with no route out.
- **Fix:** let a rung declare `slices` or a narrower goal in the header. Or record the timeout as a hold (`environment`) with a release command, not a permanent red. Measure the backend `verify` time in inc-021.

### m4. Stage prepare's task list travels through an LLM watcher

- **Section:** 8.2 ("No agent relays a large JSON array").
- **Problem:** scripts cannot read files, so the fan-out list (task ids, directories, executors, tiers) from `stage prepare` has to be relayed by a Haiku watcher's structured output. For a 40-file increment that is an 80-plus-row array. The audit catches a dropped task later, but only as a hold.
- **Fix:** have `stage prepare` print a compact list plus a count and an sha256 of `stage.json`. Have the script check that the relayed count and hash match before it fans out.

### m5. Agents commit without the CLAUDE.md Sonar step, and no deviation records it

- **Section:** 8.7 and 7.4 stage 22 against CLAUDE.md rule 3 ("Before committing code changes: run `sonar analyze --staged`").
- **Problem:** the design rightly has no agent run `sonar`, because it is not allowlisted and `--staged` is unusable from agents (memory `reference_sonar_analyze_unavailable`). But the land stage commits without any recorded exception to a banned-action rule.
- **Fix:** add a `deviations[]` entry and decision to this programme's header: "agents commit without `sonar analyze --staged`; SonarCloud comes from the PR checks". Also note that the `PostToolUse` hook's `if: Bash(git push*)` never matches the refspec form `git -C … push` (`FA:125-128`), so 8.7's claim that the push hook "fires, because every push is by a Claude watcher" is false. Nothing depends on it, so correct the row.
