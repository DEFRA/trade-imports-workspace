# Gap-fill 5: the backlog.json readers the synthesis's reader map leaves out

Scope: the consumers of `backlog.json` that the synthesis's §4.2 "Reader" column and §2.1 rows 9-12 do not name. These are the parity derive/count/rule tools, the header `target` binding, the journey-builder count and extras tools, the tim parity test suite, and the persona references. Each one is read in full below. All paths are relative to `~/git/defra/trade-imports-workspace`.

Checking these readers turned up a **larger omission than the gap brief described**. It is set out in §1 and §8. The biggest parity→build run in the estate is missing from all ten analysis files: 118 of 161 parity findings were built by build-orchestrator + `increment-build-loop.js`, from a hand-assembled union of two parity runs, on `origin/feat/parity-report-triage-view`. Its backlog sits outside the path lock described here, precisely so that it could be built. So it is also outside every parity reader.

---

## 1. Corrections to the synthesis

| # | Synthesis says | What the code and history show | Evidence |
|---|---|---|---|
| C1 | §3.1 lists four drivers. "Live; 57 EUDPA-409 increments + 3 snagging done" is the build-orchestrator scorecard. | build-orchestrator's largest run is **DR1-U**: 118 done, 34 blocked, 5 dropped, 3 deferred, 1 rejected, run by three teammates and Sam from 2026-08-21 to 2026-09-16. It is recorded in 64 commits on `origin/feat/parity-report-triage-view` (`git log -- workareas/shared/dr1-parity-union/backlog.json`, last `6688fd8e` "backlog exhausted"). No analysis file mentions `dr1-parity-union`, `dr1u` or `DR1U` (grep over `analysis/`). | `workareas/shared/dr1-parity-union/{backlog.json,PROGRAMME-NOTES.md,orchestrator-ledger.json,logs/}` on that branch |
| C2 | §2.2(2): "Requirement-shaped backlog → loop … cannot be built." | Rows shaped purely as parity requirements do build. The 161 DR1-U rows carry **no** `filesToTouch`, `verification`, `recipe` or `acceptanceCriteria`, and `repo` is null on 157. 118 landed through Jira, PR, CI and merge. The loop already supports it: `readIncrement` says "It may instead state a finding and cite the evidence for it, and leave the change to you … THE BACKLOG SAYS WHAT IS WRONG, AND WORKING OUT WHAT TO CHANGE IS YOUR JOB" (`increment-build-loop.js:666-678`). The repo fallback reads the parity `band` (`:949-955`: `frontend-work` → frontend+tests, `needs-backend` → backend+frontend+tests). The *trace* backlogs are unbuildable for their own reasons (no `band`, no `dependsOn` in places). Requirement-shaped rows are not unbuildable in general. | `jq` over the DR1-U backlog: `rowkeys` has no recipe fields; `repo: {null:157, frontend:4}` |
| C3 | §4.2: `band` is a parity/report field ("Reader: report"). | `band` is a **loop reader**: it is the repo-routing fallback (`increment-build-loop.js:951-955`). Changing or dropping the band vocabulary silently changes which repos get branched. | as above |
| C4 | Row 16 and §6 name the "target-profile ladder (`verify-increment.sh` + `targets.json`)" as the home for FA's npm-script ladder. | The target profile holds the ladder **data**, and the shape is right: `verify.{unit,format,lint,e2e}` as npm script names (`targets.json`). The **runner** cannot be reused as it stands. `verify-increment.sh:32-36` needs `.digest-meta.json` `.worktree` (only EUDPA-249/288/409 have one; no parity run does), and it runs every rung in that one worktree (`:43`). So it ladders the target repo only, never backend or tests. The loop reads neither `target` nor `targets.json` (grep of `increment-build-loop.js` and the build-orchestrator SKILL.md: zero hits). The binding exists only in the superseded journey-builder BUILD path. | `tools/journey-builder/verify-increment.sh:28-60`, `target-profile.sh:31-36,75-78` |
| C5 | §2.1 row 12: "`rule-decision.sh` (parity, EUDPA-* only)" is the parity rulings mechanism. | The live rulings practice has moved past the tool. DR1-U records `decision.ruling` values `block` (32) and `defer`, and statuses `deferred` and `rejected`. `rule-decision.sh:38` accepts only `accept\|reject\|defer\|falsified\|note`, and `:69-74` writes only `todo\|dropped\|blocked`. So those rulings were hand-edits. `tim parity`'s `isWithdrawn` treats only `dropped` or a `falsified` ruling as withdrawn (`tim/src/parity/counts.js:10,32-34`). A `rejected` DR1-U row would therefore count as live work if a report were ever rendered. | DR1-U `dec` tally; PROGRAMME-NOTES "Disputed increments are deferred to their own pass" |
| C6 | "40 files" read `backlog.json` (the grep). | The literal grep undercounts. Nine more non-test tim modules read or write the backlog through `profile.paths.backlog` / `parseBacklog`: `check.js`, `set.js`, `counts.js`, `load.js`, `anchors.js`, `split-sentinels.js`, `normalise.js`, `render/run.js`, `citations/run.js`. Two more test files do too: `normalise.test.js` and `schema.test.js`. | `grep -rlE "paths\.backlog\|parseBacklog\|normaliseBacklog" tim/src` |
| C7 | The parity↔journey-builder handoff contract is "`status`, `gate`, `dependsOn`" (parity SKILL.md:921-931; journey-builder SKILL.md:185-201). | That contract **was not enough in practice**. The AUTHOR pipeline births every finding `status:"todo"`, `gate:null`, `dependsOn:[]` (`tim/src/parity/ingest.js:418-428`). A `disputed` finding is therefore buildable the moment it is ingested. DR1C today has 3 `disputed` rows at `todo`. DR1-U had to add a hand ruling: "Every `disputed`-band increment is held out … carries the status `deferred` … Until then they must not be swept back in by a run that only reads statuses" (PROGRAMME-NOTES.md). DR1-U also records an ordering constraint that is "*not* in its `dependsOn`" (`inc-103`). Readiness lives in `band`, but only the repo router reads `band`. | `jq` on DR1C: `disputed n:5 todo:3` |
| C8 | The union/combine concept exists only as the EUDPA-409 `combination-proposal`. | A second, stronger combine precedent exists for **multiple complementary sources**. `workareas/shared/dr1a-vs-dr1c-workflow.js` (branch only) runs a Match phase per subject area and then an adversarial Judge of every one-sided claim. Its identity test is: "if a person doing the work would write the same diff, they are the same finding however differently they are worded". The assembly brief (`workareas/shared/dr1u-parts/BRIEF.md`, untracked on this checkout) then writes a `provenance{sourceA,sourceC,origin,note,better,judged}` block onto every union row. This is a working, re-runnable prototype of the "merge complementary sources" step Sam asked for. | branch files above; `workareas/shared/dr1u-parts/` |

