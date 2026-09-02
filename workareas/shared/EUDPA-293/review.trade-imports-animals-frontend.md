# Repository Review: trade-imports-animals-frontend

**PR:** #214
**Commit:** 865d5151931decca9d4332f46686b9e9412845b2
**Files Changed:** 22

## Summary
Implements AC1 and AC3: the review-page (check-your-answers) validation surface for a deleted address, and the "replace it, then submit" navigation loop. `engine/read.js` now returns a `storedAnswers` field (pre-sanitiser) alongside the sanitised `answers`, letting `check-answers/controller.js` distinguish "answer stripped because the address was deleted" from "never answered". A new `outstanding-parties.js` view-model derives per-role errors from that, rendered as an inline `govuk-error-message` (`party-row.js`) and a GDS error summary (`kit.errorSummary`, extended with `href`/`disableAutoFocus`). The `post()` handler now blocks submission (400 + re-render) while any party remains outstanding. A parallel "change context" (`?change=1`) mechanism threads through the addresses hub and party picker so a trader following a "Change" link from the review page returns there after picking a replacement (AC3). Bilingual (en/cy) copy was added for the new error strings.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/server/app/engine/read.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/engine/read.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/controller.test.js` | NEEDS ATTENTION | 0 | 1 | 1 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-picker/party-picker.controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-picker/party-picker.controller.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-picker/view-model/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-picker/view-model/pagination/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-picker/view-model/pagination/results-href.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/check-answers.fit.spec.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/check-answers.test.js` | NEEDS ATTENTION | 0 | 2 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/controller.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/copy/copy.cy.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/copy/copy.en.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/template.njk` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/addresses/contact-address.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/addresses/roles-and-addresses.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/outstanding-parties.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/rows/party-row.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/addresses.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/shared/kit.js` | SAFE | 0 | 0 | 0 |

## Positive Observations
- `storedAnswers` (pre-sanitiser) vs `answers` (post-sanitiser) is a clean, well-commented mechanism for telling "never answered" apart from "answered then deleted" — exactly the distinction AC1 needs.
- Inline party-row errors and the GDS error summary both list every outstanding role, not just the first, symmetric with the backend's AC2 behaviour.
- The `?change=1` context round-trip (AC3: "taken to the relevant part... choosing a valid address should clear the message") is threaded consistently through the addresses hub, party picker, and pagination links, all four exit paths covered.
- Bilingual copy (en/cy) added with correct key-parity, enforced by the repo's existing copy-parity test.
- `check-answers.fit.spec.js` was updated to correctly distinguish "never answered" from "deleted" so a fresh journey doesn't wrongly show a deleted-address error.

## Test Coverage
- Unit tests: strong overall, but two gaps flagged below (a Major coverage gap in `controller.test.js` for the addresses hub, and two Major gaps in `check-answers.test.js`).
- Integration/E2E: `check-answers.fit.spec.js` and the tests-repo's new Playwright spec exercise the full AC1/AC3 loop.

## Risk Assessment
**Overall Risk:** Medium
**Rationale:** One genuine correctness gap (submitted notifications could be wrongly blocked by the new POST validation, contradicting the ticket's "submitted: nothing changes" rule) plus real test-coverage gaps around the "resolved reference clears the error" (AC3) path.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/server/app/engine/read.js | 34 | Minor | code-style | assembled.answers is accessed three times (line 34, and the two new storedAnswers: assembled.answers assignments) instead of being destructured once | Destructure once at the top, e.g. const { answers: storedAnswers } = assembled, and reuse it in both return branches |  |  |  |
| 2 | src/server/app/sets/live-animals/journeys/linear/features/addresses/controller.test.js | 176 | Major | test-coverage | New 'change context' describe block tests POST redirect only under change=1; the symmetric non-changing POST case (normal nextTarget flow, not redirecting to notification-view) introduced by the same exitTarget/changeContext branching is left unverified, unlike every GET case in this block which pairs a changing and non-changing assertion | Add a POST test with no change query asserting the redirect is NOT notification-view (e.g. the ordinary next-page target), mirroring the GET 'not changing' coverage |  |  |  |
| 3 | src/server/app/sets/live-animals/journeys/linear/features/addresses/controller.test.js | 176 | Minor | test-structure | The POST redirect test is nested inside the 'GET addresses — change context' describe block, mixing verbs under a GET-labelled block | Nest the POST test under its own 'POST addresses — change context' (or similar) describe, per the repo convention of separating describes by HTTP verb |  |  |  |
| 4 | src/server/app/sets/live-animals/journeys/linear/features/check-answers/check-answers.test.js | 561 | Major | test-quality | Test 'Should not flag an inline party the address book cannot empty' deletes placeOfOrigin's answer entirely, so it only exercises the never-answered path (already covered by the importer test) — placeOfOrigin never carries an addressId here, so the case it names (an inline party surviving an address-book deletion) is never actually run. | Seed placeOfOrigin with an addressId pointing at a deleted record (e.g. { addressId: 'gone' }) and assert the summary stays null, proving inline parties are immune to the deletion check per resolve-parties.js's resolveOne. |  |  |  |
| 5 | src/server/app/sets/live-animals/journeys/linear/features/check-answers/check-answers.test.js | 557 | Major | test-coverage | No test asserts errorSummary is null for a party that IS an address-book reference and DOES still resolve (e.g. consignor: { addressId: 'astra-rosales' }) — every 'no error' assertion in this file uses parties with no addressId at all, so the outstandingParties() branch '!parties[party.id]' being false for a live reference (the AC3 'clears once replaced' case) is untested. | Add a case (near the 'address-book party references' describe, or extending it) that seeds a valid addressId and asserts view.context.errorSummary is null, closing the coverage gap for the resolved-reference path. |  |  |  |
| 6 | src/server/app/sets/live-animals/journeys/linear/features/check-answers/controller.js | 126 | Major | consistency | post() blocks on outstandingPartyErrors unconditionally, but renderNotificationView explicitly zeroes partyErrors for a readOnly (SUBMITTED) journey — the POST path has no matching readOnly guard, and the template renders the submit form even when readOnly, so a submitted notification with a stale address reference would be wrongly refused, contradicting the ticket's 'submitted: nothing changes' rule | Destructure readOnly (or journey.status) in post() and skip the outstandingPartyErrors check when readOnly, mirroring the GET branch's 'readOnly ? {} : outstandingPartyErrors(...)' |  |  |  |

## Consistency Check
**Status:** CONSISTENT (0 inconsistencies)
Role vocabulary, "name every outstanding role", bilingual copy, GDS error-summary markup, and the `?change=1` round-trip are all internally consistent and match what the tests repo's new page-object locators exercise. The AC2 backend error-shape is deliberately not consumed here (the frontend detects deletion itself via the resolve path) — expected per the ticket's tech notes.

## Repository Verdict
**Status:** NEEDS ATTENTION
