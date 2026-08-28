# Consistency Check: trade-imports-animals-backend

**Ticket:** EUDPA-307
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-tests, trade-imports-ins-backend, trade-imports-workspace
**PR:** #83 | **Commit:** 7049086a3330be846dcd54e6f2d93919cfbf047

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `OutboxEventType` gains 5 new constants (`NOTIFICATION_CREATED`, `NOTIFICATION_AMENDMENT_REQUESTED`, `NOTIFICATION_AMENDMENT_CANCELLED`, `NOTIFICATION_DELETED`, `NOTIFICATION_SUBMISSION_DELETED`) | trade-imports-ins-backend ✅ mirrors all 5 wire values in its own `OutboxEventType` enum | ✅ Source of truth — also carries `schemaUrl` per type | CONSISTENT |
| Wire-value string format `uk.gov.defra.imports.notification.<Name>` | trade-imports-ins-backend ✅ hardcodes the same fully-qualified strings | ✅ Enum constructor prepends the prefix | CONSISTENT |
| Mis-mapping fix: `amendNotification` now emits `NOTIFICATION_AMENDMENT_REQUESTED` (was `NOTIFICATION_SUBMISSION_AMENDED`); re-submission now emits `NOTIFICATION_SUBMISSION_AMENDED` (was `NOTIFICATION_SUBMITTED`) | trade-imports-animals-tests ✅ `outbox-event-amendment.spec.ts` updated to assert `NotificationAmendmentRequested` | ✅ `NotificationService.amendNotification` / `submitNotification` corrected | CONSISTENT |
| E2E spec coverage in tests repo per new outbox event type | trade-imports-animals-tests: only `NotificationCreated` gets a new spec (`outbox-event-created.spec.ts`); no equivalent spec added for `NotificationAmendmentCancelled`, `NotificationDeleted`, `NotificationSubmissionDeleted` even though this repo emits and integration-tests all three | This repo has full IT coverage for all 3 (`NotificationIT.softDelete_shouldWriteNotificationDeletedEvent_whenDraft`, `..._whenSubmitted`, `cancelAmend_shouldWriteAmendmentCancelledOutboxEvent`) | See Missing Changes in `trade-imports-animals-tests` — not an issue in this repo |

*No further shared patterns beyond the above — config/env vars, dependency bumps and docs are unaffected by this PR.*

## Missing Changes

*None identified.* This repo is the source of the event-catalogue correction; every consuming repo in scope (`trade-imports-ins-backend`) already mirrors the new `OutboxEventType` constants it needs.

## Unique Changes

- `versionId` computation moved into `OutboxService.appendEvent` (counts prior `NotificationSubmitted` + `NotificationSubmissionAmended` events via new `OutboxEventRepository.countByAggregateIdAndEventTypeIn`), and the field became nullable (`@JsonInclude(NON_NULL)` on `ExchangedDocument`, `Integer` instead of primitive `int`). This is intentional per the ticket's decision panel ("compute it in the outbox — nothing persisted on `Notification`") and is scoped entirely to this repo — `trade-imports-ins-backend` only consumes the published payload and has no reason to compute `versionId` itself.
- `createNotification`, `cancelAmendNotification`, `softDeleteNotification`, `copyNotification` now route through `writeWithOutbox` instead of calling `notificationRepository.save` directly, and gained `correlationId`/`Actor` parameters end-to-end (controller → service). This is the "route through `writeWithOutbox` rather than growing a second path" tech note in the ticket and is internal to this repo's write path.
- `resolvedForOutbox` generalised from a single `NOTIFICATION_EDITED` check to a `DRAFT_GRADE_EVENTS` set (`NOTIFICATION_CREATED`, `NOTIFICATION_EDITED`, `NOTIFICATION_DELETED`) so draft-grade events get best-effort party resolution rather than the strict submission-grade resolution. Justified by the ticket's Javadoc note above the method; scoped to this repo's resolver.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found in this repo; 1 cross-repo gap flagged against `trade-imports-animals-tests` (see that repo's report)
**Summary:** This repo is internally consistent and its peer `trade-imports-ins-backend` mirrors every new `OutboxEventType` constant it introduces; the one gap found (missing E2E specs for 3 of the 5 new event types) belongs to `trade-imports-animals-tests`.
