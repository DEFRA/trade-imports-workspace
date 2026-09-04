## What this changes

The animal identification page went straight from its inset text into the identifier
forms. What the consignment actually held was readable only by scrolling the cards
themselves — the commodity code sat in each card heading and the count in each card's
"1 of 2" counter — so both facts were on the page but scattered through it, the common
name appeared nowhere, and nothing led back to the commodity list. The single
"Add a commodity" link lived in the branch that renders when the notification has no
commodities at all, so it vanished at the moment the page became usable.

A **Selected commodities** summary now opens the page, matching Design release 1:

- a `govukTable` captioned "Selected commodities" with a header row of Commodity code,
  Common name and Number of animals;
- one row per commodity line, pairing one-for-one with the identification cards below
  it, so a trader can see at a glance that two Bos taurus records are owed;
- a **Change** link per row back to the commodity question, with a visually hidden
  species name so each link reads distinctly;
- an **Add another commodity** link beneath the table, now rendered whether or not
  there is anything to identify.

## How

- Adds `summary/selected-commodities.js` — `buildSelectedCommodities` maps each line to
  its code, the species' common name and the declared count.
- Adds the `_selected-commodities-summary.njk` macro the page renders.
- The count is read as text so it survives both the saved number and the entered string
  on a re-render; an uncounted line shows blank rather than `undefined`.
- Copy gains a `summary.*` group (caption, column headings, Change) plus
  `addAnotherCommodity`, in English and Welsh. The Welsh file now holds its repeated
  visually-hidden "Camau gweithredu" action heading as one `ACTIONS_HIDDEN` constant, so
  the two existing tables and this one read from a single string rather than three copies.

No new data: the controller already had the lines the cards are built from.

## Deliberate difference from the consignment-details table

That table shows the same code and common name without a count and offers **Remove**.
Here the action is **Change**, and its destination is the commodity question rather than
Design release 1's search reset, because Frontend's commodity picker is a fixed checkbox
list rather than a search.

## Tests

- `selected-commodities.test.js` — unit cover for the mapping, including the
  saved-number / entered-string and uncounted-line cases.
- `animal-identification.controller.test.js` — extended for the new view model.
- `copy.test.js` / `copy.cy.js` — the new copy keys in both languages.
- `identification.fit.spec.js` — fit spec for the rendered summary.

## Increment

- Increment: `inc-105`
- Ticket: EUDPA-397
- Repos touched: frontend only. The tests repo was branched for this increment but
  needed no changes, so no PR was raised there. There is no sibling PR and therefore no
  cross-repo merge ordering to observe.