Spot-checks the brief passed are confirmed as stated and not repeated here.

---

## 2. Reader and writer inventory (the omitted ones)

Legend: **PL** = path lock to `workareas/journey-builder/<RUN>/backlog.json`. **G** = argument glob.

| Tool | Reads / writes | PL | Id and run globs | Fields it depends on | Statuses it knows |
|---|---|---|---|---|---|
| `tools/parity/next-decision.sh` | R | `:29` | `EUDPA-*` (`:20`) | `status`, `gate`, `decision`, `domain`, `type`, `title`, `detail`, `finding.{decisionRequired.{question,options,consequence,source},frontend,prototype,difference,correction,falsifiedBy}`, `citations[].{ref,asWritten}` (unmark, `:59-62`), `notes[].{note,at}`, `evidence.{frontend,prototype}`, `screens`, `confidence` (`:32-106`) | walks only `blocked` + `gate == $gate` (default `sam`, `:17`) + undecided |
| `tools/parity/decision-counts.sh` | R | `:12` | `EUDPA-*` implicit in usage | `decision.ruling`, `status`, `gate`, `domain` (`:15-29`) | "awaiting" = `blocked` ∧ ¬`decision` (gate ignored) |
| `tools/parity/rule-decision.sh` | **W** | `:48` | `EUDPA-*` (`:36`), **`inc-*`** (`:37`) | writes `status`, `decision{ruling,note,ruledAt}`, `gate=null` on accept, `notes[]`, strips `dependsOn` on falsified (`:80-99`) | writes `todo`, `dropped`, `blocked` only |
| `tools/parity/scaffold-corpus.sh` | writes the **path** of the backlog into `corpora.json` | `:98` hardcodes `RUN_DIR="workareas/journey-builder/$RUN_ID"`, `:177` `backlog: $dir/backlog.json` | `--run-id` | the corpus entry: `backlog`, `deferred`, `meta`, `evidence`, `reportDir`, `bands`, `requireVerification` (`:174-201`) | none |
| `tools/parity/start-comparison.sh` / `setup-add-answer.sh` | none directly, but **enforce the glob because of the tools above** | — | `start-comparison.sh:46-49`: "Run id must start EUDPA- … next-decision.sh and rule-decision.sh match EUDPA-* as a glob, so anything else breaks them silently later"; `setup-add-answer.sh:39-40` | — | — |
| `tools/parity/corpora.json` | registry: every corpus's `backlog` path | all 4 corpora point under `workareas/journey-builder/EUDPA-328*` | `default: "dr21"` | also `upstreamFindings` → `workareas/shared/dr21-parity/backlog.json`, which is **not** a backlog (`{survived, refuted, discarded}`), read by `tim/src/parity/load.js:180-181` via a title join | — |
| `tim/src/parity/corpus-profile.js:85-101` | R (the header `corpus`) | fallback only: `join(workspaceRoot,'workareas','journey-builder',runId)` (`:88`); the profile path itself is configurable (`:208`) | — | header `corpus`; then `.corpus-meta.json`; then `corpora[*].runId` | — |
| `tim/src/parity/ingest.js` | **W** (whole file) | via profile | ids **`inc-NNN`** only (`:288, 292, 331`) | writes header `run_id`, `target`, `corpus` (`:603-610`); births `status:'todo'`, `gate:null`, `dependsOn:[]`, `milestone:null`, `commit:null`, `failure_reason:null` (`:418-428`); treats any non-`todo` status or any `decision` as "ruled" and refuses `--replace` (`:454-461, 526-533`) | `INITIAL_STATUS='todo'` (`:17`) |
| `tim/src/parity/ingest.js:476-487` `resolveTarget` | R header `target` | — | — | explicit → existing `backlog.target` → `tools/journey-builder/targets.json .default` → USAGE error | — |
| `tim/src/parity/schema.js:112-143` | validates every tim parity read | — | — | **required** header `run_id`, `target` (string). **Required** increment keys: `id,type,milestone,domain,title,detail,screens,evidence,confidence,band,gate,dependsOn,status,commit,failure_reason`. `commit` must be string or null | `status: z.string()` (open) |
| `tim/src/parity/counts.js:10,32-34,76-85` | R | via profile | — | `band`, `status`, `gate`, `decision` | withdrawn = `dropped` or ruling `falsified`; "awaitingRuling" = `gate` ∧ ¬`decision` (status ignored) |
| `tim/src/parity/set.js:151-170` (`set-decision`) | W | via profile | `inc-*` via commander arg | refuses if `!increment.gate`; writes `finding.decisionRequired.audience = entry.gate` | — |
| `tools/journey-builder/target-profile.sh:31-43` | R header `target` | `:31` | `RUN_ID` passed through | `jq -r '.target // empty'` on backlog, then `.digest-meta.json .target`, then `targets.json .default` | — |
| … its callers | `verify-increment.sh:30`, `commit-increment.sh:28`, `rollback-increment.sh`, `prepare-digest.sh`, `backlog-generate.sh` | all PL | `EUDPA-*` | `TARGET_VERIFY_*`, `TARGET_REPOS`, `TARGET_COMMIT_PATHS` | `commit-increment.sh:45` → `backlog-set-status.sh --status done` |
| `tools/journey-builder/backlog-counts.sh` | R | `:21` | `EUDPA-*` | `milestone`, `status` (`:25-35`) | any |
| `tools/journey-builder/backlog-add-extra.sh` / `backlog-remove-extra.sh` (+ `backlog-set-extra.sh`) | W **`<spec_dir>/backlog-extras.json`**, not `backlog.json` | needs `.digest-meta.json .spec_dir` (`add:68-72`, `remove:32-36`) | `EUDPA-*`; `--key` slug (`add:52`) | extra = `{key,type∈fix\|e2e\|chore\|restore,repo,title,detail,milestone,gate∈sam\|null,anchor}` (`add:92-101`) | none (born status comes from generator) |
| `tools/journey-builder/next-increment.sh` | R/W (`--claim`) | `:23` | `EUDPA-*` | `.dependsOn[]` **without `// []`** (`:30`), so a row missing `dependsOn` makes jq error under `set -e` | allow-list `todo` |

