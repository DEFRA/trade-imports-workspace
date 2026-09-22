# R8 merit audit of the final design

19 September 2026. This audit checks the final design (`design/DESIGN.md`), its programme backlog (`design/backlog.json`) and the judges' grafting rationale against Sam's requirement R8: build the right thing, and give no weight to the cost of building it.

**What R8 says.** Choose between options only on what they are like in use. That means output quality, the quality of the requirements and the report, Codex and Claude parity, full-stack slices (R7), correctness, and whether the option can run under the rails. Implementation effort, the number of new files, diff size and "least new surface" count for nothing. Collapsing a fixed overhead that every run pays does count, because it pays back on every run.

**What was read.** In full: `analysis/sam-requirements.md` (R1 to R8), `analysis/rules-probe.md`, the three candidates, the three judges and DESIGN.md. Checked against the source: `.claude/settings.json` (hooks and deny list), `scripts/sonar/sonar-record-push.sh`, `.claude/workflows/increment-build-loop.js` (the push commands), and parity's `COPY_EDITOR.md`, `CLAIM_VERIFIER.md` and `DUPLICATE_SWEEPER.md`. I also went through the four critiques (`critiques/*.md`, `all-findings.json`) so that nothing here repeats a critic finding without adding the R8 root cause.

**Test applied.** The factory is built once and run many times. For each decision, the only question is which option is better on every run. If a decision is genuinely better in use, it stays, and its merit reason is written down. If it only saved build effort, it is overturned, and the change that is better in use is specified.

---

## 1. Where build cost entered the design

### 1.1 The panel and the judges

- **The candidate angle.** `candidates/reuse.md:1-3`: "Angle: build as little as possible that is new." Its principle 11 is "Reuse before build. A new file exists only when section 0.2 says why an existing one could not take the job" (`reuse.md:67`). Its section 0.1 is titled "Why this is the smallest surface".
- **Judge 1** scored a `Reuse of existing assets` dimension (reuse 10, quality 7, codex 6; `judge-1.md:19`). Reuse and quality tied on 87, and reuse won for two reasons (`judge-1.md:116-119`):
  1. "It honours R1's instruction to build on what exists most literally."
  2. "Its architecture is the easiest base to graft onto … Grafting Reuse's `git mv` discipline onto Quality or Codex would mean re-architecting them."

  Both are about build effort. **Take out the reuse row and quality leads, 80 to 77, with codex on 76.** The tie that decided the skeleton was manufactured by the contaminated dimension. This is exactly the contamination Sam named in R8.
- **Judge 2** chose reuse because "it builds the least that is new" and has "the smallest, most provable build path, and its ordering settles every factual doubt cheaply" (`judge-2.md:20-21, 85`). Against codex it cites "rewriting the whole proven prompt-driven lifecycle as tested JavaScript" (`:12`) and "the largest new surface" (`:75`).
- **Judge 3** scored `Reuse` (10, 7, 5; `judge-3.md:73`). Its feasibility section treats codex's `tim build` as "the most proven half of the estate, rebuilt from zero … in tension with R1's 'not a build from zero'" (`:52`), and it treats the skill-routing refactor as "a sizeable change to two live skills" (`:53`). Without the reuse row its totals are reuse 77, quality 73 and codex 72, so reuse still wins. But its feasibility row (9, 7, 5) mixes build risk with run-time operability.

R8 settles how to read R1's "not a build from zero": "'Take the best bits' means reuse the good ideas and proven mechanisms, not minimise change. Where a rebuild is better in use, rebuild." So none of the reasons above count.

### 1.2 In the final design and its backlog

| Where | Text | Why it is contamination |
|---|---|---|
| DESIGN 1, principle 12 (`:116`) | "Build on what exists … A new file exists only when the new-file ledger (4.8) says why no existing file could take the job" | Makes least change a design principle |
| DESIGN 4.8 (`:966-991`) | Ledger column "Why not extend an existing one" | Justifies each file by why nothing existing could hold it, not by what it does better in use |
| DESIGN 0.2 (`:43`) | "The skeleton is the reuse candidate: `git mv` evolution, a new-file ledger …" | The skeleton was chosen on the contaminated tie |
| DESIGN 0.3 row 5 (`:80`), 4.5 (`:892`), 9.3 row 1 (`:2328`) | Codex's stage machine was declined because it "rebuilds the proven lifecycle", and "judges 2 and 3: rebuilding the lifecycle in tim is the least feasible" | A build-cost reason |
| DESIGN 9.3 "Skill routing" (`:2337`), 8.5 (`:2038`) | "quality's: no change to either skill's tooling (judges 1 and 2)" | A least-change reason |
| DESIGN 5.9 last row (`:1219`) | Parity's personas "read by path from the parity skill, not copied" | Reuse chosen over fit (section 3, r8-merit-07) |
| DESIGN 7.8 (`:1751`) | "A binding change takes effect at the next increment, never in the middle of one (`build-orchestrator/SKILL.md:386-389`)" | Keeps the old behaviour because it exists |
| DESIGN 2.2 (`:220`), 10 (`:2361-2362`) | Stage briefs made by `git mv` of `codex/*.md` | `git mv` lineage drove the content (critic M2 is the symptom) |
| DESIGN 5.1 (`:999`), 10 (`:2358`) | Distiller made by `git mv .claude/skills/journey-builder`, "keeps rule mode's history" | History preservation drove the folder's content |
| DESIGN 4.7 (`:964`) | New dependencies limited to `picomatch` and `acorn`; quality's `tim distil crop` (sharp) is dropped | Visual evidence is lost to keep the dependency list small |
| backlog.json header `direction` (`:94`) | "Evolve an existing asset before creating a new one; every new file names why no existing file could take the job." | **The tie-break every plan and judge of this programme reads** (3.3: `direction` is read by plan and judge). It injects least change into all 40 increments |
| backlog.json `d-001` (`:339-351`) | "the reuse candidate with the judges' grafts", words "Winner: Reuse." | The founding decision records the contaminated verdict |
| backlog.json precedence `intent` (`:80`) | Judges ranked straight after Sam's requirements | The judges' reuse dimension then outranks the evidence |

