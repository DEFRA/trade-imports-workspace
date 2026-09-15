## EUDPA-604 — inc-036

**Finding:** the hub offers no "Review and submit" button; the frontend makes reviewing a notification a task row that stays locked until every other task is done.

This PR follows the hub change in the frontend: the review is now reached from a primary "Review and submit" button under the task list rather than from a locked "Check and submit" task row in a sixth section.

### What changed

- `page-objects/notification/overview-page.ts` — adds a `reviewAndSubmitButton` locator.
- `flows/journey.ts` — `toReview` and `toDeclaration` click the button instead of the task row.
- `tests/e2e/features/hub-groups-and-cya-rows.spec.ts` — updated for the removed row and section.
- `tests/e2e/features/addresses-live-link.spec.ts`, `addresses-submit-freeze.spec.ts`, `amend-resubmit.spec.ts` — updated for hub statuses that no longer read "Cannot start yet".
- `tests/a11y/notification-journey-{initial,filled,error}-state.spec.ts` — same status change.

### Cross-repo

This increment also changes **DEFRA/trade-imports-animals-frontend** on the same branch name, `feat/EUDPA-604-the-hub-offers-no-review-and-submit-butt` (PR #350).

**Merge order: this tests PR first, then the frontend PR.** CDP runs this suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs that still click the removed task row, and CDP would go red. Both PRs must be green before either merges.
