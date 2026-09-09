## What this changes

The port-of-entry page showed the four means of transport as a `govukRadios` group, every option visible at once. Design release 1 puts the same four options inside a dropdown whose first, selected entry reads "Select one". This swaps the control to a `govukSelect` to match.

The option set, their wording, their order and the question above them are unchanged — only the control changes.

- `port-of-entry.njk` — `govukRadios` becomes `govukSelect`, with the items fed from the view model rather than hard-coded in the template.
- `port-of-entry.controller.js` — adds `meansItems()`, building the "Select one" placeholder plus the four transport codes from `transportReference`, and marking the saved value selected.
- `copy.en.js` / `copy.cy.js` — `means.legend` becomes `means.label` (a select has a label, not a legend) and gains `means.placeholder` ("Select one").
- Controller, copy and FIT specs updated to drive and assert a select.

## Increment and ticket

- Increment: `inc-114`
- Ticket: EUDPA-534

## Sibling repo and merge order

This is a cross-repo increment. The companion PR is on **DEFRA/trade-imports-animals-tests**, on the same branch name, updating the E2E page object and flow to drive a select rather than a radio group.

**Merge the tests PR first, then this one.** CDP runs the tests repo's suite against the deployed frontend, so a frontend merged ahead of its own test changes would be exercised by specs that still click a radio, and CDP would go red. Both PRs must be green before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
