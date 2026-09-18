# G. Report quality precedents: what a great distillation report looks like

Scope: every report the workspace has produced for Sam to read and rule from, what he
kept, what he rewrote, and what his memory files say about writing for him. The output is
a contract for the distiller's report: what it contains, in what order, how it is generated
from JSON, and how rulings flow back into the backlog.

Sources read in full (branch files via `git show feat/NO_JIRA-frontend-alignment:<path>`):

| Asset | Where |
|---|---|
| Frontend-alignment report (final) | `workareas/shared/frontend-alignment/report.md` on the branch (715 lines) |
| The rewrite commit Sam's session made | `c0f99985` "lead the report with the open questions and reversible decisions" (+322 / -986) |
| The workflow's Report and report-refresh prompts | `.claude/workflows/frontend-alignment.js` on the branch, lines 569-604 (s13 writer) and 1244-1279 (per-stage refresh) |
| Stage state | `workareas/shared/frontend-alignment/stages.json` on the branch (header + 24 stages) |
| Handover for the interview agent | `workareas/shared/frontend-alignment/HANDOVER.md` on the branch |
| Run record | `docs/analysis/frontend-alignment-workflow-run.md` on the branch |
| Parity skill REPORT / WALK / MIGRATE | `.claude/skills/parity/SKILL.md` lines 41-56, 266-429, 903-943 |
| Parity renderer | `tim/src/parity/render/page.js`, `card.js`, `sections.js` |
| Parity ruling writer | `tools/parity/rule-decision.sh` |
| Trace-requirements gate and backlog views | `workareas/trace-requirements/ched-pp/{SPEC-GATE.md, backlog.md, completeness-critique.md}`, `iuu/{verify-summary.md, corroborate-summary.md}` |
| Journey-builder spec gate and rule mode | `.claude/skills/journey-builder/SKILL.md` lines 31-159 |
| A generated spec view | `workareas/journey-builder/EUDPA-249/spec-review.md` |
| The combining precedent | `workareas/journey-builder/EUDPA-409/combination-proposal.md` |
| The rulings ledger | `repos/trade-imports-plants-frontend/src/server/app/sets/high-risk-plants/spec/{decisions.json, panel/README.md}`, `workareas/journey-builder/EUDPA-409/PROGRAMME-NOTES.md` |
| Memory on writing for Sam | `feedback_updates_stand_alone`, `feedback_reference_by_headline_not_ticket_number`, `feedback_tickets_list_open_questions_not_done`, `feedback_question_is_not_a_ruling`, `feedback_big_design_up_front_not_the_way`, `feedback_backlogs_are_json_state_not_docs`, `feedback_best_output_not_cheapest`, `feedback_no_time_estimates`, `feedback_report_progress_count_on_landing`, `feedback_headless_make_calls_dont_gate`, `feedback_architecture_tickets_pose_questions_not_moves`, `project_eudpa328_decision_visual_evidence`, `project_report_v2_answers_and_branch_collision`, `project_frontend_alignment_run` |
| GDS plain English | `docs/best-practices/gds/language.md`, `docs/best-practices/gds/writing.md` |

---

## 1. The single strongest signal: what Sam changed in the alignment report

