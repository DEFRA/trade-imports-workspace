# Candidate design: reuse-maximal, smallest new surface

Design candidate for the requirements pipeline, 18 September 2026. Angle: build as little as possible that is new. Every component below is an existing asset moved, generalised or joined, and every new file carries a one-line reason why an existing file could not be extended.

Evidence base: `analysis/sam-requirements.md` (R1 to R6), `analysis/rules-probe.md`, `analysis/00-synthesis.md` and the analyst files `a` to `h` and `gap-1` to `gap-5`. Citations are `file:line` on `main` at `d07af6b9` unless marked `FA:` (`frontend-alignment.js` on `feat/NO_JIRA-frontend-alignment`) or named to another branch.

---

## 0. The shape in one page

The whole design is **three deep components and two thin skills**. Nothing else is new except a handful of files, each justified in section 0.2.

| # | Component | Evolved from (by `git mv` where possible, so history is kept) | What it becomes |
|---|---|---|---|
| 1 | **`tim backlog`** | `tim parity` (`tim/src/parity/{ingest,set,io,schema,counts,coverage,slices,yield,duplicates,heads,meta,seals}.js`, `citations/*`, `render/*`), `tools/parity/phase.sh`, `tools/parity/corpora.json` | The one deterministic writer, validator, gatekeeper and renderer for every backlog. Parity becomes one profile of it (`parity-v1`), so every `tim parity` command and test keeps working |
| 2 | **`.claude/workflows/backlog.js`** | `increment-build-loop.js` (lifecycle, executor switch, resume), `frontend-alignment.js` (plan, sync, focused review, red statuses, drain), `workareas/shared/dr1c-parity/author-workflow.js` (author then verify per slice), `trace-to-requirements.workflow.js` (extract verify, critic) | One Workflow script with two modes: `build` (drain a backlog, one increment at a time) and `distil` (pass 1 atoms, verify, reconcile, panel, dedupe, pass 2 combine, critic) |
| 3 | **Stage briefs and executor profiles** | `.claude/workflows/codex/{implement,review,fix}.md` + `codex/schemas/*` | One brief per stage, read by **both** executors, plus two executor profile files (`claude.md`, `codex.md`) holding each executor's preamble and deltas |
| 4 | **`backlog-distiller` skill** (thin driver) | `git mv .claude/skills/journey-builder` (DIGEST, rule mode, personas) plus parity's AUTHOR control plane and trace-mining's verify and critic | Main-session driver for distillation, rulings and report |
| 5 | **`backlog-implementor` skill** (thin driver) | `git mv .claude/skills/build-orchestrator` | Main-session driver for building: parses "build inc-012 to inc-020 with Codex", launches the workflow, verifies from state, prints the handover |

What is **retired**: journey-builder BUILD mode and its scripts, `backlog-generate.sh`'s page generator, `backlog-plan-increment.sh` and `INCREMENT_PLANNER.md`, the run-copy and `FALLBACK` idiom, the path-locked parity bash writers (for new backlogs), free-hand agent edits of state, and the LLM-edited report.

### 0.1 Why this is the smallest surface that meets R1 to R6

- R1's writer, ids, ruling protection and report already exist in `tim parity` (G2, G3, G §3). Generalising them is smaller than any new writer.
- R1's two-pass distillation already exists as parity's author, verify and duplicate sweep (G1), plus the EUDPA-409 combination rules (`combination-proposal.md:13-88`). Pass 2 is the sweeper's question moved one step up the same scale.
- R1's implementor already exists twice. Joining the loop's lifecycle to FA's plan stage gives both halves in one file (B §9, C §8).
- R2 and R3 need no new personas: the workflow reads the `review` and `code-style` personas, their router (`tools/style/file-topics.sh`) and their bundle lists live. The only change to those skills is one "embedded" section per persona and one `--list` flag on `bake-rules-bundle.sh`, both owned by the skills.
- R5 needs no new mechanism: the backlog stops carrying run config, and the executor moves into a sibling `run.json` the writer already knows how to keep.
- R6 reuses the proven Codex shell mechanics (`increment-build-loop.js:682-825`) but moves slicing and fan-out into one committed script, so Codex runs the same per-file granularity as Claude.

### 0.2 The new-file ledger

Every file that does not exist today, with the reason an existing file could not take the job.

| New file | Why not extend an existing one |
|---|---|
| `tim/src/backlog/**` (mostly `git mv` from `tim/src/parity/`) | The code is moved, not written. A new directory is needed because `tim/.claude/rules/cli-patterns.md` puts one command group per folder, and a requirements backlog is not a "parity" |
| `tim/src/backlog/profiles/requirements-v2.js` | Parity's vocabulary (`FINDING_TYPES`, `PROSE_SLOTS`, `screens`) is hardcoded in `ingest.js:20-38`. Profiles make it data, as `e606d6ba` already did for bands |
| `tim/src/backlog/rules.js` (`tim backlog rules`) | Resolving `.claude/rules/*.md` `paths:` globs needs a real `**` glob matcher and front-matter parsing. `tools/style/file-topics.sh` is a deliberately separate router (its header, lines 9-12) and bash `[[ == ]]` cannot match `**/` at the top level |
| `tim/src/backlog/rule-decision.js` (`tim backlog rule`) | `tools/parity/rule-decision.sh` is path-locked to `workareas/journey-builder/EUDPA-*` (`:48`), writes only three statuses (`:69-74`) and never writes `by` (`g-reports §3.2`). It stays for frozen v1 corpora only |
| `tools/codex/run-stage.sh` | The Codex slice, resume and fan-out logic lives today as prompt prose inside `increment-build-loop.js:744-772`, including a `pkill ... ; grep` compound that breaks its own rails (`:762`). A committed script is the only allowlisted home (`H §4.1`) |
| `.claude/workflows/stages/{plan,sync,acceptance,verify,judge,ladder,ci-fix,e2e}.md` | Today these stages exist only as inline Claude prompts in two JS files. Codex cannot read a JS template literal, so a shared brief must be a file. The three existing briefs move here by `git mv` |
| `.claude/workflows/executors/{claude,codex}.md` | Sam's requirement R6 names an executor profile owned by the implementor. The Codex "ignore the Claude rails" preamble is copied at the top of all three Codex briefs today; this file removes the copies |
| `.claude/skills/backlog-distiller/references/{CHARACTERISER,REQUIREMENT_AUTHOR,REQUIREMENT_VERIFIER,RECONCILER,PANEL,COMBINER,COMPLETENESS_CRITIC}.md` | `SOURCE_EXTRACTOR.md` is 85% per-source run notes (D §2.2); `SPEC_RECONCILER.md` is written in the frontend engine's vocabulary (`:4-7`); the panel exists only as EUDPA-409 workarea files; parity's author and verifier are comparison-specific (pictures, DOM, two sides). Each new persona is cut from the named source, not written fresh |
| `.claude/skills/backlog-distiller/references/source-types/*.md` | The source-type mechanics (docx, Confluence, images, repo, trace, transcript, Jira, existing backlog) are buried inside `SOURCE_EXTRACTOR.md:28-32, 125-133`. One file per type lets the characteriser read only what it needs |
| `tools/backlog/templates/CONTRACT.template.md` | Derived from `tools/parity/templates/FINDING-CONTRACT.template.md`. The requirement contract needs sections the finding contract does not have (source roles, precedence per fact kind, the acceptance-criteria rule, "what is not a requirement"). Parity keeps its own template unchanged |

Nothing else is new. `tools/backlog/registry.json` is `git mv tools/parity/corpora.json`.

---

## 1. Principles

Twelve load-bearing rules. Each is traced to Sam's requirements.

1. **A backlog item is a requirement: what, why, acceptance, provenance. It is never a recipe.** The v2 schema has no slot for files, commands, line numbers, test files, skills or verification steps, and `tim backlog check` lints acceptance text for recipe smells (R1, R5; synthesis §5.3).
2. **Distillation has two passes, and both are data.** Pass 1 writes atoms (`requirements/*.json`), pass 2 writes groups (`increments/*.json` with `members`). Both are ingested by one tool, keyed on file slugs, so a re-combine after a ruling keeps every id and every ruling (R1; G2 §2.2).
3. **One writer.** Every canonical JSON file (backlog, state, run config, phase ledger) is changed only through `tim backlog`, with schema validation, a lock and a compare-and-swap check. No agent composes `jq` over state, and no agent Edits a state file (synthesis §4.6, §8.4).
4. **The backlog does not know how it will be built.** Executor choice, model tiers, stage bindings and Workflow args live in `run.json`, which the implementor owns. The same `backlog.json`, unmodified, builds under either executor and switches mid-backlog (R5).
5. **One stage contract, two adapters.** Each stage has one brief file and one output schema. Claude and Codex read the same brief and return the same JSON, with the same fan-out: one style reviewer and one code reviewer per file, plus a consistency reviewer and an acceptance checker (R6).
6. **Personas, routing, bundles and rules are read live, by path, at run time.** The workflow never copies a persona, rubric, bundle list or rule. It asks the owning skill's own tools which files apply, and hands the paths to both executors at the same granularity (R2, R3).
7. **What a session hook did becomes an explicit step.** Secret-shape checks on the diff, the SonarCloud check on the PR, and "no local rule analysis ran" are stages or recorded state, never an assumption that a `Stop` hook ran (R4).
8. **The workflow plans each increment just in time.** An Opus (or Codex) planner writes `plans/<id>.md` against the live tree, immediately before implementation. The plan is the only recipe in the system (R1; FA:687-731).
9. **The report is a generated, decision-led view of the JSON.** Questions Sam must answer come first, then the calls he may want to reverse. No agent edits the report; every number is derived (R1 quality; `c0f99985`; `render/page.js:222-231`).
10. **Nothing succeeds silently.** A dead reviewer, judge, fixer or Codex run is a red, recorded as state. A verifier that dies passes findings through as unrefuted, never drops them (B §11 item 4).
11. **Reuse before build.** A new file exists only when section 0.2 says why an existing one could not take the job (angle; R1 "take the best bits").
12. **Headless: make the call, flag it after.** The only exceptions are must-answer questions (security, access control, data integrity, legal or policy, scope change), which block the increments they touch until Sam rules (memories `feedback_headless_make_calls_dont_gate`, `feedback_question_is_not_a_ruling`).

---

## 2. Architecture overview

```
 SOURCES (any mix)
 confluence . jira + comments . docx/pdf . images/design boards . repos (code as constraint)
 transcripts/chat/email . existing backlogs/parity corpora . OpenSpec . prototypes
        |
        |  main session: skill backlog-distiller  (MODE: NEW | RESUME | RULE | REPORT)
        |    tim backlog init <prog> ; tim backlog registry add ; CONTRACT.md from template
        |    tim backlog source add  (acquire via tools/confluence, tools/jira, git show at pin, Read)
        |    tim backlog heads --write
        v
 +---------------------------------------------------------------------------------------------+
 | Workflow .claude/workflows/backlog.js   args {mode:'distil', programme, phases:[from,to]}   |
 |                                                                                             |
 |  characterise (1 per source, doer)  -> sources/<id>/{characterisation.md, units.json}      |
 |     gate: tim backlog phase done characterise                                               |
 |  carryover (1, think; only with a previous distillation or existing backlog source)        |
 |  slice (1, think) -> slices.json          gate: tim backlog slices --strict                 |
 |  PASS 1 author (1 per slice, think)  --pipeline-->  verify (different agent per slice)     |
 |     -> requirements/<slice>--<slug>.json   + notRaised[] + premisesDisproved[]             |
 |     gates: tim backlog coverage --strict ; tim backlog yield --strict                       |
 |  reconcile (1, think) -> tim backlog conflict|question|assumption add                      |
 |  panel (conditional; dockets, <=5 concurrent Opus) -> tim backlog rule --by panel           |
 |     escalation categories -> must-answer questions (never ruled by the panel)              |
 |  dedupe (1, think) <- tim backlog duplicates --all                                          |
 |  ingest atoms: tim backlog ingest --atoms  (verify gate, statement frozen, ids by slug)    |
 |  PASS 2 combine (1, think) <- tim backlog candidates --combine                              |
 |     -> increments/<slug>.json {members, why, risk}, declined[]                              |
 |     ingest: tim backlog ingest --increments (every atom in exactly one increment, no cycle)|
 |  critic (1, think): completeness + what the method cannot see                               |
 |  claim check (1, think): CLAIM_VERIFIER over machine-written prose (git diff between passes)|
 |  report: tim backlog report  (no model)                                                     |
 +---------------------------------------------------------------------------------------------+
        |
        v
 workareas/shared/<programme>/backlog.json  (schema v2: header, sources, invariants, questions,
        |                                     decisions, conflicts, assumptions, requirements[],
        |                                     increments[])
        |  + plans/  state.json  run.json  journal.jsonl  phases.json  report/
        |
        |<----------- RULINGS LOOP ------------------------------------------------------------+
        |   Sam rules on the report (batch sheet) or in conversation                            |
        |   -> tim backlog rule <prog> q-<slug> --option B --words "..." --by sam --at <ISO>    |
        |   -> ledger appends d-NNN, applies option effects, resets phases combine..report      |
        |   -> distil phases combine..report re-run (ids stable) -> report re-rendered ---------+
        |
        |  main session: skill backlog-implementor   (MODE: RUN | BIND | RESUME | HANDOVER)
        |    "build inc-012 to inc-020 with Codex" -> tim backlog run bind --ids ... --executor codex
        |    Workflow({scriptPath: .claude/workflows/backlog.js, args:{mode:'build', programme, cadence}})
        v
 +---------------------------------------------------------------------------------------------+
 | Workflow backlog.js  mode 'build'   (drain; re-derive after every increment)                |
 |                                                                                             |
 |  resolve (watcher): ABS/TILDE, header knobs, run.json, stage schemas exported for Codex    |
 |  LOOP:                                                                                      |
 |   next ............ tim backlog next --json          (one buildability rule)                |
 |   bindings ........ tim backlog run show --for <id>  (executor per stage role, re-read)     |
 |   ticket/branch ... per delivery.branchStrategy (per-increment | programme | local)         |
 |   baseline ........ clean trees, HEAD pins -> tim backlog state <id> set heads              |
 |   sync ............ merge-tree probe; conflict -> red sync-blocked                          |
 |   brief ........... tim backlog show <id> --brief --out runs/<run>/<id>/brief.json          |
 |   PLAN  ........... [claude: Opus | codex]  -> plans/<id>.md ; script records path          |
 |   context ......... tim backlog rules + tools/style/file-topics.sh + bake-rules-bundle --list|
 |                     + tools/review/detect-tech.sh  (per planned file)                       |
 |   IMPLEMENT ....... [claude: Sonnet | codex]                                                |
 |   context ......... again, per changed file                                                 |
 |   REVIEW fan-out .. per file: style (STYLE_FILE_REVIEWER) + code (FILE_REVIEWER)            |
 |                     + consistency (CONSISTENCY_REVIEWER, runs plan invariants)              |
 |                     + acceptance check (backlog ACs, independent of the plan)               |
 |                     [claude: parallel agents | codex: tools/codex/run-stage.sh --parallel] |
 |   VERIFY .......... per file, adversarial, default refuted  [claude | codex]                |
 |   JUDGE ........... fix-now / defer (-> tim backlog discover) / reject   [Opus | knob]      |
 |   FIX ............. [claude | codex]  result checked                                        |
 |   LADDER .......... header ladders + plan extras + invariants; browser rungs on Claude      |
 |   SECRETS ......... tim backlog secrets --staged   (replaces session hooks for the diff)    |
 |   land/PR/CI/merge  lifecycle per delivery policy; CI fixer [claude | codex]                |
 |   local E2E ....... optional (run.json localE2e: auto|always|never), Claude                 |
 |   record .......... tim backlog status <id> done ; tim backlog report ; commit state files  |
 |   checkpoint ...... halt-after | walkthrough -> stop the drain                              |
 +---------------------------------------------------------------------------------------------+
        |
        v
 report/index.html (+ report.md twin, + single-file artifact): needs your ruling, calls to reverse,
 weak evidence, backlog and build status N of TOTAL (P%), combination, coverage, conflicts, ledger
```

Every name in the diagram is defined in sections 3 to 8. The two workflow modes share one GUARD RAILS constant, one workspace resolver, one Codex adapter and one stage-schema block.

---

## 3. `backlog.json` schema v2

### 3.1 Files in a programme workarea

All under `workareas/shared/<programme>/`, tracked (section 9, Q2), except `runs/`.

| File | Holds | Written by | Read by |
|---|---|---|---|
| `backlog.json` | The requirement: header, ledgers, atoms, increments, row status | `tim backlog` only | everyone |
| `CONTRACT.md` | Per-run distillation contract: source roles, precedence, what is not a requirement, cross-cutting owner, volatile values | the distiller skill at setup (from template), then a person or the setup agent; complete before the first spawn | every distil agent |
| `sources/<id>/` | `raw.*` (fetched copy; gitignored when large or sensitive), `characterisation.md`, `units.json` (the enumeration) | characterise phase | author, verify, coverage |
| `slices.json` | slices of the service over source units, one cross-cutting owner | slice phase | author, `tim backlog slices` |
| `requirements/<slice>--<slug>.json` | one atom per file (pass 1 input) | author and verify agents (Write tool, one file each) | `tim backlog ingest --atoms` |
| `increments/<slug>.json` | one group per file (pass 2 input) | combine agent | `tim backlog ingest --increments` |
| `phases.json` | distillation phase ledger | `tim backlog phase` | distiller skill, workflow gates |
| `heads.json`, `seals.json` | repo heads per phase; content seals per source | `tim backlog heads`, `tim backlog source seal` | report drift panel, plan evidence check |
| `plans/<inc-id>.md` | the just-in-time plan (the only recipe) | plan stage | implement, review, verify, judge, fix, ladder |
| `state.json` | run state per increment: phase, reds, retry point, ticket, branch, heads, plan path, commits, PRs, CI, E2E, attempts | `tim backlog state` only (called by workflow watchers) | `tim backlog next`, resume, report |
| `run.json` | executor bindings, cadence, quality knobs, commit trailer | `tim backlog run` (called by the implementor skill) | the build workflow |
| `journal.jsonl` | notes `{at, id, stage, by, note}` | `tim backlog state <id> note` | report, handover |
| `report/` | `index.html`, `report.md`, `answer-sheet.md` | `tim backlog report` | Sam |
| `runs/<runId>/` (gitignored) | prompts, Codex logs, exported stage schemas, per-increment `brief.json` and `context.json` | workflow | workflow |

**Why run state is a separate file, not on the row.** Four reasons, each from evidence:

1. `git diff backlog.json` is a review surface (`CLAIM_VERIFIER.md:17`; `citations/evidence.js:199-201` split `evidence.json` out for exactly this). FA's journal was 217 KB against 53 KB of brief (E §6.8).
2. R5: executor detail must never be in the backlog. Attempts record which executor built what; that is state.
3. Blast radius: FA's recorder writes landed on the header (`stages.json` stray keys, synthesis §4.6). A separate state file cannot corrupt a requirement.
4. Every reader keys only on `id`, `status` and `dependsOn` (E §5). Those three stay on the row. Everything else moves.

### 3.2 Header

| Field | Type | Req | Meaning | Written by | Read by | Class |
|---|---|---|---|---|---|---|
| `schemaVersion` | `2` | yes | Schema version; tim refuses unknown versions | `init` | every tim command | meta |
| `programme` | slug | yes | Registry key; branch slug source | `init` | everyone | meta |
| `profile` | `"requirements-v2"` | yes | Selects slots, kinds, phases, id prefixes | `init` | tim | meta |
| `title` | string | yes | Plain-English name of the thing being built | setup | report masthead, ticket epic text | requirement |
| `purpose` | string | yes | Who it is for, what outcome, why now; two to four sentences | setup, reconcile | every stage brief | requirement |
| `sources[]` | Source | yes | Every source read (3.7) | `source add` | author, verify, report | requirement (provenance) |
| `precedence[]` | `{factKind, order[sourceId]}` | yes (may be empty) | Which source wins per fact kind: `copy`, `values`, `mandate`, `flow`, `intent`, `scope` | setup, reconcile | reconcile, panel, report "calls to reverse" | requirement |
| `invariants[]` | `{id: "inv-<slug>", text, why, sources[], decision}` | yes | Cross-cutting rules every increment honours, stated once (F P10) | reconcile, `rule` | plan, every reviewer, judge, critic | requirement |
| `direction` | string or null | no | Tie-break rule for a programme that aligns things (FA header) | reconcile, `rule` | plan, reviewers | requirement |
| `scope` | `{in[], out[{id, text, why, decision, sources[]}]}` | yes | In and out of scope; out items are parked, never silently dropped | reconcile, `rule` | author, plan, report section 8 | requirement |
| `deviations[]` | `{id, text, reason, decision}` | no | Deliberate departures from a source (plant-products precedent) | `rule` | plan, report | requirement |
| `milestones[]` | `{id, name, goal, checkpoint: null or "walkthrough"}` | no | Observable goals; a checkpoint stops the drain | combine, `rule` | `next`, report | meta |
| `repos` | `{<key>: {path, github, role: provider or consumer or tests or workspace, ladder[script], knowledge[docPath]}}` | yes | N named repos (no fixed triple); ladder = npm or maven script names that define done for that repo; knowledge = repo-owned docs the planner reads | setup | every build stage | meta (definition of done) |
| `delivery` | `{branchStrategy: "per-increment" or "programme" or "local", branch (programme only), base, ticketing: null or {project, epic, board, inProgress, done}, merge: {policy: "never" or "on-approval" or "on-green", decision (required for on-green), order: [[provider, consumer]]}, draftPrs: bool}` | yes | Delivery policy Sam rules; default programme, never, draft | setup, `rule` | build workflow lifecycle stages | requirement (ruled policy) |
| `combination` | `{rules[{id, text}], ceiling{acceptance, repos, newSurfaces}, declined[{members[], rule, why}]}` | yes after pass 2 | Pass 2 rules, ceiling and "considered and left alone" | combine | report section 5, re-combine | meta |
| `conflicts[]` | Conflict (3.8) | yes | Every disagreement between sources | reconcile | panel, report section 7 | requirement |
| `assumptions[]` | Assumption (3.8) | yes | Defaults that do not block | reconcile | plan, report section 2 | requirement |
| `questions[]` | Question (3.5) | yes | Everything a person must or may decide | reconcile, panel, judge (via `discover`), critic | `next`, report section 1 | requirement |
| `decisions[]` | Decision (3.6) | yes | Append-only ruling ledger with supersession | `rule` only | everyone | requirement |
| `requirements[]` | Requirement (3.3) | yes | Pass 1 atoms | `ingest --atoms` | combine, `show --brief`, report | requirement |
| `increments[]` | Increment (3.4) | yes | Pass 2 buildable units | `ingest --increments` | implementor | requirement + row status |

