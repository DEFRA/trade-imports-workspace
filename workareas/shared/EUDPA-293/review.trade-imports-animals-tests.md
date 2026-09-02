# Repository Review: trade-imports-animals-tests

**PR:** #128
**Commit:** 18087761824e70dc05319f6a3431379be91cca32
**Files Changed:** 3

## Summary
Adds E2E coverage for the AC1/AC3 round trip: a deleted address is flagged on the review page, the trader follows the "Change" link, picks a replacement, and the error clears so the notification can be submitted. Two page objects (`addresses-page.ts`, `notification-view-page.ts`) gain new locators (`changeParty`, `errorSummary`, `partyRow`/`partyError`) matching the frontend's new markup, and a new spec in `addresses-live-link.spec.ts` drives the full flow end-to-end including the final successful submission.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `page-objects/notification/addresses-page.ts` | SAFE | 0 | 0 | 0 |
| `page-objects/notification/notification-view-page.ts` | SAFE | 0 | 0 | 1 |
| `tests/e2e/features/addresses-live-link.spec.ts` | SAFE | 0 | 0 | 1 |

## Positive Observations
- New locators are role-based (`getByRole('term')`/`getByRole('definition')`/`getByRole('link', ...)`), consistent with the repo's existing conventions and the Playwright best-practices guide.
- The spec text (error copy, "Change" link labels) was cross-checked against the frontend's actual `copy.en.js`/view-model and matches exactly rather than being assumed.
- Test isolation (own address record, try/finally cleanup) follows existing patterns.

## Test Coverage
- E2E: full AC1/AC3 round trip covered (delete → flag → replace → clear → submit).
- Gap (flagged in consistency check, not a defect in this repo's own code): no new spec calls the backend submit endpoint directly with a deleted-address reference to independently prove AC2 "regardless of the frontend". That scenario is already covered by the backend's own `NotificationIT` — likely an intentional split of responsibility, flagged for confirmation.

## Configuration & Environment
- New Environment Variables: none
- Database Changes: none

## Risk Assessment
**Overall Risk:** Low
**Rationale:** Only Minor findings (a brittle XPath-style locator and one inline CSS-class selector that duplicates a page-object method added in the same PR); the AC2 direct-API coverage question is a possible test-plan gap, not a code defect.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | page-objects/notification/notification-view-page.ts | 55 | Minor | locator-xpath | partyRow() ends with .locator('..'), which Playwright resolves as an XPath parent-axis selector — the best-practices doc explicitly flags XPath selectors as brittle/avoid | Prefer a role/structure-based ascent, e.g. filter the summary-list row directly (getByRole('group')/row-level locator) instead of climbing via XPath '..' from the term |  |  |  |
| 2 | tests/e2e/features/addresses-live-link.spec.ts | 161 | Minor | locator-strategy | consignorRow is built inline with a CSS class selector (.govuk-summary-list__row) instead of reusing the pages.notificationView.partyRow(card, role) method this same PR adds to notification-view-page.ts for exactly this purpose | Use pages.notificationView.partyRow('Roles and addresses', 'Consignor') instead of the inline .govuk-summary-list__row locator |  |  |  |

## Consistency Check
**Status:** INCONSISTENCIES FOUND (1, unconfirmed — may be intentional)
The new spec matches the frontend's markup exactly via new page-object locators and fully drives the AC1/AC3 loop. The one open item: no test here calls the backend submit endpoint directly with a deleted-address reference to independently prove AC2's "regardless of the frontend — e.g. a direct API call" rejection; that scenario is already covered thoroughly by the backend repo's own `NotificationIT`, so this may be an accepted intentional split rather than a gap — flagged for the team to confirm.

## Repository Verdict
**Status:** SAFE
