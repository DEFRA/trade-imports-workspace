## What this changes

Check your answers put a **Change** link on every summary row, so a finished notification offered twenty-four of them. Design release 1 puts **one Change link in each card's heading** and none on the rows. This moves the link from the row to the card.

- `summary-row.js` and `party-row.js` no longer attach a change action, so rows render as a key and a value only.
- Each card builder — import details, additional animal details, arrival details, transport details, documents, roles and addresses, contact address, species — now carries a card-level action. The Species card collapses from two heading links to one.
- `change-link.js` builds the card-level action, with the visually hidden text naming the card rather than the row.
- Arrival details keeps a second, conditional link to transit countries: `incomplete-cards.js` also marks that card for a missing transit-countries answer, and a single port-of-entry link left the trader looping back to the same unresolvable error.
- Copy, unit tests, fit specs and the add-a-field / add-a-page / add-a-section recipe docs follow the row-to-card move.

## Open question (deferred)

Three cards group more than one page's answers, so one card link cannot reach every answer it shows — the CPH number, and the exit answers on additional animal details. That is recorded as an open question on the increment and deferred: resolving it is a design decision about whether the review adopts Design release 1's one-card-per-page shape.

## Cross-repo

This is a `both` increment. The sibling PR is on **DEFRA/trade-imports-animals-tests**, which moves the E2E selectors from the row-level Change action to the card heading link.

**Merge order: tests first, then frontend.** CDP runs the tests repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs that still reach for a row-level Change link, and CDP would go red. Both PRs must be green (and approved, where the gate is on) before either merges.

Increment: `inc-146`
Ticket: EUDPA-581

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
