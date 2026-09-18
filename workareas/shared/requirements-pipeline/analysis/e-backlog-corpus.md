# E — backlog.json corpus survey

Analyst E, 18 September 2026. Read-only survey of every real backlog in the workspace. The question is what a backlog increment actually *is* across these files, and which fields make up a clean requirement core. Everything else should move out to the workflow's plan stage or to run state.

## 0. Corpus and method

| # | File | Rows array | Rows | Origin |
|---|---|---|---|---|
| A | `workareas/journey-builder/EUDPA-288/backlog.json` | `increments` | 40 | hand-authored model retrofit |
| B | `workareas/journey-builder/EUDPA-249/backlog.json` | `increments` | 67 | `backlog-generate.sh` from a journey spec, plus hand rows |
| C | `workareas/journey-builder/EUDPA-328/backlog.json` | `increments` | 97 | parity findings (DR2.1), ingested |
| D | `workareas/journey-builder/EUDPA-328-DR1/backlog.json` | `increments` | 133 | parity findings (DR1) |
| E | `workareas/journey-builder/EUDPA-328-DR1B/backlog.json` | `increments` | 124 | parity findings (DR1, second pass) |
| F | `workareas/journey-builder/EUDPA-328-DR1C/backlog.json` | `increments` | 125 | parity findings (DR1, third pass), rulings applied |
| G | `workareas/journey-builder/EUDPA-409/backlog.json` | `increments` | 65 | journey-builder digest + extras + per-increment planner, then the build loop's state |
| H | `workareas/dryrun/loop-smoke/backlog.json` | `increments` | 1 | hand-written dry run of the loop |
| I | `workareas/shared/dr21-parity/report-v2-backlog.json` | `increments` | 58 | hand-derived from REPORT-V2-PLAN.md (tooling work) |
| J | `workareas/shared/dr21-parity/backlog.json` | `survived`/`refuted`/`discarded` | 97/1/93 | parity analyst output **before** ingest (no ids) |
| K | `workareas/address-book/EUDPA-58/backlog.json` | `increments` | 28 | design-doc-driven, v1 |
| L | `workareas/address-book/EUDPA-58/backlog-v2.json` | `increments` | 33 | design-doc-driven, v2 (Jira-ticket milestones) |
| M | `workareas/trace-requirements/iuu/backlog.json` | `increments` | 81 | trace-to-requirements distillation |
| N | `workareas/trace-requirements/ched-p/backlog.json` | `increments` | 108 | trace-to-requirements distillation |
| O | `workareas/trace-requirements/ched-pp/backlog.json` | `increments` | 42 | trace-to-requirements distillation |
| P | `workareas/trace-requirements/ched-d/backlog.json` | `increments` | 37 | trace-to-requirements distillation |
| Q | plant-products CHED-PP: `git show 0438343c:workareas/shared/plant-products-ched-pp/backlog.json` | `increments` | 102 | O (above) re-planned into a build backlog, with a per-increment planner |
| R | branch `feat/NO_JIRA-frontend-alignment`: `workareas/shared/frontend-alignment/stages.json` | `stages` | 24 | hand-authored stage briefs, workflow-owned state |

Notes on the corpus:
- `workareas/journey-builder/backlog-head.json` and `EUDPA-409/logs/backlog-head.json` are **not JSON**. They hold a bare target name (`high-risk-plants-frontend`), so they are pointers and not backlogs. `jq` fails on them with `Invalid numeric literal`.
- The `find … -path '*plant*'` probe finds only the plants frontend clone under `workareas/clones/`. The plant-products backlog was deleted from the workarea (memory `project_plant_products_chedpp.md` says so). The commit that memory names, `080efff`, no longer resolves. The last commit that touches the file is `0438343c` (4 August 2026, "the overnight build record"). It holds 102 rows. Later splits (pp-044a/b, pp-051a–d) took it to 107, but that state is not recoverable from git history. I analysed `0438343c`.
- Method: `jq` inventories of top-level keys, key frequencies per row, status/type/kind/gate/milestone vocabularies, id schemes, dependency density, and byte share by field family. Then I quoted 2–3 rows per backlog in full and classified each one.

---

## 1. Top-level (header) keys

| Backlog | Header keys |
|---|---|
| A | `run_id`, `note`, `increments` |
| B | `schema_version`, `run_id`, `increments` |
| C | `run_id`, `target`, `note`, `corpus`, `increments` |
| D/E/F | `run_id`, `target`, `corpus`, `increments` |
| G | `schema_version`, `run_id`, `target`, `increments` |
| H | `schema_version`, `run_id`, `target`, `increments` |
| I | `run_id`, `target`, `note`, `increments` |
| J | `survived`, `refuted`, `discarded` |
| K | `schemaVersion`, `epic`, `branches{repo:branch}`, `branchNotes`, `increments` |
| L | `schemaVersion`, `epic`, `generatedAt`, `milestones[{id,ticket,title,goal,blockedBy,gate,acs}]`, `increments` |
| M | `milestones[{id,name,goal}]`, `increments`, `sequencingNotes` (string) |
| N | `generated`, `regenerationOf`, `source[]`, `brief`, `milestones[]`, `sequencingNotes[]`, `scopeExclusions[]`, `deviations[]`, `bornBlocked[]`, `increments` |
| O/P | as N (P adds `journey`) |
| Q | `generated`, `brief`, `source[]`, `regenerationOf`, `scopeDecisions[{id,topic,decision,ruledBy,ruledDate,carriedFrom}]`, `deviations[{id,deviation,reason}]`, `sequencingNotes[]`, `gaps[{id,gap,bites[]}]`, `milestones[]`, `increments`, `revisions[{date,by,appliedBy,summary,changes[],backlogEffect}]` |
| R | `programme`, `purpose`, `branch`, `base`, `repos{key:{path,clonePath,github,pr}}`, `checkouts`, `workspacePr`, `rulings`, `direction`, `invariants[]`, `targetTree`, `reviewCap`, `ciFixAttempts`, `ciWatchSeconds`, `stages` **and four stray keys: `s17-auth-convergence`, `s22`, `ci`, `s24-cross-service-shape`** (see §6.7) |

What the headers show:
- There are **three spellings of the version key**: `schema_version` (B, G, H), `schemaVersion` (K, L) and none at all (A, C–F, I, M–R). None of them is ever checked, except that `backlog-generate.sh:117` validates `schema_version == 1` on the *extras* file.
- Programme context has **three homes**:
  - the backlog header: R's `branch`/`repos`/`invariants`/`direction`, and Q's `brief`/`scopeDecisions`;
  - the workflow's `FALLBACK` (`increment-build-loop.js:90-110`: `workarea`, `branch`, `repos`, `epic`, `executor`, `lifecycle`);
  - `tools/journey-builder/targets.json`.
  
  The same facts, branch and repo paths, are restated in each place.
- Only the trace-requirements family (M–P) and Q carry a **decisions/deviations/exclusions ledger** at programme level. Only R carries **invariants** and a **direction rule**. Those are the programme-level requirement artefacts a distiller should always produce (§7.1).

---

## 2. Cross-backlog increment field matrix

Cells hold the count of rows carrying the key. `·` means absent. `n/N` means present on n of N rows. The Kind column classifies each field: **Req** = requirement (what/why/acceptance), **Rec** = recipe (how), **St** = run state, **Meta** = identity, ordering or classification.

