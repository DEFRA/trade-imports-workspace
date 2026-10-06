# Consistency Check: trade-imports-animals-frontend

**Ticket:** EUDPA-664
**All repos in scope:** trade-imports-animals-backend, trade-imports-animals-frontend, trade-imports-ins-tests, trade-imports-workspace
**PR:** #390 | **Commit:** 3ab87a2

## Cross-Repo Pattern Analysis

| Pattern | Other Repos | This Repo | Status |
|---------|-------------|-----------|--------|
| `arrivalDate`, `exitDate` and `dateOfIssue` as `YYYY-MM-DD` (no time, no offset) | backend ✅ `LocalDate` and 400 for a time or offset; ins-tests ✅ string asserts; workspace ✅ `date` form restored | ✅ `isoDateFromDateParts` in the exit-date mapper, the transport mapper, the document upload and the stub list item | CONSISTENT |
| A blank date-only field is omitted, not sent as `0000-00-00` | backend ✅ accepts a missing date; ins-tests ✅ empty arrival still saves a draft | ✅ undefined for blank parts, and a mapper test that the keys are absent | CONSISTENT |
| Mongo stores each date-only field as a `YYYY-MM-DD` string | backend ✅, ins-tests ✅ | Not this repo — it does not write Mongo | CONSISTENT |
| A date-only value that carries a time or an offset is rejected with 400 | backend ✅ `StrictLocalDateModule` | ✅ this repo no longer sends that shape; enforcement stays on the API | CONSISTENT |
| `created`, `updated` and `submittedAt` stay instants with a `Z` | backend ✅; workspace ✅ | ✅ dashboard moment rendering is unchanged; only the arrival column moved to a date-only value | CONSISTENT |
| GBN-AG `scheduledOccurrenceDateTime` stays a UTC-midnight instant | backend ✅; workspace ✅ | Not this repo — PIMS is fed from the backend | CONSISTENT |
| Practice notes match the wire form | workspace ✅ both guides rewritten | ✅ JSDoc no longer describes these fields as UTC-midnight instants on the wire | CONSISTENT |

No shared patterns requiring a change this repo does not have.

## Missing Changes

*None identified.*

## Unique Changes

Renaming `instantFromDateParts` to `isoDateFromDateParts`, and the dashboard helper that parses a date-only arrival as midnight UTC so the calendar renderer can read UTC components, are local to this UI. The ticket asks for that split: send `YYYY-MM-DD`, and keep service-zone rendering for moments. The row test that still feeds an instant into the arrival column is marked as a renderer probe, not a payload the API accepts.

## Verdict

**Status:** CONSISTENT
**Issues:** 0 inconsistencies found
**Summary:** The frontend sends the three date-only fields as `YYYY-MM-DD` and leaves a blank date out, which is what the backend now accepts and what the end-to-end specs assert.
