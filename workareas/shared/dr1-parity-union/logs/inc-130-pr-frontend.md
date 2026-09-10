## What this changes

The transporter authorisation guidance block on the transport section now matches Design release 1.

- `linkHref` points at the anchored economic-activity section of the animal-welfare-in-transport guidance instead of the top of the general transporting-animals-in-great-britain page, so the trader lands on the rules themselves. Design release 1's Google Analytics linker parameters are deliberately left off.
- `linkText` ends `(opens in a new tab)` rather than `(opens in new tab)`.
- `euNotValid` lower-cases "member state".

The Welsh copy carries the same href and the same sentence-case change. The copy tests assert all three strings.

## Files

- `src/server/app/journeys/linear/features/transport/copy/copy.en.js`
- `src/server/app/journeys/linear/features/transport/copy/copy.cy.js`
- `src/server/app/journeys/linear/features/transport/copy/copy.test.js`

## Scope

- Increment: `inc-130`
- Ticket: EUDPA-556
- Single repo: no sibling backend or tests changes — the tests repo was branched for this increment but needed no edits.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
