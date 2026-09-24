# Candidate design: requirements and report quality first

Candidate for the requirements pipeline design panel, 18 September 2026.

Angle: the quality of requirements gathering and of the distillation report comes first. Every choice below
is made to make the requirement set **provably complete, adversarially checked, honestly graded and easy to
rule on**, and to make sure the requirement's intent survives unchanged into merged code, whichever executor
builds it.

Evidence base: `analysis/sam-requirements.md` (R1 to R6), `analysis/rules-probe.md`, `analysis/00-synthesis.md`
(cited as S §n), the analyst files (A to H) and the gap files (G1 to G5). Citations to source are `file:line`
on `main` at `d07af6b9` unless marked `FA:` (the `feat/NO_JIRA-frontend-alignment` branch).

Written in GDS plain British English. No time estimates anywhere; size is stated as increments, files,
commands, agents and risk.

---

## Contents

1. Principles
2. Architecture overview
3. `backlog.json` schema v2
4. Writer and tooling
5. The distiller skill
6. The distillation report
7. The implementor skill and workflows
8. Executors
9. Decisions (Q1 to Q41)
10. Retire and migrate
11. Build backlog for this programme
12. Risks, and what to prove first

---

## 1. Principles

1. **A backlog row is a requirement, never a recipe.** It says what must be true afterwards, why, how a
   person would observe it, and where the requirement came from. Files, steps, commands, test names and code
   shapes live only in the implementor's just-in-time plan. (R1; S §5.3, §8.1)
2. **Nothing is a requirement without a citation, and nothing is silently dropped.** Every addressable unit of
   every source ends up somewhere named: cited by a requirement, ruled not a requirement with a reason, a side
   of a conflict, a scope exclusion, or a duplicate. A tested command proves it. (R1 quality; S §6.1 #4, #25;
   G1 §1.2)
3. **Whoever wrote it does not check it.** Extracts, requirements, questions and report prose are each
   verified by a different agent, and the writer records and refuses author equals verifier. (R1 quality;
   G1 §2.6; trace Verify `trace-to-requirements.workflow.js:850-927`)
4. **Two passes, both data.** Pass 1 writes the smallest atoms until every requirement is identified. Pass 2
   combines related atoms into buildable items on requirement-level signals only, records what it left alone,
   and re-runs after every ruling without losing a ruling or an id. (R1; S §7.8; G1 §1.5; G2 §2.2)
5. **The report is a decision surface generated from JSON.** Questions first, reversible calls second, weak
   evidence third, then the backlog. No agent edits the report; every number is derived. (R1 quality;
   G §1, §3, §8)
6. **A question is a record, not a sentence.** Slug id, headline, four parts (question, in play, options with
   evidence, "if nobody answers"), a computed blast radius, and a lifecycle. A tentative answer is
   `outstanding`, never a ruling. (G §2; memory `feedback_question_is_not_a_ruling`)
7. **One deterministic writer owns all state.** `tim backlog` is the only thing that writes `backlog.json` or
   build state: schema-validated, lock-protected, id-stable, cycle-checked. No agent composes jq over canonical
   state. (S §4.6, §8.4; G2)
8. **The backlog is executor-agnostic.** It carries requirement, meta and state fields only. Everything
   executor-specific (rules, persona files, bundles, model tiers, prompt shape, schemas) is resolved at run time
   by the implementor, for whichever executor builds that stage. The same unmodified file builds under Claude,
   Codex or a mix. (R5)
9. **One stage contract, two adapters, one quality bar.** Every stage has one input contract and one output
   schema. Both executors run the same persona files at the same granularity, read live by path from the
   `review` and `code-style` skills, with the same rule files resolved from the same globs. (R2, R3, R6)
10. **Acceptance is verified independently of the plan.** A plan can prove the wrong thing. A separate agent
    checks every backlog acceptance criterion against the landed change and its test evidence, reading the
    backlog, not the plan. (Q27; synthesis §5.2 defects)
11. **Every silent success is a loud failure.** A dead reviewer, judge, fixer, verifier, relay or recorder
    throws and writes a red state. Empty never looks like approval. (S §6.4 silent-success row; B §3.5 to 3.8)
12. **Anything a session hook would have done is an explicit step.** Secrets scanning, Sonar, and rule
    loading are stages or gates, never assumptions, in both executors. (R3, R4; rules-probe §6)

---

## 2. Architecture overview

### 2.1 The whole pipeline

```
 SOURCES (any mix)                                             requirements-distiller skill (main session)
 ─────────────────                                             ─────────────────────────────────────────────
 Confluence page ─┐  tim confluence page                        start-distil.sh  ─► MODE: NEW | RESUME | RULE |
 Jira ticket(s) ──┤  tim jira ticket / comments                                     REDISTIL | ABSORB | REPORT
 docx / pdf ──────┤  unzip -p word/document.xml (source-type lib)
 images / boards ─┤  Read tool, one at a time; tim distil crop    tim distil phase status|start|done|gate|reset
 design canvas ───┤  exported frames; tim distil crop                (pipeline.json, phase table as data)
 transcript/chat ─┤  speaker@timestamp units
 repos / code ────┤  git show <pin>:<path> (constraint / current-behaviour roles only)
 prototype ───────┤  parity capture specs (screens)
 trace corpus ────┤  trace hash + action id
 OpenSpec ────────┤  REQ-/SCN- ids
 existing backlog ┘  v1 / parity / trace / FA stages → units (ABSORB)
        │
        ▼
 PHASE 0  setup ── interview, REQUIREMENT-CONTRACT.md skeleton, sources registered   [main session]
 PHASE 1  acquire + heads + seals ── tim distil acquire / heads --write / seal        [main session, tim]
 PHASE 2  characterise (1 agent per source) ── units.json, characterisation.md         [Workflow distil.js]
 PHASE 3  extract-verify (different agent per source) ── verdicts per unit             [Workflow distil.js]
 PHASE 4  unit coverage ── tim distil units --strict                                   [main session, tim]
 PHASE 5  carryover (only if a previous distillation or backlog exists)                [Workflow, 1 Opus]
 PHASE 6  slice ── slices.json; tim distil slices --strict (one cross-cutting owner)   [Workflow 1 Opus + tim]
 PHASE 7  contract gate ── contract whole before any author spawns                    [main session]
 ════════════════════ PASS 1: ATOMS ══════════════════════════════════════════════════════════════════════
 PHASE 8  author ─► verify (pipeline per slice; author ≠ verifier)                     [Workflow distil.js]
            atoms/<slice>--<slug>.json + notRaised[] + premisesDisproved[]
 PHASE 9  yield + gap-close ── tim distil yield --strict; auditors for thin slices      [tim + Workflow]
 PHASE 10 trace matrix ── tim distil trace --strict (every unit lands somewhere)         [main session, tim]
 PHASE 11 reconcile ── conflicts, precedence per fact kind, assumptions, invariants      [Workflow, 1 Opus]
 PHASE 12 panel ── dockets: 3 judges + chair; critic; escalations become questions      [Workflow, ≤6 Opus]
 PHASE 13 dedupe ── tim distil duplicates --all + DUPLICATE_SWEEPER (1 Opus)            [tim + Workflow]
 PHASE 14 ingest atoms ── tim backlog ingest --grain atomic --require-verification      [main session, tim]
 PHASE 15 critique ── COMPLETENESS_CRITIC (fresh Opus); new atoms loop to phase 8       [Workflow]
 PHASE 16 questions ── QUESTION_EDITOR clusters + four-part + lint; QUESTION_CRITIC      [Workflow + tim]
 ════════════════════ PASS 2: COMBINE ════════════════════════════════════════════════════════════════════
 PHASE 17 combine ── tim distil combine-candidates → COMBINER (1 Opus) →
                     combined/<slug>.json → tim backlog ingest --grain combined          [tim + Workflow]
 PHASE 18 report ── tim distil report; CLAIM_VERIFIER + COPY_EDITOR over machine prose   [tim + Workflow]
        │
        ▼
 workareas/shared/<programme>/backlog.json   (v2: header + questions + decisions + atomic + combined rows)
        │                        ▲
        │     Sam rules          │  tim backlog rule <q> --option B --words "…" --by sam --at 2026-09-18
        │     (page batch or     │  → decisions[] append → phase reset apply-rulings
        │      answer sheet)     │  → RULING_APPLIER (Opus) → tim backlog ingest (supersede/drop/unblock/new)
        │                        │  → PHASE 17 re-combine → PHASE 18 re-render
        ▼                        │
 backlog-builder skill (main session) ── start-build.sh → MODE: RUN | RESUME | HANDOVER | SWITCH | PARITY
   "build inc-012 to inc-020 with Codex" → tim build executor set --ids inc-012..inc-020 --executor codex
   resolves args (workarea, count, cadence, trailer, rails text) → launches ONE Workflow by scriptPath
        │
        ▼
 .claude/workflows/build-drain.js (parent, one invocation)
   loop: tim backlog next --json → workflow({scriptPath: build-increment.js}, {…cfg, increment, bindings})
         → landed check from build/state.json → halt rules (red, 3 consecutive reds, checkpoint, count)
        │
        ▼
 .claude/workflows/build-increment.js (child; also launchable top-level for supervised cadence)
   resolve → ticket? → branch/sync → baseline → context → PLAN → PLAN-AUDIT → context(planned files)
   → implement → scan → REVIEW fan-out (style + code per file, consistency per repo, plan-proof)
   → verify → judge → fix → fix-verify → ladder → ACCEPTANCE (independent) → land → PR → CI(watch/fix)
   → local E2E? → merge (policy) → record → report refresh
   Each heavy stage = shared stage brief + executor profile + increment context file + output schema
        │                                     │
        ├── claude adapter: agent({model tier, schema})
        └── codex adapter: Claude watcher shell → tools/codex/run-stage.sh start|wait (N concurrent)
                            → Claude watcher relay (validates with tim build stage-result check)
        │
        ▼
 build/state.json (lifecycle), plans/<id>.md + .json, discovered[] → tim backlog propose (proposed atoms
 re-enter verify + combine) → report re-render (tim distil report --build) ───────────────────────────► Sam
```

### 2.2 Named parts

| Part | Kind | Path | New or reused |
|---|---|---|---|
| `requirements-distiller` | Skill | `.claude/skills/requirements-distiller/` | New; method from `SOURCE_EXTRACTOR.md:1-47`, parity COMPARE/AUTHOR, trace-mining |
| `backlog-builder` | Skill | `.claude/skills/backlog-builder/` | New; replaces build-orchestrator (driver half) |
| `distil.js` | Workflow | `.claude/workflows/distil.js` | New; `pipeline()` shape from `workareas/shared/dr1c-parity/author-workflow.js:259-278` |
| `build-drain.js` | Workflow (parent) | `.claude/workflows/build-drain.js` | New; G4 §2.1 hybrid |
| `build-increment.js` | Workflow (child) | `.claude/workflows/build-increment.js` | New; loop lifecycle + FA plan/report |
| `args-canary.js`, `lib/echo.js` | Workflow (proof only) | `.claude/workflows/lib/` | New; G4 §5 |
| `tim backlog …` | tim module | `tim/src/backlog/`, `tim/src/commands/backlog/` | Generalised from `tim/src/parity/{ingest,set,io,schema}.js` |
| `tim distil …` | tim module | `tim/src/distil/`, `tim/src/commands/distil/` | Generalised from `tim/src/parity/{coverage,slices,yield,duplicates,heads,seals,meta}.js`, `render/*` |
| `tim build …` | tim module | `tim/src/build/`, `tim/src/commands/build/` | New (derive, run state, stage-result check, secrets scan, compare) |
| `tim rules match` | tim command | `tim/src/rules/` | New |
| `start-distil.sh` | Dispatcher | `tools/distil/start-distil.sh` | New (skill pattern 2) |
| `start-build.sh` | Dispatcher | `tools/build/start-build.sh` | New |
| `stage-context.sh` | Composer | `tools/build/stage-context.sh` | New; calls `tools/style/file-topics.sh`, `tools/style/bake-rules-bundle.sh`, `tools/review/detect-tech.sh`, `tim rules match` |
| `run-stage.sh` | Codex runner | `tools/codex/run-stage.sh` | New; replaces prompt-prose slicing (`increment-build-loop.js:744-772`) |
| `pr-ensure-draft.sh`, `wait-for-pr-checks.sh` | GitHub helpers | `tools/github/`, `tools/github-actions/` | Ported from the FA branch |
| Stage briefs, schemas, executor profiles | Assets | `.claude/skills/backlog-builder/{stages,assets/schemas,executors}/` | New; content migrated from `.claude/workflows/codex/*.md` and loop prompts |

---

## 3. `backlog.json` schema v2

### 3.1 Files in a programme workarea

Every programme lives in `workareas/shared/<programme>/` (tracked; see Q2). The writer owns the JSON files.

| File | Written by | Read by | Tracked | Purpose |
|---|---|---|---|---|
| `backlog.json` | `tim backlog` only | everyone | yes | Requirements, questions, decisions, programme config. The review surface under `git diff`. |
| `units.json` | `tim distil units --ingest` | authors, verifiers, coverage, report | yes | Verbatim source units (the evidence layer). |
| `pipeline.json` | `tim distil phase` | distiller skill | yes | Phase ledger. |
| `REQUIREMENT-CONTRACT.md` | setup phase, then Sam | every distiller agent | yes | Per-run contract (roles, precedence, what is not a requirement, firewall, paid-for knowledge). |
| `sources/<id>/characterisation.md`, `units.<id>.json`, `crops/` | characteriser | verifier, report | yes (`raw/` ignored) | Structure found, units, visual crops. |
| `slices.json`, `atoms/*.json`, `combined/*.json`, `verification/*.json`, `panel/*.json`, `carryover.json`, `critique.json` | agents write per-item files; tim validates | tim ingest, report | yes | Per-item authored files, never `backlog.json`. |
| `heads.json`, `seals.json` | `tim distil heads`, `tim distil seal` | report drift panel, plan stage | yes | Pins and seals (repo keys, not absolute paths). |
| `plans/<id>.md`, `plans/<id>.json` | plan stage | implement, review, acceptance, report | yes | The only recipe, just in time. |
| `build/state.json` | `tim backlog state` only | driver, child workflow, report | yes | Build lifecycle per increment (see 3.8). |
| `build/run.json` | `tim build executor`, `tim build run` | driver | yes | Executor choice and run history. |
| `build/context/<id>.json` | `tools/build/stage-context.sh` | every heavy stage | yes | Resolved rules, bundles, personas for this increment. |
| `build/logs/`, `sources/*/raw/`, `journal/*.jsonl` | stages | people debugging | **no** (gitignored) | Bulky or sensitive. |
| `report/` | `tim distil report` | Sam | yes (`index.html`, `report.md`, `answer-sheet.md`) | Generated views. |

### 3.2 Why run state lives beside the row, not on it

The row carries a small requirement **status** (3.5). All build lifecycle (plan path, phase, ticket, branch,
commits, PRs, attempts, red kind, executor used) lives in `build/state.json`.

- **Review surface.** `git diff backlog.json` must stay a prose review of requirements (G5 §9 invariant 11;
  `CLAIM_VERIFIER.md:17`). FA's 217 KB of `notes` and EUDPA-409's 1 to 6 KB plan notes broke that (S §4.2).
- **Corruption blast radius.** Recorder writes are the proven failure (S §4.6). A recorder that can only reach
  `build/state.json` cannot damage a requirement, a question or a ruling.
- **R5.** "Which executor built this" is run state. Keeping it out of `backlog.json` means the backlog is never
  edited to switch executors.
- **Resume.** The loop's rule "persist each artefact the moment it exists, derive resume only from persisted
  facts" (`increment-build-loop.js:866-946`) is kept, in the state file.

### 3.3 Header fields

Kind: **Req** requirement, **Meta** identity, config or classification, **St** state. "W" writer, "R" readers.

| Field | Type | Req'd | Kind | Meaning | W | R |
|---|---|---|---|---|---|---|
| `schemaVersion` | `2` | yes | Meta | Schema version. | `tim backlog init` | all tools |
| `programme.id` | slug | yes | Meta | Stable programme id, equals the workarea folder name. | init | all |
| `programme.title` | string | yes | Meta | Plain-English name. | init | report |
| `programme.purpose` | string (2 to 3 sentences) | yes | Req | What is being built, for whom, why. | setup phase | planner, reviewers, report |
| `programme.epic` | Jira key or null | no | Meta | Parent epic for tickets. | setup | ticket stage |
| `programme.target` | string or null | no | Meta | Key into `tools/journey-builder/targets.json` for parity-profile readers only (G5 §3). | migrate | parity readers |
| `repos` | map `repoKey → {path, github, role, ladder, mergeAfter[]}` | yes | Meta | N named repos. `role` ∈ `provider|consumer|tests|tooling|docs`. `ladder` maps rung names (`unit`, `format`, `lint`, `fit`, `e2e`) to npm or maven script names, null when absent. `mergeAfter` lists repo keys this repo merges after (provider/consumer edges replacing `MERGE_RANK`, `increment-build-loop.js:299`). | setup, migrate | branch, baseline, ladder, merge |
| `lifecycle.strategy` | `per-increment|programme|local` | yes | Meta | Branch strategy (H §6.3). | setup | build |
| `lifecycle.branch` | string or null | programme only | Meta | Programme branch name, identical in every repo (CLAUDE.md rule 2). | setup | build |
| `lifecycle.base` | string | yes | Meta | Base branch, normally `main`. | setup | build |
| `lifecycle.tickets` | `per-increment|none` | yes | Meta | Whether each increment raises a Jira ticket. | setup | ticket stage |
| `lifecycle.merge` | `{policy: never|on-approval|on-green, decision: d-id or null}` | yes | Meta | `on-green` refused by the writer without a `decision` whose `by` is a person (H §6.4). | setup, rule | merge stage |
| `lifecycle.draftPrs` | boolean | yes | Meta | Draft PRs. | setup | PR stage |
| `lifecycle.phases` | `{sync, localE2e, workspaceE2e: auto|on|off}` | yes | Meta | Optional phases (Q29). | setup | build |
| `sources[]` | see 3.3.1 | yes | Meta | Source registry. | acquire | distiller, report |
| `precedence[]` | `{factKind, order[sourceId], why}` | yes | Req | Precedence per fact kind: `copy|values|mandate|flow|intent|scope|data-shape|integration` (F K10). | reconcile | reconciler, panel, report |
| `invariants[]` | `{id, text, why, provenance[], appliesTo{repos?, surfaces?}}` | yes (may be empty) | Req | Cross-cutting requirements stated once (F K15, P10). | reconcile, applier | every reviewer, planner, acceptance |
| `scopeExclusions[]` | `{id, text, why, decision, provenance[]}` | yes | Req | Parked or rejected scope, kept so nobody re-raises it. | reconcile, applier | planner, report |
| `deviations[]` | `{id, text, why, decision}` | yes | Req | Deliberate departures from evidence. | applier | planner, report |
| `assumptions[]` | `{id, text, default, confidence, reviseIf, decision, provenance[]}` | yes | Req | Non-blocking defaults (F K22). | reconcile | planner, acceptance, report |
| `conflicts[]` | `{id, topic, factKind, sides[{source, unit, says}], resolution{by: precedence|panel|person, decision, pick}, needsPerson}` | yes | Req | Every disagreement between sources (F K11). | reconcile, panel | report |
| `questions[]` | see 3.6 | yes | Req | Every open, outstanding and ruled question. | QUESTION_EDITOR via writer | report, derive, planner |
| `decisions[]` | see 3.7 | yes | Req | Append-only ruling ledger. | `tim backlog rule`, applier | everyone |
| `combination` | `{rules[], ceilings{}, applied[], declined[], basis{atomsSha, at}}` | yes | Meta | Pass 2 record (G §6). | combine ingest | report |
| `distillation` | `{phaseLedger: "pipeline.json", runs[{runId, phase, at}], contract: path, headsAt: sha256}` | yes | Meta | Where the audit trail lives. | tim distil | report |
| `increments[]` | see 3.4 | yes | Req/Meta | Atomic and combined requirement rows. | `tim backlog ingest` | everyone |

#### 3.3.1 Source record

| Field | Type | Req'd | Meaning |
|---|---|---|---|
| `id` | slug | yes | Stable source id (`phnns-policy`). |
| `type` | `confluence|jira|docx|pdf|markdown|image|design-canvas|transcript|email|repo|prototype|trace-corpus|openspec|backlog|parity-corpus|web` | yes | Drives mechanics from the source-type library. |
| `role` | `requirement|constraint|consistency-anchor|current-behaviour|legacy` | yes | What this source may speak to (F K3). |
| `tier` | integer | yes | Precedence within role. |
| `title` | string | yes | Plain name. |
| `locator` | string | yes | Page id, ticket key, repo key plus path, file path, URL. Never an absolute `/Users/` path. |
| `version` | string | yes | Page version, `updated` stamp, file sha256, git sha. |
| `pin` | `{sha|null, fetchedAt, pushed|null, dirty|null}` | yes | Pin at acquisition (G3 §2.1). |
| `seal` | `{kind, contentHash, at}` | yes | Content-hash seal for drift (G3 §3.4). |
| `characterisation` | path | after phase 2 | `sources/<id>/characterisation.md`. |
| `unitsFile` | path | after phase 2 | `sources/<id>/units.<id>.json`. |
| `provenanceScheme` | string | yes | Address grammar (`annex:<n>/reg:<ref>`, `h4:<heading>/li:<n>`, `speaker@timestamp`, `path:line@sha`). |
| `absence` | string or null | no | Stated reason when a source yields nothing addressable. |

