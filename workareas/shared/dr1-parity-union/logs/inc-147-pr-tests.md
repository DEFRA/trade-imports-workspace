## What this changes

Follows the frontend's restructure of Check your answers into design release 1's six numbered sections.

- `tests/e2e/features/hub-groups-and-cya-rows.spec.ts` asserts all six section headings, the new "Where is this consignment coming from?" and "Additional details" group headings in place of "Consignment details" and "Species", the reason for import read from its own card, and the transit countries read from theirs rather than from the Arrival details card.
- `tests/e2e/pages/notification-view-states.spec.ts` asserts the two added sections, consignment parties and contact address, alongside the four it already checked.

## Sibling PR and merge order

The page change itself is in `DEFRA/trade-imports-animals-frontend`, on the same branch name: https://github.com/DEFRA/trade-imports-animals-frontend/pull/324

Merge order: **this tests PR first, then the frontend PR.** CDP runs this repo's suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would go red. Both PRs must be green before either merges.

Increment: inc-147
Ticket: EUDPA-583

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