---

## 2. Every decision, re-decided on merit in use

"Stays" means the decision is better in use, and the merit reason is stated. "Overturned" means the reason was build cost; the fix is in section 3.

| # | Decision | Build-cost factor it rested on | Merit in use | Verdict |
|---|---|---|---|---|
| D1 | Skeleton = reuse candidate (0.2) | The tie was decided by the reuse dimension and "easiest to graft onto" | Decided component by component below. The data model stays reuse's. The requirements method is already quality's. The control plane should be codex's decision engine, with the lifecycle carve-out | **Overturned as a label**; re-recorded per component (r8-merit-03) |
| D2 | Atoms beside increments; increments hold `members` only (Q9) | none | A member's acceptance is never a stale copy, so a ruling shows through at once (judge 1). Better than quality's rows marked `combined` and codex's two files | **Stays** |
| D3 | `build/run.json` outside the backlog | none | R5: the backlog is byte-identical across executors | **Stays** |
| D4 | Drain in one Workflow, no nested workflows (Q19) | Partly "simpler" | Operability: whether a nested child is re-read, and resumes, is undocumented. A drain that reads state after every increment gets liveness without it | **Stays** (operability) |
| D5 | Stage order and transition rules live in the workflow script; tim only prepares, accepts and audits (4.5, 9.3) | "Rebuilds the proven lifecycle", "least feasible", "not a build from zero" | Worse in use. Codex-orchestrated mode re-derives the order from handover prose. Resume logic lives in untestable script JS. `STAGE_ORDER` is kept in two places. Every tim-only fact stage costs a watcher agent | **Overturned**: a tested decision engine in tim (r8-merit-02) |
| D6 | tim never pushes, merges or calls GitHub; the lifecycle runs in Claude watchers (0.3) | Also cited as "keeps the proven lifecycle" | Genuine merit. Every outward action is a separate Bash call that the auto-mode classifier, `guard-bash`, the deny list and the allowlist each see (the classifier has refused `gh pr merge` before). tim's own rail forbids it shelling out to `tools/`. But the stated reason, "the PostToolUse push hook fires", is wrong for `git -C` pushes (r8-merit-11) | **Stays**, merit reason corrected |
| D7 | No agent runs the `sonar` CLI; SonarCloud comes from the PR checks | none | Operability: `sonar` is not allowlisted, `--staged` fails from agents, and the org returns 403 | **Stays** |
| D8 | Nothing outlives a Bash call; ladder rungs run one per call | none | Operability under the 600-second Bash ceiling | **Stays** |
| D9 | Skill routing through a bash composer calling the three routers "unchanged" (8.5, graft 20) | "No change to either skill's tooling" | Worse in use. It costs 3 routing watcher stages per increment. Routing is split across bash and tim with no tests. Bundles are baked for code-style only, and there are no source hashes | **Overturned**: routing as data owned by each skill (r8-merit-04) |
| D10 | Distil phases are driven by the workflow script, and every gate is a watcher agent running one tim command (5.2) | It follows the reuse skeleton | Worse in use. About 12 gate watchers per distil run all call tim's own checks. There is no Codex-orchestrated distillation. Phase transitions are untested | **Overturned** (r8-merit-05) |
| D11 | A binding change takes effect at the next increment (7.8) | "The proven orchestrator behaviour" | Worse in use. "Codex for the rest" when Claude runs out mid-increment cannot move the remaining stages | **Overturned** (r8-merit-06) |
| D12 | Stage briefs by `git mv` of `codex/{implement,fix,review}.md` | `git mv` lineage | Worse in use. Codex-only lessons end up in neutral briefs (critic M2), and review output has no `completed` or `notReached` | **Overturned** (r8-merit-09) |
| D13 | Parity's COPY_EDITOR, CLAIM_VERIFIER and DUPLICATE_SWEEPER read live by path (5.9) | Reuse, "not copied" | Worse in use. All three are finding- and screen-shaped (checked below). The distiller's prose slots get no rules or budgets | **Overturned** (r8-merit-07) |
| D14 | No crop tool; only picomatch and acorn added (4.7) | Fewer new dependencies | Worse in use. The design promises crops (3.6 `:426`, Q36) but nothing can make one under the rails | **Overturned** (r8-merit-08) |
| D15 | Distiller = `git mv journey-builder`; the frozen spec tools stay inside it (5.1, 10) | History preservation | Worse in use. The new skill's folder carries frontend-engine tools and vocabulary for a frozen corpus | **Overturned** (r8-merit-10) |
| D16 | The consistency reviewer also runs the plan's invariant checks (8.5, reuse's "consistency (runs plan invariants)") | Avoided a new role | Worse in use. The live persona has no such method. Commands are run by an LLM rather than recorded as facts | **Overturned** (r8-merit-12) |
| D17 | One writer core generalised from `tim parity`; parity becomes profile `parity-v1` (Q3, 4.1) | Also "the work is to generalise it, not to write a new one" | Genuine merit. The id-stable, ruling-safe ingest is proven, and one core gives parity the locks, operation ids and lost-update checks too. But the first increment is "judged on that alone": parity non-regression only (`:784`) | **Stays**; acceptance widened (r8-merit-13) |
| D18 | `inv-parity-untouched` | none | The frozen corpora are live records with a contract test in tim CI | **Stays** |
| D19 | Sibling renderer sharing theme, prose, artifact and citation modules (Q32) | none | Parity's card is two-sided at its core | **Stays** |
| D20 | One consistency task per increment across every repo (graft 9) | none | R7: the contract between repos needs one reader. It matches `review/SKILL.md:147-162` | **Stays** |
| D21 | Two workflow files, distil and build (7.2) | none | A distil edit is kept out of a running build. Under r8-merit-02 both become thin interpreters | **Stays** |
| D22 | Registry by `git mv tools/parity/corpora.json` (Q2) | Partly lineage | A stable programme key that commands resolve. Frozen bash readers still need it | **Stays** (merit: stable keys) |
| D23 | Codex runner and slicing in committed bash (`tools/codex/run-stage.sh`) | none | Process control of an external CLI belongs in an allowlisted script, not in prompt prose | **Stays** |
| D24 | Tool pin by cloning at the launch commit (7.12) | none | Stops a self-hosting build calling half-edited tools | **Stays** |
| D25 | Quality grafts: extract-verify, trace closure, question editor and critic, role and confidence checks, plan audit, fix-verify, independent acceptance, COMBINE_VERIFIER, "How this was checked", "Noticed and not raised", per-criterion results, P1 to P11 | These were grafts, not declines | Each is better in use. All are in DESIGN (0.2 grafts 3 to 8 and 19) | **Stays** (already adopted) |
| D26 | Codex grafts: file-first receipts, `stage accept`, operation ids, prompt parity, reading audit, tool facts, done gate, read-only sandboxes, rails equality test | Adopted | Better in use | **Stays** (already adopted) |
| D27 | No exemplar or hint slot (Q7) | none | Judge 3: a path-shaped pointer anchors the planner, which is a recipe leak | **Stays** |
| D28 | Milestone order: build path (m1 to m3) before the distiller (m4) | "The distiller follows the proven build path" (lower build risk) | Order of building is not a property of the factory in use. It has zero weight either way, so it stays as a neutral sequencing choice. It must not be read as a quality ranking | **Stays** (neutral) |
| D29 | `git mv` used for renames generally (build-orchestrator, the loop, `tim/src/parity`) | History | Neutral in use. Allowed as history hygiene only, and never a reason for content (r8-merit-01 records this) | **Stays** as a mechanism, never as a criterion |

