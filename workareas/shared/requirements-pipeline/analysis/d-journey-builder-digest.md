# journey-builder DIGEST and BACKLOG: the requirements distiller we already have

Analysis written 2026-09-18 on workspace `main` (`d07af6b9`). It is read-only and feeds the design for the requirements distiller and the backlog implementor.
Evidence comes from the skill files, the scripts under `tools/journey-builder/`, and the real EUDPA-409 (high-risk plants) run in
`workareas/journey-builder/EUDPA-409/`, whose spec lives in the worktree
`frontend-worktree/src/server/app/sets/high-risk-plants/spec/` (branch `spike/EUDPA-409-high-risk-plants-spec`).

---

## 1. Summary

journey-builder DIGEST is the workspace's only multi-source requirements distiller, and it works. On EUDPA-409 it took seven
sources of different kinds: a Word policy paper, two Confluence pages, four Mural screenshots, a prototype repo, the animals repo
(used only to keep plants consistent with animals) and the empty plants skeleton. From them it built a canonical spec:
29 obligations, 15 pages in 8 sections, 98 behaviours, 40 conflicts and 84 ledgered decisions. Every item carries provenance down
to paragraph, regulation clause or `file:line`. The spec was then built out: 57 increments are `done`.

The spec reaches the build through `backlog-generate.sh`, and that bridge is where the design goes wrong for Sam's goal:

* **The generator is page-mechanical and frontend-journey-specific.** It emits one `add-page` / `add-collection` increment per spec
  page. Those type names are the modes of `frontend-change`, so the increment type is an implementation route, not a requirement.
  Anything that is not a page has to be hand-declared as an "extra" (`fix|e2e|chore|restore`). On EUDPA-409, **51 of 65
  increments are extras and only 14 come from the spec.**
* **The plan layer is explicitly recipe-shaped.** `INCREMENT_PLANNER.md` writes `filesToTouch`, `acceptanceCriteria` citing file
  paths, `verification` commands and `recipe` into backlog.json. The plan for inc-027 lists 37 files with code shapes and 30 criteria.
  Planning was later made optional, "just in time" (commit `ca4bd6d8`), and increments from inc-031 on were built with no plan.
  So the workflow can already own implementation, but the persona and schema still carry the recipe.
* **The quality machinery that made EUDPA-409 good is not in the skill.** That machinery was per-run briefs overriding the
  personas, a judges panel of 8 dockets with a critic and reconciliation, an applier, and a combination (merge) pass. All of it
  was improvised as workarea files. The second "combine related increments" pass Sam wants already happened here twice, by hand, in two
  incompatible encodings. Neither survives a regeneration.

For the new design, the parts worth keeping are the extraction discipline, the conflict and decision ledger, the spec gate and the
panel. What to drop is the page-to-increment generator and the plan-as-recipe layer.

---

## 2. The pipeline as built

```
targets.json (sources[], precedence prose, repos, verify)
   │
   ▼ prepare-digest.sh              seeds workarea, worktree+spec branch, caches sources, extract.<id>.json placeholders, spec skeleton
   ▼ SOURCE_EXTRACTOR ×N (fan-out)  one agent per source → extract-add-item.sh (field|page|behaviour|note) → extract-finalize.sh
   ▼ SPEC_RECONCILER ×1             spec-add-field/page/behaviour/conflict/fieldgroup.sh → journey-spec.json + conflicts.json
   ▼ spec-lint.sh (parent re-runs)  coverage, reference resolution, cycles, decision refs
   ▼ SPEC GATE (Sam)                diff, lint counts, conflicts, modelGaps, open questions → commit on spec branch
   ▼ [rule mode] spec-add-decision.sh (+ setters/removers)    decisions.json ledger, stamped on subject
   ▼ backlog-generate.sh            page→increment, tail, model-extensions, extras spliced at anchors, linear dependsOn chain
   ▼ [plan mode] INCREMENT_PLANNER ×k → backlog-plan-increment.sh     filesToTouch/AC/verification/recipe into backlog.json
   ▼ build: (SKILL.md's own loop, now superseded by build-orchestrator + increment-build-loop.js)
```

### 2.1 Sources supported (`prepare-digest.sh:61-124`, `targets.json:23-40`)

| type | how it is acquired | cached as |
|---|---|---|
| `confluence` | `tools/confluence/page.sh <id> json`, then `.body.view.value` (body.storage is empty on some pages) | `<id>.page.json` + `<id>.body.html` |
| `canvas` | copied from the **target repo** (`$FRONTEND_REPO/$s_ref`) | `<id>.canvas` |
| `document` | copied from a **workspace-relative** path; extension kept (.docx, .pdf) | `<id>.<ext>` |
| `images` | directory copied (Mural export) | `<id>/` |
| `repo` | another checkout read live, absolute or workspace-relative; pinned to its HEAD | not cached |
| `code` | a path inside the target repo, pinned to the base sha | not cached |
| `pending` (any type, e.g. `figma`, `prototype`) | not fetched; seeded into spec `sources[]` as `status:"pending"` for a later hand-filled extract | — |

