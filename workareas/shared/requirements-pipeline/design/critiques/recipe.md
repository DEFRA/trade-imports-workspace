# Critique: requirement, not recipe, and two-pass

Lens: every field, persona instruction, example and tool that lets HOW leak into `backlog.json`, makes combining work on recipes, or breaks re-derivability after rulings. Checked against DESIGN.md, `design/backlog.json`, decisions-for-sam.md, sam-requirements.md, rules-probe.md, and `.claude/skills/review/references/FILE_REVIEWER.md` and `CONSISTENCY_REVIEWER.md`.

Counts come from `jq` over `design/backlog.json` on 18 September 2026.

---

## Blockers

### B1. The programme's own backlog fails its own writer, and its "requirements" are the design's recipes

**Problem.** DESIGN 3.12 says the writer refuses an atom whose evidence comes only from `constraint`, `consistency-anchor` or `current-behaviour` sources, unless the atom is `hygiene` or a decision adopts it. It also says `stated` needs a requirement-role source or a decision. The programme backlog breaks both rules at scale.

**Evidence.**
- Source roles in the header: `sam-req` is the only `requirement` source. `synthesis`, `gap-1/2/4/5`, `h-rails` and `g-reports` are `current-behaviour`. `rules-probe` and `workspace-code` are `constraint`. The three `judge-*` files are `decision-record`.
- 92 of 120 atoms cite no requirement-role source. 64 cite only constraint or current-behaviour sources: req-001 to 009, 011 to 015, 018, 022, 023, 025, 026, 028 to 035, 038, 055 to 058, 061, 064, 066, 067, 071 to 077, 079, 082, 085 to 087, 090 to 100, 102, 106, 110, 111 and 113.
- 27 atoms are `stated` with no requirement-role source, for example req-016, which cites only judge-1.
- The only decision, `d-001`, has `appliesTo: []`, so it adopts nothing. It is `decidedBy: "panel"` with no registered panel run.
- The quotes are method, not need:
  - req-008: "Base the one writer on `tim parity ingest` + `set.js` + `io.js` + `schema.js`. Do not write a new one."
  - req-005: "cherry-pick the `workareas/shared/dr1-parity-union/` … paths only"
  - req-050: "a committed `tools/codex/run-stage.sh` wrapper"
  - req-016: "Add `--op-id` idempotency to every writer command."
  - req-054: "Add a tim test asserting that the workflow's GUARD RAILS equals the canonical doc."
  - req-002: "Clones/installs need the canonical `pwd -P` path"
- `show --brief` hands "each member with its acceptance, sources and quotes" to every build task (4.2). So these recipes reach every planner, reviewer and acceptance task as requirement evidence.

**Fix.**
1. Make the design's calls decisions: add one `d-NNN` per ruled design choice, with `appliesTo` listing its atoms. Sam should rule it, because no registered panel run exists.
2. Or re-source each atom to `sam-req` where Sam's text supports it, and mark the rest `inferred`, adopted by a named decision.
3. Replace every method quote with the need it serves. For example, req-016 should cite a quote about replayed writes, not `--op-id`.
4. Run `check --strict` in its planned form over `design/backlog.json` as the acceptance of inc-007. It must pass before inc-010.

### B2. Acceptance is not independent of the plan

**Problem.** Principle 10 and req-067 say acceptance judges the change "against the backlog, not against the plan". The design does not deliver that.

**Evidence.**
- 3.1 lists `build/plans/<id>.md` as read by "every later stage", which includes acceptance (stage 21).
- 8.1 leaves `input/upstream.json` as "accepted outputs of earlier stages this task needs", with no per-stage list.
- 7.4 (line 1609): a criterion witnessed `e2e` is `needs-e2e` until stage 25, and it becomes `met` "when its run is green". The suite being green says nothing about whether any test exercises that criterion. The link from criterion to test exists only in the plan's `acceptanceMap`.
- Most criteria are `e2e` (the acceptance dump shows e2e in about 110 of 125). So req-067 ac-1, "a plan whose proofs pass but whose change misses one criterion", cannot fail for the common case.

**Fix.**
- The acceptance input set is `brief.json`, the manifest diffs, the ladder and E2E logs, and per-test results. `stage prepare` must not copy the plan or the plan's output into an acceptance task. `stage audit` checks that it did not.
- Stage 25 records results per test, not a suite exit code. A re-run of acceptance after stage 25 must map each `e2e` criterion to a named passing test that it has read and judged to exercise the criterion. The acceptance task finds that test itself, not through the plan's `acceptanceMap`.
- A criterion with no such test is `not-met`.

---

## Majors

### M1. Reviewers and the judge are not given the requirement and the plan, and the persona seam misses `ticket.md`

