# R7 audit: full-stack slices, traced through DESIGN.md end to end

19 September 2026. Auditor: R7 full-stack slices. Read in full: `analysis/sam-requirements.md` (R1 to R8), `analysis/rules-probe.md`. Read in part, by line range: `design/DESIGN.md` sections 0 to 12, `design/backlog.json` (increments, R7 atoms, combination, repos), `design/decisions-for-sam.md`, `critiques/all-findings.json` (R7-related entries), and the live persona `.claude/skills/review/references/CONSISTENCY_REVIEWER.md`.

Judged only on what R7 asks for in use, and on R8's criteria. Build effort, file count and diff size carry no weight here.

## Verdict

The design **states** R7 well: principle 9, the atom grain rule (5.3 item 5), the strict `repo` refusal (3.14), no repo ceiling (3.3, 5.7), "pass 2 never re-splits" (5.7), one plan and one implement task (7.4), one consistency task (8.5), the integration proof in the done gate (4.5, 7.9), one branch name (3.3, 7.4 stage 3) and merge order with providers first (7.6). Codex implements the whole slice in one task with the workspace as its working directory (8.2), so R6 and R7 agree.

The **mechanisms** behind those statements have gaps. Two of them defeat R7 in use:

1. **The layer-chain check can never fire** (r7-slices-01, blocker). P11 refuses a dependency between rows that "share an area but have disjoint repo sets". But the next row of the same table makes every product row include the tests repo. So a backend-plus-tests row and a frontend-plus-tests row always share `tests`, and their repo sets are never disjoint. req-115's own acceptance example (a frontend increment depending on a backend increment for the same page) passes the check once both carry the tests repo, as P11 forces them to.
2. **Nothing checks the contract between repos** (r7-slices-02, blocker). The design gives the consistency task that job (8.5, 0.2 row 24) and says the persona's method is read unchanged (8.5, "The seam"). But the live `CONSISTENCY_REVIEWER.md` only compares **peer patterns**: config keys, dependency bumps, middleware, test presence and docs present in one repo and absent in another (lines 45-62). It has no method for a provider and a consumer agreeing on a route, a field, a type, an enum or an error. R2 forbids putting that method in a brief. So under this design nobody checks the contract. The `contractFindings[]` it would produce also have no route through verify and judge (r7-slices-03).

The other findings are majors and minors. Each is a proposal below.

## Trace, part by part

### Requirement and atom definition (3.3, 3.4, 3.5, 3.12, 3.14)

- **Good.** `surface.repos` is "every repo the behaviour needs … never divides it". The layer field `repo` is refused by name, and an increment's surface is the union of its members' surfaces. No repo ceiling.
- **Gap: repo roles cannot express provider and consumer** (r7-slices-05). `role` is `product | tests | workspace | tooling` (3.3). Yet 7.6 says merge order "defaults from repo roles: providers first (backend, reference data, stubs, gateway) … consumers (frontends)". No role says which repo is a provider. The layer checks need the same fact: which product repo serves which.
- **Gap: atom kinds invite horizontal atoms** (r7-slices-07). `data`, `reference-data` and `integration` are kinds. With no rule for who observes them, "the backend stores X" or "the reference data holds Y" is a valid atom. That is a layer that a later behaviour consumes.
- **Gap: `class: test`** exists on increments (3.5). Under R7 a `test` increment is valid only for hygiene. Fold into r7-slices-01.
- **Gap: `carriedFrom` is one string** (3.4). Re-slicing merges several legacy rows (frontend, backend, tests) into one atom, so a string loses lineage (r7-slices-12).
- **Gap: who knows which repos a behaviour needs** (r7-slices-08). The author writes `surface.repos` from sources that seldom name repos. Nothing checks whether a repo was left out, and the plan's additions (7.5) are never fed back to measure the distiller.

### Distiller: slicing, authoring, verification (5.2 to 5.4, 5.9)

