# EUDPA-774 engineering review: save and continue through the journey

Branch `feat/EUDPA-774-save-and-continue-through-journey`. PRs: animals-frontend #468, plants-frontend #138, ins-tests #93, workspace #226, performance-tests #33. CI is green on all five.

## 1. Verdict

The branch is mostly clean. Most of it is uniform, mechanical conversion onto shared kit helpers. Both frontends make the same change, `shared/trail.js` is byte-identical in the two, and the removed run-state, `change=1` and amend-button code leaves no callers behind.

There are three headline new things:
- **One Save and continue order.** Saving goes to the next page that applies, from any starting point, including review Change links and amendments. It no longer returns to the review.
- **A new URL-carried `from` trail.** It drives every Back link and replaces the session-held opening run.
- **Amend opens on the review page.**

All three are intended. The EUDPA-774 acceptance criteria and rulings sam-2026-11-06 and sam-2026-11-06b ask for them, and the openspec says them. They do depart from the usual GOV.UK check-answers pattern, though, so the team should decide before merge whether design, UCD or assessors need to sign that off.

These need fixing or deciding before merge:
- The plants spec ledger was edited in place, not superseded.
- The plants `journey-spec.json` still describes the deleted mechanisms.
- Save and continue now ignores prerequisites while the Overview still checks them, and the docs say otherwise.
- Some test assertions were loosened (plants fit `setUrl`, the ins-tests trail patterns).
- Proven coverage dropped by about 150 rows.

## 2. What changed

**Animals frontend (`trade-imports-animals-frontend`)**
- The opening run held in the session is removed: `run-state.js`, the openingRun cookies, `run.js`, and the `nextRunTarget`/`previousRunTarget` hooks for each set.
- The `change=1` change context and the amend "Save and return" button are removed.
- Save and continue (`kit.nextTarget`, now synchronous) walks one page order over every section's task-row pages. Past the last page it goes to check your answers.
- Back on every page comes from `kit.trailBackLink(request)`, which reads a validated `from=` query trail.
- Sections are regrouped to match the Overview groups, and the hub builds its groups from them. Documents now comes after transport.
- Amend from the dashboard opens the review page.

**Plants frontend (`trade-imports-plants-frontend`)**
- Mirrors the animals change: the same `trail.js`, `gates.js` and `journey-flow.js`, and the same `nextStepPath`/`taskRowsOfSection`.
- The flow now has three sections with several pages each, whose ids are the hub groups.
- `commodityDetailsPage` is marked `subPage: true`.
- It gains an `insTypeQuestionUrl` hook and copies animals' `ins-frontend-url` helpers.
- The entry guard now lets a request through only once the notification has a saved answer.

**Tests (`trade-imports-ins-tests`, performance tests, workspace)**
- ins-tests:
  - Exact `expectedUrl` checks become `expectedUrlPattern` regexes that also accept an optional `from=` trail.
  - The opening-run, overview-task-return and change-context specs are replaced by save-and-continue, back and back-entry-points specs for both domains, plus a ZAP trail spec.
  - Flows use "Save and return to overview" where they must end on the Overview.
- perf-tests PR 33 ignores the `?from=` query using existing helpers.
- The workspace rewrites both journeys' Behaviour Spec around the one rule. It also adds a build-loop step that re-runs the tests repo's E2E after the other repos' branch images publish.

## 3. New features (user-visible)

1. **Change links and amendments carry on through the journey** (high, both frontends).
   - Save and continue after a review Change link goes to the next page that applies, then to the review. There is no longer a one-step return to the review.
   - On main, `exitTarget` and `amendReviewTarget` returned the trader to the review.
   - Required by ticket EUDPA-774 (`ticket-eudpa-774.txt:73, 97-100, 129`), `brief-eudpa-774.md:11,14` and ruling sam-2026-11-06b claim 4. The spec states it in `openspec/.../live-animals/journey-pages/check-your-answers/spec.md:122` and `plants/.../spec.md:61`.
