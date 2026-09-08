# Repository Review: trade-imports-workspace

**PR:** #15
**Commit:** b3abe18c19bbc5f2535896a688ff9128abcbd4df
**Files Changed:** 4

## Summary
PR #15 is mostly EUDPA-358 Mongo start retry and `tim` roster tests — out of EUDPA-306. The in-ticket gap is stack wiring: `docker/stack/frontend.compose.yml` still does not set `TRADE_IMPORTS_INS_BACKEND_URL` on INS frontend, so a container-run dashboard cannot reach INS backend.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `scripts/stack/bounce-mongo.sh` | SAFE | 0 | 0 | 0 |
| `scripts/stack/bounce-mongo.test.sh` | SAFE | 0 | 0 | 0 |
| `scripts/stack/run-stack.sh` | NEEDS ATTENTION | 0 | 1 | 0 |
| `tim/src/constants/repos.test.js` | SAFE | 0 | 0 | 0 |

## Positive Observations
`bounce-mongo.sh` is sourceable and well tested (retry, give-up, wipe vs stale, seed, primary wait). `repos.test.js` will not go stale when repos join the workspace.

## Test Coverage
- Unit tests: `bounce-mongo.test.sh` (13 cases) and `repos.test.js` cover the changed behaviour.
- Integration tests: Not applicable for these scripts.

## Risk Assessment
**Overall Risk:** Medium
**Rationale:** The dashboard cannot call INS backend from a Docker-run INS frontend until `TRADE_IMPORTS_INS_BACKEND_URL` is set. Mongo retry is out of this ticket.

## Items

Mongo start retry is Won't Fix (EUDPA-358). Item 2 is the EUDPA-306 compose wiring.

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | scripts/stack/run-stack.sh | 196 | Major | correctness | start_mongodb_first is not the same retry loop as bounce-mongo.sh: it omits --wait-timeout 90, wait_for_port_release after rm, and mongo logs on failure, so a post-crash :27017 bind or a slow healthcheck can burn the 6 attempts | Call bounce-mongo.sh's start_mongodb_with_retries (it is already sourceable) instead of a weaker copy, or at least pass --wait-timeout 90, dump logs, and wait for port 27017 to release before retrying | Won't Fix | — | Out of EUDPA-306: mongo start retry is EUDPA-358 stack reliability, not dashboard AC. |
| 2 | docker/stack/frontend.compose.yml | 105 | Major | config | trade-imports-ins-frontend has TRADE_IMPORTS_ADDRESS_BOOK_URL and TRADE_IMPORTS_REFERENCE_DATA_URL via host.docker.internal but no TRADE_IMPORTS_INS_BACKEND_URL, so a container-run dashboard keeps the default http://localhost:8090 and cannot reach INS backend. | Set TRADE_IMPORTS_INS_BACKEND_URL=http://host.docker.internal:8090 on the ins-frontend service (and depends_on the backend if the dashboard should not boot first). |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
