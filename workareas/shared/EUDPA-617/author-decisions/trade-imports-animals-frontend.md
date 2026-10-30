### amieljemei 2026-10-29T09:25:15Z

## EUDPA-617 re-review of the follow-ups (head `c9ae105`)

**Verdict: needs attention.** No functional regressions. Fully fixed: #403, #405, #406, #408, #412, #416, #418 to #422 and #426. The refusal-only species gate moved cleanly to the controller.

### Logging

1. **#424 was closed by deleting the log, not by making it say which case happened.** Both redirects to the commodity question now log nothing. One is opening consignment details with no lines (`consignment-details.controller.js:85-86`). The other is removing the last commodity or species (`remove/post-remove.js:14-15`). `consignment-details.controller.test.js:284, 295, 432` now assert `logger.entries` is `[]`, which locks the silence in. The house rule (code-quality.md:80) is that a redirect away from the page asked for logs once.
   *Suggested:* add an info log with `journeyId` and a reason of `no-commodities-on-load` in the GET branch, and one with `last-commodity-removed` plus the `commodityCode` in `afterRemoval`. Assert each exact entry in the tests.
2. **`logRefusal` is now used inconsistently.** `refusal.js:113` logs the species refusal with a direct `request.logger.warn` rather than `kit.logRefusal({ level: 'warn', … })`. The when-to-call rule sits in the `@param fieldErrors` JSDoc (`kit.js:130-132`) as well as `architecture.md`, and `architecture.md:188` still says the line is "info" only (#423 is half done).
3. **`kit.js:122`: the twins have drifted.** The animals `logRefusal` has a `level` option and the plants-frontend copy doesn't. Port it on the same branch name.
4. **`search.controller.test.js:302`: no test title says an empty selection logs nothing (#418).** That's only checked as a trailing assertion in two tests whose titles don't mention it. Give it its own test.

### FIT helpers and tests

5. **`fit/live-animals-journey.js:574`: `animalsQuantityInputUnder` pairs boxes by position.** It pairs every page h3 with every "Number of animals" box by index, and if it can't find the species it quietly picks the last box (`nth(-1)`), so a test can fill another species' count. Rename it to `numberOfAnimalsFor(page, latinName)` to match the ins-tests twin, and throw on -1. Better still, give each box a per-species accessible name in `_species-quantities.njk`.
6. **`fit/live-animals-journey.js:948`: #425 is half done.** `saveAndContinue(page)` still returns a locator, while local copies with the same name click (`hub-picker`, `party-edit`, `journey-smoke`). Call the locator `saveAndContinueButton`, export one action helper, and delete the local copies.
7. **`fit/live-animals-journey.js:615`:** `#commodity-selection` is now located here and also privately in `search.fit.spec.js:37` (`selectedSummary`). Export one helper.
8. **`identification.fit.spec.js:762, 1001`: #415 is half done.** Titles still say "a dog" and "a cat card", and the helpers are still named `openCatIdentification`, `fillCatRecord` and `addCatRecordRow`. Use the Latin names.
9. **`consignment-details.fit.spec.js:364`:** the title claims the row is marked Completed, but nothing asserts the task status. Either assert it or drop it from the title.
10. **`consignment-details.fit.spec.js:139, 191, 193` (minor):** these still use class and sibling selectors. Use roles and accessible names.

### Structure, naming and docs

11. **`commodity-question-detour.js:9/12`:** `commodityQuestionPagePath` and `commodityQuestionPath` have names that don't say how they differ. One keeps `change=1`. Also, the page is `commoditiesPage`. Rename the private helper to `commoditiesPagePath`.
12. **`commodity-question-detour.js:16`:** the `return` parameter name is defined here and read separately in `kit.readReturnMarker`. Add `kit.withReturnMarker` so one module owns it.
13. **`search.controller.js:34`:** `SEARCH_ACTION` and `CLEAR_ACTION` are at module scope but only `post()` reads them. Move them inside `post()`.
14. **`check-answers/controller.js:163`:** the `refused` flag gates the two cards in two different ways: it's passed into the documents helper, but the caller skips the species card. Pick one way.
15. **`refusal.test.js:283, 291, 301`:** these titles say the error names a document, but the assertions check generic copy that names none.
16. **`model/obligations/README.md:171`: #404 is half done.** The sibling bullet still files helpers under "Line gates on a list of codes", and `matches` is listed under the wrong bullet. `README.md:199` points to `helpers/index.js` for guidance that's actually in "Choosing a gate helper".
17. **`docs/services.md:68`:** "if MDM renames the species, the rule has to follow it" repeats the rule at lines 53-55. Delete it.

**Still open from the second pass:**
- **#176:** `consignment-details.fit.spec.js:124-134` still checks only the Remove button values and never clicks Remove.
- **#263:** `stub-or-reference-data.js` still hides the 503 mapping and hard-codes `'commodities'` for the species-check caller.
- **#378:** no test sends a Latin name with HTML characters through `rowLabel` into the Remove hidden text or the Change link.

Note: these PRs cite `workareas/reviews/EUDPA-617/walk-second-pass/decisions.md`, but I couldn't find it. If any of the above was put off on purpose, please point me to the decision.


### ami-nav 2026-10-29T14:37:35Z

**Walk note on (1) — #424 silent redirects: Fix.**

Both redirects to the commodity question now log at info with `journeyId` and a reason: `no-commodities-on-load` on GET, `last-commodity-removed` plus `commodityCode` after removing the last group or species. Tests assert those entries.

### ami-nav 2026-10-29T14:44:16Z

**Walk note on (2) — logRefusal vs direct warn: Fix.**

The unlisted-species Continue refusal now calls `kit.logRefusal` with `level: 'warn'`, reason `unlisted-species`, and the `unlisted` list. `architecture.md` says the refusal line is info unless `level` is warn.

### ami-nav 2026-10-29T14:58:48Z

**Walk note on (3) — plants logRefusal twin: Won't Fix.**

Not a 617 issue. Plants does not search MDM species and has no PR on this branch. Animals `logRefusal` gained `level` for the unlisted-species warn; keeping the plants copy in step is twin-maintenance for a later chore.

### ami-nav 2026-10-29T15:48:15Z

**Walk note on (4) — empty selection log test: Won't Fix.**

Did not add a test whose title is about logging. Removed the trailing `logger.entries === []` from the two empty-save tests so those titles only prove the page error. Empty save still does not log (the #418 controller change).

### ami-nav 2026-10-29T16:36:39Z

**Walk note on (6) — saveAndContinue locator vs click: Won't Fix.**

Not a 617 issue. The shared helper that returns a locator is EUDPA-720. The local copies that click are older address and journey-smoke FITs. 617 did not change these lines. Renaming to `saveAndContinueButton` and deleting the copies is FIT tidy for a later chore.

### ami-nav 2026-10-29T16:39:48Z

**Walk note on (7) — `#commodity-selection` located twice: Fix.**

Exported `selectedSummary` from the shared FIT helper. `expectSpeciesSelected` and the search FIT both use it. The private copy in `search.fit.spec.js` is gone.

### ami-nav 2026-10-29T16:43:22Z

**Walk note on (8) — #415 cat/dog names: Fix.**

Identification FIT helpers are `openFelisCatusIdentification`, `fillFelisCatusRecord` and `addFelisCatusRecordRow`. The two leftover titles now say Canis familiaris and Felis catus, matching `addBosTaurusRecord` and the Equus cabalus title 617 already renamed.

### ami-nav 2026-10-29T16:47:44Z

**Walk note on (9) — title claims Completed: Fix.**

Dropped “and marks the row Completed” from the consignment-details FIT title. The test only proves save and return stores the counts. Hub FIT already covers task status.

### ami-nav 2026-10-29T16:51:15Z

**Walk note on (10) — class and sibling selectors: Won't Fix.**

Not a 617 issue. The `.govuk-back-link` click is from August. The caption sibling selector is EUDPA-720. 617 did not add or change either. The same caption locator is used on other pages, including `section-caption.fit.spec.js`.

### ami-nav 2026-10-29T16:58:48Z

**Walk note on (11) — commodityQuestionPagePath vs commodityQuestionPath: Fix.**

Renamed the private helper to `commoditiesPagePath` (the `commoditiesPage` URL). `commodityQuestionPath` is still the export that adds `change=1` through `withChangeContext`.

### ami-nav 2026-10-29T17:04:08Z

**Walk note on (12) — `return` parameter owned twice: Fix.**

`kit.withReturnMarker` now sits beside `readReturnMarker` and owns the `return` query name. `commodityQuestionHref` uses it instead of a local `RETURN_PARAMETER`.

### ami-nav 2026-10-29T17:07:04Z

**Walk note on (13) — SEARCH_ACTION and CLEAR_ACTION at module scope: Fix.**

Moved both constants inside `post()`. Only that function reads them. `SEARCH_FIELD` stays at module scope because `render` uses it too.

### ami-nav 2026-10-29T17:11:12Z

**Walk note on (14) — `refused` gates the two cards in two ways: Fix.**

`speciesCardErrors` now takes `{ refused }`, same shape as documents `includePending`. The controller always calls it when the page may show errors. The helper returns `{}` until Continue is refused. Behaviour is unchanged.

### ami-nav 2026-10-29T17:15:25Z

**Walk note on (15) — scan error titles say they name a document: Won't Fix.**

Not a 617 issue. Those titles and the generic “One or more of your documents…” copy are from the documents-scan work. 617 only added the species tests in this file.

### ami-nav 2026-10-29T17:23:04Z

**Walk note on (16) — #404 README leftovers: Fix.**

`matches` is on the equals-shape bullet, not under line gates on a list of codes. The file map points at Choosing a gate helper, not `helpers/index.js`.

### ami-nav 2026-10-29T17:23:41Z

**Walk note on (17) — duplicate MDM-rename sentence: Fix.**

Dropped the second “if MDM renames the species, the rule has to follow it” from the Bos sp. bullet. The spelling-must-follow-MDM rule stays at the top of the MDM section.

### ami-nav 2026-10-29T17:31:59Z

**Walk note on still-open #176 — Remove FIT only checks button values: Won't Fix.**

That test is the action-value distinction (`remove:0` vs `remove-species:1`). Two later tests in the same file already click both buttons: `removes one species row without changing another quantity` and `removes one commodity group without changing another quantity`. 617 only renamed the locators; it did not add a click gap. Clicking in this test would duplicate those two.

### ami-nav 2026-10-29T17:36:48Z

**Walk note on still-open #263 — 503 mapping and hard-coded commodities: Fix.**

`fromStubOrReferenceData` now takes `dataset`. Search passes `commodities`. Species-check passes `species`, so a failed species check is no longer labelled as commodities. The 503 wrap stays in the helper; each caller names what failed. Tests assert those dataset names.

### ami-nav 2026-10-29T17:38:15Z

**Walk note on still-open #378 — HTML Latin name through rowLabel: Fix.**

The species-cell escape test already existed. Added tests that the same `Felis <catus> & friends` name is escaped in the Remove hidden text and in the Change link hidden text.