2. **One page order from every start** (high, both frontends). A save from an Overview row no longer returns to the Overview at the end of a task row. Every save chains to the next page, and after the last page it goes to the review. The new order matches main's opening-run order, so a new notification still sees the same pages.
3. **Back goes to wherever the trader came from** (high, both frontends). Back follows the `from` trail. It survives a refresh, a refused save, a sub-page round trip and a new session, and it steps back in reverse order.
4. **Amend opens the review page, not the Overview** (medium, both frontends). The redirect is `withTrail(pagePath(id, 'notification-view'), ['dashboard'])`. The submitted row's View link carries the same trail.
5. **Amend pages show the draft controls** (medium, both frontends).
   - "Save and return" is gone. `amend-endings.test.js` proves the amend controls match the draft controls.
   - Contact while amending now offers "Save and return to overview" and the "Cancel and return to overview" link, which main hid. This is intended (`workareas/shared/eudpa-774/plans/inc-001.md:96-97, :564`).
6. **The entry guard is narrower** (low, both frontends). Overview, the review, the declaration and the confirmation page of a notification with nothing saved now redirect to the first page. On main, an opening run that had started in the session let these through. E2E in `tests/plants/e2e/features/start.spec.ts` and unit tests cover it.
7. **Plants commodity-type: "Save and return to overview" after lines are removed now lands on the Overview with no "removed" banner** (medium). No ruling records this, and it contradicts c-013/d-029 (see §5.4).

## 4. New patterns introduced

| Pattern | Where | Sound? | Replace or merge? |
|---|---|---|---|
| **`from` query trail.** Comma-separated, newest last, capped at 40. Entries are `TRAIL_START` (overview/dashboard/ins) or section page slugs. `carryTrail`/`pushTrail`/`trailBackLink`/`withTrail`. | `shared/trail.js` in both twins, re-exported from `kit.js` | Yes. Entries are checked against an allow-list, Back hrefs are rebuilt from known slugs, an unrecognised trail is dropped and logged once, and the file is identical in both twins. | Replaces the session opening run and `change=1`. Sits beside the `return` marker (see §5.3). The cost is that every link built outside kit must remember to carry or push. A link built with plain `pagePath()` silently loses the trail, and no generic test catches that. |
| **`pageAppliesTo` split out of `pageGatePasses`.** Save and continue checks scope only. | `flow/gates.js:23-35`, `flow/navigation.js` (both twins) | Works, and was deliberate (commit 25d8c8e8). There are now two definitions of "this page is open" (see §5.1). | Decide which rule navigation uses, and write it down. |
| **`subPage: true` page flag.** Keeps a page out of the Save and continue order. | `flow/navigation.js` `isStep`; animals `cph-number/page.js`, plants `commodities/page.js` | Yes. Small, documented, and tested in plants. | It is a third way out of the order, alongside "in no section" (transporter detours) and "in no task row" (review, declaration). The docs should say when to use each. |
| **`kit.nextTargetKeepingTrail`.** A skip that does not record the skipped page on the trail. | animals `kit.js:248-250`, used only by `animal-identification.controller.js:121` | Yes. | Animals only. Plants does not need it yet, because its skips go through derived gates. Write the rule in both repos' flow-and-gates.md so plants copies the same helper later. |
| **`insTypeQuestionUrl` flow hook.** | `flow/journey-flow.js` (both twins) | Yes. It follows the existing `configureJourneyFlow` pattern. | Plants returns a bare `/notification-type` because INS has no plants returnPage. This is already documented in plants `journey-flow-and-gates.md:99-103`. |
| **Optional-trail URL matching in E2E.** `OPTIONAL_TRAIL_PATTERN`, `expectedUrlPattern`, `urlPatternWithTrail`. | ins-tests `page-objects/shared/base-page.ts:25-32`, 22 spec files with about 130 call sites | It answers "which page am I on" but no longer checks the trail (see §5.6). | Document it as the house way to assert a journey URL. Add an `expectedUrlOnTrail` builder for the exact-trail checks. |
| **Build loop step f.** After the other repos publish, it cancels or re-runs a stale tests-repo E2E, and the CI fixer re-runs checks. | workspace `increment-build-loop.js:1490-1511, 2858-2863` | It fixes a real staleness gap. `gh run cancel` is new: nothing on main cancels CI runs. | Document it in the workflow README (see §5.8). |

## 5. Atypical implementation and drift