There is no support for Jira tickets or epics (EUDPA-407 was read by hand and its "out per the epic" list pasted into
`RECONCILER-BRIEF.md:72-73`). The same goes for a web URL or GOV.UK page, a SharePoint xlsx (both Confluence pages point at
workbooks that "no extractor could read": `RECONCILER-BRIEF.md:58-59`), meeting notes or transcripts, free-text chat or email,
a Figma file (declared `pending` on the live-animals target, `targets.json:91`), and a plain markdown notes file. The `canvas` type
reading from the target repo is a live-animals quirk (`targets.json:88` points at "Notes from chat with interaction design.canvas"
in the frontend repo).

How `.docx` and images are read is written into the persona, not the tooling: `SOURCE_EXTRACTOR.md:28-32`, and the
detailed rendering recipe with the sed tricks is at `SOURCE_EXTRACTOR.md:125-133`.

### 2.2 Extraction (`SOURCE_EXTRACTOR.md`, `extract-add-item.sh`, `extract-finalize.sh`)

* The four item kinds are `field`, `page`, `behaviour` and `note` (`extract-add-item.sh:5-9, 48-53`). `field` and `page` require
  `--provenance` (`:54-56`). Any key can be added with `--field K=V` or `--json K=<json>`, so each extract has an open schema.
* **"Characterise first, extract second"** (`SOURCE_EXTRACTOR.md:17-26`): a source with no section in the persona obliges the
  extractor to write the section first, covering structure, which parts carry what, the provenance scheme and the id-derivation rule.
  The finalize summary must state what structure it found. This is the single best discipline in the pipeline. Per source it produced:
  * phnns-policy: a 20-row structure table with rendered-line anchors, list numbering recovered from `numbering.xml`, and a
    provenance scheme built on statutory references (`annex:5/reg:24A(2)(aa)`) with `alsoStatedAt` for the same element stated
    three times (`SOURCE_EXTRACTOR.md:145-206`).
  * confluence-user-needs: a completeness check of "42 behaviours" and rules for implied fields and pages (`:269-290`).
  * mural: an observed colour key flagged "inferred from use, not from the legend" (`:391-400`), plus the
    requirement-versus-discussion split (`:413-418`).
  * prototype: a verified *negative* result. The grep strategy is recorded, the verdict is "no plants journey … exists", and it tells
    the next extractor what to re-check (`:480-535`).
  * live-animals: "consistency anchors, never requirements" (`:548-553`).
  * skeleton: "contributes NO journey requirements … contributes the rules a plants page must honour … and a backlog of
    repo-hygiene fix increments" (`:670-677`), with its 23 `fix-increment` notes and their evidence (see `extract.skeleton.json`).
* The characterisations were also kept per run as `rules.<source>.md` in the workarea (6 files, 62–123 lines each), and then
  pasted into `SOURCE_EXTRACTOR.md`. As a result the persona is now 790 lines and 50 KB, about 85% of it **per-source reading notes
  for two runs**. It is a knowledge base posing as a persona.
* Ground rules: "Record what the source SAYS … do NOT reconcile … do NOT resolve ambiguity. Ambiguity gets a `note` item"
  (`:41-44`). Extraction and judgement are kept separate, which is exactly right for quality.

### 2.3 Reconciliation (`SPEC_RECONCILER.md`, `spec-add-*.sh`)

* Its core job is stated as "the MODEL MAPPING: express every requirement in the obligations-v2 vocabulary" (`SPEC_RECONCILER.md:4-7`).
  **That makes the canonical spec the frontend engine's data model**: obligations, mandate, activatedBy, collection+item,
  wipeOnExit, sections, pages and gates. `spec-add-field.sh:46-53` hard-validates `--applies-at notification|commodity|unit` (the
  import-notification hierarchy) and `--kind scalar|collection`.
* Precedence is hardcoded in the persona: "confluence-v4 (fields/mandates) > skeleton (journey order/grouping) > ixd-canvas
  (behaviours)" (`:17-21`). For plants this was wrong, so a 235-line `RECONCILER-BRIEF.md` "replaces its source list, precedence and
  mapping specifics … Where the two disagree, this brief wins" (`RECONCILER-BRIEF.md:3-8`). `targets.json:183-191` carries plants
  precedence only as `_sourcesNote` prose, so no script reads it.
* **Conflicts: "EVERY disagreement gets a conflict … recorded, never blocking; pick the precedence winner and reference the conflict
  id on the obligation"** (`SPEC_RECONCILER.md:19-21`). `spec-add-conflict.sh` assigns `c-NNN` with
  `{fields[], sources[], detail, resolution:null, resolvedBy:null}`. On EUDPA-409 the detail texts cite both sides with provenance
  and record a "Provisional pick" and a "Gate question" (see `conflicts.json` c-001, c-002). Every one of the 40 is resolved, 37 by
  the panel and 3 by Sam.
* `modelGap` markers: "Do NOT force-fit what the model can't express … mark `--field modelGap=cross-frame-conditionality`"
  (`:25-30`). That is honest, but again specific to the frontend engine.
