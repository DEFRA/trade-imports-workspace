# Requirements pipeline: decisions for you

> **Hand-written bootstrap view of `design/backlog.json` `questions[]` and `decisions[]`, 19 September 2026.** This page is not the record. Where it and the backlog differ, the backlog is right. From inc-025, `tim backlog report --decisions` generates this page from the JSON. Until then, inc-009 adds a check that its question ids, defaults and blocked increments match the backlog.

This page lists the six questions the design leaves to you, then the calls it made that you may want to reverse, then what is owed to you that is not a question.

- **Nothing is blocked.** One question must be answered by you, because it is a policy question about other people's words. It holds nothing up today, because the rule already in force keeps those words out of git.
- **The other five questions have a default in force.** Each default was applied as a recorded decision, and one line from you replaces it.
- **Two defaults change what gets built.** The increment that moves the house rules into a tracked document is deferred, and the increment that continues the DR1 union backlog is dropped. Each comes back if you rule the other way, with no further step: your ruling replaces the default, and replacing a decision first undoes everything it deferred, dropped, parked or rejected, before your option takes effect.

The design was re-decided on merit in use (R8, `corrections/r8-merit.md`) and corrected by a 70-change triage (`corrections/change-list.md`). DESIGN.md section 0.2 says which candidate each part now comes from, and why.

**How to answer.** Reply with one line per question, such as `q-house-rules-source: B`, followed by any words you want recorded. Your words are kept verbatim. An answer is recorded as tentative only when "?" comes straight after the letter ("B?"), or when you write maybe, probably, not sure or perhaps. Any other "?" in your words is just punctuation.

---

## 1. Must be answered by you

### May other people's words from transcripts, chats and emails be kept in git?

`q-conversation-retention` · policy · must be answered · blocks nothing today

**What is in play:** every conversational source other than your own brief: meeting transcripts, chat exports, emails and Jira comments by anyone else. Your own words are a brief, and they are kept in git like any written requirement. Other source kinds are not affected.

**Options:**

- **A, recommended: no. Other people's words stay on this machine; git holds where each quote came from and a paraphrase. This is the rule in force.** Nothing personal about anyone else enters git, but other readers cannot check a conversational quote for themselves. No source.
- **B: yes. Keep other people's words in git like any other source.** Every reader has the full evidence, and other people's words become part of the repository's history, which is hard to undo. No source.
- **C: do not accept conversational sources at all.** The conversation-sources increment (inc-031) is dropped, and decisions made only in conversation have to be written down somewhere else first. No source.

**If nobody answers:** nothing waits. The rule in force keeps other people's words out of git, and it cannot be relaxed until you rule. There is no default, because this is a policy question about personal data.

---

## 2. Has a default in force

Each default below was applied by the default rule and recorded as a `defaulted` decision. It takes effect now, and your answer replaces it.

### Where should the four house rules live, so Codex and people see them too?

`q-house-rules-source` · process · default in force: A (d-005) · recommended: B

**What is in play:** four rules that live only in your memory: remove explanatory comments, no migration comments, named helpers for pipelines, and names that say what a thing does. Every style review, implement and fix task reads them, on either executor. Judge 3 called their asymmetry the most important thing any candidate found.

**Options:**

- **A, in force: keep them in your memory, and point both executors at the memory files by path.** Both executors see the same rules. People using the code-style skill, CI and anyone else's builds still do not, and the increment that moves the rules (inc-016) is deferred. 1 constraint source.
- **B, recommended by judge 3: move them into a tracked best-practice document that the code-style bundles include.** Everyone and every executor sees the same rules. The code-style bundles change, which the team will notice. Ruling B undoes the default's deferral, so inc-016 is back in the queue at once. 1 decision-record source.
- **C: both.** As B, and your own sessions keep a memory entry that points to the tracked document. Ruling C also undoes the deferral. No source.

**Rows resting on the default:** 2 (the rule that both executors read the house rules by path, and the rule that moves them into a tracked document).

