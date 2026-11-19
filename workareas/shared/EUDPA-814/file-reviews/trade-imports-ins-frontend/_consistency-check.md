# Consistency Check: trade-imports-ins-frontend

**Ticket:** EUDPA-814
**All repos in scope:** trade-imports-ins-frontend, trade-imports-workspace
**PR:** #90 | **Commit:** 97c72f1

Context read outside scope: `trade-imports-routing-proxy` on `feat/EUDPA-806-sign-in-through-idm-from-localhost` (b6dbd75), which the ticket names as the pattern to copy, and `DEFRA/cdp-app-config` `origin/main` (read only).

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| REQ-INS-AUTH-003 scenarios A-G linked to tests | trade-imports-workspace ✅ (coverage.json names 11 tests) | ✅ All 11 test titles exist verbatim in `src/server/auth/idm-sign-in.test.js` and `src/auth/verify-token.test.js` | CONSISTENT |
| IDM paths `/auth/idm/sign-in`, `/auth/callback`, `/auth/idm/signed-in`, `/auth/signed-out` | workspace spec ✅ (by description) | ✅ `idmPaths` | CONSISTENT |
| Signed-in page layout (three summary lists, `data-testid`s, "The access token is the ID token.", `expires_in` / `scope` / `refresh token returned` rows) | routing-proxy `signed-in.njk`, `describeSignIn` ✅ | ✅ `idm-signed-in.njk`, `signInSummaryRows` match row for row | CONSISTENT |
| Error query on the post-logout URL (`/auth/signed-out?error=...`) handled | routing-proxy ✅ (`signedOutController` logs `error`/`error_description` and shows an error page; README:137 "Defra ID sends the user to `/auth/signed-out` after sign-out, and when it refuses a sign-in") | ❌ `showSignedOut` (`src/server/auth/idm-sign-in.js:131`) ignores the query and always says "You have signed out of Defra ID." | INCONSISTENT |
| `IDM_OIDC_CONFIGURATION_URL`, `IDM_REDIRECT_URL` set for CDP dev and test | cdp-app-config `origin/main` ❌ (only `DEFRA_ID_REDIRECT_URL=.../auth/sign-in-oidc` in `dev`, `test`) | README:203-209 says "the rest are in `cdp-app-config`" | INCONSISTENT (outside the PR) |

## Missing Changes

1. **IDM refusals that arrive at `/auth/signed-out` are neither logged nor shown as an error.** The routing proxy, which the ticket names as the pattern and which proved the CP-Dev round trip (EUDPA-806), found that Defra ID returns a refused sign-in to the post-logout URL with `error` and `error_description`, and handles it in `signedOutController`. Here `showSignedOut` (`src/server/auth/idm-sign-in.js:131`) renders "Signed out" regardless, so that path breaks the AC "An error from Defra ID is logged in full, and the user sees a generic error page with a link to try again". The callback's error branch (`completeSignIn`) handles only errors returned to `/auth/callback`. Must: a request to `/auth/signed-out` carrying `error` logs it in full and renders the unable-to-sign-in page linking to `/auth/idm/sign-in`, with a test; SCN-INS-AUTH-003-E/G in the workspace spec say so.
2. **CDP dev and test have no IDM settings in `cdp-app-config`.** `origin/main` of `services/trade-imports-ins-frontend/{dev,test}/trade-imports-ins-frontend.env` has no `IDM_OIDC_CONFIGURATION_URL` or `IDM_REDIRECT_URL`. Without the first the routes are not served; without the second Bell sends IDM `http://localhost:3002/auth/callback`. The AC "The same journey works on the deployed INS frontend in CDP dev and test" cannot pass until both are set (`https://trade-imports-ins-frontend.{dev,test}.cdp-int.defra.cloud/auth/callback`) and the three CDP secrets are added. Rule 3: edit a local clone and hand the diff to the user; do not branch or push.

## Unique Changes

