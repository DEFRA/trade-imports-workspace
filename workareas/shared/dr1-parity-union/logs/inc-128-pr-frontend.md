## What and why

Opening the arrival date calendar on the port-of-entry page dropped it on top of the next two questions. The Ministry of Justice date picker ships an absolutely positioned dialog, so the open calendar floated across "Port of entry" and "Means of transport to the port of entry" — the port hint was sliced in half by the calendar's edge and the port field sat behind it. A trader who opened the calendar to check a date had to close it again to read the questions they were about to answer.

Design release 1 opens the same calendar in the flow of the page, directly under the date field, pushing everything after it down so nothing is ever covered. Its own stylesheet says so on the rule that does it: "MOJ date picker — in-flow calendar (pushes content down, no overlay)".

## What changed

- **New `src/client/stylesheets/components/_date-picker.scss`**, wired into the component index. It pins `.app-date-picker .moj-datepicker__dialog` to `position: static` with a 360px maximum width and a top margin. Static positioning also makes the inline `top`/`right` offsets the component writes on every open inert, so no accompanying script is needed to clear them — the CSS alone holds the layout.
- **`dateField()` in `src/server/app/shared/kit.js`** takes an optional `formGroupClasses`, mapped onto the govuk `formGroup.classes`, because the picker's script inserts the dialog inside the form group.
- **The port-of-entry controller** passes `app-date-picker` for the arrival date field, scoping the rule to this picker rather than to every date picker in the service.
- **Cover**: unit tests in `kit.test.js` and `port-of-entry.controller.test.js`, plus the transport fit spec asserting the class reaches the rendered page.

## Increment

Increment `inc-128` of the Design release 1 parity backlog, ticket EUDPA-536.

Frontend-only — the tests repo was branched for this increment but needed no change, so there is no sibling PR and no merge ordering to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
