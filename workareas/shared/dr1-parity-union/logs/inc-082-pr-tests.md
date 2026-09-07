## What broke

The E2E job on the frontend PR
[DEFRA/trade-imports-animals-frontend#259](https://github.com/DEFRA/trade-imports-animals-frontend/pull/259)
failed on `tests/e2e/pages/origin.spec.ts:27` — "Origin of the import page ›
shows an error summary when submitted without a country" — on the first run and
on retry #1. Nothing else in the suite failed (1 failed, 56 passed).

The spec was asserting behaviour the frontend deliberately dropped in that PR.
The origin page used to validate `countryOfOrigin` with `requiredOneOf`, so Save
and continue with no country returned the page with an error and kept nothing.
Increment inc-082 swapped that for a plain `oneOf`, matching Design release 1:
the page saves what the user has, and the missing country is held at the
overview task row and again at the check page before the declaration.

## What changed

`tests/e2e/pages/origin.spec.ts`:

- Replaced "shows an error summary when submitted without a country" with
  "saves what the user has when submitted without a country" — it checks No for
  the region of origin code, fills the internal reference, submits with the
  country empty, and asserts no error summary, that the user is set down on the
  overview (the commodity search is asked for by country of origin, so with the
  country unanswered there is no next page to offer), and that reopening origin
  still holds the radio and the internal reference.
- Added "shows an error summary when a region of origin code is claimed but not
  given", so the page keeps a validation case at the E2E level. That rule is
  unchanged by inc-082.

The off-list country rejection that `oneOf` still enforces is covered by the
frontend's own `origin.fit.spec.js` in PR #259.

## Verification

- `playwright test --config=playwright.docker-compose.config.ts tests/e2e/pages/origin.spec.ts`
  against the local stack running the branch's frontend source — 5 passed.
- `npm run typecheck`, `npm run lint`, `npm run format:check` — all clean.

## Where this belongs

Increment inc-082 of the parity DR1 union backlog, ticket EUDPA-476. Pairs with
frontend PR #259 on the same branch name (cross-repo branch parity).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