### Three definitions of "awaiting a ruling"

These give different answers on the same backlog:

- `next-decision.sh`: `status=="blocked"` ∧ `gate==$gate` ∧ ¬`decision`
- `decision-counts.sh`: `status=="blocked"` ∧ ¬`decision`
- `tim parity counts`: `gate` truthy ∧ ¬`decision`

On dr21 (EUDPA-328) they agree (70 each, because every gated row is blocked and every blocked row is gated). On an AUTHOR-era corpus they diverge. For example, DR1C's 3 deferred rows are `blocked` with `gate:null`, and `tim set-decision` refuses them ("is not gated").

### Two meanings of `gate`

- In parity, `gate` is the **audience**: who must rule (`sam`, `backend`). `set.js:165` copies it into `decisionRequired.audience`.
- In the loop it is a **post-land halt**: `HALT-FOR-REVIEW` (`increment-build-loop.js:1907`).
- `rule-decision.sh accept` clears it (`:70, 91`). `defer` keeps it (`:72`). A deferred parity row later flipped to `todo` by hand without clearing `gate` would halt the loop *after* landing, not before building.

---

## 3. The header `target` binding

- **Writers:** `backlog-generate.sh:285` (`{schema_version:1, run_id, target, increments}`) and `tim parity ingest` (`ingest.js:605`). Parity backlogs all say `live-animals-frontend`; EUDPA-409 says `high-risk-plants-frontend`. DR1-U carries `target: live-animals-frontend`, copied by hand.
- **Readers:** `target-profile.sh:35-36` and `resolveTarget` (`ingest.js:476-487`). The two resolution orders differ. `target-profile.sh` consults `.digest-meta.json` between the backlog and the default. tim does not. `corpus-profile.js:58-60` claims to "copy the precedence of target-profile.sh", but that holds for the `corpus` lookup only.
- **Dependencies:**
  - `schema.js:139` makes `target` a **required string**. Any backlog without a header `target` fails `parseBacklog`, and with it every `tim parity` command (report, counts, check, set-*, citations, evidence, anchors, ingest re-read).
  - `resolveTarget` hard-depends on `tools/journey-builder/targets.json` existing with a `.default`.