---

## 3. Overturned decisions: the changes

### r8-merit-01 (blocker). Remove least change from the principles, the ledger and this programme's tie-break

- **Current.**
  - Principle 12: "Build on what exists … A new file exists only when the new-file ledger (4.8) says why no existing file could take the job."
  - backlog.json `direction`: "Evolve an existing asset before creating a new one; every new file names why no existing file could take the job."
  - `d-001` records "Winner: Reuse."
  - Precedence for `intent` puts the judges straight after Sam.
- **Problem.** `direction` is the tie-break the plan and the judge read on every increment (3.3). Left as it is, every just-in-time plan and every judge ruling in this programme is told to prefer the least change. That is R8's banned criterion, applied to all 40 increments. Principle 12 and the ledger's column make least change a design rule.
- **Change.**
  1. **Principle 12 becomes:** "**Take the best ideas and proven mechanisms, and choose on merit in use.** Options are compared only on output quality, requirements and report quality, Codex parity, vertical slices, correctness and operability under the rails. Build effort, file count, diff size and new surface carry no weight (R8). Collapsing an overhead that every run pays counts. `git mv` is used when a file really evolves, to keep history, and is never a reason for a design choice. Headless stages decide and record …" (the rest unchanged).
  2. **4.8 becomes "The file ledger".** The column header changes to "What it does better in use". Rewrite every row to state the in-use benefit, not why nothing existing could hold it. Also change the sentence "Nothing else is new." to "Every file the design adds or changes is listed here with its in-use reason."
  3. **backlog.json `direction`:** "Choose the option that is better in use: output quality, requirement and report quality, Codex and Claude parity, full-stack slices, correctness, and operability under the rails. Build effort, diff size and the number of new files carry no weight (R8). Collapsing an overhead that every run pays counts." Mirror it in DESIGN 11.4 (`:2476`).
  4. **Add a source** `r8-merit` (`design/corrections/r8-merit.md`, role `decision-record`, tier 1). Add `analysis/sam-requirements.md` R8 as the first entry of the `intent` precedence, followed by `r8-merit`, then the judges. Record `why`: "The judges' `reuse` dimension and build-cost reasons carry no weight (R8)."
  5. **Append `d-002`**, superseding `d-001`, subject design:
     - answer: "Adopt the final design as corrected by the R8 merit audit. The data model comes from reuse, the requirements method from quality, and the control plane from codex's decision engine, with lifecycle actions run by Claude watchers";
     - words: Sam's R8 quote;
     - `decidedBy: panel`;
     - `revisitWhen`: as for d-001.

     Mark `d-001` as `superseded`.
  6. **Add invariant `inv-merit-only`:** "No design or plan choice in this programme rests on build effort, file count, diff size or new surface." Readers: plan, plan-audit, judge. The plan audit (7.5) gains the objection kind `build-cost-reasoning`: a plan that justifies a choice by "fewer changes" or "reuses X" without an in-use reason is sent back for revision.

