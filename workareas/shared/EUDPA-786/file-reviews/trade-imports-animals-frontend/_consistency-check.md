# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-786
**All repos in scope:** trade-imports-animals-frontend, trade-imports-performance-tests, trade-imports-stub, trade-imports-workspace
**PR:** #475 | **Commit:** f3fa008

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Fixture matches the stub's saved `010` search (codes, Latin names, common names, order) | stub `mdmProductSearchResponses.json` `"010"` ✅ | ✅ `src/server/app/services/_capture/fixtures/commodities.json` — `jq` equality over all 25 species-bearing codes is `true` (160 species) | CONSISTENT |
| `0102` = 7 species | stub ✅ (`010` and `/commodities/0102/species` both 7) | ✅ `stub.test.js` total 7; `search.controller.test.js` and `search.fit.spec.js` 7-label list | CONSISTENT |
| Fit test retitled "shows Bison bison among 7 species…" | workspace `commodity-selection/coverage.json:67` ✅ same title | ✅ `search.fit.spec.js:404` | CONSISTENT |
| Catreus fit test removed | workspace coverage drops its link from SCN-COMMODITY-SELECT-003-E ✅ (unit link stays, `full`) | ✅ removed | CONSISTENT |
| `cattle` → 2 species under 0102 | stub `cattle` ✅ | ✅ `finds cattle by their common name` count 2 | CONSISTENT |
| `dog` → two "Dog" rows under 01061900 | stub `dog` ✅ (Canis familiaris + Nyctereutes procyonoides) | ✅ fixture adds `Canis familiaris`; emphasis fit test `['Dog','Dog']` | CONSISTENT |
| Goat `010420` species removed, `GOAT_CODE` kept | stub `010420` has 0 species ✅; ticket keeps `GOAT_CODE` out of scope ✅ | ✅ fixture drops `Capra`/`Capra hircus`; `rules.js:5` keeps `GOAT_CODE` | CONSISTENT (as scoped) |

## Missing Changes

*None identified* in code or tests. ins-tests (not in scope) reads groups from reference-data; its `commodityLines` pairs all still exist in the recaptured stub.

## Unique Changes

- The fixture gains `Canis familiaris (Domestic Dog)` under `01061900` (diff line 573). This is correct — the stub's `010` and `dog` captures now hold that spelling — but it changes a fact the repo's own docs state (see Statements Made Untrue). It also means `PERMANENT_ADDRESS_SPECIES`' `Canis familiaris` entry is now reachable through the stub for the first time, so the permanent-address gate for dogs is now exercisable end to end.

## Naming and Reuse

*None identified.* No new constants, helpers or names; the changed tests reuse the existing `CATTLE_CODE`, `OTHER_LIVE_MAMMALS_CODE`, `*_ROW` and `labelFor` helpers.

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `src/server/app/sets/live-animals/docs/services.md:66-69` | "the captured MDM data the stub serves reaches the gate with `Felis catus` and `Mustela putorius furo` only — it holds no `Canis familiaris` spelling." | The recaptured stub (and this PR's fixture, line 623) holds `Canis familiaris` (Domestic Dog) under `01061900`, so all three listed species reach the gate. | The doc states that the stub's captured data reaches the gate with all three spellings. | Replace the sentence with "the captured MDM data the stub serves holds all three spellings under `01061900`", and drop or answer the "Whether the domestic dog's entry … still needs that correction is an open question" clause at `:59-60`, since MDM's spelling now matches the rule. |

Searched outside the diff: `Catreus`, `Bibos`, `Novibos`, `Ovibos`, `Poephagus`, `Elephas`, `Loxodonta`, `Bison bonasus`, `Bos (Cattle)`, `15 species`, `toHaveCount(15)`, `Capra`, `010420`, `GOAT_CODE`, `Canis familiaris`, `05111000`, `05119985`, `isGerminal`, `germinal`, `two hundred` across `src/**` (JS, docs, test titles), `AGENTS.md`, `README.md`. The `010420`/`GOAT_CODE` hits (`rules.js`, `services.md:45`, allow-list and mutator tests) describe the unweaned/packages rules from the data-fields spec, not MDM data, and stay true. `services.md:97-118` (the fixture is derived by hand from the stub's `010` search) is still true.

Optional, not a Must: `services.md:82` "MDM has no common name for some species, so a line's common name is optional." The design reason still holds for MDM in general, but no species in the recaptured stub or this PR's fixture has a null or empty common name any more (the Catreus fit test was removed for that reason). If kept, say the stub's capture currently has none, so the no-common-name path is exercised only by `species-label.test.js`.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 1 inconsistency found
**Summary:** Fixture and tests match the recaptured stub exactly, but `live-animals/docs/services.md` still says the stub holds no `Canis familiaris`, which this PR's own fixture now contradicts.