- **Good.** The grain rule is vertical (5.3 item 5). The author writes vertical atoms with an end-to-end criterion (5.4). The verifier merges atoms that "only test, document or supply one layer of another" (5.4). REQUIREMENT_VERIFIER carries a layer-split check (5.9).
- **Gap: the SLICER has no R7 rule** (r7-slices-06). Slices "own units from every source" (5.9), and P2 checks only that each unit has one owner. Nothing stops a slice from being a repo or a layer ("backend", "API", "data model"), for example when a code source's units are sliced by the repo they came from. The author "stays inside its slice" (5.4), so a layer slice can only produce layer atoms.

### Completeness checks (3.12 table, 5.4 P11)

- **Tests-only**: works.
- **Layer chain**: broken, as the verdict says (r7-slices-01). It also checks only pairs. It does not check chains (backend, then frontend, then tests), and it asks only "share an area". R7's actual test, "an increment whose acceptance can only be observed after another increment in a different repo lands", is not implemented by anything.
- **No integration proof**: covers product repos only. For a programme with no product repo, 3.12 says the proof is an `e2e` criterion that runs the real entry point, but no check enforces it for `workspace` and `tooling` rows (r7-slices-13). It also clashes with the red-baseline hygiene route (r7-slices-11).
- **Proof or documentation only**: enforced only by the verifier's judgement and `cr-no-layer-split`. That is acceptable, but this programme's own backlog breaks it (inc-013, r7-slices-14).

### Pass 2: combining (5.7)

- **Good.** "Pass 2 never re-splits". There is no repo limit, and the must-combine rule `cr-no-layer-split` exists.
- **Gap: `cr-same-repo-set` makes repos a grouping axis** (r7-slices-04). Under R7 almost every product atom has the same repo set (frontend, backend, tests), so the rule is either no signal or a licence to combine unrelated behaviour. `candidates --combine` and `duplicates` both use "same repo set" as a signal. This programme's backlog cites it as a reason for combining four increments. Nothing stops a combiner or a decline from citing a repo or layer difference.

### Implementor (7.4 to 7.6, 4.5)

- **Good.** One plan (stage 8) and one implement task (stage 11) cover the slice. No build stage fans out per repo (4.5). The plan audit refuses a plan that "leaves out a repo the behaviour needs, or defers a layer" (7.5). Commits exist for every touched repo, the integration proof is in the done gate, PRs are green before any merge, and a partial merge stops `pr-left-open`.
- **Gap: a repo the plan adds has no branch, baseline, sync or ladder facts** (r7-slices-09). Stages 3 to 7 run on the backlog surface's repos before the plan. The plan may add a repo (7.5), but nothing re-runs stages 3 to 7 for it. Implement then writes into a repo on whatever branch its checkout happens to be on. That breaks the branch-parity rule and leaves the added repo with no baseline, so any red there cannot be classed.
- **Gap: the integration proof does not have to exercise this slice** (r7-slices-10). The done gate asks for "a green integration-proof record: the tests repo's end-to-end or contract suite" (4.5). A green run of existing specs passes even when no spec touches the new behaviour. Nothing records which specs map to which `e2e` or `contract` criterion.
- **Gap: the proof may run against the wrong code** (r7-slices-10). `tim docker dev` builds every repo-backed service from its local checkout. Untouched repos may be mid-spike on other branches (memory: "repos/ checkouts move mid-session", "often mid-spike"). The `crossRepoE2e` route uses `-b <branch>`, which falls back to `:latest` for each service. A touched repo whose branch image never published then quietly runs without its change, and the proof passes on a stack that does not hold the slice.
- **Gap: the integration proof runs after land, PR and CI** (r7-slices-15). Stage 25 comes after stage 22 (push). So a slice that fails its integration proof has already been pushed. The acceptance stage (21) has to mark `e2e` criteria `needs-e2e`, and repair edits at stage 25 (and at ladder-repair and ci-fix) are never reviewed, by the per-file reviewers or the consistency task. A repair that changes the contract between repos, the most likely repair in a full-stack slice, reaches `done` unreviewed.
- **Gap: per-file reviewers see one file** (folded into r7-slices-02). A backend controller's reviewer is not told which frontend client or tests spec consumes it. R7 says "Reviewers see the change in every repo".
- **Gap: merge order under `programme` delivery** (r7-slices-16). Sam merges the programme's PRs at the end by hand, and nothing gives him the order or the one-unit rule.
- **Gap: the audit does not check branch parity** (r7-slices-09). "The same branch name in every repo" is a stage action (stage 3), not a recorded fact the audit checks.