### r8-merit-02 (major). tim decides the next stage; Claude watchers still run every outward action

- **Current.** 4.5: "tim never decides the order of stages." Stage order, skip rules, revise rounds, retry budgets, hold mapping and resume-across-runs all live in `backlog-build.js`. It is `git mv` of the loop, with a `STAGE_ORDER` constant kept equal to tim's table by a contract test. 8.11's Codex-orchestrated mode has a Codex session run "one stage at a time" from a generated handover.
- **Why it was chosen.**
  - 0.3 row 5: "Codex rebuilds the proven lifecycle as a new tim stage machine."
  - 9.3: "rebuilding the lifecycle in tim is the least feasible."
  - Judge 3: "rebuilt from zero"; judge 2: "rewriting … as tested JavaScript".

  These are build-cost reasons. The declines that rest on merit are separate, and they are kept: tim must not push or merge (D6), and nothing may outlive a Bash call (D8).
- **Why it is worse in use.**
  1. **Codex-orchestrated mode.** This is R6's real scenario: Claude's weekly limit is spent, so even Haiku watchers cannot run. The Codex session then re-derives transition logic from prose, including skip verify when there are no findings, one plan-revise round, three fix-verify rounds, repair budgets, which hold for which failure, and where to resume. It is a second, lossy implementation of the machine.
  2. **Untestable logic.** Resume-across-runs and the transition rules live in workflow JS, which has no clock, cannot read files and has no vitest harness. They are the part of the loop that has failed before: `filter(Boolean)`, the dead judge read as an empty judgement, `resumeAt`.
  3. **Two copies.** `STAGE_ORDER` exists twice and needs a contract test.
  4. **A fixed overhead on every increment.** Each tim-only fact stage (`next`, the baseline heads check, manifest, `secrets`, the stage audit, `report`) costs one watcher agent. R8 counts collapsing that.
- **Change.**
  1. **Add the decision engine.** Add `tim backlog advance <p> --run <label> [--inc <id>] --json`, in `tim/src/backlog/advance/`, with vitest tests on input and output. Each call:
     1. accepts any unaccepted drafts;
     2. checks the expected task set;
     3. applies the stage's transition rule from the stage table;
     4. runs, in-process, every following stage that is a pure tim command (next, heads, manifest, secrets scan, audit, status, report render, counts);
     5. returns one step.
  2. **The step shapes.**
     - `{status: "run", stage, tasks[]}` for model tasks, prepared for the executor the binding resolves at that moment.
     - `{status: "act", stage, actions[{id, cmd, repoKey, record}]}` for lifecycle and ladder work. Each `cmd` is one exact allowlisted single command, generated by tim: `git -C <tilde repo> push -u origin refs/heads/<b>:refs/heads/<b>`, `tools/github/pr-ensure-draft.sh …`, `tools/backlog/run-rung.sh …`, `tools/jira/…`. A Claude watcher runs each one verbatim as its own Bash call, so the classifier, `guard-bash`, the deny list and the allowlist see every push, PR and merge.
     - `{status: "wait"}` for a CI slice.
     - `{status: "stop", stopReason}`.
  3. **Recording results.** Results are recorded by `tim backlog advance --record <actionId> --exit <n> --log <file>`, or read from the `.exit` files that `run-rung.sh` writes. tim still runs only read-only git.
  4. **The build script becomes an interpreter.** `backlog-build.js` becomes the interpreter loop from `candidates/codex.md` 7.3: watcher `advance`, then a parallel `agent()` per Claude task, one Codex watcher per stage, and one watcher per action batch, then `advance` again. Delete `STAGE_ORDER` and its contract check (4.6 item 2).
  5. **Resume and holds move into tim.** 7.8's "Resume across runs" becomes `advance`'s job, tested with fixtures. Hold mapping moves into the stage table.
  6. **8.11's loop is the same machine.** The Codex session runs `advance`, then `run-stage.sh` for `run` steps or the listed `cmd`s for `act` steps, then `advance` again. The handover only binds paths. Drop "or directly" (critic M7).
  7. **Recount the per-increment overhead in 8.8.** Watchers fall from about 20 to about 8 to 10 per increment: one per `advance` boundary plus one per action batch.
  8. **Update the text.** Rewrite 0.3 row 5 as "Codex moves lifecycle execution into tim → tim decides, Claude watchers execute". Rewrite 9.3 row 1 as "tim decides the order (codex), Claude watchers execute every outward action (judge 2's hook argument, corrected in r8-merit-11)".
  9. **Update the backlog.** Add an atom to the build slice: "The next stage of an increment MUST be decided by one tested command from recorded state, the same for a Workflow run and a Codex-orchestrated session." Its acceptance is e2e: a fixture increment driven to `done` by both a scripted interpreter and the handover loop produces identical receipts and state. Combine it into inc-017. inc-023's Codex-orchestrated criterion depends on it.

