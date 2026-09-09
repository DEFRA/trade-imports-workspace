## What broke

The E2E suite went red on the frontend PR
[DEFRA/trade-imports-animals-frontend#293](https://github.com/DEFRA/trade-imports-animals-frontend/pull/293)
— 25 failures across three shards. Every one of them traced back to two
renamed strings.

The frontend now words the county parish holding term the way Design
release 1 does:

- the CPH page is headed with the instruction **"Add the county parish
  holding number (CPH)"**, and the input beneath it is labelled **"CPH
  number"** rather than doubling as the page heading;
- the consignment addresses hub row and the check-your-answers row read
  **"County parish holding (CPH) number"**.

The suite still looked for **"County Parish Holding (CPH)"** as the h1 and
**"County Parish Holding number (CPH)"** as the row key, so
`cph-scope.spec.ts` could not find the hub row and every journey that walks
through the CPH page timed out waiting for a heading that no longer exists.

## What changed

- `page-objects/notification/cph-number-page.ts` — the `heading` and
  `cphNumber` locators follow the new page heading and field label.
- `tests/e2e/features/cph-scope.spec.ts`,
  `tests/e2e/features/all-operators.spec.ts` and
  `tests/e2e/features/hub-groups-and-cya-rows.spec.ts` — the hub and
  check-your-answers row keys follow the new wording.

No test was weakened, skipped or removed: the assertions are the same
assertions against the new strings.

## Where it belongs

Increment inc-049, ticket EUDPA-527. Pairs with the frontend PR above —
same branch name, cross-repo branch parity.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
