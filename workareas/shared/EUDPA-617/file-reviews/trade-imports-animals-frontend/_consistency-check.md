# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-617
**All repos in scope:** trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-reference-data, trade-imports-stub, trade-imports-workspace
**PR:** #449 | **Commit:** d4174c8

trade-imports-animals-backend#114 is an EUDPA-296 PR and is left out. Findings already in `file-reviews/trade-imports-animals-frontend/*.review.json` are not repeated.

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Branch `fix/EUDPA-617-review-followups` | ins-tests ✅, reference-data ✅, stub ✅, workspace ✅ | ✅ Present | CONSISTENT |
| Renamed FIT titles and their coverage links | workspace ❌ one link still has the old title | ✅ Title renamed at `identification.fit.spec.js:761` | INCONSISTENT (the fix is in the workspace PR; see its check) |
| reference-data's new 500 and 503 split | reference-data ✅ answers 500 or 503 by cause | ✅ `requestReferenceData` throws on any non-ok status and each caller wraps it as a 503 Boom, so both answers reach the page the same way | CONSISTENT |
| Refusal wording on the review | workspace ✅ SCN-CYA-014-A says "select a species from the list" | ✅ `copy.en.js:142` and `copy.cy.js:143` both say so | CONSISTENT |
| `numberOfAnimalsFor` helper name | ins-tests ✅ `consignment-details-page.ts:44` | ✅ `fit/live-animals-journey.js:574` | CONSISTENT |
| `logRefusal` `level` option in the plants twin | plants-frontend has no PR | ✅ Present | Not raised: ami-nav's Won't Fix |
| `withReturnMarker` in the plants twin | plants-frontend `kit.js` has `readReturnMarker` only, and no PR | ✅ Present | Expected: same reasoning as `level`, and nothing in plants is wrong because of it |

## Missing Changes

*None identified.*

## Unique Changes

`GAME_SPECIES` now holds only `Bos sp.`, and `services.md:65-69` says so. No spec or other repo states the old rule. `Bos spp.` remains in tests only as a species that is not listed, which is intended.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/refusal.js:11` | Minor. `import { logRefusal } from '../../../../../../shared/kit.js'` is the only named import of `logRefusal` in production code. The check-answers neighbour `declaration/controller.js:13` has `import * as kit`, and calls `kit.logRefusal`. The walk note also describes this call as `kit.logRefusal`. | `refusal.js` reaches the kit the same way as its callers do. | Import `* as kit` and call `kit.logRefusal(request, { ... })`. |
| `src/server/app/sets/live-animals/journeys/linear/features/commodities/commodity-question-detour.js:12,15` | Minor. Renaming the private helper settled the pair it was flagged for, but the same file now exports two more names that do not say how they differ. `commodityQuestionPath(request)` and `commodityQuestionHref(request, opener)` both return an href to the same page. The only difference is that the second adds the `return` marker. "Path" and "Href" do not tell a reader that. `commodityQuestionPath` is new to this file in this PR. | The two exports' names say which one carries the return marker. | Rename `commodityQuestionHref` to `commodityQuestionPathReturningTo`. |

## Statements Made Untrue

*None identified beyond the per-file reviews (searched: `empty-lines-redirect`, `redirectEmptyLinesToCommodityQuestion`, `Consignment details has no commodities`, `commodityCodeCount`, `animalsQuantityInputUnder`, `Draft refused: reference data`, `RETURN_PARAMETER`, `openCatIdentification`, `fillCatRecord`, `clickSaveAndContinue`, across `src/`, `fit/`, the repo README and the workspace `docs/` and `openspec/`; `Bos spp`, and `return=`, across this repo's docs and `openspec/specs/`; `logRefusal` across `services.md`, `docs/best-practices/` and `.claude/rules/`; `commodities'` in `species-check.test.js`).*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 2 inconsistencies found, both minor, plus 1 cross-repo link recorded against the workspace PR
**Summary:** Behaviour matches the other PRs; one FIT rename is not carried into the workspace coverage file, and two names in this PR need tidying.
