## EUDPA-480 — the frontend rejects an internal reference containing a space, hyphen or slash

Increment `inc-083` of the DR1 parity backlog. Frontend only — no sibling repo in this increment.

### The problem

The origin page invites the user to give "any internal reference you want to use to identify this consignment", then ran a `/^\w*$/` pattern over what they typed. A reference their own records write as `ACME-2026/01`, or one with a space in it, came back with **"Internal reference must only contain letters, numbers and underscores"**. Design release 1 imposes no character rule on the field at all: it trims the value and stores it.

### What changed

- Dropped the pattern rule and its error message from the origin controller, so hyphens, slashes, spaces and full stops now pass validation.
- Kept the 58-character ceiling, and moved the limit into the hint so the user meets it before submitting rather than only after.
- Updated the copy files (`copy.en.js`, `copy.cy.js`) and their test, the controller unit tests, and the origin `.fit.spec.js`.

### Note on the 58-character limit

The 58 is asserted only in this feature — no downstream storage constraint has been found to back it. Whether that ceiling survives is a separate question from the character rule this increment removes, so it is left in place here.

### Files

- `src/server/app/journeys/linear/features/origin/controller.js`
- `src/server/app/journeys/linear/features/origin/controller.test.js`
- `src/server/app/journeys/linear/features/origin/copy/copy.en.js`
- `src/server/app/journeys/linear/features/origin/copy/copy.cy.js`
- `src/server/app/journeys/linear/features/origin/copy/copy.test.js`
- `src/server/app/journeys/linear/features/origin/origin.fit.spec.js`

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