### Executors (8.2 to 8.11)

- **Good.** Codex's implement task runs with `-s workspace-write` and the workspace as its working directory (8.2), so one Codex context can write every repo the slice touches. The consistency and acceptance tasks read the whole slice on both executors.
- **Gap: Codex-orchestrated mode batches the proof** (r7-slices-17). `proof-owed` "releases itself once the next Claude session runs the suite for all of them in one stack start" (8.11). One stack run over N slices cannot say which slice broke, and meanwhile later increments build on unproven slices. The critique set already records that Codex's implementer cannot run E2E or `mvn verify` (critic finding on rungs). This proposal covers only the R7 consequence.

### Migration (10, 8.10)

- **Gap: "proposed atoms, then RECOMBINE" does not re-slice** (r7-slices-12). Turning each legacy layer row into a proposed atom gives layer atoms. Combining only joins atoms, and it cannot turn "frontend for X", "backend for X" and "tests for X" into one vertical atom with one statement and one set of acceptance criteria. The verifier's merge rule might catch some cases, but nothing in migration groups legacy rows by behaviour, and nothing says what happens to a slice that is half built (backend row done, frontend row todo). The plants backlog (47 frontend-only, 10 tests-only) and the three parity canaries (8.10) both depend on this step.

### This programme's own backlog (11, `backlog.json`)

- It has one repo (`workspace`), so repo-level R7 is trivially met. But the tooling version of R7, where each increment is a thin end-to-end slice through the tool's real entry point, is not met:
  - **The distiller is built one pipeline layer at a time** (r7-slices-14): phase ledger (inc-029), then sources (030), atoms (032), reconcile (033), trace and critic (034), questions (035), combine (036) and report (037). The first run of `backlog-distil.js` and the skill end to end is inc-038. The "e2e" criteria of req-086, req-093 and req-104 run one tim check, not the distiller. That is the "schema then writer then tests" pattern, by pipeline phase.
  - **inc-013** (persona seam, one `review`-witnessed criterion) is documentation that supplies a layer to inc-019's review stage. `cr-no-layer-split` should have merged it. It was declined under attributability instead (declined pair 4).
  - **The build path first builds a full-stack product slice at inc-027.** The R7 build behaviours (req-063, req-117, req-118, req-119) are proven against "an increment spanning three repos" in inc-018 to inc-022, but no multi-repo fixture programme is defined for them, and 12.2 does not name R7 as a thing to prove early.
  - **inc-027 and inc-028** list `repos: ["workspace"]`, but their canary builds commit to a frontend, a backend and the tests repo.
  - **inc-038's canary** compares against the plants digest, which is layer-split. "Explain each difference" does not measure R7.

## Proposals

Severity follows the brief: a blocker defeats R7 in use, a major weakens it materially, and a minor is a gap in completeness or reporting.

There are 17 proposals: 2 blockers, 12 majors and 3 minors.

### r7-slices-01 (blocker): the layer-chain check never fires. Compare product repos, check chains, and implement R7's observability test

