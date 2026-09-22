# 00: Synthesis of the requirements pipeline analysis

Synthesiser's cross-asset view, 18 September 2026. This file joins the eight analyses in this folder into one picture for the design panel:

| Key | File | Asset family |
|---|---|---|
| A | `a-frontend-alignment.md` | `frontend-alignment.js` workflow, `stages.json`, plans, report (branch `feat/NO_JIRA-frontend-alignment`) |
| B | `b-increment-build-loop.md` | `increment-build-loop.js` on `main`, the Codex executor, the triage-view branch diff |
| C | `c-build-orchestrator.md` | build-orchestrator skill, journey-builder BUILD mode, every other driver |
| D | `d-journey-builder-digest.md` | journey-builder DIGEST, BACKLOG and PLAN modes, and the EUDPA-409 run |
| E | `e-backlog-corpus.md` | 18 real backlogs, field matrix, byte shares |
| F | `f-requirements-sources.md` | trace-mining, the digest, OpenSpec, ticket skills, Ralph |
| G | `g-reports.md` | every report Sam has ruled from, and what he rewrote |
| H | `h-rails-and-lessons.md` | permissions, hooks, Workflow mechanics, Codex mechanics, memory lessons |
| G1 | `gap-1.md` | parity COMPARE/AUTHOR as a requirements-gathering pipeline: phase ledger, coverage, slices, yield, duplicate sweep, author/verifier split, carryover |
| G2 | `gap-2.md` | `tim parity ingest` / `set.js` / `io.js` / `schema.js` as an existing tested backlog writer |
| G3 | `gap-3.md` | `tim/src/parity/` evidence pinning: run heads, corpus pins, citations read at the pin, anchor classes, seals |
| G4 | `gap-4.md` | Workflow `args` reliability, nested `workflow({scriptPath})`, shared rails, `isolation: 'worktree'` |
| G5 | `gap-5.md` | the DR1-U build run on `origin/feat/parity-report-triage-view`, requirement-only rows, parity path locks, ruling vocabularies |

The G1-G5 gap analyses were written after the first draft of this synthesis, by a critic round. Their corrections are folded in below, and the section "Critic round" at the end lists every change.

Citations below are carried over from the analyses (`file:line` on `main` at `d07af6b9`, or `FA:` for `frontend-alignment.js` on the branch). Where two analysts disagreed, or one found something the others missed, this document says so.

This is analysis, not design. Section 8 records where the analysts **converge**, because a panel can take those as settled. It does not decide the open questions in section 7.

---

## Contents

1. The one-paragraph answer
2. Asset map: the pipeline as it runs today
3. Overlaps and duplication
4. Backlog format drift (field matrix, vocabularies)
5. Recipe or requirement: every recipe, and what the Plan stage must own
6. Keep list and drop/retire list
7. Hard design constraints (and how two-pass distillation fits with no big design up front)
8. Where the analysts converge
9. Open design questions for the panel
10. Critic round: what changed

---

## 1. The one-paragraph answer

The workspace already has every part Sam described. None of them are joined up.

- **Requirement gathering** exists three times, not twice. There is the trace-mining workflow (`trace-requirements/*/trace-to-requirements.workflow.js`, run four times) and the journey-builder digest (extractors, reconciler, panel, decisions ledger, EUDPA-409). They share the ideas that matter: verbatim or gap, provenance on every claim, declared precedence, every conflict recorded, a human gate, born-blocked items (F §0). They share almost none of their field names. The third is parity's COMPARE/AUTHOR pipeline (G1). It is the only one whose completeness and duplicate checks are tested commands: a phase ledger with prerequisites, `tim parity coverage --strict`, `tim parity slices --strict`, `tim parity yield`, `tim parity duplicates`, a verifier record required on ingest, and a carryover pass over the previous corpus.
- **A tested backlog writer already exists**: `tim parity ingest` with `set.js`, `io.js` and `schema.js`, which built the 133-item DR1 backlog. It keeps `inc-NNN` ids stable, resolves slug cross-references, merges without losing rulings, and refuses to strike ruled items (G2). It is parity-shaped, not missing.
- **A second distillation pass that combines related increments** has been done by hand twice on EUDPA-409 (`combination-proposal.md`, then an ad hoc prose merge). It is not a tool, it runs after planning, and a regeneration loses it (C §7, D §3.4).
- **A backlog implementor** exists three times: build-orchestrator plus `increment-build-loop.js` (one increment per Workflow call, Jira to merge, Claude or Codex), journey-builder BUILD mode (superseded but still advertised), and `frontend-alignment.js` (drains its own backlog, just-in-time Opus plan, report refresh, Claude only). The biggest real run of the first is not on main: on `origin/feat/parity-report-triage-view`, build-orchestrator built 118 of 161 increments of the DR1-U union backlog (`workareas/shared/dr1-parity-union/backlog.json`) between 21 August and 16 September, ending at `6688fd8e` "backlog exhausted" (G5). Those rows were requirement-only (no `filesToTouch`, `verification`, `recipe` or `acceptanceCriteria`; `repo` null on 157), and they built.
- **The report** exists in three mechanisms: LLM-edited prose (alignment), a tested `tim` renderer (parity) and hand-written markdown (trace-requirements) (G §10).

The main fault Sam suspected is real, and all eight analysts found its root cause independently. **`increment-build-loop.js` has no Plan stage.** So it treats the backlog row as the plan: its frontend routing rule says to follow the `frontend-change` recipe verbatim, and falls back to "where the increment cites a gap that no recipe covers, the increment's own `filesToTouch` IS the script" (`increment-build-loop.js:1109-1126`, the fallback at `:1117-1119`); the ladder "run[s] the increment's `verification` array IN ORDER" (`:1401`); the consistency reviewer flags any diff that strays from `filesToTouch` (`:1241-1242`). The tooling then produced what the loop consumes. `backlog-plan-increment.sh` writes `filesToTouch`, `verification` and `recipe` into `backlog.json` and still claims "the orchestrator withholds any increment whose sizeGuess is null" (`:9-11`). The build-orchestrator skill contradicts that ("Buildability is status and dependencies. Nothing else", `SKILL.md:131`).

`frontend-alignment.js` shows the right split. Each backlog item is a brief and a ruling. An Opus planner writes `plans/<id>.md` just in time, against the live tree (`FA:687-731`). The implementor executes the plan, not the backlog.

The cost of getting this wrong is measurable. The CHED-PP programme was 45 KB of requirements (71% acceptance criteria). After a planner pass it became 1.39 MB (62% recipe), with 92 of 102 verification rows pointing at a workspace path that no longer exists, and four recorded stale-plan cases (E §2.2, commits `0baad31f`, `3daf3e89`).

---

## 2. Asset map: the pipeline as it runs today

### 2.1 Stage by stage

```
SOURCES ──► DISTIL ──► (COMBINE) ──► backlog.json ──► DRIVE ──► BUILD one item ──► REPORT / RULINGS ──┐
   ▲                                                                                                   │
   └───────────────────────────── rulings feed back as new/changed items ◄──────────────────────────────┘
```

| Step | Assets today | Status | Breaks / duplication |
|---|---|---|---|
| **0. Source registry and acquisition** | `tools/journey-builder/prepare-digest.sh` + `targets.json` `sources[]` (confluence, canvas, document, images, repo, code, pending) (D §2.1); trace workflow `CORPUS_FACTS` prose + hardcoded paths (`trace-to-requirements.workflow.js:24-27, 144-166`); `ticket-refiner`'s `prepare-refinement.sh` Jira/Confluence fetch (F P4) | Works for EUDPA-409 | No shared registry with version pins (F P2). No Jira, transcript, chat, email, web or xlsx sources (D §2.1, F P4). Trace paths point at two retired workspace names. `sources[].status` is stuck at `"extracting"` (D §3.1). Precedence is prose (`targets.json _sourcesNote`) |
| **1. Characterise and extract** | `SOURCE_EXTRACTOR.md` (790 lines, about 85% per-source run notes) → `extract-add-item.sh`, `extract-finalize.sh`; `rules.<source>.md` per run (D §2.2); trace workflow Extract phase | Strong: "characterise first, extract second" (`SOURCE_EXTRACTOR.md:17-26`) | The method is buried in instance notes (F P1). Mechanics per source *type* (docx, image board, trace corpus) are not a reusable library |
| **2. Verify extracts** | Trace workflow Verify (`:850-927`), adversarial by a different agent; IUU corrected 21 of 43 pages (F K13, `iuu/verify-summary.md`) | Strong, trace-only | The digest has no equivalent adversarial verify of extracts |
| **3. Reconcile** | `SPEC_RECONCILER.md` → `spec-add-*.sh` → `journey-spec.json` + `conflicts.json` (D §2.3); trace workflow Reconcile (`:990-1025`) | Strong ideas | The canonical store is the **frontend engine's data model** (obligations, pages, `appliesAt notification|commodity|unit`, `spec-add-field.sh:46-53`), so backend, tooling, CI and cross-repo requirements have no home (D §5.2). Precedence is hardcoded to live animals and needed a 235-line per-run override brief (`RECONCILER-BRIEF.md:3-8`) |
| **4. Adjudicate conflicts** | EUDPA-409 judges panel: 8 dockets, 3 judges and a chair each, 83 rulings, a critic, reconciliation, applier (D §2.6, F K13); `spec-add-decision.sh` → `decisions.json` ledger with supersession (D §2.5) | Best quality lever in the estate | **The panel is not in the skill**. It exists only as workarea files (`panel-*.json`, `APPLIER-BRIEF.md`). Trace runs send every `needsHuman` to Sam and over-gate (CHED-P 74 of 108 blocked; one etag decision copied onto 16 rows, F P5) |
| **5. Gate and report** | Hand-written `SPEC-GATE.md` (trace; CHED-P 3,557 lines, 596 questions, F P6); journey-builder gate = "a git diff of a 280 KB JSON" (D §2.4); `EUDPA-249/spec-review.md`, a generated view whose generator is gone (G §5.1) | Weak | No rendered distillation report anywhere. The best narrative (panel docket summaries, `completeness-critique.md`) is ad hoc (G §4, D §6.9) |
| **6. Atomise (pass 1)** | `backlog-generate.sh`: one `add-page`/`add-collection` per spec page, a car-insurance tail, model-extension gates, extras spliced at anchors, **one linear `dependsOn` chain**, positional `inc-NNN` (D §2.7); trace Backlog phase "one increment per page" (`:1336-1352`) | Mechanical, journey-only | 51 of 65 EUDPA-409 increments came through the `extras` side channel as prose (D §3.3). The type names are implementation routes (frontend-change modes). Ids renumber on regeneration (`backlog-generate.sh:273-277`) |
| **7. Combine (pass 2)** | `EUDPA-409/combination-proposal.{md,json}` (by hand, after 30 builds); a later prose "MERGED-IN" style (D §3.3) | Prototype only | Combines **recipes** (union of `filesToTouch`/`verification`, `:81`). Lost on regeneration (`:88`). Two encodings; `inc-049` is `merged-into` with `mergedInto: null`. `merged-into` had to be hand-added to the orchestrator's jq (commit `fe5ed046`) |
| **8. Plan (ahead of build)** | `INCREMENT_PLANNER.md` → `backlog-plan-increment.sh` writes `filesToTouch`, `verification`, `recipe`, `sizeGuess`, `implementorSkill` **into backlog.json**, ten at a time (D §2.8, H §8.6) | The recipe anti-pattern | Contradicts build-orchestrator. From inc-031 on, EUDPA-409 built without plans, which proves the workflow can own the how (D §2.8) |
| **9. backlog.json** | 18 real backlogs, at least 60 row keys, 6 envelopes, about 15 statuses (E §1-2, C §5.2) | No schema | Only validated schema is parity-specific (`tim/src/parity/schema.js:112-135`). `codex/schemas/increment.json` is the implementor's *output*, misnamed (E §5) |
| **10. Drive (derive next, invoke)** | build-orchestrator (jq deny-list, one id per Workflow call, run copy with patched `FALLBACK`); `next-increment.sh` (allow-list `todo`, locked to `workareas/journey-builder/EUDPA-*`); `frontend-alignment.js` own baseline agent (LLM-evaluated, file order, no `dependsOn`) (C §5.1) | Three incompatible buildability rules | Deny-list makes `failed`, `disputed`, `paused` buildable. Allow-list silently never builds unknown statuses |
| **11. Build one item** | `increment-build-loop.js` (ticket → branch → baseline → implement → review 2n+1 → verify → judge → fix → ladder → land → PR → CI → merge → done → gate); `frontend-alignment.js` (baseline → sync → **plan** → implement → review focus → verify → judge → fix → ladder → land → draft PR → CI → local E2E → report refresh → record → workspace E2E); Codex shell+relay in the loop only | Two strong halves in two files | Loop has the lifecycle, the executor switch and portability. FA has the plan, focused review, script-name ladder, report and state commit. Neither has both (B §9) |
| **12. Report and rulings** | FA `report.md` (LLM-edited in place, `FA:1248-1279`); parity `tim parity report` (generated, tested); `rule-decision.sh` (parity, EUDPA-* only); `spec-add-decision.sh` (journey-builder); FA ruling stages (`question` + `ruling`) (G §10) | Three mechanisms, no shared record | FA question numbers live only in prose and were renumbered; `stages.json` now disagrees with the report (s16 says 13, report says 27; s24 says 28, report says 30) (G §2) |
| **13. Feedback of discovered work** | Judge → `openQuestions`; orchestrator `DEFERRED:` sweep appends increments by hand-Edit; Codex implementor "Never edit backlog.json" (C §2.6) | Three channels, three rules | New increments have no specified shape. The backlog-reassessment design (build-loop-evolution HANDOVER Thread B) has no hook (B integration gaps) |

