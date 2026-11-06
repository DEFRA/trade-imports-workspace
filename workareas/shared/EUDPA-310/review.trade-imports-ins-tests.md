# Repository Review: trade-imports-ins-tests

**PR:** [#5](https://github.com/DEFRA/trade-imports-ins-tests/pull/5)
**Commit:** `8c589a2`
**Files Changed:** 3

## Summary

Extends outbox event type models, adds `submitNotificationWithDocument` journey helper, and E2E-asserts `referenceDocument` payload against Mongo after a scanned document upload.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `outbox-event-document.ts` | SAFE | 0 | 0 | 0 |
| `journey.ts` | SAFE | 0 | 0 | 0 |
| `outbox-event-notification.spec.ts` | SAFE | 0 | 0 | 1 |

## Positive Observations

- End-to-end proof of codelist mapping (`853` for veterinary health certificate) with date-only `issueDateTime`.
- Existing no-document test now asserts `referenceDocument` key is omitted, not empty.

## Test Coverage

- **E2E tests:** Mongo outbox read for submit with and without documents.
- **Gap:** Only `NotificationSubmitted` event type exercised at E2E level.

## Risk Assessment

**Overall Risk:** Low
**Rationale:** Strong happy-path E2E; minor gap on other event types.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | `outbox-event-notification.spec.ts` | 114 | Minor | test-coverage | E2E proves referenceDocument only on NotificationSubmitted; AC #7 requires the same on every GBN-AG event type. | Optional: add parametrized or spot-check tests for at least one non-submit event (e.g. NOTIFICATION_EDITED after upload) if stack cost is acceptable. | | | |

## Repository Verdict

**Status:** SAFE
