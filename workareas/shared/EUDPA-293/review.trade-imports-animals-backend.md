# Repository Review: trade-imports-animals-backend

**PR:** #84
**Commit:** 6d0eca45c6a5ce0e34c9123cb15405e593558f87
**Files Changed:** 7

## Summary
Implements AC2: the authoritative backend gate that rejects a submit referencing one or more deleted (soft-deleted) address-book addresses. `ConsignmentPartyResolver.resolveParties` no longer fails fast on the first unresolved role — it now accumulates every unresolved role into a `LinkedHashMap` and throws a single new `UnresolvableConsignmentPartyException` naming all of them. `GlobalExceptionHandler` maps that exception to a 400 `ProblemDetail` with a per-role `errors` map, logged at WARN (moved down from the resolver's previous per-miss ERROR log, since a bad submit is caller error, not a service fault). Test coverage is thorough at both the unit (`ConsignmentPartyResolverTest`, `GlobalExceptionHandlerTest`) and integration (`NotificationIT`) levels, including a new multi-role-deleted scenario.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandler.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/exceptions/UnresolvableConsignmentPartyException.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/ConsignmentPartyResolver.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationController.java` | SAFE | 0 | 0 | 1 |
| `src/test/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandlerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java` | SAFE | 0 | 0 | 1 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/ConsignmentPartyResolverTest.java` | SAFE | 0 | 0 | 2 |

## Positive Observations
- Reporting every unresolved role in one pass (rather than fail-fast on the first) directly satisfies AC2's "naming each affected role" requirement, and is symmetric with the frontend's own "flag every outstanding role" behaviour.
- The ERROR → WARN log-level change is deliberate and documented: a caller-caused 400 shouldn't page anyone, and the new handler already logs it once.
- New role name constants replace magic strings in `ConsignmentPartyResolver`.
- Integration test coverage includes both a single-role and a new multi-role deleted-address scenario, asserting the exact per-role `errors` map shape.

## Test Coverage
- Unit tests: thorough — new exception type, role-order reporting, soft-deleted-address-as-unresolved cases.
- Integration tests: thorough — `NotificationIT` tightened to assert the per-role errors map shape and extended with a new two-role scenario.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** Small, well-tested, backward-compatible change to an already-covered code path; only Minor findings (doc drift, test duplication, missing OpenAPI schema detail).

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationController.java | 99 | Minor | openapi-docs | The 400 @ApiResponse on submit() now documents a structured errors-by-role body (per GlobalExceptionHandler.handleUnresolvableConsignmentPartyException) but still uses content = @Content with no schema or example, so the shape is only discoverable via prose | Add content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class), examples = @ExampleObject(...)) per the ProblemDetail documentation pattern |  |  |  |
| 2 | src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java | 2131 | Minor | doc-drift | The stub-matching doc comment (org+header matching) stayed on stubAddressBook after the diff moved that logic into the new stubAddressBookFor, so it now sits on a one-line delegator instead of the method it describes | Move the /** ... */ comment down onto stubAddressBookFor |  |  |  |
| 3 | src/test/java/uk/gov/defra/trade/imports/animals/notification/ConsignmentPartyResolverTest.java | 156 | Minor | test-duplication | shouldReportASoftDeletedAddressAsUnresolvableOnSubmission inlines the same 11-arg soft-deleted AddressBookRecord construction already used verbatim in shouldTreatASoftDeletedAddressAsUnresolvable (line 171), rather than a shared helper | Add a deletedAddressRecord(addressId, name) helper alongside the existing addressRecord() one and use it in both tests |  |  |  |
| 4 | src/test/java/uk/gov/defra/trade/imports/animals/notification/ConsignmentPartyResolverTest.java | 156 | Minor | test-duplication | shouldReportASoftDeletedAddressAsUnresolvableOnSubmission repeats the 11-arg AddressBookRecord soft-deleted construction already duplicated at shouldTreatASoftDeletedAddressAsUnresolvable (line ~171), instead of extending the existing addressRecord() helper | add a deletedAddressRecord(addressId, name) helper alongside addressRecord() and use it in both soft-deleted tests |  |  |  |

## Consistency Check
**Status:** CONSISTENT (0 inconsistencies)
Role vocabulary (`consignor`/`consignee`/`importer`/`destination`) is consistent with the frontend's `PARTIES`; "report every affected role" is implemented symmetrically on both sides; the backend correctly remains the authoritative gate per the ticket's tech notes. One cross-repo item flagged for confirmation, not a defect: the tests repo's new E2E spec doesn't independently call the backend submit endpoint with a deleted-address reference, but that scenario is already covered thoroughly by this repo's own `NotificationIT`.

## Repository Verdict
**Status:** SAFE
