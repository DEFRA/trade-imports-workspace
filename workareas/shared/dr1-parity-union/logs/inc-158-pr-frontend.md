## What changed

The live-animals check-answers (review) page ended with a **"Now submit your notification"** heading and a sentence explaining what the button does. Design release 1 ends with the final summary card followed directly by the Continue button and nothing else.

This change removes that trailing block:

- Deleted the submit heading and body copy entries from the check-answers copy in both English (`copy.en.js`) and Welsh (`copy.cy.js`).
- Removed the three template lines in `template.njk` that rendered them unconditionally.
- Updated `check-answers.fit.spec.js` to assert the removed strings are absent and that the Continue button now follows the final card.

## Scope

Frontend only. `trade-imports-animals-tests` was branched for this increment but needed no changes, so there is no sibling PR and no cross-repo merge ordering to observe here.

## Traceability

- Increment: `inc-158` (dr1-parity-union backlog)
- Ticket: EUDPA-594