**Problem.** The review personas are read live. They get their intent and acceptance criteria from `ticket.md`, and the seam does not say what replaces it.

**Evidence.**
- `FILE_REVIEWER.md:50` reads "the ticket AC", `:82` says "Read `ticket.md` for AC and intent", and `:179` reviews "Correctness vs the AC in `ticket.md`". `CONSISTENCY_REVIEWER.md:16` reads `ticket.md` for "change intent and AC".
- The seam table in 8.5 maps inputs, diff, writing findings, commit and refresh mode, but has no row for `ticket.md`.
- No stage states whether review, verify or judge gets the plan. Without the plan's Decisions and Out of scope, reviewers flag deliberate deferrals and the judge cannot tell `defer` from `fix-now`.

**Fix.** Add a per-stage input matrix to the stage table (4.5) and have `stage prepare` enforce it:

| Stage | Gets the brief (requirement) | Gets the plan |
|---|---|---|
| plan-audit | yes | yes |
| review-style, review-code, consistency | yes | yes |
| verify | yes | yes |
| judge | yes | yes |
| fix | yes | yes |
| acceptance | yes | **no** (B2) |

Add a seam row: "`ticket.md` (AC and intent) becomes `input/brief.json` (the members' acceptance, decisions and invariants) plus `input/upstream/plan.md` (approach, decisions, out of scope)."

### M2. Ids do not survive rulings for solo increments or regrouped increments

**Problem.** req-106 and Example 3 say the increment keeps its id after a ruling supersedes a member. Nothing in the design makes that happen.

**Evidence.**
- 5.7 keeps only "every group whose members are unchanged". A supersede changes the members, so the combiner re-authors the group, and nothing obliges it to reuse the key.
- 4.4: re-combine matches "by stable content". Changed content does not match.
- A solo increment is keyed `solo--<atom key>`. A variant atom has a new key (req-041 against req-040), so the solo key and its id change.
- The three blocked increments in this programme, inc-016, inc-031 and inc-039, are all solo. They are exactly the rows that rulings will hit.
- 3.9 does not say what status a solo increment gets when its only member is `superseded`. `dropped` covers only parked or rejected members.

**Fix.**
- Increment identity follows `supersededBy`. Ingest resolves each member to its supersession root. A solo key becomes `solo--<root atom key>`, and a group is matched by the set of member roots.
- Ingest carries the key forward deterministically, whatever the combiner writes.
- Add a test: rule a variant onto a solo increment's member and onto one member of a combined group, and assert both ids are unchanged.

### M3. No path exists for a ruling or correction that touches built work

**Problem.** The design has three different stories for changing an atom whose increment is already built, and the writer supports none of them.

**Evidence.**
- `q-dr1u-remainder` option C has the effect `reject req-005`. req-005 is a member of inc-002, which is built second. 4.3 says ingest refuses to regroup or strike a started or ruled item, so a C answer given after inc-002 lands has no defined outcome.
- `as-bootstrap-unverified` says a corrected atom "re-opens that increment". 11.1 says it "re-opens as discovered work". 3.9 has no `done` to `todo` transition.
- 3.4 freezes `statement` "at first ingest". This programme's atoms are ingested by `migrate --from design` as `proposed` (10), so inc-010's verifier cannot correct a statement, only acceptance fields.

**Fix.**
- Define how `tim backlog rule` handles an effect on a member of a started or done increment. It must refuse, unless the decision carries `reopens: true`. In that case it creates a variant atom and a follow-up solo increment that depends on the done one, and it leaves the done row and `doneBy` untouched.
- Freeze `statement` at the first `adopted` ingest, not at migrate.
- Make `as-bootstrap-unverified` and 11.1 say the same thing: a follow-up increment through `discover`.

### M4. A ruling can be applied without the ruled behaviour ever reaching acceptance

**Problem.** Some questions have options whose effects are identical, so the backlog records that a ruling was made but not what it chose.

**Evidence.**
- `q-conversation-retention`: options A (quotes local only) and B (quotes tracked) both have the effect `clear-need req-091`. req-091's acceptance says nothing about where quotes live.
- `q-house-rules-source`: B and C both have the effect `clear-need req-046`.
- The backlog alone therefore cannot tell A from B, and stage 21 cannot verify the option that was ruled. The decision words reach the brief, but acceptance checks criteria, not decisions.
- `q-house-rules-source`'s default is A, whose effect is `reject req-046`. That drops inc-016, yet decisions-for-sam.md and 9.2 say "inc-016 stays blocked".

