# Consistency Check: trade-imports-performance-tests

**Ticket:** EUDPA-711
**All repos in scope:** trade-imports-address-book, trade-imports-animals-frontend, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-frontend, trade-imports-workspace
**PR:** #27 | **Commit:** ed4724a

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Add-address form post carries `roles` | ins-frontend form field `roles` ✅, ins-frontend lighthouse seed posts `roles: 'PLACE_OF_ORIGIN'` ✅ | ✅ `src/lib/address-book.js:39-43` `addAddressAnswers` | CONSISTENT |
| Address type step before the add form (`/address-book/add/address-type?start=true`) | ins-frontend route `GET/POST /address-book/add/address-type` ✅ | ✅ `ADDRESS_TYPE_START_PATH`, endpoints `ins-address-type`, `ins-address-type-save` | CONSISTENT |
| Address type values | ins-frontend `ADDRESS_TYPES` ✅, ins-tests `addressTypes` ✅ | ✅ `src/lib/address-book.js:3-7` | CONSISTENT |
| Tab list URL `?addressType=` | ins-frontend `list.njk:67` / `list.controller.js:140` ✅ | ✅ `addressBookListPath` | CONSISTENT |
| Saved role fits the chosen type and its landing tab | `PLACE_OF_ORIGIN` belongs to `ORIGIN_OR_CONSIGNOR` (`ADDED_ADDRESS_TYPE`) ✅ | ✅ | CONSISTENT |
| Background volume counts per tab | README:260 "An address holds roles from one tab only" matches the API's `RolesHeldTogether` ✅ | ✅ `src/k6/background-volume.js:81` | CONSISTENT |

## Missing Changes

*None identified.*

## Unique Changes

*None identified.* `ADDRESS_TYPES` is a deliberate copy of the frontend's values: a k6 suite cannot import from the frontend repo.

## Naming and Reuse

*None identified.* Names follow the frontend and API (`roles`, `addressType`, `ADDRESS_TYPES`).

## Statements Made Untrue

*None identified (searched: `whole book`, `one list`, `address book`, `add an address`, `roles`, `uses`, `category`, `addressType` — in `README.md`, JSDoc in `src/lib/*.js` and `src/k6/*.js`, and test titles in `src/**/*.test.js`). README:93 and :260 already describe the type step, the required role and per-tab counting.*

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The k6 suite's add, list and background-volume paths match the frontend's type step, `roles` field and tab URLs.
