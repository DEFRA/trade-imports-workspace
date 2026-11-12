# Repository Review: trade-imports-stub

**PR:** #34
**Commit reviewed:** d0f331d36bef102f4fbbc263495b389fffe096e1
**Files Changed:** 3

## Summary
Recaptures the three saved MDM product responses (search, commodities, species) from TST after the GBNAG release. The diff only adds or fills fields (`speciesId`, `taxonomy.order`, `productTypes`, `productTypeId`), flags `05111000` and `05119985` `isGerminal: true`, and empties goat (`010420`), as the ticket describes.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/resources/responses/mdmProductCommoditiesResponses.json` | SAFE | 0 | 0 | 0 |
| `src/main/resources/responses/mdmProductSearchResponses.json` | SAFE | 0 | 0 | 0 |
| `src/main/resources/responses/mdmProductSpeciesResponses.json` | SAFE | 0 | 0 | 0 |

## Positive Observations
- Internally consistent across all three files, checked with `jq` over every row, not a sample: `speciesCount` equals the length of `scientificNames` on every commodity, every species `id` is `<commodityCnCode>-<speciesId>`, and `totalElements` equals the page length on all 21 search terms.
- Chicken (`01051111`) holds Gallus gallus with `totalElements` 1, so the `ProductControllerTest` chicken case has its data (AC 2). Every other number `ProductControllerTest` asserts still holds.
- MDM's data problems (Pholidota under the plant order Asparagales, goat with no species) are kept as MDM sent them, which is right for a capture.

## Test Coverage
- Unit tests: `ProductControllerTest` is unchanged and passes against the new data (CI green).
- Integration tests: E2E Tests check green on the PR.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** A data recapture that only adds fields the stub's controller passes through without reading.

Further data point for the MDM report, not a stub defect: `04071919` (hatching eggs) is still `isGerminal: false`.

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|

## Repository Verdict
**Status:** SAFE
