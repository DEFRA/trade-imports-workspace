## What broke

The E2E run on [trade-imports-animals-frontend#337](https://github.com/DEFRA/trade-imports-animals-frontend/pull/337) went red on one test:

```
[e2e] tests/e2e/pages/notification-view-states.spec.ts:37:5
  Notification view states > DRAFT > offers submission and none of the post-submit actions
  Error: expect(locator).toBeVisible() failed — element(s) not found
  getByRole('heading', { name: 'Now submit your notification' })
```

Failed on the initial run and on retry #1, so it is not flake.

## Why

Frontend PR #337 (increment inc-158, ticket EUDPA-594) is a deliberate parity change against Design release 1: the review page used to end with an `h2` "Now submit your notification" and the sentence "Continue to the declaration to submit your notification." above the Continue button. DR1 ends with the Continue button and nothing else, the button's own label carrying the whole instruction. The frontend commit deleted both strings from the check-answers copy (English and Welsh) and the three lines that rendered them in `check-answers/template.njk`.

This spec still asserted the deleted heading, so it was asserting behaviour the service is no longer meant to have.

## What changed here

One line removed from `tests/e2e/pages/notification-view-states.spec.ts`:

```diff
     test('offers submission and none of the post-submit actions', async ({ pages }) => {
-      await expect(pages.page.getByRole('heading', { name: 'Now submit your notification' })).toBeVisible();
       await expect(pages.notificationView.continueButton).toBeVisible();
```

Nothing else. The test still asserts that submission is offered (the Continue button is visible) and that none of the post-submit actions — Copy as new, Delete, Cancel amendment — are present, which is what the test's name promises. No test weakened, skipped or deleted; the stale assertion covered copy that no longer exists anywhere in the frontend (`grep` for "Now submit your notification" and "Continue to the declaration to submit" returns nothing in either repo).

## Verification

- `npm run typecheck` — clean
- `npm run lint` — clean
- Coverage of the removed string re-checked by grep across the frontend `src/` and `tests/` and the whole tests-repo suite; no other spec referenced it.

## Provenance

- Increment: `inc-158` (dr1-parity-union backlog)
- Ticket: EUDPA-594
- Paired frontend PR: DEFRA/trade-imports-animals-frontend#337
- Same branch name in both repos, per workspace cross-repo branch parity.
