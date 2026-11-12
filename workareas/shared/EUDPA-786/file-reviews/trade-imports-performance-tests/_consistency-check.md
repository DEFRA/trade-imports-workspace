# Consistency Check: trade-imports-performance-tests

**Ticket:** EUDPA-786
**All repos in scope:** trade-imports-animals-frontend, trade-imports-performance-tests, trade-imports-stub, trade-imports-workspace
**PR:** #34 | **Commit:** cb768d2

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Bos taurus matched under germinal `05111000` and `05119985` | stub `Bos taurus` search lists 0102, 05111000, 05119985 ✅ | ✅ `README.md:938` names both codes | CONSISTENT |
| Both codes flagged `isGerminal`, so reference-data drops them | stub `mdmProductCommoditiesResponses.json` flags both `true` ✅; ticket background ✅ | ✅ `README.md:938` | CONSISTENT |
| Load draws Bos taurus under `0102` only | stub `0102` still lists Bos taurus ✅ | ✅ `src/k6/live-animals.js:74` `speciesUnderCode(…, ANIMAL_COMMODITY_CODE)` unchanged | CONSISTENT |

## Missing Changes

*None identified.* The k6 script needs no change: `speciesUnderCode` keeps only `0102` rows whether or not germinal rows reach the page.

## Unique Changes

*None identified.* The one-line README change is the ticket's stated scope for this repo.

## Naming and Reuse

*None identified.*

## Statements Made Untrue

*None identified (searched: `germinal`, `isGerminal`, `05111000`, `05119985`, `Bos taurus`, `01061900` across `README.md`, `src/**`, `docs/`).*

Optional, not a Must: `src/lib/form-fill.test.js:123` feeds `'05111000|Bos taurus'` to `speciesUnderCode` as a row to drop. Per the new README, germinal rows no longer reach the page, so the input no longer mirrors what the search shows; it remains a valid other-code case for the filter and the test title ("keeps only the species under the code") makes no germinal claim.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The README now describes the Bos taurus search exactly as the recaptured stub answers it.
