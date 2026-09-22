# Candidate design: executor parity and operability first

Candidate for the requirements pipeline design panel, 18 September 2026. Angle: **Codex must be a full executor, and the whole pipeline must run unattended without ever failing silently.** Every design choice below is tested against two questions: "would this build to the same standard if the stage ran on Codex?" and "if the session died here, could anyone resume from what is on disk?"

Inputs: `analysis/sam-requirements.md` (R1 to R6), `analysis/rules-probe.md`, `analysis/00-synthesis.md` (cited as S §n), the analyst files A to H and G1 to G5 (cited by letter), and the source files they cite. Line citations are to `main` at `d07af6b9` unless marked `FA:` (the `frontend-alignment.js` workflow on `feat/NO_JIRA-frontend-alignment`).

## Contents

1. Principles
2. Architecture overview
3. `backlog.json` schema v2
4. Writer and tooling
5. Distiller skill
6. The distillation report
7. Implementor skill and workflows
8. Executors
9. Decisions (Q1 to Q41)
10. Retire and migrate
11. Build backlog for this programme
12. Risks, and what to prove first

---

## The idea in one paragraph

The pipeline is a **stage machine that lives in `tim`**, not in a workflow script. `tim build advance` and `tim distil advance` decide, from files on disk, which stage runs next, prepare every task's inputs and prompt into a task folder, and accept every task's output against a JSON schema. A Claude workflow, a Codex-orchestrated session and a person at a terminal all drive the same machine, so switching executor is a change to one bindings file, and resuming is "run `advance` again". Each task is **file-first**: its prompt, inputs, output and receipt are files, so the output of a Claude reviewer and a Codex reviewer are the same shape in the same place, checked by the same command. Codex does the heavy work through one committed tool (`tools/codex/run-batch.sh`), which runs one `codex exec` per task concurrently, in resumable slices, with honest exit codes. Claude, in Codex mode, is reduced to cheap watcher agents that run `tim` commands. The review personas, the code-style routing and the path-scoped rules are resolved **live, by path**, by one tested resolver, and handed to both executors at the same granularity.

---

## 1. Principles

1. **A backlog row is a requirement: what, why, and observable acceptance with provenance.** Never files, commands, line numbers or test names. The build workflow plans the how just in time against the live tree (R1; S §5.2, §8.1, §8.2).
2. **The backlog carries nothing an executor needs that another executor cannot use.** No models, briefs, schemas, skills, sandbox flags or harness assumptions. Every piece of executor-specific context is resolved at run time from implementor-owned files (R5; S §5.3).
3. **One stage contract, two adapters, same granularity.** Every stage has one input folder shape and one output JSON schema. Where Claude runs one reviewer per file, Codex runs one `codex exec` per file, concurrently. The only difference between executors is a profile file prepended to the same prompt (R6).
4. **The review standard is read live, by path, never copied.** Personas, the skills' language routing, best-practice bundles and `.claude/rules` matches are resolved per task by `tim standards resolve` from the files as they are at that moment (R2, R3; rules-probe conclusions 2 to 5).
5. **Heavy stages go to Codex in Codex mode; Claude stays thin.** Plan, implement, review, verify, judge, fix and every repair stage are bindable to Codex. Claude keeps only low-effort Haiku watchers that run deterministic commands (R6).
6. **Switching executor is a sentence, and so is resuming.** The implementor skill turns "Codex for inc-012 to inc-020" into one `tim build bind` call. Bindings are read before every increment and every stage, never from the backlog, never from workflow args (R6, R5).
7. **Facts come from tools, not from agents.** Ladders, baselines, change manifests, landing, PR state, CI state and SonarCloud state are produced by deterministic `tim` commands. An agent's word is never evidence that a test passed (S §4.6, §8.4; B §3.5 to §3.9).
8. **Nothing is ever silent.** A task with no accepted receipt is a failure, never an empty success. A dead reviewer, judge or fixer holds the increment with a named reason (S §6.4 "silent-success paths"; B §11.4).
9. **All state is written by one validating writer, with a lock, a compare-and-swap token and idempotent operation ids.** No agent composes `jq` over canonical state (S §4.6, §7.5; G2 §3.8).
10. **Distillation is two-pass and both passes emit the same format.** Pass 1 writes `backlog.atoms.json` (every requirement as its own atomic increment, buildable on its own). Pass 2 writes `backlog.json` (related atoms combined). Combining is data that re-derives after every ruling (R1; S §7.8; G1 §1.5).
11. **The report is a generated decision surface.** Open questions first, reversible calls second, history last. Every number derived, every ruling written back through the writer, never typed into prose (R1 "quality above all"; G §1, §8).
12. **Reuse before invention.** Every mechanism below names the asset it generalises: `tim parity` ingest, set, schemas, coverage, slices, yield, duplicates, heads and seals; the loop's lifecycle and Codex slicing; FA's Plan stage, report and model tiers; the digest's characterise-first method and panel (R1 "take the best bits").

---

## 2. Architecture overview

### 2.1 The diagram

```
 LOOSE SOURCES: Jira issues and comments, Confluence pages, docx/pdf/xlsx, image boards and canvases,
 repos and existing code, transcripts and chat exports, existing backlogs, OpenSpec specs, web pages
   │
   │  tim distil sources add | acquire | seal        (library-first clients: jira, confluence; git show at pin)
   │  tim distil heads --write                        (every repo pinned: sha, branch, dirty)
   ▼
 ┌─────────────────────────── REQUIREMENTS DISTILLER (skill: requirements-distiller) ─────────────────────────┐
 │ main session drives phases; each fan-out phase is one Workflow run of .claude/workflows/distil/distil-phase.js│
 │                                                                                                             │
 │ D0 setup       main    contract.md whole, registry.json, ledger.json          tim distil start (MODE: …)    │
 │ D1 characterise WF     per source: characterisation/<src>.md, units/<src>.json  SOURCE_CHARACTERISER       │
 │ D2 slice       main    slices.json, exactly-once, one cross-cutting owner     tim distil slices --strict    │
 │ D3 carryover   WF      carryover.json (previous distillation or v1 backlog)   CARRYOVER_TRIAGER             │
 │ D4 author→verify WF    pipeline per slice: atoms/<slice>--<slug>.json          SLICE_AUTHOR, ATOM_VERIFIER   │
 │                        + notRaised[], premisesDisproved[]; verifier ≠ author                                │
 │ D5 prove       main    tim distil coverage --strict ; tim distil yield --strict                              │
 │ D6 reconcile   WF      conflicts.json (c-NNN), precedence per fact kind         RECONCILER (opus, one)      │
 │ D7 panel       WF      dockets ≤ 6 opus at once; decisions (decidedBy panel),  PANEL_JUDGE/CHAIR/CRITIC     │
 │                        escalations → questions in decisions.json                                             │
 │ D8 sweep       WF      duplicates, ALL pairs; non-destructive                  DUPLICATE_SWEEPER (parity)    │
 │ D9 ingest-1    main    tim backlog ingest --pass atoms → backlog.atoms.json   ═══ PASS 1 DONE ═══            │
 │ D10 critic     WF      completeness + structural blind spots → questions/atoms COMPLETENESS_CRITIC           │
 │ D11 combine    WF      tim distil combine candidates → combined/<key>.json    COMBINER (opus)               │
 │ D12 ingest-2   main    tim backlog ingest --pass combined → backlog.json      ═══ PASS 2 DONE ═══            │
 │ D13 report     WF+main question prose + CLAIM_VERIFIER; tim distil report → report/index.html, report.md    │
 └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
   │                                                          ▲
   │ backlog.json (v2) + backlog.atoms.json + decisions.json  │  Sam rules in the report (batch) or in chat
   │                                                          │  tim decisions rule … → tim decisions apply
   │                                                          │  → tim distil combine --affected → ingest → re-render
   ▼                                                          │
 ┌─────────────────────────── BACKLOG IMPLEMENTOR (skill: backlog-implementor) ──────────────────────────────┐
 │ main session:  tim build start → MODE: RUN | RESUME | HANDOVER                                              │
 │                tim build bind "…"  (the one-sentence executor switch; writes build/bindings.json)           │
 │                launches Workflow .claude/workflows/build/build-drain.js by scriptPath with args object      │
 │                                                                                                             │
 │  build-drain.js (parent, one invocation)                                                                    │
 │    loop: watcher → tim build next --json            (status + dependsOn + holds; reads bindings)            │
 │          workflow({scriptPath: build-increment.js}, {workarea, increment})   ← the one nesting level        │
 │          watcher → tim build after-increment --json  (landed check from state, absorb discovered work,      │
 │                                                     checkpoint and systemic-halt rules, report re-render)   │
 │                                                                                                             │
 │  build-increment.js (child; also launchable alone for cadence "single")                                     │
 │    loop: watcher → tim build advance --increment X --json                                                   │
 │            (runs every deterministic stage itself; stops at the next stage that needs a model)              │
 │          → step.tasks[]: kind "claude" → agent(GUARD RAILS + "Read <task>/prompt.md and follow it")         │
 │                          kind "codex"  → one watcher runs tools/codex/run-batch.sh <batch> until exit ≠ 3,  │
 │                                          then tim stage accept --batch                                      │
 │          every task: tim stage prepare (done by advance) → output.draft.json → tim stage accept → receipt   │
 │                                                                                                             │
 │  stages: preflight → sync → baseline → PLAN → branch → implement → change-manifest                          │
 │          → review fan-out {style × file, code × file, consistency, acceptance} → verify × file → judge      │
 │          → fix → ladder (+ repair ≤ 3) → secrets → land → pr → ci (+ ci-fix ≤ n) → sonar → local-e2e (+repair)│
 │          → merge (policy) → done → record → report                                                          │
 └─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
   │
   ▼ writes only through tim:  build/state.json  build/plans/<id>.{md,json}  build/runs/<id>/a<n>/…
   │                          build/discovered.jsonl  decisions.json (judge deferrals)  backlog.json (status only)
   ▼
 report/index.html (same renderer, build section) ──► Sam ──► rulings ──► ledger ──► re-combine ──► …

 THIRD MODE (no Claude at all): tim build handover --executor codex prints a Codex /goal prompt that drives the
 same tim build advance loop and the same tools/codex/run-batch.sh fan-out from a Codex session.
```

### 2.2 Everything named in the diagram

