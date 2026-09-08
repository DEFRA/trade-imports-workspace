# Consistency Check: trade-imports-ins-backend

**Ticket:** EUDPA-306
**All repos in scope:** trade-imports-animals-backend, trade-imports-ins-backend, trade-imports-ins-frontend, trade-imports-workspace
**PR:** #7 | **Commit:** c4c70e7f

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `GET /notifications?page&sort&referenceNumber` | ins-frontend client ✅ (`ins-backend-client.real.js`) | ✅ Present (`AggregatedNotificationController`) | CONSISTENT |
| Sort values `arrivalDate,{asc\|desc}`, `lastUpdated,{asc\|desc}`, default `arrivalDate,desc` | ins-frontend `SORT_OPTIONS` ✅ | ✅ Present (`AggregatedNotificationSort`) | CONSISTENT |
| Page size 25 | ins-frontend stub `PAGE_SIZE = 25` ✅ | ✅ Present (`notification.list.page-size` default 25) | CONSISTENT |
| Exclude `DELETED` from list and reference lookup | ins-frontend stub ✅ | ✅ Present (`findAllByStatusNot` / `findByReferenceNumberAndStatusNot`) | CONSISTENT |
| Empty list is `200` with empty `content`, not 404 | ins-frontend treats `totalElements === 0` ✅ | ✅ Present (IT + query service) | CONSISTENT |
| Response shape `content`, `page`, `size`, `numberOfElements`, `totalElements`, `totalPages` | ins-frontend client/stub ✅ | ✅ Present (`AggregatedNotificationPageResponse`) | CONSISTENT |
| 1-based `page` query param | ins-frontend ✅ | ✅ Present (`PageRequest.of(page - 1, …)`) | CONSISTENT |
| Unscoped list (no organisation header/filter) | ins-frontend client asserts no org header ✅ | ✅ Present (no org param) | CONSISTENT |
| `NOTIFICATION_LIST_PAGE_SIZE` / `notification.list.page-size` | frontend does not send page size (backend-owned) | ✅ Present | CONSISTENT — frontend reads `size` from the response |
| `TRADE_IMPORTS_INS_BACKEND_URL` | ins-frontend ✅; workspace compose ❌ | ❌ Not found | EXPECTED here — this is the server, not the client |
| springdoc swagger-ui disabled in `application.yml`, enabled in `application-local.yml` | animals-backend already has this (not this PR) | ✅ Present | CONSISTENT with house Java pattern |
| Tests covering query behaviour | ins-frontend ✅ | ✅ Present (unit + `AggregatedNotificationControllerIT`) | CONSISTENT |
| Feature flag / toggle | None | None | CONSISTENT |

## Missing Changes

*None identified in this repo.* Stack wiring of `TRADE_IMPORTS_INS_BACKEND_URL` belongs in `trade-imports-workspace` `docker/stack/frontend.compose.yml`, not here. Helm/Bicep for `NOTIFICATION_LIST_PAGE_SIZE` is optional because the YAML default is 25.

## Unique Changes

- **Aggregated query API** (`AggregatedNotificationController` / `QueryService` / `Sort` / page response). Ticket scope: this is the read model for the unified dashboard. Intentional.
- **`notification.list.page-size`** config. Intentional; frontend pagination uses the returned `size` rather than a second hardcoded page size on the real client.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The query contract, sort keys, page size, deleted-row filter and unscoped list match the INS frontend client; this PR correctly does not re-implement event consumption already delivered in EUDPA-305.
