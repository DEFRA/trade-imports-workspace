# Consistency Check: trade-imports-animals-tests

**Ticket:** EUDPA-307
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-tests, trade-imports-ins-backend, trade-imports-workspace
**PR:** #126 | **Commit:** abe3087fb11e7a4a49b96e3b6aeba1f6d307bb6d

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| Rename `NotificationSubmissionAmended` → `NotificationAmendmentRequested` on the SUBMITTED→AMEND transition | trade-imports-animals-backend ✅ `NotificationService.amendNotification` corrected | ✅ `outbox-event-amendment.spec.ts` updated (constant renamed, assertions updated, `statusChanges` still length 3) | CONSISTENT |
| New event: `NotificationCreated` fires immediately on draft creation, before this it fired nothing | trade-imports-animals-backend ✅ `createNotification` now routes through `writeWithOutbox` | ✅ New spec `outbox-event-created.spec.ts` added, asserting `aggregateVersion=1`, `notificationStatusCode=DRAFT`, `versionId` undefined | CONSISTENT |
| Outbox event count shifts from 2→3 wherever a create+submit journey is asserted | trade-imports-animals-backend ✅ every affected IT updated (`NotificationIT`, `ReplayIT`, `OutboxPollerIT`) | ✅ `outbox-event-replay.spec.ts` updated (2→3 rows before/after replay, `numberOfEvents` 2→3) | CONSISTENT |
| Aggregation store must tolerate `NotificationCreated` firing before transport fields are populated | trade-imports-ins-backend ✅ dispatches `NotificationCreated` to `upsertService.upsert(...)` like any other event | ✅ `aggregated-notification.spec.ts` reworked to poll for the fully-populated DRAFT document rather than bare `status: 'DRAFT'`, with a comment explaining why | CONSISTENT |
| E2E spec per new outbox event type — established pattern is one spec (or spec section) per emitted event type, as done for `NotificationCreated` and `NotificationAmendmentRequested` in this PR | trade-imports-animals-backend ✅ has integration-test coverage in `NotificationIT`/`OutboxServiceTest` for all 5 new event types, including `NotificationAmendmentCancelled`, `NotificationDeleted`, `NotificationSubmissionDeleted` | ❌ No E2E spec added for `NotificationAmendmentCancelled` (cancel-amend), `NotificationDeleted` (soft-delete from DRAFT), or `NotificationSubmissionDeleted` (soft-delete from SUBMITTED/AMEND) | INCONSISTENT |

## Missing Changes

- **E2E coverage for the three remaining new event types.** This PR added an E2E spec for `NotificationCreated` (`outbox-event-created.spec.ts`) and updated the existing amendment spec for `NotificationAmendmentRequested`, following the repo's established one-spec-per-event pattern (`tests/e2e/features/admin/outbox-event-*.spec.ts`). The backend PR (#83) emits and integration-tests two further new transitions this repo has no E2E coverage for:
  - `NotificationAmendmentCancelled` (cancel-amend endpoint) — backend: `NotificationIT.cancelAmend_shouldWriteAmendmentCancelledOutboxEvent`
  - `NotificationDeleted` / `NotificationSubmissionDeleted` (soft-delete from DRAFT vs. SUBMITTED/AMEND) — backend: `NotificationIT.softDelete_shouldWriteNotificationDeletedEvent_whenDraft`, `softDelete_shouldWriteNotificationSubmissionDeletedEvent_whenSubmitted`

  Given the AC explicitly calls out both ("Cancelling an amendment emits `NotificationAmendmentCancelled`..."; "Deleting distinguishes `NotificationDeleted`... from `NotificationSubmissionDeleted`..."), and this repo already has the pattern and the Mongo-polling admin fixtures needed (`outbox-event-created.spec.ts` is a ready template), this reads as a genuine gap rather than an intentional scope cut.

## Unique Changes

*None identified beyond what's covered above* — the `outbox-event-replay.spec.ts` count bump (2→3) and the `aggregated-notification.spec.ts` polling rework are both direct, expected consequences of the backend now emitting `NotificationCreated` on every create.

## Verdict

**Status:** INCONSISTENCIES FOUND
**Issues:** 1 inconsistency found (E2E coverage gap for 3 of the 5 new outbox event types)
**Summary:** The PR correctly follows through on the two transitions it does cover (create, amendment-requested rename) but leaves the cancel-amend and both delete transitions without E2E assertions despite the backend having full coverage and the AC explicitly requiring them.
