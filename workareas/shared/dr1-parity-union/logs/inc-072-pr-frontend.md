## EUDPA-485 — require a purpose in the internal market before the user can carry on

Increment `inc-072` of the DR1 parity backlog.

### The problem

A user who chose **Internal market** could leave the revealed purpose blank, press **Save and continue** and be taken on with nothing said. The field validated with `oneOf`, which explicitly allows an empty string (`src/server/app/lib/validate/validators.js:118`), and the copy file carried no message for a blank answer.

The notification was never submittable in that state — `purposeInInternalMarket` is mandatory once in scope, and the review section is gated on every task row being fulfilled, not applicable or optional — so this is not a data-integrity hole. It is a user who is let past the question, told nothing, meets a hub row they cannot clear, and finds out only when check answers will not open.

Design release 1 stops them at the question with **"Select a purpose in the internal market"** (`app/routes.js:1387-1394`).

### The change

- Swap `oneOf` for `requiredOneOf` on `purposeInInternalMarket` in the import-reason controller, so a blank answer returns the page rather than advancing.
- Add the error message "Select a purpose in the internal market" to the English copy file, and its Welsh counterpart.
- Extend the controller unit tests and the feature integration test to cover the blank submit — error summary plus an error against the field.

The main reason radio is deliberately left optional. Design release 1 states in its own words that "a main reason is optional to proceed, but once selected any further information required for that reason must be completed" (`app/routes.js:1381-1385`), and the frontend already matches that.

### Scope

Frontend only. The tests repo was branched for this increment but needed no change, so it has no PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