**Fix.**
- Every option that changes behaviour carries `supersede` effects to variant atoms whose acceptance encodes the option. For example, one variant of req-091 has the criterion "the tracked backlog holds no conversational quote".
- `question lint` refuses two options with identical effects on a `blocking` or `must-answer` question.
- Correct the house-rules default so its effect matches the text: "A applies to req-045; req-046 stays blocked" means no reject on default.

### M5. Executor and build-mode detail are already in the programme backlog, through prose that nothing lints

**Problem.** The strict schema catches recipe and executor detail only when it arrives as a named key. Free text is not checked, and the programme backlog already uses it.

**Evidence.**
- `as-judge-on-codex`: "In the codex preset the judge and acceptance run on Codex". This is preset content, and belongs in `presets.json`.
- `dv-bootstrap-by-hand`: "built by hand in the main session, not by the build workflow". This says who builds.
- `as-house-rules-by-path`: "both executors read the four house rules from Sam's memory files by path". This is context resolution, which R5 gives to the implementor.
- 3.14 refuses keys by name, and the recipe lint (req-021, 3.12) covers only acceptance and statement. Assumptions, deviations, invariants, direction, increment `outcome` and `why`, `combination.why`, `statusNote` and question text are unlinted.

**Fix.**
- Move `as-judge-on-codex` to `presets.json` (already Q21). Move `dv-bootstrap-by-hand` to `build/run.json` or the journal and handover. Recast `as-house-rules-by-path` as a neutral requirement: "house rules reach every style, implement and fix task".
- Extend `check`'s recipe and executor lint to every prose field in `backlog.json`, with an executor vocabulary: Claude, Codex, preset, Opus, Sonnet, Haiku, sandbox, main session, workflow agent, by hand.
- Extend req-024's acceptance: the backlog contains no executor vocabulary.

### M6. `dv-tooling-commands` switches off the recipe lint for the whole programme

**Problem.** One deviation licenses file paths in every criterion, the very thing the recipe lint exists to stop.

**Evidence.**
- `dv-tooling-commands`: "Acceptance may name the pipeline's own commands, skills, workflows and file paths."
- 3.12 allows an override "only by a decision that says a route or a document shape is contract".
- `inv-no-recipe` says "no files, commands, steps".

**Fix.** Narrow the deviation to an enumerated interface contract: `tim backlog` verbs and flags, documented exit codes, skill trigger phrases and stop-reason names. Drive the lint's allow-list from that list. File paths stay refused.

### M7. The ladder sits in the backlog, which contradicts Principle 1 and `inv-no-recipe`

**Problem.** The design says the backlog refuses ladders and commands, then puts both in the header.

**Evidence.**
- Principle 1: "The v2 schema refuses file lists, commands, ladders, skill names and executor fields by name."
- 3.3 and the programme header carry `repos.workspace.ladder` (`format:check`, `lint`, `test`, and the script path `tools/backlog/self-test.sh`, which does not exist yet) and `generated[]` file globs.
- 3.14 classes the ladder as "meta (definition of done)". The lint and the invariant therefore disagree about what is allowed.

**Fix.** Choose one:
- **Preferred:** move `ladder`, `generated` and `knowledge` to the registry entry or `build/repos.json`. They describe repos, not requirements, and are identical for every programme touching a repo.
- Or amend Principle 1 and `inv-no-recipe` to "no per-row how; repo-level definition-of-done rungs are meta", and exempt only that path in the lint.

### M8. Combining was driven by implementation structure, and nothing fences what the combiner reads

**Problem.** The programme's combination rationale names implementation components, not shared behaviour.

**Evidence.** From `combination.why`:
- inc-006: "Every write goes through the same lock, hash check and validation"
- inc-014: "Prepare, accept and audit are one task-folder contract"
- inc-015: "One fake-Codex run proves slicing, sandboxes and bindings"
- inc-017: "One zero-model fixture run proves the loop, args, ceiling and resume"
- inc-021: "All six are inputs to the done gate". This groups acceptance, ladder facts, baseline hygiene, secrets, SonarCloud and the E2E proof by one code component.
- inc-022: "One lifecycle stage table, three strategies"

`cr-same-repo-set` is vacuous here, because every increment's repos are `["workspace"]`. So `areas`, which are module names (writer, state, build), was the only discriminator. 5.7 does not say what the COMBINER may read. Mid-build it could read `build/plans/*` or the design.

**Fix.**
- The COMBINER reads only atoms, the ledgers and `candidates --combine` output.
- `combination.why` must cite candidate signal ids.
- The COMBINE_VERIFIER rubric fails a group justified by a shared implementation component.
- The prose lint (M5) covers `combination.why`.
- Re-combine the programme with those rules. Re-examine inc-021's six members for attributability.

### M9. Discovered atoms skip the recipe check and carry code coordinates

**Problem.** Work the judge discovers enters the backlog already adopted, without the recipe check other atoms get.

