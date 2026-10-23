# Repository Review: trade-imports-ins-tests

**PR:** #45
**Commit reviewed:** 1cee8e85cee54a10b8c81d608c2a4c3f003447da
**Files Changed:** 30

## Summary
The animals specs now pick commodity lines through the MDM-backed search: `commodity-lines.ts` replaces the old commodity and species constants, the `commodity-selection-page` locators target the code group legend and the Latin-name tick boxes, and the seeded journey posts the search before it posts the species. A new `ReferenceDataApiClient` fixture lets specs ask reference-data what MDM holds.

<!-- FILE_SUMMARY -->

## Positive Observations
- The line values are copied exactly from the stub's saved MDM responses, including MDM's own spelling "Equus cabalus", so the specs drive real data paths.
- `speciesCheckboxValue` and `speciesCardTitle` produce the same formats as the frontend.
- The config adds reference-data the same way as the backend and address-book services, locally and on CDP.

## Test Coverage
- E2E: covers search by common name, code and Latin name (the ticket's AC), plus identifier, CPH and unweaned scope on the new codes.
- Weak spots: the outbox and aggregated specs absorbed a behaviour change from 'Cow' to '0102'. `commodities.spec.ts` hard-codes MDM's current rows, including data MDM is still cleaning up, so it will fail on CDP once MDM fixes them. The add-a-line steps are copied across the identifier specs.

## Risk Assessment
**Overall Risk:** High
**Rationale:** Two specs now pin the CN code as the commodity name sent to PIMS and shown on the INS dashboard, which the ticket did not ask for.

<!-- ITEMS -->

## Repository Verdict
**Status:** RISKY
