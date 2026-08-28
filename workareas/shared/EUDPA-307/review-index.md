# Code Review: EUDPA-307

**Ticket:** Emit the full notification lifecycle event catalogue
**Reviewer:** Claude Code Agent
**Date:** 2026-08-28
**Verdict:** CONCERNS

## Summary
`trade-imports-animals-backend` correctly implements the full seven-transition event catalogue and both named mis-mapping fixes, but ships with a real correctness bug (`versionId: 0` can leak on a never-submitted draft edit) and a performance gap (an unindexed query now on the hot path of every lifecycle transition). `trade-imports-animals-tests` and `trade-imports-ins-backend` both correctly mirror the transitions and event types they cover, but each has a test-coverage gap flagged by the cross-repo consistency check — most notably, three of the five new event types have no E2E coverage despite the AC explicitly requiring two of those distinctions.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-backend | #83 | 7049086 | 17 | NEEDS ATTENTION | [review.trade-imports-animals-backend.md](review.trade-imports-animals-backend.md) |
| trade-imports-animals-tests | #126 | abe3087 | 4 | NEEDS ATTENTION | [review.trade-imports-animals-tests.md](review.trade-imports-animals-tests.md) |
| trade-imports-ins-backend | #5 | 5d50e20 | 3 | SAFE | [review.trade-imports-ins-backend.md](review.trade-imports-ins-backend.md) |
| trade-imports-workspace | #13 (merged) | b4b4595 | 2 | SAFE | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check
| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | Every transition emits its schema-specified event, and no other | Yes | Verified transition-by-transition against `OutboxEventType`/`NotificationService`. |
| 2 | Every event type under `uk.gov.defra.imports.notification.*`, `OutboxEventType` internally consistent | Yes | Confirmed in both backend repos; `ins-backend` mirrors exactly. |
| 3 | Downstream consumers told before the change ships | Not verified | Process/communication AC, outside what a code diff can confirm. |
| 4 | Each event's `data` validates against that event's schema | Yes (as reviewed) | Cross-checked payload shapes (`ExchangedDocument`, `GbnAgEventData`) against schema field lists; schemas repo itself not in this PR set. |
| 5 | Creating a notification emits `NotificationCreated` | Yes | `createNotification` now routes through `writeWithOutbox`. |
| 6 | Copying emits `NotificationCreated` for the new notification, nothing for the source | Partially | Behaviour is correct, but the unit test asserting "nothing for the source" doesn't actually constrain the mock (animals-backend items 10/11) — a regression here wouldn't be caught. |
| 7 | Cancelling an amendment emits `NotificationAmendmentCancelled` with the reverted snapshot | Partially | Correct in backend (unit + IT covered); no E2E assertion in `trade-imports-animals-tests` (item 3). |
| 8 | Deleting distinguishes `NotificationDeleted` (DRAFT) from `NotificationSubmissionDeleted` (SUBMITTED/AMEND) | Partially | Correct in backend (unit + IT covered); no E2E assertion in `trade-imports-animals-tests` (item 3). |
| 9 | Resubmitting emits `NotificationSubmissionAmended`; opening for amendment emits `NotificationAmendmentRequested` | Partially | Correct in code and E2E-covered for the amendment-requested half; the resubmit half has no IT-level event-type assertion (animals-backend item 6). |
| 10 | All events share one `aggregateVersion` sequence, no gaps or reuse | Yes | Unchanged monotonic-counter logic, unaffected by this diff. |
| 11 | `versionId` reads 1 on first submission, increments only on re-submission, doesn't move on amend-open/cancel/delete, independent of `aggregateVersion` | Partially | Correct for the 7 catalogued transitions, but `NOTIFICATION_EDITED` (a pre-existing, out-of-catalogue event fired on every draft/AMEND save) isn't excluded from the count, so a draft edited before its first submission emits `versionId: 0` — a value the schema never intends (animals-backend item 5). |
| 12 | `versionId` computed in the outbox by counting submission events, nothing persisted on `Notification` | Yes | `OutboxService.computeVersionId`, counted before the row is written. |
| 13 | Re-publishing a stored event reproduces the same `versionId` | Yes | Computed pre-write into the immutable payload, not at publish. |
| 14 | Events reach external consumers through the gateway exactly as today | Not verified | Gateway repo not part of this PR set / review scope. |

## Test Coverage Assessment
- **Unit Tests:** Present and thorough across all three application repos; one test-quality gap (animals-backend item 10) where an assertion doesn't actually enforce the behaviour it claims to.
- **Integration Tests:** Present for 6 of 7 transitions at the IT level in `trade-imports-animals-backend`; missing an event-type assertion for the AMEND→SUBMITTED resubmit path (item 6).
- **E2E Tests:** Present for 2 of the 5 new event types in `trade-imports-animals-tests`; missing for `NotificationAmendmentCancelled`, `NotificationDeleted`, `NotificationSubmissionDeleted` (item 3) despite the AC explicitly requiring the delete/cancel distinctions.

## Configuration & Environment
- **New Environment Variables:** None.
- **Database Changes:** None applied by this diff, but `OutboxEventRepository.countByAggregateIdAndEventTypeIn` needs a new compound index (`{aggregateId, eventType}`) on `OutboxEvent` that this PR does not add (animals-backend item 4).

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Medium — `versionId: 0` leak on pre-submission draft edits (item 5) |
| Code Quality | Low — minor duplication/doc-comment findings only |
| Security | Low — no security-relevant surface touched |
| Test Coverage | Medium — real AC-relevant E2E gap (3 of 5 event types) and one unenforced unit assertion |
| Performance | Medium — new unindexed query on the hot path of every lifecycle transition |

## Conclusion
The event-catalogue correction and outbox routing are implemented correctly for every transition the ticket specifies, and the cross-repo wiring (`ins-backend` mirroring the enum, `animals-tests` covering 2 of 5 event types) is internally consistent where it exists. Before merge: fix the `NOTIFICATION_EDITED`/`versionId` leak and add the missing compound index in `trade-imports-animals-backend`, and close the E2E coverage gap in `trade-imports-animals-tests` for the cancel-amend and delete transitions the AC calls out by name. Full item lists and fixes are in each `review.{repo}.md`.