* Behaviours hold everything that is not a field or page: 73 `adopted` and 25 `parked` on EUDPA-409. `spec-add-behaviour.sh:26-29`
  only accepts `adopted|open-question` at creation, and `parked`/`rejected` arrive through rulings.
* Scope control: the plants brief spelled out IN and OUT, and OUT items are recorded as behaviours "with status `open-question`
  and an `actor`, never as pages … parked, not rejected" (`RECONCILER-BRIEF.md:62-76`). That is good, because nothing is silently dropped.

### 2.4 The spec gate and lint

* `spec-lint.sh` checks id uniqueness and path-safety, `activatedBy` resolution and cycles, collection item resolution, page and
  section uniqueness, the **coverage rule "every obligation is collected by exactly one page, OR is a member of exactly one
  collection's item[], OR is system/renderOnly"** (`:133-145`, a pre-flight of the frontend's boot guard), string booleans,
  conflict references and decision references. Advisories cover modelGaps, unresolved conflicts, unledgered resolutions and orphaned decisions.
* The string-boolean check applies only to a fixed key list (`:150`). `enforcedAtContinue` is missing from that list, and
  `commodityType.enforcedAtContinue` and `countryOfOrigin.enforcedAtContinue` are both the **string `"true"`** in the committed spec. The
  lint that exists to prevent this missed it.
* The gate itself (`SKILL.md:52-58`) is a human step: "present to Sam — the uncommitted diff …, lint counts, conflicts, modelGap
  markers, and the open design questions (wipe-vs-retain, partial page completion, address copy-vs-reference, inline comments,
  provisional copy)". The listed questions are the **live-animals** ones. Nothing renders the spec for review. There is no report,
  and the "report" is a git diff of a 280 KB JSON file.

### 2.5 Rule mode: the decision ledger (`spec-add-decision.sh`)

This is the strongest piece of design in the family:

* One call **records and applies** a ruling: "the ledger and the applied state cannot drift" (`spec-add-decision.sh:2-5`).
* The subject vocabulary is `conflict:<id>` → `resolve`, and `behaviour:<id>` → `adopt|park|reject|keep-open` (`:74-82`).
* There is one current decision per subject, and a change needs `--supersedes d-NNN`, which keeps the chain linear (`:105-118`).
* `--decided-at` is required and never read from the clock, so "a replayed session produces a byte-identical ledger" (`:27-28`).
* `decidedBy panel|sam`, `dissent` and `escalate` are all first-class.
* Setters and removers (`spec-set-field.sh`, `spec-set-page.sh`, `spec-remove-field.sh`, `spec-remove-page.sh`) refuse identity
  changes and dangling references (`SKILL.md:81-96`).

Weakness: a ruling that changes a *fact* is applied by setters, and its trace is **appended as prose into `notes`/`detail`**
(`APPLIER-BRIEF.md:43`: "append to the existing notes with ` | Ruled at <docket> (<d-id>): ...`, never replace"). Over time
`countryOfOrigin.notes` has become about 2,000 characters of layered rulings, including "superseding" clauses written inline.
`behaviour.detail` is similar: `scope-and-wipe-on-exit` restates its own parenthesis. Readable history ends up inside the
requirement text.

### 2.6 The judges panel: done on EUDPA-409 but absent from the skill

The workarea holds `panel-rulings.json`, `panel-rulings.reconciled.json`, `panel-critic.json` and `APPLIER-BRIEF.md`, and the spec
dir holds a `panel/` folder with `rulings.json`, `critic.json` and a README. Together they record what was done:

* **8 dockets** (D1 territory and timing through D8 scope and parked), each with "three judges and a chair", **83 rulings** with
  `resolution`, `rationale`, `specChanges[{target,targetKind,change}]`, `dissent`, `escalate` and `decidedBy`
  (`panel/README.md:11-15`). Every docket has a plain-English summary; see `.dockets[].summary`, which is the best human-readable
  requirements narrative anywhere in the run.
* **A consistency critic** reported coverage ("all 83 docket items received exactly one ruling"), **six substantive cross-docket
  contradictions** and five vocabulary drifts (e.g. `lateNotificationIndicator` stored in D5 but derived at read in D1), and five
  standing-ruling breaches (`panel-critic.json .summary`).
* A **reconciliation** pass folded 55 critic fixes back in (`panel-rulings.reconciled.json .reconciliation`).
* An **applier** agent then pushed each ruling through `spec-add-decision.sh` plus the setters (`APPLIER-BRIEF.md`).

None of this appears in `SKILL.md` or `references/`. The only traces are `--decided-by panel` and the README in the spec dir. It is
the quality core of the requirements phase, and it is undocumented and not reproducible from the skill.

### 2.7 Backlog mode (`backlog-generate.sh`)

It derives the backlog **mechanically, with no judgement**:

1. It emits one increment per spec page in section order. The type is `add-collection` when the page collects a collection
   obligation and `add-page` otherwise (`:204`). Empty-collects sibling pages in a section with a collection page are folded in as
   `entryPages` (`:185-199`).