Not in the header, on purpose: model tiers, executor, review cap, CI fix attempts, local E2E switch, commit trailer, Workflow args. They are in `run.json` (section 7.6).

### 3.3 Requirement (a pass 1 atom)

| Field | Type | Req | Meaning | Written by | Class |
|---|---|---|---|---|---|
| `id` | `req-NNN` | yes | Stable handle; never renumbered (`assignIds`, `ingest.js:310-328`) | ingest | meta |
| `key` | slug `<slice>--<slug>` | yes | Identity: the source file name. Cross-references are written as keys and resolved to ids | author (file name) | meta |
| `slice` | slice id | yes | Owning slice (exactly one) | author | meta |
| `kind` | `capability` or `rule` or `data` or `content` or `integration` or `non-functional` or `hygiene` or `constraint` or `spike` | yes | What sort of requirement. Never an implementation route | author | requirement |
| `statement` | string | yes | One observable requirement, `MUST` phrasing, frozen at first ingest (the oracle, as `detail` is today, `ingest.js:561-582`) | author, verify | requirement |
| `actor` | string | no | Who relies on it | author | requirement |
| `why` | string | yes | The need or rule it serves | author | requirement |
| `acceptance[]` | `{id: "ac-N", given, when, then}` or `{id, text}`, plus `witness: e2e or fit or unit or review or observation`, `confidence`, `sources[sourceRefId]` | yes, at least one | Observable at a boundary. May name copy, options, error text, externally fixed routes, consumed document shapes, mandated GDS components. Must not name files, functions, classes, CSS classes, test files or commands (synthesis §5.3) | author, verify | requirement |
| `falsifiedBy` | string | yes | The single observation that proves the atom wrong (FINDING-CONTRACT `:149-152`) | author | requirement |
| `sources[]` | `{id: "s1", source, ref, quote, readAt: {sha, blob, dirty} or {version, fetchedAt}, confidence: observed or stated or legacy or inferred or gap, role}` | yes | Verbatim or gap: "a requirement with no citation is not a requirement" (`trace-to-requirements.workflow.js:168-179`) | author, verify | requirement (provenance) |
| `confidence` | enum (as above) | yes | Weakest confidence across its acceptance; derived by ingest | ingest | meta |
| `surface` | `{service, area, repos[repoKey]}` | yes | Where, never how | author | requirement |
| `consistentWith[]` | `{ref, relation: same-as or variant-of or new, divergence}` | no | The shape to match, as a relation (F K16). `ref` names an existing behaviour, never a file to edit | author, reconcile | requirement |
| `constraints[]` | `inv-*` ids | no | Invariants that bind this atom beyond the programme-wide ones | reconcile | requirement |
| `outOfScope[]` | string | no | Tempting neighbours this atom does not cover | author | requirement |
| `needs[]` | `q-*` ids | no | Questions that must be ruled before this atom can be built | reconcile, verify | requirement |
| `assumptions[]`, `decisions[]`, `conflicts[]` | ids | no | Pointers only; the answer lives in the ledger (`panel/README.md:3-6`) | reconcile, `rule` | requirement |
| `dependsOn[]` | keys resolved to `req-*` | no | Genuine requirement-level dependency | author, reconcile | meta |
| `relatedTo[]` | keys resolved to `req-*` | no | Related, not ordered | author | meta |
| `specRefs[]` | OpenSpec `REQ-`/`SCN-` ids | no | Link to the Behaviour Spec where one exists (F P11) | author | requirement |
| `status` | `adopted` or `parked` or `rejected` or `disputed` or `superseded` | yes | Atom lifecycle. `disputed` is born from a verifier dispute and always carries a question | ingest, `rule` | state (requirement-level) |
| `supersededBy` | `req-*` or null | no | Set when a ruling replaces a frozen statement with a new atom | `rule` | meta |
| `carriedFrom` | string or null | no | Lineage from a carryover pass | carryover | meta |
| `provenance` | `{authoredBy: {phase, agent, runId}, verifiedBy: {phase, agent, runId}, verdict: stands or corrected or disputed or added, why, correction}` | yes | Author and verifier identities; ingest refuses equality (fixes G1 §2 item 6) | author, verify | meta |

### 3.4 Increment (a pass 2 buildable unit)

