# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-293
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-animals-tests
**PR:** #214 | **Commit:** 865d515

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Role set for the deleted-address check | backend: `CONSIGNOR`/`CONSIGNEE`/`IMPORTER`/`DESTINATION` in `ConsignmentPartyResolver` | `outstanding-parties.js` filters `PARTIES` (`consignor`, `consignee`, `importer`, `placeOfDestination`) — `placeOfDestination`'s pre-existing `role: 'destination'` field is the mapping onto the backend's name | CONSISTENT |
| "Name every outstanding role, not just one" | backend: `UnresolvableConsignmentPartyException` now carries every unresolved role | `outstandingPartyErrors` / `errorSummary` list every outstanding role, and `check-answers.test.js` asserts multiple entries (`consignor` + `importer`) | CONSISTENT |
| en/cy bilingual copy for new user-facing strings | n/a (backend has no user-facing copy) | `copy.errors.parties.*` and `copy.errors.prefix` added to both `copy.en.js` and `copy.cy.js` | CONSISTENT (internal to this repo, matches repo convention) |
| GDS error-summary pattern (`govuk-error-summary`, focus management) | tests: `notification-view-page.ts` adds `errorSummary`/`partyError` locators consuming this markup | `kit.errorSummary` extended with `href`/`disableAutoFocus`; `template.njk` includes `shared/error-summary.njk`; `party-row.js` renders `govuk-error-message` inline in the summary-list value cell | CONSISTENT |
| Change-context round-trip (`?change=1`) through the address hub and party picker | tests: new E2E spec exercises the full Change → picker → save → back-to-review loop | Implemented in `controller.js` (addresses hub), `party-picker.controller.js`, `view-model/index.js`, `pagination/*` | CONSISTENT |

*No config/env-var or dependency-bump patterns are introduced by this change.*

## Missing Changes

*None identified.* The AC2 backend contract (`errors` map, `unresolvable-consignment-party` problem type) is not consumed here, but per the ticket's tech notes the frontend detects a deleted reference itself (via `resolveParties`/the read-path sanitiser) rather than by parsing the backend's rejection — the backend gate is a safety net, not a signal the frontend needs to read.

## Unique Changes

- `read.js`'s new `storedAnswers` (kept alongside sanitised `answers`) and the `check-answers` controller's `source = storedAnswers ?? answers` are frontend-only plumbing needed to tell "answered, then deleted" apart from "never answered" — there is no backend equivalent because the backend resolves live on every read rather than caching a sanitised copy. Intentional, well-commented, not suspicious.
- The change-context (`?change=1`) round-trip through the address hub and party picker (AC3: "taken to the relevant part... choosing a valid address should clear the message... back where the error was raised") is frontend-only UX, with no backend or tests-repo counterpart beyond the E2E assertions that exercise it. Expected — this is the AC3 mechanism itself.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The frontend PR delivers AC1/AC3 (review-page validation and the replace-and-clear round trip) using the same four-role vocabulary as the backend's AC2 gate, with bilingual copy and error-summary markup that the tests repo's new page-object locators and E2E spec directly exercise.