### r8-merit-03 (major). Record the skeleton choice on merit, component by component

- **Current.** 0.2: "The skeleton is the reuse candidate", on judges whose verdicts rested on the reuse dimension. Without that dimension, judge 1's tie becomes quality 80, reuse 77, codex 76.
- **Change.** Replace the first paragraph of 0.2 with a component table:

  | Component | Chosen from | Merit reason |
  |---|---|---|
  | Data model (atoms plus `members`, `run.json`, drain, no nesting) | reuse | No stale acceptance, R5, operability |
  | Requirements method (extract-verify, trace, questions, combine verify, report sections) | quality | Requirements and report quality |
  | Control plane (decision engine, file-first tasks, receipts, operation ids, prompt parity, reading audit, routing as data) | codex | Parity, a tested state machine, per-run overhead |
  | Lifecycle execution (Claude watchers running exact commands) | the judges' objection to codex | Classifier and guard visibility; tim rails |

  Add a line recomputing judge 1 without the reuse row. In 9.3, change every "whose verdict it follows" cell that cites reuse, feasibility-of-build or "no change to either skill" to the merit reason, or to the overturn in this audit.

### r8-merit-04 (major). Skill routing becomes data owned by each skill, resolved by tim at prepare time

- **Current.** 8.5 and graft 20: `tools/backlog/skill-routing.sh` calls `file-topics.sh`, `bake-rules-bundle.sh` and `detect-tech.sh` "unchanged". 7.4 runs it as three watcher stages per increment (7 Routing repo level, 10 Routing planned files, 13 Routing changed files). Its output is joined to `tim backlog rules` through `stage prepare --routing <file>`.
- **Why it was chosen.** "No change to either skill's tooling" (9.3, citing judges 1 and 2). Judge 3 called the alternative "a sizeable change to two live skills". Both are build-risk arguments.
- **Why it is worse in use.**
  1. **Overhead.** Three extra watcher agents per increment, each a failure point (`stage-failed` holds).
  2. **Split and untested.** Routing is split across untested bash (4.8: "Nothing tests the bash tools today") and tim, and the two are joined by a file handoff.
  3. **Cost per reviewer.** Only code-style topics are baked into bundles. Every per-file reviewer re-reads each rule-pointer and detect-tech file, which is a real cost on every task.
  4. **No hashes.** Resolved standards carry no content hash, so `compare` cannot prove both executors read the same versions.
  5. **Codex-orchestrated mode** needs the bash composer too.
- **Change.**
  1. **Move the routing into data files, owned by each skill** (`candidates/codex.md` 8.4 item 2):
     - the path-to-topic map (`file-topics.sh:34-58`) and the topic-to-files lists (`bake-rules-bundle.sh:37-73`) go to `.claude/skills/code-style/assets/routing.json`;
     - the tech detectors and best-practice lists (`detect-tech.sh:53-265`) go to `.claude/skills/review/assets/routing.json`, written as data: `fileContains`, `anyFileContains`, `fileExists`.
  2. **The three bash scripts become thin `jq` readers of those files**, so a person running either skill sees identical behaviour. Add a golden test per script: old output equals new output for every fixture path.
  3. **`tim backlog rules` becomes the single resolver** (renamed `tim backlog standards`). It reads both `routing.json` files live, plus the `.claude/rules` globs, rule pointers, the CLAUDE.md chain and the memory index. `stage prepare` calls it in-process for each task's planned or changed files.
  4. **Delete stages 7, 10 and 13, and `tools/backlog/skill-routing.sh`.**
  5. **`stage prepare` bakes one standards bundle per (repo, topic).** It writes `build/runs/<run>/standards/<repoKey>.<topic>.md` from the live files, with a header listing each source path and its blob sha, for code and style alike. `standards.json` records each file's sha.
  6. **Record hashes in the parity proof.** `compare` fails a measure when the two sides' standards shas differ.
  7. **Update the backlog.** Add a routing atom to inc-012 ("the review skills' routing is data each skill owns, read live by the skill's own scripts and by the pipeline"), with an e2e criterion that the golden outputs are unchanged. Rewrite 9.3 "Skill routing" to "codex's routing as data, with golden tests (merit: one routing, tested, no per-increment routing agents)".