### 3.4 Increment fields

| Field | Type | Req'd | Kind | Meaning | W | R |
|---|---|---|---|---|---|---|
| `id` | `inc-NNN` | yes | Meta | Stable handle, assigned by the writer, never renumbered (`ingest.js:310-328`). | writer | all |
| `key` | slug | yes | Meta | Readable identity, equals the authored file name (`atoms/<slice>--<slug>` or `combined/<slug>`). | author, writer | all |
| `grain` | `atomic|combined` | yes | Meta | Pass 1 or pass 2 row. | writer | derive, report |
| `members` | `inc-id[]` | combined only | Meta | Atoms this row delivers, resolved from keys, in build order. | writer | planner, acceptance, report |
| `combinedInto` | `inc-id` or null | atomic only | Meta | Set when absorbed. | writer | derive, report |
| `title` | string ≤ 80 chars | yes | Req | Outcome-phrased headline. | author | all |
| `kind` | `capability|rule|content|data|integration|reference-data|hygiene|platform|spike|decision` | yes | Meta | Requirement kind, never an implementation route (Q6). | author | planner (route choice), report |
| `statement` | string | yes | Req | "The system MUST …" in OpenSpec style (`openspec/config.yaml:71-89`). | author | all |
| `statementAsDistilled` | string | yes | Req | Frozen copy at first ingest; the oracle for prose checks (G5 §9 invariant 5). | writer | CLAIM_VERIFIER |
| `why` | string | yes | Req | The need it serves, 1 to 3 sentences. | author | planner, reviewers, report |
| `needRefs` | unit id[] | no | Req | Units stating the need. | author | report |
| `actors` | string[] | no | Req | Who observes the outcome (`importer`, `inspector`, `downstream:ipaffs`). | author | acceptance |
| `surfaces` | `{repo: repoKey, area: string}[]` | yes | Meta | Where, never how. Repo keys index the header. | author, reconciler | branch, baseline, context, ladder, merge |
| `acceptance` | see 3.4.1 | yes (≥1) | Req | Observable criteria. | author, verifier | ticket, planner, reviewers, acceptance, report |
| `constraints` | id[] (`inv-`, `d-`, `sx-`) | no | Req | References only (F P10). | reconcile, applier | planner, reviewers |
| `consistentWith` | `{ref, relation: same-as|variant-of|unlike, divergence}[]` | no | Req | Requirement-grade relation to an existing behaviour (F K16). | author | planner, consistency reviewer |
| `outOfScope` | `{text, why, ref}[]` | no | Req | Narrows the row. | author, applier | planner, plan audit |
| `hints` | `{exemplars[{ref, why}], binding: false}` | no | Meta | Non-binding pointers; the writer forces `binding: false`. | author | planner only |
| `needs` | `{question: q-id, reason}[]` | no | Req | Pre-build questions. An open or outstanding one makes the row unbuildable. | reconcile, panel, judge via writer | derive, report |
| `assumes` | `as-id[]` | no | Req | Defaults this row ships under. | reconcile | planner, acceptance, report |
| `buildableMeanwhile` | string or null | no | Req | What can proceed while blocked (ched-pp `inc-020`). | reconcile | report, planner of sibling rows |
| `checkpoint` | `none|halt-after|walkthrough` | yes | Meta | Post-build human checkpoint (replaces the post-land half of `gate`, Q5). | combiner, Sam | drain |
| `dependsOn` | `inc-id[]` | yes (may be empty) | Meta | Hard ordering, resolved from keys, cycle-checked. | author, combiner | derive |
| `sequencing` | `{id, relation: before|after|not-same-change, why}[]` | no | Meta | Soft ordering that is not a dependency (G5 §8). | reconciler, Sam | derive (warning), planner |
| `size` | `{class: S|M|L, basis}` | yes | Meta | Requirement-level size with stated basis; never gates (Q8). | author, combiner | combiner, report |
| `milestone` | slug or null | no | Meta | Grouping for checkpoints and report. | reconciler | report, drain |
| `provenance` | see 3.4.2 | yes | Meta | Who wrote and verified it, from what. | writer, verifier | report, ingest gate |
| `status` | enum (3.5) | yes | St | Requirement status. | writer only | derive, report |
| `resolution` | `{kind: built|decided|absorbed|superseded|withdrawn, ref, at}` or null | when status is terminal | St | Why it is done or gone. Separates a decision without code from a merged build (C §5.2 inc-060). | writer | report |
| `revision` | integer | yes | Meta | Bumped by every writer change; CAS aid for agents. | writer | writer |
| `notes` | `{text, at, by}[]` | no | Meta | Requirement-level notes only, never build journal. | writer | report |

#### 3.4.1 Acceptance criterion

| Field | Type | Req'd | Meaning |
|---|---|---|---|
| `id` | `ac-N` | yes | Stable within the row. On a combined row it is `<memberKey>/ac-N`. |
| `given`, `when`, `then` | string | yes | Observable only: no files, functions, classes, annotations, CSS classes, test names or commands (S §5.3 AC rule). |
| `witness` | `e2e|fit|unit|contract|review|manual` | yes | Level of proof expected, never a command. |
| `confidence` | `observed|stated|legacy|inferred|gap` | yes | F §7 enum; the writer checks it against source roles (3.4.3). |
| `evidence` | `{unit, source, quote, readAt{sha, blob, dirty}|null}[]` | yes (≥1 unless `gap`) | Verbatim quote carried inline so any executor has it without a lookup (R5). |
| `scenario` | `SCN-…` or null | no | OpenSpec link (F P11). |
| `from` | atom key or null | combined only | Which member it came from. |
| `resolvedBy` | `d-id` or null | no | Decision that fixed its wording. |

#### 3.4.2 Provenance block

`{sources[sourceId], slice, authoredBy{agent, phase, runId}, verifiedBy{agent, phase, runId}, verification: string (non-empty), verdict: stands|corrected|disputed|added, carriedFrom: string|null, supersedes: inc-id|null, mergedFrom: key[]|null}`

The writer refuses: `verifiedBy.agent == authoredBy.agent`; an empty `verification`; `verdict: disputed` on a
`todo` row (a disputed atom is born `blocked` with a question, fixing G5 C7).

#### 3.4.3 Checks the writer runs on every increment

1. At least one AC; every AC has evidence or `confidence: gap` with a linked question or assumption.
2. `stated` needs evidence from a `requirement`-role source; `observed` needs a `prototype`, `trace-corpus` or
   live source; `legacy` needs a `legacy`-role source.
3. A row whose evidence comes only from `constraint`, `consistency-anchor` or `current-behaviour` sources is
   refused unless `kind` is `hygiene` or a decision adopts it (the anti-recipe device, F K3).
4. Recipe lint over `statement`, `why` and every AC: refuses file paths with extensions, `()` call shapes,
   `@Annotations`, `govuk-` CSS classes, backticked commands, `npm run`, line numbers (S §5.3). Overridable
   only by a `decision` that says a route or document shape is contract (for example FA invariant 1).
5. `dependsOn`, `members`, `needs`, `constraints`, `assumes` all resolve; no self references; no cycles over
   `dependsOn` plus `members` (Tarjan SCC; named cycle in the error).
6. No credential-shaped strings (the sonar Read hook would make the file unreadable, H §2.3).

### 3.5 Status enum and buildability

| Status | Meaning | Buildable | Set by |
|---|---|---|---|
| `proposed` | Born from discovered work or critique; not yet verified or combined. | no | `tim backlog propose` |
| `todo` | Verified, unblocked. | yes, if deps done | ingest, rule, applier |
| `blocked` | Has an open or outstanding `needs`, or is disputed. | no | ingest, reconcile, judge |
| `deferred` | Deliberately later; has a `revisitWhen` decision. | no | rule |
| `dropped` | Withdrawn, with `resolution`. | no | rule, applier |
| `combined` | Absorbed into a combined row (`combinedInto`). | no | combine ingest |
| `done` | Terminal, with `resolution.kind` `built` or `decided`. | no | `tim backlog state` on merge/land per strategy, or rule |

**One buildability rule** (`tim backlog next`), replacing the three today (S §3.1): `status == todo` and every
`dependsOn` row is `done` (or `combined` into a `done` row) and no `needs` points at an `open`, `outstanding`
or `must-answer` question and `provenance.verifiedBy` is set and `build/state.json` shows no red without a
retry flag. Unknown statuses are refused by the schema, so nothing can be silently skipped or silently built.

**One "awaiting a ruling" rule** (`tim backlog counts`), replacing the three (G5 §2): a question with status
`open` or `outstanding`. Rows are "waiting on a ruling" when any `needs` points at one.

### 3.6 Question record

| Field | Type | Req'd | Meaning |
|---|---|---|---|
| `id` | `q-<slug>` | yes | Stable handle Sam can answer by. Never an ordinal (G §2). |
| `headline` | string, a question, ≤ 90 chars | yes | Front-loaded plain English. |
| `inPlay` | string | yes | Exactly what changes depending on the answer, in requirement terms. |
| `options[]` | `{id: A.., text, consequence, supportedBy[{source, unit, quote}], count}` | yes (≥2, includes "something else" only when open-ended) | Evidence per option; `count` is how many sources support it (the "two against one" weight, G §1.1). |
| `recommended` | option id or null | yes | Panel or distiller recommendation. |
| `default` | `{option, ifNobodyAnswers}` | yes | What will happen if silent: concrete, stated both ways. |
| `class` | `must-answer|blocking|defaulted` | yes | `must-answer` for security, access control, data integrity, legal, platform (Q35). `defaulted` builds on the default. |
| `category` | `security|access-control|data-integrity|legal|policy|scope|design|copy|technical|process` | yes | Drives `class`. |
| `cluster` | slug | yes | Theme for grouping (SPEC-GATE 780 into 9, G §4.1). |
| `blocks` | inc-id[] | derived | Computed by `tim backlog counts`, never typed. |
| `blastRadius` | `{increments, reversalCost: low|medium|high, why}` | yes | Ranking input. |
| `visual[]` | `{asset, caption, source, unit}` | no | Crops or screenshots from visual sources (Q36). |
| `audience` | `sam|<role>` | yes | Who can answer (G5: `gate` meant audience). |
| `raisedBy` | `{phase, agent, runId, at}` | yes | Provenance of the question itself. |
| `lint` | `{passed, by, at, failures[]}` | yes | QUESTION_CRITIC record. |
| `status` | `open|outstanding|ruled|superseded|withdrawn` | yes | Lifecycle. |
| `decision` | `d-id` or null | yes | Pointer, never a copy of the answer (G §5.2). |

### 3.7 Decision record

| Field | Type | Req'd | Meaning |
|---|---|---|---|
| `id` | `d-<slug>` | yes | Stable. |
| `subject` | `{kind: question|conflict|combination|programme|increment, id}` | yes | What it settles. |
| `option` | option id or null | yes | Chosen option when the subject is a question. |
| `answer` | string | yes | Plain-English resolution, one sentence, rendered in the row it settles. |
| `words` | string or null | yes | The person's verbatim words. Null only for `precedence`/`panel`. |
| `by` | `sam|panel|precedence|<person>` | yes | Who decided. |
| `at` | ISO date | yes | Passed by the caller; the tool never reads the clock (replay-stable, `journey-builder/SKILL.md:72-73`). |
| `reason` | string | yes | Mandatory (`rule-decision.sh:17-19`). |
| `status` | `current|superseded|outstanding` | yes | `outstanding` for "maybe?" answers. |
| `supersedes`, `supersededBy` | d-id or null | yes | Linear chain, never edited in place. |
| `appliesTo` | inc-id[] | no | Group rulings covering several rows (G5 §8). |
| `revisitWhen` | string or null | no | Trigger for a deferral (`deferredSchema.revisitWhen`, `schema.js:164`). |
| `dissent`, `escalated` | string or null, boolean | panel only | From the panel record. |
| `sealedEvidence` | `{source, contentHash}[]` | yes | Seals the ruling was made against; drift shows a ribbon, never invalidates (G3 §4.4). |
| `effects[]` | `{increment, change: unblocked|dropped|superseded|reworded|created|regrouped}` | after apply | Written by the applier, so the report can say what each ruling did. |

### 3.8 Build state (`build/state.json`, not the backlog)

`{ increments: { "<inc-id>": { phase, attempt, executor{<stageRole>: claude|codex}, plan{md, json, sha},
ticket, branch, commits[{repo, sha}], prs[{repo, url, number, merged, sha}], red{kind, stage, at, detail}|null,
retry: boolean, acceptance{met, unmet, unverifiable, at}, reviewCoverage{files, style, code, consistency},
discovered[] , reportRenderedAt } } }`

`phase` ∈ `planned|implementing|reviewed|laddered|accepted|landed|pr-open|ci-green|merged`. Red kinds:
`baseline-red, sync-blocked, plan-refused, implement-failed, stage-dead, acceptance-red, ladder-red, ci-red,
e2e-red, merge-blocked, platform-blocked`. `retry` is the human re-entry flag (FA `*-retry`, `FA:537-558`).
`commit` for parity-profile rows is mirrored as a string on the row by the parity profile only (G5 §9 inv 3).

### 3.9 Worked examples

#### Example A: atomic

```json
{
  "id": "inc-014",
  "key": "origin--country-narrows-to-strictest-line",
  "grain": "atomic",
  "members": [],
  "combinedInto": null,
  "title": "Country of origin narrows to the strictest commodity line",
  "kind": "rule",
  "statement": "The system MUST only accept a country of origin that every commodity line on the notification permits.",
  "statementAsDistilled": "The system MUST only accept a country of origin that every commodity line on the notification permits.",
  "why": "Ware potatoes may only come from four countries under the regulation. A notification that mixes lines must not let a forbidden origin through.",
  "needRefs": ["phnns-policy#annex:5/reg:24A(1)(b)"],
  "actors": ["importer"],
  "surfaces": [{ "repo": "plants-frontend", "area": "origin" }, { "repo": "animals-tests", "area": "plants-journey" }],
  "acceptance": [
    {
      "id": "ac-1",
      "given": "a notification carries a ware-potato commodity line",
      "when": "the user chooses a country outside Poland, Portugal, Romania and Spain",
      "then": "the country is rejected with a message naming those four countries",
      "witness": "e2e",
      "confidence": "stated",
      "evidence": [
        { "unit": "phnns-policy#annex:5/reg:24A(1)(b)", "source": "phnns-policy", "quote": "originate in Poland, Portugal, Romania or Spain", "readAt": null }
      ],
      "scenario": "SCN-PLANTS-OB-ORIGIN-003-A",
      "from": null,
      "resolvedBy": null
    }
  ],
  "constraints": ["inv-copy-in-both-languages"],
  "consistentWith": [
    { "ref": "live-animals:origin/country-of-origin", "relation": "variant-of", "divergence": "the list is narrowed by commodity" }
  ],
  "outOfScope": [{ "text": "Checking the destination address territory", "why": "ruled separately", "ref": "d-territory-check" }],
  "hints": { "exemplars": [{ "ref": "repos/trade-imports-animals-frontend origin feature", "why": "same page shape" }], "binding": false },
  "needs": [],
  "assumes": [],
  "buildableMeanwhile": null,
  "checkpoint": "none",
  "dependsOn": ["inc-011"],
  "sequencing": [],
  "size": { "class": "S", "basis": "1 AC, 1 surface, no new data" },
  "milestone": "m-core-journey",
  "provenance": {
    "sources": ["phnns-policy", "confluence-requirements"],
    "slice": "origin",
    "authoredBy": { "agent": "author:origin", "phase": "author", "runId": "wf_1" },
    "verifiedBy": { "agent": "verifier:origin", "phase": "verify", "runId": "wf_1" },
    "verification": "Quote checked against units.phnns-policy.json; the four countries match the annex; no conflicting unit in confluence-requirements.",
    "verdict": "stands",
    "carriedFrom": null,
    "supersedes": null,
    "mergedFrom": null
  },
  "status": "todo",
  "resolution": null,
  "revision": 1,
  "notes": []
}
```

#### Example B: combined (cross-repo lockstep inside one acceptance boundary)

```json
{
  "id": "inc-052",
  "key": "transport--transporter-details-captured-and-kept",
  "grain": "combined",
  "members": ["inc-031", "inc-032", "inc-033"],
  "combinedInto": null,
  "title": "Importers give transporter details once and they are kept",
  "kind": "capability",
  "statement": "The system MUST let an importer record the transporter's name, address and approval number, keep them with the notification, and show them back unchanged.",
  "statementAsDistilled": "The system MUST let an importer record the transporter's name, address and approval number, keep them with the notification, and show them back unchanged.",
  "why": "Inspectors need to contact the transporter. Three atoms describe one journey slice that a person would build and review as one change.",
  "needRefs": ["confluence-requirements#h4:Transport/li:1"],
  "actors": ["importer", "inspector"],
  "surfaces": [
    { "repo": "animals-backend", "area": "notification-document" },
    { "repo": "animals-frontend", "area": "transport" },
    { "repo": "animals-tests", "area": "transport-journey" }
  ],
  "acceptance": [
    { "id": "transport--transporter-page/ac-1", "given": "an importer on the transporter question", "when": "they submit a name, address and approval number", "then": "the next question in the journey is shown", "witness": "e2e", "confidence": "stated", "evidence": [{ "unit": "confluence-requirements#h4:Transport/li:1", "source": "confluence-requirements", "quote": "Transporter name, address and approval number", "readAt": null }], "scenario": null, "from": "transport--transporter-page", "resolvedBy": null },
    { "id": "transport--transporter-kept/ac-1", "given": "a saved notification with transporter details", "when": "the notification is read back", "then": "the transporter details are returned exactly as entered", "witness": "contract", "confidence": "inferred", "evidence": [{ "unit": "confluence-requirements#h4:Transport/li:1", "source": "confluence-requirements", "quote": "Transporter name, address and approval number", "readAt": null }], "scenario": null, "from": "transport--transporter-kept", "resolvedBy": null },
    { "id": "transport--approval-number-format/ac-1", "given": "an approval number that is not in the published format", "when": "the importer submits it", "then": "an error names the expected format", "witness": "fit", "confidence": "stated", "evidence": [{ "unit": "phnns-policy#section:transport/para:3", "source": "phnns-policy", "quote": "a valid transporter approval number", "readAt": null }], "scenario": null, "from": "transport--approval-number-format", "resolvedBy": "d-approval-number-format" }
  ],
  "constraints": ["inv-copy-in-both-languages", "inv-no-shared-package"],
  "consistentWith": [{ "ref": "live-animals:transport/transporter", "relation": "same-as", "divergence": "" }],
  "outOfScope": [{ "text": "Looking up transporters from a register", "why": "parked", "ref": "sx-transporter-register" }],
  "hints": { "exemplars": [], "binding": false },
  "needs": [],
  "assumes": ["as-error-summary-title-default"],
  "buildableMeanwhile": null,
  "checkpoint": "none",
  "dependsOn": ["inc-020"],
  "sequencing": [],
  "size": { "class": "M", "basis": "3 ACs, 3 surfaces in 3 repos, one journey boundary" },
  "milestone": "m-core-journey",
  "provenance": {
    "sources": ["confluence-requirements", "phnns-policy"],
    "slice": "transport",
    "authoredBy": { "agent": "combiner", "phase": "combine", "runId": "wf_4" },
    "verifiedBy": { "agent": "combine-verifier", "phase": "combine", "runId": "wf_4" },
    "verification": "Members share one acceptance boundary (the transport journey slice) and one repo set; a red in the backend half is attributable by the contract witness; 3 surfaces is within the ceiling.",
    "verdict": "stands",
    "carriedFrom": null,
    "supersedes": null,
    "mergedFrom": ["transport--transporter-page", "transport--transporter-kept", "transport--approval-number-format"]
  },
  "status": "todo",
  "resolution": null,
  "revision": 1,
  "notes": []
}
```

The three members stay in `increments[]` with `status: combined` and `combinedInto: inc-052`. Their ACs are
carried into the combined row with `from` set, so the row is self-contained for any executor.

#### Example C: born blocked with a must-answer question

