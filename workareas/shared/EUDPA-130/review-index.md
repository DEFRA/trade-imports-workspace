# Code Review: EUDPA-130

**Ticket:** Animals Notification Validation
**Reviewer:** Claude Code Agent
**Date:** 2026-09-25
**Verdict:** PASS WITH NOTES

## Scope

Reviewed **only** `trade-imports-animals-frontend` PR #369
(commit `98aec6c4`) at the user's explicit request. The other four
PRs cached by `start-review.sh` under this ticket
(`trade-imports-address-book` #1, `trade-imports-animals-backend` #65,
`trade-imports-animals-tests` #168, `trade-imports-workspace` #14)
belong to unrelated tickets and are out of scope for this review.

## Summary

Adds the "Review your notification" gate that AC1–AC7 describe: a
shared `pageValidation` factory reused across eight feature
`validate.js` modules, a `flow/stored-answers.js` that composes those
into row-level and card-level error maps, a `refusal.js` predicate
shared between the check-answers Continue and the declaration Submit,
plus locale copy and a coverage-smoke test that prevents any page
silently escaping the review gate.

## Repositories Analyzed

| Repository | PR | Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-frontend | #369 | 98aec6c4 | 44 | SAFE | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |

## Acceptance Criteria Check

| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| AC1 | Review page displays notification organised into same sections as tasklist with Change links | Yes | Card layout retained; `REVIEW_CARDS` unchanged; check-answers `controller.js` still renders per-card sections with the existing template. |
| AC2 | Each field shows entered value or "Missing" | Yes | `incompleteCardErrors(...)` already surfaces missing mandatory fields; unchanged by this PR. |
| AC3 | Inline error for an incomplete or invalid section | Yes | `invalidCardErrors` (from `cardStoredErrors` in `flow/stored-answers.js`) folded into `check-answers/controller.js`; per-feature `validate.js` uses `stored: true` copy variants like `portNoLongerAvailable`, `certifiedNoLongerOffered`, `contactNoLongerAvailable`, `cphNoLongerValid`, `arrivalDateNoLongerInWindow`, `transporterNoLongerAvailable`. |
| AC4 | Error summary blocks Continue, links to relevant page | Yes | `check-answers.test.js` "stale stored answers" suite asserts the summary lists the failing card and POST returns 400. `isReviewRefused` gates Continue. |
| AC5 | Continue to declaration when complete | Yes | Existing happy-path retained; refusal check is short-circuit only, so a clean review still redirects to declaration. |
| AC6 | Re-validate on Continue against today's rules | Yes | `onStored` runs the same page rules with `context.stored = true`; reference-data functions (`certificationPurposes`, `originCountries`, `unweanedCommodities`, `partiesFor`) are read at rule-time, so today's rules always apply. Stale-port test in `hub/controller.test.js` and `check-answers.test.js` witnesses this. |
| AC7 | Re-validate on submitting the declaration | Yes | `declaration/controller.js` now calls `isReviewRefused` before `records.finalise`; two new `declaration/controller.test.js` scenarios (stale port, mocked refusal) pin the redirect and no-finalise behaviour. |

Note on AC7 UX parity: the check-answers POST handler renders the
review page with `disableAutoFocus: false` when it refuses, moving
focus to the error summary. The declaration refusal path redirects
(302) to the check-answers GET which uses the default
`disableAutoFocus: true`, so a trader bounced back from declaration
sees the errors but the summary does not auto-focus. Errors do render;
this is a parity nuance, not an AC failure. Not flagged as a finding.

## Test Coverage Assessment

- **Unit Tests:** Present. Framework (`page-validation.test.js`) + per-feature `validate.test.js` (additional-details, contact, cph-number, transporters) and `stored-answers.test.js`.
- **Integration Tests:** Present. Controller tests updated for check-answers (5 new stale-stored scenarios), hub (2 new tests), declaration (2 new tests), refusal (5 scenarios). `validation-coverage.test.js` enforces that every dispatch page carries `meta.validation`.
- **E2E / Playwright:** Not in scope for this PR (the paired tests-repo PR #168 is a different ticket).

## Configuration & Environment

- **New Environment Variables:** None.
- **Database Changes:** None.
- **Feature flags:** None.
- **Dependency bumps:** None.

## Risk Matrix

| Category | Risk Level |
|----------|------------|
| Correctness | Low |
| Code Quality | Low |
| Security | Low |
| Test Coverage | Low |

## Conclusion

PR #369 is safe to merge. All seven acceptance criteria are met, the
new `pageValidation` abstraction is consistently applied across all
eight in-scope features, and the coverage-smoke test prevents a new
page from silently escaping the review gate. Three Minor items are
open (all test-assertion tightening in `cph-number/validate.test.js`,
`hub/controller.test.js`, `transporters/validate.test.js`) — see
[review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md)
for details.
