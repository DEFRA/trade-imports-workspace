## What this changes

Follows the frontend's means-of-transport control from a radio group to a select, so the E2E suite drives and asserts the control the port-of-entry page now renders.

- `page-objects/notification/arrival-details-page.ts` — `meansOfTransport` resolves by label rather than by radio-group role, and returns the select itself.
- `flows/journey.ts` — `fillArrivalDetails` picks the option by label instead of checking a radio.
- `tests/e2e/pages/arrival-details.spec.ts` — asserts the select loads on the "Select one" placeholder option, holding the "unanswered on load" expectation the radios used to carry by being unchecked.

## Increment and ticket

- Increment: `inc-114`
- Ticket: EUDPA-534

## Sibling repo and merge order

This is a cross-repo increment. The companion PR is on **DEFRA/trade-imports-animals-frontend** (#298), on the same branch name, swapping the `govukRadios` group for a `govukSelect`.

**Merge this PR first, then the frontend one.** CDP runs this suite against the deployed frontend, so a frontend merged ahead of its own test changes would be exercised by specs that still click a radio, and CDP would go red. Both PRs must be green before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
