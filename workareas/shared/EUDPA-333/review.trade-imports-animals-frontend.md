# Repository Review: trade-imports-animals-frontend

**PR:** #312
**Commit:** 4a93df44e8b5edf7ca01314ca12fe8288b0bf913
**Files Changed:** 22

## Summary

Animals-frontend side of the address-book handshake: adds the outbound link from party-picker and contact-address, the `/address-return` route that lands the trader back on the right picker with the newly-created address selected, the `obligation-party-map` that derives the reverse binding from the existing feature bindings (per the ticket's "no seventh party can be added without appearing here" rail), the `tradeImportsInsFrontend.baseUrl` and `tradeImportsAddressBookApi.baseUrl` convict entries that make the two service locations fail-fast, and a matching `stubH().redirect().code(...)` helper. Also picks up a latent auth-redirect encoding bug so query-string-carrying URLs (the new handshake link) survive a sign-in bounce.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `scripts/lighthouse/audit-targets.js` | SAFE | 0 | 0 | 0 |
| `src/config/config.js` | SAFE | 0 | 0 | 0 |
| `src/plugins/auth.js` | SAFE | 0 | 0 | 0 |
| `src/plugins/auth.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/engine/test-support.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/services/address-book/client.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/address-return/controller.js` | RISKY | 1 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/address-return/controller.test.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/copy/copy.cy.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/copy/copy.en.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/ins-handshake.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/ins-handshake.test.js` | SAFE | 0 | 0 | 1 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/obligation-party-map.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/obligation-party-map.test.js` | NEEDS ATTENTION | 0 | 1 | 2 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-picker/_address-picker.njk` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-picker/party-picker.controller.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-picker/party-picker.controller.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-picker/party-picker.njk` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/contact/controller.js` | SAFE | 0 | 0 | 2 |
| `src/server/app/sets/live-animals/journeys/linear/features/contact/controller.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/contact/template.njk` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/index.js` | SAFE | 0 | 0 | 0 |

## Positive Observations

- The reverse binding in `obligation-party-map.js` follows the ticket's tech-note guidance literally — derives from `evaluation.js` bindings rather than hand-listing six UUIDs, so a seventh party cannot be added without appearing here.
- `ins-handshake.js` uses `URLSearchParams` (correct encoding) and normalises trailing slashes on the INS base URL defensively; unknown-party returns `undefined` so the "Add" link cleanly hides.
- Both entry-point controllers (party-picker and contact) whitelist `?handshakeError=` values before they reach the view — no XSS surface from the query param.
- `?redirect=` in `auth.js` now percent-encodes, which is a real latent bug fix — the new handshake link carries `&`-separated tail params that would otherwise be lost through the sign-in bounce.
- The one return route (rather than six) matches the tech-note guidance, resolving `fulfilment-id` back to a party via the derived map.
- Stub-mode gate is honoured everywhere the "Add address" link is emitted, satisfying the AC that the link must be hidden or inert when INS is not running.

## Test Coverage

- **Unit tests:** Present and thorough for the new modules (`address-return/controller.test.js`, `ins-handshake.test.js`, `obligation-party-map.test.js`, both party-picker and contact test updates). Sixth-party-added-here rail is proven by the map test.
- **Integration tests:** Belong to the tests repo (see `review.trade-imports-animals-tests.md`) — cross-service handshake happy path, guard, cancel, add-link presence/absence in stub vs compose are all covered there.

## Risk Assessment

**Overall Risk:** Medium
**Rationale:** One correctness bug — the `recoverableSave` failure branch in `address-return/controller.js` chains `.code(500)` onto an `h.redirect(...)`, and browsers do not follow `Location` on 5xx, so the trader sees a blank 500 instead of the picker with the "unavailable" banner. Directly contradicts the AC. Everything else is minor.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/server/app/engine/test-support.js | 46 | Minor | clarity | stubH().redirect uses Object.defineProperty to attach code() without a comment explaining why (making it non-enumerable so existing toEqual({ redirect: ... }) assertions keep matching); the sibling stubView on line 26 uses a plain method, and the divergence looks accidental at a glance. | Add a one-line comment above the defineProperty call — e.g. // Non-enumerable so tests that assert toEqual({ redirect: to }) still match after chaining .code(...) — or align with stubView's style if enumerability doesn't matter for callers. |  |  |  |
| 2 | src/server/app/sets/live-animals/journeys/linear/features/addresses/address-return/controller.js | 79 | Critical | correctness | recoverableSave failure branch calls .code(500) on an h.redirect(...), producing a 500 response with a Location header — browsers do not follow Location on 5xx, so the trader sees a blank 500 instead of the picker with the 'unavailable' banner (breaking the AC 'the Trader sees an error and their existing journey answers are preserved'). Sibling handlers (party-picker.controller.js commitSelection, delete-notification, contact) apply .code(500) to a rendered h.view(...) response, not to a redirect. | In the recoverableSave onRecoverableFailure callback, render the picker directly (mirroring party-picker's commitSelection — resolve the journey and answers via state.get, call the picker render function with recoverableError: true and .code(HTTP_STATUS_INTERNAL_SERVER_ERROR)); OR return a plain redirect (2xx) without the 500 code so the browser follows it to the picker with handshakeError=unavailable. |  |  |  |
| 3 | src/server/app/sets/live-animals/journeys/linear/features/addresses/address-return/controller.test.js | 92 | Minor | coverage | No test asserts the AC-required behaviour for a returned addressId belonging to a different organisation than the current session; today it is only implicitly covered via the not-found path. | Add a test that spies on addressBook.party to return a record from the wrong org (or use a distinct orgId in the request) and asserts a handshakeError=not-found redirect, so the AC is nailed down at the controller boundary and cannot regress if the address-book client stops filtering by org. |  |  |  |
| 4 | src/server/app/sets/live-animals/journeys/linear/features/addresses/ins-handshake.test.js | 21 | Minor | weak-assertion | Test 'maps each party obligation to its fulfilment id' asserts only toBeTruthy() on each mapping, so a party swapped with the wrong obligation id (or CONTACT mapped to a party's id) would still pass; concrete-value coverage lives only in obligation-party-map.test.js. | Assert obligationIdForParty(party) === expected id per party (e.g. import the obligations and check obligationIdForParty(consignor-party) === consignor.id, or use expect.toBe for each) so the file's own suite catches a mis-wiring rather than relying on the sibling map test. |  |  |  |
| 5 | src/server/app/sets/live-animals/journeys/linear/features/addresses/obligation-party-map.test.js | 10 | Major | test-fragility | Four of the five party fulfilment IDs are hardcoded UUID literals that must stay in lockstep with obligations/sections/parties.js; only consignor.id is imported. If any of those obligation UUIDs is regenerated, this test fails with the confusing 'expected undefined to be placeOfOrigin' rather than pointing at the source of truth. | Import placeOfOrigin/consignee/importer/placeOfDestination/contactAddress from ../../../../obligations/index.js and use their .id — same as the existing consignor.id line — so the test cannot drift from the manifest. |  |  |  |
| 6 | src/server/app/sets/live-animals/journeys/linear/features/addresses/obligation-party-map.test.js | 8 | Minor | test-structure | Six independent mappings (five PARTIES + CONTACT_PARTY) are collapsed into one 'it' with a for-loop and a trailing separate assertion, so the first failure masks the rest and the contact case is not named in the test description. | Use it.each over a small table (or split into two its) so each mapping is a distinct test case and the CONTACT_PARTY case is visible in the test name. |  |  |  |
| 7 | src/server/app/sets/live-animals/journeys/linear/features/addresses/obligation-party-map.test.js | 18 | Minor | assertion-diagnostics | 'partyForFulfilmentId(fulfilmentId)?.id' collapses the two failure modes — 'lookup missed' vs 'wrong party returned' — into the same 'expected undefined to be <id>' message. | Assert the returned party is defined first (or assert on the whole party object) so a lookup miss reports differently from a wrong-party mismatch. |  |  |  |
| 8 | src/server/app/sets/live-animals/journeys/linear/features/contact/controller.js | 37 | Minor | duplication | handshakeErrorMessage duplicates the identical helper in addresses/party-picker/party-picker.controller.js — same mapping of not-found/unavailable to copy strings | Extract handshakeErrorMessage into ins-handshake.js (or a sibling module) and reuse it from both controllers so a new handshake error code only needs to be handled once |  |  |  |
| 9 | src/server/app/sets/live-animals/journeys/linear/features/contact/controller.js | 35 | Minor | coupling | Contact feature reaches into ../addresses/copy/copy.{en,cy}.js for handshakeErrors and addNewAddress strings — cross-feature copy dependency that ties two features' user-facing text together implicitly | Hoist the shared handshake error strings and the 'Add a new address' label into shared/copy.<locale>.js (or a new addresses-handshake copy module) so both features import them from the same shared location instead of contact reaching into addresses |  |  |  |

## Consistency

See `file-reviews/trade-imports-animals-frontend/_consistency-check.md`. Status: CONSISTENT — all symmetric handshake artefacts appear on both sides. One cross-repo note is flagged in the ins-frontend consistency check (mirror the auth `redirectTo` encoding fix on INS's own auth plugin).

## Repository Verdict

**Status:** NEEDS ATTENTION
