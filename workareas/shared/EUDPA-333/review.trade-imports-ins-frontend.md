# Repository Review: trade-imports-ins-frontend

**PR:** #26
**Commit:** f64b6fe4981cb2e886c10dfb5367c37be3c4edfb
**Files Changed:** 16

## Summary

INS side of the address-book handshake. Adds a session-backed handshake context (`handshake-context.js`) that ferries `journey-type`, `notification-id` and `fulfilment-id` across the POST-redisplay cycle without ever accepting a return URL from the caller; a code-only journey registry (`journey-registry.js`) that turns the journey type back into a return-URL template; the hidden fields and swapped cancel-button label on the add form; CSP `form-action` widened to the animals-frontend origin so the browser follows the save/cancel 302; and a dev-only `ins-sid`/`ins-session` cookie split so INS and animals don't fight over `sid` when they share `localhost`. Also carries a scope-adjacent Vite/esbuild version bump.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `package-lock.json` | SAFE | 0 | 0 | 0 |
| `package.json` | SAFE | 0 | 0 | 0 |
| `src/config/config.js` | SAFE | 0 | 0 | 0 |
| `src/server/address-book/add/controller.js` | SAFE | 0 | 0 | 3 |
| `src/server/address-book/add/controller.test.js` | SAFE | 0 | 0 | 2 |
| `src/server/address-book/add/index.njk` | SAFE | 0 | 0 | 0 |
| `src/server/address-book/handshake-context.js` | SAFE | 0 | 0 | 1 |
| `src/server/address-book/handshake-context.test.js` | SAFE | 0 | 0 | 3 |
| `src/server/address-book/journey-registry.js` | NEEDS ATTENTION | 0 | 1 | 1 |
| `src/server/address-book/journey-registry.test.js` | SAFE | 0 | 0 | 1 |
| `src/server/common/constants/session-keys.js` | SAFE | 0 | 0 | 0 |
| `src/server/plugins/auth.js` | SAFE | 0 | 0 | 0 |
| `src/server/plugins/auth.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/plugins/content-security-policy.js` | SAFE | 0 | 0 | 1 |
| `src/server/plugins/content-security-policy.test.js` | SAFE | 0 | 0 | 0 |
| `vite.config.js` | SAFE | 0 | 0 | 0 |

## Positive Observations

- The registry model matches the ticket's tech-note guidance literally — INS holds the return-URL *shape* keyed by journey type in code, treats the two ids as opaque strings, and never accepts a return URL from the caller. The whole open-redirect surface is designed out rather than filtered.
- `handshake-context.js` gates on `isKnownJourneyType` and throws `Boom.notFound()` on an unknown journey; this is enforced end-to-end by both the unit test and the animals-tests wire-level guard spec.
- `content-security-policy.js` correctly widens `form-action` to the animals-frontend origin — a browser enforces `form-action` across the 302 redirect chain, so without this widening the save/cancel POST would be blocked mid-handshake.
- The dev-only cookie/session split is applied consistently on three sides (INS convict default, workspace compose env, animals-tests fixture), so a shared-`localhost` cookie collision won't silently corrupt sessions.
- Payload-then-session precedence in `resolveHandshakeContext` is the right shape — the POST payload owns the handshake state, and the session backs it up so a validation-error re-display keeps the hidden fields around.

## Test Coverage

- **Unit tests:** Present for every new module — `handshake-context.test.js` covers query, payload, session, sync/clear, guard; `journey-registry.test.js` covers happy path, trailing-slash strip, URI-encoding, unknown-journey rejection; `add/controller.test.js` covers hidden-fields render, cancel-label swap, save-and-redirect, guard 404, incomplete-query 400. See item 12 for a `config.set` isolation nit that applies to `journey-registry.test.js`.
- **Integration tests:** Covered from the animals-tests repo (see `review.trade-imports-animals-tests.md`).

## Risk Assessment

