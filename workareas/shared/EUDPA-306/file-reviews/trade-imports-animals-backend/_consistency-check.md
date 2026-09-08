# Consistency Check: trade-imports-animals-backend

**Ticket:** EUDPA-306
**All repos in scope:** trade-imports-animals-backend, trade-imports-ins-backend, trade-imports-ins-frontend, trade-imports-workspace
**PR:** #83 | **Commit:** 0ba65961

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `GET /notifications` list/sort/paginate/reference lookup | ins-backend ✅, ins-frontend (client) ✅ | ❌ Not found | EXPECTED — journey API is not the aggregated dashboard; ticket scope is INS |
| `notification.list.page-size` / `NOTIFICATION_LIST_PAGE_SIZE` | ins-backend ✅ | Pre-existing animals list page-size (not this PR) | EXPECTED — different list (journey vs aggregated store) |
| `TRADE_IMPORTS_INS_BACKEND_URL` | ins-frontend ✅ | ❌ Not found | EXPECTED — this service does not call INS |
| `TRADE_IMPORTS_ANIMALS_FRONTEND_URL` | ins-frontend ✅ | ❌ Not found | EXPECTED — deep links are built in INS frontend |
| Outbox lifecycle types (`NotificationCreated`, `NotificationEdited`, amendment/delete variants) | ins-backend already consumes the same wire names (EUDPA-305, not this PR) | ✅ Present (this PR emits them) | CONSISTENT |
| Tests covering changed business logic | ins-backend ✅, ins-frontend ✅, workspace ✅ | ✅ Present (unit + NotificationIT + outbox ITs) | CONSISTENT |
| Feature flag / toggle | None in any repo | None | CONSISTENT |
| `TRADE_IMPORTS_INS_BACKEND_URL` on stack compose | workspace ❌ (see that repo) | N/A | N/A — compose lives in workspace |

## Missing Changes

*None identified.* This repo is the animals journey producer. It should not grow the INS query API, dashboard UI, or INS client config.

## Unique Changes

- **Outbox on create / copy / cancel-amend / soft-delete**, plus extra event types (`NotificationCreated`, `NotificationAmendmentRequested`, `NotificationAmendmentCancelled`, `NotificationDeleted`, `NotificationSubmissionDeleted`) and computed `versionId`. Intentional: AC1/AC7 need the aggregated store to see creates, edits and deletes. INS backend already recognises those wire values from EUDPA-305; this PR does not change the aggregator.
- **Actor + traceId** plumbed through copy, cancel-amend and soft-delete. Journey-local API hygiene so those writes can emit outbox events; not required in INS frontend/backend.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** Animals-backend uniquely (and correctly) expands outbox emission so the existing INS aggregator can feed the dashboard; it does not need the INS query API or frontend env keys.