| Kind | Name | New or reused | Purpose |
|---|---|---|---|
| Skill | `.claude/skills/requirements-distiller/` | New (replaces journey-builder DIGEST, trace-mining, and parity COMPARE's requirements half) | Loose sources to two-pass backlog and report |
| Skill | `.claude/skills/backlog-implementor/` | New (replaces build-orchestrator and journey-builder BUILD) | Main-session driver, switching UX, handover |
| Workflow | `.claude/workflows/distil/distil-phase.js` | New; shape from `workareas/shared/dr1c-parity/author-workflow.js:259-278` | One fan-out phase per invocation |
| Workflow | `.claude/workflows/build/build-drain.js` | New; drain from `FA:507-567`, landed check from `build-orchestrator/SKILL.md:222-237` | Parent: derive, build, check, repeat |
| Workflow | `.claude/workflows/build/build-increment.js` | New; replaces `increment-build-loop.js` and `frontend-alignment.js` | Child: one increment, interprets `tim build advance` |
| Stage briefs | `.claude/workflows/build/stages/<stage>.md` | Content ported from the loop's prompts, FA's prompts and `codex/*.md` | One executor-neutral brief per stage |
| Profiles | `.claude/workflows/build/executors/{claude.md, codex.md, executors.json}` | New | Executor preambles, tier maps, role defaults |
| Contracts | `.claude/workflows/build/contracts/<stage>.schema.json` | New; generated from zod in `tim/src/build/contracts/` | Codex-strict JSON Schemas, used by both executors |
| Rails | `docs/agent-rails/guard-rails.md` | New; text is the `FA:102-117` superset | The single canonical Claude GUARD RAILS block |
| tim module | `tim/src/backlog/` | Generalised from `tim/src/parity/{ingest,set,io,schema}.js` | Schema v2, ingest, setters, lock, CAS, graph checks |
| tim module | `tim/src/decisions/` | New; shapes from `tim/src/parity/schema.js:24-29, 71-78`, `spec-add-decision.sh` | One ledger for questions and rulings |
| tim module | `tim/src/distil/` | Generalised from `tim/src/parity/{coverage,slices,yield,duplicates,heads,meta,seals}.js`, `tools/parity/phase.sh` | Distiller control plane |
| tim module | `tim/src/build/` | New; lifecycle logic ported from `increment-build-loop.js` and FA | Stage machine, stage I/O, bindings, ladder, lifecycle via octokit and jira-client |
| tim module | `tim/src/standards/` | New | Live resolution of personas, routing, rules, pointers |
| tim module | `tim/src/report/` | New sibling of `tim/src/parity/render/`, sharing its theme, prose and citation code | Distillation and build report |
| Tool | `tools/codex/run-stage.sh`, `tools/codex/run-batch.sh` | New; slicing logic from `increment-build-loop.js:744-785` moved from prompt prose into bash | Codex adapter |
| Tool | `tools/sonar/pr-findings.sh`, `tools/sonar/scan-staged-secrets.sh` | New thin wrappers | Explicit replacements for session-level Sonar hooks |
| Tool | `tools/github/pr-ensure-draft.sh`, `tools/github-actions/wait-for-pr-checks.sh`, `tools/npm/npm-in-repo.sh --clone` | Ported from `feat/NO_JIRA-frontend-alignment` | Needed until `tim build` owns the same behaviour through octokit |
| Data | `tools/build/targets.json` | Moved from `tools/journey-builder/targets.json` | Per-target repos, ladders, guides; neutral data |
| Data | `.claude/skills/code-style/assets/routing.json`, `.claude/skills/review/assets/routing.json` | New; extracted from `tools/style/file-topics.sh`, `tools/style/bake-rules-bundle.sh:37-73`, `tools/review/detect-tech.sh:202-265` | The skills' language-to-bundle routing as data both bash and tim read |

---

## 3. `backlog.json` schema v2

### 3.1 Files in a programme workarea

A programme lives at `workareas/shared/<programme>/` (tracked). Its files:

| File | Written by | Read by | Tracked | What it is |
|---|---|---|---|---|
| `backlog.atoms.json` | `tim backlog ingest --pass atoms` | distiller, report, implementor (only if no combined backlog) | yes | Pass 1: every requirement as an atomic increment, v2 format |
| `backlog.json` | `tim backlog ingest --pass combined`; `tim backlog status` | implementor, report | yes | Pass 2: the build backlog, v2 format |
| `decisions.json` | `tim decisions …` | everything | yes | Append-only ledger of questions and rulings |
| `distil/` | `tim distil …`, distiller agents (per-item files only) | distiller | yes, except `distil/sources/cache/` | Contract, registry, characterisations, units, slices, atoms, combined, conflicts, panel, phase ledger |
| `build/state.json` | `tim build …` only | implementor, report | yes | Run state per increment: phase, holds, attempts, ticket, branch, commits, PRs |
| `build/bindings.json` | `tim build bind` only | `tim build advance` | yes | Executor bindings (run config, never in the backlog) |
| `build/plans/<id>.md`, `.json` | plan stage, accepted by `tim stage accept` | implement, review, report | yes | The just-in-time recipe |
| `build/runs/<id>/a<n>/<NN-stage>/<task>/` | `tim stage prepare`, the task, `tim stage accept` | the next stages, parity report, audits | receipts and outputs yes; prompts, logs, Codex sessions no (gitignored) | File-first stage I/O |
| `build/discovered.jsonl` | `tim stage accept` | `tim backlog absorb-discovered` | yes | Work found during build |
| `report/` | `tim distil report`, `tim build report` | Sam | `report.md` yes, HTML regenerated | The generated report |

Why run state is **not** on the row: R5 forbids executor detail in the backlog, and run state names executors, Codex sessions and attempts. G5 §9.11 requires `backlog.json` to stay a clean `git diff` review surface (the claim verifier works by diff, `CLAIM_VERIFIER.md:17`). And build writes would otherwise contend with distiller writes on one file. The row keeps only the requirement-level `status`, because every consumer keys on it (E §7.2).

### 3.2 Header fields

Class: **R** requirement, **M** meta (identity, order, policy), **S** state. No field is executor-specific.

| Field | Type | Req | Class | Meaning | Written by | Read by |
|---|---|---|---|---|---|---|
| `schemaVersion` | `2` | yes | M | Format version; readers refuse anything else | writer | all |
| `programme` | slug | yes | M | Programme id; also the default commit scope | distiller | all |
| `title` | string | yes | R | One line, what is being built | distiller | report |
| `purpose` | string | yes | R | Two or three sentences: outcome, for whom, why (FA `purpose`, trace `brief`) | distiller | plan, report |
| `pass` | `atoms` \| `combined` | yes | M | Which distillation pass produced this file | writer | implementor refuses `atoms` if a combined backlog exists |
| `target` | string \| null | no | M | Key into `tools/build/targets.json`; supplies default repos, ladders and guides (G5 §3) | distiller | resolver, ladder |
| `repos` | map key → `{path, github, ladder[{dir, scripts[]}], e2e?, guides[]}` | yes | M | N named repos, no role triple (B §2). Overrides the target's entries. `ladder` is npm script names per package folder (FA `:973-1001`; `targets.json` `verify`) | distiller | implementor |
| `mergeOrder` | array of `[provider, consumer]` | no | M | Provider before consumer, for N repos (generalises `MERGE_RANK`, `increment-build-loop.js:299`) | distiller | merge stage |
| `lifecycle` | object | yes | M | Delivery policy, see 3.3 | distiller, Sam's ruling | implementor |
| `invariants[]` | `{id, text, source}` | no | R | Rules every increment keeps (FA `invariants`, F K15) | distiller | plan, every reviewer, judge |
| `direction` | string \| null | no | R | Tie-break rule for choices the requirement leaves open (FA `direction`) | distiller | plan, judge |
| `scopeExclusions[]` | `{id, text, why, decision}` | no | R | Parked or excluded, with who ruled (`RECONCILER-BRIEF.md:62-76`) | distiller | plan, reviewers, report |
| `deviations[]` | `{id, text, reason, decision}` | no | R | Deliberate departures from a source (plant-products `deviations`) | distiller | plan, report |
| `assumptions[]` | `{id, text, default, confidence, reviseIf, question}` | no | R | Defaults the build proceeds on, each tied to a question (F K22) | distiller | plan, report |
| `milestones[]` | `{id, name, goal, checkpoint}` | no | M | Walk-through points (E §7.1) | distiller | implementor, report |
| `sources[]` | `{id, type, role, tier, ref, version, readAt, seal, characterisation}` | yes | M | Source registry with roles (F K3) and pins (G3 §4) | distiller | report, plan (for citations) |
| `precedence[]` | `{factKind, order[]}` | no | M | Which source wins for which kind of fact (F K10) | distiller | report |
| `ledger` | `{path, sha256}` | yes | M | The `decisions.json` the rows were denormalised from; a mismatch means "run `tim decisions apply`" | writer | validator |
| `distillation` | `{generatedFrom{atomsSha, ledgerSha, contractSha}, combination{rules[], applied[], declined[]}}` | yes on `combined` | M | Audit of pass 2 (`combination-proposal.md:5-88`) | writer | report |
| `increments[]` | array | yes | | The rows | writer | all |

### 3.3 `lifecycle`

| Field | Values | Default | Meaning |
|---|---|---|---|
| `strategy` | `programme` \| `per-increment` \| `local` | `programme` (see decision table, Q24, and Sam question 3) | One branch and one draft PR per repo for the programme; or ticket, branch and PR per increment; or commit only |
| `branch` | string | required for `programme` | Same name in every repo (CLAUDE.md rule 2) |
| `base` | string | `main` | Base branch |
| `merge` | `never` \| `on-approval` \| `on-green` | `never` | Merge policy (memory `feedback_never_auto_merge_wait_for_sam`) |
| `mergeRuling` | decision id \| null | null | Required when `merge` is `on-green`; validator refuses without it |
| `draftPrs` | boolean | `true` for `programme` | |
| `jira` | `{project, epic, board, inProgress, done}` \| null | null | Present only for `per-increment` with tickets |
| `commitScope` | string | `programme` | Conventional-commit scope |
| `localE2e` | `auto` \| `always` \| `never` | `auto` | `auto` is FA's "is this run worth making" pre-check (`FA:1148-1155`) |
| `workspacePr` | number \| null | null | Watch the workspace PR's cross-repo E2E (`FA:1307-1355`) |
| `ciFixAttempts` | integer | 2 | Read by `tim`, never by a prompt (fixes A §6.2) |
| `review` | `{cap, overflow: "refuse" \| "allow-with-reason"}` | `{cap: 16, overflow: "allow-with-reason"}` | Enforced by `tim stage accept` on the plan; never silently clamped (fixes `FA:228` against `FA:783`) |

This is delivery policy, not executor detail. Claude and Codex read it the same way.

### 3.4 Increment fields

| Field | Type | Req | Class | Meaning | Written by | Read by |
|---|---|---|---|---|---|---|
| `id` | `inc-NNN` | yes | M | Stable handle, never renumbered (`ingest.js:310-328`) | writer | all tools, branch slug |
| `key` | slug | yes | M | Readable identity, bound to the source file name; cross-references are written by key and resolved to ids at ingest (`ingest.js:361-388`) | distiller (file name) | writer |
| `grain` | `atomic` \| `combined` | yes | M | Pass that made it | writer | report, validator |
| `members[]` | `{id, key}` | combined only | M | The atoms this increment realises, in build order | writer (resolved from `combined/<key>.json`) | report, implementor (context) |
| `combinedInto` | `inc-NNN` \| null | atoms only | M | Which combined increment carries this atom | writer | report |
| `title` | string ≤ 80 | yes | R | Outcome headline, never a mechanism | distiller | all |
| `kind` | `capability` \| `rule` \| `data` \| `integration` \| `reference-data` \| `content` \| `hygiene` \| `spike` | yes | R | Requirement kind (Q6). Never an implementation route | distiller | plan (routing), branch prefix table |
| `nature` | `new` \| `fix` \| `change` \| `removal` | yes | R | New behaviour, correction, change or removal; drives the conventional-commit type with `kind` | distiller | land |
| `outcome` | string | yes | R | Who can now do or rely on what (1 to 3 sentences) | distiller | all model stages |
| `why` | string | yes | R | Who needs it and what breaks without it | distiller | plan, judge, report |
| `statement` | string | atoms: yes | R | The distilled requirement text as first ingested; frozen (the parity `detail` oracle, `ingest.js:561-582`) | writer at first ingest | claim verifier |
| `acceptance[]` | `{id, statement, witness, confidence, evidence[{source, ref, quote?, readAt?}], scenario?}` | yes, ≥ 1 | R | Observable at a boundary; `witness` is the level of proof (`e2e` \| `integration` \| `unit` \| `review` \| `manual`), never a command; `scenario` links an OpenSpec `SCN-` id | distiller | plan, acceptance reviewer, judge, ticket |
| `constraints[]` | `{text}` \| `{ref: inv-…\|sr-…}` | no | R | Row-specific must/never, or references to header invariants | distiller | plan, reviewers |
| `outOfScope[]` | string | no | R | Tempting neighbours (FA s22/s24 briefs) | distiller | plan, reviewers |
| `surfaces` | `{areas[], repos[]}` | yes | M | Where, never how: named product areas and header repo keys the change is expected to touch. The plan may add repos, and must say why | distiller | plan, branch, standards resolver |
| `consistentWith[]` | `{ref, relation: same-as \| variant-of \| unlike, divergence}` | no | R | Behaviour to match, as a relation (F K16) | distiller | plan, consistency reviewer |
| `exemplars[]` | `{ref, why, binding: false}` | no | M | Non-binding hints about shape (Q7). `binding` is always `false`; the validator refuses `true` | distiller | plan only |
| `dependsOn[]` | `inc-NNN` | no | M | Genuine prerequisites; written by key, resolved and cycle-checked at ingest | distiller | derive, report |
| `sequence` | `{after[], why}` \| null | no | M | Ordering preferences that are not dependencies (DR1-U `inc-103`, G5 §8) | distiller | derive (tie-break only) |
| `milestone` | id \| null | no | M | | distiller | derive, report |
| `needs` | question record \| null | no | R | Pre-build blocking question, see 3.6. When non-null and open, `status` must be `blocked` | writer (from ledger) | derive, report, plan |
| `checkpoint` | `halt-after` \| `walkthrough` \| null | no | M | Post-build stop (Q5). Replaces the post-land meaning of `gate` | distiller | drain parent |
| `rulings[]` | `{decision, headline, answer, words, by, at}` | no | R | Every ruling that shapes this row, denormalised from the ledger so the row stands alone (R5) | writer (`tim decisions apply`) | plan, judge (`RULING_RULE`, `FA:160-163`), reviewers |
| `assumptions[]` | `{id, text, default}` | no | R | Header assumptions that apply, denormalised | writer | plan |
| `provenance` | `{sources[{source, ref, readAt}], confidence, authoredBy, verifiedBy, carriedFrom}` | yes | M | Where it came from; `authoredBy ≠ verifiedBy` enforced (G1 §2.6) | writer from atom files | report, claim verifier |
| `size` | `{class: S \| M \| L, basis}` | yes | M | Requirement-level proxies only (surfaces, AC count, end-state proofs). Never gates buildability (Q8) | distiller, combiner | combiner, report |
| `status` | enum, see 3.5 | yes | S | Requirement-level status | writer only | derive, report |
| `resolution` | `built` \| `ruled-no-code` \| `already-true` \| null | when `done` | S | Separates a merged build from a decision resolved without code (fixes EUDPA-409 `inc-060`, S §4.3) | writer | report |
| `statusDecision` | decision id \| null | when `deferred`, `dropped`, `superseded` | S | The ruling that set the status | writer | report |

**Deliberately absent** (and refused by the validator's unknown-key check in strict mode): `filesToTouch`, `verification`, `recipe`, `implementorSkill`, `obligations`, `flowChanges`, `schemaFields`, `copyKeys`, `specs`, `band`, `type` (frontend-change mode), `repo` (role triple), `gate`, `sizeGuess`, `ticket`, `branch`, `commit`, `prs`, `executor`, `model`, `notes`, `openQuestions`. Every one is either a recipe (S §5.1 R1 to R8, P1 to P9), executor detail (R5) or run state (3.1).

### 3.5 Status enum

| Status | Meaning | Buildable? | Set by |
|---|---|---|---|
| `todo` | Wanted, not built | Yes, once every `dependsOn` is `done` and `build/state.json` holds no hold for it | ingest (born), `tim decisions apply` |
| `blocked` | Has an open `needs` question | No | ingest, `tim decisions apply`, `tim backlog absorb-discovered` |
| `deferred` | Ruled "not now"; `statusDecision` names the ruling and `revisitWhen` | No | `tim decisions apply` |
| `dropped` | Ruled "never", or falsified | No | `tim decisions apply` |
| `done` | Finished; `resolution` says how | No | `tim build` (after merge or landing, per policy), `tim decisions apply` (for `ruled-no-code`) |
| `superseded` | A combined increment dissolved by a re-combination before it started; kept so nothing is deleted | No | `tim backlog ingest --pass combined` |

Buildability is one function, `derive` in `tim/src/backlog/derive.js`, used by every reader (fixes the three conflicting rules, S §2.1 row 10 and §4.3). **Unknown statuses fail validation**; there is no deny-list and no allow-list to disagree. Phase detail (`planning`, `ladder-red`, `ci-red`, `awaiting-approval`, attempts) lives in `build/state.json` as a **hold** (see 7.6).

### 3.6 `needs`, `checkpoint`, and the question and decision records

`gate` is gone. Its two meanings (G5 §2 "Two meanings of `gate`") become two fields:

- `needs` (before build): the full question record, denormalised from the ledger so the row stands alone. An open, blocking question makes the row `blocked`. A question that has a safe default is **not** a `needs`: it is an `assumption` the build proceeds on, flagged in the report ("make the call, flag it after", memory `feedback_headless_make_calls_dont_gate`). Only **must-answer** questions (security, access control, data integrity, CDP platform changes) and questions whose options change *what* is built are blocking.
- `checkpoint` (after build): `halt-after` stops the drain after the increment lands; `walkthrough` stops after the last increment of its milestone.

**Question record** (`decisions.json` `questions[]`; copied into a row's `needs`):

```jsonc
{
  "id": "q-sign-out-session-drop",            // slug, never an ordinal (G §2)
  "headline": "Should the service drop its own session when sign-out starts?",
  "question": "…full question as a question…",
  "category": "security",                      // security | access-control | data-integrity | platform | scope | policy | content | technical
  "mustAnswer": true,                          // derived: category in the must-answer set
  "blocking": true,                            // must-answer, or options change what is built
  "audience": "sam",                           // who rules
  "inPlay": "What changes depending on the answer, in plain words",
  "options": [
    { "id": "a", "label": "Drop the local session at sign-out", "supportedBy": [{ "source": "src-confluence-auth", "ref": "h4:Sign out/li:2" }], "consequence": "…" },
    { "id": "b", "label": "Keep it until the identity provider calls back", "supportedBy": [], "consequence": "…" }
  ],
  "recommended": "a", "recommendedBy": "panel",   // panel | distiller | judge | null
  "ifUnanswered": { "option": "a", "consequence": "What happens by default; for mustAnswer this is 'stays blocked'" },
  "blocks": ["inc-014"], "affects": ["atm-031", "atm-032"],
  "cluster": "sign-in-and-session",
  "raisedBy": { "phase": "D7 panel", "task": "docket-3/chair" }, "raisedAt": "2026-09-18",
  "evidence": [{ "source": "src-ixd-canvas", "ref": "file:session/region:Sign out/item:1" }],
  "visual": [{ "source": "src-mural", "crop": "distil/sources/cache/mural/crops/sign-out.png" }],
  "status": "open"                              // open | outstanding | ruled | superseded | withdrawn
}
```

**Decision record** (`decisions.json` `decisions[]`):

```jsonc
{
  "id": "d-017",
  "question": "q-sign-out-session-drop",       // or "subject": {"kind": "conflict", "id": "c-012"}
  "answer": { "option": "a", "text": null },
  "words": "Drop it. Same as the journeys.",   // Sam's words verbatim; mandatory when decidedBy is a person
  "decidedBy": "sam",                          // sam | panel | precedence | default | <named person>
  "decidedAt": "2026-09-19",                   // caller-supplied, never the clock (journey-builder SKILL.md:72-73)
  "note": "Why, in one sentence",              // mandatory (rule-decision.sh:17-19)
  "scope": { "kind": "items", "ids": ["inc-014"] },   // or {"kind": "programme"} for a standing ruling
  "supersedes": null, "supersededBy": null, "status": "current",
  "sealedEvidence": [{ "source": "src-confluence-auth", "seal": "sha256:…" }],   // G3 §4.4
  "revisitWhen": null,
  "effects": [{ "kind": "status", "id": "inc-014", "from": "blocked", "to": "todo" }]   // written by apply
}
```

"Awaiting a ruling" has one definition: a question with `status` in `open` or `outstanding` (fixes the three definitions in G5 §2). A tentative answer ("maybe?") is recorded as `outstanding` with the words, never as a ruling (memory `feedback_question_is_not_a_ruling`).

### 3.7 Ids

| Record | Id | Identity | Rule |
|---|---|---|---|
| Atomic increment | `inc-NNN` in `backlog.atoms.json` | `key` = atom file name `<slice>--<slug>` | Allocated `max+1` on first sight; never renumbered (`assignIds`, `ingest.js:310-328`) |
| Combined increment | `inc-NNN` in `backlog.json` (separate sequence) | `key` = combined file name | On re-combine, an existing combined key keeps its id. A group whose membership changed keeps its key only if it has not started; a started increment's membership is frozen (see 5.10) |
| Question | `q-<slug>` | slug | Written by the raiser, uniqueness checked |
| Decision | `d-NNN` | ordinal in an append-only ledger | Never edited, only superseded |
| Conflict | `c-NNN` | ordinal | (`SPEC_RECONCILER.md:19-21`) |
| Source | `src-<slug>` | slug | |
| Invariant, standing ruling | `inv-<slug>`, `sr-<slug>` | slug | |

### 3.8 Worked examples

**Example 1: atomic** (from `backlog.atoms.json`, a live-animals-style programme):

```json
{
  "id": "inc-031",
  "key": "origin--country-list-narrowed-by-commodity",
  "grain": "atomic",
  "members": [],
  "combinedInto": "inc-007",
  "title": "The country of origin list narrows to the countries the commodity allows",
  "kind": "rule",
  "nature": "new",
  "outcome": "A person notifying an import of ware potatoes can only choose a country the regulation allows, so an unlawful origin is caught before submission.",
  "why": "Regulation 24A limits ware potatoes to four countries. Today the page offers every country, so an unlawful notification reaches an inspector.",
  "statement": "When a notification has a ware-potato commodity line, the country of origin must be one of Poland, Portugal, Romania or Spain.",
  "acceptance": [
    {
      "id": "ac-1",
      "statement": "Given a notification with a ware-potato commodity line, when the person chooses a country other than Poland, Portugal, Romania or Spain, then the page rejects it and names those four countries.",
      "witness": "e2e",
      "confidence": "stated",
      "evidence": [{ "source": "src-phnns-policy", "ref": "annex:5/reg:24A(1)(b)", "quote": "originating in Poland, Portugal, Romania or Spain", "readAt": { "sha": null, "seal": "sha256:9f1c…" } }],
      "scenario": "SCN-PLANTS-OB-ORIGIN-003-A"
    },
    {
      "id": "ac-2",
      "statement": "Given a notification with no ware-potato line, the full country list is offered, as it is today.",
      "witness": "integration",
      "confidence": "inferred",
      "evidence": [{ "source": "src-confluence-requirements", "ref": "h4:All other goods/li:1" }]
    }
  ],
  "constraints": [{ "ref": "inv-welsh-copy" }],
  "outOfScope": ["Checking the destination address territory (ruled separately, d-001)"],
  "surfaces": { "areas": ["origin"], "repos": ["frontend", "tests"] },
  "consistentWith": [{ "ref": "src-live-animals:origin/countryOfOrigin", "relation": "variant-of", "divergence": "The list is narrowed by commodity" }],
  "exemplars": [],
  "dependsOn": ["inc-022"],
  "sequence": null,
  "milestone": "m1",
  "needs": null,
  "checkpoint": null,
  "rulings": [],
  "assumptions": [{ "id": "as-error-copy", "text": "The error message follows the GOV.UK pattern", "default": "Choose a country the commodity is allowed from: Poland, Portugal, Romania or Spain" }],
  "provenance": { "sources": [{ "source": "src-phnns-policy", "ref": "annex:5/reg:24A(1)(b)", "readAt": { "seal": "sha256:9f1c…" } }], "confidence": "stated", "authoredBy": "D4/origin/author", "verifiedBy": "D4/origin/verifier", "carriedFrom": null },
  "size": { "class": "S", "basis": "2 acceptance criteria, 1 area, no new data" },
  "status": "todo",
  "resolution": null,
  "statusDecision": null
}
```

**Example 2: combined** (from `backlog.json`):

```json
{
  "id": "inc-007",
  "key": "origin-page-rules",
  "grain": "combined",
  "members": [
    { "id": "inc-031", "key": "origin--country-list-narrowed-by-commodity" },
    { "id": "inc-032", "key": "origin--region-asked-only-where-required" },
    { "id": "inc-033", "key": "origin--welsh-copy-for-origin-errors" }
  ],
  "combinedInto": null,
  "title": "The origin page asks only what the commodity and country require",
  "kind": "rule",
  "nature": "new",
  "outcome": "A person notifying an import sees only the origin choices and questions that apply to their commodity and country, in English or Welsh, and cannot submit an unlawful origin.",
  "why": "Three rules from the policy paper govern the same page. Built apart they would each need their own review, branch and end-to-end pass over one page.",
  "statement": null,
  "acceptance": [
    { "id": "inc-031/ac-1", "statement": "Given a notification with a ware-potato commodity line, when the person chooses a country other than Poland, Portugal, Romania or Spain, then the page rejects it and names those four countries.", "witness": "e2e", "confidence": "stated", "evidence": [{ "source": "src-phnns-policy", "ref": "annex:5/reg:24A(1)(b)" }] },
    { "id": "inc-031/ac-2", "statement": "Given a notification with no ware-potato line, the full country list is offered, as it is today.", "witness": "integration", "confidence": "inferred", "evidence": [{ "source": "src-confluence-requirements", "ref": "h4:All other goods/li:1" }] },
    { "id": "inc-032/ac-1", "statement": "Given a country that has regions, when the person chooses it, then the page asks for the region; otherwise it does not.", "witness": "e2e", "confidence": "stated", "evidence": [{ "source": "src-mural", "ref": "file:origin/region:Region/item:1" }] },
    { "id": "inc-033/ac-1", "statement": "Given Welsh is selected, every error on the origin page is shown in Welsh.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-confluence-user-needs", "ref": "NNS-UN-012" }] }
  ],
  "constraints": [{ "ref": "inv-welsh-copy" }, { "ref": "inv-govuk-toolbox-only" }],
  "outOfScope": ["Checking the destination address territory (d-001)"],
  "surfaces": { "areas": ["origin"], "repos": ["frontend", "tests"] },
  "consistentWith": [{ "ref": "src-live-animals:origin", "relation": "variant-of", "divergence": "Country list narrowed by commodity; region question conditional" }],
  "exemplars": [{ "ref": "repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/features/origin/", "why": "The same page in the sibling service", "binding": false }],
  "dependsOn": ["inc-003"],
  "sequence": null,
  "milestone": "m1",
  "needs": null,
  "checkpoint": null,
  "rulings": [{ "decision": "d-001", "headline": "Territory check is not part of origin", "answer": "Handled on the destination page", "words": "Keep origin to origin.", "by": "sam", "at": "2026-09-06" }],
  "assumptions": [{ "id": "as-error-copy", "text": "The error message follows the GOV.UK pattern", "default": "Choose a country the commodity is allowed from: Poland, Portugal, Romania or Spain" }],
  "provenance": { "sources": [{ "source": "src-phnns-policy", "ref": "annex:5" }, { "source": "src-mural", "ref": "file:origin" }, { "source": "src-confluence-user-needs", "ref": "NNS-UN-012" }], "confidence": "stated", "authoredBy": "D11/combiner", "verifiedBy": "D11/combine-verifier", "carriedFrom": null },
  "size": { "class": "M", "basis": "4 acceptance criteria, 1 area, 2 repos, 2 end-to-end proofs" },
  "status": "todo",
  "resolution": null,
  "statusDecision": null
}
```

**Example 3: born blocked with a question** (from `backlog.json`):

```json
{
  "id": "inc-014",
  "key": "sign-out-ends-every-session",
  "grain": "combined",
  "members": [{ "id": "inc-051", "key": "session--sign-out-clears-local-session" }],
  "combinedInto": null,
  "title": "Signing out ends the person's session in every service they used",
  "kind": "capability",
  "nature": "fix",
  "outcome": "After signing out, nobody at the same browser can continue the notification the person was working on.",
  "why": "A session that outlives sign-out lets the next person at a shared computer see someone else's notification.",
  "statement": null,
  "acceptance": [
    { "id": "inc-051/ac-1", "statement": "Given a signed-in person with a notification in progress, when they sign out and the browser returns to the service, then they are asked to sign in and see no notification.", "witness": "e2e", "confidence": "inferred", "evidence": [{ "source": "src-ixd-canvas", "ref": "file:session/region:Sign out/item:1" }] }
  ],
  "constraints": [],
  "outOfScope": ["Changing the identity provider's own sign-out page"],
  "surfaces": { "areas": ["sign-in-and-session"], "repos": ["ins-frontend", "frontend", "tests"] },
  "consistentWith": [{ "ref": "src-live-animals:auth/sign-out", "relation": "same-as", "divergence": null }],
  "exemplars": [],
  "dependsOn": [],
  "sequence": null,
  "milestone": "m2",
  "needs": {
    "id": "q-sign-out-session-drop",
    "headline": "Should the service drop its own session when sign-out starts?",
    "question": "When a person selects sign out, should each service drop its local session immediately, or keep it until the identity provider confirms?",
    "category": "security",
    "mustAnswer": true,
    "blocking": true,
    "audience": "sam",
    "inPlay": "Whether a session can outlive a sign-out when the identity provider rejects a long sign-out request",
    "options": [
      { "id": "a", "label": "Drop it immediately", "supportedBy": [{ "source": "src-live-animals", "ref": "auth/sign-out" }], "consequence": "A failed provider sign-out still leaves nobody signed in locally" },
      { "id": "b", "label": "Keep it until the provider confirms", "supportedBy": [], "consequence": "A rejected provider request leaves the session alive" }
    ],
    "recommended": "a",
    "recommendedBy": "panel",
    "ifUnanswered": { "option": null, "consequence": "Stays blocked. This is a security question and is never built on a default." },
    "blocks": ["inc-014"],
    "buildableMeanwhile": "Nothing on this page; the rest of milestone m2 does not depend on it.",
    "status": "open"
  },
  "checkpoint": "halt-after",
  "rulings": [],
  "assumptions": [],
  "provenance": { "sources": [{ "source": "src-ixd-canvas", "ref": "file:session" }], "confidence": "inferred", "authoredBy": "D4/session/author", "verifiedBy": "D4/session/verifier", "carriedFrom": null },
  "size": { "class": "S", "basis": "1 acceptance criterion, 3 repos" },
  "status": "blocked",
  "resolution": null,
  "statusDecision": null
}
```

### 3.9 Proof that nothing is recipe-shaped or executor-specific

| Test | How it is enforced |
|---|---|
| No file, function, class, command or test name in `acceptance`, `outcome`, `constraints` | `tim backlog lint --recipe` flags path-like tokens (`/`, file extensions), backticked identifiers, `npm`, `mvn`, `git`, CSS classes (`govuk-` prefix), annotations (`@`). Findings go to the ATOM_VERIFIER rubric and the report's "weak parts". Allowed exceptions are listed per programme in `distil/contract.md` "What may be named" (an external route, a published document shape, a mandated GDS component, F §4.2) |
| No recipe fields | Strict schema: the unknown-key list in 3.4 is refused by name |
| No executor fields | Same; plus a test that asserts every v2 field name is in the classification table above, so a new field needs a class |
| Exemplars non-binding | `binding` must be `false` |
| The same backlog builds under either executor | Build backlog increment `inc-012` (section 11) runs one increment each way with **no backlog edit** between runs; `tim build parity-report` asserts the backlog sha is unchanged |

---

## 4. Writer and tooling

### 4.1 `tim backlog`: generalising the parity writer

`tim/src/backlog/` is lifted from `tim/src/parity/` (G2 §4). Parity keeps its own schema (v1, 15 required keys, `schema.js:112-135`) as a **profile**, so `report.contract.test.js` and the four frozen corpora keep passing (G5 §6).

| Module | Source it generalises | What changes |
|---|---|---|
| `core/io.js` | `parity/io.js:19-55` | Temp name becomes `.<name>.<pid>.<random>.tmp` (fixes the shared fixed temp name, `io.js:48`); adds the lock and CAS below |
| `core/ids.js` | `ingest.js:288-331` `assignIds` | Per-file sequences (`inc-` in each backlog file), `atm` never needed because atoms are increments in their own file |
| `core/refs.js` | `ingest.js:336-388` `resolveRelatedTo` | Resolves `dependsOn`, `members`, `sequence.after`, `needs.blocks` by key; refuses dangling and self references |
| `core/graph.js` | new | Cycle detection (iterative Tarjan) over `dependsOn`; refuses a cycle and prints it as a path of keys and titles |
| `core/merge.js` | `ingest.js:418-461` `born`, `refreshed`, `ruled` | "Ruled" becomes: any `rulings[]`, any status other than `todo`/`blocked`, or any attempt in `build/state.json` |
| `schema/v2.js` | `parity/schema.js` passthrough idiom | Zod v2 schema; strict mode refuses the listed unknown keys; `parseBacklog(v)` dispatches on `schemaVersion` |
| `ingest.js` | `parity/ingest.js` | `--pass atoms` reads `distil/atoms/*.json`; `--pass combined` reads `distil/combined/*.json`; verifier record required (`ingest.js:589-600`), and `authoredBy ≠ verifiedBy` |
| `set.js` | `parity/set.js:47-201` | Requirement slots per v2; refuses `statement` after first ingest (frozen oracle) |
| `status.js` | new (G2 §3.7 "no build-state setters") | The only status setter; enforces 3.5 transitions and required `resolution`/`statusDecision` |
| `derive.js` | `build-orchestrator/SKILL.md:126-153` | One buildability function, used by every reader |
| `view.js` | new | `tim backlog show <id> --view build` produces the self-contained increment view given to every stage (row plus the header invariants, direction, scope exclusions, deviations, assumptions and milestone goal it references, plus the titles and outcomes of its dependencies) |
| `absorb.js` | `build-orchestrator/SKILL.md:239-261` `DEFERRED:` sweep | Turns `build/discovered.jsonl` into new atoms, new questions and a `combine-due` flag |
| `migrate/` | new | Adapters from journey-builder, trace, parity and FA `stages.json` shapes (section 10) |

### 4.2 Lock, lost-update protection and idempotency

Every write command:

1. **Locks**: `mkdir <file>.lock/` holding `owner.json {pid, host, command, opId, at}` (journey-builder's mkdir lock, `backlog-plan-increment.sh:60-71`, the one thing tim lacks, S §6.1 #19). A lock older than 120 seconds whose pid is not alive is broken, and the break is logged in the command output.
2. **Checks the CAS token** if the caller passes `--expect-sha <sha256>` (the token `writeJsonAtomic` already returns, G2 §3.8). Mismatch exits 5 with both shas.
3. **Checks the op id**: `--op-id <id>`. Each file has a sibling `<file>.ops.jsonl`; an op id already recorded is a no-op that exits 0 and prints the original result. Workflow-generated op ids are `<runId>:<increment>:<attempt>:<stage>:<task>:<verb>`, so a replayed or re-run agent can never double-apply a note, a status or a PR record.
4. **Validates** the whole file after the change (schema, refs, cycles, `needs`/`status` coherence, ledger sha).
5. **Writes atomically** and prints `{before, after, sha256, opId}` for the one thing it changed (skill pattern 6).

The same core serves `decisions.json`, `build/state.json` and `build/bindings.json`.

### 4.3 Command inventory

All commands take `--workarea <path>` (a path, never a run-id glob; fixes the `EUDPA-*` lock, G5 §4) and `--json`. They follow `tim/CLAUDE.md`: library-first clients, behavioural vitest tests on input and output, network mocked at the boundary with undici MockAgent, sibling `*.test.js` for every module.

**`tim backlog`**

| Command | Purpose |
|---|---|
| `init --programme <slug>` | Scaffold the workarea, empty v2 header, `.gitignore` for caches and logs |
| `validate [--strict]` | Schema, refs, cycles, coherence, recipe lint, ledger sha |
| `ingest --pass atoms\|combined [--dry-run]` | Per-file ingest with stable ids and refusals |
| `set <id> --slot <slot> --from-file <f>` | One requirement slot (fan-out workers never touch the JSON) |
| `status <id> --to <status> --note <text> [--resolution] [--decision] --op-id` | The only status setter |
| `show <id> --view build\|report` | The self-contained increment view |
| `derive [--next] [--explain <id>]` | Buildable set; `--explain` says why an id is or is not buildable |
| `counts` | `N of TOTAL (P%)` with deferred and dropped excluded (memory `feedback_report_progress_count_on_landing`) |
| `absorb-discovered` | Discovered work into atoms, questions and a combine flag |
| `lint --recipe` | Recipe-shape lint |
| `migrate --from journey-builder\|trace\|parity\|fa-stages <path>` | v1 to v2 adapters |
| `list` | Every v2 workarea under `workareas/shared/` (a registry by discovery, not a hand-kept file) |

**`tim decisions`**

| Command | Purpose |
|---|---|
| `ask --from-file <q.json>` | Add a question; refuses a duplicate slug |
| `rule <q-id> --option <x> \| --answer-file <f> --words <verbatim> --by <who> --at <date> --note <why> [--supersedes d-NNN]` | Record a ruling (house direction: tim over `rule-decision.sh`) |
| `outstanding <q-id> --words <verbatim> --by --at` | Record a tentative answer without ruling |
| `withdraw <q-id> --note` | A question the evidence made moot |
| `apply` | Denormalise current decisions into rows, set statuses, record `effects`, mark `combine-due` if atoms changed |
| `list --open\|--must-answer\|--cluster` | |
| `answer-sheet` | A paste-ready sheet keyed by slug (fixes "question 3 meant 17/18", G §2) |

**`tim distil`** (section 5), **`tim build`** (section 7), **`tim stage`** and **`tim standards`** (section 8), **`tim report`** (section 6).

**Bash tools** (only where the thing is inherently a shell concern):

| Tool | Why bash |
|---|---|
| `tools/codex/run-stage.sh`, `tools/codex/run-batch.sh` | Process control of an external CLI in foreground slices; allowlisted by path (`Bash(~/…/tools/**)`), so `codex` needs no allow rule (Q22) |
| `tools/sonar/pr-findings.sh <repo> <sha>` | Wraps `sonar api get` so no agent runs `sonar` directly; exit 0 clean, 1 BLOCKER or CRITICAL found (listed), 2 not analysed yet, 4 no project |
| `tools/sonar/scan-staged-secrets.sh <repoPath>` | Wraps `sonar analyze --staged` with its own `cd` inside the script (the reason agents cannot run it, memory `reference_sonar_analyze_unavailable`); exit 0 clean, 1 secret found, 3 tool unavailable (recorded as "owed", never as clean) |

`tim build` does **not** shell out to `tools/*.sh` for lifecycle (tim rail "Never shell out to `../tools/*.sh`"). It owns Git operations through `src/exec`, GitHub through octokit (PR ensure, checks, approvals, merge) and Jira through `jira-client`. The ported alignment scripts are kept only for the retiring loop's lifetime.

### 4.4 Guard rails, once

`docs/agent-rails/guard-rails.md` holds the canonical Claude GUARD RAILS (the `FA:102-117` superset, H §5, plus: "run `tim` as `tim …`", "never sleep; a command that returns exit 3 means call it again", "never write JSON state; use the named `tim` command"). Workflow scripts cannot read files (S §7.1.6), so each script inlines the block, and **a tim test (`tim/src/build/rails.test.js`) asserts every `.claude/workflows/**/*.js` GUARDRAILS constant is byte-identical to the doc**. Drift fails tim CI instead of reaching a run.

---

## 5. Distiller skill

### 5.1 Identity

- **Name:** `requirements-distiller`
- **Triggers:** "distil requirements", "distil these sources", "turn these into a backlog", "gather requirements from", "requirements from Jira/Confluence/this doc", "resume the distillation", "re-combine the backlog", "regenerate the distillation report", "rule the requirements questions".
- **NOT for:** comparing two running things for parity findings (that is `parity` COMPARE, which remains the capture-and-compare pipeline and can feed the distiller as a source); a single already-agreed change (`frontend-change`, `ticket`); building (`backlog-implementor`).
- **Modes** (dispatched by `tim distil start <workarea> --json`, which prints `MODE:` first, pattern 2):

| Mode | When | What it does |
|---|---|---|
| `NEW` | No workarea | Setup interview (only for gaps the sentence did not give), contract, registry |
| `RESUME` | Ledger has an unfinished phase | Runs `tim distil phase status`, continues at `Next:` |
| `RULE` | Sam gives rulings | `tim decisions rule …` per ruling, then `apply`, `combine --affected`, ingest, re-render |
| `RECOMBINE` | `combine-due` flag set (after rulings or absorbed build discoveries) | D11 to D13 on affected groups only |
| `REFRESH` | A source changed version (a seal drifted) | Carryover against the new version, then D4 onward for affected slices |
| `REPORT` | Any time | Re-render only |

### 5.2 The phase ledger

`tim distil phase` generalises `tools/parity/phase.sh:29-44` into tim with the phase table as data, fixing its known weaknesses (G1 §2.4): it is stored in the tracked workarea (`distil/phases.json`), `reset` **cascades** to every dependent phase, `done` records an **artefact fingerprint** (sha256 of the phase's outputs) and `gate` re-checks fingerprints so "done" is checked against the disk, and `done` needs a note.

| Phase | Needs | Output | Runs as | Gate command |
|---|---|---|---|---|
| D0 `setup` | | `distil/contract.md` whole (no PER-RUN placeholder left), `distil/sources/registry.json` | main session | `tim distil contract check` |
| D0.5 `heads` | setup | `distil/heads.json`: every repo any source or citation touches, `{sha, branch, dirty}`, keyed by repo key (fixes absolute paths, G3 §1.4.3) | main | `tim distil heads --strict` exits non-zero on `moved` |
| D1 `characterise` | heads | `characterisation/<src>.md`, `units/<src>.json` (the enumeration of addressable units) | Workflow, per source | every source has units or a stated absence |
| D2 `slice` | characterise | `slices.json`: every unit owned by exactly one slice, one `crossCutting: true` slice | main (one opus agent drafts, tool proves) | `tim distil slices --strict` |
| D3 `carryover` | characterise | `carryover.json` verdicts `carries \| retired \| changed \| recheck` for every item of a previous distillation or migrated v1 backlog | Workflow, one agent | every previous item has a verdict |
| D4 `extract` | slice, carryover | `atoms/<slice>--<slug>.json`, per slice `authoring.json {notRaised[], premisesDisproved[]}` | Workflow `pipeline()` per slice: author then verifier | |
| D4 `verify` | extract (per slice, same pipeline) | `verification` block on every atom, `authoredBy ≠ verifiedBy` | same Workflow | |
| D5 `prove` | verify | coverage and yield reports | main | `tim distil coverage --strict`, `tim distil yield --strict` |
| D6 `reconcile` | prove | `conflicts.json`, source-to-atom precedence applied | Workflow, one opus agent | every conflict has a pick or a question |
| D7 `panel` | reconcile | panel decisions in `decisions.json` (`decidedBy: panel`), escalated questions | Workflow, dockets | every docket item has exactly one ruling (`panel-critic.json` check) |
| D8 `sweep` | panel | duplicates bookkeeping on atom files | Workflow, one opus agent | `tim distil duplicates --all` candidates each answered |
| D9 `ingest-atoms` | sweep | `backlog.atoms.json` | main | `tim backlog validate --strict` |
| D10 `critic` | ingest-atoms | `critique.json`: blind spots, missing units, new questions or atoms | Workflow, one opus agent | |
| D11 `combine` | critic | `combined/<key>.json` and `combination.json {applied, declined}` | Workflow | `tim distil combine check` |
| D12 `ingest-combined` | combine | `backlog.json` | main | `tim backlog validate --strict` |
| D13 `report` | ingest-combined | `report/` | Workflow for prose slots and claim verification, main for render | `tim report check` (every count derived, every question rendered) |

### 5.3 Sources, types and acquisition

`distil/sources/registry.json` entries: `{id, type, role, tier, ref, version, fetchedAt, seal, provenanceScheme, status, notes}`.

- **Roles** (F K3): `requirement` (tiered), `constraint` ("constraints, not requirements", `SOURCE_EXTRACTOR.md:116-117`), `consistency-anchor` ("never requirements", `:544-553`), `current-behaviour` (traces, tests, existing code), `prior-requirements` (a previous distillation or v1 backlog, used by carryover). Role is required; it is the main defence against recipes entering the requirements.
- **Acquisition** is `tim distil sources acquire`, library-first: Confluence and Jira through tim's clients (reusing the fetch shape of `tools/refine/prepare-refinement.sh`, F P4), files copied into `distil/sources/cache/<id>/`, repos never copied (read with `git show <pin>:<path>`, `citations/evidence.js:75-93`). Each acquired source is **sealed** with the generalised seal record `{kind, locator, contentHash}` (G3 §3.4). **Credential scrubbing**: acquisition masks credential-shaped values in cached copies, because the Sonar read hook refuses a file quoting one (H §2.3) and Codex has no hook at all.

| Type | Characterisation mechanics (in `references/source-types/<type>.md`) | Provenance scheme |
|---|---|---|
| `jira` | Issue, description, ACs, comments as utterances with author and time; linked issues listed as pointers | `EUDPA-123#desc/para:n`, `EUDPA-123#comment:<id>` |
| `confluence` | `body.view` (not storage, `targets.json` comment); headings, tables by row id | `h4:<heading>/li:n`, row ids such as `NNS-UN-021` |
| `docx` | `unzip -p … word/document.xml` with `</w:p>`, `</w:tr>`, `</w:tc>` markers (`SOURCE_EXTRACTOR.md:28-32`); numbering from `numbering.xml` | `section:<slug>/para:n/item:k`, `annex:n/reg:<ref>` with `alsoStatedAt` |
| `pdf` | Read tool with `pages`; headings by page | `page:n/para:k` |
| `xlsx`/`csv` | Sheet and row ids | `sheet:<name>/row:<id>` |
| `image-board`, `canvas` | Read one at a time; colour key inferred and recorded (`rules.mural.md:15-24`); crops for visual evidence | `file:<short>/region:<label>/item:n[/crop:<name>]` |
| `repo` (code) | Pinned; role usually `constraint` or `current-behaviour`; never a requirement on its own | `<repoKey>:<path>:<lines>@<sha>` with blob |
| `trace-corpus` | Cwd-scoped traces, `fill` values redacted (`trace-to-requirements.workflow.js:103-105, 113-124`) | `trace:<hash>/action:<id>` |
| `transcript`, `chat` | Utterances classified `requirement \| decision \| question \| opinion \| musing`; speaker authority from the contract | `speaker@timestamp`, `msg:<id>` |
| `backlog` (v1 or v2) | Rows as prior requirements; recipes ignored; rulings carried | `<workarea>#<id>` |
| `openspec` | `REQ-`/`SCN-` ids | the id |
| `web` | WebFetch snapshot, sealed | `url#heading` |

### 5.4 The run contract

`distil/contract.md` is seeded from `.claude/skills/requirements-distiller/assets/REQUIREMENT-CONTRACT.template.md`, adapted from `tools/parity/templates/FINDING-CONTRACT.template.md` (G1 §1.6). It must be whole before the first agent spawns (`tim distil contract check` refuses placeholders). Sections: purpose and audience; source roles and precedence per fact kind; **what is not a requirement** (recipes, house style, legacy architecture, named by example); **what may be named** in acceptance (external routes, published document shapes, mandated components); the atom grain rule verbatim ("If your sentence contains 'and also', you have two requirements", `FINDING_AUTHOR.md:130-137`); the cross-cutting slice's scope; the confidence enum; the question rules (must-answer categories; defaults otherwise); a firewall of paths not to read and paid-for knowledge (`RUN-BRIEF.md` §1, §7, G1 §1.8).

### 5.5 Personas

All are `general-purpose` workers with the GUARD RAILS block first in the spawn prompt, a `Follow …/references/<NAME>.md` pointer, and output through `tim stage accept` (so they can be bound to Codex too).

| Persona | Reuses | Adapted how |
|---|---|---|
| `SOURCE_CHARACTERISER.md` | `SOURCE_EXTRACTOR.md:1-47` (method only; the 650 lines of instance notes stay in the EUDPA-409 workarea, F P1) + `source-types/*.md` | Emits `units/<src>.json` (the enumeration, G1 §1.2) and states unreadable parts as units with `status: unreadable` |
| `CARRYOVER_TRIAGER.md` | parity AUTHOR step 1 (`parity/SKILL.md:667-690`) | Verdict per previous item with the settling line |
| `SLICE_AUTHOR.md` | `FINDING_AUTHOR.md` (grain rule, "check the brief", falsifier), trace Extract (`:168-179` verbatim or gap) | Reads every source's units owned by its slice; writes one atom file per requirement; returns `notRaised[]`, `premisesDisproved[]` (`author-workflow.js:144-147, 214-232`) |
| `ATOM_VERIFIER.md` | `FINDING_VERIFIER.md` rubric + trace Verify (`:850-927`, "do not invent corrections") | Never verifies its own slice; one verification line on every atom including untouched ones |
| `SOURCE_MERGER.md` | `workareas/shared/dr1a-vs-dr1c-workflow.js` Match and Judge | Used when two sources describe the same area independently; "would a person doing the work write the same diff" |
| `RECONCILER.md` | `SPEC_RECONCILER.md:19-30` (conflicts, do not force-fit) without its obligations vocabulary (F P7) + `RECONCILER-BRIEF.md:30-36` precedence | Target-neutral; `modelGap` becomes a question |
| `PANEL_JUDGE.md`, `PANEL_CHAIR.md`, `PANEL_CRITIC.md` | EUDPA-409 `panel-*.json`, `panel/README.md`, `APPLIER-BRIEF.md` (D §2.6) | Formalised; the applier is `tim decisions rule --by panel` |
| `DUPLICATE_SWEEPER.md` | **parity's, by path, live** | Called with `--all` pairs (fixes the cross-slice-only default, G1 §2.5) |
| `COMBINER.md` | `DUPLICATE_SWEEPER.md` question and bookkeeping + `combination-proposal.md:13-88` rules | See 5.9 |
| `COMPLETENESS_CRITIC.md` | trace Critic (`:1435-1443`), `ched-p/completeness-critique.md` | Counter-numbers, structural blind spots per source type |
| `QUESTION_WRITER.md` | c0f99985 four-part shape; Ralph lettered options (`prd/SKILL.md:24-55`) | Clusters raw questions, writes headline, in play, options with support counts, if unanswered |
| `CLAIM_VERIFIER.md` | **parity's, by path, live** | Over every prose slot of the report |

### 5.6 Workflow or main session

- **Main session:** D0, D0.5, D2 proof, D5 proof, D9, D12, render. These are short, deterministic, or need Sam.
- **Workflow (`distil-phase.js`, one invocation per phase, args `{workarea, phase}`):** D1, D3, D4 (a `pipeline()` so a slice's verification starts when its authoring ends, `author-workflow.js:259-263`), D6, D7, D8, D10, D11, D13 prose. The phase ledger is the resumption mechanism; each phase is also resumable by `resumeFromRunId`.
- The distiller uses the **same stage machine** as the implementor: `tim distil advance --phase <p>` returns the tasks, `tim stage prepare` writes their prompts, `tim stage accept` checks their outputs. So heavy distiller phases (characterise, author, verify, carryover) can run on Codex with `tim distil bind` exactly as build stages do (R6's reason, Sam's weekly limit, applies here too).

### 5.7 Model tiers and fan-out

| Phase | Claude tier | Codex effort | Concurrency |
|---|---|---|---|
| characterise | Sonnet | medium | one per source |
| carryover | Opus, high | high | one |
| author | Sonnet (Opus for slices marked `highStakes` in the contract) | high | one per slice |
| verify | Sonnet | high | one per slice, pipelined |
| reconcile, sweep, critic, combine | Opus, high | high | one each (anti-pattern A5, H §7.2) |
| panel | Opus, high | high | **at most 6 Opus agents at once**: dockets run one at a time with 3 judges in parallel, then the chair; the critic after all dockets (S §7.4, memory `reference_opus_session_limit_under_fanout`) |
| question writer, report prose | Opus | high | one per cluster, at most 6 at once |
| claim verifier | Sonnet | medium | one per section |
| watchers | Haiku, low | not used | |

### 5.8 Completeness checks (pass 1)

- **Coverage** (`tim distil coverage --strict`, from `parity/coverage.js:75-102`): every unit in every `units/<src>.json` is cited by at least one atom, listed in a slice's `notRaised[]` with a reason, or marked out of scope in the contract. Output lists `missing`, `stated-absent`, `unexplained`.
- **Slices** (`tim distil slices --strict`, from `slices.js:121-263`): every unit owned exactly once; exactly one cross-cutting slice; `splitPairs` printed.
- **Yield** (`tim distil yield --strict`, from `yield.js`): atoms per owned unit per slice; a slice under 0.4 of the median is flagged thin (the cross-cutting slice exempt); `homeless`, `strayed`, unverified atoms must be zero. A thin slice gets a second author with a coverage brief, never a silent pass (the DR1C practice, G1 §1.4).
- **Duplicates** (D8): mechanical candidates on all pairs (shared unit, shared source ref, title similarity), then the sweeper.
- **Critic** (D10): counter-numbers ("38 of 39 map cleanly") and what the method cannot see per source type.

### 5.9 Pass 2: combine

**The question** (on the same scale as the sweeper's, G1 §1.5): *"Would one person, doing one piece of work, in one reviewable change, deliver both, and would a red in one still be attributable?"*

**Candidates** (`tim distil combine candidates`, deterministic): pairs and groups of atoms that share any of: area in `surfaces.areas`; the same repo set; the same `consistentWith` target; a shared decision or assumption; the same end-to-end acceptance boundary; one atom only proves or documents another (EUDPA-409's exemplar-placeholder rows); cross-repo lockstep (the tests atom for a page atom).

**Rules** (from `combination-proposal.md:13-15`, restated in requirement terms, F P13):

1. Never across an open `needs`, a `checkpoint` or a milestone boundary.
2. Never two independent user journeys' pages in one increment.
3. Attributability: if a red in one member would be blamed on another, do not combine.
4. Ceiling (Q8): at most 12 acceptance criteria, at most 3 areas, at most 3 repos, at most 2 end-to-end proofs. The ceiling lives in `distil/contract.md`, so a programme can tune it with a stated reason.
5. Always combine cross-repo lockstep atoms that land on one branch name anyway (Q14), within the ceiling.
6. Never regroup a started increment (any attempt in `build/state.json`) or a ruled one; new atoms form new increments.

**Bookkeeping:** the combiner writes `combined/<key>.json` `{key, title, outcome, why, members[keys], rationale, risk}` and `combination.json {applied[], declined[{members, why}]}`. It never edits atom files. The combined row's `acceptance` is the **union of its members' acceptance, each keeping its id and evidence** (`inc-031/ac-1`), assembled by the writer, not by the agent. `outcome` and `why` are written by the combiner and verified by a second agent. Declined pairs are the "considered and left alone" list.

**Applied automatically, reported, reversible:** combination is applied (memory `feedback_headless_make_calls_dont_gate`) and every combination appears in the report under "Calls we made" with a one-line opt-out (`tim distil combine split inc-007 --member inc-033 --note …`).

### 5.10 Re-derivation after rulings

1. `tim decisions rule` records; `tim decisions apply` changes **atoms** (status, `rulings`, new or dropped atoms) and marks `combine-due` listing the affected atom keys.
2. `tim distil combine --affected` recomputes candidates only for groups that contain an affected atom plus any unassigned atom, and re-runs the COMBINER only on those. Unaffected combined files are untouched.
3. `tim backlog ingest --pass combined`: an existing key keeps its id; a group that disappeared becomes `superseded` (never deleted); a started or ruled increment refuses to change membership (`ruled()`, `ingest.js:454-461`), and the refusal becomes a question in the report ("this ruling reshapes work already built").
4. The report re-renders.

Combined keys are matched to their previous selves by member overlap, keyed on stable content as `carry-forward.js:14-36` does, never by position.

### 5.11 Existing code and existing backlogs as sources

- Existing code is a `constraint` or `current-behaviour` source. A current-behaviour fact can become a requirement only when a requirement-tier source asserts it or Sam rules it (trace `:799-802, 1144-1154`).
- An existing backlog enters through carryover: each prior row is `carries`, `retired`, `changed` or `recheck`, with the settling source line. Its recipes are discarded; its rulings are carried into the ledger as `decidedBy` the original ruler with `carriedFrom`.

---

## 6. The distillation report

### 6.1 How it is made

- **Generated, never edited.** `tim distil report` (and `tim build report`, the same renderer with the build section expanded) reads `backlog.json`, `backlog.atoms.json`, `decisions.json`, `distil/*`, `build/state.json` and seals, and writes `report/index.html` (static local app), `report/report.md` (tracked twin) and, with `--artifact`, a single-file page for publishing (the parity two-emitter design, `parity/SKILL.md:311-317`).
- **Renderer:** `tim/src/report/` is a sibling of `tim/src/parity/render/`, importing its `theme.js`, `prose.js` and the citation and snippet machinery (`sections.js:54-97`). Cards are requirement-first with a sources strip, not two-sided (G §3.2, Q32).
- **Prose slots** (question wording, "calls we made" explanations, combination rationales, the one-sentence purpose) are JSON fields written by agents and checked by `CLAIM_VERIFIER.md` in D13. The renderer never asks a model anything.
- **Every number derived**, headline built from counts (`page.js:222-231, 287`), freshness stamp and footer with backlog sha, ledger sha, tool version and pins (`page.js:379-405`). A **drift panel** above everything when any source seal or repo head moved since the rulings it affects (`page.js:109-139`, G3 §3).
- **Quality gate:** `tim report check` fails if any open question is not rendered, any count is typed, any atom is in no increment and no exclusion, or any ruled question still appears as open.

### 6.2 Rulings in and out

- Each question card has option buttons. **Copy batch** yields one command per line, `tim decisions rule q-… --option a --words "…" --by sam --at 2026-09-19 --note "…"` (from `card.js:9-33`, `page.js:186-219`). The page never writes.
- **Answer sheet** (`tim decisions answer-sheet`): a paste-ready list keyed by slug and headline; Sam can reply in chat as `q-sign-out-session-drop: a` and the RULE mode records each with his words verbatim.
- A reply like "maybe?" is recorded `outstanding`, never ruled.
- After `apply`, `combine --affected`, ingest and render, the question leaves section 1 and appears as one line in "Rulings applied", and anything it unblocked moves to the backlog section.

### 6.3 Skeleton, with example content

```markdown
# High-risk plants notification: what needs a ruling

This page leads with what you must decide, then the calls we made that you may want to reverse.
Every fact was re-read from its source on 19 September 2026.

> Drift: 1 source changed since you ruled. Confluence "Requirements - National Notification System"
> moved from version 11 to 12. It affects 2 rulings (d-004, d-009). [Show what changed]

**We found 214 requirements in 7 sources and grouped them into 58 increments (156 fewer builds).
9 questions need you: 3 must be answered before the work they block can start.**

Sources: policy paper (v1, August 2026), Confluence user needs (v8), Confluence requirements (v12),
Mural board (41 images), design prototype (repo, pinned 3a9c1e0), live animals frontend (consistency only),
plants skeleton (constraints only).

## 1. Needs your ruling (9)

### Must be answered before build (3)

**Should the service drop its own session when sign-out starts?**  `q-sign-out-session-drop`
- In play: whether a session can outlive a sign-out when the identity provider rejects a long request.
- Options:
  - a. Drop it immediately. Supported by 2 sources (live animals sign-out, interaction design canvas).
  - b. Keep it until the provider confirms. Supported by none.
- Recommended: a, by the panel (3 judges to 0).
- If nobody answers: stays blocked. This is a security question and is never built on a default.
- Blocks: "Signing out ends the person's session in every service they used".
- [ ] a  [ ] b  [ ] other: ______        Picture: sign-out region of the Mural board

(2 more must-answer questions)

### Will be built on a default unless you say otherwise (6)

| Question | Options (support) | If nobody answers | Blocks |
|---|---|---|---|
| Is the error summary title "There is a problem"? | a. GOV.UK default (3) b. Policy wording (1) | a, the GOV.UK default | nothing |
| … | | | |

[Copy batch]  [Answer sheet]

## 2. Calls we made that you may want to reverse (17)

**The country list follows the policy paper, not the Mural board.**
- Rule applied: the policy paper decides what must be collected (precedence, fact kind "values").
- The other side: the Mural board lists six countries; it predates annex 5.
- To reverse: 1 ruling; changes 2 acceptance criteria in 1 increment.

**Origin rules were combined into one increment.**
- Rule applied: same area, same repos, attributable failures, 4 acceptance criteria.
- The other side: the Welsh copy could land on its own.
- To reverse: `tim distil combine split inc-007 --member inc-033 --note "…"` (1 command; 1 more build).

## 3. Where the evidence is weak (12)

- 4 requirements rest on one source only, at "inferred" confidence. What would upgrade each: …
- The prototype contains nothing plants-specific (searched for: commodity, potato, PHNNS; none found).
- What this method cannot see: server-side validation never triggered in a trace; authorisation rules with no UI.
- 3 units could not be read: the SharePoint workbook linked from Confluence (not fetched, pointer only).

## 4. The backlog (58 increments; 0 of 58 done, 0%; 2 deferred not counted)

| # | Increment | Satisfies | Acceptance | Depends on | Status |
|---|---|---|---|---|---|
| inc-007 | The origin page asks only what the commodity and country require | 3 requirements | 4 criteria (2 end-to-end) | inc-003 | todo |
| inc-014 | Signing out ends the person's session in every service they used | 1 requirement | 1 criterion | none | blocked by a question |
(each row expands to its members, their criteria and evidence)

## 5. How the increments were combined

Rules: … (the six rules). 156 atomic increments became 58. 31 pairs were considered and left alone:
- "Commodity code" with "Commodity description": a red in the lookup would be blamed on the page.

## 6. Coverage

| Source | Units | Became requirements | Not a requirement (why) | Out of scope | Unread |
|---|---|---|---|---|---|
| Policy paper | 212 | 171 | 38 (restatements, linked) | 3 (bulk upload, sr-bulk) | 0 |
Noticed and not raised (from the authors): 23, each with its reason.

## 7. Conflicts between sources (27)
Needs a person (4, all in section 1) | Settled by precedence (23, all in section 2), both sources quoted.

## 8. Out of scope, parked and rejected (11)
Each with who ruled, when, and the words.

## 9. Rulings applied (31)
- 19 September 2026, Sam: "Keep origin to origin." Territory check is handled on the destination page. (d-001)

## 10. How this was checked
Phase ledger with every note; verifier statistics (atoms corrected 21 of 214; struck 4); yield per slice;
duplicate sweep result; heads at start and before pass 2; claim verifier result on this page.

## 11. Where everything is
Paths to every JSON file, the commands that regenerate this page, and the build status command.
```

Every section says what it is on first mention and stands alone (memory `feedback_updates_stand_alone`); headlines lead and ids trail (memory `feedback_reference_by_headline_not_ticket_number`); no time estimates; sizes are increments, files and commands.

### 6.4 The build section (Q37)

`tim build report` re-renders the same page with section 4 expanded into build progress: `N of TOTAL (P%)`, held increments with the hold reason and the one command that releases each, rulings applied during build, increments added from discovered work (with their source stage), plans linked, and executor per increment (from state, never from the backlog). A render failure sets `reportStale: true` in state, which the masthead and the handover both print.

---

## 7. Implementor skill and workflows

### 7.1 Identity

- **Name:** `backlog-implementor`
- **Triggers:** "build the backlog", "build inc-012 to inc-020", "build N increments", "build with Codex", "delegate … to Codex", "Codex for the rest", "switch back to Claude", "resume the build", "hand over the build", "retry inc-014 from CI", "release inc-014".
- **NOT for:** writing or ordering a backlog (`requirements-distiller`); one already-agreed change (`frontend-change`, `ticket`); reviewing someone's PR (`review`, `code-style`).
- **Dispatch:** `tim build start --workarea <w> --json` prints `MODE: RUN | RESUME | HANDOVER`, the resolved bindings summary, the next buildable increment, any holds, and the exact Workflow args object.

### 7.2 Cadence: drain parent plus per-increment child (Q19)

- `build-drain.js` is launched once from the main session **by `scriptPath`** (S §7.1.2) with a real args object `{workarea, count?, stopAt?}` parsed from a string if needed, **throwing on a missing key**, and logging the resolved config first (G4 §4). No FALLBACK, no run copy.
- Each round: a watcher runs `tim build next --json` (derive plus holds plus bindings), then `await workflow({scriptPath: '.claude/workflows/build/build-increment.js'}, {workarea, increment})`, then a watcher runs `tim build after-increment <id> --json` which does the landed check from state (not from the child's report, `build-orchestrator/SKILL.md:222-237`), absorbs discovered work, applies checkpoint and systemic-halt rules, and re-renders the report.
- Supervised cadence ("one at a time, I want to look between each") launches `build-increment.js` directly with the same args shape. Cadence is a flag, not a second code path (G4 §2.1).
- The child is re-read on each `workflow()` call if the canary confirms it (G4 §2.1, section 12); otherwise a fix to the child needs a parent relaunch, which the state-driven machine makes free.

### 7.3 The child is an interpreter

```js
// build-increment.js (shape; ~250 lines in full)
const CFG = parseArgs(args, ['workarea', 'increment'])            // object or JSON string; throws on a missing key
log(`build-increment ${JSON.stringify(CFG)}`)
let step = await watcher(`tim build advance --workarea ${W} --increment ${CFG.increment} --json`)
while (step.status === 'run' || step.status === 'wait') {
  if (step.status === 'wait') { step = await watcher(advanceCmd); continue }   // a CI or ladder slice ended; call again
  const claudeTasks = step.tasks.filter((t) => t.kind === 'claude')
  const codexBatch  = step.tasks.filter((t) => t.kind === 'codex')
  await parallel([
    ...claudeTasks.map((t) => () => agent(taskPrompt(t), { model: t.model, effort: t.effort, schema: RECEIPT, label: t.label, phase: step.stage })),
    ...(codexBatch.length ? [() => agent(codexShellPrompt(step.batchDir), { model: 'haiku', effort: 'low', schema: BATCH_RECEIPT, label: `${step.stage} codex×${codexBatch.length}` })] : [])
  ])
  step = await watcher(advanceCmd)                                  // accepts, validates counts, decides the next stage
}
return { increment: CFG.increment, outcome: step.status, stopReason: step.stopReason, resolvedConfig: CFG }
```

The script does **not** decide whether a missing receipt matters, whether to skip verification when there are no findings, how many fix attempts remain, or what stage comes next. `tim build advance` decides all of it from files, under test. The script's only jobs are fan-out and transport.

### 7.4 `tim build advance`

On each call it:

1. Accepts any task outputs not yet accepted (idempotent).
2. Checks the stage's **expected task set**: every task prepared must have an accepted receipt. A missing receipt is a failed task, never a filtered-out one (fixes `filter(Boolean)`, `increment-build-loop.js:1250`).
3. Applies the stage's transition rule (7.5), writes state through the writer with op ids.
4. Runs every following **deterministic** stage itself (ladder, land, PR, CI watch slice, Sonar query, merge), until it reaches a stage that needs a model, a slice boundary (`wait`), or a terminal state.
5. For a model stage, prepares every task folder (`tim stage prepare`) for the executor the bindings resolve for that role, and returns `{status: 'run', stage, tasks[], batchDir}`.

Exit codes: 0 with a JSON step; 5 on a CAS conflict (another writer; call again); 2 on bad input.

### 7.5 The stages

Every stage writes under `build/runs/<id>/a<n>/<NN-stage>/`. "Det." means `tim build advance` runs it; "Model" means tasks are prepared for the bound executor.

| # | Stage | Kind | Reads | Writes | Transition |
|---|---|---|---|---|---|
| 0 | `preflight` | Det. | backlog, state, bindings, targets | `heads.json` for the increment's repos; validation result | Invalid backlog or ledger sha mismatch → hold `config`. Dirty tree in a repo the increment touches → hold `dirty-tree` naming files (never stash another session's files) |
| 1 | `ticket` | Det. (per-increment only) | row, header `jira` | state `ticket` | Idempotent create or reuse, exact-string transition, board move (`increment-build-loop.js:857-993`); ACs copied from `acceptance[].statement` only |
| 2 | `sync` | Det. | state | merge results | Programme strategy: merge `origin/<base>` into the branch in every touched repo **and the tests repo** with a `merge-tree` probe first; conflict → hold `sync-blocked` (`FA:613-661`) |
| 3 | `baseline` | Det. | header ladders | `baseline.json` per rung with exit codes | A red rung is recorded. It **never** reads as "pre-existing and fine": `advance` emits a discovered `hygiene` item "the <rung> in <repo> is red at <sha>", born `todo` ahead of this increment, and holds this one `baseline-red` with `dependsOn` pointing at it (memory `feedback_dont_ignore_test_failures`) |
| 4 | `plan` | Model, think | increment view, standards manifest (by repo tech), baseline, exemplars, rulings, `consistentWith` | `plans/<id>.md` (outline 0 to 7 from `FA:697-721` plus "8 Acceptance coverage" mapping every AC to its proof and "9 Standards consulted"), `plans/<id>.json` | `ok:false` → hold `plan-refused` and the refusal's question goes to the ledger. Plan exceeding `review.cap` without an overflow reason → rejected at accept, re-planned once, then held |
| 5 | `branch` | Det. | plan repos ∪ `surfaces.repos` ∪ tests where the plan has an e2e witness | branches | `--no-track` cut from `origin/<base>`, upstream repair (`:999-1045`); same name everywhere |
| 6 | `implement` | Model, doer | plan, increment view, standards manifest (by planned files, sibling-read rule) | changes in the tree (never staged or committed by the task) | Failure → preserve work (7.7) and hold `implement-failed` |
| 7 | `change-manifest` | Det. | git | `changes.json`: per repo, files changed against `<base>...HEAD` **plus** the index, per-file diffs written to `diffs/<repo>/<path>.diff` | Fixes the staged-only review gap (`:1192, 1213, 1236`; the Codex brief already fixed, `256f8177`) |
| 8 | `review` | Model | per task: its file diff, the full file, plan, increment view, standards manifest for that file | one output per task | Tasks: `style` × content-changed file in `reviewFocus`, `code` × same, one `consistency` (runs the plan's invariant proofs, `FA:850-851`), one `acceptance` (Q27: judges every AC against the change independently of the plan) |
| 9 | `verify` | Model, doer | findings grouped by file | verdicts | One task per file with findings, "default to refuted"; a dead verifier leaves findings **unrefuted, flagged** (the one sanctioned fail-open, `:1297-1304`) |
| 10 | `judge` | Model, think | confirmed findings, AC verdicts, rulings, invariants | rulings `fix-now \| defer \| reject` with complete instructions; deferrals as question records | Dead judge → hold `judge-failed` (never an empty judgement, fixes `:1350`, `FA:944`). Deferrals go to `decisions.json` through `tim decisions ask` |
| 11 | `fix` | Model, doer | fixNow instructions, REVIEW_ITEM_FIXER and STYLE_IMPLEMENTOR personas | `applied[{findingId, status, why}]` | Any `not-applied` without a reason, or a dead fixer → hold `fix-failed` (fixes `:1373`, `FA:953`) |
| 12 | `ladder` | Det. | header ladders + plan `ladderAdditions` | `ladder.json` per rung | Red → `ladder-repair` (Model, doer, ≤ 3 rounds, the framework-assertion exception with four conditions, `:1405-1415`), then re-run deterministically. Still red → preserve and hold `ladder-red` |
| 13 | `secrets` | Det. | staged change | `secrets.json` | `tools/sonar/scan-staged-secrets.sh`; secret found → hold `secret-found`; tool unavailable → recorded as owed to Sam, never as clean |
| 14 | `land` | Det. | plan `behaviourChanges`, rulings | commit per repo | Proves branch ≠ base, commits with `-F`, conventional type from `kind`/`nature`, body from `behaviourChanges`, `Ruling:` lines, trailer from args (`commitTrailer`, snagging fix `5271d04a`), refspec push (`PUSH_RULE`, `:336-364`) |
| 15 | `pr` | Det. | state | PR per repo | Per-increment: create or reuse; programme: ensure one draft per repo (`pr-ensure-draft.sh` semantics); persisted after each repo (`:1545-1548`) |
| 16 | `ci` | Det. + Model | checks | `ci.json` | Watch in slices (exit 3 means call again); unresolved is not green, no checks is not green (`wait-for-pr-checks.sh` exit 2 and 4 semantics). Red → `ci-fix` (Model, doer; may branch new repos and register their PRs, `:1631-1687`) up to `ciFixAttempts`. Platform-blocked red (missing secret, org setting) → hold `platform-blocked` naming the owed fix, re-point dependants, **continue** (memory `feedback_platform_blocked_increment_park_and_move_on`) |
| 17 | `sonar` | Det. | PR head shas | `sonar.json` | `tools/sonar/pr-findings.sh`: new BLOCKER or CRITICAL → back to `ci-fix` with the findings as input; not analysed yet → `wait` |
| 18 | `local-e2e` | Det. + Model | `lifecycle.localE2e` | `e2e.json` | `auto` pre-check decides if the change could alter what the stack serves (`FA:1148-1155`); runner is deterministic (`tim docker dev`, `npm run test:docker-compose` to a log, one retry for fresh-stack 500s, always `tim docker down`); red → `e2e-repair` reading `error-context.md` (Model), re-run |
| 19 | `merge` | Det. | `lifecycle.merge` | merge results | `never` → state `ready`; `on-approval` → whole-increment approval gate, `awaiting-approval` is a healthy pause; `on-green` (with `mergeRuling`) → merge in `mergeOrder`, watch base after each, final open-PR sweep (`:1714-1854`) |
| 20 | `done` | Det. | policy | row `status: done` via `tim backlog status`, `resolution: built`; Jira Done transition | Under `merge: never`, `done` means landed and green with PRs ready; the report distinguishes "merged" from "ready" |
| 21 | `record` | Det. | | workspace commit of state, plans, receipts, report twin | Commits only named paths (`FA:474-499`), pushes by refspec |
| 22 | `report` | Det. | | re-render | Failure → `reportStale: true` |
| 23 | `checkpoint` | Det. | row `checkpoint` | | `halt-after` stops the drain after this increment |

### 7.6 Holds, retries and systemic halt

A **hold** in `build/state.json` is `{reason, stage, at, detail, release: "<exact command>"}`. Reasons: `config`, `dirty-tree`, `sync-blocked`, `baseline-red`, `plan-refused`, `implement-failed`, `judge-failed`, `fix-failed`, `ladder-red`, `secret-found`, `ci-red`, `platform-blocked`, `e2e-red`, `awaiting-approval`, `changes-requested`, `main-red`, `pr-left-open`, `stage-failed`. The last is the catch-all for a task with no receipt after one automatic retry.

- A held increment is not buildable. `tim build retry <id> --from <stage>` (FA's human-set `ci-retry`/`e2e-retry`, generalised to any stage) or `tim build release <id>` clears it.
- **Systemic halt** (Q31): three holds in a row, or three of the same reason in one drain, stop the drain with `stopReason: systemic`.
- **Stop taxonomy** (from `build-orchestrator/SKILL.md:279-289`, extended): `exhausted`, `count-reached`, `checkpoint`, `held:<reason>`, `awaiting-approval`, `changes-requested`, `main-red`, `pr-left-open`, `systemic`, `no-buildable` (with the blocked count and the questions blocking them), `config-error`.

### 7.7 Red work and resume

- **Preserve work** (Q26): under `per-increment` and `programme`, a red implement, fix or ladder leaves a pushed `wip(<scope>): <id> attempt <n>` commit and does not record a landing commit (`:370-406`); under `local`, a path-scoped `git stash push -u -- <paths>` (memory `feedback_build_loop_rollback_non_destructive`). Never `reset --hard`, never `clean -fd`.
- **Resume from disk:** `advance` computes the position from receipts and state; a relaunch with the same args needs nothing else. Workflow `resumeFromRunId` with identical `scriptPath` and args is an optimisation that replays accepted agents (S §7.1.4).
- **Resume across executors:** a task with no receipt re-runs under whatever the bindings resolve **now**. A partial Codex task whose role is now bound to Claude is archived to `<task>/abandoned-codex-<n>/` and restarted from the same `input/`; a partial Codex task still bound to Codex resumes its session (`session.id` in the task folder). A tree left dirty by a partial implement becomes a `wip` commit first, and the new implement task is told "a partial implementation of this plan is at wip commit `<sha>`; complete the plan".

### 7.8 Discovered work (Q30)

Every model stage's output schema has `discovered[] {kind: requirement | question | hygiene, headline, outcome, why, evidence, blocking}`. `tim stage accept` appends them to `build/discovered.jsonl` with their origin. After each increment, `tim backlog absorb-discovered` writes each requirement or hygiene item as a new **atom** in `backlog.atoms.json` and a same-grain increment in `backlog.json` (status `todo`, or `blocked` with a question), `dependsOn` its origin where it is a follow-on, and sets `combine-due`. Questions go to the ledger. The `DEFERRED:` grep and "describe it in notes" are retired. In-scope work is never deferred: the implement brief keeps the loop's rule "Work that belongs to THIS increment gets DONE" (`:1138-1142`).

### 7.9 Lifecycle profiles and merge policy as data

| Strategy | Ticket | Branch | PR | Merge | Proven by |
|---|---|---|---|---|---|
| `programme` (default, Q24) | none, or one epic reference | one per programme, same name everywhere, synced with base before every increment | one draft per repo | per `lifecycle.merge`, default `never` | FA, 24 stages |
| `per-increment` | one per increment (a combined increment gets one ticket with the union of ACs) | `<prefix>/<KEY>-<slug>` per increment | one per repo per increment | per policy | EUDPA-409, DR1-U (118 built) |
| `local` | none | orchestrator-owned | none | none | plants snagging (`5271d04a`) |

### 7.10 Silent-success paths, all closed

| Path today | Closed by |
|---|---|
| Dead reviewers dropped (`:1250`) | Expected task set in `advance`; missing receipt = failed task |
| Dead judge becomes an empty judgement (`:1350`, `FA:944`) | Hold `judge-failed` |
| Fixer result ignored (`:1373`, `FA:953`) | Per-finding `applied` status required by schema |
| Ladder "green" as an agent's claim | Deterministic `tim build ladder` exit codes |
| Baseline red `continue`s (`:1092`, `:1170`) | Hold and emit a hygiene item |
| Recorder writes to the wrong JSON path (FA `stages.json` header) | No agent writes state |
| `planFile` returned and never persisted (FA §5.2) | Plan accepted by `tim stage accept`, path in state |
| Report refresh failure logged only (`FA:595`) | `reportStale` in state, masthead and handover |
| "Pre-existing" relayed unverified | Baseline is a tool result; the phrase is banned in briefs and refused by `tim stage accept` in `summary` fields |
| Empty agent results indistinguishable from dead ones (165 in the FA run) | Every receipt has required non-empty fields |

### 7.11 The skill's main-session procedure

1. `tim build start` → MODE line. For `RUN` and `RESUME`: print the bindings summary and the next buildable increment in one line each, then **launch before writing any prose** (memory `feedback_never_idle_between_increments`).
2. Launch `build-drain.js` by `scriptPath` with the printed args. Remind once per session to raise **Dynamic workflow size** in `/config` (the agent cannot, `build-orchestrator/SKILL.md:107-109`).
3. While it runs, handle Sam's sentences: executor switches (8.9), "stop after this one" (`tim build stop-after <current>`), rulings (hand to the distiller's RULE mode).
4. When it returns: read the return value **and** `tim build status --json` (never the child's word alone); verify any "environmental" hold reason in the parent shell before relaying (memory `feedback_verify_subagent_failure_claims`).
5. Print `tim build handover` at every stop. Relaunch at once if the stop reason allows it.

### 7.12 Handover

`tim build handover --md` prints, filled in: the workarea; the Workflow `scriptPath` and args object verbatim; the last run id for `resumeFromRunId`; bindings in one line per rule; `N of TOTAL (P%)`; every hold with its release command; owed to a person (merges, approvals, Sonar owed, allow rules, Dynamic workflow size); the report path. `--executor codex` prints the **Codex-orchestrated** variant (Q23): a `/goal` prompt that says "your shell is normal", binds the placeholders to absolute paths, and runs the loop `tim build advance --json` then `tools/codex/run-batch.sh <batchDir>` then `tim stage accept --batch <batchDir>` until a stop reason, which is exactly the machine the Claude workflow drives. It replaces `HANDOVER-CODEX.md`'s hand-written re-description of twelve stages.

---

## 8. Executors

### 8.1 The stage contract

Each model stage has three files under `.claude/workflows/build/`:

- `stages/<stage>.md`: the executor-neutral brief (what to do, what good looks like, what never to do). Content ported from: the loop's implement, review, verify, judge and fix prompts (`:1098-1390`), FA's plan, review and judge prompts (`FA:687-945`), and `codex/{implement,review,fix}.md` (whose "Thin is fine; wrong is not", "always report", "read each file at most once" and whole-change diff rules are kept verbatim).
- `contracts/<stage>.input.schema.json`: what `input/` contains.
- `contracts/<stage>.output.schema.json`: generated from the zod source in `tim/src/build/contracts/`, in the **Codex-strict subset** (every property required, optional means nullable, `additionalProperties: false`; memory `reference_codex_orchestration_pattern`). The same schema validates Claude output in `tim stage accept`, so Claude cannot produce a shape Codex could not.

**Task folder** (both executors):

```
build/runs/inc-007/a1/08-review/code--frontend--src_server_app_origin_controller.js/
  input/increment.json        tim backlog show --view build
  input/plan.md, plan.json    copies pinned by sha
  input/file.diff             from the change manifest
  input/standards.json        tim standards resolve output for this task
  input/upstream.json         paths and shas of upstream outputs this task may read
  prompt.md                   assembled by tim stage prepare (gitignored)
  codex.json                  only when bound to Codex: sandbox, effort, schema path (gitignored)
  output.draft.json           written by the task
  output.json                 written by tim stage accept after validation
  receipt.json                {ok, stage, role, executor, outputSha256, counts, acceptedAt}
  log.txt, session.id         Codex only (gitignored)
```

**prompt.md order** (by `tim stage prepare`): executor profile, stage brief, bindings table (every path in both spellings: `ABS` for Read, Write and Edit and inside Codex; `TILDE` for Claude Bash), the standards manifest, the input list, the output contract. **Everything except the profile section is byte-identical between executors** for the same task; `tim build parity-report` checks this.

**Stage output schemas** (fields; every one required, nullable where marked):

| Stage | Output fields |
|---|---|
| `plan` | `ok`, `refusal{reason, question}?`, `planFile`, `repos[]`, `files[{repo, path, action, why}]`, `reviewFocus[{repo, path, roles[]}]`, `overflowReason?`, `behaviourChanges[]`, `decisions[{id, decision, alternatives, why}]`, `risks[]`, `invariantsToProve[{id, command, expect}]`, `acCoverage[{acId, how, witness}]`, `ladderAdditions[{repo, dir, script, why}]`, `standardsConsulted[]`, `discovered[]`, `summary` |
| `implement` | `ok`, `changedFiles[{repo, path}]`, `planDeviations[{what, why}]`, `selfChecks[{script, exit}]`, `standardsConsulted[]`, `discovered[]`, `summary` |
| `review` (all four roles) | `taskId`, `role`, `target{repo, path}?`, `completed`, `notReached[]`, `findings[{id, repo, path, line?, severity: critical\|major\|minor, category, rule?, bestPractice?, what, why, fix, confidence: certain\|probable\|speculative}]`, `invariantProofs[{id, exit, matched}]?` (consistency), `acVerdicts[{acId, verdict: met\|not-met\|unprovable, evidence}]?` (acceptance), `standardsConsulted[]`, `discovered[]`, `summary` |
| `verify` | `verdicts[{findingId, verdict: confirmed\|refuted, why}]`, `summary` |
| `judge` | `rulings[{findingId, ruling: fix-now\|defer\|reject, why, instruction?}]`, `deferQuestions[question records]`, `summary` |
| `fix`, `ladder-repair`, `ci-fix`, `e2e-repair` | `applied[{itemId, status: applied\|not-applied, why}]`, `changedFiles[]`, `newRepos[]?` (ci-fix), `frameworkExceptions[{assertion, evidence}]?` (ladder-repair), `discovered[]`, `summary` |

The review output keeps `confidence` and `summary` (the relay's lossy fold, `:697-698`, is gone because there is no relay).

### 8.2 The two adapters

**Claude adapter** (a task of kind `claude`):

```
${GUARDRAILS}
You are the ${role} for increment ${id} (${stage}). Read ${taskAbs}/prompt.md with the Read tool and follow it in full.
When finished, write your result to ${taskAbs}/output.draft.json with the Write tool, then run one Bash call:
tim stage accept ${taskTilde} --json
Return the receipt it prints as your structured output. If it rejects your output, correct output.draft.json
and run it again, at most three times. Never write output.json or receipt.json yourself.
```

Model and effort come from `executors.json` for the role. `agentType` is not used (general-purpose, anti-pattern A9).

**Codex adapter** (all tasks of kind `codex` in a step, one Haiku watcher):

```
${GUARDRAILS}
You are the CODEX SHELL for stage ${stage} of increment ${id}. Codex does the work; you run it and report transport only.
1. FOREGROUND Bash, timeout 600000: ~/git/defra/trade-imports-workspace/tools/codex/run-batch.sh ${batchTilde}
   Exit 3 means some tasks are still running: call the same command again. Repeat until the exit code is not 3, at most 12 calls.
   Never use run_in_background. Never sleep. Never run codex, pkill or kill yourself.
2. One Bash call: tim stage accept --batch ${batchTilde} --json
3. Return the batch receipt it prints. Do not read or judge what Codex wrote.
```

**`tools/codex/run-stage.sh <taskDir>`** (the slice logic moved from prompt prose into a committed, tested script):

- Reads `codex.json` (written by `tim stage prepare`): working directory, sandbox (`read-only` for review, verify and judge tasks; `workspace-write` for plan, implement, fix and repairs), reasoning effort, optional model, schema path, network flag.
- Idempotent: if `output.draft.json` is valid JSON and `status` is `done`, exits 0.
- Starts `codex exec -C <abs workspace> --skip-git-repo-check -s <sandbox> [-c sandbox_workspace_write.network_access=true] -c model_reasoning_effort=<effort> --output-schema <schema> -o <taskDir>/output.draft.json "Read <taskDir>/prompt.md and follow it in full." > log.txt 2>&1` as a child of the script, or `… resume <session.id> "Continue where you left off and finish the task. Write your final result."` when `session.id` exists (every flag before `resume`, `:768`).
- Polls the child until it exits or the slice deadline (540 seconds) passes. Polling inside a committed script is not an agent sleeping.
- At the deadline: kills the child, records `session.id` from the log's `session id:` line, increments `slices`, exits **3**.
- On exit: records the exit code; valid draft → exit **0**; otherwise exit **1** with the log tail printed.
- After 5 slices with no result: exit **4**. Bad input: exit **2**.

**`tools/codex/run-batch.sh <batchDir> [--parallel N]`** runs `run-stage.sh` logic for every task in `batch.json` concurrently (default `N` from `executors.json`, 4), each with its own slice clock, and exits 0 (all done), 3 (some still running), 1 (some failed, listed; the rest done). `batch.status.json` holds per-task states so the next call resumes each exactly where it stopped.

These scripts end the three rail defects of today's Codex shell: the `pkill … ; grep` compound (`:762`), the unallowlisted `pkill`, and the resume procedure living in model-read prose.

### 8.3 Executor profiles

`.claude/workflows/build/executors/claude.md` (prepended to every Claude-bound `prompt.md`):

- The GUARD RAILS in your spawn prompt apply to every command.
- Path-scoped rules load when you **Read** a matching file; they are pointers. Follow every pointer, and read the named best-practice files before editing or reviewing. Before you **create or edit** a file of a type you have not read in this task, Read one existing sibling of that type first so its rule loads (rules-probe conclusions 2 and 3). The standards manifest lists the same files; read each once.
- Do not invoke the `review` or `code-style` skills; their fan-out needs the Agent tool, which workflow agents do not have (rules-probe conclusion 5). Follow their persona files' Method sections, as the manifest says.
- Use Bash `grep -rn` and `find`, never the Grep or Glob tools. Tests go to a log file, read once.
- Your output goes through `tim stage accept`.

`.claude/workflows/build/executors/codex.md` (prepended to every Codex-bound `prompt.md`):

- **Your shell is normal.** Any "GUARD RAILS" text you meet in personas, skills or docs is for Claude agents: ignore it. Compound commands, pipes, `cd` and absolute paths are fine (`codex/implement.md:8-12`).
- **You receive nothing automatically.** No `CLAUDE.md`, no `.claude/rules`, no hooks, no skills. Everything that applies to you is in the standards manifest. Read every MUST file in full, once, before you start; read SHOULD files when the change touches their subject. Read each document at most once.
- **Rules the hooks enforce for Claude, which you enforce yourself:** never read `.env*`, `credentials*`, `secrets*`, `.ssh`, `.aws`, `.npmrc`, `.netrc`; never write a credential-shaped value into any file; never commit, push, force-push or amend (the workflow lands); never edit `backlog.json`, `backlog.atoms.json`, `decisions.json` or anything under `build/` except your own task folder; never edit `.claude/settings*.json` or `.claude/hooks/**`; never touch `docker/stack/.staged/`; never run `sonar`; never install global packages; never write to CDP platform repositories.
- **Browser suites are not yours to run**: the Codex sandbox cannot start Chromium (`codex/implement.md:123-132`). The workflow runs them and hands you `error-context.md` when a repair is needed.
- **Your final message must satisfy the output schema.** Every key present; `null` where a field does not apply. **Always report, even if you did not finish**: set `completed: false` and list `notReached` (`codex/review.md:119-123`).
- `tim` is at `<timCommand>` (bound per run).

`.claude/workflows/build/executors/executors.json`:

```json
{
  "tiers": {
    "claude": { "think": { "model": "opus", "effort": "high" }, "doer": { "model": "sonnet" }, "watcher": { "model": "haiku", "effort": "low" } },
    "codex":  { "think": { "effort": "high" }, "doer": { "effort": "medium" } }
  },
  "roles": {
    "plan":               { "tier": "think", "sandbox": "workspace-write" },
    "implement":          { "tier": "doer",  "sandbox": "workspace-write" },
    "review.style":       { "tier": "doer",  "sandbox": "read-only" },
    "review.code":        { "tier": "doer",  "sandbox": "read-only" },
    "review.consistency": { "tier": "think", "sandbox": "read-only", "note": "runs invariant proofs; read-only sandbox still allows running commands" },
    "review.acceptance":  { "tier": "think", "sandbox": "read-only" },
    "verify":             { "tier": "doer",  "sandbox": "read-only" },
    "judge":              { "tier": "think", "sandbox": "read-only" },
    "fix":                { "tier": "doer",  "sandbox": "workspace-write" },
    "ladder-repair":      { "tier": "doer",  "sandbox": "workspace-write" },
    "ci-fix":             { "tier": "doer",  "sandbox": "workspace-write", "network": true },
    "e2e-repair":         { "tier": "doer",  "sandbox": "workspace-write" }
  },
  "profiles": {
    "claude": { "*": "claude" },
    "codex":  { "*": "codex", "judge": "codex" },
    "codex-plan-on-claude": { "*": "codex", "plan": "claude" },
    "codex-review-only": { "*": "claude", "review.*": "codex", "verify": "codex" }
  },
  "codexParallel": 4,
  "opusConcurrencyCap": 6
}
```

Profiles and tiers live in the implementor, never in the backlog (R6 "Instructions specific to each executor live in the implementor").

### 8.4 Live resolution of personas, routing and rules: `tim standards resolve`

`tim standards resolve --role <role> --files <repo:path,…> [--repo <key>] --json` returns, for one task:

```jsonc
{
  "must": [
    { "path": ".claude/skills/review/references/FILE_REVIEWER.md", "why": "persona for review.code", "use": "Method sections" },
    { "path": ".claude/skills/review/SKILL.md", "why": "review dimensions and verdict guidelines" },
    { "path": "docs/best-practices/node/code-style.md", "why": "code-style routing: topic node" },
    { "path": ".claude/rules/node.md", "why": "rule glob **/*.js matches src/server/app/origin/controller.js" },
    { "path": "docs/best-practices/node/hapi.md", "why": "pointer in .claude/rules/node.md (Key files)" },
    { "path": "docs/best-practices/house-rules.md", "why": "workspace house rules (pending Sam question 6)" }
  ],
  "should": [ { "path": "docs/best-practices/node/testing/frontend.md", "why": "review routing: detect-tech gds" } ],
  "memory": [ { "path": "CLAUDE.md", "why": "workspace load-bearing rules" }, { "path": "repos/trade-imports-schemas/CLAUDE.md", "why": "nearest CLAUDE.md to a touched file" } ],
  "sources": { "routing": [".claude/skills/code-style/assets/routing.json@<sha>", ".claude/skills/review/assets/routing.json@<sha>"], "rules": [".claude/rules/node.md@<sha>"] }
}
```

How each part is resolved **live**, at the moment the task is prepared:

1. **Personas by role** (R2): a fixed role-to-persona map in `tim/src/standards/personas.js` naming paths only: `review.code` → `review/references/FILE_REVIEWER.md` + `review/SKILL.md`; `review.style` → `code-style/references/STYLE_FILE_REVIEWER.md` + `code-style/SKILL.md`; `review.consistency` → `review/references/CONSISTENCY_REVIEWER.md`; `fix` → `review/references/REVIEW_ITEM_FIXER.md` + `code-style/references/STYLE_IMPLEMENTOR.md`. A test fails if a mapped path does not exist, so a renamed persona breaks CI, not a run.
2. **The skills' own routing, as data** (R2 "any mode or bundle routing the skill defines"): the path-to-topic mapping in `tools/style/file-topics.sh:34-58` and the topic-to-files lists in `tools/style/bake-rules-bundle.sh:37-73` move into `.claude/skills/code-style/assets/routing.json`; the tech detection and best-practice lists in `tools/review/detect-tech.sh:53-265` move into `.claude/skills/review/assets/routing.json` (detectors as data: `fileContains`, `anyFileContains`, `fileExists`). The two bash scripts become thin readers of those files, so the skills behave exactly as before, and tim reads the same files (tim's rail forbids shelling out to `tools/*.sh`). **One routing, owned by each skill, read live by both.**
3. **`.claude/rules` matches** (R3): every `.claude/rules/*.md` in the workspace root and in any nested `.claude/rules/` (for example `tim/.claude/rules/`, whose globs are relative to `tim/`), front matter `paths:` parsed, globs matched against the task's planned and changed files with `picomatch`. Nothing is hardcoded, so a new rule is picked up automatically (rules-probe conclusion 4).
4. **Rule pointers** (rules-probe conclusion 2): each matched rule's body is scanned for backticked `docs/best-practices/…` paths, "Topic dir" and "Key files" lists, expanded to files that exist. `tim standards lint` fails if a rule names a file that does not exist, so a pointer that drifts is caught in CI.
5. **Memory files**: the workspace `CLAUDE.md`, and the nearest `CLAUDE.md` up from each touched file with its `@` imports resolved (the probe saw `tim/CLAUDE.md`'s imports arrive natively). Codex gets these as MUST reading; Claude gets them natively and the manifest marks them "already in your context".
6. **House rules held only in memory**: the loop inlines "HOUSE RULES" drawn from Sam's memory (`:1195-1197`), which Codex never sees. Proposed: promote the durable code-style and testing memories into `docs/best-practices/house-rules.md`, always MUST for implement, review and fix. This needs Sam's agreement (question 6).

**Same granularity for both executors:** `tim build advance` prepares exactly one task per (role, file) for style and code review, one consistency task and one acceptance task, whatever the executor. Each style task's manifest carries only the topics its file routes to (a Playwright spec gets both `playwright` and `node`, `file-topics.sh:49-53`); each code task carries the review routing for its repo plus the rules its file matches. To keep per-file readers from paying the full reading cost N times, `prepare` also bakes the MUST best-practice files for each (repo, topic) into `build/runs/…/standards/<repo>.<topic>.md` with a header naming each source and its sha (skill pattern 3; the same move `bake-rules-bundle.sh` makes). The bundle is rebuilt from the live files for every run, so an update to either skill or any best-practice file is picked up by the next task prepared.

**Persona seam:** `FILE_REVIEWER.md`, `STYLE_FILE_REVIEWER.md`, `CONSISTENCY_REVIEWER.md`, `REVIEW_ITEM_FIXER.md` and `STYLE_IMPLEMENTOR.md` today mix method (what to look for, severity, scope discipline, filtering) with harness (EUDPA workarea paths, `file-review-add-item.sh`, the per-ticket bundle path, `Grep`). Each gains a short section, **"When another workflow runs this persona"**, and marks its harness sections, so a caller can say "apply every Method section; your inputs, diff, standards and output come from the task contract instead of the Harness sections". The review skill's own behaviour is unchanged. Without the seam, a live-read persona tells a workflow agent to write into a ticket workarea that does not exist.

### 8.5 Explicit checks in place of session-level hooks (R4)

| Session-level behaviour | Where it fires today | Explicit replacement, same for both executors |
|---|---|---|
| Each repo's `Stop` hook running `sonar analyze agentic` | Only in a session whose working directory is that repo | Stage 17 `sonar`: SonarCloud PR analysis via `tools/sonar/pr-findings.sh`; BLOCKER or CRITICAL feeds `ci-fix` |
| `sonar-check-pending.sh` on `UserPromptSubmit`/`SessionStart` | Main session only | Same stage 17; the drain's final watcher also runs the script once (it is allowlisted under `scripts/**`) and puts any output in the handover |
| CLAUDE.md rule 3 "run `sonar analyze --staged` before committing" | Nowhere in agents | Stage 13 `secrets` via `tools/sonar/scan-staged-secrets.sh`; unavailable → owed to Sam, printed in the handover, never clean |
| `sonar-record-push.sh` on `git push` (PostToolUse) | Agents' Bash pushes | `tim build` pushes internally, so the hook does not fire; stage 17 queries SonarCloud directly instead of relying on the pending file |
| Sonar Read hook refusing credential-shaped files | Claude Reads only | Distiller scrubs cached sources; Codex profile forbids reading secret paths and writing credential-shaped values; stage 13 scans the staged change |
| `guard-bash.sh`, `guard-edits.sh` | Claude agents' tool calls (they fire in workflow agents, R4) | Kept; every Claude prompt carries GUARD RAILS first. Codex has neither: its profile lists the same prohibitions, and nothing Codex does lands without `tim build land` |

### 8.6 What goes to Codex, and how thin Claude stays

In the `codex` profile, every model role is Codex. What remains on Claude per increment:

| Claude agent | Tier | Count per increment |
|---|---|---|
| `advance` watchers (one per model stage boundary and per CI or ladder slice) | Haiku, low | about 10 to 16 |
| Codex shells (one per model stage, regardless of fan-out width) | Haiku, low | about 7 to 10 |
| Drain watchers (`next`, `after-increment`) | Haiku, low | 2 |

No Sonnet or Opus agent runs in Codex mode unless a role is bound to Claude. Compare today's Codex mode: 18 + n agents with review on one reviewer and Claude running verify, judge, ladder and the CI fixer (B §5.4, C §3).

### 8.7 Per-stage-role binding table

| Role | `claude` profile | `codex` profile | Why this default |
|---|---|---|---|
| plan | Claude Opus, high | Codex, high | Heaviest reader; R6 lists it for Codex |
| implement | Claude Sonnet | Codex, medium | |
| review.style × file | Claude Sonnet | Codex, medium, read-only | Same fan-out |
| review.code × file | Claude Sonnet | Codex, medium, read-only | Same fan-out |
| review.consistency | Claude Opus, high | Codex, high, read-only | |
| review.acceptance | Claude Opus, high | Codex, high, read-only | |
| verify × file | Claude Sonnet | Codex, medium, read-only | |
| judge | Claude Opus, high | Codex, high (Sam question 1) | R6 says "optionally judge" |
| fix, ladder-repair, ci-fix, e2e-repair | Claude Sonnet | Codex, medium | CI fixer moves to Codex for the first time |
| all deterministic stages | tim, via Haiku watcher | tim, via Haiku watcher | Facts, not judgements |
| distiller characterise, author, verify, carryover | Claude Sonnet or Opus | Codex (when bound with `tim distil bind`) | Same reason: Sam's weekly limit |
| distiller reconcile, panel, sweep, combine, critic, report prose | Claude Opus | Claude by default, bindable | Judgement concentrated in one agent; quality bar still to be proven on Codex |

### 8.8 Bindings resolution

`build/bindings.json` holds ordered rules; the last match wins:

```json
{
  "default": "claude",
  "rules": [
    { "ids": { "from": "inc-012", "to": "inc-020" }, "profile": "codex", "by": "sam", "at": "2026-09-18", "said": "delegate inc-012 to inc-020 to Codex" },
    { "ids": { "from": "next" }, "roles": { "plan": "claude" }, "by": "sam", "at": "2026-09-19", "said": "plan on Claude, the rest on Codex" }
  ]
}
```

`from`/`to` are resolved against backlog **order**, not id arithmetic. `from: "next"` is resolved when written to the concrete next buildable id, so a later rule means the same thing tomorrow. `tim build bindings --explain inc-015` prints the resolved role table and which rule set each role.

### 8.9 The one-sentence switching UX

| Sam says | The skill runs | Effect |
|---|---|---|
| "Build inc-012 to inc-020 with Codex" / "delegate inc-012..inc-020 to Codex" | `tim build bind --from inc-012 --to inc-020 --profile codex --said "…"` | Those increments' model stages run on Codex |
| "Codex for the rest" | `tim build bind --from next --profile codex --said "…"` | From the next increment prepared |
| "Switch back to Claude after this one" | `tim build bind --from after-current --profile claude --said "…"` | |
| "Plan on Claude, everything else on Codex" | `tim build bind --from next --profile codex --role plan=claude --said "…"` | |
| "Only reviews on Codex" | `tim build bind --from next --profile codex-review-only --said "…"` | |
| "Finish this increment on Codex" | `tim build bind --ids <current> --profile codex --said "…"` | Stages not yet prepared switch at once; a running Claude task finishes; tasks prepared but not started are re-prepared |
| "I'm out of Claude" | `tim build handover --executor codex` | Prints the Codex-orchestrated prompt; nothing in the backlog changes |

The drain reads bindings at every `advance`, so **no relaunch** is needed; the change applies at the next stage prepared. The backlog is never touched, and `tim build parity-report` can prove it.

### 8.10 The parity proof

Run before this programme is called done (R6), as build increment `inc-012`:

1. **Canary set:** three small increments from a live v2 backlog, one per routing family: a Node or Nunjucks frontend change, a Java backend change, a Playwright test change. The minimum Sam asked for is one; three prove the routing too.
2. **Two builds each**, from the same pinned base, on throwaway branches `chore/NO_JIRA-parity-<slug>-claude` and `-codex` (same name across repos per rule 2), `lifecycle.strategy: local`, `merge: never`, profile `claude` then `codex`. The backlog sha is recorded before and after both.
3. **`tim build parity-report --left <run> --right <run>`** produces JSON and a page comparing:
   - **Prompt parity:** each task's `prompt.md` with the profile section removed must be byte-identical across the two runs.
   - **Granularity:** task counts per role must be equal.
   - **Reading audit:** every MUST standard opened by every task, mined from the Claude agent transcripts (Read tool calls in the workflow's per-agent `.jsonl`) and from Codex `log.txt` (command lines). Reported per task.
   - **Review thoroughness:** findings by severity and category, the verifier's confirm rate, `completed` and `notReached`.
   - **Judge:** ruling distribution, deferred questions.
   - **Fix:** applied rate.
   - **Ladder and CI:** per rung, deterministic results; E2E results.
   - **Acceptance:** AC verdicts from the acceptance reviewer.
   - **Cross-examination:** each run's final diff reviewed again by the **other** executor's review and verify stages; confirmed findings listed.
   - **Claude usage in the Codex run:** agent count by tier (Haiku only expected).
4. **Default pass bar** (Sam question 5): prompts identical outside the profile; task counts identical; every MUST file opened by every task on both sides; ladder and E2E green on both; every AC `met` on both; no confirmed critical or major finding in either final diff under cross-examination; backlog sha unchanged. A failure names the stage and the difference, and becomes a discovered hygiene increment against the Codex profile or a stage brief.

---

## 9. Decisions

### 9.1 Every open question

"To reverse" is the cost in files and commands.

| Q | Decision | Rationale | Reversible? To reverse |
|---|---|---|---|
| Q1 Canonical store | v2 backlog files (`backlog.atoms.json`, `backlog.json`) plus `decisions.json`; OpenSpec linked through `acceptance[].scenario`; journey-spec and OpenSpec are optional projections (`tim distil project openspec\|journey-spec`) | One lint, one gate, one report (S §9.1 lean) | Yes. Add a projection-as-source adapter: 1 module, 1 command |
| Q2 Where it lives | `workareas/shared/<programme>/`, tracked; caches, prompts and logs gitignored | CLAUDE.md rule 3 already exempts `workareas/shared/`; state must survive machines | Yes. Move the folder; tools take `--workarea`, nothing hardcodes it |
| Q3 Schema base | Generalise `tim/src/parity/{ingest,set,io,schema}` into `tim/src/backlog/core`; v2 is a new zod schema; parity v1 stays as a profile | Tested base; parity CI stays green (G2, G5 §6) | Partly. Parity could later move onto v2 through `migrate`; 4 backlogs |
| Q4 Status placement | Six requirement statuses on the row; phases, holds and attempts in `build/state.json`; `done` needs `resolution` | Every reader keys on row status; run state names executors (R5) | Yes. Fold state onto rows: 1 migration command |
| Q5 `gate` split | `needs` (pre-build question) and `checkpoint` (post-build stop); `gate` removed | Two meanings broke builds (C §5.3, G5 §2) | Yes. Re-add a field: schema + derive |
| Q6 `type`/`kind` | `kind` is a requirement kind, `nature` the change type; branch prefix from a table in `tim/src/build/branch.js`; route chosen by the plan | Implementation routes leave the requirement (P3) | Yes. Edit the table |
| Q7 Exemplars | Requirement-grade only as `consistentWith` relations; `exemplars` are non-binding hints the plan may ignore; ACs never cite them | "Shape to match" is legitimate; "copy file X" is not (F K16) | Yes. Schema flag |
| Q8 Size | `size{class, basis}` from requirement proxies; never gates buildability; combined ceiling 12 ACs, 3 areas, 3 repos, 2 end-to-end proofs, set in the contract | File counts are unknowable before the plan (F P13) | Yes. Contract edit |
| Q9 Atoms after combining | Kept as `backlog.atoms.json` in the same v2 format; buildable on its own when no combined backlog exists | Auditable, re-splittable, one format (R1) | Yes. Stop writing it: 1 command flag |
| Q10 Data-model design | Never a distiller phase; a `spike` or `capability` increment whose AC is "the model holds every requirement in set X" and whose outcome is a recorded decision | Model phase leaked classes into ACs (F §4.2) | Yes. Add a phase to the ledger table |
| Q11 Tests and E2E | Part of every increment's definition of done: every `witness: e2e` AC must be covered by the plan and proven by the ladder or local E2E; no separate e2e increments except cross-journey suites | "every add-page needed a tests-repo edit and none carried it" (D §9) | Yes. Combine rule change |
| Q12 Panel | Triggered only by conflicts precedence cannot settle; authority boundary is Sam question 4 | Cost and authority both matter | Yes. Contract data |
| Q13 When combining runs | Pre-build over the complete atom set; again on affected groups after every ruling and after discovered work is absorbed; mid-build only among unstarted items; applied automatically and reported with a one-command opt-out | Memory `feedback_headless_make_calls_dont_gate`; G1 §1.5 | Yes. `--propose-only` flag: 1 option |
| Q14 Cross-repo lockstep | Combine lockstep atoms (same branch name anyway), within the ceiling | Fewer builds, attributable by repo | Yes. Rule 5 in the contract |
| Q15 Source types | Transcript and chat types with `speaker@timestamp`, utterance classes, authority from the contract; Jira through tim's `jira-client` | F P4 | Yes. Type files |
| Q16 Confidence enum | `observed \| stated \| ruled \| legacy \| inferred \| gap` | F §7 plus `ruled` for Sam's rulings (E §7.2) | Yes. Enum edit and migration |
| Q17 Migration | Freeze the 4 parity corpora and 4 trace backlogs as sources; migrate EUDPA-409's unbuilt rows (recipes stripped); DR1-U is Sam question 7; FA frozen | G5 §10 | Yes. Each is one `migrate` run |
| Q18 journey-builder | Retire BUILD, BACKLOG and PLAN modes and DIGEST as a mode; its method moves to the distiller; its spec tools stay read-only until the plants repo spec ledger is imported | One distiller | Partly. Restore from git history: skill folder |
| Q19 Cadence | Drain parent plus per-increment child via `workflow()`; the child alone for supervised cadence | G4 §2.1 | Yes. Launch the child directly |
| Q20 Plan persistence | `build/plans/<id>.md` and `.json`, tracked, committed by `record`; path in state | Survives resume and machines | Yes. `.gitignore` line |
| Q21 Codex reach | Per-stage-role binding table; every model role bindable; Codex review is the same fan-out; CI fixer delegable | R6 | Yes. `executors.json` |
| Q22 Codex permissions | Wrap in `tools/codex/*.sh` (already allowlisted by path); no new allow rules | Agents cannot edit settings (H §7.3) | Yes. Sam adds `Bash(codex exec:*)` by hand |
| Q23 Codex-as-orchestrator | Supported third mode, generated by `tim build handover --executor codex`, driving the same machine | Needed when Claude is fully exhausted | Yes. Stop printing it |
| Q24 Branch strategy | `lifecycle.strategy` in the header; default `programme` (Sam question 3); combined item = one ticket with merged ACs under `per-increment` | Memory `feedback_stack_programme_on_one_branch` | Yes. Header field |
| Q25 Merge default | `never` with draft PRs; `on-green` only with `mergeRuling`; `on-approval` allowed | Memory `feedback_never_auto_merge_wait_for_sam` | Yes. Header field |
| Q26 Red work | Pushed `wip` commit under `programme` and `per-increment`; path-scoped stash under `local` | Both proven; stash respects parallel sessions | Yes. `preserve.js` |
| Q27 Acceptance verification | Separate `review.acceptance` role, independent of the plan; plan invariant proofs stay with consistency | A plan can prove the wrong thing | Yes. Remove the role |
| Q28 Programme knowledge | Repo-owned traps in repo docs listed as `guides[]` in `tools/build/targets.json`; programme traps as header `invariants`; the plan's reading list pulls both through the resolver | Every programme stops paying for others' traps (B §8) | Yes. Data |
| Q29 Optional phases | Sync always under `programme`; local E2E by `lifecycle.localE2e`; workspace-PR E2E only when named; report always (deterministic) | FA's lessons, profile-selected | Yes. Header fields |
| Q30 Discovered work | `discovered[]` in every stage output → `absorb-discovered` → atoms and questions, combine due | One channel instead of three (C §2.6) | Yes. Schema field |
| Q31 Systemic halt | Yes: 3 holds in a row, or 3 of one reason per drain | journey-builder BUILD salvage (C §4) | Yes. Constant in `after-increment` |
| Q32 Renderer | Sibling `tim/src/report/` sharing parity's theme, prose and citations | Parity cards are two-sided (G §3.2) | Yes. Fold into parity render later |
| Q33 One ledger | One `decisions.json` for distillation and build | A judge-deferred question and a distillation question are the same record | Yes. Split by `raisedBy.phase` |
| Q33a Ruling record | As 3.6: who, when, words, note, scope (items or programme), supersedes, `revisitWhen`, sealed evidence, effects; one "awaiting" definition | G5 §8 | Yes. Schema |
| Q34 Ruling capture | Batch ruling emits `tim decisions rule` commands; answer sheet by slug; `outstanding` for tentative; `rule-decision.sh` retired for v2 (kept for frozen corpora) | House direction tim over bash | Yes. Wrapper |
| Q35 Must-answer | Security, access control, data integrity and CDP platform questions block and never take a default | Memory `feedback_question_is_not_a_ruling` | Yes. Category list in contract |
| Q36 Visual evidence | Crops recorded at characterise for image and canvas sources, attached to questions; parity capture only where a running service is a source | Memory `project_eudpa328_decision_visual_evidence` | Yes |
| Q37 Build report | Same renderer; build section; failure recorded as `reportStale` | One surface | Yes |
| Q38 Report verification | `CLAIM_VERIFIER.md` (live, by path) over every prose slot; derived data kept out of the backlog diff | G1 §1.7 | Yes. Drop the phase |
| Q39 Port branch fixes | Yes, first (build `inc-002`); the triage-view branch's loop changes are not merged | Memory `feedback_check_live_branch_before_following_handover` | n/a |
| Q40 Shared rails | `docs/agent-rails/guard-rails.md`, inlined per script, equality enforced by a tim test; Codex rails in the Codex profile | No imports in workflows (G4 §2.2) | Yes |
| Q41 Fix docs | Yes, in this programme (build `inc-020`): `docs/agent-skills.md` Glob advice, skill-creator settings edits and Glob, CLAUDE.md routing table, `.claude/workflows/README.md` | The new skills are audited against them | n/a |

### 9.2 The questions that need Sam

**1. Should the judge run on Codex in Codex mode?**
- In play: the judge decides which confirmed findings get fixed, deferred or rejected. R6 lists it as "optionally" Codex.
- Options: (a) Codex by default in the `codex` profile, Claude Opus only if bound; (b) Claude Opus by default even in Codex mode, costing one Opus agent per increment.
- If nobody answers: (a), and the parity proof compares judge rulings side by side; if Codex's rulings differ materially, the `codex` profile's `judge` flips to Claude with one edit of `executors.json`.

**2. May Codex run with full access to run browser tests when it is the orchestrator?**
- In play: when no Claude is available, nobody can run Chromium (the Codex sandbox refuses it). Full access lifts the sandbox for the whole Codex session.
- Options: (a) allow `danger-full-access` for the Codex orchestrator session only; (b) keep the sandbox and record browser rungs as "owed" until a Claude session or Sam runs them.
- If nobody answers: (b). E2E rungs are marked owed in state and the handover, and those increments stop at `ready`, not `done`.

**3. What is the default delivery for a distilled programme?**
- In play: whether increments from the distiller land on one programme branch with draft PRs, or get a ticket, branch and PR each.
- Options: (a) programme branch, draft PRs, never merge (Sam's 15 September ruling for multi-task work); (b) per-increment with Jira tickets; (c) the distiller asks per programme.
- If nobody answers: (a), stated in the report masthead so it is visible on every programme.

**4. What may the judges panel settle without Sam?**
- In play: EUDPA-409 let the panel settle 83 items; the trace runs sent everything to Sam.
- Options: (a) anything precedence plus standing rulings plus the sources can settle, escalating policy, legal, scope, must-answer categories and any ruling that would change 5 or more increments; (b) the panel only recommends; everything is Sam's.
- If nobody answers: (a); every panel ruling appears in "Calls we made" with the vote count and a "To reverse" line.

**5. What does "just as good" mean for the parity proof?**
- In play: when this programme may say Codex mode is equal quality.
- Options: (a) the bar in 8.10 (identical prompts and granularity, every standard read, green ladders, every AC met, no confirmed critical or major finding under cross-examination); (b) (a) plus finding counts within one of each other per severity; (c) a bar Sam states.
- If nobody answers: (a).

**6. May Sam's durable code-style and testing memories become a tracked `docs/best-practices/house-rules.md`?**
- In play: the loop gives Claude reviewers house rules drawn from Sam's personal memory (`:1195-1197`); Codex never sees memory. A tracked file gives both executors the same rules and makes them visible to teammates.
- Options: (a) promote the code-style and testing memories listed in MEMORY.md "Code style" and "Tests"; (b) keep them in memory and accept the asymmetry; (c) Sam curates the list.
- If nobody answers: (b). The file is not created and the parity report names the asymmetry; build increment `inc-005`'s house-rules part stays blocked.

**7. Should the DR1-U build programme come onto main and continue in the new format?**
- In play: 118 of 161 built on `origin/feat/parity-report-triage-view`; 43 not built; its rulings are hand edits. That branch's loop must not be merged (B §6).
- Options: (a) bring only its data paths onto main and migrate the 43 remaining rows to v2; (b) bring the data onto main as a frozen record only; (c) leave it on the branch.
- If nobody answers: (b). The data is preserved on main and the distiller can use it as a `prior-requirements` source later.

---

## 10. Retire and migrate

### 10.1 Retire

| Asset | Retired how | When |
|---|---|---|
| `.claude/workflows/increment-build-loop.js`, `.claude/workflows/codex/{implement,review,fix}.md`, `codex/schemas/*` | Content ported into stage briefs, the Codex profile and contracts; files removed with `git rm` | After the parity proof (`inc-012`) passes |
| `.claude/skills/build-orchestrator/` | Replaced by `backlog-implementor`; `git rm` | Same |
| `frontend-alignment.js` (branch) and its `stages.json` machinery | Its good parts are ported; the programme's own file frozen as history | After `inc-002` ports its helpers |
| journey-builder BUILD mode, `next-increment.sh`, `commit-increment.sh`, `rollback-increment.sh` (uses `git clean -fd`), `verify-increment.sh`, `MODEL_EXTENDER.md` | `git rm`; SKILL.md stops advertising "the build loop" | `inc-020` |
| journey-builder BACKLOG and PLAN modes, `backlog-generate.sh`, `backlog-plan-increment.sh`, `INCREMENT_PLANNER.md`, the extras side channel | `git rm` | `inc-020` |
| journey-builder DIGEST mode | Method moved into `requirements-distiller` (characterise-first, provenance schemes); spec tools (`spec-*.sh`, `decisions.json` ledger in the plants repo) kept read-only until imported as a source | `inc-020` |
| trace-to-requirements workflows | Frozen as history; their backlogs, `conflicts.json` and SPEC-GATE become sources | No change needed |
| Parity path-locked bash (`next-decision.sh`, `decision-counts.sh`, `rule-decision.sh`, `backlog-counts.sh`) | Kept for the four frozen parity corpora only; not used by v2 | n/a |
| Run copies, patched `FALLBACK`, `.gitignore:97` run-copy line, the 13-field handover | Gone with the loop | `inc-020` |
| `.gitignore` whitelist of `orchestrator-ledger.json`, `logs/batches/` | Removed | `inc-020` |

### 10.2 Migrate

| Backlog | Migration | Result |
|---|---|---|
| EUDPA-409 (high-risk plants) | `tim backlog migrate --from journey-builder`: `detail` and ACs kept, recipe fields dropped, mechanism ACs flagged by the recipe lint for rewrite, `gate` split into `needs`/`checkpoint`, `merged-into` rows become atoms of a combined increment, rulings imported from the plants repo `decisions.json` | A v2 backlog of the 26 unbuilt rows; the 36 built rows imported as `done, resolution: built` with their PRs in state |
| DR1-U | Sam question 7 | |
| plants snagging | `migrate --from journey-builder` (same shape family) | Only if the paused run resumes |
| FA `stages.json` | `migrate --from fa-stages` for any unanswered question stage; the open question becomes a ledger question | Only if the programme resumes |
| Four trace backlogs, four parity corpora | Frozen; used as sources through carryover | |

### 10.3 Routing and docs

- **CLAUDE.md** skill routing index: add `requirements-distiller` and `backlog-implementor` rows; remove `build-orchestrator`; mark `journey-builder` as "spec ledger tools only"; delete the blank line that breaks the `parity` row (`CLAUDE.md:43`).
- `docs/reference/worker-references.md`: add the distiller personas and the build stage briefs.
- `.claude/workflows/build/README.md` and `.claude/workflows/distil/README.md` replace the stale `.claude/workflows/README.md` (B §2).
- `docs/agent-skills.md`: replace Glob advice with Bash `find`/`grep -rn` (H §7.3).
- `skill-creator`: stop appending to `.claude/settings.json`; drop Glob from `allowed-tools` and AUDITOR.
- `docs/reference/tools-index.md` and `tim/README.md`: the new commands.

---

## 11. Build backlog for this programme

Written in the v2 schema. Pass 2 was not run: these were written by hand as atoms, and each was checked against the combine rules (most cross a proof boundary another depends on, so they stay separate; see `distillation.combination.declined`). For a tooling programme, command names are the external contract a skill or a person calls, so acceptance may name them (recorded as a deviation).

```json
{
  "schemaVersion": 2,
  "programme": "requirements-pipeline",
  "title": "One requirements pipeline: distil loose sources into a requirement backlog and build it with Claude or Codex",
  "purpose": "Sam needs requirements gathered from any mix of sources into one backlog of requirements, not recipes, with a report he can rule from, and a builder that reaches the same standard whether Claude or Codex does the heavy work, so the weekly Claude limit no longer lowers quality.",
  "pass": "atoms",
  "target": null,
  "repos": {
    "workspace": {
      "path": ".",
      "github": "DEFRA/trade-imports-workspace",
      "ladder": [{ "dir": "tim", "scripts": ["format:check", "lint", "test"] }],
      "e2e": null,
      "guides": ["tim/CLAUDE.md", "docs/agent-skills.md", "docs/best-practices/skills/patterns.md"]
    }
  },
  "mergeOrder": [],
  "lifecycle": {
    "strategy": "programme",
    "branch": "chore/NO_JIRA-requirements-pipeline",
    "base": "main",
    "merge": "never",
    "mergeRuling": null,
    "draftPrs": true,
    "jira": null,
    "commitScope": "requirements-pipeline",
    "localE2e": "never",
    "workspacePr": null,
    "ciFixAttempts": 2,
    "review": { "cap": 16, "overflow": "allow-with-reason" }
  },
  "invariants": [
    { "id": "inv-no-recipe-in-backlog", "text": "No backlog row names files, commands, line numbers or test names.", "source": "src-sam-requirements#R1" },
    { "id": "inv-executor-neutral-backlog", "text": "Nothing in a backlog is specific to one executor.", "source": "src-sam-requirements#R5" },
    { "id": "inv-live-standards", "text": "Review personas, routing and rules are referenced by path at run time, never copied.", "source": "src-sam-requirements#R2" },
    { "id": "inv-state-by-writer", "text": "Only tim commands write canonical state.", "source": "src-synthesis#8.4" },
    { "id": "inv-parity-ci-green", "text": "The tim parity test suite, including the contract test over the tracked EUDPA-328 backlog, stays green.", "source": "src-gap-5#6" },
    { "id": "inv-rails", "text": "Every agent prompt starts with the canonical GUARD RAILS; no command needs a new allow rule.", "source": "src-sam-requirements#R4" }
  ],
  "direction": "When two designs meet a requirement equally, pick the one that keeps a fact in a file a tool checks rather than in a prompt an agent reads.",
  "scopeExclusions": [
    { "id": "sx-cdp-platform", "text": "No change to CDP platform repositories", "why": "Memory rule: no AI writes to CDP platform repos", "decision": null }
  ],
  "deviations": [
    { "id": "dv-cli-names-in-acceptance", "text": "Acceptance criteria may name tim commands and tools scripts", "reason": "For tooling, the command is the external interface skills and people call", "decision": null }
  ],
  "assumptions": [
    { "id": "as-judge-on-codex", "text": "In Codex mode the judge runs on Codex", "default": "Codex", "confidence": "inferred", "reviseIf": "Sam rules otherwise (q-judge-binding)", "question": "q-judge-binding" },
    { "id": "as-default-lifecycle", "text": "Distilled programmes default to a programme branch, draft PRs and no merge", "default": "programme", "confidence": "ruled", "reviseIf": "Sam rules otherwise (q-default-lifecycle)", "question": "q-default-lifecycle" },
    { "id": "as-parity-bar", "text": "The parity pass bar is the one in the design section 8.10", "default": "design bar", "confidence": "inferred", "reviseIf": "Sam rules otherwise (q-parity-bar)", "question": "q-parity-bar" }
  ],
  "milestones": [
    { "id": "m0", "name": "Proven base", "goal": "Runtime facts proven and unmerged fixes on main", "checkpoint": "none" },
    { "id": "m1", "name": "State you can trust", "goal": "One validated writer and one ledger", "checkpoint": "none" },
    { "id": "m2", "name": "Claude builds a v2 backlog", "goal": "One real increment built end to end by the new machine on Claude", "checkpoint": "walkthrough" },
    { "id": "m3", "name": "Codex is equal", "goal": "Parity proof passed", "checkpoint": "walkthrough" },
    { "id": "m4", "name": "Distiller", "goal": "A real multi-source distillation with a report Sam rules from", "checkpoint": "walkthrough" },
    { "id": "m5", "name": "One pipeline", "goal": "Old assets retired, docs and routing fixed, end-to-end proof", "checkpoint": "walkthrough" }
  ],
  "sources": [
    { "id": "src-sam-requirements", "type": "document", "role": "requirement", "tier": 1, "ref": "workareas/shared/requirements-pipeline/analysis/sam-requirements.md", "version": "2026-09-18", "readAt": null, "seal": null, "characterisation": null },
    { "id": "src-rules-probe", "type": "document", "role": "constraint", "tier": 1, "ref": "workareas/shared/requirements-pipeline/analysis/rules-probe.md", "version": "2026-09-18", "readAt": null, "seal": null, "characterisation": null },
    { "id": "src-synthesis", "type": "document", "role": "requirement", "tier": 2, "ref": "workareas/shared/requirements-pipeline/analysis/00-synthesis.md", "version": "2026-09-18", "readAt": null, "seal": null, "characterisation": null },
    { "id": "src-gap-2", "type": "document", "role": "constraint", "tier": 2, "ref": "workareas/shared/requirements-pipeline/analysis/gap-2.md", "version": "2026-09-18", "readAt": null, "seal": null, "characterisation": null },
    { "id": "src-gap-4", "type": "document", "role": "constraint", "tier": 2, "ref": "workareas/shared/requirements-pipeline/analysis/gap-4.md", "version": "2026-09-18", "readAt": null, "seal": null, "characterisation": null },
    { "id": "src-gap-5", "type": "document", "role": "constraint", "tier": 2, "ref": "workareas/shared/requirements-pipeline/analysis/gap-5.md", "version": "2026-09-18", "readAt": null, "seal": null, "characterisation": null }
  ],
  "precedence": [{ "factKind": "scope", "order": ["src-sam-requirements", "src-synthesis"] }],
  "ledger": { "path": "decisions.json", "sha256": null },
  "distillation": {
    "generatedFrom": { "atomsSha": null, "ledgerSha": null, "contractSha": null },
    "combination": {
      "rules": ["never across a milestone", "never across a proof another increment depends on", "attributable failures"],
      "applied": [],
      "declined": [
        { "members": ["inc-003", "inc-004"], "why": "The ledger builds on the writer's lock and CAS; a red in the writer would be blamed on the ledger" },
        { "members": ["inc-007", "inc-008"], "why": "The Codex tools are proven on their own before the state machine depends on them" },
        { "members": ["inc-014", "inc-015"], "why": "The control plane's strict checks gate the first real distillation" }
      ]
    }
  },
  "increments": [
    {
      "id": "inc-001", "key": "runtime-facts-proven", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "The runtime facts this design rests on are proven and recorded",
      "kind": "spike", "nature": "new",
      "outcome": "Sam and every later increment know, from a recorded experiment on the current Claude Code version, how Workflow args arrive, whether a child workflow is re-read per call, whether a zero-agent child may return data, how Codex behaves when a slice is killed and resumed, and whether the staged secrets scan can run from an agent through a committed script.",
      "why": "The drain parent, the Codex slicing and the explicit Sonar step each rest on a fact that is inferred, not documented. Building on an unproven fact is how the args folklore cost a wrong build.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "A recorded result shows the type the script receives for object args, string args and no args, against the Claude Code version.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-gap-4", "ref": "§5 (a) (b)" }] },
        { "id": "ac-2", "statement": "A recorded result shows whether a child workflow edited between two calls in one run runs the new text on the second call, and whether a child with no agents may return data.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-gap-4", "ref": "§5 (c) (d)" }] },
        { "id": "ac-3", "statement": "A recorded result shows a Codex run killed at a slice boundary and resumed by session id finishing with a valid result, and a detached grandchild process surviving the end of the Bash call that started it.", "witness": "manual", "confidence": "inferred", "evidence": [{ "source": "src-synthesis", "ref": "§7.3" }] },
        { "id": "ac-4", "statement": "A recorded result says whether the staged secrets scan runs from a workflow agent through a committed script without a permission prompt, and what it reports on a planted fake secret.", "witness": "manual", "confidence": "inferred", "evidence": [{ "source": "src-sam-requirements", "ref": "R4" }] }
      ],
      "constraints": [{ "ref": "inv-rails" }],
      "outOfScope": ["Building any of the tooling the canaries point at"],
      "surfaces": { "areas": ["workflow-runtime", "codex", "sonar"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [{ "ref": "workareas/shared/requirements-pipeline/analysis/rules-probe.md", "why": "the shape of a recorded probe", "binding": false }],
      "dependsOn": [], "sequence": null, "milestone": "m0", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-gap-4", "ref": "§5" }, { "source": "src-synthesis", "ref": "§7.1.3, §7.1.7" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "S", "basis": "4 recorded experiments, no product code" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-002", "key": "unmerged-fixes-on-main", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "The fixes proven on unmerged branches are on main",
      "kind": "hygiene", "nature": "fix",
      "outcome": "The PR draft helper, the exit-coded CI watcher, the clone mode of the npm helper, the local-lifecycle fix and the commit trailer setting are on main, and the DR1-U data is preserved on main, without any of the triage-view branch's loop changes.",
      "why": "The new implementor builds on these; building on main while they sit on branches repeats the drift the handover memory warns about.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "On main, the PR draft helper and the CI watcher exist, are executable, and report the documented exit codes for merged, closed, unresolved and no-checks cases.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.2 #24" }] },
        { "id": "ac-2", "statement": "The current build loop on main no longer refuses a local-lifecycle run for being on the base branch, and takes its commit trailer from configuration.", "witness": "review", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§2.2 (7)" }] },
        { "id": "ac-3", "statement": "The DR1-U backlog and its notes are on main, byte-identical to the branch head 6688fd8e, and main's build loop is unchanged by the port.", "witness": "review", "confidence": "stated", "evidence": [{ "source": "src-gap-5", "ref": "§10" }] }
      ],
      "constraints": [{ "text": "Never merge the triage-view branch's loop or brief changes." }],
      "outOfScope": ["Migrating DR1-U to v2 (Sam question 7)"],
      "surfaces": { "areas": ["tools", "build-loop"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": [], "sequence": null, "milestone": "m0", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "§8.11, Q39" }, { "source": "src-gap-5", "ref": "§10" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "M", "basis": "3 ACs, cherry-picks from 3 branches" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-003", "key": "backlog-v2-writer", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "One validating writer owns every v2 backlog write",
      "kind": "capability", "nature": "new",
      "outcome": "Skills and workflows create, ingest, validate and change v2 backlogs only through tim backlog commands, which keep ids stable, resolve references by key, refuse cycles and recipe fields, and never lose an update to a concurrent writer.",
      "why": "Agents hand-editing JSON corrupted state in both living workflows. The parity writer already solves identity and ruling protection but is parity-shaped and has no lock.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "Two concurrent status changes to different increments of one backlog both survive; a change made with a stale sha token is refused with exit 5 and both shas.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-gap-2", "ref": "§3.8" }] },
        { "id": "ac-2", "statement": "Repeating a write with the same operation id changes nothing and prints the original result.", "witness": "unit", "confidence": "inferred", "evidence": [{ "source": "src-synthesis", "ref": "§7.1.4" }] },
        { "id": "ac-3", "statement": "Ingesting atom and combined files gives every new item the next id, keeps every existing id, resolves dependsOn and members by key, and refuses a dangling reference, a self reference or a cycle, naming the keys involved.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-gap-2", "ref": "§1.2, §1.3, §3.6" }] },
        { "id": "ac-4", "statement": "Validation refuses any recipe or executor field listed in the v2 schema's refused set, naming the field and the increment.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R1, R5" }] },
        { "id": "ac-5", "statement": "The tim parity test suite passes unchanged.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-gap-5", "ref": "§6" }] }
      ],
      "constraints": [{ "ref": "inv-parity-ci-green" }, { "ref": "inv-state-by-writer" }],
      "outOfScope": ["Build state commands", "Migrating existing backlogs"],
      "surfaces": { "areas": ["tim-backlog"], "repos": ["workspace"] },
      "consistentWith": [{ "ref": "src-gap-2:tim parity ingest", "relation": "variant-of", "divergence": "Profile-driven vocabulary, lock, CAS, op ids, graph checks" }],
      "exemplars": [{ "ref": "tim/src/parity/ingest.js", "why": "identity and refusal behaviour to keep", "binding": false }],
      "dependsOn": ["inc-001"], "sequence": null, "milestone": "m1", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-gap-2", "ref": "§4" }, { "source": "src-synthesis", "ref": "§7.5, Q3" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "L", "basis": "5 ACs, 1 new module generalised from 4" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-004", "key": "one-decisions-ledger", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Every question and ruling lives in one ledger that updates the backlog",
      "kind": "capability", "nature": "new",
      "outcome": "A question raised by the distiller or by the build judge is one record with a slug; Sam's ruling is recorded with his words, who, when and why; applying it changes every row it affects and says what it changed.",
      "why": "Three ruling mechanisms, three id schemes and prose-numbered questions caused misread answers and hand-edited rulings.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "A ruling without words, a person, a date or a note is refused.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.3 #7" }] },
        { "id": "ac-2", "statement": "A tentative answer is stored as outstanding and never unblocks anything.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "Q34" }] },
        { "id": "ac-3", "statement": "Applying a ruling moves each increment it unblocks from blocked to todo, copies the ruling onto each affected row, and records every change on the decision.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.3" }] },
        { "id": "ac-4", "statement": "Exactly one command answers 'what is awaiting a ruling', and it agrees with the report.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-gap-5", "ref": "§2" }] },
        { "id": "ac-5", "statement": "The answer sheet lists every open question by slug and headline in a form Sam can reply to line by line.", "witness": "unit", "confidence": "inferred", "evidence": [{ "source": "src-synthesis", "ref": "Q34" }] }
      ],
      "constraints": [{ "ref": "inv-state-by-writer" }],
      "outOfScope": ["Rendering the report"],
      "surfaces": { "areas": ["tim-decisions"], "repos": ["workspace"] },
      "consistentWith": [{ "ref": "journey-builder:spec-add-decision", "relation": "variant-of", "divergence": "Questions and rulings in one ledger; caller-supplied dates kept" }],
      "exemplars": [],
      "dependsOn": ["inc-003"], "sequence": null, "milestone": "m1", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "Q33, Q33a, Q34" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "M", "basis": "5 ACs, 1 module" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-005", "key": "standards-resolved-live", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Any agent can be told exactly which standards apply to the files it touches",
      "kind": "capability", "nature": "new",
      "outcome": "For a role and a set of files, one command lists the review and code-style personas, the best-practice files the skills' own routing selects, the path-scoped rules whose globs match, the files those rules point to, and the memory files that apply, all resolved from the files as they are now.",
      "why": "Codex never loads rules, and Claude only gets pointers; without a live resolver the two executors review to different standards.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "Adding a new rule file with a paths glob changes the result for a matching file with no code change.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-rules-probe", "ref": "conclusion 4" }] },
        { "id": "ac-2", "statement": "The code-style and review skills behave exactly as before, and both they and the resolver read their routing from the skills' own data files.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R2" }] },
        { "id": "ac-3", "statement": "A rule inside a sub-project applies only to files under that sub-project.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-rules-probe", "ref": "table row 1" }] },
        { "id": "ac-4", "statement": "A rule that names a best-practice file that does not exist fails the standards lint.", "witness": "unit", "confidence": "inferred", "evidence": [{ "source": "src-rules-probe", "ref": "conclusion 2" }] },
        { "id": "ac-5", "statement": "Each reviewer persona states which of its sections are method and which are replaced when another workflow runs it, and the review skill's own reviews are unchanged.", "witness": "review", "confidence": "inferred", "evidence": [{ "source": "src-sam-requirements", "ref": "R2" }] }
      ],
      "constraints": [{ "ref": "inv-live-standards" }],
      "outOfScope": ["Promoting memory house rules into a tracked file (inc-006)"],
      "surfaces": { "areas": ["tim-standards", "review-skill", "code-style-skill"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-001"], "sequence": null, "milestone": "m2", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-rules-probe", "ref": "conclusions 2 to 5" }, { "source": "src-sam-requirements", "ref": "R2, R3" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "M", "basis": "5 ACs, 1 module, 2 skills' data files" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-006", "key": "house-rules-tracked", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Sam's durable code-style and testing rules reach every executor",
      "kind": "content", "nature": "change",
      "outcome": "The house rules Claude reviewers get from Sam's memory are in a tracked best-practice file that both executors read.",
      "why": "Codex never sees memory, so today it reviews without rules Claude applies.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "Every implement, review and fix task's standards list includes the house rules file, for both executors.", "witness": "unit", "confidence": "inferred", "evidence": [{ "source": "src-synthesis", "ref": "§6.4 programme specifics" }] }
      ],
      "constraints": [],
      "outOfScope": ["Changing the memory files themselves"],
      "surfaces": { "areas": ["best-practices"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-005"], "sequence": null, "milestone": "m2",
      "needs": {
        "id": "q-house-rules-tracked",
        "headline": "May Sam's code-style and testing memories become a tracked house rules file?",
        "question": "Should the durable code-style and testing rules in Sam's memory be copied into a tracked best-practice file that both executors read?",
        "category": "scope", "mustAnswer": false, "blocking": true, "audience": "sam",
        "inPlay": "Whether personal memory becomes shared, visible guidance",
        "options": [
          { "id": "a", "label": "Promote the Code style and Tests memories", "supportedBy": [{ "source": "src-sam-requirements", "ref": "R6" }], "consequence": "Both executors review to the same house rules" },
          { "id": "b", "label": "Keep them in memory", "supportedBy": [], "consequence": "The parity report names the asymmetry" },
          { "id": "c", "label": "Sam curates the list", "supportedBy": [], "consequence": "Waits for Sam's list" }
        ],
        "recommended": "a", "recommendedBy": "distiller",
        "ifUnanswered": { "option": "b", "consequence": "Stays blocked; nothing is copied without Sam's say-so" },
        "blocks": ["inc-006"], "buildableMeanwhile": "Everything else", "status": "open"
      },
      "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-sam-requirements", "ref": "R6" }], "confidence": "inferred", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "S", "basis": "1 AC, 1 file" },
      "status": "blocked", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-007", "key": "codex-run-tools", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Codex tasks run to completion from a watcher with no prompts and no silent failures",
      "kind": "capability", "nature": "new",
      "outcome": "A watcher agent can run any number of prepared Codex tasks concurrently, in resumable slices, and always learns from an exit code whether they finished, are still running or failed.",
      "why": "Today the slice and resume procedure lives in prompt prose, uses a compound command and an unallowlisted kill, and runs one task at a time.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "A task that outlives one slice ends the call with exit 3, and the next call resumes the same session and finishes with exit 0 and a valid result.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§7.3" }] },
        { "id": "ac-2", "statement": "Four tasks run concurrently; one failing reports exit 1 naming it while the other three finish.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R6" }] },
        { "id": "ac-3", "statement": "A finished task run again changes nothing and exits 0.", "witness": "integration", "confidence": "inferred", "evidence": [{ "source": "src-synthesis", "ref": "§7.1.4" }] },
        { "id": "ac-4", "statement": "No command a watcher runs needs a permission prompt.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R4" }] }
      ],
      "constraints": [{ "ref": "inv-rails" }],
      "outOfScope": ["The stage machine that prepares tasks"],
      "surfaces": { "areas": ["codex-tools"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-001"], "sequence": null, "milestone": "m2", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "§7.3, Q22" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "M", "basis": "4 ACs, 2 scripts with a fake-codex test harness" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-008", "key": "stage-contract", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Every stage has one input and output contract that both executors meet",
      "kind": "capability", "nature": "new",
      "outcome": "Any stage task can be prepared as a folder with its inputs, prompt and output schema, and accepted only when its output matches the schema, whichever executor ran it.",
      "why": "One contract with two adapters is the fix R6 names for Codex doing a different review.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "For the same task, the prompts prepared for Claude and for Codex are identical except for the executor profile section.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R6" }] },
        { "id": "ac-2", "statement": "Output missing a required field is refused with the field named; accepted output produces a receipt with its sha.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§7.3" }] },
        { "id": "ac-3", "statement": "The published JSON Schemas are accepted by Codex's output-schema option, with every property required.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§7.3" }] },
        { "id": "ac-4", "statement": "Every workflow script's guard rails text equals the canonical rails document, checked in tim's tests.", "witness": "unit", "confidence": "inferred", "evidence": [{ "source": "src-synthesis", "ref": "Q40" }] }
      ],
      "constraints": [{ "ref": "inv-executor-neutral-backlog" }, { "ref": "inv-live-standards" }],
      "outOfScope": ["Stage sequencing"],
      "surfaces": { "areas": ["tim-stage", "workflow-briefs"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-005", "inc-003"], "sequence": null, "milestone": "m2", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-sam-requirements", "ref": "R6" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "L", "basis": "4 ACs, contracts for 11 stages, 2 profiles" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-009", "key": "build-state-machine", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "The next build step is always decided from files, never from an agent's word",
      "kind": "capability", "nature": "new",
      "outcome": "One command, run by anyone, advances an increment's build: it accepts finished tasks, runs every deterministic stage itself, holds the increment with a named reason on any failure, and says exactly which tasks to run next.",
      "why": "The loop and FA embed stage order, skip rules and failure handling in scripts that cannot be tested and that silently continue past dead agents.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "A review stage with one missing receipt holds the increment with the reason stage-failed after one retry; it never proceeds with fewer reviews.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.4 silent-success" }] },
        { "id": "ac-2", "statement": "Deleting the workflow mid-increment and running the command again resumes at the first stage without an accepted receipt.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§7.5" }] },
        { "id": "ac-3", "statement": "Ladder results come from the ladder scripts' exit codes; a red baseline creates a hygiene increment and holds this one.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.2 #16" }] },
        { "id": "ac-4", "statement": "Changing the executor binding for a role between two stages changes who runs the next stage with no backlog change.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R5, R6" }] },
        { "id": "ac-5", "statement": "Each hold names its reason and the one command that releases it.", "witness": "unit", "confidence": "inferred", "evidence": [{ "source": "src-synthesis", "ref": "§6.2 #18" }] }
      ],
      "constraints": [{ "ref": "inv-state-by-writer" }],
      "outOfScope": ["PR, CI and merge stages (inc-010)"],
      "surfaces": { "areas": ["tim-build"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-008", "inc-004"], "sequence": null, "milestone": "m2", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "§7.5, §8.8" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "L", "basis": "5 ACs, stages 0 to 14" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-010", "key": "delivery-lifecycle", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Built increments reach draft PRs, CI and merge exactly as the programme's policy says",
      "kind": "capability", "nature": "new",
      "outcome": "After landing, the build raises or reuses PRs, watches CI and SonarCloud, fixes within the attempts allowed, waits for approval or merges only as the header's policy says, and parks platform-blocked reds and carries on.",
      "why": "The loop's lifecycle is mature but lives in prompts with raw gh calls and sleeps; merge policy lived in run copies.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "Under merge never, no PR is merged and the increment ends ready with every PR URL recorded.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§7.6" }] },
        { "id": "ac-2", "statement": "Merge on green is refused unless the header names the ruling that allows it.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "Q25" }] },
        { "id": "ac-3", "statement": "Unresolved checks and no checks are never reported as green; a new SonarCloud BLOCKER or CRITICAL finding is treated as red.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R4" }] },
        { "id": "ac-4", "statement": "Merging follows the header's provider-to-consumer order and ends with a sweep that reports any PR left open on the branch.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.2 #7" }] }
      ],
      "constraints": [{ "ref": "inv-rails" }],
      "outOfScope": ["Workspace PR end-to-end watching"],
      "surfaces": { "areas": ["tim-build", "tim-github-client", "tim-jira-client", "sonar-tools"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-009", "inc-002"], "sequence": null, "milestone": "m2", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "§6.2 #6 to #8, §7.6" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "L", "basis": "4 ACs, stages 15 to 23" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-011", "key": "claude-builds-v2-increment", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "The implementor skill builds one real increment end to end on Claude",
      "kind": "capability", "nature": "new",
      "outcome": "Sam can say 'build the backlog' and one real v2 increment is planned just in time, implemented, reviewed per file, judged, fixed, laddered, landed and reported, with a handover printed at the stop.",
      "why": "Nothing should be built on the new machine until it has built something real once.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "A canary increment from a live backlog, migrated to v2, lands on a programme branch with a draft PR and a plan file recorded in state.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.1 #23 canary" }] },
        { "id": "ac-2", "statement": "The review stage ran one style and one code reviewer per content-changed file, one consistency reviewer and one acceptance reviewer, each with a receipt.", "witness": "review", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R6" }] },
        { "id": "ac-3", "statement": "Every agent in the run started with the canonical guard rails and no permission prompt occurred, as Sam confirms.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R4" }] },
        { "id": "ac-4", "statement": "The handover printed at the stop is enough for a fresh session to continue with no other context.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.2 #26" }] }
      ],
      "constraints": [{ "ref": "inv-no-recipe-in-backlog" }],
      "outOfScope": ["Codex mode"],
      "surfaces": { "areas": ["backlog-implementor", "build-workflows"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-010"], "sequence": null, "milestone": "m2", "needs": null, "checkpoint": "halt-after", "rulings": [], "assumptions": [{ "id": "as-default-lifecycle", "text": "Distilled programmes default to a programme branch, draft PRs and no merge", "default": "programme" }],
      "provenance": { "sources": [{ "source": "src-sam-requirements", "ref": "R1" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "M", "basis": "4 ACs, skill plus 2 workflows, 1 canary" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-012", "key": "codex-parity-proven", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Codex builds to the same standard as Claude, proven side by side",
      "kind": "capability", "nature": "new",
      "outcome": "Sam can say 'delegate these to Codex' and the same unmodified backlog builds with the same review granularity, the same standards read and the same results, with Claude doing only watcher work.",
      "why": "Sam hits the weekly Claude limit and today's Codex mode gives worse results.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "Three canary increments (frontend, backend, tests) built once per executor from the same base meet the parity pass bar in the parity report.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R6 parity proof" }] },
        { "id": "ac-2", "statement": "The backlog's sha is the same before and after both builds.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R5 test" }] },
        { "id": "ac-3", "statement": "In the Codex builds, every Claude agent was a low-effort Haiku watcher.", "witness": "review", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R6 heavy work" }] },
        { "id": "ac-4", "statement": "Saying 'Codex for the rest' during a drain changes the executor from the next stage prepared, with no relaunch and no backlog change.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R6 switching" }] }
      ],
      "constraints": [{ "ref": "inv-executor-neutral-backlog" }],
      "outOfScope": ["Codex as orchestrator (inc-013)"],
      "surfaces": { "areas": ["build-workflows", "codex-tools", "tim-build"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-011", "inc-007"], "sequence": null, "milestone": "m3", "needs": null, "checkpoint": "walkthrough", "rulings": [],
      "assumptions": [{ "id": "as-judge-on-codex", "text": "In Codex mode the judge runs on Codex", "default": "Codex" }, { "id": "as-parity-bar", "text": "The parity pass bar is the one in the design section 8.10", "default": "design bar" }],
      "provenance": { "sources": [{ "source": "src-sam-requirements", "ref": "R6" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "L", "basis": "4 ACs, 6 canary builds, parity report" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-013", "key": "codex-orchestrated-mode", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "The build can continue with no Claude at all",
      "kind": "capability", "nature": "new",
      "outcome": "When Claude is exhausted, one command prints a Codex prompt that drives the same build machine, and an increment built that way is indistinguishable in state from one built by the Claude workflow.",
      "why": "The main session is Claude too; when the weekly limit is hit, a Claude-driven Codex mode cannot start.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "One increment is built from the printed Codex prompt with zero Claude agents, and its state, receipts and report entry have the same shape as a Claude-driven build.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§7.3 three modes, Q23" }] },
        { "id": "ac-2", "statement": "Browser rungs are either run or recorded as owed, per Sam's ruling on sandbox access, never skipped silently.", "witness": "review", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§7.3" }] }
      ],
      "constraints": [],
      "outOfScope": [],
      "surfaces": { "areas": ["tim-build-handover"], "repos": ["workspace"] },
      "consistentWith": [{ "ref": "plants-snagging:HANDOVER-CODEX", "relation": "variant-of", "divergence": "Generated from the machine instead of hand-written" }],
      "exemplars": [],
      "dependsOn": ["inc-012"], "sequence": null, "milestone": "m3", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "Q23" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "S", "basis": "2 ACs, 1 command, 1 proof" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-014", "key": "distil-control-plane", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "A distillation cannot move on until its coverage, slicing and yield are proven",
      "kind": "capability", "nature": "new",
      "outcome": "The distiller's phases are recorded with notes and fingerprints, and tools prove that every source unit is owned once, extracted or explained, and that no slice came back thin, before anything is ingested.",
      "why": "Parity has these checks tested; the trace and digest pipelines have none, and half a slice on disk looks like a finished slice.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "Resetting a phase marks every phase that depends on it as not done.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.1 #25 weak points" }] },
        { "id": "ac-2", "statement": "Coverage lists every source unit neither cited by an atom nor explained, and exits non-zero while any remain.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.1 #25" }] },
        { "id": "ac-3", "statement": "The duplicate check compares every pair by default, not only pairs across slices.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.1 #25" }] },
        { "id": "ac-4", "statement": "An atom whose author and verifier are the same is refused at ingest.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.1 #25" }] },
        { "id": "ac-5", "statement": "Heads record repo keys, not absolute paths, and a moved repo fails the strict check.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§7.5" }] }
      ],
      "constraints": [{ "ref": "inv-parity-ci-green" }],
      "outOfScope": ["Personas and the skill"],
      "surfaces": { "areas": ["tim-distil"], "repos": ["workspace"] },
      "consistentWith": [{ "ref": "parity:phase ledger and checks", "relation": "variant-of", "divergence": "Source units instead of screens" }],
      "exemplars": [],
      "dependsOn": ["inc-003"], "sequence": null, "milestone": "m4", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "§6.1 #25, #26" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "L", "basis": "5 ACs, 7 modules generalised" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-015", "key": "distil-pass-one", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Loose sources become a verified set of atomic requirements",
      "kind": "capability", "nature": "new",
      "outcome": "Sam can name a mix of sources in one sentence and get back every requirement as its own verified atom with provenance and confidence, every conflict recorded, and every question in the ledger.",
      "why": "Pass 1 is where requirements quality is won; it needs the union of the three existing pipelines behind one contract.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "A canary distillation over at least one Jira epic, one Confluence page and one image or document source produces an atoms backlog that validates, with coverage and yield clean.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R1" }] },
        { "id": "ac-2", "statement": "No atom's acceptance names a file, command or class, as the recipe lint shows.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R1" }] },
        { "id": "ac-3", "statement": "Every slice author returned what it noticed and did not raise, and every atom carries a verification line from a different agent.", "witness": "review", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.1 #28" }] },
        { "id": "ac-4", "statement": "No more than six Opus agents ran at once during the panel phase.", "witness": "review", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§7.4" }] }
      ],
      "constraints": [{ "ref": "inv-no-recipe-in-backlog" }],
      "outOfScope": ["Combining", "The report"],
      "surfaces": { "areas": ["requirements-distiller", "distil-workflow"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-014", "inc-004", "inc-008"], "sequence": null, "milestone": "m4", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "§8.10, §6.1" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "L", "basis": "4 ACs, skill, 12 personas, 1 workflow, 1 canary" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-016", "key": "distil-pass-two", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Related requirements are combined into fewer builds and recombined after every ruling",
      "kind": "capability", "nature": "new",
      "outcome": "The atoms are grouped into increments one person would build together, with every choice and every pair left alone recorded, and a ruling reshapes only the groups it touches without losing any id or ruling.",
      "why": "Each increment costs a full build pipeline; EUDPA-409's combining was by hand and lost on regeneration.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "The canary's combined backlog has fewer increments than atoms, and every atom is in exactly one increment or explicitly excluded.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R1 two-pass" }] },
        { "id": "ac-2", "statement": "A ruling that drops one atom changes only the increment that held it; every other increment keeps its id and content.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§7.8 (2)" }] },
        { "id": "ac-3", "statement": "An attempt to regroup an increment that has started is refused and becomes a question.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-gap-2", "ref": "§2.2" }] },
        { "id": "ac-4", "statement": "No combined increment crosses an open question, a checkpoint or a milestone, or exceeds the contract's ceiling.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.1 #17" }] }
      ],
      "constraints": [],
      "outOfScope": [],
      "surfaces": { "areas": ["tim-distil-combine", "requirements-distiller"], "repos": ["workspace"] },
      "consistentWith": [{ "ref": "parity:DUPLICATE_SWEEPER", "relation": "variant-of", "divergence": "Groups different work instead of absorbing the same work" }],
      "exemplars": [],
      "dependsOn": ["inc-015"], "sequence": null, "milestone": "m4", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "§7.8, Q13" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "M", "basis": "4 ACs, 1 module, 1 persona" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-017", "key": "distillation-report", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Sam rules from a generated report that leads with what needs him",
      "kind": "capability", "nature": "new",
      "outcome": "Sam opens one page that puts the questions he must answer first, then the calls made that he may reverse, then the backlog, with evidence in reach, and can rule on many questions in one batch without any number being typed by hand.",
      "why": "Report quality is Sam's top priority; the one report he ruled from well worked only once the questions came first.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "Every open question appears in section 1 with headline, what is in play, options with support, and what happens if nobody answers; must-answer questions come first.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.3 #1, #2" }] },
        { "id": "ac-2", "statement": "Every count on the page is derived; the report check fails if any is typed or any question is missing.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.3 #4" }] },
        { "id": "ac-3", "statement": "Selecting rulings and copying the batch gives one ledger command per line, and running them then re-rendering moves each question into rulings applied.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.3 #5" }] },
        { "id": "ac-4", "statement": "Every prose slot has passed the claim verifier, and the result is shown on the page.", "witness": "review", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "Q38" }] },
        { "id": "ac-5", "statement": "Sam rules on the canary's questions from the page and says it is the surface he wants.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R1 quality" }] }
      ],
      "constraints": [],
      "outOfScope": [],
      "surfaces": { "areas": ["tim-report"], "repos": ["workspace"] },
      "consistentWith": [{ "ref": "parity:render", "relation": "variant-of", "divergence": "Requirement-first cards with N sources" }],
      "exemplars": [],
      "dependsOn": ["inc-016"], "sequence": null, "milestone": "m4", "needs": null, "checkpoint": "walkthrough", "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "§6.3, §8.9" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "L", "basis": "5 ACs, renderer, 2 emitters" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-018", "key": "discovered-work-loops-back", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Work found during a build becomes tracked requirements and questions",
      "kind": "capability", "nature": "new",
      "outcome": "Anything a build stage finds but does not do, and anything the judge defers, reaches the backlog or the ledger and the report without a person copying it, and the combine pass sees it.",
      "why": "Three channels with three rules lose work that exists only in prose.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "A discovered requirement from any stage appears as a new todo increment with its origin, and a judge deferral appears as an open question.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "Q30" }] },
        { "id": "ac-2", "statement": "The build section of the report shows progress as N of TOTAL with the percentage, holds with their release commands, and increments added during the build.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "Q37" }] }
      ],
      "constraints": [],
      "outOfScope": [],
      "surfaces": { "areas": ["tim-backlog-absorb", "tim-report"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-017", "inc-011"], "sequence": null, "milestone": "m5", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "Q30, Q37" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "S", "basis": "2 ACs" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-019", "key": "live-backlogs-migrated", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Live backlogs move to the new format without losing a ruling or a built record",
      "kind": "data", "nature": "change",
      "outcome": "The unbuilt work of the high-risk plants programme, and any other programme Sam chooses to continue, can be built by the new implementor, with its rulings and history intact and its recipes gone.",
      "why": "Old backlogs are recipe-shaped and cannot be built by a planner-led workflow without translation.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "The migrated high-risk plants backlog validates, carries every ruling from its ledger, lists its built increments as done with their PRs in state, and fails the recipe lint on nothing.", "witness": "integration", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "Q17" }] },
        { "id": "ac-2", "statement": "The four parity corpora and the tim parity suite are untouched.", "witness": "unit", "confidence": "stated", "evidence": [{ "source": "src-gap-5", "ref": "§9, §10" }] }
      ],
      "constraints": [{ "ref": "inv-parity-ci-green" }],
      "outOfScope": ["DR1-U (Sam question 7)"],
      "surfaces": { "areas": ["tim-backlog-migrate"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-011"], "sequence": null, "milestone": "m5", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "Q17" }, { "source": "src-gap-5", "ref": "§10" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "M", "basis": "2 ACs, 2 adapters" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-020", "key": "old-pipeline-retired", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Only one way to distil and one way to build remain, and every doc points at them",
      "kind": "hygiene", "nature": "removal",
      "outcome": "An agent asked to distil or build finds exactly one skill for each in the routing index, and no skill, workflow or doc advertises a retired path or advice the rails ban.",
      "why": "Four drivers, three distillers and stale docs send agents down retired paths.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "The routing index lists the distiller and the implementor, lists no retired skill as a builder, and renders as one table.", "witness": "review", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "Q41" }] },
        { "id": "ac-2", "statement": "No tracked skill or doc recommends the Glob tool or tells an agent to edit settings.json.", "witness": "review", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.4" }] },
        { "id": "ac-3", "statement": "The retired loop, its Codex briefs, build-orchestrator and journey-builder's build, backlog and plan modes are gone from main, and nothing tracked refers to them.", "witness": "review", "confidence": "stated", "evidence": [{ "source": "src-synthesis", "ref": "§6.4" }] }
      ],
      "constraints": [],
      "outOfScope": ["The parity skill's comparison pipeline"],
      "surfaces": { "areas": ["docs", "skills", "workflows"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-012", "inc-017", "inc-019"], "sequence": null, "milestone": "m5", "needs": null, "checkpoint": null, "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-synthesis", "ref": "§6.4, Q41" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "M", "basis": "3 ACs, removals and doc edits" },
      "status": "todo", "resolution": null, "statusDecision": null
    },
    {
      "id": "inc-021", "key": "end-to-end-proof", "grain": "atomic", "members": [], "combinedInto": null,
      "title": "Loose sources become built software with the executor switched mid-run",
      "kind": "capability", "nature": "new",
      "outcome": "A real multi-source requirement set is distilled, ruled from the report, and built for at least three increments with the executor switched part-way by one sentence and no backlog edit.",
      "why": "R5's test: the same backlog, unmodified, must build under either executor and survive a switch part-way.",
      "statement": null,
      "acceptance": [
        { "id": "ac-1", "statement": "Three increments of a distilled backlog land, the first on Claude and the rest on Codex after one spoken switch, and the backlog's git history shows no edit other than status changes.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R5" }] },
        { "id": "ac-2", "statement": "The report shows the build progress and every ruling Sam gave, in one page.", "witness": "manual", "confidence": "stated", "evidence": [{ "source": "src-sam-requirements", "ref": "R1" }] }
      ],
      "constraints": [{ "ref": "inv-executor-neutral-backlog" }],
      "outOfScope": [],
      "surfaces": { "areas": ["whole-pipeline"], "repos": ["workspace"] },
      "consistentWith": [], "exemplars": [],
      "dependsOn": ["inc-018", "inc-020", "inc-013"], "sequence": null, "milestone": "m5", "needs": null, "checkpoint": "walkthrough", "rulings": [], "assumptions": [],
      "provenance": { "sources": [{ "source": "src-sam-requirements", "ref": "R5, R6" }], "confidence": "stated", "authoredBy": "design/codex", "verifiedBy": null, "carriedFrom": null },
      "size": { "class": "M", "basis": "2 ACs, 1 real programme" },
      "status": "todo", "resolution": null, "statusDecision": null
    }
  ]
}
```

**Build order and why:** `inc-001` (canaries) and `inc-002` (port) first, because everything else rests on them. Then state you can trust (`inc-003`, `inc-004`). Then the parts that make both executors equal (`inc-005`, `inc-007`, `inc-008`), the machine (`inc-009`, `inc-010`), a real Claude build (`inc-011`), and **Codex parity as the first user-visible value** (`inc-012`, `inc-013`), because it removes Sam's weekly pain soonest and proves the stage contract that the distiller also uses. The distiller (`inc-014` to `inc-017`) then builds on a proven writer, ledger and stage contract. Migration and retirement come last, only after their replacements are proven. The first increments are themselves built by the **current** loop on Claude, as requirement-only rows (DR1-U proved requirement rows build, G5 C2); from `inc-011` on, the programme builds itself.

---

## 12. Risks, and what to prove first

| # | Risk | Likelihood and effect | Prove first by | If it fails |
|---|---|---|---|---|
| 1 | A child workflow is cached for the whole run, so a fix to the child needs a parent relaunch | Medium; small effect | `inc-001` canary (d) | Relaunch the drain after a child fix; state-driven resume makes it free |
| 2 | Resume of a parent does not replay a child's agents | Medium; small effect | `inc-001` deliberate kill | Nothing changes: `advance` resumes from receipts anyway |
| 3 | Killing Codex at a slice boundary loses work, or a detached process dies with the Bash call | Medium; high effect for long implement tasks | `inc-001` canary on a real Codex run | Keep today's proven kill-and-resume pattern inside `run-stage.sh` (the script is the parent, so nothing is detached) |
| 4 | Concurrent `codex exec` hits rate limits or contends for the same files | Medium | `inc-007` with 4, then 8 tasks; review sandboxes are read-only | Lower `codexParallel`; the batch tool already resumes each task independently |
| 5 | Codex reviews with the same prompts are still shallower | Medium; this is the whole point | `inc-012` parity proof with cross-examination | The parity report names the stage; fix the brief or the profile; bind that role to Claude until it passes |
| 6 | Live-read personas' harness sections mislead workflow agents (write to an EUDPA workarea, use Grep) | High without the seam | `inc-005` persona seam, then a review task on each executor | Stage briefs override harness sections explicitly as a fallback |
| 7 | Rule pointer parsing misses a file | Medium | `inc-005` lint over all six rules and tim's four; test fixtures | Add a `reads:` list to rule front matter |
| 8 | `sonar analyze --staged` cannot run from an agent even wrapped | Medium | `inc-001` canary | Stage 13 records "owed" and the handover lists it for Sam; SonarCloud PR analysis (stage 17) still runs |
| 9 | Workflow size: one increment in Claude mode is 25 to 50 agents | Certain | Handover reminder; drain `count` | Supervised cadence |
| 10 | Opus limit shared between an Opus workflow and main-session work | Medium | Concurrency cap 6 in `executors.json`, enforced by `advance` | Bind think roles to Codex during heavy distiller phases |
| 11 | Reshaping state breaks tim parity CI | Low with the profile approach | `inc-003` ac-5 | Parity stays on its own schema |
| 12 | The stage machine in tim grows large and hard to change | Medium | Keep stage transitions as a data table with one tested function per stage | Split by stage group; the contract files stay |
| 13 | Many Haiku watcher calls fail or paraphrase receipts | Low | Receipts are printed by `tim` and re-verified by sha on read | `advance` ignores the watcher's words and re-reads receipts from disk |
| 14 | The report still drifts toward history over time | Medium | Section order is code; "Rulings applied" collapses to one line each | Report check fails if section 1 is not first or rulings exceed one line |
| 15 | Two sessions drive one programme | Low | Writer lock and CAS; `advance` refuses a second live drain via a run lock in state | Handover is sequential, as today |

**Prove first, in this order:** the four runtime canaries (`inc-001`), because three core choices rest on them; then one Codex review task and one Claude review task prepared by `tim stage prepare` from the same contract on a real diff, before any other build work, because the equal-quality claim is this design's reason to exist and is the cheapest thing to falsify early.
