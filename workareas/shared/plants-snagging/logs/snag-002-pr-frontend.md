## What

The hub task row and the page title already said **Place of destination**, but the pre-arrival h1 on `destinations/select` read **Intended destination** for potatoes and for a consignment that has not arrived yet. The trader clicked one name and landed on another.

- Pre-arrival headings now equal the page title (`Place of destination` / `Man cyrchfan`), and `copy.test.js` pins that equality in both languages so the page and the task row cannot drift apart again.
- The already-arrived heading (`Where is the consignment now?`) and every description are unchanged.
- The check-answers destination card takes its title from the same headings, so it renames with the page.
- `journey-spec.json` `headingByState` / `labelByState` and `backlog-extras.json` updated so the in-repo spec agrees with the shipped copy.

## Sibling PR

The tests repo's plants E2E specs assert the renamed heading and card on the same branch: DEFRA/trade-imports-animals-tests `fix/NO_JIRA-plants-place-of-destination-heading`. Merge this one and that one together; neither is green against the other's `main`.

## Verification

Unit, fit and lint ladders green; full E2E suite green against the workspace dev stack with both branches checked out.

Snagging increment `snag-002` (`workareas/shared/plants-snagging`). No Jira ticket by design.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01P7Y2kmdQkQSMgHSAcqLmWs