- **What `target` buys today:**
  - through `load_target`, the verify ladder as npm script names (`targets.json .targets[].verify`)
  - the repo-key table (`repos.{backend,frontend,tests}` with `path` and `github`), with the same three keys as the loop's hard triple at `increment-build-loop.js:179-190`
  - `commitPaths`, `implementorSkill`, `scope`, `sources[]`
- **What it does not buy:** anything inside the live build path. The loop and build-orchestrator never read it, and DR1-U's ladder was re-typed into `PROGRAMME-NOTES.md` ("Verification ladder: `test:live-animals`, `format:check`, `lint`, `test:fit:features`"), which duplicates `targets.json`.
- **Design implication:** keep header `target` and make the implementor read it. A target profile already holds, as data, the ladder, the repo table and the scope that FA keeps in its `stages.json` header and the loop hardcodes. The runner must be rewritten as a multi-repo, worktree-agnostic ladder. `verify-increment.sh` should not be reused.

---

## 4. The parity family's path lock, and what it cost

- **Bash tools:** `next-decision.sh:29`, `decision-counts.sh:12`, `rule-decision.sh:48` and `backlog-counts.sh:21` all hardcode `workareas/journey-builder/$RUN_ID/backlog.json`, and all glob `EUDPA-*`. `rule-decision.sh` also globs `inc-*`.
- **tim is more flexible.** The profile's `backlog` path is data (`corpora.json`; `corpus-profile.js:208`). Only the no-corpus fallback and `scaffold-corpus.sh:98` pin the directory.
- **The lock collided with build-orchestrator's needs.** Sam's commit `b9069436` "fix(parity): put the union backlog where the orchestrator can run it" says so: "Under `workareas/journey-builder/` only backlog.json is un-ignored, so orchestrator-ledger.json and logs/batches/ would never have been committed". (`.gitignore:39-55, 113-119` do in fact un-ignore `orchestrator-ledger.json`, `PROGRAMME-NOTES.md` and `logs/batches/` under journey-builder, so this may have been fixed afterwards.)
- **Consequences of the move:** DR1-U went to `workareas/shared/dr1-parity-union/`. Every parity reader lost it at that point:
  - there is no `dr1u` corpus in `corpora.json`
  - `tim parity report EUDPA-328-DR1U` fails with *Unknown corpus "dr1u"* (PROGRAMME-NOTES.md, "Evidence lives in the per-run reports")
  - `rule-decision.sh` cannot reach it, which is why every DR1-U ruling is a hand-edit
