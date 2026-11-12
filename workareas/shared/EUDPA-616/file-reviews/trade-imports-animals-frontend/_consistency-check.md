# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-616
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #474 | **Commit:** c36899e

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Chips name a species by its Latin name alone (`selected-summary.js` `label: row.speciesLatinName`) | ins-tests ✅ (`speciesEntry`/`removeButtonFor` use `species.latinName`), workspace ✅ (REQ-008, SCN-008-A) | ✅ Present (`selected-summary.js`, `fit/live-animals-journey.js` `expectSpeciesSelected`/`pressSpeciesRemove`) | CONSISTENT |
| Results heading reads "Name (code)" (`namedLegendFor`) | ins-tests ✅ (`commodityHeading` regex accepts both forms), workspace ✅ (REQ-004, SCN-004-D) | ✅ Present (`labels.js`, `CATTLE_HEADING`) | CONSISTENT |
| Results container id `commodity-search-results` | ins-tests ✅ (`noResults` locator) | ✅ `search.njk` `resultsId` | CONSISTENT |
| JS refresh-in-place behaviour (results route, live region, focus, queueing, dropdown hide) | workspace ✅ (REQ-017 A–K + coverage) | ✅ Present (`multi-select-search.js`, `search.controller.js`) | CONSISTENT |
| "Update selected" no-JS control | workspace ✅ (REQ-008 body, SCN-008-F) | ✅ Present (`_results.njk`, copy en/cy) | CONSISTENT |
| Group order: spec now says "commodity code" | workspace ⚠ (REQ-015 body changed, title and SCN-015-A not) | ⚠ `result-order.js` still names it legend/heading order | INCONSISTENT (see Naming / Statements) |
| Shared `submitted-search/macro.njk` gains `type`, `errorMessage`, `attributes` | twin `trade-imports-plants-frontend` (not in scope) ❌ — its macro is byte-identical to this repo's `main` copy | ✅ Present | SUSPICIOUS (twin drift, low) |

## Missing Changes

*None identified.* Every frontend behaviour the workspace spec and ins-tests PR rely on (Latin-name chips, named headings, `#commodity-search-results`, Update selected, REQ-017 behaviour) is present, and every coverage-linked frontend test title in the workspace PR exists verbatim in this branch's `search.fit.spec.js`, `search.controller.test.js`, `labels.test.js` and `multi-select-search.test.js`.

## Unique Changes

- `src/server/common/components/submitted-search/macro.njk` — three optional params (`type`, `errorMessage`, `attributes`) added. The twin `trade-imports-plants-frontend` carries the same macro (identical to this repo's `main` before the change) and does not get them. Intentional for this ticket (plants has no multi-select search yet), but the shared macro now differs between twins; whoever next adopts `appMultiSelectSearch` in plants, or diffs the twins, will hit it. Low: port the three additive params to plants in a follow-up, or note the divergence.
- `documents/fit/upload.fit.spec.js` (`waitForLoadState('load')`) and `hub/hub.fit.spec.js` (switch to `answerWhatYouAreImportingFromOverview`) — fit stabilisation knocked on by the new client module. Intentional; no counterpart needed elsewhere.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/server/app/sets/live-animals/journeys/linear/features/commodities/search/view-model/result-order.js:4-7` | `byLegend` / `inLegendOrder` sort by `legendFor(code)`, which is the bare code (`commodity-legend.js:3` `legendFor = (commodityCode) => commodityCode`). The legend the results now show is `namedLegendFor` ("Cow (0102)"). So "legend order" no longer means the order of the legend on screen; it means code order, which is what the spec now says (REQ-015 "in order of their commodity code"). | The name says what it sorts by. | Rename to `inCodeOrder` / `byCode` and compare the codes directly. |
| `.../commodities/commodity-legend.js:3,5` | Two "legend" functions for one concept: `legendFor` (the code alone, used by the chips, `commodity-groups.js` and the sort) and `namedLegendFor` (name and code, used by the results). After this change `legendFor` is just the code, and its name implies it is the legend shown in the results. | One name per meaning. | Either drop `legendFor` in favour of the code itself at its callers, or rename to `codeLegendFor` so the two read as two different legends. |
| `src/server/app/sets/live-animals/docs/page-design.md:264-293,310` | The same panel is called "the summary", "the chips", "what has been chosen" and (unchanged line 310) "the selected panel"; the spec calls it "the tally" and the markup `__selected` / `selectedSummary`. Low: pre-existing drift widened by this change. | — (advisory) | Pick one word in page-design.md for the panel (the spec's "tally" or the code's "selected summary"). |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `src/server/app/sets/live-animals/docs/services.md:91-92` | "The page lists the results it received in commodity-heading then species-label order" | Groups are in commodity-code order; the heading is now "Name (code)" so heading order and code order differ (page-design.md in this same PR changed its matching line to "code") | States the new behaviour | "…in commodity-code then species-label order" |
| `src/server/app/sets/live-animals/docs/services.md:110-113` | the ins-tests `commodities.spec.ts` "asserts the species checkbox accessible names and the selected panel against `speciesLabel(commodityLines.cattle)` (`commodities.spec.ts:69` and `:109`)" | ins-tests PR #96 now asserts the selected panel with `speciesEntry` by Latin name, not `speciesLabel`; only the checkbox names (`:69`) still pin the stub's common name, and the old `:109` line no longer exists | States the new behaviour | Drop "and the selected panel" and the `:109` reference |
| `src/server/app/sets/live-animals/journeys/linear/features/commodities/search/view-model/result-order.test.js:6` | `'Should return commodity codes given out of order sorted into commodity-heading order'` | Sorted into commodity-code order; the heading is no longer the code. Title is also linked from workspace coverage.json (REQ-015) | States the new behaviour | "…sorted into commodity-code order" (and update the coverage link in the workspace PR in step) |

*Searched: `commodity-heading`, `heading order`, `heading then species`, `selected panel`, `species' label`, `speciesLabel`, `labelFor`, `legendFor`, `inLegendOrder`, `Clear all`, `expectSpeciesSelected`, `pressSpeciesRemove`, `submitted-search`, `appSubmittedSearch`, `accessible-autocomplete` across `**/*.md`, `src/**/docs`, test titles and the commodities view-model.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 6 (3 stale statements, 2 naming, 1 twin drift; plus 1 advisory wording item)
**Summary:** The frontend matches the ins-tests and workspace PRs on every behaviour they rely on. Still to fix: the sort helpers and docs still describe "heading/legend order" now that the heading reads "Name (code)" and the order is by code, and the plants twin's `submitted-search` macro has fallen behind.