- **Sections:** 3.12 (vertical slices table), 5.4 (P11), 4.2 (`check`), 3.5 (`class`), 12.1 row 11; backlog req-115 and inc-011.
- **Now:** refused when "a `dependsOn` edge joins two atoms or increments that share an area but have disjoint repo sets".
- **Problem:** the "No integration proof" row puts the tests repo in every product row. So two product rows always share `tests` and are never disjoint, and the check cannot fire on any row that passes P11's other rows. "Share an area" also misses a split whose halves are named differently (`notification-api` and `notification-form`). Only pairs are checked, never chains. R7's own test, "acceptance can only be observed after another increment in a different repo lands", is implemented nowhere.
- **Change:**
  1. Compute each row's **product repo set**: `surface.repos` filtered to `role: product`. Refuse any `dependsOn` edge, on atoms and on lifted increment edges, between two rows whose product repo sets are both non-empty and disjoint. Drop the shared-area condition.
  2. Refuse any dependency path of two or more edges whose product repo sets step from provider to consumer (using r7-slices-05's `consumes`), or that ends in a tests-only row.
  3. For every other cross-repo edge that survives, REQUIREMENT_VERIFIER (for atoms) and COMBINE_VERIFIER (for increments) record `edgeCheck {observableWithout, why}`. It answers: "can the dependant's acceptance be observed at its boundary before the dependency lands?" `check --strict` refuses an edge that has no record. It also refuses one whose dependency is provider-only, cannot be observed by its own actor, and has `observableWithout: false`.
  4. The exception stays: a decision that names the edge.
  5. Restrict increment `class: test` to rows whose members are all `hygiene`.
  6. Rewrite req-115's acceptance. Given a backend-and-tests increment and a frontend-and-tests increment for the same behaviour, where the frontend depends on the backend, the strict check fails and names both. Add a second criterion for a backend-to-frontend-to-tests chain.

### r7-slices-02 (blocker): nobody checks the contract between repos. Put the method in the review skill's persona, and name the seams in the plan

- **Sections:** 8.5, 7.5, 8.1 (consistency and plan schemas), 0.2 row 24, 0.4; inc-013, inc-019, req-063.
- **Now:** "One consistency task per increment … It also checks the contract between repos (R7)". The method sections are "read unchanged".
- **Problem:** the live `CONSISTENCY_REVIEWER.md` (lines 45-62) checks only peer patterns: config keys, dependency bumps, structural patterns, test presence, docs and flags "present in some repos, absent in others". It has no method for a provider and a consumer agreeing. R2 forbids writing that method into a brief, so the design's claim has no mechanism. Per-file reviewers see one file and are never told what sits on the other side of a seam.
- **Change:**
  1. Add a method section, "Contract between repos", to `.claude/skills/review/references/CONSISTENCY_REVIEWER.md` itself. It is owned by the review skill, so people get it too and R2 holds. The reviewer enumerates every seam in the diffs:
     - HTTP routes and methods, with request and response fields, types, optionality, enum values, status and error codes;
     - messages and events;
     - persisted documents another service reads;
     - reference-data lookups;
     - the tests repo's page objects, fixtures and API clients, against the rendered DOM and the API.

     For each seam it checks that provider and consumer agree, and each finding cites both sides as `repo:path:line`.
  2. The plan schema gains `seams[{id, kind, provider{repoKey, what}, consumer{repoKey, what}, change: new | changed | unchanged}]`. The plan audit refuses a plan that touches two or more product repos and names no seam.
  3. The consistency output gains `seams[{seamId, verdict: agrees | disagrees | not-checked, providerRef, consumerRef}]`. The stage audit requires a verdict other than `not-checked` for every plan seam.
  4. Every per-file review task gets `input/slice.json`, holding the plan's seams and every changed file in every repo. The review-file brief says: when the file is on a seam, read the counterpart before ruling.
  5. Add a criterion to req-063: given a backend field that was renamed while the frontend still sends the old name, when review runs, then the consistency result names the mismatch with both sides. Land the persona change with inc-019 (see r7-slices-14).

### r7-slices-03 (major): consistency and contract findings have no route through verify, judge and fix

- **Sections:** 7.4 stages 15 to 18, 4.5 (the stage audit), 8.1 (schemas).
- **Now:** verify fans out "per file with findings". The consistency output holds `contractFindings[]` and `missing[]`, which are not per-file findings.
- **Problem:** a cross-repo finding never gets a verify task. The judge's "ruling for every verified finding" never sees it, so R7's most valuable findings can be dropped with no trace.
- **Change:**
  1. Consistency findings take the review finding shape: `{id, severity, claim, failureScenario, fix, confidence, refs[repo:path:line]}`.
  2. Add a `verify-consistency` task. It fans out once, runs when the consistency output has findings, and defaults to refuted.
  3. The judge rules on those findings. A fix goes to REVIEW_ITEM_FIXER, whose files may span repos, and fix-verify confirms it.
  4. The audit requires a ruling for every verified consistency finding.

### r7-slices-04 (major): retire `cr-same-repo-set`. Repos are never a reason to combine or to keep apart

- **Sections:** 5.7 (rules, candidates), 4.2 (`candidates`, `duplicates`), 3.13 example 2; `backlog.json` `combination.rules` and inc-001, inc-006, inc-022, inc-040.
- **Now:** `cr-same-repo-set`: "Members touch the same repos, so one implementation context serves them all". "Same repo set" is a signal for both candidates and duplicates.
- **Problem:** under R7, nearly every product atom touches the same repos (frontend, backend, tests), so the signal either says nothing or lets unrelated behaviour be combined. It keeps repos as an axis for dividing work, which R7 forbids. Nothing stops a decline that cites a repo or layer difference.
- **Change:**
  1. Remove `cr-same-repo-set` from the default rules, and remove the repo-set signal from `candidates --combine` and `duplicates`.
  2. COMBINE_VERIFIER fails a group whose only shared signal is its repos, and a `declined[]` entry whose reason is a repo or layer difference.
  3. `check --strict` refuses a `combination.rules` entry keyed on repos.
  4. Re-justify inc-001, inc-006, inc-022 and inc-040 by `cr-same-surface` or `cr-same-acceptance-boundary`, and fix example 2.

### r7-slices-05 (major): add repo topology (`consumes`), so merge order and the layer checks have facts to work from

- **Sections:** 3.3 (Repo, Delivery), 7.6 (merge order), 3.12.
- **Now:** `role` is `product | tests | workspace | tooling`, and "Merge order defaults from repo roles: providers first (backend, reference data, stubs, gateway)…".
- **Problem:** no role distinguishes provider from consumer, so the default order cannot be derived as written. r7-slices-01 needs the same fact.
- **Change:**
  1. Repo gains `consumes[repoKey]`: the repos it calls at run time. For example, `plantsFrontend` consumes `plantsBackend` and `referenceData`, and `tests` consumes every product repo. It describes the system and never assigns work. Class it meta.
  2. `check` refuses a cycle in `consumes`.
  3. The default merge order is the topological order of `consumes`, providers first. The tests repo keeps the loop's rank, before the frontends, unless `delivery.merge.order` overrides it.
  4. P11 uses `consumes` for chain detection.
  5. `init` and the interviewer fill it from `docker/stack` service dependencies, then confirm it with the person.

### r7-slices-06 (major): the SLICER may cut by repo or layer. Make slices behaviour areas, and check it

- **Sections:** 5.9 (SLICER), 5.2 phase 6, 4.2 (`slices`, P2), 8.1 (slice schema).
- **Now:** "Slices own units from every source; one cross-cutting owner; a brief per slice". P2 checks ownership only.
- **Problem:** a slice named for a repo or a layer (backend, API, data model, tests), or cut by the code repo a unit came from, makes every atom in it a layer atom, because the author "stays inside its slice".
- **Change:**
  1. Add a SLICER rule: a slice is an area of behaviour someone observes, such as a journey section, a page group, a capability or an exchange with an outside system. It is never a repo, a layer, a technology or a source. Units from code sources (roles constraint, consistency-anchor and current-behaviour) go to the behaviour slice they inform.
  2. The slice schema gains `behaviour`: one sentence naming the observer and the outcome.
  3. `slices --strict` flags a slice whose units all come from one code repo, or whose id or brief names a repo key or a layer word. A flagged slice fails unless its record carries a written reason.
  4. The contract phase (7) shows the slice list with each behaviour sentence.

### r7-slices-07 (major): the `data`, `reference-data` and `integration` kinds let horizontal atoms in

- **Sections:** 3.4 (`kind`), 5.3 (contract section 3), 5.4 (verifier), 5.9.
- **Now:** these kinds are allowed with no rule for who observes them.
- **Problem:** "the backend stores X" or "the reference data holds Y" is a valid atom whose only observer is a later atom in the same programme. That is a provider layer, disguised as a kind.
- **Change:**
  1. In the profile and the contract template, define each kind by its observer:
     - `data`: a persisted or published shape that a system outside the programme, or an operator, observes at a boundary;
     - `reference-data`: values a user sees or a rule applies, observed through that behaviour;
     - `integration`: an exchange with a system outside the programme's repos.
  2. REQUIREMENT_VERIFIER merges an atom whose only observer is another atom of the same programme into the behaviour that observes it.
  3. The contract's "What is not a requirement" gains, by example: "a store, collection, endpoint or list that only this programme's own frontend reads".

### r7-slices-08 (minor): repo inclusion is guessed at distil time, never checked, and never measured

- **Sections:** 3.4 (`surface`), 5.4, 7.5, 6.2 (sections 6 and 12).
- **Now:** the author names the repos, and the plan may add a repo "with a reason".
- **Problem:** nothing asks whether a repo was left out, and the plan's additions are thrown away. So how well the distiller infers slices is never measured, and a missing provider can pass as a frontend-only atom.
- **Change:**
  1. The author's brief includes the header repos with `role`, `consumes` and `knowledge`.
  2. The verifier asks of each atom: "which repo would a person have to change for each criterion to be observed?"
  3. The plan's additions are persisted as `state.plan.reposAdded[{repoKey, why}]`.
  4. The report shows "repos the distiller missed" per increment in section 12, and the total in section 6.

### r7-slices-09 (major): a repo the plan adds gets no branch, baseline, sync or ladder facts, and the audit never checks branch parity

- **Sections:** 7.4 stages 3 to 7 and 10 to 12, 7.5, 4.5 (the audit); req-117.
- **Now:** branch, baseline, sync, ladder facts and repo-level routing run over "every repo of the surface" before the plan. "A repo the plan adds to the surface is allowed".
- **Problem:** implement then writes into an added repo on whatever branch its checkout is on, which breaks CLAUDE.md rule 2. There is no baseline, so a red cannot be classed as pre-existing. Nothing proves that every touched repo ended up on the same branch name.
- **Change:**
  1. After the plan audit approves, when `plan.repos` holds a repo not in `state.branches`, run stages 3 to 7 for the added repos before stage 10.
  2. When the manifest (stage 12) shows a changed repo that is not in the plan, hold `stage-failed` naming it.
  3. The stage audit requires every repo in the manifest to have the same `state.branches` name, equal to the delivery branch or the increment's branch, plus a baseline record and ladder results.
  4. Add a criterion to req-117: given a plan that adds a repo, the added repo is branched, baselined and laddered before implement runs.

### r7-slices-10 (major): the integration proof must exercise this slice, on this slice's code

- **Sections:** 4.5 (the audit), 7.4 stage 25, 7.5 (`integrationProof`, `acceptanceMap`), 7.9; `scripts/stack` and `tim docker`.
- **Now:** "a green integration-proof record: the tests repo's end-to-end or contract suite, run against the real stack". Stage 25 runs `tim docker dev` and `test:docker-compose`, or the `crossRepoE2e` route runs against branch-tagged images.
- **Problem:** a green run of existing specs passes with no spec touching the new behaviour. `tim docker dev` builds every repo-backed service from its local checkout, including untouched repos that may be mid-spike on another branch. The `-b` route falls back to `:latest` for each service, so a touched repo whose branch image never published silently runs without its change.
- **Change:**
  1. Give `state.integrationProof` a schema: `{mode: local | cross-repo-e2e, stack[{service, repoKey, source: local | image, ref}], specs[{path, criteria[{member, criterionId}], result}], newOrChanged[path], run, at}`. The spec list comes from the runner's JSON reporter, not from an agent.
  2. The audit requires:
     - every touched repo's service built from that repo's head for the attempt, or an image resolved to its branch tag and never a `:latest` fallback;
     - every untouched service run from its `:latest` image, or from a clean checkout of its base;
     - every member criterion witnessed `e2e` or `contract` mapped to a passed spec;
     - at least one spec new or changed in this increment, unless the plan's evidence check names an existing spec that already proves the criterion.
  3. Add an include list to the stack script, for example `-d` only for named services, so stage 25 builds only the touched repos from source. This is a flag on the committed wrapper, not a hand-assembled compose chain.

### r7-slices-11 (major): the red-baseline hygiene increment is refused by P11, so the hold it should release never releases

- **Sections:** 3.12 (the "No integration proof" row: "Exception: none"), 7.4 stage 6, 7.10.
- **Now:** a red baseline rung becomes a hygiene increment through `discover`, and the current increment is held `baseline-red` with `releasedBy` pointing at that hygiene increment.
- **Problem:** a hygiene fix to one product repo, such as a red lint rung in the backend, has no `e2e` or `contract` criterion and no tests repo. P11 refuses it at `discover` and at `check`. The held increment then waits forever.
- **Change:**
  1. Give `hygiene` its own proof. A hygiene increment in a product repo needs a regression proof: the rung that was red is now green, and, when the stack serves that repo, the existing end-to-end suite is green on the slice's stack.
  2. It does not need the tests repo. It is the only single-repo product increment P11 allows.
  3. The verifier refuses a hygiene atom whose statement adds behaviour.
  4. Stage 6 writes its discovered item with that criterion.

### r7-slices-12 (major): migration does not re-slice. Add a RESLICE phase that authors one vertical atom per behaviour

- **Sections:** 10 (backlogs), 4.2 (`migrate`), 3.4 (`carriedFrom`), 8.10 (canaries); req-120 and inc-026.
- **Now:** migration "turns layer-split rows into proposed atoms (R7), then a RECOMBINE and verify in the distiller".
- **Problem:** each proposed atom is still one layer. Combining only joins atoms, so it cannot turn "frontend for X", "backend for X" and "tests for X" into one statement with one set of acceptance criteria. A half-built behaviour (backend done, frontend todo) has no rule. `carriedFrom` is one string, so the lineage of three rows is lost. The plants restart and the three parity canaries depend on this step.
- **Change:**
  1. `migrate --from loop-v1` writes unbuilt rows as proposed legacy atoms. It also writes `distil/reslice.json`: candidate behaviour groups built from shared areas and titles, dependency edges across different `repo` tags, and "tests for" relations.
  2. A new distil phase `reslice` (think tier) runs a RESLICER persona, cut from COMBINER. It authors one vertical atom per behaviour, with `carriedFrom: string[]` naming every legacy row. A different task verifies it, and the legacy layer atoms become `superseded` by the vertical atom.
  3. Built legacy rows stay `done` as history. When part of a behaviour is built, the vertical atom cites that code as `current-behaviour` evidence, and its acceptance covers the whole behaviour, so the plan's evidence check records the built part as met.
  4. P11 at ingest refuses any migrated row that is still layer-split.
  5. New criterion for req-120: given a frontend row, a backend row and a tests row for one behaviour, migration and reslice produce one adopted vertical atom whose `carriedFrom` lists all three, and no layer row stays buildable.

### r7-slices-13 (minor): P11 does not apply to workspace and tooling programmes, although 3.12 says their proof is an end-to-end run

- **Sections:** 3.12 (the table and the paragraph after it), 5.4 P11, 4.5.
- **Now:** "For a programme with no product repo … the integration proof is then an `e2e` criterion, met by spawning the CLI or running the workflow end to end against a fixture programme". The check fires only for `product` repos.
- **Problem:** this programme's rows pass P11 whatever their criteria. For example, inc-013's only criterion is `review`.
- **Change:**
  1. Extend the "No integration proof" row. A `feat` or `fix` increment whose repos are all `workspace` or `tooling` needs at least one member criterion witnessed `e2e` that runs the tool's real entry point (a CLI command, a workflow run or a skill) against a fixture programme. `docs`, `chore` and hygiene are exempt.
  2. The audit records that run's exit code and output as the integration proof.

### r7-slices-14 (major): this programme's own backlog builds the distiller one layer at a time, and proves R7 on the build path late

- **Sections:** 11.1 to 11.5, 12.2; `backlog.json` inc-013, inc-019, inc-027, inc-028, inc-029 to inc-038, req-044, req-063, req-086, req-093, req-104, req-117 to req-119, and declined pair 4.
- **Now:** the distiller is built as phase ledger (inc-029), sources (030), atoms (032), reconcile (033), trace and critic (034), questions (035), combine (036) and report (037). It first runs end to end at inc-038. inc-013's persona seam stands alone. The first full-stack product build is inc-027.
- **Problem:** this is R7's anti-pattern applied to tooling: one pipeline layer per increment, with the integration proof deferred to the last. The "e2e" criteria of req-086, req-093 and req-104 run a single tim check. inc-013 is documentation that supplies inc-019's review stage. The R7 build behaviours have no multi-repo fixture to be proven on until the real canaries.
- **Change:**
  1. Make inc-029 a walking skeleton: "One markdown source distils end to end into a backlog and a report". The skill's NEW mode and `backlog-distil.js` run heads, characterise, author, verify, ingest, solo increments and report on a one-source fixture.
  2. Each of inc-030 to inc-037 widens that skeleton, with an `e2e` criterion that runs `backlog-distil.js` on a fixture and shows the new behaviour in the rendered backlog or report. Reword req-086, req-093 and req-104 to match.
  3. Merge req-044 into inc-019, and drop declined pair 4.
  4. At inc-017, add a multi-repo fixture programme: a provider, a consumer and a tests repo, as small local git repos with a real contract test. Point the criteria of req-063, req-117, req-118 and req-119 at it. Add "R7 on the fixture" to 12.2, between steps 5 and 6.
  5. List the canaries' product repos in the surfaces of inc-027 and inc-028.
  6. inc-038's canary also reports how many distilled increments are vertical, against the plants digest's 47 frontend-only and 10 tests-only rows, and maps each digest row to the vertical increment that absorbs it.

### r7-slices-15 (major): run the integration proof before land, and review every repair

- **Sections:** 7.4 stages 19 to 25, 7.9, 4.5.
- **Now:** ladder (19), secrets (20), acceptance (21), land (22), PR (23), CI (24), then the local end-to-end run (25). Acceptance marks `e2e` criteria `needs-e2e`. Repair edits from ladder-repair, e2e-repair and ci-fix are never reviewed.
- **Problem:**
  - A slice that fails its integration proof has already been pushed.
  - Acceptance judges the slice before it is proved.
  - A repair that changes a seam between repos, the most likely repair in a full-stack slice, reaches `done` without per-file or consistency review. Fixes (stage 17) that touch a seam are not re-checked for consistency either.
- **Change:**
  1. Reorder to ladder, secrets, local integration proof, acceptance, then land, PR, CI and merge. Acceptance then reads `e2e` results from the recorded proof, and `needs-e2e` goes. The `crossRepoE2e` check stays after CI as an extra.
  2. Add a repair-review step for every repair diff: style and code review per changed file, and the consistency task again when the diff touches a plan seam or more than one repo. Its findings go through verify and judge.
  3. Re-run consistency after any fix that touches a seam file.
  4. The audit requires a repair-review receipt for every repair diff.

### r7-slices-16 (minor): under `programme` delivery, nothing tells Sam the provider-first order or the one-unit rule when he merges

- **Sections:** 7.6, 7.11 (the handover), 6.2 section 1(b).
- **Now:** under `programme`, merging is `never`, and "Sam merges the programme at the end".
- **Problem:** R7's "landed as one unit, in provider-before-consumer order" is left to memory.
- **Change:** when a programme's increments are all done, report section 1(b) and the handover list its PRs in merge order, derived from `consumes`, with the rule: all green, then merge in this order, with no partial merge. Add `tim backlog report --merge-plan`.

### r7-slices-17 (major): Codex-orchestrated mode batches integration proofs and builds on unproven slices

- **Sections:** 8.11, 7.8, 3.9 (the buildability rule).
- **Now:** product increments hold `proof-owed`, which "releases itself once the next Claude session runs the suite for all of them in one stack start".
- **Problem:** one stack run over N slices cannot say which slice broke. Meanwhile later increments build on unproven slices, so a contract defect compounds across increments.
- **Change:**
  1. A `proof-owed` increment is not `done`, so its dependants are not buildable. Independent increments continue.
  2. The Claude session proves each owed increment separately, in build order: the stack is built at that increment's heads, and its mapped specs run with their own record (r7-slices-10).
  3. When the Codex orchestrator's own session can reach Docker, it runs the integration proof itself through the same committed scripts and records it, so nothing is owed.
