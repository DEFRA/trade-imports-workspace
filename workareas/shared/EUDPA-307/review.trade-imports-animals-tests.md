# Repository Review: trade-imports-animals-tests

**PR:** #126
**Commit:** abe3087fb11e7a4a49b96e3b6aeba1f6d307bb6d
**Files Changed:** 4

## Summary
E2E coverage follows two of the ticket's five new/corrected transitions all the way through: the `NotificationSubmissionAmended` → `NotificationAmendmentRequested` rename on `SUBMITTED → AMEND`, and a new spec for `NotificationCreated` firing on draft creation. A replay-count fixture and the INS aggregation-store polling spec were both correctly updated for the extra `NotificationCreated` event now appearing in every create→submit journey. However, no E2E spec was added for the three other new event types this same ticket introduces (`NotificationAmendmentCancelled`, `NotificationDeleted`, `NotificationSubmissionDeleted`), despite the backend PR having full integration coverage for all three and the AC explicitly requiring the delete/cancel distinctions.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `tests/e2e/features/admin/outbox-event-amendment.spec.ts` | SAFE | 0 | 0 | 0 |
| `tests/e2e/features/admin/outbox-event-created.spec.ts` | NEEDS ATTENTION | 0 | 1 | 0 |
| `tests/e2e/features/admin/outbox-event-replay.spec.ts` | SAFE | 0 | 0 | 1 |
| `tests/e2e/features/ins/aggregated-notification.spec.ts` | SAFE | 0 | 0 | 0 |

## Positive Observations
- The amendment-requested rename is a clean, mechanical, fully-consistent fix — constant, poll filter and assertion all updated together, matching the backend correction exactly.
- `aggregated-notification.spec.ts`'s polling rework (matching on the fully-populated DRAFT shape instead of a bare status) is a genuine flake fix with a clear comment explaining why `NotificationCreated` firing before transport details are filled in made the old poll unsafe.
- `outbox-event-created.spec.ts` is a solid template the missing specs (item 3) can follow directly.

## Test Coverage
- **Unit Tests:** N/A (E2E-only repo).
- **Integration/E2E Tests:** Partial — 2 of 5 new event types get dedicated E2E coverage; `NotificationAmendmentCancelled`, `NotificationDeleted`, and `NotificationSubmissionDeleted` have none in this repo (see item 3, sourced from the cross-repo consistency check).

## Risk Assessment
**Overall Risk:** Medium
**Rationale:** The changes made are correct, but the ticket's AC explicitly names the cancel-amend and both delete distinctions as required behaviour, and this repo's own established one-spec-per-event pattern was followed for only 2 of the 5 new event types — a real, AC-relevant coverage gap rather than a style nit.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | tests/e2e/features/admin/outbox-event-created.spec.ts | 32 | Major | test-coverage | New NotificationCreated envelope test omits actor/_id/timestamp/correlationId assertions that the sibling NotificationSubmitted test (outbox-event-notification.spec.ts) makes for the same envelope, even though createNotification now passes actor through to writeWithOutbox (NotificationService.java createNotification -> OutboxEventType.NOTIFICATION_CREATED) | Assert doc.actor against the signed-in EXPECTED_ACTOR (as outbox-event-notification.spec.ts does), plus doc._id format, doc.timestamp instanceof Date, metadata.correlationId defined, and statusChanges[0].dateChanged, to cover the new actor-propagation behaviour this ticket introduces |  |  |  |
| 2 | tests/e2e/features/admin/outbox-event-replay.spec.ts | 29 | Minor | test-name-drift | Test name still says the audit record covers 'both outbox events', but this PR raised the fixture's expected event count to 3 (lines 14, 24, 35, 56) — the title no longer matches what the test asserts | Update the test name to 'writes a REPLAY_EVENTS audit record covering three outbox events' (or similar) to match numberOfEvents: 3 |  |  |  |
| 3 | tests/e2e/features/admin/ | — | Major | test-coverage | No E2E spec added for NotificationAmendmentCancelled, NotificationDeleted, or NotificationSubmissionDeleted, despite the backend PR (trade-imports-animals-backend#83) having full integration-test coverage for all three and the ticket's AC explicitly requiring both distinctions ('Cancelling an amendment emits NotificationAmendmentCancelled...'; 'Deleting distinguishes NotificationDeleted...from NotificationSubmissionDeleted...'). This repo's own one-spec-per-event pattern (outbox-event-created.spec.ts, outbox-event-amendment.spec.ts) was followed for 2 of the 5 new event types but not these 3. | Add outbox-event-amendment-cancelled.spec.ts and outbox-event-deleted.spec.ts (or extend an existing admin spec file) covering the cancel-amend and both delete transitions, using outbox-event-created.spec.ts as the template, mirroring the backend's NotificationIT coverage. |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
