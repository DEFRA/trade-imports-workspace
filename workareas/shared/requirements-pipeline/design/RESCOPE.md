# Requirements pipeline: rescope (21 September 2026)

Sam asked for a requirements distiller and a backlog implementor. The design grew to 42 increments and 135 atoms, because every risk a critic imagined got its own mechanism. R9 in `analysis/sam-requirements.md` resets the scope. A mechanism stays only if it prevents a failure that has actually happened, or if the requested behaviour cannot work without it. `build/lessons.md` and the `analysis/` files record the failures that have happened.

## The minimum

The implementor is a skill and a Workflow that drain `backlog.json` one vertical slice at a time. For each increment the Workflow surveys the code, plans across every repo in the slice, and has a different task audit the plan in at most two rounds. It then implements the slice and reviews every changed file in groups, reading the workspace `review` and `code-style` skills live. One consistency review covers every repo. Only critical and major findings get an adversarial check. A judge rules, and a different task confirms each fix. The Workflow then runs every touched repo's ladder and, for a product slice, proves it end to end through the real stack. A fresh task that never sees the plan accepts the change against the backlog, and the slice lands locally or on a programme branch with one draft pull request per repo. Mechanical steps are tested tim commands run by a cheap runner. The same backlog builds on Claude or Codex, switched by a sentence. Each stage has one brief and one schema, and each executor has a profile that hands it the same personas and the rule and best-practice files that match its files. A Codex runner runs the heavy stages concurrently in resumable slices. One real small increment built on each executor is the proof. The distiller is a skill and a Workflow. It takes markdown, Word, PDF, spreadsheet, slide, Confluence, Jira and image sources, and characterises each one into units that another agent checks. It slices the units by behaviour, authors vertical-slice atoms and has each one verified by a task that did not write it. It then records conflicts and questions for Sam, absorbs duplicates, gives every unit one outcome and combines related atoms into increments. The output is `backlog.json` and a decision-led report that opens with what Sam must rule, derives every number and takes a batch of rulings.

## Remaining increments, in build order

inc-011 (the writer refuses layer-split work, R7) is being built now and is unchanged. It is not counted below.

| # | Id | Title | What it delivers | Atoms |
|---|---|---|---|---|
| 1 | inc-017 | The implementor drains a backlog one slice at a time from its args | The implementor skill and `backlog-build.js` as a walking skeleton. It takes its configuration from args, uses one next-increment rule over run state and keeps executor bindings out of the backlog. It sets up the same branch in every touched repo, commits locally with the session's trailer, stops before the agent cap and prints a handover at every stop. | req-004, req-024, req-025, req-055, req-056, req-074, req-079, req-136 |
| 2 | inc-018 | Each slice is surveyed, planned once across its repos, audited and implemented | Survey, plan, two-round converging audit with objections and notes (L1 to L3), and one implementation across the slice | req-059, req-060, req-117 |
| 3 | inc-019 | Every changed file is reviewed with the live skills, and every fix is confirmed | Group review reading both skills live, one consistency review across repos, adversarial checks on serious findings, judge, fix and fix check. Dead tasks never pass, and deferred findings reach the increment they name. | req-062, req-063, req-064, req-065, req-066 |
| 4 | inc-021 | A slice is proven through the real stack and accepted before it lands | Ladder results from recorded exit codes, a red baseline that stops the increment, a secrets scan, an end-to-end proof on a stack built from the slice's heads, and acceptance by a fresh task that never sees the plan | req-067, req-068, req-069, req-070, req-118 |
| 5 | inc-022 | Work lands on a programme branch with draft pull requests, and merges only as ruled | One branch and one reused draft pull request per repo, a CI wait and a SonarCloud "no report" state. Merging happens only when ruled, providers first and all green. A platform red parks one increment. | req-001, req-071, req-072, req-075, req-076, req-119 |
| 6 | inc-014 | Codex builds from the same backlog, switched by a sentence | One brief and schema per stage, and two executor profiles that hand each executor the personas and the matching rule and best-practice paths. A Codex runner runs tasks concurrently in resumable slices, with checking roles read-only. It adds presets, a switch by sentence, and one real increment built on each executor, compared side by side. | req-045, req-047, req-049, req-050, req-051, req-052, req-078, req-082 |
| 7 | inc-029 | One markdown source distils into verified vertical-slice atoms | `backlog-distil.js` as a walking skeleton. It characterises a source, has another agent check the units, slices them by behaviour, authors atoms and has another task verify each one. It then ingests solo increments and renders a report. The recipe lint runs over what it writes. | req-021, req-086, req-087, req-088, req-093, req-094, req-114 |
| 8 | inc-033 | Disagreements, duplicates and questions are settled, and atoms combine into increments | Conflicts with both sides quoted, each settled by precedence or sent to Sam as a question. It absorbs duplicates, gives every unit one outcome and writes four-part questions. Pass 2 combines atoms, and combining re-runs after a ruling. | req-098, req-129, req-100, req-101, req-103, req-104, req-106 |
| 9 | inc-025 | The report leads with decisions and takes batch rulings | Decisions first, derived numbers, N of TOTAL, batch rulings from an answer sheet, plain-English prose checked by a second task | req-032, req-033, req-034, req-035, req-036 |
| 10 | inc-038 | The distiller skill runs end to end on real sources, on either executor | The distiller skill, every source kind, the heavy tasks bindable to Codex, both skills in the workspace routing, and a first real run compared with the plants digest | req-089, req-090, req-107, req-108, req-109, req-111 |

