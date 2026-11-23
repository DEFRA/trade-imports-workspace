# Consistency Check: trade-imports-plants-frontend

**Ticket:** EUDPA-827
**All repos in scope:** trade-imports-animals-frontend, trade-imports-plants-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #164 | **Commit:** ad743ba

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `ADDRESSES_A_PAGE = 8` | animals-frontend ✅, ins-tests ✅ | ✅ `address-book-picker/pagination.js:4` | CONSISTENT |
| `servedPageOf` + one info log on a page past the last | animals-frontend ✅ | ✅ `render.js` | CONSISTENT |
| `paginationLinks` / `govukPagination`, `null` under two pages | animals-frontend ✅ | ✅ | CONSISTENT |
| Paging links carry `q`, `page`, `selected` | animals-frontend ✅ | ✅ | CONSISTENT |
| Paging links carry the trail | animals-frontend ✅ (`results-href.js` → `withTrail(…, trail)`) | ❌ `pagination.js:29` `resultsHref(journeyId, slug, { query, page, selectedId })` takes no trail | INCONSISTENT |
| `PickerPagingSelection` client component | animals-frontend ✅ | ✅ (byte-identical) | CONSISTENT |
| Hidden `page` field, inset `selectedAddress`, `pagination` copy en + cy | animals-frontend ✅ | ✅ | CONSISTENT |
| Unit test for `pageNumber` (non-numeric, `0`, negative) | animals-frontend ✅ `request-params.test.js` | ❌ `pageNumber` inline at `picker-routes.js:17`, no test | INCONSISTENT |
| Unit test for page-number ellipsis | animals-frontend ✅ `page-numbers.test.js` (`[1, '…', 4, 5, 6, '…', 9]`) | ❌ `numbersToShow`/`itemsWithEllipses` in `pagination.js` untested; no stub list reaches 4+ pages | INCONSISTENT |
| Controller test: submitted search starts at page 1 | animals-frontend ✅ "Should start a search again at the first page" | ❌ none (spec REQ-PLANTS-ADDR-002 states it) | INCONSISTENT |
| Controller test: refused save re-renders the page it came from | animals-frontend ✅ | ❌ none | INCONSISTENT |
| Template test: hidden `page` field and inset between search and results | animals-frontend ✅ `_address-picker.test.js` | ❌ `results.test.js` covers paging only; no `template.njk` render test for the inset or page field (fit covers the inset) | Suspicious |
| E2E paging test in ins-tests | animals ✅ | ❌ no plants paging e2e (coverage SCN-PLANTS-ADDR-002-H marked partial for this reason) | INCONSISTENT (see ins-tests check) |
| Docs say the pickers page | animals ✅ `page-design.md` | ✅ `architecture.md`, set `README.md` | CONSISTENT, but `spec/journey-spec.json` not updated (below) |

## Missing Changes

1. **Paging links drop the trail.** `render.js` builds the back link and the Edit details href from `kit.requestTrail(request)` / `kit.trailBackLink(request)`, and the trail travels as a query parameter (`shared/trail.js:122` `withTrail`). `pagination.js:29` `resultsHref` builds `pagePath(journeyId, slug)?q&page&selected` with no trail, so a picker opened from Check your answers loses its trail on page 2: the back link falls back to the hub and the return target is lost. Animals passes `trail` into `resultsHref` for exactly this. Must: page links carry the request's trail. One way: give `paginationLinks`/`resultsHref` a `trail` argument fed from `kit.requestTrail(request)` in `render.js`, wrap with `withTrail`, and add a test that a page link from a trailed request carries `trail=`.
2. **Unit tests the animals twin has and this repo lacks** for the same rules: `pageNumber` (non-numeric/zero/negative → 1), ellipsis rendering, search resets to page 1, refused save keeps its page. The search reset is a spec MUST in `plants/addresses` REQ-PLANTS-ADDR-002 with no test here. Must: each rule has a test that fails without it. One way: mirror `request-params.test.js` (extract `pageNumber` to a module as animals did, or test through the POST handler), add a `pagination.test.js` for `paginationLinks`/ellipsis, and add the two POST cases to `controller-test-support.js`.

## Unique Changes

- `paging-test-support.js` (`describePaging`) runs the GET paging cases for all three pickers through `describeAddressBookPickerController`. Fits this repo's shared-suite pattern; intentional.
- Consignment contact picker pages too (no role). In ticket scope ("Consignment contact").
- `pickerViewModel` signature gains `journeyId, slug` positional args ahead of the state object — fine, but note animals' equivalent takes `journey, party`; each follows its own existing binding.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/server/app/sets/high-risk-plants/journeys/linear/features/address-book-picker/test-support.js:133` | `const ADDRESSES_A_PAGE = 8` redeclares the constant exported by `pagination.js:4` (which `paging-test-support.js` and `fit/high-risk-plants-journey.js` already import). | One value, one home. | `import { ADDRESSES_A_PAGE } from './pagination.js'` and delete the local copy. |
| `picker-routes.js:17` vs animals `request-params.js` | `pageNumber` is the same rule in both twins but untested here and hidden as a module-private helper. | Mirrored rule with its test. | Move to its own module (as animals) or test via the route; see Missing Changes 2. |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `fit/high-risk-plants-journey.js:1069` (JSDoc of `expectPickerResultsLayout`) | "lists every row on the one page with no page links" | The `Page \d` link assertion was removed in this PR; the helper now checks `rowCount` radios on the page shown, with or without page links. | Doc states the new behaviour. | Drop "on the one page with no page links": "…offers `rowCount` radios…". |
| `src/server/app/sets/high-risk-plants/spec/journey-spec.json:148` | "…a results govukTable … showing every address the picker's role holds on one page…" | Eight a page with GOV.UK pagination over eight, and a "Selected address" inset. | Spec states the new behaviour. | Replace with "eight a page, GOV.UK pagination where the role holds more than eight, the chosen address named above the results". |
| `src/server/app/sets/high-risk-plants/spec/journey-spec.json:2210` | widgetDetail: "every address the role holds, plus any address saved with no role, on one page" | As above. | As above. | As above. |
| `src/server/app/sets/high-risk-plants/spec/journey-spec.json:2545` | widgetDetail (contact picker): "showing every address on one page" | As above. | As above. | As above. |

Searched (`src/`, `fit/`, `README.md`, `AGENTS.md`, set docs, JSDoc, test titles, `spec/*.json`): `on one page`, `one page`, `no pagination`, `no page links`, `nothing between`, `every one of them`, `ADDRESSES_A_PAGE = `, `trail`. Other "one page" hits concern collections, the commodities line and the dashboard, not the pickers.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 8 inconsistencies found (trail dropped from page links; 4 missing twin tests; duplicate constant; stale fit JSDoc; 3 stale journey-spec.json statements counted as one)
**Summary:** Plants mirrors the animals paging rules but drops the trail from its page links, lacks the twin's unit tests for page parsing, ellipsis, search reset and refused-save page, redeclares `ADDRESSES_A_PAGE`, and leaves "on one page" in its fit helper JSDoc and set journey spec.