### 2.2 Where the chain breaks

These are the joins where one asset's output is not the next asset's input:

1. **Spec → build.** `increment-build-loop.js` and `frontend-change` never read `journey-spec.json` (grep-verified, D §6.1). An unplanned page increment carries only `{page, section, obligations[]}` with empty `detail`. The planner was the only bridge, and planning was made optional.
2. **Requirement-shaped backlog → loop.** Trace backlogs (`ched-pp`: `{id, title, kind, acceptanceCriteria, dependsOn, gate, ...}`, no `repo`/`verification`/`filesToTouch`) cannot be built. The ticket stage falls through `repo` and `band`, and the ladder has nothing to run (B §7). **Correction (G5):** this is too strong. The loop already accepts a requirement-only row: `readIncrement` (`increment-build-loop.js:666-678`) says working out what to change is the implementor's job, and with `repo` missing it picks repos from the parity `band` (`:949-955`). DR1-U built 118 such rows. The real gaps are that `band` is a parity-only routing key (so a trace row with neither `repo` nor `band` still has no route), and that the ladder falls back to nothing per row.
3. **Programme header → loop.** The loop reads only `.increments[]`. Programme requirements (FA `invariants`, `direction`, `targetTree`; trace `scopeExclusions`, `deviations`; plant-products `scopeDecisions`) have no channel into implement, review or judge (B §12).
4. **Combination → regeneration.** Merges are hand edits the generator cannot express (D §6.3).
5. **Report question → ruling → item.** Identity lives in prose (G §2).
6. **`gate` authored → `gate` consumed.** Authored as "needs a ruling before build", consumed as "halt after landing" (C §5.3). A ruled row must be both status-flipped and gate-nulled, a protocol recorded only in EUDPA-409 inc-063 prose (E §2.1).
7. **Unmerged fixes → main.** `lifecycle: local` is broken on main (baseline refuses a repo on `BASE_BRANCH`, land asserts `workBranch`, and local sets `workBranch = BASE_BRANCH`, `increment-build-loop.js:853, 1076-1079, 1463-1467`). The fix plus `commitTrailer` sits on `chore/NO_JIRA-plants-snagging-workarea` (workspace PR #44). `pr-ensure-draft.sh`, `wait-for-pr-checks.sh`, `npm-in-repo --clone` and the whole alignment workflow sit on `feat/NO_JIRA-frontend-alignment` (PR #47) (C §2.2, H §9.2). `origin/feat/parity-report-triage-view` is **behind** main on the loop and would regress seven commits if merged (B §6). The same branch holds the DR1-U backlog and its 64 build commits, so its data must be brought onto main without its loop (G5).
8. **Parity backlog → any other path.** `next-decision.sh:29`, `decision-counts.sh:12`, `rule-decision.sh:48` and `backlog-counts.sh:21` hardcode `workareas/journey-builder/$RUN/backlog.json` and match only `EUDPA-*` run ids (`rule-decision.sh` also only `inc-*` ids). DR1-U had to move out of that directory to be built (`b9069436`); after the move no parity reader could reach it, `tim parity report` fails (no `dr1u` corpus), and every ruling was a hand edit (G5).
9. **Authored → verified → buildable.** tim ingest creates every finding `todo` with no gate and no dependencies (`ingest.js:418-428`), so a finding a verifier disputed is buildable at once. DR1C has 3 `disputed` findings at `todo`; DR1-U held its disputed findings back by hand as `deferred` and records an ordering constraint that is not in `dependsOn` (G5).

---

## 3. Overlaps and duplication

### 3.1 Drivers: four ways to work through a backlog

| Driver | Where it runs | Selects by | Plans | Lifecycle | Executor | State writes | Status |
|---|---|---|---|---|---|---|---|
| build-orchestrator → `increment-build-loop.js` | Main session; one Workflow per increment via a gitignored run copy with patched `FALLBACK` | jq deny-list over `status` + `dependsOn` (`SKILL.md:126`) | None (backlog is the plan) | Ticket, per-increment branch, PR, CI, approval, merge (`full`); `local` broken on main | Claude or Codex, per run | Free-hand Edit of `backlog.json` | Live; 57 EUDPA-409 increments + 3 snagging done |
| journey-builder BUILD mode | Main session | `next-increment.sh` allow-list `todo` | Optional plans pre-written into the backlog | Commits on the spec worktree; `rollback-increment.sh` uses `git clean -fd`, violating the non-destructive rule | Claude via `frontend-change` | Validated scripts, but locked to `EUDPA-*` | Superseded (`PROGRAMME-NOTES.md:102-110`), still advertised in `SKILL.md:3` |
| `frontend-alignment.js` self-drain | Inside one Workflow; re-reads `stages.json` each round | LLM baseline agent, file order, no deps (`FA:537-544`) | **Opus JIT plan per stage** | One programme branch, draft PRs, never merges | Claude only | Agent jq with a defensive prompt; still corrupted the header | Proven: 24 stages, 348 agents, 0 failed |
| build-orchestrator on DR1-U (branch `origin/feat/parity-report-triage-view`) | Main session, three teammates and Sam | Same deny-list | None; requirement-only rows | `full` | Claude | Hand edits; rulings by hand because parity tools are path-locked | 118 of 161 built, 64 commits, ended `6688fd8e` "backlog exhausted" (G5); missing from the first draft |
| Codex-as-orchestrator | Codex `/goal` prompt (`HANDOVER-CODEX.md`) | Codex reads the same backlog | None | Re-describes the loop's stages in prose | Codex throughout | Codex edits | One-off fork; worked for snagging |

**The overlap that matters.** build-orchestrator and `frontend-alignment.js` are the two living designs. Both analysts who compared them (B §9, C §8) reach the same division of strengths:

- **The loop is better at:** `dependsOn` graph, Codex executor, Jira/PR/merge lifecycle with an approval gate, `resumeAt` from persisted facts, portable workspace resolution, `DEFERRED:` sweep, push safety.
- **FA is better at:** in-workflow Plan stage, `reviewFocus`, header-held programme config, sync-with-main, self-draining re-read, explicit red/retry statuses, report refresh, state commit, three model tiers, allowlisted watcher scripts.

**Routing is broken too.** CLAUDE.md's skill routing table lists neither `journey-builder` nor `build-orchestrator`, and a blank line before the `parity` row breaks that row out of the table (`CLAUDE.md:30-44`; C §4, H §7.4).

### 3.2 `increment-build-loop.js` against `frontend-alignment.js`, stage by stage

(B §9's full table, reduced to the verdicts.)

| Stage | Stronger | One-line reason |
|---|---|---|
| Config / programme data | FA | Programme is data in the `stages.json` header; N named repos |
| Workspace path | Loop | Resolver agent (`:219-261`) vs FA's hardcoded `/Users/samfarrington` (`FA:71`) |
| Selecting work | Both | FA re-reads live; loop+orchestrator honours `dependsOn` |
| Ticket / branch per increment | Loop | Idempotent ticket, `--no-track`, upstream repair |
| Baseline | FA | Status-aware; checks only repos pending stages touch |
| Sync with main | FA | `merge-tree` probe; conflicts → `sync-blocked` |
| **Plan** | **FA, decisively** | The stage that lets the backlog be a requirement |
| Implement | FA on input, loop on executor | Plan-driven; Claude or Codex |
| Review | FA | `reviewFocus` capped; Opus consistency reviewer runs the plan's invariant proofs |
| Verify findings | Tie | Byte-identical code (`:1257-1311` = `FA:860-909`) |
| Judge | FA | Ruling-aware; defers reach a report |
| Fix | Tie, both weak | Neither checks the fixer's result |
| Ladder | FA | npm script names, skip-if-undefined; Sonnet, not the light tier |
| Land | FA on content, loop on guard | Plan-derived commit bodies; `HEAD != base` proof |
| PR / CI | Loop for delivery, FA for hygiene | FA uses exit-coded scripts; loop handles `newPrs` in new repos |
| Merge | Loop | Whole-increment approval gate, `MERGE_RANK`, base watch, open-PR sweep |
| Local E2E | FA | "Is this run worth making" pre-check, retry once, always tear down |
| Report | FA | Continuous report; loop has none |
| Record state | FA | Commits state files by name |
| Models | FA | `think` / `doer` / `watcher` (`FA:95-97`) |
| Executor | Loop | Codex path exists only here |

### 3.3 Other duplication

- **Two requirements pipelines**: trace-mining and the digest (F §0). The trace workflow has adversarial extract verification, confidence tiers and a completeness critic. The digest has characterise-first, source roles, the panel and the ledger. The distiller should be their union behind one schema, not a third design (F §0). **Correction (G1):** there are three, not two. Parity's COMPARE/AUTHOR pipeline is a requirements-gathering pipeline too, and it owns the tested completeness and duplicate machinery the other two lack (phase ledger, coverage, slices, yield, duplicates, verifier-record gate, carryover). There is also a fourth, one-off Workflow, `workareas/shared/dr1c-parity/author-workflow.js` (author then verify per slice; each author returns `notRaised[]` and `premisesDisproved[]`), and a working multi-source merge, `workareas/shared/dr1a-vs-dr1c-workflow.js` (matches findings from two sources by "would a person doing the work write the same diff", then a second agent challenges every finding only one source claimed, and each merged row gets a `provenance` block) (G1, G5).
- **Two backlog writers**: journey-builder's validated shell scripts and `tim parity ingest` / `set-slot`. The tim one is tested, keeps ids stable and protects rulings; the house rule prefers tim over bash (G2).
- **Three planning homes**: journey-builder plan mode (into `backlog.json`), FA Plan stage (`plans/*.md`), and implicit derivation by the loop's implementor (C §9.5). EUDPA-409's `plans/` (30 JSON files) is gitignored, while their content is copied into the tracked backlog.
- **Three ruling mechanisms**: FA ruling stages, `rule-decision.sh`, `spec-add-decision.sh`. None can read the others' decisions (G §10).
- **Three report mechanisms**: LLM-edited, tim-rendered, hand-written (G §10).
- **Three homes for programme config**: backlog header (FA), workflow `FALLBACK` (loop, `:90-110`), `tools/journey-builder/targets.json`. Plus `PROGRAMME-NOTES.md` prose and a 13-field handover prompt ("Write `requireApproval: false` into every run copy's FALLBACK", `EUDPA-409/PROGRAMME-NOTES.md:112-123`) (C §2.3, E §1).
- **Two GUARD RAILS copies that have drifted**. The loop's (`:315-334`) lacks the clauses banning env-var prefixes, awk/sed, npx/node_modules binaries and raw `gh`. Its own ticket stage breaks the env-prefix rule (`:898`). Its Codex shell step uses `pkill ... ; grep` (`:762`) against its own "no `;`" (H §5).
- **Two args sentinels**: `args.increments` (loop) against `args.workarea` (FA) (H §3).
- **Merge order in two places that disagree**: PROGRAMME-NOTES says backend, frontend, tests; `MERGE_RANK` is backend, tests, frontend (`:299`). The script wins (C §9.10).

---

## 4. Backlog format drift

### 4.1 Envelope (top-level) keys

| Family | Header keys | Programme config? | Requirement ledger? |
|---|---|---|---|
| journey-builder generated (B, G, H) | `schema_version, run_id, target, increments` | No | No |
| parity (C-F) | `run_id, target, corpus, [note], increments` | No | Per-row `decision` |
| EUDPA-288 | `run_id, note, increments` | No | No |
| address-book v1/v2 | `schemaVersion, epic, branches, branchNotes` / `generatedAt, milestones[{ticket,acs}]` | Partly | `acRefs`, `rulingRefs` per row |
| trace-requirements | `brief, source[], generated, regenerationOf, milestones, sequencingNotes, scopeExclusions, deviations, bornBlocked, [journey]` | No | **Yes** |
| plant-products @`0438343c` | adds `scopeDecisions[{ruledBy,ruledDate,carriedFrom}]`, `gaps[{bites[]}]`, `revisions[{backlogEffect}]` | No | **Best in corpus** |
| frontend-alignment | `programme, purpose, branch, base, repos{key:{path,clonePath,github,pr}}, checkouts, workspacePr, rulings, direction, invariants[], targetTree, reviewCap, ciFixAttempts, ciWatchSeconds, stages` **plus stray `s17-auth-convergence`, `s22`, `ci`, `s24-cross-service-shape`** | **Yes** | `invariants`, `direction` |

The version key has three spellings (`schema_version`, `schemaVersion`, none), and nothing checks any of them (E §1).

### 4.2 Increment field matrix (condensed from E §2, with who reads what)

Kind: **Req** = requirement, **Rec** = recipe, **St** = run state, **Meta** = identity/order/class.

| Concept | Loop / journey-builder | Trace | Parity | FA stages | Kind | Reader |
|---|---|---|---|---|---|---|
| Identity | `id` positional `inc-NNN` + `key` (content key, EUDPA-409) | `id` `inc-NNN` | `id` | `id` `sNN-slug` | Meta | everyone |
| Statement | `detail` (prose, often recipe) | none (AC only) | `detail` + `finding{frontend,prototype,difference,falsifiedBy}` | `brief` (prose, recipe in s01-s12, requirement-leaning in rulings) | Req/mixed | implementor, planner |
| Acceptance | `acceptanceCriteria` (often mechanism) | `acceptanceCriteria` with `[confirmed]/[inferred]` (IUU only) | none | none (end state inside `brief`) | Req | ticket, reviewers, verifier, judge |
| Work shape | `type` (`add-page`, `fix`, `restore`...; 40+ values) | `kind` (`page`, `scaffold`, `reference-data`; 22 in plant-products) | `type` (frontend-change modes) | `kind` on s13 only, unread | Meta/**Rec route** | frontend-change routing |
| Branch prefix | `kind` (`fix|chore|docs|refactor|test|feature`) | n/a | n/a | derived from ruling/behaviourChanges | Meta | loop ticket stage |
| Repos | `repo`: `frontend|backend|tests|both`; `null` means "frontend and tests" by folklore; `band` fallback (`:949-955`, the loop's only reader of `band`, G5) | none | `band` (read by the loop when `repo` is null) | `repos[]` into header map | Meta | loop routing, merge rank |
| Exemplars | `recipe` (docs to follow) | none | `citations` | `reference[]` (27 on s17) | Rec/Req | implementor, planner |
| Files | `filesToTouch[{path,action,what}]` | none | none | none (in plan) | **Rec** | implementor "IS the script", reviewer scope fence |
| Verification | `verification[]` literal Bash | none | `finding.verification` = **evidence** re-check, a different meaning | `ladder[]` npm script names | **Rec** | ladder |
| Change spec | `obligations, flowChanges, schemaFields, copyKeys, specs, implementorSkill` | none | none | none | **Rec** | implementor |
| Size | `sizeGuess` (by file count, post-plan) | `sizeGuess` (guessed, pre-plan) | none | none | Meta | nobody now; stale claim it gates |
| Order | `dependsOn` linear chain | `dependsOn` real | `dependsOn` (0 on DR1C) | none (file order) | Meta | derive query |
| Human gate | `gate` (`sam`, `backend`, `model-extension`, `milestone`, `HALT-FOR-REVIEW`, free-text deferral) | `gate` + `openQuestion` / `blockedQuestion` + top-level `bornBlocked[]` | `gate` + `decisionRequired{question,audience,source,options,consequence,cites}` | `question` (int into report prose) + `ruling` | Mixed | loop post-land halt; journey-builder pre-build stop |
| Ruling record | none on row (ledger in `decisions.json`) | prose in conflicts | `decision{ruling,note,ruledAt[,by]}` | `ruling` prose, dated | Req | report, planner |
| Open questions | `openQuestions[]` (planner, judge) | `openQuestion` / `blockedQuestion` | `decisionRequired` | `openQuestions[]` plain strings | Mixed | report |
| Combine | `absorbs[]` + `mergedInto` + status `merged-into`; also prose "MERGED-IN" | none | none | bundling by hand (s17) | Meta/St | orchestrator withhold |
| Lifecycle | `ticket, branch, commit` (string, space-separated for `both`), `prs[{repo,url,number,merged,sha}]`, `failure_reason` | none | `commit`, `failure_reason` | `commit` (string or `{repo:sha}`), `prs`, `ci`, `localE2e`, `e2e`, `plan` (null on 14 of 24; see §5.2), `reportRefreshed` | St | resume |
| Journal | `notes` (1-6 KB plans in EUDPA-409) | `notes` | `notes[{note,at}]` | `notes[]` (217 KB vs 53 KB of brief) | St/mixed | everyone re-reads it |

`commit` alone has three encodings: a space-separated string, `commits[{repo,sha}]` / `{repo:sha}`, and an ad hoc `testsCommit` (snagging) (C §5.5).

### 4.3 Status vocabularies

| Source | Values | Direction |
|---|---|---|
| `backlog-set-status.sh:28-31` | `todo inprogress done failed blocked dropped` (**cannot** write `deferred`, `merged-into`, `rejected`) | Validated setter |
| `next-increment.sh:26-32` | picks `todo` only | Allow-list; unknown silently never built |
| build-orchestrator `SKILL.md:126` | withholds `done deferred dropped blocked rejected merged-into`; everything else buildable (prose says "five", list has six) | Deny-list; `failed`, `inprogress`, `paused`, `disputed` buildable |
| parity `rule-decision.sh` | `todo` (accept), `dropped` (reject/falsified), `blocked` (defer); `disputed` in SKILL prose | |
| EUDPA-409 live | `done blocked dropped merged-into` | |
| EUDPA-288, plant-products | `done deferred` | |
| trace backlogs | `todo blocked` + duplicated `bornBlocked[]` | |
| plants snagging | `todo paused done` | |
| address-book v2 | **none** | |
| `frontend-alignment.js` | `todo landed done` + red `sync-blocked implement-failed ladder-red ci-red e2e-red` + human-set `ci-retry e2e-retry`; `plan-refused`, `land-failed`, `pr-failed`, `record-failed`, `report-failed` write **no** status; `landed` is not handled by its own baseline (`FA:537-545`) | LLM allow-list |
| increment-build-loop | writes only `done`; failure is an "ATTEMPT FAILED" note; baseline-red and implement-failed `continue` instead of `break` (`:1092, 1170`) | |

`done` is overloaded too. EUDPA-409 `inc-060` is `done` with `ticket: null, commit: null`: a decision resolved without code, indistinguishable from a merged build (C §5.2).

**Deferral** is encoded three ways: `status: deferred`; `status: blocked` + `decision.ruling: defer`; free-text `gate: "⏸ DEFERRED BY SAM"` (E §6.6).

### 4.4 `gate`: one field, opposite timing

- **Before build** (journey-builder, parity, trace): `gate: "sam"`, born `blocked`; BUILD mode stops before building (`journey-builder/SKILL.md:166-167`); `rule-decision.sh accept` clears it.
- **After build** (loop): checked only after landing (`increment-build-loop.js:1907-1922`); any non-`null` string halts, including `""` or `false`.

Under build-orchestrator, before-build items are `blocked`, so the derive query never reaches them. PROGRAMME-NOTES' claim that they "halt the loop when reached" is false; the run ends `no-buildable` (C §5.3).

### 4.5 Ids, repos, questions

- **Ids.** Positional `inc-NNN` regenerated by `backlog-generate.sh` while `dependsOn` names ids. EUDPA-409 had to rule "trust the key or page name, not the number" (`PROGRAMME-NOTES.md:92-100`). That contradicts build-orchestrator's "Do not renumber increment ids" (`SKILL.md:409`). **Correction (G2):** the first draft said `sNN-slug` (FA) is the only id that is both stable and readable. That is false. `tim parity ingest` keys each `inc-NNN` on the readable per-file slug it stores in `source` and never renumbers (`ingest.js:310-328`, tested at `ingest.test.js:125, 138`), and resolves slug cross-references to ids in the same pass, failing on dangling or self references (`:361-388`). The stable handle plus the readable slug already gives both. What it lacks: `dependsOn` is created empty and never resolved from slugs, and nothing detects cycles.
- **Repos.** The loop hard-requires exactly `frontend|backend|tests` (`:179-190`). `both` means backend+frontend (`:282`, `backlog-generate.sh:38-41`). `repo: null` means frontend+tests by EUDPA-409 folklore. FA needs five named repos. Most of the workspace's 14 repos cannot be targeted without re-pointing a role for the whole run (B §2).
- **Questions.** Five shapes for "a thing a human must decide": `openQuestions[]`, `openQuestion`, `blockedQuestion`, `question` (int into prose), `decisionRequired{...}`. Only the last is structured enough to render and rule on (E §6.11). Plant-products has 73 `done` rows still carrying `openQuestions`, so questions have no lifecycle.
- **Rulings (G5).** "Awaiting a ruling" has three definitions: `next-decision.sh` (blocked, matching gate, no decision), `decision-counts.sh` (blocked, no decision) and tim `counts.js` (gated, no decision). `gate` means "who must rule" in parity (`set.js:165`). DR1-U uses ruling `block` and statuses `deferred` and `rejected`, none of which `rule-decision.sh` can write, and `counts.js:10` would count `rejected` findings as live work. tim has no setter for status, commit or rulings.
- **Blast radius of a reshape (G5).** The backlog readers are more than a grep of `backlog.json` finds: nine more tim modules read it through `profile.paths.backlog` or `parseBacklog`, and `report.contract.test.js` parses the tracked EUDPA-328 backlog in tim CI, so reshaping that file breaks CI (the comment saying a fresh clone skips the test is stale). `schema.js:139` requires the header `target`, so a backlog without it breaks every `tim parity` command.

### 4.6 State corruption, the practical symptom of drift

The `stages.json` header carries `s17-auth-convergence`, `s22: {"address-book-links": {...}}` (an id split on `-`), `ci: {state: "red", ...}` and `s24-cross-service-shape`. These are recorder writes that landed at the wrong JSON path. As a result the real s24 stage has `ci: null` and no E2E fields despite being `done`, and s17's E2E fields were back-filled from the journal after a silent write failure (the sonar Read hook refused the file because a note quoted a password-shaped value). The stray s17 note records a local E2E red as "Pre-existing, unrelated", a verdict Sam's rules ban (A §6.1, E §6.7, H §6.2). The loop has the same exposure: judge, preserve, ticket, PR, merge and done all tell agents to "Edit ${BACKLOG}" (`:387-389, 901-902, 930-931, 1339-1340, 1475, 1545-1548, 1794-1795, 1873-1875`), validated only by `jq empty`.

The FA script already has a long defensive prompt about this (`FA:150-158`, "a previous run lost a stage's commit SHAs, PRs and every note that way"). It did not hold. **Prompt rules do not protect state; a deterministic, schema-validating writer does.** All eight analysts reached that conclusion. G2 adds one caveat from the existing tim writer: a deterministic writer is not enough on its own. `set.js` reads, changes and rewrites the whole file, and `io.js:44-50` uses a fixed temp-file name, so two parallel `set-slot` calls can overwrite each other. It needs a check-before-write on the `sha256` the writer already returns, or all writes serialised through the orchestrator.

---

## 5. Recipe or requirement

### 5.1 Every place the backlog is a recipe today

**The consumers that demand a recipe** (these are the root cause):

| # | Where | What it demands |
|---|---|---|
| R1 | `increment-build-loop.js:1117-1119`; `codex/implement.md:78-81` | Conditional, inside R5's frontend routing rule: "Where the increment cites a gap that no recipe covers, the increment's own `filesToTouch` IS the script". It is R5's fallback, not an unconditional rule; R5 is the primary recipe demand |
| R2 | `:1401`; `codex/fix.md:45-46` | ladder runs the row's `verification` commands in order; Claude mode has **no fallback** (Codex fix has one) |
| R3 | `:1241-1242`; `codex/review.md:84-87` | consistency / Codex reviewer flags any diff that differs from `filesToTouch` in either direction, so a better solution than the backlog imagined becomes a finding |
| R4 | `:666-680` `readIncrement` | advertises `filesToTouch, obligations, flowChanges, schemaFields, copyKeys, specs, verification` and a field literally named `recipe` ("read ONLY what the increment's recipe field cites"), while also saying "WORKING OUT WHAT TO CHANGE IS YOUR JOB" |
| R5 | `:1109-1126` | **The primary recipe demand.** Routes by `repo` to `frontend-change` ("follow it verbatim... Do NOT improvise around a recipe"), so `type` becomes a recipe selector; R1 is its fallback when no recipe covers the gap |
| R6 | `:1145-1146` | "Write the specs the increment lists" |
| R7 | `:884-896` | copies `acceptanceCriteria` verbatim into Jira; mechanism ACs (function names, line numbers) become ticket ACs |
| R8 | `:1219-1223` | code reviewer expects "the programme-specific traps the increment or its cited plan names" |

**The producers that write the recipe:**

| # | Where | Evidence |
|---|---|---|
| P1 | `tools/journey-builder/backlog-plan-increment.sh:2-31, 88-104` | defines `filesToTouch`, `verification` ("the exact Bash commands"), `recipe`, `implementorSkill` as backlog fields and hard-requires them; `:9-11` stale "sizeGuess... is what makes an increment buildable" |
| P2 | `INCREMENT_PLANNER.md:7-9, 73-74, 151-161, 174-183` | "The recipe's file list is your filesToTouch skeleton"; "the reviewers check the diff against this list in both directions"; plans ten at a time (`worker-references.md:39`) |
| P3 | `backlog-generate.sh:204`; `journey-builder/SKILL.md:167-171` | increment `type` = `frontend-change` mode |
| P4 | `backlog-generate.sh:152` | preserves plan fields and run state together as one family across regeneration |
| P5 | `trace-to-requirements.workflow.js:1355-1358` (Backlog rule 7) | asks for `govuk-radios` / `govuk-fieldset` class names in ACs |
| P6 | trace Model phase (`:1179-1263`) | designs `IuuNotificationDocument`, which ACs then cite (F §4.2) |
| P7 | `combination-proposal.md:81` | survivor gets the union of members' `filesToTouch` / `verification` |
| P8 | Ralph `SKILL.md:100-116` | "Always include as final criterion: Typecheck passes" |
| P9 | `ticket-creator/assets/templates/story.md:14-17` | "Tech Notes [Implementation hints]" |

**Specimens** (all cited in D, E, F):

- EUDPA-409 `inc-027` plan: 37 files, 30 ACs such as "'commodityType' is added to ENFORCED_AT_CONTINUE in src/server/app/bridge/obligation-source.js".
- `inc-028`: `filesToTouch` with line ranges, 11 ACs naming signatures, a 6 KB "THE SHAPE TO COPY" note.
- `inc-003`: ACs pin `actions/checkout@v7` and job order by line. The real requirement is "a new advisory cannot turn the merge check red".
- `inc-063`: prescribes `spec-add-decision.sh --supersedes` against a decision that did not exist. The increment parked on the recipe, not on the requirement.
- plant-products `pp-020`: 26 `filesToTouch` with literal code, verification against the retired path.
- address-book `inc-001`: 3.4 KB of compose/port/env steps burying one excellent constraint (the CI-visible contract lock).
- FA `s01`, `s04`, `s05` briefs: file-by-file moves with cross-stage sequencing ("s05 moves them", "s02 removes it").
- plants snagging `snag-003`: 26 `filesToTouch`, and `HANDOVER-CODEX.md` "Implement... following the increment's filesToTouch".
- ched-pp `inc-002`: "`@Document(collection = "notification")`", "compact-constructor null guards" (house style, not acceptance).

**Where the recipe leaked into the spec itself** (D §3.1):

- journey-spec pages carry engine vocabulary: `runStep`, `taskRow`, `saveActions`, `hubGroup`, `storage`, `pattern`.
- Behaviours cite "shared/kit.js:96".
- The parity renderer's `TYPE_ORDER` is `frontend-change`'s modes (`page.js:15-23`).

**The evidence that recipes rot**:

- 92 of 102 plant-products verification rows point at the pre-migration path.
- Four stale-plan cases are recorded, including "Later briefs now instruct implementors to treat filesToTouch as a hypothesis" (`0baad31f`).
- The loop had to list "a citation whose line has moved on" as a known defect class (`:676-677`). **Correction (G3):** this is also a policy conflict, not only evidence of rot. Parity's tested rule is the opposite: anchor drift is "a finding to re-verify … not a fault" and never blocks (`tim/src/parity/check-evidence.js:518-521`), and `anchor-check.js` sorts each quoted identifier into six classes, where `missingFromFile` means re-verify the finding, not nudge the lines. The new implementor should follow parity.
- `journey-builder/SKILL.md:150`: "Nobody reviews sixty plans at once, so do not plan the whole backlog ahead of the build."

**What is already requirement-shaped and good** (the pattern to generalise):

- Trace ACs with `[confirmed]`/`[inferred]` tags and citations (IUU `inc-021`).
- Born-blocked rows that say "Do not author the ruling" but state what is buildable meanwhile (ched-pp `inc-020`, `inc-040`).
- Parity findings with a falsifier.
- address-book `inc-006` test intent ("404 bodies for an UNKNOWN id and for a LIVE id owned by another crn are byte-for-byte identical").
- FA `s22` / `s24` briefs:
  - "measure before you build";
  - why;
  - end state as proof ("byte-equal across the three; every remaining difference is a value in config.js");
  - constraints with reasons;
  - behaviour to declare;
  - out of scope.
- OpenSpec's MUST + observable Given/When/Then with no selectors, files or framework mechanics (`openspec/config.yaml:71-89`).

### 5.2 The model: frontend-alignment's plan-per-stage

The analysts are unanimous (A §4-5, B §9 "FA, decisively", C §1, D §4, E §7.5, F §7, G §8.3, H §6.1). The model is FA's **Plan** stage, which runs immediately before implementation inside the workflow:

- Opus, high effort; reads the brief, the reference files, the current target files and the relevant best-practice docs (`FA:697-721`).
- Captures the ladder baseline first ("so a later red is unambiguous"), pins HEAD SHAs ("if a checkout has moved, stop and report").
- Re-measures the live state the brief described, correcting the brief against reality. s22's planner found "ins already works"; s24's re-measured `diff` hunks.
- Writes `plans/<id>.md` in a fixed outline: **0 Decisions** (with rejected alternatives), **1 Moves, 2 Edits, 3 New files, 4 Imports, 5 Tests, 6 Invariants to prove** (runnable commands with expected output), **7 Out of scope**.
- "Where the brief leaves a choice open, MAKE IT and record it in decisions: never leave a fork for the implementor."
- Returns `reviewFocus` (capped; pure moves get no reviewer: the main cost lever), `behaviourChanges` (drives commit type and body), `decisions`, `risks`; may refuse (`ok: false`) if the brief cannot be carried out.
- Downstream, the Sonnet implementor "execute[s] the plan and nothing else"; the Opus consistency reviewer **runs the plan's invariant proofs** (`FA:850-851`).
- Result: "Sonnet never had to decide anything" (`run.md:82-85`), and a Codex implementor can be handed the plan file verbatim (A §6.5, E §7.5).

**Defects in the model to fix when lifting it:**

- `planFile` is returned but never persisted. On the branch, `stages.json` has `plan` null on 14 of 24 stages (s02, s03, s04, s06, s07, s08, s10, s12, s13, s14, s15, s16, s17, s18). Of those, 13 have a plan file with no recorded pointer, and s13 has no plan file at all. 23 plan files exist in total.
- The planner can overreach into lifecycle: the s17 plan §8 prescribes a `chore(NO_JIRA)` commit subject that contradicts the Land step. The plan outline should forbid lifecycle content.
- Plan size: s17's plan is 1,076 lines across four repos; s04's is 2,804 with full-file replacements. A combined item needs a crisp end-state proof or the review surface balloons (A §8).

### 5.3 Ownership split: what the backlog owns and what the Plan stage owns

| Concern | Owned by the backlog (requirement) | Owned by the workflow's Plan stage (recipe) |
|---|---|---|
| What must be true afterwards | outcome; observable acceptance, each with provenance and confidence | invariants-to-prove commands that demonstrate it |
| Why | `why` / user need / source cites | none |
| Scope | constraints, out of scope, behaviour to declare, ruling | Out of scope section (may narrow, never widen) |
| Where | surfaces / repos (header keys) | exact files, moves, edits, new files, imports |
| Shape to match | exemplars / `consistentWith {ref, relation, divergence}` (F K16), marked non-binding | which exemplar to follow, and how |
| Tests | the level of proof expected (`witness: e2e|fit|unit|review`, F §7) | the test files and cases to write |
| Verification | none per row; ladders are programme/target data | baseline capture; ladder expansion to commands with current paths |
| Review scope | none | `reviewFocus` |
| Commit | none | `behaviourChanges` (feeds the workflow's own commit step; the plan never writes lifecycle) |
| Routing | none (`kind` = requirement kind, not an implementor mode) | which skill/recipe the implementor follows (for example `frontend-change` for a frontend page, which is legitimate repo-owned how-knowledge, H §7.4) |
| Programme-specific traps | none | pulled into the plan's reading list from a target profile (B §8) |

**The rule for acceptance criteria** (F §4.2, reinforced by G and E):

An AC **may** name anything a user, operator, downstream system or reviewer can observe at a boundary:
- rendered copy, options and error text;
- routes, only when an external contract fixes them (FA invariant 1: other services link to them);
- a persisted or published document shape, only when another system consumes it;
- a GDS component, only when a design source mandates it.

An AC **must not** name files, functions, classes, annotations, test file names, CSS classes or commands. Consistency with a sibling is a relation, not "copy file X". Cross-cutting rules are header invariants referenced by id, not repeated per row (F P10: IUU repeats the CSRF round-trip AC on every page).

---

## 6. Keep list and drop/retire list

### 6.1 Keep: requirements side (distiller)

1. **Characterise first, extract second**, with a finalize summary stating structure found and what could not be read (`SOURCE_EXTRACTOR.md:17-26`, `extract-finalize.sh`). Split into: method in the skill, a *source-type* mechanics library (docx via `unzip -p word/document.xml` with `</w:p>`/`</w:tr>` markers; images one at a time; traces cwd-scoped; credentials redacted) and per-run `rules.<source>.md` (F P1, K8).
2. **Per-source provenance token schemes**, multi-valued with `alsoStatedAt` (`annex:5/reg:24A(2)(aa)`, `NNS-UN-021`, `h4:<heading>/li:n`, `file:<short>/region:<label>/item:n`, `path:line@sha`, trace hash + action id) (F K2).
3. **Source roles as data**: requirement (tiered), consistency anchor ("never requirements"), constraint source ("constraints, not requirements"), current-behaviour evidence (`RECONCILER-BRIEF.md:30-36`; `SOURCE_EXTRACTOR.md:113-117, 544-553, 670-677`). This is the main defence against recipes entering the requirements (F K3).
4. **Verbatim or gap**, "a requirement with no citation is not a requirement" (`trace-to-requirements.workflow.js:168-179`); scoped admissible evidence per phase (legacy source banned for requirements, allowed for integration boundaries, `:799-802, 1144-1154`) (F K5, K6).
5. **Adversarial extract verification by a different agent**, "do not invent corrections to seem useful", plus hard gates on empty evidence (`:850-927`) (F K13 in §8 phase list).
6. **Precedence per fact kind** (rendered wins on copy, tests on intent, policy on what is collected) (F K10).
7. **Every disagreement is a `c-NNN` conflict**: recorded, never blocking, provisional pick, gate question, both sides quoted (`SPEC_RECONCILER.md:19-21`, `ched-pp/conflicts.json` c-004) (D §2.3, F K11).
8. **Do not force-fit**: named `modelGap` markers (F K12).
9. **Judges panel by docket, consistency critic, reconciliation, applier**, `decidedBy panel|sam`, `dissent`, `escalate` (`EUDPA-409/panel-*.json`, `panel/README.md`). Formalise it into the skill (D §2.6).
10. **Decision ledger**: record and apply in one write, one current decision per subject, `--supersedes`, caller-supplied `--decided-at` for replay stability, lint on dangling refs (`spec-add-decision.sh`; `journey-builder/SKILL.md:60-96`). Subjects carry a pointer, never a copy of the answer (G §5.2).
11. **Standing rulings / invariants / direction at programme level**, each with an id, checked by the critic and every reviewer (`PROGRAMME-NOTES.md:37-44`, FA header) (F K15).
12. **Parked, not rejected** scope handling with actor and citation (`RECONCILER-BRIEF.md:62-76`).
13. **Born blocked with a question, never an authored ruling** ("Do not author the ruling"), plus "buildable meanwhile" (ched-pp `inc-020/025`) (E §8.5, F K18).
14. **Assumptions with a default**, so the build is not frozen (ched-pp `sequencingNotes`, plants `provisionalCopy`) (F K22).
15. **Provenance-tagged ACs** (`[confirmed]`/`[inferred]` + cite), and OpenSpec's observable Given/When/Then conventions and stable REQ/SCN ids (F K23-K25).
16. **Completeness critic** that states what the method structurally cannot see, with honest counter-numbers (`ched-p/completeness-critique.md:20-24`; "38 of 39 map cleanly, one entirely absent") (F K7, G §4.1).
17. **Combination rules and bookkeeping**: same repo set, same slice, one reviewable PR, never two pages, never across a gate or milestone, attributable failures, a "considered and left alone" list with reasons, apply-ready JSON, `dependsOn` rewrites, ids never renumbered (`combination-proposal.md:13-88`) (C §7, D §3.4).
18. **Stable identity: prefer `tim parity ingest`'s slug-keyed `inc-NNN`** (`ingest.js:310-328`: the id is bound to the item's source-file slug and never renumbered; slug cross-references resolved in the same pass, `:361-388`) over `backlog-generate.sh`'s content key and lost-increment guard (`:270-310`), which is the weaker, untested precedent. **Extras declared beside the spec** and reviewed at the gate (D §2.7) (G2).
19. **Script-only writes with validation and atomic rename.** The tested precedent is tim's: `ingest.js:441-446` merges re-authored fields and keeps every field it does not own (ruling, commit, gate, citations) plus the header; `ruled()` (`:454-461`) blocks `--replace` (`:526-534`) and striking a ruled item (`:553-559`); the frozen `detail` field cannot change (`:561-582`); a first ingest can require a verifier's record (`:589-600`); `set.js:47-201` checks slot names and ids; `io.js:44-50` writes via temp file and rename. journey-builder's mkdir lock (`backlog-plan-increment.sh:60-71`; every `spec-*.sh`) is the one thing tim's writer lacks (D §7.10, G2).
20. **The skeleton / current-code extract as a source of constraints and hygiene gaps**, not features (D §7.13).
21. **Programme-level ledger shapes**: plant-products `scopeDecisions{ruledBy,ruledDate,carriedFrom}`, `deviations{reason}`, `gaps{bites[]}`, `revisions{backlogEffect}`; trace `sequencingNotes` distillation invariants ("every page appears exactly once") (E §8.8, §8.15). **Correction (G1):** in trace-mining that invariant is a prose note; in parity it is a tested command, `tim parity slices --strict` (`slices.js:121-263`), which proves every item is owned by exactly one slice and cross-cutting concerns by exactly one slice. Keep the command, not the note.
22. **`decisionRequired{question,audience,source,options,consequence,cites}`** and `decision{ruling,note,by,ruledAt}` (`tim/src/parity/schema.js:24-29, 71-78`) as the question and ruling shapes (E §8.7).
23. **Canary increment** before a fan-out ("Cheaper to reject one than 47", report-v2 `inc-031`) (E §8.16).
24. **Bounded lettered-option questions** (Ralph PRD `SKILL.md:24-55`) as the human gate's shape (F K20).
25. **Parity's completeness and duplicate machinery** (G1), generalised rather than rebuilt:
    - the phase ledger (`phase.sh:29-44`): phases with prerequisites, done needs prerequisites and a note, `gate` lists what is missing;
    - `tim parity coverage --strict`: diffs what each source has, read from the source itself, against what was gathered;
    - `tim parity slices --strict`: every item owned by exactly one slice; the cure for F P10 (the CSRF AC repeated on every page);
    - `tim parity yield`: flags a slice under 0.4 of the median findings per screen, findings filed under a nonexistent slice, findings written outside the author's slice, and findings with no verifier record; the only check that tells a truncated agent from a quiet one;
    - `tim parity duplicates` + the DUPLICATE_SWEEPER persona ("would one person, doing one piece of work, close both?"), with non-destructive bookkeeping;
    - author/verifier separation, and ingest refusing a finding with no verification record (`ingest.js:584-600`);
    - the finding contract already states Sam's small-increment rule ("If your sentence contains 'and also', you have two findings", `FINDING_AUTHOR.md`) and his anti-recipe rule ("comparing functionality, not code"), and "Never write backlog.json";
    - the carryover pass (dr1's 97 previous findings sorted into 50 carried, 37 retired, 8 changed, 2 to recheck before any author ran).

    Weak points not to port as they are: the ledger is bash in untracked `workareas/parity-setup/`, and restarting a phase does not reset later phases (DR1B shows `specs` running with everything downstream done); `duplicates` compares only across slices by default and missed a within-slice duplicate DR1C found by hand; nothing checks the verifier is a different agent from the author; items, prose slots (`frontend`/`prototype`) and finding types (`frontend-change` modes, `FINDING_TYPES`, `ingest.js:20-28`) are parity-shaped.
26. **Evidence pinning and drift, already built in `tim/src/parity/`** (G3): `heads.js:27-205` records `{sha, branch, dirty}` per repo at run start and later classes each repo `same|moved|dirty|unrecorded`; `meta.js:38-52` pins each repo at a full SHA with a pushed flag; `citations/evidence.js:75-193` reads every citation with `git show <pin>:<path>` and stores `sha` and blob id; `check-evidence.js:21-36, 525-535` blocks on pin drift; `anchor-check.js` six-class anchor drift, re-verify not re-nudge; `seals.js:18-271` additive content-hash seals with typed drift kinds and a deliberate `--reseal`. In use as `run-heads.json` and `seals.json`, and parity's Phase 0.5.
27. **Multi-source merge by "same diff"** with a second agent challenging every single-source finding, and a per-row `provenance` block (`workareas/shared/dr1a-vs-dr1c-workflow.js`, G5).
28. **Author returns `notRaised[]` and `premisesDisproved[]`** (`workareas/shared/dr1c-parity/author-workflow.js`), so a quiet author has to say what it looked at and declined (G1).

### 6.2 Keep: build side (implementor)

1. **Main-session driver; Workflow agents are the context death boundary** (`build-orchestrator/SKILL.md:12-25`; `README.md:7-11`) (C §2.1, H §1).
2. **Buildability = status + dependsOn only; "Thin is fine; wrong is not"** (`SKILL.md:126-153`; `codex/implement.md:47-62`: "You work out the solution. That is the job") (C §10).
3. **Verify landing from state, not from the workflow's report** (`SKILL.md:222-237`).
4. **resumeAt derived only from persisted lifecycle fields**, each persisted the moment it exists (`increment-build-loop.js:866-946, 1545-1548`) (B §4).
5. **preserveWork**: red work as a pushed `wip(...)` commit, `commit` field deliberately not written (`:370-406`; FA `:765-776, 1006-1017`).
6. **Push safety**: `--no-track` cut, fully-qualified refspec push, prove branch before commit, commit via `-F <file>` (`:336-364, 1020-1032`; `FA:125-138`).
7. **Lifecycle machinery**: idempotent ticket, exact-string status transitions, whole-increment approval gate, `MERGE_RANK`, base-branch watch, final open-PR sweep, machine-readable `stopReason` with `awaiting-approval` as a healthy pause (`:299-309, 655-660, 1714-1851`).
8. **CI fixer that branches new repos and registers `newPrs`** (`:1631-1687`).
9. **Adversarial verify grouped by file, default refuted, dead verifier fails open to "unrefuted"** (identical in both workflows).
10. **Judge: fix-now / defer-to-open-question / reject**, deferrals into state so they reach the report; `RULING_RULE` ("Never reopen the question, never soften the ruling into an option, never widen it", `FA:160-163`).
11. **Codex shell + relay pair**: placeholder-bound prompt file, `codex exec --output-schema` in foreground 570-second slices with kill and `resume <session>` (flags before `resume`, at most 5), transport-only `ok`, relay re-emits schema, **throw on no result** (`:682-825`) (B §5, H §4.1).
12. **`DEFERRED:` marker plus orchestrator sweep** turning prose deferrals into tracked items (`SKILL.md:239-261`).
13. **Ladder framework-assertion exception** (four conditions, `:1405-1415`).
14. **Workspace-root resolver agent** producing `ABS` and `TILDE` constants (`:219-261`).
15. **FA Plan stage** (section 5.2) with `reviewFocus` and `behaviourChanges`.
16. **FA ladder as npm script names**, skip-if-undefined, environment-failure rules, doer tier (`FA:973-1001`); journey-builder's **target-profile ladder data** (`targets.json`) as the home for it (C §4). **Correction (G5):** keep the data, not the runner. `verify-increment.sh` needs a `.digest-meta.json` worktree that only EUDPA-249, -288 and -409 have and runs checks in the target repo only. The header `target` is written by `backlog-generate.sh:285` and tim ingest (`ingest.js:605`) and read only by `target-profile.sh:35-36` and `resolveTarget` (`ingest.js:476-487`), which resolve in different orders; the loop and build-orchestrator never read it.
17. **FA Sync-with-main every stage**: `merge-tree` probe, conflicts never auto-resolved → `sync-blocked`, including the tests repo (`FA:613-661`; commits `d4ff0ee2`, `474e6b2a`).
18. **FA explicit red statuses and human-set `*-retry` re-entry points** (`FA:537-558`).
19. **FA local E2E rung** with "is this run worth making" pre-check, one retry for fresh-stack 500s, always tear down (`FA:1140-1234`).
20. **FA self-drain with re-read** so appended items are picked up without relaunch (`FA:507-567`).
21. **FA header-held programme config** in place of `FALLBACK` patching and PROGRAMME-NOTES prose.
22. **FA report refresh and record-state stages** (as re-render + commit, see 6.3).
23. **FA model tiers** `think` (Opus, high) / `doer` (Sonnet) / `watcher` (Haiku, low) (`FA:95-97`), proven over 348 agents with 0 failures.
24. **Allowlisted helper scripts with honest exit codes**: `wait-for-pr-checks.sh` (2 = unresolved ≠ green, 4 = no checks ≠ green), `pr-ensure-draft.sh` (exit 3 on merged/closed only) (branch-only today).
25. **Superset GUARD RAILS block** (`FA:102-117`) defined once (H §5).
26. **Handover prompt as the whole resumption mechanism** and the stop taxonomy (`SKILL.md:275-374`), with a Codex-flavoured variant (H §4.2).
27. **journey-builder BUILD mode salvage**: gate-before-build, three-consecutive-failures systemic halt, section/milestone E2E and walk-through checkpoints (C §4).

### 6.3 Keep: report and rulings

1. **Decision-led order** from commit `c0f99985`: title "what needs a ruling"; open questions, then decisions you may want to reverse, then what was built, caveats, drift, locations. Sam answered 27 questions in one batch the same day (G §1).
2. **Four-part question**: headline question, what is in play, options with a count on each side, **"If nobody answers"** default (G §1.1).
3. **"Decisions you may want to reverse"** with the rule that made each call, the other side's case, and **"To reverse:"** costed in files and commands, never time (`report.md:431-483`).
4. **Generated from JSON, every number derived**, headline sentence built from counts, stamp footer, drift panel (`tim/src/parity/render/page.js:109-139, 222-313, 379-405`).
5. **Decision block at the top of each gated card**, **batch ruling** that emits one command per line (`card.js:9-76`, `page.js:186-219`): what Sam asked for.
6. **Falsifier and collapsed adversarial audit record per card; nothing silently dropped** (`card.js:358`, `sections.js:138-156`, `page.js:346-377`).
7. **Mandatory `--note` on rulings; `falsified` distinct from `reject`** (`rule-decision.sh:10-19`).
8. **"READ THIS FIRST: the weak parts"** lead and the confidence taxonomy counted per item with before/after (`ched-pp/SPEC-GATE.md:18-93`).
9. **Conflict register needs-a-person first; precedence-ruled ones filed as reversible calls** (`SPEC-GATE.md:97-131`).
10. **Question clustering** (780 raw → 9 themes, `SPEC-GATE.md:159-180`).
11. **Ruling printed in the row it settles, attributed and dated** (`EUDPA-249/spec-review.md:157`).
12. **Combination report shape**: counts, rules first, per-combination evidence and risk with opt-out, "considered and left alone" (`combination-proposal.md:5-75`).
13. **GDS register baked in**: British English, plain language, no em dashes, no time estimates, freshness stamp (`FA:586-587, 1272`; `docs/best-practices/gds/language.md`).
14. **Ruling stages as the build-side consumer of rulings**, right-sized by bundling related answers ("there is a cost for every backlog item", HANDOVER:59; s17 bundled ten questions) (A §8).

### 6.4 Drop or retire

| Item | Why | Evidence |
|---|---|---|
| `filesToTouch`, `verification` (commands), `recipe`, `implementorSkill`, `obligations/flowChanges/schemaFields/copyKeys/specs`, pre-plan `sizeGuess` **as backlog fields** | Recipes; they rot; the Plan stage owns them | §5.1 |
| `backlog-plan-increment.sh` and `INCREMENT_PLANNER.md` as a backlog writer; their stale "sizeGuess withholds" claims | Institutionalises recipe-in-backlog; contradicts build-orchestrator | `:9-11`; `INCREMENT_PLANNER.md:7-9` |
| `readIncrement`'s recipe vocabulary; "filesToTouch IS the script"; `filesToTouch` as a review scope fence (Claude and Codex review briefs) | Root of R1-R8 | §5.1 |
| Increment `type` as a `frontend-change` mode; `band` fallback; the `frontend|backend|tests|both` role triple and `repo: null` folklore | Implementation route in the requirement; blocks N-repo work | B §2, §8; D §4 |
| `backlog-generate.sh`'s page→increment rule, car-insurance `backlogTail`, linear `dependsOn` chain, positional renumbering, 4-value extras type vocabulary | Journey-only, destroys combination and ids | D §2.7, §6.8 |
| journey-spec as the **canonical** store for non-journey programmes (keep as an optional projection) | Frontend engine model | D §5.2, F P7 |
| journey-builder BUILD mode (`next-increment.sh` as the driver, `commit-increment.sh`, `rollback-increment.sh` with `git clean -fd`) and its SKILL.md claim to be "the build loop" | Superseded; destructive rollback; path-locked | C §4 |
| Run-copy drift as a resume source (resuming "from the run copy" after the tracked loop moved) | Silently runs old behaviour | C §2.2 (EUDPA-409 copy lacks five fixes) |
| `FALLBACK` defaults and the gitignored, patched run copy altogether; the `typeof args === 'object' ? args : FALLBACK` gate (`increment-build-loop.js:111`, `frontend-alignment.js:59`, which also check different sentinel keys) | The "args are unreliable" claim is folklore (see §7.1.3); the gate turned a stringified-args pitfall into a silent wrong build | G4 |
| Path-locked parity bash (`next-decision.sh`, `decision-counts.sh`, `rule-decision.sh`, `backlog-counts.sh`) and the forced `EUDPA-*` run-id rule in `start-comparison.sh:46-49` | Hardcode `workareas/journey-builder/$RUN/`, locked DR1-U out of every reader | G5 |
| `MODEL_EXTENDER.md` | Tied to superseded journey-builder BUILD mode and its worktree | G5 |
| Free-hand LLM Edit/jq of backlog or stages state, including FA's `stageNotes` prompt block as the protection | Proven to corrupt state | §4.6 |
| LLM-edited-in-place report (`FA:1248-1279`) and hand-written SPEC-GATE markdown / `backlog.md` twins | Drifts; renumbers; a second source of truth | G §1.3, §4.2 |
| Question identity as integers in prose (`stages[].question`) | Renumbered by a rewrite; state disagrees with report | G §2 |
| Header knobs the script ignores or half-reads: `ciFixAttempts` is ignored (hardcoded 2); `reviewCap` is read by an LLM and then clamped by a constant (the planner schema asks for "At most the reviewCap from stages.json", `FA:228`, while the script hardcodes `const cap = 12`, `FA:783`) | Config should be read by the script, not by a prompt, and never silently clamped; editing `reviewCap` changes behaviour only below 12 | A §6.2 |
| Programme specifics in generic prompts: FA's `s13` id special case, direction rule copied into the planner, ins port 3002, `alignment` commit scope, PR title, workspace PR #47, Node-only docs; the loop's copy.en/cy, preceding-page E2E rule, PREFIX-FREE link builders, dispatch/contract-table checks, `npm test`/`mvn test` baseline, "animals backend is the house reference" | Every programme pays; none can switch off. Move to target profile or the plan's reading list | A §6.3, B §8 |
| Hardcoded identities: `ROOT_ABS=/Users/samfarrington/...`; `COMMIT_TRAILER` "Claude Fable 5.1" with a fixed session URL; loop trailer "Claude Opus 5 (1M context)"; stale "Fable" comments | Not portable; wrong attribution | A §3, H §5 |
| Silent-success paths: dead reviewers dropped (`filter(Boolean)`, `:1250`), dead judge → empty judgement (`:1350`, `FA:944`), fixer result ignored (`:1373`, `FA:953`) | Violates "a crashed reviewer must never read as approval" | B §3.5-3.8 |
| Claude reviewers seeing only `git diff --staged` | Miss wip-committed work on resume; Codex brief already fixed (`256f8177`) | B §3.5 |
| `continue` on baseline-red / implement-failed | Contradicts "stops at first failure" after ticket and branch exist | B §3.3 |
| `sleep 120` in the merge stage; `pkill ... ; grep` in the Codex shell; env-prefixed `create-ticket.sh`; raw `gh pr checks --watch` | Break the rails the prompts state | B §3.13, H §5 |
| `status: merged-into` + `mergedInto` + `absorbs` as hand edits, and the prose "MERGED-IN" encoding | Replace with a declared combine output | D §3.3 |
| `bornBlocked[]` duplicating `status: blocked`; stored `plan` pointer; `milestone: null` everywhere | Derived fields drift | E §6.14 |
| `origin/feat/parity-report-triage-view` loop and brief changes | Behind main; would regress seven commits and add a duplicated `movedToBoard` block | B §6 |
| Stale docs: `.claude/workflows/README.md` (pre-lifecycle; "commits but never pushes"; 7 of 17 config fields; nonexistent default workarea `shared/plant-products-ched-pp`); journey-builder SKILL.md naming EUDPA-328 as live and a `~/.claude/plans` file; build-orchestrator "Ask for anything the user has not given" and `ci-red` hard stop | Mislead agents; conflict with headless and park-and-move-on rulings | B §2, D §5.2, H §3, §6.4 |
| skill-creator appending to `.claude/settings.json`; AUDITOR and `docs/agent-skills.md` recommending Glob | `guard-edits.sh` denies the first; the proven rails ban the second | H §7.3 |
| `.gitignore` whitelist of the removed batch-orchestrator's `orchestrator-ledger.json` / `logs/batches/` | Dead | C §9.9 |

---

## 7. Hard design constraints

### 7.1 Runtime and invocation (non-negotiable)

1. **A subagent cannot invoke `Workflow`.** The implementor skill is a main-session driver. A distiller that fans out must also be launched from the main session, either as a Workflow or as main-session `Task` fan-out (H §3; the two-tier batch orchestrator died of this).
2. **Launch by `scriptPath`, never `name`** (a stale registry snapshot once rebuilt a merged increment: 57 agents, about 4.7M tokens). After launch, grep the persisted snapshot for the patched config before claiming what runs (H §1.2-1.3).
3. **Config comes from `args` only (corrected by G4).** The first draft carried the claim that "`args` do not arrive reliably, `FALLBACK` in a gitignored run copy is the real switch". That is folklore. The one reproduced failure (run `wf_06901df8-2bc`, 10 August, Claude Code 2.1.224, built `snag-002` from FALLBACK while the args string named `snag-003, snag-001`) was the documented stringified-args pitfall, and the `typeof args === 'object' ? args : FALLBACK` gate turned it into a silent wrong build. The CHED-D canary had diagnosed the same cause on 18 July; its fix (`c904fa46`, accept a JSON string) reached the trace scripts but never `increment-build-loop.js:111` or `frontend-alignment.js:59`. Scripts that read `args.X` directly with no FALLBACK ran correctly (`author-workflow.js:16`, `wf_8cc13780-b1b`, v2.1.235; `plants-spec-judges-panel`, `wf_ddfaa2ee-29f`, v2.1.261, the version of every EUDPA-409 build run). The "unreliable" comment entered with the loop's first commit (`6da2fb7e`) with no reproduction and was copied into the README, build-orchestrator, memory, H and this file. The transcript records every args call since July as a string, so it is no evidence either way. **The rule:** parse `args` if it is a string, throw on a missing required key, `log()` the resolved config first; no FALLBACK default, no run copy, no patching. Programme config lives in the backlog header. Run a zero-agent canary on the current runtime first (G4 §5).
4. **Resume** = identical `scriptPath` + identical `args` + `resumeFromRunId`. Read results from `journal.jsonl`, not the truncated notification. Give record-keeping agents a required non-empty field so "empty" never looks "dead" (165 empty results in the FA run) (H §3).
5. **Workflow size**: one increment is 22-46 agents against a default guideline of 15. Sam must raise *Dynamic workflow size* in `/config`; the agent cannot (`SKILL.md:107-109`).
6. **Workflow scripts cannot read files.** Every state read and write goes through an agent, which is exactly why the writer must be a deterministic allowlisted command rather than an agent composing jq (A §6.1). Scripts cannot import modules either (no filesystem or Node API), so a shared `lib/` module is not an option (G4).
7. **Nested workflows (G4).** `workflow({scriptPath}, args)` lets one draining parent call a per-increment child with real object args. Nesting is one level only; the child shares the parent's budget and 1000-agent cap; whether the child file is re-read per call is inferred, not documented; resume across children is undocumented, so the state-driven `resumeAt` (`increment-build-loop.js:938-946`) stays the safety net.
8. **`isolation: 'worktree'` does not help parallel implementors (G4).** `repos/` is gitignored (`.gitignore:65`), so a workspace worktree has no product checkouts, and it breaks the stack bind-mount rail. It fits only agents writing workspace files in parallel; parallel product builds need per-increment clones, as FA's `checkouts: 'clones'`.

### 7.2 Permissions and rails

1. **GUARD RAILS block first in every agent prompt**, defined once (the `FA:102-117` superset: no Grep/Glob tools; one command per call; no `&&`, `;`, `|`, `cd` or env prefixes; tilde in Bash and absolute only for Read/Write/Edit; no awk/sed; no bare node/npx/binaries, named npm scripts only; no sonar; no raw gh; never sleep; tests to a log read once; stash-only rollback, path-scoped when another session owns files; never force-push; commit with `-F`; headless decide-and-record) (H §5).
2. **Two constants, ABS and TILDE**, resolved at runtime. `guard-bash.sh:158-160` denies a literal `/Users/<user>/` in a command.
3. **Outward actions only through committed `tools/` scripts** (path-allowlisted by `Bash(~/…/tools/**)`). `gh` and `codex` are not on the project allowlist; they run only under user-level auto mode, whose classifier has refused `gh pr merge` and `gh run rerun` (H §2.1).
4. **New scripts must be committed (exec bit via `git add --chmod=+x`) before any agent runs them; never edit one mid-run.** `guard-bash.sh:106-129` refuses an uncommitted or modified path-invoked executable (H §2.3).
5. **Agents cannot edit `.claude/settings.json` or hooks** (`guard-edits.sh:37-42`). Any allow rule (`codex exec`, `gh`) is a line Sam applies by hand, or is avoided by wrapping in `tools/` (H §7.3).
6. **Deny list**: no `node` (use `npm --prefix …/tim run` or `tim` subcommands), no `curl` (Confluence/Jira via `tools/jira`, `tim`, MCP or WebFetch), no `python`, no `chmod`, no recursive `rm` (H §2.2).
7. **Sonar pre-read hook** refuses a file quoting a credential-shaped value. The distiller must not copy credential-shaped strings from sources into canonical state, or the backlog becomes unreadable to agents (H §2.3; trace workflow already redacts `fill` values, `:103-105`).
8. **Sonar is a CI concern**, never a ladder rung (unallowlisted, needs `cd`, 403s for the org). Budget a CI round-trip; most of FA's eight CI fixes were Sonar (H §6.6).

### 7.3 Codex mechanics

- `codex exec -C <TILDE> --skip-git-repo-check -s workspace-write -c sandbox_workspace_write.network_access=true --output-schema <schema> -o <lastmsg> "Read <prompt file> and follow it in full." > <log> 2>&1` (`:756`).
- Foreground only: a subagent that stops making tool calls is finalised and kills Codex with it (commit `3d4d51bf`). 570-second slices; on timeout, kill, grep `session id:`, `codex exec <flags> resume <id>`; at most 5 slices.
- `--output-schema` needs every property `required`, with optional meaning a nullable type.
- Briefs are placeholder-bound and open with "your shell is normal" (ignore the Claude rails). Absolute paths are fine inside Codex prompts, never in the Claude shell agent's Bash.
- The Codex sandbox cannot run Chromium (Mach port), so browser rungs stay with Claude (`codex/implement.md:123-132`).
- Codex review today is **one** reviewer against Claude's 2n+1, and the relay drops `confidence` and `summary`. The executor currently changes the quality bar, not just the cost (B §5.4, C §3).
- Rail defects to fix: `pkill ... ; grep` compound (`:762`), `pkill` unallowlisted. The analysts recommend a committed `tools/codex/run-stage.sh` that owns slice and resume in bash (H §4.1).
- There are **three operating modes**, not two: Claude only; Claude driving Codex for implement, review and fix; and Codex as orchestrator (a handover, `HANDOVER-CODEX.md`). Sam named the first two (H §4.2).

### 7.4 Model tiers and concurrency

- `watcher` = Haiku, low effort: resolve, preflight, baseline, land, PR, CI watch, record.
- `doer` = Sonnet: extract, implement, per-file review, verify, fix, ladder, E2E.
- `think` = Opus, high effort: requirement synthesis, conflict adjudication, combine, plan, judge, consistency review, report.
- Set `model` explicitly on every `agent()`.
- Evidence: 35 Opus / 256 Sonnet / 57 Haiku over 348 agents, 0 failures (H §1.7). The loop runs its code-editing ladder on the light tier, which is wrong (B §3.9).
- **Keep concurrent Opus fan-out to about 5 or 6 while a workflow runs**: an Opus-tier Workflow and Opus fan-out share one session window; a 33-agent judges panel hit the limit (H §1.8). This directly bounds how the distiller's panel and per-source extraction can fan out. Split big panels across turns or across Workflow phases.

### 7.5 State, resume, failure

- **One deterministic writer**, schema-validated, refusing unknown ids, never touching the header unless asked, printing before and after (skill pattern 6; H §6.2). **Corrected (G2):** generalise `tim parity ingest` / `set.js` / `io.js` / `schema.js` into a generic `tim backlog` module with parity as one profile, not journey-builder's shell scripts (tim over bash is the house rule). Per-profile data: `FINDING_TYPES`, the prose slots, required `screens`, the required `domain/band/confidence/milestone/gate`, and profile loading from `tools/parity/corpora.json`. Still to build: `dependsOn` resolution from slugs with cycle detection, setters for status, commit and rulings, and lost-update protection (§4.6).
- **Newly authored items are not buildable until verified (G5).** Ingest today makes every finding `todo` (`ingest.js:418-428`); a disputed or unverified item must be born held.
- **Persist each external artefact the moment it exists; derive resume only from persisted facts** (B §4).
- **Red work**: pushed `wip` commit under shared-branch or per-increment lifecycles; path-scoped `git stash push -u -- <paths>` under local; never `reset --hard` or `clean -fd` (memory `feedback_build_loop_rollback_non_destructive`).
- **Platform-blocked red** (missing secret, org setting): park `blocked` with the owed fix named, re-point dependants, **continue** (memory `feedback_platform_blocked_increment_park_and_move_on`). This contradicts build-orchestrator's `ci-red` hard stop on main (H §6.4).
- **"Pre-existing" or "environmental" failure claims** must be reproduced in the parent before being relayed (memory `feedback_verify_subagent_failure_claims`). FA's recorder wrote one straight into state.
- **Never idle; no increment budget**: launch the next unit before writing prose; `stopAfter` is a user ceiling, not pacing (H §3).
- **Checkouts move mid-session**: pin HEAD per repo before read-heavy phases. For the distiller, evidence citations record the SHA they were read at, and a moved citation means "re-derive", not "defect" (H §6.5). **Corrected (G3):** this is not open design work; parity already builds and tests it (§6.1 #26). What is missing is narrower: (1) no per-citation SHA in `backlog.json`, only one per-corpus pin, which breaks when pass-two citations are read at a different commit; (2) no blob comparison, so any pin movement blocks the whole check even when no cited file changed; (3) seals cover screenshots only (`sealOf`), not Confluence, documents, canvas or Jira; (4) `runHeads` never exits non-zero and no `phase.sh` phase depends on `heads`; (5) dirty-at-start is never flagged (`dr1c` was dirty, unreported); (6) `run-heads.json` stores `/Users/...` paths. Proposed reuse: each citation records `readAt: {sha, blob, dirty}`; the Plan stage compares blobs against HEAD (equal = proceed, `outOfRange` = re-cite, `missingFromFile`/`dead` = re-derive); rulings record the seal they were made against and drift warns without invalidating.

### 7.6 Branch and merge policy

- **Three proven branch strategies**:
  - per increment (loop `full`: ticket, branch, PR and merge per increment);
  - programme branch (FA: one branch and one draft PR per repo, commit per item; Sam's stated default for multi-task work, memory `feedback_stack_programme_on_one_branch`);
  - local (snagging: the orchestrator owns branches and PRs).
- Cross-repo branch-name parity always (CLAUDE.md rule 2). A long-lived branch **must sync with main every item**, including the tests repo, because GitHub runs no checks on a PR that conflicts with main (H §6.3).
- **Merge policy as programme data**, default `never` (memory `feedback_never_auto_merge_wait_for_sam` overrides any brief).
  - `on-green` needs a recorded ruling; today only EUDPA-409 has one.
  - `on-approval` caps throughput at about one increment per working day (memory `project_dr1_build_loop_throughput`).
  - Merge order backend → tests → frontend (`MERGE_RANK`), expressed for N repos as provider/consumer edges.
- Never write to CDP platform repos. A requirement implying a platform change becomes a blocked item with a hand-off for Sam (H §6.4).

### 7.7 Skill structure

- `SKILL.md` with frontmatter (`name` = folder, description ≤1024 chars with WHAT, WHEN, triggers and NOT-for).
- Lean means narrow scope, not short prose; never trim correctness-bearing detail (memory `feedback_lean_skill_means_narrow_scope`).
- `references/` personas spawned as `general-purpose` with the GUARD RAILS block inlined at the top of the spawn prompt.
- `assets/` for schemas; shared scripts under `tools/<name>/`; a `start-<name>.sh` dispatcher printing `MODE:`.
- Register in CLAUDE.md's routing index (and fix the broken table) and in `docs/reference/worker-references.md` (H §7).
- Judgement-heavy synthesis (reconcile, combine) stays in one Opus agent. Anti-pattern A5 applies: do not spread cross-cutting judgement over N parallel workers. Fan out extraction (per source) and verification (per slice) only (H §7.2). **Refined (G1):** fan out *authoring* per slice of the target, so one agent sees every source's view of that part (parity's proven shape), with a different agent verifying each slice. Keep the cross-slice duplicate sweep and the combine pass to one agent each.
- Rails placement (G4): Claude rails in CLAUDE.md or `.claude/rules/` (injected into every workflow subagent), role personas in `.claude/agents/*` via `opts.agentType`, Codex rails in `codex/*.md` (Codex sees neither CLAUDE.md nor agent definitions).

### 7.8 Reconciling "no big design up front" with two-pass distillation

Sam's standing rule is "Big design up front ain't the way; the loop builds from a thin increment" (memory `feedback_big_design_up_front_not_the_way`; `journey-builder/SKILL.md:150`: "Nobody reviews sixty plans at once"). Sam now also asks the distiller to find all requirements first and then combine them. These look like they conflict. The evidence shows they do not, provided one line holds.

**Up-front work that is fine** is working out *what* (requirements):
- all sources read;
- every requirement extracted, verified and reconciled;
- conflicts ruled or defaulted;
- atoms identified;
- related atoms combined.

This is cheap, it does not rot, because it describes intent rather than code, and it is exactly what made EUDPA-409's requirements good. The combine pass needs the whole requirement set to exist; you cannot combine what you have not found.

**Up-front work that is not fine** is working out *how* (recipes):
- file lists;
- line numbers;
- commands;
- test files;
- code shapes.

That rots on first contact with an earlier increment (plant-products: four stale-plan cases; 92 of 102 dead paths). All of it moves into the Plan stage, one item at a time, just in time, against the live tree.

**Three consequences follow for the design:**

1. **Combine on requirement-level signals, not recipe units.** EUDPA-409 combined after planning, from `filesToTouch` counts and doc line numbers (`combination-proposal.md:23, 41`), because the recipe was all it had. Before planning, file counts are unknowable. The analysts propose proxies:
   - the same surface (service, area, page group);
   - the same repo set;
   - the same `consistentWith` target;
   - shared decision or assumption refs;
   - the same acceptance boundary (one E2E journey slice);
   - combined AC count;
   - attributability ("would a red in one half be misattributed to the other?") (F P13).

   **Build it from the duplicate sweep (G1).** Parity's DUPLICATE_SWEEPER already asks "would one person, doing one piece of work, close both?", which is the combine question at the same scale, and its bookkeeping is non-destructive. Pass 2 should generalise `tim parity duplicates` plus that persona (fixing its cross-slice-only default), not start from `combination-proposal.md`.
2. **Combining is data, re-derivable after every ruling.** Atoms are kept (`atoms.json` or `grain: atomic`), combined items list `members` / `mergedFrom`, and the combine pass re-runs deterministically when a ruling adds, drops or reshapes an atom. That removes the regeneration fragility (G §8.3 step 4; E §7.3; F §7). **Mechanism (G2, G3):** ingest atoms one file each; write each combined item as a separate file carrying a `members` list, resolved to ids by the same slug-to-id step ingest already runs. Because ingest refuses to strike a ruled or started item, a regroup cannot silently lose one. The combine pass should key on stable content, as `carry-forward.js` does, not on positional ids, so ruled atoms keep their rulings when re-combined.
3. **The backlog stays thin; the combined item's plan is where size is paid.** A combined item carries the union of its members' outcomes and ACs (with their cites), never a union of recipes. The risk FA's s17 shows (a 1,076-line plan across four repos, up to 25 review agents) is bounded at combine time by a ceiling expressed in requirement terms: surfaces touched, end-state proofs, AC count. The Plan stage's `reviewFocus` cap does the rest (A §8).

There is also a **mid-build** version of combining, which is what EUDPA-409 actually did: it used measured per-run cost ("36 to 52 minutes a run", `combination-proposal.md:11`). And FA's ruling stages bundle related *answers* into one item ("there is a cost for every backlog item"). Whether the design supports only the pre-build pass or both is open question Q13.

---

## 8. Where the analysts converge

Every point below was reached independently by at least four analysts, with no analyst dissenting. The panel can treat these as the baseline and spend its time on section 9.

1. **The backlog row is a requirement.** Outcome, why, observable and provenance-tagged acceptance, constraints, out of scope, exemplars as non-binding hints, surfaces or repo keys, `dependsOn`, and a pre-build question or ruling if blocked. No file lists, commands, line numbers or test files (A §12.2, B §12, C §10.1, D §7, E §7.2, F §7, G §8, H §8).
2. **The implementor workflow gets FA's just-in-time Opus Plan stage**, writing `plans/<id>.md` in the fixed outline. It returns `reviewFocus` and `behaviourChanges`, persists the plan path deterministically, and must not own lifecycle content. The implementor (Claude or Codex) follows the plan (all eight).
3. **Ladders are programme or target data** (npm script names per repo), expanded to commands by the workflow. An item may at most add a rung (A, B, C, E, H).
4. **All state writes go through one deterministic, schema-validating writer** (a `tim` subcommand or `tools/` script). No agent composes jq over canonical state (all eight). The critic round (G2) adds that the base already exists: generalise `tim parity ingest` / `set-slot` into `tim backlog`, and add lost-update protection.
5. **Programme config and programme requirements live in the backlog header**: repos map with N named keys, branch, base, ladders, invariants, direction, standing rulings, scope exclusions, deviations, merge policy, branch strategy. They reach every reviewer and the planner (A, B, C, E, F, H).
6. **One status enum, one `gate` meaning per field, stable slug ids never renumbered**, and one question/decision record shape with a lifecycle (B, C, D, E, F, G).
7. **Two-pass distillation**: atoms first, then a requirement-level combine pass whose output is declared data that survives regeneration, with the EUDPA-409 rules, "considered and left alone" and `dependsOn` rewrites (C, D, E, F, G, H).
8. **One consolidated build workflow** that takes the loop's lifecycle, executor switch, resume model and portability and FA's plan, focused review, sync, red/retry statuses, report and state commit. Programme specifics move to a target profile. Silent-success paths throw (B, C, H, A).
9. **The report is a generated view of JSON, decision-led**, reusing parity's render machinery but requirement-first with N sources per card. Questions are records with slug ids and headlines. Rulings flow through one writer into an append-only ledger, then the combine pass re-runs, then the report re-renders (G primarily; A, D, F agree).
10. **The distiller is the union of trace-mining, the digest and parity's checking machinery**, with a target-neutral requirement store. journey-spec becomes an optional projection for journey frontends, and the panel/critic/applier is formalised into the skill (D, F, G). **Corrected (G1):** the first draft named only trace-mining and the digest; without parity's ledger, coverage, slices, yield, duplicate sweep, verifier gate and carryover, the distiller would rebuild weaker versions of them. G1 proposes a 14-phase distiller ledger mapped onto parity's phases.
11. **Port the unmerged fixes first**: the alignment branch's helpers and workflow, the snagging branch's `lifecycle: local` fix and `commitTrailer`. Do not merge the triage-view branch's loop changes (B, C, H). Do bring its DR1-U data and paths onto main (G5).

---

## 9. Open design questions for the panel

Deduplicated from all eight analyses and grouped. Where the evidence leans one way, the lean is stated with its source. It is not a decision.

### 9.1 Requirement store and schema

- **Q1. Canonical store.** Options:
  - the distiller's own `requirements.json` (target-neutral record: statement, kind, actor, acceptance, provenance, conflicts, decision, status, scope tags);
  - OpenSpec deltas under `openspec/specs/**` with `backlog.json` referencing `REQ-`/`SCN-` ids;
  - journey-spec for journeys plus a neutral store for everything else.

  *Lean:* neutral store, with journey-spec and OpenSpec as projections or links. Two stores means two lints, two gates, two reports (D §9, F Q1).
- **Q2. Where a cross-repo requirement set lives.** `workareas/shared/<programme>/` tracked in the workspace, or inside the primary repo as EUDPA-409 did (whose spec copy then split from plants main)? What does that do to CLAUDE.md rule 3 ("only `workareas/shared/` is committed", already contradicted by tracked journey-builder backlogs)? (D §9, C §9.9)
- **Q3. Schema base.** Generalise tim's parity zod schema (additive-tolerant, subtractive-strict, relax `domain/screens/band/confidence`), or write a new one? (E Q5) *Lean after the critic round (G2):* generalise schema and writer together into `tim backlog` with parity as one profile; the remaining question is what each profile declares.
- **Q4. Status placement and enum.** Five requirement statuses on the row (`todo|blocked|deferred|dropped|done`) with all phase detail (`inprogress`, `*-red`, `*-retry`, `landed`, attempts) in a script-owned `state.json`? Or FA's first-class phase statuses on the row? How does a decision-only resolution (inc-060) differ from a built `done`? (E Q1, C Q4, C §11)
- **Q5. `gate` split.** A pre-build `needs {kind, question, audience, options, consequence, buildableMeanwhile}` and a post-build `checkpoint: halt-after|walkthrough`? (E §7.2, C Q5)
- **Q6. What replaces `type`/`kind`.** One requirement-kind taxonomy (capability, rule, data, integration, reference-data, hygiene, e2e, spike), with the route (which skill or recipe) chosen by the Plan stage? Where does the branch prefix come from? (D §9, E §6.13)
- **Q7. Exemplars and `reference`.** Requirement-grade when framed as "the shape to match" (a non-binding hint or a `consistentWith` relation), or evidence only? FA's 27-entry `reference` on s17 was legitimate for an alignment. (A open questions, E Q4, F K16)
- **Q8. Size.** Keep a requirement-level size class with a stated basis, and drop every "size gates buildability" rule? What is the ceiling on a combined item, and is it bounded by surfaces touched, end-state proofs or AC count? (F Q5, A open questions)
- **Q9. Atoms after combining.** Keep `atoms.json` beside the combined `backlog.json` (auditable, re-splittable; plant-products had to split pp-044/pp-051 after the fact), or only `mergedFrom` ids? (E Q2)
- **Q10. Target data-model design.** A distiller phase (as the trace Model phase did, which then leaked `IuuNotificationDocument` into ACs) or a spike/capability item the implementor owns? (F Q2)
- **Q11. Tests-repo and E2E coverage.** Part of every item's definition of done owned by the workflow, instead of separate `e2e` items (10 hand-declared on EUDPA-409; "every add-page needed a tests-repo edit and none carried it")? (D §9)

### 9.2 Distillation process

- **Q12. Panel authority and trigger.** Is the judges panel mandatory, or triggered by conflict or source count? It cost 8 dockets × 4 agents plus a critic and applier. What may `decidedBy: panel` settle, and what must escalate to Sam (policy, legal, scope, security and data integrity, high cost of reversal)? (D §9, F Q7)
- **Q13. When combining runs.** (G1: whatever the timing, pass 2 grows out of parity's duplicate sweep.) Once pre-build over the complete atom set, automatically after every ruling, and/or mid-build with measured per-run cost (EUDPA-409)? Is it applied automatically and reported ("make the call, flag it after"), or proposed for approval (EUDPA-409 was proposal-only and ruled "as recommended")? (C Q6, F Q4, G §11)
- **Q14. Combine rules for cross-repo lockstep.** Merge backend-then-frontend and tests-with-page atoms into one item (it lands on one branch name anyway), accepting larger review fan-out? (E Q7)
- **Q15. Source types.** How are conversational sources (transcripts, chat, email, Jira comments) characterised, with what provenance (`speaker@timestamp`), and at what confidence tier? Reuse `prepare-refinement.sh` as a Jira adapter? (F P4, Q8)
- **Q16. Confidence enum.** Adopt F's `observed | stated | legacy | inferred | gap` across all source kinds? (F §7)
- **Q17. Migration.** Which live backlogs migrate (EUDPA-409, ched-pp/ched-d, frontend-alignment) and which freeze as history? Re-distil the trace backlogs from their spec and conflicts (16 etag blocks collapse to one decision), or translate them mechanically? (E Q6, F Q6) G5's lean: freeze the four parity corpora (479 increments, none built) as sources to distil from; bring DR1-U (118 of 161 built) onto main; keep `inc-NNN` stable, never change frozen `detail` or lose a ruling on re-distillation, and keep `commit` a string or null. Mind the blast radius in §4.5 (tim CI parses the tracked EUDPA-328 backlog).
- **Q18. journey-builder's future.** Refactor DIGEST in place into the generic distiller, or have the generic distiller call journey-builder's spec tools as a journey-specific projection? Retire BUILD mode and its scripts, or generalise them into run-id-agnostic state tools? (D §9, C Q10)

### 9.3 Implementor workflow

- **Q19. Cadence.** One increment per Workflow invocation (build-orchestrator: parent landed-check between items, per-item executor switch, fresh loop snapshot), or self-drain with re-derive inside one invocation (FA: no run-copy patching, picks up appended items, proved 24 stages)? Or a hybrid? H leans `drain` by default with `cadence` as programme data. C frames a hybrid (the orchestrator derives and invokes; the workflow owns plan to merge). (C Q1, H Q2) G4 makes the hybrid concrete: one draining parent re-derives the next increment, calls a per-increment child via `workflow({scriptPath}, args)` with real object args (so the executor can switch per item), and checks it landed, all in one invocation; the same child can be launched alone when Sam wants a checkpoint. Caveats in §7.1.7.
- **Q20. Plan persistence.** `plans/<id>.md` in the workarea, tracked or gitignored (EUDPA-409's `plans/` is gitignored)? It must survive a resume after a red. Optional `plans/<id>.json` for reviewer checks? (C Q2, B open questions)
- **Q21. Codex's reach.** Does Codex implement from a Claude-authored plan (Plan stays Opus)? Does Codex review become the same 2n+1 fan-out, so the executor changes only cost? Is the CI fixer delegable? Should the executor be a per-stage-role binding table rather than one flag? (B, C §3, C Q9)
- **Q22. Codex permissions.** Should Sam add `codex exec` and `gh` allow rules by hand, or should every such call be wrapped in `tools/` scripts (`tools/codex/run-stage.sh`) so the allowlist never grows? (H Q1)
- **Q23. Codex-as-orchestrator.** A supported third mode the implementor's handover emits (bindings table, "normal shell", same backlog and briefs), or a one-off? (H Q7)
- **Q24. Branch strategy and lifecycle profile.** `per-increment | programme | local` as header data. Which is the default for distilled programmes? Does ticket-per-increment survive once combining makes items larger? For combined items: one ticket with merged ACs, or several tickets on one branch? (C Q3, H Q3, B open questions)
- **Q25. Merge policy default.** `never` + draft PRs by default, with `on-green` only via a recorded ruling and `on-approval` known to cap throughput? (H Q5)
- **Q26. Red-work preservation.** Pushed `wip` commit (FA and loop under full) against stash (local, and the memory rule): which per lifecycle? (A open questions)
- **Q27. Acceptance verification.** Does the Opus consistency reviewer running the plan's invariant proofs replace a separate acceptance check? Or should the backlog's ACs be verified independently of the plan's own proofs, since a plan can prove the wrong thing? (A open questions)
- **Q28. Programme-specific knowledge.** Where do the preceding-page E2E rule, copy.en/cy, link-builder traps and the "house reference" go: target profile, `frontend-change`, or the Plan stage's reading list? (B open questions)
- **Q29. Optional phases.** Local E2E, workspace-PR E2E gate, sync-with-main and report refresh: standard phases, or profile-selected? (A open questions, B open questions)
- **Q30. Feedback channel for discovered work.** One structured channel (for example `newItems[]` / `deferred[]` in the implementor result schema, written by the orchestrator through the writer) replacing judge→`openQuestions`, the `DEFERRED:` grep and "describe it in notes"? Are new items atoms that re-enter the combine pass? (B §5.4, C §2.6)
- **Q31. Systemic halt.** Bring back journey-builder's "three consecutive failures" halt across calls? (C §9.13)

### 9.4 Report and rulings

- **Q32. Renderer.** Generalise `tim parity render` (sources as data, requirement-first cards), or build a sibling `tim` renderer sharing `theme.js`, `prose.js` and the citation/snippet machinery? (G Q1)
- **Q33. One ledger or two.** One decisions ledger shared by distillation and build, so a judge-deferred build question and a distillation question are the same record? Or separate, with promotion? (G Q2)
- **Q33a. Ruling record shape (G5).** Named slots for who ruled, when, the reason, a revisit trigger, blocks that cover a group of increments, and constraints that are not dependencies; one "awaiting a ruling" definition; `gate` means one thing (§4.5).
- **Q34. Ruling capture.** Batch ruling emits `tim` commands (house direction) and retires `rule-decision.sh`? Record the chosen option, Sam's verbatim words, `decidedBy` and date; write a tentative answer ("maybe?") as `outstanding`? Should the report print a paste-ready answer sheet keyed by slug to avoid "question 3 meant 17/18"? (G Q4, Q6)
- **Q35. Must-answer questions.** Do security, access-control and data-integrity questions become gates the builder refuses to pass, overriding decide-and-flag? The memory rule "A question is not a ruling" says they must be answered before build. (G Q5)
- **Q36. Visual evidence.** Per-question pictures from design sources (Sam: "Descriptions are lovely, but it is difficult"); which phase captures them? (G Q7)
- **Q37. Build report.** Is the implementor's per-item report refresh the same generated report (status, rulings applied, drift) as the distiller's, or a different template? Must a report refresh failure become recorded state rather than a log line? (A open questions, A §12.10)
- **Q38. Report verification.** An adversarial reader over the report prose, as parity has? Today no alignment or SPEC-GATE report is verified. (G §10) Partly answered (G1): `CLAIM_VERIFIER.md` is an existing adversarial rubric for report prose. Note its review works by `git diff` on a hardcoded EUDPA-328 path (`CLAIM_VERIFIER.md:17`), which only stays usable if derived data and journals are kept out of `backlog.json` (G5).

### 9.5 Housekeeping the programme must decide to include or not

- **Q39.** Port the alignment and snagging branch fixes to main before building (memory `feedback_check_live_branch_before_following_handover`), and close the triage-view branch's loop changes? (H Q9)
- **Q40.** Where does the single shared GUARD RAILS / PUSH_RULE / writer contract live so both workflows embed one copy? Options: a `.claude/workflows/lib/` module (if the runtime supports imports) or a `docs/` fragment. (H Q6) Partly answered (G4): imports are unsupported, so the `lib/` module option is closed (`h-rails-and-lessons.md:578`). Claude rails go in CLAUDE.md or `.claude/rules/`, personas in `.claude/agents/*`, Codex rails stay in `codex/*.md`; a zero-agent `lib` child workflow could return shared data such as schemas, at the cost of the one nesting level.
- **Q41.** Fix `docs/agent-skills.md`, skill-creator (Glob advice, settings.json edits), the CLAUDE.md routing table (missing skills, broken row) and the stale `.claude/workflows/README.md` in the same programme, since the new skills will be audited against them? (H Q8)

---

## 10. Critic round: what changed

A critic pass checked three claims against source and five gap analysts (G1-G5) looked for assets the first draft missed. Changes, by section:

**Factual corrections**

- **§5.2, §4.2 (plan pointer count).** Was "`plan` null on 13 of 24 stages although 23 plan files exist". Now: null on 14 stages (s02, s03, s04, s06, s07, s08, s10, s12, s13, s14, s15, s16, s17, s18); 13 of those have a plan file with no pointer, s13 has none.
- **§1, §5.1 R1/R5 (the recipe demand).** Was quoted as unconditional. The `filesToTouch IS the script` line is the fallback inside the frontend routing rule ("Where the increment cites a gap that no recipe covers"); the default is to follow `frontend-change` verbatim. R5 is now marked the primary recipe demand, R1 its fallback.
- **§6.4 (`reviewCap`).** Was "a header knob the script ignores". It is read by the Opus planner through its schema (`FA:228`) and then clamped by `const cap = 12` (`FA:783`); editing it changes behaviour below 12.
- **§7.1.3 (args).** Was "`args` do not arrive reliably; FALLBACK in a run copy is the real switch". Reversed: folklore traced to one stringified-args failure, silently hidden by the FALLBACK gate. New rule: args only, parse strings, throw on missing keys, log config; no FALLBACK, no run copy (G4). FALLBACK and run copies moved to §6.4 drop list.
- **§2.2(2) (requirement-only rows).** Was "cannot be built". They do build: DR1-U built 118 such rows; `readIncrement` accepts them and `band` routes when `repo` is null (G5).
- **§4.5 (ids).** Was "`sNN-slug` is the only id both stable and readable". False: tim ingest's slug-keyed `inc-NNN` already is (G2).
- **§5.1 (moved citations).** The loop's "citation whose line has moved on" defect is now also flagged as a policy conflict with parity's tested re-verify-not-fault rule (G3).
- **§6.2 #16 (target profile).** Keep `targets.json` ladder data, not `verify-increment.sh` (worktree-bound, target-repo only); header `target` is never read by the loop (G5).

**Missed assets now included**

- **Parity COMPARE/AUTHOR as a third requirements pipeline** (§1, §3.3, §6.1 #25, #28, §7.7, §7.8, §8.10, Q13, Q38): phase ledger, `coverage`/`slices`/`yield`/`duplicates` strict checks, author/verifier split with ingest refusing unverified findings, carryover, `FINDING_AUTHOR.md` small-increment rule, `CLAIM_VERIFIER.md`, `dr1c-parity/author-workflow.js` with `notRaised[]`/`premisesDisproved[]` (G1). The distiller is now the union of three, and pass 2 grows out of the duplicate sweep.
- **`tim parity ingest` as the existing writer** (§1, §3.3, §4.6, §6.1 #18-19, §7.5, §7.8.2, §8.4, Q3): generalise into `tim backlog`; still to build are `dependsOn` resolution, cycle checks, status/commit/ruling setters and lost-update protection (G2).
- **Evidence pinning already built** (§6.1 #26, §7.5, §7.8.2): heads, pins, citations read at the pin, anchor classes, seals; what is missing is per-citation `readAt`, blob comparison, non-screenshot seals, a blocking heads phase, dirty-at-start flagging and portable paths (G3).
- **DR1-U build run** (§1, §2.2, §3.1, Q17, §8.11): 118 of 161 built on `origin/feat/parity-report-triage-view`; path-locked parity bash (§2.2 #8, §6.4); authored findings buildable before verification (§2.2 #9, §7.5); three "awaiting a ruling" definitions and unwriteable ruling vocabulary (§4.5, Q33a); tim CI blast radius of a backlog reshape (§4.5); `dr1a-vs-dr1c-workflow.js` multi-source merge (§3.3, §6.1 #27) (G5).
- **Workflow runtime facts** (§7.1.6-8, §7.7, Q19, Q40): nested `workflow({scriptPath})` as the concrete Q19 hybrid; no imports, so Q40's `lib/` module option is closed; `isolation: 'worktree'` useless for product builds (G4).

---

## Appendix: file locations for the panel

- Analyses: `~/git/defra/trade-imports-workspace/workareas/shared/requirements-pipeline/analysis/{a..h}-*.md`; critic-round gap analyses `…/analysis/gap-{1..5}.md`
- Parity precedents (G1-G3, G5): `tim/src/parity/{ingest,set,io,schema,slices,heads,meta,check-evidence,anchor-check,seals,counts,carry-forward}.js`, `tim/src/parity/citations/evidence.js`, `workareas/parity-setup/phase.sh`, parity `references/{FINDING_AUTHOR,CLAIM_VERIFIER,DUPLICATE_SWEEPER}.md`, `workareas/shared/dr1c-parity/author-workflow.js`, `workareas/shared/dr1a-vs-dr1c-workflow.js`
- DR1-U (branch `origin/feat/parity-report-triage-view`): `workareas/shared/dr1-parity-union/backlog.json`, head `6688fd8e`
- Good workflow (branch `feat/NO_JIRA-frontend-alignment`): `.claude/workflows/frontend-alignment.js`, `workareas/shared/frontend-alignment/{stages.json, plans/, report.md, HANDOVER.md}`, `docs/analysis/frontend-alignment-workflow-run.md`, `tools/github/pr-ensure-draft.sh`, `tools/github-actions/wait-for-pr-checks.sh`
- Build loop (main): `.claude/workflows/increment-build-loop.js`, `.claude/workflows/codex/{implement,review,fix}.md`, `codex/schemas/{increment,findings}.json`, `.claude/workflows/README.md`
- Drivers: `.claude/skills/build-orchestrator/SKILL.md`; `.claude/skills/journey-builder/SKILL.md` + `tools/journey-builder/*`
- Distiller precedents: `.claude/skills/journey-builder/references/{SOURCE_EXTRACTOR,SPEC_RECONCILER,INCREMENT_PLANNER}.md`; `workareas/journey-builder/EUDPA-409/{RECONCILER-BRIEF.md, APPLIER-BRIEF.md, panel-*.json, combination-proposal.{md,json}, PROGRAMME-NOTES.md, backlog.json}`; `workareas/trace-requirements/*/{trace-to-requirements.workflow.js, SPEC-GATE.md, completeness-critique.md, conflicts.json, backlog.json}`; `openspec/config.yaml`
- Report precedents: `tim/src/parity/render/{page,card,sections}.js`, `tools/parity/rule-decision.sh`, `tim/src/parity/schema.js`
- Unmerged lifecycle fix: branch `chore/NO_JIRA-plants-snagging-workarea` commit `5271d04a`, `HANDOVER-CODEX.md`
