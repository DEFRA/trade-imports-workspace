# Code quality in the AI-built trade-imports code: report v2

**Window:** commits from 2 to 13 October 2026, built with the current factory. Anything older is labelled as contrast.
**Sample:** 36 units across 13 repos. 432 issues, 19 of them high severity.
**Beside:** run 1's `report.md`, which is kept.

## Summary

The problem is not comments and it is not Codex. Every in-window loop commit is Claude, and Codex appears nowhere. Comments are the most common smell (90 issues, 21%), but only 1 of the 19 high-severity issues is a comment. The highs are mostly structure (9), duplication (4), naming (3) and logging (2). The rate is the same whoever drove the agent: loop 12.2 issues per unit, Sam's sessions 11.7, colleagues' sessions 11.9. The causes, ranked by how much code-quality harm they explain:

1. **The plan stage designs everything and nothing checks the design.** The just-in-time planner was reintroduced on 21 September (`2dc0596d`). It "settles every choice so the implementor decides nothing" (`increment-build-loop.js:2345`). It writes structure, names, test titles and bodies, comment text and log lines into the plan. The implementor is told to "Follow it verbatim" (`:3711`) and to "Implement EXACTLY the plan's scope" (`:3719`). The consistency reviewer is told "A better solution than the plan imagined is not a finding" (`:3903`). No stage reviews the plan. In-window examples where the plan was the origin:
   - the second anchoring mechanism (inc-104)
   - three port-label formats (inc-007, Decision 6)
   - `holdsSilently`, `decide()` and `report()`
   - `driveWithRun`
   - the `e.getMessage()` warn (inc-014)
   - an unreachable branch that was then pinned into the spec (inc-112)
   - `REMOVED_*` constants (inc-009, inc-010, inc-029)

2. **Verify and judge throw code-quality findings away as "taste".** Reviewers often catch these defects. The verifier is told "Default to refuted" and to refute anything "out of the increment's scope, or a matter of taste" (`:4022`, `:4042`). It then judges against neighbouring files ("find a comparable file"). The judge is told "Reject freely when a finding is taste" (`:4094`). Refuted findings are dropped before the judge sees them. This clause has been in force since `75105948` (22 September). In-window findings killed this way:
   - `linesDroppedBy`
   - `destinationCountryNames`
   - the three-formatter port label (still in the code until a human review fixed it three days later)
   - `dateParts` copies, excused as "feature folders independent by design"
   - test titles that say "submitted" and assert action-required

3. **The rules a reader needs are missing, live only in one prompt or in memory, or the written guides teach the opposite.** The "remove comments aggressively" house rule exists only in the loop's style-review prompt (`:3850`, from `d88676d6`, 20 August). The verifier, the judge, the CI fixer, ad-hoc workflows, interactive sessions and the `review` and `code-style` skills never see it. `docs/best-practices/node/code-style.md:409-413` gives a Hapi call-site comment as its example of a good comment. No committed rule covers any of these:
   - ticket or session ids in code
   - history narration
   - one name per concept
   - a name that must predict what the code returns and changes
   - what to log
   - reusing shared test helpers in the engine

   Most of the team's rules on these exist only in Sam's memory: 92 of them, per `memory-audit.md`.

4. **Nobody owns the files around the diff.** Every reviewer is scoped to the diff, or to one file at a time. Nothing keeps up the recipes, JSDoc, sibling comments, invariant test names or call sites that a change makes untrue. Results:
   - `add-a-page.md` §3 is still silent on `allowMissing`.
   - Three recipes still say only the transit-countries row has a Change link.
   - `change-link.js` lists the wrong callers.
   - Copies spread across files are invisible to per-file reviewers.

