# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-814
**All repos in scope:** trade-imports-ins-frontend, trade-imports-workspace
**PR:** #282 | **Commit:** 86f6d76

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Coverage links for SCN-INS-AUTH-003-A..G | trade-imports-ins-frontend ✅ (every linked title exists verbatim in `src/server/auth/idm-sign-in.test.js` or `src/auth/verify-token.test.js`) | ✅ `openspec/coverage/ins/authentication/coverage.json` | CONSISTENT |
| Same branch-name rule (rule 2) | ins-frontend PR #90 | PR #282 | Not checkable from `.review-meta.json` (`branch` is empty); confirm both PRs use one `feat/EUDPA-814-*` name |
| IDM refusal returned to the post-logout URL | ins-frontend ❌ not handled; routing-proxy (context) ✅ handles `/auth/signed-out?error=` | Spec SCN-INS-AUTH-003-E covers only an error at "arrive back at the service" and SCN-003-G says the post-logout page "says they have signed out" | INCONSISTENT with the proven IDM behaviour (see below) |
| New outbound dependency documented | ins-frontend README ✅, `architecture.md` ✅ | `docs/repos/trade-imports-ins-frontend.md` ❌ not updated | INCONSISTENT |

## Missing Changes

1. **Spec does not cover an IDM refusal sent to `/auth/signed-out`.** The routing proxy's EUDPA-806 work (README:137) records that Defra ID sends a refused sign-in to the post-logout URL with `error` and `error_description`. SCN-INS-AUTH-003-G (`openspec/specs/ins/authentication/spec.md`, last scenario) says that page just "says they have signed out", and SCN-003-E does not name it. Must: a scenario (or a GIVEN on 003-E) says that arriving at the post-logout page with an error shows the unable-to-sign-in page with a try-again link and logs the error; ins-frontend implements and tests it; coverage links it.
2. **`docs/repos/trade-imports-ins-frontend.md` does not mention the hidden IDM sign-in.** See Statements Made Untrue.

## Unique Changes

- Spec Purpose line widened to cover the hidden IDM sign-in. Intentional and in scope.
- Coverage marks SCN-INS-AUTH-003-C `full` while two of its three tests are `partial`; the one `full` test (ID token claims, access token is the ID token) carries it, which is the house reading. No issue.

## Naming and Reuse

| File:Line | Finding | Must | One way |
|-----------|---------|------|---------|

*None identified.* The spec uses "the real Defra ID (IDM)" once and "IDM" after, matching the ins-frontend README and code (`idm` config group, `IDM_*` settings).

## Statements Made Untrue

| File:Line | Says | Now true | Must | One way |
|-----------|------|----------|------|---------|
| `docs/repos/trade-imports-ins-frontend.md:37` | Integrations list one identity provider: "Defra ID (trade-imports-defra-id-stub locally) — OIDC (`DEFRA_ID_OIDC_CONFIGURATION_URL`)". | The service also calls the real Defra ID (IDM) for discovery, JWKS and token exchange when `IDM_OIDC_CONFIGURATION_URL` is set, with metric dependency `idm`. | The table lists the IDM integration. | Add a row: Outbound, Defra ID IDM in CP-Dev (`IDM_OIDC_CONFIGURATION_URL`, optional), OIDC, hidden test sign-in at `/auth/idm/sign-in` that shows the returned tokens and never signs anyone in to the service. |
| `docs/repos/trade-imports-ins-frontend.md:15,17` | "Sign-in and sign-out via Defra ID (OIDC)…"; "Routes are only registered when `auth.enabled` is true." | A second, hidden sign-in exists, and its routes (`/auth/idm/sign-in`, `/auth/idm/go-to-defra-id`, `/auth/callback`, `/auth/idm/signed-in`, `/auth/signed-out`) are registered whatever `auth.enabled` is, gated only by `IDM_OIDC_CONFIGURATION_URL` (`src/server/server.js`, `idmSignInRoutes` outside the `authEnabled` branch). | The Owns list states the hidden sign-in and when its routes exist. | One bullet under Owns. |

Searched: `/auth/callback`, `/auth/signed-out`, `IDM_`, `idm/sign-in`, `real Defra ID`, `first served key`, `keys[0]`, `DEFRA_ID_OIDC_CONFIGURATION_URL` across `docs/`, `openspec/specs/`, `config/` and `CLAUDE.md`. `docs/repos/trade-imports-routing-proxy.md:9` ("moving the sign-in onto the real Defra ID (IDM), come in follow-up tickets") is about the proxy and stays true.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 3 (1 spec gap on IDM refusals at the post-logout URL, 2 stale statements in `docs/repos/trade-imports-ins-frontend.md`)
**Summary:** Spec and coverage match the ins-frontend tests exactly, but the spec misses the refusal-at-signed-out path the routing proxy proved, and the ins-frontend repo page does not mention the new IDM integration.