- **A multi-capture renderer gap:** the union spans two capture sets (`corpus: dr1` on 50 rows, `dr1c` on 110). A `corpus` is per-row, but a report profile is per-backlog, so the renderer cannot resolve a mixed backlog's screens.
- **Lesson for the design:** one location convention for every backlog, a registry that maps run to path (which `corpora.json` already is, for parity), and no reader that constructs the path itself. The `EUDPA-*` glob should go. `start-comparison.sh` already carries a comment explaining that the glob is the only reason the interview insists on it.

---

## 5. `backlog-counts.sh` and the extras tools

- **`backlog-counts.sh`** is a pure reader that groups by `milestone` × `status`. It works on any backlog with `.increments[]` and survives a null `milestone` (parity rows are all null: `ingest.js:419`). It is harmless, but it is path-locked.
- **`backlog-add-extra.sh` / `-remove-extra.sh` / `-set-extra.sh`** are the **side channel into regeneration**. They write `backlog-extras.json` beside `journey-spec.json`, and `backlog-generate.sh` splices each extra in at its anchor (`:250-277`). The content key `"\(.type):\(.key // .page // .gap // …)"` (`:270, 296`) is how statuses survive regeneration.
  - `--type` is restricted to `fix|e2e|chore|restore` (`add:53-56`), and `--gate` to `sam` (`:62`).
  - The synthesis (§2.1 row 6) notes that 51 of 65 EUDPA-409 increments came through this channel as prose.
  - What the synthesis does not say is that the channel is also the **only identity-stable way to add work to a generated backlog**. It is also the only one that refuses a dangling anchor (`remove:42-47`).
  - The design keeps both properties: a content key that survives re-distillation, and refusing to remove something that others depend on.
  - The channel needs `.digest-meta.json`, so it cannot serve a parity or a hand-authored backlog.

---

## 6. The tim parity test suite is a live schema tripwire

- **`report.contract.test.js:24-80`** parses the **real, tracked** `workareas/journey-builder/EUDPA-328/backlog.json` through the real `parseBacklog`. It also asserts unique ids, no dangling `dependsOn`, no dangling or self `finding.relatedTo`, and more.
  - The file comment says a fresh clone "skips this file". That is stale. EUDPA-328's backlog is tracked (`git ls-files`; `.gitignore:43`), so the test runs in `tim-ci.yml` (`npm test`, `:40`).
  - **Any migration that reshapes EUDPA-328's backlog breaks tim CI**, unless it keeps the fifteen required increment keys and the header `run_id` + `target`.