2. It appends the `remove-car-section` tail and `repoint-test-fixtures`, which are prototype-programme archaeology driven by
   `targets.json backlogTail` (`:232-236`).
3. It adds `model-extension` increments for each `modelGap` (`gate:"sam"`, born blocked), then the deferred gap pages and
   `add-nested-collection` (`:221-229`).
4. It splices **extras** from `<spec_dir>/backlog-extras.json` at anchors: `start`, `end`, or `before`/`after` either
   `page:<id>` or `key:<extraKey>` (`:239-263`). The type vocabulary is locked to `fix|e2e|chore|restore` (`:126`,
   `backlog-add-extra.sh:53-56`).
5. It builds **one linear `dependsOn` chain over everything** (`:271-277`) with no real dependency analysis, because
   "increments edit shared files".
6. It numbers the result `inc-NNN` positionally, and state plus plan are preserved by **content key**
   `type:(key|page|gap|collection|section)` (`:270`, `:279-283`). It refuses to drop an increment it cannot re-derive unless
   `--force` is given (`:294-310`).
7. Milestones: `milestoneZeroSection` gives M0, pages give M1, gaps give M2 (`:34-36`).

Design strengths: reproducibility, content-key idempotency, the "lost increments" guard, extras living *beside the spec* on the
spec branch (so they are reviewed at the gate), and repo keys rather than paths.

Design weaknesses, in brief (details in section 4): page equals increment is a frontend-journey assumption, the type names are
implementation routes, the chain is linear, and the extras channel carries most of the real work as free prose.

### 2.8 Plan mode (`INCREMENT_PLANNER.md`, `backlog-plan-increment.sh`)

The persona writes into backlog.json: `title`, `kind`, `sizeGuess`, `filesToTouch[{path,action,what}]`, `acceptanceCriteria`,
`verification` (exact Bash commands), `openQuestions`, `implementorSkill`, `recipe` and `notes`.

* "The recipe's file list is your `filesToTouch` skeleton — do not invent a different one" (`INCREMENT_PLANNER.md:73-74`).
* `sizeGuess` is measured by file count: "`S`: up to three files …" (`:147-150`).
* `filesToTouch` must name "every file, repo-relative … A feature folder is listed file by file" (`:151-161`), and "The reviewers
  check the diff against this list in both directions, so a file you leave out is a finding and a file you list and never touch is
  one too" (`:159-161`).
* `backlog-plan-increment.sh:88-98` hard-requires non-empty `filesToTouch`, `acceptanceCriteria` and `verification`, and
  `implementorSkill` for add-page and add-collection (`:103-104`).

Example, `plans/inc-027.json`: 37 files, 30 criteria and 5 verification commands, with criteria such as "'commodityType' is added
to ENFORCED_AT_CONTINUE in src/server/app/bridge/obligation-source.js". That is a recipe in every sense Sam means.

Its better points are "Read the sources; quote them" (`:17-20`), "Never paraphrase a mandate into something weaker" (`:170`), and
"Plans name other increments by key or page, never by `inc-NNN`" (`SKILL.md:152-153`, learned the hard way at d-084).

Stale contradiction: `INCREMENT_PLANNER.md:7-9` says "An increment with no `sizeGuess` is withheld from every batch, so until you
finish, it cannot be built". But `SKILL.md:129-132` says a plan is optional and "the build-orchestrator skill's derive query is
status and dependencies only". The orchestrator query at `.claude/skills/build-orchestrator/SKILL.md:126` does not look at `sizeGuess`.
The evidence agrees with the skill: from inc-031 onward, most `done` increments have `sizeGuess: null` and no plan.

---

## 3. What the real EUDPA-409 output looks like

### 3.1 journey-spec.json (279 KB)

Top keys: `specVersion, journey, sources[], behaviours[], fieldGroups{}, sections[], obligations[]`.

* The obligations are rich requirement records. `countryOfOrigin` carries `mandate`, `mandateRaw` (verbatim statute), `input`
  (widget, service, `valueConstraints` by category), `label`/`labelCy`/`hint`/`hintCy`, `errorCopy`, `narrowingErrorCopy`,
  `cyaErrorCopy`, `validationRaw`, 13 `provenance` entries across 5 sources, 5 `conflicts`, an `animals` relation tag with
  `divergence`, `provisionalCopy`, and a `notes` field of about 2 KB of appended rulings.
* The **pages carry presentation and engine facts**: `pattern`, `saveActions`, `hubGroup`, `taskRow`, `runStep`, `backLink`,
  `headingByState`, `storage`, `conditionalFields` and `submitBlock`. `notification-view` has 21 keys. This blurs requirement and design:
  `runStep`, `taskRow` and `saveActions` are the engine's vocabulary, not a policy requirement.
