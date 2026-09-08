# Repository Review: trade-imports-ins-frontend

**PR:** #25
**Commit:** df4190f8340f859a610e9620518b475c13e79713
**Files Changed:** 13

## Summary
This open PR turns the INS home route into the unified dashboard: INS backend client (real + stub), row mapping, animals-frontend deep links, search, empty states, sort and pagination. The list is unscoped on purpose. The blocking issue is unescaped `referenceNumber` HTML in the table.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `playwright.config.js` | SAFE | 0 | 0 | 0 |
| `src/config/config.js` | SAFE | 0 | 0 | 1 |
| `src/server/common/clients/__mocks__/ins-backend-client.js` | SAFE | 0 | 0 | 0 |
| `src/server/common/clients/ins-backend-client.js` | SAFE | 0 | 0 | 0 |
| `src/server/common/clients/ins-backend-client.real.js` | SAFE | 0 | 0 | 0 |
| `src/server/common/clients/ins-backend-client.stub.js` | SAFE | 0 | 0 | 0 |
| `src/server/common/clients/ins-backend-client.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/common/helpers/notification-dashboard-helper.js` | SAFE | 0 | 0 | 0 |
| `src/server/common/helpers/notification-dashboard-helper.test.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/routes/home/controller.js` | RISKY | 1 | 1 | 0 |
| `src/server/routes/home/controller.test.js` | NEEDS ATTENTION | 0 | 2 | 0 |
| `src/server/routes/home/fit/dashboard.fit.spec.js` | NEEDS ATTENTION | 0 | 2 | 0 |
| `src/server/routes/home/index.njk` | NEEDS ATTENTION | 0 | 1 | 0 |

## Positive Observations
Client shape matches the backend contract (page, sort, exact reference, no organisation header). Deep links send SUBMITTED to `notification-view` and DRAFT/AMEND to the journey hub. Stub data hides DELETED. Pagination helper follows the address-book pattern.

## Test Coverage
- Unit tests: Client, helper, and controller cover search, empty/no-match, sort, and errors. Gaps: commodity in AC1, `page` forwarding, and search preserved on pagination links.
- Integration tests: Dashboard FIT covers search, deep-link hrefs, deleted hiding, and axe. Gaps: origin/arrival columns and empty results list after no-match.

## Risk Assessment
**Overall Risk:** High
**Rationale:** Unescaped reference numbers in govukTable `html` can XSS the dashboard; the address-book list already escapes the same visually-hidden “View” text.

## Items

Items scoped to EUDPA-306. Convict `format: 'url'` is Won't Fix. Table caption stays in scope (GDS list pattern for this dashboard page).

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/config/config.js | 379 | Minor | config | New URL keys tradeImportsInsBackendApi.baseUrl and tradeImportsAnimalsFrontend.baseUrl use format: String, so a malformed TRADE_IMPORTS_INS_BACKEND_URL or TRADE_IMPORTS_ANIMALS_FRONTEND_URL fails late inside new URL() rather than at config.validate(). | Set format: 'url' on both new baseUrl keys (convict-format-with-validator is already registered). | Won't Fix | — | Out of EUDPA-306: convict format String vs url is a config nit. |
| 2 | src/server/common/helpers/notification-dashboard-helper.test.js | 72 | Major | missing-assertion | buildPaginationLinks test claims to carry referenceNumber but passes undefined and never asserts it on previous/next or item hrefs, so dropping search from pagination links would still pass | Pass a real referenceNumber (as address-book-helper.test.js does for search terms) and assert it appears on previous, next, and numbered item hrefs |  |  |  |
| 3 | src/server/routes/home/controller.js | 44 | Critical | xss | buildTableRows interpolates notification.referenceNumber into govukTable html without escaping, so a reference containing markup can XSS the dashboard (the address-book list uses escapeHtml for the same visually-hidden text). | HTML-escape referenceNumber (and treat href as an attribute) before interpolating into the View link html, matching address-book/list/controller.js. |  |  |  |
| 4 | src/server/routes/home/controller.js | 58 | Major | resilience | getCountries is on the same try path as listNotifications, so a reference-data failure 500s the dashboard even though originCountry already falls back to the raw code. | Fetch countries separately (warn and use {} on failure) so listNotifications can still render the rows required by AC1. |  |  |  |
| 5 | src/server/routes/home/controller.test.js | 57 | Major | missing-assertion | AC1 test is titled to cover commodity but the fixture sets commodity to null and never asserts a commodity value appears in the row. | Give the fixture a commodity string and assert that value is present in the rendered HTML. |  |  |  |
| 6 | src/server/routes/home/controller.test.js | 218 | Major | missing-coverage | Sort query forwarding is tested but the page query is never forwarded or validated, so a broken parsePage would still pass this suite. | Add a test that GET /?page=2 forwards page: 2, and that an invalid page falls back to 1. |  |  |  |
| 7 | src/server/routes/home/fit/dashboard.fit.spec.js | 21 | Major | coverage | AC1 FIT only asserts reference numbers and statuses; stub origin countries and arrival dates are never checked, so a missing identifying column still passes. | Assert the stub origin names (France, Ireland, Germany) and formatted arrival dates (10 Sep 2026, 12 Sep 2026, 8 Sep 2026), as list.fit.spec.js does for table columns. |  |  |  |
| 8 | src/server/routes/home/fit/dashboard.fit.spec.js | 98 | Major | coverage | AC5 FIT asserts the No notifications found message but not that the results list is empty, so leftover rows would still pass. | After the no-match search, also assert the table is gone (getByRole('table') toHaveCount(0) or the known stub refs toHaveCount(0)). |  |  |  |
| 9 | src/server/routes/home/index.njk | 84 | Major | accessibility | govukTable has no caption, so screen readers announce the notifications list with no accessible name | Pass caption (visually hidden if the Dashboard heading is enough) and captionClasses on govukTable |  |  |  |

## Repository Verdict
**Status:** RISKY