- **R2 check.** The routing is still owned by each skill and read live by path at run time, and nothing is copied into a script or brief.

### r8-merit-05 (major). Distillation runs on the same decision engine, and gates run in-process

- **Current.** 5.2: `backlog-distil.js` drives the phases. "Gates run inside the workflow as watcher agents that each run one tim command" (`:1050`). That is heads, units, slices, yield, coverage, ingest, trace, question lint, check and report: about 12 watcher agents per distil run, before any re-run after rulings. There is no Codex-orchestrated distillation.
- **Why it was chosen.** It follows the reuse skeleton. No merit reason is given.
- **Change.**
  1. **`tim backlog advance --distil`** reads `distil/phases.json` and the phase table. It runs every tim-only phase and gate in-process (`heads`, `units --strict`, `slices --strict`, `yield`, `coverage`, `ingest --atoms`, `trace --strict`, `question lint`, `candidates --combine`, `ingest --increments`, `check --strict`, `report`). It returns `run` steps only for model phases. A failed gate returns `stop` with `gate:<name>` and the missing list, as today.
  2. **`backlog-distil.js` becomes the same interpreter** as the build script.
  3. **5.11's distil Codex binding works in a Codex-orchestrated session too** (R6's weekly-limit reason applies to distillation).
  4. **Update the backlog.** Amend inc-029's outcome: "the phase ledger and its gates are driven by one tested command", with an e2e criterion that a fixture distillation reaches `report` with only model phases spawning agents.

### r8-merit-06 (major). A binding change takes effect at the next stage prepared, not the next increment

- **Current.** 7.8: "A binding change takes effect at the next increment, never in the middle of one (`build-orchestrator/SKILL.md:386-389`)." The only exception is a held increment. 4.5's audit accepts only "receipts whose executor matches the binding in force for that attempt".
- **Why it was chosen.** It keeps the existing orchestrator behaviour. No in-use reason is given, and the design already resolves bindings in every `stage prepare` (4.5 item 1).
- **Why it is worse in use.** R6: "Codex for the rest" is said when Claude runs out, often mid-increment. Prompt parity and stage-level presets (such as `codex-plan-on-claude`) already mix executors within one increment, so nothing about quality requires the increment boundary.
- **Change.**
  1. **Bindings are resolved at every `stage prepare`** (and, under r8-merit-02, at every `advance`). `stage.json` records each task's executor.
  2. **A running task finishes on its executor.** Prepared but unstarted tasks are re-prepared under the new binding. Partial Codex tasks are archived as today.
  3. **The audit checks each receipt's executor against `stage.json`**, not against "the binding in force for that attempt".
  4. **8.9 gains the row** "Finish this increment on Codex" → `run bind <p> --ids <current> --preset codex`, and states that the remaining stages switch.
  5. **Update the backlog.** Amend the inc-023 criterion to: "a binding written mid-increment applies from the next stage, with no backlog change".

### r8-merit-07 (major). The distiller owns requirement-shaped prose and dedupe personas instead of reading parity's live

- **Current.** 5.9 last row and 6.6: `DUPLICATE_SWEEPER.md`, `COPY_EDITOR.md` and `CLAIM_VERIFIER.md` are "read by path from the parity skill, not copied". Each gains a "When the requirements distiller runs this persona" section, and `CLAIM_VERIFIER.md:17`'s path is edited.
- **Why it was chosen.** Reuse.
- **Evidence it is worse in use.** Checked on 19 September 2026:
  - **COPY_EDITOR** is built for findings. Its first line is "You rewrite findings into GDS plain English". Its slots are `frontend`, `prototype`, `difference`, `correction` and `falsifiedBy`, with word budgets for those slots only (`:21-67`), and it runs `tim parity set-slot EUDPA-328` (`:80`).
  - **CLAIM_VERIFIER** diffs `workareas/journey-builder/EUDPA-328/backlog.json` and uses `tim parity check` (`:17-19`).
  - **DUPLICATE_SWEEPER** compares "screens, controls and title wording" (`:31-43`).

  The distiller's machine-written prose is question headlines, option text and consequences, "If nobody answers", outcomes and combination reasons (6.6). None of those have slots, budgets or rules in these personas. A future edit to a parity persona for parity's sake would silently change distillation, and nothing tests for that.
