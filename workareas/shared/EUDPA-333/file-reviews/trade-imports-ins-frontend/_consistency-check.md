# Consistency Check: trade-imports-ins-frontend

**Ticket:** EUDPA-333
**All repos in scope:** trade-imports-animals-frontend, trade-imports-animals-tests, trade-imports-ins-frontend, trade-imports-workspace
**PR:** #26 | **Commit:** f64b6fe4

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Cross-frontend browser-visible URL declared in convict (`TRADE_IMPORTS_{peer}_FRONTEND_URL`) | animals-frontend `tradeImportsInsFrontend.baseUrl` (config.js:355) | Present as `tradeImportsAnimalsFrontend.baseUrl` (config.js:384) with matching browser-visible doc-comment | CONSISTENT |
| Cross-frontend URL exported in local stack env | workspace `frontend.compose.yml` sets `TRADE_IMPORTS_INS_FRONTEND_URL=http://localhost:3002` for animals | Consumed via `TRADE_IMPORTS_ANIMALS_FRONTEND_URL=http://localhost:3000` present in the same compose file | CONSISTENT |
| Handshake journey-type constant `gbn-ag` | animals-frontend `JOURNEY_TYPE = 'gbn-ag'` (ins-handshake.js) | `JOURNEY_TYPES.GBN_AG = 'gbn-ag'` in `journey-registry.js` | CONSISTENT — the two literals must match by contract; independently defined per the ticket's "INS must not derive one from the other" rule |
| Return-path template `/notifications/{id}/address-return?fulfilment-id={fid}` | animals-frontend registers matching route in `address-return/controller.js` | `journey-registry.js` builds exactly that path with URI-encoded ids | CONSISTENT |
| Handshake error surface (`handshakeError=not-found\|unavailable`) on return | animals-frontend consumes these codes on the picker/contact pages; animals-tests exercises the cancel/return path | INS emits `addressId=…` on success and no query on cancel; it does not emit error codes (the animals `address-return` controller derives `not-found`/`unavailable` from address-book fetch results) | CONSISTENT (asymmetric by design — errors are computed animals-side after the round-trip) |
| Cookie/session name divergence on localhost | animals-tests `authCookieNameFor` picks `ins-sid` when target is INS on `localhost:3002`; workspace compose sets `SESSION_CACHE_NAME=ins-session` and `AUTH_SESSION_COOKIE_NAME=ins-sid` | Convict defaults `auth.cookieName='ins-sid'` and `session.cache.name='ins-session'` in dev; plugin now reads `auth.cookieName` | CONSISTENT — all three sides (config default, compose env override, test fixture) agree on `ins-sid` in local dev |
| CSP `formAction` extended to peer origin | Peer-only pattern (animals-frontend does not receive form POSTs from INS) | `formAction: ['self', animalsFrontendOrigin]` — required because the add-form POST returns a 302 to animals; browsers enforce `form-action` across the redirect chain | CONSISTENT (asymmetric by design) |
| Guard for unrecognised journey type | animals-tests `address-book-add-handshake-guard.spec.ts` asserts 404 | `handshake-context.js` throws `Boom.notFound()` when `!isKnownJourneyType`; unit test covers it; controller test asserts 404 for `?journey-type=not-a-journey` | CONSISTENT |
| Fail-fast on missing/malformed config | animals-frontend adds two convict entries validated at boot (`config.validate({allowed:'strict'})`) | Adds `tradeImportsAnimalsFrontend.baseUrl` beside the other `TRADE_IMPORTS_*_URL` entries; already covered by the same `config.validate` at the file foot | CONSISTENT |

## Missing Changes

- **Auth redirect URL-encoding** (`src/server/plugins/auth.js`). Animals-frontend added `encodeURIComponent` around the `?redirect=` value in its `redirectTo`, because a query-string-carrying URL (like the new handshake link) loses its tail otherwise. INS's `auth.js` diff adds `cookie.name` but the file's `redirectTo` (if it has one) was not modified in this PR. If INS's `redirectTo` writes a raw `pathname+search` into a `redirect` query param, the same bug will bite: a Trader who is signed out when arriving at `/address-book/add?journey-type=gbn-ag&notification-id=…&fulfilment-id=…` and is bounced through sign-in will lose the two `&`-separated tail params. The animals-tests spec updates its assertion to the percent-encoded form (`%2Forigin%3Fa%3D1`) — INS has no equivalent update. Recommend confirming whether INS's own sign-in redirect path already handles this or needs a matching fix.

## Unique Changes

- **`esbuild@0.28.1` added to devDependencies + `vite.config.js` sets `cssMinify: 'esbuild'`** — no peer needs this; INS uses Vite and animals-frontend does not. Legitimate, scope-adjacent but not gated by the ticket. Worth flagging in review as arguably out of scope for EUDPA-333.
- **`handshake-context.js` + tests** — session-backed handshake state that survives the POST-redisplay cycle. Peer-independent; animals-side needs no equivalent because it never re-renders the INS form.
- **`journey-registry.js` + tests** — the single source of truth for the return-URL template. Peer-independent by design (the whole point is that animals never sees this shape).
- **`session-keys.js` gains `addressBookHandshake`** — internal only.
- **`content-security-policy.test.js`** updated to assert the new `formAction` allowlist entry — matches the source change; no peer test to align.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 1 inconsistency found
**Summary:** Symmetric handshake artefacts (journey-type literal, return-path template, cross-frontend convict entry, session-name split) all line up; the one missing peer change is the auth `redirectTo` URI-encoding fix that animals added but INS did not — same class of bug applies to both frontends when a query-string-carrying URL is bounced through sign-in.
