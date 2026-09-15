# Repository Review: trade-imports-animals-tests

**PR:** #204
**Commit:** 5c99e321d4d464c276a9de696c8a3684d4699c31
**Files Changed:** 7

## Summary

E2E coverage of the address-book add handshake. Adds the happy-path spec (party picker → INS add form → save → return with new address selected), the unrecognised-journey-type guard, the cancel-and-return, and read-only variants for both party-picker and contact-address entry points. Fixture wiring gains an INS-vs-animals cookie split so the mint-once/inject-many auth pattern keeps working when the two frontends share `localhost`.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `fixtures/auth-state.ts` | NEEDS ATTENTION | 0 | 1 | 1 |
| `page-objects/ins/ins-address-book-add-page.ts` | SAFE | 0 | 0 | 0 |
| `page-objects/notification/party-picker-page.ts` | SAFE | 0 | 0 | 0 |
| `tests/e2e/features/addresses-add-handshake.spec.ts` | NEEDS ATTENTION | 0 | 1 | 1 |
| `tests/e2e/features/addresses-read-only.spec.ts` | SAFE | 0 | 0 | 0 |
| `tests/e2e/features/ins/address-book-add-handshake-guard.spec.ts` | SAFE | 0 | 0 | 0 |
| `tests/e2e/pages/contact-address.spec.ts` | SAFE | 0 | 0 | 0 |

## Positive Observations

- The stub-vs-compose split on `addresses-read-only.spec.ts` and `contact-address.spec.ts` keeps both entry points asserted in the two environments the app runs in, using the existing `skipIfComposeEnvironment` / `skipUnlessComposeEnvironment` helpers consistently.
- The guard spec (`address-book-add-handshake-guard.spec.ts`) is a proper wire-level assertion of the "unrecognised journey type is refused" AC — INS returns 404, matched by the visible "Page not found" text.
- Page-object additions are semantic role-based locators throughout — no CSS selectors, no test IDs. `ensureSignedIn` correctly wraps `signInWhenRequested(true, options)` for the cross-app landing where a `goto` would be wrong.
- The happy-path spec asserts save-and-select on the return, and the cancel spec asserts return-to-picker with `Not added yet` — both mapping cleanly to the AC's "Adding an address" / "Leaving without saving" clauses.

## Test Coverage

- **Unit tests:** N/A (E2E-only repo).
- **Integration tests:** New handshake happy-path, cancel, guard, and read-only variants for both entry points. Coverage of the "wrong-organisation" and "unresolvable id" ACs happens at the animals-frontend unit-test boundary (see the coverage minor on `address-return/controller.test.js` in the frontend review).

## Risk Assessment

**Overall Risk:** Medium
**Rationale:** Two Major findings that will bite in shared environments — the fixture hardcodes cookie name against INS's `localhost:3002` literal (breaks the moment INS is on `127.0.0.1` or a different port), and the handshake spec pins its URL assertion to `localhost:3002` which will fail under the `cdp-docker.test` compose environment that the same `skipUnlessComposeEnvironment` guard allows through. Both are portable-tests fixes, not correctness bugs in production code.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | fixtures/auth-state.ts | 24 | Major | coupling | authCookieNameFor hardcodes the INS-vs-animals cookie decision here, duplicating a choice the INS server actually makes from NODE_ENV (config.js:271 'ins-sid' when isDevelopment, else 'sid'); a rename or new dev-only variant on INS silently breaks stripToAuthCookie with 'produced no sid cookie to save'. | Move the expected cookie name onto AuthTarget as a per-target property (e.g. AUTH_TARGETS.ins.cookieName) read once at mint time — or source it from the same AUTH_SESSION_COOKIE_NAME env var INS uses — so both sides share one source of truth. | Fix | Done | 3d9231e |
| 2 | fixtures/auth-state.ts | 24 | Minor | fragility | baseUrl.includes('localhost:3002') matches by port literal — a dev overriding INS_FRONTEND_PORT, running INS through 127.0.0.1, or fronting it with a container-internal host still gets NODE_ENV=development on the server (so ins-sid) but sid on the filter, and stripToAuthCookie throws. | Once the cookie name is a per-target property (see the coupling finding), the URL-literal check goes away; alternatively, key the switch on targetName === 'ins' && isLocalHost(baseUrl) with isLocalHost handling both localhost and 127.0.0.1 rather than pinning the port. | Fix | Done | 3d9231e |
| 3 | tests/e2e/features/addresses-add-handshake.spec.ts | 31 | Major | portability | The INS URL assertion is hardcoded to `localhost:3002`, but `isComposeEnvironment()` also returns true for the `cdp-docker.test` compose environment where INS is not on localhost — the test would fail there. | Assert against the configured INS base URL: build the regex from `process.env.TRADE_IMPORTS_INS_FRONTEND_BASE_URL` (the same value the base page's `navigateToInsFrontend` uses), so the spec follows the environment rather than pinning to a port only the local compose stack uses. | Fix | Done | 3d9231e |
| 4 | tests/e2e/features/addresses-add-handshake.spec.ts | 36 | Minor | playwright-conventions | Uses `page.waitForURL(regex, { timeout: 15_000 })` where the rest of the test suite uses the web-first `await expect(page).toHaveURL(regex)`, which auto-retries against the default expect timeout. Both occurrences (lines 36 and 61) then assert the same URL again on the next line (lines 39 and 64), which is redundant. | Drop the `waitForURL` calls and rely on `await expect(pages.page).toHaveURL(/consignors\/select/)` alone — matching the convention used elsewhere in `tests/e2e/features/` and BEST_PRACTICES.md's "web-first assertions" section. If a longer timeout is genuinely needed for the cross-service round-trip, pass `{ timeout: 15_000 }` on the `expect` instead. | Fix | Done | 3d9231e |

