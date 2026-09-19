# Revision log

Each reviser appends its section. Change ids refer to `change-list.md`.

## g1: DESIGN.md sections 0 to 3 (plus the preamble)

All 35 assigned changes applied. `backlog.json` was not edited (g4 owns it).

| Change | Result | Where |
|---|---|---|
| C-001 | done | Preamble; 0.2 opening replaced by the component table and the judge 1 line; 0.1 no longer describes skills or workflows as `git mv` renames; principle 12 rewritten verbatim; 0.4 gains an R8 fact |
| C-002 | done | 0.1 "tim decides, Claude watchers execute"; 0.3 stage-machine row rewritten (row 5); 2.1 build box is an interpreter loop over `advance` with the canonical stage numbers; distil box interprets `advance --distil`; 2.2 adds the decision engine and `pre-push-check.sh` |
| C-007 | done | 2.2 stage briefs written fresh; profiles hold the sorted executor sentences; `codex/*.md` stay until inc-040; principle 6 |
| C-009 | done | 0.4 "What agents receive at start"; 2.2 Codex home row |
| C-021 | done | 3.1 plans row (read by the C-022 list, never acceptance); principle 10; 2.1 order ladder, secrets, proof, acceptance, then land |
| C-025 | done | 3.12 layer-chain row plus the five numbered rules; `edgeChecks[]` added to 3.4 and 3.5; class `test` only for all-hygiene members |
| C-026 | done | 3.3 `consumes[]` on the repo entry; `delivery.merge.order` defaults to the `consumes` order; principle 9 |
| C-027 | done | 3.13 example 2 re-justified by `cr-same-surface` and `cr-same-acceptance-boundary`; 3.3 combination note; 3.5 `combination.why` |
| C-029 | done | 3.4 "Kinds, by who observes them" |
| C-030 | done | 3.4 `surface` row: the author's brief lists header repos with role and `consumes` |
| C-031 | done | 3.4 `surface.amendments[]` and the `rule --by build` write; 2.1 stage 9 |
| C-032 | done | 3.12 "No integration proof" exception for product-repo hygiene; 3.4 hygiene never adds behaviour |
| C-033 | done | 3.12 tooling rule and the recorded exit code and output |
| C-034 | done | 3.4 `carriedFrom[]`; 2.1 reslice phase; 3.1 `distil/reslice.json` |
| C-035 | done | 3.9 `proof-owed` is not done; 3.3 and 3.14 `delivery` holds branches, PRs and merges only; `crossRepoE2e` refused by name |
| C-037 | done | 2.1 routing stage removed, standards from `tim backlog standards`; 2.2 composer row deleted, resolver and routing-data rows added; 0.2 graft 20 rewritten |
| C-039 | done | 3.6 `visual[]` carries `box` and `sha256`; 3.1 crops row; 2.1 characterise line |
| C-040 | done | 3.8 kinds `spreadsheet`, `slides`, `live-service`; 3.12 `observed` role check; 3.8 "No linked source vanishes" |
| C-041 | done | 0.1 and 2.2: new skill folder, journey-builder frozen with a banner |
| C-042 | done | 0.3 lifecycle row reason; 0.4 Sonar fact (push hook does not fire for `git -C`; force-push deny rules; the recorded rule 3 deviation) |
| C-044 | done | 3.6 two behaviours only, `defaultWhy`, identical-effects refusal; 3.7 decision `defaulted`, `decidedBy: default`; 3.9 and 3.10 only must-answer blocks; 2.1 rulings loop |
| C-045 | done | 3.8 kind `brief`; retention keyed on the speaker; `decisions[].words` exempt |
| C-047 | done | 3.8 conflict `reverseEffects`; 3.5 and example 2 combination `reverseEffects`; 3.7 new effect op `split`; 2.1 reversal commands |
| C-050 | done | 3.6 `counts` by role, each source printed with its tier; 2.1 report lint and `COLD_READER` |
| C-052 | done | 3.6 `blastRadius.blocks` and `restsOnDefault` |
| C-054 | done | 3.5 key `solo--<root atom key>`; 3.9 solo keeps status and id; 3.12 matching by member roots |
| C-055 | done | 3.4 statement frozen at first adopted ingest; 3.7 `reopens`; 3.9 no done-to-todo |
| C-056 | done | 3.14 lint over every prose field with the executor vocabulary; principle 1 |
| C-057 | done | 3.12 override names an enumerated contract; 3.14 cross-reference |
| C-058 | done | Principle 1; 3.3 repo entry `{path, role, consumes}`; how-facts moved to "The repo's registry entry" with DESIGN.md as this programme's knowledge; 3.14 rows; 0.3 exemplar row; 2.2 registry row |
| C-060 | done | 2.1 stage 8 wording; principle 10 |
| C-061 | done | 3.6 options A and B each supersede req-044 (req-045, req-046); 3.13 example 3 note; 3.7 unchanged |
| C-062 | done | 3.5 `outcome` absent on a solo; example 1 outcome removed |
| C-063 | done | 3.4 citation labelling; 0.3 exemplar row; example 1 comment |
| C-067 | done | 3.3 registry ladder: `script` rungs name committed files only; 2.2 rung runner row |

### Decisions made while applying (headless, recorded here)

- **`github` moved to the registry** with `ladder`, `knowledge` and `generated`, because C-058 says the header repo keeps `{key, path, role, consumes}` only. Refused by name in 3.14.
- **The `blocking` question class is gone.** C-044 allows two behaviours, so `class` is `must-answer | defaulted`, and `mustAnswer` is derived from `ifNobodyAnswers.option` being null (security, access-control, data-integrity, legal and policy categories are always must-answer).
- **backlog-implementor is described as a new skill**, carrying build-orchestrator's driver, landed check, stop taxonomy and handover, with build-orchestrator staying for the legacy loop until inc-040. The change list set lineage for the distiller (C-041) and for `backlog-build.js` (C-002) but not for this skill; this follows C-001 (no `git mv` as a reason) and C-002/C-072 operability (the legacy loop keeps its driver).
- **Consistency follow-ons outside my change ids:** 0.2 graft 19 and the 2.1 distil box name the C-038 personas (`PROSE_EDITOR`, `PROSE_CLAIM_VERIFIER`, `ATOM_DEDUPER`); 0.3 row 1 cites C-053 and no longer states atom and increment counts (it points to 11.6); 3.1 gains rows for `build/HANDOVER-CODEX.md` (C-003), `build/reads/` (C-011) and `build/.accept-key` (C-012).
- **New fields introduced:** `edgeChecks[] {on, observableWithout, why, by}` on atoms and increments; `surface.amendments[] {repoKey, increment, attempt, why}`; question option `counts` (replacing `count`); `ifNobodyAnswers.defaultWhy`; `blastRadius.blocks` and `restsOnDefault` (replacing `increments`); decision `reopens`; conflict `reverseEffects` (map of losing side to effects); `combination.reverseEffects`; effect op `split` with `into`.

### Consequences the next revisers must honour