- **`ingest.test.js`, `set.test.js`, `anchors.test.js` and `meta.test.js`** build fixture backlogs with header `{run_id, target:'t'|'live-animals-frontend', increments}` (`set.test.js:33`, `anchors.test.js:70`, `meta.test.js:85`, `ingest.test.js:95`).
  - They pin the ingest contracts: ids stay stable by source file, `detail` is frozen at first ingest (`ingest.js:568-581`), `--replace` is refused when rulings exist, rulings on dropped files are refused, and the verify-before-ingest gate holds.
  - They also pin "does not re-gate a finding already in the backlog" (`ingest.test.js:622`).
  - These are the behaviours the new distiller's re-run must keep: **re-distillation must never destroy a ruling or a frozen oracle, and must keep ids stable by source.**
- There are no shared fixture files; each test builds its own in a temp dir. `tim/src/test-support/git-fixtures.js` is git-only.

---

## 7. Persona references that read or forbid the backlog

- **`journey-builder/references/MODEL_EXTENDER.md:1-60`**
  - Reads `gap` on a `model-extension` increment (`:10`). `gap` is also a content-key component in `backlog-generate.sh:270`.
  - Is written for the **superseded BUILD path**: it edits under `workareas/journey-builder/<run-id>/frontend-worktree/` (`:13-14`), and it uses `verify-increment.sh`, `commit-increment.sh` and `rollback-increment.sh` (`:17-19`).
  - Contains a literal `~/git/defra/.../` placeholder path (`:12`).
  - It is a recipe persona for one increment type. In the new design, "grow the engine vocabulary" becomes a requirement kind that the Plan stage recognises. It does not keep its own implementor.
- **`parity/references/FINDING_AUTHOR.md:140-143`** says "**Never write `backlog.json`.** You write one JSON file per finding under `findings/`. A deterministic tool assembles them."
  - `:130-137` sets the atom-granularity rule: "If your sentence contains 'and also', you have two findings". The one exception is a whole absent page, which stays one `add-page` finding.
  - This is exactly the pass-1 "small increments" rule Sam asked for, already written and already proven on four corpora. Keep it verbatim.
- **`parity/references/CLAIM_VERIFIER.md:17`** runs `git diff <passA>..<passB> -- workareas/journey-builder/EUDPA-328/backlog.json`, a hardcoded run id and path.
  - It depends on the backlog being tracked and on one increment per finding with prose in `finding.*`. That is why `evidence.json` was split out (`citations/evidence.js:199-201`: "`git diff backlog.json` stays a clean prose review").
  - **Design constraint:** keep derived data out of the backlog so that its diff is a review surface. FA's `notes[]` (217 KB) and EUDPA-409's 1-6 KB plan `notes` break this. A lifecycle journal belongs in a sibling file.
- **`tools/parity/templates/FINDING-CONTRACT.template.md:4, 23`** says "nothing writes that file by hand" and "ten agents … produce one backlog rather than ten dialects". The seeded contract is the anti-dialect device for a fan-out of authors. It is directly reusable as the distiller's per-run extraction contract.

---

## 8. The DR1-U programme in detail (the missing evidence)

**Branch:** `origin/feat/parity-report-triage-view`. It is **not** on main (`merge-base --is-ancestor b9069436 main` fails). The synthesis §2.2(7) warns that this branch "is behind main on the loop and would regress seven commits if merged". That is true for the loop file, but the branch also holds the only proven parity→build programme, and it must not be discarded with it.

**Source union (the multi-source distiller prototype):**
- `workareas/shared/dr1a-vs-dr1c-workflow.js` has phases `Match` (one agent per subject area, reading both backlogs, schema `{matched[{a,c,note,better∈A|C|neither}], onlyA[{id,title,why}], onlyC[…]}`) and `Judge` (attacks every one-sided call, spot-checks 3-4 matches, schema `{overturned[{id,was,actually}], confirmed[{id,searchedFor}], matchesDisputed[]}`).
- Key rules in its prompt:
  - "(2) is the trap … Read what each finding actually ASKS SOMEBODY TO DO — if a person doing the work would write the same diff, they are the same finding"
  - "Grep for the control name, the screen id, the quoted UI string — not the title"
  - confirmed calls must say "what you searched for and failed to find — that sentence is the only thing distinguishing a check that ran from one that did not"
