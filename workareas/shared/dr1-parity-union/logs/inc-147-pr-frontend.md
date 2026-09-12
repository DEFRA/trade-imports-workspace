## What this changes

Check your answers grouped the notification into three numbered sections. Design release 1 uses six that mirror the task list, with a subsection heading standing above every card. This restructures the page into those six sections, in design release 1's order.

- `view-model/index.js` now builds six sections: about the consignment, description of the goods, transport and arrival, documents, consignment parties, contact address.
- `about-consignment.js` keeps the import details card under "Where is this consignment coming from?" and gains a "Main reason for import" card. The commodity and animal answers move out to a new `description-of-goods.js`, where the species cards sit under "Commodity details" and the consignment-wide answers under "Additional details".
- The reason for import is lifted out of Additional animal details into a card of its own (`cards/consignment/reason-for-import.js`).
- `movement.js` becomes `transport-and-arrival.js`. The countries a consignment travels through are lifted out of the Arrival details card into their own headed card (`cards/movement/transit-countries.js`), shown only when transited countries apply.
- `addresses.js` splits into `consignment-parties.js` and `contact-address.js`, so the contact address is a numbered section rather than a card among the parties. Its anchor is suffixed `-section` because the contact address card already owns `contact-address`, which the error summary links to.
- The documents section's single group takes the "Upload documents" heading in place of a null one.
- `copy.en.js` and `copy.cy.js` carry the six section headings, a group heading per card, and the titles, visually hidden change text and incomplete-task labels for the two new cards. `incomplete-cards.js` and `change-link.js` follow the cards to their new homes.

Unit tests and fit specs assert the new structure.

## Open question, deferred

Five subsection headings now repeat the card title immediately beneath them. Design release 1 shows both a subheading and a card title per group, so dropping either is a design call rather than a code one. Recorded on the increment and deferred.

## Sibling PR and merge order

This increment also changes the E2E suite in `DEFRA/trade-imports-animals-tests`, on the same branch name.

Merge order: **tests first, then this frontend PR.** CDP runs the tests repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would go red. Both PRs must be green before either merges.

Increment: inc-147
Ticket: EUDPA-583

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