The first alignment report (stage s13, written by the workflow's one Report agent) was
titled **"the proposal as built"** and ran in narrative order: 1 Why, 2 what changed stage
by stage (with before/after trees), 3 backports, 4 decisions the team can reverse, 5
residual drift, 6 the Welsh caveat, **7 Open questions** (32 of them), 8 keeping the three
aligned, 9 an addendum of 15 September rulings.

Commit `c0f99985` (16 September, from Sam's session) rewrote it to six sections and a new
title, **"what needs a ruling"**:

1. Open questions
2. Decisions you may want to reverse
3. What was built
4. Known caveats
5. Residual drift
6. Where everything is

Its message says exactly what was cut and why: "Drop the stage-by-stage history and
planner prose; remove the questions already ruled or resolved; re-measure the chassis
drift and the PR check states." It also re-stated the page's own purpose in its opening
paragraph (`report.md:5-7`): "This page leads with what the team must decide, then the
calls the team may reverse. Every fact was re-checked against the code and the PRs on 17
September 2026."

The effect was measurable. Sam answered questions 2 to 28 **in one batch** the same day
(`project_frontend_alignment_run.md`, "2026-09-16, later"), which became eight right-sized
stages. The report worked as a ruling surface once, and only once, the questions came
first.

**Lesson for the distiller: the report is a decision surface first and a record second.
History (what was built, how) goes below the decisions, never above them.**

### 1.1 The question shape that worked

The rewritten open questions (`c0f99985` diff, new lines 521-561) each carry four parts:

- **The question as a question**, headline first, in bold: "Should ins drop the local
  session at sign-out initiation, as the journeys do?"
- **In play:** the exact thing that changes (`src/server/auth/controller.js` in ins).
- **Options, with the count on each side** ("two against one"). The count is the
  evidence weight, stated once.
- **If nobody answers:** the concrete consequence of the default ("an ins session
  outlives a sign-out whenever Entra or the CDP WAF reject an over-long `id_token_hint`").

The table form for lower-stakes questions (`report.md:16-18`) keeps the same four columns:
`# | Question | Count | If nobody answers`.

"If nobody answers" is the report-side form of Sam's standing rule
`feedback_headless_make_calls_dont_gate`: make the call, flag it after. The report does not
block on a question; it states what will happen by default, so silence is itself a
ruling Sam can see.

### 1.2 "Decisions you may want to reverse" is the second half of the same idea

`report.md:431-483`. Each entry names the call, the rule that made it ("taken by the
direction rule ... rather than on merit. The count says which two"), what the other side
had going for it (planner and implementor both recorded that two flags was the better
design), and **"To reverse:"** with the blast radius in files and commands, never time
("22 `git mv` calls per repo and an import rewrite"). This is exactly
`feedback_no_time_estimates` applied: size as scope, not hours.

For the distiller this section is where every **precedence ruling** and every
**assumption** goes: calls the machine made without Sam, each reversible, each costed in
increments or files.

### 1.3 What the final report got wrong

By 17 September the report had drifted back toward a changelog:

- **One open question (29) against roughly 410 lines of "Rulings applied"** (`report.md:20-429`).
  The refresh prompt asked for "two to four sentences saying what changed"
  (`frontend-alignment.js:1262-1263`); entry 17 runs to 53 lines, entry 2 to 54. The page
  titled "what needs a ruling" is now 80% history. This is the
  `feedback_tickets_list_open_questions_not_done` failure in report form: DONE items
  crowding out what is left.
- **"What was built" carries typed-in, perishable facts**: CI check states per PR with
  timestamps (`report.md:487-493`). They were true at one instant and nothing regenerates
  them. HANDOVER.md has to warn the next agent: "Do not quote a check state you have not
  fetched this session."
- **The report is edited in place by an LLM**, not rendered from state. The refresh agent
  is told "keeping every other line of the report as it is" and to "Re-measure with `diff`
  before you change a row; never guess a class" (`frontend-alignment.js:1256-1268`). That
  is a prose-diff discipline standing in for a generator.

---

## 2. Question identity lived only in prose, and it broke

This is the most important defect across the precedents, because rulings are keyed on it.

- In `stages.json` a stage's `openQuestions` is an **array of plain strings** (e.g. s22,
  three unnumbered sentences). There is no id, no status, no options, no consequence.
- The **number** a question carries exists only in `report.md`. The ruling stage's
  `question` field (an integer) points into the prose ("Sam's settled answer to that
  numbered open question in report.md", `frontend-alignment.js:147`).
- The c0f99985 rewrite **renumbered the questions**. In the s13 report, 9 was "two stub
  flags or one", 13 was "keep ins's `auth.enabled` gate", 17 was "`controller.js` or
  `<page>.controller.js`"; after the rewrite, 9 is the `auth.enabled` gate and the
  numbering of everything downstream moved.
- The state then disagrees with the report: `s16-merge-main` carries `question: 13` but
  the report says question **27** closed with it (`report.md:304-311`); `s24-cross-service-shape`
  carries `question: 28` but the report files it as **30** (`report.md:390`).
- Sam's own batch answer was ambiguous against the numbers: "That's the answer to
  question 3" had to be read as belonging to 17/18 and flagged
  (`project_frontend_alignment_run.md`, "2026-09-16, later").
- The refresh prompt's defence is "keep every other question's number as it is — numbers
  are how Sam refers to them, so gaps are fine" (`frontend-alignment.js:1258-1259`). That
  protects against deletion, not against a rewrite, and a rewrite is exactly what Sam
  asked for.

HANDOVER.md then claims the opposite of the truth: stages.json "is the primary source;
the report is derived from it". It is not derived; the two are reconciled by a `jq` query
and a human cross-check (`HANDOVER.md`, "What is still open?").

**Lesson:** a question is a first-class record with a stable id **and** a headline, owned
by JSON, and the report prints both. `feedback_reference_by_headline_not_ticket_number`
says Sam does not hold id-to-meaning mappings in his head, so the id is a handle for
answering ("q-sign-out-session-drop"), never the only label. Prefer slug ids over ordinals
so a rewrite cannot renumber them (the journey-builder plans already learned this: "Plans
name other increments by key or page, never by `inc-NNN`: ids shift", SKILL.md:152-153;
PROGRAMME-NOTES.md:92-100 records the shift happening).

### 2.1 State hygiene problems seen in passing

- The `stages.json` header carries stray top-level keys `s17-auth-convergence`, `s22`,
  `ci`, `s24-cross-service-shape` (`jq 'del(.stages)'` output) - jq writes that landed on
  the wrong path. The workflow already hardened against whole-object replacement
  (`frontend-alignment.js:150-158`) after "a previous run lost a stage's commit SHAs, PRs
  and every note that way". Hand-written jq over the canonical file is the failure mode;
  setters with validation (journey-builder's `spec-set-*.sh`, parity's `tim parity set-slot`)
  are the fix.
- `s17`'s note in that stray header entry concludes "Pre-existing, unrelated to
  auth-convergence" - the phrase `feedback_dont_ignore_test_failures` bans.

---

## 3. The parity renderer: the model for "view, not source"

Parity is the one place a report is genuinely **generated from JSON by code, under test**.
Worth keeping almost wholesale as the mechanism, with its taxonomy made generic.

### 3.1 What to keep

- **Two files, two purposes** (`SKILL.md:41-56`): `backlog.json` is judgement (tracked, a
  `git diff` on it is a prose review); `evidence.json` is derived and regenerable, never
  hand-edited. `.corpus-meta.json` holds every count the masthead prints. "Nothing on the
  page is typed in."
- **Every number is derived** (`page.js:222-231`): "The page this replaces hardcoded its
  masthead facts and got two of them wrong - 103 page models against a real 104, and 60
  corrections against a real 39." The masthead headline is a sentence built from counts:
  "`N` findings, `M` of them waiting on a decision" (`page.js:287`).
- **Freshness is visible**: a drift panel lists any evidence that changed since the reader
  last looked, above everything else (`page.js:109-139`), and only a person can clear it
  (`--reseal`, SKILL.md:355-358). The footer stamps backlog SHA, mtime, tool version, pins
  (`page.js:379-405`).
- **The decision block is the top of every gated card** (`card.js:35-76`): one question,
  the options, the consequence ("Stays blocked until it is settled, and blocks
  `inc-x`, `inc-y`" when none is written), a provenance line when the question was
  machine-drafted ("Drafted from the falsifier during the migration - check this is the
  right question"), and ruling buttons.
- **Batch ruling from the page** (`page.js:186-219`, `card.js:9-33`): pick rulings on
  many cards, "copy batch" yields one `rule-decision.sh` command per line. This is what Sam
  asked for ("If the report can become a batch ruling surface, that'd be really good",
  `project_report_v2_answers_and_branch_collision.md`). The page never writes; rulings go
  through a validated script.
- **Every card says how you would say no**: "This finding is wrong if" (the falsifier,
  `card.js:358`) and a collapsed verbatim audit record "How this was checked", written by
  an adversarial reader and never rewritten (`sections.js:138-156`).
- **Evidence in reach**: citations resolve to permalinks and inline code snippets, so "a
  claim is checked without leaving the paragraph" (`sections.js:54-97`); screenshots and
  crops per side. Sam asked for visual evidence on decisions because "Descriptions are
  lovely, but it is difficult" (`project_eudpa328_decision_visual_evidence.md`).
- **Nothing is silently dropped**: an unknown band renders under "Not in a band"
  (`page.js:267-269, 346-355`); withdrawn findings stay visible "so nobody re-raises them"
  (`page.js:368-377`); deferred candidates are shown "and counted in no total".
- **Two emitters of one generator**: a static local app and a single-file artifact, with
  what the artifact cannot carry named on the page (`SKILL.md:311-317`,
  `page.js:294-298`). `feedback_best_output_not_cheapest`: never downsize to fit a channel.
- **Writing is mechanically guarded**: Pass A moves words, Pass B rewrites into GDS plain
  English; ten invariants including I5 quote conservation and I10 the polarity list
  (`SKILL.md:395-428, 903-919`). "A different worker verifies than wrote."
- **Rulings carry a reason**: `--note` is mandatory, because "A ruling without a reason is
  worth very little three months later" (`rule-decision.sh:17-19`). `falsified` is kept
  distinct from `reject` so "the ledger never credits a person with a ruling the evidence
  made on its own" (`rule-decision.sh:10-13`). A falsified dependency is stripped from
  dependents with a note, never silently (`rule-decision.sh:73-76`).
- **The pipeline says what it did not do**: "It produces findings, not rulings. When it
  finishes, no person has read a single one of them" (`SKILL.md:104-108, 287-294`), and ends
  with a short list of what it could not settle.

### 3.2 What does not transfer, or is broken

- **Two-sided by construction.** Cards render one column per side (`card.js:272-296`),
  prose slots are `frontend`/`prototype`/`difference`. A distiller has N complementary
  sources, and a requirement is asserted by several of them at once. Sam already said the
  two-sides assumption is wrong ("sources should be data, plural",
  `project_report_v2_answers_and_branch_collision.md`). The distiller's card is
  requirement-first with a sources strip, not side-by-side.
- **Recipe vocabulary in the requirement.** `TYPE_ORDER` in the renderer is
  `add-page, add-section, add-collection, add-field, obligation-change, flow-change,
  copy-change` (`page.js:15-23`) - the `frontend-change` skill's modes. The finding's
  `type` is an implementor choice leaking into the requirement record.
- **`rule-decision.sh` is run-shape specific**: it only parses `EUDPA-*` run ids and
  `inc-*` ids (`rule-decision.sh:37-42`) and hardcodes
  `workareas/journey-builder/$RUN_ID/backlog.json` (`:48`). A `NO_JIRA` programme cannot
  use it. It is also a jq-over-bash writer where `tim` is the house direction
  (`feedback_libraries_not_cli_wrappers`, `feedback_extend_tool_not_oneoff`).
- **`decision.by` is rendered** (`card.js:45`) **but never written** (`rule-decision.sh:85`
  writes `{ ruling, note, ruledAt }` only). Rulings are not attributed to a person, which
  `feedback_question_is_not_a_ruling` makes load-bearing.
- **Ruling vocabulary is accept/reject/defer/falsified.** That fits "do we want this
  finding". A distillation question is usually "which of these options", which needs the
  chosen option recorded, not just accept.

---

## 4. Trace-requirements gate reports: the best content, the worst mechanics

`ched-pp/SPEC-GATE.md` is the richest requirements-gathering report in the workspace.
Hand-written markdown, not generated, but its content model is the one to copy.

### 4.1 What to keep

- **"READ THIS FIRST - the weak parts"** leads (`SPEC-GATE.md:18-42`): the two pages with
  gap-confidence, the two behaviours "asserted from source alone" with zero trace and
  zero QA coverage, the layer disagreement precedence cannot settle, and the
  inferred-heavy pages with what would upgrade them ("A single targeted error-state trace
  run per page would upgrade most of these"). A distillation report is only as good as
  its honesty about its own evidence.
- **A confidence taxonomy with an ordering** (`SPEC-GATE.md:61-66`): confirmed (observed)
  > legacy (authoritative source, not observed) > inferred (deduced) > gap (no evidence,
  a question for a human). Counted per page, field and message, with before/after against
  the previous pass (`:46-57, 81-93`). This is the provenance grading every requirement
  in a distillation needs.
- **Conflict register, needsHuman first** (`SPEC-GATE.md:97-131`): the eight that need a
  person get a table with "why a human"; the twenty ruled by precedence are one paragraph
  each naming the rule that settled them. The split is right: precedence rulings are
  "decisions you may want to reverse", not open questions.
- **Dedupe the questions** (`SPEC-GATE.md:159-180`): "780 raw `openQuestions` across the
  page specs collapse into these themes (highest-priority first)" - nine clusters. A
  distiller that fans out extractors will produce hundreds of raw questions; the report
  must cluster them.
- **"The 5 most consequential decisions"** (`SPEC-GATE.md:259-282`) - each says why it is
  consequential ("getting it wrong is a data-isolation (security) failure, not a cosmetic
  one") and what a naive port would silently break.
- **Adversarial completeness critique** as a separate artefact
  (`completeness-critique.md:1-50`): "an honest audit of what is STILL missing ... and
  what even the enriched method cannot know". It found a real page (`gms-declaration`)
  in no increment, no page list and no target model, and explained the mechanism: "an
  evidence-led inventory under-weights a page the corpus almost never enters". The
  headline "38 of 39 map cleanly, one is deliberately excluded, and one real page is
  entirely absent" is the coverage matrix in one sentence. It also says the absence "must
  be a decision, not an omission".
- **Verify and corroborate summaries** (`iuu/verify-summary.md`,
  `iuu/corroborate-summary.md`): per-item verdict counts (Sound 22 / Corrected 21 /
  Unsound 0), per-item before -> after deltas, and a plain statement of what the method
  cannot establish ("passing traces and happy-path tests do not establish server-side
  mandatoriness").
- **Born-blocked increments state their question** (`ched-pp/backlog.md:143-156`): "the
  ruling is **not** authored here".

### 4.2 What does not transfer, or is broken

- **The most consequential decisions come last** (`SPEC-GATE.md:259`), after a GOV.UK
  component usage table. Inverted relative to what c0f99985 taught.
- **Ids instead of headlines** throughout: "c-024", "G-1..G-6", "Open Q 11/14", "OWN-1",
  "POP-2" (`backlog.md:147-156`). Unreadable to Sam without a lookup
  (`feedback_reference_by_headline_not_ticket_number`).
- **Hand-written markdown duplicates the JSON.** `backlog.md` restates `backlog.json`
  (42 increments with sizes); `feedback_backlogs_are_json_state_not_docs` says the doc is
  a generated view, never a second source.
- **Atomic by construction**: "One increment per page, in canonical journey order"
  (`backlog.md:13-14`). No second pass combines them. The titles mix outcome and recipe:
  "Notification Mongo document + persistence spine (whole-doc POST, ref mint, no ETag)"
  (`backlog.md:74`).
- **Heavy bold and jargon**, sentences well over 25 words, abbreviations never expanded
  (DoA, CUC, BIP, VM). Short of `docs/best-practices/gds/language.md`.

---

## 5. Journey-builder: the rulings ledger is the best back-channel

### 5.1 The spec gate presentation is thin

The gate itself is one sentence of instruction (`journey-builder/SKILL.md:54-58`): present
"the uncommitted diff in the worktree, lint counts, conflicts, modelGap markers, and the
open design questions". No rendered report, no ordering, no evidence. The one generated
view that did exist, `EUDPA-249/spec-review.md`, says "Rendered from `journey-spec.json` +
`conflicts.json` - the JSON is canonical; this file is a generated view" (`:4`), but its
generator is no longer in `tools/`, `tim/src` or the skills (grep finds no producer).

`spec-review.md` does show one good habit: the ruling is printed **in the row it settles**,
with attribution and date: "V4 CPH format wins ... - Sam - spec gate voice session
2026-07-07" (`spec-review.md:157`). Its failing is ordering: open conflicts (c-001) are
interleaved with resolved ones in id order, and the masthead count line
(`**46 obligations · 25 pages ... · 23 open conflicts**`, `:6`) says 23 open while most
rows carry a resolution - a typed or stale count.

### 5.2 The ledger model to keep

`decisions.json` + `spec-add-decision.sh` (`journey-builder/SKILL.md:60-96`,
`panel/README.md`):

- One entry per ruling: `id`, `subject {kind, id}`, `ruling`, `resolution`, `rationale`,
  `decidedBy` (`panel` or `sam`), `dissent`, `escalate`, `supersedes`, `supersededBy`,
  `decidedAt`, `status` (`current`/`superseded`).
- **The subject carries a pointer, never its own answer**: "It is the only place a ruling
  lives; conflicts.json and the behaviours carry a pointer to it" (`panel/README.md:3-6`).
- **Changing a ruling is a new entry with `--supersedes`**, never an edit; the chain stays
  linear (`SKILL.md:75-79`).
- **The caller passes `--decided-at`; the script never reads the clock**, so a replayed
  session gives a byte-identical ledger (`SKILL.md:72-73`).
- **Rationale cites stable source anchors**: `section:policy/para:2`,
  `annex:5/reg:24A(2)(a)`, `file:data-fields/region:Potatoes/item:1` (`decisions.json` d-001,
  d-002). That is provenance at the granularity a coverage matrix needs.
- `spec-lint.sh` errors on a decision reference the ledger does not hold and warns on
  conflicts resolved without a decision (`SKILL.md:94-96`).
- A **judges panel** (three judges and a chair per docket, plus a consistency critic)
  rules what precedence cannot, `decidedBy: panel`; Sam's standing rulings are
  `decidedBy: sam` (`panel/README.md:11-22`).

Weakness: the rationale prose is dense, 150-word sentences. The ledger is an audit
record (keep it verbatim, like parity's `verification`); the report needs a plain-English
one-line resolution above it.

---

## 6. The combining precedent (Sam's "second distillation phase")

`EUDPA-409/combination-proposal.md` is exactly the second pass Sam describes, run once by
hand. Keep its structure:

- **A summary in counts**: todo today 35, combinations 4, absorbed 5, resulting todo 30,
  pipeline runs saved 5 (`:5-11`).
- **The rules applied, stated up front** (`:13-15`): same repo only; adjacent in the
  chain; same slice of the codebase; still one reviewable PR (16 files as the aim); never
  two `add-page`; nothing gated or ruled to stand alone; never cross a milestone.
- **Per combination: combined title, evidence, footprint, risk** (low/medium, with the
  reason and "if you would rather keep X on its own, remove it from `absorbs`",
  `:27-35`). Risk says which half can go red and whether a red stays attributable.
- **"Considered and left alone"** with the reason for each pair (`:57-75`) - as valuable
  as the combinations, because it shows the rules were applied, not just the easy wins
  taken.
- **How it applies to JSON** (`:77-84`): survivor keeps the earliest id and gains
  `absorbs[]`; absorbed items get `status: "merged-into"` + `mergedInto`; dependents'
  `dependsOn` re-point via `dependsOnRewrites`; the proposal ships a machine-readable
  twin (`combination-proposal.json`). "Nothing has been applied" until approved.
- It names its own fragility: `merged-into` is unknown to the orchestrator's withheld
  list and must be added or the absorbed items get built; "If the backlog is ever
  regenerated from the spec, the combinations are lost with it" (`:84, 88`).

What to change for the distiller:

- It combined **after** planning, unioning `filesToTouch` and `verification`
  (`:81`). Combining is a requirements operation (which outcomes ship together), done
  before any plan exists; the implementor plans the combined increment.
- Its unit of cost is minutes of pipeline time ("36 to 52 minutes a run"). Measured, not
  estimated, so it is not a `feedback_no_time_estimates` breach, but the report should
  lead with runs saved and reviewable-PR size, which is what Sam cares about ("there is a
  cost for every backlog item", HANDOVER.md "The rulings backlog").
- The combined state must survive regeneration: the combination is data the generator
  reads (as backlog-extras did), not a post-hoc edit.

---

## 7. How Sam wants to be written to (memory, distilled)

| Rule | Source | What it means for the report |
|---|---|---|
| Lead with what needs him | c0f99985; `feedback_updates_stand_alone` ("Decisions that change coverage, scope or behaviour lead the update") | Open questions first, reversible calls second, everything else after |
| Every section stands alone | `feedback_updates_stand_alone` | Say what a thing is on first mention in each section; no bare shorthand |
| Headline, not id | `feedback_reference_by_headline_not_ticket_number` | Question and increment headlines are the primary column; ids are secondary handles |
| Open questions, not DONE items | `feedback_tickets_list_open_questions_not_done` | Answered questions leave the open list; rulings collapse to a ledger below the fold |
| A question is not a ruling | `feedback_question_is_not_a_ruling` | Rulings carry Sam's words verbatim + `decidedBy` + date; tentative answers are `OUTSTANDING`; security, access-control and data-integrity questions must be answered before build |
| Make the call, flag it | `feedback_headless_make_calls_dont_gate` | Every open question states the default the machine will take ("If nobody answers"); only contested-and-expensive-to-reverse items block |
| No big design up front | `feedback_big_design_up_front_not_the_way` | The report never carries per-increment plans; "nobody reviews sixty plans at once" |
| JSON is state, the page is a view | `feedback_backlogs_are_json_state_not_docs` | Generate the report; Sam "does like the generated page as well as the JSON - build both, but never only the document" |
| Best output, not cheapest | `feedback_best_output_not_cheapest` | "Luxurious" reading: evidence in reach, generous room; no channel-driven downsizing |
| No time estimates | `feedback_no_time_estimates` | Size as increment count, files, risk, blast radius |
| Progress as N of TOTAL (P%), deferred excluded | `feedback_report_progress_count_on_landing` | Masthead and build status use `done / (done + todo)` and name the deferred count separately |
| Architecture items pose questions | `feedback_architecture_tickets_pose_questions_not_moves` | For an exploratory requirement the increment's scope is questions and its outcome a recorded decision, never "move folder X" |
| Visual evidence for visual decisions | `project_eudpa328_decision_visual_evidence` | Where a source is a design, attach the picture to the question |
| Sources are plural data | `project_report_v2_answers_and_branch_collision` | No two-sides layout; a requirement lists every source that asserts or contradicts it |
| GDS plain English | `docs/best-practices/gds/language.md`, `writing.md`; alignment prompts "British English, GDS plain language, no em dashes, no time estimates" (`frontend-alignment.js:586-587, 1272`) | Sentences under 25 words, active voice, front-loaded, "cannot" not "can't", dates as "16 September 2026", abbreviations expanded on first use |

---

## 8. Recommended report contract for the distiller

### 8.1 Principles

1. **The report is a generated view of JSON.** Canonical state: the sources manifest,
   the requirements, the questions, the decisions ledger, the atomic increments, the
   combined backlog. A `tim` renderer (built on the parity render machinery: static app +
   single-file artifact, derived counts, stamp footer, drift panel) produces HTML and a
   markdown twin. No agent ever edits the report. A report-refresh step is a re-render.
2. **Questions are records.** Stable slug id + headline + question + options (each with
   the sources that support it) + default-if-unanswered + what it blocks + category
   (security/data-integrity flagged must-answer) + status (`open`, `outstanding` for a
   tentative answer, `ruled`, `superseded`). Clustering is a field (`cluster`), so 700
   raw questions render as ten groups.
3. **Every claim carries provenance and confidence.** Each requirement lists its source
   anchors (the `section:x/para:y` form from `decisions.json`) and a grade on the
   confirmed > authoritative > inferred > gap scale. The report counts each grade.
4. **Nothing is typed in; nothing is silently dropped.** Every count derived; every
   source statement lands somewhere (a requirement, a duplicate, out of scope with a
   reason, a conflict); unknown categories render under their raw name.
5. **Rulings flow in through one validated writer** (a `tim` command, not jq by hand),
   into an append-only ledger with `supersedes`, and the report re-renders.

### 8.2 Section order (with the reason each is where it is)

| # | Section | Contents | Why here |
|---|---|---|---|
| 0 | Masthead | One sentence of what is being built and why; the sources read (name, version or pin, date read); derived counts: requirements, atomic increments -> combined increments (runs saved), open questions (of which must-answer), conflicts (needs a person / settled by precedence); freshness stamp ("every fact re-checked against the sources on <date>") | c0f99985's opening paragraph; parity masthead; stands alone |
| 1 | **Needs your ruling** | Open questions, must-answer first, then by what they block. Each: headline, the question, options with which source says what (and pictures where visual), "If nobody answers: <default the distiller will take>", "Blocks: <increment headlines>". Batch-ruling controls emitting one command per line | The single thing the report exists for (c0f99985, SPEC-GATE needsHuman first, parity decision block) |
| 2 | **Calls we made that you may want to reverse** | Precedence rulings and assumptions: the rule applied, the other side's case, "To reverse:" in increments/files touched | Alignment report s.2; SPEC-GATE "ruled by precedence"; `feedback_headless_make_calls_dont_gate` |
| 3 | **Where the evidence is weak** | Requirements on a single source or at inferred/gap confidence; what the method cannot know; what would upgrade each | SPEC-GATE "READ THIS FIRST"; completeness critique |
| 4 | **The backlog** | Combined increments in build order: headline outcome, the requirements it satisfies, observable acceptance, dependsOn, gate. Progress as N of TOTAL (P%), deferred excluded. Each combined increment expands to its atomic members | The build plan, stated as requirements not recipes |
| 5 | **How increments were combined** | The rules, per combination the evidence and risk, and "considered and left alone" | combination-proposal.md |
| 6 | **Coverage** | Source -> requirement -> increment matrix; every source statement accounted for; the gap count must be zero or each gap is a question in section 1 | completeness critique ("38 of 39 map cleanly"); parity "nothing is dropped" |
| 7 | **Conflicts between sources** | Full register: needs-a-person (cross-linked to section 1), settled by precedence (cross-linked to section 2), with both sources quoted | SPEC-GATE register; spec-review ruling-in-row |
| 8 | **Out of scope, parked, rejected** | Each with who ruled and when; kept so nobody re-raises it | parity withdrawn; plants standing rulings |
| 9 | **Rulings applied** | The ledger, newest first, one plain-English line each with Sam's words verbatim and the date; the full rationale collapsed | Alignment "Rulings applied", kept short |
| 10 | **Where everything is** | Paths to every JSON file, the run record, the generator command; footer stamp | Alignment report s.6; parity footer |

### 8.3 How rulings flow back

1. Sam rules on the page (batch) or in conversation.
2. One writer records each: `{ questionId, answer (chosen option or free text), words
   (verbatim), decidedBy, decidedAt, note, supersedes }`. A tentative answer ("maybe?")
   is written as `outstanding` with his words, never as a ruling.
3. The ruling is **applied to the requirements**, not to increments: it can add, drop,
   re-grade or reshape requirements, and each change is recorded against the decision id.
4. Because requirements changed, the **combining pass re-runs** over the atomic set, so a
   ruling that splits or merges outcomes re-shapes the backlog deterministically, and
   the combination record survives regeneration.
5. The report re-renders: the question leaves section 1 and appears as one line in
   section 9; any increment it unblocked moves from `blocked` to `todo`.
6. The implementor reads the increment's requirements, the rulings they cite and the
   code, and owns the how. The frontend-alignment "ruling stage" pattern (one stage per
   answer, carrying `question` and `ruling`, right-sized by combining related answers)
   is the build-time consumer of this, and its `RULING_RULE` ("Never reopen the
   question, never soften the ruling into an option, never widen it",
   `frontend-alignment.js:160-163`) is the right instruction to hand the implementor.

---

## 9. Recipe smells found in the report precedents

| Where | Evidence | Why it is a recipe |
|---|---|---|
| `stages.json` s22 `brief` | "Plants gets the same block, byte-identical except for values ... `docker/stack/frontend.compose.yml` sets the keys on each frontend to the browser-visible localhost origins ... one spec that starts in animals" | Names files, config blocks and the test to write; a requirement would say "the Address book link works from every service, in compose and CDP, without a second sign-in mechanism". It does open well: "measure before you build" |
| `stages.json` every stage `reference` | lists of repo file paths to copy from | Prescribes the source of the answer |
| `stages.json` header `targetTree` | the full intended file tree | A structural recipe for the whole programme; right for an alignment, wrong as a requirements default |
| Parity finding `type` + renderer `TYPE_ORDER` | `add-page`, `add-field`, `obligation-change` (`page.js:15-23`) | The implementor skill's mode baked into the requirement and the report order |
| Parity `correction` slot | "Corrected by verification" (`card.js:356`) holding a proposed change | Fine as evidence, but where it names a code change it prescribes the fix |
| Journey-builder plan fields on increments | `filesToTouch`, `recipe`, `implementorSkill`, `acceptanceCriteria`, `verification` (`journey-builder/SKILL.md:134-146`) | The plan rides inside backlog.json; Sam's 21 August ruling says buildability is status and dependencies only |
| `ched-pp/backlog.md` titles | "whole-doc POST, ref mint, no ETag"; "One increment per page" | Mechanism and slicing chosen at distillation time |
| `combination-proposal.md` | survivor's `filesToTouch` and `verification` are the union of members' (`:81`) | Combining planned recipes rather than requirements |

---

## 10. Integration gaps between the report precedents

- **Three ruling mechanisms, three id schemes, no shared record.** Alignment: append a
  stage with `question: <report number>` and `ruling: <prose>`. Parity:
  `rule-decision.sh <EUDPA-run> <inc-id> accept|reject|defer|falsified --note`. Journey-
  builder: `spec-add-decision.sh --subject conflict:c-012 --supersedes d-003`. None can
  read the others' decisions.
- **Three report mechanisms.** LLM-edited prose (alignment), tested `tim` renderer
  (parity), hand-written markdown (trace-requirements, and a generated view whose
  generator is gone: `EUDPA-249/spec-review.md`).
- **Questions have no home in backlog.json.** Alignment keeps them as strings on stages;
  parity as `decisionRequired` on a gated increment; journey-builder as `conflicts.json`
  and behaviours with `open-question` status; trace-requirements as 780 per-page strings.
  A question that blocks several increments, or none, has nowhere to live.
- **Path and run-id coupling.** `rule-decision.sh` and `next-increment.sh` hardcode
  `workareas/journey-builder/<EUDPA-*>/backlog.json`; the alignment programme lived under
  `workareas/shared/` with a `NO_JIRA` branch and could use neither.
- **Status vocabularies differ.** Alignment: `todo`, `done`, `ladder-red`, `ci-red`,
  `e2e-red`, `implement-failed`, `ci-retry`, `e2e-retry`. Parity/journey-builder: `todo`,
  `inprogress`, `done`, `failed`, `blocked`, `dropped`. The combining precedent adds
  `merged-into`, unknown to the orchestrator's withheld list.
- **Nobody verifies the report.** Parity has checkers and a different-agent claim
  verifier; the alignment report is one Opus/Fable agent with no verify step; SPEC-GATE
  is hand-written. The distiller's report deserves the parity treatment: derived counts,
  plus an adversarial reader over the prose.
- **Progress reporting** (`N of TOTAL (P%)`, deferred excluded) appears in no report
  template; it lives only in memory.

---

## 11. Open questions for the design

- Does the distiller's report reuse `tim parity render` generalised (sources as data,
  requirement cards) or a sibling `tim` renderer that shares `theme.js`, `prose.js` and
  the citation/snippet machinery? The parity card is two-sided at its core
  (`card.js:272-296`).
- Is one decisions ledger shared by distillation and build (so an implementor's
  judge-deferred question and a distillation question are the same record), or does the
  build loop keep its own `openQuestions` and promote them?
- Where does the canonical state live for a `NO_JIRA` programme, given the hardcoded
  `workareas/journey-builder/<EUDPA-*>/` path?
- Should the batch-ruling control emit `tim` commands (house direction) and retire
  `rule-decision.sh`, or wrap it?
- For a question with a security, access-control or data-integrity dimension, does the
  report mark it must-answer and the builder refuse to pop anything it blocks, even
  though `feedback_headless_make_calls_dont_gate` otherwise says decide and flag?
- How are rulings given in conversation (Sam's batch answers by number) captured without
  the "question 3 meant 17/18" ambiguity: does the report print a paste-ready answer
  sheet keyed by slug?
- Should the report render per-question visual evidence from design sources
  (screenshots/Figma frames) as parity does per finding, and who captures it?
