# Repository Review: trade-imports-animals-frontend

**PR:** #422
**Commit reviewed:** 89ae5d4b5c27fa5031f68413f262a5826e455367
**Files Changed:** 154

## Summary
This PR replaces the hard-coded commodity catalogue with search through reference-data (`services/commodities/client.js`, `search.js`, `species-check.js`) and keys every commodity rule by CN code, or by Latin name for the permanent address. Answers are renamed from `commoditySelection`/`speciesSelection` to `commodityCode`/`speciesLatinName`/`commonName`, and the search page keeps the rows it showed in the session until Continue. Check your answers re-checks a draft's species against reference-data. Most of the 154 files are test and fixture updates that follow the rename.

<!-- FILE_SUMMARY -->

## Positive Observations
- The rename is complete: no `commoditySelection` or `speciesSelection` is left anywhere in `src`. Wherever a test's set-up changed, its expected value changed with it, so no behaviour change slipped in unannounced.
- The client contract matches reference-data's `CommoditiesController` exactly, and the frontend stub fixture matches `trade-imports-stub` for the codes both hold.
- Continue builds lines from the stored search rows with no second reference-data call, and the stored rows live in the server-side yar session. Both follow the ticket's 14 Oct decisions.
- Germinal codes are excluded using `isGerminal` only, and the species check runs on drafts only, as the ticket decided.

## Test Coverage
- Unit tests: broad. The controller, view-model, obligation and mapper tests were all updated. Gaps: no test proves a listed species under another code is kept out of the permanent-address gate. Several fixtures store `speciesLatinName` as an array the app never writes. Some titles claim more than their assertions prove (`store-ops`, `change-context`, `consignment-details.fit`).
- Integration tests: FIT specs cover search, details and identification. `identification.fit.spec.js` `addLines` pairs counts with the wrong lines, and `fit/live-animals-journey.js` ticks the first match for a Latin name whatever its code.

## Risk Assessment
**Overall Risk:** High
**Rationale:** The notification now sends the CN code as the commodity name to PIMS and the INS dashboard. The permanent-address and result-cap rules contradict the ticket's recorded decisions. And `GAME_SPECIES` ('Bos spp.') never matches MDM's 'Bos sp.', so no 0102 line can be typed Game.

<!-- ITEMS -->

## Repository Verdict
**Status:** RISKY