```json
{
  "id": "inc-061",
  "key": "dashboard--notifications-list-scoped-to-owner",
  "grain": "atomic",
  "members": [],
  "combinedInto": null,
  "title": "The notifications list shows only notifications the user may see",
  "kind": "rule",
  "statement": "The system MUST list only the notifications that belong to the signed-in user's scope.",
  "statementAsDistilled": "The system MUST list only the notifications that belong to the signed-in user's scope.",
  "why": "Listing another organisation's notifications is a data-isolation failure, not a cosmetic one.",
  "needRefs": ["jira-eudpa-512#description/para:2"],
  "actors": ["importer"],
  "surfaces": [{ "repo": "animals-backend", "area": "notification-search" }, { "repo": "animals-frontend", "area": "dashboard" }],
  "acceptance": [
    { "id": "ac-1", "given": "two users in different organisations each with a notification", "when": "either user opens their dashboard", "then": "only notifications within that user's scope are listed", "witness": "e2e", "confidence": "gap", "evidence": [], "scenario": null, "from": null, "resolvedBy": null }
  ],
  "constraints": [],
  "consistentWith": [],
  "outOfScope": [],
  "hints": { "exemplars": [], "binding": false },
  "needs": [{ "question": "q-notification-list-scope", "reason": "the scope itself is not stated by any source" }],
  "assumes": [],
  "buildableMeanwhile": "The dashboard layout (inc-059) can be built; it must not ship a list endpoint.",
  "checkpoint": "halt-after",
  "dependsOn": [],
  "sequencing": [{ "id": "inc-059", "relation": "after", "why": "layout first" }],
  "size": { "class": "M", "basis": "1 AC, 2 surfaces, data-access rule" },
  "milestone": null,
  "provenance": {
    "sources": ["jira-eudpa-512", "animals-backend-code"],
    "slice": "dashboard",
    "authoredBy": { "agent": "author:dashboard", "phase": "author", "runId": "wf_1" },
    "verifiedBy": { "agent": "verifier:dashboard", "phase": "verify", "runId": "wf_1" },
    "verification": "No requirement-role source states the scope; the backend code (current-behaviour role) lists unscoped. Recorded as gap with a must-answer question.",
    "verdict": "stands",
    "carriedFrom": null,
    "supersedes": null,
    "mergedFrom": null
  },
  "status": "blocked",
  "resolution": null,
  "revision": 1,
  "notes": []
}
```

With its question in the header:

```json
{
  "id": "q-notification-list-scope",
  "headline": "Whose notifications should the dashboard list?",
  "inPlay": "Which notifications a signed-in user can see on the dashboard and through the search endpoint.",
  "options": [
    { "id": "A", "text": "Only notifications the user created", "consequence": "colleagues in one organisation cannot see each other's work", "supportedBy": [], "count": 0 },
    { "id": "B", "text": "Every notification in the user's organisation", "consequence": "matches how agents work today; needs the organisation id on every notification", "supportedBy": [{ "source": "jira-eudpa-512", "unit": "jira-eudpa-512#comments/3", "quote": "anyone in the business should see them" }], "count": 1 },
    { "id": "C", "text": "Something else", "consequence": "state the rule", "supportedBy": [], "count": 0 }
  ],
  "recommended": "B",
  "default": { "option": null, "ifNobodyAnswers": "Nothing that lists notifications is built. The dashboard ships without a list." },
  "class": "must-answer",
  "category": "access-control",
  "cluster": "access-and-sign-in",
  "blocks": ["inc-061"],
  "blastRadius": { "increments": 1, "reversalCost": "high", "why": "a wrong scope leaks data between organisations" },
  "visual": [],
  "audience": "sam",
  "raisedBy": { "phase": "reconcile", "agent": "reconciler", "runId": "wf_2", "at": "2026-09-18" },
  "lint": { "passed": true, "by": "question-critic", "at": "2026-09-18", "failures": [] },
  "status": "open",
  "decision": null
}
```

A `must-answer` question has no default option: the builder refuses anything it blocks until a person rules.

### 3.10 Proof that nothing is recipe-shaped or executor-specific

| Field group | Classification | Why it is not a recipe | Why it is not executor-specific |
|---|---|---|---|
| `title`, `statement`, `why`, `acceptance`, `actors`, `needRefs` | Req | Observable, cited, recipe-linted by the writer (3.4.3 check 4) | Plain text any model reads |
| `constraints`, `invariants`, `consistentWith`, `outOfScope`, `assumes`, `scopeExclusions`, `deviations` | Req | Relations and limits, never "copy file X" | Plain data |
| `questions`, `decisions`, `conflicts`, `needs`, `buildableMeanwhile` | Req | Decisions about what, never how | Plain data |
| `surfaces`, `repos`, `lifecycle`, `sources`, `precedence` | Meta | Where and under what policy, never which files | No skill names, model tiers, flags, briefs or schemas |
| `repos[*].ladder` | Meta | Script names the repo already owns (FA ladder, `FA:973-1001`); expanded to commands by the workflow | Both executors run npm scripts |
| `hints` | Meta | Forced `binding: false`; planner-only | Plain data |
| `id`, `key`, `grain`, `members`, `combinedInto`, `dependsOn`, `sequencing`, `size`, `milestone`, `checkpoint`, `provenance`, `revision` | Meta | Identity, order and audit | Plain data |
| `status`, `resolution`, `notes` | St | Requirement state only | No executor recorded here; that is `build/state.json` |

Absent by design: `filesToTouch`, `verification`, `recipe`, `implementorSkill`, `type` as a `frontend-change`
mode, `obligations`, `flowChanges`, `schemaFields`, `copyKeys`, `specs`, `sizeGuess` as a gate, `band` as a
router, `executor`, `model`, `brief`, `outputSchema`, `sandbox`, `plan`. The v2 zod schema is
subtractive-strict on the header and increments: any of those keys is **refused** (not passed through), which is
the mechanical form of R1 and R5. Parity-profile backlogs keep their own schema (`schema.js:112-135`) until
migrated.

---

## 4. Writer and tooling

### 4.1 `tim backlog`: generalise, do not rewrite

Lift the domain-free core out of `tim/src/parity/` into `tim/src/backlog/core/`, and make parity a profile
of it (G2 §4). Parity's own tests stay green throughout as the behaviour-preservation proof (35 in
`ingest.test.js`, plus `set`, `schema`, `io` tests), and `report.contract.test.js` keeps parsing the tracked
EUDPA-328 backlog (G5 §6).

| Core module | Lifted from | Change |
|---|---|---|
| `core/io.js` | `io.js:19-55` | Unique temp name (`.<name>.<pid>.<rand>.tmp`), exclusive lock file, CAS on `sha256` (4.3) |
| `core/ids.js` | `assignIds`, `ingest.js:294-328` | Unchanged semantics; id pattern from profile |
| `core/refs.js` | `resolveRelatedTo`, `ingest.js:336-388` | Generalised to any ref field list: `dependsOn`, `members`, `needs`, `constraints`, `assumes`, `relatedTo` |
| `core/graph.js` | new | Tarjan SCC over `dependsOn` ∪ `members`; names the cycle |
| `core/merge.js` | `refreshed`/`born`, `ingest.js:418-446` | Owned-field lists from profile |
| `core/guards.js` | `ruled()`, `ingest.js:454-461, 526-582` | "Ruled" = has a decision or status other than `todo`/`proposed`, or build state beyond `planned` |
| `core/schema.js` | `schema.js` passthrough idiom | Profile supplies strictness |
| `profiles/parity.js` | `corpus-profile.js`, `FINDING_TYPES`, `PROSE_SLOTS` | Unchanged behaviour |
| `profiles/v2.js` | new | The schema in section 3, subtractive-strict |

### 4.2 Commands

All take a workarea (`shared/<programme>`) or an explicit `--backlog <path>`, and `--json`. None constructs a
`workareas/journey-builder/EUDPA-*` path (G5 §4).

