# Consistency Check: trade-imports-animals-backend

**Ticket:** EUDPA-664
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #104 | **Commit:** 780b757

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `arrivalDate`, `exitDate` and `dateOfIssue` as `YYYY-MM-DD` (no time, no offset) | frontend ✅ sends that form, ins-tests ✅ asserts it, workspace ✅ documents it | ✅ `LocalDate` on the request, the document and the response | CONSISTENT |
| A blank date-only field is omitted, not sent as `0000-00-00` | frontend ✅ `isoDateFromDateParts` returns undefined; ins-tests ✅ empty arrival still saves | Not an API rule — absence is already valid | CONSISTENT |
| Mongo stores each date-only field as a `YYYY-MM-DD` string | ins-tests ✅ raw `arrivalDate` and `dateOfIssue`; workspace ✅ converter guide | ✅ `LocalDateStringConverters`, raw reads in `PersistedTimestampZoneIT` and `DocumentControllerIT` | CONSISTENT |
| A date-only value that carries a time or an offset is rejected with 400 | frontend ✅ no longer sends one; workspace ✅ documents `StrictLocalDateModule` | ✅ module plus `NotificationControllerTest` and `DocumentControllerTest` | CONSISTENT |
| `created`, `updated` and `submittedAt` stay instants with a `Z` | frontend ✅ dashboard moments unchanged; workspace ✅ Instant kept for moments | ✅ types unchanged; `OpenApiDateFormatTest` pins `format: date-time` | CONSISTENT |
| GBN-AG `scheduledOccurrenceDateTime` stays a UTC-midnight instant | workspace ✅ names `ZoneOffset.UTC`; ins-tests has no change, the emitted string is the same | ✅ `TransportEvent` converts `LocalDate` with `atStartOfDay(ZoneOffset.UTC)` | CONSISTENT |
| `UtcLocalDateConverters` deleted; no UTC-midnight truncation on save | workspace ✅ guide no longer tells readers to keep that pair | ✅ class deleted; truncation removed from `NotificationService` and `DocumentService` | CONSISTENT |
| `write-dates-as-timestamps: false` | Not a setting the other repos have | ✅ comment updated; value unchanged | CONSISTENT |

No shared patterns requiring a change this repo does not have.

## Missing Changes

*None identified.*

## Unique Changes

`LocalDateStringConverters`, `StrictLocalDateModule`, the `MongoConfig` registration, the `Application` static-block comment, and the OpenAPI format test belong only in this service. That matches the ticket: this is the only repo that types, stores and publishes the animals API dates. The GBN-AG conversion is the one place a calendar date becomes an instant, and `GbnAgMapperTest` pins `2026-07-21T00:00:00Z` under `Europe/London`.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The backend stores and returns calendar dates as `YYYY-MM-DD`, and the frontend, the end-to-end specs and the practice notes all use that same contract.