**Overall Risk:** Medium
**Rationale:** One Major maintainability finding on `journey-registry.js` — `buildReturnUrl` appends `&addressId=...` assuming the registry template already contains a `?`, so a future entry whose `returnPathTemplate` has no query string would silently produce `/foo&addressId=...`. Directly contradicts the ticket's "one-line onboarding for another journey" story. Everything else is Minor. Also a cross-repo note carried from the consistency check: the animals `auth.js` picked up an `encodeURIComponent` fix on its `?redirect=` value that INS's own `auth.js` should be checked for.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/server/address-book/add/controller.js | 170 | Minor | efficiency | On the API-400 error branch in submitAddress the countries fetched on line 117 are discarded and loadCountryItems re-fetches them, doubling the reference-data round trips on the error path. | Move the countries fetch out of the try's happy path so it can be reused when re-rendering after an API 400, or accept the pre-fetched countryItems into the render helper. |  |  |  |
| 2 | src/server/address-book/add/controller.js | 111 | Minor | style | submitAddress is declared as an async function while the other new helpers in this diff (redirectAfterAdd, redirectAfterCancel, renderAddForm, loadCountryItems) are arrow functions — mixes the two forms within the same PR. | Rewrite submitAddress as a const arrow to match the sibling helpers, or convert the sibling helpers to function declarations for internal consistency. |  |  |  |
| 3 | src/server/address-book/add/controller.js | 152 | Minor | logging | In the submitAddress error branch we use the module-level logger with a manual traceId/orgId payload instead of request.logger, which hapi-pino already binds with the trace ID and request context. | Take request as available and use request.logger.error({ err }, 'Failed to create address'); drop the manually threaded traceId in the payload. |  |  |  |
| 4 | src/server/address-book/add/controller.test.js | 273 | Minor | test-clarity | Test 'POST handshake save redirects to animals with the new address id' includes a stray assertion 'expect(JOURNEY_TYPES.GBN_AG).toBe("gbn-ag")' that is unrelated to the redirect behaviour under test and only duplicates a check already made in journey-registry.test.js; it also forces an otherwise-unused import. | Remove the JOURNEY_TYPES assertion (and the unused import on line 12); the redirect URL itself already proves the journey-type mapping. |  |  |  |
| 5 | src/server/address-book/add/controller.test.js | 301 | Minor | test-clarity | Test named 'POST handshake save still works when country reload fails after an API error' does not include handshake fields in its payload, so it does not actually exercise the handshake path — it duplicates the plain 'POST re-renders form when API returns 400 validation errors' test with an added countries reload failure, but the name implies handshake coverage that is missing. | Either spread ...handshakeFields into the payload so the test proves the handshake case still degrades gracefully, or rename the test to drop 'handshake' and describe what it actually asserts (validation errors re-rendered even when the countries reload fails). |  |  |  |
| 6 | src/server/address-book/handshake-context.js | 56 | Minor | duplication | readHandshakeQuery and readHandshakePayload duplicate the three-check validation and result-shape logic; a bug fixed in one must be fixed in both. | Extract a shared buildHandshakeContext({journeyType, notificationId, fulfilmentId}) helper and have each reader call it after pulling values from its own source. |  |  |  |
| 7 | src/server/address-book/handshake-context.test.js | 137 | Minor | test-coverage | resolveHandshakeContext test 'prefers handshake fields from the POST payload' uses an empty session, so it does not guard against a regression where session is read before payload; a swapped-order bug would still pass. | Add a test that seeds the session with a different context, sends a payload with the new context, and asserts the returned/stored value is the payload's (not the session's). |  |  |  |
| 8 | src/server/address-book/handshake-context.test.js | 199 | Minor | test-coverage | syncHandshakeContext 'clears when GET query is absent' seeds an empty session, so the assertion that yar.clear was called does not prove a pre-existing handshake session would actually be wiped. | Seed the mock request with an existing handshake session, then call syncHandshakeContext with no query, and assert loadHandshakeContext(request) returns null (observable effect) rather than only that yar.clear was called. |  |  |  |
| 9 | src/server/address-book/handshake-context.test.js | 92 | Minor | test-coverage | resolveHandshakeContext has no test that a malformed POST payload (incomplete fields or unregistered journey type) propagates the Boom badRequest/notFound thrown by readHandshakePayload; a regression that swallowed the throw would go unnoticed. | Add two tests under 'resolveHandshakeContext' that pass a payload with only 'journey-type' (expect Boom.badRequest) and a payload with an unregistered journey type (expect Boom.notFound). |  |  |  |
| 10 | src/server/address-book/journey-registry.js | 33 | Major | maintainability | buildReturnUrl appends '&addressId=...' assuming the registry template already contains a '?'. The ticket sells the registry as one-line onboarding for another journey, but a future entry whose returnPathTemplate has no query string would silently produce a malformed URL like '/foo&addressId=...'. | Append addressId via the URL API (const url = new URL(path, baseUrl); url.searchParams.set('addressId', addressId)) so the separator is correct regardless of the template's own query string, or declare the addressId placement in the registry entry itself. |  |  |  |
| 11 | src/server/address-book/journey-registry.js | 30 | Minor | defensive-coding | buildReturnUrl does not validate that context.notificationId or context.fulfilmentId are present. encodeURIComponent(undefined) returns the literal string 'undefined', so a caller that forgets to gate on the handshake would build a URL containing '/notifications/undefined/address-return?fulfilment-id=undefined' rather than failing loudly. | Assert that notificationId and fulfilmentId are non-empty strings before substituting them (throw a clear error if not), mirroring the handshake-context checks so this helper is safe in isolation. |  |  |  |
| 12 | src/server/address-book/journey-registry.test.js | 17 | Minor | test-isolation | config.set('tradeImportsAnimalsFrontend.baseUrl', ...) is called inside four tests but never reset in an afterEach/afterAll. The sibling csrf.test.js and router.test.js in this repo restore the config in afterAll to keep the mutation local to the file, and the Node testing best-practices bundle explicitly calls out restoring mutated shared state (afterEach). Vitest's default file isolation masks the impact today, but the leak survives across tests within this file (e.g. the trailing-slash variant at line 48 is only cleared because line 62 re-sets it). | Extract the config.set into a beforeEach that seeds the canonical 'http://localhost:3000' value, keep the trailing-slash test as an in-body override, and add an afterAll that restores the config to its convict default ('http://localhost:3000'). |  |  |  |
| 13 | src/server/plugins/content-security-policy.js | 5 | Minor | robustness | Module-level new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin throws a raw TypeError: Invalid URL from Node internals if the env var is set to a malformed value, giving no hint that the CSP plugin or the animals-frontend config key is at fault. | Wrap and rethrow: try { animalsFrontendOrigin = new URL(config.get('tradeImportsAnimalsFrontend.baseUrl')).origin } catch (error) { throw new Error(`Invalid tradeImportsAnimalsFrontend.baseUrl: ${error.message}`, { cause: error }) } — or (preferred) change the config declaration in src/config/config.js to format: 'url' so convict rejects the value at boot with a readable message and this call is safe by construction. |  |  |  |

## Consistency

See `file-reviews/trade-imports-ins-frontend/_consistency-check.md`. Status: INCONSISTENCIES FOUND (1) — animals-frontend added `encodeURIComponent` around its `?redirect=` value in `src/plugins/auth.js`, and INS's own `auth.js` should be checked for the same latent bug given both frontends carry identical cross-service query strings that would be truncated through a sign-in bounce.

## Repository Verdict

**Status:** NEEDS ATTENTION
