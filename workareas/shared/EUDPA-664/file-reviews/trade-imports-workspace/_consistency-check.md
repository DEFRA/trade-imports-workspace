# Consistency Check: trade-imports-workspace

**Ticket:** EUDPA-664
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #92 | **Commit:** d819dfc

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `arrivalDate`, `exitDate` and `dateOfIssue` as `YYYY-MM-DD` (no time, no offset) | backend ✅ `LocalDate`; frontend ✅ sends that form; ins-tests ✅ asserts it | ✅ `rest-api.md` drops the note that date-only fields override the `date` form | CONSISTENT |
| Mongo stores each date-only field as a `YYYY-MM-DD` string via a `LocalDate` ↔ `String` pair | backend ✅ `LocalDateStringConverters` registered in `MongoConfig` | ✅ section 4 of `spring-data-mongodb.md` describes that pair and names this backend | CONSISTENT |
| A date-only value that carries a time or an offset is rejected with 400 | backend ✅ `StrictLocalDateModule` | ✅ the guide shows `JsonFormat.Value.forLeniency(false)` on `LocalDate` | CONSISTENT |
| `created`, `updated` and `submittedAt` stay `Instant` | backend ✅; frontend ✅ dashboard moments unchanged | ✅ the guide keeps `Instant` for moments | CONSISTENT |
| GBN-AG `scheduledOccurrenceDateTime` is a UTC-midnight instant, zone named | backend ✅ `atStartOfDay(ZoneOffset.UTC)` | ✅ the guide shows that conversion and warns against `ZoneId.systemDefault()` | CONSISTENT |
| `UtcLocalDateConverters` is not the storage design | backend ✅ class deleted | ✅ the guide no longer tells readers to keep that pair | CONSISTENT |
| Raw read asserts a string for a date-only field and a `Date` for a moment | backend ✅ `PersistedTimestampZoneIT` and `DocumentControllerIT`; ins-tests ✅ string equality on the raw document | ✅ the verification sample matches those asserts | CONSISTENT |

No shared patterns requiring a change this repo does not have.

## Missing Changes

*None identified.*

The ticket names these two files and no others. A blank date omitted by the frontend is a mapper rule, not a REST or Mongo guide rule, so it is not restated here.

## Unique Changes

These two practice notes are the only documentation change in the set. They describe the animals backend as it is in PR 104: `LocalDate` on the wire and in the document, a string in Mongo, `Instant` for moments, and a UTC instant only on the way out to PIMS.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The Mongo and REST guides describe the same date-only design the backend, frontend and end-to-end specs implement.