- Assembly followed in `dr1u-parts/BRIEF.md`: "You are assembling, not adjudicating". A fixed `plan.tsv` (`union-id, area, origin, sourceA, sourceC`) and an `idmap.txt` handle cross-reference remapping, one worker per area.
- The result: 161 rows (113 both, 25 a-only, 23 c-only), each with `provenance{sourceA,sourceC,origin,note,better,judged}`. Rulings carried through: "a finding a person has ruled on does not come back to life because the other run also found it".

**Build:** build-orchestrator + `increment-build-loop.js`, `lifecycle full`, epic EUDPA-328.
- 118 merged PRs are recorded in `prs[{repo,url,number,merged,sha}]`, with `commit` as a short sha string.
- The rows stayed requirement-shaped throughout, and the loop derived the change itself.
- Failure modes recorded in commit subjects: main-red misattribution (×6), merge-gate denial, a half-uncommitted tests change, "batch 1 — landed nothing, no driver for L2", and a stale `commit` field that had to be cleared "so it rebuilds rather than resumes".

**Programme knowledge the backlog schema could not hold** (all in `PROGRAMME-NOTES.md`, prose):
- group blocks with a named ruler and date ("Ruled by Rhys, 2026-08-28")
- a revisit trigger ("Revisit when the typed record lands"; "If MDM slips, this is the first of the three to reconsider")
- explicit "stays buildable, do not sweep in" lists
- ordering constraints outside `dependsOn` (`inc-006`/`inc-161`, `inc-103`)
- banding disagreements between sources, stated in `finding.difference`
- a ruled design decision that the build must follow and must not re-derive (`inc-161`, "rule (b)")

These are **requirement-level facts**, not recipes. The new schema needs first-class slots for them: `ruling{by, at, reason, revisitWhen}`, a group-level ruling that applies to named ids, `constraints[]` that are not dependencies, and `sources[]` provenance with a disagreement record. `tim/src/parity/schema.js` already has `deferredSchema.revisitWhen` (`:164`) and `deferredBy` (`:162`) for the deferred-candidates file. Those are the right shapes and can be promoted.

---

## 9. Invariants any new backlog format must keep, or retire explicitly

1. **Header `run_id` and `target`** are required by `schema.js:138-139`. `target` must stay a key into `tools/journey-builder/targets.json` (`target-profile.sh:45`, `ingest.js:480`).
2. **Header `corpus`** decides which report profile renders the backlog (`corpus-profile.js:89-90`). A mixed-source backlog needs either a multi-corpus profile or a per-row `corpus` the renderer honours (it currently does not).
3. **The fifteen required increment keys** (`schema.js:112-128`), or a schema bump with `PARITY_SCHEMA_VERSION` (`:9`) and a migration of the four tracked parity backlogs. **`commit` must stay a string or null** for parity: FA's `{repo:sha}` and any `commits[]` array fail parse.
4. **Ids `inc-NNN` are stable by source file and never renumbered** (`ingest.js:288-331`; DR1-U README: "Ids are bound to rulings and citations; renumbering orphans both"). Array order is build order. `rule-decision.sh:37` and tim's `INCREMENT_ID` (`ingest.js:331`) reject any other id shape. A content-keyed id (EUDPA-409 `key`) must live **beside** `id`, never replace it.
5. **`detail` is frozen at first ingest** (`ingest.js:568-581`; parity SKILL.md "`detail` is frozen forever"). It is the oracle for the MIGRATE and CLAIM_VERIFIER passes. A combine pass must not rewrite the `detail` of a merged atom. It writes the merged increment's own statement and keeps the atoms as a sibling.
6. **A re-run never destroys rulings** (`ingest.js:454-461, 526-557`; `backlog-generate.sh` content-key preservation; `backlog-remove-extra.sh:42-47`). The pass-2 combine must be re-runnable over rulings, which EUDPA-409's `combination-proposal` was not.
7. **`decision{ruling,note,ruledAt[,by]}`** (`schema.js:24-29`) is the only validated ruling record. The ruling vocabulary is currently open: `accept|reject|defer|falsified` from the tool, plus `block` by hand. It needs to be a closed set, with one withdrawn-set shared by `counts.js`, `rule-decision.sh` and the build driver.
8. **Buildability must not rest on `status` alone for requirement-shaped rows.** The AUTHOR pipeline births `todo`. Either births must derive status from `band` and `decision` (a disputed row is born `blocked`), or the driver must read a readiness field. DR1-U fixed this by hand (`deferred`).
9. **`gate` is currently overloaded** (audience vs post-land halt). Split it into `ruling.required{audience,question,…}` (pre-build, the existing `finding.decisionRequired`) and a separate `haltAfter`/milestone flag.
10. **`finding.verification` means evidence re-check, not a ladder.** No top-level `verification` should reappear on requirement rows. The loop prompt currently reads a top-level `verification` as "the ladder" (`increment-build-loop.js:671, 1401`).
11. **`backlog.json` is a review surface under `git diff`.** Derived data (`evidence.json`, seals) and journals stay out of it.

