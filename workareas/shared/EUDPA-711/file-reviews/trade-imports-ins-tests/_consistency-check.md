# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-711
**All repos in scope:** trade-imports-address-book, trade-imports-animals-frontend, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-frontend, trade-imports-workspace
**PR:** #77 | **Commit:** 29887c3

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Seeds and API-client creates send `roles` | address-book requires them ✅ | ✅ `adapters/http/address-book-api-client.ts:22`, `flows/shared/address-book-seed.ts`, `heldAs*` constants | CONSISTENT |
| Role and address-type values | address-book `AddressRole` ✅, ins-frontend `ROLES`/`ADDRESS_TYPES` ✅ | ✅ `domain/shared/constants/address-types.ts` | CONSISTENT |
| Tab URL `?addressType=` | ins-frontend `list.controller.js:140` ✅ | ✅ `page-objects/ins/address-book/list-page.ts:24` | CONSISTENT |
| Role-question option order (places first) | ins-frontend `add.controller.js:124-145` `placeRolesFirst` ✅ | ✅ `rolesQuestionOptions` | CONSISTENT |
| Labels and messages ('Select what this address can be used for', 'Select an address type', legends) | ins-frontend `copy.en.js` ✅, address-book `@NotEmpty` message ✅ | ✅ `domain/ins/constants/address-book-types.ts` | CONSISTENT |
| Twin journey specs changed together | animals `addresses-copied`, `addresses-submit-freeze` ✅ and plants `addresses-copied`, `addresses-submit-freeze` ✅ | ✅ | CONSISTENT |
| New tests linked in openspec coverage | workspace `openspec/coverage/ins/address-book/coverage.json` holds the two new animals handshake tests ✅ | ✅ | CONSISTENT |

## Missing Changes

*None identified.* No Mongo seed fixture here holds address-book documents, so nothing staged into the stack needs roles.

## Unique Changes

- `page-objects/shared/opens-at-expected-url.ts` mixin, adopted by the INS list page and the animals-admin notifications page: test-repo-only refactor, fine.
- `page-objects/shared/escape-regex.ts`: see Naming and Reuse.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `page-objects/shared/escape-regex.ts:1` vs `page-objects/shared/type-ahead.ts:3` | A new shared `escapeRegex` beside an existing private `escapeRegExp` in the same folder, same character class, two spellings (`replace` + `'\\$&'` vs `replaceAll` + `String.raw`). | One helper | Have `type-ahead.ts` import `escapeRegex` from `escape-regex.ts` and delete its private copy |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `README.md:192-195` | "the address book checks only that a country is present, so that is the one way through the services alone to copy an address the notification refuses" | The address book now also refuses a consignee, importer or place of destination outside the United Kingdom (`ReceivingRolesInTheUnitedKingdom`); the country-name trick works only for an address held in a sending or branch role (the spec uses `heldAsConsignor`, `addresses-copied.spec.ts:161-166`) | README states the new behaviour | "…the address book checks only that a country is present for a place of origin, consignor or branch address (it refuses a receiving role outside the United Kingdom), so such a record is the one way…" |

*Searched: `checks only that a country`, `country is present`, `usages`, `uses`, `no type`, `category`, `addressType`, `escapeRegExp`, `address book` — in `README.md`, `docs/*.md`, TSDoc and line comments, and test titles under `tests/`.*

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 2 inconsistencies found
**Summary:** The tests mirror the API and frontend's roles, types, URLs and copy, but add a second regex-escape helper beside an existing one, and the README's account of what the address book checks on country is now partly untrue.
