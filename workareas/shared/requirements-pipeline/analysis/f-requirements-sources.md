# F — Requirements-gathering precedents: what to keep, what is broken, and a requirement-shaped increment schema

Analyst brief: survey how requirements have been gathered from loose sources across the workspace, and extract the best patterns for (1) ingesting heterogeneous sources with provenance, (2) reconciling complementary and conflicting sources, (3) surfacing open questions and assumptions, (4) writing acceptance criteria that are testable but not recipes, and (5) sizing increments. End with a recommended increment schema.

Read-only survey, 2026-09-18. Everything below is cited `file:line` (workspace-relative unless stated) or by `jq` result over the named file.

---

## 0. Sources surveyed

| Family | Files read |
|---|---|
| Trace mining (four CHED types) | `workareas/trace-requirements/ched-pp/trace-to-requirements.workflow.js` (1,495 lines, all of it), `ched-pp/doa-and-legacy-enrich.workflow.js` (confidence and precedence sections), `ched-pp/backlog.json`, `ched-pp/conflicts.json`, `ched-pp/SPEC-GATE.md`, `ched-p/SPEC-GATE.md` (head), `ched-p/reconcile-notes.md`, `ched-p/PAUSED-RESUME.md`, `ched-p/completeness-critique.md` (head), `ched-p/backlog.json`, `ched-d/backlog.json`, `iuu/backlog.json`, `iuu/verify-summary.md`, `iuu/corroborate-summary.md` |
| Multi-source digest (plants, EUDPA-409) | `.claude/skills/journey-builder/references/SOURCE_EXTRACTOR.md` (all 789 lines), `SPEC_RECONCILER.md`, `INCREMENT_PLANNER.md`, `journey-builder/SKILL.md` (digest, rule, backlog modes), and the run it drove: `workareas/journey-builder/EUDPA-409/{RECONCILER-BRIEF.md, PROGRAMME-NOTES.md, combination-proposal.md, rules.mural.md, .digest-meta.json, extract.confluence-requirements.json, panel-rulings.json, panel-critic.json, backlog.json}` |
| Behaviour Spec | `openspec/config.yaml`, `docs/reference/openspec.md`, `openspec/specs/plants/journey-obligations/origin/spec.md` and its `coverage.json` |
| Ticket skills | `.claude/skills/ticket-creator/SKILL.md`, `assets/templates/story.md`, `.claude/skills/ticket-refiner/SKILL.md`, `docs/best-practices/jira/ticket-conventions.md` |
| Ralph plugin | `~/.claude/plugins/cache/ralph-marketplace/ralph-skills/1.0.0/skills/prd/SKILL.md`, `skills/ralph/SKILL.md`, `prompt.md` |
| Cross-check (the "good" workflow's backlog) | `feat/NO_JIRA-frontend-alignment:workareas/shared/frontend-alignment/stages.json` (top-level shape, `direction`, `invariants`, `rulings`, stage `s05-app-shell`) |

The single most important observation up front: **the workspace already has two complete, independently evolved requirements pipelines** — the trace-mining workflow (`trace-to-requirements.workflow.js`, run four times) and the journey-builder digest (`SOURCE_EXTRACTOR` → `SPEC_RECONCILER` → panel rulings → `decisions.json` → `backlog-generate.sh`, run for plants EUDPA-409). They agree on the load-bearing ideas (verbatim-or-gap, provenance on every claim, declared precedence, every disagreement a recorded conflict, a human spec gate, born-blocked increments), and they disagree — or drift — on almost every field name. The distiller should be the union of their best parts behind one schema, not a third design.

---

## 1. Ingesting heterogeneous sources with provenance

### 1.1 Best patterns (keep)

**K1. Characterise first, extract second.** `SOURCE_EXTRACTOR.md:17-26`:

> "If your source has no section below, your first job is to write one. Open the source, work out its actual structure — sections, tables, annexes, board regions, whatever it turns out to be — and write that down as a new section here before you extract a single item. … Reading a document as you go and inferring its shape from the parts you happen to hit is how a spec acquires invented requirements."

This is the best single rule in the workspace for loose sources. The EUDPA-409 run shows it working on genuinely heterogeneous inputs: a `.docx` policy paper with no tables and no heading styles (`SOURCE_EXTRACTOR.md:135-166`, structure recovered from list numbering in `word/numbering.xml`), two Confluence pages (one of which turned out to be a pointer to a SharePoint workbook, `:314-319`), four Mural screenshots with an inferred colour key (`rules.mural.md:15-24`), a prototype repo that turned out to contain *nothing* plants-specific and says so with the grep that proves it (`SOURCE_EXTRACTOR.md:480-514`), and two code repos. The characterisation is written into the workarea as `rules.<source>.md` (seven of them under `workareas/journey-builder/EUDPA-409/`) and each extract's `summary` states what structure was found (`extract.confluence-requirements.json` `.summary`: "Page is two info panels and three h4 bullet lists … Every bullet extracted: 29 fields (5 composites expanded) … The requirements catalogue itself is a SharePoint Excel workbook linked from the page and not fetched").

**K2. A per-source provenance token scheme, designed from the source's own structure.** Each characterised source gets its own citable address grammar:
- policy paper: `section:<slug>/para:<n>/item:<k>`, `annex:5/reg:24A(2)(aa)`, `footnote:<n>` (`SOURCE_EXTRACTOR.md:193-206`), with the rule "where the same element is stated in three places, provenance is the … most precise and `alsoStatedAt=` lists the others";
- Confluence without anchors: the row's own ID (`NNS-UN-<nnn>`) (`:262-267`), or `h4:<heading>/li:<n>` (`:343-349`);
- screenshots: `file:<short>/region:<label>/item:<n>[/crop:<name>]` (`rules.mural.md:44-48`);
- code: `<repo-relative path>:<line>` plus the pinned sha (`SOURCE_EXTRACTOR.md:541-542`, `:663-664`);
- traces: `trace hash + action id` (`trace-to-requirements.workflow.js:171-173`).

Provenance is *multi-valued* — "Each field carries the sources that evidenced it, not just one" (`trace-to-requirements.workflow.js:1003`; `SPEC_RECONCILER.md:22-24`).

**K3. Source roles, not just source ranks.** The EUDPA-409 reconciler brief (`RECONCILER-BRIEF.md:30-36`) and `SOURCE_EXTRACTOR.md:113-117, 544-553, 670-677` distinguish four roles that a flat precedence list cannot express:
- **requirement source** (tiered: policy paper rank 1; Confluence ×2 + Mural rank 2; prototype rank 3);
- **consistency anchor** — `live-animals`: "Items from this source are consistency anchors, never requirements … Never let an animals item become a plants requirement on its own" (`SOURCE_EXTRACTOR.md:544-553`);
- **constraint source** — `skeleton`: "the engine plants builds into and carries constraints, not requirements" (`:116-117`, `:670-677`);
- **evidence of current behaviour** — traces and tests in the CHED runs, which describe what the legacy system *does*, not what the new one *must* do.

This role split is exactly the thing that stops a codebase or a sibling service from smuggling recipes into the requirements. Keep it and make `role` a required field on every source.

**K4. Declared exclusions and unreadable sources are items, not silence.** Pointers the extractor could not follow become `note` items that the parent decides on ("POINTER, not fetched … The parent decides whether to widen the source list to that workbook", `extract.confluence-requirements.json .notes[0]`). Out-of-scope rows are extracted with `outOfScope=true` and a descope note (`SOURCE_EXTRACTOR.md:79-80`). The trace workflow logs exactly what it dropped and why ("Excluded here rather than silently — say what was dropped", `trace-to-requirements.workflow.js:470-479`).

**K5. Verbatim or nothing; tag every claim.** `trace-to-requirements.workflow.js:168-179`:

> "`confirmed` — directly observed … `inferred` — deduced from test code, page objects, or legacy source but NOT observed … `gap` — we believe this exists but have no evidence either way; a question for a human. A requirement with no citation is not a requirement. Never invent copy, labels or validation text — if you did not see it, mark it `gap` and say so."

and `:748-750` ("Do not tidy GOV.UK copy. Do not paraphrase."). The later enrichment workflow adds a fourth tier with a carefully stated meaning (`doa-and-legacy-enrich.workflow.js:84-98`): "`legacy` — read from the authoritative IPAFFS source … real and trustworthy for VALUES and COPY. For MANDATORINESS it is 'as the old system had it' — accurate, but a policy the rebuild may deliberately revisit."

**K6. Scope the admissible evidence per phase.** The trace workflow deliberately bans the legacy application source from requirements gathering ("inferring requirements from it is exactly what we are avoiding", `:799-802`) and admits it only for integration points (`:1144-1154`, "Stay on the boundary"), and later only for copy/validation under an explicit authorisation (`doa-and-legacy-enrich.workflow.js:85`). Knowing *which sources are allowed to speak to which kind of fact* is the anti-recipe device: the legacy architecture never becomes a requirement.

**K7. Say what is structurally invisible.** The Critic phase (`trace-to-requirements.workflow.js:1435-1443`) asks for "an honest account of what a trace CANNOT tell you" — business rules with no UI, server-side validation never triggered, authorisation, performance. `ched-p/completeness-critique.md:20-24` delivers it: "The 92.1% field-confidence number is flattering and unsafe … Validation is the honest counter-number: only 11 of 80 records are confirmed." Every distillation run should end with this per-source-kind blind-spot statement.

**K8. Ingest mechanics that survived contact.** `.docx` = `unzip -p … word/document.xml`, mark `</w:p>`, `</w:tr>`, `</w:tc>` before stripping tags or tables collapse (`SOURCE_EXTRACTOR.md:28-32`, `:125-133`); images via the Read tool, one at a time, crops recorded in provenance (`rules.mural.md:46-48`); traces are stateful and cwd-scoped, so each agent works in a private directory (`trace-to-requirements.workflow.js:113-124`); trace `fill` values may contain credentials and must be `[REDACTED]` (`:103-105`). These belong in a generic ingestion reference keyed by *source type*, not by source id.

**K9. Mutations through validating scripts, never hand-edited JSON.** `SOURCE_EXTRACTOR.md:36-39` (`extract-add-item.sh`, `extract-finalize.sh`), `SPEC_RECONCILER.md:11-15`, with `spec-lint.sh` re-run by the parent ("never trust the worker's green", `journey-builder/SKILL.md:52-53`). The trace workflow's equivalent is file-as-deliverable plus a small receipt (`trace-to-requirements.workflow.js:594-600`, forced by "output schema too large to classify safely … silently killed all 52 Comb agents").

### 1.2 Problems

**P1. `SOURCE_EXTRACTOR.md` mixes a generic method with ~650 lines of source-instance specifics.** Lines 1-47 are method; lines 60-782 describe *particular documents* ("five tables, three column schemas describes one particular Confluence page", `:12-15`; the plants skeleton section even inventories boot guards and tripwires at file:line, `:726-750`). The file grows by one section per new source forever, and the same text is duplicated in the workarea (`EUDPA-409/rules.*.md`). The instance knowledge belongs in the run's workarea (`rules.<source>.md`), the method belongs in the skill, and a *source-type* library (docx, Confluence HTML, image board, repo, trace corpus, transcript, Jira) belongs between them.

**P2. There is no source registry with version pinning common to both pipelines.** Journey-builder has `.digest-meta.json` (`sources` as a bare list of ids, plus `base_sha`) and per-extract `source: {id, type, ref, fetched_at}`; the trace runs record the corpus only in prose (`CORPUS_FACTS`, `trace-to-requirements.workflow.js:144-166`) and hardcode paths — including stale ones: `ABS = '/Users/samfarrington/git/defra/trade-imports-animals/workareas/...'` and `TILDE = '~/git/defra/trade-imports-animals-workspace/...'` (`:24-27`) point at two different retired workspace names, and `ched-p/PAUSED-RESUME.md:9` resumes from `trade-imports-animals/workareas/shared/trace-requirements/workflows/…`. A re-run today would fail on paths before it reached a source.

**P3. The confidence taxonomy is not canonical.** Trace pass 1 has three tiers (`confirmed|inferred|gap`, `:170-176`); the enrichment adds `legacy` (`doa-and-legacy-enrich.workflow.js:88`); journey-builder uses none of these — it has `provisionalCopy`, behaviour statuses (`adopted|parked|rejected|open-question`) and source ranks. IUU ACs prefix `[confirmed]`/`[inferred]`/`[gap]` (`iuu/backlog.json .increments[5..]`); CHED-PP ACs carry none. A distiller needs one enum with stated semantics across source kinds.

**P4. Heterogeneous "loose" sources the brief names are not covered by any precedent:** chat/transcripts, Jira tickets and comments, email, meeting notes. `ticket-refiner` fetches Jira + comments + linked Confluence into `ticket.md` via `prepare-refinement.sh` (`ticket-refiner/SKILL.md:84-92`) — that fetch is reusable as a source adapter, but nothing characterises a transcript (speaker, timestamp, decision vs musing). The characterise-first rule covers them in principle; a type section for "conversation" (provenance `speaker@timestamp`, classification of each utterance as requirement / decision / question / opinion) should be added.

---

## 2. Reconciling complementary and conflicting sources

### 2.1 Best patterns (keep)

**K10. Precedence is declared per fact kind, and applied visibly.** Trace workflow (`:990-996`): rendered-trace wins on copy/labels/options/structure; test-assertion wins on *intent* where traces are silent; page-object/workflow-config is weakest. Enrichment (`doa-and-legacy-enrich.workflow.js:95-97`): confirmed > legacy > inferred, "If legacy copy and a rendered trace disagree, keep the rendered value … that disagreement is a finding." Plants (`RECONCILER-BRIEF.md:30-36`): policy paper is the authority on *what must be collected*; the tier-2 sources are equal and disagreements among them take "the reading closest to the policy paper". Precedence is therefore a table of `(fact kind → ordered sources)`, not a single list.

**K11. Every disagreement is a conflict record — recorded, never blocking, never silent.** `trace-to-requirements.workflow.js:998-1001`: "Pick the precedence winner, adopt it into the spec, and reference the conflict id from the affected field (`"conflicts": ["c-001"]`) … A conflict is not a failure; it is the audit trail of a decision. Set `needsHuman: true` only where precedence genuinely cannot settle it." The records are rich: `ched-pp/conflicts.json .conflicts[0]` has `topic`, `pageSlug`, `alsoAffects`, `sources`, `detail` (what each source says, with file:line), `ruling`, `needsHuman`, `humanReason` — and the humanReason there is excellent: it names the downstream QA regex that would silently stop matching if the copy changed.

**K12. "Do not force-fit" — model gaps are first-class.** `trace-to-requirements.workflow.js:1005-1008` and `SPEC_RECONCILER.md:25-30`: where the model cannot express a rule (cross-page conditionality, at-least-one-of siblings, nested repeating groups), model it best-effort AND mark a named `modelGap`. `ched-p/SPEC-GATE.md:98-150` lists them with affected pages. This is the honest alternative to either inventing a mechanism (a recipe) or dropping the rule.

**K13. Panel adjudication in themed dockets, then a critic for cross-docket consistency.** EUDPA-409 grouped 83 conflicts/behaviours into dockets (`panel-rulings.json .dockets.id = "D1-territory-and-timing"`, with a docket-level summary of the ruled position) and ruled each with `ruling`, `resolution`, `rationale` (citing provenance tokens across sources — see `.rulings[0].rationale`, which cites `section:policy/para:2`, `NNS-UN` cells, `file:data-fields/region:Other goods/item:1`), `specChanges[]`, `dissent`, `escalate`, `decidedBy: panel|sam`. A `panel-critic.json` then checked coverage ("all 83 docket items received exactly one ruling"), cross-docket contradictions (six found — e.g. the late-notification flag derived on read in D1 but stored at finalise in D5, each with a `proposedFix`), vocabulary drift, and **standing-ruling breaches** ("three breaches of ruling 2"). This is the best reconciliation machinery in the workspace: headless, fast, and it keeps human authority for `escalate: true` items.

**K14. A decision ledger with supersession.** `journey-builder/SKILL.md:60-96`: `spec-add-decision.sh --subject conflict:c-012 --ruling … --rationale … --decided-by panel|sam --decided-at … [--supersedes d-003]` appends `d-NNN` to `decisions.json` and stamps the subject in the same write; "a subject carries one current decision"; the script never reads the clock "so a replayed session gives a byte-identical ledger"; `spec-lint.sh` errors on dangling decision references. `PROGRAMME-NOTES.md:28-30`: "A ruling is changed only by … `--supersedes d-NNN`, never by editing."

**K15. Standing rulings as programme-level invariants.** `PROGRAMME-NOTES.md:37-44` ("Standing rulings (product owner, 2026-09-06) — do not build": users/sign-in/agents/DoA, bulk upload, uploads, outbox…) and the frontend-alignment `invariants[]` (public URL surface unchanged; behaviour preserved unless the stage says otherwise; no shared package; copy in `copy.en.js`/`copy.cy.js`; mock at the network boundary). These are *constraints on every increment* stated once. The panel critic checks them mechanically. Keep: `standingRulings[]` / `invariants[]` at backlog level, each with an id so an AC or a critic finding can cite it.

**K16. Consistency relations to an existing sibling.** Every plants obligation and page carries `animals: {relation: same-as-animals | variant-of-animals | plants-only, obligation, page, divergence}` (`RECONCILER-BRIEF.md:121-140`). This is a requirement-shaped way to say "be consistent with X" without prescribing files: it names *which existing behaviour* to match and *what differs and why*, and leaves the how to the implementor. Generalises to `consistentWith: {ref, relation, divergence}`.

**K17. Complementary-source merge rules.** Dedup restatements rather than doubling obligations — "a summary/CYA page restates everything. Do not invent a second obligation for a restatement — link it" (`trace-to-requirements.workflow.js:1024-1025`; `ched-p` c-037 uses `restatementOf`). Composite items ("name and address of the consignor") are a parent with children (`SOURCE_EXTRACTOR.md:216-222`). Same concept across two lists gets a prefixed id and "the reconciler decides whether they are one field" (`rules.mural.md:50-55`). Tombstone or alias rather than silently dropping (the critic caught `journey-spec.json` holding 73 pages against 74 specs with no alias, `ched-p/completeness-critique.md:26-30`).

### 2.2 Problems

**P5. `needsHuman` is over-used and under-structured in the trace runs.** Resolved decisions in the CHED backlogs live as prose inside increments. `jq` over `ched-p/backlog.json` shows 74 of 108 increments `blocked`; the blocking text repeats the same unresolved decision across increments — "MODEL GAP(S): optimistic-concurrency-etag. Confirm the executable CHED-P rule before this page consumes it. Do not author the ruling." appears on **16** separate increments. IUU is 51 of 81 blocked. There is no decision object that, once ruled, unblocks all dependents; the journey-builder ledger (K14) is the fix, but the trace runs predate it.

**P6. The trace-run SPEC-GATE outgrew its reader.** `ched-p/SPEC-GATE.md` is 3,557 lines and reports "Open questions after exact whitespace-normalised deduplication | **596**" (`:25`); `iuu/SPEC-GATE.md` is 1,842 lines; `iuu/corroborate-summary.md:51` "341 retained open questions". A human cannot rule on 596 questions. The good part — "Read this first — weak parts and headline improvement" (`ched-p/SPEC-GATE.md:5-11`; `ched-pp/SPEC-GATE.md:18-42`) — is buried by the register. Questions need clustering into decisions, ranking by blast radius (how many increments each blocks), and a cap on what the human reads first.

**P7. SPEC_RECONCILER is written in one target's model vocabulary.** "Your core job is the MODEL MAPPING: express every requirement in the obligations-v2 vocabulary (obligation ids, mandate, activatedBy, collection+item, wipeOnExit, sections/pages/gates)" (`SPEC_RECONCILER.md:4-7`). Its precedence names three live-animals sources (`:17-18`) and the plants run had to override it with a 235-line brief ("this brief replaces its source list, precedence and mapping specifics … Where the two disagree, this brief wins", `RECONCILER-BRIEF.md:3-8`). For a generic distiller (the frontend-alignment programme had no obligations at all), mapping into a target's domain model is a *later, target-specific* step, not the reconciliation step.

---

## 3. Surfacing open questions and assumptions

### 3.1 Best patterns (keep)

**K18. Born-blocked with a stated question, never an authored ruling.** `trace-to-requirements.workflow.js:1329-1336`: "An increment is born blocked with `gate: "sam"` when it depends on a conflict with `needsHuman: true` … a `modelGap` marker … or a field/page whose spec confidence is `gap`. State the question in `openQuestion`. A human rules on it before the increment starts — never author the ruling yourself." Memory reinforces this ("A question is not a ruling").

**K19. Questions carry their evidence and their consequence.** The best conflict records say what each source says and what breaks downstream (`ched-pp/conflicts.json` c-004 `humanReason`). `ched-p/SPEC-GATE.md:50-56` table sorts `NEEDS HUMAN` first and states a provisional ruling beside each.

**K20. PRD-style bounded clarifying questions with lettered options** (`ralph-skills/prd/SKILL.md:24-55`): ask only critical questions, "3-5", each with options A-D so the human answers "1A, 2C, 3B". This is the right *shape* for the distiller's human gate — a short, ranked list of multiple-choice decisions with the panel's recommended option pre-selected — as opposed to 596 free-text questions.

**K21. The ticket-creator draft carries an `## Open Questions` section** separate from AC (`ticket-creator/SKILL.md:213-214`), and memory: "Tickets list open questions, not DONE items — ACs stay forward-looking."

**K22. Assumptions with a default, so the build is not frozen.** The CHED-PP backlog shows the right instinct without a field for it: inc-003 "A decision is recorded on whether validation is single-layer … Pass 1 default: single-layer, required-to-continue" and `sequencingNotes`: "c-004 … and c-014 … are NOT per-page blockers: every page ships the adopted GDS default; the sign-off is recorded once, not re-litigated per increment" (`ched-pp/backlog.json .sequencingNotes[4]`). The plants panel does the same at scale (`panel-rulings.json` D1 summary: "all buildable now with no engine change"). Make it structural: an **assumption** is `{text, default, confidence, reviseIf, decisionRef}` and does not block; a **gate** is a decision whose alternatives change *what* is built.

### 3.2 Problems

**P8. No distinction between "blocking" and "defaulted" questions** in the trace backlogs (P5), so a single missing validation string gates a whole page: IUU inc-009's gate is "Supply verbatim validation copy and rules for: Submitting 'Save and continue' with no CHED type selected" (`iuu/backlog.json .increments[8].openQuestion`) — the page could be built with provisional GDS-default copy marked `provisionalCopy`, as the plants run does (`RECONCILER-BRIEF.md:113-117`).

**P9. Field names for the question drift:** `openQuestion` (IUU, CHED-P), `blockedQuestion` (CHED-PP, CHED-D), `openQuestions[]` (INCREMENT_PLANNER plan, frontend-alignment stages), `question`/`ruling` (frontend-alignment question stages). Four spellings across five backlogs.

---

## 4. Acceptance criteria that are testable yet not recipes

### 4.1 Best patterns (keep)

**K23. The OpenSpec Behaviour Spec is the cleanest requirement format in the workspace.** `openspec/config.yaml`:
- `:7-10` "Specs … are a Behaviour Spec: intended behaviour, held separately from implemented behaviour (code) and verified behaviour (tests)";
- `:71` "Requirements use MUST (not SHALL)"; `:72-75` opening words signal scope ("The page …", "A notification …");
- `:76-77` "Scenarios: Given/When/Then, plain English, **observable only — no selectors, routes, or test-framework mechanics**";
- `:88-89` "Never name requirements after classes, files, or modules";
- `:40-50` stable IDs `REQ-<AREA>-NNN` / `SCN-<AREA>-NNN-<LETTER>`;
- `:52-69` coverage lives outside the spec, attaches to scenarios, `(type e2e|fit|unit, repo, file, test, strength full|partial)`, rolled up.

`openspec/specs/plants/journey-obligations/origin/spec.md:29-43` shows the target quality: "The system MUST narrow ware potatoes to Poland, Portugal, Romania or Spain …" with scenario "GIVEN a notification carries a ware-potato commodity line / WHEN the user chooses a country outside Poland, Portugal, Romania and Spain / THEN the country is rejected, naming those four countries". Testable (the coverage file links e2e + fit witnesses), exact about values, and silent about implementation.

**K24. Quote the source where it has words; cite it.** The trace backlog rule (`trace-to-requirements.workflow.js:1355-1359`) and INCREMENT_PLANNER (`:162-173`: "each quoting the spec where the spec has words … Cite the source in brackets. Never paraphrase a mandate into something weaker, and never invent copy"). Copy, option lists, mandates and error text are *requirements*, and quoting them is not recipe. IUU's tagged form is the best instance: `"[confirmed] The H1 reads exactly “What are you importing?” (journey-spec.json page import-type, verified confirmed)"`.

**K25. Observable-and-verifiable bar.** `ticket-conventions.md:40-45` ("Good: Page returns 400 with body "code-too-short" when commodity code <6 digits / Bad: Validation works correctly"); `ralph/SKILL.md:83-98` (good vs vague). `ticket-refiner/SKILL.md:121-127` rubric: Present / Testable / Complete / Unambiguous. Keep this rubric as the AC lint in the distiller's judge step.

### 4.2 Recipe smells (evidence)

| Where | Evidence | Why it is a recipe |
|---|---|---|
| `trace-to-requirements.workflow.js:1355-1358` (Backlog prompt rule 7) | "the page uses the GOV.UK Radios component (`govuk-radios`) in a `govuk-fieldset` with a `govuk-caption-xl`" | Component choice can be a design requirement; CSS class names are implementation. Produces IUU ACs like "uses the verified component classes `govuk-notification-banner`, `govuk-button`, `govuk-select` …" (`iuu/backlog.json` inc-008). |
| `ched-pp/backlog.json` inc-002 | "Persisted to a Mongo collection named 'notification' (house parity — `@Document(collection = "notification")`)", "Public model records carry compact-constructor null guards" | Annotations, collection names and coding conventions are house style (belong in the implementor's best-practices bundle), not acceptance. |
| `ched-pp/backlog.json` inc-001 | "A new Node service is scaffolded … mirroring trade-imports-animals-frontend (src/server, common/clients, config, a /health route)", "Agent rails land FIRST (Phase 0): .claude/ + CLAUDE.md + guard hooks + a settings.json allowlist" | Directory layout and process steps. |
| `iuu/backlog.json` inc-008/009 | "A request test proves valid answers round-trip through the single `IuuNotificationDocument` Mongo aggregate" | Names a class that the Model phase *designed* inside the requirements pipeline (`trace-to-requirements.workflow.js:1179-1263`) — design leaking into acceptance. |
| `INCREMENT_PLANNER.md:4-8, 113-137, 151-161` | plan fields `filesToTouch`, `recipe`, `verification` (exact Bash commands) written back into `backlog.json` via `backlog-plan-increment.sh`; "The reviewers check the diff against this list in both directions, so a file you leave out is a finding and a file you list and never touch is one too" | Converts the requirement into a binding file-level recipe *stored in the backlog*. The build loop's reviewers then judge conformance to the plan, not to the requirement. |
| `EUDPA-409/backlog.json` | union of increment keys includes `filesToTouch`, `recipe`, `verification`, `implementorSkill` beside `acceptanceCriteria`; file is 552 KB for 65 increments | Plan and requirement co-mingled in one object. |
| `EUDPA-409/RECONCILER-BRIEF.md:190-208` | extras such as "restore the entry guard (`flow/entry-guard.js` is inert)", "`plants` as a fourth Playwright project in `utils/playwright/shared-config.ts`" | Extras are declared as file edits. Some are unavoidable (hygiene), but the requirement ("deep links without a started journey return the user to the start page") is recoverable and should be what is stored. |
| `EUDPA-409/combination-proposal.md:23, 45` | combination evidence argued from `filesToTouch` counts and doc line numbers ("The blocks sit at add-a-field.md lines 12 and 256 today") | Combining is reasoned at recipe level, so it can only happen after planning. |
| frontend-alignment `stages.json` `s05-app-shell.brief` | "Create src/server/app/shared/{kit.js, paths.js, error.njk, …} … paths.js exports dashboardPath(), addressBookPath() … Rename common/helpers/require-organisation-id.js to …" | A full implementation plan in the requirement slot — while the same file's `invariants[]` and `direction` are cleanly requirement-shaped and the stage also has a separate `plan` file (`plans/s05-app-shell.md`) that the workflow writes. The brief pre-empts the plan. |
| `ralph/SKILL.md:100-116, 176-177` | "Always include as final criterion: Typecheck passes"; "Add status column … Generate and run migration successfully" | Verification commands and implementation steps as AC. The verification ladder belongs to the target profile; schema design belongs to the implementor. |
| `ticket-creator/assets/templates/story.md:14-17`; `ticket-refiner/SKILL.md:133` | `*Tech Notes* [Implementation hints]`; readiness check "Approach — Implementation understood?" | Invites the requirement author to pre-solve. Acceptable for a human ticket; for the distiller, hints must be explicitly non-binding and separate. |

The rule that falls out: **an AC may name anything a user, an operator, a downstream system or a reviewer can observe at a boundary** — rendered copy, options, error text, routes *only when an external contract fixes them* (frontend-alignment invariant 1 is a legitimate URL requirement because other services link to them), the shape of a persisted/published document *only when another system consumes it*, a GDS component *only when a design source mandates it* — and **must not name** files, functions, classes, annotations, test file names, CSS classes or commands. Consistency with a sibling is stated as a relation (K16), not as "copy file X".

### 4.3 AC problems beyond recipe

**P10. ACs duplicate cross-cutting requirements per increment.** IUU repeats "A request test proves valid answers round-trip through the single … aggregate … CSRF and request-only search state are not stored" on every page increment. Cross-cutting rules should be requirements/invariants referenced by id, with each increment's AC limited to what is new.

**P11. No link from ACs to OpenSpec IDs.** OpenSpec (`openspec/specs/plants/…`) and the plants backlog describe the same behaviour; nothing ties an increment's AC to `SCN-PLANTS-OB-ORIGIN-003-A`, so coverage cannot roll up to increments and drift between "what we asked for" and "what the spec says" is invisible. `docs/reference/openspec.md:95-111` lists `spec-from-tests` and `spec-drift` as unbuilt skills — the distiller could emit OpenSpec deltas as the canonical requirement store.

---

## 5. Sizing increments

### 5.1 Best patterns (keep)

**K26. One focused iteration per atomic item; if it takes more than 2-3 sentences it is too big** (`ralph/SKILL.md:46-63`, "Each story must be completable in ONE Ralph iteration (one context window)"). The trace workflow's equivalent is "One increment per page … each independently verifiable" (`:1344`) plus explicit carve-outs: reference data gets its own increments, the commodity collection is "broken into several increments and sequenced explicitly" (`:1348-1350`), variants go to a later milestone (`:1351-1352`), model-extension increments come before the first page that needs them and are born blocked (`:1336`).

**K27. Dependencies first; `dependsOn` must make the order executable** (`ralph/SKILL.md:67-80`; `trace-to-requirements.workflow.js:1337-1340`). Stable ids so regeneration preserves status (`:1339-1340`; journey-builder `backlog-generate.sh` preserves statuses "by content key", `SKILL.md:108-111`).

**K28. Size is blast radius, not effort** (`INCREMENT_PLANNER.md:147-150`). Consistent with memory ("No time estimates — convey effort via scope/risk/increment-count").

**K29. The second-pass combination already exists, with good rules.** `EUDPA-409/combination-proposal.md:13-15`: same repo only; adjacent or near-adjacent in the chain; same slice of the codebase; still one PR a reviewer can hold (~16 files); never two `add-page`; an `add-page` plus its own docs closer allowed; nothing gated/blocked/ruled to stand alone; no crossing a milestone. It records *considered and left alone* with reasons (`:57-75`) — e.g. "inc-042 + inc-043 … A sanitiser red must stay attributable" — which is exactly the judgement Sam wants. Application is durable and auditable: survivor gains `absorbs[]`, absorbed get `status: "merged-into"` + `mergedInto`, `dependsOn` rewrites listed (`:79-84`). Payoff measured: "Pipeline runs saved: 5 … the class that has cost 36 to 52 minutes a run" (`:11`).

### 5.2 Problems

**P12. Combination is a post-hoc proposal, not a distillation phase, and it is not regeneration-safe.** `combination-proposal.md:88`: "If the backlog is ever regenerated from the spec, the combinations are lost with it; the same rules would need re-applying." And `:84`: `merged-into` had to be hand-added to the orchestrator's withheld-status list or "the absorbed increments will be picked up and built on their own". Sam's two-phase design (atomic first, combine once all requirements are known) needs combination to be a first-class, idempotent step whose output is part of the canonical backlog (`members[]` on the combined increment, atoms kept as history).

**P13. Combination rules are expressed in recipe units** (file counts, doc line numbers). Before planning, those are unknowable. Requirement-level proxies exist and should be used: same `surface` (feature area / page group / service), same `consistentWith` target, shared decision/assumption refs, same acceptance boundary (one e2e journey slice), combined AC count, and "attributability" (would a red in one part be misattributed to the other?).

**P14. `sizeGuess` is inconsistent in meaning:** INCREMENT_PLANNER defines it by file counts (`:147-150`, post-plan), the trace backlogs guess it pre-plan (CHED-P: 39 S / 53 M / 16 L), EUDPA-409 withholds any increment without it from every batch (`INCREMENT_PLANNER.md:7-9`) — so size became a *gate on building* that only a recipe step can clear.

**P15. Id instability.** `PROGRAMME-NOTES.md:92-100`: after a regeneration "every increment after dashboard-date-submitted-real-list moved up by two ids … trust the key or page name they give, not the number. From then on plans name other increments by key, never by id." Content keys should be the primary identity from birth; numbers are display only.

---

## 6. Backlog-field survey (what the precedents read and write)

Union of increment keys per backlog (`jq '[.increments[] | keys] | add | unique'`):

| Backlog | Increment keys |
|---|---|
| `ched-pp/backlog.json` (42) | acceptanceCriteria, blockedQuestion, dependsOn, gate, id, kind, milestone, notes, sizeGuess, status, title |
| `ched-p/backlog.json` (108) | acceptanceCriteria, dependsOn, gate, id, kind, milestone, notes, **openQuestion**, pageSlug, sizeGuess, status, title |
| `ched-d/backlog.json` (37) | acceptanceCriteria, **blockedQuestion**, dependsOn, gate, id, kind, milestone, notes, sizeGuess, status, title |
| `iuu/backlog.json` (81) | acceptanceCriteria, **conflicts, modelGap**, dependsOn, gate, id, kind, milestone, openQuestion, pageSlug, sizeGuess, status, title |
| `EUDPA-409/backlog.json` (65) | absorbs, acceptanceCriteria, branch, commit, dependsOn, detail, e2e, entryPages, failure_reason, filesToTouch, gate, id, implementorSkill, key, kind, mergedInto, milestone, notes, obligations, openQuestions, page, prs, recipe, repo, section, sizeGuess, slug, status, ticket, title, type, verification |
| frontend-alignment `stages.json` (24) | brief, ci, commit, e2e, id, kind, ladder, localE2e, notes, openQuestions, plan, prs, question, reference, reportRefreshed, repos, ruling, status, title |

Top-level: CHED-PP/CHED-P/CHED-D carry `brief, source[], generated, regenerationOf, deviations[], scopeExclusions[], bornBlocked[], sequencingNotes[]` (excellent — a backlog that explains itself); IUU carries only `increments, milestones, sequencingNotes`; EUDPA-409 carries `run_id, schema_version, target`; frontend-alignment carries `purpose, direction, invariants[], rulings, repos, branch` plus loop config (`ciWatchSeconds`, `reviewCap`, …). Four families, no shared schema, and `kind` means different things in each (`scaffold|add-page|…` vs `fix|chore|feature` branch prefix vs `null`).

Worth keeping at top level: `brief`/`purpose`, `sources[]` (with role and version), `deviations[]` (deliberate departures from the evidence, e.g. `ched-pp` "Whole-document Mongo POST … drop IPAFFS's JSON-Patch"), `scopeExclusions[]`, `standingRulings[]`/`invariants[]`, `direction`, `sequencingNotes[]`, `schemaVersion`.

---

## 7. Recommended requirement-shaped increment schema

Design principles, each traced to evidence above:
1. **Requirement and build state are separate objects.** The distiller owns the requirement fields; the implementor workflow owns `build` (plan path, branch, ticket, PRs, commits, failure) and never edits requirement fields — it writes discrepancies into `build.notes` (the "spec wins" rule from `PROGRAMME-NOTES.md:34-35`). Recipes (`filesToTouch`, `recipe`, `verification` commands) live only in the workflow's per-increment plan file, never in `backlog.json` (fixes P10-smells in `INCREMENT_PLANNER`, `EUDPA-409`, `stages.json`).
2. **Content key is identity** (P15); `id` is a display ordinal.
3. **Cross-cutting rules are referenced, not repeated** (P10): `invariants`, `decisions`, `assumptions` live at backlog level with ids.
4. **One question taxonomy** (P8/P9): `gate` (blocks; a decision whose options change *what* is built) vs `assumption` (does not block; ships a stated default) vs `note`.
5. **AC are observable, sourced, confidence-tagged, and optionally linked to OpenSpec scenario ids** (K23-K25, P11).
6. **Two-phase sizing is structural** (K26, K29, P12-P13): atoms are born in phase 1 with `grain: "atomic"`; phase 2 emits `grain: "combined"` increments with `members[]`, atoms get `status: "combined-into"`.

```jsonc
{
  "schemaVersion": 1,
  "programme": "high-risk-plants",
  "brief": "What is being built, for whom, and why — two or three sentences.",
  "sources": [
    {
      "id": "phnns-policy",
      "type": "docx | confluence | jira | image-board | repo | trace-corpus | transcript | prototype | openspec",
      "role": "requirement | constraint | consistency-anchor | current-behaviour",
      "tier": 1,                                  // precedence within role
      "ref": "…path, page id, sha, url…",
      "version": "v1 August 2026 | sha 0a8dead | page v11",
      "fetchedAt": "2026-09-06T10:49:52Z",
      "characterisation": "workareas/…/rules.phnns-policy.md",
      "provenanceScheme": "annex:<n>/reg:<ref> | section:<slug>/para:<n>"
    }
  ],
  "precedence": [ { "factKind": "copy|values|mandate|flow|intent|scope", "order": ["phnns-policy", "confluence-requirements"] } ],
  "invariants":   [ { "id": "inv-01", "text": "No shared package; duplication is deliberate.", "source": "ruling:2026-09-06" } ],
  "standingRulings": [ { "id": "sr-02", "text": "Delegation of authority is not built.", "decidedBy": "sam", "decidedAt": "2026-09-06" } ],
  "scopeExclusions": [ { "text": "Bulk upload", "why": "parked by sr-03", "provenance": ["NNS-UN-017"] } ],
  "deviations":   [ { "text": "Great Britain, not England, in every string", "decision": "d-001" } ],
  "decisions":    [ { "id": "d-001", "subject": "conflict:c-001", "status": "current|superseded|open", "options": ["A …", "B …"], "recommended": "A", "resolution": "…", "rationale": "…cites provenance…", "decidedBy": "panel|sam", "escalate": false, "supersedes": null, "blocks": ["origin-country-narrowing"] } ],
  "assumptions":  [ { "id": "as-004", "text": "Error-summary title is the GDS default 'There is a problem'.", "default": "…", "confidence": "inferred", "reviseIf": "content designer rules otherwise", "decision": "d-004" } ],

  "increments": [
    {
      "key": "origin-country-narrowing",             // stable identity (content key)
      "id": "inc-014",                               // display ordinal, may renumber
      "grain": "atomic | combined",
      "members": [],                                 // combined only: atom keys, in chain order
      "title": "A notification's country of origin narrows to its strictest commodity line",   // outcome-phrased, ≤80 chars
      "kind": "capability | page | rule | integration | reference-data | hygiene | e2e | spike",
      "outcome": "Who can now do or rely on what, and why it matters (1–3 sentences).",
      "userNeeds": ["NNS-UN-012"],                   // provenance tokens of the needs it serves
      "surface": { "service": "plants-frontend", "area": "origin", "repos": ["frontend", "tests"] },  // WHERE, never HOW
      "requirements": ["REQ-PLANTS-OB-ORIGIN-002", "REQ-PLANTS-OB-ORIGIN-003"],   // OpenSpec ids when present
      "acceptanceCriteria": [
        {
          "id": "ac-1",
          "given": "a notification carries a ware-potato commodity line",
          "when": "the user chooses a country outside Poland, Portugal, Romania and Spain",
          "then": "the country is rejected, naming those four countries",
          "scenario": "SCN-PLANTS-OB-ORIGIN-003-A",
          "evidence": [ { "source": "phnns-policy", "ref": "annex:5/reg:24A(1)(b)", "confidence": "stated" } ],
          "witness": "e2e | fit | unit | review"      // the LEVEL of proof expected, never a command or file
        }
      ],
      "consistentWith": [ { "ref": "live-animals:origin/countryOfOrigin", "relation": "variant-of", "divergence": "value list constrained by commodity (reg 24A(1))" } ],
      "constraints": ["inv-01", "sr-02"],             // references only
      "decisions":   ["d-007"],
      "assumptions": ["as-004"],
      "gate": null,                                  // or the decision id that must be ruled first (blocking only)
      "outOfScope":  ["Territorial check on the destination address (d-001)"],
      "dependsOn":   ["commodity-lines-collection"], // keys, not ids
      "size": { "class": "S|M|L", "basis": "3 AC, 1 surface, no new collection" },  // requirement-level proxies
      "hints": { "exemplars": ["repos/trade-imports-animals-frontend/…/features/origin/"], "binding": false },
      "provenance": [ { "source": "confluence-requirements", "ref": "h4:All other goods/li:1" } ],
      "status": "todo | blocked | in-progress | done | combined-into | deferred | dropped",
      "combinedInto": null,

      "build": {                                     // OWNED BY THE IMPLEMENTOR WORKFLOW ONLY
        "plan": "workareas/…/plans/origin-country-narrowing.md",
        "executor": "claude | codex",
        "ticket": null, "branch": null, "prs": [], "commits": [], "failureReason": null, "notes": []
      }
    }
  ],

  "combination": {                                   // phase-2 audit, regenerated idempotently
    "rules": ["same repo set", "adjacent in chain", "same surface.area", "never two page increments", "never across a gate or milestone", "attributable failures"],
    "applied":  [ { "into": "arrival-details", "members": ["arrival-details", "exemplar-multi-field-page"], "why": "…" } ],
    "declined": [ { "members": ["entry-guard", "contract-tests"], "why": "a red must stay attributable" } ]
  }
}
```

Confidence enum (P3), with semantics independent of source kind:
- `observed` — seen happening in a running system (trace snapshot, live page, test run) — was `confirmed`;
- `stated` — written in an authoritative source of the requirement tier (policy, signed-off design, Confluence requirements, a Sam ruling);
- `legacy` — read from the old system's source; trustworthy for values/copy, *not* for policy (keep the enrichment workflow's caveat verbatim);
- `inferred` — deduced (tests, page objects, a sibling's shape, a user need that implies a field);
- `gap` — believed to exist, no evidence; must become a decision or an assumption.

---

## 8. Phase design recommendations for the distiller (from the precedents)

1. **Register** sources with role/tier/version; **characterise** each (K1) into `rules.<source>.md`; a source *type* library supplies mechanics (K8), the run supplies instance characterisation (fix P1).
2. **Extract** per source in parallel, verbatim, provenance-tokened, with `note` items for ambiguity and unreadable pointers (K4, K5). Hard-gate on empty extracts (`trace-to-requirements.workflow.js:913-927` — "a confident-looking deliverable with no evidence under it … must never happen silently").
3. **Verify** each extract adversarially by a different agent (trace Verify stage, `:850-902`: invented copy, confidence inflation, uncited claims, missed items; "Being unable to find a problem is a valid outcome — do not invent corrections to seem useful"). IUU: 21 of 43 pages corrected (`iuu/verify-summary.md:7-10`) — this step pays.
4. **Reconcile** into a target-agnostic requirement set (requirements + scenarios + behaviours + conflicts + modelGaps), per-fact-kind precedence (K10), every disagreement a conflict (K11), don't force-fit (K12). Target-model mapping (obligations, collections) is a later optional step, not this one (P7).
5. **Adjudicate** conflicts in themed dockets by a panel with rationale/dissent/escalate, then a panel critic for cross-docket contradictions and standing-ruling breaches (K13); record in a superseding decision ledger (K14). Only `escalate: true` decisions reach Sam, as multiple-choice with a recommendation (K20).
6. **Distil pass 1 — atoms**: one observable outcome each (K26), cross-cutting rules lifted into invariants/assumptions (P10), gates only for decisions that change *what* is built (P8), content keys (P15).
7. **Distil pass 2 — combine**, once the atom set is complete: requirement-level combination rules (P13) derived from `combination-proposal.md:13-15`, with declined pairs recorded (K29), durable across regeneration (P12).
8. **Critique** for completeness and structural blind spots (K7), including coverage of every source item (every extract item maps to a requirement, an exclusion, a note or a decision — the plants panel critic's "all 83 docket items received exactly one ruling" check generalised).
9. **Report**: lead with the weak parts and honest counts (`ched-pp/SPEC-GATE.md:18-42` is the model), then the ranked decisions Sam must make (count of increments each unblocks), then coverage by source; push the full registers into linked JSON/appendix so the page stays readable (fix P6). Keep a method critique section.

---

## 9. Integration gaps observed

- The four trace-requirements backlogs have never been built and have no target profile in `tools/journey-builder/targets.json`; their schema (P9, §6) would not be accepted by `backlog-plan-increment.sh` or the build-orchestrator without translation.
- The build-orchestrator's withheld-status list had to be hand-extended for `merged-into` (`combination-proposal.md:84`); status vocabularies differ across journey-builder (`todo|blocked|done|dropped|merged-into|deferred|rejected`) and frontend-alignment.
- The frontend-alignment workflow stores questions as `question`/`ruling` on stages and rulings as a prose string (`stages.json .rulings`), while journey-builder uses `decisions.json` with `d-NNN` and supersession — two ledgers for the same concept.
- OpenSpec requirement/scenario IDs and coverage rows are not referenced by any backlog; the spec and the backlog can drift silently (P11).
- journey-builder `backlog-generate.sh` derives "one increment per page in section order" (`SKILL.md:100-103`) — an atom rule tied to page-shaped journeys; non-journey programmes (frontend-alignment, integrations, hygiene) enter only as hand-declared `backlog-extras.json` with recipe `detail`.
- `INCREMENT_PLANNER` writes the plan back into `backlog.json`, so the "plan" and "requirement" cannot be versioned or reviewed separately, and a Codex executor inherits a Claude-written file list as binding.
- The trace workflow designs a target data model (`Model` phase) and the backlog then cites it in ACs, so design decisions made during requirements gathering become acceptance criteria (§4.2).
- Sources outside Atlassian/repos/traces (chat transcripts, meeting notes, emails) have no characterisation template (P4).

## 10. Open questions for the design

1. Is the canonical requirement store the distiller's own `requirements.json` or OpenSpec (`openspec/specs/**` deltas via the `openspec-*` skills), with `backlog.json` referencing `REQ-`/`SCN-` ids? OpenSpec gives validation, stable ids and coverage for free, but its capability layout is service-area specific (`openspec/config.yaml:16-38`).
2. Where does target-model design live — a distiller phase (as in the trace workflow) or the implementor's first increment/spike? The recipe analysis argues for the latter, flagged as a `spike`/`capability` increment whose AC is "the model can hold every requirement in set X".
3. Are GOV.UK component choices requirements? Recommendation: only when a design source mandates them (then `stated`), otherwise implementor choice under the "govuk toolbox only" invariant.
4. Should phase-2 combination be applied automatically or proposed for Sam's approval? `combination-proposal.md` was proposal-only ("Nothing has been applied"); memory says "make the call, flag it after". Suggest: apply automatically under the rules, report applied and declined in the report.
5. Should `size` survive at all pre-plan, given the build-orchestrator withholds increments without `sizeGuess` (`INCREMENT_PLANNER.md:7-9`)? Suggest requirement-level size class with a stated basis, and drop the withhold rule.
6. How are the existing trace-requirements backlogs migrated — re-distilled from their `journey-spec.json`/`conflicts.json`, or mechanically translated? Their `bornBlocked` rationale would collapse into a handful of decisions (e.g. the 16 `optimistic-concurrency-etag` blocks → one `d-NNN`).
7. What is the panel's authority boundary? EUDPA-409 let `decidedBy: panel` settle 83 items with Sam on escalations; the CHED runs sent every `needsHuman` to Sam. A written rule (e.g. panel may rule anything precedence plus standing rulings can settle; must escalate policy, legal, scope and cost-of-reversal-high items) is needed.
