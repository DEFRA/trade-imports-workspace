## What broke

The E2E spec `tests/e2e/pages/notification-view-states.spec.ts` failed on the
frontend PR for EUDPA-580
([trade-imports-animals-frontend#321](https://github.com/DEFRA/trade-imports-animals-frontend/pull/321)):

```
✘ Notification view states › DRAFT › Continue moves on to the declaration
  expect(page).toHaveURL(/\/declaration$/) — got
  http://localhost:3000/notifications/GBN-AG-26-JSYP9Z/notification-view
```

The spec's `DRAFT` block seeds with `createDraftNotification('unlocked')`, which
is deliberately incomplete — origin and the commodity steps only, with nothing
for arrival, transport, addresses, the contact address or documents. It then
asserted that pressing Continue on Check your answers carried the trader on to
the declaration.

That is exactly the behaviour EUDPA-580 removed. Check your answers now works
out which review cards are unfinished, heads the page with a "There is a
problem" summary naming each one, and re-renders itself on POST rather than
moving on. Before the change the trader was carried to the declaration, ticked
the box, and only then had the submit's readiness test bounce them back to Check
your answers with no message at all.

So the failure is the spec encoding the old, wrong behaviour, not a regression
in the frontend.

## What changed

`tests/e2e/pages/notification-view-states.spec.ts` only:

- The unfinished draft's Continue test now asserts the refusal — the URL stays
  on `notification-view`, the error summary is visible, it reads "There is a
  problem", and it carries a `Complete arrival details` link.
- A new `DRAFT ready to submit` block seeds `createDraftNotification('readyToSubmit')`
  and keeps the original assertion, so "Continue moves on to the declaration"
  still has coverage on a notification that is actually ready. It also asserts
  that a complete notification shows no error summary at all.

No test was weakened, skipped or deleted; the suite gains two assertions.

## Verification

- `npm run typecheck` — clean.
- `eslint` and `prettier --check` on the edited spec — clean.
- Frontend `npm run test:live-animals` — 1022 tests across 76 files pass,
  including the `check-answers` suites that cover the POST refusal and the
  per-card error summary.

## Where it belongs

- Increment: `inc-150` (dr1-parity-union backlog)
- Ticket: EUDPA-580
- Travels with: DEFRA/trade-imports-animals-frontend#321 — both must land
  together, as this spec asserts that PR's behaviour.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