- **g2:** 4.2 `rule` must accept `--by default` and `--by build`, `--subject surface:<atom> --add-repo`, `--subject conflict:<id> --choose`, `--subject combination:<key> --split`; ingest and `check` must know every new field listed above; `check --strict` implements the five layer-chain rules from 3.12 and refuses `github`, `ladder`, `knowledge`, `generated`, `crossRepoE2e` on the header. 4.8 ledger must drop `skill-routing.sh` and add `advance`, `standards`, both `routing.json` files, `tools/codex/home/`, `guard.sh` and `pre-push-check.sh`. 5.1 and 5.9: the distiller is a new folder, journey-builder frozen (0.1, 2.2 already say so). 6.x: section 1 has no "Blocks work" group any more, only must-answer and "Has a default in force"; option counts print by role with tiers.
- **g3:** the 2.1 diagram now carries the canonical stage numbers 0 to 27 from the change list. 7.1 must describe backlog-implementor as a new skill, not a `git mv` of build-orchestrator. 7.4 routing stages 7, 10 and 13 are gone. 7.6 merge order comes from `consumes`; `delivery.crossRepoE2e` no longer exists (7.4's integration-proof text still cites it). 7.7 holds `quality.integrationProofSource`.
- **g4:** 9.1 Q18 and the 10 retire table must match 0.1 and 2.2: no `git mv` for journey-builder, build-orchestrator, `increment-build-loop.js` or the `codex/*.md` briefs. 9.1 Q29 must drop `delivery.crossRepoE2e`. 9.2 S2 and S3 and 9.3's "House rules" row still say "blocking"; under C-044 each is either must-answer or defaulted. 11.4 `repos.workspace` must lose `ladder`, `generated`, `knowledge` (and `github`), and gain `consumes`; `delivery.crossRepoE2e` goes; solo increments lose stored `outcome`; `combination.rules` drops `cr-same-repo-set`; questions use `counts`, `blastRadius.blocks`/`restsOnDefault` and `ifNobodyAnswers.defaultWhy`.

## g2: DESIGN sections 4, 5 and 6

All 57 assigned changes applied with small Edit calls. backlog.json not touched. No em dashes.

### Per change

- **C-001** done: 4.8 is "The file ledger", column "What it does better in use", every row restated in use terms; `skill-routing.sh` removed; rows added for `advance`, `standards.js`, `rule.js`, `reading.js`, `sources/{acquire,crop}.js`, `backlog-build.js`, routing data, Codex home and guard, `pre-push-check.sh`, `record-read.sh`, prose personas, `RESLICER`, new source types; "Nothing else is new" removed. 4.1 restated on merit.
- **C-002** done: 4.2 "The decision engine" (`advance`, `advance --distil`, `advance --record`, act commands); 4.5 opening rewritten, transitions live in the stage table; 4.6 `STAGE_ORDER` item deleted; 5.2 runs through `advance --distil` with tim phases in-process; 5.11 and 5.12 updated.
- **C-003** done: 4.5 prepare records each task's executor in `stage.json`; audit's receipt rule; 4.2 `run bind --from after-current`, `handover --out`.
- **C-004** done: 4.5 accept step 8; 4.6 `run-stage.sh` accepts after each draft and resumes on `needs-correction`; self-test case.
- **C-005** done: 4.3 and 4.5 per-task accept writes only its folder; `--finalise`; exit 4 means rerun unchanged.
- **C-006** done: accept receipt carries `completed`; audit requires it on the six stages.
- **C-007** done: 4.6 contract test item 4.
- **C-008** done: audit invariant rule.
- **C-009** done: 4.6 `tools/codex/home/` row; receipts record version, model, effort, config hash; `compare` fails on mismatch.
- **C-010** done: 4.5 accept step 4 and manifest refuse protected paths; `guard.sh` row.
- **C-011** done: 4.2 `audit-reading` coverage rule; accept step 3; audit reading bullet; `record-read.sh` row.
- **C-012** done: `acceptMac`, `outputSha256`, `build/.accept-key` from `run start`.
- **C-014** done: `run-stage.sh` lock and self-test.
- **C-016** done: `stage schemas` paragraph.
- **C-019** done: `run-rung.sh` timeout to hold `environment` via `advance`; registry `shards`.
- **C-020** done: audit integration-proof record rules; 6.2 section 12.
- **C-023** done: audit seam verdicts.
- **C-024** done: audit verify-consistency and rulings.
- **C-025** done: 4.2 `check` five rules; 5.2 phases 9, 14, 18; 5.4 verifier `edgeChecks`; P11 row; `verify-record`.
- **C-026** done: `report --merge-plan`; 5.1 NEW and 5.3 item 6 fill `consumes` from `docker/stack`; 6.2 section 1(b); `graph.js` cycles over `consumes`.
- **C-027** done: repo-set signal removed from `duplicates` and `candidates`; `cr-same-repo-set` removed; COMBINER inputs; COMBINE_VERIFIER failures; `check` refuses repo-keyed rules; lint covers `combination.why`; skeleton section 5.
- **C-028** done: `slices --strict`; slice schema with `behaviour` (5.2 phase 6); SLICER rule; contract shows behaviour sentences.
- **C-029** done: 5.3 item 3; 5.4 author kinds and verifier merge; 5.9.
- **C-030** done: 5.4 verifier question; 6.2 sections 6 and 12; skeleton.
- **C-031** done: audit branch parity; `rule --subject surface --add-repo`; manifest hold for unplanned repo; `--finalise` persists `reposAdded`.
- **C-032** done: 5.4 hygiene rule; audit regression proof; P11 row.
- **C-033** done: audit records the tooling e2e run; `check` and P11.
- **C-034** done: 5.2 phase 5a `reslice`; `migrate` row (proposed legacy atoms, `reslice.json`, legacy recipe fields as current-behaviour source); `show --brief` excludes them; `RESLICER` persona.
- **C-037** done: `rules` renamed `standards` with routing data and blob shas; prepare bakes standards, union for writers; manifest `rulesGap`; 4.6 routing scripts become jq readers with golden tests; `skill-routing.sh` deleted from 4.6 and 4.8.
- **C-038** done: 5.9 `ATOM_DEDUPER`, `PROSE_EDITOR`, `PROSE_CLAIM_VERIFIER` with "Method from" and the slot budget table; parity untouched; 5.2 phases 13 and 19; 6.6 budget lint.
- **C-039** done: 4.2 `source crop`; 4.7 `sharp`; 5.2 phase 3; 5.6 editor and lint; 5.10; 6.5 test.
- **C-040** done: 4.7 `fflate`; `source acquire` conversions; 5.10 rows for Word, spreadsheet, slides, prototype, live service; 5.9 source types; P1 pointer rule in `units` and 5.4; "no linked source vanishes" in 5.10.
- **C-041** done: 5.1 new folder, journey-builder frozen with banner.
- **C-042** done: 4.6 PUSH RULE force-push sentence and COMMIT RULE Sonar deviation.
- **C-043** done: 4.1 restated with merit reasons; "judged on that alone" removed; requirements-v2 fixture criterion.
- **C-044** done: 4.2 `rule --by default`; 5.2 phase 17 applies defaults; 5.3 item 8; 5.6 editor, critic and lint; 5.8; 6.2 and 6.3 two groups.
- **C-045** done: 5.10 brief row, retention on the speaker, Jira comments.
- **C-046** done: 6.4 standalone sheet, precise tentative rule, mapping token; 6.5 tests; 5.8.
- **C-047** done: 4.2 `rule --subject conflict/combination`; 6.2 section 2 commands and checkboxes; 6.3 skeleton; 6.4 reversal and release lines; 6.5 test; combiner writes `reverseEffects`.
- **C-048** done: 6.2 compact defaulted card; 6.3 skeleton; 6.5 test.
- **C-049** done: 5.4 verifier verdict on dismissals; `coverage` and P4 fail on unverified dismissals; 6.2 sections 3 and 6; skeleton.
- **C-050** done: 6.6 lint (25-word sentences, abbreviations with a profile glossary) and COLD_READER (5.2 phase 20, 5.9, 6.1 rule 4); counts by role in 6.2, 6.3, 6.5.
- **C-052** done: `report --decisions` and `decisions.js`; note after 6.2; 6.5 test.
- **C-053** done: 4.3 bootstrap registered-run guard.
- **C-054** done: 4.4 "Ids survive rulings" with the test; 5.7 matching by member roots.
- **C-055** done: 4.3 `reopens` refusal; statement frozen at first adopted ingest; 4.2 `rule --reopens`; 5.8.
- **C-056** done: 4.2 `check` recipe and executor lint over every prose field.
- **C-059** done: 4.2 `discover` writes `proposed`; 5.8 item 6; REQUIREMENT_VERIFIER in 5.9.
- **C-062** done: 4.1 profile slots; `set`; 5.7 output; 6.5 increment card; 6.6.
- **C-063** done: `show --brief` label.
- **C-064** done: `pin-tools.sh` prefix `npm --prefix … run --silent tim --` with a JSON-parse test.
- **C-065** done: `heads --strict` and accept step 5 tracked-only, scoped, `generated` excluded, compared before any write; registry `generated` covers `workareas/shared/<p>/**`.
- **C-066** done: 4.6 full execute-bit sequence; self-test checks 100755.
- **C-067** done: `run-rung.sh` `could-not-run:uncommitted`; registry `script` rungs committed only.
- **C-068** done: manifest base is the pinned baseline heads, recorded in `stage.json`.
- **C-069** done: acorn options and fixture.
- **C-070** done: prepare prints task list, count and `stage.json` sha256; `advance` run step carries them.

### Calls made without instructions

- Named the committed Read hook `tools/backlog/record-read.sh` (3.1 only said "a committed PostToolUse Read hook").
- Added `tim/src/backlog/reading.js`, `sources/{acquire,crop}.js` and `render/decisions.js` as module names in 4.8 and 6.5.
- Added `COLD_READER.md` to the 5.9 persona table and made it part of phase 20 (C-050 named the task, not its phase).
- Numbered the reslice phase `5a` (after carryover, before slice) to keep the existing phase numbers stable.
- Added C-021's "acceptance never receives the plan" and repair-review receipts to the 4.5 prepare and audit text, for consistency with g1's 3.1 and the canonical stage order.
- `pre-push-check.sh` signature set to `<repo> <branch>`.
- 6.3 example: the commodity-code question moved into the must-answer group; example defaulted cards and generated commands written out; an example duration ("after 24 hours") avoided because the 6.6 lint would flag it.

### Consequences the next revisers must honour

- **g3:**
  - 8.2 must describe `run-stage.sh` as calling `stage accept <taskDir>` per draft and exiting 0 only when every task is accepted (4.6 now says so); the lock exits 3.
  - 8.1's input matrix is `inputs[]` on the stage table (4.5).
  - The acceptance schema needs `completed` and `test{path,title}`; consistency needs `seams[]` verdicts and finding shape.
  - 8.5 and 8.6 must use `tim backlog standards`.
  - 8.7 must name `tools/codex/guard.sh` and `tools/backlog/record-read.sh`.
  - 7.12 must match the pinned prefix `npm --prefix … run --silent tim --`.
  - 7.4's stage 9 surface amendment uses `rule --subject surface:<atom> --add-repo <key> --why <text> --by build`.
  - `advance --record <actionId> --exit <n> --log <file>` is how watchers report act results.
- **g4:**
  - `decisions-for-sam.md` "Owed to you" must list:
    - the `record-read.sh` PostToolUse Read hook in `.claude/settings.json`;
    - the pipeline-pin allow rules;
    - the Sonar deviation from CLAUDE.md rule 3;
    - guard-edits and secrets-read cover for receipts, `output.json` and `build/.accept-key`.
  - `decisions-for-sam.md` becomes a view once `report --decisions` exists (C-052).
  - The registry entry for this programme needs `generated` to cover `workareas/shared/requirements-pipeline/**`.
  - The 10 retire table must not `git mv` journey-builder (5.1 now says it is frozen in place).

## g3: DESIGN.md sections 7 and 8 (implementor, executors)

All 38 assigned changes are applied through small Edit calls. `backlog.json` was not touched, so no jq run was needed. Sections 7 and 8 contain no em or en dashes.

**Per change (all done):**

- **C-001:** 7.5 plan audit gains the objection `build-cost-reasoning`.
- **C-002:**
  - 7.2 now describes `backlog-build.js` as a new interpreter loop over `advance`: run, act, wait and stop, with the transition rules in `advance`'s tested stage table.
  - 7.8 moves the resume rule and the hold mapping into `advance`.
  - 8.8 is recounted: about 8 to 10 action watchers, plus one relay per model stage under `claude`.
  - 8.11 has the same loop, with no "or directly". It adds the full-access requirement and names what the mode gives up.
- **C-003:**
  - 7.8 "Across executors": bindings apply from the next stage prepared.
  - 7.11 adds the standing `build/HANDOVER-CODEX.md` and the stop `claude-unavailable`.
  - 7.6 adds the handover to the state commit list. 7.1 step 6 prints the command that regenerates it.
  - 8.9 gains three rows: "Finish this one on Codex", "Back to Claude after this one" and "I'm out of Claude".
- **C-004:** in 8.2, `run-stage.sh` accepts after each draft and resumes the task on `needs-correction`, with three rounds. `attemptsToAccept` is recorded for both executors (8.1).
- **C-005:** the 8.2 Claude adapter says "exit 4, rerun unchanged". `--finalise` runs after the fan-out.
- **C-006:** 8.1 adds `completed` and `notReached` to the six checking schemas, plus the partial-receipt rule. The rule is also in 8.2, the 8.3 profiles and a 7.9 row.
- **C-007:** 8.3 records that briefs are written fresh, with the sort table in the inc-014 plan. Both profiles say "browser suites are not yours". `codex/*.md` stays until inc-040.
- **C-008:**
  - 7.5 plan invariants are `command` or `judgement`, with an audit objection.
  - 8.1 drops `invariantChecks` and adds acceptance `invariants[]`.
  - 8.5 no longer says the consistency reviewer runs invariants.
- **C-009:**
  - 8.2: `CODEX_HOME=tools/codex/home`, and `--check` runs a real no-op resume.
  - The self-test checks the `exec` help and the `exec resume` help.
  - Receipts and `runner.json` record the Codex version, model, effort and config hash.
  - 8.3 and 8.4 wording is corrected. 7.7 notes `codex.model`.
- **C-010:**
  - The 8.2 write mode `repo-write` uses `-C <first planned repo>` plus `--add-dir`. The protected-paths paragraph is added there.
  - 8.3 lists the prohibitions.
  - 8.7 row 2 covers `guard.sh`, with the fallback wording if the inc-015 probe fails.
- **C-011:**
  - 8.2: the Claude Read hook and session tie, with a fallback to transcript mapping. Codex uses `--json` and `events.jsonl`, taking the session id from `thread.started`.
  - 8.6: the memory index is a must file, and a full-range read is required.
  - 7.7: `readingAudit` is enforced at accept.
- **C-012:** 8.1 documents `acceptMac`. The 8.2 and 8.3 texts say "never write output.json or receipt.json".
- **C-013:**
  - The 8.2 watcher loops while there is progress, and stops as `codex-stalled` after two calls with none.
  - Slices count per task, no task starts in the last 60 seconds, and each failed task gets one fresh start.
  - 7.7 `codexParallel` is `{readOnly: 8, write: 2}`. 7.11 adds the stop.
- **C-014:** 8.2 adds `.run.lock`, exit 3 and the child pid record. The self-test covers a live lock and a stale lock.
- **C-015:** 8.2 stops the whole descendant tree with `pgrep -P`. The self-test uses a grandchild.
- **C-016:** 8.1 adds the `.nullish()` and `.refine` rule.
- **C-017:** 7.4 stage 11 is the implement check, re-run after every fix and repair. Watchers run the checks in both profiles (8.3, 8.4).
- **C-018:** in 8.10, the second Claude build gives the spread. New measures are added, the bar is option D with the 90/80 floors, and each failed measure is discovered as hygiene.
- **C-019:** 7.4 stage 20 runs as sharded watcher commands. A timeout becomes an `environment` hold. 8.4 and 8.8 say no Sonnet or Opus runs under `codex`.
- **C-020:** the `state.integrationProof` record schema and rules are in the 7.4 details. There is a 7.9 row.
- **C-021:** 7.4 runs prove, then accept, then land. Acceptance never gets the plan and names a passing test per e2e criterion. Repair review is added. `needs-e2e` is removed. 8.1 has the acceptance schema.
- **C-022:** 8.1 adds an inputs-per-stage matrix, `input/upstream/plan.md` and `input/slice.json`. There is a new 8.5 seam row for `ticket.md`.
- **C-023:**
  - 7.5 adds plan `seams[]` and an audit objection.
  - 8.1 adds consistency `seams[]` verdicts.
  - 8.5 adds the "Contract between repos" method for `CONSISTENCY_REVIEWER.md`.
- **C-024:** 8.1 adds the consistency finding shape. 7.4 stage 14 adds verify-consistency, and the judge and fix stages cover consistency findings. 7.9 has a row.
- **C-026:** 7.6 merge order is the topological order of `consumes`. The 7.11 handover carries the merge plan.
- **C-028:** 8.1 distil slice output gains `behaviour`.
- **C-030:** 7.5 persists `state.plan.reposAdded`.
- **C-031:** 7.4 stage 9 plus its details. The manifest holds on a changed repo that is not in the plan. 7.5 refers to the flow.
- **C-032:** 7.4 stage 6 writes the hygiene item with a regression criterion. This is also in the details.
- **C-035:**
  - 7.7 adds `integrationProofSource` and `integrationProofWorkflow`.
  - 7.4 details: a `ci` proof moves stages 20 and 21 after CI.
  - 8.11: a full-access orchestrator runs the proof itself. Otherwise it holds `proof-owed`, and each owed increment is proved separately.
- **C-037:**
  - 7.4 deletes the three routing stages.
  - Stage 12 records `rulesGap[]`, and 7.9 has a row.
  - 8.5 routing is rewritten as `routing.json` data, with a new best-practice seam row.
  - 8.6 renames the command to `tim backlog standards`, with shas.
  - 8.10 adds the standards-sha measure.
- **C-042:**
  - 8.7 row 3: the hook does not fire for `git -C` pushes, so stage 24 reads PR checks.
  - The 8.11 hooks row is corrected.
  - 8.4 states the real reason commands stay in Claude watchers.
- **C-059:** 7.10: discovered atoms are `proposed`, then pass a separate `REQUIREMENT_VERIFIER` task and the lint. The file and line coordinates go to state and the journal only.
- **C-060:** the 7.5 audit derives the requirement from the row.
- **C-063:** 7.5 adds the audit objection `template-adoption`. 8.1 notes the citation label in `brief.json`.
- **C-064:** 7.12 pins tim with `run --silent`, plus the briefs, profiles, scripts and bash tools. It adds the allow rule and the preflight `--check` (7.1, 7.3). "No allow rule needs adding" is not in sections 7 and 8.
- **C-065:** 7.7 adds `checkout: live | clones`, with `clones` the default when the programme changes the pipeline's tools. Stage 4 uses tracked-only fingerprints.
- **C-070:** 8.2 (and 7.2 step 2) check the relayed count and the `stage.json` sha256 before fan-out. A mismatch re-calls once, then holds `stage-failed`.

**Calls I made without instructions:**

- 7.4 now uses the canonical 0 to 27 numbering throughout. `review-only` mode is stages 0 and 12 to 15 (7.3, 8.10).
- 7.1 describes `backlog-implementor` as a new skill. `build-orchestrator` stays for the legacy loop until inc-040 (this follows g1 and C-041).
- The Codex write mode is renamed `repo-write`, because it is no longer the whole workspace.
- The last action watcher of a step also calls `advance` and returns the next step, so recording costs no extra agent (7.2, 8.8).
- `acceptance` gains `invariants[]` for judgement invariants.
- The 8.10 `compare` gains `--spread <claude run 2>`. The second Claude build is registered as `parity-claude-2`.
- The Codex prohibition list uses the change list's enumeration. No `codex.md` exists to quote: the legacy briefs are `implement.md`, `fix.md` and `review.md`.
- The consistency "Contract between repos" method lands in inc-019, alongside req-063.
- The 7.11 handover lists "must-answer questions still open" (C-044 vocabulary).
- Tier examples in the receipt use placeholders, not invented version numbers.

**Cross-section consequences:**

- **g4 (9 to 12, backlog.json, decisions-for-sam.md):**
  - 9.2 line "No allow rule needs adding" must go (C-064). "Owed to you" gains the `pipeline-pin/tools/**` allow rule and its `:*` twin.
  - Q29 and the backlog header still carry `crossRepoE2e`. It becomes `quality.integrationProofSource` and `integrationProofWorkflow` in `run.json` (7.7).
  - The 10 retire table must not `git mv` `build-orchestrator`, `increment-build-loop.js` or `codex/*.md`. `backlog-build.js` and `backlog-implementor` are new. The Codex briefs are deleted in inc-040 (C-007, C-072).
  - inc-015 criteria:
    - the `guard.sh` probe (hook input shape, deny in `exec`, hook trust);
    - the rejected-draft self-test;
    - the lock tests;
    - the grandchild test.
  - inc-019 criteria:
    - the two-agent Read-hook fixture;
    - the "Contract between repos" persona method;
    - req-063.
  - inc-021 criteria: shard sizing and the stack include list.
  - inc-023 criterion: a binding written mid-increment applies from the next stage.
  - inc-028 criteria: option D, the second Claude build (`parity-claude-2`) and the new measures.
  - `q-parity-bar` gains option D as the default (8.10).
  - 11.1 must name `checkout: clones` for self-hosting.
  - 12.2 item 4 (the live canary) asserts:
    - effort and model read back from the `--json` event stream;
    - a resumed read-only session refuses a write;
    - `-o` is written under read-only;
    - the session id comes from `thread.started`.
- **g2 (4 to 6):**
  - `advance`'s stage table must use these numbers. Stage 9 (added-repo set-up) and stage 11 (implement check) are `advance` rules, and stages 1, 4, 12, 19 and 27 run in-process.
  - `run-stage.sh` exits 3 on a live lock.
  - `runner.json` needs per-call progress counters, so the watcher can detect `codex-stalled`.
  - The acceptance schema has `invariants[]`, and `test` is null only for non-e2e criteria.
  - `compare` takes `--spread`.

## g4: DESIGN sections 9 to 12, backlog.json and decisions-for-sam.md

All 41 assigned changes applied. DESIGN.md was changed only with small Edit calls, plus one `sed` line-range delete of the stale 11.4 increments array. backlog.json was changed only with small Edit calls; `jq empty` passes. decisions-for-sam.md was rewritten whole (it is small). No em or en dashes in any of the three.

### Per change

| Change | Result | Where |
|---|---|---|
| C-001 | done | backlog `direction`; source `r8-merit` (kind markdown, role decision-record, tier 1, sealed); `precedence.intent` gains it with the "no weight" why; d-002 appended, d-001 superseded, every `d-001` pointer moved to d-002; invariant `inv-merit-only` (req-060 carries it as a constraint and a plan-audit criterion); 9.3 intro plus every reuse, feasibility or least-change cell re-decided on merit |
| C-002 | done | 9.3 stage-order row; 10 (`increment-build-loop.js` not moved, `backlog-build.js` new); new atom req-121 in inc-017 (two drivers, byte-identical run state and receipts); req-080 ac-2 in inc-023 depends on it; inc-029 outcome |
| C-003 | done | req-078 ac-2 (inc-023) |
| C-004 | done | req-050 ac-3 (inc-015) |
| C-007 | done | 10 retire table (Codex briefs stay, deleted in inc-040); req-049 ac-2 (contract test) and ac-3 (reviewed sort) in inc-014 |
| C-009 | done | 12.1 row 2; 12.2 item 4 live-canary assertions |
| C-010 | done | req-051 ac-2 (protected paths) and ac-3 (guard probe with its stated fallback) in inc-015 |
| C-011 | done | req-062 ac-2 (inc-019); "Owed to you" item 3 |
| C-012 | done | "Owed to you" item 4 |
| C-018 | done | `q-parity-bar` option D, recommended and default (d-007); `as-parity-bar` D; req-083 ac-2 and ac-3 (inc-028); decisions page; 12.1 row 10 |
| C-019 | done | req-123 ac-2 (shard sizing), now in inc-041 (see split below) |
| C-020 | done | new atom req-123 (stack include list) in inc-041; req-118 ac-2 (proof record) |
| C-021 | done | req-067 rewritten, ac-1 as specified plus ac-2 (acceptance never gets the plan); req-067 now depends on req-118; 9.1 Q27 |
| C-023 | done | req-063 ac-2 on the multi-repo fixture (inc-019) |
| C-025 | done | req-115 rewritten, ac-1 to ac-3 (inc-011); 12.1 new row 11a |
| C-027 | done | `cr-same-repo-set` removed from rules and increments; every combination reason now cites rule ids and a behaviour; inc-001, 006, 022, 040 re-justified; inc-014, 015, 017 re-examined and stand; inc-021 re-examined and split (below); every combined increment gains `reverseEffects` (split into member keys) |
| C-031 | done | req-117 ac-3 on the fixture (inc-018) |
| C-034 | done | 10 EUDPA-409 row rewritten; req-085 reworded plus ac-2; req-120 ac-2; inc-026 outcome and combination |
| C-035 | done | `delivery.crossRepoE2e` removed; req-024 ac-2; req-118 ac-3 (proof owed holds dependants); decisions page item 14 rewritten as a run setting; 9.1 Q29 |
| C-036 | done | inc-029 is the walking skeleton (req-086 rewritten as the end-to-end atom, key `distil--end-to-end-skeleton`, depends on req-121 and req-047); an end-to-end distil criterion added in each of inc-030 to inc-037; req-093 and req-104 reworded; req-044 merged into inc-019, inc-013 superseded, declined pair 4 removed; multi-repo fixture on req-055 (inc-017), with req-063, req-117, req-118, req-119 proved on it; canary product repos in inc-027 and inc-028 surfaces (and in the header, with edge checks); req-108 ac-2 (vertical count against the digest); 11.1 to 11.5 rewritten; 12.2 "R7 on the fixture" |
| C-037 | done | 9.3 skill-routing row (overturned by r8-merit); new atom req-122 in inc-012 with the golden-output criterion; req-043 ac-2 (standards union with hashes); 10 row for the three routing scripts |
| C-038 | done | req-036 ac-2 (the three personas) and ac-3 (budget lint) in inc-037; 9.1 Q38; 12.1 row 13 |
| C-039 | done | 9.1 Q36; req-090 ac-2 (inc-030) |
| C-040 | done | req-089 statement plus ac-2 (docx and xlsx fixtures) and ac-3 (unfetched workbook link fails P1) |
| C-041 | done | 9.1 Q18; 10 journey-builder row (frozen with banner, deleted after the EUDPA-409 spec is migrated or ruled history) |
| C-042 | done | 9.3 lifecycle and SonarCloud rows; assumption `as-push-hook-scope`, cited by req-072 (inc-022); decisions page "Owed to you" item 5; 12.1 row 16 |
| C-043 | done | req-008 ac-3 (requirements-v2 fixture); 9.1 Q3; 12.1 row 1; 12.2 item 3 |
| C-044 | done | house-rules default effect now matches its text (defer inc-016), `defaultWhy` added, B and C distinct (B adopts req-046, C supersedes it with variant req-124); dr1u default text and effect agree (park req-110); conversation-retention options A and B split by variant req-125; inc-016 deferred, inc-039 dropped, each with its defaulted decision; `class` blocking removed; `counts`, `blastRadius.blocks` and `restsOnDefault`, `defaultWhy` on every question; defaulted decisions d-004 to d-008; req-031 reworded to two behaviours; 9.2, 11.1 item 5 and decisions page |
| C-045 | done | `sam-req` kind `brief`; `q-conversation-retention` reshaped to "may other people's words be kept in git?", must-answer, blocking nothing; req-091 encodes the rule in force and is unblocked (inc-031 todo); Q35; decisions page section 1 |
| C-051 | done | a question-critic pass run by hand and recorded as `lint` on all six questions; unsourced options shown as "No source"; dr1u recommendation B; scope restated as 37 unbuilt (34 blocked, 3 deferred) with 6 ruled-out rows staying ruled |
| C-052 | done | decisions page stamped as a bootstrap view; 9.2 reduced to a pointer; req-030 ac-2 (page matches JSON) in inc-009 |
| C-053 | done | 11.1 item 0 (bootstrap verification before inc-001); every `sam-req` citation resealed (`62b7f410`), and two moved line refs fixed (131 to 148, 134 to 151, after R8 was inserted); method quotes replaced with needs; d-003 adopts the 58 atoms still resting only on current-behaviour or constraint evidence; req-021 ac-4 (strict check over this backlog, inc-007); inc-010 after inc-014 (req-081 depends on req-048, inc-010 moves to m1); `as-bootstrap-unverified` rewritten |
| C-055 | done | `as-bootstrap-unverified` and 11.1 item 2: a corrected atom of a built increment becomes a variant plus a follow-up increment |
| C-056 | done | `as-judge-on-codex` removed (a `presets.json` note, 11.1 item 6); `dv-bootstrap-by-hand` removed (run state, 11.1 item 1); `as-house-rules-by-path` recast neutrally; req-024 ac-3; req-021 extended to every prose field and executor vocabulary |
| C-057 | done | `dv-tooling-commands` narrowed to the enumerated interface; req-042 no longer names `CLAUDE.md`; no acceptance names a file path |
| C-058 | done | `repos.workspace` is `{path, role, consumes}`; ladder, knowledge, generated and github described as the registry entry in 11.4 and 10 |
| C-060 | done | req-060 statement and citation (judge-1:60 "reads the row, not the plan's paraphrase of it") |
| C-062 | done | stored outcomes removed from all 9 solo increments (including superseded inc-013) |
| C-064 | done | "No allow rule needs adding" removed; both pin allow rules in "Owed to you"; req-077 ac-2 (headless pinned tools); 9.1 Q22 |
| C-065 | done | 11.1 item 3 (`checkout: clones`); registry `generated` covers `workareas/shared/requirements-pipeline/**` (10, 11.4) |
| C-066 | done | execute-bit criterion in inc-001 (req-001), inc-015 (req-050), inc-017 (req-055), inc-021 (req-068), inc-024 (req-077) and inc-041 (req-118) |

### Decisions made without instructions (headless, recorded here)

- **inc-021 split into inc-021 and a new inc-041** ("Every product slice is proven through the real stack": req-118, req-123). C-021 makes acceptance read the proof record, so under `cr-attributability` a red stack inside the same increment would read as an acceptance failure. inc-041 sits before inc-021 in the array, and inc-021 depends on it. Ids stay stable, and inc-041 is the next free id.
- **inc-013 kept as `superseded`** by inc-019, not deleted, so no id moves.
- **New atoms:** req-121 (decision engine, C-002), req-122 (routing as data, C-037) and req-123 (stack include list, C-020), plus the variant atoms req-124 (house rules, option C) and req-125 (conversation quotes tracked, option B). Their `authoredBy.task` is `g4-reviser`, so the verifier knows who wrote them.
- **Header gained product repos** `plantsFrontend`, `plantsBackend` and `tests`, because C-036 puts the canaries' product repos into inc-027 and inc-028. The canaries come from the EUDPA-409 plants loop (8.10: `migrate --from loop-v1`). Their `consumes` lists are my reading of the service calls and must be confirmed from `docker/stack` at registration. Edge checks were added for every cross-repo edge this creates (req-082, req-083, req-111, inc-027, inc-028, inc-040).
- **Executor names are allowed in this programme's backlog only through `dv-tooling-commands`**, which now enumerates executor and preset names as the product's own interface. Without it, every atom about Codex support would fail C-056's lint.
- **d-003** is a separate decision that adopts the inferred atoms, listing them in `appliesTo`. It does not add `d-003` to each atom's own `decisions[]`: the ledger is the record, and the atom field is an optional pointer.
- **Defaults are recorded as decisions d-004 to d-008** with `decidedBy: default` and status `defaulted`, and the matching assumptions now point at them. The questions stay `open`, as 3.6 says.
- **House-rules default A defers inc-016** (effect `defer-increment`) rather than rejecting req-046, so a later ruling of B or C can bring it back. **dr1u default B parks req-110**, which drops inc-039, for the same reason. Both consequence texts say so.
- **dr1u recommendation is B**, matching the default. The 34 blocked rows rest on rulings Sam has not made, and migrating later costs no rebuild.
- **Question-critic independence.** I did not write the original questions, but I reshaped four of them (house rules, dr1u, parity bar, conversation retention). So the recorded lint (`question-critic-bootstrap`) is independent only for the other two. 11.1 item 0 has the bootstrap pass re-run the critic on all six with a fresh agent.
- **11.4 no longer mirrors the 40 increment records.** A second hand-kept copy of the file drifts, the same reason C-052 gives. 11.3 is generated from the file with `jq`, and 11.4 shows the full header.
- **The acceptance criteria follow C-057's narrowed lint.** No acceptance names a file path, so the distil criteria say "the distil workflow", not the script's file name.
- **Method-quote replacement rule:** a quote that says how (a file, a tool, a stage to add) was replaced by the need it serves, from `sam-req`, `r8-merit` or a problem statement in the same source. A judge's quote that states a required behaviour ("Refuse `verifiedBy` values…", "Run review, verify and judge Codex roles in a read-only sandbox") was kept as a decision record. All 181 markdown quotes were re-checked against their sealed lines with `jq --rawfile`.

### Cross-section consequences the next reviser must honour

- **g3, section 8.5, line 2475:** "It is written in inc-013." It is now written in inc-019 (inc-013 is superseded; req-044 moved).
- **g3, section 8.6, line 2515:** "(inc-016, blocked until Sam rules)". inc-016 is now **deferred** by d-005, the default of `q-house-rules-source`.
- **g3, any 7.x text that ties the integration proof, the stack include list or shard sizing to inc-021:** it now lands in **inc-041**, and inc-021 depends on it.
- **g1 3.14 and g2 4.2 (`check`):** the executor-vocabulary lint must let an enumerated contract (a deviation such as `dv-tooling-commands`) allow executor and preset names that are a tooling programme's own interface. As written, 4.2 refuses them "everywhere", which would refuse this programme's own atoms.
- **g2 4.2 and 3.7:** effect `defer-increment` is used by a default (d-005). A person's ruling that supersedes a defaulted decision must first undo that default's effects (un-defer, un-park), or B and C of `q-house-rules-source` and A of `q-dr1u-remainder` cannot take effect. Please state this in the `rule` description.
- **Every group:** d-001 is superseded; cite d-002 wherever the design decision is meant. The S numbers still map as S1 to S6 in 9.2, but 9.2 no longer holds a table of them.

## Fix-up reviser (2026-09-19)

Fifteen consistency problems fixed with small edits to DESIGN.md, backlog.json and decisions-for-sam.md.

1. **c-005 pick** now reads "repos follow the behaviour, so a repo set is never a reason to combine and never a limit; no ceiling counts repos", matching 3.3, 5.7, C-027 and req-104.
2. **Conflict reversals.** Every conflict now has `reverseEffects` keyed by losing side. c-002 (judge-1) supersedes req-063 by the new variant req-126, and c-003 (alignment-branch) supersedes req-062 by req-127. c-001, c-004 and c-005 carry an empty list with a `reverseNotes` entry: c-001's losing side is an unreproduced claim of fact, c-004's is forbidden by Sam's "never pre-existing" rule, and c-005's would break R7. 3.8 now documents `reverseNotes` and the `check --strict` refusal; 3.4's `variantOf` accepts `c-*` ids.
3. **Subject kind `design`** is now defined. 3.7 lists the four subject kinds (conflict, combination, surface, design) and 4.2's `rule` row documents `--subject design:<path>`. d-001 to d-003 are unchanged.
4. **Question variants.** Every option that changes behaviour now supersedes to a variant atom: req-128 and req-129 (panel options B and C, of req-099), req-130 to req-132 (parity bar options A to C, of req-083), and req-133 and req-134 (canary options B and C, of req-108). Default options keep only their `set-assumption`, because the current atom already encodes them. The defaulted decisions d-004, d-007 and d-008 are unchanged. The quotes the new atoms cite were checked against their sealed lines, and all seals match `git hash-object`.
5. **Solo titles are not stored** (option a, which agrees with 4.1, 4.2, 6.6 and C-062). 3.5 marks `title` absent on a solo, the 3.13 example lost its title, and the 9 solo increments in backlog.json lost theirs.
6. **Counts** in 11.3, 11.4, 11.5 and 11.6 now say 134 atoms and 11 variants, list req-126 to req-134, and add checks for conflict reversals and question variants.
7. **8.5** now says the seam is written in inc-019, and **8.6** says inc-016 is deferred under d-005 until Sam rules B.
8. **Role names.** The distil prose roles in 8.1 and 8.2 are now prose-editor and prose-claim-verifier.
9. **8.4 `distil-codex`** now lists reslice, matching 5.11 exactly.
10. **decisions-for-sam item 12** now says it follows from R7 and is reversed only if Sam changes R7. **Item 15** is reversed by re-running combine (`phase reset combine`), not by a join ruling. Items 2 and 5 now give the paste-ready conflict reversals for c-002 and c-003.
11. **Declined pairs 8 and 10** now rest on `cr-attributability`, with reasons that match the recorded state. The old reasons cited `cr-no-need-boundary`, but neither req-046 nor req-091 has anything in `needs`.
12. **Merge order.** The tests-before-frontends exception is dropped. 3.3 and 7.6 now follow the topological order of `consumes` (backend, frontend, tests), with the merit reason: a tests repo merged first would put specs on main for behaviour no product main has yet. req-119 ac-1 now says the tests repo merges last. The departure from the loop's `MERGE_RANK` is stated.
13. **R8.** In 7.2, "One file would be large (judge 2)" is gone, and the in-use reasons remain. 5.1's dispatcher reason is now merit: the mode comes from the same tested command that reads the phase ledger.
14. **Stops.** 7.11 now has an `environment` stop for preflight, kept distinct from the `environment` hold. Stage 20's on-failure cell in 7.4 now maps "no Docker in a Codex-orchestrated session" to hold `proof-owed`.
15. **Args.** The 2.1 diagram's distil args include `workspace` and `scope`, and the build args include `workspace` and `mode`. decisions-for-sam says "fix-now", not "must-fix".

## Fix-up reviser, second pass (2026-09-19)

1. **Parity build count.** 3.14 now says the parity proof checks the backlog hash around every one of its nine builds (three canaries under `claude`, `codex` and a second `claude` run), not six.
2. **`compare --spread`.** The 4.2 `compare` row is now `compare <p> --left <label> --right <label> [--spread <label>]`; `--spread` names the second Claude run whose Claude-to-Claude spread sets the option D bar (C-018, d-007), matching 8.10 step 6.
3. **Run labels.** 8.10 now says the canary backlog is registered three times (`parity-claude`, `parity-codex`, `parity-claude-2`) from one byte-identical file, and "All three" use `local` delivery.
4. **Atom counts, re-derived with jq.** 11.5 now says 74 of 134 atoms rest on a requirement or decision-record source, 53 cite `sam-req`, and 60 rest only on current-behaviour or constraint evidence; it states how the counts were derived. 11.6 says d-003 has 60 inferred atoms. Decision: req-127 and req-128 (variants) were **added to d-003.appliesTo** (now 60 ids, matching the jq set exactly), rather than exempting variants. 3.12's role check now says it applies to variants too, whether or not a ruling has swapped them in.
5. **inc-010 size.basis** now reads "1 criterion over 123 atoms (variants excluded), 1 area, 1 repo".
6. **req-049 ac-2** no longer says "sandbox": it reads "mentions an executor by name, an executor's permission mode, the guard-rails block or one executor's own tool". 11.6's executor scan line now names "sandbox" and says a source's verbatim quote is evidence, not a prose field (req-051's quote names a sandbox and stays).
7. **edgeChecks `by`.** All 16 string `"by": "design"` records (req-082, req-083, req-111, inc-027, inc-028, inc-040) are now `{"phase": "design", "task": "lead-architect", "run": null}`; all 18 edgeChecks records are objects. 3.4's `edgeChecks[]` row now defines `by` as a task identity with no string form, and says inc-010's registered verify rewrites design-phase records. 3.12 rule 3 and 5.4 now give the record as `{on, observableWithout, why, by}`. 11.6 adds the `by` shape to its checks.
8. **Codex write modes for every bindable distil role.** 8.2's table now puts `reslice` in task-write and `reslice-verify`, `dedupe` and `cold-reader` in read-only, followed by a sentence: every `bindable` role has exactly one mode, carried by the stage table's `sandbox` field (4.5), and `advance` refuses to bind a role with none.
9. **Owed items in the body.** Item 1 (raise "Dynamic workflow size" in `/config`) is now under the agent ceiling in 7.2. Item 4 (extend guard-edits and the secrets-read check to receipts, outputs and `build/.accept-key` before inc-014) is now in 4.5 `stage accept` step 7, with why the MAC needs it. 9.2 now lists all five owed items with the sections where each bites; it says the page must match this list item for item, and that inc-009's check (req-030 ac-2) covers questions only, so owed items are compared by review until inc-025 generates the page.

## Fix-up round 3

1. **R7 edgeChecks on the parity-bar variants.** req-130, req-131 and req-132 now carry `edgeChecks` for `on: req-050` and `on: req-085`, copied from req-083's records (a variant keeps its original's dependencies, so it keeps its edge records). The 11.6 jq check was re-run with a corrected query (the earlier one-liner compared against the wrong input): 24 cross-repo edges on nine rows (req-082, req-083, req-130, req-131, req-132, req-111, inc-027, inc-028, inc-040), none missing a record. The 11.6 sentence now names all nine rows.
2. **Defaults are reversible by one ruling.** Choice: a rule rather than an inverse effect op, because it is automatic and cannot be forgotten on any option. 3.7 now says superseding a decision reverts its effects first: `rule` writes each applied effect's `prior` (status or assumption value), and a superseding ruling restores every target to its `prior`, in reverse order, before its own effects; a target that has since moved on is named and needs `--reopens` or an explicit effect; `check --strict` refuses an applied effect with no `prior`. The 3.7 example decision, the 3.7 effects bullet, the default bullet and the 4.2 `rule` row say the same. In backlog.json every applied effect on d-004 to d-008 carries `prior`; d-005 and d-006 now also set their assumptions; d-006 and q-dr1u-remainder options B and C now `drop-increment` inc-039 explicitly (their consequence always said so); every option of a question with an assumption sets it to its own letter; the options that rule against a default say in their consequence that the deferral or drop is undone; inc-016 and inc-039 status notes cite the rule. The 3.6, 5.6 and 11.6 lint text now allows `adopt`, `park`, `reject`, `defer-increment` and `drop-increment` beside `supersede` to a variant; 8.6 and 11.1 item 5 say how each default is undone; decisions-for-sam says the same in plain words.
3. **Derived blastRadius.** 3.6 now states the rule: `restsOnDefault` counts atoms (any status, parked included; increments never) whose `assumptions` name the assumption the question's default sets. q-house-rules-source and q-dr1u-remainder are now 2 (req-045, req-046; req-005, req-110); the others stay 1, and the must-answer question 0. 11.6 and the decisions page show the counts.
4. **R2, gone further than the listed fix.** Section 8.5 now opens with the rule stated plainly: both skills' `SKILL.md`, `references/*.md` personas, `assets/routing.json` and the best-practice files it routes are read live, by path, at run time, by both executors in every sandbox mode; nothing is copied, baked or inlined; the skills are never in the tool pin; blob shas are audit records only and never hold an edit back. Changes: the persona map gained a `SKILL.md` column and rows for verify, verify-consistency, judge and fix-verify; the 8.1 prompt template reads `SKILL.md` before the persona, from the live workspace, never the pin; `standards.json` lists paths only (the baked `build/runs/<run>/standards/*.md` bundles are gone from 2.2, 4.2, 8.1, 8.5 and 8.6, replaced by the routed files' live paths); `stage accept` records standards changed since prepare in the receipt's `standardsChanged[]` as a note, never a problem; `compare` and 8.10 answer a sha difference with "re-run under the current standards", never by holding one back; each `SKILL.md` gains a "When a workflow runs this skill" section in inc-019; a contract test (`tim/test/backlog/skill-contract.test.js`, and item 5 of 4.6's workflow contract test) reads each `SKILL.md`'s worker table live and fails when a worker or its granularity changes, without blocking the skill. Backlog: new atom req-135 (`context--skills-read-live`, three e2e criteria citing sam-req lines 21 and 23) joins inc-019 (now 10 criteria, class L, dependsOn inc-018 and inc-012, split effect and why updated); req-044 now covers the `SKILL.md` seam; `inv-live-standards` now names the instructions and says hashes never hold an edit back; inc-010's basis is 124 atoms; 11.3, 11.4, 11.5, 11.6 and the C-037 trace row updated (135 atoms, 75 on a requirement source, 54 citing Sam).
5. **Which distil phases are bindable.** Choice: one rule, matching 8.2 and the build side's "every model role is bindable". Every distil phase with model tasks is bindable role by role; the `distil-codex` preset binds the † phases (characterise, extract-verify, carryover, reslice, author, verify, gap-audit); judgement phases stay on Claude under every shipped preset until a distil parity check, and are bound meanwhile with `run bind --role`. Applied in 5.2, 5.11, 8.2, 8.4, 9.3 and 11.5, and to req-109's title, statement and falsifier (which now also name reslice).
6. **8.2 table.** The paragraph that split the table now sits below it; the read-only row names review-style and review-code and adds verify-consistency.
7. **Command signatures.** Every `run bind` example (2.1, 7.11 hold table, 8.9, 9.1 Q21, decisions item 1) carries `--said`, `--by` and `--at`; 2.1's `rule` example gains `--note` and its `run start` gains `--mode`, `--at` and `--args-file`; every `migrate` example (8.10, 10, decisions item 11) carries `<path> --to <p>`.
8. **Decisions page and 8.10.** The page now lists ten exact checks, including "no missing receipt".
9. **Tracked state.** 7.6's state commit lists `build/run.json`, and a new "binding commit" paragraph commits `build/run.json` (and the journal) by name after every `run bind` or `run set`, before a run launches or resumes; 3.1's row and 7.1 step 2 say so.

