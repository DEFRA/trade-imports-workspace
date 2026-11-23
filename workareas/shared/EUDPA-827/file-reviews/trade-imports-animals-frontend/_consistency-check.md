# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-827
**All repos in scope:** trade-imports-animals-frontend, trade-imports-plants-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #510 | **Commit:** c5ec124

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `ADDRESSES_A_PAGE = 8` | plants-frontend ✅ (`pagination.js:4`), ins-tests ✅ (`address-picker-results.ts`) | ✅ `view-model/pagination/index.js:9` | CONSISTENT |
| `servedPageOf` + one info log "Address picker page is past the last page, serving the last page" | plants-frontend ✅ (`render.js`) | ✅ `party-picker.controller.js` | CONSISTENT (log ids differ by each repo's own vocabulary: `partyId` here, `fieldName` in plants — expected) |
| `paginationLinks` / `govukPagination` under the results, `null` under two pages | plants-frontend ✅ | ✅ | CONSISTENT |
| Paging links carry `q`, `page`, `selected` | plants-frontend ✅ | ✅ | CONSISTENT |
| Paging links carry the trail | plants-frontend ❌ | ✅ `results-href.js` (`withTrail`) | INCONSISTENT — fault is in plants (see plants check) |
| `PickerPagingSelection` client component + `data-module` on the form | plants-frontend ✅ (byte-identical source) | ✅ | CONSISTENT |
| Hidden `page` field in the form | plants-frontend ✅ | ✅ | CONSISTENT |
| `selectedAddress` inset copy (en + cy) | plants-frontend ✅ | ✅ | CONSISTENT |
| `pagination.previous/next` copy (en + cy) | plants-frontend ✅ | ✅ | CONSISTENT |
| Submitted search resets to page 1 | plants-frontend ✅ | ✅ | CONSISTENT |
| Unit tests for `pageNumber`, page-number ellipsis, non-numeric page, search reset, refused save keeps page | plants-frontend ❌ (none of these five) | ✅ `request-params.test.js`, `page-numbers.test.js`, `party-picker.controller.test.js` | CONSISTENT here; gap is in plants |
| Repo docs updated to say the pickers page | plants-frontend ✅ (`architecture.md`, set `README.md`) | ✅ `page-design.md` | CONSISTENT |
| E2E paging test in ins-tests | plants ❌ | ✅ animals `addresses-picker.spec.ts` | Animals side present |

## Missing Changes

*None identified.* This repo is the more complete twin.

## Unique Changes

- Pagination split into `view-model/pagination/index.js`, `pagination/page-numbers.js`, `results-href.js` and `request-params.js`; plants puts the same rules in one `pagination.js` and keeps `pageNumber` inline in `picker-routes.js`. Same rules, mirrored; file layout differs to fit each repo's existing picker folder. Intentional, not a finding.
- The View link return now carries `?page=` (`party-picker.controller.test.js` "Should return a View link to the page of results the row was on"). Plants rows have a View details disclosure, not a link out of the journey, so no counterpart is needed. Expected.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/client/javascripts/components/picker-paging-selection.js` | Byte-identical file in plants-frontend (same blob `b1ce0d7f`). | — | Expected for twin frontends (one rule mirrored in each twin). No action. |

*No naming drift found within this repo.*

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/fit/hub-picker.fit.spec.js:735` | Test title: "clearing the search and searching with nothing entered lists every consignor address again, on one page" | The body now asserts `resultsCount(ADDRESSES_A_PAGE, CONSIGNOR_ADDRESS_COUNT)` and `ADDRESSES_A_PAGE` radios — the first page of eight out of nine, not every address on one page. | The title states what its assertions prove. | Retitle e.g. "clearing the search and searching with nothing entered opens the role's whole list again, from its first page" (the wording plants already uses), and update the matching `test` string in `openspec/coverage/live-animals/addresses/coverage.json` (the `SCN-ADDR-…` "Clearing the search restores the role's whole list" row). |

Searched (under `src/`, `README.md`, `AGENTS.md`, set docs, JSDoc and test titles): `on one page`, `one page`, `no pagination`, `no page links`, `nothing between`, `with no page`, `every address`, `PAGE_SIZE`. Remaining "one page" hits are about the journey's page order, collections and other lists, not the pickers.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 1 inconsistency found
**Summary:** The animals change is the complete twin; one fit test title still says "on one page" after its assertions moved to the first page of eight.
