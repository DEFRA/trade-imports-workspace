# Repository Review: trade-imports-animals-backend

**PR:** #104
**Commit:** 780b757
**Files Changed:** 33

## Summary

Date-only fields (`arrivalDate`, `exitDate`, `dateOfIssue`) are `LocalDate` on the request, the document and the response, and Mongo stores them as `YYYY-MM-DD` strings through `LocalDateStringConverters`. `UtcLocalDateConverters` and the UTC-midnight truncation in `NotificationService` and `DocumentService` are gone. Moments stay `Instant`. `StrictLocalDateModule` rejects a date-only value that carries a time or an offset, and `TransportEvent` still converts a stored arrival date to a UTC-midnight instant for the GBN-AG message to PIMS.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/java/uk/gov/defra/trade/imports/animals/Application.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocument.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocumentDto.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentService.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentUploadRequest.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/configuration/LocalDateStringConverters.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/configuration/MongoConfig.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/configuration/StrictLocalDateModule.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/configuration/UtcLocalDateConverters.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandler.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationBase.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/Transport.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/TransportEvent.java` | SAFE | 0 | 0 | 0 |
| `src/main/resources/application.yml` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/OpenApiDateFormatTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocumentDtoTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocumentTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentControllerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentControllerTrailingSlashTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentServiceTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/configuration/LocalDateStringConvertersTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/configuration/UtcLocalDateConvertersTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandlerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/PersistedTimestampZoneIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/document/DocumentControllerIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/document/DocumentInitiateProductionModeIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapperTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/outbox/OutboxServiceTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgMapperTest.java` | SAFE | 0 | 0 | 0 |

## Positive Observations

The split between calendar dates and moments is held in the types, the converters, the OpenAPI formats and the tests. A raw Mongo read asserts the stored string, a zone-shifted JVM still reads the same calendar date back, and the GBN-AG mapper test pins `scheduledOccurrenceDateTime` to `2026-07-21T00:00:00Z` under `Europe/London`.

## Test Coverage

- Unit tests: Present. Controller tests reject a time or an offset with 400, converter tests cover write, read-back and zone stability, and the OpenAPI test pins `format: date` against `format: date-time`.
- Integration tests: Present. `PersistedTimestampZoneIT` and `DocumentControllerIT` read the raw document and assert a `YYYY-MM-DD` string.

## Risk Assessment

**Overall Risk:** Low
**Rationale:** The date-only contract, the string storage and the PIMS instant are implemented and tested, with no findings in this repo.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|

## Repository Verdict

**Status:** SAFE
