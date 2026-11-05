# Consistency Check: trade-imports-plants-frontend

**Ticket:** EUDPA-711
**All repos in scope:** trade-imports-address-book, trade-imports-animals-frontend, trade-imports-ins-frontend, trade-imports-ins-tests, trade-imports-performance-tests, trade-imports-plants-frontend, trade-imports-workspace
**PR:** #132 | **Commit:** 8475f4f

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Address creates send `roles` (API now refuses a create without them) | ins-frontend lighthouse `seed-address.js:73` ✅, performance-tests `addAddressAnswers` ✅, ins-tests seeds ✅, animals-frontend `scripts/lighthouse/seed-address-book.js` ✅ | ✅ `scripts/lighthouse/seed-address-book.js:46` `roles: ['PLACE_OF_ORIGIN']` | CONSISTENT |
| Twin parity of the seed script | animals-frontend: byte-identical file (`diff` exit 0) | ✅ | CONSISTENT |
| Seeded role fits the seeded country | `PLACE_OF_ORIGIN` (sending group, any country) with `countryCode: 'GB'`; satisfies `RolesHeldTogether` and `ReceivingRolesInTheUnitedKingdom` | ✅ | CONSISTENT |
| Address-book reads (`services/address-book/client.js`) | Only GET `listAddresses`/`getAddress`; no write, so no `roles` needed | n/a | EXPECTED |
| Security overrides for joi / @hapi/content | ins-frontend pins them with `overrides` in this PR (`package.json:127-132`) | Lock already resolves joi 18.3.1, bell/catbox-redis joi 17.13.9, @hapi/content 6.0.3 with no override | EXPECTED (same versions installed; mechanism noted on ins-frontend's check) |

## Missing Changes

*None identified.* The frontend never creates an address in the app itself (the add page belongs to the INS frontend), so the lighthouse seed is the only write path.

## Unique Changes

*None identified.* The one change is shared with the twin.

## Naming and Reuse

*None identified.* `roles` and `PLACE_OF_ORIGIN` are the API's own names, used as-is in both twins.

## Statements Made Untrue

*None identified (searched: `seed-address-book`, `ensureAddressBookHasAnAddress`, `roles`, `address type`, `usages`, `createAddress` in `src/server/app/docs/*.md`, `README.md`, `scripts/lighthouse/*` and the JSDoc on `ensureAddressBookHasAnAddress`).*

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The lighthouse seed now sends a valid role, identically to its twin and to every other address-creating caller.