**Why the default is not the recommendation:** moving the rules changes the code-style bundles the whole team uses, a standard only you own, so it waits for your ruling. Option A already gives both executors the same rules, so parity is not affected meanwhile.

### Should the unbuilt part of the DR1 union backlog be built on the new path?

`q-dr1u-remainder` · scope · default in force: B (d-006) · recommended: B

**What is in play:** the DR1 union programme built 118 of its 161 increments. 37 are unbuilt: 34 blocked by rulings and 3 deferred. The other 6 were ruled out (5 dropped, 1 rejected), and they stay ruled whatever you decide. The record comes onto main as history either way (inc-002).

**Options:**

- **A: migrate the 37 unbuilt increments into a requirement backlog.** The new path can build them once their blocks are ruled, and the 34 blocked increments come back to you as questions in the new report. Ruling A undoes the default's park and drop, so the migration increment (inc-039) is back in the queue at once. 1 current-behaviour source.
- **B, recommended and in force: keep the record as history only, and build nothing more from it.** The migration increment (inc-039) is dropped until you rule otherwise. The findings stay readable on main. No source.
- **C: leave the record on its branch.** Nothing from DR1 comes onto main; the port brings only the alignment record, and the migration increment is dropped. No source.

**Rows resting on the default:** 2 (the port of the DR1 union record onto main, and the migration of its unbuilt work).

### What must Codex show before Codex mode is called equal?

`q-parity-bar` · process · default in force: D (d-007) · recommended: D

**What is in play:** the parity proof (inc-028). It builds three small full-stack changes on Codex and twice on Claude, then compares them.

**Options:**

- **A: fixed thresholds.** Every exact check passes, and Codex finds at least 90% of the fix-now findings Claude finds, with 80% judge agreement. A clear pass or fail, but fixed numbers cannot tell "as good" from "worse" without knowing how far two Claude runs already differ. 2 decision-record sources.
- **B: the exact checks only.** The review and judge numbers are shown but not required. Codex passes sooner, but a weaker reviewer could pass. No source.
- **C: Codex must match or beat Claude on every measure.** The strictest bar; ordinary variation between runs could fail it. 1 requirement source.
- **D, recommended and in force: a measured bar.** Every exact check passes, and Codex's fix-now recall and judge agreement fall within the spread between two Claude builds of the same canaries, with 90% and 80% kept as floors. "As good as Claude" is measured, not guessed, and every failed measure becomes a named fix. It costs one more Claude build of the three canaries. 1 requirement source.

**Rows resting on the default:** 1 (req-083, that Codex mode must be shown to meet the parity bar on three full-stack canaries covering the Node and Nunjucks, Java and Playwright routing families).

The ten exact checks are: prompts identical apart from the executor profile; no required standards file unread; the same ladder and acceptance results; the backlog unchanged; no missing receipt, so every task on both sides proves it ran; equal task counts per role; no Sonnet or Opus agent in the Codex run; every review complete; the same standards and one Codex configuration throughout; and no confirmed critical or major finding in either final change under cross-examination.

### What may the judges panel decide without you?

`q-panel-authority` · process · default in force: A (d-004) · recommended: A

**What is in play:** the distiller's panel of three judges and a chair. It rules on conflicts between sources that the precedence rules cannot settle. Every panel ruling is listed in the report, with the command that reverses it.

**Options:**

- **A, recommended and in force: the panel rules anything the sources, the precedence rules and your standing rulings can settle.** It escalates security, access control, data integrity, legal matters, policy and scope, anything that contradicts one of your rulings, and anything that would change work already built. Fewer questions reach you, and you see every call afterwards. 1 current-behaviour source, 1 decision-record source.
- **B: the panel only recommends.** Every conflict the precedence rules cannot settle comes to you with the panel's recommendation. More questions reach you: the plants digest needed 8 dockets. 1 current-behaviour source.
- **C: no panel.** Those conflicts come to you as plain questions, with no recommendation. This saves four agents per docket and a critic. No source.

**Rows resting on the default:** 1 (req-099, that a conflict source precedence cannot settle goes to the panel of three judges and a chair, which escalates anything outside its authority as a question).

