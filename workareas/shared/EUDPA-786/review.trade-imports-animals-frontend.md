# Repository Review: trade-imports-animals-frontend

**PR:** #475
**Commit reviewed:** f3fa00869e616e4133770915f3221a0305773a7b
**Files Changed:** 4

## Summary
Rebuilds `services/_capture/fixtures/commodities.json` from the recaptured stub's `010` search and updates the unit and fit tests whose expected species lists and counts changed with it (`0102` from 15 to 7 species, goat gone, Catreus gone, a second "Dog" row). The Catreus fit test is deleted because no species in the new data lacks a common name.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/server/app/services/_capture/fixtures/commodities.json` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/commodities/fit/search.fit.spec.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/commodities/search/search.controller.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/services/commodities/stub.test.js` | NEEDS ATTENTION | 0 | 1 | 0 |

## Positive Observations
- The fixture equals the stub's saved `010` search exactly: 25 codes and 160 species, the same codes, Latin names, common names and order, compared with `jq` (AC 3).
- Every changed test still asserts exact values (`toEqual`, `toHaveText`), so none was weakened to pass. Test titles were updated with the counts ("among 7 species").
- The `0106` hundred-species cap test is unchanged and still meaningful: the fixture holds 129 species under `0106`, 107 in its first four codes.
- `GOAT_CODE` is kept, as the ticket scopes.

## Test Coverage
- Unit tests: updated in step with the fixture. CI green.
- Integration tests: FIT (3 shards) and E2E green on the PR.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** Test data and test expectations only; no production code changes.

Signed-off check: `search.controller.test.js` is linked to two signed-off scenarios (commodity-details "After Save and continue, adding another commodity returns to commodity details"; journey-flow "What are you importing goes on to Main import reason"). The PR's only hunk in that file is the `0102` species-list test, neither of those two, so no signed-off scenario is touched.

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | src/server/app/sets/live-animals/services/commodities/stub.test.js | 72 | Major | test-readability | Title 'Should list every species of a code found by its code, a page at a time' claims every species is listed, but lines 73-79 assert only counts (total 7, page lengths 5 and 2) copied by hand from fixtures/commodities.json's 0102 group. A search returning the wrong 7 species still passes, and every MDM recapture forces another hand re-count, which is why this PR had to edit the numbers. | the test proves that the two pages together hold exactly the 0102 group's species, in data order, with the expectation taken from the fixture rather than a hand-copied count. | read the 0102 group from COMMODITY_GROUPS (exported by stub.js), assert firstPage.total equals its species length, and assert [...firstPage.groups[0].species, ...secondPage.groups[0].species] toEqual that group's species. | Fix | Done | frontend e8381c4f |
| 2 | src/server/app/sets/live-animals/docs/services.md | 66 | Major | comments | services.md:66-69 says the captured MDM data the stub serves reaches the permanent-address gate with Felis catus and Mustela putorius furo only and holds no Canis familiaris spelling. This PR's own fixture (commodities.json, 01061900) now holds Canis familiaris (Domestic Dog), so all three spellings reach the gate. The open question at :59-60 about the dog's spelling is answered by the same recapture. | the doc states that the stub's captured data reaches the gate with all three spellings, and no longer asks whether the dog entry still needs correcting. | replace the sentence with 'the captured MDM data the stub serves holds all three spellings under 01061900', and drop the open-question clause at :59-60. | Fix | Done | frontend e8381c4f |

## Repository Verdict
**Status:** NEEDS ATTENTION
