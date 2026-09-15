# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-333
**All repos in scope:** trade-imports-animals-frontend, trade-imports-animals-tests, trade-imports-ins-frontend, trade-imports-workspace
**PR:** #312 | **Commit:** 4a93df44

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Cross-frontend browser-visible URL declared in convict (`TRADE_IMPORTS_{peer}_FRONTEND_URL`) | ins-frontend `tradeImportsAnimalsFrontend.baseUrl` (config.js:384) | Present as `tradeImportsInsFrontend.baseUrl` (config.js:355) with matching browser-visible doc-comment | CONSISTENT |
| Cross-frontend URL exported in local stack env | workspace `frontend.compose.yml` sets `TRADE_IMPORTS_ANIMALS_FRONTEND_URL=http://localhost:3000` for INS | Consumed via `TRADE_IMPORTS_INS_FRONTEND_URL=http://localhost:3002` added in the workspace compose | CONSISTENT |
| Address-book base URL normalisation (env → convict) | ins-frontend already reads its cross-service URLs through convict | `tradeImportsAddressBookApi.baseUrl` added; `services/address-book/client.js` now calls `config.get(...)` | CONSISTENT (ticket-mandated fix — the "third overdue entry") |
| Handshake journey-type constant `gbn-ag` | ins-frontend `JOURNEY_TYPES.GBN_AG = 'gbn-ag'` (journey-registry.js) | `JOURNEY_TYPE = 'gbn-ag'` in `ins-handshake.js` | CONSISTENT — same literal on both sides, independently defined per the ticket's "INS must not derive one from the other" rule |
| Return-path template `/notifications/{id}/address-return?fulfilment-id={fid}` | ins-frontend builds it in `journey-registry.js` | Route registered at `pageRoutePath('address-return')` in `address-return/controller.js` and wired into `features/index.js` | CONSISTENT |
| Handshake error surface (`handshakeError=not-found\|unavailable`) | animals-tests specs assert redirect back to the picker after cancel | Codes emitted by `address-return/controller.js`; consumed by both `party-picker.controller.js` and `contact/controller.js` with matching English/Welsh copy | CONSISTENT |
| Cookie/session name divergence on localhost | ins-frontend defaults `ins-sid`/`ins-session` in dev; animals-tests handles `ins-sid` in fixture | Not applicable — animals-frontend keeps default `sid`/`session` (that is the whole point of the split) | CONSISTENT (peer-only pattern) |
| CSP `formAction` extended to peer origin | ins-frontend added animals-frontend origin (POST → 302 → animals) | Not needed — animals never receives a form POST from the browser that redirects to INS; the handshake is a link, not a form | CONSISTENT (asymmetric by design) |
| Add-link hidden in stub mode | animals-tests `addresses-read-only.spec.ts` splits stub vs compose | `addAddressLinkFor` short-circuits on `isStubMode()` in both party-picker and contact controllers | CONSISTENT |

## Missing Changes

*None identified.*

## Unique Changes

- **Auth redirect URL-encoding fix** (`src/plugins/auth.js`) — `?redirect=` now `encodeURIComponent`'d. Not present in the ins-frontend `auth.js` diff. Scope-justified: the animals handshake link carries a query string (`?journey-type=gbn-ag&notification-id=...`); without encoding, hapi-auth-cookie would treat the ampersand as an outer separator and lose the tail on redirect-after-sign-in. INS's own auth plugin should be checked for the same bug given both frontends carry identical cross-service query strings — flagged as a note in the ins-frontend consistency check, not here.
- **`stubH()` test helper now supports `.code(...)` chaining** (`engine/test-support.js`) — required by the new `address-return` controller which sets `HTTP_STATUS_INTERNAL_SERVER_ERROR` on the redirect response after a recoverable save failure. Scoped correctly, no peer needs it.
- **Lighthouse skip for `/notifications/{journeyId}/address-return`** — the new route is a pure redirect; lighthouse rightly excludes it. Peer-independent.
- **`obligation-party-map.js`** derives the reverse binding as the ticket's tech notes require ("Derive the reverse map from the existing bindings … a seventh party cannot then be added without appearing here"). No cross-repo peer expected.
- **Welsh copy for the new keys** (`copy.cy.js`) added alongside English. Consistent with the repo's own copy convention; INS has no copy layer today (EUDPA-346, out of scope).

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found (1 note flagged to the ins-frontend review about mirroring the auth redirect-encoding fix)
**Summary:** All symmetric handshake artefacts — browser-visible URL config, `gbn-ag` journey type, return-path template, error codes, stub-mode gate — appear on both sides; asymmetries (cookie names, CSP formAction, auth-redirect encoding) are ticket-legitimate.