- `verify-token.js` now picks the JWKS key by the token header's `kid` instead of the first served key. Intentional and needed (IDM serves several keys); the old test "Should verify against the first served key only" was rewritten to match. It also changes Defra ID stub verification; tests cover both.
- `verify-token.js` moves `aud`/`iss` into `Jwt.token.verify`'s options argument for IDM only. Before this PR they sat in the key argument, where `@hapi/jwt` ignores them, so Defra ID tokens were never checked for audience or issuer. The new test "Should resolve for a token issued to any client by any issuer when checked against Defra ID" pins that existing behaviour and `architecture.md` explains it (the stub issues a random audience). Intentional.
- `unauthorised.njk` takes an optional `signInUrl`; the stub/Defra ID path still links to `/auth/sign-in` and `controller.test.js` now asserts it. Intentional.
- `idmSignInRoutes` is registered outside the `authEnabled` branch in `server.js`, so the IDM routes are served even when `auth.enabled` is false (gated only by `IDM_OIDC_CONFIGURATION_URL`). The app docs README says "in either mode"; worth confirming it is meant to ignore `auth.enabled` too.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|
| `src/auth/token-exchange-timer.js:4` | `const STARTED_AT = 'defraIdTokenExchangeStartedAt'` is now stamped by IDM's Bell strategy too (`src/plugins/idm-auth.js:17` uses `timeTokenExchange`), while the JSDoc beside it was generalised to "the identity provider's token endpoint". The key name still says Defra ID. | The name says what it holds for both providers. | `tokenExchangeStartedAt` (update `token-exchange-timer.test.js:38,50` and `plugins/auth.test.js:166`). |
| `src/auth/defra-id-calls.js:19` / `src/auth/identity-providers.js:4-14` | The real Defra ID is called two things: `idm` (config group, strategy, metric `dependency: 'idm'`) here, and `defraId` / `dependency: 'defra-id'` when the main config points at the real service in production. Same external system, two metric dependency names. Defensible as two client registrations, but dashboards will split it. | Either one dependency name for the real IDM, or a note in `architecture.md` that `idm` is the hidden test client and `defra-id` is the service's own client. | One sentence in `architecture.md` under `identity-providers.js`. |
| `src/server/auth/idm-sign-in.js:31,54` vs routing-proxy `controller.js:31,52` | Copied logic, renamed: `signInSummaryRows` / `describeSignIn`, `accessTokenClaimsOf` / `decodedAccessTokenClaims`, `SIGN_IN_SESSION_KEY='idmSignIn'` / `signInSessionKey='signIn'`. Separate repos, so no shared module is possible; the bodies are identical. | Advisory only. | Use the proxy's names so a later change to one is easy to find in the other. |

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `README.md:30-38` | The contents list of sections. | A new `## Sign-in through the real Defra ID (IDM)` section (README:184) is not in it. (`Configuration` and `Signed-off pages` were already missing.) | The list names the new section. | Add `- [Sign-in through the real Defra ID (IDM)](#sign-in-through-the-real-defra-id-idm)` after `Auth`. |

Searched with no stale hit: `first served key`, `No signing key served`, `keys[0]`, `audience`, `issuer`, `oidcDiscoveryUrl`, `DEFRA_ID_CALLS`, `one view outside`, `outside features`, `/auth/*`, `/auth/callback`, `/auth/signed-out`, `signInUrl`, `getOidcConfig`, `verifyToken`, `defraIdTokenExchange`, `identity provider` — across `README.md`, `AGENTS.md`, `src/server/app/docs/*.md`, JSDoc and test titles. `getBrowserFacingDiscoveryUrl`'s JSDoc still reads the Defra ID discovery URL only, which remains true.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 4 (1 missing behaviour against the routing-proxy pattern, 1 missing CDP config outside the PR, 1 stale name, 1 stale contents list), plus 2 advisory naming notes
**Summary:** The IDM pages match the routing proxy and the workspace spec, but an IDM refusal sent to `/auth/signed-out` is silently shown as "Signed out", CDP dev and test lack the IDM settings, and the token-exchange stamp key still says Defra ID.