## Fix-up round 4

1. **2.1's distil launch example** now carries `--mode distil --at <ISO> --args-file <file>`, matching the build example two lines below it. 4.2's `rule` row now says `--by build` takes `--at` from the workflow args and `--words`/`--note` from the plan's `reposAdded[].why`, so the surface-amendment form in 3.4, 4.2 and 7.4 is complete as written.
2. **8.5's contract-test citation** now points at item 5 of `tim/src/backlog/workflow-contract.test.js`, the test tim actually runs, rather than the non-existent `tim/test/backlog/skill-contract.test.js`; there is now one test, not two. 4.6's intro now says the test "asserts five things", matching the five numbered items already listed.
3. **11.5's variant count** now reads "three variants, req-125, req-127 and req-128", matching the 60 inferred atoms' contents.
4. **decisions-for-sam.md** now gives a "Rows resting on the default" line for q-parity-bar (1, req-083), q-panel-authority (1, req-099) and q-distil-canary-set (1, req-108), matching q-house-rules-source's format; the counts and atom keys were checked with `jq` against `backlog.json`.

## Stage consolidation (g1)

Reviser g1, 2026-09-19. Applied K-001 to K-017 from `design/consolidation/decision.md` section 9 to DESIGN.md's preamble and sections 0 to 3. Each change was made by a small Edit; nothing outside `design/` was touched, and there were no git writes.

