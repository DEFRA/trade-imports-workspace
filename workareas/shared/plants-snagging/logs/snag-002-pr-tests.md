## What

The plants frontend now renders the pre-arrival destination h1 as **Place of destination** (the hub task row's name) instead of **Intended destination**, and the check-answers destination card takes the same string.

- `destination.spec.ts` and `arrival.spec.ts` assert the renamed heading (`PRE_ARRIVAL_DESTINATION_HEADING`).
- `journey.spec.ts` and `review.spec.ts` look up the renamed card.
- The place-of-destination page object's docblock says which question the page asks.

## Sibling PR

DEFRA/trade-imports-plants-frontend `fix/NO_JIRA-plants-place-of-destination-heading` carries the copy change. Merge together.

## Verification

Full `npm run test:docker-compose` green against the workspace dev stack with both branches checked out.

Snagging increment `snag-002` (`workareas/shared/plants-snagging`). No Jira ticket by design.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01P7Y2kmdQkQSMgHSAcqLmWs