| Command | Does | Replaces |
|---|---|---|
| `tim backlog init <wa> --from-file header.json` | Creates a v2 backlog with validated header | hand-written headers |
| `tim backlog validate <wa> [--strict]` | Schema, refs, cycles, recipe lint, credential scan, role/confidence checks | `jq empty` |
| `tim backlog ingest <wa> --grain atomic|combined [--dry-run] [--require-verification]` | Reads `atoms/*.json` or `combined/*.json`, assigns ids, resolves refs, merges without losing rulings, refuses to strike ruled or started rows, freezes `statementAsDistilled`, marks members `combined` | `tim parity ingest`, `backlog-generate.sh`, combination hand edits |
| `tim backlog set <wa> <id> <field> --from-file f` | One requirement field on one row; refuses frozen, state and unknown fields | `set-slot`, free-hand Edit |
| `tim backlog status <wa> <id> <status> --reason r --at d` | Legal transitions only (table in `assets/status-transitions.json`) | `backlog-set-status.sh`, jq |
| `tim backlog question add|set <wa> --from-file q.json` | Adds or updates a question; runs question lint | 5 question shapes (S §4.5) |
| `tim backlog rule <wa> <q-id> (--option X | --answer "…") --words "…" --by sam --at 2026-09-18 --reason "…" [--outstanding] [--revisit-when "…"] [--applies-to inc-a,inc-b]` | Appends a decision, links it, flips question status; never touches rows (the applier does) | `rule-decision.sh`, `spec-add-decision.sh`, FA ruling stages |
| `tim backlog decide <wa> --from-file d.json` | Panel/precedence decisions (the applier's write) | `spec-add-decision.sh` |
| `tim backlog apply <wa> --from-file effects.json` | Applies a ruling's effects (unblock, drop, supersede, create proposed) atomically, recording `effects[]` | EUDPA-409 `APPLIER-BRIEF.md` hand edits |
| `tim backlog propose <wa> --from-file discovered.json --from inc-id` | Discovered work → `proposed` atoms with `sequencing` to their source | `DEFERRED:` grep and hand appends (C §2.6) |
| `tim backlog next <wa> [--ids inc-012..inc-020] [--json]` | The one buildability rule; reports why each withheld row is withheld | build-orchestrator jq, `next-increment.sh`, FA baseline agent |
| `tim backlog graph <wa> --check` | Cycles, dangling refs, orphan members | nothing |
| `tim backlog counts <wa> [--json]` | N of TOTAL (P%) with deferred named separately; awaiting-ruling by one rule; derived `blocks` | `decision-counts.sh`, `backlog-counts.sh`, `counts.js` |
| `tim backlog state get|set|append <wa> <id> <field> --from-file f` | Build state writes; `set` of a phase checks the phase order | loop and FA recorder jq |
| `tim backlog migrate <path> --from loop-v1|parity|trace|fa-stages --to <wa>` | Mechanical translation (section 10) | nothing |

### 4.3 Lost-update protection

1. Every write takes an exclusive lock: `fs.openSync('<backlog>.lock', 'wx')` holding pid and command; stale
   locks older than a profile limit whose pid is gone are reclaimed with a note. Retries three times with
   back-off inside the command (a committed tool polling, not an agent sleeping).
2. Inside the lock the writer re-reads, applies, validates, writes a unique temp file and renames.
3. Optional `--expect-sha <sha256>` refuses when the file changed since the caller read it (the CAS token G2
   §3.8 names). Agents that read then decide pass it.
4. `build/state.json` has its own lock, so recorders never contend with the distiller.
5. The drain parent serialises its own state writes; parallel review agents never write state (they return
   schema output; one watcher records).

### 4.4 Id stability

- Identity is the authored file key; `inc-NNN` is the handle; neither changes on re-ingest (`ingest.js:310-328`).
- A combined row's key is its `combined/<slug>` file. Re-combining that produces the same slug keeps the id; a
  new grouping gets a new id, and the old combined row is dropped with `resolution.kind: superseded` **only if**
  it has not started (guards). A started combined row cannot be regrouped; the combiner is told so and records
  "left alone: already started".
- Carryover lineage (`carriedFrom`) keys on content, as `carry-forward.js:14-36` does.

### 4.5 `tim distil` (pipeline checks and report)

| Command | Does | Lifted from |
|---|---|---|
| `tim distil phase status|start|done|gate|reset <wa>` | Phase ledger with the table as data (`.claude/skills/requirements-distiller/assets/phases.json`); `done` needs prerequisites, a note and an artefact fingerprint; `reset` cascades to dependants; `gate` exits 1 naming what is missing | `tools/parity/phase.sh:29-173` (fixes G1 §2.4) |
| `tim distil acquire <wa> <source-id>` | Fetches Confluence (`tim confluence page`), Jira (`tim jira ticket/comments`), web, files; stores raw, version, seal | `prepare-refinement.sh`, `prepare-digest.sh` |
| `tim distil heads <wa> [--write] [--strict]` | Pins every repo by key; `--strict` exits non-zero on `moved` or dirty-at-start | `heads.js` (fixes G3 §1.4) |
| `tim distil seal <wa> [--check]` | Content-hash seals for every source kind | `seals.js` algorithm, generalised record (G3 §3.4) |
| `tim distil units <wa> --ingest|--strict` | Validates per-source units, merges into `units.json`, proves every source has units or a stated absence and an extract-verify record | `coverage.js` |
| `tim distil crop <wa> <source> <unit> --box x,y,w,h` | Crops a region of an image source for visual evidence (sharp) | `rules.mural.md:44-48` region scheme |
| `tim distil slices <wa> --strict` | Every unit in exactly one slice; exactly one `crossCutting: true` slice | `slices.js:121-263` |
| `tim distil yield <wa> --strict` | Thin slices under 0.4 of the median cited-units per owned unit; homeless, strayed, unverified atoms; cross-cutting slice exempt | `yield.js` |
| `tim distil trace <wa> --strict` | Trace-matrix closure: every unit is cited, ruled not a requirement, a conflict side, excluded or a duplicate | new, on `coverage.js` set algebra |
| `tim distil duplicates <wa> --all` | All-pairs candidates on wording, shared units, shared surfaces, shared decisions | `duplicates.js` (fixes cross-slice default) |
| `tim distil combine-candidates <wa>` | Requirement-level pair scores (4.6) with the rule each pair meets or breaks | new |
| `tim distil questions <wa> --lint` | Mechanical question lint (6.4) | new |
| `tim distil report <wa> [--build] [--artifact]` | Renders the report (section 6) | `render/{page,card,sections,theme,prose}.js` |
| `tim distil drift <wa>` | Seals and heads drift since last render | `check-evidence.js:21-36`, `seals.js` |

### 4.6 Combine candidate scoring (requirement signals only)

For every pair of verified, unstarted atoms: shared `surfaces` area (+3), identical repo set (+2), same
`consistentWith` ref (+2), shared decision or assumption (+1 each), same milestone (+1), one is `dependsOn` the
other with no third row between (+2), same acceptance boundary (both e2e witnesses on one journey slice, +2),
wording Jaccard ≥ 0.3 (+1). Hard exclusions, printed with the rule: across a `needs` boundary, across a
milestone, either row started or ruled to stand alone, cross-cutting slice members, combined ACs above the
ceiling. The COMBINER judges; the score only orders candidates.

### 4.7 Other commands

| Command | Does |
|---|---|
| `tim rules match <path…> [--root <wa>] --json` | Reads every `.claude/rules/*.md` under the workspace, `tim/.claude/rules/`, and each repo's `.claude/rules/` live; matches `paths:` globs (picomatch); returns matched rule files, the best-practice files each rule points to (parsed from `docs/best-practices/…` references in the body), and the nearest `CLAUDE.md` chain with `@` imports (the probe showed Claude receives `tim/CLAUDE.md` and its imports, `rules-probe.md:10`). A new rule file is picked up with no code change (rules-probe §4). |
| `tim build executor set <wa> --ids inc-012..inc-020 --executor codex [--stages plan,implement,…]` | Writes `build/run.json` overrides; ranges resolve over ids in backlog order |
| `tim build executor show <wa> [--id inc-015] --json` | Resolved binding table for an increment |
| `tim build stage-result check <schema> <file>` | Validates a Codex last-message file against the shared stage schema; exit 0/1 |
| `tim build scan --secrets --repo <path> --base <ref>` | Credential-pattern scan over the increment's diff (explicit replacement for the session-level sonar hooks) |
| `tim build compare <wa> <inc-a> <inc-b>` | Parity proof report (8.10) |

`tools/build/stage-context.sh <wa> <inc-id> <repoKey> <file…>` is a thin bash composer, because the review and
style routers are bash owned by those skills and tim may not shell out to `tools/` (`tim/CLAUDE.md` hard
rules). It calls, per file: `tools/style/file-topics.sh <file>` (code-style's own router), then
`tools/style/bake-rules-bundle.sh BUILD-<programme>-<inc> <repo> <topic>` (code-style's own baker), then
`tools/review/detect-tech.sh <repoPath>` (review's own tech detection), then `tim rules match`. It prints one
JSON document to `build/context/<inc>.json` (8.5).

---

## 5. The distiller skill

### 5.1 Identity

- **Name:** `requirements-distiller`.
- **Description (for SKILL.md frontmatter):** Distil loose requirements from any mix of sources (Confluence,
  Jira, documents, images and design boards, transcripts and chat, repos and prototypes, trace corpora,
  OpenSpec, an existing backlog) into a verified, two-pass `backlog.json` of requirement-shaped increments and a
  decision-led report; take rulings back in and re-derive. Triggers: "distil requirements", "turn these sources
  into a backlog", "gather the requirements for", "resume the distillation", "rule the distillation", "apply my
  rulings", "re-distil", "regenerate the distillation report", "absorb this backlog". NOT for building
  increments (backlog-builder), NOT for a two-sided comparison corpus (parity), NOT for one Jira ticket
  (ticket-creator / ticket-refiner).
- **Modes (printed by `start-distil.sh` as `MODE:`):**
  - `NEW`: interview, scaffold workarea, run phases 0 to 18.
  - `RESUME`: `tim distil phase status` names `Next:`; continue.
  - `RULE`: capture rulings (answer sheet or page batch), then phases apply-rulings → 17 → 18.
  - `REDISTIL`: a source changed (seal drift or a new version): re-acquire, carryover, re-run from phase 2 for
    that source only, re-verify affected atoms.
  - `ABSORB`: an existing backlog (loop v1, trace, FA stages, parity corpus) becomes a source; carryover
    decides carries, retires, changes, rechecks.
  - `REPORT`: re-render only.

### 5.2 Phases in order

Each phase has a ledger row `phase|needs|what`, an artefact fingerprint, and a runner. "WF" means a
`distil.js` launch with `args.phase`; "MS" means main session; "tim" means a command the main session runs.

| # | Phase | Needs | Runner | Model | Output | Gate to pass |
|---|---|---|---|---|---|---|
| 0 | `setup` | none | MS interview | session | `backlog.json` header skeleton, `REQUIREMENT-CONTRACT.md` from template, sources registered with role, tier, type | contract sections present (not yet whole) |
| 1 | `acquire` | setup | tim | none | raw copies, `version`, `pin`, `seal` per source; `heads.json` | `tim distil heads --strict`; every source acquired or stated absent |
| 2 | `characterise` | acquire | WF, 1 agent per source (≤6 concurrent) | Sonnet; Opus for `docx`, `pdf`, `transcript`, `design-canvas` | `characterisation.md` (structure found, what could not be read, pointers not followed), `units.<id>.json` with verbatim unit text, provenance token, crop boxes for visual units, utterance class for conversation | every unit has id, text, token |
| 3 | `extract-verify` | characterise | WF, a different agent per source | Sonnet (Opus for the Opus-characterised types) | `verification/source-<id>.json`: per-unit `stands|corrected|missing-added|garbled|split|merged`, plus "what I searched for" | `tim distil units --strict` (every source has a verify record; no unit unverified) |
| 4 | `units` | extract-verify | tim | none | `units.json` | exit 0 |
| 5 | `carryover` | units | WF, 1 agent (only if a previous run or ABSORB) | Opus | `carryover.json` carries/retired/changed/recheck with the settling unit | every previous row has a verdict |
| 6 | `slice` | units | WF 1 agent + tim | Opus | `slices.json` (each slice: units from all sources, a brief, and a `crossCutting` flag on exactly one) | `tim distil slices --strict` |
| 7 | `contract` | slice, carryover | MS | session | `REQUIREMENT-CONTRACT.md` whole: roles, precedence per fact kind, "what is not a requirement", volatile values, firewall, paid-for knowledge, slice briefs | no `PER-RUN` marker left (template rule, `FINDING-CONTRACT.template.md:10-25`) |
| 8 | `author` + `verify` | contract | WF `pipeline()`: author then verifier per slice, 3 slices in flight | Opus author, Opus verifier (≤6 Opus) | `atoms/<slice>--<slug>.json`, `notRaised[]`, `premisesDisproved[]`, `verification/slice-<id>.json` with a verdict per atom including untouched ones | every atom has `verifiedBy ≠ authoredBy` |
| 9 | `yield` | verify | tim, then WF gap-close auditors for flagged slices | Opus auditor + separate Opus verifier for its additions | extra atoms or a written "genuinely quiet because…" | `tim distil yield --strict` |
| 10 | `trace` | yield | tim | none | trace matrix | `tim distil trace --strict` exit 0 |
| 11 | `reconcile` | trace | WF, 1 agent | Opus | `conflicts`, `precedence` picks, `assumptions`, lifted `invariants`, disputed atoms marked, draft questions | every cross-source disagreement has a conflict record; every `gap` AC has a question or assumption |
| 12 | `panel` | reconcile | WF, dockets of 3 judges + chair, one docket in flight; then 1 critic | Opus (4 concurrent + critic after) | `panel/<docket>.json` with rulings, dissent, escalate; `panel/critic.json` | every docket item has exactly one ruling or escalation (EUDPA-409 critic rule); breaches of standing rulings are zero or escalated |
| 13 | `dedupe` | panel | tim + WF 1 agent | Opus | absorptions recorded in survivors; nothing deleted | every candidate judged, "what I looked at" non-empty |
| 14 | `ingest-atoms` | dedupe | tim | none | atomic rows in `backlog.json` | `tim backlog ingest --grain atomic --require-verification` + `validate --strict` |
| 15 | `critique` | ingest-atoms | WF, 1 fresh agent with the contract, units and backlog, never the authors' notes | Opus | `critique.json`: gaps, blind spots per source kind, "what this method cannot see", counter-numbers | new atoms go back through phase 8 for their slice (bounded to two rounds); blind spots become report text |
| 16 | `questions` | critique | WF: QUESTION_EDITOR then QUESTION_CRITIC; tim lint | Opus editor, Sonnet critic | question records through `tim backlog question add` | `tim distil questions --lint`; critic passes each |
| 17 | `combine` | questions | tim candidates → WF COMBINER → WF COMBINE_VERIFIER → tim ingest | Opus combiner, Sonnet verifier | `combined/*.json`, `combination` header record | every atom is standalone or in exactly one combined row; every candidate applied or declined with reason |
| 18 | `report` | combine | tim render → WF CLAIM_VERIFIER + COPY_EDITOR over machine-written prose fields → tim re-render | Sonnet | `report/` | prose verifier record on every machine-written field; counts derived |
| R1 | `apply-rulings` | report and at least one new decision | WF RULING_APPLIER (1 Opus) then tim apply | Opus | `effects.json` → `tim backlog apply` | every new decision has effects or "no effect because…" |
| R2 | re-run 17, 18 | apply-rulings | as above | as above | refreshed backlog and report | as above |

### 5.3 Completeness proofs (all mechanical, all in the report)

| Proof | Command | Fails when |
|---|---|---|
| P1 Every source read | `tim distil units --strict` | a source has no units and no stated absence, or no extract-verify record |
| P2 Every unit owned once | `tim distil slices --strict` | a unit in 0 or 2+ slices; not exactly one cross-cutting slice |
| P3 No truncated author | `tim distil yield --strict` | a slice under 0.4 of the median, or strayed/homeless/unverified atoms |
| P4 Every unit accounted for | `tim distil trace --strict` | a unit neither cited nor ruled not a requirement, a conflict side, excluded, or a duplicate |
| P5 Every AC evidenced or questioned | `tim backlog validate --strict` | an AC with no evidence and no gap link; a confidence inconsistent with source role |
| P6 Cross-cutting stated once | `tim backlog validate --strict` (AC text in 3+ rows) | the same AC wording repeats instead of an invariant ref |
| P7 Independent verification | writer | `verifiedBy == authoredBy`, or empty verification |
| P8 Questions closed | `tim distil questions --lint` | a `gap` AC or `needsPerson` conflict with no question; a question failing lint |
| P9 Combination accounted | `tim backlog validate --strict` | an atom in 2 combined rows, or a candidate with no decision |
| P10 Evidence still true | `tim distil drift` | a seal or head moved since phase 1 (reported, not blocking; blocks only for cited code blobs that changed) |

### 5.4 Conflict adjudication and escalation

- **Precedence first.** The reconciler applies `precedence[]` per fact kind and records every pick as a
  conflict with `resolution.by: precedence`. These go to the report's "calls we made" section, reversible.
- **Panel when precedence cannot settle.** Dockets are themed groups (EUDPA-409 `panel-rulings.json` D1..D8).
  Three judges rule independently, the chair reconciles, each ruling carries rationale citing units, dissent,
  and `escalate`.
- **The panel may settle:** wording, values and flow where tier-1 sources agree and a tier-2 source differs;
  choices between equivalent designs; anything a standing ruling already covers.
- **The panel must escalate (becomes a question, never a panel decision):** security, access control, data
  integrity, legal or regulatory interpretation, scope (adding or removing a capability), platform or CDP
  changes (memory `feedback_no_ai_on_cdp_platform_repos`), anything contradicting a standing ruling, anything
  with high reversal cost (more than one increment rebuilt), and any ruling with dissent in one of those
  categories.
- **Critic** (`panel-critic.json` shape): cross-docket contradictions, vocabulary drift, standing-ruling
  breaches, each with a proposed fix; breaches become escalations.
- **Cap:** four Opus panel agents at once (3 judges + chair), dockets serial within a launch, critic after;
  total concurrent Opus in the workflow ≤ 6 (S §7.4).

### 5.5 Question quality

QUESTION_EDITOR (Opus) turns raw questions (from reconcile, panel escalations, critique, gap ACs, judge
deferrals later) into records:

1. **Cluster** raw questions into themes and **merge** duplicates (one decision, many callers; the 16
   etag blocks collapse to one, F P5).
2. **Split** anything that is two decisions.
3. **Write the four parts**: headline as a question, in play in requirement terms, options with the units that
   support each and the count, "if nobody answers" stated as a concrete consequence (G §1.1).
4. **Class** by category: must-answer, blocking, defaulted. Prefer `defaulted` with an assumption wherever the
   options do not change *what* is built (F K22, P8).
5. **Rank** by blast radius (increments blocked × reversal cost), must-answer first.
6. **Attach visuals** from the units the options cite.

QUESTION_CRITIC (a different agent) fails a question that: is not a question; bundles two decisions; has
options that overlap or leave an obvious answer out; states no default or a vague one ("further discussion");
uses an id or unexplained abbreviation in place of a headline; cannot be answered by its audience; or restates
a settled decision. `tim distil questions --lint` checks the mechanical parts (lengths, ≥2 options, evidence
per option, default present unless must-answer, cluster set, `blocks` non-empty or a reason).

### 5.6 Personas (references)

All under `.claude/skills/requirements-distiller/references/`, spawned as `general-purpose` with the GUARD
RAILS block inlined at the top of the prompt.

| Persona | Adapted from | Key rules carried over |
|---|---|---|
| `SOURCE_CHARACTERISER.md` | `SOURCE_EXTRACTOR.md:1-47` (method only), parity `SCREEN_ENUMERATOR.md` | characterise first; verbatim units; say what could not be read; pointers not followed become units of type `pointer` |
| `EXTRACT_VERIFIER.md` | trace Verify `:850-927`, parity `FINDING_VERIFIER.md` | "do not invent corrections to seem useful"; per-unit verdict; what you searched for |
| `CARRYOVER_TRIAGER.md` | parity `SKILL.md:667-690` | carries/retired/changed/recheck with the settling unit |
| `SLICER.md` | parity slices practice, `dr1c-parity/slices.json` | slices own units from all sources; one cross-cutting owner; briefs per slice |
| `REQUIREMENT_AUTHOR.md` | `FINDING_AUTHOR.md`, trace extract rules `:168-179` | "and also" = two atoms; verbatim or gap; observable ACs; never write backlog.json; return `notRaised[]`, `premisesDisproved[]` |
| `REQUIREMENT_VERIFIER.md` | `FINDING_VERIFIER.md:36-108` + recipe detector + ticket-refiner AC rubric (Present/Testable/Complete/Unambiguous, `ticket-refiner/SKILL.md:121-127`) | never verify your own slice; missing requirement is a finding; a verification line on every atom |
| `GAP_AUDITOR.md` | DR1C coverage auditors | justify quiet or add |
| `RECONCILER.md` | `SPEC_RECONCILER.md` minus model mapping (F P7), `RECONCILER-BRIEF.md:30-36` | precedence per fact kind; every disagreement a conflict; do not force-fit |
| `PANEL_JUDGE.md`, `PANEL_CHAIR.md`, `PANEL_CRITIC.md` | EUDPA-409 `panel/README.md`, `panel-*.json` | escalation rules in 5.4 |
| `DUPLICATE_SWEEPER.md` | parity `DUPLICATE_SWEEPER.md:55-102` | "would one person, doing one piece of work, close both?"; never delete |
| `COMPLETENESS_CRITIC.md` | trace Critic `:1435-1443`, `ched-p/completeness-critique.md` | honest counter-numbers; what the method cannot see |
| `QUESTION_EDITOR.md`, `QUESTION_CRITIC.md` | `c0f99985` question shape, Ralph PRD `SKILL.md:24-55` | 5.5 |
| `COMBINER.md`, `COMBINE_VERIFIER.md` | `DUPLICATE_SWEEPER.md` + `combination-proposal.md:13-88` | 5.7 |
| `RULING_APPLIER.md` | `APPLIER-BRIEF.md`, `RULING_RULE` (`FA:160-163`) | never reopen, soften or widen a ruling |
| `CLAIM_VERIFIER.md`, `COPY_EDITOR.md` | parity personas, generalised off the EUDPA-328 path (`CLAIM_VERIFIER.md:17`) | 6.5 |

Source-type mechanics live in `references/source-types/<type>.md` (F P1 fix): `docx.md`
(`unzip -p word/document.xml`, mark `</w:p>`/`</w:tr>`/`</w:tc>` before stripping), `confluence.md`,
`jira.md` (ticket, comments, linked pages, `speaker@timestamp` for comments), `image.md` (one at a time, regions
and crop boxes), `design-canvas.md`, `transcript.md` (utterance classes requirement/decision/question/opinion/
context; only a decision by a named authority is `stated`), `repo.md` (`git show <pin>:<path>`, roles
constraint or current-behaviour only), `prototype.md` (parity capture specs), `trace-corpus.md` (private cwd,
redact `fill` values), `openspec.md`, `backlog.md` (rows to units), `web.md`. The per-run instance knowledge
goes in `sources/<id>/characterisation.md`, never back into the skill.

### 5.7 Pass 2: combine rules, ceilings, "considered and left alone"

Rules (from `combination-proposal.md:13-15`, restated in requirement terms, F P13):

1. Same acceptance boundary: one reviewable change a person would build and test together.
2. Same or nested repo set; cross-repo provider/consumer/tests lockstep is allowed inside one boundary (Q14).
3. Never across a `needs`, a milestone, a checkpoint, the cross-cutting slice, or a row ruled to stand alone.
4. Never two capabilities that each introduce a new page or endpoint the user reaches on its own.
5. Failures stay attributable: every member keeps an AC with its own witness.
6. Never regroup a started row.

Ceilings per combined row: ≤ 3 repos, ≤ 4 surfaces, ≤ 12 ACs, ≤ 1 e2e journey slice, size `L` at most. A
proposed combination over a ceiling is declined with the ceiling named.

The COMBINER writes `combined/<slug>.json` with its own `statement` (the union of outcomes in one sentence),
all member ACs carried with `from`, `members` by key, `size.basis`, and a `risk` note ("which half can go red,
and would it stay attributable"). It also writes `combination.declined[]` for every candidate pair it did not
take, with the reason, and "left alone" for anything scored but excluded. COMBINE_VERIFIER checks every
combined row against the rules and ceilings and every declined pair for a real reason. **Applied
automatically** (make the call, flag it after); every combination appears in the report's "calls we made"
section with its opt-out command.

**Re-derivable after rulings.** The applier changes atoms (supersede, drop, reword via new atom file with
`supersedes`). Phase 17 then re-runs over the full atom set. Unchanged groupings keep their slug and id.
Started rows are frozen. The report's combination section shows the difference from the last combine.

### 5.8 Workflow versus main session, tiers and caps

- The main session runs: interview, `tim` commands, gates, ruling capture, launching `distil.js`. It never
  authors requirements (memory `feedback_parent_orchestrates_never_implements`).
- `distil.js` takes `args = {workarea, phase, slices?, sources?, rails, runLabel}`; parses a JSON string;
  throws on a missing key; logs the resolved config first (G4 §1).
- Tiers: `think` Opus for characterising hard sources, authoring, verifying, reconcile, panel, dedupe,
  critique, question editing, combining, applying rulings; `doer` Sonnet for most characterising and extract
  verification, question critic, combine verifier, prose verifier and copy editor; `watcher` Haiku only for
  receipts.
- **Opus concurrency ≤ 6 in every launch**, enforced by the script's own semaphore. A phase that needs more
  splits into sequential batches inside the launch.
- Every agent returns a schema with a required non-empty `summary`; a null result throws (no silent success;
  H §3 "165 empty results").

### 5.9 Resumability

- The phase ledger is the resume source; `done` records an artefact fingerprint, so a phase whose files
  changed after `done` shows as stale.
- `reset <phase>` cascades to dependants (fixes the DR1B contradiction, G1 §2.4).
- Within a phase, per-item files are the unit of progress: a relaunch skips slices whose atoms all have a
  verification record. `resumeFromRunId` with identical args replays the cached prefix.
- A handover prints: the workarea, `tim distil phase status` output, the exact `distil.js` args, and the run
  id.

---

## 6. The distillation report

### 6.1 Principles

1. Generated by `tim distil report` from `backlog.json`, `units.json`, `pipeline.json`, `heads.json`,
   `seals.json`, `critique.json` and the verification files. No agent edits it. (G §8.1)
2. Decision-led: what needs Sam, then what we decided for him, then how sure we are, then the plan. (c0f99985)
3. Headlines, never bare ids. Ids appear as small handles for answering. (memory
   `feedback_reference_by_headline_not_ticket_number`)
4. Every number derived; the masthead sentence is built from counts; a stamp footer names backlog sha and
   tool version. (`page.js:222-313, 379-405`)
5. Evidence in reach: verbatim quotes, unit tokens linked to the source, crops beside visual questions,
   permalinks at a full sha for code. (`sections.js:54-97`)
6. Nothing silently dropped: an unknown category renders under its raw name; withdrawn and dropped rows stay
   visible below the fold. (`page.js:346-377`)
7. Machine-written prose (headlines, in play, consequences, combination notes, weak-part summaries) is checked
   by a different agent (CLAIM_VERIFIER) and a GDS pass (COPY_EDITOR) under quote conservation.
8. Two emitters of one generator: a static local page (`report/index.html`) and a single-file artifact, plus a
   markdown twin (`report/report.md`) and a paste-ready answer sheet. (`SKILL.md:311-317`)

### 6.2 Section order

| # | Section | Contents | Source of truth |
|---|---|---|---|
| 0 | Masthead | Purpose sentence; sources read with version and date; derived counts; freshness stamp; drift panel if anything moved | header, `sources`, seals |
| 1 | Needs your ruling | Must-answer first, then by blast radius. Four-part cards, visuals, "Blocks:" headlines, recommended option, ruling controls | `questions` |
| 2 | Calls we made that you may want to reverse | Precedence picks, panel rulings, assumptions, combinations: the rule that made each, the other side's case, "To reverse:" in files and commands | `conflicts`, `decisions` by panel/precedence, `assumptions`, `combination` |
| 3 | Read this first: where the evidence is weak | Rows resting on one source, `inferred`/`gap` counts per surface, what the method cannot see (critique), what would upgrade each | `acceptance[].confidence`, `critique.json` |
| 4 | The backlog | Combined and standalone rows in build order: headline, statement, ACs with confidence chips, surfaces, dependsOn headlines, status; members expandable; progress "N of TOTAL (P%)" with deferred named | `increments` |
| 5 | How increments were combined | Rules and ceilings; each combination with risk and opt-out; considered and left alone | `combination` |
| 6 | Coverage | Per source: units, cited, not a requirement (with reasons), conflicts, excluded, duplicates; the P1 to P10 proofs with their results | units, trace, ledger |
| 7 | Conflicts between sources | Needs a person (linked to section 1), settled by precedence or panel (linked to section 2), both sides quoted | `conflicts` |
| 8 | Out of scope, parked, dropped | Who ruled, when, why | `scopeExclusions`, dropped rows |
| 9 | Rulings applied | Newest first: one line each with Sam's words verbatim, date, effects ("unblocked 2, reworded 1") | `decisions` |
| 10 | Noticed and not raised | Authors' `notRaised[]` and `premisesDisproved[]`, grouped by slice | atom author returns |
| 11 | How this was checked | The phase ledger with notes, verifier counts (stands/corrected/added/disputed), panel dissent | `pipeline.json`, verification files |
| 12 | Where everything is | Paths, commands to regenerate, footer stamp | header |

With `--build`, a "Build progress" block renders between sections 3 and 4: landed rows, red rows with their red
kind and the owed fix, acceptance results per AC, review coverage per row, discovered work awaiting triage.

### 6.3 Skeleton with example content

```
Dashboard and notifications for high-risk plants: what needs a ruling
─────────────────────────────────────────────────────────────────────
We are building the high-risk plants import notification, from 6 sources read between 12 and 18 September
2026. 212 requirements, distilled into 61 atoms and combined into 38 increments (23 fewer pipeline runs).
5 questions need your ruling, 2 of them before anything that depends on them is built.
Every fact was re-checked against the sources on 18 September 2026.  [drift: none]

1. Needs your ruling (5)

  ┌ Must answer before build ─ access control ────────────────────────────────── q-notification-list-scope
  │ Whose notifications should the dashboard list?
  │ In play: which notifications a signed-in user can see on the dashboard and through search.
  │ A  Only notifications the user created                       supported by no source
  │ B  Every notification in the user's organisation   ★ recommended  1 source: EUDPA-512 comment 3
  │     "anyone in the business should see them"
  │ C  Something else (say what)
  │ If nobody answers: nothing that lists notifications is built. The dashboard ships without a list.
  │ Blocks: "The notifications list shows only notifications the user may see"
  │ [ A ] [ B ] [ C ]   note: [                         ]
  └────────────────────────────────────────────────────────────────────────────────────────────────────

  ┌ Defaulted ─ copy ─────────────────────────────────────────────────────────── q-error-summary-title
  │ Should the error summary title read "There is a problem"?
  │ In play: the heading of every error summary in the plants journey.
  │ A  "There is a problem" (GOV.UK default)          2 sources     B  "Check your answers"   1 source
  │ If nobody answers: we build A. Changing it later is one copy key in two language files.
  │ Blocks: nothing; 14 increments ship under this default.        [picture: error summary, Mural board 2]
  └────────────────────────────────────────────────────────────────────────────────────────────────────

  [ Copy batch ]  →  tim backlog rule shared/high-risk-plants q-notification-list-scope --option B \
                       --words "<your words>" --by sam --at 2026-09-18 --reason "<why>"

2. Calls we made that you may want to reverse (17)
  • Country of origin wording follows the policy paper, not the Mural board.
    Rule: policy paper wins on mandate (precedence: mandate). Other side: the board's shorter wording tested
    better in research. To reverse: 1 decision, 2 ACs reworded, 1 copy key in 2 files.
  • Transporter page, persistence and format check are built as one increment.
    Rule: one acceptance boundary, 3 repos within the ceiling. Risk: a backend red stays attributable by the
    contract check. To reverse: tim backlog rule shared/high-risk-plants combination:transport--… --answer
    "keep separate" … (splits into 3 runs).

3. Read this first: where the evidence is weak
  • 4 increments rest on one source only. 2 of them on a transcript.
  • 9 acceptance criteria are "inferred", 3 are "gap" (all 3 have questions above).
  • What this method cannot see: server-side validation never triggered in the prototype; performance;
    audit logging. A targeted prototype run on the two error states would upgrade 6 criteria to "observed".

4. The backlog (38 increments; 0 of 36 done, 0%; 2 deferred)
  ▸ Importers give transporter details once and they are kept                inc-052  M  todo
      The system MUST let an importer record …  ACs: 3 (2 stated, 1 inferred)  after: "Arrival details"
      ▸ members: Transporter question page · Transporter details are kept · Approval number format

5. How increments were combined … 6. Coverage: phnns-policy 128 units: 97 cited, 22 not a requirement
   (listed), 6 conflict sides, 3 excluded … all proofs pass
…
12. Where everything is
   backlog.json @ 4f2a… · tim 0.19.0 · rendered 18 September 2026
```

### 6.4 How rulings are captured and flow back

1. **Capture.** Sam rules by the page (batch copy emits one `tim backlog rule` command per line), by the answer
   sheet (`report/answer-sheet.md`, one line per open question keyed by slug with option letters, so "question
   3 meant 17/18" cannot happen, G §2), or in conversation (the skill maps his words to slugs and shows the
   mapping before writing). "Maybe" becomes `--outstanding` with his words (memory
   `feedback_question_is_not_a_ruling`).
2. **Record.** `tim backlog rule` appends the decision (`words`, `by`, `at`, `reason`, `sealedEvidence`), flips
   the question, and never edits rows.
3. **Apply.** `tim distil phase reset apply-rulings` then `distil.js {phase: 'apply-rulings'}`. RULING_APPLIER
   reads each new decision and writes `effects.json`: unblock (clear `needs`), drop, supersede an atom with a
   reworded one (new file with `supersedes`), create new `proposed` atoms (which go through verify), add an
   invariant or exclusion. `tim backlog apply` writes them and records `effects[]` on the decision.
4. **Re-combine.** Phase 17 re-runs; unchanged groups keep their ids; started rows are untouched.
5. **Re-render.** The question leaves section 1 and appears in section 9 with its effects; unblocked rows move
   to `todo` in section 4.
6. **Build side.** The implementor reads the decision through the row's `constraints` and `resolvedBy` and gets
   `RULING_RULE` in its stage brief: never reopen, soften or widen a ruling.

---

## 7. The implementor skill and workflows

### 7.1 Identity

- **Name:** `backlog-builder`.
- **Description:** Build increments from a v2 `backlog.json` through plan, implement, review, verify, judge,
  fix, ladder, independent acceptance check, land, PR, CI and merge policy, in Claude-only or
  Claude-driving-Codex mode, switchable per increment by a sentence. Triggers: "build the backlog", "build
  inc-012 to inc-020", "build the next N", "delegate these to Codex", "Codex for the rest", "resume the build",
  "hand over the build", "prove Codex parity". NOT for authoring a backlog (requirements-distiller), NOT for one
  agreed frontend change (frontend-change), NOT for a Jira ticket plan (ticket).
- **Modes** (`start-build.sh` prints `MODE:`): `RUN`, `RESUME`, `SWITCH` (executor sentence only),
  `HANDOVER` (Claude or Codex variant), `PARITY`.

### 7.2 Cadence: drain parent with per-increment child (chosen)

- The main session launches **one** `build-drain.js` by `scriptPath` with `args = {workarea, count|null,
  ids|null, cadence: 'drain', trailer, rails, runLabel}`.
- The parent loops: a watcher agent runs `tim backlog next <wa> --json` and `tim build executor show`; the
  parent calls `workflow({scriptPath: build-increment.js}, {…cfg, increment, bindings})`; a watcher agent
  reads `build/state.json` for the landed check; halt rules apply.
- **Halt rules:** any red except `platform-blocked` (which parks the row `blocked` with a question naming the
  owed fix, re-points dependants, and continues, memory `feedback_platform_blocked_increment_park_and_move_on`);
  three consecutive reds of any kind (systemic halt, C §9.13); a `checkpoint` of `halt-after` or `walkthrough`
  after landing; `count` reached; nothing buildable.
- **Supervised cadence:** the same child launched top-level (`cadence: 'one'`) with the same args shape, so
  there is one code path (G4 §2.1).
- **Rationale:** FA's liveness (re-derive picks up appended rows, `FA:507-567`) plus build-orchestrator's
  landed check and per-row executor switch, with no run copy and no FALLBACK (G4 §4).
- The G4 §5 canary (inc-001 in section 11) proves object args, a child re-read on each call, and child resume
  behaviour before the parent relies on them. If the canary shows children are not re-read, the only loss is
  hot-fixing the child mid-drain.

### 7.3 Per-increment stages

"R" is what the stage reads, "W" what it writes (always through `tim`). Role column gives the default executor
in codex mode (8.7); in claude mode every role runs on Claude at the tier shown.

| # | Stage | Tier (claude mode) | R | W | Failure |
|---|---|---|---|---|---|
| 1 | `resolve` | watcher | args, header, row, state | log of resolved config; `resumeAt` from persisted facts only (`increment-build-loop.js:938-946`) | throw on missing key |
| 2 | `ticket` (if `tickets: per-increment`) | watcher | row title, statement, ACs (rendered as Jira wiki, `feedback_jira_wiki_not_markdown`) | state.ticket at once | red `stage-dead` |
| 3 | `branch` / `sync` | watcher (sync: doer) | lifecycle, surfaces | state.branch; sync merges `origin/<base>` into every touched repo plus tests (`FA:613-661`) | `sync-blocked` on conflict, never auto-resolved |
| 4 | `baseline` | doer | repo ladders for touched repos | `build/logs/<id>/baseline.*`, summary in state | `baseline-red` (break, not continue, fixes B §3.3) |
| 5 | `context` (repo level) | watcher | surfaces | `build/context/<id>.json` (rules, CLAUDE.md chain, tech) | red |
| 6 | `plan` | think | row, header invariants/decisions/assumptions, context, live code, baseline; per-citation blob check (G3 §4.5) | `plans/<id>.md` (0 Decisions … 7 Out of scope, `FA:697-721`) and `plans/<id>.json`: `acProofs[{ac, proof, witnessTest}]`, `reviewFocus[]`, `behaviourChanges[]`, `decisions[]`, `risks[]`, `plannedFiles[]`, `headsAt{repo: sha}`; path persisted by `tim backlog state set` | `plan-refused` when the requirement cannot be met (with reason, becomes a question) |
| 7 | `plan-audit` | think, different agent | row (not the plan's paraphrase of it), plan | verdict `approve|revise` with reasons | one revise loop, then `plan-refused` |
| 8 | `context` (planned files) | watcher | `plannedFiles` | context file updated with per-file topics, bundles, matched rules | red |
| 9 | `implement` | doer | plan, context, row | code; result `{changedFiles, discovered[], deferred[]}` | `implement-failed` → preserve work |
| 10 | `scan` | watcher | diff | `tim build scan --secrets`; plan's invariants that are mechanical (`git diff -M100%` move check) | red on a credential; never pushed |
| 11 | `review` | doer per file; think for plan-proof | diff `<base>...HEAD` plus index (fixes B §3.5), context, personas | findings per reviewer | throw if any expected reviewer result is missing |
| 12 | `verify` | doer | findings grouped by file | verdicts; dead verifier fails open to unrefuted (`increment-build-loop.js:1297-1304`) | never drops a finding |
| 13 | `judge` | think | confirmed findings, row, decisions, `RULING_RULE` | `fixNow`, `defer` (→ questions via writer, class `defaulted` unless must-answer), `reject` with reasons | dead judge throws (fixes `:1350`) |
| 14 | `fix` | doer | `fixNow` | code; per-item `fixed|could-not` | result checked (fixes `:1373`); `could-not` goes back to judge once |
| 15 | `fix-verify` | doer | fixed items, diff | per-item confirmed or not | unconfirmed goes back to fix once, then red |
| 16 | `ladder` | doer (never watcher, fixes B §3.9) | header ladders for touched repos + plan-added rungs; framework-assertion exception (`:1405-1415`) | logs, per-rung result | `ladder-red` |
| 17 | `acceptance` | think, independent | **row ACs from `backlog.json`**, the diff, test files, ladder logs; never the plan's proofs as evidence of themselves | per AC `met|unmet|unverifiable` with the witness (test name at the required level, or observed output) | one fix round for `unmet`, then `acceptance-red`; `unverifiable` on an `e2e` witness needs the E2E stage or turns red |
| 18 | `land` | watcher | plan `behaviourChanges`, row | commit per repo via `-F`, subject from behaviour changes, `Ruling:` line where relevant, trailer from args (fixes hardcoded trailers) | red |
| 19 | `pr` | watcher | lifecycle | PRs via `tools/github/pr-ensure-draft.sh` or create; state.prs per repo at once | red |
| 20 | `ci` | watcher watch, doer fix | PRs | `wait-for-pr-checks.sh` exit codes (2 unresolved, 4 no checks, never green); CI fixer registers `newPrs` (`:1631-1687`); SonarCloud failures handled here | `ci-red` or `platform-blocked` |
| 21 | `local-e2e` (auto: plan says the stack-served surface changed) | doer (Claude, browser) | plan, repos | `tim docker dev`, compose suite, one retry, read `error-context.md`, always tear down (`FA:1140-1234`) | `e2e-red` |
| 22 | `merge` | watcher | `lifecycle.merge` | per policy: never (report ready), on-approval (whole-increment gate, `:1732-1761`), on-green (needs recorded decision); order by `mergeAfter`; base watch; open-PR sweep | `merge-blocked`, healthy pauses `awaiting-approval` |
| 23 | `record` | watcher | state | `tim backlog status <id> done --resolution built` at the strategy's terminal point; `discovered[]` → `tim backlog propose` | red `record-failed` (state, not a log line) |
| 24 | `report` | watcher | all JSON | `tim distil report --build` (deterministic render) | recorded in state |

Programme-specific knowledge (preceding-page E2E rule, copy.en/cy, link-builder traps) is not in these prompts
(B §8). It lives in the repos' own docs and in `workareas/shared/<programme>/KNOWLEDGE.md`, which the plan
stage reads as part of its reading list and the context stage lists (Q28).

### 7.4 How the requirement's intent survives to merged code

1. The plan must map every AC to a proof (`acProofs`), and the plan audit rejects a plan that drops, narrows
   or re-words an AC, widens scope, adds lifecycle content (FA s17 §8 defect), or contradicts an invariant or
   decision.
2. Reviewers get the row's ACs and the invariants directly, not through the plan.
3. The acceptance stage is run by an agent that has not seen the planner's or implementor's reasoning; it
   reads ACs from `backlog.json`, locates a witness at the required level for each (a test that exercises the
   given/when/then, or an observation), and checks the ladder ran it green.
4. The report shows per-AC acceptance results for every landed row, so drift between "asked" and "built" is
   visible to Sam.

### 7.5 Lifecycle profiles and merge policy

| Strategy | Branch | Tickets | PRs | Merge | Red work |
|---|---|---|---|---|---|
| `per-increment` | `<type>/<KEY>-<slug>` per row, same name in every touched repo, `--no-track` cut, refspec push (`:336-364`) | per row (idempotent) | one per repo per row | per `lifecycle.merge` | pushed `wip(...)` commit, `commit` not recorded (`:370-406`) |
| `programme` | `lifecycle.branch` in every repo, synced with base before every row | none or epic-only | one draft per repo, reused (`pr-ensure-draft.sh`) | at programme end, by Sam | pushed `wip(...)` commit |
| `local` | driver cuts branches; loop commits only (the snagging fix, `5271d04a`) | none | driver raises | never by the loop | path-scoped `git stash push -u -- <paths>` |

`type` comes from the plan's `behaviourChanges` (feat when behaviour is added, fix when a defect is corrected,
chore otherwise), never from the row.

### 7.6 Failure, red handling and resume

- Every red writes `state.red{kind, stage, at, detail}` and stops the child. The driver reports it and applies
  halt rules. A human sets `retry: true` (via `tim backlog state set <id> retry true`) to re-enter.
- "Pre-existing" or "environmental" claims from any stage are not accepted: the stage must reproduce the
  failure on the base branch in a clean checkout and attach the log, or the red stands (memory
  `feedback_verify_subagent_failure_claims`).
- Resume = same `scriptPath`, same args, `resumeFromRunId`; within the child, `resumeAt` derives from state.
- **Silent-success paths removed:** every agent returns a required non-empty `summary`; missing reviewer
  results throw; dead judge throws; fixer and relay results are checked; recorder writes are commands whose
  exit code the stage returns; report refresh failure is state (A §12.10).

### 7.7 Handover

The skill prints: workarea, args object verbatim, last run id, the `tim backlog next` result, executor
bindings, reds with owed fixes, and a reminder to raise *Dynamic workflow size* in `/config` (the agent cannot,
`build-orchestrator/SKILL.md:107-109`). The Codex-orchestrator variant (Q23) prints the same backlog path, the
stage briefs, the codex profile, and a placeholder binding table, for a `/goal` session (H §4.2).

---

## 8. Executors

### 8.1 Stage contract

Every heavy stage is defined once in `.claude/skills/backlog-builder/stages/<stage>.md` (the shared, neutral
brief) with its output schema in `.claude/skills/backlog-builder/assets/schemas/<stage>.json`. Schemas are
written Codex-compatible for both executors: every property listed in `required`, optional values as nullable
types, `additionalProperties: false` (S §7.3).

| Stage | Input (bound by the adapter) | Output schema (all keys required) |
|---|---|---|
| plan | `{workarea, incrementId, rowFile, headerFile, contextFile, baselineLog, repos{key:{abs, tilde}}}` | `{ok, summary, planMd, acProofs[{ac, proof, witness}], reviewFocus[], behaviourChanges[], decisions[{choice, rejected, why}], risks[], plannedFiles[{repo, path}], refused: string|null}` |
| plan-audit | `{rowFile, planMd, planJson}` | `{ok, summary, verdict, problems[{kind, detail}]}` |
| implement | `{planMd, planJson, contextFile, rowFile, repos}` | `{ok, summary, changedFiles[{repo, path}], deferred[{what, why}], discovered[{title, statement, why}], notes[]}` |
| review-style | `{file, repo, diffCmd, bundles[], rules[], persona: code-style STYLE_FILE_REVIEWER, rowFile}` | `{ok, summary, file, findings[{line|null, severity, rule|null, what, why, fix, confidence}]}` |
| review-code | `{file, repo, diffCmd, bestPractices[], rules[], persona: review FILE_REVIEWER, rowFile}` | same shape, `category` added |
| review-consistency | `{repo, diffCmd, rowFile, planJson, persona: review CONSISTENCY_REVIEWER}` | same shape, file nullable |
| review-plan-proof | `{planMd, planJson, rowFile, diffCmd}` | `{ok, summary, invariants[{name, command, expected, actual, passed}], findings[]}` |
| verify | `{file, findings[], diffCmd, rowFile}` | `{ok, summary, verdicts[{n, refuted, why}]}` |
| judge | `{findings[], rowFile, decisionsFile}` | `{ok, summary, fixNow[{n, instruction}], defer[{n, question}], reject[{n, why}]}` |
| fix | `{fixNow[], contextFile, planMd}` | `{ok, summary, items[{n, status: fixed|could-not, why}]}` |
| fix-verify | `{items[], diffCmd}` | `{ok, summary, items[{n, confirmed, why}]}` |
| ladder | `{rungs[{repo, script}], logsDir}` | `{ok, summary, rungs[{repo, script, result: green|red|skipped, log}], repairs[]}` |
| acceptance | `{rowFile, diffCmd, ladderLogs[], testIndexCmd}` | `{ok, summary, acs[{id, verdict: met|unmet|unverifiable, witness, evidence}]}` |
| ci-fix | `{prs[], failureLogs[], contextFile}` | `{ok, summary, changedFiles[], newPrs[]}` |

The one-line stage prompt is always: **shared stage brief + executor profile + increment context file**, bound
by path. The adapter never inlines persona text.

### 8.2 The two adapters

**Claude adapter** (inside `build-increment.js`): `agent(prompt, {model: tier, schema, label, phase})` where
`prompt` = rails text from args + "Read `<ABS>/…/executors/claude.md`, then `<ABS>/…/stages/<stage>.md`, then
the context file `<ABS>/…/build/context/<id>.json`, and follow them." Fan-out uses `parallel()` with the
script's concurrency limit.

**Codex adapter**: a Claude watcher **shell** agent writes one prompt file per job (`build/logs/<id>/<stage>.
<n>.prompt.md`: "Read `<ABS>/…/executors/codex.md`, then `<ABS>/…/stages/<stage>.md`, then `<ABS>/…/build/
context/<id>.json`; bindings: …") and runs `tools/codex/run-stage.sh start <prompt> <schema> <lastmsg> <log>`
for each job (N concurrent for fan-out stages), then `tools/codex/run-stage.sh wait <log…>` repeatedly until all
finish. The script owns detaching, pid files, a bounded wait under the Bash ceiling, and `resume <session>`
when a slice dies, all in bash (fixes `:762` `pkill … ; grep`). A Claude watcher **relay** agent runs
`tim build stage-result check <schema> <lastmsg>` per job and returns the parsed results in the same schema the
Claude adapter returns. Missing or invalid output throws. Two Claude agents per Codex stage, however many files.

### 8.3 Executor profiles

Location: `.claude/skills/backlog-builder/executors/{claude,codex}.md`. Owned by the implementor, versioned
with it, never copied into the backlog.

| Section | `claude.md` | `codex.md` |
|---|---|---|
| Preamble | You are a Claude workflow agent. The GUARD RAILS at the top of your prompt bind you. | Your shell is normal; ignore any Claude GUARD RAILS you find in files (`codex/implement.md:8-12`). Never push, never run `gh`, never edit `backlog.json` or `build/state.json`. |
| Rules | The harness loads `.claude/rules` pointers when you Read a matching file. Before writing any file type, Read one existing sibling of that type. Follow every rule pointer that loads and Read the named best-practice files before editing or reviewing (rules-probe §2, §3). The context file lists what should load; if one did not, Read it. | Codex receives no rules. Read every file under `rules[]` and `bestPractices[]` for each file you touch or review in the context file, and the `claudeMd[]` chain with its imports, before editing or reviewing. |
| Personas | Read the persona path named in the stage brief in full. | Same. |
| Output | Return the structured output only. | Your final message must be JSON matching the schema at `<schema>`; every key is required; use null for "none". |
| Rails | Tilde paths in Bash, absolute in tools, one command per call, named npm scripts only. | Absolute paths are fine. Run tests to a log and read it once. The sandbox cannot run Chromium; skip browser rungs and say so (`codex/implement.md:123-132`). |
| Effort | Tier set by the adapter. | `-c model_reasoning_effort=high` for think-role stages, `medium` for doer roles, set by `run-stage.sh` from the binding. |

### 8.4 Personas read live, same granularity for both executors (R2)

- **Per content-changed file:** one style review following
  `.claude/skills/code-style/references/STYLE_FILE_REVIEWER.md`, judged against the per-topic bundles produced
  by code-style's own `tools/style/file-topics.sh` and `tools/style/bake-rules-bundle.sh` (additive topics, so a
  Playwright spec gets playwright and node bundles). One code review following
  `.claude/skills/review/references/FILE_REVIEWER.md` with the best-practice paths from review's own
  `tools/review/detect-tech.sh`.
- **Per touched repo:** one consistency review following `review/references/CONSISTENCY_REVIEWER.md` (the
  review skill's own granularity, `review/SKILL.md:66`).
- **Per increment:** one plan-proof reviewer running the plan's invariant commands (`FA:850-851`).
- **Persona embedding rule (in every review stage brief):** "The persona's sections on goal, scope, criteria,
  severity, filtering and file-type guidance bind you. Its sections on workspace layout, helper scripts,
  verdict persistence and return line are replaced by this stage's output schema." So a change to a persona's
  judgement is picked up on the next run; its skill-specific bookkeeping is not executed.
- **Mechanical exclusions only:** 100 % renames (`git diff -M100%`), lockfiles and generated files listed in the
  header's repo record. No hard cap on content-changed files; a combined row exceeding the review surface the
  ceiling implies is itself recorded in the report. The plan's `reviewFocus` adds emphasis to prompts; it never
  removes a reviewer.
- **Both executors run exactly this set.** Codex runs one `codex exec` per reviewer job, concurrently. The
  context file is identical, so the same bundles and rules reach both.

### 8.5 Rules resolution at run time (R3)

`build/context/<id>.json`, produced by `tools/build/stage-context.sh` twice (repo level before plan, planned
files after plan) and a third time for review over the actual changed files:

```json
{
  "increment": "inc-014",
  "files": [
    {
      "repo": "plants-frontend",
      "path": "src/server/app/sets/plants/features/origin/controller.js",
      "topics": ["node"],
      "bundles": ["~/…/workareas/code-style-reviews/BUILD-high-risk-plants-inc-014/style-rules.plants-frontend.node.md"],
      "rules": [".claude/rules/node.md"],
      "bestPractices": ["docs/best-practices/node/code-style.md", "docs/best-practices/doc-comments/jsdoc.md"],
      "claudeMd": ["repos/trade-imports-plants-frontend/CLAUDE.md"]
    }
  ],
  "repoTech": { "plants-frontend": { "technologies": ["node", "hapi"], "bestPractices": ["…"] } },
  "personas": {
    "style": ".claude/skills/code-style/references/STYLE_FILE_REVIEWER.md",
    "code": ".claude/skills/review/references/FILE_REVIEWER.md",
    "consistency": ".claude/skills/review/references/CONSISTENCY_REVIEWER.md",
    "routing": [".claude/skills/code-style/SKILL.md", ".claude/skills/review/SKILL.md"]
  },
  "resolvedAt": { "workspace": "d07af6b9", "rulesHash": "…" }
}
```

- Claude stages: the harness also loads matching rules natively on Read (rules-probe §1), so the context file
  is a checklist; the profile tells the agent to read a sibling first and follow pointers.
- Codex stages: the context file is the only route, and the profile makes reading it mandatory.
- The **ladder** checks it was done: the implement and review schemas carry no free claim; instead the
  plan-proof reviewer and acceptance agent are told to report a finding when a changed file breaks a rule in
  its bundle, which is the observable test that the rules were read.

### 8.6 Session hooks replaced by explicit steps (R4)

| Session-level behaviour | Where it happens now |
|---|---|
| `Stop` hook `sonar analyze agentic` per repo | CI stage (SonarCloud on the PR) plus the report stating "no local rule analysis ran" (H §6.6) |
| `PreToolUse` sonar secrets on Read (Claude only) | Still fires in Claude agents; `scan` stage (`tim build scan --secrets`) covers Codex-written code before land |
| `PostToolUse` push record | Fires, because push always runs in a Claude watcher (land, PR stages), never in Codex |
| Rule injection on Read | Native in Claude; context file for Codex (8.5) |

### 8.7 Stage-role binding table

Defaults live in `.claude/skills/backlog-builder/assets/bindings.json`; overrides in `build/run.json`.

| Role | Stages | claude mode | codex mode (default) |
|---|---|---|---|
| orchestration | resolve, ticket, branch, context, scan, land, pr, ci-watch, merge, record, report | Claude watcher | Claude watcher |
| sync | sync | Claude doer | Claude doer (touches git state; cheap) |
| baseline | baseline | Claude doer | Codex (non-browser rungs), Claude doer for browser rungs |
| plan | plan | Claude think | Codex high |
| plan-audit | plan-audit | Claude think | Codex high, fresh session |
| implement | implement | Claude doer | Codex medium |
| review | review-style, review-code, review-consistency | Claude doer | Codex medium, one exec per job |
| plan-proof | review-plan-proof | Claude think | Codex high |
| verify | verify, fix-verify | Claude doer | Codex medium |
| judge | judge | Claude think | Codex high (knob: `judge=claude`) |
| fix | fix, ci-fix | Claude doer | Codex medium |
| ladder | ladder | Claude doer | Codex (non-browser), Claude doer (browser rungs) |
| acceptance | acceptance | Claude think | Codex high, fresh session (knob: `acceptance=claude`) |
| e2e | local-e2e | Claude doer | Claude doer (sandbox cannot run Chromium) |

In codex mode Claude runs roughly: 11 watcher stages, 2 relay/shell agents per Codex stage, sync, and browser
rungs, all Haiku except sync and browser work on Sonnet. Every token-heavy stage runs on Codex (R6).

### 8.8 One-sentence switching

The skill parses the sentence into `tim build executor set`:

| Sam says | Command |
|---|---|
| "delegate inc-012 to inc-020 to Codex" | `tim build executor set shared/<p> --ids inc-012..inc-020 --executor codex` |
| "Codex for the rest" | `… --ids next.. --executor codex` (every unbuilt row) |
| "back to Claude from inc-030" | `… --ids inc-030.. --executor claude` |
| "Codex builds, Claude judges" | `… --executor codex --stages judge=claude,acceptance=claude` |

The drain reads bindings per increment from `build/run.json` before each child call, so a switch takes effect
at the next increment of a running drain with no relaunch and no backlog edit (R5 test). `build/state.json`
records which executor ran each stage of each row.

### 8.9 Guard rails text

The canonical block lives once in `.claude/skills/backlog-builder/assets/GUARD-RAILS.md` (the `FA:102-117`
superset, H §5, with path-scoped stash and `foreignPaths`). `start-build.sh` reads it and passes it in `args.rails`;
the scripts prepend it to every Claude prompt. It is never given to Codex (the codex profile replaces it).

### 8.10 Parity proof procedure

1. Pick one small atomic row with a unit or fit witness and one surface (`PARITY` mode suggests candidates from
   `tim backlog next`).
2. Build it twice from the same base sha on two throwaway branches, `parity/claude-<id>` and `parity/codex-<id>`,
   with `lifecycle.strategy: local`, `merge: never`.
3. `tim build compare shared/<p> <run-a> <run-b>` renders a side-by-side: reviewer jobs run (style, code,
   consistency, plan-proof counts), raw findings by severity, confirmed after verify, judge rulings, fixes
   confirmed, ladder rungs and results, acceptance verdicts per AC, diff size, and Claude agent counts.
4. **Pass** when: reviewer job counts are equal; every AC is `met` in both; no confirmed high or critical
   finding exists in one run that the other run's diff also contains and missed; ladders green in both.
5. Sam picks which branch (if either) to keep; the other is deleted with `tools/github/delete-remote-branch.sh`.
6. Repeat on one combined row before calling Codex mode done.

---

## 9. Decisions

### 9.1 All open questions

"To reverse" gives the blast radius in files and commands, never time.

| Q | Decision | Rationale | Reversible? To reverse |
|---|---|---|---|
| Q1 | Neutral store: `backlog.json` + `units.json`; OpenSpec and journey-spec are optional projections (`tim distil project openspec|journey-spec`, later) | One store, one lint, one report (D §9) | Yes: add a projection command; no schema change |
| Q2 | `workareas/shared/<programme>/`, tracked; bulky raw and logs gitignored | Already the tracked tree (CLAUDE.md rule 3); no path lock (G5 §4) | Yes: move folder, `tim backlog` takes `--backlog` path; 0 code |
| Q3 | Generalise `tim parity` core into `tim/src/backlog/`; parity a profile | Tested, id-stable, ruling-safe (G2) | Costly: about 12 tim modules and their tests |
| Q4 | Row status `proposed|todo|blocked|deferred|dropped|combined|done` + `resolution`; lifecycle in `build/state.json` | Review surface, corruption radius, R5 (3.2) | Yes: move state fields onto rows via `tim backlog migrate`; 1 profile file |
| Q5 | Split `gate` into `needs` (pre-build, question refs) and `checkpoint` (post-build) | One meaning per field (S §4.4) | Yes: 2 schema fields, 1 derive rule |
| Q6 | Requirement `kind` enum (3.4); route chosen by the plan; branch type from `behaviourChanges` | Routes are how (S §6.4) | Yes: enum in 1 schema file |
| Q7 | `consistentWith` relations (requirement grade); `hints.exemplars` non-binding | F K16; FA `reference` legitimate as hints | Yes: 1 schema field |
| Q8 | `size{class, basis}` never gates; combine ceilings ≤3 repos, ≤4 surfaces, ≤12 ACs, 1 journey slice | Pre-plan proxies (F P13) | Yes: `assets/combine-rules.json` |
| Q9 | Atoms kept as rows with `status: combined` | Auditable, re-splittable (E Q2) | Yes: filter in renderer |
| Q10 | Target data model is a `spike` or `capability` row the implementor owns | Model phase leaked design into ACs (F §4.2) | Yes: add a distiller phase |
| Q11 | Tests are part of every row's definition of done via AC `witness`; no separate e2e rows unless the requirement is a test capability | "every add-page needed a tests-repo edit and none carried it" (D §9) | Yes: author rule in 1 persona |
| Q12 | Panel triggered by conflicts precedence cannot settle; authority boundary in 5.4 | Cost bounded; human authority kept | Yes: 1 persona + phases.json |
| Q13 | Combine pre-build over the whole atom set and after every ruling application; applied automatically, reported as reversible calls; started rows never regrouped | Make the call, flag it (memory); re-derivable (G2 §2.2) | Yes: flag `--propose-only` on combine phase, 1 script branch |
| Q14 | Yes, cross-repo lockstep inside one acceptance boundary, within ceilings | One branch name anyway; attributable via witnesses | Yes: rule 2 in `combine-rules.json` |
| Q15 | Conversation source type with `speaker@timestamp`, utterance classes; Jira via `tim jira` | F P4 | Yes: 1 source-type file |
| Q16 | `observed|stated|legacy|inferred|gap` with role checks | F §7 | Costly: renderer, lint, personas |
| Q17 | Parity corpora frozen as sources; DR1-U brought onto main data-only and migrated mechanically; EUDPA-409 remaining rows migrated mechanically; trace backlogs re-distilled via ABSORB when their programme starts; FA stages frozen | G5 §10; no rulings lost | Yes: `tim backlog migrate` re-run |
| Q18 | Retire journey-builder BUILD mode and scripts now; DIGEST method moves into the distiller; journey-builder kept read-only for EUDPA-409's spec until migrated | Superseded, destructive rollback (C §4) | Yes: git revert of the retirement commit |
| Q19 | Drain parent + per-increment child; `cadence: one` launches the child alone | G4 §2.1 | Yes: `cadence: one` everywhere, 0 code |
| Q20 | `plans/<id>.md` + `.json`, tracked in the workarea; path recorded in state | Survives resume; reviewable | Yes: gitignore line |
| Q21 | Per-stage-role binding table; Codex runs plan, audit, implement, full review fan-out, verify, judge, fix, CI fix, acceptance by default | R6 | Yes: `bindings.json` |
| Q22 | Wrap `codex exec` in `tools/codex/run-stage.sh`; no allowlist growth; `gh` only through `tools/github*` | `tools/**` already allowlisted (H §7.3) | Yes: Sam adds allow rules; scripts unchanged |
| Q23 | Codex-as-orchestrator is a supported handover variant, not a code path | H §4.2 | Yes: remove the variant from the skill |
| Q24 | Header `lifecycle.strategy`; default `programme` for distilled programmes; a combined row is one ticket when tickets are per increment | Memory `feedback_stack_programme_on_one_branch` | Yes: header field |
| Q25 | Default `merge: never`; `on-green` only with a recorded decision by a person | Memory `feedback_never_auto_merge_wait_for_sam` | Yes: header field |
| Q26 | Pushed `wip` commit for per-increment and programme; path-scoped stash for local | Memory `feedback_build_loop_rollback_non_destructive` | Yes: 1 stage brief |
| Q27 | Independent acceptance stage reading ACs from the backlog, plus plan audit | A plan can prove the wrong thing | Yes: binding `acceptance=off` (not recommended) |
| Q28 | Repo docs and `workareas/shared/<programme>/KNOWLEDGE.md` in the plan's reading list; never in generic prompts or rows | B §8 | Yes: 1 stage brief |
| Q29 | `lifecycle.phases` with `auto` defaults: sync on for programme strategy, local E2E when the plan says a stack-served surface changed, report always | A open questions | Yes: header field |
| Q30 | One channel: `discovered[]`/`deferred[]` in stage outputs → `tim backlog propose` → `proposed` atoms that re-enter verify and combine | Replaces 3 channels (C §2.6) | Yes: 1 command |
| Q31 | Yes: three consecutive reds halt the drain | C §9.13 | Yes: args `maxConsecutiveReds` |
| Q32 | Sibling `tim distil report` sharing `theme.js`, `prose.js`, citations | Parity card is two-sided (`card.js:272-296`) | Costly: renderer rewrite |
| Q33 | One ledger: `questions[]` + `decisions[]` in the backlog; judge defers become questions | G §10 | Yes: split into a file, 1 profile change |
| Q33a | Decision record 3.7 (by, at, words, reason, revisitWhen, appliesTo, sealedEvidence, effects) | G5 §8 | Yes: schema fields |
| Q34 | `tim backlog rule`; retire `rule-decision.sh` once parity corpora are frozen; answer sheet keyed by slug; `outstanding` for tentative | G §3.2, §2 | Yes: keep both writers |
| Q35 | Must-answer class; builder refuses anything it blocks | Memory `feedback_question_is_not_a_ruling` | Yes: class downgrade by ruling |
| Q36 | Characterise captures crops for visual units; questions inherit crops from cited units; prototype screens via parity capture | Memory `project_eudpa328_decision_visual_evidence` | Yes: renderer section |
| Q37 | Same renderer with `--build`; refresh failure is state | A §12.10 | Yes: flag |
| Q38 | CLAIM_VERIFIER and COPY_EDITOR over every machine-written prose field, different agents | G1 §1.7 | Yes: phase row |
| Q39 | Port FA helpers and the local-lifecycle semantics into the new workflow; bring DR1-U data; do not merge the triage-view loop | S §8.11 | n/a |
| Q40 | Rails once in `assets/GUARD-RAILS.md`, passed in `args.rails`; Codex rails in `executors/codex.md` | No imports (G4 §2.2) | Yes: move to CLAUDE.md |
| Q41 | Yes: fix CLAUDE.md routing, `.claude/workflows/README.md`, `docs/agent-skills.md` Glob advice, skill-creator settings edits in this programme | New skills are audited against them | n/a |

### 9.2 The questions that need Sam's ruling

**Q-A. Default branch strategy for a distilled programme**
- Question: Should a newly distilled programme build on one programme branch with draft PRs, or one branch and
  ticket per increment?
- In play: `lifecycle.strategy` default in `start-distil.sh`, how many PRs and Jira tickets appear.
- Options: A programme branch (your stated default for multi-task briefs); B per increment with tickets (what
  EUDPA-409 and DR1-U used, merges one at a time).
- If nobody answers: A. Each programme can still choose B in its header.

**Q-B. Who judges in Codex mode**
- Question: In Codex mode, should the judge and the acceptance check run on Codex or on Claude?
- In play: independence of the final checks against Claude usage.
- Options: A Codex, fresh sessions (saves the most Claude usage); B Claude Opus for both (a different model
  family checks Codex's work; costs Claude think-tier tokens per increment).
- If nobody answers: A, with the parity proof reporting any difference; switch per run with one sentence.

**Q-C. The panel's authority**
- Question: May the judges panel settle a scope question when every tier-1 source agrees and only a tier-2
  source differs?
- In play: how many questions reach you.
- Options: A yes, filed as a reversible call; B no, every scope question reaches you.
- If nobody answers: B (scope is on the must-escalate list).

**Q-D. Combining without asking**
- Question: Should pass 2 apply combinations automatically and report them, or propose them for your approval?
- In play: speed of first build against control.
- Options: A apply and flag (your "make the call, flag it after" rule); B propose only, as EUDPA-409 did.
- If nobody answers: A.

**Q-E. Review cost ceiling**
- Question: Should every content-changed file get both a style and a code reviewer, with no cap?
- In play: review thoroughness against agent count on large combined rows.
- Options: A no cap (quality first; ceilings keep rows small); B FA's cap of 12 plan-chosen files.
- If nobody answers: A.

**Q-F. EUDPA-409 remaining rows**
- Question: Should the remaining EUDPA-409 rows be translated into v2 as they are, or re-distilled from their
  sources?
- In play: whether the plants build continues on its current requirements or on re-verified ones.
- Options: A translate mechanically, strip recipe fields into a frozen `legacy/` file for the planner to read
  as hints; B re-distil through ABSORB with carryover.
- If nobody answers: A.

**Q-G. journey-builder**
- Question: Retire journey-builder wholesale once EUDPA-409 is migrated, or keep its spec tools as the
  journey-spec projection?
- In play: one skill fewer against a frontend-model projection some prompts still use.
- Options: A retire; B keep DIGEST spec tools as a projection only.
- If nobody answers: A.

**Q-H. Raw source retention**
- Question: May raw copies of Confluence, Jira and transcripts be kept in the tracked workarea?
- In play: reproducibility against sensitive content in git.
- Options: A keep raw gitignored, track only units (verbatim quotes of requirement text); B track raw too.
- If nobody answers: A.

---

## 10. Retire and migrate

| Asset | Fate | How |
|---|---|---|
| `.claude/workflows/increment-build-loop.js` | Retired after the parity proof passes | Deleted in the retirement increment; its lifecycle half lives on in `build-increment.js` |
| `.claude/workflows/codex/{implement,review,fix}.md`, `codex/schemas/*` | Retired | Content moves into `stages/*.md` and `executors/codex.md`; schemas regenerated per stage |
| `.claude/workflows/README.md` | Rewritten | Describes `distil.js`, `build-drain.js`, `build-increment.js`, args contract, canary results |
| `build-orchestrator` skill | Retired | Handover prompt and stop taxonomy move into `backlog-builder`; run-copy mechanism dropped |
| journey-builder BUILD mode, `next-increment.sh`, `commit-increment.sh`, `rollback-increment.sh`, `verify-increment.sh`, `MODEL_EXTENDER.md` | Retired | Removed; `targets.json` ladder data copied into migrated headers |
| journey-builder DIGEST/BACKLOG/PLAN, `backlog-generate.sh`, `backlog-plan-increment.sh`, `INCREMENT_PLANNER.md` | Retired after EUDPA-409 migration (Q-G) | Method into distiller personas; plan fields become `legacy/` hints |
| `frontend-alignment.js` (branch) | Not merged | Plan stage, report refresh, record-state, sync, local E2E, tiers carried into `build-increment.js`; helpers ported |
| `stages.json` (FA) | Frozen history | Optional ABSORB as a source; no build |
| EUDPA-409 `backlog.json` | Migrated | `tim backlog migrate --from loop-v1`: `detail` → `statement` (frozen), `acceptanceCriteria` strings → ACs with `confidence: inferred` and `witness` from wording, `repo`/`both`/null → `surfaces` via a mapping table, `absorbs`/`merged-into` → `combined` rows, `gate` → `needs`/`checkpoint`, lifecycle fields → `build/state.json`, recipe fields → `legacy/inc-NNN.json` (hints, binding false) |
| DR1-U (`origin/feat/parity-report-triage-view`) | Data onto main, then migrated | Cherry-pick only `workareas/shared/dr1-parity-union/`, `dr1u-handover/`, `dr1a-vs-dr1c-*`, `dr1u-notes.md` (G5 §10); migrate with `--from parity`; `decision.ruling: block` → `blocked` with a question; `rejected` → `dropped` |
| Trace backlogs (ched-pp, ched-p, ched-d, iuu) | Re-distilled when started | ABSORB mode; `conflicts.json`, `SPEC-GATE.md` as sources |
| Parity corpora (EUDPA-328*) | Frozen, readers unchanged | Source type `parity-corpus`; `rule-decision.sh` kept until no corpus needs it |
| `rule-decision.sh`, `decision-counts.sh`, `next-decision.sh`, `backlog-counts.sh` | Retired later | After the last parity corpus is frozen |
| Codex briefs on the triage-view branch | Discarded | Behind main (B §6) |
| CLAUDE.md skill routing | Updated | Rows for `requirements-distiller` and `backlog-builder`; remove `build-orchestrator`, `journey-builder`; fix the blank line breaking the `parity` row (`CLAUDE.md:30-44`) |
| `docs/reference/worker-references.md` | Updated | New personas |
| `docs/agent-skills.md`, `skill-creator` | Fixed | Remove Glob advice, remove settings.json appends (H §7.3) |
| `.gitignore` | Updated | Ignore `workareas/shared/*/build/logs/`, `*/sources/*/raw/`, `*/journal/`; remove batch-orchestrator whitelist (C §9.9) |
| Memory | Sam's to change | Notes the args folklore correction, the new skills |

---

## 11. Build backlog for this programme

Written in the v2 schema. Header trimmed to the fields that matter here; `sources` are the analysis files. The
programme builds in the workspace repo and tim, on one programme branch (`chore/NO_JIRA-requirements-pipeline`,
already cut), merge never.

```json
{
  "schemaVersion": 2,
  "programme": {
    "id": "requirements-pipeline",
    "title": "Requirements distiller and backlog builder",
    "purpose": "Turn loose requirements from many sources into a verified two-pass backlog with a decision-led report, and build that backlog under Claude or Codex to the same standard, reusing what the workspace already has.",
    "epic": null,
    "target": null
  },
  "repos": {
    "workspace": { "path": ".", "github": "DEFRA/trade-imports-workspace", "role": "tooling", "ladder": { "unit": null, "format": null, "lint": null, "fit": null, "e2e": null }, "mergeAfter": [] },
    "tim": { "path": "tim", "github": "DEFRA/trade-imports-workspace", "role": "tooling", "ladder": { "unit": "test", "format": "format:check", "lint": "lint", "fit": null, "e2e": null }, "mergeAfter": [] }
  },
  "lifecycle": {
    "strategy": "programme",
    "branch": "chore/NO_JIRA-requirements-pipeline",
    "base": "main",
    "tickets": "none",
    "merge": { "policy": "never", "decision": null },
    "draftPrs": true,
    "phases": { "sync": "on", "localE2e": "off", "workspaceE2e": "off" }
  },
  "sources": [
    { "id": "sam-requirements", "type": "markdown", "role": "requirement", "tier": 1, "title": "Sam's hard requirements R1 to R6", "locator": "workareas/shared/requirements-pipeline/analysis/sam-requirements.md", "version": "2026-09-18", "pin": { "sha": null, "fetchedAt": "2026-09-18", "pushed": null, "dirty": null }, "seal": { "kind": "document", "contentHash": "", "at": "2026-09-18" }, "characterisation": null, "unitsFile": null, "provenanceScheme": "R<n>/para:<k>", "absence": null },
    { "id": "rules-probe", "type": "markdown", "role": "constraint", "tier": 1, "title": "Rules, skills and hooks probe", "locator": "workareas/shared/requirements-pipeline/analysis/rules-probe.md", "version": "2026-09-18", "pin": { "sha": null, "fetchedAt": "2026-09-18", "pushed": null, "dirty": null }, "seal": { "kind": "document", "contentHash": "", "at": "2026-09-18" }, "characterisation": null, "unitsFile": null, "provenanceScheme": "conclusion:<n>", "absence": null },
    { "id": "synthesis", "type": "markdown", "role": "constraint", "tier": 2, "title": "Synthesis of the analysis", "locator": "workareas/shared/requirements-pipeline/analysis/00-synthesis.md", "version": "2026-09-18", "pin": { "sha": null, "fetchedAt": "2026-09-18", "pushed": null, "dirty": null }, "seal": { "kind": "document", "contentHash": "", "at": "2026-09-18" }, "characterisation": null, "unitsFile": null, "provenanceScheme": "S§<n>", "absence": null }
  ],
  "precedence": [{ "factKind": "scope", "order": ["sam-requirements", "rules-probe", "synthesis"], "why": "Sam's requirements are non-negotiable" }],
  "invariants": [
    { "id": "inv-no-recipe-in-backlog", "text": "No backlog row carries files, steps, commands or code.", "why": "R1", "provenance": ["sam-requirements#R1/para:3"], "appliesTo": {} },
    { "id": "inv-executor-neutral-backlog", "text": "No backlog field is specific to one executor.", "why": "R5", "provenance": ["sam-requirements#R5/para:2"], "appliesTo": {} },
    { "id": "inv-personas-live", "text": "Review and style personas, bundles and routing are read live by path, never copied.", "why": "R2", "provenance": ["sam-requirements#R2/para:1"], "appliesTo": {} },
    { "id": "inv-tim-rails", "text": "tim changes follow tim/CLAUDE.md: behavioural tests on input and output, library-first, no shell-out to tools/.", "why": "house rule", "provenance": ["synthesis#S§7.5"], "appliesTo": { "repos": ["tim"] } }
  ],
  "scopeExclusions": [
    { "id": "sx-cdp-platform", "text": "Any change to CDP platform repos", "why": "never written by AI", "decision": null, "provenance": ["synthesis#S§7.6"] }
  ],
  "deviations": [],
  "assumptions": [
    { "id": "as-programme-branch", "text": "This programme builds on its existing branch with draft PRs.", "default": "programme strategy, merge never", "confidence": "stated", "reviseIf": "Sam rules Q-A differently for this programme", "decision": null, "provenance": [] }
  ],
  "conflicts": [],
  "questions": [],
  "decisions": [],
  "combination": { "rules": [], "ceilings": {}, "applied": [], "declined": [], "basis": null },
  "distillation": { "phaseLedger": null, "runs": [], "contract": null, "headsAt": null },
  "increments": [
    {
      "id": "inc-001", "key": "runtime--args-and-child-workflow-proven", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "The Workflow runtime's args and child-workflow behaviour is proven",
      "kind": "spike",
      "statement": "The team MUST know, on the current Claude Code version, how args arrive, whether a zero-agent child can return data, whether a child is re-read on each call, and how a resumed parent treats child agents.",
      "statementAsDistilled": "The team MUST know, on the current Claude Code version, how args arrive, whether a zero-agent child can return data, whether a child is re-read on each call, and how a resumed parent treats child agents.",
      "why": "The drain parent and args-only config rest on these facts; the args folklore caused a silent wrong build.",
      "needRefs": ["synthesis#S§7.1.3"],
      "actors": ["maintainer"],
      "surfaces": [{ "repo": "workspace", "area": "workflows" }],
      "acceptance": [
        { "id": "ac-1", "given": "a canary launched with object args, string args and no args", "when": "it runs", "then": "the recorded result states the type each arrived as, against the Claude Code version", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§7.1.3", "source": "synthesis", "quote": "Run a zero-agent canary on the current runtime first", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "a parent calling a child twice with the child edited between calls", "when": "it runs", "then": "the record states whether the second call ran the edited child", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§7.1.7", "source": "synthesis", "quote": "whether the child file is re-read per call is inferred, not documented", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-3", "given": "a parent with a one-agent child that is killed and resumed", "when": "it resumes", "then": "the record states whether the child's completed agents were replayed from cache", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§7.1.7", "source": "synthesis", "quote": "resume across children is undocumented", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": [], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [{ "ref": "gap-4.md §5", "why": "canary sketch" }], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": [], "sequencing": [], "size": { "class": "S", "basis": "3 ACs, zero-agent scripts" }, "milestone": "m0-proofs",
      "provenance": { "sources": ["synthesis"], "slice": "runtime", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-002", "key": "ports--branch-only-helpers-and-data-on-main", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Proven helpers and the DR1-U build record are on main",
      "kind": "hygiene",
      "statement": "Main MUST carry the draft-PR and PR-check watcher helpers from the alignment branch, the repo-clone option of the npm helper, and the DR1-U backlog, notes and merge workflow, without any loop change from the triage-view branch.",
      "statementAsDistilled": "Main MUST carry the draft-PR and PR-check watcher helpers from the alignment branch, the repo-clone option of the npm helper, and the DR1-U backlog, notes and merge workflow, without any loop change from the triage-view branch.",
      "why": "The builder depends on the helpers; DR1-U is the migration template and is unreachable from main.",
      "needRefs": ["synthesis#S§8.11", "synthesis#S§2.2(7)"],
      "actors": ["maintainer"],
      "surfaces": [{ "repo": "workspace", "area": "tools" }, { "repo": "workspace", "area": "workareas-shared" }],
      "acceptance": [
        { "id": "ac-1", "given": "a PR whose checks time out or have none configured", "when": "the checks watcher runs", "then": "it exits with a code that is never the green code", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.2#24", "source": "synthesis", "quote": "2 = unresolved ≠ green, 4 = no checks ≠ green", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "main after this change", "when": "the loop file is compared with main before it", "then": "it is unchanged", "witness": "review", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.4", "source": "synthesis", "quote": "Behind main; would regress seven commits", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-3", "given": "main after this change", "when": "someone looks for the DR1-U backlog", "then": "it is present with its 118 built rows' records intact", "witness": "review", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§8.11", "source": "synthesis", "quote": "Do bring its DR1-U data and paths onto main", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": [], "consistentWith": [], "outOfScope": [{ "text": "Porting frontend-alignment.js itself", "why": "superseded by build-increment.js", "ref": null }],
      "hints": { "exemplars": [], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": [], "sequencing": [], "size": { "class": "S", "basis": "3 ACs, file ports" }, "milestone": "m0-proofs",
      "provenance": { "sources": ["synthesis"], "slice": "ports", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-003", "key": "writer--core-lifted-parity-unchanged", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "The parity writer's core is reusable and parity behaves exactly as before",
      "kind": "capability",
      "statement": "tim MUST offer a domain-free backlog core (ids, reference resolution, ruling-safe merge, refusal guards, atomic write, schema idiom) that the parity commands use without any change in their behaviour.",
      "statementAsDistilled": "tim MUST offer a domain-free backlog core (ids, reference resolution, ruling-safe merge, refusal guards, atomic write, schema idiom) that the parity commands use without any change in their behaviour.",
      "why": "Generalise the tested writer rather than write a new one.",
      "needRefs": ["synthesis#S§7.5"],
      "actors": ["maintainer"],
      "surfaces": [{ "repo": "tim", "area": "backlog-core" }, { "repo": "tim", "area": "parity" }],
      "acceptance": [
        { "id": "ac-1", "given": "the existing parity test suite including the tracked EUDPA-328 contract test", "when": "it runs against the refactor", "then": "every test passes unchanged", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§4.5", "source": "synthesis", "quote": "report.contract.test.js parses the tracked EUDPA-328 backlog in tim CI", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "two writers updating the same backlog at once", "when": "both finish", "then": "neither change is lost and neither leaves a torn file", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§4.6", "source": "synthesis", "quote": "two parallel set-slot calls can overwrite each other", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-tim-rails"], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [{ "ref": "tim/src/parity/ingest.js", "why": "source of the core" }], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": [], "sequencing": [], "size": { "class": "M", "basis": "2 ACs, refactor under an existing suite" }, "milestone": "m1-writer",
      "provenance": { "sources": ["synthesis"], "slice": "writer", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-004", "key": "writer--v2-schema-ingest-and-guards", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "A v2 backlog can be created, ingested and validated",
      "kind": "capability",
      "statement": "tim MUST create, ingest (atomic and combined) and validate v2 backlogs, refusing recipe-shaped or executor-specific keys, dangling or cyclic references, author-equals-verifier, and credential-shaped text.",
      "statementAsDistilled": "tim MUST create, ingest (atomic and combined) and validate v2 backlogs, refusing recipe-shaped or executor-specific keys, dangling or cyclic references, author-equals-verifier, and credential-shaped text.",
      "why": "The schema is the mechanical form of R1 and R5; the writer is the only safe way to change state.",
      "needRefs": ["sam-requirements#R1/para:3", "sam-requirements#R5/para:2"],
      "actors": ["distiller", "builder"],
      "surfaces": [{ "repo": "tim", "area": "backlog" }],
      "acceptance": [
        { "id": "ac-1", "given": "an atom file carrying a file list or an executor field", "when": "it is ingested", "then": "the ingest refuses and names the file and the field", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "sam-requirements#R5/para:2", "source": "sam-requirements", "quote": "backlog.json carries nothing specific to one executor", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "a combined file whose members form a dependency cycle", "when": "it is ingested", "then": "the ingest refuses and names the cycle", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§7.5", "source": "synthesis", "quote": "dependsOn resolution from slugs with cycle detection", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-3", "given": "a re-ingest after a regrouping", "when": "a combined row that has started would be dissolved", "then": "the ingest refuses and keeps the row", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§7.8", "source": "synthesis", "quote": "ingest refuses to strike a ruled or started item", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-4", "given": "the same atoms ingested twice", "when": "the second ingest finishes", "then": "every id is unchanged", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§8.6", "source": "synthesis", "quote": "stable slug ids never renumbered", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-tim-rails", "inv-no-recipe-in-backlog", "inv-executor-neutral-backlog"], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": ["inc-003"], "sequencing": [], "size": { "class": "M", "basis": "4 ACs, 1 surface" }, "milestone": "m1-writer",
      "provenance": { "sources": ["sam-requirements", "synthesis"], "slice": "writer", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-005", "key": "writer--questions-rulings-counts-and-derive", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Questions, rulings, progress counts and the next buildable row come from one tool",
      "kind": "capability",
      "statement": "tim MUST record questions and rulings (including tentative answers), derive what each question blocks, report progress as N of TOTAL with deferred named, and name the next buildable rows by one rule.",
      "statementAsDistilled": "tim MUST record questions and rulings (including tentative answers), derive what each question blocks, report progress as N of TOTAL with deferred named, and name the next buildable rows by one rule.",
      "why": "Three awaiting-a-ruling definitions and three buildability rules exist today.",
      "needRefs": ["synthesis#S§4.5", "synthesis#S§3.1"],
      "actors": ["sam", "builder"],
      "surfaces": [{ "repo": "tim", "area": "backlog" }],
      "acceptance": [
        { "id": "ac-1", "given": "a ruling given with the words 'maybe B?'", "when": "it is recorded as outstanding", "then": "the question stays unruled and the rows it blocks stay unbuildable", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§9.4", "source": "synthesis", "quote": "write a tentative answer (\"maybe?\") as outstanding", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "a must-answer question with no ruling", "when": "the next buildable rows are derived", "then": "no row it blocks is offered and the reason is printed", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§9.4", "source": "synthesis", "quote": "Do security, access-control and data-integrity questions become gates the builder refuses to pass", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-3", "given": "a backlog with done, todo and deferred rows", "when": "counts are asked for", "then": "progress reads 'N of TOTAL (P%)' with deferred named separately", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.3", "source": "synthesis", "quote": "Progress as N of TOTAL (P%), deferred excluded", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-tim-rails"], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": ["inc-004"], "sequencing": [], "size": { "class": "M", "basis": "3 ACs, 1 surface" }, "milestone": "m1-writer",
      "provenance": { "sources": ["synthesis"], "slice": "writer", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-006", "key": "report--decision-led-render-from-json", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "A decision-led report renders from any v2 backlog",
      "kind": "capability",
      "statement": "tim MUST render a v2 backlog as a page that leads with questions needing a ruling, then reversible calls, then weak evidence, then the backlog, with every number derived, headlines before ids, visuals beside questions, a batch-ruling control and a slug-keyed answer sheet.",
      "statementAsDistilled": "tim MUST render a v2 backlog as a page that leads with questions needing a ruling, then reversible calls, then weak evidence, then the backlog, with every number derived, headlines before ids, visuals beside questions, a batch-ruling control and a slug-keyed answer sheet.",
      "why": "Report quality is Sam's top priority; the ruling surface only worked once questions came first.",
      "needRefs": ["sam-requirements#R1/para:5"],
      "actors": ["sam"],
      "surfaces": [{ "repo": "tim", "area": "distil-report" }],
      "acceptance": [
        { "id": "ac-1", "given": "a backlog with open, outstanding and ruled questions", "when": "the report renders", "then": "only open and outstanding questions appear under 'Needs your ruling', must-answer first, each with headline, in play, options with evidence, and 'If nobody answers'", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.3", "source": "synthesis", "quote": "headline question, what is in play, options with a count on each side, \"If nobody answers\" default", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "rulings picked on several cards", "when": "the batch is copied", "then": "one ruling command per line is produced, keyed by question slug", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.3", "source": "synthesis", "quote": "batch ruling that emits one command per line", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-3", "given": "a changed count in the backlog", "when": "the report renders", "then": "the masthead sentence reflects the new count with nothing typed in", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.3", "source": "synthesis", "quote": "Generated from JSON, every number derived", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-tim-rails"], "consistentWith": [{ "ref": "tim parity report", "relation": "variant-of", "divergence": "requirement-first cards with N sources instead of two sides" }], "outOfScope": [], "hints": { "exemplars": [{ "ref": "tim/src/parity/render/", "why": "theme, prose, citations" }], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "walkthrough",
      "dependsOn": ["inc-005"], "sequencing": [], "size": { "class": "L", "basis": "3 ACs, a renderer with two emitters" }, "milestone": "m1-writer",
      "provenance": { "sources": ["sam-requirements", "synthesis"], "slice": "report", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-007", "key": "migrate--loop-v1-and-parity-backlogs", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Existing EUDPA-409 and DR1-U backlogs read as v2 without losing a ruling",
      "kind": "capability",
      "statement": "tim MUST translate loop-v1 and parity-union backlogs into v2, moving recipe fields into non-binding legacy hints and lifecycle fields into build state, and keeping every id, ruling and built record.",
      "statementAsDistilled": "tim MUST translate loop-v1 and parity-union backlogs into v2, moving recipe fields into non-binding legacy hints and lifecycle fields into build state, and keeping every id, ruling and built record.",
      "why": "Proves the schema on real data before anything builds on it, and gives the builder a real backlog.",
      "needRefs": ["synthesis#S§9.2 Q17"],
      "actors": ["maintainer"],
      "surfaces": [{ "repo": "tim", "area": "backlog-migrate" }, { "repo": "workspace", "area": "workareas-shared" }],
      "acceptance": [
        { "id": "ac-1", "given": "the EUDPA-409 backlog", "when": "it is migrated", "then": "row count, ids, done records and absorbed groupings match the source, and no v2 row carries a recipe field", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§9.2 Q17", "source": "synthesis", "quote": "keep inc-NNN stable, never change frozen detail or lose a ruling", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "the DR1-U backlog with block, deferred and rejected rulings", "when": "it is migrated", "then": "each ruling is a decision record and each held row is unbuildable", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§4.5", "source": "synthesis", "quote": "DR1-U uses ruling block and statuses deferred and rejected", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-tim-rails"], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": ["inc-005", "inc-002"], "sequencing": [], "size": { "class": "M", "basis": "2 ACs, 2 input shapes" }, "milestone": "m1-writer",
      "provenance": { "sources": ["synthesis"], "slice": "migrate", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-008", "key": "context--rules-and-review-context-resolved-live", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Every stage can be told which rules, bundles and personas apply to its files",
      "kind": "capability",
      "statement": "The builder MUST resolve, at run time, the rule files matching each planned or changed file, the best-practice files they point to, the CLAUDE.md chain and imports, the code-style topics and bundles from that skill's own router and baker, and the review skill's tech detection.",
      "statementAsDistilled": "The builder MUST resolve, at run time, the rule files matching each planned or changed file, the best-practice files they point to, the CLAUDE.md chain and imports, the code-style topics and bundles from that skill's own router and baker, and the review skill's tech detection.",
      "why": "Codex gets no rules natively; Claude needs a checklist; both must see the same set.",
      "needRefs": ["sam-requirements#R3/para:1", "rules-probe#conclusion:4"],
      "actors": ["builder"],
      "surfaces": [{ "repo": "tim", "area": "rules" }, { "repo": "workspace", "area": "tools-build" }],
      "acceptance": [
        { "id": "ac-1", "given": "a new rule file with a paths glob added to .claude/rules", "when": "context is resolved for a matching file", "then": "the new rule is listed with no code change", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "rules-probe#conclusion:4", "source": "rules-probe", "quote": "Resolve it at run time, not from a hardcoded table, so a new rule is picked up automatically", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "a Playwright spec file", "when": "context is resolved", "then": "both the playwright and node style bundles are listed, produced by the code-style skill's own tools", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "sam-requirements#R2/para:1", "source": "sam-requirements", "quote": "any mode or bundle routing the skill defines", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-3", "given": "a file under tim/src/commands", "when": "context is resolved", "then": "tim/CLAUDE.md with its imports and tim's cli-patterns rule are listed", "witness": "unit", "confidence": "observed", "evidence": [{ "unit": "rules-probe#table:row1", "source": "rules-probe", "quote": "plus tim/CLAUDE.md with its @ imports", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-personas-live", "inv-tim-rails"], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": [], "sequencing": [], "size": { "class": "M", "basis": "3 ACs, 2 surfaces" }, "milestone": "m2-builder",
      "provenance": { "sources": ["sam-requirements", "rules-probe"], "slice": "executors", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-009", "key": "codex--stage-runner-committed", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Codex stages start, wait and resume through one committed script",
      "kind": "capability",
      "statement": "The builder MUST run any number of concurrent Codex jobs through a committed tool that starts them detached, waits in bounded slices, resumes a dead session, and reports only transport, so no agent prompt carries compound shell or unallowlisted commands.",
      "statementAsDistilled": "The builder MUST run any number of concurrent Codex jobs through a committed tool that starts them detached, waits in bounded slices, resumes a dead session, and reports only transport, so no agent prompt carries compound shell or unallowlisted commands.",
      "why": "The current prompt-prose slicing breaks its own rails and cannot fan out per file.",
      "needRefs": ["sam-requirements#R6/para:3", "synthesis#S§7.3"],
      "actors": ["builder"],
      "surfaces": [{ "repo": "workspace", "area": "tools-codex" }],
      "acceptance": [
        { "id": "ac-1", "given": "six Codex jobs started together", "when": "the waiter is called until done", "then": "each job's last message and log exist and the waiter never exceeds the Bash ceiling per call", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "sam-requirements#R6/para:3", "source": "sam-requirements", "quote": "Codex fans out one codex exec per file too, run concurrently", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "a Codex job whose process died mid-slice", "when": "the waiter runs", "then": "it resumes the session and says so", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§7.3", "source": "synthesis", "quote": "on timeout, kill, grep session id:, codex exec <flags> resume <id>", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": [], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": [], "sequencing": [], "size": { "class": "S", "basis": "2 ACs, 1 script" }, "milestone": "m2-builder",
      "provenance": { "sources": ["sam-requirements", "synthesis"], "slice": "executors", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-010", "key": "builder--one-increment-claude-mode-to-acceptance", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "One increment builds end to end in Claude mode with independent acceptance",
      "kind": "capability",
      "statement": "The builder MUST take one requirement-only row from plan through independent acceptance check, land, PR and CI under each lifecycle strategy, with review personas read live and no silent success.",
      "statementAsDistilled": "The builder MUST take one requirement-only row from plan through independent acceptance check, land, PR and CI under each lifecycle strategy, with review personas read live and no silent success.",
      "why": "The plan stage is what lets the backlog be a requirement; acceptance keeps intent intact.",
      "needRefs": ["sam-requirements#R1/para:3", "sam-requirements#R2/para:1"],
      "actors": ["sam", "builder"],
      "surfaces": [{ "repo": "workspace", "area": "workflows" }, { "repo": "workspace", "area": "skill-backlog-builder" }],
      "acceptance": [
        { "id": "ac-1", "given": "a row with no file list", "when": "it is built", "then": "a plan maps every acceptance criterion to a proof and the plan audit approves it before any code changes", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "sam-requirements#R1/para:3", "source": "sam-requirements", "quote": "The workflow owns the implementation, and plans it just in time", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "a reviewer agent that returns nothing", "when": "the review stage finishes", "then": "the increment turns red with the missing reviewer named", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.4", "source": "synthesis", "quote": "Violates \"a crashed reviewer must never read as approval\"", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-3", "given": "a change that meets the plan but not one backlog criterion", "when": "acceptance runs", "then": "that criterion is reported unmet and the increment does not land", "witness": "manual", "confidence": "inferred", "evidence": [{ "unit": "synthesis#S§9.3 Q27", "source": "synthesis", "quote": "a plan can prove the wrong thing", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-4", "given": "a change to a review persona file between two builds", "when": "the second build reviews", "then": "the second build's reviewers follow the changed persona", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "sam-requirements#R2/para:1", "source": "sam-requirements", "quote": "any update to either skill is picked up automatically", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-personas-live", "inv-no-recipe-in-backlog"], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [{ "ref": "increment-build-loop.js lifecycle; FA plan stage", "why": "the two halves" }], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "walkthrough",
      "dependsOn": ["inc-001", "inc-005", "inc-007", "inc-008"], "sequencing": [], "size": { "class": "L", "basis": "4 ACs, the main workflow" }, "milestone": "m2-builder",
      "provenance": { "sources": ["sam-requirements", "synthesis"], "slice": "builder", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-011", "key": "builder--drain-and-sentence-switching", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "A backlog drains in one launch and the executor switches by a sentence",
      "kind": "capability",
      "statement": "The builder MUST drain buildable rows in one launch with a landed check after each, halt on red, repeated reds or a checkpoint, and switch executor per increment from run state when Sam says so, with no backlog edit.",
      "statementAsDistilled": "The builder MUST drain buildable rows in one launch with a landed check after each, halt on red, repeated reds or a checkpoint, and switch executor per increment from run state when Sam says so, with no backlog edit.",
      "why": "Switching is a sentence, not a config edit (R6).",
      "needRefs": ["sam-requirements#R6/para:4"],
      "actors": ["sam"],
      "surfaces": [{ "repo": "workspace", "area": "workflows" }, { "repo": "tim", "area": "build" }],
      "acceptance": [
        { "id": "ac-1", "given": "a running drain and Sam saying 'Codex for the rest'", "when": "the next increment starts", "then": "it runs its heavy stages on Codex and backlog.json is byte-identical", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "sam-requirements#R5/para:4", "source": "sam-requirements", "quote": "Switching executor part-way through a backlog must need no backlog edit", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "a row appended while a drain runs", "when": "the drain derives its next row", "then": "the appended row is considered", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.2#20", "source": "synthesis", "quote": "FA self-drain with re-read so appended items are picked up without relaunch", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-executor-neutral-backlog"], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": ["inc-010"], "sequencing": [], "size": { "class": "M", "basis": "2 ACs, parent workflow and skill" }, "milestone": "m2-builder",
      "provenance": { "sources": ["sam-requirements", "synthesis"], "slice": "builder", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-012", "key": "codex--adapter-and-parity-proof", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Codex builds an increment to the same standard as Claude, proven side by side",
      "kind": "capability",
      "statement": "In Codex mode the builder MUST run the same stages, personas, granularity, rules and schemas as Claude mode, with Claude kept to orchestration, and a side-by-side comparison MUST show equal review coverage and all acceptance criteria met in both.",
      "statementAsDistilled": "In Codex mode the builder MUST run the same stages, personas, granularity, rules and schemas as Claude mode, with Claude kept to orchestration, and a side-by-side comparison MUST show equal review coverage and all acceptance criteria met in both.",
      "why": "Codex has to be seamless and just as good (R6).",
      "needRefs": ["sam-requirements#R6/para:1", "sam-requirements#R6/para:5"],
      "actors": ["sam"],
      "surfaces": [{ "repo": "workspace", "area": "workflows" }, { "repo": "workspace", "area": "skill-backlog-builder" }, { "repo": "tim", "area": "build" }],
      "acceptance": [
        { "id": "ac-1", "given": "one small row built once each way from the same base", "when": "the two runs are compared", "then": "reviewer job counts are equal and every acceptance criterion is met in both", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "sam-requirements#R6/para:5", "source": "sam-requirements", "quote": "run one small increment each way and compare how thorough the review was", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "a Codex-mode build", "when": "its Claude agents are listed", "then": "none of them planned, implemented, reviewed, verified, judged or fixed", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "sam-requirements#R6/para:3", "source": "sam-requirements", "quote": "Claude keeps only thin orchestration", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-3", "given": "a Codex reviewer's output missing a key", "when": "the relay checks it", "then": "the stage fails loudly", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "sam-requirements#R6/para:1", "source": "sam-requirements", "quote": "a confidence value folded into prose", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-personas-live", "inv-executor-neutral-backlog"], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "walkthrough",
      "dependsOn": ["inc-009", "inc-011"], "sequencing": [], "size": { "class": "L", "basis": "3 ACs, adapter and comparison" }, "milestone": "m2-builder",
      "provenance": { "sources": ["sam-requirements"], "slice": "executors", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-013", "key": "distil--ledger-heads-seals-and-units", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "A distillation's phases, pins and source units are recorded and checked",
      "kind": "capability",
      "statement": "tim MUST keep a distillation phase ledger with prerequisites, notes, artefact fingerprints and cascading resets, pin repos and seal every source kind, and prove every source has verified units or a stated absence.",
      "statementAsDistilled": "tim MUST keep a distillation phase ledger with prerequisites, notes, artefact fingerprints and cascading resets, pin repos and seal every source kind, and prove every source has verified units or a stated absence.",
      "why": "Half a slice on disk looks like a finished slice; only a ledger tells them apart.",
      "needRefs": ["synthesis#S§6.1#25"],
      "actors": ["distiller"],
      "surfaces": [{ "repo": "tim", "area": "distil" }],
      "acceptance": [
        { "id": "ac-1", "given": "a phase reset after later phases are done", "when": "status is asked for", "then": "every dependant phase shows as not done", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.1#25", "source": "synthesis", "quote": "restarting a phase does not reset later phases", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "a repo that was dirty when pinned", "when": "heads are checked strictly", "then": "the check fails and names the repo", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§7.5", "source": "synthesis", "quote": "dirty-at-start is never flagged", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-3", "given": "a Confluence source whose page changed after sealing", "when": "drift is checked", "then": "the change is reported against that source", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§7.5", "source": "synthesis", "quote": "seals cover screenshots only", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-tim-rails"], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [{ "ref": "tools/parity/phase.sh; tim/src/parity/{heads,seals}.js", "why": "precedents" }], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": ["inc-003"], "sequencing": [], "size": { "class": "M", "basis": "3 ACs, 1 surface" }, "milestone": "m3-distiller",
      "provenance": { "sources": ["synthesis"], "slice": "distiller", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-014", "key": "distil--completeness-proofs", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Every source unit is provably owned, cited or accounted for",
      "kind": "capability",
      "statement": "tim MUST prove that every source unit is owned by exactly one slice with one cross-cutting owner, that no author was truncated, that every unit is cited or accounted for with a reason, and list all-pairs duplicate and combine candidates on requirement signals.",
      "statementAsDistilled": "tim MUST prove that every source unit is owned by exactly one slice with one cross-cutting owner, that no author was truncated, that every unit is cited or accounted for with a reason, and list all-pairs duplicate and combine candidates on requirement signals.",
      "why": "Completeness is proven by tools, not by reading order.",
      "needRefs": ["synthesis#S§6.1#25"],
      "actors": ["distiller"],
      "surfaces": [{ "repo": "tim", "area": "distil" }],
      "acceptance": [
        { "id": "ac-1", "given": "a unit that no atom cites and no record excuses", "when": "the trace check runs strictly", "then": "it fails and names the unit", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.1#25", "source": "synthesis", "quote": "diffs what each source has, read from the source itself, against what was gathered", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "two duplicate atoms in the same slice", "when": "duplicates are listed", "then": "the pair is a candidate", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.1#25", "source": "synthesis", "quote": "missed a within-slice duplicate DR1C found by hand", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-3", "given": "two atoms across a question boundary", "when": "combine candidates are listed", "then": "the pair is excluded with the rule named", "witness": "unit", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.1#17", "source": "synthesis", "quote": "never across a gate or milestone", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-tim-rails"], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [{ "ref": "tim/src/parity/{slices,yield,duplicates,coverage}.js", "why": "set algebra" }], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": ["inc-013"], "sequencing": [], "size": { "class": "M", "basis": "3 ACs, 1 surface" }, "milestone": "m3-distiller",
      "provenance": { "sources": ["synthesis"], "slice": "distiller", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-015", "key": "distil--pass-one-atoms-verified", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Loose sources become verified atoms with provenance",
      "kind": "capability",
      "statement": "The distiller MUST characterise every source, verify its extraction by a different agent, slice the service, author atoms per slice, verify each by a different agent, close thin slices, and ingest only verified atoms.",
      "statementAsDistilled": "The distiller MUST characterise every source, verify its extraction by a different agent, slice the service, author atoms per slice, verify each by a different agent, close thin slices, and ingest only verified atoms.",
      "why": "Pass 1 writes the smallest increments until every requirement is identified (R1).",
      "needRefs": ["sam-requirements#R1/para:4"],
      "actors": ["sam", "distiller"],
      "surfaces": [{ "repo": "workspace", "area": "skill-requirements-distiller" }, { "repo": "workspace", "area": "workflows" }],
      "acceptance": [
        { "id": "ac-1", "given": "a docx, a Confluence page, an image board and a transcript as sources", "when": "pass 1 finishes", "then": "every atom's criteria quote their sources verbatim and every proof P1 to P7 passes", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "sam-requirements#R1/para:1", "source": "sam-requirements", "quote": "takes loose requirements from anywhere, including several complementary sources", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "an author and a verifier", "when": "an atom is ingested", "then": "they are recorded and different", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§6.1#25", "source": "synthesis", "quote": "nothing checks the verifier is a different agent from the author", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": ["inv-no-recipe-in-backlog"], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [{ "ref": "workareas/shared/dr1c-parity/author-workflow.js", "why": "pipeline shape" }], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "walkthrough",
      "dependsOn": ["inc-014", "inc-004", "inc-001"], "sequencing": [], "size": { "class": "L", "basis": "2 ACs, skill, personas, workflow" }, "milestone": "m3-distiller",
      "provenance": { "sources": ["sam-requirements", "synthesis"], "slice": "distiller", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-016", "key": "distil--conflicts-panel-and-questions", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Disagreements are adjudicated and only real decisions reach Sam, well asked",
      "kind": "capability",
      "statement": "The distiller MUST record every disagreement between sources, settle what precedence and the panel may settle, escalate what they may not, critique completeness with a fresh agent, and turn open matters into clustered, linted four-part questions ranked by blast radius.",
      "statementAsDistilled": "The distiller MUST record every disagreement between sources, settle what precedence and the panel may settle, escalate what they may not, critique completeness with a fresh agent, and turn open matters into clustered, linted four-part questions ranked by blast radius.",
      "why": "596 questions cannot be ruled on; 9 well-asked ones were ruled in one batch.",
      "needRefs": ["synthesis#S§6.3"],
      "actors": ["sam"],
      "surfaces": [{ "repo": "workspace", "area": "skill-requirements-distiller" }, { "repo": "workspace", "area": "workflows" }],
      "acceptance": [
        { "id": "ac-1", "given": "a security disagreement the panel could pick a side on", "when": "the panel runs", "then": "it escalates to a must-answer question instead of ruling", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§9.2 Q12", "source": "synthesis", "quote": "what must escalate to Sam (policy, legal, scope, security and data integrity, high cost of reversal)", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "the same unresolved matter raised by many atoms", "when": "questions are edited", "then": "it becomes one question that lists every row it blocks", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§2.1 row 4", "source": "synthesis", "quote": "one etag decision copied onto 16 rows", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": [], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [{ "ref": "EUDPA-409 panel files", "why": "docket shape" }], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": ["inc-015", "inc-005"], "sequencing": [], "size": { "class": "L", "basis": "2 ACs, 3 phases" }, "milestone": "m3-distiller",
      "provenance": { "sources": ["synthesis"], "slice": "distiller", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-017", "key": "distil--pass-two-combine-rederivable", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Related atoms combine into fewer increments, and survive re-derivation",
      "kind": "capability",
      "statement": "The distiller MUST combine related atoms on requirement signals within stated ceilings, record every combination with its risk and every pair it left alone with a reason, and re-run after rulings without renumbering or regrouping started rows.",
      "statementAsDistilled": "The distiller MUST combine related atoms on requirement signals within stated ceilings, record every combination with its risk and every pair it left alone with a reason, and re-run after rulings without renumbering or regrouping started rows.",
      "why": "Pass 2 cuts per-increment workflow overhead (R1).",
      "needRefs": ["sam-requirements#R1/para:4"],
      "actors": ["sam"],
      "surfaces": [{ "repo": "workspace", "area": "skill-requirements-distiller" }, { "repo": "tim", "area": "distil" }],
      "acceptance": [
        { "id": "ac-1", "given": "a completed pass 1", "when": "pass 2 runs", "then": "every atom is standalone or in exactly one combined increment, and every candidate pair is applied or declined with a reason", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "sam-requirements#R1/para:4", "source": "sam-requirements", "quote": "pass 2 then combines related increments", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null },
        { "id": "ac-2", "given": "a ruling that drops one member of a combined increment that has not started", "when": "rulings are applied", "then": "the increment regroups, keeps its id if its key is unchanged, and the report shows the change", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§7.8", "source": "synthesis", "quote": "Combining is data, re-derivable after every ruling", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": [], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [{ "ref": "combination-proposal.md; DUPLICATE_SWEEPER.md", "why": "rules and bookkeeping" }], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": ["inc-016"], "sequencing": [], "size": { "class": "M", "basis": "2 ACs, 1 phase" }, "milestone": "m3-distiller",
      "provenance": { "sources": ["sam-requirements", "synthesis"], "slice": "distiller", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-018", "key": "distil--rulings-flow-back-end-to-end", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Sam's rulings change the backlog and the report with no hand edits",
      "kind": "capability",
      "statement": "A ruling given on the page, the answer sheet or in conversation MUST be recorded with Sam's words, applied to the requirements, followed by re-combination and a re-rendered report that moves the question to 'Rulings applied' with its effects.",
      "statementAsDistilled": "A ruling given on the page, the answer sheet or in conversation MUST be recorded with Sam's words, applied to the requirements, followed by re-combination and a re-rendered report that moves the question to 'Rulings applied' with its effects.",
      "why": "Identity in prose broke rulings before; the loop must be closed by data.",
      "needRefs": ["synthesis#S§8.9"],
      "actors": ["sam"],
      "surfaces": [{ "repo": "workspace", "area": "skill-requirements-distiller" }, { "repo": "tim", "area": "backlog" }],
      "acceptance": [
        { "id": "ac-1", "given": "an answer sheet with three rulings keyed by question slug", "when": "it is applied", "then": "the three questions show as ruled with Sam's words and the rows they blocked are buildable", "witness": "manual", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§9.4 Q34", "source": "synthesis", "quote": "a paste-ready answer sheet keyed by slug", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": [], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "walkthrough",
      "dependsOn": ["inc-017", "inc-006"], "sequencing": [], "size": { "class": "M", "basis": "1 AC, applier phase and skill mode" }, "milestone": "m3-distiller",
      "provenance": { "sources": ["synthesis"], "slice": "distiller", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-019", "key": "distil--canary-on-real-sources-and-report-verified", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "A real distillation is run and its report checked against an earlier one",
      "kind": "spike",
      "statement": "The distiller MUST be run on a real, small multi-source programme and its report and backlog compared with the existing hand-run output for the same sources, with every machine-written report sentence checked by a different agent.",
      "statementAsDistilled": "The distiller MUST be run on a real, small multi-source programme and its report and backlog compared with the existing hand-run output for the same sources, with every machine-written report sentence checked by a different agent.",
      "why": "Canary first, then fan out; quality is proven, not asserted.",
      "needRefs": ["synthesis#S§6.1#23"],
      "actors": ["sam"],
      "surfaces": [{ "repo": "workspace", "area": "workareas-shared" }],
      "acceptance": [
        { "id": "ac-1", "given": "the CHED-D trace sources as input", "when": "the distillation finishes", "then": "the report names every requirement the earlier backlog had or says why it is gone, and shows fewer questions for Sam than the earlier gate", "witness": "manual", "confidence": "inferred", "evidence": [{ "unit": "synthesis#S§2.1 row 5", "source": "synthesis", "quote": "CHED-P 3,557 lines, 596 questions", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": [], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "walkthrough",
      "dependsOn": ["inc-018"], "sequencing": [], "size": { "class": "M", "basis": "1 AC, one real run" }, "milestone": "m3-distiller",
      "provenance": { "sources": ["synthesis"], "slice": "distiller", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    },
    {
      "id": "inc-020", "key": "retire--old-drivers-and-docs-aligned", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Superseded skills and workflows are gone and every guide points at the new ones",
      "kind": "hygiene",
      "statement": "The workspace MUST route requirement and build requests to the two new skills only, with the old loop, orchestrator, journey-builder build path and Codex briefs removed and every guide that advised Glob, settings edits or run copies corrected.",
      "statementAsDistilled": "The workspace MUST route requirement and build requests to the two new skills only, with the old loop, orchestrator, journey-builder build path and Codex briefs removed and every guide that advised Glob, settings edits or run copies corrected.",
      "why": "Advertised superseded paths mislead agents (S §6.4).",
      "needRefs": ["synthesis#S§6.4"],
      "actors": ["agents", "sam"],
      "surfaces": [{ "repo": "workspace", "area": "docs-and-routing" }],
      "acceptance": [
        { "id": "ac-1", "given": "the phrase 'build the backlog' or 'distil requirements'", "when": "an agent routes it by CLAUDE.md", "then": "exactly one new skill matches", "witness": "review", "confidence": "stated", "evidence": [{ "unit": "synthesis#S§3.1", "source": "synthesis", "quote": "CLAUDE.md's skill routing table lists neither journey-builder nor build-orchestrator", "readAt": null }], "scenario": null, "from": null, "resolvedBy": null }
      ],
      "constraints": [], "consistentWith": [], "outOfScope": [], "hints": { "exemplars": [], "binding": false },
      "needs": [], "assumes": [], "buildableMeanwhile": null, "checkpoint": "none",
      "dependsOn": ["inc-012", "inc-019"], "sequencing": [], "size": { "class": "M", "basis": "1 AC, many small edits" }, "milestone": "m4-retire",
      "provenance": { "sources": ["synthesis"], "slice": "retire", "authoredBy": { "agent": "designer:quality", "phase": "design", "runId": "n/a" }, "verifiedBy": { "agent": "design-panel", "phase": "design-review", "runId": "n/a" }, "verification": "pending panel review", "verdict": "stands", "carriedFrom": null, "supersedes": null, "mergedFrom": null },
      "status": "todo", "resolution": null, "revision": 1, "notes": []
    }
  ]
}
```

Order and why: proofs first (inc-001, inc-002), then the writer on a tested base with parity unchanged
(inc-003 to inc-005), then the report renderer and migration on real data so value lands early (inc-006,
inc-007: Sam gets a decision-led view of EUDPA-409 and DR1-U before any new pipeline exists), then the builder
in Claude mode (inc-008, inc-010, inc-011), Codex with its parity proof (inc-009, inc-012), then the distiller
on the proven writer and renderer (inc-013 to inc-019), and retirement last (inc-020). The builder milestone
does not depend on the distiller, so either can proceed while the other waits on a ruling.

---

## 12. Risks, and what to prove first

| Risk | Why it matters | Prove first (and how) |
|---|---|---|
| Child workflow semantics differ from the reference (args type, re-read, resume across children) | The drain design rests on them | inc-001 canary, recorded against the version; fallback is `cadence: one` with no code change |
| Refactoring parity's writer breaks tim CI or a live corpus | Four tracked corpora and a contract test | inc-003 runs the whole parity suite unchanged before any v2 code |
| Persona files carry skill-specific bookkeeping that confuses a workflow agent | Reviewers may try to write `.review.json` | inc-010 AC-4 plus the embedding rule; if it misfires, add a "workflow embedding" section to each persona (a one-paragraph change owned by those skills) |
| `bake-rules-bundle.sh` or `file-review-*` assume `EUDPA-*` keys | Live bundle reuse fails | inc-008 AC-2 exercises it with `BUILD-<programme>-<inc>`; the baker only checks non-empty today |
| Opus cost of a quality-first distillation | Authoring, verifying and panel on Opus | Concurrency cap ≤ 6; panel only on unsettled conflicts; inc-019 measures agent counts on a real run |
| Codex quality below Claude on judgement stages | R6 | inc-012 parity proof; `judge=claude`/`acceptance=claude` knobs; Q-B ruling |
| Combined rows still too large to review well | FA s17 had 1,076-line plans | Ceilings plus the plan audit; report shows review coverage per row |
| Writer strictness rejects legitimate contract-level ACs (a route another service links to) | False recipe positives | Override by decision only; migration of EUDPA-409 (inc-007) surfaces the false positive rate |
| Raw sources contain credentials | Sonar Read hook makes files unreadable | Raw gitignored, units redacted by characteriser, writer credential scan |
| Main session context when ruling large reports | Sam's rulings flow through the skill | Answer sheet and batch commands keep the session to one command per ruling |
| Unknown acceptance witness for manual ACs | Acceptance may be unverifiable | `manual` witness routes to the report's walkthrough list, never auto-`met` |

**What I would prove first, in order:** the args and child canary (inc-001); parity tests green on the lifted
core (inc-003); EUDPA-409 migrated with zero lost rulings and zero recipe fields (inc-007); one real
increment in Claude mode with an acceptance check that catches a deliberately missed criterion (inc-010 AC-3);
then the Codex parity proof (inc-012).
