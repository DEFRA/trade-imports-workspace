## What this changes

The button that opens the arrival date calendar on the port of entry page rendered as a pale grey square with a dark icon, sitting flush against the black-bordered input — so it read as part of the input rather than as something to press. Design release 1 draws it as a blue GOV.UK button with a white icon.

The Ministry of Justice date picker ships its toggle unstyled, so the styling has to come from us. This adds a rule in `src/client/stylesheets/components/_date-picker.scss` that paints the toggle as a GOV.UK button:

- blue background, white icon colour (the icon paints with `currentColor`)
- no border, plus the darker blue inset bottom edge a GOV.UK button carries
- hover darkens the blue rather than falling back to the component's grey
- the focus state is restated, because our rules outrank the component's own at the same specificity and would otherwise lose the yellow focus indicator

Nothing else about the control changes — it keeps its visually hidden "Choose date" label and the same icon shape.

## Tests

Two new fit specs on `arrival-transit.fit.spec.js` read the computed styles of the toggle in its default, hover and focus states.

## Increment

Increment `inc-129` of the DR1 parity run, ticket EUDPA-543. Frontend only — the tests repo was branched for this increment but needed no changes, so there is no sibling PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
