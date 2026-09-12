## What this changes

Follows the frontend's row-to-card move of the Check your answers **Change** link. The E2E specs no longer reach for a row-level Change action; they click the one Change link in the relevant card's heading.

- `change-from-cya.spec.ts` drives the change journey through the card-level link.
- `addresses-live-link`, `addresses-submit-freeze`, `amend-resubmit`, `cancel-amend-ui` and `notification-view-states` follow the same selector move.

## Cross-repo

This is a `both` increment. The sibling PR is on **DEFRA/trade-imports-animals-frontend** (#322), which moves the Change link out of each summary row and into the card heading.

**Merge order: this PR first, then the frontend.** CDP runs this suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs that still reach for a row-level Change link, and CDP would go red. Both PRs must be green (and approved, where the gate is on) before either merges.

Increment: `inc-146`
Ticket: EUDPA-581

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
