# Repository Review: trade-imports-performance-tests

**PR:** #27
**Commit reviewed:** ed4724a3274db7e6b7c02fc01dfbed97f19f62e5
**Files Changed:** 16

## Summary
The k6 front-door session follows the new add flow: it chooses the Origin or Consignor type, ticks a role and lands on that type's tab. The background-volume reader counts addresses across the three tabs. The session's page count and its endpoints now come from one map, `ADDRESS_BOOK_SESSION_ENDPOINTS`.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `README.md` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/config/design-target.test.js` | SAFE | 0 | 0 | 0 |
| `src/config/endpoints.js` | SAFE | 0 | 0 | 0 |
| `src/config/endpoints.test.js` | SAFE | 0 | 0 | 0 |
| `src/config/smoke.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/config/smoke.test.js` | SAFE | 0 | 0 | 0 |
| `src/config/traffic.js` | NEEDS ATTENTION | 0 | 1 | 2 |
| `src/config/traffic.test.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/k6/background-volume.js` | NEEDS ATTENTION | 0 | 2 | 0 |
| `src/k6/front-door.js` | SAFE | 0 | 0 | 0 |
| `src/k6/journeys.js` | SAFE | 0 | 0 | 0 |
| `src/k6/readiness.js` | SAFE | 0 | 0 | 0 |
| `src/lib/address-book.js` | NEEDS ATTENTION | 0 | 3 | 0 |
| `src/lib/address-book.test.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/lib/background-volume.js` | SAFE | 0 | 0 | 0 |
| `src/lib/background-volume.test.js` | NEEDS ATTENTION | 0 | 1 | 0 |

## Positive Observations
- The routes and redirects match the ins-frontend exactly: the type page, the add form and the tab redirect.
- Summing the three tabs counts each address once, because each address has exactly one type.

## Test Coverage
- Unit tests: present. Two cannot fail (#12, #13).

## Risk Assessment
**Overall Risk:** Low
**Rationale:** No functional break. The type and the role the suite adds with are kept in two places (#9), and the hourly page count is slightly overstated (#14).

<!-- items table -->

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | README.md | 242 | Major | naming | One concept, two names: the README calls what an address is saved for 'a use' at :242 ('a save requires a use') and 'roles' at :260 ('An address holds roles from one tab only'), while the code posts roles: 'PLACE_OF_ORIGIN' (src/lib/address-book.js addAddressAnswers) and ins-frontend names the field roles. :93 also reads as though Place of origin itself is required ('ticking Place of origin, which a save requires'), when the save needs at least one role. | the README names the concept with the one word the code uses (roles) at :93, :242 and :260, and states that a save needs at least one role rather than implying Place of origin is required. | ':93 ... and ticking Place of origin, since a save needs at least one role'; ':242 ... (a save needs at least one role)'. |  |  |  |
| 2 | src/config/smoke.js | 68 | Major | duplication | Two homes for the address-book session's request list: SCENARIOS['ins-address-book'].endpoints is now INS_PAGES (endpoints.js:11, the catalogue of every INS page), while src/lib/address-book.js:18 ADDRESS_BOOK_SESSION_ENDPOINTS separately names each request the session makes after sign-in and the dashboard. The scenario's per-endpoint thresholds and report keys (thresholds.js scenarioThresholds) follow INS_PAGES, so an INS page added to the catalogue that the address-book session never requests gains a threshold on this scenario, and a request added to ADDRESS_BOOK_SESSION_ENDPOINTS only gets one if INS_PAGES is edited too. | the address-book scenario's endpoint list is derived from the one list that names the requests an address-book session makes, so adding an INS page elsewhere cannot change it. | endpoints: ['sign-in', 'ins-dashboard', ...new Set(Object.values(ADDRESS_BOOK_SESSION_ENDPOINTS))], keeping INS_PAGES for the catalogue alone. | Merged | — | merged into #14 |
| 3 | src/config/traffic.js | 21 | Major | naming | The rename that took source codes out of the constant names stops part-way: GBN_AG_ANNUAL_NOTIFICATIONS and GBN_PP_ANNUAL_NOTIFICATIONS (:21, :22, used at :214, :215, :217) still carry the AG/PP codes the PR removed from AG1_/PP1_/PP2_ names, and the new names mix two words for one journey: PLANTS_PAGES_PER_NOTIFICATION, PLANTS_SESSION_MINUTES and PLANTS_PEAK_DAY_NOTIFICATIONS beside HIGH_RISK_PLANTS_NOTIFICATIONS_PER_HOUR (:14) and the model key highRiskPlants. | every journey constant in traffic.js names its journey with one word set and no volumetrics code, matching the model keys (liveAnimals, highRiskPlants). | LIVE_ANIMALS_ANNUAL_NOTIFICATIONS and HIGH_RISK_PLANTS_ANNUAL_NOTIFICATIONS, and HIGH_RISK_PLANTS_PAGES_PER_NOTIFICATION, HIGH_RISK_PLANTS_SESSION_MINUTES, HIGH_RISK_PLANTS_PEAK_DAY_NOTIFICATIONS. |  |  |  |
| 4 | src/config/traffic.js | 74 | Minor | comments | The doc comment on SIGN_IN_AND_DASHBOARD_PAGES ('The page requests an INS session makes on opening: the sign-in plus the dashboard.') restates the constant's name. | SIGN_IN_AND_DASHBOARD_PAGES carries no comment that repeats its name. | delete the line-74 doc comment. |  |  |  |
| 5 | src/config/traffic.js | 76 | Minor | correctness | ADDRESS_BOOK_SESSION_PAGES, now derived from Object.keys(ADDRESS_BOOK_SESSION_ENDPOINTS), counts worstCaseSearch on every session (13 pages), but front-door.js searchWorstCaseWhenChosen makes that request only on addressBook.worstCaseSearchShare of sessions (0.25 by default). scenarioPagesPerHour (:815) therefore reports 260 INS pages an hour for ins-address-book at the defaults when sessions make 245, and design-target.js:763 sizes the INS spike pace (x11.9) from that figure, so the INS front door spike lands below its stated 5 RPS. iterationSeconds (:838) wants the maximum and is right to use 13. | the pages-an-hour figure for ins-address-book counts the worst-case search at its share, while the longest-iteration figure still counts it on every session. | keep ADDRESS_BOOK_SESSION_PAGES as the longest session for iterationSeconds and use (ADDRESS_BOOK_SESSION_PAGES - 1 + model.addressBook.worstCaseSearchShare) in scenarioPagesPerHour, re-baselining traffic.test.js and design-target.test.js. | Merged | — | merged into #14 |
| 6 | src/config/traffic.test.js | 623 | Major | naming | The test title 'amends 20 and cancels 1 of 100 notifications at the c-012 defaults' still carries the ruling id c-012, which this PR removed from traffic.js by renaming C012_AMENDED_SHARE and C012_CANCELLED_SHARE_OF_AMENDED to AMENDED_SHARE and CANCELLED_SHARE_OF_AMENDED. The rename has not reached the test title, and the house rules ban ruling ids in test titles. | the test title names no ruling id and states what the assertions prove. | 'amends 20 and cancels 1 of 100 notifications at the default shares'. |  |  |  |
| 7 | src/k6/background-volume.js | 20 | Major | structure | RESULTS_LABEL ('[data-testid="address-book-results-label"]') sits at module scope but only tabAddressCount (line 58) reads it; the house rule puts a literal used by one function inside that function (this PR applied that rule to editedTown in front-door.js but not here). | the results-label selector lives inside the one function that reads it. | move it into tabAddressCount as a local const. |  |  |  |
| 8 | src/k6/background-volume.js | 24 | Major | structure | unreadableVolumeError(datastore, detail) branches on a missing detail (`detail ? ` (${detail})` : ''`), but every caller this PR writes passes one (lines 33, 39, 52, 62), so the no-detail branch is unreachable code. | unreadableVolumeError has no branch no caller reaches. | make detail required and always append ` (${detail})`. |  |  |  |
| 9 | src/lib/address-book.js | 41 | Major | structure | The address type the suite adds with (ADDED_ADDRESS_TYPE, line 11) and the role it ticks ('PLACE_OF_ORIGIN', a literal in addAddressAnswers line 41) are one choice kept in two places. Change ADDED_ADDRESS_TYPE to, say, BRANCH and the ins-frontend drops the role the type does not offer (keepRolesOfferedBy, add.controller.js:351) then refuses the empty list (rolesErrorsOf, :340), so every add answers 400. | the role the suite ticks comes from the same definition as the type it adds with, so changing one cannot leave the other wrong. | define the added type and its role together (e.g. ADDED_ADDRESS = { addressType: ORIGIN_OR_CONSIGNOR, role: 'PLACE_OF_ORIGIN' }) and read both from it. |  |  |  |
| 10 | src/lib/address-book.js | 1 | Major | naming | ADDRESS_BOOK holds the path '/address-book', but its name does not say path, while its sibling ADDRESS_TYPE_START_PATH (line 9) does; front-door.js imports it next to TRAFFIC_CLASSES.ADDRESS_BOOK, which is the traffic class 'address-book', so one name reads as two different values in the same module. | the constant's name says it is the address book's path. | rename to ADDRESS_BOOK_PATH and update front-door.js, readiness.js and addressIdFrom/addressBookListPath. |  |  |  |
| 11 | src/lib/address-book.js | 16 | Major | comments | The ADDRESS_BOOK_SESSION_ENDPOINTS doc comment describes its caller, not the constant: 'A session makes all of them when its worst-case search is chosen' (line 16) narrates addressBookSession in k6/front-door.js. The house rule says a comment describes only the lines below it. | the doc comment states only what the constant holds. | keep 'The endpoint name of each address-book request after the dashboard, one entry per request' and delete the sentence about what a session does. | Merged | — | merged into #14 |
| 12 | src/lib/address-book.test.js | 16 | Major | test-readability | Title 'the %s request is tagged with %s, an endpoint in the catalogue' claims a request is tagged with the endpoint, but the 'tagged with' half is the map entry the test reads its own inputs from (test.each over ADDRESS_BOOK_SESSION_ENDPOINTS), so no line of front-door.js can turn it red. The assertion only proves the endpoint name is in ENDPOINTS. | the title states only what the assertion proves. | 'the %s request's endpoint %s is in the endpoint catalogue'. |  |  |  |
| 13 | src/lib/background-volume.test.js | 51 | Major | test-readability | 'keeps an empty tab in the sum' cannot fail: sumAddressCounts([7, 0, 0]) is 7 whether the zero tabs are kept or dropped, so no change to sumAddressCounts that drops empty tabs turns it red. It repeats the 'adds the counts of the tabs' case with zeros. | every sumAddressCounts test can fail on a change to its body, and its title states what it proves. | delete the test, or replace it with 'is 0 when every tab is empty' asserting sumAddressCounts([0, 0, 0]) is 0 (fails if the reduce loses its 0 start). |  |  |  |
| 14 | src/lib/address-book.js | 16 | Major | structure | One rule, 3 findings: #2, #5, #11 — the address-book session's requests are counted from ADDRESS_BOOK_SESSION_ENDPOINTS (its doc comment describing its caller), while the smoke scenario's thresholds follow INS_PAGES, and the page count assumes the worst-case search on every session (260 against a true 245 an hour). | ADDRESS_BOOK_SESSION_ENDPOINTS is the one owner of the session's requests; the smoke scenario and the hourly page count are built from it. | build the scenario's endpoints from it plus sign-in and the dashboard, weight worstCaseSearch by the search share in scenarioPagesPerHour, and say what the constant holds in its doc comment |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
