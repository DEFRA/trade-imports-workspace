# File Review Coverage Verification

**Ticket:** EUDPA-713
**Last Verified:** 2026-11-09T12:05:27Z
**Total files changed:** 76
**Files reviewed:** 76
**Coverage:** 100%

## Changed Files Checklist

| # | Repository | Changed File | Status |
|---|------------|--------------|--------|
| 1 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentController.java` | ✅ Reviewed |
| 2 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/exceptions/ForbiddenException.java` | ✅ Reviewed |
| 3 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandler.java` | ✅ Reviewed |
| 4 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/filter/TraderOrganisationHeaderFilter.java` | ✅ Reviewed |
| 5 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationAggregate.java` | ✅ Reviewed |
| 6 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationController.java` | ✅ Reviewed |
| 7 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationRepository.java` | ✅ Reviewed |
| 8 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java` | ✅ Reviewed |
| 9 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/OrganisationIdCleanup.java` | ✅ Reviewed |
| 10 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentControllerTest.java` | ✅ Reviewed |
| 11 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentControllerTrailingSlashTest.java` | ✅ Reviewed |
| 12 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/EcsLoggingIT.java` | ✅ Reviewed |
| 13 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/IntegrationBase.java` | ✅ Reviewed |
| 14 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java` | ✅ Reviewed |
| 15 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/document/DocumentControllerIT.java` | ✅ Reviewed |
| 16 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java` | ✅ Reviewed |
| 17 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java` | ✅ Reviewed |
| 18 | trade-imports-animals-frontend | `scripts/lighthouse/seed-notification.js` | ✅ Reviewed |
| 19 | trade-imports-animals-frontend | `src/server/app/engine/journey.test.js` | ✅ Reviewed |
| 20 | trade-imports-animals-frontend | `src/server/app/engine/test-support.js` | ✅ Reviewed |
| 21 | trade-imports-animals-frontend | `src/server/app/lib/http-status.js` | ✅ Reviewed |
| 22 | trade-imports-animals-frontend | `src/server/app/routes-live-animals.js` | ✅ Reviewed |
| 23 | trade-imports-animals-frontend | `src/server/app/services/document-uploads/real.js` | ✅ Reviewed |
| 24 | trade-imports-animals-frontend | `src/server/app/services/persistence/records/real/http/get-fulfilment.js` | ✅ Reviewed |
| 25 | trade-imports-animals-frontend | `src/server/app/services/persistence/records/real/http/headers.js` | ✅ Reviewed |
| 26 | trade-imports-animals-frontend | `src/server/app/services/persistence/records/real/http/headers.test.js` | ✅ Reviewed |
| 27 | trade-imports-animals-frontend | `src/server/app/services/persistence/records/real/real.requests.test.js` | ✅ Reviewed |
| 28 | trade-imports-animals-frontend | `src/server/app/shared/set-context.js` | ✅ Reviewed |
| 29 | trade-imports-animals-frontend | `src/server/auth/controller.js` | ✅ Reviewed |
| 30 | trade-imports-animals-frontend | `src/server/common/helpers/actor-helpers.js` | ✅ Reviewed |
| 31 | trade-imports-animals-frontend | `src/server/common/helpers/actor-helpers.test.js` | ✅ Reviewed |
| 32 | trade-imports-animals-frontend | `src/server/common/helpers/organisation-id.js` | ✅ Reviewed |
| 33 | trade-imports-animals-frontend | `src/server/common/helpers/organisation-id.test.js` | ✅ Reviewed |
| 34 | trade-imports-ins-tests | `adapters/http/address-book-api-client.ts` | ✅ Reviewed |
| 35 | trade-imports-ins-tests | `adapters/http/notification-api-client.ts` | ✅ Reviewed |
| 36 | trade-imports-ins-tests | `adapters/http/trader-api-headers.ts` | ✅ Reviewed |
| 37 | trade-imports-ins-tests | `config/service-base-urls.ts` | ✅ Reviewed |
| 38 | trade-imports-ins-tests | `entrypoint.sh` | ✅ Reviewed |
| 39 | trade-imports-ins-tests | `fixtures/security.ts` | ✅ Reviewed |
| 40 | trade-imports-ins-tests | `fixtures/ui.ts` | ✅ Reviewed |
| 41 | trade-imports-ins-tests | `playwright.config.ts` | ✅ Reviewed |
| 42 | trade-imports-ins-tests | `playwright.docker-compose.config.ts` | ✅ Reviewed |
| 43 | trade-imports-ins-tests | `tests/animals/security/backend/organisation-scoped-notifications.spec.ts` | ✅ Reviewed |
| 44 | trade-imports-ins-tests | `tests/plants/security/backend/organisation-scoped-notifications.spec.ts` | ✅ Reviewed |
| 45 | trade-imports-ins-tests | `utils/playwright/with-service-base-urls.ts` | ✅ Reviewed |
| 46 | trade-imports-ins-tests | `zap/automation-active.yaml` | ✅ Reviewed |
| 47 | trade-imports-ins-tests | `zap/automation-context.yaml` | ✅ Reviewed |
| 48 | trade-imports-ins-tests | `zap/automation-passive.yaml` | ✅ Reviewed |
| 49 | trade-imports-performance-tests | `src/config/trader-organisation.js` | ✅ Reviewed |
| 50 | trade-imports-performance-tests | `src/config/trader-organisation.test.js` | ✅ Reviewed |
| 51 | trade-imports-performance-tests | `src/k6/eventing.js` | ✅ Reviewed |
| 52 | trade-imports-performance-tests | `src/k6/journeys.js` | ✅ Reviewed |
| 53 | trade-imports-performance-tests | `src/k6/readiness.js` | ✅ Reviewed |
| 54 | trade-imports-plants-backend | `src/main/java/uk/gov/defra/trade/imports/plants/exceptions/ForbiddenException.java` | ✅ Reviewed |
| 55 | trade-imports-plants-backend | `src/main/java/uk/gov/defra/trade/imports/plants/exceptions/GlobalExceptionHandler.java` | ✅ Reviewed |
| 56 | trade-imports-plants-backend | `src/main/java/uk/gov/defra/trade/imports/plants/filter/TraderOrganisationHeaderFilter.java` | ✅ Reviewed |
| 57 | trade-imports-plants-backend | `src/main/java/uk/gov/defra/trade/imports/plants/notification/NotificationAggregate.java` | ✅ Reviewed |
| 58 | trade-imports-plants-backend | `src/main/java/uk/gov/defra/trade/imports/plants/notification/NotificationController.java` | ✅ Reviewed |
| 59 | trade-imports-plants-backend | `src/main/java/uk/gov/defra/trade/imports/plants/notification/NotificationRepository.java` | ✅ Reviewed |
| 60 | trade-imports-plants-backend | `src/main/java/uk/gov/defra/trade/imports/plants/notification/NotificationService.java` | ✅ Reviewed |
| 61 | trade-imports-plants-backend | `src/main/java/uk/gov/defra/trade/imports/plants/notification/OrganisationIdCleanup.java` | ✅ Reviewed |
| 62 | trade-imports-plants-backend | `src/test/java/uk/gov/defra/trade/imports/plants/integration/NotificationIT.java` | ✅ Reviewed |
| 63 | trade-imports-plants-backend | `src/test/java/uk/gov/defra/trade/imports/plants/notification/NotificationControllerTest.java` | ✅ Reviewed |
| 64 | trade-imports-plants-backend | `src/test/java/uk/gov/defra/trade/imports/plants/notification/NotificationServiceTest.java` | ✅ Reviewed |
| 65 | trade-imports-plants-frontend | `src/server/app/engine/journey.test.js` | ✅ Reviewed |
| 66 | trade-imports-plants-frontend | `src/server/app/routes-high-risk-plants.js` | ✅ Reviewed |
| 67 | trade-imports-plants-frontend | `src/server/app/services/persistence/records/real/config.js` | ✅ Reviewed |
| 68 | trade-imports-plants-frontend | `src/server/app/services/persistence/records/real/http/get-fulfilment.js` | ✅ Reviewed |
| 69 | trade-imports-plants-frontend | `src/server/app/services/persistence/records/real/http/headers.js` | ✅ Reviewed |
| 70 | trade-imports-plants-frontend | `src/server/app/services/persistence/records/real/http/headers.test.js` | ✅ Reviewed |
| 71 | trade-imports-plants-frontend | `src/server/app/services/persistence/records/real/real.requests.test.js` | ✅ Reviewed |
| 72 | trade-imports-plants-frontend | `src/server/app/shared/set-context.js` | ✅ Reviewed |
| 73 | trade-imports-plants-frontend | `src/server/auth/controller.js` | ✅ Reviewed |
| 74 | trade-imports-plants-frontend | `src/server/common/helpers/actor-helpers.js` | ✅ Reviewed |
| 75 | trade-imports-plants-frontend | `src/server/common/helpers/organisation-id.js` | ✅ Reviewed |
| 76 | trade-imports-plants-frontend | `src/server/common/helpers/organisation-id.test.js` | ✅ Reviewed |

## Verification Result

- [x] **CONFIRMED: All files have been reviewed**
