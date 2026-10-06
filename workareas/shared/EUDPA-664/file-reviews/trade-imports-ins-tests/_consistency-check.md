# Consistency Check: trade-imports-ins-tests

**Ticket:** EUDPA-664
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #14 | **Commit:** 377b909

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `arrivalDate`, `exitDate` and `dateOfIssue` as `YYYY-MM-DD` (no time, no offset) | backend ✅ `LocalDate`; frontend ✅ sends that form; workspace ✅ documents it | ✅ Mongo models are `string`; persistence specs compare with `toIsoDate` | CONSISTENT |
| A blank date-only field is omitted, not sent as `0000-00-00` | frontend ✅ omits the keys; backend ✅ accepts a missing date | ✅ `arrival-details.spec.ts` still expects an empty submit to save, and the comment now says the blank date is left out | CONSISTENT |
| Mongo stores each date-only field as a `YYYY-MM-DD` string | backend ✅ raw BSON reads for arrival, exit and date of issue; workspace ✅ same rule | ✅ `arrivalDate` and `dateOfIssue` asserted on the raw document as strings | CONSISTENT |
| A date-only value that carries a time or an offset is rejected with 400 | backend ✅ controller tests | Not asserted here — these specs fill the date through the UI, which now sends `YYYY-MM-DD` | CONSISTENT |
| `created`, `updated` and `submittedAt` stay instants with a `Z` | backend ✅; frontend ✅; workspace ✅ | ✅ those fields are not retouched; only the three date-only fields changed type | CONSISTENT |
| GBN-AG `scheduledOccurrenceDateTime` stays a UTC-midnight instant | backend ✅ same string as before (`2026-07-21T00:00:00Z`); workspace ✅ | No spec change — the outbound instant is unchanged | CONSISTENT |
| Zone-stable date built from parts, never through a `Date` | frontend ✅ `isoDateFromDateParts`; backend ✅ string converters | ✅ `toIsoDate` replaces `toUtcDate` | CONSISTENT |

No shared patterns requiring a change this repo does not have.

## Missing Changes

*None identified.*

`exitDate` changed from `Date` to `string` on the notification document type. The persistence spec never asserted it, so there was no assertion to rewrite. Arrival date and date of issue, the two raw reads this suite already had, now expect `YYYY-MM-DD`.

## Unique Changes

`toIsoDate` takes a date only. The previous helper also accepted a time, and nothing else in this PR called it. That matches the ticket: these specs assert stored calendar dates, not moments.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The end-to-end models and raw Mongo asserts use the same `YYYY-MM-DD` strings the frontend sends and the backend stores.
