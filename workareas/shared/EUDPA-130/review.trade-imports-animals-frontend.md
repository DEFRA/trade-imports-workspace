# Repository Review: trade-imports-animals-frontend

**PR:** #369
**Commit:** 98aec6c4fe3a53bb12993cf6b0ff025cbcf7e514
**Files Changed:** 44

## Summary

Introduces a single "review your notification" gate over the existing
live-animals linear journey. A shared `pageValidation` factory
(`lib/validate/page-validation.js`) is rolled out to eight feature
`validate.js` modules so every page's rules run twice from one
schema: `onSubmit` on POST, `onStored` when the review page (or task
list) reads a persisted answer. A new `flow/stored-answers.js`
composes those page validations into row-level and card-level error
maps; `check-answers/controller.js` folds the resulting card errors
into the render, and a new `check-answers/refusal.js` predicate gates
Continue and is also called from the declaration POST so a
bookmark/back-button submit cannot bypass re-validation.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/server/app/flow/dispatch.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/lib/validate/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/lib/validate/page-validation.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/lib/validate/page-validation.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/additional-details/controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/additional-details/copy/copy.cy.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/additional-details/copy/copy.en.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/additional-details/validate.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/additional-details/validate.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/check-answers.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/refusal.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/refusal.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/contact/controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/contact/copy/copy.cy.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/contact/copy/copy.en.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/contact/validate.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/contact/validate.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/cph-number/controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/cph-number/copy/copy.cy.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/cph-number/copy/copy.en.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/cph-number/validate.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/cph-number/validate.test.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/sets/live-animals/journeys/linear/features/declaration/controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/declaration/controller.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/hub/controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/hub/controller.test.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/sets/live-animals/journeys/linear/features/import-reason/controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/import-reason/validate.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/origin/controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/origin/validate.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.cy.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.en.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/port-of-entry/port-of-entry.controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/port-of-entry/validate.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/transit-countries/transit-countries.controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/transit-countries/validate.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/transporters/transporters.controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/transporters/validate.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/transport/transporters/validate.test.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/sets/live-animals/journeys/linear/features/validation-coverage.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/flow/stored-answers.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/flow/stored-answers.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/shared/kit.js` | SAFE | 0 | 0 | 0 |

## Positive Observations

- **One schema, two entry points.** `pageValidation({ fields, fromPayload, fromAnswers, toAnswers, blanks })` is the right abstraction: `onSubmit` runs the same rules against a fresh payload, `onStored` runs them against a persisted answer with a `stored: true` flag so messages can swap between "you typed this wrongly" and "the world changed under you". Each feature `validate.js` uses it identically — see `contact/validate.js`, `cph-number/validate.js`, `port-of-entry/validate.js`, `transit-countries/validate.js`, `transporters/validate.js`.
- **Presentational demotion stays out of the engine.** The hub controller composes `invalidRowIds` on top of the engine's `rowStatus`; a row whose stored answer no longer passes its rules reads "To do" without the engine having to know about it. Same discipline in `check-answers/controller.js`, where `invalidCardErrors` is spread beneath `incompleteCardErrors(...)` so "incomplete wins over invalid" per the AC.
- **Refusal reused on both exit points.** `isReviewRefused` in `refusal.js` is called from `check-answers/controller.js` (Continue) and `declaration/controller.js` (Submit) so a bookmark/back-button submission cannot bypass AC6/AC7 re-validation. Verified by the two new `declaration/controller.test.js` scenarios (stale port and mocked refusal).
- **Reference-data late-binding.** `certificationPurposes()`, `unweanedCommodities()`, `originCountries()`, `partiesFor(...)` are read at rule-time, not module-load — reference-data updates reach validation without a restart. This is the wiring that lets AC6 ("re-validate against today's rules") actually work.
- **Coverage gate.** `validation-coverage.test.js` iterates every entry in `dispatchPages` and asserts each carries `meta.validation.onSubmit`/`onStored` or is on a documented `VALIDATION_OPT_OUTS` list — a stale opt-out breaks the build, so silently missing a page from the review gate is not possible.
- **Locale parity.** Every new English error string has a same-key Welsh counterpart (`copy-parity.test.js` enforces this). New keys follow the existing "no longer available/valid + call to action" pattern.
- **Comment discipline.** New comments explain *why* (bookmark-bypass, incomplete-wins-over-invalid, single-clock-read for date windows, deleted-address sanitiser vs stored-answer distinction) rather than restating code — matches workspace guidance.

## Test Coverage

- **Unit tests:** thorough. Every new `validate.js` either has a co-located `validate.test.js` or is fully exercised through the sibling `controller.test.js`. `page-validation.test.js` pins the framework's own shape (shared rules, `onSubmit`/`onStored` return shape, `context.stored` message swap, `normalise`, `checks`-under-schema merge, `blanks`, `hasErrors`).
- **Controller-integration tests:** `check-answers.test.js` covers card-level inline error, error summary listing, incomplete-wins-over-invalid, POST refusal, and read-only submitted view; `hub/controller.test.js` covers "To do" demotion on a stale answer; `declaration/controller.test.js` covers stale-port and mocked-refusal redirect.
- **Behaviour-spec files:** none touched by this PR; no `openspec/**` mismatch to flag.
- **Regressions observed:** none — existing per-page controller tests all continue to assert the same behaviour matrix after the pageValidation extraction.

## Risk Assessment

**Overall Risk:** Low
**Rationale:** Additive refactor over a well-covered surface, gated by a coverage-smoke test that prevents a page from silently escaping the review gate. Only three Minor items across 44 files, all test-assertion tightening.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/server/app/sets/live-animals/journeys/linear/features/cph-number/validate.test.js | 71 | Minor | test-assertion-strength | The 'non-digit characters' onStored test only asserts errors.toHaveProperty('cphCounty'), so it passes on any cphCounty error message, not the specific 'The saved CPH number is no longer valid…' copy that the sibling nine-digit-length test pins down. A copy regression on cphNoLongerValid would go uncaught here. | Replace toHaveProperty with the same toEqual({ cphCounty: 'The saved CPH number is no longer valid. Re-enter the county, parish and holding numbers.' }) shape used in the test above, so both non-nine-digit paths pin the exact message. |  |  |  |
| 2 | src/server/app/sets/live-animals/journeys/linear/features/hub/controller.test.js | 57 | Minor | naming | The stale port is extracted to STALE_PORT but the valid port 'GB ABD' is inlined, breaking the local convention (see the sibling stored-answers.test.js pair of STALE_PORT/KNOWN_PORT). | Extract 'GB ABD' as KNOWN_PORT alongside STALE_PORT and reference it in the second test. |  |  |  |
| 3 | src/server/app/sets/live-animals/journeys/linear/features/transport/transporters/validate.test.js | 30 | Minor | test-assertion-specificity | The three rejection assertions use toHaveProperty('transporter') and do not pin the error message; onSubmit ('transporterRequired-style not-a-row rejection') and onStored ('transporterNoLongerAvailable') return different copy under the same key, so an accidental swap would still pass. | Assert the message with toMatchObject({ transporter: copy.errors.transporterRequired }) for the onSubmit rejection and { transporter: copy.errors.transporterNoLongerAvailable } for the onStored rejection. |  |  |  |

## Repository Verdict

**Status:** SAFE
