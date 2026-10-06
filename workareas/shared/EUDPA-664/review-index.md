# Code Review: EUDPA-664

**Ticket:** Carry date-only fields as LocalDate and store them as strings in Mongo
**Reviewer:** Cursor agent
**Date:** 2026-10-05
**Verdict:** CONCERNS

## Summary

The four PRs on `chore/EUDPA-664-localdate-date-only` carry `arrivalDate`, `exitDate` and `dateOfIssue` as a calendar date: `YYYY-MM-DD` from the frontend, `LocalDate` on the animals API, a string in Mongo, and a UTC-midnight instant only on the GBN-AG message to PIMS. Moments stay instants. One comment on the dashboard still describes a date-only arrival as midnight UTC, and the frontend zone proof for the new date helper does not run in a zone where the bug it describes fails.

## Repositories Analyzed

| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-animals-backend | #104 | 780b757 | 33 | SAFE | [review.trade-imports-animals-backend.md](review.trade-imports-animals-backend.md) |
| trade-imports-animals-frontend | #390 | 3ab87a2 | 15 | RISKY | [review.trade-imports-animals-frontend.md](review.trade-imports-animals-frontend.md) |
| trade-imports-ins-tests | #14 | 377b909 | 6 | SAFE | [review.trade-imports-ins-tests.md](review.trade-imports-ins-tests.md) |
| trade-imports-workspace | #92 | d819dfc | 2 | SAFE | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check

| # | Criterion | Met? | Notes |
|---|-----------|------|-------|
| 1 | The frontend sends `arrivalDate`, `exitDate` and `dateOfIssue` as `YYYY-MM-DD`, with no time and no offset. | Yes | `isoDateFromDateParts` at the mapper, upload and stub call sites. |
| 2 | The frontend does not send a date-only field when the trader leaves the day, month and year blank. | Yes | Blank parts return undefined, and the mapper tests assert the keys are absent. |
| 3 | The backend returns 400 when a date-only field carries a time or an offset. | Yes | `StrictLocalDateModule`, covered by the notification and document controller tests. |
| 4 | The backend returns date-only fields as `YYYY-MM-DD` in every response that carries them. | Yes | Controller and document round-trip tests pin the wire form. |
| 5 | Mongo stores each date-only field as a `YYYY-MM-DD` string, not a BSON date. An integration test reads the raw document and asserts this. | Yes | `PersistedTimestampZoneIT` and `DocumentControllerIT`, plus the ins-tests persistence specs. |
| 6 | A stored date-only field reads back as the same calendar date whatever the JVM default zone. | Yes | `PersistedTimestampZoneIT` and `LocalDateStringConvertersTest`. |
| 7 | The backend has no UTC-midnight truncation for date-only fields, and `UtcLocalDateConverters` is deleted. | Yes | Converter class and its test are removed. Truncation is gone from both services. |
| 8 | The GBN-AG message to PIMS still sends an instant at UTC midnight, so `scheduledOccurrenceDateTime` is unchanged for a given arrival date. | Yes | `TransportEvent` converts the `LocalDate` at UTC midnight. `GbnAgMapperTest` pins the string under `Europe/London`. |
| 9 | `created`, `updated` and `submittedAt` are still `Instant` and still carry a `Z` suffix on the wire. | Yes | Types unchanged. `OpenApiDateFormatTest` pins `format: date-time`. |
| 10 | The OpenAPI schema shows date-only fields as `format: date` and moments as `format: date-time`. | Yes | `OpenApiDateFormatTest`. |
| 11 | `docs/best-practices/java/spring-data-mongodb.md` section 4 describes `LocalDate` stored as a string, and `Instant` for moments. | Yes | Workspace PR #92. |
| 12 | `docs/best-practices/rest-api/rest-api.md` no longer says instants override its `date` form. | Yes | Workspace PR #92. |
| 13 | No doc, Javadoc, `@Schema` description or code comment describes date-only fields as instants or as UTC midnight. | No | `asUtcInstant` in `notification-helper.js` still says a date-only arrival becomes midnight UTC. |
| 14 | Unit, integration and end-to-end tests pass in all affected repos. | Not run | This review did not execute the suites. The tests were updated to the new contract. |

## Test Coverage Assessment

- **Unit Tests:** Present
- **Integration Tests:** Present

## Configuration & Environment

- **New Environment Variables:** None
- **Database Changes:** Date-only fields change from a BSON date to a `YYYY-MM-DD` string. The ticket says the services are not live, so there is no data migration.

## Risk Matrix

| Category | Risk Level |
|----------|------------|
| Correctness | Low |
| Code Quality | Medium |
| Security | Low |
| Test Coverage | Medium |

## Conclusion

The date-only design is in place across the backend, the frontend, the end-to-end specs and the two practice notes, and the four repos agree. Address the dashboard comment that still calls a date-only arrival midnight UTC, and move the `isoDateFromDateParts` zone proof east of UTC, before merge. Item detail is in `review.trade-imports-animals-frontend.md`.