**Evidence.**
- In 7.10 the judge's `discovered[]` carries `source: {finding, file, line}`.
- Each item is "born `adopted` … verified by the judge task". The judge is not REQUIREMENT_VERIFIER and does not run the recipe-smell rubric (5.4).
- A judge writing from a code finding naturally writes "MUST extract X from controller.js".

**Fix.**
- Discovered atoms are born `proposed`. The record stage runs one REQUIREMENT_VERIFIER task, a different task, plus the recipe lint before adoption.
- `file` and `line` stay in `build/state.json` and the journal, never in atom `sources`.

### M10. The plan can change the surface after lifecycle stages have run on the old one

**Problem.** A plan may add a repo to an increment, but by then the branch, baseline and routing stages have already run on the backlog's repo list.

**Evidence.**
- 7.5: "A repo the plan adds to the surface is allowed … but it must carry a reason."
- Stages 3 (Branch), 4 (Baseline), 5 (Sync), 6 (Ladder facts) and 7 (repo-level Routing) all run before stage 8 (Plan), on the backlog surface. The added repo has no branch, no baseline and no sync.
- The design does not say whether the plan's repo list is written back into the atom's `surface.repos`. Either the recipe edits the requirement, or the backlog surface is stale for P11, the merge order and the report.

**Fix.**
- A plan that adds a repo returns `surfaceChange`. The workflow holds the increment `surface-changed`, and a `discover` or `rule` write updates the member atom's `surface.repos`, which is requirement-level, with the plan's reason.
- The retry then starts from stage 3.
- The plan's own file list never writes the backlog.

### M11. The destination for legacy recipe fields is undefined

**Problem.** req-085 names a destination for migrated recipe fields that does not exist.

**Evidence.**
- req-085: "with recipe fields moved to plan notes". No "plan notes" file exists in 3.1 or 10.
- If migrated `filesToTouch`, `obligations` or `targetTree` reach the JIT planner, they become a pre-written, stale recipe. That defeats "plans it just in time" (R1).

**Fix.**
- Migration writes legacy recipe fields to `distil/sources/<legacy-id>/units.json` as an `existing-backlog` source with role `current-behaviour`. They can be cited, and they never enter `brief.json` or `standards.json`.
- Reword req-085 to match.

### M12. The design's own HOW has no sanctioned route to this programme's planners

**Problem.** The planners for this programme will not see the design they are meant to build.

**Evidence.**
- `repos.workspace.knowledge` lists `CLAUDE.md`, `tim/CLAUDE.md`, `tim/README.md`, `docs/agent-skills.md`, `docs/git-conventions.md` and `AUDITOR.md`. DESIGN.md is not listed, and it is not a registered source.
- The stage-folder contract, receipts, `git mv` lineage and stage numbering exist only in DESIGN.md.
- A JIT planner for inc-014 either reinvents the design or reconstructs it from the method quotes in B1, which is the leak B1 removes.

**Fix.** Add `workareas/shared/requirements-pipeline/design/DESIGN.md` to `repos.workspace.knowledge`. The header reading list is the design's sanctioned channel for how. Record that the rows stay requirement-only.

---

## Minors

### m1. The diagram and a source quote contradict 7.5 on what the plan audit reads

- Line 188 says the plan audit "reads the backlog row, not the plan".
- req-060 quotes judge-1: "a different agent reads the row, not the plan".
- 7.5 says it reads both.
- **Fix:** reword both to "derives the requirement from the row, never from the plan's restatement of it".

### m2. Example 3 is internally inconsistent

- The 3.6 option A effects omit `supersede req-044 by req-045`, which the 3.7 decision and the ruling text apply.
- `blastRadius.increments: 1` is correct, but the effects list covers only one of the two members.
- **Fix:** add the effect to option A. Add the matching req-045 variant to option B.

### m3. A solo increment's `outcome` is a stored copy of the frozen statement

- Examples: inc-003, inc-010 and inc-013 carry "MUST" text.
- The `prose` phase can rewrite `outcome` (4.1 prose slots), so it can drift from the frozen statement. This contradicts "nothing is copied" (3.12).
- **Fix:** render a solo increment's outcome from its member at read time and do not store it. Alternatively, exclude solo outcomes from COPY_EDITOR.

### m4. Code citations bring back a quiet exemplar slot

- 3.4 `ref` examples include `frontend:src/.../schema.js:12-30`. `consistency-anchor` citations with code quotes reach the planner through `brief.json`.
- 0.3 claims the exemplar leak is removed.
- **Fix:** `show --brief` labels non-requirement citations "evidence of current behaviour, not a design to copy". The plan audit objects when the plan's Decisions adopt a cited file as a template without a stated reason.