inc-016 (house rules in a tracked document) stays deferred, as its default ruling says.

## What was cut

This rescope drops 19 increments and 48 atoms. Each carries `status: "dropped"` and a `statusNote` citing R9.

**The decision engine and its bookkeeping.** None prevents a failure that has happened.
- The tim `advance` state machine, span walker and one step agent per gap (req-121, req-137). The Workflow script holds the stage order, as the bootstrap does.
- Stage receipts, HMAC'd fact records, the stage audit for done and the operation-id checks on stage writes (req-027, req-048 folded, req-068 made lighter). Done means accepted and landed.
- Holds with release commands (req-026). A stop names its reason. A platform red that parks one increment is the one park kept (req-076), because it has happened.
- Pinned tool copies (req-077), canonical rails text (req-054), and HEAD-move checks per task (req-053), which the land leftover check (L5) already covers.

**Reading and parity audits.** These have no failure behind them.
- The Read hook and the reading audit (req-084), and the formal parity bar with its three canaries and three variants (req-083, req-130 to req-132). One real increment on each executor replaces them (req-082).
- A pipeline-owned `CODEX_HOME`, runner locks, draft-correction rounds and guard-file checks (parts of req-050 and req-051).
- A Codex-orchestrated session (req-080). Sam asked for Claude-only or Claude driving Codex.

**Writer content guards.** These are imagined risks.
- Verifier registry, evidence-role and confidence-role rules, and credential refusal in state files (req-017, req-019, req-020, req-022). The distiller's own verify phase and the pre-land secrets scan cover the real needs.
- Self-verification of this programme's own atoms (req-081).

**Distiller extras.** None prevents a failure that has happened.
- The judges panel (req-099, req-128). A conflict that precedence cannot settle goes to Sam as a question (req-129).
- The cold critic, cold readers, thin-slice audit, combine verifier, question critic and pipelined task starts (req-102, req-142, req-096, req-105, parts of req-103, req-139, req-141).
- The report's per-phase provenance table, its noticed-and-not-raised list and acceptance per criterion (req-037, req-038, req-039).
- Carry-over of earlier distillations (req-092), because Sam ruled no backports.
- Conversation sources (req-091, req-125). See open question 1.

**Delivery and review shapes that were not asked for.**
- Per-increment branches and Jira tickets (req-073). See open question 2.
- Persona sections edited into the review skills (req-044). The prompt tells reviewers what to skip.
- The review variants (req-126, req-127). They are superseded by grouped review (req-062).
- Retiring old paths and rewriting guides (inc-040, req-113). Nothing is retired, because Sam ruled no backports.

