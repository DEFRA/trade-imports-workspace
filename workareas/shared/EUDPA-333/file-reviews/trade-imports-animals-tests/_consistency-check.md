# Consistency Check: trade-imports-animals-tests

**Ticket:** EUDPA-333
**All repos in scope:** trade-imports-animals-frontend, trade-imports-animals-tests, trade-imports-ins-frontend, trade-imports-workspace
**PR:** #204 | **Commit:** 5c99e321

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| INS localhost cookie divergence (`ins-sid`) | ins-frontend defaults `auth.cookieName='ins-sid'` and workspace compose sets `AUTH_SESSION_COOKIE_NAME=ins-sid` | `fixtures/auth-state.ts` adds `authCookieNameFor()` returning `'ins-sid'` for INS on `localhost:3002` | CONSISTENT — the three sides (INS convict default, workspace compose env, tests fixture) agree on the same literal |
| Handshake link shape `/address-book/add?journey-type=gbn-ag&notification-id=…&fulfilment-id=…` | animals-frontend `ins-handshake.js` builds it; ins-frontend consumes it | E2E specs assert the anchor's `href` matches `/\/address-book\/add\?journey-type=gbn-ag/` on both party-picker (`addresses-read-only.spec.ts`) and contact-address (`contact-address.spec.ts`) pages | CONSISTENT |
| Unrecognised journey-type refused | ins-frontend `handshake-context.js` throws `Boom.notFound()`; ins-frontend unit test asserts it | `tests/e2e/features/ins/address-book-add-handshake-guard.spec.ts` proves it end-to-end via a browser hitting INS with `?journey-type=not-a-journey` and expecting "Page not found" | CONSISTENT — the unit test in INS covers the code path; this repo's E2E covers it in the wire | CONSISTENT |
| Add-link hidden in stub mode / shown when compose stack is running | animals-frontend controllers gate on `isStubMode()` | `addresses-read-only.spec.ts` and `contact-address.spec.ts` split each assertion into `skipIfComposeEnvironment` and `skipUnlessComposeEnvironment` variants; the compose-only variant asserts the link is present with the correct `href` | CONSISTENT |
| Cancel returns Trader to originating page without saving | ins-frontend serves the "Cancel and return to address page" button when handshake context is present | Handshake add-handshake happy-path spec asserts saved-and-selected; cancel spec asserts return-to-picker with `'Not added yet'` and no committed address | CONSISTENT with the AC "Leaving without saving" |

## Missing Changes

*None identified.* Every animals-side and INS-side change in this PR set has a corresponding E2E assertion here — the handshake link is checked on both entry points (party picker + contact), the guard is checked in a browser, the cancel and happy paths are both exercised, and the localhost cookie split is honoured in `auth-state.ts`.

## Unique Changes

- **`btnCancelFromJourney`** locator on `InsAddressBookAddPage` — pairs 1:1 with the new label INS renders when handshake context is present (`"Cancel and return to address page"` vs the old `"Cancel and return to address book"`). Correctly duplicates INS's own label switch — reasonable duplication because Playwright needs a locator per label.
- **`ensureSignedIn`** on the same page object — new helper for the cross-app landing case where INS is hit fresh without an existing session. Peer-independent; INS itself relies on hapi-auth-cookie's own sign-in redirect.
- **`stripToAuthCookie` gained an optional `cookieName` parameter** with default `AUTH_COOKIE_NAME` — backward compatible; the only new caller is `createAuthState` in this file. No cross-repo peer.
- **Skip helpers `skipIfComposeEnvironment` / `skipUnlessComposeEnvironment`** — imported here for the first time on these specs. Pattern already exists in `@utils/playwright/environment`; consistent use with other integration-tagged specs.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Every observable handshake artefact — link shape on both entry points, cookie split, cancel/save labels, guard 404 — is exercised end-to-end, matching the changes on both animals-frontend and ins-frontend sides.
