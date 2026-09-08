# Repository Review: trade-imports-animals-backend

**PR:** #83
**Commit:** 0ba65961acc9f612158eba8e7e7fc15d66a14961
**Files Changed:** 18

## Summary
This merged PR extends the animals outbox so create, copy, amend, cancel-amend, edit and delete emit the firehose and lifecycle events the INS aggregator needs for AC7. `versionId` is now computed from submission-event counts instead of being hardcoded as 1, and actor/trace headers are threaded through the remaining mutating endpoints.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationController.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxEvent.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxEventRepository.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxEventType.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxService.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/ExchangedDocument.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgEventData.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgEventDataMapper.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/OutboxIntegrationBase.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/OutboxPollerIT.java` | NEEDS ATTENTION | 0 | 2 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/ReplayIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java` | NEEDS ATTENTION | 0 | 2 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/outbox/OutboxEventTypeTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/outbox/OutboxServiceTest.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgMapperTest.java` | SAFE | 0 | 0 | 0 |

## Positive Observations
New event types match the schema catalogue, `SUBMISSION_EVENTS` is a small allowlist, and `writeWithOutbox` is reused so create/copy/delete cannot skip the outbox. Unit and IT tests were retargeted for create-time events rather than assuming a single submit event.

## Test Coverage
- Unit tests: Present for event types, versionId matrix (except EDITED), and controller actor forwarding. Copy and error-path tests do not pin the outbox aggregate or assert no append.
- Integration tests: NotificationIT and ReplayIT match the new counts. OutboxPollerIT no longer asserts Created payloads or SNS order.

## Risk Assessment
**Overall Risk:** Medium
**Rationale:** AMEND-phase `NotificationEdited` omits `versionId`, which can drop the current version from the firehose snapshot the dashboard upserts.

## Items

All six items stay in EUDPA-306 (AC7 firehose / new event path).

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxService.java | 45 | Major | correctness | NO_VERSION_ID_EVENTS always omits versionId for NOTIFICATION_EDITED, including AMEND-phase saves after a submission, so the firehose snapshot can drop the current version; VersionId tests never cover EDITED. | Omit versionId only when submissionCount is 0 (keep CREATED/DELETED as always-absent); carry the current count on post-submit EDITED; add VersionId tests for draft edit (absent) and AMEND edit (carry-forward). |  |  |  |
| 2 | src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/OutboxPollerIT.java | 50 | Major | missing-assertion | shouldDeliverToSnsAndMarkPublishedAt (and shouldDeliverNotificationEditedToSns) now wait for two SNS messages after NotificationCreated was added as v1, but only inspect the later event; a wrong Created eventType or payload on the wire would still pass. | Assert the aggregateVersion 1 envelope too: eventType NotificationCreated, publishedAt set, and the same identifier/correlation checks used for Submitted/Edited. |  |  |  |
| 3 | src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/OutboxPollerIT.java | 123 | Major | missing-assertion | shouldPublishAggregateVersionsInOrder no longer asserts delivery order: it sorts Mongo events by version (tautological) and picks SNS messages with snsEnvelopeByAggregateVersion, so any permutation of v1-v3 would pass. | Assert SQS arrival order is aggregateVersion 1, then 2, then 3 (Created, Submitted, Submitted), or extract versions from messages in receive order and assert they equal [1, 2, 3]. |  |  |  |
| 4 | src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java | 1961 | Major | tests | copyNotification_shouldEmitNotificationCreated_forNewNotification uses any() for the aggregate, so it still passes if NOTIFICATION_CREATED is emitted for the source rather than the new copy | Capture the appendEvent aggregate and assert its referenceNumber equals newRef; keep verifyNoMoreInteractions to ensure the source emits nothing |  |  |  |
| 5 | src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java | 2367 | Major | tests | softDelete_shouldBeIdempotent_onAlreadyDeleted (and the copy/cancelAmend/softDelete error-path tests) still only verify never save, so a spurious outbox append on those paths would not fail | Add verify(outboxService, never()).appendEvent(any(), any(), any(), any()) on the idempotent delete and the copy/cancelAmend/softDelete failure tests, matching submitNotification_shouldThrowBadRequest_whenAlreadySubmitted |  |  |  |
| 6 | src/test/java/uk/gov/defra/trade/imports/animals/outbox/OutboxServiceTest.java | 470 | Major | coverage | VersionId nested class covers CREATED and DELETED as no-versionId events but omits NOTIFICATION_EDITED, which OutboxService.NO_VERSION_ID_EVENTS also includes (including amend-phase page saves after a submission). | Add a VersionId test that appends NOTIFICATION_EDITED (DRAFT, and AMEND after a stubbed submission count) and asserts exchangedDocument does not contain versionId. |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