**Folded, not lost.**
- req-018 into req-025, and req-057 and req-058 into req-055.
- req-061 into req-059, which now also carries the survey (L2).
- req-095 into req-094, req-097 into req-101, and req-123 into req-118.
- req-135 into req-062, and req-140 into req-136.

## DESIGN.md: what still stands

**Use as the reference:**
- §3, the v2 backlog schema. It is built, apart from the fields for holds and receipts.
- §4.1 to §4.4, the writer, ids and cycles. These are built.
- §5.1, §5.3, §5.4, §5.6, §5.7 and §5.10: the distiller's identity, run contract, pass 1 authoring and verification, questions in four parts, combining, and source kinds. Build them without the panel, critic, gap audit or question critic.
- §6.1 to §6.5: report rules, sections, skeleton, answer sheet and renderer. Drop sections 9 and 11 of the skeleton.
- §7.1, the skill procedure, launching the Workflow directly with no `run open` or `run close`.
- §7.3, the args contract, as corrected by deferred finding D1.
- §7.5, the plan and plan audit, as amended by L1 to L3.
- §7.6, only the programme and local delivery strategies.
- §7.11, stops and handover.
- §8.2, the `codex exec` flags, resume and the sandbox table only.
- §8.3, the executor profiles table, and §8.5 and §8.6: personas read live, and rules, memory and house rules.
- §8.7, what session hooks did, now explicit steps (R4).
- §8.9, switching is a sentence.

**Superseded, so ignore:**
- §0.1's "thin interpreter over `tim backlog advance`".
- §2's diagram of spans and step agents.
- §4.5 to §4.8: the stage machinery, receipts, step agent, canonical rails and file ledger.
- §5.2's phase table with its DM and DJ spans. Keep the phase order only.
- §5.5, the panel.
- §5.11's fan-out counts.
- §6.6's per-section prose editors and cold readers.
- §7.2, the decision-engine cadence.
- §7.4's stage table. The stage order in `build/bootstrap-build.js` is the model.
- §7.7 to §7.10, beyond a small `run.json` holding executor bindings.
- §7.12, the tool pin.
- §8.1's receipts and accept rounds.
- §8.2's locks, pipeline Codex home and fake-codex test list, beyond what req-050 needs.
- §8.4's preset list, beyond two presets.
- §8.8, the agent counts.
- §8.10, the parity proof.
- §8.11, the Codex-orchestrated mode.
- §10, retire and migrate.
- §11, the build backlog. `design/backlog.json` and this file replace it.
- §9 and §12 are history.

Where DESIGN.md and this file disagree, this file wins.

## The build process for the remaining work

`build/bootstrap-build.js` now reviews each file group with one reviewer applying both skills. Files are grouped in path order, at most 5 substantial files or 500 changed lines to a group, and 15 small changes to a group. Before, each substantial file got two reviewers. Only critical and major findings are verified adversarially, with up to 5 files to a verifier. Minor findings go to the judge marked unverified. Every guard added after a real failure stays: the row-id check, two-round audit convergence, the survey, product folders staged wholesale, the late review and the land leftover check. A typical increment now spends about 21 agents, or about 25 with a plan revision and a ladder repair, where it spent about 80 before.

## Open questions for Sam

1. **Should the distiller read transcripts, chat and email in this scope?** Default: no. They are cut (req-091), which also leaves the question about other people's words in git (`q-conversation-retention`) with nothing to decide. They can come back as one increment later.
2. **Do product programmes need per-increment branches, pull requests and Jira tickets?** Default: no. Only programme-branch and local delivery are built (req-073 is cut). Your memory note "stack a programme on one branch" points the same way.
3. **Is one reviewer per file group, applying both skills, good enough for Codex and Claude alike?** Default: yes. R6 once asked for a style reviewer and a code reviewer on every file. The rescope trades that for grouped review sized by the diff (req-062), under both executors.

The rescope also settles two questions that were open with defaults. `q-panel-authority` becomes "no panel" (option C, req-129). `q-parity-bar` is replaced by the simple proof in req-082.