* `sources[].status` is still `"extracting"` for all 7. No script ever flips it (`RECONCILER-BRIEF.md:168-169`: "there is no script
  to change it and it is not your concern"). The field is dead.

### 3.2 conflicts.json, decisions.json

* 40 conflicts, all resolved, each linked to a `d-NNN`. The detail quality is high: both sides are quoted with provenance, and each has a
  provisional pick and the gate question.
* 84 decisions (75 panel, 9 sam), all `current`, with 0 escalations. The rationale texts cite provenance tokens and say what was
  verified ("verified in the extracts").

### 3.3 backlog.json (65 increments)

* By type: 13 `add-page`, 1 `add-collection`, 20 `chore`, 15 `fix`, 10 `e2e` and 6 `restore`. That is **14 spec-derived and 51
  extras**. Of the extras, 17 are M0 repo hygiene (CI workflows, Dependabot, Lighthouse, depcruise) from the skeleton extract's
  `fix-increment` notes.
* By status: 57 done, 5 merged-into, 2 blocked and 1 dropped.
* **Page increments carry no `detail` at all** (`detailLen 0` for every `add-page`). The requirement is only the pointer
  `{page, section, obligations[]}` into the spec. That is sound as a *requirement reference*, but see gap 5.3.
* **Extras are prose requirements with implementation baked in.** Some are closer to requirements, for example
  `dashboard-date-submitted-real-list`: "every dashboard card shows an empty Date submitted in real mode; MI metric 6 cannot be read
  from the list". Even that one ends with "add `LocalDateTime submittedAt` to NotificationView … map `submittedAt:
  notification.submittedAt ?? null` in list-item.js". Others are pure recipe:
  * `restore-entry-guard`: "Restore the documented shape: a guardedJourneyPath filter that ignores … Tests in flow/entry-guard.test.js plus a fit case".
  * `exemplar-first-section`: "replace the first and third blocks with links to journeys/linear/features/commodities and delete the notes".
* **Hand edits outside the generator**:
  * Four keys in backlog.json are missing from `backlog-extras.json` (`engine-sync-with-animals`, `single-part-row-in-progress`,
    `real-marshal-submitted-address-name`, `remove-address-book-and-manage-account-nav-links`). Any regeneration now trips the
    "lost increments" guard.
  * Combined titles written into backlog.json (e.g. inc-032) differ from their extras' titles in `backlog-extras.json`, and the
    generator re-derives extra titles from the extras file (`backlog-generate.sh:260`), so regeneration would silently revert them.
  * `repo: null` on inc-048, inc-050, inc-052 and inc-053 "which the loop reads as frontend and tests". Yet the generator's
    multi-repo value is `both`, meaning *backend then frontend* (`backlog-generate.sh:38-41`). There are two incompatible
    encodings of "spans repos".
  * An invented `e2e` field on inc-048 holds an absorbed increment's detail.
* **Two merge encodings coexist**:
  * `combination-proposal` style: `absorbs[]` on the survivor plus `status:"merged-into"` and `mergedInto` on the absorbed
    (inc-029→030, inc-032→033/034, inc-039→040).
  * A later ad hoc style: prose `"MERGED-IN (2026-09-09): absorbed inc-049"` in notes, `e2e` field, `repo:null`. Here inc-049 has
    `status:"merged-into"` but `mergedInto:null`, and inc-048 has no `absorbs`.

  The orchestrator derive query had to be edited to withhold `merged-into` (`build-orchestrator/SKILL.md:126`), and
  `backlog-set-status.sh:29` still rejects `merged-into` as an invalid status.

### 3.4 The combination proposal: the second distillation pass, already prototyped

`combination-proposal.md` and `.json` (2026-09-07) is exactly Sam's "second distillation phase … combines related increments to
minimise the overhead". Its rules (`combination-proposal.md:13-15`):

* same repo only
* adjacent or near-adjacent in the chain
* the same slice of the codebase
* the result is still one PR a reviewer can hold, aiming at 16 files or fewer
* never two `add-page` increments; an `add-page` plus its own docs closer is allowed
* nothing touching the copy tripwires
* nothing gated or ruled to stand alone
* no crossing a milestone

It gives per-combination **evidence, combined filesToTouch, a risk rating and an opt-out**, plus a full **"Considered and left
alone"** list with a reason for each pair (`:57-75`). The JSON is apply-ready: `survivor`, `absorbs`, `dependsOnRewrites`, and the
unioned `detail`/`acceptanceCriteria`/`verification`/`notes`. It estimated 5 runs saved at 36–52 minutes each for that class of increment.

Its own caveat is also the integration gap: "If the backlog is ever regenerated from the spec, the combinations are lost with it;
the same rules would need re-applying, or the merges written into backlog-extras.json as anchors first" (`:88`).

Note also *when* it ran: after 30 increments had been built. That is post hoc, and driven by measured pipeline cost (see
`docs/analysis/merge-frontend-and-tests-increments.md`), not a planned second pass over a complete requirement set.

---

## 4. Requirement-shaped or recipe-shaped?

| Layer | Shape | Evidence |
|---|---|---|
| Extracts | **Requirement** (verbatim, provenanced, unreconciled) | `SOURCE_EXTRACTOR.md:41-44` |
| journey-spec obligations | Mostly **requirement**, expressed in the engine's data vocabulary | `SPEC_RECONCILER.md:4-7`; mandate, activatedBy, input |
| journey-spec pages | **Mixed**: requirement (title, collects, copy) plus design (runStep, taskRow, saveActions, pattern, storage, hubGroup) | `.sections[].pages[] keys` |
| Behaviours | **Requirement** (adopted, parked or rejected rules), but many embed implementation ("kit.exitTarget", "shared/kit.js:96") | behaviour `save-and-return`, `entry-guard` |
| Increment `type` | **Recipe route**: `add-page`, `add-collection` and `add-nested-collection` are frontend-change modes; `restore`/`fix`/`chore` are commit kinds, not requirement kinds | `backlog-generate.sh:204`; `SKILL.md:167-171` "invoke the target's implementorSkill with the increment's `type` as its mode" |
| Extras `detail` | **Mostly recipe**: files, functions and test names to write | `restore-entry-guard`, `exemplar-*`, `dashboard-date-submitted-real-list` |
| Plan fields | **Pure recipe**: filesToTouch, verification commands, "follow the recipe's file list" | `INCREMENT_PLANNER.md:73-74,151-161`; `plans/inc-027.json` |
| `increment-build-loop.js` reading | **Accepts both**: "It may spell the change out … It may instead state a finding … THE BACKLOG SAYS WHAT IS WRONG, AND WORKING OUT WHAT TO CHANGE IS YOUR JOB" (`increment-build-loop.js:666-680`); but frontend routing says "Where the increment cites a gap that no recipe covers, the increment's own filesToTouch IS the script" (`:1117-1119`) | |

Verdict: the *spec* is a requirement store, but everything downstream of it leans on a recipe. The workflow already tolerates
requirement-only increments, and the EUDPA-409 run proved that works (inc-031 onward built without plans).

---

## 5. How journey-specific is it? Could it generalise?

### 5.1 Parts that are already generic, or nearly so

* The prepare, cache and pin mechanics for sources (`prepare-digest.sh`), extended by adding a type.
* The extract format (`field|page|behaviour|note` with an open key set and provenance), and "characterise first".
* Conflicts (`c-NNN`), the decision ledger (`d-NNN` with supersession), and the panel, critic, reconcile and apply loop.
* Target-as-data (`targets.json`, `target-profile.sh`) and repo keys.
* Extras as declared, anchored, reviewed-at-gate increments, keyed by content.
* All writes going through validating scripts with temp-file atomic renames and a lock (`backlog-plan-increment.sh:60-71`).

### 5.2 Parts that are hard-wired to a frontend journey, or to live animals specifically

* The spec schema: `obligations`, `sections[].pages[]`, `collects`, `fieldGroups`, `appliesAt notification|commodity|unit`,
  `kind scalar|collection`, `modelGap`, `wipeOnExit`, and the coverage rule, which is the frontend's boot guard (`spec-lint.sh:133-145`).
  A backend, tooling, CI or cross-repo requirement has nowhere to live except `behaviours`, or as an "extra".
* The generator (page→increment), `backlogTail` (car-insurance archaeology), `milestoneZeroSection`, and `model-extension`
  (frontend engine only).
* `targets.json` has one repo, one `specDir` inside that repo, one `implementorSkill`, and `specBranchSuffix`. The spec lives
  **inside the frontend repo's worktree**, so a requirement set that spans repos has no neutral home.
* The personas: `SPEC_RECONCILER.md` has live-animals precedence and vocabulary (commodityLines, animal identifiers, Address
  Block). `SOURCE_EXTRACTOR.md` is dominated by per-source notes for two runs. `INCREMENT_PLANNER.md` names the plants set's recipes
  and verification rungs (`:176-183`). `MODEL_EXTENDER.md` names `engine/evaluate/predicate.js` and `spec/journey-spec.json`.
* `SKILL.md` staleness: "**EUDPA-328** is the live run" (`:20`), but EUDPA-328 is now a parity corpus. It points at a programme plan
  in `~/.claude/plans/…` (`:29`). The live-animals gate questions are at `:56-57`. Build mode (`:160-176`: next-increment →
  implementorSkill → verify-increment → commit-increment) is superseded by build-orchestrator plus `increment-build-loop.js`, which
  do not read `commitPaths` (`PROGRAMME-NOTES.md:102-110`).
* The run id must match `EUDPA-*` in every script's arg parser (`case "$1" in EUDPA-*)`), so a NO_JIRA or local run cannot use the tools.
* Workarea paths are fixed at `workareas/journey-builder/<run-id>/`.

### 5.3 Could it take "loose requirements from anywhere" for backend, tooling or cross-repo work?

Only the front half could. Extraction and the conflict and decision machinery generalise, but only if the canonical store stops
being the frontend engine's model. It needs a neutral **requirement record**: id, statement, kind
(capability/constraint/data/behaviour/non-functional/hygiene), actor, acceptance (observable outcome), provenance[], conflicts[],
decision, status (adopted/parked/rejected/open) and scope tags (repo/area). Domain-specific projections (obligations and pages for a
journey frontend) would then be *optional enrichments* rather than the schema. Today the plants run pushed everything non-page
(CI, Dependabot, the backend reference prefix, E2E, engine sync) through the `extras` side channel, which has a 4-value type
vocabulary and anchors that need a page id. That channel carried 78% of the backlog.

---

## 6. Integration gaps with the other assets

1. **The build loop never reads the spec.** `increment-build-loop.js` contains no `journey-spec`/`specDir` reference (verified by
   grep), and `frontend-change/SKILL.md` never mentions a spec. An unplanned page increment carries only `{page, section,
   obligations[]}`. Its requirement (mandates, copy, rulings) is reachable only if the implementor discovers
   `sets/<set>/spec/journey-spec.json` by itself. `PROGRAMME-NOTES.md:18-35` says "The spec is the requirement", but only the
   orchestrator parent reads that file (`build-orchestrator/SKILL.md:111`), not the loop's agents. The planner was the only bridge,
   and planning was made optional.
2. **The backlog has no single source of truth.** The spec and extras live in the worktree on a spike branch. The spec was then
   merged into plants `main` and edited there by build increments (e.g. plants commit `642c853` edits `journey-spec.json`). The
   worktree is now behind `origin/main` (7 changed lines in the spec, 2 in extras), and `.digest-meta.json spec_dir` still points
   at the worktree. `spec-lint`, `backlog-generate` and the setters would act on the stale copy.
3. **Regeneration is effectively dead on EUDPA-409.** There are 4 hand-added keys, hand-edited titles, `repo:null`, `e2e` fields and
   `merged-into` merges, and none of them round-trip through `backlog-generate.sh`. The generator's idempotency, its best property,
   is lost once humans or agents start tuning the backlog, because there is no declared channel for *merges* or *overrides*.
4. **Status vocabularies differ.** `backlog-set-status.sh:29` accepts `todo|inprogress|done|failed|blocked|dropped`,
   `next-increment.sh` only picks `todo`, and the orchestrator withholds
   `done|deferred|dropped|blocked|rejected|merged-into`. `merged-into`, `deferred` and `rejected` cannot be set by the script.
5. **Multi-repo encodings differ.** Generator `both` means backend then frontend. The loop reads `repo:null` as frontend and tests.
   Cross-repo branch parity (CLAUDE.md rule 2) and "every add-page needed a tests-repo edit and none carried it"
   (inc-050 notes: PRs #162–#186) show that the per-page increment model ignores the tests repo. The requirement "the journey's E2E
   stays green" belongs to the workflow's definition of done, not to 10 hand-declared `e2e` extras.
6. **The plan schema and the workflow's inputs overlap but don't agree.** The loop reads `flowChanges, schemaFields, copyKeys,
   specs` (`increment-build-loop.js:670-671`), which the planner never writes, and the planner writes `recipe`, which the loop
   treats as "read ONLY what the increment's recipe field cites" (`:678`). A requirement-only increment needs a defined way to point
   at its spec objects and evidence, for example `requirementRefs[]`, rather than `recipe`.
7. **parity writes the same filename with a different shape** (`SKILL.md:185-201`: finding.*, citations[], visual[], decision).
   The frontend-alignment workflow's `stages.json` (feat/NO_JIRA-frontend-alignment) uses yet another shape: `brief` (requirement
   prose), `plan` (null until the workflow writes one), `ladder`, `reference[]` and `openQuestions`, plus programme-level
   `invariants` and `rulings`. There are three backlog shapes and no shared core schema.
8. **The linear chain denies the second pass any structure.** Because every increment `dependsOn` its predecessor, the combiner
   can only merge *adjacent* items, so "related" collapses to "adjacent". The `dependsOn` it rewrites is positional, not semantic.
   Real dependencies (this page needs that obligation, this restore needs the first feature) are only recorded as prose in anchors
   and notes.
9. **The gate has no report.** Sam's stated priority is "quality … and the report it creates". The digest ends in JSON plus a git
   diff. The best narrative artefacts are the panel docket `summary` fields and `combination-proposal.md`, and both are ad hoc.
   There is no rendered view of requirements, provenance coverage, conflicts, rulings, parked scope and the backlog. `parity` has a
   renderer (`tim parity report`), and that pattern could be reused.

---

## 7. Best bits to carry into the distiller

1. **Characterise-then-extract**, with the structure written down first, and a finalize summary stating coverage and what could not
   be read (`SOURCE_EXTRACTOR.md:17-26`, `extract-finalize.sh`). Keep the per-source notes as a *library* (`rules.<source>.md`, one
   file per source), not inside the persona.
2. **Verbatim + provenance + no reconciliation at extraction**, with ambiguity becoming a `note` (`SOURCE_EXTRACTOR.md:41-44`).
   Provenance schemes are specific to each source but always present (`annex:5/reg:26(2)(e)`, `NNS-UN-021`,
   `file:blueprint/Use cases/bullet:2`, `path:line`), and `alsoStatedAt` handles an element stated in several places.
3. **Source roles as a first-class idea**: PRIMARY, SECONDARY, "consistency only, never a requirement", and "constraints, not
   requirements" (skeleton), with a stated priority order. Today this is prose in `targets.json _sourcesNote` and the brief, and it
   should become data.
4. **Every disagreement is a conflict**: recorded, never blocking, with a provisional pick and a gate question
   (`SPEC_RECONCILER.md:19-21`, `conflicts.json`).
5. **A decision ledger with record+apply in one write, supersession, and replay-stable dates** (`spec-add-decision.sh`).
6. **A judges panel by docket, then a consistency critic, then reconciliation, then an applier**, with standing product-owner rulings
   honoured and breaches detected (`panel-*.json`, `panel/README.md`). Docket summaries are the human report.
7. **Parked, not rejected** scope handling, with actor and user-need citation (`RECONCILER-BRIEF.md:69-76`).
8. **Extras declared beside the spec, reviewed at the gate, anchored, and preserved by content key.** The mechanism is good; the
   narrow type vocabulary and the page-only anchor are the limit.
9. **Content-key idempotency plus a lost-increment guard** (`backlog-generate.sh:270-310`).
10. **Script-only writes with validation, temp-file atomic rename and a mkdir lock** (`backlog-plan-increment.sh:60-71`).
11. **The combination pass rules plus a "considered and left alone" list with reasons plus apply-ready JSON**
    (`combination-proposal.md/json`). This is exactly the second distillation phase; it needs to run *before* the build, over the
    complete requirement set, and be written as a declared, re-derivable input.
12. **Planner rails that belong in the workflow's planning stage, not the backlog**: "Read the sources; quote them", "never
    paraphrase a mandate into something weaker", "never invent a value", "name other increments by key, never by id", "the spec
    wins; write the discrepancy into notes" (`INCREMENT_PLANNER.md:17-20,165-172,207-209`).
13. **The skeleton extract as a source of hygiene requirements** (23 `fix-increment` notes with evidence): treat "what exists" as a
    source that yields constraints and gap-requirements, not features.

---

## 8. Problems (ranked)

1. The canonical spec is the frontend engine's data model, so the distiller cannot hold backend, tooling or cross-repo requirements
   (`spec-add-field.sh:46-53`, `spec-lint.sh:133-145`).
2. Increment types are implementation routes (`add-page` = frontend-change mode), so the backlog is recipe-typed
   (`backlog-generate.sh:204`, `SKILL.md:167-171`).
3. The plan layer writes recipes into backlog.json (`INCREMENT_PLANNER.md`, `backlog-plan-increment.sh`), and its persona still claims
   the plan is mandatory (`INCREMENT_PLANNER.md:7-9`) while the skill says optional.
4. 78% of the backlog comes through the extras side channel as free prose, often with prescriptive steps.
5. The panel, critic, applier and combination machinery is undocumented and run by ad hoc per-run briefs, so it is not repeatable.
6. Merges and overrides are hand edits. Two merge encodings exist, one with a dangling `mergedInto:null`, and regeneration is
   effectively dead for the flagship run.
7. The build loop never reads the spec, and page increments carry no requirement text.
8. The spec location splits: the worktree copy is stale against plants `main`, and `spec_dir` points at the worktree.
9. The linear `dependsOn` chain gives no real dependency graph, so "related" means "adjacent".
10. There is no rendered requirements report at the gate.
11. Personas are bloated or stale: SOURCE_EXTRACTOR at 790 lines of run notes, SPEC_RECONCILER hardcoded to live animals, SKILL.md
    naming EUDPA-328, the live-animals gate questions and a superseded build mode.
12. There are small correctness holes: `enforcedAtContinue` stored as the string `"true"` and not caught by lint;
    `sources[].status` is never updated; `backlog-set-status.sh` cannot set `merged-into`; and the run-id parser requires `EUDPA-*`.
13. Ruling traces are appended as prose into requirement `notes` and `detail`, so the requirement text accretes history.

---

## 9. Open questions for the design

* Should the new distiller's canonical store be a neutral requirement record set (with journey-spec as an optional projection
  that the frontend increments reference), or should journey-spec stay canonical for journey work with a neutral store for
  everything else? Two stores means two lints, two gates and two reports.
* Where does the canonical requirement set live when it spans repos? The workspace (`workareas/shared/<programme>/`, tracked) or the
  primary repo (as now, inside a worktree)?
* Is the judges panel mandatory for every run, or only when the conflict count or the source count passes a threshold? It cost 8
  dockets × 4 agents plus a critic and an applier on EUDPA-409.
* Should the second (combining) pass run once before the build over all small increments, or also re-run mid-build with measured
  pipeline costs, as happened on EUDPA-409?
* What replaces `type`? A requirement kind (capability, data, behaviour, constraint, hygiene, verification), leaving the route
  (which skill, which recipe) to the workflow's planner?
* Should E2E and tests-repo coverage be a per-increment definition-of-done that the workflow owns, rather than separate `e2e`
  increments?
* How are real dependencies expressed? For example `dependsOn` by requirement key, with the generator topo-sorting instead of chaining.
* Does the frontend-alignment `stages.json` shape (brief/plan/ladder/reference/openQuestions plus programme
  invariants/rulings) become the common increment core that journey-builder, parity and alignment all write?