### 5.1 Save and continue ignores prerequisites, while the Overview still checks them (both twins). Medium.
- **Files:**
  - `flow/gates.js:23-35` and `flow/navigation.js` (animals 21-32, plants 32-43)
  - animals `transit-countries.controller.js:127-141` and `hub/controller.js:50-54`
  - animals `docs/journey-flow-and-gates.md:11-17`, `src/server/app/docs/flow-and-gates.md` ("Navigation and status", :57, :64) and `add-a-page.md:228-233`
  - plants `add-a-page.md:129-131, 287-291` and `journey-flow-and-gates.md:10`
- **What it does:** `nextStepPath` and the transit-countries guard use `pageAppliesTo` (scope only). `rowEntry` and the hub's `isHiddenRow`/`somePageOpens` still use `pageGatePasses` (prerequisites plus scope). Example in animals: the trader saves origin with no commodity, opens Arrival details and picks Rail or Road. Save and continue goes to transit countries and the page lets them in, but the Overview hides that row. The exposure is limited to `ENFORCED_AT_CONTINUE` (animals: countryOfOrigin and commodityCode; plants: commodityType and countryOfOrigin). In plants the only route is a typed URL, because Change links need a complete notification.
- **Existing pattern:** on main, one predicate (`pageGatePasses`) drove all navigation and page guards.
- **Docs drift:** the docs say "whose gate passes" and "earlier continue prerequisites". The shared doc says the transit row matches "the transit countries page's own redirect", but that redirect no longer exists.
- **Recommendation:** either keep scope-only and correct every doc above in both twins (name `pageAppliesTo`, say why prerequisites are skipped, add a navigation test with a prerequisite unmet), or switch `nextStepPath` to `pageGatePasses`.

### 5.2 The plants spec ledger was edited in place instead of superseded. Medium.
- **Files:** plants `spec/decisions.json:1161-1175` (d-069) and `~1433-1448` (d-085), plus d-008, d-013 and d-014. `spec/panel/rulings.json:253, 362-363, 450, 1825-1826` is unchanged.
- **What it does:** d-085 keeps its id but its subject changes from `behaviour:opening-run` to `behaviour:save-and-continue-routing`. Its resolution is rewritten, `decidedAt` moves to 2026-11-06, and `supersedes` is dropped. The panel-decided d-069, d-008, d-013 and d-014 are reworded. `rulings.json` still holds the opening-run text, so the two files now disagree, and a re-distil would bring the old text back.
- **Existing pattern:** `tools/journey-builder/spec-add-decision.sh` keeps the ledger append-only with `--supersedes`. On main, d-085 was only ever appended.
- **Recommendation:** restore d-008, d-013, d-014, d-069 and d-085 as they are on main. Then append a new decision, either `--supersedes d-085` on the opening-run subject or a new subject. The tool refuses a supersede across subjects, so `--supersedes d-069` would fail. Record any change to a panel-ruled conflict as a new decision on that conflict's subject.

### 5.3 The `from` trail sits beside the existing `return` marker (both twins). Low to medium.
- **Files:**
  - `shared/kit.js` (animals 180-204, plants 162: `withReturnMarker`/`readReturnMarker`)
  - animals `cph-number/controller.js:25-41`, `commodity-question-detour.js:13-35` and `addresses/party-edit/party-edit.controller.js:29-36`
  - plants `party-edit/party-edit.controller.js:26-38`, `party-edit/edit-href.js:4-7` and `consignor-select/controller.test.js:90`
- **What it does:** sub-page round trips carry both markers, for example `consignors/edit?return=consignors%2Fselect&from=notification-view`. The two validate and log differently: `readReturnMarker` checks a list passed in on each call and returns `{honouredSlug, refusedMarker}`, with the caller logging. `readTrail` checks the journey-wide slug set, drops the whole trail and logs it itself.
- **Existing pattern:** carrying two markers is not new. Main paired `return` with `change=1` the same way, and the branch swaps `change` for `from`. `return` is not redundant either: the links that set it (cphSection, partyEditHref, commodityQuestionHref) carry the trail without pushing the opener, so `trail.at(-1)` is not the opener.
- **Docs drift:** no `.md` on main or the branch explains `return` or how it relates to the trail. Animals `page-design.md:328-332` says the CPH link does not carry the trail, but the code calls `carryTrail` on it.
- **Recommendation:** document both markers and when each applies in flow-and-gates.md. Give them one validation and logging shape, and fix `page-design.md`. Folding `return` into the trail would also mean switching those links to `pushTrail`. Treat it as an optional follow-up; the plants party-edit could be done on this branch.

