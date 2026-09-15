# Repository Review: trade-imports-workspace

**PR:** #42
**Commit:** fd4ebd3cb2fadcb688fe012ad51fe3705b7a127d
**Files Changed:** 2

## Summary

Workspace stack changes to make the address-book handshake work end-to-end on the local Docker stack without hand-configuration: the two browser-visible cross-frontend URL env vars (`TRADE_IMPORTS_INS_FRONTEND_URL` on animals, `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` on INS) set to `localhost` (the correct choice for browser redirects — `host.docker.internal` would pass a container health check but fail in a browser) and the INS-side dev-only cookie/session name overrides that pair with the INS convict defaults. Also picks up an unrelated CI hardening in the reusable `e2e-tests.yml` — a workspace-ref fallback intended to enable cross-repo branch parity for the workspace checkout, which has a correctness bug (see below).

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `.github/workflows/e2e-tests.yml` | RISKY | 1 | 0 | 0 |
| `docker/stack/frontend.compose.yml` | SAFE | 0 | 0 | 0 |

## Positive Observations

- Both cross-frontend URL env vars set consistently with the `TRADE_IMPORTS_*_URL` naming convention already established elsewhere in the compose file.
- Inline comments on `frontend.compose.yml` explicitly capture the two non-obvious rails: browser-visible URLs must be `localhost` (not `host.docker.internal`), and localhost cookies are host-scoped so a session-name split is needed.
- The three sides of the dev-only cookie split (INS convict default, workspace compose env, animals-tests fixture) agree on `ins-sid` and `ins-session`, so the local stack works without manual override.

## Test Coverage

- **Unit tests:** N/A (workspace/infra changes).
- **Integration tests:** The compose changes are exercised implicitly by every animals-tests spec that runs against the local stack (see `review.trade-imports-animals-tests.md`).

## Risk Assessment

**Overall Risk:** High
**Rationale:** The `Resolve workspace ref` step added to `.github/workflows/e2e-tests.yml` probes `github.repository` — but in a reusable workflow (`on: workflow_call`) that resolves to the *caller's* repository, not the workspace's. Every caller under `repos/*/.github/workflows/e2e-tests.yml` invokes this file via `uses:`, so on the reusable path the step (a) probes the caller for its own branch (which almost always exists), (b) sets the step output to that branch, and (c) the subsequent Checkout tries to fetch that ref from `DEFRA/trade-imports-workspace` where it usually does not exist — failing the job. On the workspace's own PR/dispatch path the same code happens to work by accident, so local testing does not surface the bug.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | .github/workflows/e2e-tests.yml | 43 | Critical | correctness | Resolve workspace ref probes the caller's repository, not the workspace. In a reusable workflow the github context is the caller's, so github.repository is (for example) DEFRA/trade-imports-animals-frontend when invoked via workflow_call. The probe therefore asks the caller for the branch — which almost always exists there since it is what triggered the workflow_call — and then Checkout tries to fetch that same ref from DEFRA/trade-imports-workspace where it usually does not exist, failing the job. Also, the GITHUB_TOKEN issued to a caller repo cannot read a foreign repo's git refs, so even if the probe were retargeted to DEFRA/trade-imports-workspace with the same token it would 404 on auth and always fall back to main — losing the cross-repo branch parity this step is meant to enable. | Probe the workspace repo explicitly (repos/DEFRA/trade-imports-workspace/git/ref/heads/...) and use a token that can read it — either a PAT via secrets or, for the reusable path only, the GITHUB_API_URL against an unauthenticated public repo endpoint. Then keep the fallback to main. | Fix | Done | 293db28 |

