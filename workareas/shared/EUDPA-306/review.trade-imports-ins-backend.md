# Repository Review: trade-imports-ins-backend

**PR:** #7
**Commit:** c4c70e7f766295bdaf516aa784e4528b96439627
**Files Changed:** 10

## Summary
This open PR adds `GET /notifications` over the aggregated store: 1-based pagination, allowlisted sort, exact reference lookup, and exclusion of `DELETED`. The query service follows the animals dashboard house pattern (EUDPA-188/189). Organisation scoping is correctly omitted.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationController.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationPageResponse.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationQueryService.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationRepository.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationSort.java` | SAFE | 0 | 0 | 0 |
| `src/main/resources/application-local.yml` | SAFE | 0 | 0 | 0 |
| `src/main/resources/application.yml` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/ins/backend/integration/AggregatedNotificationControllerIT.java` | NEEDS ATTENTION | 0 | 2 | 3 |
| `src/test/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationQueryServiceTest.java` | NEEDS ATTENTION | 0 | 1 | 1 |
| `src/test/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationSortTest.java` | SAFE | 0 | 0 | 1 |

## Positive Observations
Sort is an allowlist with a safe default, page size 25 matches the frontend stub, and a status denylist (not an allowlist) keeps AC2 true when new journeys appear. Swagger UI is off in deployed config and on locally.

## Test Coverage
- Unit tests: Query service covers list, pagination math, and exact lookup; sort forwarding on `PageRequest` is not asserted. Sort helper tests are thorough aside from naming.
- Integration tests: Default sort, deleted exclusion, lookup and empty store are present. Missing: `?page=` slicing, AC1 row fields (commodity), and a prefix case that proves exact-match.

## Risk Assessment
**Overall Risk:** Medium
**Rationale:** Invalid `page` can 500, list queries have no indexes, and HTTP tests would not catch a dropped page param or missing AC1 columns.

## Items

Items scoped to EUDPA-306. OpenAPI, Given/When/Then comments, `dropCollection`, and test naming are Won't Fix.

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationController.java | 37 | Major | error-handling | @Min(1) on page uses method validation (ConstraintViolationException) but GlobalExceptionHandler only maps MethodArgumentNotValidException to 400 and catches RuntimeException as 500, so GET /notifications?page=0 will 500. | Handle ConstraintViolationException as 400 ProblemDetail and add an HTTP test that page=0 returns 400, not 500. |  |  |  |
| 2 | src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationPageResponse.java | 10 | Major | openapi | Public page-response record and its fields have no @Schema annotations, so SpringDoc omits descriptions and requiredMode (which can silently break generated clients). | Annotate the record and each component with @Schema(description, requiredMode=REQUIRED), matching java/openapi-springdoc.md DTO defaults. | Won't Fix | — | Out of EUDPA-306: OpenAPI @Schema does not block the dashboard query contract. |
| 3 | src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationRepository.java | 10 | Major | performance | findAllByStatusNot and findByReferenceNumberAndStatusNot add derived queries with no matching Mongo indexes on AggregatedNotification, so list pagination/sort and reference lookup will collection-scan as the store grows; Optional lookup also throws if duplicate referenceNumbers exist. | Add indexes on AggregatedNotification to match the new queries: unique sparse on referenceNumber, and compounds covering status plus arrivalDate/lastUpdated for the paginated list. |  |  |  |
| 4 | src/test/java/uk/gov/defra/trade/imports/ins/backend/integration/AggregatedNotificationControllerIT.java | 31 | Major | coverage | GET /notifications is never called with page, so a controller that drops the page param would still pass this IT; pagination is only asserted as default page 1. | Seed more than page-size rows and GET /notifications?page=2, asserting the second slice plus size/totalPages. |  |  |  |
| 5 | src/test/java/uk/gov/defra/trade/imports/ins/backend/integration/AggregatedNotificationControllerIT.java | 34 | Major | coverage | List assertions only check referenceNumber; AC1 also requires status, origin country, commodity and arrival date on each row, and seed never sets commodity. | Seed commodity and assert jsonPath for status, originCountry, commodity and arrivalDate on a returned row. |  |  |  |
| 6 | src/test/java/uk/gov/defra/trade/imports/ins/backend/integration/AggregatedNotificationControllerIT.java | 56 | Minor | coverage | The named exact-match test only picks one of two complete references; a prefix or contains lookup of GBN-AG-26-002 would still pass, so AC4 exact-match is not locked. | Add a case that GET with a prefix or substring of a stored reference returns empty content. |  |  |  |
| 7 | src/test/java/uk/gov/defra/trade/imports/ins/backend/integration/AggregatedNotificationControllerIT.java | 26 | Minor | test-style | New IT methods omit the required Given / When / Then comment blocks used in NotificationSqsListenerIT and mandated by the integration testing guide. | Add // Given, // When, // Then (or // When / Then) comments to each test. | Won't Fix | — | Out of EUDPA-306: Given/When/Then comment style, not ticket AC. |
| 8 | src/test/java/uk/gov/defra/trade/imports/ins/backend/integration/AggregatedNotificationControllerIT.java | 22 | Minor | test-isolation | setup drops the Mongo collection instead of deleting documents via the repository, which diverges from IntegrationBase guidance and from NotificationSqsListenerIT. | Inject AggregatedNotificationRepository and call deleteAll() in @BeforeEach. | Won't Fix | — | Out of EUDPA-306: dropCollection vs deleteAll isolation style. |
| 9 | src/test/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationQueryServiceTest.java | 53 | Major | missing-test | findAll always builds PageRequest with AggregatedNotificationSort.toSort(sort), but every test passes null for sort and the Pageable captor only asserts page index and size — dropping or ignoring sort would still pass. | Capture Pageable in the list-path tests and assert getSort() equals the default sort for null, plus one test that a non-null sort param (e.g. lastUpdated,asc) is forwarded on the PageRequest. |  |  |  |
| 10 | src/test/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationQueryServiceTest.java | 38 | Minor | test-style | None of the tests use the required Given / When / Then comment blocks. | Add explicit // Given, // When, // Then (or // When & Then) comments to each test method. | Won't Fix | — | Out of EUDPA-306: Given/When/Then comment style, not ticket AC. |
| 11 | src/test/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationSortTest.java | 10 | Minor | naming | Test method names omit the house {subject}_{shouldDoWhat} pattern (e.g. nullSort_defaultsToArrivalDateDesc). | Rename methods to toSort_shouldDefaultToArrivalDateDesc_whenNull (and the same should-form for the other cases). | Won't Fix | — | Out of EUDPA-306: test method naming, not ticket AC. |

## Repository Verdict
**Status:** NEEDS ATTENTION