### 5.4 Plants `journey-spec.json` still describes the deleted mechanisms. Medium.
- **Files:** plants `spec/journey-spec.json:60, 78` (cya-change-round-trip, adopted), `:402, :779, :1040`. Also `spec/decisions.json:386`, `spec/panel/rulings.json:709, 714, 829` and `commodity-type/controller.js:141-152`.
- **What it does:** these entries still cite `?change=1`, `kit.withChangeContext` and `kit.exitTarget`, none of which exist after this branch. The branch edited the `:779` entry but left its `withChangeContext` sentence in. Separately, after lines are removed, commodity-type now sends "Save and return to overview" to the Overview with no banner. The set doc says so, but c-013, d-029 and d-023 still say "whatever exit control was pressed", and no superseding ruling exists.
- **Existing pattern:** the spec is the build loop's source of truth and is superseded through the ledger, which the branch did for other entries.
- **Recommendation:** supersede these entries through the rulings ledger, not just in `journey-spec.json`, because a re-apply regenerates the file from the ledger. Record a ruling for the commodity-type exit after removal, or restore the redirect to the list.

### 5.5 Plants fit `setUrl('…$')` now accepts any trail. Medium.
- **Files:** plants `fit/set-base.js:14-15, 57-62`, `fit/high-risk-plants-journey.js:706, 737-751, 811, 1181-1183` and `fit/journey-smoke.fit.spec.js:27-28, 116`.
- **What it does:** a trailing `$` is rewritten to `(?:[?&]from=[^#]*)?$`. That loosens about 35 exact matchers, and `[^#]*` also admits stray parameters. `pageUrlWithTrail` is used at one site (`hub.fit.spec.js:52`) and `pageUrlAllowingTrail` has no callers. Several helpers copy the regex inline instead. journey-smoke's `onPage` ignores the query altogether. `describeAddressPicker` narrows `getByRole('alert')).toHaveCount(0)` to check only the not-in-book link.
- **Existing pattern:** on main, `setUrl('…$')` was an exact match. The house rule `code-quality.md` (Tests) says never to loosen an assertion.
- **Recommendation:** make exact the default again, use the helpers where a trail is expected, delete the inline copies, and restore the any-alert check.

### 5.6 E2E URL checks no longer see the trail (ins-tests). Low.
- **Files:** ins-tests `page-objects/shared/base-page.ts:25-32, 293-296` and the four `?from=overview` literals (`tests/plants/e2e/features/start.spec.ts:86`, `arrival.spec.ts:180` and both back-entry-points specs).
- **What it does:** about 130 `toHaveURL` sites now accept any trail or none. Trail correctness rests on the back*.spec files and `expectReviewIsLastOnTrail`.
- **Existing pattern:** main already had anchored regex `toHaveURL` checks and hand-typed query strings. Only the wildcard tail is new.
- **Recommendation:** document `expectedUrlPattern`. Optionally add `expectedUrlOnTrail(ref, places)`.

### 5.7 Assertions moved into a flow and a page object (ins-tests). Medium.
- **Files:** ins-tests `flows/animals/journey.ts:891-898` (`reviewCompleteOverview`) and `page-objects/shared/base-page.ts:310-313` (`expectReviewIsLastOnTrail`, 8 calls across 4 spec files).
- **What it does:** brings `expect` into a flow and into BasePage.
- **Existing pattern:** `docs/best-practices/playwright/BEST_PRACTICES.md:79, :271` keeps assertions in specs. On main, the only shared assertions are in `type-ahead-checks.ts`.
- **Recommendation:** have specs assert on the existing `placesOnTrail()`, or move both helpers into a `*-checks.ts` module. Split `reviewCompleteOverview` into a navigation step plus assertions in the spec.

