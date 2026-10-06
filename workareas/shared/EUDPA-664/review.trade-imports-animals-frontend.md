# Repository Review: trade-imports-animals-frontend

**PR:** #390
**Commit:** 3ab87a2
**Files Changed:** 15

## Summary

`instantFromDateParts` is now `isoDateFromDateParts`. `exitDate`, `arrivalDate` and `dateOfIssue` go to the API as `YYYY-MM-DD`, and a blank day, month or year is left out of the request. Dashboard rendering of moments is unchanged. Two findings remain: a comment on the dashboard date parser still calls a date-only arrival midnight UTC, and the zone proof for `isoDateFromDateParts` runs west of UTC, where the local-`Date` bug it describes does not change the date string.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/server/app/lib/validate/calendar.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/lib/validate/calendar.test.js` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/server/app/lib/validate/index.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/document-uploads/real.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/mapper-a-contract.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/mapper-a/sections/direct-fields.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/mapper-a/sections/transport.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/notification-mapper/notification-mapper.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/services/persistence/records/stub/marshal/list-item.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/dashboard/notification-helper.js` | RISKY | 1 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/dashboard/notification-helper.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/dashboard/view-model/row/index.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/documents/controller.test.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/features/documents/handlers/reads/download.js` | SAFE | 0 | 0 | 0 |
| `src/server/app/sets/live-animals/journeys/linear/fixtures/characterisation-oracles.json` | SAFE | 0 | 0 | 0 |

## Positive Observations

The four call sites that used to build a UTC-midnight instant now call `isoDateFromDateParts`, and the mapper tests assert both the `YYYY-MM-DD` wire value and the omission of a blank date. Document upload sends `dateOfIssue` as a date with no time and no offset.

## Test Coverage

- Unit tests: Present for the mapper, the calendar helper, document upload and the dashboard row. The zone proof in `calendar.test.js` does not fail under `America/New_York`, so it does not catch the local-`Date` regression its comment describes.
- Integration tests: Not in this repo. End-to-end coverage of the stored string is in `trade-imports-ins-tests`.

## Risk Assessment

**Overall Risk:** Medium
**Rationale:** The wire format is correct, but a comment still describes a date-only arrival as midnight UTC, which the ticket forbids, and the zone proof does not exercise the zone where that bug shows.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/server/app/lib/validate/calendar.test.js | 192 | Major | test-gap | The isoDateFromDateParts zone proof runs in America/New_York, where new Date(year, month - 1, day).toISOString() still starts with 2026-07-21, so the local-Date regression the comment describes still passes. | Assert the same parts under EAST_OF_UTC or Europe/London, where that construction returns 2026-07-20. |  |  |  |
| 2 | src/server/app/sets/live-animals/journeys/linear/features/dashboard/notification-helper.js | 25 | Critical | ac-comment | The asUtcInstant comment says a date-only arrival date becomes midnight UTC, which this ticket forbids in comments. | Describe the date-only string as a calendar day parsed for formatCalendarDate, without calling it an instant or midnight UTC. |  |  |  |

## Repository Verdict

**Status:** RISKY
