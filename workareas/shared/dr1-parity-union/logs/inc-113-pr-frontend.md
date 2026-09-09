## What this changes

The hint under **Arrival date at port of entry** stated the accepted window — "Enter a date between {earliest} and {latest}." Design release 1 uses that second sentence to show the user what a date should look like instead — "For example, 27/3/2026". This increment adopts the design release 1 wording.

- **`copy.en.js` / `copy.cy.js`** — `portOfEntry.arrivalDate.hint` now takes a single worked example rather than the two ends of the window. A comment records why the window may go unstated: the date picker's own `minDate`/`maxDate` bounds and the existing `errors.arrivalDateOutOfRange` message already police it for both the picked and the typed case, so nothing is lost by dropping the sentence.
- **`arrival-window.js`** — adds `exampleText`, the service's civil today in the same `d/M/yyyy` format. The example is generated from the clock rather than hard-coded: a fixed date reads as stale within the year, and today is inside the window by construction, so the example is always a date the user could actually enter.
- **`port-of-entry.controller.js`** — passes `exampleText` to the hint.

The window itself is unchanged — the same seven-days-back, six-months-forward bounds still drive the picker.

## Tests

- `copy.test.js` — asserts the worked-example wording, and a second test asserts the accepted window stays out of the hint.
- `arrival-window.test.js` — asserts `exampleText` is the civil day in the same format, and that it sits strictly inside the `min`/`max` the same call publishes (the example is only useful if the user can enter it).
- `arrival-transit.fit.spec.js` — the rendering assertion now expects the worked example as the field's accessible description, plus a new fit test that types the hint's own example into the field and proves the service accepts it and round-trips it.

## Increment

- Increment `inc-113` of the DR1 parity union backlog.
- Ticket **EUDPA-541**.
- Frontend-only: the tests repo was branched but has no commits for this increment, so no sibling PR and no merge ordering to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