### 5.8 `backHrefInFreshContext` is a second fresh-context mechanism with weaker isolation (ins-tests). Medium.
- **Files:** ins-tests `page-objects/shared/base-page.ts:298-308` and `fixtures/ui.ts:161-171`.
- **What it does:** copies the whole `storageState`, including the yar `session` cookie and localStorage. Its doc comment says "only the signed-in session". It relies on Playwright defaults for baseURL, proxy and TLS. The two back-entry-points specs that use it therefore do not prove Back works without session state, which is the point of the theme.
- **Existing pattern:** the `openFreshSession` fixture strips storage with `stripToAuthCookie` and passes environment options explicitly. The branch's new `save*ThenOpenFreshSession` fixtures already use it.
- **Recommendation:** use `openFreshSession` in those specs and delete the method.

### 5.9 Build loop step f is not in the README (workspace). Medium.
- **Files:** `.claude/skills/requirements-pipeline/workflow/increment-build-loop.js:1490-1511, 2858-2863`, plus `README.md:1090, 1212-1217`.
- **What it does:** watches the other repos' publish runs, then cancels or re-runs a tests-repo E2E that started too early. `CI_FIXER_STALE_RULE` now lets the CI fixer re-run checks. The same diff also skips empty patch files and stashes a half-restored repo (`:1593-1594, :1683-1693`).
- **Existing pattern:** main already re-runs stale-rollup jobs with `gh run rerun --failed` (`:2817`). Spotting staleness across repos, `gh run cancel`, and the CI fixer re-running checks are new. The CLAUDE.md rule "rules go in the repo, not memory" puts process rules in the skill's committed docs.
- **Recommendation:** document step f in the README's PR/CI section and in the stale-rollup row. Limit the cancel to runs whose head SHA is the tests PR's current head. The loop's stages run one after another, so a collision is an edge case.

### 5.10 The review-page Change trail is threaded positionally in animals but as an object in plants. Low.
- **Files:** animals `check-answers/view-model/rows/change-link.js:13-34`, `view-model/index.js:13-68`, `sections/transport-and-arrival.js:13-58` and `species-card-actions.js:10-16`.
- **What it does:** `changeLinkTrail` goes to every section and card builder. `reviewPageTrail` goes only to consignment-parties and contact-address. `cardAction(journeyId, changeLinkTrail, slug, hidden)` takes the trail as a new middle positional argument. Plants uses `changeHref({ journeyId, changeLinkTrail }, …)` instead. A missing trail throws a TypeError rather than failing quietly. The subtree diff is +167/-25.
- **Existing pattern:** main already threaded `journeyId`, `readOnly` and `scope` through builder options.
- **Recommendation:** bring the twins into line, either with the context object or a `changeHrefFor(slug)` factory. Not blocking.

### 5.11 Docs disagree with the trail code (both twins). Low.
- **Files:** animals `src/server/app/docs/flow-and-gates.md:108-118` and plants `:106`, against `shared/trail.js:48`.
- **What it does:** the docs say kit.js "owns" the trail operations and that an unrecognised trail logs at info. The functions live in `trail.js` (kit re-exports them), and the code logs at warn.
- **Existing pattern:** main's closest equivalent, `logRefusal` (plants `kit.js:136`), logs at info. `pino-logging.md:172` supports either level.
- **Recommendation:** choose a level, then make the code and docs agree in both twins and name `trail.js` as the owner.

### 5.12 Tests that prove less than they claim. Low.
- **Animals fit helpers** (`fit/live-animals-journey.js:161-162, 740-744, 1016-1057`): `openOverview` (a goto) replaces `expectOverview` after a save, and `completeAnswerSections` reopens the Overview after each section. The chained one-pass smoke test and the controller unit tests still guard the redirects. Recommendation: assert the next heading before `openOverview`.
- **Plants `check-answers.fit.spec.js:18`:** the test is still titled "Change links that return to review" but now asserts the opposite. Retitle it.
- **Animals `amend-endings.test.js:133-139`:** the Welsh-copy test compares constants with literal strings and renders nothing. It is the only place the Welsh `saveActions` values are pinned. Move it into the `save-actions` copy block in `shared/copy.test.js`.
- **Animals E2E:** the specs (`change-from-cya.spec.ts`, `amend-endings.spec.ts`, `save-and-continue.spec.ts`) reach the review by URL after a Change link. Plants `review.spec.ts:432-440` walks through to it. Add the same walk-through for animals.