- **Change.**
  1. **Add distiller-owned personas** under `.claude/skills/requirements-distiller/references/`: `PROSE_EDITOR.md`, `PROSE_CLAIM_VERIFIER.md` and `ATOM_DEDUPER.md`.
     - Each is cut from the parity persona's method: quote conservation I5, the polarity list I10, "would one person, doing one piece of work, close both".
     - Each names its method source by path in a "Method from" line.
     - Each defines the distiller's own slots and budgets: headline 90 characters and a question; option text 40 words; consequence 40; `ifNobodyAnswers` 40; `outcome` 60; combination `why` 40.
  2. **Remove the planned distiller sections** from the parity personas and the edit to `CLAIM_VERIFIER.md:17`. Parity's personas stay as they are.
  3. **Add a `tim backlog report --lint` check** that every machine-written slot is within its budget.
  4. **Amend inc-037's criterion** to name the distiller's personas.

### r8-merit-08 (major). Visual evidence gets a crop tool

- **Current.**
  - 3.6's example points at `distil/sources/mural/crops/list.png` (`:426`).
  - Q36: "Crops are captured at characterise".
  - 5.10 records only crop boxes.
  - 4.7 adds only `picomatch` and `acorn`.
  - Nothing can produce a PNG. Agents cannot run python, node, ImageMagick or a heredoc image script under the deny list (`.claude/settings.json` denies `python *`, `node *`, `bash *` and more).

  The quality candidate had `tim distil crop` using sharp (`candidates/quality.md` 4.5). It was dropped without a stated reason, which leaves the dependency list minimal.
- **Why it matters in use.** Sam's rule is that decisions about something visual carry the picture (`project_eudpa328_decision_visual_evidence`; report rule 7).
- **Change.**
  1. **Add `tim backlog source crop <p> <sourceId> <unitToken> --box x,y,w,h --name <slug> --json`**, library-first with `sharp` (new dependency in 4.7). It writes `distil/sources/<id>/crops/<slug>.png` and records `{crop, box, sha256}` on the unit.
  2. **Characterise tasks call it** for every visual unit, and the QUESTION_EDITOR attaches crops by unit.
  3. **Renderer test:** every `visual[]` entry resolves to an existing file.
  4. **P8 lint fails** a question in a visual cluster with no crop.
  5. **Update the backlog.** Add a criterion to inc-030 (req-090): "given an image-board source, when characterised, then every visual unit has a crop file whose hash is recorded".

### r8-merit-09 (minor). Stage briefs are written from the stage contract, not moved from the Codex briefs

- **Current.** 2.2 and 10: `codex/implement.md` and `fix.md` are moved with `git mv` into `stages/`, and `codex/review.md` is moved and rewritten. Critic M2 found the resulting Codex-only content in neutral briefs.
- **Why it was chosen.** `git mv` lineage.
- **Change.**
  1. Write each brief in `.claude/workflows/stages/` fresh from the 8.1 contract.
  2. Sort every sentence of the three Codex briefs into neutral, Codex-only (moved to `executors/codex.md`) or Claude-only (moved to `executors/claude.md`), as critic M2 proposes. Then delete `codex/*.md` in inc-014. Keep lineage in the commit message, not in `git mv`.
  3. Add the Codex lesson "always report, even if you did not finish" as schema, not prose. `review-style`, `review-code` and `consistency` outputs gain `completed` (boolean) and `notReached[]` (`candidates/codex.md` 8.1).
  4. The stage audit treats `completed: false` as a finding to retry once, then a hold, for both executors.

### r8-merit-10 (minor). The distiller is a new skill; journey-builder is frozen in place, not moved into it

- **Current.** 5.1: `requirements-distiller` is made by `git mv .claude/skills/journey-builder` to keep rule mode's history. 10: "The spec tools stay for the frozen plants spec", which means inside the new skill.
- **Why it is worse in use.** Agents that load the distiller meet journey-builder's frontend-engine vocabulary and targets. DESIGN itself says `SPEC_RECONCILER.md` "speaks the frontend engine's vocabulary" (4.8). Trigger phrases and tools for a frozen corpus also sit in the live skill.
- **Change.**
  1. Create `.claude/skills/requirements-distiller/` as a new folder holding only the distiller.
  2. Leave `.claude/skills/journey-builder/` in place, frozen: BUILD mode is retired in inc-040, and a one-line banner points to the two new skills. Delete it once the EUDPA-409 spec is migrated or ruled history.
  3. Lineage stays in the persona table's "Cut from" column (5.9).
  4. Update 5.1, 10 and Q18.

### r8-merit-11 (minor). Correct the stated reason for keeping pushes in watchers

- **Current.**
  - 0.3 row 3: "every per-call hook sees every push".
  - 8.7: the `PostToolUse` push hook "fires, because every push is by a Claude watcher".
  - 9.3 "Lifecycle actions": "so every per-call hook sees every push".
