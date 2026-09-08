# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-306
**All repos in scope:** trade-imports-animals-backend, trade-imports-ins-backend, trade-imports-ins-frontend, trade-imports-workspace
**PR:** #15 | **Commit:** b3abe18c

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Server-side INS frontend API URLs on `docker/stack/frontend.compose.yml` (`host.docker.internal`) | ins-frontend adds `TRADE_IMPORTS_INS_BACKEND_URL` (default `http://localhost:8090`) ✅ | ❌ `TRADE_IMPORTS_ADDRESS_BOOK_URL` and `TRADE_IMPORTS_REFERENCE_DATA_URL` are set; `TRADE_IMPORTS_INS_BACKEND_URL` is not | INCONSISTENT |
| `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` | ins-frontend ✅ (browser-visible, default localhost:3000) | ❌ Not set on compose | EXPECTED — browser must use the published host port; default is already correct |
| `GET /notifications` query API | ins-backend / ins-frontend ✅ | ❌ Not found | EXPECTED — workspace is stack/tooling, not a service |
| Outbox event types | animals-backend ✅ | ❌ Not found | EXPECTED |
| Mongo start/reseed retry (`MONGO_UP_ATTEMPTS`) | bounce-mongo.sh and run-stack.sh both in this PR | ✅ Present in both scripts | CONSISTENT within this repo |
| Tests for changed behaviour | other repos ✅ | ✅ Present (`bounce-mongo.test.sh`; `repos.test.js` roster) | CONSISTENT |
| Feature flag / toggle | None | None | CONSISTENT |

## Missing Changes

- **`docker/stack/frontend.compose.yml` (service `trade-imports-ins-frontend`, environment block ~lines 81–92).** Sibling server-side clients are wired as `TRADE_IMPORTS_ADDRESS_BOOK_URL=http://host.docker.internal:8089` and `TRADE_IMPORTS_REFERENCE_DATA_URL=http://host.docker.internal:8086`. INS frontend PR #25 adds `TRADE_IMPORTS_INS_BACKEND_URL` with default `http://localhost:8090`. Inside the stack container that default does not reach `trade-imports-ins-backend` on host port 8090. Expected addition: `TRADE_IMPORTS_INS_BACKEND_URL=http://host.docker.internal:8090` (and `depends_on` the backend if the dashboard should not boot before it). This PR instead only retries mongo (EUDPA-358).

## Unique Changes

- **`bounce-mongo.sh` retry loop, wipe/seed assertions, `run-stack.sh` start-mongodb-first.** Cross-referenced to EUDPA-358, not the dashboard AC. Intentional stack reliability; not a substitute for the INS backend URL on the frontend service.
- **`tim` `repos.test.js` driven from `repos.json`.** Tooling hygiene; unrelated to the dashboard contract.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 1 inconsistency found
**Summary:** Workspace compose still omits `TRADE_IMPORTS_INS_BACKEND_URL` on `trade-imports-ins-frontend`, so a Docker-run dashboard will not call INS backend the way address-book and reference-data already do.