### 5.13 Small twin or consistency leftovers. Low.
- **Plants hand-kept cookie list** (`engine/journey.js:44`, `set-completeness.js:7-8`, `session.js` `DEFAULT_COOKIE_NAMES`): removing a cookie took three edits. Animals derives the list with `journeyCookieNames()`. The difference predates the branch, so treat it as a follow-up.
- **Plants `trail.test.js:112`** stubs `insTypeQuestionUrl` as `/ins-question/j-1`. The real shape is asserted elsewhere (`entry-guard.test.js:212`). Optionally make the stub match.
- **Workspace `increment-build-loop.js`** names the publish workflow two ways: `TESTS_IMAGE_WORKFLOW = 'publish-branch.yml'` (:312), and the display name `"Publish Branch Image"` (:1502, :2861). Use one constant.
- **Spec trail cap:** REQ-FLOW-018 and REQ-PLANTS-FLOW-017 promise "reverse order" but do not mention the 40-entry cap (`trail.js:9, 102-103`). Past the cap, the oldest entries drop and Back ends at the Overview rather than a dashboard or INS start. Add the cap to the spec.

## 6. Risks

**Correctness**
- **Prerequisite mismatch (§5.1).** Save and continue can land on a page the Overview hides. Only `consignmentDetails` and transit countries guard themselves.
- **`nextStepPath` throws for a page in no section.** On main this fell back to the hub. Every current `nextTarget` caller passes a section page. The throw is tested (animals `dispatch.test.js`, plants `navigation.test.js:114`) and documented in `flow-and-gates.md`, and controller tests that check the redirect after a valid save would catch a misconfigured page. No structural check at start-up exists yet. Low.
- **A forgotten `carryTrail` or `pushTrail`** silently sends Back to the fallback. Only per-feature tests catch it; nothing checks generically. The loosened matchers in §5.5 and §5.6 make this harder to see.
- **Spec and ledger drift in plants (§5.2, §5.4)** could steer a re-distil or build increment back towards the deleted behaviour.
- **Coverage drop.** Across live-animals and plants, rows marked `full` fall from 1419 to 1267 and `partial` rows rise from 156 to 346. 145 new links are marked "not seen failing". The theme's central routing scenarios (SCN-FLOW-001-A, 003-*, 018-*) are now only partly proven, and REQ-FLOW-002 is removed. Marking unprobed links partial is correct per the frontend-change skill, but no mutation probe was run. Medium.
- **Orphaned yar keys** (`liveAnimalsOpeningRun`, `liveAnimalsOpeningRunEntry`) in sessions from before deploy. Nothing reads them and they expire with the session. Harmless.

**Security**
- **No open redirect.** Trail entries are checked against `TRAIL_START` plus section slugs, Back hrefs are rebuilt with `hubPath`/`dashboardPath`/`pagePath` or the configured INS URL, and the logged value is cut to 200 characters. Both twins' `trail.test.js` cover hostile inputs: absolute URLs, foreign hosts and a repeated `from` parameter. No E2E tamper test exists, but the unit tests guard it.
- **Weaker test isolation (§5.8).** `backHrefInFreshContext` carries the session cookie over, so a session-held Back record would pass undetected.
- **Agent cancels CI runs (§5.9).** Step f can cancel a tests-repo E2E run. Limit it to the current head SHA.

**Performance**
- A trail of up to 40 slugs, some URL-encoded, adds several hundred bytes to each link and form post. Minor.
- A change made from the review now costs the trader a POST and a page load for every later page that applies. This is a UX cost of the intended design.
- The allow-list being rebuilt on every read was checked and refuted: the cost is trivial and in line with main.

## 7. Clean reuse

