## What changed

The animal permanent address block ended with a mandatory **Country** select offering thirty-two countries under the placeholder "Select a country". Design release 1 asks for eight fields and no country: the page has already said the address is somewhere the animal will permanently reside and can be checked by the Animal and Plant Health Agency (APHA), so there is nothing to choose.

This PR removes:

- the `country` field from the animal permanent address field list and the address field order;
- its two validation messages, "Select a country" and "Select a country from the list";
- the country value written into the animal's address record on append.

Nothing else in the journey read that value.

With no select left on the block, the address-field renderer no longer needs a `kind` discriminator, so the identification card template renders every field through `govukInput` and drops the `govukSelect` import.

The block now asks for exactly the eight fields Design release 1 asks for: name or organisation name, address line 1, address line 2 (optional), town or city, county (optional), postcode or zip code, email address, phone number.

## Files

- `src/server/app/sets/live-animals/journeys/linear/features/commodities/animal-identification/address/fields.js`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/animal-identification/_identification-card.njk`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/animal-identification/records/append.js`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.en.js`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.cy.js`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/fit/identification.fit.spec.js`
- `src/server/app/contract.test.js`

## Increment

`inc-066` from the `shared/dr1-parity-union` backlog — ticket **EUDPA-400**.

Frontend only. The tests repo was branched for this increment but needed no change, so there is no sibling PR and no cross-repo merge ordering to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01YNp6QZFGArtcNsfecKgWLo