### Which sources should the distiller's first real run be proved on?

`q-distil-canary-set` · process · default in force: A (d-008) · recommended: A

**What is in play:** the distiller's first real run (inc-038). It is compared with a known-good result, and every difference is explained in the report. It also counts how many of its increments are full-stack slices, against the plants digest's 47 frontend-only and 10 tests-only rows.

**Options:**

- **A, recommended and in force: the high-risk plants sources and the EUDPA-407 epic.** The run is compared with the plants digest's 40 conflicts, 84 decisions and 65 increments. It is a rich, fully ruled comparison that exercises Word, design-board and Jira sources. 1 current-behaviour source.
- **B: the live-animals prototype's sources**, compared with its ruled milestones. This is smaller, with fewer source kinds. No source.
- **C: a new small programme that you name.** It is real use from the start, but there is no known-good result to compare with. No source.

**Rows resting on the default:** 1 (req-108, that the distiller's first real run is compared with a known-good digest of the same sources, with every difference explained).

---

## 3. Calls we made that you may want to reverse

The design made these calls without you. Each is recorded in DESIGN.md.

1. **In the `codex` preset, the judge and acceptance run on Codex.** Only the watchers stay on Claude. This is a note in `presets.json`, not part of the backlog.
   To reverse: `tim backlog run bind <programme> --from next --preset codex-claude-checks --said "<your words>" --by sam --at <now>`. One command, no backlog edit.
2. **One consistency reviewer checks every repo an increment touches, with a verdict per repo and a contract check at each seam between them.** Two judges read the review skill as one reviewer per repo. The skill's own step 4 and your R7 say one reviewer across repos.
   To reverse: `tim backlog rule requirements-pipeline --subject conflict:c-002 --choose judge-1 --by sam --at <now> --words "<your words>" --note "<why>"`. It swaps in the held variant req-126, one consistency review per touched repo, and the stage follows the atom.
3. **The house-rules question has a default rather than being "must answer".** Judge 3 suggested must-answer. It is not a security, access, data, legal or policy question.
   To reverse: set the question's category to policy with one `tim backlog question set` command. It then has no default.
4. **Combining atoms into increments is applied automatically and reported, not proposed for approval.**
   To reverse: set `combine: propose` in the programme's `distil/CONTRACT.md`. That is one line.
5. **Every changed file gets both reviews, with no cap.**
   To reverse for one run: `tim backlog run set <programme> quality.reviewCap 12`. Files over the cap are listed as not reviewed. To make the cap a requirement: `tim backlog rule requirements-pipeline --subject conflict:c-003 --choose alignment-branch --by sam --at <now> --words "<your words>" --note "<why>"`, which swaps in the held variant req-127.
6. **This programme builds on one branch with draft pull requests, and nothing merges until you merge it.**
   To reverse: one `tim backlog rule` with a `set-delivery` effect, made before the first build.
7. **Increments up to inc-014 are built before any registered verification of their atoms exists.** A registered verification needs the task folders inc-014 delivers. Meanwhile a bootstrap record checks every sentence of your requirements against the atoms before inc-001, and inc-010 verifies every atom straight after inc-014. A corrected atom of a built increment becomes a follow-up increment.
   To reverse: stop after inc-014 and run inc-010 before anything else. That is a run choice, with no backlog edit.
8. **A suite that is red before any change becomes its own hygiene increment**, and the current increment waits for it. The design never lets a red be called "pre-existing".
   To reverse: change the baseline rule in tim's stage table and the matching audit rule. That is one module and its tests.
9. **Distillation and building are two workflow files, not one.** Both are thin loops over tim's tested decision engine.
   To reverse: merge them behind a mode argument. The contract test already keeps their shared parts identical.
10. **One run keeps building until something stops it, and stops cleanly at 850 agents** to stay under the runtime's 1,000-agent cap. The skill then relaunches it.
   To reverse: `tim backlog run set <programme> cadence one`, for one increment per run.
11. **The plants loop backlog (EUDPA-409) stays frozen until you restart it.** Of its 65 increments, 47 are frontend-only and 10 are tests-only, so a restart re-slices them into full-stack work, each new atom naming every row it absorbs.
   To reverse: one `tim backlog migrate <path to the loop backlog> --to <programme> --from loop-v1` run, then the distiller's reslice phase.
12. **No limit on how many repos a combined increment spans**, because R7 says repos follow the behaviour. This is not a separate call: it follows from R7, so repos are never a reason to combine and never a limit (c-005).
   To reverse: only if you change R7. The combination ceiling counts criteria, new surfaces and journeys, and the writer refuses any rule keyed on repos.
13. **Security, access-control, data-integrity, legal and policy questions never take a default.**
   To reverse: change the category list in the requirements profile. That is one file.
14. **Where the integration proof comes from is a run setting, not a backlog field.** By default it runs locally. When a Codex session drives the build and cannot reach Docker, product increments wait at `proof-owed`. The next Claude session then proves each one separately, on a stack built at that increment's heads. A Codex session with full access runs the proof itself, and nothing is owed.
   To reverse: `tim backlog run set <programme> quality.integrationProofSource ci`, naming the CI workflow in `quality.integrationProofWorkflow`. One command, no backlog edit.
15. **The integration proof is its own increment, inc-041, built before the done-gate increment (inc-021).** Acceptance reads the proof's record, so a red stack inside the same increment would be misread as an acceptance failure.
   To reverse: before either starts, re-run combine with inc-041's two atoms grouped into inc-021 (`phase reset combine`), recording the reason.
16. **The distiller is built as a walking skeleton.** inc-029 takes one markdown source end to end into a backlog and a report. inc-030 to inc-037 each widen that path, with a criterion that runs it end to end.
   To reverse: re-combine the distiller's atoms by phase. That is one combine run, before inc-029 starts.
17. **The canaries' product repos (plants frontend, plants backend and the tests repo) are named in this programme's backlog**, because the canary increments change them. Their "consumes" lists follow the obvious service calls, and are confirmed from the stack's service dependencies when the programme is registered.
   To reverse: remove them from the two canary increments' surfaces. The layer and merge-order checks would then no longer see those changes.
18. **The DR1 union question now has a recommendation (B)**, matching its default. Before this revision it had none.
   To reverse: answer the question.
19. **This programme's backlog may name Claude, Codex and the presets**, but only as the product's own interface: they name what is being built, never who builds it. A deviation enumerates the allowed terms, and the lint still refuses file paths, model tiers and build-mode words.
   To reverse: narrow `dv-tooling-commands`. Every atom about Codex support would then fail the lint.

---

## Owed to you, not a question

Agents cannot edit the workspace settings, so these wait for you:

1. **Before the first build run,** raise "Dynamic workflow size" in `/config`. One increment can use dozens of agents.
2. **Before inc-025, the first self-hosted build,** add these two allow rules to `.claude/settings.json`, so the pinned copy of the pipeline's tools runs without a prompt:
   - `Bash(~/git/defra/trade-imports-workspace/workareas/clones/pipeline-pin/tools/**)`
   - `Bash(~/git/defra/trade-imports-workspace/workareas/clones/pipeline-pin/tools/**:*)`
3. **Before inc-019,** add a PostToolUse hook on `Read` that runs `tools/backlog/record-read.sh`. It records which session read which file and which lines, so the reading audit is exact.
4. **Before inc-014,** extend guard-edits and the secrets-read check to cover `build/runs/**/receipt.json`, `build/runs/**/output.json` and `build/.accept-key`, so no agent can hand-write or read what proves a task was accepted.
5. **Accept or refuse one deviation from CLAUDE.md rule 3.** Agents commit without `sonar analyze --staged`, because agents cannot run it. SonarCloud results for the pipeline's own work come from the pull request checks instead, and "no report" is shown as "no report", never as clean. The push-record hook does not help here: it recognises only a push run from inside the repo, and the build's pushes name their repo.