5. **Some writers have no review at all.** These are:
   - the CI fixer that clears Sonar after Land (`6ecaa3cf`, `949cee47`, `8a8974c`)
   - ad-hoc fix workflows (`wf_6735a5fc` put the `c-201` id back, in `5a5282dd`)
   - interactive commits (`19a76c54`, `0da6de8`)
   - a self-merged PR (ins-backend #21, which logs the full address body at INFO)

   Their gate-shaped workarounds then become exemplars: the dead `.catch` was copied the next day in `4c2119da`.

6. **No mechanical checks exist for this class.** There is no lint for ids, history or empty catches, no clone detection, no check that a new test fails without its change, and no structural rule for L2 (the set-agnostic platform layer). Prose rules were present and failed several times: the house rule, `pino-logging.md`, `frontend.md` §Assertion specificity, `unit.md:379`.

7. **Copying spreads whatever is already there.** Agents copy:
   - the repo's `h` toolkit name and the `getMessage()` idiom
   - controller route echoes
   - sibling `REMOVED_*` constants
   - twin repos' ticket tags (`EUDPA-282`→`639`)
   - `import-reason.fit.spec.js`'s three local pickers

   A recipe is only as clean as its exemplar.

8. **The DISTIL step writes removals and ids into acceptance criteria.** Criteria phrased as "no 'It can be up to 58 characters.' sentence", or carrying inline ids such as `c-201` or "the real service", flow through the plan into tests, the openspec scenarios and comments.

The fixes, in order: split the verifier and judge by finding category, so code-quality findings default to "do it". Replace the "settle every choice / follow verbatim" plan contract with a plan made of decisions, homes and owners, and add a plan review. Move the rules into committed, always-loaded `.claude/rules` files plus each repo's lint. Correct the guides that teach the anti-patterns. Put the unreviewed writers behind review.

---

## 1. What we looked at

| Item | Value |
|---|---|
| Window | Commits 2–13 October 2026. Older material appears only as labelled contrast. |
| Factory | Loop `3b118a66` (2 Oct) to `587142f5` (12 Oct). The planner, implementor and style-reviewer text has not changed since `904a5a14` (24 Sep). The `.claude/rules` files, `docs/best-practices/node/code-style.md` and `doc-comments/*` are unchanged since before 20 Sep. frontend-change is at `3c28ff5a` (9 Oct). |
| Units | 36. Loop 19, Sam interactive 6, colleague interactive 10 plus 1 colleague clean-up (U26). |
| Patterned | 1 recipe (U07), 10 near-recipe, 25 freeform. |
| Verdicts | Patterned: 1 clean, 8 mostly clean, 2 mixed. Freeform: 0 clean, 21 mostly clean, 4 mixed. |
| Causes tested | 69 causes across 12 classes. Every challenge came back "partly", none confirmed and none refuted. The claims below are the sharpened ones. No cause is unchallenged in this input. Note the challenge rubric again returned no clean "confirmed" or "refuted", which is the same pattern as run 1. |

**Provenance caveats:**
- The `Co-Authored-By: Claude Haiku` trailer on loop commits names the light-tier Land agent. The implementor is Sonnet and the planner, consistency reviewer and judge are Opus (`MODEL_DEFAULTS`, `:439`).
- The type-question-and-templates theme ran on another machine. Its plans are missing, so the loop version for U11–U14 cannot be verified, and those commits carry an `Increment:` trailer the current loop does not write.
- `dc4c74e` (U30) sits on an unmerged branch.
- `a8e093d` and `75b06e3` are fixer agents from `wf_6735a5fc`, not hand-written interactive work.

**Left out:**
- package, lockfile and fixture recaptures
- branch housekeeping and the EUDPA-688 CI work
- loop increments that were not picked (same factory and theme as sampled ones)
- the large colleague PRs: address literals #388/#90/#103, date-only #390, EUDPA-707 #414/#57
- the schemas commits from the other team

There was no in-window obligation-model readability PR to look at; PR #396 is the closest equivalent.

---

## 2. Issue classes, ranked by impact on a reader

| # | Class | Dimension | Prevalence | Strongest example |
|---|---|---|---|---|
| C01 | Logic in the wrong layer, or a second mechanism beside an existing one | structure | ~24 issues, 18 units, 6 highs | `19a76c54` `call-counts/backend-fetch.js:1-58`: retry, proxy and FormData re-encoding in a folder for counting calls |
| C02 | Pattern extended, recipe or sibling left behind | structure | ~16, 12 units, 3 highs | `0500d7d1` `add-a-page.md:113-121`: `allowMissing` opt-in missing from the recipe |
| C03 | One rule written in several places | duplication | ~42, 28 units, 3 highs | `adca9177` `services/ports/index.js:36-49`: three port-label formats |
| C04 | Names that hide what the thing does | naming | ~34, 24 units, 3 highs | `80044437` `save-actions.njk:13-22`: two overlapping booleans, six positional parameters |
| C09 | Logging without context, and decisions made silently | logging / error handling | ~26, 17 units, 3 highs | `dc4c74e` `ExternalCallMetrics.java:86-93,142-150`: logs "failure in 5 ms" with no cause |
| C10 | Tests that say one thing and prove another | tests | ~36, 23 units | `df59fbde` `store-contract.test.js:70`: titled "flip status to submitted", asserts `SUBMITTED_ACTION_REQUIRED` |
| C11 | Copy-pasted test set-up instead of a named helper | tests / duplication | ~20, 15 units, 2 highs | `80044437`: submit-then-amend set-up pasted into 5 test files (fixed by hand in `e149354c`) |
| C05 | One concept, several names | naming | ~18, 13 units | `7b01ce5` `NotificationTemplate.java:42`: `User-Id`, `userId`, `ownerId` and "actor id" for one person |
| C06 | Comments describing another layer that go stale | comments | ~30, 22 units, 1 high | `1f41f6d` `section-status.js:11-13`: names a file that `75b06e3` deleted 2.5 hours later, still on main |
| C07 | Comments propping up a weak name, plus ticket and session ids | comments / naming | ~28, 20 units | `5a5282dd` `check-answers/controller.js:147`: `// c-201: …` above `holdsSilently` |
| C12 | Code shaped by the plan, linter or gate rather than the reader | abstraction | ~20, 14 units, 1 high | `949cee47` `external-call-metrics.js:47-55`: dead `.catch(() => undefined)` under "never rejects" |
| C08 | History carried in code and tests | comments / tests | ~15, 12 units | `b03938b9` `origin.fit.spec.js:39`: `REMOVED_INTERNAL_REFERENCE_LIMIT` |

---

## 3. Causes per class

### 3a. Structural causes (conformance, abstraction, layering, duplication)

| Cause | Where | Evidence (dated) | Verdict | Fix |
|---|---|---|---|---|
| The planner bypasses an owner it has already read, and every later stage defers to the plan | plan → review | inc-104 `be35bf0c` (11 Oct): `fallbackAnchor` and `pageAnchorsOf` sit beside `decorateCard`, whose own comment rejects threading an argument through. inc-106 builds on it. Prompt lines `:3711`, `:3895-3903`. | Partly. The planner did read the owner and went around it. "Find owners with rg" would not have helped. | Plan must say how each new field, argument or constant goes through the existing pass, quoting that code's stated design when departing from it. Consistency reviewer may challenge plan structure. |
| No plan review. Structure is decided once by the planner. | plan | inc-113 `df59fbde` (12 Oct): the plan puts `OUTSTANDING_HEALTH_CERTIFICATE` and `ITAHC` into L2 (`plans/inc-113.md:13,66,110`). The code reviewer was explicitly told to look for this (`:3880`) and missed it. | Partly. The cause is at plan time. Review prompt text alone has already failed. | Add a plan-review stage that is given the layer rules and recipes. Add a mechanical L2 check. |
| The L2 rule is written only as an import rule | repo docs | `architecture.md:36-50` says "does not import a set". The vocabulary rule exists only in agent prompts. | Partly. Prose already failed twice. | Lint that bans set codes and names in L2 paths. Codes arrive through the manifest. |
| New class copies the class beside it instead of extracting the shared part | model, interactive | `dc4c74e` (13 Oct) `EmfMetricWriter` mirrors `ExternalCallMetrics`. `19a76c54`/`d66b1dce` (11 Oct) add a second fetch path beside `setup-proxy.js`. `0da6de8` (13 Oct) logs inside the enum with no port code. | Partly. The owner was open in the same commit every time. The call-site placement in `19a76c54` came from Sam's memory rule. | Rule plus review check: "a new class or path that mirrors one you are editing: extract the shared part in this commit". |
| Off-groove shapes have no written house pattern | repo docs, backlog | `791d59e4` (8 Oct): a two-form POST, recorded deliberately in docs. `2d7619e` (10 Oct, Haiku): a title override forced by the acceptance criterion while the sibling theme's `layout.njk` change was not yet merged. | Partly. No PRG, concurrency-token or title-chrome note exists. The second case is a theme-sequencing problem. | Short repo notes that codify current practice. Cross-cutting chrome goes to the owning theme first. |
| Recipes are treated as inputs, never as outputs to keep true | plan, skill | inc-003 `0500d7d1` (10 Oct) and inc-104 `be35bf0c` (11 Oct): plans say "no add-a-* recipe applies". Recipes still stale at `eda9f327` (14 Oct). By contrast, inc-004 updated the recipe because the plan named it. | Partly. The cause is routing. Grep-ability is not. | Plan section "Docs this makes untrue", found by a behaviour grep, with a checkable "None (grep: …)" answer. |
| Diff-only review cannot see stale siblings outside the diff | review | `change-link.js:17-21` was made false by `be35bf0c`, which did not touch it. Two of the three cited cases were in files the reviewers held and still missed. | Partly. | Scope: any comment or recipe in a changed file that the diff makes false is in scope, and the fix is to delete it. Plus the plan section above. |
| Renames stop at the edge of the session's strings | interactive | `e8a4fe51` (9 Oct): `telephone*` keys left beside `phone`. `7aba7f7f` (13 Oct): `originLabel` left. `ec92fc9c`: `h`→`toolkit` in 10 of ~75 files, against `hapi.md`. | Partly. Not loop-built. | Rename rule: name the whole vocabulary and what stays. Reviewer greps the concept word. |
| The planner settles conflicting acceptance criteria by adding a second formatter | plan | inc-007 Decision 6 (`adca9177`, 10 Oct). inc-027 cites it as precedent and splits plants (`3919fe0`). The verifier refuted the MAJOR duplication finding (`wf_d75825f0` :183). Fixed by hand in `12c80237` and `88929d14` (13 Oct). | Partly. The human layer review caught it before main. | Plan "Rule owners": one function per rule in each twin. Ban plan checks that pin a known divergence. |
| The review skill splits one rule into several findings, and the fixer applies each one literally | skill | PR #396 items 1/2/7/8 → `5cafe2dd`, `9af27387`, `eee3cfc2` (9 Oct): three guards that fail three different ways. | Partly. | A reconciler groups findings that share a root. The fixer checks for an existing guard before adding one. |
| The stub copies a backend rule with no contract test | architecture | `df59fbde` `stub/outstanding-items.js:5-18` drops `ScanStatus.COMPLETE`. | Partly. | Shared fixture table run against both stub and backend. |
| Test set-up copied file by file (C11) | plan + implement + review | inc-029 plan dictated `driveWithRun` (`49e22db9`). inc-004's implementor copied set-up 5 times. `e149354c` (13 Oct) removed 90 lines. Verifier excused the `dateParts` copies by citing the feature-folders memory (`wf_0d2e5388`). | Partly. Copying happens at both plan and implement stages, and review is per file. | Plan "Test support" section. Delete-on-promote rule. jscpd on changed tests. Theme-end tests lens. |
| The CI fixer clears Sonar with minimal edits that nobody reviews | fix stage | `6ecaa3cf` (10 Oct, S1117 rename). `949cee47` and `8a8974c` (6 Oct): dead catch and spin-wait. Copied in `4c2119da` (7 Oct). Prompt `:3040`, `:4637`. | Partly. ESLint already runs pre-commit; only Sonar-only rules surface after Land. | Run Sonar before Land. Give the CI fixer the house rules. Style-review its commit. |
| Plans build ahead of need, and spec sync records it | plan | inc-112 `16e63a68` (12 Oct): branch for a state that cannot occur yet. `SCN-CYA-008-E` added for a state the service cannot reach. | Partly. The branch became reachable through inc-187 (`25b65c18`) six hours later. The spec scenario is the lasting harm. | Spec sync must not add scenarios for unreachable states. Plan names the consumer of any built-ahead branch. |

### 3b. File-level causes (naming, comments, logging, tests)

| Cause | Where | Evidence (dated) | Verdict | Fix |
|---|---|---|---|---|
| The planner coins names, the implementor copies them, and verify and judge kill rename findings as taste | plan → verifier | `holdsSilently` (inc-004 plan, `80044437`, 10 Oct). `decide()`/`report()` (inc-017, `1f82c87`, 6 Oct). `linesDroppedBy` was flagged, then refuted: "A rename is a matter of taste" (`wf_141270a6` n=3). | Partly. The plan is where the name starts; verify and judge are why it survives. | Name defects become house-rule defects (fix-now). Planner checks names against what the code returns and changes. |
| Naming rules check shape, not truth | docs | `code-style.md` §6 (`361722f1`), `modern-java.md:590` "verb-noun". Loop rule `:3852`. The engineering review called `holdsSilently` self-explanatory (`review.json:833`). | Partly. | Behavioural naming test in planner and reviewer prompts and §6. No positional boolean flags. |
| Deleting a comment without fixing the name it decodes | review | `wf_7b305e2e` :37/:66/:69: deleted on "the name already says what it does". Re-added in `5a5282dd`/`faa2bd9` (13 Oct) and grew again in `4ac00c25`. | Partly. Plants kept the comment and the name stayed bad anyway. | When a comment decodes a name, the finding is the name: rename or extract, and remove the comment in the same fix. |
| Nobody owns whether a name is true | review | inc-017: the code reviewer saw `report()` clear state and raised only a race condition. Java style reviewers raised formatting nits only. PR #396's 16-finding review had no naming finding. | Partly. | A predict-then-compare step for code reviewers and in `FILE_REVIEWER.md`. |
| One concept gets two names: the plan coins one, the verifier calls the fix taste | plan, verifier | inc-006 `destinationCountryNames` vs `originPageCountryNames` (`f482df9`, 9 Oct, on main as `5ba19ab`). `wf_d75825f0` n:12 "naming taste". | Partly. Splits are caught, then dismissed. | Verifier treats "same thing, two names" as a defect unless the two things are shown to differ. |
| Backlog wording becomes identifiers | DISTIL | inc-151 gate "owner" → `ownerId` beside the repo's `userId` (`7b01ce5`, 10 Oct). Duplicate `HEADER_USER_ID` constant. | Partly. | One value keeps one name from header to repository. Reuse existing constants. |
| The written standard licenses comments about other layers | docs | `code-style.md:409-413` Hapi example. The inc-104 verifier cited rule 15 to keep cross-layer comments (`a377e55143c62adf6`). | Partly. It works as a shield for comments, not as their proven source. | Move the Hapi example under "bad". Add a "claims about other code" category with default fix: delete. Give the verifier the house rules. |
| Stale comments survive because nobody re-checks comments near a change | implement + review | `be35bf0c`: fixed 2 sibling comments, missed `copy.en.js:129` and `change-link.js`. `19a76c54`/`d66b1dce`: JSDoc in the block being edited went stale. | Partly. The missed comments were in view. | Re-check every comment within ~10 lines of a hunk and the JSDoc of every changed function. Ban comments that count things ("the one row", "the only"). |
| Plans dictate comments as content | plan | 43 rewrite/keep vs 3 delete lines across 16 overview-and-review plans. `outstanding-items.js:5` verbatim from `inc-113.md:252`. | Partly. Some comments are improvised by the implementor (`copy.en.js:126`). | No comment text in plans. Plan-lint on comment directives. |
| Ids and session words travel from the backlog into code | DISTIL → plan → implement | `inc-110.md:70` "keep the c-201 comment's sense" → `d2f668a` (11 Oct). The "real service" test title in `244b2b0`. | Partly. Three routes, including later plans re-reading ids already in code. | Diff lint on source and tests (not spec JSON) for ids and session words. Translate ids at the plan boundary. |
| Ad-hoc fix workflows and colleague sessions carry no rule on comments or ids | interactive | `wf_6735a5fc` brief: "with animals' doc comment". `0cd5af67`, `52bbb21` (11 `EUDPA-565` sites), `e9ca98e` (ported with the ticket key swapped). | Partly. The loop itself also wrote `c-201` first (`244b2b0`). | A rule in every code-writing prompt and in `.claude/rules`. A lint rule in each repo. |
| History becomes absence tests through acceptance criteria and spec | DISTIL, plan | `requirements.json:1102,7979` → `inc-009/010.md` `REMOVED_*` → `f69647ac`, `b03938b9`, `f2c4e00` (10–11 Oct) → `origin-of-import/spec.md:110,131`. inc-011 got the same criterion shape and did not do this. | Partly. A planner choice, not forced. | Acceptance criteria and spec "Then" steps state the end state. Prove a removal with an exact positive assertion. |
| Logging: no stage owns it, and guide pointers go unread | plan, review | inc-014 plan dictated the `getMessage()` warn (`inc-014.md:155`, landed `da03371`, 6 Oct). Stub faults package has no logger (`1f82c87`). Code-reviewer scope has no logging item (`:3871-3881`). The guides are never opened. | Partly. The exemplars teach `getMessage()` (~20 lines in dynamics-gateway). | Logging rule quoted inline (not linked). Operability plan section. Reviewer item with "support cannot tell X" accepted as the failure scenario. |
| Logs are written where the branch is, with only the data in scope there | model | `19a76c54` silent retry. `c0b1a06f` drops `dataset`. `0da6de8` warn with no port code. | Partly. A rules pointer was present (`node.md`) and did not prevent this. | A check question for each new catch, retry or fallback: which log, which ids. |
| Spike diagnostics stay because nothing removes them | interactive | ins-backend #21 `a5990fc` (5 Oct): self-merged, 0 reviews, full body at INFO, dev profile only. `0c7cd20` (24 Sep, contrast) wrote tests pinning the diagnostics. | Partly. Authorship unknown. | Required review on main. Coverage work must not test diagnostic branches. |
| Test titles copy the acceptance criterion while the body tests a stand-in | plan | inc-010 "…chosen again after No" never chooses Yes (`b03938b9`). inc-112 uses a DRAFT fixture (`16e63a68`). Both linked "full". | Partly. Both tests do fail without the change. The harm is misleading names and unchecked "full" links. | Derive the title from the assertion. Run a probe before any link is marked "full". |
| Stale comments beside flipped assertions | implement | `6dbcfcf` `NotificationIT.java:1341,1445,1489,429` (12 Oct). | Partly. The plan split tests correctly by subject. | Ladder check: a comment within N lines of a changed assertion that still names the old literal. |
| Verifier refutes title/assertion mismatches as naming | verifier | inc-113 `wf_11a9d6a5` n:36. Live in `store-contract.test.js:70`, `submit.test.js:40-46`. | Partly. Coverage findings in the same round got through. | A title claiming more than its assertions check is a correctness defect for that test. |
| A green probe goes into free-text notes only | fix stage | inc-003 fixer: "mutation … still passed" × 3. Dead `allowMissing` opt-ins merged via `6760aee8`. | Partly. | Structured probe result. A green probe sends the finding back as dead code or a false premise. |
| Java guides require Given/When/Then markers | docs | `integration.md:141`, `unit.md:283`. `e28a98ef` (7 Oct) markers on a single-assert test. | Partly. Also copied from the repo's existing tests. | Drop the mandate. Split multi-step flows. |

---

## 4. The colleague's points

| Point | Borne out? | Evidence |
|---|---|---|
| Too many verbose comments that go stale (e.g. API behaviour described at the call site) | **Yes.** It is the most frequent smell, at low severity per item. | 90 issues (21%). Five went stale in the same commit or session (`change-link.js`, `section-status.js`, `backend-fetch.js`, `copy.en.js`, `controller.js:192`). The guide's own good example is this pattern (`code-style.md:409`). |
| Poor naming, propped up by comments | **Yes. The name is the root cause.** | `holdsSilently`: the comment was deleted, the name kept, then the comment came back with a ticket id (`5a5282dd`, `4ac00c25`). `metricsLoggers` Javadoc (`3d5288f`). `leavesUnchanged` (`7bef5ad`). |
| Happens less on patterned code | **Weakly.** | Issues per unit: patterned 11.6 vs freeform 12.2. Highs per unit: 0.45 vs 0.56. Comment share: 23% vs 20%. Naming share: 16% vs 14%. Mixed verdicts: 18% vs 16%. The groove part is clean (14 one-line template edits in U03, U13's template, U28's forms). Issues cluster where a change leaves the recipe (U11's client, U13's title, U29's reskin). The groove also copies smells (U07 `REMOVED_*`, U31 `EUDPA-282`). Very little in-window work was patterned: nearly every DR2.1 plan says "No add-a-* recipe applies". |
| Best code when working at a lower level of abstraction | **Shows naming targets help; not adopted as a fix.** | `a02d939c` (12 Oct): a precise rename across 17 files once a human named the target. The same colleague's session produced `reviewedToken` in the first place (`b48025bf`). The fixes in §6 put the target-naming step into the factory instead. |
| Comments referring to removed code or concepts | **Yes, and it extends to tests.** | `791d59e4` `review-href.js:4-6`. `c8236b8` "not probed". `REMOVED_*` constants. `findBy…WhenTheDocumentWasWrittenBeforeTheChange` (`52bbb21` → `e9ca98e`). |
| Ticket references | **Yes.** | On main: `check-answers/controller.js:147` (`c-201`), `document-type-options.js:3-6` (`EUDPA-310`), `calendar.js:209` "the ticket's open questions", 11 `EUDPA-565` sites in `52bbb21`. |
| References to ACs or session decisions without describing them | **Yes.** | "the real service" (`amend-form-actions.js:18`, `save-actions.njk:16`, a plants test title). "really saved (c-183)" (`9eab88ea`). "Ruled c-030". |
| Logging without context or identifiers | **Yes, and logging is often missing entirely.** | `dc4c74e` cause dropped. `7b01ce5` route echo with no user. `19a76c54` silent retry. `0da6de8` no port code. `src/server/app` in animals-frontend has 0 log calls on main. PR #396 refusal paths redirect silently. |
| The agent is reluctant to delete a comment when asked | **Yes.** | PR #390 `e9ad6cda` (6 Oct): asked to fix a comment, the agent reworded it, copied the wording to more places, grew a JSDoc from 1 to 6 lines and declined both renames. `REVIEW_ITEM_FIXER.md:55` and `STYLE_IMPLEMENTOR.md` Step 3 say "minimal change". The style cheat-sheet has no rule-15 pattern. Across 55 review-skill findings (10–13 Oct), none was about naming, and comment findings were judged on accuracy only. |
| The PR raised so the code could be read easily | **Closest match: PR #396, not obligations.** | The review skill (8 Oct) raised 16 findings and none about naming or comments. The colleague's clean-up `b397afc0..2e9279a4` (14 commits, +326/−365) took comment density from 15% to 3%, renamed the tokens and made `withEntry` explicit. It stopped at comments and naming: the posted/reviewed token conflation remains (`declaration/controller.js:21`), and `h` was renamed in 7 of ~77 files. PR #223 (Sep, contrast) is the obligation-model PR, and it was structural. |

---

## 5. Run 1 revisited

| Run 1 bullet | Now | Why |
|---|---|---|
| 1. The standard permits the comments; the house rule lives in one prompt | **Stands, widened** | Correct, and the same gap covers ids, history, naming truth, logging and test helpers. Dating corrections: the GWT example was the 22 Sep Codex run, and the house rule dates from `d88676d6` (20 Aug). |
| 2. The verifier is where findings die | **Stands, re-scoped** | The 76% refutation rate is a base rate for all finding types, not specific to comments. What kills code-quality findings are the taste, scope and comparable-file clauses, which also kill naming, duplication and test-title findings (§3). |
| 3. The planner writes comments; the implementor follows verbatim | **Weakened as stated, much stronger as the main cause** | 28 of 40 plans, not 36–40. The same channel carries structure, names, test titles and bodies, log lines and `REMOVED_*` constants. It is the main structural cause. |
| 4. The standards hand-off is broken; better delivery alone won't fix it | **Half stands** | 0 of 47 implementors read `code-style.md` (stands). The "won't help" half relied on `f96a3cd` (Codex, never landed). The in-window evidence (`a8e093d`, PR #390, `c0b1a06f` against `pino-logging.md`) supports it: prose without enforcement fails. |
| 5. Self-reinforcement | **Mechanism stands, trend out of date** | In-window: `4c2119da` copies `949cee47`. The verifier cites neighbouring comments. Run 1's density trend used pre-window phases. |
| 6. Structural drift is small | **Wrong** | Structure (C01, C02, C03) has 13 of the 19 highs. Run 1 measured structure only as a cause of comments, and never measured logging, abstraction, duplication or tests. |
| Codex as a cause | **Out of date / irrelevant** | No Codex in the window. |

---

## 6. Recommended changes, ranked by impact

Constraints applied throughout: review stays full strength; no "work closer to the code" fixes; rules go into committed tooling, not memory.

### 1. Split verify and judge by finding category, so code-quality findings default to "do it"
**File:** `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js` (verifier ~`:4019-4044`, judge ~`:4084-4094`).

- Pass `category` to the verifier.
- For **functional** findings, keep "Default to refuted".
- For **code-quality** findings (naming, comments, structure, duplication, logging, test readability, history), the default is real. A refutation must quote code showing the finding is factually wrong: the copies differ, the name does predict what the code returns and changes, the comment is accurate and describes only its own lines.
- "Taste", "pre-existing", "out of the increment's scope", "a comparable file does it", and the feature-folders ruling are never grounds to refute these.
- The judge rules these fix-now and applies the fix to every twin. Remove "Reject freely when taste" for these categories.
- Give the verifier and judge the house-rules block.
- Never drop a refuted finding. Write it to the journal and list it in the end-of-theme check.
- Because adjacent smells flagged in a changed file are then fixed rather than deferred, this also delivers the tidy-up sweep.
- Mirror the same split in `.claude/skills/review/references/FILE_REVIEWER.md` and `.claude/skills/code-style/` personas.

### 2. Replace the "settle every choice / follow verbatim" plan contract
**On the plan stage:** big up-front plans were removed on 6 September (`ca4bd6d8`). On 21 September `2dc0596d` brought back the same strict contract in just-in-time form. The evidence says that contract is the main structural cause. The plan is good at decisions: where a plan named an extraction, it happened (inc-029 Decision 9, `emfDocuments`). It is bad when it writes code text: names, comments, test titles, log strings and bodies.

**Replace it with a plan made of decisions and owners, a plan review, and an implementor allowed to improve the shape.** In `increment-build-loop.js` planner ~`:2338-2383` and `PLAN_SCHEMA`:

- **Remove:** "settle every choice so the implementor decides nothing". Remove dictated comment and JSDoc text, test titles and bodies, and log message strings.
- **Required sections:**
  - **Homes:** each new constant, registry entry, argument or helper names the existing mechanism it goes through (file:line), quoting that code's stated design when departing from it.
  - **Rule owners:** one function per display or business rule, in each twin.
  - **Test support:** the shared helper to extend (`engine/test-support.js`, `fit/<set>-journey.js`, `flows/<domain>/journey.ts`, Java IT bases).
  - **Docs this makes untrue:** behaviour grep over recipes, JSDoc and invariant test names, with an edit for each, or "None" plus the grep that was run.
  - **Operability:** a log line, with ids, for every outcome-changing branch.
  - **Departures from written rules:** quote the rule and give the reason.
  - **Tests:** each stated as an assertion plus the production line whose removal turns it red.
  - **Build only what is reachable after this increment,** or name the consumer row.
- **Add a plan-review stage** (Opus, given the repo's `docs/`, the recipes and the layer rules) that can send a plan back before any code exists.
- **Implementor** (`:3711`, `:3719`): follow the decisions. Names and code shape are proposals: rename anything that does not say what the code returns or changes. Extending a shared test helper is in scope. Never write a local copy of a shared helper's body.
- **Consistency reviewer** (`:3903`): delete "A better solution than the plan imagined is not a finding". A plan decision is a finding when the code it produced cannot be explained from the code alone, or when it departs from a written repo rule.

### 3. Commit the rules where every session loads them
**New file:** `.claude/rules/code-quality.md`, with a `paths:` glob over `src/**`, `tests/**` and `**/*.java|js|ts|njk`, holding the rules inline. Change the "do not inline" convention in `node.md`, `java.md` and `playwright.md` for this one file. Rules:

- A comment describes only the lines below it. Never describe callers, other modules, the backend, a library, the UI or a test. No "the one" or "the only" counts.
- No ticket keys, backlog, ruling or AC ids, release names or session vocabulary in code, comments or test titles.
- No history (before/after narration, `REMOVED_*`, "…BeforeTheChange").
- A name predicts its return value and side effects. No positional boolean flags. One concept, one name across layers and twins. A rename covers the whole vocabulary of the concept.
- Set-up used by two tests goes in the shared helper. Promoting a helper deletes the local copies.
- Every branch that changes an outcome (refusal, redirect, retry, fallback, state switch) logs once, with the ids support searches by. Exceptions are logged as the throwable or `{ err }`, never `getMessage()`. No response bodies at INFO.

**Migrate these from Sam's memory into that file and the review rubric** (per `memory-audit.md`):
- remove explanatory comments
- no migration comments
- explicit names, no metaphors
- pipelines need named helpers
- test behaviour, not implementation
- preserve assertion intent
- no coverage-padding tests

**Narrow the feature-folders memory** to "production controllers only, never test support; importing a sibling's helper is fine", and commit it to `src/server/app/docs/architecture.md`. The verifier mis-applied it in `wf_0d2e5388`.

**Shared module for ad-hoc workflows:** add `workflow/lib/house-rules.js`, imported into every code-writing prompt: loop implementor, fixer, CI fixer, planner, and the `wf_6735`-style ad-hoc scripts.

### 4. Mechanical checks in each repo's own `lint`
These run on every path, including interactive sessions and colleagues.

- **Frontends and ins-tests (ESLint):**
  - comment and test-title regex for `EUDPA-\d+`, `\b(c|inc|req)-\d{3}\b`, `Design Release`, `DR2?1`, `real service`, anchored to comments only (not spec JSON, and avoiding UUID matches), with a baseline file
  - `no-restricted-syntax` for `.catch(() => undefined|{})` and string-only `logger.error(...)`
  - an L2 rule banning set codes and names under `engine/` and `services/persistence/`
- **Java repos:** Checkstyle regex for the same ids. Ban `log.(warn|error)(…getMessage())` when the throwable is not passed. Ban `Thread.onSpinWait`/`sleep` under `src/test`.
- **Duplication:** a jscpd rung in the ladder over changed `*.test.js`, `*.fit.spec.js`, `*.spec.ts` and `*IT.java`, with a threshold low enough to catch 10–20 line set-up blocks.
- **Probe:** `tim build probe` inverts the production line a finding names, with a structured `redOnBase` result. A green probe sends the finding back as dead code or a false premise. `frontend-change/references/SPEC_SYNC.md:259-272` must require a red probe before strength `"full"`, as `spec-cover` already does. Use red-on-base as a review input only, never as a hard gate.

### 5. Correct the guides that teach the anti-patterns
- `docs/best-practices/node/code-style.md` §15: move the Hapi example under "bad" and give its refactor. §6: add behavioural naming tests with bad and good pairs from this codebase (`linesDroppedBy`, `holdsSilently`, `report()`).
- `doc-comments/BEST_PRACTICES.md`: add a "Claims about other code" category with default fix delete, and "when a comment is stale, delete it before rewording it".
- `doc-comments/javadoc.md:10-13`: drop "non-obvious parameters"; rename until the parameter is obvious. Limit to API-contract Javadoc.
- `java/testing/integration.md:141`, `unit.md:283`: drop the Given/When/Then mandate.
- `java/spring-data-mongodb.md:681,711`: remove the `EUDPA-282` citations.
- `node/pino-logging.md` and `java/spring-boot.md` §15: add a "What to log" section. Name `pino-logging.md` and `spring-boot.md` §15 in `.claude/rules/java.md`.
- `node/testing/frontend.md:294-302`: name `engine/test-support.js` (`driveHandler`, `postHandlerOf`, `recordingH`) and the `fit/` helpers, and update the stale content.
- `reconcile.md` and `consolidate.md` (DISTIL): a statement is the end state; old text appears only in `deltaNote`; ids are stripped at the plan boundary; when a row changes how a value is formatted, its acceptance criteria list every page that shows the value; cross-cutting chrome is sequenced to its owning theme.
- `openspec/config.yaml`: scenarios state what is shown now, with no quoted removed copy, and no scenario for an unreachable state.

### 6. Recipes and exemplars for the freeform edges
- Animals and plants `add-a-page.md`, `add-a-field.md` and `add-a-section.md` get a **Test support** section and a **Logging** line. `add-a-page.md` §3 adds the `allowMissing`/`isHubExit` opt-in and a list of strict pages. Fix the "Rows carry no Change link" lines (`add-a-field.md:153`, `add-a-page.md:227`, `add-a-section.md:291`).
- Behaviour convention tests, modelled on `amend-endings.test.js`: blank POST with `exit=hub` on every task-row page, checked against an exported strict list; a populated review row-link check against an exception list held in code. Rename the vacuous `check-answers.fit.spec.js:551` test.
- Short "how this repo does X" notes in `src/server/app/docs`:
  - concurrency token (hidden field via `kit.base`)
  - POST redirects (with the documented two-step exception)
  - page-title chrome through the layout
  - backend HTTP client in its own module, not `call-counts/`
  - a logging paragraph in `architecture.md`, with one canonical logged decision
- `trade-imports-ins-tests` gets an `AGENTS.md`: specs reach pages through `flows/<domain>/journey.ts` `to*` methods, and a sequence used twice becomes a `to*` method. Route `flows/**`, `page-objects/**` and `domain/**` to the playwright bundle in `review/assets/routing.json`.
- Clean the exemplars agents copy:
  - `import-reason.fit.spec.js` uses `chooseAutocompleteByLabel`
  - the `getMessage()` lines in the CDP-template Java classes (~20 in dynamics-gateway) become `(…, e)`
  - animals-backend route echoes carry ids
  - the `errors.js:33` catch-all uses the `hapi.md:243` shape
  - pick one of `h` or `toolkit` and apply it repo-wide

### 7. Review skill, code-style skill and other reviewers
- `review/SKILL.md` and `FILE_REVIEWER.md:181,295`: add naming (predict-then-compare), structure (two homes, wrong layer), logging (silent decision, missing ids) and test-truth (title vs assertion, cannot fail) as dimensions.
- `review/references/REVIEW_ITEM_FIXER.md:55` and `code-style/references/STYLE_IMPLEMENTOR.md` Step 3: for a comment finding, delete first; if the comment decodes a name, rename or extract instead. Never reword and spread.
- `code-style/assets/style-implementor-cheat-sheet.md`: add a rule-15 fix pattern.
- Review handoff template: split "Fix" into "What must become true" (required) and "One way" (marked as a suggestion).
- A reconciler step merges findings that share a root into one "decide the owner" item.
- Loop code reviewer (`:3871-3882`): add operability and duplication items, with "support cannot tell X during an incident" accepted as the failure scenario.
- Consistency reviewer: given the repo's recipe files, and a LOOK FOR line covering any rule the change alters that a doc, recipe, JSDoc or test name outside the diff still states the old way. `CONSISTENCY_REVIEWER.md` gains a naming and reuse category.

### 8. Put the unreviewed writers behind review
- **CI fixer** (`:3024-3051`, `:4625+`): give it the house rules and standards. Style-review its commit before the watcher re-polls. Run `tools/sonar/sonar-push-check.sh` in the ladder before Land, so Sonar findings reach the implementor and review.
- **Theme end:** add a pattern and tests engineering-review lens over `git diff origin/main...<theme>`, alongside `themeSpecCheck` (`:4962`), feeding judge then fix. This is a safety net, not a replacement for per-increment review.
- **Interactive and colleague commits:** a pre-push or skill step that runs code-style in Local mode on the staged diff.
- **ins-backend main:** required review (Sam sets this). Add a rule that coverage work must not add tests pinning diagnostic or spike log branches.

### 9. One-off clean-up, driven by the flipped review in recommendation 1
- Delete the dead `allowMissing` opt-ins: transit-countries `:144`, transporters `:142`, additional-details `:75`.
- Remove `SCN-CYA-008-E`.
- Fix the stale comments: `section-status.js:12`, `change-link.js:20`, `copy.en.js:146`, `NotificationIT.java:429,1341,1445,1489`.
- Replace the `c-201` and `c-030` comments with names. Note that `holdsSilently` also covers the submitted and template states, so its new name must cover all three.
- Delete the `REMOVED_*` constants and replace them with exact positive assertions.
- Fix the port's `formatDisplayMoment` pair in both twins.
- Merge the stub/backend `OutstandingItem` rule behind a shared contract table.
- Logging:
  - ins-backend `AddressLookupClient.java:123`: bound or remove the body log
  - `ExternalCallMetrics` (`dc4c74e`): carry the cause and status
  - log PR #396's refusal redirects
  - `backend-fetch.js` retry: log it
  - `PortType`: move the warning to `PortOfEntry.java:22`

---

## 7. Ruled out

| Hypothesis | Why ruled out |
|---|---|
| Codex is a cause | No in-window Codex. `executor: "claude"` in every theme. |
| A cheap model built the code | Haiku trailers name the Land agent. The implementor is Sonnet and the planner, consistency reviewer and judge are Opus. Defects come from all tiers and from interactive Opus sessions. |
| The loop is worse than people driving Claude | Per-unit rates are flat: 12.2 / 11.7 / 11.9 issues, 0.47 / 0.50 / 0.55 highs. Only the mix differs: the loop has fewer comments and more test issues. |
| Run 1's evidence is mostly old drift | The DR2.1 builds and the prompts they ran under fall within the window. Only run 1's trend figures and Codex material were old. |
| Sonar CPD exclusions hide copies | They exclude config, tests, fit specs and copy decks, not rules. Duplication was 0.4% against a 3% gate. CPD cannot see re-expressed rules anyway. |
| The feature-folders memory licensed rule duplication | No case found. It was over-applied once to add indirection (inc-015, `1db958be`) and once by the verifier to excuse test-helper copies. Narrowed in recommendation 3. |
| Discovery ("rg for owners") is the missing step | In every structural case the owner was already open or edited in the same commit. Placement and consolidation are the gap. |
| Prose additions to `code-style.md` alone | 0 of 47 implementors read it. `frontend.md`'s assertion rule and `pino-logging.md` were in force and broken in the window. |
| Lint on removed identifiers to catch stale comments | Would have missed every cited case, which were prose, contrasts and newly added names. |
| A `max-params` lint | The cited flag case is Nunjucks (not linted) and Java. |
| Red-on-base as a hard gate | Would fail legitimate counter-tests and refactor guards in the same commits (`0500d7d1`). Use it as a review input plus a structured probe on named findings. |
| `TEMPLATES` as a stale name; `regionOfOriginCode` as a prose-derived name | `TEMPLATES` is the convention across 27 controllers. `regionOfOriginCode` reused an existing code name. |
| `3919fe0` copied a divergence | Disputed between challengers: two formats per the DR2.1 spec vs a split mirrored from animals. Not used as evidence. |
| Spike logging as factory output | `a5990fc` is an unreviewed self-merge. It is handled under recommendation 8, not as a loop defect. |
| The colleague's obligation-model PR | Not found in the window. PR #396 is the in-window equivalent. Sam to supply the link if it was something else. |