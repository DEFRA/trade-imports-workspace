## What changed

The whole-number validation error for the animal count on **Consignment details** is reworded to match Design release 1.

| | Message |
|---|---|
| Before | `Number of animals must be a whole number, like 25` |
| After | `Enter a whole number greater than 0` |

The rule has two failure modes — a value that is not digits, and a value below one — and the validator passes one string for both. The old wording only spoke to the first, so a user who typed `0` was told to enter a whole number, which `0` already is. The new wording names both conditions and starts with the verb, which is how Design release 1 states it.

### Files

- `src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.en.js` — `animalsWholeNumber` reworded.
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.cy.js` — matching Welsh copy, `Rhowch rif cyfan sy'n fwy na 0`.
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/consignment-details/consignment-details.controller.test.js` — assertion on the rendered error text follows the new copy.
- `src/server/app/lib/validate/validate.test.js` — same.

The **packages** whole-number message is deliberately left untouched: Design release 1 does not restate it, so changing it would be out of scope for this increment.

## Scope

Frontend only. The tests repo was branched for this increment but needed no change, so it has no PR — the E2E suite does not assert on this string.

## Provenance

- Increment: `inc-096` (corpus `dr1c`, slice `commodities`)
- Ticket: [EUDPA-395](https://eaflood.atlassian.net/browse/EUDPA-395)
- Related: `inc-088` (same field, same validator — the missing presence message)