- **Evidence.** The hook is configured with `"if": "Bash(git push*)"` (`.claude/settings.json` PostToolUse). The loop's pushes are `git -C <repo> push -u origin refs/heads/<b>:refs/heads/<b>` (`increment-build-loop.js:355, 383, 1531, 1645, 1657`), which do not start with `git push`. So the hook does not fire for them. The deny rules `Bash(git push --force *)` also do not match the `-C` form.
- **The decision stays on merit.** The auto-mode classifier, `guard-bash` (which matches every Bash call) and the permission allowlist still see each push, PR and merge as its own call. tim's rail also forbids it running `tools/`. Nothing depends on the pending-push record, because stage 24 reads PR checks directly.
- **Change.**
  1. Rewrite the three sentences to name the classifier, `guard-bash` and the allowlist, and to say plainly that the Sonar push-record hook does not fire for `git -C` pushes.
  2. Add a canonical-rails line: "force-push is refused by the PUSH RULE text and by the refspec form; the deny list's `git push --force` pattern does not match `git -C`".
  3. Record it as an assumption in the backlog (`as-push-hook-scope`) for inc-022.

### r8-merit-12 (minor). Invariant proofs are recorded facts, not a duty added to the consistency persona

- **Current.** 8.5: the consistency task "also … runs the plan's invariant checks", and its schema has `invariantChecks[{id, result, evidence}]`. This is from reuse's "consistency (runs plan invariants)", chosen to avoid a new role. The plan's `invariants[].check` is prose (7.5 example: "the Welsh copy file has every new key").
- **Why it is worse in use.**
  - The live `CONSISTENCY_REVIEWER.md` has no method for this, so the duty is prompt glue outside R2's live personas.
  - A mechanical check run by an LLM is an agent's claim, against principle 8 ("Facts come from tools").
- **Change.**
  1. The plan's `invariants[]` entries become `{id, kind: command | judgement, rung?, why}`. A `command` invariant becomes a `ladderExtras` rung (a committed script or npm script) whose `.exit` is a fact. A `judgement` invariant is assessed by the acceptance task, which already reads the invariants.
  2. The consistency schema drops `invariantChecks`.
  3. The stage audit requires every plan invariant to have a rung result or an acceptance verdict.
  4. The plan audit (7.5) refuses an invariant with neither.

### r8-merit-13 (minor). The first writer increment proves the v2 core, not only that parity still works

- **Current.** 4.1: "The first writer increment (inc-004) is judged on that alone: every existing tim test passes with no fixture changed, and the EUDPA-328 page renders the same apart from its stamp." req-008's statement ends "with parity's behaviour unchanged".
- **Stays on merit.** One core is better in use: the id-stable, ruling-safe ingest is proven, and parity also gains locks, operation ids and lost-update refusal. `inv-parity-untouched` stays, because the frozen corpora are live records guarded in tim CI.
- **Change.**
  1. Delete "judged on that alone" from 4.1.
  2. Add to inc-004 (req-008) a criterion: "given a fixture requirements-v2 programme found through the registry, when atoms are ingested twice with one inserted, then ids are stable and every refusal names its field".

  Non-regression stays as one criterion among several, not the only proof.

---

## 4. Decisions kept on merit, and why

These rested at least partly on reuse or "proven", and were checked again on merit alone. Each stays for the in-use reason given.

- **Lifecycle actions run by Claude watchers, never inside tim** (D6). Each outward action is seen by the classifier, `guard-bash` and the allowlist, and tim's rails forbid shelling out. r8-merit-02 keeps this: tim only generates the exact commands.
- **No local `sonar` stage** (D7). Operability: the CLI is not runnable by agents.
- **Drain with no nested workflows** (D4). Operability: nesting's re-read and resume behaviour is undocumented. The drain reads state after every increment, so a change still takes effect at the next increment.
- **One writer core with a `parity-v1` profile** (D17, D18). One set of write guarantees for every backlog, and the frozen parity corpora keep their contract test.
- **Members-only increments, `run.json`, and no exemplar slot** (D2, D3, D27). These are the best options on requirement quality and R5.
- **The bash Codex runner and the tool pin** (D23, D24). Operability and self-hosting safety.
- **Every quality and codex graft already adopted** (D25, D26). Each is better in use and none is weakened here.
- **Milestone order** (D28). Build order is not an in-use property of the factory, so it has zero weight. It stays as a neutral choice and makes no claim about quality.
- **`git mv` for renames** (D29). Allowed where a file really evolves, to keep history. It is never a reason for a design choice (r8-merit-01).

---

## 5. How to apply these changes

- **DESIGN.md.** Apply with small edits by section:
  - principle 12, and 0.2, 0.3, 2.1, 2.2, 4.2, 4.5 to 4.8;
  - 5.1, 5.2, 5.9, 5.10, 6.6;
  - 7.2 to 7.5, 7.8;
  - 8.1, 8.5, 8.7 to 8.9, 8.11;
  - 9.1 Q18 and Q36, 9.3, 10.
- **backlog.json.** Change `direction`, `precedence.intent`, `invariants` (add `inv-merit-only`) and `decisions` (add `d-002`, mark `d-001` superseded). Add the source `r8-merit` and the assumption `as-push-hook-scope`. Change these atoms: req-008, req-090, the inc-012 routing criterion, inc-017 (the advance atom), inc-023, inc-029, inc-037 and inc-014. Keep every id stable.
- **Critics.** The critic findings stand. r8-merit-09 supplies the R8 root cause of critic M2, and r8-merit-02 subsumes the "or directly" part of critic M7.
