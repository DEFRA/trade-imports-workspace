# Code Review: EUDPA-814

**Ticket:** Add hidden Defra ID sign-in to the INS frontend, keeping stub sign-in unchanged
**Reviewer:** Claude Code Agent
**Date:** 2026-11-18
**Verdict:** CONCERNS
**Notes:** IDM_OIDC_CONFIGURATION_URL and IDM_REDIRECT_URL are not yet in cdp-app-config for dev or test, and the three CDP secrets must be set, so the hidden sign-in is not served in CDP until someone adds them.

## Summary
The hidden IDM sign-in works on its happy path, and stub sign-in is untouched. However, a Defra ID refusal sent to `/auth/signed-out` is shown as "Signed out" and is not logged. If IDM cannot be reached at startup, the whole frontend fails to start. The spec leaves out the "logged in full" half of the error criterion. Several coverage links marked full overstate what their tests prove.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-ins-frontend | #90 | 97c72f1 (head) | 25 | NEEDS ATTENTION | [review.trade-imports-ins-frontend.md](review.trade-imports-ins-frontend.md) |
| trade-imports-workspace | #282 | 86f6d76 (head) | 2 | RISKY | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

Both PRs are on `feat/EUDPA-814-hidden-defra-id-sign-in`, so the branch names match.

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | Hidden start page on localhost:3002 signs in through CP-Dev and returns to `/auth/callback` | Yes (untested end to end) | Routes and Bell strategy are in place. No test runs the callback through Bell (ins #49). |
| 2 | Signed-in page shows ID token claims, access token claims and token response as on the routing proxy | Yes | Matches the proxy row for row. Tests check claim names only (ins #51). |
| 3 | Same journey works on the deployed frontend in CDP dev and test | No | No IDM_* keys in cdp-app-config dev or test (ins #1). If IDM is unreachable at startup, the frontend fails to start (ins #19). |
| 4 | An error from Defra ID is logged in full, and the user sees a generic error page with a try-again link | Partial | The callback error path logs and shows the page. A refusal sent to `/auth/signed-out` is neither logged nor shown (ins #52). The spec leaves out the logging, and no test asserts it (workspace #11, Critical). |
| 5 | `/auth/signed-out` shows a signed-out page | Yes | It also swallows refusals sent there (ins #52). |
| 6 | Nothing in the INS frontend links to the hidden pages | Yes | No scenario or test states it (workspace #5). |
| 7 | Stub sign-in, the workspace stack and E2E tests work as now | Yes, with a risk | Stub routes are unchanged. The risk is the startup failure in ins #19. |
| 8 | Client ID, secret and service ID come from CDP secrets / env vars; none committed | Yes | `IDM_CLIENT_SECRET` is marked sensitive. Nothing refuses empty values when the discovery URL is set (ins #16). |
| 9 | The README lists the new setting names without values | Yes | Its claim that the rest "are in cdp-app-config" is not true today (ins #1). |

Spec check: SCN-INS-AUTH-003-A to G match the code. SCN-003-E leaves out the logging half of AC 4, and no scenario covers a refusal at `/auth/signed-out`.

## Test Coverage Assessment
- **Unit Tests:** Partial
- **Integration Tests:** Partial

## Configuration & Environment
- **New Environment Variables:** IDM_OIDC_CONFIGURATION_URL, IDM_CLIENT_ID, IDM_CLIENT_SECRET (secret), IDM_SERVICE_ID, IDM_POLICY (default `b2c_1a_cui_cpdev_signupsignin`), IDM_REDIRECT_URL (default `http://localhost:3002/auth/callback`)
- **Database Changes:** None

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Medium |
| Code Quality | Medium |
| Security | Low |
| Test Coverage | Medium |

## Conclusion
The work is sound and the stub path is safe. Before merge, fix three things: the refusal at `/auth/signed-out`, the startup failure when IDM is unreachable, and the missing logging requirement in the spec and tests. The provider naming (defraId vs idm) and the hidden stub defaults are the main structural follow-ups. Full item lists are in each `review.{repo}.md`.
