## What changed

DR1's **Number of animals** input carries a label and nothing else. The frontend
rendered an extra example hint under every species line on the commodity
consignment details page — *"For example, 1, 25 or 5000."* — which DR1 does not
have.

- Removed the `animalsHint` copy from the commodities copy files, English and Welsh.
- Dropped the `hint` argument from the animals input in `_species-quantities.njk`.
- The packages hint is untouched — it matches DR1 word for word.

## Tests

The commodities fit spec now asserts the animals input has its label as its
accessible name and **no** accessible description, so the hint cannot come back
unnoticed.

## Files

- `src/server/app/journeys/linear/features/commodities/consignment-details/_species-quantities.njk`
- `src/server/app/journeys/linear/features/commodities/copy/copy.en.js`
- `src/server/app/journeys/linear/features/commodities/copy/copy.cy.js`
- `src/server/app/journeys/linear/features/commodities/fit/consignment-details.fit.spec.js`

---

Increment `inc-092` — ticket **EUDPA-610**. Frontend-only: the tests repo was
branched for this increment but needed no change, so there is no sibling PR.
