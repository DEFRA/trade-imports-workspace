# Consistency Check: trade-imports-ins-frontend

**Ticket:** EUDPA-306
**All repos in scope:** trade-imports-animals-backend, trade-imports-ins-backend, trade-imports-ins-frontend, trade-imports-workspace
**PR:** #25 | **Commit:** df4190f8

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `GET /notifications?page&sort&referenceNumber` | ins-backend ✅ | ✅ Present (`ins-backend-client.real.js`) | CONSISTENT |
| Sort `arrivalDate` / `lastUpdated` + default newest arrival | ins-backend ✅ | ✅ Present (`SORT_OPTIONS`) | CONSISTENT |
| Page size 25 | ins-backend default ✅ | ✅ Present in stub; real client uses backend `size` | CONSISTENT |
| Exclude `DELETED` | ins-backend ✅ | ✅ Present in stub | CONSISTENT |
| No organisation header on list | ticket + backend unscoped ✅ | ✅ Present (explicit test) | CONSISTENT |
| `TRADE_IMPORTS_INS_BACKEND_URL` convict key | workspace compose should mirror `TRADE_IMPORTS_ADDRESS_BOOK_URL` / `TRADE_IMPORTS_REFERENCE_DATA_URL` | ✅ Present in `src/config/config.js` | CONSISTENT in this repo; stack wiring is missing in workspace |
| `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` | animals-backend N/A | ✅ Present (browser deep links; default `http://localhost:3000` is correct) | CONSISTENT |
| Tests for dashboard + client | ins-backend ✅ | ✅ Present (unit, helper, FIT spec) | CONSISTENT |
| Feature flag / toggle | None | None | CONSISTENT |
| Deep links only to animals-frontend | no plants/other journey repos in this ticket | ✅ Present (`buildNotificationLink`) | EXPECTED — ticket/tech notes: single journey until ownership is on the notification |

## Missing Changes

*None identified inside this repo's tree.* The matching gap is in **trade-imports-workspace**: `docker/stack/frontend.compose.yml` already sets `TRADE_IMPORTS_ADDRESS_BOOK_URL` and `TRADE_IMPORTS_REFERENCE_DATA_URL` to `http://host.docker.internal:…` for the INS frontend container, but does not set `TRADE_IMPORTS_INS_BACKEND_URL`. Default `http://localhost:8090` works for a host-run frontend and fails for a container-run one (localhost is the container). See the workspace consistency check.

`TRADE_IMPORTS_ANIMALS_FRONTEND_URL` does not need a compose override: it is browser-visible and `localhost:3000` matches the published animals-frontend port.

## Unique Changes

- **Dashboard page, helper, stub client, Playwright FIT.** Ticket scope (`trade-imports-ins-frontend`). Intentional.
- **Deep links** to `/notifications/{ref}` and `/notifications/{ref}/notification-view`. Intentional for AC3; animals-frontend itself is out of this ticket (open question on URL stability).

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Frontend query params, sort keys, page size and unscoped list match ins-backend; the only stack-env gap for `TRADE_IMPORTS_INS_BACKEND_URL` belongs in the workspace compose file, not this repo.