Facts re-checked before K-008 was written: `tim/src/exec/exec.js:1` imports execa, `run` at `:24` and `runStreamed` at `:52`; `exec/parallel.js:12` `runAcross`, `:50` `runSerial`; `commands/workspace/branch.js:147-150` `checkoutArgs` gives `checkout <b>` or `checkout -b <b> --track origin/<b>` only; `clients/github-client.js` (`whoami`, `findPrsForTicket`, `getPr`, `getPrDiff`, `listWorkflowRuns`, `getRunStatus`) and `clients/jira-client.js` (`whoami`, `getTicket`, `getComments`) are read-only; `.claude/settings.json:83` allows `Bash(git -C ~/git/defra/trade-imports-workspace/*:*)`, `:88` allows `Bash(tim:*)`, and `:100-109` is the guard-bash `PreToolUse` hook on every Bash call; `review/SKILL.md:63-67` lists FILE_REVIEWER, CONSISTENCY_REVIEWER and REVIEW_ITEM_FIXER, with no verifier. All as the decision states.

- **K-001** preamble: the consolidation (C-074 to C-082) named after the triage change list.
- **K-002** 0.1: "tim decides and executes; agents judge" replaces the watcher bullet.
- **K-003** 0.2 "Lifecycle execution" row rewritten.
- **K-004 to K-007** 0.3 rows 2 to 5 rewritten as specified.
- **K-008** 0.4: the consolidation facts bullet added; the branch-only helpers bullet says `pr-ensure-draft.sh` and `wait-for-pr-checks.sh` are not ported and `npm-in-repo.sh --clone` is (the decision's "They are not ported" would otherwise have covered `npm-in-repo.sh`, which stays ported).
- **K-009** 1, principle 8: `advance` also runs every deterministic step, issued by one cheap step agent per gap.
- **K-010, K-012** 2.1 launches: `run open … ; Workflow ; run close` for both distil and build. `run open` takes `--trailer-file <file>` per decision 5.1 (not `--args-file`); distil given the same explicit form as build rather than the decision's "…", so fix-up round 4's parity between the two launch examples holds. Build args gain optional `firstStep`. A line added naming distil's two launches (C-080).
- **K-011** distil box: step agent per gap, `run (a span) | act | handback | stop`; Codex inside `advance`; a spans line; cold reader per non-empty section (C-081).
- **K-013 to K-015** build box: the loop rewritten; each stage prefixed with its run or span (M0 to M5, J1 to J4); 26d (discovered-atom verifier) and 11r (post-fix check) added in their spans; fix-verify now runs before the post-fix check; "watchers run", "run-rung.sh" and "watcher commands" gone; land, record, visible push, draft PR and merge calls and the in-process CI wait named; the Codex line replaced. Decided: M2 is shown as its own "7f-8f finalise" line plus the conditional "9 added repos", because M2 runs on every increment, not only when a repo is added.
- **K-016** 2.2: decision-engine row; Codex runner row (`tim backlog codex run`, `guard.sh`, `test-support/fake-codex.js`); "Rung runner" and "Pre-push check" rows deleted; tool pin row is `tim backlog pin`; the PR and CI helpers row split into "PR, CI and Jira writes" (tim) and "npm in a clone" (ported); rows added for the step agent prompt, the span walker and the mechanical macros. Also, not in K-016 but the same fact: the `backlog-distil.js` row's "so only model phases spawn agents" now reads "model phases run as spans and one cheap step agent per gap runs everything else".
- **K-017** 3.1: fact-record row added; `build/state.json` written by also "the macros"; `build/.accept-key` also keys `factMac`, written by `run start` inside `run open`. `distil/phases.json`'s writer likewise says `run start` (inside `run open`).
- **Beyond the list, same sections:** 3.3's `ladder[]` bullet said `run-rung.sh` refuses an uncommitted script and "the workflow expands a rung"; it now says `tim backlog rung` refuses it and tim expands and runs the rung in-process with its fact record. It also gains `exclusive: true` on a rung, which decision 3 (id 6) and K-046's `rungParallel` presuppose but no K-item defined.

Sweep of lines 1 to the end of section 3 for `watcher`, `run-rung`, `pre-push-check`, `run-stage`, `pin-tools`, `fake-codex`, `wait`, `relay`, `pr-ensure-draft`, `wait-for-pr-checks` and `sonar-check-pending`: every remaining match is intended (0.3 row 2 and 0.4's Sonar bullet name `sonar-check-pending.sh` as a fact about the repo and why it is unused; 0.4 names the branch-only helpers as facts; `test-support/fake-codex.js` is the new test double).

Consequences for later groups:
- **g2 (4.2):** the `run` row still documents `run start --label --mode --at --args-file`. Decision 5.1's `run open` takes `--trailer-file` and no `--args-file`, and prints the Workflow args itself; 2.1 now follows 5.1. g2 should say in K-021 whether `run open` writes an args file or only prints the args, and keep `run start` as the inner step `run open` calls (3.1 now says so for `.accept-key` and `phases.json`).
- **g2 (4.2, 4.5):** the rung registry's new `exclusive` field (3.3) needs to appear wherever the registry schema or `rung` is documented, and K-046's `rungParallel` should cite it.
- **g2 and g3:** fact records are defined only for build (`build/runs/…/facts/`). Distil's in-process phases (gates, `ingest`, `trace`) run inside `advance --distil` too; if they should write fact records, the path would be `distil/runs/<label>/<phase>/facts/<step>.json`. Not added to 3.1, because no K-item or decision section says so; g2 (5.12, K-037) or g3 (8.1, K-051) should decide.
- **g3 (7.4):** 2.1's build box now carries the run and span prefixes and the ids 7f, 8f, 11r and 26d; 7.4's "Run or span" column (K-042) should use the same labels.

## Stage consolidation (g2)

Applied K-018 to K-038 to DESIGN.md sections 4 to 6 with small Edits (one `sed` over the nine new macro-table rows). No git writes. Facts re-checked first: `tim/src/exec/{exec,parallel,stack}.js`, `commands/workspace/{branch,test,…}.js`, the four clients, and `test-support/git-fixtures.js` exports `createBareRepo` (:31), `pushCommit` (:80), `createFatClone` (:97).

- **K-018** 4.2 `advance` row: `--agent`, `--budget-seconds`; executes every mechanical sub-step; returns `run` (span), `act` (outward only), `handback`, `stop`, or exit 75; observes outward effects; `--record` and `wait` removed. `advance --distil` gains `--agent` and "spans; `then: close`". `advance --record` row deleted.
- **K-019** the `act` paragraph rewritten; "Verify-skip … to the end" kept.
- **K-020** new table "Mechanical macros and outward commands": `prepare`, `rung`, `check`, `prove`, `land`, `ci-wait`, `record`, `codex run`, `pin` (bare verbs, matching the other 4.2 tables), then an outward table (refspec push, `tim github pr ensure-draft | checks | merge`, `tim jira create | transition`). Decided: the lost `run-rung.sh` and `run-stage.sh` row detail (C-067 uncommitted refusal, timeout hold, C-015 descendant kill) is carried into the `rung` and `codex run` rows. Added the registry's `exclusive: true` rung field there and tied it to `quality.rungParallel` (g1's consequence).
- **K-021** `run` row gains `open` and `close`. Decided (g1's question): `run open` writes the args file itself and prints the Workflow args; `run start`/`run end` stay as the inner steps, still callable for people and recovery. `stage prepare` gains `[--span <name>]`.
- **K-022** 4.3: one step agent in flight; exit 75 added to the exit-code list.
- **K-023 to K-028** 4.5: opening sentence and last sentence; stage-table fields with `cost`, `span`, `after[]`, `when` (plus a sentence naming what `span` holds); `stage prepare` now eight things, step 6 "step agent", step 8 the span; `stage accept` cross-checks fact records, receipt carries `counts` and `upstreamShas`, fix diff saved; audit gains Facts, Observation, Spans and skips; "step agent misrelays"; the tim-runs-git paragraph replaced. Beyond the list, same facts: accept step 8's `run-stage.sh` resume became `tim backlog codex run`; the audit's Invariants bullet "rung `.exit`" became "rung fact record".
- **K-029 to K-031** 4.6: rows for `run-stage.sh`, `run-rung.sh`, `pre-push-check.sh`, `pin-tools.sh` deleted; ported row is now `npm-in-repo.sh --clone` only, carrying the pinned-prefix and JSON-stdout facts that lived in the `pin-tools.sh` row; Codex home row says `tim backlog codex run`; self-test row per K-029; `sonar-check-pending.sh` moved out of "unchanged" with the reason. Rails: four texts; PUSH RULE via `land`/`record`; COMMIT RULE "tim makes every commit", and its Sonar deviation now says "the pipeline commits" (agents no longer commit); STEP AGENT text added; contract test asserts six things, item 1 covers four texts, item 6 the span walker. Execute-bit sentence names the two remaining scripts.
- **K-032** 4.7: fixture write operations, octokit and Jira POST MockAgent, fake Codex; "none new for the consolidation".
- **K-033** 4.8: `advance/**` row rewritten; workflow rows "run (a span), act, handback or stop"; rows added for `macros/**`, `git/**`, `codex/runner.js` (the `pkill ; grep` merit moved here from the deleted `run-stage.sh` row), `facts.js`, the span walker, and the `tim github pr`/`tim jira` verbs; rows for `run-stage.sh`, `fake-codex.sh`, `run-rung.sh`, `pre-push-check.sh`, `pin-tools.sh` deleted.
- **K-034** 5.1: NEW and RESUME use `run open` (with `firstStep`) and `run close`. Beyond the list: Workflow args gain `firstStep?`; "State commits" now says `run close` commits and returns the state push as a visible call (the skill no longer commits); a "Every launch" bullet added.
- **K-035** 5.2: intro rewritten ("step is Haiku at low effort"); every "Runs in" cell names its DM/DJ run or span per decision section 4; phase 20 records "not read: empty"; gate paragraph "A gate is where a span ends…". Added an "Agents per distil run" paragraph (66, 64 with no flagged slice).
- **K-036** 5.11: Codex inside `advance`, the Opus cap governs span walking, `distil-codex` counts. Beyond the list: tier bullet "step", and the Codex-orchestrated sentence no longer names `run-stage.sh`.
- **K-037** 5.12: fact records and `upstreamShas` in the resume point. Decided (g1's question): distil in-process phases DO write fact records, same shape and MAC, at `distil/runs/<label>/<phase>/facts/<step>.json`.
- **K-038** 6.2 section 11 row: cold readers read and not read. Beyond the list: 6.6's cold-reader bullet says "every section with content".

Sweep of sections 4 to 6 for `watcher`, `run-rung`, `pre-push-check`, `run-stage`, `pin-tools`, `fake-codex`, `--record`, `status: wait`, `sonar-check-pending`, `pr-ensure-draft`, `wait-for-pr-checks`, `read-only git`, `calls GitHub`, `.exit`: remaining matches are intended (the `advance` row says `--record` is removed; `codex run` cites `run-stage.sh`'s contract as lineage; `fake-codex.js` is the new double; `sonar-check-pending.sh` is named as leaving).

Consequences for later groups:
- **g1 area (fix-up):** 3.1's files table has only the build fact-record row; add `distil/runs/<label>/<phase>/facts/<step>.json` (decided in 5.12).
- **g3 (8.1, K-051):** folder layout should show distil `facts/` too; receipt fields `counts` and `upstreamShas` are defined in 4.5 accept step 7 with the six count names.
- **g3 (8.2, K-052):** 4.2's `codex run` row now holds the lock, slice, correction and kill contract in summary and defers the exit-code table to 8.2, so 8.2 must keep it; the old `--check` behaviour (effective config, one no-op resume, full-access check for a Codex-orchestrated session) now lives only in 8.2, since the 4.6 row that also held it is deleted.
- **g3 (7.7, K-046):** `rungParallel` should cite 4.2's `exclusive` sentence.
- **g3 (7.1, 7.3):** 5.1 says `run open` writes the args file and prints the args; 5.1 RESUME passes `resumeFromRunId` only when args are identical, and a `firstStep` in args makes them differ, so 7.8 should say a resume relaunch takes `firstStep` from the new `run open` and relies on `advance`'s re-derivation, not journal replay.
- **g4 (12.1):** the `run close` state push in distil is a new visible call the skill runs; S3 in the decision covers build only.

## Stage consolidation (g3)

Reviser g3 applied K-039 to K-058 to DESIGN.md sections 7 and 8, with small Edits and one `sed` fixing a line citation. No git writes.

**Applied:**
- **7.1 (K-039):** preflight, pin, `run start` and schema export are one step, `tim backlog run open … --trailer-file <file> [--pin] --json`; `run end`, `counts` and the handover print are `tim backlog run close`, which returns the state push as a visible call when `record` is `commit-push`. Bindings now come first (step 1), because `run open` may run leading light sub-steps under them. Codex login check is `tim backlog codex run --check`; the pin check is "the pinned tim answers `--version --json`".
- **7.2 (K-040):** loop replaced with decision 3.1 (firstStep, span walk, `then: close`, handback, stop; no `act` or `wait` branch). The step agent's behaviour is summarised inline and points at the STEP AGENT text in 4.6. Ceiling: about 43 agents a typical increment, about 16 increments before the 200-agent reserve; the pre-fan-out check is now a pre-span check. The owed-to-Sam bullet says "about 43 agents".
- **7.3 (K-041):** args gain `firstStep`; preflight runs in `run open`; the pin check reworded; a new bullet says a `firstStep` makes `resumeFromRunId` inapplicable and that resume does not depend on it (answers g2's 7.3/7.8 consequence).
- **7.4 (K-042, K-043, K-044):** intro defines "tim, `<macro>`", "Step agent", "Visible call" and "Run or span". Table gains a "Run or span" column using g1's labels (M0 to M5, J1 to J4), Kind uses 4.5's `mechanical | outward | model`, and rows 7f-8f, 26d, 11r and 26s are added in execution order (26d sits in J3 after judge; 11r in M4 after fix-verify). Runs-as cells per K-043. Added an "Agents per increment" paragraph (4 step agents, 5 first of run; +1 per red round; +1 under `integrationProofSource: ci`). Sharding and tooling-increment bullets use `tim backlog rung`.
- **7.5 (beyond the K-list, same facts):** `command` invariants: `tim backlog rung` and a fact record instead of `run-rung.sh` and `.exit`.
- **7.6 (K-045):** state commit by `tim backlog record`, state push a visible call (26s); PR exit 3 from `tim github pr ensure-draft`. The "landed as one unit" bullet now says tim commits, generates one visible push per repo, the sync merge travels with it, pushes are observed, and a re-run finds its commit by the `Backlog-Increment:` trailer.
- **7.7 (K-046):** `stepBudget` 40, `rungParallel` true (cites 4.2's `exclusive`), `pushSyncMerge` false added to the JSON and knob table; `codexParallel` names `tim backlog codex run`.
- **7.8 (K-047):** new "Resume within a mechanical run" bullet; `resumeFromRunId` bullet says it replays harmlessly and nothing depends on it.
- **7.9 (K-048):** step-agent row and wrongly-skipped-task row as given; `tim github pr checks` for CI; also added "a mechanical step's result is edited or invented" (factMac) and "It was pushed" (observed) rows, and the invariant row reads a rung fact record.
- **7.10 (K-049):** `discover` is called at the judge's accept; the verifier is stage 26d in span J3, `when: discovered > 0`; `record` adopts.
- **7.11 (beyond K-list):** `codex-stalled` names `tim backlog codex run` and its `--check`; the `environment` stop no longer names a missing pin allow rule.
- **7.12 (K-050):** `tim backlog pin` via `run open --pin`, canonical real path install, reuse of an intact pin. The pin allow-rule sentence is deleted: the pinned tim runs through the allowed `npm --prefix ~/git/defra/trade-imports-workspace/*` rule (`settings.json:85`, not 88 as K-050's sibling K-005 cites for `tim:*`), and pushes through `git -C` (`:83`). The "bash tools" pin bullet now names only the two hook adapters.
- **8.1 (K-051):** layout adds `facts/<step>.json` for build and distil with the field list; `stage.json` notes span `after[]`, `when`, `then`; `input/upstream/` holds references by path in a span; `.run.lock` held by `tim backlog codex run`. Receipt example gains `counts` (six names from 4.5 accept step 7, `null` when not produced) and `upstreamShas`, each with a bullet. `.accept-key` also signs `factMac`.
- **8.2 (K-052):** Claude adapter: "relayed by the step agent"; the C-070 check is now per span and includes `after`/`when`; new span-walker bullet; finalise runs on the next `advance`. Codex adapter: Codex runs in-process in `advance`; an all-Codex span costs no agent of its own; a mixed span adds one Haiku Codex runner, whose prompt keeps the old watcher's exit handling but runs `${TIM} backlog codex run`. The runner section is retitled `tim backlog codex run` (`tim/src/backlog/codex/runner.js`), every behaviour bullet and the exit-code table kept; descendant walk uses `ps -A -o pid=,ppid=`; `${PIN_TOOLS}` bullet deleted; `--self-test` is vitest against `test-support/fake-codex.js`. The Codex flag check against `exec --help` moved to `--check`, because a fake binary cannot test the real one's flags.
- **8.3 (K-053):** both profile cells say "run by the pipeline's own commands".
- **8.4 (K-054):** tier "step"; `codex` preset keeps only the step agents; "Where commands run" and "No Sonnet or Opus under `codex`" per K-054.
- **8.7 (K-055):** PreToolUse row gains the local-git/outward/allowlist sentence; push-record row drops the advisory pending script with the reason; SessionStart row names `run open`.
- **8.8 (K-056):** replaced with decision 6.1 and 6.2 (plus the clean-increment 33 and a short "Why not fewer" from 6.3), prefaced with Sam's "the cost of a run is its agents".
- **8.10 (K-057):** Claude usage gains cheap agents per increment by tier.
- **8.11 (K-058):** the loop is the step agent's loop with `--agent <label>:codex`, no `--record`, handback continues, a Claude-bound task stops it `claude-needed`; Docker row runs through `advance`; the pre-push-check line is tim's branch proof and fast-forward check plus observation; `--check` names the tim command; the classifier row notes tim's refusals and observation remain.

**Calls made:**
- Sub-step rows (7f-8f, 11r, 26d, 26s) are rows in the 7.4 table rather than notes, so the table mirrors tim's stage table and 2.1's box exactly.
- 8.11's Codex session passes `--agent <label>:codex`; `advance` requires `--agent` (4.2), and a fixed id means the step budget handback just tells the session to call again.
- Kept "the workflow owns git" in the 8.3 profiles: still true from the task's view, and the manifest proves it.

A final sweep of sections 7 and 8 for `watcher`, `run-rung`, `pre-push-check`, `run-stage`, `pin-tools`, `fake-codex`, `--record`, `pr-ensure-draft`, `wait-for-pr-checks`, `sonar-check-pending`, `PIN_TOOLS`, `pgrep`, `.exit`, `run start`, `run end`, `relay` and `allow rule` found only intended uses (historical "before" columns, `run start`/`run end` as steps inside `run open`/`run close`, and the note that the pending script is not used).

**Consequences for later groups:**
- **g4, 9.2 and 11.1 (K-059, K-062):** 7.12 no longer owes a pin allow rule; the cite for the pinned tim's allowlist is `settings.json:85` (`npm --prefix ~/…/*`), not `:88`.
- **g4, 9.3 Q22 row (line ~2816):** still says every Codex call goes through `tools/codex/run-stage.sh` and the pinned copy needs an allow rule; not in the K-list but stale on the same facts — should read `tim backlog codex run`, no allow rule.
- **g4, 12.2 item 5:** says "drained by watchers only"; K-066 covers it.
- **2.1 cross-check (done):** 2.1 lines 242 and 247 place 26d in J3 and 11r in M4, matching 7.4; nothing owed.

## Stage consolidation (g4)

Reviser g4 applied K-059 to K-082 to DESIGN.md sections 9 to 12, `design/backlog.json` and `design/decisions-for-sam.md`, with small Edits and one `sed` renumbering the 12.2 list. It wrote one new file, `consolidation/sam-steer.md`. No git writes. `jq empty` passes.

**Facts checked:** `settings.json:83` (`git -C ~/…:*`), `:85` (`npm --prefix ~/…/*:*`) and `:88` (`tim:*`) are as cited. `sam-requirements.md` is still blob `62b7f410`; line 134 and line 140 hold the quoted text. `sam-steer.md` is blob `dd27b6ed`.

**Applied:**
- **9.2 (K-059):** owed item 2 (pin allow rules) deleted, list renumbered to four, "five things" now "four". A closing line says the pin needs no allow rule (`settings.json:85`). The SonarCloud item never named the pending script; it now says "the pipeline commits".
- **9.3 (K-060):** stage-order row "tim decides and executes; agents judge" with the revised refusals; SonarCloud row drops the pending script, with the reason; Lifecycle actions row rewritten from decision section 7 (local effects in tim and tested; outward calls generated, visible, observed; the allowlist is not the gate). Also "the pipeline commits", and "three routing stages" in the routing row.
- **9.1 Q22 (g3's consequence):** now `tim backlog codex run`, in-process in `advance`, no allow rule; reverse is "build with `checkout: live` and no pin".
- **10 (K-061):** a "not ported" row for the two FA-branch helpers, and a "Never written" paragraph naming the five bash tools, what carries each in tim, and "inc-040 retires nothing of these".
- **11.1 (K-062):** the pin allow-rule sentence deleted.
- **11.2:** m1 now lists inc-042.
- **11.3 (K-063, K-064):** intro counts 142 atoms, 42 increments, 41 live, 33 combined; a paragraph on what the consolidation added; criteria and members updated for inc-001, inc-017, inc-019, inc-022, inc-029, inc-037 and inc-041; inc-042 row after inc-024; `sequence` note for inc-042; C-064/C-066 row replaced and C-074 to C-082 rows added.
- **11.4 (K-065):** header `sources` gains `sam-steer`; 142 atoms and 42 increments.
- **11.5 (K-065):** rows req-136 to req-142; authorship sentence names the consolidation; counts recomputed with `jq` (82 of 142 rest on a requirement or decision record, 61 cite `sam-req`, 8 cite `sam-steer`); req-001's title updated.
- **11.6 (K-065):** largest increment is inc-019 at 12; `sam-steer` bullet; the 19 new quotes checked against their lines.
- **12.1 (K-066):** risks 19 to 22 added (a step agent alters a command; the span walker diverges; a large relayed span graph; allowlisted outward calls). Risk 2 names `tim backlog codex run --check`; risk 5 says "before each span"; risk 7 drops the allow rule; risk 16 says "the pipeline commits".
- **12.2 (K-066):** item 4 names the vitest suite against `fake-codex.js`; item 5 "drained by step agents … one step agent per gap"; new item 6 (local git writes on fixtures, including a failed-reported push that reached the remote) and item 11 (agent counts per increment from the canary journal, against decision section 6). The list is renumbered 1 to 13; nothing cites 12.2 item numbers.
- **backlog.json (K-067 to K-080):** source `sam-steer` added in the full shape `sam-req` uses (kind brief, role requirement, tier 1, sealed blob), and placed second in the `intent` precedence order. req-001, req-050 ac-6, req-055 (ac-3 gone), req-118 (ac-4 gone), req-068, req-077 and req-121 reworded. req-136 to req-142 appended. inc-001, inc-017, inc-019, inc-022, inc-029, inc-037 and inc-041 updated (members, size, `why`, `split`, `outcome`). inc-042 inserted after inc-024.
- **decisions-for-sam.md (K-081, K-082):** owed item 2 deleted and the list renumbered; the guard item gains `build/runs/**/facts/*.json`; the Sonar item says tim reads the PR checks. Calls 20 to 25 appended as given. **Safety-line calls added as 26 to 30**: S1 (branch push its own call; reverse `land --push`), S3 (state push; reverse `record commit`), S5 (CI wait in tim; reverse: return `pr checks --wait` as a call), S6 (merge per repo with `--expect-head`; reverse `delivery.merge never`), S7 (Jira calls; reverse: leave `ticketing` unset). S2, S4 and S8 are calls 21, 22 and 20. Call 1 now says only the cheap step agents stay on Claude (about 2 an increment). The intro says where calls 20 to 30 come from.

**Calls made:**
- **inc-042 also depends on inc-017.** K-080 lists `["inc-015","inc-019","inc-020","inc-022","inc-041"]`, but req-137 depends on req-121 (inc-017), and 11.6 requires `dependsOn` to equal the lifted dependencies exactly. The file and the 11.3 row carry inc-017, and 11.3 says why. The jq lift check over every live increment returns no mismatch.
- **The safety line is kept as decision section 7 has it.** Each push, draft PR, merge and Jira write stays its own visible call inside the step agent for that gap. It costs a Bash call, never an agent, and it is the only form guard-bash sees in full. Pushes stay native `git -C` because octokit cannot push, and moving them into tim would hide them from every per-call guard. The PR, merge and Jira writes go through tim's octokit and `jira-client`, because the tim rails are library-first, but each is still issued as its own call. CI waiting and all local git work run in tim, because they are read-only or local and reversible. Nothing outward is batched into a macro.
- **Fact records in the guard-edits owed item.** Fact records carry `factMac` and are what the audit trusts (C-082), so guard-edits and the secrets-read check must cover `build/runs/**/facts/*.json` like receipts. This was added to 9.2 item 3 and to the page's owed item 3, keeping the two lists identical.
- **Sources for the new atoms.** Each cites `sam-steer` by line (5, 6 or 7) and `sam-req` line 134. req-138 also cites `sam-req` line 140 (the per-tool-call hooks), because visibility to those hooks is its reason. req-068's new ac-2 uses ac-1's source (s1, judge-3); K-071's "source `sam-req` as ac-1" was read as "the same source as ac-1", because ac-1 cites no `sam-req`.
- **req-121 gains an `s4` source** (`sam-steer` line 5), cited by ac-2, because its new statement ("carry out every local, reversible step itself") rests on the steer. So 8 atoms cite `sam-steer`, not 7.
- **d-002** (the design adoption decision) was also updated: its answer no longer says "lifecycle actions run by Claude watchers", and its `sealedEvidence` gains `sam-steer`.
- **req-001's title and inc-001's outcome** now name the draft PR command and check waiter, not "helpers on main"; the key `port--pr-helpers` is unchanged, so ids stay stable.
- **Risk numbering.** The four new risks are 19 to 22, appended, rather than lettered sub-rows.

**Checks run (jq):** parses; every live increment's `dependsOn` equals its lifted member dependencies; every `size.basis` count equals its members' criteria (largest 12); every combined increment's `split` equals its members' keys; every non-variant atom sits in one live increment; 142 atoms, 42 increments; no em or en dashes in `backlog.json` or the decisions page. All 19 new quotes are substrings of their cited lines.

A final search of sections 9 to 12 for `watcher`, `run-rung`, `pre-push-check`, `run-stage`, `pin-tools`, `fake-codex.sh`, `allow rule`, `pending script`, `135 atoms` and `41 increments` found only intended uses: the historical "before" column of the Lifecycle row, the Q22 and 9.2 "no allow rule" sentences, and the "Never written" paragraph.

**Consequences for later groups:**
- **Fix-up, 4.5 `stage accept` step 7 and 8.7:** the guard-edits and secrets-read scope now includes `build/runs/**/facts/*.json` (9.2 item 3). Those sections still name only receipts, outputs and `.accept-key`.
- **Fix-up, 3.1 files table (from g2):** still needs the distil fact-record row.
- **Fix-up, `corrections/change-list.md`:** the owed item numbers in 9.2 moved (hook is now 2, guard 3, Sonar 4). DESIGN.md 4.5 `stage accept` step 7 (line 1105) says "This is owed item 4 in 9.2". It is now item 3, and its path list should gain `build/runs/**/facts/*.json`. 7.2's "owed item 1" (line 1890) is still right. Both are outside g4's sections, so they were left for the fix-up.
- **inc-010's verification** must include `sam-steer` among the sealed sources it checks quotes against.
