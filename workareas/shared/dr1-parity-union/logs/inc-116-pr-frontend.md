## What changed

The private transporter's contact field asked for a "Telephone number" with no guidance. Design release 1 asks for a "Phone number" and tells the user to include the country code for international numbers — the wording the commercial transporter form already uses.

- `copy.en.js` — field label and the required/max-length error messages now say "phone number"; new `telephoneHint` string, "For international numbers include the country code".
- `private-transporter-details.njk` — pass the hint through to `govukInput`.
- `copy.cy.js`, `copy.test.js`, `transporters.fit.spec.js` — cover the renamed label, the reworded errors and the new hint.

## Increment and ticket

- Increment: `inc-116`
- Ticket: EUDPA-567

## Sibling repo and merge order

This increment also changes `DEFRA/trade-imports-animals-tests` (the E2E label lookups follow the rename). Merge order is **tests first, then this frontend PR**: CDP runs the tests repo's suite against the deployed frontend, so merging the frontend ahead of its own test fixes would exercise it with stale specs looking for "Telephone number" and turn CDP red. Both PRs must be green — and approved — before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
