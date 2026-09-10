## What this changes

DR1 builds the transit-country list one country at a time through a type-ahead, showing what has been added so far with a **Remove** link against each row. The frontend rendered all thirty-one countries as checkboxes and asked the user to find theirs by eye.

This replaces the checkbox list on the transit-countries page with a type-ahead over the same country list, plus a table of the countries added so far:

- `transit-countries.njk` renders the accessible-autocomplete country field and the added-countries table partial instead of the thirty-one checkboxes.
- `transit-countries.controller.js` handles adding one country at a time, removing a row, and hides the country field once the twelve-country cap is reached. `rows.js` and `remove-action.js` carry the row building and the remove action.
- `status-announcer.js` adds a client-side live region so each addition, each removal and the cap message are announced to assistive technology; it is wired up in `application.js`.
- Copy, controller tests and the arrival-transit fit spec are updated for the new control.

## Scope

Increment **inc-118** of the DR1 parity backlog. Ticket **EUDPA-545**.

Frontend only — the tests repo was branched for this increment but needed no changes, so there is no sibling PR and no cross-repo merge ordering to observe here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