| Field | Kind | A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `id` | Meta | 40 | 67 | 97 | 133 | 124 | 125 | 65 | 1 | 58 | · | 28 | 33 | 81 | 108 | 42 | 37 | 102 | 24 |
| `title` | Req | 40 | · | 97 | 133 | 124 | 125 | 65 (some `null`) | 1 | 58 | 97 | 28 | 33 | 81 | 108 | 42 | 37 | 102 | 24 |
| `detail` / `description` / `brief` | Req (often mixed) | 40 | 30 | 97 | 133 | 124 | 125 | 53 | · | 58 | 97 | 28 `description` | 33 `description` | · | · | · | · | · | 24 `brief` |
| `type` | Meta | 40 | 67 | 97 | 133 | 124 | 125 | 65 | 1 | 58 | 97 `incrementType` | · | · | · | · | · | · | · | · |
| `kind` | Meta | · | · | · | · | · | · | 31 | 1 | · | · | · | · | 81 | 108 | 42 | 37 | 102 | 1 |
| `milestone` | Meta | 40 | 67 | 97 | 133 (all `null`) | 124 (`null`) | 125 (`null`) | 65 | 1 | · | · | 28 | 33 | 81 | 108 | 42 | 37 | 102 | · |
| `dependsOn` | Meta | 40 | 67 | 97 | 133 | 124 | 125 (0 non-empty) | 65 | 1 | 58 | · | 28 | 33 | 81 | 108 | 42 | 37 | 102 | · (file order) |
| `status` | St | 40 | 67 | 97 | 133 | 124 | 125 | 65 | 1 | 58 | · | 28 | **·** | 81 | 108 | 42 | 37 | 102 | 24 |
| `gate` | Meta/Req | 40 (5 set) | 67 (10) | 97 | 133 (all null) | 124 (null) | 125 (null) | 65 (2) | 1 | 58 (2) | · | 28 (6) | 33 (6) | 51 | 108 (74) | 42 (11) | 37 (5) | 102 (6) | · |
| `acceptanceCriteria` | Req | · | · | · | · | · | · | 31 | 1 | · | · | `acRefs` 28 | `acRefs` 33 | 81 | 108 | 42 | 37 | 102 | · |
| `openQuestions` / `openQuestion` / `blockedQuestion` | Req | · | · | · | · | · | · | 39 | 1 | · | · | · | · | 51 `openQuestion` | 108 `openQuestion` | 10 `blockedQuestion` | 4 `blockedQuestion` | 96 (+1 `openQuestionForSam`) | 24 |
| `decision {ruling,note,ruledAt,by}` | Req (ruling) | · | · | 1 | · | · | 4 | · | · | 3 | · | `rulingRefs` 28 | `conflictRefs` 33 | `conflicts` 4 | · | · | · | · | `question`+`ruling` 10 |
| `evidence` / `citations` / `screens` / `finding` | Req (provenance) | · | · | 97 | 133 | 124 | 125 | · | · | · | 97 | · | · | · | · | · | · | · | `reference` 24 |
| `band` / `confidence` / `domain` | Meta | · | · | 97 | 133 | 124 | 125 | · | · | · | 97 | · | · | · | · | · | · | · | · |
| `sizeGuess` | Meta | · | · | · | · | · | · | 31 | 1 | · | · | · | · | 81 | 108 | 42 | 37 | 92 | · |
| `repo` / `repos` | Meta | · | · | · | · | · | · | 61 | 1 | · | · | 28 `repos` | 33 `repos` | · | · | · | · | 102 | 24 `repos` |
| `recipe` | **Rec** | · | · | · | · | · | · | 31 | 1 (null) | · | · | · | · | · | · | · | · | 92 | · |
| `filesToTouch [{path,action,what}]` | **Rec** | · | · | · | · | · | · | 31 | 1 | · | · | · | · | · | · | · | · | 102 | · |
| `verification [commands]` | **Rec** | · | · | · | · | · | · | 31 | 1 | · | (evidence check, different meaning) | `tdd`/`testLegs` 28 | `tddTargets` 33 | · | · | · | · | 102 | `ladder` 24 |
| `obligations`/`flowChanges`/`schemaFields`/`copyKeys`/`specs` | **Rec** | · | 26 `obligations` | · | · | · | · | 14 `obligations` | · | · | · | · | · | · | · | · | · | 102 each | · |
| `implementorSkill` | **Rec** | · | · | · | · | · | · | 7 | · | · | · | · | · | · | · | · | · | · | · |
| `section`/`page`/`slug`/`entryPages` | Meta (spec pointer) | · | 35/47/26/1 | · | · | · | · | 14/14/14/1 | · | · | · | · | · | `pageSlug` 43 | `pageSlug` 80 | · | · | · | · |
| `notes` | mixed St/Rec | · | `note` 1 | 22 | · | · | · | 43 | 1 | `note` 9 | · | · | · | · | 1 | 8 | 5 | 102 | 24 (array) |
| `commit` | St | 40 | 67 | 97 (null) | 133 (null) | 124 (null) | 125 (null) | 63 | 1 | · | · | · | · | · | · | · | · | 89 | 24 (string **or** `{repo:sha}`) |
| `failure_reason` | St | 40 | 67 | 97 | 133 | 124 | 125 | 62 | 1 | · | · | · | · | · | · | · | · | · | · |
| `ticket`/`branch`/`prs` | St | · | · | · | · | · | · | 57/57/56 | 1/1/1 | · | · | · | 33 `ticket` (milestone's) | · | · | · | · | · | ·/·/24 |
| `key` (content key) | Meta | · | · | · | · | · | · | 51 | · | · | · | · | · | · | · | · | · | · | · |
| `absorbs` / `mergedInto` | Meta (combine) | · | · | · | · | · | · | 3 / 4 | · | · | · | · | · | · | · | · | · | · | · |
| `sourceIncrement` / `carriedFrom` / `source` / `corpus` / `slice` | Meta (provenance) | · | · | `corpus`— | 63/133/133/133 | ·/124/124/124 | ·/125/125/125 | · | · | · | · | · | · | · | · | · | · | 102 `sourceIncrement` | · |
| programme-specific extras | varies | · | `planRef` 32, `gap` 10, `collection`, `deferredNested` | · | `controls` | `controls` | `controls` | `e2e`, `absorbs` | · | · | `falsifiedBy`, `correction`, `prototypeEvidenceExtra` | `tdd`, `testLegs`, `tddExemption`, `blockedBy` | `salvageVsRebuild`, `tddTargets` | `modelGap` 29 | · | · | · | `noPlanner` 16, `engineFactEstablished`, `unmetAcceptance` | `plan`, `ci`, `e2e`, `localE2e`, `reportRefreshed`, `question`, `ruling` |

### 2.1 Vocabularies

**Status.** Seven dialects:

| Source | Values seen/allowed |
|---|---|
| Rows in A–I, K, M–Q | `todo`, `done`, `blocked`, `deferred`, `dropped`, `merged-into` |
| `tools/journey-builder/backlog-set-status.sh:2,28` | `todo \| inprogress \| done \| failed \| blocked \| dropped`. It **cannot** set `deferred`, `merged-into` or `rejected` |
| `tools/journey-builder/next-increment.sh:27-30` | picks `status == "todo"` only; `--claim` writes `inprogress` (`:46`) |
| `build-orchestrator/SKILL.md:126` | withholds `done, deferred, dropped, blocked, rejected, merged-into`. **Everything else is buildable**, `inprogress` and `failed` included. The prose at `:131` says "five withheld statuses" but the list has six |
| `frontend-alignment.js` (branch) | `todo`, `implement-failed`, `ladder-red`, `landed`, `ci-red`, `e2e-red`, `e2e-retry`, `ci-retry`, `done` |
| L (address-book v2) | **no status field at all**, so state lives nowhere in the file |
| J | none (these are pre-ingest findings) |

**Gate.** One field, at least five meanings:

| Value | Where | Meaning |
|---|---|---|
| `"sam"` | A, B, C (49), G, I, M (51), N (74), O, P | usually *pre-build*: born blocked until Sam rules (C `note`: "M2 is born blocked on a design ruling (gate: sam)… Clearing a gate is a status flip from blocked to todo"). On I inc-031, though, `gate:"sam"` with `status:"done"` is a *post-build* canary review |
| `"backend"` | C (21) | pre-build: blocked on another team's work |
| `"milestone"` | L (5) | *post-build* walk-through |
| `"model-extension"` | L, O, P | pre-build: model change needs approval |
| free text: `"HALT-FOR-REVIEW: depth-3 commo…"`, `"⏸ DEFERRED BY SAM 2026-08-04 —…"`, `"Raised by pp-012's red depth-3…"` | Q | prose, including a deferral encoded in the gate rather than the status |

The build loop reads **any non-null gate as a post-build halt** (`increment-build-loop.js:1907-1922`: "If it prints `null`… Otherwise… the run will stop"). So a `gate:"sam"` row that Sam has ruled on and flipped to `todo` gets built and then halts the run. G inc-063's notes show the workaround: "Unblocked **and un-gated** on that ruling".

**Type vs kind.** `type` is the work shape (`add-page`, `copy-change`, `flow-change`, `ground-truth`, `cutover`, `tooling`…, 40+ values across the corpus). `kind` is the branch prefix and category (`fix|chore|docs|refactor|test|feature` in `backlog-plan-increment.sh:19`). M–Q, though, use `kind` for the *work shape* (`page`, `variant`, `reference-data`, `scaffold`, `platform`, `test-infrastructure`… Q alone has 22 values). G has both, disagreeing (`type:"fix"` with `kind:"fix"`, `type:"e2e"` with `kind:"test"`).

**Ids.** `inc-NNN` (most), `inc-030d` (A suffix), `smoke-001` (H), `m0-01` (L), `pp-NNN` (Q, later split to `pp-044a`), `sNN-slug` (R), none (J). journey-builder ids are **positional and regenerated**: "Plans name other increments by key or page, never by `inc-NNN`: ids shift when an extra is added or withdrawn" (`.claude/skills/journey-builder/SKILL.md:151-153`). But `dependsOn` still names `inc-NNN`, so a regeneration has to rewrite every edge. The sNN-slug form in R is the only id that is both stable and human-readable.

**Dependency density.** C 76/97 rows have edges. F has 0/125 (parity rows are independent by design). G 62/65 (a linear chain, max 1 edge). Q 98/102 (up to 8 edges). N 107/108. R has no `dependsOn` and relies on file order. There were no dangling edges in M, N, L, F or Q. G has one merged row depending on another merged row (`inc-034 → inc-033`, both `merged-into`), and G `inc-049` is `merged-into` with `mergedInto: null`, a merge with no target.

### 2.2 Size and where the bytes go

| Backlog | Avg row bytes | Max row bytes | Recipe share\* | AC share | Notes/state share |
|---|---|---|---|---|---|
| O ched-pp (trace requirements) | 1,112 | 2,206 | 14% | **71%** | 11% |
| Q plant-products (same programme, re-planned) | **13,922** | 42,344 | **62%** | 12% | 23% |
| G EUDPA-409 | 7,918 | 40,395 | 17% | 36% | 36% |
| H loop-smoke | 2,395 | — | 25% | 38% | 32% |
| F DR1C (findings) | 9,380 | 26,573 | 1% | 0% | 1% (the bulk is `detail`/`finding`/`citations`) |
| R stages (brief vs state) | 11,588 | 23,777 | brief+ref+ruling **53 KB** | — | notes/state **217 KB** |

\*Recipe = `filesToTouch`, `specs`, `copyKeys`, `flowChanges`, `schemaFields`, `obligations`, `verification`, `recipe`, `implementorSkill`.

This is the headline number of the survey. The same CHED-PP programme was **45 KB of requirements** (O: 42 rows, 71% acceptance criteria). After a planner pass it became **1.39 MB** (Q: 102 rows, 62% recipe). Requirements shrank to 12% of the file. In R, the part of the backlog that is requirement (brief, reference, ruling) is a fifth of the file. The rest is a journal the workflow appended.

---

## 3. Per-backlog samples and classification

The labels below are **REQ** (states what and why, with observable acceptance), **REC** (states how: files, steps, code) and **MIX**.

### A — EUDPA-288 (model retrofit, hand-authored)
- `inc-001` (ground-truth): "Produce mapping.json covering all 44 both ways; machine-check totality (every A id maps, every B uuid maps, no orphans)." **REQ.** It names an output artefact and a checkable property.
- `inc-010` (oracle): "For every input in A's fixtures + reachability.js's 24-state grid (:8-20)… run A-engine and B-engine, assert identical inScope / status / wipe set." **MIX.** The outcome (a differential oracle) is a requirement. The line-cited inputs are recipe.
- `inc-030d` (cleanup): lists symbols to rename (`makeScopeFromB`, `statusOfFromB`, …), says what not to touch, and ends "Green: unit + prettier + eslint; parent runs E2E+parity." **REC**, a rename script. The requirement underneath is one sentence: "B is simply THE model now; no code or comment narrates the migration."
- Header `note`: "Consumed by next-increment.sh / verify-increment.sh / commit-increment.sh unchanged: **the loop tooling keys on id/dependsOn/status only**." This is the earliest statement of the minimal core, and it has held.

### B — EUDPA-249 (spec-generated)
- `inc-001`: `{type:"add-page", section:"start", page:"dashboard", slug:"home", obligations:[]}`. There is no title and no detail. **REQ by pointer.** The requirement lives in `journey-spec.json`, and the row is a typed reference to it. This shape is good: small, stable, and it does not restate the spec.
- `inc-041` (copy-amendment): "Origin copy (f-004, f-005): 'Does the consignment have a region of origin code?' legend…; repoint pinned assertions, never delete them." **REQ** with a finding reference. The last clause is a constraint, not a recipe.
- `inc-067`: blocked "on content from the design team (not a sam gate)". **REQ** plus a blocking reason. The gate vocabulary could not express an external dependency, so the reason went into prose.

### C / D / E / F — parity findings (DR2.1, DR1, DR1B, DR1C)
- C `inc-001` (add-section): "No page in the frontend renders a phase banner, where every DR2.1 page carries an Alpha banner…". It has `finding{frontend, prototype, difference, falsifiedBy, pass}`, `evidence{frontend, prototype}`, resolved `citations[]`, `band:"needs-design-decision"`, `confidence:"medium"` and `gate:"sam"`. **REQ**, and the strongest requirement shape in the corpus. It states the gap, the target, the evidence on both sides and what would falsify it.
- F `inc-028` (copy-change): "The frontend labels the file control 'Upload a file'; Design release 1 labels it 'Attachment'". **MIX.** `finding.difference` says "Change the file control's label… **at src/server/app/sets/live-animals/…/copy.en.js:12**. Copy only, one line, no dependency." The `difference` slot has absorbed a recipe line. `finding.verification` is *evidence* verification ("Ran the falsifier against capture/html/…"), not a build ladder, so `verification` means two different things in two families.
- F `inc-003` (dropped): `decision{ruling:"reject", note:"Descoped by Sam, 2026-08-21…", ruledAt}`. **REQ state.** The ruling record is exemplary: who, when, why, and what survives.
- F `inc-098/100/101`: `decision.ruling:"defer"`, with `status:"blocked"` and `gate:null`. A deferral is recorded three ways across the corpus: `status:"deferred"` in A and Q, `status:"blocked"` plus `decision.defer` in F, and a free-text `gate` in Q.
- D/E/F set `milestone` on every row, and every value is `null`, so the field is present and empty.

### G — EUDPA-409 (high-risk plants; the most-evolved journey-builder backlog)
- `inc-003` (fix, planned): a `detail` of one paragraph of why ("any new advisory blocks the merge check"), then:
  - `filesToTouch[{path:".github/workflows/check-pull-request.yml", action:"edit", what:"delete the 'Security audit' step…"}]`;
  - **seven** `acceptanceCriteria` that pin exact step names, `actions/checkout@v7`, `actions/setup-node@v7`, `node-version-file: .nvmrc`, the job order ("animals: pr-validator :16, security-audit :67, playwright :93"), and "exactly three top-level jobs";
  - `verification` = four `npm --prefix …` commands;
  - `recipe` = "mirror repos/trade-imports-animals-frontend/.github/workflows/check-pull-request.yml:60-87";
  - `notes` about two-space YAML indentation.
  
  **REC.** Only AC #3 ("the audit runs in parallel and a new advisory cannot turn the merge check red") and the open question (is 'Security audit' a required check in branch protection?) are requirements. The open question is the most valuable thing on the row.
- `inc-050` (add-page, generated): `{section:"review", page:"notification-view", slug, obligations:[]}` with `title:null`, plus a 1.5 KB `openQuestions` entry. The entry is a **deferred-from-review finding** that proposes a new module name, signature and helper imports (`review/lateness.js`, `(clock, commodityType, arrivalDate) -> on-time | late`, `startOfDayInZone`…). **REQ core, REC in the question.** `notes`: "the repo field is deliberately absent, **which the loop reads as frontend and tests**". That meaning of an absent field appears nowhere in the loop, which knows `frontend|backend|tests|both` (`increment-build-loop.js:282-283`).
- `inc-063` (chore): the `detail` embeds "THE WORK: find the decision in spec/decisions.json… supersede it with `tools/journey-builder/spec-add-decision.sh --supersedes`… Do NOT edit decisions.json by hand… Do NOT change bridge/status…". The `notes` then record **the recipe failing**: "decisions.json contains no decision whose id or subject is lenient-page-validation (grep: 0 hits)… `spec-add-decision.sh --supersedes` requires … `.digest-meta.json`, which does not exist… inventing a historical decision to supersede would fabricate provenance." **REC that was wrong.** Sam's requirement was one line: "engine wins, the spec is brought into line for single-part rows." The prescribed mechanism was impossible and parked the increment.
- `inc-029` `absorbs:["inc-030"]`, `inc-030` `mergedInto:"inc-029"`, `status:"merged-into"`. **The only precedent in the corpus for the combine phase Sam wants** (§7.3).

### H — loop-smoke
- `smoke-001`: "Add the NOTICE file crediting the vendored HMRC autocomplete". Its ACs describe observable file content ("first line is the repository name… names a pinned commit only if the component's own header comment in this repository cites one; otherwise the pinned-commit line is left out rather than invented"). **REQ-leaning MIX.** The ACs are outcome-shaped. `filesToTouch` (one file) and `verification` are recipe but harmless at this size. This is the closest thing to a clean core in the journey-builder family.

### I — report-v2 (tooling work)
- `inc-001` (tooling): "Rule which frontend commit the evidence pictures are taken at… Sam rules: pin to 32f6106c, or re-capture at HEAD… Record the ruling in `.corpus-meta.json pins[].pin`… Blocks every capture increment; blocks nothing in the generator." `decision{ruling:"answered", by:"sam", note, ruledAt}`. **REQ.** A decision increment with its consequence carried forward.
- `inc-031` (content, `gate:"sam"`, done): "Canary: author one decisionRequired question and show it beside the original… Cheaper to reject one than 47." **REQ.** It is a process requirement, the canary-first pattern, expressed as a backlog row.

### J — dr21-parity findings (pre-ingest)
- `survived[0]`: `title`, `screens`, `frontendEvidence`, `prototypeEvidence`, `incrementType`, `band`, `confidence`, `detail`, `falsifiedBy`, `verification` (the verifier's re-check), `correction`. **REQ, pre-distillation.** It shows the atoms *before* they became increments. There is no id, and the `correction` slot records where adversarial verification changed the claim ("Log out does have a counterpart…"). J shows a distiller's first-pass atoms are verified findings, and a second pass maps them to increments.

### K — address-book v1
- `inc-001` (scaffold): a ~3.4 KB `description` of package renames, port changes, which template classes to keep or drop, Dockerfile stages, compose file names and profiles, `compose_files_add_operators()`, `valid_labels`, env var values and AGENTS.md rows. `tdd` ("RED FIRST: … fail until the rename lands"), `testLegs{unit, integration, e2e}`, `acRefs:["b-010"]`. **REC.** It is a whole implementation plan in a description field. The one requirement in it ("CI-VISIBLE CONTRACT LOCK: workareas/ is gitignored… nothing that runs in CI… can read the workarea path") is excellent. It is a constraint with a why, and it is buried.
- `inc-006`: "GET /operators/{operator-id} — tombstones readable, and 404 is NOT a deletion signal". The description is mostly contract semantics ("'200 + status DELETED' and '404' are TWO DIFFERENT STATES… Any consumer that treats 404 as deletion will tell that user their operators were deleted"). `tdd` names the pin: the "404 problem body for an UNKNOWN id and … for a LIVE id owned by another crn are byte-for-byte identical". `acRefs:["EUDPA-286.AC1","EUDPA-293.AC2","b-010"]`, `rulingRefs:["c-018"]`. **REQ** (behaviour, why, the proof), with a light recipe (class names).

### L — address-book v2
- `m0-01`: "Rename trade-imports-operators to trade-imports-address-book in place… One rename commit BEFORE any behaviour change so the real-work diffs stay readable." `salvageVsRebuild:"salvage-modified (rename only)"`, `tddTargets`, `acRefs`, `conflictRefs`. **MIX.** Mostly recipe (class and collection names). `salvageVsRebuild` is a distiller-grade judgement about existing assets.
- `m1-06`: "Salvage delete/controller.js + delete/index.njk almost verbatim… (:29-33)… Cancel → details page no-op (:71-72)". **REC** with line numbers. `tddTargets` ("Confirm → address soft-deleted, back to list with a deletion banner") are **REQ**. The file has **no `status`**, and milestone-level `ticket` and `acs` map to Jira.

### M — IUU trace requirements
- `inc-001`: "Scaffold the standalone IUU CDP service", with ACs tagged `[inferred]` and a source citation ("(Backlog phase brief and `target-model.md`)"). **REQ.**
- `inc-021` (add-page): ACs `[confirmed] The H1 reads exactly "What is the main reason…" (journey-spec.json page about-the-consignment, verified confirmed)`. Finite options are listed exactly. `[inferred] A request test proves valid answers round-trip through the single IuuNotificationDocument…`. **REQ.** One AC lists the govuk component classes to use (`govuk-back-link`, `govuk-caption-xl`…), which is a recipe smell inside an otherwise model AC set.
- The header `sequencingNotes` is one string of distillation rules: "Every page from journey-spec.json appears exactly once… A page may be born blocked for its own unresolved human conflict… Downstream increments remain todo only when they have no gate of their own… No requirement in this backlog authorises implementing them." These are distiller invariants and should be kept.

### N — CHED-P
- `inc-011` (reference-data): "The document-type client returns exactly the verified placeholder plus 13 active choices: …", "Catch certificate is not present: it belongs to the separate IUU journey." **REQ.**
- Header `bornBlocked[0]`: "inc-012… MODEL GAP 'summary-restatement-linkage' and c-028: confirm canonical source paths… **Do not author the ruling.**" `scopeExclusions[0]`: "POST-SUBMISSION is OUT of scope: …". `deviations[0]`: "do not reproduce bespoke IPAFFS CSS widgets…". **REQ** at programme level. `bornBlocked` (74 rows) duplicates `status:"blocked"` (74) and so will drift.

### O / P — CHED-PP / CHED-D
- O `inc-020` (notification-hub, blocked): `blockedQuestion`: "This page's confidence is `gap`: no create trace exercised the hub's task-list structure… A human must confirm the hub's SECTIONS and the completeness/gating rules… **Do not author the ruling.**" ACs: "No form controls / no data captured on the hub itself", "Conditional sections… are gap-confidence — do not render them without a ruling." **REQ.** The blocked row still states what can be built.
- O `inc-040` (Article 72, blocked): "Once defined: encode the Article 72 condition as a server-side rule… Until defined: no build — flagged as an uncovered business rule." **REQ.** An honest placeholder for an unknown.

### Q — plant-products CHED-PP (O re-planned)
- `pp-020` (page, done, `sourceIncrement:"inc-011"`, 20.6 KB):
  - `recipe:"sets/live-animals/docs/add-a-page.md"`;
  - **26 `filesToTouch`** entries whose `what` includes literal code ("`export const reasons = () => Object.entries(REASON_FOR_IMPORT_LABEL).map(([value, text]) => ({ value, text }))`");
  - `obligations`, `flowChanges{sections,taskRows,entryGuard}`, `schemaFields`, 9 `copyKeys`, 6 `specs`, 12 `acceptanceCriteria` (several pin mechanism, e.g. "`oneOf` built from `purposes.reasons()` at request time, not a frozen module-level list", "redirects via `kit.nextTarget`");
  - `verification` with 6 commands, **all against `~/git/defra/trade-imports-animals/repos/...`, the pre-migration clone path**;
  - `notes` with "DECISIONS (headless)" (1)–(5), "RULINGS APPLIED", "FIXES-NOT-PORTED".
  
  **REC.** The requirement is O's `inc-011` ACs plus rulings c-006/c-014/c-018/c-004.
- Rot evidence:
  - **92 of 102** Q rows bake the old workspace path into `verification`. The workspace moved on 2026-08-18.
  - **73 done rows still carry `openQuestions`**. Questions have no lifecycle, so answered ones and moot ones sit beside live ones.
  - Commit `0baad31f` ("third stale-plan case"): pp-009 "delivered five fewer files than planned… all five were unnecessary — pp-007 had already delivered the behaviour… **Later briefs now instruct implementors to treat filesToTouch as a hypothesis**."
  - Commit `3daf3e89` ("fourth stale-plan case"): "the increment's model of idempotency was wrong — it proposed a source-scoped stub where the shipped backend keys globally."
  
  Plans written ahead of the build go stale because earlier increments change the code the plan was written against.
- Header `scopeDecisions` (SD-1 … with `ruledBy`, `ruledDate`, `carriedFrom`), `deviations` (DV-n with `reason`), `gaps` (G-x with `bites[]` naming affected increments), `revisions` (a dated ruling log with `backlogEffect`). **REQ ledger.** It is the best programme-level decision record in the corpus.

### R — frontend-alignment stages.json (the "good workflow")
- `s02-relative-imports`: `brief`: "Mechanical. Rewrite every `#/...` import… to a relative path, exactly as animals does. Remove the `imports` field from package.json. Nothing else changes. **The planner should give the implementor the rewrite rule and the file list**; this is not a stage that needs per-file review beyond a sample." `reference` holds 2 exemplar files and `ladder` is `["format:check","lint","test"]`. **REQ (outcome + exemplar + constraint)**, with a steer to the plan stage rather than the plan itself. The plan (`plans/s02-relative-imports.md`) was written by the Plan phase at run time: "158 `#/` specifiers in 57 files" (PLANNER note), decision D1 on path form.
- `s22-address-book-links`: `question: 28` and `ruling` (Sam's words, verbatim, dated). The `brief` starts "Main has done part of this already, **so measure before you build**", then states the outcome ("make the Address book navigation item work in every service"), constraints ("Do NOT rebuild or duplicate the handshake", "never edit docker/stack/.staged/"), proof ("one spec that starts in animals, follows Address book to ins's list page and follows a link back"), a human hand-off ("record … the exact cdp-app-config entries… for Sam to apply by hand") and **Out of scope** ("sharing a session between services, any change to the address-book API…"). **REQ-leaning MIX.** A few specifics (compose file, env key names) are recipe, but they are framed as facts to measure, not steps to follow. The planner re-measured and corrected the brief ("ins already works — its Address book item takes /address-book from the view context").
- Header `invariants[]` (8 programme rules: public URL surface fixed, behaviour preserved unless named, all ladders green per stage, no shared package…), `direction` (the tie-break rule), `rulings` (how ruling stages work). **REQ at programme level.**
- 217 KB of `notes` (journal), `ci`, `e2e`, `localE2e` and `reportRefreshed` sit beside 53 KB of requirement. The `plan` field is `null` on 13 of 24 stages, yet `plans/<id>.md` exists for 23 of 24 on the branch (`git ls-tree` shows every stage but s13). It is a derived pointer that nobody maintains.

---

## 4. The recipe smells, collected

| Where | Evidence | Why it is a smell |
|---|---|---|
| `tools/journey-builder/backlog-plan-increment.sh:2-31` | "Write one increment's plan — the fields increment-build-loop.js and the batch orchestrator read — **into backlog.json**… `filesToTouch [{path, action, what}]`, `verification` the ladder… as the exact Bash commands" | The *schema* of the recipe is defined as backlog fields, and this is the only validated write path, so the tooling institutionalises recipe-in-backlog |
| `backlog-plan-increment.sh:9-11` | "sizeGuess… Required — **the orchestrator withholds any increment whose sizeGuess is null**, so this is what makes an increment buildable" | Directly contradicts `build-orchestrator/SKILL.md:144-150` ("Do not infer or require a planning field… Do not write a plan into the backlog to make one look ready"). The header comment is stale and still teaches the old rule |
| `backlog-generate.sh:152` | `--argjson planned '["kind","sizeGuess","filesToTouch",…,"ticket","branch","prs"]'` | Plan fields and run state (`ticket`, `branch`, `prs`) are preserved as one family across regeneration, so recipe and state are coupled to the requirement row |
| `increment-build-loop.js:666-680` (`readIncrement`) | "It may spell the change out — filesToTouch…, obligations, flowChanges, schemaFields, copyKeys, specs, acceptanceCriteria, verification (the ladder, in order)… It may instead state a finding… Both are supported inputs." | The loop has **no plan phase**. It accepts a recipe as the brief, and at `:1117-1119` "the increment's own **filesToTouch IS the script**" |
| `increment-build-loop.js:1393-1402` | "run the increment's **"verification" array** IN ORDER" | The ladder is taken from the row, so every row must carry commands, and those commands rot (Q: 92/102 old paths) |
| `codex/implement.md:47-52, 77-80` | "Some carry a full specification — filesToTouch…" / "the increment's own `filesToTouch` **is** the script" | The Codex brief repeats the same dual contract |
| Q `pp-020` | 26 `filesToTouch` entries with literal code; `notes` "DECISIONS (headless)" | Decisions and code written before the build, then contradicted by earlier increments (commits `0baad31f`, `3daf3e89`) |
| Q `verification` ×92 | `npm --prefix ~/git/defra/trade-imports-animals/repos/...` | Environment facts baked into requirements rot when the environment moves |
| G `inc-003` | ACs pin `actions/checkout@v7`, step names, job order by line number | ACs that name mechanism rather than observable behaviour; the planner's job leaked upward |
| G `inc-063` | `detail` "THE WORK: … `spec-add-decision.sh --supersedes`… Do NOT edit decisions.json by hand" | The prescribed mechanism was impossible, so the increment parked on the recipe rather than the requirement |
| G `inc-050` `openQuestions` | proposes `review/lateness.js`, its signature and its imports | Design proposals parked inside a question |
| K `inc-001` | 3.4 KB of compose, port, env and function-name steps | A whole infrastructure plan in `description`; the true constraint (the CI-visible contract lock) is buried |
| L `m1-06` | "Salvage delete/controller.js … almost verbatim (:29-33)… (:71-72)" | Line-cited salvage instructions go stale on the first edit |
| A `inc-030d` | exact symbol rename list; "Green: unit + prettier + eslint" | A rename script with a ladder baked in |
| F `inc-028` `finding.difference` | "Change the file control's label… at …copy.en.js:12" | Mild. The finding slot carries a fix location, which is fine as evidence but should not be the instruction |
| M `inc-021` | an AC enumerating govuk CSS classes | Component choice belongs to the plan (and to the govuk toolbox rule), not the requirement |

---

## 5. What every consumer actually reads

| Consumer | Fields it genuinely keys on |
|---|---|
| `next-increment.sh:27-30` | `id`, `status == "todo"`, `dependsOn` |
| `backlog-set-status.sh` | `id`, `status`, `commit`, `failure_reason`, `dependsOn` (cascade: a failed dependency sets `blocked` on todo dependents, `:51-52`) |
| `build-orchestrator` derive query (`SKILL.md:126`) | `id`, `status`, `dependsOn`. "**Buildability is status and dependencies. Nothing else.**" (`:131`) |
| `increment-build-loop.js` | `id`, `repo` (routing + merge order `:282`), `ticket`/`branch`/`commit`/`prs` (resume `:871-941`), `gate` (halt `:1911`), `verification` (ladder), `acceptanceCriteria` (reviewers `:1212-1288`), `filesToTouch` (reviewer diff check `:1241`), `recipe` (context `:678`), `openQuestions` (judge appends `:1338`), `key` (branch naming) |
| `frontend-alignment.js` (branch) | `id`, `status`, `title` (commit subject `:1041`), `brief`, `reference`, `ladder`, `question`/`ruling`, `repos` (header), `invariants` (reviewers `:823`, `:890`), `commit`/`prs`, `ciWatchSeconds`/`reviewCap` (header) |
| `tim parity` (`tim/src/parity/schema.js:112-135`) | the **only zod-validated increment schema**: `id,type,milestone,domain,title,detail,screens,evidence,confidence,band,gate,dependsOn,status,commit,failure_reason` required, plus `decision`, `finding`, `citations`, `notes[{note,at}]`. It is "additive-tolerant, subtractive-strict" (`:11-15`) |
| `.claude/workflows/codex/schemas/increment.json` | **not a backlog schema.** It is the implementor's *result* (`ok`, `summary`, `changedFiles`, `notes`, `additionalProperties:false`). The name suggests it describes an increment, and it does not |

So the only fields every consumer needs are `id`, `status` and `dependsOn`. The loop adds `repo` and `gate`. Everything the reviewers and verifier need (acceptance, ladder, scope) can come from a requirement core plus a plan the workflow writes itself, which is what R does.

---

## 6. Problems (inconsistencies and breakage)

1. **There is no backlog schema.** Eighteen files use at least 60 distinct row keys. The only validated shape is parity-specific (`tim/src/parity/schema.js`), and it requires parity fields (`domain`, `screens`, `band`, `confidence`), so it cannot be the general schema. `backlog-plan-increment.sh` validates only the recipe fields. `codex/schemas/increment.json` is misnamed.
2. **Recipe-in-backlog is institutionalised in the tooling and contradicted in the skill.** See `backlog-plan-increment.sh:9-11` against `build-orchestrator/SKILL.md:144-150` and `journey-builder/SKILL.md:134-146` ("A plan… is optional context the loop reads when present"). Three documents give three positions on whether a plan is required.
3. **Plans go stale when written ahead of the build.** Q records four stale-plan cases (commits `0baad31f`, `3daf3e89`), and Q's own `revisions[0].backlogEffect` records re-syncing 19 row objects from per-increment files after a sweep. `journey-builder/SKILL.md:150` concedes "Nobody reviews sixty plans at once, so do not plan the whole backlog ahead of the build." R avoids this by construction: its Plan phase runs **per stage at build time** (`frontend-alignment.js:683-731`) and writes `plans/<id>.md`, re-measuring the tree first.
4. **`gate` is overloaded** (§2.1). The loop treats any non-null gate as a post-build halt (`increment-build-loop.js:1907-1922`), while most backlogs use `gate:"sam"` to mean pre-build ruling. A ruled row has to be both flipped to `todo` and have its gate nulled, a two-field protocol recorded only in G's prose.
5. **The status vocabulary is split across tools** (§2.1). `backlog-set-status.sh` cannot write `deferred`, `merged-into` or `rejected`, though the orchestrator withholds them. `next-increment.sh` picks only `todo`, but the orchestrator treats `failed` and `inprogress` as buildable. R invents nine workflow-phase statuses (`ladder-red`, `ci-retry`…), which mixes phase-of-lifecycle into the requirement's status. L has no status.
6. **Deferral has three encodings:** `status:"deferred"` (A, Q), `status:"blocked"` + `decision.ruling:"defer"` (F), and a prose `gate` (Q "⏸ DEFERRED BY SAM").
7. **Agents write state straight into the backlog through prompts**, and it breaks. R has four stray top-level keys (`s17-auth-convergence`, `s22`, `ci`, `s24-cross-service-shape`). Some hold state that disagrees with the stage (`ci.state:"red"` at root while `s24` is `done`). The workflow already warns about this at `frontend-alignment.js:150-158` ("NEVER assign a whole stage object… a previous run lost a stage's commit SHAs, PRs and every note that way"). The fix is a script-owned write path, not a prompt rule.
8. **Run state and journal outweigh the requirement.** R: 217 KB notes and state against 53 KB of brief. G: 36% notes and state. The journal has value (the report reads it), but it belongs in a run log keyed by id, not inside the requirement.
9. **Environment facts rot.** Q: 92/102 `verification` rows point at a workspace path that no longer exists. Any absolute path, SHA or line number stored in a requirement has a half-life.
10. **Id instability.** journey-builder regenerates positional `inc-NNN`, so ids shift, while `dependsOn` uses ids. G works around this with `key`. Q splits ids (`pp-044a/b`). J has no ids at all until ingest. G `inc-049` is `merged-into` with `mergedInto:null`.
11. **Open questions have no lifecycle.** Q has 73 done rows still carrying `openQuestions`. M/N have `openQuestion` (singular), O/P have `blockedQuestion`, R has `openQuestions` plus `question` (a number into report.md), and the tim schema has `finding.decisionRequired{question,audience,source,options,consequence,cites}`. That is five shapes for "a thing a human must decide". Only the last is structured enough to render and rule on.
12. **The `repo` field has hidden meanings.** "absent = frontend and tests" (G `inc-050` notes) against "`both` = backend then frontend" (`increment-build-loop.js:282`). K and L use `repos[]` with real repo names, and R uses header keys. The loop hard-requires exactly `frontend|backend|tests` (`increment-build-loop.js:179-190`), so R's five repos (`ins`, `animals`, `plants`, `tests`, `workspace`) could not run through it unchanged.
13. **`type` and `kind` collide** (§2.1). Two taxonomies share two names across families.
14. **Duplicated derived fields drift:** `bornBlocked[]` against `status:"blocked"` (N, O, P), R's `plan` pointer (null on 13 of 24 stages although 23 of 24 plan files exist), and `milestone:null` on every D/E/F row.
15. **Casing and versioning are inconsistent:** `schema_version`/`schemaVersion`/none; `failure_reason` (snake) beside `acceptanceCriteria` (camel).

---

## 7. Proposed clean core

These principles come from the corpus. They are not invented here.
- A row states **what must be true when it is done and why**, with the evidence and rulings it rests on. Working out how is the workflow's job: "THE BACKLOG SAYS WHAT IS WRONG, AND WORKING OUT WHAT TO CHANGE IS YOUR JOB" (`increment-build-loop.js:673-674`); "Thin is fine; wrong is not" (`build-orchestrator/SKILL.md:152`).
- The plan is written **per increment, at build time, by the workflow**, against the live tree (R's Plan phase). It is stored beside the backlog (`plans/<id>.md`), not inside it.
- State is written only by scripts, never by an agent hand-editing JSON (R §6.7, `codex/implement.md:107-111`: "Never edit backlog.json").

### 7.1 Programme header (written by the distiller)
```jsonc
{
  "schemaVersion": 2,
  "programme": "slug",
  "purpose": "one paragraph: outcome and who it is for",          // R.purpose, Q.brief (shortened)
  "sources": [{ "id": "src-1", "kind": "confluence|trace|design|ticket|code|conversation", "ref": "...", "readAt": "date", "notes": "..." }],  // N/O/P/Q.source[]
  "repos": { "<key>": { "path": "repos/...", "github": "DEFRA/..." } },   // R.repos; replaces loop FALLBACK.repos
  "branch": "feat/EUDPA-X-slug", "base": "main",
  "ladders": { "<repoKey>": ["format:check", "lint", "test", "test:fit"] },   // per repo, not per row (R.ladder, loop verification)
  "direction": "tie-break rule",                                   // R.direction
  "invariants": ["..."],                                           // R.invariants — reviewers check every row against these
  "decisions": [{ "id": "SD-1", "topic": "...", "decision": "...", "ruledBy": "Sam", "ruledAt": "date", "source": "src-2" }],  // Q.scopeDecisions
  "outOfScope": ["..."],                                           // N.scopeExclusions
  "deviations": [{ "id": "DV-1", "deviation": "...", "reason": "..." }],   // Q.deviations
  "milestones": [{ "id": "m1", "name": "...", "goal": "observable outcome", "checkpoint": "walkthrough|none" }],  // M/L milestones
  "increments": [ ... ]
}
```

### 7.2 Increment (requirement core)
```jsonc
{
  "id": "r-address-book-nav-link",          // stable slug, never positional, never renumbered (R's sNN-slug, G's key)
  "title": "The Address book link works from every service",   // outcome sentence
  "kind": "feature|fix|chore|refactor|test|docs",   // ONE taxonomy: branch prefix + reviewer choice
  "milestone": "m1",
  "why": "who needs it and what breaks without it",           // G inc-003 detail, K inc-006, R brief opening
  "outcome": "what is true when done, in plain words",
  "acceptance": [                                              // M/O ACs with provenance tags
    { "text": "observable behaviour", "basis": "confirmed|inferred|ruled", "cites": ["src-1#page:about-the-consignment", "SD-3"] }
  ],
  "constraints": ["must/never statements specific to this row"],   // R brief 'Do NOT rebuild the handshake', K 'CI-visible contract lock'
  "outOfScope": ["tempting neighbours"],                          // R brief 'Out of scope:'
  "evidence": [{ "ref": "c1", "kind": "code|capture|doc|trace", "where": "path or url", "lines": "41-53", "asOf": "sha", "claim": "..." }],  // C/F citations, as provenance NOT instruction
  "exemplars": ["repos/.../reference-file"],                      // R.reference — the shape to imitate, not steps
  "repos": ["animals", "tests"],                                  // explicit list of header keys; no hidden 'absent = x'
  "dependsOn": ["r-..."],
  "size": "S|M|L",                                                 // needed by the combine pass
  "needs": {                                                       // PRE-build: replaces gate:'sam'/'backend'/'model-extension'
    "kind": "ruling|external|content",
    "question": "...", "audience": "Sam|design|backend team", "options": ["..."], "consequence": "...",   // tim decisionRequiredSchema
    "buildableMeanwhile": "what can be built without the answer"   // O inc-025 'The page shell… is buildable now'
  },
  "checkpoint": "halt-after|walkthrough|null",                     // POST-build: replaces gate:'milestone'/'HALT-FOR-REVIEW'
  "decision": { "ruling": "answered|reject|defer", "note": "...", "by": "Sam", "at": "date" },   // C/F/I decision
  "mergedFrom": ["atom ids absorbed by the combine pass"],         // generalises G absorbs/mergedInto
  "status": "todo|blocked|deferred|dropped|done"                    // requirement-level only; phases live in run state
}
```

`status` stays on the row because every consumer keys on it (§5). It takes **five values only**: `todo` (buildable when deps are done), `blocked` (has an open `needs`), `deferred` (ruled not now), `dropped` (ruled never), `done`. `merged-into` disappears because merged atoms are no longer rows (§7.3). `failed` and `inprogress` become run state.

### 7.3 The small-then-combine shape Sam asked for
- **Pass 1 (atoms):** the distiller emits one atom per requirement, small and independently verifiable. J (`survived[]`) and O/M are this shape: one finding or page per atom, with evidence and provenance tags. Atoms carry ids and `acceptance`, and they are **kept** as a sibling file (`atoms.json`) so the combine pass is auditable and re-runnable.
- **Pass 2 (combine):** once every atom exists, related atoms merge into increments. The goal is to minimise per-increment overhead (ticket, branch, review fan-out, CI, PR), and the corpus supports this heavily: F has 125 independent rows, 52 of them `copy-change`, and a DR1C screen often carries 3–6 copy rows. Precedent is G `inc-029 absorbs inc-030`, `inc-032 absorbs inc-033, inc-034`, `inc-039 absorbs inc-040` ("Close the … EXEMPLAR PLACEHOLDER" rows folded into the page that proves them). The combined increment's `acceptance` is the union of its atoms' acceptance, each keeping its `cites`. `mergedFrom` lists the atom ids. Combination rules that fall out of the corpus:
  - same screen/feature and same repo set → merge (F copy-changes per domain; the C note "dependsOn chains per screen in type order");
  - an atom that only proves or documents another (G's exemplar-placeholder rows) → merge into the one it proves;
  - never merge across an open `needs` (a blocked atom stays alone so it does not block its neighbours; the M `sequencingNotes` rule "Downstream increments remain todo only when they have no gate of their own");
  - never merge across a `checkpoint`;
  - respect a size ceiling (`size` L is the cap; Q had 4 XL rows, each a sign of under-splitting);
  - cross-repo lockstep atoms (Q pp-057 + pp-059, G's "every add-page needed the tests spec") → merge, since they land on one branch anyway.

### 7.4 What moves out of the backlog

| Field family (today) | New home | Written by |
|---|---|---|
| `filesToTouch`, `flowChanges`, `schemaFields`, `copyKeys`, `specs`, implementation-level `obligations`, `recipe`, `implementorSkill`, "THE WORK" / "DECISIONS (headless)" prose | `plans/<id>.md` (+ an optional `plans/<id>.json` for reviewer diff-checks) | the workflow's **Plan** phase at build time, against the live tree (R `frontend-alignment.js:683-731`) |
| `verification` (commands) | header `ladders{repo:[scripts]}` + the plan's "invariants to prove" section; the workflow expands scripts into commands with the current path | workflow |
| `status` phases (`inprogress`, `implement-failed`, `ladder-red`, `ci-red`, `e2e-retry`…), `ticket`, `branch`, `commit`/`commits{repo:sha}`, `prs[]`, `ci`, `e2e`, `failure_reason`, `attempts` | `state.json` (or `runs/<id>.json`) keyed by increment id | scripts only (`backlog-set-status.sh` generalised); never an agent `jq` |
| `notes` journal | `runs/<id>.log.md` or `state.<id>.journal[]` with `{at, by, note}` (the tim `noteSchema` shape) | workflow phases |
| `openQuestions` raised during build | new atoms/increments with `needs` (the G inc-063 pattern: review raises it, judge defers it, it is born blocked), or `decision` on the row | judge phase → a script |
| `bornBlocked[]`, `plan` pointer, `milestone:null` | derived; do not store | — |

### 7.5 What the implementor workflow must take on in exchange
If the backlog stops carrying the recipe, `increment-build-loop.js` needs R's **Plan** phase: an opus planner that reads the row, the exemplars, the governing repo recipe (frontend-change, add-a-*.md) and the current code, then writes `plans/<id>.md`. That plan holds decisions, moves, edits, new files, tests, invariants to prove and out of scope, which is R's seven-section plan. The implementor then follows the *plan* verbatim ("filesToTouch IS the script" becomes "the plan IS the script"). The reviewers read row `acceptance` for intent and the plan for scope. This keeps the virtue of Q's plans (a script a Sonnet or Codex implementor can follow) and avoids their defect (written weeks before the code they describe). The Codex executor needs no special case, because it receives the plan file path just as it receives the backlog path today (`codex/implement.md:23`).

---

## 8. Best bits to keep, and where they are

1. **The brief/plan split and the just-in-time Plan phase** (R). `stages[].brief` + `reference` + `ruling` drive `frontend-alignment.js:683-731`, which writes `plans/<id>.md`, re-measures the tree first ("measure before you build") and records decisions so the implementor never chooses.
2. **Programme `invariants` and `direction`** (R header). Every reviewer checks them (`frontend-alignment.js:823, 890`).
3. **Ruling stages** (R `question` + `ruling`; header `rulings`). A human answer to a numbered report question becomes a new backlog row verbatim, and it is settled: "Never reopen the question, never soften the ruling" (`frontend-alignment.js:160-163`).
4. **Provenance-tagged acceptance criteria** (M–P): `[confirmed]`/`[inferred]` with a source citation on every AC.
5. **"Do not author the ruling"** and `blockedQuestion` with "buildable meanwhile" (O `inc-020`, `inc-025`; N `bornBlocked`). The distiller refuses to invent answers.
6. **Findings with a falsifier and adversarial verification** (J/C/F: `falsifiedBy`, `finding.verification`, `correction`), plus resolved `citations` with `resolution` state (`tim/src/parity/schema.js:31-69`).
7. **`decisionRequired{question, audience, source, options, consequence, cites}`** (`tim/src/parity/schema.js:71-78`). This is the right structured shape for `needs`.
8. **`decision{ruling, note, by, ruledAt}`** (C/F/I) and the programme ledger `scopeDecisions`/`deviations`/`gaps.bites`/`revisions` (Q header).
9. **`absorbs`/`mergedInto`** (G): the working precedent for the combine pass.
10. **Stable content `key`** (G) and **slug ids** (R `sNN-slug`), which survive regeneration.
11. **Traceability to Jira ACs** (K/L `acRefs`, `rulingRefs`, `conflictRefs`; L milestone `ticket` + `acs`).
12. **`salvageVsRebuild`** (L): an explicit judgement about reusing existing assets, which a distiller working from "anywhere" sources needs.
13. **Test intent stated as what must be proven** (K `tdd`: "the 404 problem body for an UNKNOWN id and … for a LIVE id owned by another crn are byte-for-byte identical"). That is a requirement-grade acceptance item, and it belongs in `acceptance`, not as test code.
14. **Spec-pointer increments** (B: `{type, section, page, slug, obligations}` with the requirement living in `journey-spec.json`). When a canonical spec exists, a row should point at it rather than restate it.
15. **Distillation invariants written down** (M `sequencingNotes`: "Every page… appears exactly once", "A page may be born blocked for its own unresolved human conflict", "No requirement in this backlog authorises implementing them").
16. **The canary increment** (I `inc-031`): "Cheaper to reject one than 47."
17. **Orchestrator rules**: "Buildability is status and dependencies. Nothing else", explicit withheld statuses that fail loudly on an unknown status, and "Thin is fine; wrong is not" (`build-orchestrator/SKILL.md:126-153`).
18. **"Never edit backlog.json; describe the new increment in notes"** (`codex/implement.md:107-111`). A planning change must not hide inside a code diff.
19. **Targeted-field state writes plus a post-write proof** (`frontend-alignment.js:150-158`). It is the right idea, but it should move from a prompt rule into a script.

---

## 9. Integration gaps (how the assets fail to tie together)

- The distillers (journey-builder digest → `backlog-generate.sh`; the trace-requirements pipeline; parity AUTHOR → ingest; hand-authored R/K/L) emit **four different row shapes**, and no one schema accepts all of them.
- `increment-build-loop.js` expects the recipe in the row (`readIncrement`, `verification` ladder, `filesToTouch` script). `frontend-alignment.js` expects a brief and plans at run time. The two workflows are incompatible on the same backlog.
- The loop's repo model is the fixed triple `frontend|backend|tests` (`:179-190`). R needs five named repos, and K/L name real repos. The header `repos{}` map should drive both.
- There is no Plan phase in the loop, so a thin requirement row, which the orchestrator explicitly calls buildable, reaches a Sonnet or Codex implementor unplanned.
- `gate` semantics differ between authoring (pre-build) and the loop (post-build halt).
- Status writes: `backlog-set-status.sh` cannot express `deferred`/`merged-into`, R's phase statuses are unknown to every other tool, and agents hand-edit state in both workflows.
- Nothing performs the **combine** pass. `absorbs`/`mergedInto` appear only because a human or orchestrator folded rows during the build (G). No distiller produces atoms and then merges them.
- `openQuestions` accumulate on rows, and each family has its own reporting path (R: report.md via `question` numbers; parity: `decisionRequired` rendered by tim; G: judge appends and halts). There is no common decision surface.
- `codex/schemas/increment.json` names the implementor output, not the backlog increment. Nothing validates the input.

## 10. Open questions for the design

1. Should `status` stay on the requirement row (every consumer keys on it) or move entirely to `state.json`, with the derive query joining the two? Keeping five requirement-level statuses on the row and all phase detail in state looks like the least disruptive option.
2. Do atoms survive as `atoms.json` next to the combined `backlog.json`, or are they folded into `mergedFrom` only? Keeping them makes the combine pass auditable and re-runnable when a ruling splits an increment again (Q had to split pp-044 and pp-051 after the fact).
3. Where does the per-repo ladder live when a repo's scripts differ by programme (Q's `test:plant-products`, R's `test:fit`)? Header `ladders` with a row-level `extraLegs` (G's `e2e`, R's `localE2e`) is one option.
4. Should `acceptance` items be allowed to name an exemplar ("same shape as animals' NOTICE", H), or only observable behaviour? H and R suggest exemplars are requirement-grade when framed as "the shape to match", but not as steps.
5. Does the parity family's zod schema become the base schema, relaxed so `domain`/`screens`/`band`/`confidence` are optional, with `schemaVersion` bumped? tim already validates subtractive-strict and additive-tolerant, which is the right policy.
6. Which programmes should be migrated to the new shape and which frozen as history? A, B, C–F, I, K, M and N are finished or parked. G, O, P, Q and R are the live candidates.
7. How should the combine pass handle cross-repo lockstep (backend then frontend, and tests on every add-page) when the loop cuts one branch name across repos anyway? Merging lockstep atoms into one increment seems right, but it raises review-fan-out size.
