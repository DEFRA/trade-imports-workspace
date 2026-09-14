## What changed

The **Contact address for this consignment** card on the check answers page keyed its single row with the shared generic `address` label — the same string the **Transport details** card uses for the transporter's address. On a page that already lists several addresses, the row did not say which address it was. Design release 1 keys the same card's row **Contact address**.

- Adds a `contactAddress` row label to the English and Welsh check-answers copy files.
- Points the contact address card at that new label.
- Leaves the shared `address` string untouched — the Transport details card still uses it and already matches DR1 there.
- Extends the check-answers unit test to assert the contact address row label.

## Files

- `src/server/app/journeys/linear/features/check-answers/copy/copy.en.js`
- `src/server/app/journeys/linear/features/check-answers/copy/copy.cy.js`
- `src/server/app/journeys/linear/features/check-answers/view-model/cards/addresses/contact-address.js`
- `src/server/app/journeys/linear/features/check-answers/check-answers.test.js`

## Scope

- Increment: `inc-061`
- Ticket: EUDPA-591
- Repos: frontend only. The tests repo was branched for this increment but needed no change, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