---

## 10. Implications for Q17 (migration)

- **Parity corpora (EUDPA-328, -DR1, -DR1B, -DR1C)** have 479 increments, 0 done, and are tracked. One of them (EUDPA-328) is exercised by tim CI. These are **finding stores**, not build backlogs. Recommendation: freeze them as source atoms, and have the new distiller *read* them as a source type ("verified findings") rather than migrate them in place. That is exactly what DR1-U did. Their readers (`next-decision`, `decision-counts`, `rule-decision`, `tim parity *`) keep working unchanged.
- **DR1-U** is the migration template. It is already requirement-shaped, already built, and already carries provenance. It needs:
  - bringing onto main (off a branch that regresses the loop, so cherry-pick the `workareas/shared/dr1-parity-union/`, `dr1u-handover/`, `dr1a-vs-dr1c-*` and `dr1u-notes.md` paths only)
  - a registry entry
  - a multi-capture report profile, or it stays unrenderable
- **Readers to retire explicitly, rather than silently break:**
  - `next-increment.sh`, which feeds only the superseded BUILD mode and crashes on a missing `dependsOn`
  - `verify-increment.sh` / `commit-increment.sh` / `rollback-increment.sh`, which need `.digest-meta.json`, and `rollback` uses `git clean -fd`
  - `MODEL_EXTENDER.md`'s worktree flow
- **Readers to generalise:** `rule-decision.sh`, `decision-counts.sh` and `next-decision.sh` should take a backlog path or registry key instead of `EUDPA-*` + a fixed directory. Once `rule-decision` can write `deferred`/`rejected`/`block`, the hand-edits DR1-U needed disappear.

---

## 11. Keep, and fix

**Keep:**
- tim `schema.js` as the pattern for validation that tolerates added keys and is strict about removed ones (`:11-15`)
- the ingest's ruling-preserving merge and frozen oracle
- FINDING_AUTHOR's atom rule and the per-run FINDING-CONTRACT
- the `dr1a-vs-dr1c` Match→Judge workflow as the multi-source union step
- DR1-U's `provenance` block
- `targets.json` as the ladder and repo data
- `corpora.json` as a path registry
- `rule-decision.sh`'s requirement that every ruling carries a reason, and its falsified-strips-dependents behaviour, which leaves a note on each affected row (`:76-99`)

**Fix:**
- the path lock and the `EUDPA-*`/`inc-*` globs
- the three "awaiting a ruling" definitions
- the `gate` overload
- the open ruling and status vocabularies (`block`, `deferred`, `rejected` are written by hand)
- AUTHOR births disputed findings as buildable
- the loop reading `band` for routing but not for readiness
- the loop never reading header `target`
- the stale "fresh clone skips" comment in `report.contract.test.js:14-17`
- `build-orchestrator` SKILL.md:32 names `shared/dr1-parity-union` as its example workarea, but that path does not exist on main
