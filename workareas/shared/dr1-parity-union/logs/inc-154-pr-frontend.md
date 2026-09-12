## What this changes

The live-animals confirmation page offered only **Return to your dashboard**. Design release 1 also offers **Create a new notification**, so a trader with a second consignment to notify can start one without going back to the dashboard to find the start button.

This adds that second action below "Return to your dashboard" in the *How to view or amend this notification* block.

## How

- Starting a notification is a POST that creates a record, so the new action is a **form styled as a link** rather than an anchor — the same route and the same idiom the dashboard's start action already uses.
- The controller supplies the action href.
- The copy entry is added in **both English and Welsh**.

## Files

- `src/server/app/journeys/linear/features/confirmation/controller.js`
- `src/server/app/journeys/linear/features/confirmation/template.njk`
- `src/server/app/journeys/linear/features/confirmation/copy/copy.en.js`
- `src/server/app/journeys/linear/features/confirmation/copy/copy.cy.js`

## Tests

Covered by the feature's controller, template and fit specs:

- `controller.test.js`
- `template.test.js`
- `confirmation.fit.spec.js`

## Provenance

- Increment: `inc-154` (dr1 parity union backlog)
- Ticket: EUDPA-590

Single-repo increment — the tests repo was branched but needed no changes, so there is no sibling PR and no cross-repo merge ordering to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
