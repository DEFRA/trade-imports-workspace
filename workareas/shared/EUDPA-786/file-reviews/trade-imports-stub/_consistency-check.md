# Consistency Check: trade-imports-stub

**Ticket:** EUDPA-786
**All repos in scope:** trade-imports-animals-frontend, trade-imports-performance-tests, trade-imports-stub, trade-imports-workspace
**PR:** #34 | **Commit:** d0f331d

## Cross-Repo Pattern Analysis

The stub is the source the other three PRs follow. Each downstream claim was checked against the recaptured JSON in this commit.

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `010` search, grouped by code (codes, Latin names, common names, order) | animals-frontend `_capture/fixtures/commodities.json` ✅ — `jq` comparison of the 25 species-bearing commodities is exactly equal (160 species) | ✅ `mdmProductSearchResponses.json` `"010"`, 45 commodity rows | CONSISTENT |
| `0102` holds 7 species | animals-frontend tests (`toHaveCount(7)`, `total` 7, 7-label order list) ✅; workspace coverage title "among 7 species" ✅ | ✅ `010` → `0102` has 7 `scientificNames`; `mdmProductSpeciesResponses.json` `0102` total 7 (`ProductControllerTest:81`) | CONSISTENT |
| Goat `010420` has no species | animals-frontend fixture drops `Capra`/`Capra hircus` ✅ | ✅ `010420` present with 0 species | CONSISTENT |
| `Catreus` gone | animals-frontend drops the Catreus fit test; workspace coverage drops its link ✅ | ✅ no `Catreus` in any response file | CONSISTENT |
| `cattle` search → Bos taurus, Bos sp. under 0102 | animals-frontend `finds cattle by their common name` now 2 ✅ | ✅ `cattle`: `0102 Bos taurus`, `0102 Bos sp.`, `05111000`, `05119985` (total 4) | CONSISTENT |
| `dog` search → two "Dog" rows under 01061900 | animals-frontend emphasis test `toHaveText(['Dog','Dog'])`; fixture adds `Canis familiaris` ✅ | ✅ `dog`: `01061900 Canis familiaris (Domestic Dog)`, `01061900 Nyctereutes procyonoides (Raccoon Dog)` | CONSISTENT |
| Bos taurus under germinal `05111000` and `05119985`, both `isGerminal: true` | performance-tests README ✅ | ✅ `Bos taurus` search lists 0102, 05111000, 05119985; `mdmProductCommoditiesResponses.json` flags both `true` | CONSISTENT |
| Chicken `01051111` species | ins-tests `commodityLines.chicken` (not in scope, main) ✅ | ✅ `mdmProductSpeciesResponses.json` `01051111` → Gallus gallus (Chicken) | CONSISTENT |
| ins-tests `commodityLines` (Bos taurus, Bison bison, Felis catus, Nyctereutes, Struthio spp., Equus cabalus) | ins-tests main (not in scope) ✅ — every pair is still in the matching saved search | ✅ | CONSISTENT |

## Missing Changes

*None identified in this repo.* `ProductControllerTest` is not in the diff, but every expectation in it (`cat` 8, `BOS TAURUS` 3, `cattle` 4, `0102` species 7, `0101` 3, chicken 1, `05111000` "Bovine semen") matches the recaptured files, so it needs no change.

Expected absence: `trade-imports-reference-data`'s own test fixtures (e.g. `CommoditiesControllerIT.searchCommodities_listsAndCountsTheSpeciesOfACommodityFoundByCode`, which counts 15 species under 0102) are separate WireMock data, not read from this stub; the ticket rules reference-data out of scope.

## Unique Changes

- `speciesId` added to every species row, `taxonomy.order` filled in, and `isGerminal` flipped `false` → `true` for `05111000` and `05119985` in `mdmProductCommoditiesResponses.json` — all in scope (the recapture).
- Observation for the MDM data report, not a stub defect: `04071919` (hatching eggs, returned by the `ostrich` search) still carries `isGerminal: false` in the recapture. Worth adding to the questions for MDM alongside Pholidota and goat if hatching eggs are meant to be germinal.

## Naming and Reuse

*None identified.* No code changed; only the three saved response files.

## Statements Made Untrue

Statements about this repo's data that live in other repos are recorded against those repos (see `trade-imports-workspace` — `docs/repos/trade-imports-stub.md:28` — and `trade-imports-animals-frontend`).

Inside this repo: `README.md:90-91` ("responses saved from MDM in TST", "The saved file holds TST's answers as returned") is still true. The `ProductControllerTest` chicken Javadoc is still true.

*None identified in this repo (searched: `isGerminal`, `germinal`, `TST`, `05111000`, `05119985`, `010420`, `Catreus`, `order": null`, `speciesId`, `productTypes` across `README.md`, `src/`).*

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Every downstream fixture, test count and README claim in the other three PRs matches this recapture exactly; the stale statements about the stub live in other repos and are recorded there.
