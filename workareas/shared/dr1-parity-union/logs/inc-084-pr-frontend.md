## What this changes

Increment **inc-084** (ticket **EUDPA-391**) of the DR1 parity backlog.

The frontend headed the quantities page **"Consignment details"**. Design release 1 heads
the same page **"Commodity details"**. This renames the page to match the signed-off design.

- The English commodities copy file carries the page title once, and that single string
  feeds the `h1`, the browser tab title and the last breadcrumb together — so all three
  move with one edit.
- The Welsh copy gains the matching **"Manylion y nwyddau"**.
- A view-model comment is updated so it no longer names the old heading.
- The fit specs that assert the heading move with it: the commodities
  `consignment-details` fit spec, the hub fit spec, the journey smoke spec, and the
  shared live-animals journey helper.

No route, no field, no obligation and no journey ordering changes — this is a copy change
plus the assertions that pin it.

## Files

- `src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.en.js`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.cy.js`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/consignment-details/view-model/groups.js`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/fit/consignment-details.fit.spec.js`
- `src/server/app/sets/live-animals/journeys/linear/features/hub/hub.fit.spec.js`
- `fit/journey-smoke.fit.spec.js`
- `fit/live-animals-journey.js`

## Sibling PR and merge order

This increment spans two repos. The sibling PR is on
**DEFRA/trade-imports-animals-tests**, same branch name
(`feat/EUDPA-391-frontend-heads-the-quantities-page-consi`), following the rename in the
consignment-details page object and the a11y and e2e specs.

**Merge order: the tests repo first, then this frontend PR.** CDP runs the tests repo's
suite against the deployed frontend, so a frontend merged ahead of its own test fixes
would be exercised by specs still waiting on the old "Consignment details" heading, and
CDP would go red. Both PRs must be green — and approved — before either one merges.