| Field | Type | Req | Meaning | Written by | Class |
|---|---|---|---|---|---|
| `id` | `inc-NNN` | yes | Stable handle | ingest | meta |
| `key` | slug | yes | Identity: `increments/<key>.json`, or `solo--<atom key>` for an atom nobody grouped | combine, ingest | meta |
| `title` | string, 80 characters or fewer | yes | Outcome headline, plain English | combine | requirement |
| `outcome` | string | yes | What is true when done, for whom; one to three sentences | combine | requirement |
| `why` | string | yes | Why these members ship together, or the atom's why for a solo | combine | requirement |
| `members[]` | `req-*` ids (keys resolved) | yes, at least one | The atoms this increment satisfies. Acceptance is the union of members' acceptance, read through `tim backlog show --brief`, never copied | combine | requirement |
| `class` | `feat` or `fix` or `chore` or `refactor` or `test` or `docs` | yes | Change class, used for the branch prefix and commit type; derived from member kinds, overridable by `rule` | combine | meta |
| `surface` | `{repos[repoKey], areas[]}` | yes | Union of members' surfaces | ingest (derived) | meta |
| `milestone` | milestone id or null | no | | combine | meta |
| `dependsOn[]` | `inc-*` ids | yes (may be empty) | Member atom dependencies lifted to increments, plus any explicit ordering the combiner declares. Cycles refused | ingest | meta |
| `needs[]` | `q-*` ids | yes (may be empty) | Union of members' open `needs`; recomputed on every ingest and ruling; `check` asserts consistency | ingest, `rule` | state (derived) |
| `checkpoint` | null or `halt-after` or `walkthrough` | no | Post-build stop (replaces the loop's post-land `gate`) | combine, `rule` | meta |
| `size` | `{class: S or M or L, basis}` | yes | Requirement-level proxies (acceptance count, surfaces, repos); never gates buildability | combine | meta |
| `combination` | null (solo) or `{rules[ruleId], why, risk: low or medium, attributability}` | yes | Why grouped, and whether a red in one member would be misattributed | combine | meta |
| `status` | `todo` or `blocked` or `deferred` or `dropped` or `done` | yes | Row status (3.9) | ingest, `rule`, `status` | state (requirement-level) |
| `doneBy` | null or `build` or `ruling` | yes when done | Separates a built `done` from a decision-only `done` (EUDPA-409 `inc-060`, C §5.2) | `status`, `rule` | state |
| `statusNote` | string or null | no | Why the row has its status (for example the decision that deferred it) | `status`, `rule` | state |

### 3.5 Question

The only "thing a person must decide" shape (replaces `openQuestions[]`, `openQuestion`, `blockedQuestion`, `question` integers and `decisionRequired`; E §6.11).

```jsonc
{
  "id": "q-notification-list-scope",            // slug id: Sam answers by it; never renumbered
  "headline": "Should a user see only their own organisation's notifications?",
  "question": "The dashboard lists notifications. Which notifications may a signed-in user see?",
  "inPlay": "The dashboard list and the notification view, in the plants frontend and backend.",
  "options": [
    { "id": "A", "text": "Only notifications created under the user's current organisation.",
      "sources": ["s-policy-3", "s-conf-12"], "count": 2,
      "effects": [ { "op": "adopt", "target": "dashboard--org-scoped-list" } ] },
    { "id": "B", "text": "Every notification the user personally created, across organisations.",
      "sources": ["s-transcript-7"], "count": 1,
      "effects": [ { "op": "adopt", "target": "dashboard--user-scoped-list" } ] }
  ],
  "recommended": "A",
  "ifNobodyAnswers": "Nothing that lists notifications is built. Two increments stay blocked.",
  "category": "security",                        // scope | policy | security | access-control | data-integrity | legal | design | content | technical
  "mustAnswer": true,                            // derived from category; no default is ever taken
  "audience": "sam",
  "cluster": "access-and-ownership",
  "raisedBy": { "phase": "reconcile", "agent": "reconciler", "runId": "wf_..." },
  "status": "open",                              // open | outstanding | ruled | superseded
  "decision": null,                              // d-NNN once ruled
  "visual": []                                   // crops from design sources, by source unit
}
```

`blocks` is never stored; the renderer derives it from `needs[]` on rows. "Awaiting a ruling" has exactly one definition: `status` is `open` or `outstanding` (fixes the three definitions in G5 §2).

### 3.6 Decision (the ledger)

```jsonc
{
  "id": "d-017",                                 // append order; never reused
  "question": "q-notification-list-scope",       // or null for a standing ruling
  "chosen": "A",                                 // option id, or null with `answer` for free text
  "answer": null,
  "words": "Own org only. Obviously.",            // Sam's words verbatim
  "note": "Security: a cross-organisation list is a data-isolation failure.",   // mandatory
  "decidedBy": "sam",                            // sam | panel | precedence | <named teammate>
  "decidedAt": "2026-09-18T14:02:00Z",           // passed by the caller; tim never reads the clock
  "sealedEvidence": [ { "source": "phnns-policy", "seal": "sha256:..." } ],
  "appliesTo": ["req-031", "req-032"],           // group rulings name every id they cover
  "constraints": [],                              // ordering constraints that are not dependencies (DR1-U inc-103)
  "revisitWhen": null,                            // "when the typed record lands" (DR1-U)
  "effects": [ { "op": "adopt", "target": "req-031" }, { "op": "reject", "target": "req-032" } ],
  "supersedes": null, "supersededBy": null,
  "status": "current"                             // current | superseded
}
```

Effects are the machine-applicable part of a ruling (`adopt`, `park`, `reject`, `supersede` with a new atom file, `add-invariant`, `set-assumption`, `drop-increment`, `defer-increment`, `strip-dependency`). `tim backlog rule` records and applies in one write, as `spec-add-decision.sh` does (`:2-5`). A free-text answer with no effects is recorded as `ruled`, and the question is flagged `effects-pending`, which resets the `reconcile` phase for the affected atoms only.

### 3.7 Source, conflict, assumption, invariant

```jsonc
// Source (header.sources[])
{ "id": "phnns-policy", "kind": "docx", "role": "requirement", "tier": 1,
  "ref": "sources/phnns-policy/raw.docx", "version": "v1 August 2026",
  "readAt": { "fetchedAt": "2026-09-18T09:10:00Z", "seal": "sha256:..." },
  "characterisation": "sources/phnns-policy/characterisation.md",
  "provenanceScheme": "section:<slug>/para:<n>/item:<k> | annex:<n>/reg:<ref>",
  "units": 212, "status": "characterised" }      // registered | characterised | extracted | stale
// kinds: confluence | jira | docx | pdf | image-board | design | repo | code | trace-corpus | transcript | chat | email
//        | prototype | openspec | existing-backlog | parity-corpus | web
// roles: requirement | constraint | consistency-anchor | current-behaviour | decision-record

// Conflict
{ "id": "c-004", "topic": "Country list for ware potatoes", "sources": ["s12", "s31"],
  "detail": "Policy annex 5 lists four countries; the Confluence page lists five.",
  "provisional": "Policy wins (precedence: mandate).", "resolution": "precedence",
  "decision": "d-009", "question": null, "affects": ["req-014"] }

// Assumption
{ "id": "as-004", "text": "Error summary title is the GDS default.", "default": "There is a problem",
  "confidence": "inferred", "reviseIf": "a content designer rules otherwise", "decision": null }

// Invariant (header.invariants[])
{ "id": "inv-copy-bilingual", "text": "Every user-facing string exists in English and Welsh.",
  "why": "Welsh Language Standards", "sources": ["s-standards-2"], "decision": "d-002" }
```

### 3.8 Status enums and semantics

**Increment `status`:**

| Status | Meaning | Set by | Buildable |
|---|---|---|---|
| `todo` | Ready once dependencies are done | ingest, `rule` | yes, when `needs` is empty and every `dependsOn` is `done` |
| `blocked` | Has an open `needs`, or a member is `disputed` | ingest (derived), `rule` | no |
| `deferred` | Ruled not now; `statusNote` names the decision | `rule` | no |
| `dropped` | Ruled never; dependants have the dependency stripped with a note (`rule-decision.sh:73-76` behaviour) | `rule` | no |
| `done` | `doneBy: build` (state has commits) or `doneBy: ruling` (decision named) | `status`, `rule` | no |

**Phase and red states** live in `state.json`, never on the row: `planned`, `implementing`, `reviewing`, `laddering`, `landed`, `pr-open`, `ci-green`, `merged`, and the reds `sync-blocked`, `plan-refused`, `implement-failed`, `review-failed`, `ladder-red`, `secrets-red`, `land-failed`, `pr-failed`, `ci-red`, `e2e-red`, `merge-stopped`, `record-failed`, `platform-blocked`. A red holds the increment out of `next` until a person runs `tim backlog state <id> retry --at <stage>` (FA's `ci-retry` and `e2e-retry`, generalised; FA:537-558).

**The one buildability rule** (`tim backlog next`): the first increment in array order whose `status` is `todo`, whose `needs` are all ruled, whose `dependsOn` are all `done`, and whose state is not red. An unknown status fails loudly: schema validation refuses it at write time, so neither the allow-list nor the deny-list failure mode can occur (C §5.1).

### 3.9 `needs`, `checkpoint`, and the end of `gate`

- `needs[]` is **pre-build**: question ids. Ingest derives increment `needs` from members and sets `blocked`. `tim backlog rule` clears the need and recomputes status in the same write. No two-field protocol (E §6.4).
- `checkpoint` is **post-build**: `halt-after` stops the drain after the increment lands; `walkthrough` stops it and adds a walkthrough item to the report. A milestone with `checkpoint: walkthrough` applies to its last increment.
- `gate` does not exist in v2. The `parity-v1` profile keeps it for frozen corpora.
- **When a question blocks.** The reconciler puts a question into an atom's `needs` only when it is `mustAnswer`, or when no option is safe to build by default (the options change *what* is built, F §3.1 K22). Every other question is recorded with its "If nobody answers" default as an assumption (`as-*`) that the atom cites, and it stays open in report section 1 without blocking anything. This is what stops the CHED-P pattern of 74 of 108 rows blocked (F P5).

### 3.10 Atoms against combined items

- Every `adopted` atom is a member of **exactly one** increment. `tim backlog check` proves it (the `slices --strict` set algebra reused, `slices.js:121-145`).
- An atom nobody grouped gets a solo increment keyed `solo--<atom key>`. When a later combine groups it, its solo increment disappears; if that increment has started (`ruled()` today, `ingest.js:454-461`) ingest refuses and names it.
- A combined increment's acceptance is the union of its members' acceptance, each keeping its sources. Nothing is copied into the increment, so a member's ruling-driven change is seen at once.
- `parked`, `rejected` and `superseded` atoms are members of nothing, and render in report section 8 "so nobody re-raises them" (`page.js:368-377`).

### 3.11 Worked examples

**Example 1: an atomic (solo) increment.**

```jsonc
// requirements/origin--ware-potato-countries.json   (author input; ingest adds id, confidence, status)
{
  "slice": "origin",
  "kind": "rule",
  "statement": "When a notification carries a ware-potato commodity line, the country of origin MUST be Poland, Portugal, Romania or Spain.",
  "actor": "importer",
  "why": "Regulation 24A(1)(b) restricts ware potatoes to four member states.",
  "acceptance": [
    { "id": "ac-1", "given": "a notification carries a ware-potato commodity line",
      "when": "the user chooses a country outside Poland, Portugal, Romania and Spain",
      "then": "the country is rejected with an error naming those four countries",
      "witness": "e2e", "confidence": "stated", "sources": ["s1"] },
    { "id": "ac-2", "given": "a notification carries no ware-potato line",
      "when": "the user chooses any country on the service's country list",
      "then": "the country is accepted", "witness": "fit", "confidence": "inferred", "sources": ["s2"] }
  ],
  "falsifiedBy": "A ware-potato notification that saves with a country of origin outside the four.",
  "sources": [
    { "id": "s1", "source": "phnns-policy", "ref": "annex:5/reg:24A(1)(b)",
      "quote": "ware potatoes originating in Poland, Portugal, Romania or Spain",
      "readAt": { "version": "v1 August 2026", "fetchedAt": "2026-09-18T09:10:00Z" },
      "confidence": "stated", "role": "requirement" },
    { "id": "s2", "source": "live-animals", "ref": "repo:frontend/origin@4f1c9e2",
      "quote": "country list validation",
      "readAt": { "sha": "4f1c9e2...", "blob": "a91b...", "dirty": false },
      "confidence": "inferred", "role": "consistency-anchor" }
  ],
  "surface": { "service": "plants-frontend", "area": "origin", "repos": ["plantsFrontend", "tests"] },
  "consistentWith": [ { "ref": "live-animals: origin, country of origin question", "relation": "variant-of",
                        "divergence": "the value list narrows by commodity" } ],
  "constraints": ["inv-copy-bilingual"],
  "outOfScope": ["Checking the destination address territory (d-001)"],
  "needs": [], "dependsOn": ["commodity--commodity-lines"],
  "specRefs": ["SCN-PLANTS-OB-ORIGIN-003-A"],
  "provenance": { "authoredBy": { "phase": "author", "agent": "author:origin", "runId": "wf_1" },
                  "verifiedBy": { "phase": "verify", "agent": "verify:origin", "runId": "wf_1" },
                  "verdict": "corrected", "why": "ac-2 confidence lowered from stated to inferred",
                  "correction": "The policy is silent on non-potato lines." }
}
```

```jsonc
// backlog.json increments[] entry, produced by ingest because no combined file claimed the atom
{ "id": "inc-014", "key": "solo--origin--ware-potato-countries",
  "title": "Ware-potato notifications accept only the four permitted countries",
  "outcome": "An importer of ware potatoes cannot submit a country of origin the regulation forbids.",
  "why": "Regulation 24A(1)(b).", "members": ["req-022"], "class": "feat",
  "surface": { "repos": ["plantsFrontend", "tests"], "areas": ["origin"] },
  "milestone": "m1", "dependsOn": ["inc-009"], "needs": [], "checkpoint": null,
  "size": { "class": "S", "basis": "2 acceptance criteria, 1 area, 2 repos" },
  "combination": null, "status": "todo", "doneBy": null, "statusNote": null }
```

**Example 2: a combined increment.**

```jsonc
// increments/arrival-details.json  (combine output)
{
  "title": "Importers give the port and expected date of arrival on one page",
  "outcome": "An importer records where and when the consignment arrives, and cannot give a date in the past or a port the service does not recognise.",
  "why": "Three atoms describe one page's questions; a person doing the work would build them as one change and one reviewable PR.",
  "members": ["arrival--port-of-entry", "arrival--arrival-date", "arrival--date-not-in-past"],
  "class": "feat", "milestone": "m1",
  "dependsOn": [],                                   // extra ordering only; member deps are lifted by ingest
  "checkpoint": null,
  "size": { "class": "M", "basis": "7 acceptance criteria, 1 area, 3 repos" },
  "combination": {
    "rules": ["cr-same-surface", "cr-same-repo-set", "cr-same-acceptance-boundary"],
    "why": "Same page, same repos, one journey E2E slice proves all three.",
    "risk": "low",
    "attributability": "A red in the date rule is visible in its own acceptance check; it cannot be misread as a port failure."
  }
}
```

And in the header, the combiner records what it considered and declined:

```jsonc
"declined": [
  { "members": ["arrival--port-of-entry", "transport--vehicle-registration"],
    "rule": "cr-attributability",
    "why": "Transport has its own reference-data dependency. A red there would stall arrival." }
]
```

**Example 3: an increment born blocked with a question.**

```jsonc
// requirements/dashboard--org-scoped-list.json (excerpt)
{ "slice": "dashboard", "kind": "rule",
  "statement": "The dashboard MUST list only notifications the signed-in user may see under the question q-notification-list-scope.",
  "needs": ["q-notification-list-scope"], ... }

// backlog.json increments[] entry
{ "id": "inc-021", "key": "dashboard-list",
  "title": "The dashboard lists the notifications a user may see",
  "outcome": "A signed-in user sees their notifications on the dashboard, and never another organisation's.",
  "members": ["req-031", "req-033"], "class": "feat",
  "needs": ["q-notification-list-scope"], "status": "blocked", ... }
```

The question is `mustAnswer: true` (category `security`), so the report puts it first, its "If nobody answers" line says nothing listing notifications is built, and `tim backlog next` never returns `inc-021`. Increments that do not touch the list stay buildable (the ched-pp "buildable meanwhile" rule, E §8.5), because only `inc-021` carries the need.

### 3.12 Proof that the schema carries no recipe and nothing executor-specific

Every field is classed **requirement** (what or why), **meta** (identity, order, class) or **state** (lifecycle). A field would fail if it said how to build (recipe) or who builds (executor).

| Field family | Class | Recipe? | Executor-specific? | Why not |
|---|---|---|---|---|
| `statement`, `why`, `acceptance`, `falsifiedBy`, `outcome` | requirement | no | no | Observable behaviour; the AC rule forbids files, functions and commands, and `tim backlog check` lints for them |
| `sources`, `confidence`, `provenance`, `specRefs` | requirement | no | no | Where the requirement came from; `readAt` pins evidence, not implementation |
| `surface.repos`, `repos` header | meta | no | no | Where; keys into a repo table any executor reads |
| `repos.<key>.ladder` | meta (definition of done) | no | no | Script names every executor can run; the plan expands them (FA:973-1001). An increment cannot add rungs; only the plan can |
| `repos.<key>.knowledge` | meta | no | no | A reading list of repo-owned docs; it prescribes nothing and both executors read it |
| `consistentWith` | requirement | no | no | A relation to existing behaviour with the divergence stated; no file to copy |
| `constraints`, `invariants`, `direction`, `scope`, `deviations` | requirement | no | no | Programme-level rules, stated once |
| `questions`, `decisions`, `conflicts`, `assumptions` | requirement | no | no | Ledgers; `effects` act on requirements, never on code |
| `kind`, `class`, `size`, `milestone`, `checkpoint`, `dependsOn`, `members`, `combination` | meta | no | no | Classification and order |
| `delivery` | requirement (ruled policy) | no | no | Branch and merge policy is what Sam rules, and both executors are bound by it; no executor runs lifecycle stages at all (Claude watchers do) |
| `status`, `doneBy`, `statusNote`, `needs` (derived) | state | no | no | Requirement-level lifecycle only |

What is **absent**, by design: `filesToTouch`, `verification`, `recipe`, `implementorSkill`, `type` as a `frontend-change` mode, `obligations`/`flowChanges`/`schemaFields`/`copyKeys`/`specs`, `sizeGuess` as a gate, `band`, `executor`, `models`, `reviewCap`, briefs, output schemas, sandbox flags, `plan` pointer, `ticket`, `branch`, `commit`, `prs`, `notes`. Each has a home in section 7 or 8, or is retired (section 10).

---

## 4. The writer and tooling

### 4.1 `tim backlog`: generalising `tim parity`

**Moves (by `git mv`, history kept).** The domain-free modules move from `tim/src/parity/` to `tim/src/backlog/` with their tests: `ingest.js` (core: `assignIds`, `resolveRelatedTo`, `refreshed`, `born`, `ruled`, the replace, strike and freeze refusals, the verify gate), `set.js`, `io.js`, `schema.js`, `counts.js`, `coverage.js`, `slices.js`, `yield.js`, `duplicates.js`, `heads.js`, `meta.js`, `seals.js`, `check-evidence.js`, `citations/*`, `render/*`, `corpus-profile.js` (renamed `profile.js`). Parity-only modules stay in `tim/src/parity/`: `capture/`, `manifest.js`, `dom.js`, `join.js`, `insertion.js`, `page-model-schema.js`, `split-sentinels.js`, `normalise.js`, `repoint.js`, `anchors.js`, `load.js`.

**Parity keeps working, unchanged.** `tim parity <verb>` stays registered. Each verb calls the moved core with the `parity-v1` profile. `report.contract.test.js` keeps parsing the tracked EUDPA-328 backlog through the same `parseBacklog` (G5 §6). The first increment of this work is judged on that: every existing tim test passes with no fixture changed.

**Profiles as data** (`tim/src/backlog/profiles/`):

| Profile key | `parity-v1` (existing behaviour) | `requirements-v2` (new) |
|---|---|---|
| Schema | today's `schema.js:112-143` (15 required keys, header `run_id` + `target`) | section 3 |
| Item folders | `findings/` | `requirements/` (atoms), `increments/` (groups) |
| Id prefixes | `inc-` | `req-`, `inc-`, `q-` (slug), `d-`, `c-`, `as-`, `inv-` |
| Kinds | `FINDING_TYPES` (`ingest.js:20-28`) | section 3.3 `kind` |
| Prose slots | `frontend, prototype, difference, falsifiedBy` + set.js extras | `statement, why, falsifiedBy` + acceptance as structure |
| `screens` required | yes | no (units instead) |
| Verification required at first ingest | per corpus (`requireVerification`) | always |
| Phase table | the parity table from `phase.sh:29-44` | section 5.2 |
| Born status | `todo` | derived (3.8) |
| Registry | `tools/backlog/registry.json` entries with `profile: parity-v1` | entries with `profile: requirements-v2` |

`tools/parity/corpora.json` becomes `tools/backlog/registry.json` by `git mv`, gaining a `profile` and a `workarea` per entry. Readers that constructed paths (`corpus-profile.js:88-90`, `scaffold-corpus.sh:98`) read the registry instead. The `EUDPA-*` run-id rule goes (`start-comparison.sh:46-49` says it exists only because of the bash readers).

### 4.2 Commands

All commands take `<programme>` (a registry key), print a result envelope with `--json` (schema-versioned, as CLAUDE.md requires), and never read the clock (callers pass `--at`).

| Command | Does | Reuses |
|---|---|---|
| `init <programme> --title --profile` | Creates the workarea, header skeleton, `CONTRACT.md` from template, registry entry | `scaffold-corpus.sh` behaviour, now in tim |
| `registry list \| show \| add` | The programme registry | `corpora.json`, `corpus-profile.js` |
| `phase <p> status \| start \| done --note \| gate <phase> \| reset <phase> --note` | Phase ledger. `done` needs prerequisites done and a note, and records an artefact fingerprint; `reset` cascades to every dependant phase; `gate` exits 1 naming what is missing | `phase.sh:29-44, 145-173`, fixing G1 §2 item 4 (no cascade, no fingerprint, bash, untracked) |
| `heads <p> [--write] [--strict] [--for <inc>]` | Records `{sha, branch, dirty}` per repo key (no absolute paths); `--strict` exits non-zero on `moved`; dirty at start is flagged | `heads.js`, fixing G3 §1.4 items 1 to 4 |
| `source add \| seal \| check <p>` | Registers a source with role, tier and version; seals content (code: blob; Confluence: page version + body hash; Jira: key + `updated` + description hash; files: sha256); `check` reports drift kinds | `seals.js` algorithm generalised to `{kind, locator, contentHash}` (G3 §3.4) |
| `coverage <p> [--strict]` | Every enumerated source unit is cited by an atom or stated absent in `units.json` | `coverage.js` with a generic unit loader (G1 §2 item 1) |
| `slices <p> [--strict]` | Every unit owned by exactly one slice; exactly one cross-cutting owner | `slices.js` unchanged in algebra |
| `yield <p> [--strict]` | Thin slices (under 0.4 of the median atoms per owned unit), homeless, strayed, unverified, and **author equal to verifier** | `yield.js` plus the identity check |
| `duplicates <p> [--cross-slice-only]` | Candidate duplicate pairs; **all pairs by default** (DR1C's within-slice miss, G1 §2 item 5); adds structured signals: shared unit, shared decision, shared `consistentWith` | `duplicates.js` |
| `candidates <p> --combine` | Pass 2 candidate groups from requirement-level signals: same surface area, same repo set, shared `consistentWith`, shared decision or assumption, same acceptance boundary, adjacency in the dependency graph; each scored and explained; ceilings applied | `duplicates.js` pair machinery, one level up |
| `ingest <p> [--atoms \| --increments \| --all] [--dry-run] [--replace]` | Assigns stable ids by file slug; resolves `dependsOn`, `relatedTo`, `members` from keys; refuses dangling, self and cyclic references; refuses unverified atoms; freezes `statement`; derives confidence, surface, needs and status; refuses to drop or regroup a started or ruled item | `ingest.js` extended to `dependsOn` and `members` (G2 §3 item 6) |
| `check <p> [--strict]` | Schema; dangling refs; cycles; every adopted atom in exactly one increment; derived fields consistent; **recipe lint** on acceptance and statements (file paths, identifiers with `()` or `.js`/`.java` suffixes, shell commands, CSS classes); **credential lint** on every string (the sonar Read hook refuses files quoting secrets, H §2.3) | `check.js`, `schema.js` |
| `show <p> [<id>] [--header] [--brief] [--state] [--out <file>] --json` | `--brief` is **the** input contract for every build stage: the increment, its members with acceptance and sources, the invariants, decisions, assumptions and questions they reference, the header purpose, scope and repos | new view over existing data |
| `next <p> --json` | The one buildability rule (3.8); returns `{id}` or `{none: reason}` with reasons `all-done`, `blocked-by-questions` (listing them), `red` (listing reds), `dependencies` | replaces three rules (C §5.1) |
| `set <p> <id> <slot> --file` | One slot on one atom or increment; profile whitelist; `statement` refused after first ingest | `set.js:47-77` |
| `status <p> <id> <status> --note [--decision d-x] [--done-by build\|ruling]` | Row status transitions, validated | replaces `backlog-set-status.sh` |
| `question add \| set`, `conflict add`, `assumption add`, `invariant add` | Ledger records from a file | new setters on the same `writeIncrement` idiom |
| `rule <p> <q-id> (--option X \| --answer-file f) --words --by --at [--note] [--outstanding] [--supersedes d-x]` | Appends a decision, applies its effects, recomputes `needs` and status, strips dependencies on dropped items with a note, resets the `combine` and `report` phases (and `reconcile` when effects are pending). `--outstanding` records a tentative answer without ruling | `spec-add-decision.sh` semantics; `rule-decision.sh` reason rule |
| `discover <p> --from <inc> --file <atom.json>` | Adds an atom found during a build (judge deferral, `DEFERRED:` work, CI fixer out-of-scope); `verifiedBy` is the judge; the atom joins the next combine | replaces three channels (C §2.6) |
| `state <p> <id> set <field> --json <v> \| red <status> --note \| retry --at <stage> \| note --file` | Run state writes; field whitelist; a red stops `next` | replaces agent `jq` in both workflows |
| `run <p> show [--for <id>] \| bind (--ids a..b \| --rest) --executor claude\|codex [--roles r1,r2] \| set <knob> <v>` | Executor bindings and run knobs in `run.json` | new file, same writer |
| `rules --root <ABS> <file...> --json` | For each file: the matching `.claude/rules/*.md` (workspace, and any `.claude/rules` under an ancestor such as `tim/`), the ancestor `CLAUDE.md` and `AGENTS.md` files, and every `docs/best-practices/...` path each rule body points at | new (section 0.2) |
| `stage-schemas --from-workflow <path> --out <dir>` | Extracts the `STAGE_SCHEMAS` JSON block from the workflow script and writes one Codex `--output-schema` file per stage, checking every property is `required` | keeps one copy of each schema (8.3) |
| `secrets --repo <key> (--staged \| --range <base>...HEAD)` | Credential-shape scan of the diff (same detector as `check`); exits 1 with file and line | replaces the diff side of the session-level sonar hook (R4) |
| `report <p> [--artifact] [--answer-sheet]` | Renders section 6's report and the answer sheet | `render/*` generalised |
| `counts <p> --json` | N of TOTAL (P%), deferred excluded and named | `counts.js` |
| `migrate <v1-backlog> --to <p> [--dry-run]` | Mechanical v1 to v2: rows become solo atoms and increments; recipe fields move to `plans/legacy/<id>.md` (kept, never read as binding); `gate` becomes questions; statuses mapped | new command, small |

### 4.3 Validation, locking and lost updates

- **Schema.** zod, additive-tolerant and subtractive-strict (`schema.js:11-15`), per profile. Every write parses before and after.
- **Lock.** Every write command takes `<workarea>/.backlog.lock`, created exclusively, holding `{pid, command, at}`. A lock whose process no longer exists is broken with a note; a live one makes the command wait briefly, then exit 4 (`LOCKED`). This is the journey-builder mkdir lock (`backlog-plan-increment.sh:60-71`) in tim form.
- **Compare and swap.** Every write returns `{sha256}` (it already does, `io.js:44-55`). Every write accepts `--expect-sha`; a mismatch exits 3 (`LOST_UPDATE`) and changes nothing. The workflow serialises writes through one watcher at a time anyway, so CAS is the second line.
- **Temp files** get a unique name per process (fixes the shared `.<name>.tmp`, `io.js:48`).
- **Before and after.** Every write prints the changed paths and their old and new values in the envelope.

### 4.4 Ids, keys and cycles

- Identity is the file slug (`key`). The handle (`req-NNN`, `inc-NNN`) is assigned once and never renumbered (`ingest.js:294-328`).
- Questions use the slug as the id (`q-<slug>`) because Sam answers by it; decisions are append-ordered `d-NNN`.
- Cross-references are written as keys and resolved in the same pass, so forward references in one batch work (`ingest.js:339-342`).
- Cycles: a depth-first search over atom `dependsOn`, then over lifted increment `dependsOn`. A cycle is refused, naming every key in it.
- A combined increment whose members' dependencies point inside the group drops those internally; dependencies pointing outside are lifted to the owning increments.

### 4.5 Other tools

| Tool | Status | Purpose |
|---|---|---|
| `tools/codex/run-stage.sh` | new | Runs one or many Codex prompts: `--parallel N`, `--schema`, per-prompt watchdog slicing and `resume <session>` with every flag before `resume`, status file per prompt, exit 0 all done, 75 some still running (call again), 1 any failed; prints one JSON array of all results assembled with `jq` (8.4) |
| `tools/style/bake-rules-bundle.sh --list <topic>` | new flag on an existing script | Prints the bundle's source paths without writing, so the per-topic list keeps one home (`bake-rules-bundle.sh:37-60`) |
| `tools/style/file-topics.sh` | unchanged | The code-style skill's own router, called live |
| `tools/review/detect-tech.sh` | unchanged | The review skill's own best-practice routing per repo, called live |
| `tools/github/pr-ensure-draft.sh`, `tools/github-actions/wait-for-pr-checks.sh`, `tools/npm/npm-in-repo.sh --clone` | port from `feat/NO_JIRA-frontend-alignment` | PRs and CI without raw `gh`, with honest exit codes |
| `tools/jira/*`, `tools/confluence/page.sh`, `tools/refine/prepare-refinement.sh` | unchanged | Source acquisition for Jira and Confluence |
| `tools/parity/*.sh` | frozen for `parity-v1` | Kept working for frozen corpora only; new programmes use `tim backlog` |

All tim code follows `tim/CLAUDE.md`: vitest, test on input and output, git fixtures via `src/test-support/git-fixtures.js`, no shell-out to `gh`, `jq`, `curl` or `../tools/*.sh`, GDS plain English in messages, a sibling `*.test.js` for every new module.

---

## 5. The distiller skill: `backlog-distiller`

### 5.1 Identity

- **Folder:** `.claude/skills/backlog-distiller/` by `git mv .claude/skills/journey-builder` (keeps the rule-mode prose, the panel lessons in commit history and the source notes).
- **Description triggers:** "distil requirements", "digest requirements", "turn these sources into a backlog", "build a backlog from", "add a source to", "rule on the questions", "rebuild the requirements report", "recombine the backlog". NOT for building increments (`backlog-implementor`), NOT for comparing two captured services screen by screen (`parity`), NOT for one ticket (`ticket-creator`).
- **Dispatcher:** `tim backlog phase <p> status --json` is the dispatcher (skill pattern 2 without a new script): the skill reads `Next:` and prints `MODE:`.
- **Modes:**
  - `NEW`: interview (four questions at most, lettered options, Ralph shape, F K20), `tim backlog init`, sources registered, contract drafted, then launch distil.
  - `RESUME`: relaunch from the ledger's next phase with the same args.
  - `ADD-SOURCE`: register a source, reset `characterise` for it only (cascade handles the rest), relaunch.
  - `RULE`: capture Sam's answers into `tim backlog rule` calls, then relaunch `combine` to `report`.
  - `REPORT`: `tim backlog report` only.

### 5.2 Phases, in order

The phase table is profile data in `requirements-v2` (G1 §3's table, extended). "Runs in" says whether a phase is a Workflow agent phase or a main-session step.

| # | Phase | Needs | Runs in | Who (tier) | Output | Gate |
|---|---|---|---|---|---|---|
| 0 | `setup` | none | main | the skill | workarea, header skeleton, `CONTRACT.md` whole | contract has no `PER-RUN` markers left (as FINDING-CONTRACT `:10-25`) |
| 1 | `heads` | setup | main | `tim backlog heads --write` | `heads.json` | `--strict` on re-read before `combine` and `report` |
| 2 | `register` | setup | main | skill + adapters | `sources[]`, `sources/<id>/raw.*`, seals | every source has role, tier, version |
| 3 | `characterise` | register | workflow | 1 per source, doer (think for policy or legal documents) | `characterisation.md`, `units.json` (every addressable unit with a provenance token) | every source has units or a stated reason it has none |
| 4 | `carryover` | characterise | workflow | 1, think | `carryover.json`: each previous atom `carries`, `retired`, `changed` or `recheck`, with the settling mechanism | runs only with a previous distillation or an `existing-backlog` source |
| 5 | `slice` | characterise | workflow | 1, think | `slices.json` over units; one cross-cutting owner with its brief | `tim backlog slices --strict` |
| 6 | `author` (pass 1) | slice, carryover | workflow | 1 per slice, think; waves of at most 5 concurrent | `requirements/<slice>--<slug>.json`; return `{keys[], notRaised[], premisesDisproved[], unitsCovered[]}` | none yet |
| 7 | `verify` | author | workflow (pipelined per slice) | a different agent per slice, think | verdicts written into each atom's `provenance`; added atoms marked `added` and sent to a second verifier | `tim backlog yield --strict`; `tim backlog coverage --strict` |
| 8 | `reconcile` | verify | workflow | 1, think | conflicts, questions (with options, effects, "if nobody answers"), assumptions, invariants; precedence applied | every conflict has a resolution, a question or a provisional pick |
| 9 | `panel` | reconcile | workflow | conditional; per docket 3 judges then a chair; dockets serial; at most 5 Opus at once | `tim backlog rule --by panel` for what the panel may settle; escalations become `mustAnswer` questions | critic pass: every docket item one ruling; cross-docket contradictions fixed |
| 10 | `dedupe` | reconcile (panel if run) | workflow | 1, think | survivor keeps, absorbed atom `superseded` with the survivor named; never deletes a file | none |
| 11 | `ingest-atoms` | dedupe | workflow watcher | `tim backlog ingest --atoms` | `requirements[]` | refuses unverified, homeless, cyclic |
| 12 | `combine` (pass 2) | ingest-atoms | workflow | 1, think | `increments/<slug>.json`, `combination.declined[]` | `tim backlog ingest --increments` then `check --strict` |
| 13 | `critic` | combine | workflow | 1, think | questions or atoms for gaps; a "what this method cannot see" block per source kind (F K7) | none; its findings enter the report |
| 14 | `claims` | critic | workflow | 1, think | `CLAIM_VERIFIER` (parity persona, by path) over machine-written prose: question headlines, outcomes, combination whys, via `git diff` of `backlog.json` between the last two ledger fingerprints | corrections applied through `tim backlog set` |
| 15 | `report` | claims | workflow watcher | `tim backlog report` | `report/` | render exits 0 |

**Why this cut of fan-out** (G1 §4 item 3, synthesis §7.7): characterisation fans out per source because it is local to a source. Authoring fans out per **slice of the service**, so one author sees every source's view of that part. Reconcile, dedupe, combine and critic are single agents, because cross-cutting judgement spread over N workers is anti-pattern A5.

**Pass 1 grain rule** (verbatim from `FINDING_AUTHOR.md:130-137`, generalised): "One requirement, one thing a person could build and prove. If your sentence contains 'and also', you have two requirements." A whole absent page is one atom with its content enumerated inside it.

**Completeness checks, all mechanical:**

1. `coverage --strict`: every unit is cited by an atom or stated absent with a reason ("not a requirement: legacy layout").
2. `slices --strict`: every unit in exactly one slice; one cross-cutting owner.
3. `yield --strict`: a thin slice is asked, not ruled; any homeless, strayed or unverified atom blocks; author equal to verifier blocks.
4. Returned `notRaised[]` and `premisesDisproved[]` render in the report (`author-workflow.js:214-232`).
5. The critic states what the method cannot see and gives an honest counter-number ("38 of 39 map cleanly, one entirely absent", `completeness-critique.md`).

### 5.3 Pass 2: combining

The COMBINER persona generalises `DUPLICATE_SWEEPER.md` one step up its own scale (G1 §1.5): dedupe asks "is this the same change?"; combine asks "is this different work that one person should do together, as one reviewable unit?".

**Rules** (header `combination.rules`, defaults from `combination-proposal.md:13-15`, restated in requirement terms per F P13):

| Rule id | Rule |
|---|---|
| `cr-same-surface` | Members share a surface area (page group, endpoint group, workflow, tool) |
| `cr-same-repo-set` | Members touch the same repo set, or one member is the tests-repo proof of another (lockstep, Q14) |
| `cr-same-acceptance-boundary` | One journey slice or one contract test proves all members |
| `cr-proves-another` | An atom that only documents or proves another merges into it (EUDPA-409 exemplar rows) |
| `cr-attributability` | Never combine if a red in one member would be misattributed to another |
| `cr-no-need-boundary` | Never combine an atom with an open `needs` with one that has none, so a question blocks only its own work |
| `cr-no-checkpoint-boundary` | Never cross a milestone or checkpoint |
| `cr-no-two-new-surfaces` | Never two new user-facing surfaces (the "never two add-page" rule, stated without the recipe word) |

**Ceiling** (`combination.ceiling`, data): at most 12 acceptance criteria, 3 repos, 1 new surface. A combined item must be expressible as one end-state proof the consistency reviewer can run (A §8, s17's 1,076-line plan).

**Output:** one file per group; `declined[]` with the rule and reason for every pair the candidates tool proposed and the combiner left alone. **Applied automatically and reported** (Q13), because Sam's rule is "make the call, flag it after", and because the combination is re-derivable at no cost.

**Re-derivability after rulings.** A ruling that adds, drops or reshapes atoms resets `combine`. The combiner is re-run with the previous `increments/*.json` as its starting point and told to keep every group whose members are unchanged. Ids stay stable because they key on file slugs. A group that has started cannot be dissolved (ingest refuses, naming it). A mid-build re-combine only ever regroups `todo` increments.

### 5.4 Panel and escalation

- **Trigger:** the panel runs only when `reconcile` leaves at least one conflict that precedence cannot settle and that is not in an escalation category. With none, the phase is marked done with the note "no conflict needed a panel" (cost control, Q12).
- **Shape** (EUDPA-409 `panel-*.json`, `panel/README.md:11-22`): conflicts grouped into themed dockets by the reconciler; per docket three judges in parallel then a chair; one critic across all dockets for contradictions, vocabulary drift and standing-ruling breaches; reconciliation of the critic's fixes; the applier is `tim backlog rule --by panel`, not an agent editing JSON.
- **Concurrency:** dockets run one after another; three judges plus nothing else at once, so Opus fan-out stays at 4 or fewer (H §1.8; synthesis §7.4).
- **Authority:** the panel may rule anything that the sources, precedence and standing rulings can settle. It must escalate, as a `mustAnswer` question with its recommended option, anything in these categories: security, access control, data integrity, legal or policy, a change of scope, contradicting a Sam ruling, or a call whose reversal would touch more than one increment already built. `decidedBy: panel` rulings appear in report section 2 as calls Sam may reverse.

### 5.5 Personas and where they come from

| Persona | Cut from | Change |
|---|---|---|
| `CHARACTERISER.md` | `SOURCE_EXTRACTOR.md:1-47` (method) | Method only; writes units with provenance tokens; per-type mechanics moved to `source-types/` |
| `source-types/{docx,pdf,confluence,jira,image-board,design,repo,code,trace-corpus,transcript,chat,existing-backlog,parity-corpus,openspec,web}.md` | `SOURCE_EXTRACTOR.md:28-32, 125-133`, `rules.mural.md`, trace workflow `:103-124` | One per type; instance notes go to the run's `characterisation.md` |
| `REQUIREMENT_AUTHOR.md` | parity `FINDING_AUTHOR.md` (grain rule, check the brief, stay in slice, promote what you notice, never write backlog.json) + trace confidence tags | N sources per atom; no pictures-and-DOM rule unless a source is a live system |
| `REQUIREMENT_VERIFIER.md` | parity `FINDING_VERIFIER.md` (nine-point rubric, one verification line on every item) + trace Verify (`:850-927`: "do not invent corrections to seem useful") | adds the recipe smell and the AC rule to the rubric |
| `RECONCILER.md` | `SPEC_RECONCILER.md:19-30` (every disagreement a conflict, do not force-fit) + `RECONCILER-BRIEF.md:30-76` (source roles, parked not rejected) | target-neutral; writes questions with options and effects |
| `PANEL.md` (judge, chair, critic sections) | EUDPA-409 panel files | formalised from workarea files into the skill |
| `COMBINER.md` | parity `DUPLICATE_SWEEPER.md` + `combination-proposal.md` | the rules and ceiling above |
| `COMPLETENESS_CRITIC.md` | trace critic (`:1435-1443`), `ched-p/completeness-critique.md` | per source kind |
| parity `DUPLICATE_SWEEPER.md`, `CLAIM_VERIFIER.md` | read **by path from the parity skill**, not copied | each gains a short "used by the distiller" section; `CLAIM_VERIFIER.md:17`'s hardcoded path becomes "the backlog path in your prompt" |

Every spawn prompt starts with the workflow's GUARD RAILS constant, then "Follow the instructions in `~/git/defra/trade-imports-workspace/.claude/skills/backlog-distiller/references/<NAME>.md`", then the run's `CONTRACT.md` path.

### 5.6 Source types and how each is acquired

| Kind | Acquired by | Provenance token | Default role and confidence |
|---|---|---|---|
| Confluence | `tools/confluence/page.sh <id> json`, `.body.view.value` (D §2.1) | row id, or `h4:<heading>/li:n` | requirement; `stated` |
| Jira epic, story, comments | `tools/jira/ticket.sh`, `comments.sh`, `get-epic-issues.sh` (the `prepare-refinement.sh` pattern) | `EUDPA-123#desc/para:n`, `EUDPA-123#comment:<id>` | requirement; `stated` for description, `inferred` for comments unless by a named authority |
| docx or pdf | copied into `sources/<id>/raw.*`; docx via `unzip -p word/document.xml` with `</w:p>` and `</w:tr>` markers | `section:<slug>/para:n`, `annex:n/reg:<ref>` | requirement; `stated` |
| images or design boards | copied; read one at a time with the Read tool; crops recorded | `file:<short>/region:<label>/item:n` | requirement (design); `stated` for signed-off designs |
| repos and existing code | read with `git show <pin>:<path>` at a recorded pin, never the working tree (`citations/resolve.js:6-30`) | `path:line@sha` with blob | **constraint** or consistency anchor; never a feature requirement on its own (D §7.13) |
| transcripts, chat, email | pasted or exported into `sources/<id>/raw.md` | `speaker@timestamp` or `msg:n` | utterances classed requirement, decision, question or opinion; `stated` only for a decision by a named authority, else `inferred` |
| existing backlog or parity corpus | read-only, through `tim backlog show` or `tim parity` | `<programme>:<id>` | `decision-record` for rulings, `requirement` for verified findings (`inferred` unless verified) |
| OpenSpec | files under `openspec/specs/**` | `REQ-...`, `SCN-...` | requirement; `stated` |
| trace corpus | per-agent private directory, `fill` values redacted | trace hash + action id | current behaviour; `observed` |

Credential-shaped strings are redacted at characterisation, and `tim backlog check` refuses any that slip through, so the backlog stays readable to agents.

### 5.7 Model tiers and fan-out

Tiers are set explicitly on every `agent()` (FA:95-97): `think` = Opus high effort, `doer` = Sonnet, `watcher` = Haiku low effort. Opus concurrency is capped at 5 in every distil phase by running waves, well under the 6 the memory sets. When `run.json` binds distil roles to Codex (for when Claude's weekly limit is near), characterise, author and verify go through the same Codex adapter as the build (section 8); reconcile, panel, combine and critic stay on Opus by default.

### 5.8 Resumability

- The phase ledger is the resumption record ("half a slice's findings on disk look exactly like a finished slice", `phase.sh:13-14`).
- The skill relaunches with the same `scriptPath` and args; the workflow asks `tim backlog phase status` and skips done phases.
- `resumeFromRunId` replays completed agents when the args are identical.
- A reset cascades, so the ledger cannot contradict itself (fixes DR1B's `specs` running while everything downstream is done).

---

## 6. The distillation report

Quality here is Sam's first priority. The report is rendered by `tim backlog report` from `backlog.json`, `state.json`, `phases.json`, `heads.json` and `seals.json`. It reuses parity's render machinery (`render/page.js`, `card.js`, `sections.js`, `theme.js`, `prose.js`, `artifact.js`) with the card made profile-driven and N-sourced.

### 6.1 Rules the renderer enforces

1. Decision-led order (`c0f99985`): what needs Sam first, then what he may reverse, then everything else.
2. Every number derived; the headline sentence built from counts (`page.js:222-231, 287`).
3. Headline first, id second (`feedback_reference_by_headline_not_ticket_number`).
4. Each section stands alone: first mention of anything says what it is (`feedback_updates_stand_alone`).
5. Nothing silently dropped: unknown categories render under their raw name; withdrawn items stay visible (`page.js:346-377`).
6. Evidence in reach: every source citation resolves to a permalink or a quoted snippet; design sources show their crops.
7. Freshness: a drift panel lists sources whose seal moved and repos whose head moved since the last render; only `tim backlog source seal --reseal` clears it.
8. GDS plain English, British spelling, no em dashes, no time estimates, dates as "18 September 2026".
9. Progress as N of TOTAL (P%), with the deferred count named separately.
10. The page never writes; batch-ruling controls emit `tim backlog rule` commands, one per line.

### 6.2 Sections, in order

| # | Section | Contents |
|---|---|---|
| 0 | Masthead | What is being built and why (header purpose); sources read with version and date; derived counts; freshness stamp; drift panel if anything moved |
| 1 | **Needs your ruling** | Open and outstanding questions: must-answer first, then by how many increments each blocks; clustered by `cluster`; each card has the four parts plus pictures, the recommended option, and a ruling control |
| 2 | **Calls we made that you may want to reverse** | Precedence resolutions, panel rulings, assumptions and the combine's riskiest groupings; each with the rule that made it, the other side's case, and "To reverse:" in increments and atoms touched |
| 3 | **Where the evidence is weak** | Atoms at `inferred` or `gap`; single-source atoms; thin slices; what would upgrade each |
| 4 | **The backlog** | Increments in build order: outcome headline, members, acceptance, dependencies, needs; build status from `state.json` when a build has started |
| 5 | **How increments were combined** | The rules, per group the why, risk and attributability, and "considered and left alone" |
| 6 | **Coverage** | Source to atom to increment matrix; units stated absent with reasons; `notRaised[]` |
| 7 | **Conflicts between sources** | Needing a person (cross-linked to 1), settled by precedence or panel (cross-linked to 2), both sides quoted |
| 8 | **Out of scope, parked, rejected, superseded** | Each with who ruled and when |
| 9 | **What this method cannot see** | The critic's per-source-kind blind spots and counter-numbers |
| 10 | **Rulings applied** | The ledger, newest first, one line each with Sam's words verbatim and the date; rationale collapsed |
| 11 | **Build status** | Present once a build has started: done N of TOTAL (P%), reds with the owed action, parity proof result, "no local rule analysis ran; SonarCloud on the PR is the check" |
| 12 | Where everything is | Paths, the commands that rebuild the page, footer stamp (backlog sha256, tool version, heads) |

### 6.3 Skeleton, with example content

```text
HIGH-RISK PLANTS: ORIGIN AND ARRIVAL
What needs a ruling

This page leads with what you must decide, then the calls you may want to reverse.
We are building the origin and arrival part of the high-risk plants notification, so an importer can
say where plants come from and when they arrive, within the 2026 regulation.
Sources: plant health policy paper (v1 August 2026, read 18 September 2026) . Confluence "User needs"
(version 11) . Mural board, 4 frames . Jira epic EUDPA-407 with 23 comments . live-animals frontend at 4f1c9e2
(consistency only).

64 requirements in 19 increments (45 build runs saved). 7 questions need a ruling, 2 of them must be
answered before anything they touch is built. 12 conflicts: 3 need a person, 9 settled by precedence.
Every fact was re-checked against the sources on 18 September 2026.

[ Drift since you last looked: Confluence "User needs" moved from version 11 to 12. 3 requirements cite
  the changed section. Re-seal after reading. ]

1. NEEDS YOUR RULING

  Must answer before build (2)

  > Should a user see only their own organisation's notifications?        q-notification-list-scope
    In play: the dashboard list and the notification view, in the plants frontend and backend.
    Options:
      A  Only notifications created under the user's current organisation. (2 sources: policy
         para 14, Confluence NNS-UN-031)  [recommended]
      B  Every notification the user personally created, across organisations. (1 source: the
         7 September call transcript, Sam at 14:02)
    If nobody answers: nothing that lists notifications is built. Blocks 2 increments:
      "The dashboard lists the notifications a user may see", "A user reopens a draft notification".
    [ A ] [ B ] [ other... ]

  Access and ownership (cluster, 1 more question) ...
  Content (cluster, 3 questions) ...

  Copy batch:
    tim backlog rule plants-origin q-notification-list-scope --option A --words "..." --by sam --at ...

2. CALLS WE MADE THAT YOU MAY WANT TO REVERSE

  > The policy paper's four countries win over Confluence's five.           d-009 (precedence)
    Rule: for mandates, the policy paper outranks Confluence (precedence "mandate").
    The other side: Confluence adds Cyprus, citing a 2025 derogation the paper does not mention.
    To reverse: 1 atom changes its acceptance; 1 increment ("Ware-potato notifications accept only the
    four permitted countries") gains one criterion. Nothing is built yet.

  > Port and arrival date are built as one increment.                      combine
    Rule: same surface, same repos, one journey proves all three.
    To reverse: remove "arrival--date-not-in-past" from the group; 1 new solo increment.

3. WHERE THE EVIDENCE IS WEAK
  4 requirements rest on one inferred source. "Arrival date cannot be in the past" is inferred from
  the prototype only; a line in the policy paper or a ruling would upgrade it.

4. THE BACKLOG     0 of 19 done (0%). 2 deferred, not counted.
  inc-009  Commodity lines can be added and removed          todo      4 criteria . depends on nothing
  inc-014  Ware-potato notifications accept only ...         todo      2 criteria . after inc-009
  inc-021  The dashboard lists the notifications a user ...  BLOCKED   needs q-notification-list-scope
  ...
  (each increment expands to its member requirements, their acceptance and their sources)

5. HOW INCREMENTS WERE COMBINED
  64 requirements became 19 increments. Rules applied: ... Considered and left alone (11):
  "Port of entry" and "Vehicle registration": a red in transport's reference data would stall arrival.

6. COVERAGE
  Policy paper: 212 units, 188 cited, 24 stated not a requirement (definitions, contact details).
  ...  Noticed and not raised (6): "The Mural board shows a bulk upload button": parked by d-003.

7. CONFLICTS BETWEEN SOURCES  (12: 3 need a person, 9 settled)
8. OUT OF SCOPE, PARKED, REJECTED (9)
9. WHAT THIS METHOD CANNOT SEE
  No source says how long a draft is kept. Server-side validation of the date is inferred, not observed.
10. RULINGS APPLIED
  18 September 2026  "Own org only. Obviously."  Sam  (q-notification-list-scope, A)
11. BUILD STATUS  (appears once building starts)
12. WHERE EVERYTHING IS
  backlog.json . state.json . plans/ . rebuild this page: tim backlog report plants-origin
  backlog sha256 3f9a...  tim 2.4.0 . heads: plantsFrontend 9c2e1b0 (same), tests 71aa3d2 (same)
```

### 6.4 The answer sheet and how rulings flow back

`tim backlog report --answer-sheet` writes `report/answer-sheet.md`:

```text
# Answer sheet: plants-origin, 18 September 2026
# One line per question. Keep the id. Write an option letter, then your words if you want them kept.
q-notification-list-scope:
q-country-list-derogation:
q-draft-retention:
```

1. Sam answers on the page (batch controls) or pastes the sheet back, or answers in conversation. Answers are keyed by slug, so "question 3" ambiguity cannot happen (G §2).
2. The distiller skill turns each line into `tim backlog rule` with Sam's words verbatim, `--by sam` and the time. "Maybe" or a hedge is recorded with `--outstanding`, never as a ruling (`feedback_question_is_not_a_ruling`).
3. `rule` appends to the ledger and applies effects: atoms adopted, parked, rejected or superseded; needs cleared; statuses recomputed; dependencies on dropped items stripped with a note; `combine` and `report` reset.
4. The skill relaunches the distil workflow for `combine` to `report`. Ids stay stable; the ruled question leaves section 1 and becomes one line in section 10; unblocked increments turn `todo`.
5. During a build, a judge's deferral becomes an atom through `tim backlog discover` and a question if it needs a person, so build-time questions reach the same section 1.

---

## 7. The implementor skill and the build workflow

### 7.1 The skill: `backlog-implementor`

- **Folder:** `git mv .claude/skills/build-orchestrator .claude/skills/backlog-implementor`. It keeps the parts analysts rated highest (C §10): one-tier orchestration, "Buildability is status and dependencies. Nothing else", "Thin is fine; wrong is not", verify landing from state, the stop taxonomy and the handover prompt.
- **Triggers:** "build the backlog", "build inc-012 to inc-020", "delegate this batch to Codex", "Codex for the rest", "switch back to Claude", "resume the build", "hand over the build". NOT for writing or ordering a backlog (`backlog-distiller`), NOT for one agreed change (`frontend-change`, `ticket`).
- **Runs in the main session**, because a subagent cannot launch a Workflow (`README.md:7-11`).
- **What it does, in order:**
  1. Resolve the programme from the registry (`tim backlog registry show`), run `tim backlog check --strict`, print counts as N of TOTAL (P%) with the deferred count named.
  2. Turn Sam's sentence into `tim backlog run bind` or `run set` calls (section 8.10). No backlog edit, ever.
  3. Launch `Workflow({scriptPath: "<ABS>/.claude/workflows/backlog.js", args: {mode: "build", programme, cadence, count, commitTrailer}})`. The commit trailer comes from the launching session's own attribution, so no model name is hardcoded (fixes `increment-build-loop.js:1472`, FA:134-138).
  4. When the run ends, read the result from `journal.jsonl`, then verify from state, not from the run's report: `tim backlog show <p> <id> --state --json` for each increment the run touched (`SKILL.md:222-237`).
  5. Reproduce any "environmental" or "pre-existing" claim in the parent shell before relaying it (memory `feedback_verify_subagent_failure_claims`).
  6. Sweep the journal for any `DEFERRED:` line not already recorded through `tim backlog discover` (safety net only; section 7.4 stage 12 is the channel).
  7. If the stop was healthy (`awaiting-approval`, checkpoint, count reached), launch the next run at once when Sam asked for more (memory `feedback_never_idle_between_increments`). Otherwise print the handover.
- **Dispatcher:** `tim backlog next <p> --json` plus `tim backlog show --state` give `MODE: RUN | RESUME | BLOCKED | DONE`.

### 7.2 Cadence: drain inside one Workflow, re-derive after every increment

Decision (Q19): the build mode **drains** inside one Workflow invocation, re-deriving the next increment with `tim backlog next` after each one, as FA does (`FA:507-567`), but using the loop's dependency-aware rule instead of file order. `cadence: "one"` stops after one increment, for Sam's supervised runs. There is no second code path.

Why not the nested `workflow({scriptPath})` hybrid (G4 §2.1): its benefits (per-increment executor switch, re-reading a fixed child file) are delivered more simply. The executor is re-read from `run.json` at every iteration, so a mid-drain "Codex for the rest" takes effect at the next increment without relaunching. A fix to the workflow script needs a relaunch, and the state-driven resume makes that cost nothing. Nested workflows stay a later option once the canary (inc-003 in section 11) proves resume across children.

Guard: the drain stops at the first red, at a checkpoint, at `count`, at `none` from `next`, and after three consecutive increments that did not land (Q31, journey-builder's systemic halt).

### 7.3 Args contract

```js
// backlog.js, first lines of the build mode (sketch, not a recipe for the team to copy blindly)
const CFG = parseArgs(args)                // JSON.parse when a string (c904fa46); throw when not an object
require(CFG, ['mode', 'programme'])        // throw naming the missing key; there is no FALLBACK
log(`resolved config: ${JSON.stringify(CFG)}`)
```

- `mode`: `build` or `distil` (required).
- `programme`: registry key (required).
- `cadence`: `drain` (default) or `one`.
- `count`: optional ceiling chosen by Sam, never a pacing budget.
- `commitTrailer`: required for `build`.
- `phases`: `[from, to]` for `distil`.

Everything else (repos, ladders, delivery, knobs, bindings) is read at run start from `tim backlog show --header --json` and `tim backlog run show --json` by the resolver agent and returned through its schema, so the script, not a prompt, holds and enforces each knob (fixes the `reviewCap` clamp, FA:228 against FA:783).

### 7.4 Per-increment stages

Tiers: `watcher` = Haiku low effort, `doer` = Sonnet, `think` = Opus high effort. "Executor" means the stage role is bound in `run.json` and runs through section 8's adapter.

| # | Stage | Runs when | Who | Reads | Writes (only through `tim backlog`) | Red on failure | Reuses |
|---|---|---|---|---|---|---|---|
| 0 | Resolve (once per run) | always | watcher | args, header, `run.json` | exported Codex schemas under `runs/<run>/schemas/` | throws | `increment-build-loop.js:219-261` |
| 1 | Next | each iteration | watcher | `tim backlog next --json` | nothing | stops the drain with the reason | new rule, 3.8 |
| 2 | Bindings | each iteration | watcher | `tim backlog run show --for <id>` | nothing | throws | 8.9 |
| 3 | Ticket | `ticketing` set and per-increment | watcher | brief (title, outcome, members' acceptance) | `state.ticket` the moment it exists | `ticket-failed` | loop `:857-993` (idempotent, exact-string transitions, board move) |
| 4 | Branch | per strategy | watcher | `delivery`, `repos` | `state.branch` | `branch-failed` | loop `:999-1045` (`--no-track`, upstream repair); FA baseline for programme |
| 5 | Baseline | always | watcher | repos this increment touches only | `state.heads{repo: sha}` | `baseline-red` (stops; never `continue`, fixes `:1092`) | FA:518-565 |
| 6 | Sync | programme branch, or a per-increment branch behind base | doer or executor | base | merge commits | `sync-blocked` (conflicts never auto-resolved) | FA:613-661 |
| 7 | Brief | always | watcher | `tim backlog show <id> --brief --out runs/<run>/<id>/brief.json` | the brief file | throws | new view |
| 8 | Plan | always (skipped when a plan exists and its pinned blobs still match) | think or executor | brief, `repos.<key>.knowledge`, header ladders, current code, source citations at their `readAt` | `plans/<id>.md`; script records `state.plan` and `state.planPin` | `plan-refused` | FA:687-731, extended below |
| 9 | Context | after plan, and again after implement | watcher | planned or changed files | `runs/<run>/<id>/context.json` via the courier | throws | 8.6, 8.7 |
| 10 | Implement | always | doer or executor | plan, brief, context | working tree (staged, never committed) | `implement-failed`, work preserved | FA:736-780; `codex/implement.md:47-62` stance |
| 11 | Review | always | per file in `reviewFocus` plus any changed file not a pure move: 1 style + 1 code reviewer (doer or executor); 1 consistency reviewer (think or executor); 1 acceptance checker (think or executor) | whole change `<base>...HEAD` plus index (fixes `diff --staged`, B §3.5), plan, brief, context, invariants | findings in memory; journal | `review-failed` if any reviewer returns nothing | loop `:1179-1251`, FA:787-858 |
| 12 | Verify findings | findings exist | per file, doer or executor | findings, code, brief | verdicts | never red; a dead verifier passes findings as unrefuted | loop `:1257-1311` (= FA:860-909) |
| 13 | Judge | confirmed findings exist | think (knob: executor) | findings, brief, plan, decisions, `RULING_RULE` | `discover` for deferrals; journal | `judge-failed` (a dead judge no longer means "no fixes", fixes `:1350`) | loop `:1316-1351`, FA:914-945 |
| 14 | Fix | `fixNow` not empty | doer or executor | judge's instructions | working tree | `fix-failed` if `ok` is false or any instruction is not applied (fixes `:1373`) | loop `:1356-1390` |
| 15 | Ladder | always | doer or executor; browser rungs on Claude | header ladders per touched repo, plan's `ladderExtra` and invariants | logs; `state.ladder` | `ladder-red`, work preserved | FA:973-1021; loop `:1405-1415` framework-assertion exception |
| 16 | Secrets | always | watcher | `tim backlog secrets --staged` per repo | `state.secrets` | `secrets-red` | replaces the diff side of the session hook (R4) |
| 17 | Land | always | watcher | plan's `behaviourChanges` for the commit type and body | commit per repo via `-F`; `state.commits{repo: [sha]}`; phase `landed` | `land-failed` | FA:1026-1060; loop `:1463-1467` HEAD-not-base proof |
| 18 | Pull request | not `local` | watcher | `delivery` | `state.prs[]` after each repo | `pr-failed` | loop `:1510-1564` (per-increment); `pr-ensure-draft.sh` (programme) |
| 19 | CI | not `local` | watcher; fixer doer or executor | `wait-for-pr-checks.sh` exit codes | `state.ci`, `newPrs` folded into `state.prs` | `ci-red`, or `platform-blocked` with the owed fix | FA:1104-1133; loop `:1631-1687` |
| 20 | Local E2E | `run.json` `localE2e`: `auto` decides whether the change can alter what the stack serves | doer (Claude only; browser) | `tim docker dev`, `npm run test:docker-compose` | `state.localE2e` | `e2e-red` | FA:1140-1234 |
| 21 | Merge | `delivery.merge.policy` is not `never` | watcher | approvals, `merge.order` | `state.prs[].merged`, base watch | `merge-stopped` with `stopReason` | loop `:1714-1854` |
| 22 | Done and record | always | watcher | state | `tim backlog status <id> done --done-by build`; ticket Done; `tim backlog report`; commit `backlog.json`, `state.json`, `journal.jsonl`, `plans/`, `report/` by name when `run.json` `record: commit` | `record-failed` | FA:1286-1300 |
| 23 | Checkpoint | increment has one | watcher | `checkpoint` | nothing | stops the drain (healthy) | journey-builder BUILD mode |

**The plan outline**, fixed in `stages/plan.md` (FA:703-714, extended): 0 Decisions (with rejected alternatives), 1 Evidence check (per citation: blob equal, out of range, missing or dead, and what was re-derived; G3 §4 item 5), 2 Moves, 3 Edits, 4 New files, 5 Tests (the level of proof each acceptance criterion's `witness` asks for), 6 Invariants to prove (unpiped commands with expected output), 7 Acceptance map (each member criterion to where it is proved), 8 Out of scope. The outline forbids lifecycle content: no commit subjects, branch names or PR text (fixes the s17 overreach, A §6.4). Where the brief leaves a choice open, the planner makes it and records it (FA:720).

### 7.5 Lifecycle profiles and merge policy

| Stage | `per-increment` | `programme` | `local` |
|---|---|---|---|
| Ticket | when `ticketing` set | no (one epic-level ticket optional) | no |
| Branch | `<class>/<KEY or NO_JIRA>-<slug>` per increment, same name in every touched repo | one programme branch, asserted | `<class>/NO_JIRA-<slug>` cut by the workflow |
| Sync | only when behind base | every increment, including the tests repo (FA commit `474e6b2a`) | only when behind base |
| PR | one per repo per increment | one draft per repo for the programme | none |
| CI | yes | yes | no |
| Merge | per `merge.policy` | never inside the drain; one merge at the end when Sam says | no |
| Red work | pushed `wip(...)` commit | pushed `wip(...)` commit | path-scoped `git stash push -u -- <paths>` |

Merge policy (Q25): `never` is the default. `on-approval` is allowed and known to cap throughput. `on-green` is refused by `tim backlog check` unless `delivery.merge.decision` names a ruling by Sam (memory `feedback_never_auto_merge_wait_for_sam`). Merge order is data: `merge.order` pairs of provider and consumer keys, defaulting to the loop's backend, tests, frontend (`MERGE_RANK`, `:299`).

### 7.6 `run.json`

```jsonc
{
  "defaultExecutor": "claude",
  "bindings": [
    { "ids": ["inc-012", "inc-013", "inc-014"], "executor": "codex", "roles": null },   // null = every delegable role
    { "from": "inc-015", "executor": "codex", "roles": ["implement", "review", "fix"] }
  ],
  "cadence": "drain",
  "quality": { "reviewCap": 12, "ciFixAttempts": 2, "localE2e": "auto", "systemicHaltAfter": 3,
               "codexParallel": 6, "opusConcurrency": 5, "acceptanceCheck": true, "judgeOn": "claude" },
  "record": "commit",
  "commitTrailer": null          // set per launch from the session's attribution
}
```

`run.json` is state the implementor owns. The distiller never writes it; the backlog never points at it.

### 7.7 Red handling, parking and resume

- **At the first red** the increment's work is preserved (7.5), the red status and a journal note are written, and the drain stops. The one exception is `platform-blocked` (a missing secret or an organisation setting): the increment is parked, the owed fix is named in the report's build status, and the drain continues with increments that do not depend on it (memory `feedback_platform_blocked_increment_park_and_move_on`; this replaces build-orchestrator's hard `ci-red` stop).
- **Retry** is a person's act: `tim backlog state <p> <id> retry --at ci|e2e|ladder|plan|implement`.
- **Resume** reads only persisted facts: `state.ticket`, `branch`, `plan`, `commits`, `prs`, phase. `resumeAt` is derived exactly as the loop does (`:938-946`), extended with `plan` (skip planning when the plan's pinned blobs still match) and `landed`.
- **Relaunch is resume.** Same `scriptPath`, same args; optionally `resumeFromRunId`, which replays completed agents from the journal.

### 7.8 Silent-success paths, eliminated

| Path today | Where | Now |
|---|---|---|
| Dead reviewers dropped by `filter(Boolean)` | loop `:1250` | the stage is red (`review-failed`) and the missing reviewer is named |
| Dead judge becomes "no fixes" | loop `:1350`, FA:944 | red (`judge-failed`) |
| Fixer result ignored | loop `:1373`, FA:953 | red unless `ok` and every instruction applied |
| Report refresh failure logged only | FA:1277-1279 | report is a deterministic render; a failure is `record-failed` and the next run re-renders |
| `landed` unknown to the baseline | FA:537-545 | `landed` is a first-class phase with its own `resumeAt` |
| Record agents returning empty | FA run, 165 empty results | every watcher schema has a required non-empty `did` field |
| Codex run with no output read as clean | relay drops `confidence` | `run-stage.sh` exits 1 unless every prompt produced schema-valid output; the courier returns per-prompt status; the workflow throws on any gap |
| Codex committing or pushing on its own | none today | after every Codex stage a watcher proves each repo's HEAD equals the pinned HEAD and no remote ref moved; otherwise red |
| "Pre-existing" red written into state | FA `stages.json` s17 | banned in every brief; the implementor skill reproduces such claims before relaying |

### 7.9 Stop taxonomy and handover

Stop reasons (from `SKILL.md:279-326` and loop `:655-660`): `all-done`, `none-buildable` (with the blocking questions named), `checkpoint`, `count-reached`, `awaiting-approval`, `changes-requested`, a red (named), `systemic-halt`, `platform-blocked` (continues). The handover prompt shrinks to three things (G4 §4): the programme key, the args object verbatim, and the run id for `resumeFromRunId`. A Codex-flavoured variant (Q23) adds the bindings table and "your shell is normal", and points Codex at the same stage briefs, the same `tim backlog` commands and the same backlog (H §4.2).

---

## 8. Executors

### 8.1 The stage contract

Every delegable stage has **one brief file** under `.claude/workflows/stages/` and **one output schema** in the workflow's `STAGE_SCHEMAS` block. The prompt for either executor is always three parts:

1. the executor profile (`executors/claude.md` or `executors/codex.md`),
2. the shared stage brief (`stages/<stage>.md`),
3. the bindings for this increment.

**Common input bindings** (placeholders, bound per run, never remembered from another run; `codex/implement.md:31-33`):

| Placeholder | Value |
|---|---|
| `<workspace>` | ABS for Codex, TILDE for Claude Bash |
| `<programme>`, `<backlog>`, `<workarea>` | registry key and paths |
| `<increment>` | `inc-NNN` and its title |
| `<brief>` | `runs/<run>/<id>/brief.json` from `tim backlog show --brief` |
| `<plan>` | `plans/<id>.md` (after stage 8) |
| `<repos>` | table of key, path, GitHub name, ladder scripts |
| `<base>`, `<branch>` | from `delivery` and state |
| `<context>` | `runs/<run>/<id>/context.json`: per file, matched rules, pointed best-practice files, style topics and bundle files, review best-practice files |
| `<file>`, `<persona>` | per-file stages only |
| `<findings>` | verify, judge and fix only |
| `<logs>` | `runs/<run>/<id>/` |

**Output schemas** (every property `required`; optional means nullable; Codex requires it, and Claude accepts it):

| Stage | Output |
|---|---|
| `plan` | `{ok, refusal, planFile, reviewFocus[{file, why}], pureMoves[], behaviourChanges[], decisions[{what, chose, rejected, why}], risks[], filesPlanned[], ladderExtra[{repo, script, why}], evidenceCheck[{source, ref, verdict, action}], rulesRead[], summary}` |
| `implement` | `{ok, summary, changedFiles[], rulesRead[], siblingsRead[], discovered[{title, statement, why, acceptance[]}], notes}` |
| `review-file` (style and code) | `{file, persona, findings[{file, line, severity, category, what, why, fix, confidence, rule}], bundlesRead[], summary}` |
| `review-consistency` | as above plus `invariantsRun[{command, expected, actual, pass}]` |
| `acceptance` | `{verdicts[{member, ac, met: "yes" or "no" or "unproven", evidence}], summary}` |
| `verify` | `{verdicts[{n, real, reasoning}]}` |
| `judge` | `{fixNow[{file, instruction, proof}], deferred[{title, statement, why, needsPerson}], rejected[{n, why}], summary}` |
| `fix` | `{ok, applied[], notApplied[{n, why}], changedFiles[], discovered[]}` |
| `ladder` | `{green, rungs[{repo, script, result: "pass" or "fail" or "skipped" or "could-not-run", log}], repairs[], browserRungs[]}` |
| `ci-fix` | `{ok, commits[], newPrs[], discovered[]}` |
| `sync` | `{ok, merged[{repo, from, sha}], conflicts[{repo, files[]}]}` |

Lifecycle stages (ticket, branch, baseline, land, PR, CI watch, merge, record) are Claude watcher-only and keep their schemas in the script.

### 8.2 The two adapters

**Claude adapter.** `agent(prompt, {model, effort, schema, label, phase})` where the prompt is the script's `GUARDRAILS` constant (Claude rails must precede the first tool call, memory `feedback_subagent_permission_prompts`), then "Read `<executors/claude.md>`, then read `<stages/<stage>.md>` and follow it", then the bindings. Per-file stages run under `parallel` with the concurrency caps from `run.json`.

**Codex adapter.** One Claude **courier** agent (watcher) per stage invocation:

1. Writes one prompt file per unit of work (per file for review and verify; one for plan, implement, fix) with the Write tool: bindings table, then "Read `<executors/codex.md>`, then `<stages/<stage>.md>`, and follow them in full".
2. Runs `tools/codex/run-stage.sh --schema <runs/<run>/schemas/<stage>.json> --parallel <N> --out <logs> <prompt files...>` repeatedly while it exits 75, at most five calls (the loop's slice limit).
3. Returns the script's assembled JSON array verbatim plus `{transport: [{prompt, ok, sessionId, reason}]}`.

The workflow checks that every prompt it sent has a result. A gap is a red, never an empty result. This keeps the loop's point that "the run died" must differ from "Codex found nothing" (`:683-687`), but the script, not a second relay agent, now proves it, halving Claude's agent count.

### 8.3 One schema copy

The workflow script holds `STAGE_SCHEMAS` as a plain JSON literal between two marker comments. The Claude adapter passes the object to `agent({schema})`. The resolver stage runs `tim backlog stage-schemas --from-workflow <script> --out runs/<run>/schemas/`, which extracts the block, checks every property is `required`, and writes one Codex schema file per stage. A tim contract test runs the extractor against the real script, as `report.contract.test.js` does against the real backlog, so a malformed block fails tim CI. There is one copy, in the script (this retires `codex/schemas/increment.json`, which was misnamed, E §5).

### 8.4 `tools/codex/run-stage.sh`

- Arguments: `--schema <file> --parallel <N> --out <dir> [--reasoning <level>] <prompt>...`.
- For each prompt not yet done: start `codex exec -C <workspace> --skip-git-repo-check -s workspace-write -c sandbox_workspace_write.network_access=true --output-schema <schema> -o <out>/<name>.lastmsg.json "Read <prompt> and follow it in full."` (the proven form, loop `:756`), or `codex exec <same flags> resume <sessionId> "Continue from where you stopped."` with every flag before `resume` when a session id is recorded.
- Concurrency: at most N at once, inside the script (a script may background its own children; the rails govern agent Bash calls, not script internals).
- Slicing: a per-process watchdog stops each Codex run inside the Bash tool's ceiling, records its `session id:` from the log, and marks it unfinished. The script exits 75 when anything is unfinished, so the courier calls it again. This moves the `pkill ... ; grep` prompt prose (`:762`) into bash.
- Validation: a finished prompt is `ok` only when its lastmsg parses and has every top-level key the schema requires (`jq`).
- Output: one JSON document on stdout: `{results: [...], transport: [...]}`.
- Exit codes: 0 all ok; 75 some unfinished; 1 any failed after its fifth slice.
- It is under `tools/**`, so it is allowlisted by path; no `codex exec` allow rule is needed (Q22). It must be committed with its execute bit set through git before any agent runs it (H §2.3).

### 8.5 Executor profiles

**`executors/claude.md`** (short, because the GUARD RAILS constant is already in the prompt):

- The harness loads matching `.claude/rules` when you Read a file. They are pointers: **read every best-practice file a loaded rule names before you edit or review** (rules probe, conclusion 2).
- A rule loads on Read, not on Write: **before you create or edit a file of any type, Read one existing file of that type in the same repo** (conclusion 3).
- The `<context>` file also lists every rule and best-practice file for your files. Read those too; they are the same list Codex gets.
- Report `rulesRead[]` and `siblingsRead[]` honestly; the consistency reviewer checks them.
- Never edit `backlog.json`, `state.json` or `run.json`. Report discovered work in `discovered[]`.

**`executors/codex.md`** (merges the preambles now copied at the top of `codex/implement.md`, `review.md` and `fix.md`):

- Your shell is normal. Ignore the Claude GUARD RAILS; they are for another tool.
- `.claude/rules` and `CLAUDE.md` are not loaded for you. The `<context>` file lists, per file, the rule files that match it and the best-practice files each rule points to. **Read them before editing or reviewing that file.** Report `rulesRead[]`.
- Answer in the output schema; every key is required; use `null` or an empty list where you have nothing.
- Never commit, push, reset, clean, force, rebase or switch branch. Stage only. Never touch `backlog.json`, `state.json` or `run.json`.
- Browser-driven suites cannot run in your sandbox (Chromium cannot get its Mach port); list them in `browserRungs[]` and do not run them (`codex/implement.md:123-132`).
- "Thin is fine; wrong is not. You work out the solution. That is the job." (`codex/implement.md:47-62`, kept verbatim).

### 8.6 Review and code-style personas, read live, same granularity for both executors

For each file under review, the context stage (a watcher) resolves, **by calling the skills' own tools at run time**:

1. `tools/style/file-topics.sh <path>` gives the style topics (additive: a Playwright spec is `playwright` and `node`).
2. `tools/style/bake-rules-bundle.sh --list <topic>` gives that topic's best-practice files (the single mapping, `bake-rules-bundle.sh:37-60`).
3. `tools/review/detect-tech.sh <repo path>` gives the review skill's best-practice files for the repo.
4. `tim backlog rules --root <ABS> <path>` gives the matching path rules and their pointed files (8.7).

Then **both executors** get, per file:

| Reviewer | Persona file (by path, never copied) | Plus |
|---|---|---|
| Style reviewer | `.claude/skills/code-style/references/STYLE_FILE_REVIEWER.md` | that file's bundle files (step 2), `code-style/SKILL.md` for dimensions |
| Code reviewer | `.claude/skills/review/references/FILE_REVIEWER.md` | step 3 and step 4 files, `review/SKILL.md` for dimensions, the brief's acceptance |
| Consistency reviewer (one per change) | `.claude/skills/review/references/CONSISTENCY_REVIEWER.md` | plan's invariants to prove (it runs them), header invariants |
| Acceptance checker (one per change) | `stages/acceptance.md` (a stage brief, not a persona: it has no counterpart in the skills) | the brief's member acceptance, independent of the plan (Q27) |
| Verifier (per file) | `stages/verify.md` | the finding, the code, the brief |
| Judge | `stages/judge.md`, which points at `.claude/skills/review/references/WALKER.md` for the triage it replaces | `RULING_RULE` (FA:160-163) |
| Fixer | `.claude/skills/review/references/REVIEW_ITEM_FIXER.md` and `.claude/skills/code-style/references/STYLE_IMPLEMENTOR.md` | judge's instructions |

**The one change to the skills.** Each persona above gains a short section, "When a workflow embeds you", owned by its skill: skip the Workspace and Output sections, call no helper scripts, read the bundle and rule files your prompt lists instead of a pre-baked bundle, and return findings in the caller's schema. Everything else in the persona (what to look for, scope discipline, severity, the "findings scope is the diff, context scope is broader" rule) applies unchanged. So an edit to any persona, the router or a bundle list reaches the next build with no workflow edit (R2).

Granularity is identical: Claude runs one agent per file per reviewer; Codex runs one `codex exec` per file per reviewer, concurrently through `run-stage.sh` (R6).

### 8.7 Path rules for Codex, pointers for Claude

- `tim backlog rules` reads every `.claude/rules/*.md` in the workspace and in any ancestor directory of the file that has one (so `tim/.claude/rules/*.md` apply to tim files), parses the `paths:` front matter, matches with a real glob library, and extracts every `docs/best-practices/...` path the rule body names (topic directory plus key files). It also lists ancestor `CLAUDE.md` and `AGENTS.md` files, and the files a `CLAUDE.md` imports with `@`. Nothing is hardcoded, so a new rule file is picked up at once (rules probe, conclusion 4).
- The plan stage resolves context for **planned** files (so a planner that will create a new `.njk` gets `gds.md` before it writes). The review stages resolve it for **changed** files.
- Claude also gets the harness's native loading; its profile tells it to follow the pointers and read a sibling first. Codex gets the same list and nothing else. Both report `rulesRead[]`, and the consistency reviewer flags a changed file whose rule files were not read (the "ladder should check" point in rules probe conclusion 2).

### 8.8 What replaces session-level hooks

Per-tool-call hooks fire in agents and stay quiet because of the GUARD RAILS constant (R4). What the session-level hooks did becomes explicit:

| Session hook | Replacement |
|---|---|
| Repo `Stop` hook running `sonar analyze agentic` | Not run by agents (`sonar` is not allowlisted, needs `cd`, and rule analysis is unavailable; memory `reference_sonar_analyze_unavailable`). The CI stage treats the SonarCloud check as required; `state.sonarLocal: "not-run"` is recorded and printed in report section 11 so nobody assumes it ran |
| `UserPromptSubmit` secrets scan | Stage 16: `tim backlog secrets --staged` on every touched repo, for both executors; distiller characterisation redacts credential-shaped values and `tim backlog check` refuses any in the backlog |
| `SessionStart` context | The resolver stage and the brief carry everything; no agent relies on session context |
| Codex's own commands, which no Claude hook sees | The post-Codex HEAD and remote-ref proof (7.8) and the Codex profile's rails |

### 8.9 Stage role binding table

| Stage role | Claude-only | Codex mode (default) | Why |
|---|---|---|---|
| resolve, next, bindings, brief, context, record | watcher | watcher | thin, mechanical |
| ticket, branch, baseline, land, PR, CI watch, merge | watcher | watcher | lifecycle and push safety stay with the proven Claude path |
| sync | doer | Codex | merges can be large; conflicts are never resolved by either |
| plan | think | Codex (high reasoning) | heaviest thinking stage (R6) |
| implement | doer | Codex | |
| style and code review, per file | doer | Codex, one exec per file | same granularity (R6) |
| consistency review | think | Codex | |
| acceptance check | think | Codex | |
| verify findings, per file | doer | Codex, one exec per file | |
| judge | think | think (knob: Codex) | adjudication; Sam flag S4 |
| fix | doer | Codex | |
| ladder (non-browser rungs) | doer | Codex | |
| ladder (browser rungs), local E2E | doer | doer | Codex sandbox cannot run Chromium |
| CI fixer | doer | Codex | token-heavy (C §3) |
| distil: characterise, author, verify | doer, think, think | Codex | when bound for a distil run |
| distil: reconcile, panel, dedupe, combine, critic, claims | think | think (knob) | cross-cutting judgement stays in one strong agent |
| report | `tim` (no model) | `tim` | deterministic |

In Codex mode, Claude runs only watcher agents plus the judge: for an increment with eight reviewed files, about 12 watcher agents and one Opus agent, against about 30 agents today in Claude mode.

### 8.10 Switching is a sentence

The implementor skill maps what Sam says to one writer call, then launches or lets the running drain pick it up:

| Sam says | The skill runs |
|---|---|
| "Build inc-012 to inc-020 with Codex" | `tim backlog run bind <p> --ids inc-012..inc-020 --executor codex` then launches with `cadence: drain` |
| "Codex for the rest" | `tim backlog run bind <p> --rest --executor codex` (from the next buildable increment on) |
| "Back to Claude from inc-031" | `tim backlog run bind <p> --from inc-031 --executor claude` |
| "Codex, but keep planning on Claude" | `tim backlog run bind <p> --rest --executor codex` then `--rest --executor claude --roles plan` |
| "Build the next one and stop" | launch with `cadence: one` |

The build workflow re-reads bindings at every iteration, so a change made while a drain runs takes effect at the next increment. `backlog.json` is never touched, which is R5's test.

### 8.11 The parity proof

Before this is called done (R6), in increment inc-014 of section 11:

1. **Pick** two increments from a real migrated backlog of the same class and size (`size.class` equal, same repo set, acceptance counts within two of each other). If only one is available, build the same increment twice from the same base on two local branches (`.../parity-claude-<slug>`, `.../parity-codex-<slug>`) under `local` lifecycle.
2. **Build** one with `run.json` default Claude and one bound to Codex.
3. **Measure** from `journal.jsonl` and `state.json`, and write `runs/parity-proof.json`:
   - review granularity: reviewer runs per changed file per persona (must be equal: 2 per file plus 1 consistency plus 1 acceptance);
   - persona and rule coverage: `bundlesRead` and `rulesRead` against the context list (must be 100% for both);
   - findings raised, surviving refutation, and ruled fix-now, by severity;
   - judge rulings and deferrals;
   - ladder rungs green, invariants proved, acceptance criteria `met`;
   - plan decisions recorded and evidence checks run.
4. **Cross-check**: each executor's confirmed Critical and Major findings are replayed through a Claude verifier against the **other** build. Any real defect that one executor missed is listed.
5. **Pass** when granularity and coverage are equal, both builds' acceptance checks are all `met`, both ladders are green, and the cross-check finds no Critical or Major defect missed by one side only. Otherwise the gap becomes a discovered atom against the Codex profile or brief, and the proof reruns.
6. **Report** the result in report section 11 of this programme.

---

## 9. Decisions

### 9.1 Every open question

"To reverse" gives the cost in files and commands, never time.

| Q | Decision | Rationale | Reversible? To reverse |
|---|---|---|---|
| Q1 Canonical store | Neutral atoms (`requirements[]`) in the programme's `backlog.json`, authored as `requirements/*.json`. journey-spec and OpenSpec are optional projections; atoms cite OpenSpec ids in `specRefs` | One store means one lint, one gate, one report (D §9) | Yes: add a projection exporter command, one tim module and its test |
| Q2 Location | `workareas/shared/<programme>/`, tracked; registry `tools/backlog/registry.json`; CLAUDE.md rule 3 reworded to name the tracked set | Neutral home for cross-repo sets; reviewable; no product repo worktree (EUDPA-409 spec split, D §6.2) | Yes: change one registry entry's `workarea` |
| Q3 Schema base | Generalise parity's zod schema and writer into `tim/src/backlog/`; `parity-v1` is a profile | Tested, stable ids, ruling-safe (G2) | Partly: `git mv` the modules back and restore imports |
| Q4 Status placement | Five statuses plus `doneBy` on the row; every phase and red in `state.json` | Diff stays a review surface; R5; one buildability rule | Yes: one `migrate` flag folds state into rows |
| Q5 `gate` split | `needs[]` before build, `checkpoint` after; no `gate` in v2 | One meaning per field (C §5.3) | Yes: one profile edit and a `migrate` run |
| Q6 What replaces `type`/`kind` | Atoms carry requirement `kind`; increments carry change `class` (branch prefix); the plan chooses the route and any repo recipe (for example `frontend-change`) | The route is how, not what | Yes: one profile vocabulary edit |
| Q7 Exemplars | `consistentWith{ref, relation, divergence}` is requirement-grade; no file lists; reviewers never judge conformance to it | FA's `reference[]` lesson (A §5) | Yes: one optional slot added to the profile |
| Q8 Size | `size{class, basis}` from requirement proxies; never gates building; combine ceiling is header data (12 criteria, 3 repos, 1 new surface) | s17's 1,076-line plan (A §8); F P14 | Yes: edit `combination.ceiling` |
| Q9 Atoms after combining | Kept as `requirements[]`; increments hold `members` | Re-splittable (plant-products pp-044, pp-051) | Yes |
| Q10 Target data model | A `spike` or `capability` atom the implementor owns; "a data model" is listed under "what is not a requirement" in the contract | The IUU Model phase leaked a class into acceptance (F §4.2) | Yes: add a distil phase to the profile table |
| Q11 Tests-repo and E2E | Part of every increment's definition of done: the tests repo is in `surface.repos` when user-visible behaviour changes; lockstep atoms combine; separate atoms only when the requirement is test infrastructure | "Every add-page needed a tests-repo edit and none carried it" (D §6.5) | Yes |
| Q12 Panel trigger and authority | Runs only when a conflict survives precedence; may rule what sources, precedence and standing rulings settle; must escalate the categories in 5.4 as must-answer questions | Cost against value; memory "a question is not a ruling" | Yes: threshold and categories are profile data. **Flag S2** |
| Q13 When combining runs | Automatically before any build over the full atom set, applied and reported; re-run after any ruling that changes atoms; mid-build only regroups `todo` | Make the call, flag it after; re-derivable | Yes: `run set combine propose` stops auto-apply. **Flag S7** |
| Q14 Cross-repo lockstep | Combine, within the ceiling and the attributability rule | One branch name across repos anyway | Yes: drop rule `cr-same-repo-set`'s lockstep clause |
| Q15 Source types | `transcript`, `chat`, `email` types with `speaker@timestamp` or `msg:n` provenance and four utterance classes; `stated` only for an authority's decision; Jira adapter reuses `tools/jira/*` as `prepare-refinement.sh` does | F P4 | Yes: one source-type file each |
| Q16 Confidence enum | `observed`, `stated`, `legacy`, `inferred`, `gap` | F §7 | Yes: profile enum |
| Q17 Migration | Freeze as history, readable as sources: parity corpora (v1, readers unchanged), EUDPA-409, FA `stages.json`, trace backlogs. Bring DR1-U's data onto main and register it. Migrate plants snagging mechanically. DR1-U's unbuilt rows need a ruling | G5 §10 lean; tim CI parses EUDPA-328 | Yes: `tim backlog migrate` any frozen backlog later. **Flag S3** |
| Q18 journey-builder's future | `git mv` to `backlog-distiller`; DIGEST and rule mode refactored in place; BUILD mode and its scripts retired; `spec-*` scripts frozen for EUDPA-409 only | One distiller, history kept | Partly: restore retired scripts from git |
| Q19 Cadence | Drain inside one Workflow, re-derive after each increment; `cadence: one` knob; no reliance on nested workflows | FA proved the drain; bindings re-read per iteration give per-increment switching | Yes: move the per-increment body into a child file |
| Q20 Plan persistence | `plans/<id>.md` tracked; the script writes the path into state; re-plan only when pinned blobs changed | Survives a red and a resume (A §4) | Yes |
| Q21 Codex's reach | In Codex mode every heavy stage defaults to Codex, including plan; the same fan-out; binding table per stage role; judge stays Opus by default | R6 | Yes: one `run bind --roles` call. **Flag S4** |
| Q22 Codex permissions | Wrap in `tools/codex/run-stage.sh`; no new allow rules; `gh` only through `tools/github*` scripts | Allowlist never grows; agents cannot edit settings (H §2.3) | Yes: Sam adds allow rules by hand |
| Q23 Codex as orchestrator | Supported as a handover variant the skill prints; not a workflow mode | H §4.2 | Yes |
| Q24 Branch strategy | `delivery.branchStrategy` in the header; default `programme` for distilled programmes; `per-increment` only with ticketing; one ticket per combined increment carrying its members' acceptance | Memory `feedback_stack_programme_on_one_branch` | Yes: one `rule` changing `delivery`. **Flag S1** |
| Q25 Merge default | `never` with draft PRs; `on-green` refused without a named ruling; `on-approval` allowed | Memory `feedback_never_auto_merge_wait_for_sam` | Yes |
| Q26 Red-work preservation | Pushed `wip` commit for per-increment and programme; path-scoped stash for local | Survives the machine (FA:1007); local never pushes | Yes |
| Q27 Acceptance verification | A separate acceptance check reads the backlog's criteria, independent of the plan; the consistency reviewer still runs the plan's invariants | A plan can prove the wrong thing | Yes: `run set acceptanceCheck false` |
| Q28 Programme knowledge | Repo-owned docs and skills (for example `frontend-change` recipes), listed in `repos.<key>.knowledge`, read by the planner; never in generic prompts | B §8 | Yes |
| Q29 Optional phases | Sync always on programme branches and when behind base; local E2E `auto`; workspace-PR E2E only when `run.json` names one; report always re-rendered | FA lessons | Yes: `run.json` knobs |
| Q30 Discovered work | `discovered[]` in implement, judge, fix and CI-fix outputs; the script writes each through `tim backlog discover`; new atoms join the next combine; `DEFERRED:` remains a safety-net grep only | One channel instead of three (C §2.6) | Yes |
| Q31 Systemic halt | Three consecutive increments that did not land halt the drain | journey-builder BUILD mode | Yes: `run set systemicHaltAfter` |
| Q32 Renderer | Generalise `tim parity` render into `tim backlog report` with a profile-driven, N-source card; parity renders through it | One renderer, tested | Partly: split the card module |
| Q33 One ledger or two | One: `questions[]` and `decisions[]` in the backlog serve distillation and build | A judge's deferral and a distillation question are the same kind of record | Yes |
| Q33a Ruling record shape | Section 3.6: chosen option, answer, verbatim words, note, `decidedBy`, `decidedAt`, sealed evidence, `appliesTo`, `constraints`, `revisitWhen`, `effects`, supersession; one "awaiting a ruling" definition | G5 §8 | Yes: additive schema fields |
| Q34 Ruling capture | Batch controls and the answer sheet emit `tim backlog rule`; tentative answers are `outstanding`; `rule-decision.sh` kept for v1 only | House direction tim over bash | Yes |
| Q35 Must-answer questions | Security, access control, data integrity, legal and policy questions block the increments that need them; no default is ever taken | Memory `feedback_question_is_not_a_ruling` | Yes: profile category list |
| Q36 Visual evidence | Design sources are characterised with crops as units; question cards show them; screenshots of running systems stay parity's job | `project_eudpa328_decision_visual_evidence` | Yes |
| Q37 Build report | The same page: build status section fed by `state.json`; a render failure is recorded state | One surface | Yes |
| Q38 Report verification | `CLAIM_VERIFIER.md` by path over machine-written prose between ledger fingerprints | G1 §1.7 | Yes: drop phase `claims` |
| Q39 Port branch fixes | Yes, first: snagging `5271d04a` (local lifecycle, trailer) and FA's helpers and workflow; DR1-U data by path; never merge the triage-view loop | Memory `feedback_check_live_branch_before_following_handover` | No, but cheap: revert the port commits |
| Q40 Shared rails | One workflow file, so one GUARD RAILS constant; Claude-only facts in `executors/claude.md`; Codex rails in `executors/codex.md` | Imports are unsupported (G4 §2.2) | Yes: splitting the file duplicates one constant. **Flag S6** |
| Q41 Docs and skill-creator | Fix in this programme's last increment: routing table, workflows README, `docs/agent-skills.md` Glob advice, skill-creator settings edits | The new skills are audited against them | Yes |

### 9.2 The seven that need Sam's ruling

**S1. Should distilled programmes build on one programme branch by default?**
- **In play:** `delivery.branchStrategy` for every new programme; whether each increment gets a Jira ticket and its own PR.
- **Options:** A, one programme branch and one draft PR per repo (your 15 September rule; alignment ran 24 stages this way). B, a branch, ticket and PR per increment (EUDPA-409 and DR1-U ran 175 increments this way). C, ask per programme at setup.
- **If nobody answers:** A. The distiller sets `programme` and merge `never`; a programme can switch with one ruling.

**S2. What may the judges panel rule without you?**
- **In play:** conflicts precedence cannot settle; how many questions reach you.
- **Options:** A, the panel rules everything except security, access control, data integrity, legal or policy, scope changes, anything contradicting your rulings, and calls whose reversal touches built work (EUDPA-409: 83 panel rulings, 0 escalations). B, everything goes to you (the CHED runs: 596 questions). C, A plus a cap: at most N panel rulings per run before it stops and asks.
- **If nobody answers:** A. Every panel ruling is listed in report section 2 with "To reverse:".

**S3. Should DR1-U's 43 unbuilt rows be built by the new implementor?**
- **In play:** 34 blocked, 3 deferred, 5 dropped and 1 rejected rows on `origin/feat/parity-report-triage-view`, owned with three teammates.
- **Options:** A, migrate the data, register it, and build what is buildable. B, bring the data onto main and freeze it as history. C, re-distil it with the parity corpora as sources.
- **If nobody answers:** B. The data comes onto main and nothing is built from it. (This is increment `dr1u-remainder` in section 11, born blocked.)

**S4. In Codex mode, should the judge also run on Codex?**
- **In play:** the fix-now, defer or reject calls for every increment.
- **Options:** A, judge stays on Opus (one Opus agent per increment). B, judge on Codex too (no Opus at all in Codex mode).
- **If nobody answers:** A, and the parity proof measures both.

**S5. Should the build commit its state files to the workspace branch after each increment?**
- **In play:** `backlog.json`, `state.json`, `journal.jsonl`, `plans/`, `report/` on the workspace repo.
- **Options:** A, commit and push by name after each increment (FA did; state survives a dead session). B, commit only, never push. C, leave them for you.
- **If nobody answers:** A for programmes on a programme branch, B otherwise.

**S6. Should distil and build share one workflow file?**
- **In play:** `.claude/workflows/backlog.js` with two modes, against two files.
- **Options:** A, one file (one rails constant, one Codex adapter, one schema block). B, two files (a syntax error in one cannot stop the other; two copies of the rails).
- **If nobody answers:** A, with a tim contract test that parses the file.

**S7. Should the combine pass be applied automatically?**
- **In play:** how 60 or so atoms become 15 or 20 increments.
- **Options:** A, apply and report, with "considered and left alone" and "To reverse:" (make the call, flag it after). B, propose only, as EUDPA-409 did, until you rule.
- **If nobody answers:** A.

---

## 10. Retire and migrate

| Asset | Fate | How |
|---|---|---|
| `.claude/workflows/increment-build-loop.js` | Evolves | `git mv` to `.claude/workflows/backlog.js`; FA's stages merged in; FALLBACK, run copy and recipe reads removed (R1 to R8 of synthesis §5.1) |
| `frontend-alignment.js` (branch) | Absorbed | Ported to main first (history), then its stages are merged into `backlog.js` and the file is removed; programme specifics (s13, port 3002, PR #47, `alignment` scope) become `run.json` or header data |
| `.claude/workflows/codex/{implement,review,fix}.md` | Evolve | `git mv` to `.claude/workflows/stages/`; the "your shell is normal" preamble moves into `executors/codex.md`; recipe clauses ("filesToTouch IS the script", scope fence) removed |
| `codex/schemas/*` | Retired | Replaced by `STAGE_SCHEMAS` and the extractor |
| `.claude/workflows/README.md` | Rewritten | Describes `backlog.js`, both modes, args, stages, executors |
| `build-orchestrator` skill | Evolves | `git mv` to `backlog-implementor`; run-copy section, 13-field handover, "Ask for anything the user has not given", `ci-red` hard stop removed |
| `journey-builder` skill | Evolves | `git mv` to `backlog-distiller`; DIGEST becomes the phases; rule mode becomes `tim backlog rule`; BUILD mode and BACKLOG mode removed |
| `SOURCE_EXTRACTOR.md` | Split | Method to `CHARACTERISER.md`; mechanics to `source-types/`; EUDPA-409 instance notes stay in `workareas/journey-builder/EUDPA-409/rules.*.md` |
| `SPEC_RECONCILER.md` | Evolves | Into `RECONCILER.md`, target-neutral |
| `INCREMENT_PLANNER.md`, `MODEL_EXTENDER.md` | Retired | The plan stage owns planning; model extension is a `spike` atom |
| `tools/journey-builder/` `backlog-generate.sh`, `backlog-plan-increment.sh`, `backlog-*-extra.sh`, `next-increment.sh`, `backlog-set-status.sh`, `backlog-counts.sh`, `commit-increment.sh`, `rollback-increment.sh` (`git clean -fd`), `verify-increment.sh` | Retired | `git rm`; replaced by `tim backlog` |
| `tools/journey-builder/spec-*.sh`, `extract-*.sh`, `prepare-digest.sh`, `targets.json`, `target-profile.sh` | Frozen | Kept only so EUDPA-409's spec stays editable; not advertised; `targets.json` ladder data copied into each migrated header's `repos.<key>.ladder` |
| `tools/parity/corpora.json` | Moves | `git mv` to `tools/backlog/registry.json` |
| `tools/parity/phase.sh` | Retired | `tim backlog phase`; parity's table becomes the `parity-v1` profile's phase data; existing `pipeline.json` ledgers imported once |
| `tools/parity/{next-decision,decision-counts,rule-decision}.sh` | Frozen for v1 | Work for frozen parity corpora; the parity skill points new rulings at `tim backlog rule` |
| `workareas/shared/dr1c-parity/author-workflow.js` | Absorbed | Its author, verify and pipeline shape become `backlog.js` distil mode; the file stays as DR1C's record |
| `trace-to-requirements.workflow.js` | Absorbed | Verify rules, confidence tags and critic move into personas; the file stays as the trace runs' record |
| EUDPA-409 backlog and spec | Frozen | History; readable as an `existing-backlog` source |
| Trace backlogs (IUU, CHED-P, CHED-PP, CHED-D) | Frozen | Re-distil from their spec and conflicts when a programme restarts (the 16 etag blocks collapse into one question) |
| FA `stages.json`, `report.md`, `plans/` | Ported and frozen | Come onto main with the port; history |
| DR1-U backlog and notes | Ported | Cherry-picked by path from `origin/feat/parity-report-triage-view` (never the branch's loop); registered; remainder per S3 |
| Plants snagging backlog | Migrated | `tim backlog migrate` into v2; `snag-003`'s 26 `filesToTouch` go to `plans/legacy/snag-003.md` as a non-binding note |
| `CLAUDE.md` routing table | Updated | Add `backlog-distiller` and `backlog-implementor`; remove the stray blank line before `parity`; remove the dead journey-builder and build-orchestrator references |
| `docs/reference/worker-references.md` | Updated | New distiller personas; embedded-mode note on review and code-style personas |
| `docs/agent-skills.md`, skill-creator | Fixed | Remove Glob advice; stop skill-creator writing to `settings.json` (H §7.3) |
| `.gitignore` | Updated | Remove batch-orchestrator entries (`:115-119`); add `workareas/shared/*/runs/`, `workareas/shared/*/sources/*/raw.*` |
| Memory notes that encode the old model (`reference_workflow_name_uses_stale_snapshot` "args never reaches", `feedback_backlogs_are_json_state_not_docs` status list) | Flag to Sam | Agents cannot edit memory on Sam's behalf without his go; the completion report lists them |

---

## 11. Build backlog for this programme

Written in this design's own v2 schema, as it would stand after pass 2 and before ingest. The atoms were authored at design time; a verifier pass is owed before `tim backlog ingest` accepts them (principle 3), so `verifiedBy` is null and the first real distil canary (inc-018) verifies them. Order: port proven assets first; prove the runtime; build the writer and prove parity untouched; then the build path with a Claude canary and the Codex parity proof; then the distiller and its report; then migration and retirement. Nothing is built on an unproven base.

```json
{
  "schemaVersion": 2,
  "programme": "requirements-pipeline",
  "profile": "requirements-v2",
  "title": "Requirements distiller and backlog implementor",
  "purpose": "Sam needs loose requirements from many sources turned into a requirement-only backlog, and that backlog built to the same standard by Claude or Codex, switchable in one sentence. This programme joins the workspace's existing distillers, writer, build loops and report into one pipeline.",
  "sources": [
    { "id": "sam-req", "kind": "docx", "role": "requirement", "tier": 1, "ref": "analysis/sam-requirements.md", "version": "2026-09-18", "status": "characterised" },
    { "id": "rules-probe", "kind": "trace-corpus", "role": "current-behaviour", "tier": 1, "ref": "analysis/rules-probe.md", "version": "wf_5d04c5ce-856", "status": "characterised" },
    { "id": "synthesis", "kind": "docx", "role": "requirement", "tier": 2, "ref": "analysis/00-synthesis.md", "version": "2026-09-18", "status": "characterised" },
    { "id": "analyses", "kind": "docx", "role": "current-behaviour", "tier": 2, "ref": "analysis/{a..h}-*.md, gap-{1..5}.md", "version": "2026-09-18", "status": "characterised" }
  ],
  "precedence": [ { "factKind": "scope", "order": ["sam-req", "synthesis", "analyses"] }, { "factKind": "intent", "order": ["sam-req", "rules-probe", "synthesis"] } ],
  "invariants": [
    { "id": "inv-no-recipe", "text": "No backlog written by this pipeline carries files, commands, line numbers, test files or skill names as requirements.", "why": "R1", "sources": ["sam-req"], "decision": null },
    { "id": "inv-executor-neutral", "text": "The same backlog builds under either executor with no edit.", "why": "R5", "sources": ["sam-req"], "decision": null },
    { "id": "inv-parity-untouched", "text": "Every existing tim parity command and test keeps its behaviour.", "why": "tim CI parses the tracked EUDPA-328 backlog", "sources": ["analyses"], "decision": null },
    { "id": "inv-one-writer", "text": "Canonical JSON changes only through tim backlog.", "why": "State corruption in stages.json", "sources": ["synthesis"], "decision": null },
    { "id": "inv-live-personas", "text": "Review and code-style personas, routing and bundles are read by path at run time, never copied.", "why": "R2", "sources": ["sam-req"], "decision": null }
  ],
  "direction": "Evolve an existing asset before creating a new one; every new file names why no existing file could take the job.",
  "scope": {
    "in": ["distiller skill", "backlog v2 and its writer", "implementor skill", "one build and distil workflow", "Codex executor at parity", "generated report"],
    "out": [
      { "id": "out-parity-v2", "text": "Moving parity COMPARE onto the v2 schema", "why": "Parity corpora are frozen finding stores; a later programme", "decision": null, "sources": ["analyses"] },
      { "id": "out-cdp", "text": "Any change to CDP platform repositories", "why": "Memory: no AI writes to cdp-app-config", "decision": null, "sources": ["analyses"] }
    ]
  },
  "deviations": [],
  "milestones": [
    { "id": "m0", "name": "Proven base", "goal": "Branch fixes on main, runtime facts recorded, writer generalised with parity untouched", "checkpoint": null },
    { "id": "m1", "name": "Build path", "goal": "A real increment built by the new workflow under each executor, with the parity proof passed", "checkpoint": "walkthrough" },
    { "id": "m2", "name": "Distil path", "goal": "A real source set distilled into a report Sam rules from", "checkpoint": "walkthrough" },
    { "id": "m3", "name": "One pipeline", "goal": "Old paths retired, live backlogs migrated, routing correct", "checkpoint": null }
  ],
  "repos": {
    "workspace": { "path": ".", "github": "DEFRA/trade-imports-workspace", "role": "provider", "ladder": [], "knowledge": ["CLAUDE.md", "docs/agent-skills.md", "docs/best-practices/skills/patterns.md"] },
    "tim": { "path": "tim", "github": "DEFRA/trade-imports-workspace", "role": "provider", "ladder": ["lint", "test", "format:check"], "knowledge": ["tim/CLAUDE.md", "tim/README.md"] }
  },
  "delivery": { "branchStrategy": "programme", "branch": "chore/NO_JIRA-requirements-pipeline", "base": "main", "ticketing": null, "merge": { "policy": "never", "decision": null, "order": [] }, "draftPrs": true },
  "combination": {
    "rules": [
      { "id": "cr-same-surface", "text": "Members share one surface (a command group, a workflow mode, a skill)" },
      { "id": "cr-proves-another", "text": "An atom that only proves or documents another merges into it" },
      { "id": "cr-attributability", "text": "Never combine where a red in one member would be misattributed" },
      { "id": "cr-no-need-boundary", "text": "Never combine an atom with an open need with one that has none" },
      { "id": "cr-no-checkpoint-boundary", "text": "Never cross a milestone" }
    ],
    "ceiling": { "acceptance": 12, "repos": 3, "newSurfaces": 1 },
    "declined": [
      { "members": ["writer--state-and-run", "writer--rulings-ledger"], "rule": "cr-attributability", "why": "A red in rule effects would stall run-state work the build path needs first." },
      { "members": ["build--unified-workflow", "build--lifecycle-profiles"], "rule": "cr-attributability", "why": "The canary must prove the core stages before lifecycle variants multiply the paths." },
      { "members": ["distil--reconcile-panel", "distil--pass-two-combine"], "rule": "cr-same-surface", "why": "Different phases with different personas; one reviewable change each." }
    ]
  },
  "conflicts": [
    { "id": "c-001", "topic": "Whether workflow args arrive", "sources": ["synthesis", "analyses"], "detail": "The loop and README say args are unreliable; gap-4 traces that to one stringified-args failure on 2.1.224.", "provisional": "Args-only config, string-tolerant, throw on missing keys; prove with a canary.", "resolution": "precedence", "decision": null, "question": null, "affects": ["req-005"] }
  ],
  "assumptions": [
    { "id": "as-branch-strategy", "text": "Distilled programmes default to one programme branch.", "default": "programme", "confidence": "stated", "reviseIf": "Sam rules S1 otherwise", "decision": null },
    { "id": "as-judge-on-opus", "text": "In Codex mode the judge stays on Opus.", "default": "claude", "confidence": "inferred", "reviseIf": "Sam rules S4 otherwise", "decision": null },
    { "id": "as-combine-auto", "text": "Pass 2 is applied automatically and reported.", "default": "apply", "confidence": "stated", "reviseIf": "Sam rules S7 otherwise", "decision": null }
  ],
  "questions": [
    {
      "id": "q-dr1u-remainder",
      "headline": "Should DR1-U's 43 unbuilt rows be built by the new implementor?",
      "question": "Once DR1-U's data is on main, should its remaining rows be migrated and built, frozen, or re-distilled?",
      "inPlay": "34 blocked, 3 deferred, 5 dropped and 1 rejected rows owned with three teammates.",
      "options": [
        { "id": "A", "text": "Migrate and build what is buildable.", "sources": ["analyses"], "count": 1, "effects": [ { "op": "adopt", "target": "migrate--dr1u-remainder-buildable" } ] },
        { "id": "B", "text": "Freeze as history.", "sources": ["analyses"], "count": 1, "effects": [ { "op": "park", "target": "migrate--dr1u-remainder-buildable" } ] },
        { "id": "C", "text": "Re-distil with the parity corpora as sources.", "sources": ["synthesis"], "count": 1, "effects": [ { "op": "park", "target": "migrate--dr1u-remainder-buildable" } ] }
      ],
      "recommended": "B",
      "ifNobodyAnswers": "The data is on main and nothing is built from it. One increment stays blocked.",
      "category": "scope", "mustAnswer": false, "audience": "sam", "cluster": "migration",
      "raisedBy": { "phase": "design", "agent": "reuse-candidate", "runId": null },
      "status": "open", "decision": null, "visual": []
    }
  ],
  "decisions": [],
  "requirements": [
    {
      "key": "port--local-lifecycle-and-trailer", "slice": "port", "kind": "capability",
      "statement": "The build workflow on main MUST build an increment under a local lifecycle and MUST take its commit trailer from the launching session.",
      "why": "Local lifecycle is broken on main and the trailer is hardcoded; the fix sits unmerged on the snagging branch.",
      "acceptance": [
        { "id": "ac-1", "text": "A local-lifecycle build of a one-line change lands a commit on its local branch without the base-branch refusal.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "The landed commit's trailer is exactly the one the launcher passed.", "witness": "observation", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A local-lifecycle run on main that refuses because the repo is on the base branch.",
      "sources": [ { "id": "s1", "source": "synthesis", "ref": "§2.2(7); C §2.2; commit 5271d04a", "quote": "lifecycle: local is broken on main", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "build workflow", "area": "lifecycle", "repos": ["workspace"] },
      "needs": [], "dependsOn": [], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "port--alignment-branch-assets", "slice": "port", "kind": "capability",
      "statement": "The PR, CI-wait and clone helpers, the alignment workflow and its run record MUST be on main with their history.",
      "why": "The unified workflow evolves from them; helpers give honest exit codes instead of raw gh.",
      "acceptance": [
        { "id": "ac-1", "text": "Waiting on a PR whose checks never resolve reports unresolved, never green.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "Asking for a draft PR on a branch whose only PR is merged reports that, and creates nothing.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "The alignment workflow's commit history is visible on main.", "witness": "review", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A CI wait that exits 0 on a timed-out check.",
      "sources": [ { "id": "s1", "source": "synthesis", "ref": "§6.2 item 24; §8 item 11", "quote": "Port the unmerged fixes first", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "tools", "area": "github", "repos": ["workspace"] },
      "needs": [], "dependsOn": [], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "port--dr1u-data", "slice": "port", "kind": "data",
      "statement": "DR1-U's backlog, notes and union workflow MUST be on main without the triage-view branch's build-loop changes.",
      "why": "It is the only proven parity-to-build programme and it is stranded on a branch that would regress the loop.",
      "acceptance": [
        { "id": "ac-1", "text": "The DR1-U backlog on main holds 161 rows, 118 of them done, with every ruling it had on the branch.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "The build workflow on main is byte-identical before and after the port.", "witness": "observation", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "Any line of the build loop on main changed by the port.",
      "sources": [ { "id": "s1", "source": "analyses", "ref": "gap-5 §8, §10", "quote": "cherry-pick the workareas/shared/dr1-parity-union/ ... paths only", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "workareas", "area": "dr1u", "repos": ["workspace"] },
      "needs": [], "dependsOn": [], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "runtime--args-and-children", "slice": "runtime", "kind": "spike",
      "statement": "How the current Workflow runtime delivers args, and whether it runs a zero-agent child and re-reads a child between calls, MUST be recorded against the Claude Code version.",
      "why": "The build workflow drops FALLBACK and relies on args alone; the nested-workflow option depends on the child facts.",
      "acceptance": [
        { "id": "ac-1", "text": "A record states, for an object, a JSON string and no args, what type the script received.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "The record states whether a zero-agent child can return data and whether an edited child is re-read on the next call.", "witness": "observation", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A launch whose recorded type differs from what the script logged.",
      "sources": [ { "id": "s1", "source": "analyses", "ref": "gap-4 §5", "quote": "One zero-agent Workflow ... Launch it three ways", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "build workflow", "area": "runtime", "repos": ["workspace"] },
      "needs": [], "dependsOn": [], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "writer--parity-moves-intact", "slice": "writer", "kind": "capability",
      "statement": "A generic tim backlog command group MUST exist, built from the parity writer, while every tim parity command keeps its behaviour.",
      "why": "The tested writer, ids, ruling protection and renderer already exist; generalising them is the smallest route.",
      "acceptance": [
        { "id": "ac-1", "text": "Every existing tim test passes with no fixture changed.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "The EUDPA-328 report renders the same page as before, apart from its stamp.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "A parity corpus can be addressed through the programme registry, with no path built from its run id.", "witness": "unit", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A tim parity command whose output changes for an unchanged corpus.",
      "sources": [ { "id": "s1", "source": "analyses", "ref": "gap-2 §4; gap-5 §6", "quote": "Base the one writer on tim parity ingest", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "tim", "area": "backlog", "repos": ["tim", "workspace"] },
      "needs": [], "dependsOn": [], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "writer--schema-v2-two-pass", "slice": "writer", "kind": "capability",
      "statement": "A v2 backlog MUST be assembled from one file per atom and one file per group, with ids that never move.",
      "why": "Two-pass distillation must survive re-combining after every ruling (R1).",
      "acceptance": [
        { "id": "ac-1", "text": "Adding an atom and re-ingesting keeps every existing requirement and increment id.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "A group naming an unknown key is refused, naming the file and the key.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "A dependency cycle is refused, naming every key in it.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-4", "text": "The check fails unless every adopted atom belongs to exactly one increment.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-5", "text": "An unverified atom, or one whose author and verifier are the same, is refused at ingest.", "witness": "unit", "confidence": "stated", "sources": ["s2"] },
        { "id": "ac-6", "text": "Regrouping an increment that has started is refused, naming it.", "witness": "unit", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "An ingest that renumbers any existing id.",
      "sources": [
        { "id": "s1", "source": "analyses", "ref": "gap-2 §2.2", "quote": "Per-atom files plus an ingest keyed on source identity", "confidence": "stated", "role": "requirement" },
        { "id": "s2", "source": "analyses", "ref": "gap-1 §2 item 6", "quote": "record authoredBy and verifiedBy ... and refuse equality", "confidence": "stated", "role": "requirement" }
      ],
      "surface": { "service": "tim", "area": "backlog", "repos": ["tim"] },
      "needs": [], "dependsOn": ["writer--parity-moves-intact"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "writer--lint", "slice": "writer", "kind": "rule",
      "statement": "The backlog check MUST flag recipe-shaped acceptance and refuse credential-shaped strings.",
      "why": "Keeps the backlog a requirement (inv-no-recipe) and readable past the sonar Read hook.",
      "acceptance": [
        { "id": "ac-1", "text": "An acceptance criterion naming a source file, a function call or a shell command is reported with the atom and criterion.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "A string shaped like a token or password is refused at write time.", "witness": "unit", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A backlog containing a file path in an acceptance criterion that the check passes.",
      "sources": [ { "id": "s1", "source": "synthesis", "ref": "§5.3; §7.2 item 7", "quote": "An AC must not name files, functions ...", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "tim", "area": "backlog", "repos": ["tim"] },
      "needs": [], "dependsOn": ["writer--schema-v2-two-pass"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "writer--state-and-run", "slice": "writer", "kind": "capability",
      "statement": "Run state and run configuration MUST change only through validated commands that cannot lose an update.",
      "why": "Agent edits corrupted stages.json and lost commit SHAs.",
      "acceptance": [
        { "id": "ac-1", "text": "Two writes made against the same expected version: one succeeds, the other reports a lost update and changes nothing.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "A write naming an unknown increment or field is refused.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "An increment in a red state is not offered as next until a retry is recorded.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-4", "text": "Binding a range of increments to Codex changes run configuration and leaves the backlog byte-identical.", "witness": "unit", "confidence": "stated", "sources": ["s2"] }
      ],
      "falsifiedBy": "Two concurrent writers whose results both survive only partly.",
      "sources": [
        { "id": "s1", "source": "synthesis", "ref": "§4.6; §7.5", "quote": "Prompt rules do not protect state", "confidence": "stated", "role": "requirement" },
        { "id": "s2", "source": "sam-req", "ref": "R5", "quote": "Switching executor part-way through a backlog must need no backlog edit", "confidence": "stated", "role": "requirement" }
      ],
      "surface": { "service": "tim", "area": "backlog", "repos": ["tim"] },
      "needs": [], "dependsOn": ["writer--schema-v2-two-pass"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "writer--next-single-rule", "slice": "writer", "kind": "rule",
      "statement": "There MUST be one answer to which increment is buildable next.",
      "why": "Three drivers use three incompatible rules today.",
      "acceptance": [
        { "id": "ac-1", "text": "Given increments that are done, blocked by an open question, red, and ready, next returns the first ready one in backlog order.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "When nothing is buildable, next names why: all done, the blocking questions, the reds or the unmet dependencies.", "witness": "unit", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A red or blocked increment returned as next.",
      "sources": [ { "id": "s1", "source": "analyses", "ref": "C §5.1", "quote": "Buildability is derived three different ways", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "tim", "area": "backlog", "repos": ["tim"] },
      "needs": [], "dependsOn": ["writer--state-and-run"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "writer--rulings-ledger", "slice": "writer", "kind": "capability",
      "statement": "A ruling MUST be recorded and applied in one write, with Sam's words kept verbatim.",
      "why": "Three ruling mechanisms cannot read each other; DR1-U rulings were hand edits.",
      "acceptance": [
        { "id": "ac-1", "text": "Ruling a question with an option that adopts an atom unblocks every increment that needed only that question.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "A tentative answer is kept as outstanding and the question stays open.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "A ruling without a note is refused.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-4", "text": "A superseding ruling leaves both in the ledger, the older marked superseded.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-5", "text": "Dropping an increment strips it from its dependants' dependencies and notes it on each.", "witness": "unit", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A ruled question whose blocked increments stay blocked.",
      "sources": [ { "id": "s1", "source": "synthesis", "ref": "§6.1 item 10; Q33a; Q34", "quote": "record and apply in one write", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "tim", "area": "backlog", "repos": ["tim"] },
      "needs": [], "dependsOn": ["writer--state-and-run"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "context--rules-resolution", "slice": "context", "kind": "capability",
      "statement": "For any file, the matching path rules and the best-practice files they point to MUST be listable at run time.",
      "why": "Codex never loads .claude/rules; rules are pointers Claude must follow too (R3).",
      "acceptance": [
        { "id": "ac-1", "text": "A Java file lists the Java rule and every best-practice file it names.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "A Playwright spec lists both the Playwright and the Node rules.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "A tim command file lists the same rules the probe saw load natively.", "witness": "unit", "confidence": "observed", "sources": ["s1"] },
        { "id": "ac-4", "text": "A new rule file with a paths glob is picked up with no code change.", "witness": "unit", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A file whose natively loaded rules differ from the listed ones.",
      "sources": [ { "id": "s1", "source": "rules-probe", "ref": "conclusions 2 to 4", "quote": "Resolve it at run time, not from a hardcoded table", "confidence": "observed", "role": "current-behaviour" } ],
      "surface": { "service": "tim", "area": "backlog", "repos": ["tim"] },
      "needs": [], "dependsOn": ["writer--parity-moves-intact"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "context--personas-embedded", "slice": "context", "kind": "capability",
      "statement": "The review and code-style personas MUST be usable inside a workflow, returning structured findings, with the skills keeping ownership.",
      "why": "R2: skill updates must reach the build automatically.",
      "acceptance": [
        { "id": "ac-1", "text": "Each per-file persona says how it behaves when a workflow embeds it.", "witness": "review", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "A style topic's bundle files can be listed without writing a bundle.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "A wording change to a persona reaches the next build's reviewers with no workflow edit.", "witness": "observation", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A reviewer prompt that contains persona text instead of its path.",
      "sources": [ { "id": "s1", "source": "sam-req", "ref": "R2", "quote": "Reference them by path at run time", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "skills", "area": "review", "repos": ["workspace"] },
      "needs": [], "dependsOn": [], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "executor--shared-briefs", "slice": "executor", "kind": "capability",
      "statement": "Every delegable build stage MUST have one brief and one output schema that both executors use.",
      "why": "R6: one stage contract, two adapters.",
      "acceptance": [
        { "id": "ac-1", "text": "For every delegable stage, the Claude prompt and the Codex prompt name the same brief.", "witness": "review", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "Codex schema files are produced from the workflow's one schema block, and every property in them is required.", "witness": "unit", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "Two different schemas for one stage.",
      "sources": [ { "id": "s1", "source": "sam-req", "ref": "R6", "quote": "One stage contract, two adapters", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "build workflow", "area": "executors", "repos": ["workspace", "tim"] },
      "needs": [], "dependsOn": ["writer--parity-moves-intact"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "executor--codex-runner", "slice": "executor", "kind": "capability",
      "statement": "Codex prompts MUST run concurrently, survive the Bash ceiling by resuming their sessions, and fail loudly when any produces no valid output.",
      "why": "Per-file Codex review needs concurrency; slicing lives in prompt prose that breaks the rails.",
      "acceptance": [
        { "id": "ac-1", "text": "Six prompts run at once when the cap is six, and no more.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "A prompt that outlives one slice continues in the same Codex session on the next call.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "A prompt with no schema-valid output makes the stage red and is named.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-4", "text": "No agent Bash call made while running Codex contains a compound command.", "witness": "review", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A Codex review stage reported clean when one file's run died.",
      "sources": [ { "id": "s1", "source": "analyses", "ref": "H §4.1; B §5.4", "quote": "a committed tools/codex/run-stage.sh that owns slice and resume", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "tools", "area": "codex", "repos": ["workspace"] },
      "needs": [], "dependsOn": [], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "build--unified-workflow", "slice": "build", "kind": "capability",
      "statement": "One workflow MUST build a v2 backlog increment by increment, planning each just in time, reviewing per file with the live personas, and never succeeding silently.",
      "why": "Joins the loop's lifecycle to the alignment workflow's plan stage (R1).",
      "acceptance": [
        { "id": "ac-1", "text": "Every increment has a plan file written before its implementation starts.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "Every changed file that is not a pure move gets one style and one code reviewer.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "A reviewer, judge or fixer that returns nothing turns the increment red with a named status.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-4", "text": "Relaunching after a red resumes from the recorded stage without re-planning unchanged work.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-5", "text": "An increment appended while the drain runs is built in the same run.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-6", "text": "Nothing changes the backlog, state or run files except the writer.", "witness": "review", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-7", "text": "The secrets check runs on every landed diff and its result is recorded.", "witness": "observation", "confidence": "stated", "sources": ["s2"] },
        { "id": "ac-8", "text": "The report states that no local rule analysis ran and SonarCloud on the PR is the check.", "witness": "observation", "confidence": "stated", "sources": ["s2"] }
      ],
      "falsifiedBy": "An increment marked done whose review lost a reviewer.",
      "sources": [
        { "id": "s1", "source": "synthesis", "ref": "§8 items 2 and 8", "quote": "One consolidated build workflow", "confidence": "stated", "role": "requirement" },
        { "id": "s2", "source": "sam-req", "ref": "R4", "quote": "must be an explicit step in the workflow", "confidence": "stated", "role": "requirement" }
      ],
      "surface": { "service": "build workflow", "area": "stages", "repos": ["workspace"] },
      "needs": [], "dependsOn": ["port--local-lifecycle-and-trailer", "port--alignment-branch-assets", "runtime--args-and-children", "writer--next-single-rule", "context--rules-resolution", "context--personas-embedded", "executor--shared-briefs"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "build--lifecycle-profiles", "slice": "build", "kind": "capability",
      "statement": "The build MUST honour the programme's branch strategy and merge policy: per increment, one programme branch, or local; never merging unless a ruling allows it.",
      "why": "Three proven strategies; Sam's standing rule against auto-merge.",
      "acceptance": [
        { "id": "ac-1", "text": "Under a programme strategy every increment commits to one branch per repo and one draft PR per repo is kept.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "Under local nothing is pushed and red work is kept in a stash limited to its own paths.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "A merge-on-green policy with no named ruling is refused before any build starts.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-4", "text": "A platform-blocked red parks its increment and the drain continues with work that does not depend on it.", "witness": "observation", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A merge made under the default policy.",
      "sources": [ { "id": "s1", "source": "synthesis", "ref": "§7.6", "quote": "Merge policy as programme data, default never", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "build workflow", "area": "lifecycle", "repos": ["workspace"] },
      "needs": [], "dependsOn": ["build--unified-workflow"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "build--implementor-skill", "slice": "build", "kind": "capability",
      "statement": "Sam MUST be able to start, switch and resume a build in one sentence, with no backlog edit.",
      "why": "R6: switching is a sentence, not a config edit.",
      "acceptance": [
        { "id": "ac-1", "text": "'Build inc-012 to inc-020 with Codex' binds those increments to Codex and starts the build.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "'Codex for the rest' said during a drain takes effect at the next increment without a relaunch.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "The handover names only the programme, the args and the run id, and a fresh session resumes from it.", "witness": "observation", "confidence": "stated", "sources": ["s2"] }
      ],
      "falsifiedBy": "A switch that needs a file edit.",
      "sources": [
        { "id": "s1", "source": "sam-req", "ref": "R6", "quote": "Switching is a sentence, not a config edit", "confidence": "stated", "role": "requirement" },
        { "id": "s2", "source": "analyses", "ref": "gap-4 §4", "quote": "Shrink to: backlog path, the args object verbatim, and the run id", "confidence": "stated", "role": "requirement" }
      ],
      "surface": { "service": "skills", "area": "implementor", "repos": ["workspace"] },
      "needs": [], "dependsOn": ["build--unified-workflow"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "proof--claude-canary", "slice": "proof", "kind": "spike",
      "statement": "One real, small increment from a migrated backlog MUST be built end to end, Claude only, before anything else is built on the new path.",
      "why": "Canary first: cheaper to reject one than many.",
      "acceptance": [
        { "id": "ac-1", "text": "The canary increment lands through every stage and its report shows it done.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "Sam walks through the canary's plan, review record and report.", "witness": "review", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A canary that needed a hand edit to finish.",
      "sources": [ { "id": "s1", "source": "synthesis", "ref": "§6.1 item 23", "quote": "Canary increment before a fan-out", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "build workflow", "area": "canary", "repos": ["workspace"] },
      "needs": [], "dependsOn": ["build--implementor-skill", "migrate--snagging"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "proof--codex-parity", "slice": "proof", "kind": "spike",
      "statement": "Codex MUST build to the same standard as Claude, proven on comparable increments.",
      "why": "R6: Codex is a full executor, not a lesser fallback.",
      "acceptance": [
        { "id": "ac-1", "text": "Both builds run the same number of reviewers per changed file.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "Both builds read every rule and bundle file listed for their files.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "Both builds meet every acceptance criterion and end with a green ladder.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-4", "text": "Cross-checking finds no critical or major defect that one executor missed.", "witness": "review", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-5", "text": "In Codex mode, Claude runs only watcher agents and the judge.", "witness": "observation", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A Codex build that reviewed fewer files, or missed a defect the Claude build caught.",
      "sources": [ { "id": "s1", "source": "sam-req", "ref": "R6 'Parity proof'", "quote": "run one small increment each way and compare", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "build workflow", "area": "executors", "repos": ["workspace"] },
      "needs": [], "dependsOn": ["proof--claude-canary", "executor--codex-runner"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "report--decision-led", "slice": "report", "kind": "capability",
      "statement": "The report MUST be generated from the backlog and state, lead with what needs Sam's ruling, and offer a batch answer sheet.",
      "why": "Report quality is Sam's first priority; the alignment rewrite showed questions must come first.",
      "acceptance": [
        { "id": "ac-1", "text": "Must-answer questions appear first, then the rest by how many increments each blocks.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "Every question shows its headline, what is in play, options with sources, and what happens if nobody answers.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "Every count on the page is derived; changing the backlog changes the page.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-4", "text": "The answer sheet lists every open question by its slug.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-5", "text": "Progress reads N of TOTAL (P%) with the deferred count named separately.", "witness": "unit", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A report with history above open questions.",
      "sources": [ { "id": "s1", "source": "analyses", "ref": "g-reports §8", "quote": "The report is a decision surface first and a record second", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "tim", "area": "report", "repos": ["tim"] },
      "needs": [], "dependsOn": ["writer--rulings-ledger"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "distil--ledger-and-gates", "slice": "distil", "kind": "capability",
      "statement": "Distillation phases MUST be gated by a ledger whose resets cascade, and by strict coverage, slicing and yield checks over any source kind.",
      "why": "Parity's control plane is the only mechanical completeness check; its ledger does not cascade.",
      "acceptance": [
        { "id": "ac-1", "text": "Resetting a phase marks every phase that depends on it as not done.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "A source unit neither cited nor stated absent fails the coverage check, naming it.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "A slice under four tenths of the median yield is flagged, and the cross-cutting slice never is.", "witness": "unit", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A ledger showing a later phase done while an earlier one is running.",
      "sources": [ { "id": "s1", "source": "analyses", "ref": "gap-1 §2 item 4, §3", "quote": "start and reset do not invalidate downstream phases", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "tim", "area": "backlog", "repos": ["tim"] },
      "needs": [], "dependsOn": ["writer--schema-v2-two-pass"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "distil--pass-one", "slice": "distil", "kind": "capability",
      "statement": "The distil workflow MUST characterise every source, then author atoms per slice with a different agent verifying each slice.",
      "why": "R1: pass 1 finds every requirement at the smallest grain.",
      "acceptance": [
        { "id": "ac-1", "text": "Every source has a characterisation and an enumeration of its units, or a stated reason it has none.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "Every atom names its author and a different verifier.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "What each author noticed and did not raise is kept and shown in the report.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-4", "text": "No more than five Opus agents run at once in any phase.", "witness": "observation", "confidence": "stated", "sources": ["s2"] }
      ],
      "falsifiedBy": "An atom verified by the agent that wrote it.",
      "sources": [
        { "id": "s1", "source": "analyses", "ref": "gap-1 §1.7, §1.8", "quote": "One author per slice, a different verifier each", "confidence": "stated", "role": "requirement" },
        { "id": "s2", "source": "synthesis", "ref": "§7.4", "quote": "Keep concurrent Opus fan-out to about 5 or 6", "confidence": "stated", "role": "requirement" }
      ],
      "surface": { "service": "distil workflow", "area": "pass one", "repos": ["workspace"] },
      "needs": [], "dependsOn": ["distil--ledger-and-gates", "build--unified-workflow"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "distil--reconcile-panel", "slice": "distil", "kind": "capability",
      "statement": "Every disagreement between sources MUST become a recorded conflict, and the panel MUST rule only what it may, escalating the rest as questions.",
      "why": "The EUDPA-409 panel is the best quality lever and exists only as workarea files.",
      "acceptance": [
        { "id": "ac-1", "text": "Every conflict has a precedence resolution, a panel ruling or a question.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "A conflict in a security, access-control or data-integrity category reaches Sam as a must-answer question and is never ruled by the panel.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "With no conflict needing a panel, the panel phase does not run and says why.", "witness": "observation", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A panel ruling on a must-answer category.",
      "sources": [ { "id": "s1", "source": "synthesis", "ref": "§6.1 items 7 and 9; Q12", "quote": "Formalise it into the skill", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "distil workflow", "area": "reconcile", "repos": ["workspace"] },
      "needs": [], "dependsOn": ["distil--pass-one", "writer--rulings-ledger"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "distil--pass-two-combine", "slice": "distil", "kind": "capability",
      "statement": "Pass 2 MUST combine related atoms under stated rules and a ceiling, record what it left alone, and re-derive after every ruling with ids unchanged.",
      "why": "R1: combine to cut per-increment overhead; EUDPA-409's combination was lost on regeneration.",
      "acceptance": [
        { "id": "ac-1", "text": "Every group names the rules that justified it and whether a red would stay attributable.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "Every candidate pair left apart is listed with its reason.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "No group exceeds the ceiling in the header.", "witness": "unit", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-4", "text": "Re-running pass 2 after a ruling keeps the id of every group whose members did not change.", "witness": "unit", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A re-combine that renumbers an unchanged group.",
      "sources": [ { "id": "s1", "source": "synthesis", "ref": "§7.8", "quote": "Combining is data, re-derivable after every ruling", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "distil workflow", "area": "combine", "repos": ["workspace", "tim"] },
      "needs": [], "dependsOn": ["distil--reconcile-panel"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "distil--skill-and-canary", "slice": "distil", "kind": "capability",
      "statement": "A distiller skill MUST take a real mixed source set to a report Sam can rule from, and take his rulings back into the backlog.",
      "why": "R1: the distiller and its report are the point.",
      "acceptance": [
        { "id": "ac-1", "text": "A new programme can be started, resumed after a stop, and given an extra source.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "A pasted answer sheet becomes rulings with Sam's words kept, and the report re-renders with the questions moved to rulings applied.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "Sam walks through the canary report and rules from it.", "witness": "review", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A ruling that needed a hand edit to take effect.",
      "sources": [ { "id": "s1", "source": "sam-req", "ref": "R1", "quote": "Quality matters above all, especially the requirements gathering and the report", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "skills", "area": "distiller", "repos": ["workspace"] },
      "needs": [], "dependsOn": ["distil--pass-two-combine", "report--decision-led"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "migrate--snagging", "slice": "migrate", "kind": "data",
      "statement": "The paused plants snagging backlog MUST be available in v2, with its recipe fields kept only as non-binding notes.",
      "why": "It is small, live and paused; it gives the canary a real increment.",
      "acceptance": [
        { "id": "ac-1", "text": "Every snagging row exists as an increment with its status and history kept.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "No migrated increment or atom carries a file list, a command or a skill name.", "witness": "unit", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A migrated row that the check flags as recipe-shaped.",
      "sources": [ { "id": "s1", "source": "synthesis", "ref": "Q17", "quote": "Which live backlogs migrate", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "workareas", "area": "plants-snagging", "repos": ["workspace"] },
      "needs": [], "dependsOn": ["writer--lint", "writer--state-and-run"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "migrate--dr1u-remainder-buildable", "slice": "migrate", "kind": "data",
      "statement": "DR1-U's unbuilt rows MUST be buildable by the new implementor.",
      "why": "Only if Sam wants them built.",
      "acceptance": [
        { "id": "ac-1", "text": "DR1-U's rulings, including block, defer and reject, appear as ledger decisions.", "witness": "observation", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "Next offers a DR1-U increment only when its rows' rulings allow it.", "witness": "observation", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "A disputed DR1-U row offered as buildable.",
      "sources": [ { "id": "s1", "source": "analyses", "ref": "gap-5 §8, §10", "quote": "DR1-U is the migration template", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "workareas", "area": "dr1u", "repos": ["workspace"] },
      "needs": ["q-dr1u-remainder"], "dependsOn": ["port--dr1u-data", "writer--rulings-ledger"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    },
    {
      "key": "retire--old-paths-and-routing", "slice": "retire", "kind": "hygiene",
      "statement": "Superseded drivers, planners and writers MUST be retired, and skill routing MUST point only at live skills.",
      "why": "Two skills both claim to be the build loop; the routing table lists neither.",
      "acceptance": [
        { "id": "ac-1", "text": "The routing table lists the distiller and implementor and renders as one table.", "witness": "review", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-2", "text": "No live skill or workflow describes the run copy, FALLBACK patching or writing plans into a backlog.", "witness": "review", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-3", "text": "The workflows README describes the workflow as it runs.", "witness": "review", "confidence": "stated", "sources": ["s1"] },
        { "id": "ac-4", "text": "The agent-skills guide and skill-creator no longer advise Glob or settings edits.", "witness": "review", "confidence": "stated", "sources": ["s1"] }
      ],
      "falsifiedBy": "An agent routed by trigger phrase to a retired mode.",
      "sources": [ { "id": "s1", "source": "synthesis", "ref": "§6.4; Q41", "quote": "Stale docs mislead agents", "confidence": "stated", "role": "requirement" } ],
      "surface": { "service": "docs", "area": "routing", "repos": ["workspace"] },
      "needs": [], "dependsOn": ["proof--codex-parity", "distil--skill-and-canary"], "status": "adopted",
      "provenance": { "authoredBy": { "phase": "design", "agent": "reuse-candidate" }, "verifiedBy": null, "verdict": "unverified" }
    }
  ],
  "increments": [
    { "id": "inc-001", "key": "port-proven-assets", "title": "Proven fixes and helpers from two branches are on main", "outcome": "Local builds work on main, commits carry the launcher's trailer, and PR and CI helpers with honest exit codes are available.", "why": "Nothing new is built on a loop missing fixes that already exist.", "members": ["port--local-lifecycle-and-trailer", "port--alignment-branch-assets"], "class": "chore", "surface": { "repos": ["workspace"], "areas": ["lifecycle", "github"] }, "milestone": "m0", "dependsOn": [], "needs": [], "checkpoint": null, "size": { "class": "S", "basis": "5 criteria, 1 repo" }, "combination": { "rules": ["cr-same-surface"], "why": "Both are ports into the build tooling from proven branches.", "risk": "low", "attributability": "Each port has its own observable check." }, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-002", "key": "solo--port--dr1u-data", "title": "DR1-U's backlog and notes are on main", "outcome": "The only proven parity-to-build programme is on main, and the loop is untouched.", "why": "Stranded on a branch that would regress the loop.", "members": ["port--dr1u-data"], "class": "chore", "surface": { "repos": ["workspace"], "areas": ["dr1u"] }, "milestone": "m0", "dependsOn": [], "needs": [], "checkpoint": null, "size": { "class": "S", "basis": "2 criteria" }, "combination": null, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-003", "key": "solo--runtime--args-and-children", "title": "The Workflow runtime's handling of args and child workflows is recorded", "outcome": "The build workflow can rely on args alone, and the nested option is settled by evidence.", "why": "Retires the args folklore.", "members": ["runtime--args-and-children"], "class": "chore", "surface": { "repos": ["workspace"], "areas": ["runtime"] }, "milestone": "m0", "dependsOn": [], "needs": [], "checkpoint": null, "size": { "class": "S", "basis": "2 criteria, zero agents" }, "combination": null, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-004", "key": "solo--writer--parity-moves-intact", "title": "tim backlog exists and tim parity is unchanged", "outcome": "The tested writer is generic, and every parity command and test behaves as before.", "why": "Proves the base before anything builds on it.", "members": ["writer--parity-moves-intact"], "class": "refactor", "surface": { "repos": ["tim", "workspace"], "areas": ["backlog"] }, "milestone": "m0", "dependsOn": [], "needs": [], "checkpoint": null, "size": { "class": "M", "basis": "3 criteria, broad move" }, "combination": null, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-005", "key": "schema-v2-and-lint", "title": "A v2 backlog assembles from atom and group files, and its check catches recipes", "outcome": "Two-pass backlogs can be ingested with stable ids, and recipe-shaped or secret-bearing text is caught.", "why": "The schema and its lint are one surface: the check command.", "members": ["writer--schema-v2-two-pass", "writer--lint"], "class": "feat", "surface": { "repos": ["tim"], "areas": ["backlog"] }, "milestone": "m0", "dependsOn": ["inc-004"], "needs": [], "checkpoint": null, "size": { "class": "M", "basis": "8 criteria, 1 repo" }, "combination": { "rules": ["cr-same-surface"], "why": "Ingest and check share the schema.", "risk": "low", "attributability": "Lint criteria are separate tests." }, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-006", "key": "state-run-and-next", "title": "Run state and bindings change safely, and there is one answer to what builds next", "outcome": "The build path has a writer it can trust and a single buildability rule.", "why": "next reads the state it guards.", "members": ["writer--state-and-run", "writer--next-single-rule"], "class": "feat", "surface": { "repos": ["tim"], "areas": ["backlog"] }, "milestone": "m0", "dependsOn": ["inc-005"], "needs": [], "checkpoint": null, "size": { "class": "M", "basis": "6 criteria" }, "combination": { "rules": ["cr-same-surface", "cr-proves-another"], "why": "next is proved by the red-state criterion of the state writer.", "risk": "low", "attributability": "Separate command tests." }, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-007", "key": "solo--writer--rulings-ledger", "title": "A ruling is recorded and applied in one write", "outcome": "Sam's answers change the backlog through one validated command, with his words kept.", "why": "Replaces three ruling mechanisms.", "members": ["writer--rulings-ledger"], "class": "feat", "surface": { "repos": ["tim"], "areas": ["backlog"] }, "milestone": "m0", "dependsOn": ["inc-006"], "needs": [], "checkpoint": null, "size": { "class": "M", "basis": "5 criteria" }, "combination": null, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-008", "key": "live-context", "title": "Rules, personas and bundles can be resolved live for any file", "outcome": "Both executors can be told exactly which rules, personas and best-practice files apply to each file, read from their owners.", "why": "R2 and R3 need the same resolution at run time.", "members": ["context--rules-resolution", "context--personas-embedded"], "class": "feat", "surface": { "repos": ["tim", "workspace"], "areas": ["backlog", "review"] }, "milestone": "m0", "dependsOn": ["inc-004"], "needs": [], "checkpoint": null, "size": { "class": "M", "basis": "7 criteria, 2 repos" }, "combination": { "rules": ["cr-same-surface"], "why": "One context stage consumes both.", "risk": "low", "attributability": "Rule resolution is unit-tested apart from persona wording." }, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-009", "key": "shared-stages-and-codex-runner", "title": "Every stage has one brief and schema, and Codex prompts run in parallel and resume", "outcome": "Either executor can take any delegable stage, and Codex runs survive the Bash ceiling without breaking the rails.", "why": "The executor contract is one surface: how a stage is handed out.", "members": ["executor--shared-briefs", "executor--codex-runner"], "class": "feat", "surface": { "repos": ["workspace", "tim"], "areas": ["executors", "codex"] }, "milestone": "m1", "dependsOn": ["inc-004"], "needs": [], "checkpoint": null, "size": { "class": "M", "basis": "6 criteria" }, "combination": { "rules": ["cr-same-surface"], "why": "The runner consumes the schemas the briefs define.", "risk": "medium", "attributability": "Runner criteria are observed on their own prompts." }, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-010", "key": "solo--build--unified-workflow", "title": "One workflow builds a v2 backlog with a plan per increment and nothing silent", "outcome": "Increments are planned just in time, reviewed per file with live personas, and every failure is a named red.", "why": "The core of the build path.", "members": ["build--unified-workflow"], "class": "feat", "surface": { "repos": ["workspace"], "areas": ["stages"] }, "milestone": "m1", "dependsOn": ["inc-001", "inc-003", "inc-006", "inc-008", "inc-009"], "needs": [], "checkpoint": null, "size": { "class": "L", "basis": "8 criteria, 1 repo, largest surface" }, "combination": null, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-011", "key": "solo--build--lifecycle-profiles", "title": "Builds honour the programme's branch strategy and merge policy", "outcome": "Programme, per-increment and local builds all work, and nothing merges without a ruling.", "why": "Lifecycle variants after the core is proven.", "members": ["build--lifecycle-profiles"], "class": "feat", "surface": { "repos": ["workspace"], "areas": ["lifecycle"] }, "milestone": "m1", "dependsOn": ["inc-010"], "needs": [], "checkpoint": null, "size": { "class": "M", "basis": "4 criteria" }, "combination": null, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-012", "key": "implementor-skill-and-snagging", "title": "Sam starts and switches builds in a sentence, and snagging is ready to build", "outcome": "The implementor skill drives builds from a migrated real backlog.", "why": "The skill needs a real v2 backlog to drive, and the migration is proved by the skill reading it.", "members": ["build--implementor-skill", "migrate--snagging"], "class": "feat", "surface": { "repos": ["workspace"], "areas": ["implementor", "plants-snagging"] }, "milestone": "m1", "dependsOn": ["inc-010"], "needs": [], "checkpoint": null, "size": { "class": "M", "basis": "5 criteria" }, "combination": { "rules": ["cr-proves-another"], "why": "The skill's first run proves the migration.", "risk": "low", "attributability": "Migration criteria are checked before the skill runs." }, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-013", "key": "solo--proof--claude-canary", "title": "One real increment builds end to end on the new path, Claude only", "outcome": "The new build path is proven on real work before anything else relies on it.", "why": "Canary first.", "members": ["proof--claude-canary"], "class": "test", "surface": { "repos": ["workspace"], "areas": ["canary"] }, "milestone": "m1", "dependsOn": ["inc-011", "inc-012"], "needs": [], "checkpoint": "walkthrough", "size": { "class": "S", "basis": "2 criteria" }, "combination": null, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-014", "key": "solo--proof--codex-parity", "title": "Codex builds to the same standard as Claude", "outcome": "Sam can delegate a batch to Codex and get the same review depth and results.", "why": "R6 parity proof.", "members": ["proof--codex-parity"], "class": "test", "surface": { "repos": ["workspace"], "areas": ["executors"] }, "milestone": "m1", "dependsOn": ["inc-013"], "needs": [], "checkpoint": "walkthrough", "size": { "class": "M", "basis": "5 criteria" }, "combination": null, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-015", "key": "solo--report--decision-led", "title": "The report leads with what needs Sam's ruling", "outcome": "Sam reads one generated page, rules in a batch, and sees build status on the same page.", "why": "Report quality is the first priority.", "members": ["report--decision-led"], "class": "feat", "surface": { "repos": ["tim"], "areas": ["report"] }, "milestone": "m2", "dependsOn": ["inc-007"], "needs": [], "checkpoint": null, "size": { "class": "M", "basis": "5 criteria" }, "combination": null, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-016", "key": "distil-gates-and-pass-one", "title": "Pass 1 turns every source into verified atoms behind strict gates", "outcome": "Every requirement is found at the smallest grain, proven covered, and verified by a second agent.", "why": "The gates prove pass 1; neither is useful alone.", "members": ["distil--ledger-and-gates", "distil--pass-one"], "class": "feat", "surface": { "repos": ["tim", "workspace"], "areas": ["backlog", "pass one"] }, "milestone": "m2", "dependsOn": ["inc-005", "inc-010"], "needs": [], "checkpoint": null, "size": { "class": "L", "basis": "7 criteria, 2 repos" }, "combination": { "rules": ["cr-proves-another"], "why": "The ledger and checks are what prove pass 1 finished.", "risk": "medium", "attributability": "Gate criteria are unit tests; pass 1 criteria are observed on a run." }, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-017", "key": "solo--distil--reconcile-panel", "title": "Every source disagreement is recorded, and the panel rules only what it may", "outcome": "Conflicts become rulings or questions, and must-answer questions always reach Sam.", "why": "The quality core of the distiller.", "members": ["distil--reconcile-panel"], "class": "feat", "surface": { "repos": ["workspace"], "areas": ["reconcile"] }, "milestone": "m2", "dependsOn": ["inc-016", "inc-007"], "needs": [], "checkpoint": null, "size": { "class": "M", "basis": "3 criteria, several personas" }, "combination": null, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-018", "key": "combine-skill-and-canary", "title": "Atoms combine into buildable increments, and a real source set reaches Sam as a report", "outcome": "The distiller runs end to end on real sources, and Sam rules from its report.", "why": "Pass 2 is only judged well on a real set; the canary proves both.", "members": ["distil--pass-two-combine", "distil--skill-and-canary"], "class": "feat", "surface": { "repos": ["workspace", "tim"], "areas": ["combine", "distiller"] }, "milestone": "m2", "dependsOn": ["inc-015", "inc-017"], "needs": [], "checkpoint": "walkthrough", "size": { "class": "L", "basis": "7 criteria" }, "combination": { "rules": ["cr-proves-another"], "why": "The canary is the proof of the combine pass.", "risk": "medium", "attributability": "Combine criteria include unit tests that run before the canary." }, "status": "todo", "doneBy": null, "statusNote": null },
    { "id": "inc-019", "key": "solo--migrate--dr1u-remainder-buildable", "title": "DR1-U's unbuilt rows can be built by the new implementor", "outcome": "If Sam wants them, DR1-U's remaining rows build under their existing rulings.", "why": "Waits on Sam's ruling.", "members": ["migrate--dr1u-remainder-buildable"], "class": "chore", "surface": { "repos": ["workspace"], "areas": ["dr1u"] }, "milestone": "m3", "dependsOn": ["inc-002", "inc-007"], "needs": ["q-dr1u-remainder"], "checkpoint": null, "size": { "class": "S", "basis": "2 criteria" }, "combination": null, "status": "blocked", "doneBy": null, "statusNote": "Needs q-dr1u-remainder." },
    { "id": "inc-020", "key": "solo--retire--old-paths-and-routing", "title": "Old paths are retired and routing points only at live skills", "outcome": "An agent routed by any trigger phrase reaches the live distiller or implementor.", "why": "Stale docs mislead agents.", "members": ["retire--old-paths-and-routing"], "class": "docs", "surface": { "repos": ["workspace"], "areas": ["routing"] }, "milestone": "m3", "dependsOn": ["inc-014", "inc-018"], "needs": [], "checkpoint": null, "size": { "class": "M", "basis": "4 criteria, many files" }, "combination": null, "status": "todo", "doneBy": null, "statusNote": null }
  ]
}
```

---

## 12. Risks, and what to prove first

| # | Risk | Why it is real | Mitigation | Proved by |
|---|---|---|---|---|
| 1 | Moving parity's modules breaks tim CI or a parity command | `report.contract.test.js` parses the tracked EUDPA-328 backlog; nine modules read it through the profile (G5 §6) | inc-004 is a move with **no behaviour change**, judged only on "every existing test passes, no fixture changed, the EUDPA-328 page renders the same" | inc-004 first after the ports |
| 2 | One workflow file with two modes becomes hard to change safely | A syntax error in the shared file stops both modes; the file will be large | tim contract test parses the file and extracts `STAGE_SCHEMAS`; build mode lands and is canaried before distil mode is added; splitting later costs one duplicated constant (flag S6) | inc-010, inc-013 |
| 3 | Codex parity is not reached | Today Codex runs one reviewer and drops confidence; Codex has no rules | Same briefs, same per-file fan-out, explicit rule lists, cross-check in the proof; gaps become atoms and the proof reruns | inc-014 |
| 4 | Persona "embedded" sections drift from the skills' own use | The personas were written for helper-script output | The sections are short and owned by the skills; the review and code-style skills' own tests and walkers are unchanged | inc-008, then any persona edit shows in the next build |
| 5 | The courier copying Codex JSON corrupts it | An LLM re-emits the assembled array | The script assembles the JSON with `jq`; the workflow checks counts and ids; a mismatch is a red; fall back to a relay agent per prompt if the canary shows drift | inc-009, inc-014 |
| 6 | Automatic combining groups things Sam would keep apart | Pass 2 is judgement | Rules, ceiling, attributability and "considered and left alone" are all on the page with "To reverse:"; re-combine is free; flag S7 | inc-018 walkthrough |
| 7 | Panel rules something Sam must own | Headless adjudication | Escalation categories are data and must-answer questions block; every panel ruling is a reversible call on the page; flag S2 | inc-017 |
| 8 | Drain runs out of the 1,000-agent cap or the Opus window | 22 to 46 agents per increment; Opus shares the session window | `count` knob; Opus concurrency 5; Codex mode cuts Claude agents to watchers; Sam raises Dynamic workflow size once | inc-013 onwards |
| 9 | Writer lock contention stalls a run | Parallel watchers may write at once | The script serialises writes through one watcher at a time; CAS is the second line; the lock is released by process check | inc-006 |
| 10 | `tim backlog rules` disagrees with native loading | Two mechanisms | ac-3 of `context--rules-resolution` compares against the probe's observed loads | inc-008 |
| 11 | Migrating snagging mid-implement loses work | `snag-003` is mid-implement on a branch | Migration keeps state; the canary builds a different row; the half-built work stays on its branch and resumes through `state.branch` | inc-012 |
| 12 | Local sonar analysis never runs | Not allowlisted, 403 for the org | Recorded as `not-run` and shown in the report; SonarCloud on the PR is a required CI check | inc-010 ac-8 |

**What to prove first, in order:** the ports (inc-001, inc-002), the zero-agent runtime canary (inc-003), and parity untouched after the move (inc-004). Those three settle every factual doubt the rest of the design rests on, and each costs almost nothing. Then the writer (inc-005 to inc-007), because every later stage writes through it. Then one real Claude canary (inc-013) before the Codex parity proof (inc-014), and only then the distiller, whose report Sam walks through before any old path is retired.