- `shared/trail.js`, `flow/gates.js`, `flow/journey-flow.js`, and `nextStepPath`/`taskRowsOfSection` are identical or mirrored across the twins. The number of lines that differ between the twins fell in every shared file: `kit.js` 310→205, `set-completeness` 58→12, `save-actions.njk` 80→41.
- Page conversions are uniform: `kit.trailBackLink(request)` and `h.redirect(kit.nextTarget(request, page, scope))`. `render` functions that were async only to await `runBackLink` are now synchronous.
- Sub-page round trips swap `withChangeContext` for `kit.carryTrail` in exactly the same places, and the helper shapes are kept.
- Forms post to the current URL with no `action` attribute, so the trail rides along without a hidden field, the same way `?staleAction=1` already works.
- The deletions are complete: no callers remain of `runBackLink`, `exitTarget`, `amendReviewTarget`, `changeContext`, `withChangeContext`, `amendFormActions`, `AMEND_RETURN_CHOICE` or `hubExitWhileAmending`. The openingRun cookie and session port were removed across `session.js`, `real.js`, `stub.js`, the cookie names, the fixtures and the persistence docs.
- `pageGatePasses` returns the same as before, so `rowEntry`, the hub and `analysis/simulate.js` keep their old meaning.
- `save-actions.njk` deletes its amend branch rather than adding to it.
- The hub builds its groups from flow sections in both twins, replacing the hand-kept GROUPS list.
- The `insTypeQuestionUrl` hook follows the existing `configureJourneyFlow` pattern. Plants copies animals' `ins-frontend-url` helpers, and its `context.test.js` uses the shared `restoreConfigAfterEach`.
- New branches that change an outcome log once with ids: the entry guard, the amend start and commodity-type line removal.
- Tests:
  - Shared test generators (`itSendsBackToWhereTheTraderCameFrom`/`…OnRefusal`) and `engine/test-support.js` helpers replace the old ones one for one, in step across the twins.
  - `set-completeness.test.js` swaps a source-text check for a real mount of both sets on one Hapi server.
  - `amend-endings.test.js` compares the rendered amend and draft pages.
- ins-tests: the fresh-session fixtures follow the existing `submit*ThenOpenFreshSession` shape, `urlPatternWithTrail` reuses `escapeRegex`, and the ZAP trail spec replaces the change-context spec one for one. The opening-run vocabulary was renamed throughout with the docs, and the documents helper now uses `openCurrentOverview()`.
- Spec: removed requirement ids are deleted, not renumbered, and nothing dangles. Per-page Back requirements follow the shape already on main. Each spec rewrite traces to a committed source. `tim spec lint` reports 0 findings.
- perf-tests PR 33 reuses `pathOf` and `pagePath`.

## 8. Decisions for the reviewer

1. Change links and amendments carrying on through the journey depart from the GOV.UK check-answers pattern. Does this need design, UCD or service-assessment sign-off beyond the product-owner rulings before merge? Should the PR descriptions and theme tickets cite ruling sam-2026-11-06b and call out the loss of "Save and return"?
2. Should Save and continue skip prerequisites (`pageAppliesTo`) while the Overview hides rows using `pageGatePasses`? Either align the two rules or document the split, and fix the "whose gate passes" wording in both twins' docs.
3. Plants ledger: restore d-008, d-013, d-014, d-069 and d-085, and record the new routing ruling through `spec-add-decision.sh`, before merge?
4. Plants spec: supersede the stale `?change=1`, `withChangeContext` and `exitTarget` entries through the ledger, and rule on the commodity-type exit to the Overview with no banner after removal (or restore the redirect to the list)?
5. Plants fit: make `setUrl('…$')` exact again and restore the any-alert assertion?
6. ins-tests: replace `backHrefInFreshContext` with `openFreshSession`, and move the assertions out of the flow and BasePage?
7. `return` and `from`: document both now, and fold `return` into the trail as a follow-up (or for plants party-edit on this branch)?
8. Coverage: run `spec-cover` on journey-flow for both domains before merge or right after it, and note the coverage drop in the PR?
9. Build loop: document step f in the README and limit `gh run cancel` to the tests PR's current head SHA in this PR?
10. Trail log level: warn or info? Make the code and docs agree in both twins.
11. Low-priority tidy-ups (follow-up or this branch?):
    - the animals and plants card trail argument shape
    - the plants cookie-list derivation
    - one publish-workflow constant
    - the 40-place cap in the spec
    - asserting the next heading in `completeAnswerSections`
    - the plants fit test title
    - moving the Welsh copy test
    - an animals E2E walk from a Change link to the review
