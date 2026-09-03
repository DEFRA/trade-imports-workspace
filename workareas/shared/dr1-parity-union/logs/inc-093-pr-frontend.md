## What this changes

On the commodity-details page the type below the page heading stepped down twice and then flattened: the commodity heading was `govuk-heading-m`, the species name below it `govuk-heading-s`, and the two quantity labels carried no size or weight at all, so they rendered at the same size and weight as the hints beneath them. With several commodities on the page the labels and hints formed an unbroken run of same-weight text.

Design release 1 sets the same block three sizes larger throughout — a 36px bold commodity heading, a 24px species name, and bold labels against light hints (`app/assets/sass/application.scss:1070-1112`, the `app-consignment-details-page` block).

One template carries all three levels, so all three move together:

- Commodity heading `<h2>`: `govuk-heading-m` → `govuk-heading-l`. This is the page-heading size, and the design uses it deliberately — the commodity blocks are the substance of the page and the `<h1>` above them only names it.
- Species name `<h3>`: `govuk-heading-s` → `govuk-heading-m`.
- Both quantity labels ("Number of animals", "Number of packages"): `govuk-label--s`, so each question outweighs its own hint rather than running together with it.

Nothing but `govuk-*` classes are used — no custom CSS, no new components.

## Tests

- A new fit test in `consignment-details.fit.spec.js` asserts the three-step type ladder directly. The size classes are the whole of the behaviour here, so they are asserted as such rather than through a proxy.
- `search.fit.spec.js` was selecting species headings by `h3.govuk-heading-s`. It now selects by heading role and level, so it is no longer coupled to the type size.

## Files

- `src/server/app/sets/live-animals/journeys/linear/features/commodities/consignment-details/_species-quantities.njk`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/fit/consignment-details.fit.spec.js`
- `src/server/app/sets/live-animals/journeys/linear/features/commodities/fit/search.fit.spec.js`

## Scope

Frontend only. The tests repo was branched for this increment but needed no change, so there is no sibling PR and no merge ordering to observe.

Increment: `inc-093` (dr1 parity union backlog)
Ticket: EUDPA-393
