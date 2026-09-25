# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-130
**All repos in scope for this review:** trade-imports-animals-frontend (only)
**PR:** #369 | **Commit:** 98aec6c

## Scope note

`.review-meta.json` lists five repos because `start-review.sh` walked
Jira linked-issues and picked up unrelated tickets that happened to
be linked to EUDPA-130. The user has explicitly scoped this
review to **trade-imports-animals-frontend PR #369 only**. The other
four diffs cached under `.diffs/` are:

- `trade-imports-address-book` PR #1 — initial repo bootstrap
  (95 files: config, TLS, exception handling, example CRUD). Not
  EUDPA-130 work.
- `trade-imports-animals-backend` PR #65 — adds
  `?referenceNumber=` filter to `GET /notifications` for dashboard
  search and wires `ConstraintViolationException` -> 400 in
  `GlobalExceptionHandler`. Different capability; no shared
  contract with the frontend's "Review your notification"
  validation.
- `trade-imports-animals-tests` PR #168 — Playwright specs for the
  plants journey (arrival, origin, start). Not the animals journey
  and not EUDPA-130.
- `trade-imports-workspace` PR #14 — ZAP `security-active-scan.yml`
  workflow and `docker/stack/security.compose.yml`. Tooling only.

None of those four diffs touch the client-side validation, `check-answers`
refusal predicate, task-list card errors, error-summary rendering, or
the `stored-answers` flow this PR builds. Cross-repo consistency
therefore has nothing to compare against for this ticket.

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Client-side page/section validation library (`lib/validate/*`) | n/a — frontend-only concern | Added `page-validation.js` + `hasErrors` re-export | SINGLE REPO (N/A) |
| `check-answers` refusal predicate (`isReviewRefused`) | n/a | Added `refusal.js` + tests | SINGLE REPO (N/A) |
| Per-feature `validate.js` `validation()` export used by both controller and check-answers card | n/a | Rolled out across additional-details, contact, cph-number, import-reason, origin, port-of-entry, transit-countries, transporters | SINGLE REPO (N/A) |
| Stored-answers hydration for stale/missing values on the review page | n/a | `flow/stored-answers.js` + tests | SINGLE REPO (N/A) |
| Backend `ConstraintViolationException` -> 400 ProblemDetail (animals-backend PR #65) | animals-backend | Not applicable — this PR does not submit any new payload shape that the backend would reject | EXPECTED ABSENCE |
| Backend `?referenceNumber=` dashboard filter (animals-backend PR #65) | animals-backend | Not consumed by this PR — dashboard search is out of scope for EUDPA-130 | EXPECTED ABSENCE |
| Shared schemas / dependency bumps / env vars / feature flags | none in any diff | none | CONSISTENT |

## Missing Changes

*None identified.* The validation model this PR introduces is a
frontend-only surface (Nunjucks card rendering, in-page Joi
validation, task-list roll-up) and does not require a matching
backend or tests change to be complete for EUDPA-130. Dashboard
filtering / server-side constraint handling in animals-backend PR
#65 belong to a different capability and would not be exercised by
the "Review your notification" flow this ticket delivers.

## Unique Changes

All 44 files in this PR are unique to the frontend; that is
expected. Notable frontend-only introductions worth calling out for
downstream awareness (not consistency defects):

- `src/server/app/lib/validate/page-validation.js` — new shared
  page-validation entry-point exporting `hasErrors` and
  section-level plumbing. Adopted by every per-feature
  `validate.js` in this PR; peer frontend repos (if any land later)
  should consume the same helper rather than re-implementing.
- `src/server/app/sets/live-animals/journeys/linear/features/check-answers/refusal.js`
  — new `isReviewRefused` predicate that gates continue-to-declaration.
  The declaration controller now calls it; any future
  "post-review" gates (e.g. amend flow) should reuse it rather than
  duplicating the roll-up.
- `src/server/app/sets/live-animals/journeys/linear/flow/stored-answers.js`
  — normalises stored answers ahead of the review render so old
  reference data / removed enum values surface as "Missing" rather
  than crashing. Only used by the live-animals linear journey today;
  a future plants or admin equivalent would want the same helper.

None are suspicious — all sit within the ticket's stated scope
(AC1–AC5).

## Verdict

**Status:** SINGLE REPO (N/A)
**Issues:** 0 inconsistencies found
**Summary:** Per the user's explicit scoping this is a single-repo
review; the other four diffs cached under `.diffs/` belong to
unrelated tickets and share no contract with EUDPA-130's client-side
"Review your notification" validation, so there is nothing to
compare against.
