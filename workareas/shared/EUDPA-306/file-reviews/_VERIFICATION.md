# File Review Coverage Verification

**Ticket:** EUDPA-306
**Last Verified:** 2026-09-08T15:09:10Z
**Total files changed:** 45
**Files reviewed:** 45
**Coverage:** 100%

## Changed Files Checklist

| # | Repository | Changed File | Status |
|---|------------|--------------|--------|
| 1 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationController.java` | ✅ Reviewed |
| 2 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java` | ✅ Reviewed |
| 3 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxEvent.java` | ✅ Reviewed |
| 4 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxEventRepository.java` | ✅ Reviewed |
| 5 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxEventType.java` | ✅ Reviewed |
| 6 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxService.java` | ✅ Reviewed |
| 7 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/ExchangedDocument.java` | ✅ Reviewed |
| 8 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgEventData.java` | ✅ Reviewed |
| 9 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgEventDataMapper.java` | ✅ Reviewed |
| 10 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java` | ✅ Reviewed |
| 11 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/OutboxIntegrationBase.java` | ✅ Reviewed |
| 12 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/OutboxPollerIT.java` | ✅ Reviewed |
| 13 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/ReplayIT.java` | ✅ Reviewed |
| 14 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java` | ✅ Reviewed |
| 15 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java` | ✅ Reviewed |
| 16 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/outbox/OutboxEventTypeTest.java` | ✅ Reviewed |
| 17 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/outbox/OutboxServiceTest.java` | ✅ Reviewed |
| 18 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgMapperTest.java` | ✅ Reviewed |
| 19 | trade-imports-ins-backend | `src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationController.java` | ✅ Reviewed |
| 20 | trade-imports-ins-backend | `src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationPageResponse.java` | ✅ Reviewed |
| 21 | trade-imports-ins-backend | `src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationQueryService.java` | ✅ Reviewed |
| 22 | trade-imports-ins-backend | `src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationRepository.java` | ✅ Reviewed |
| 23 | trade-imports-ins-backend | `src/main/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationSort.java` | ✅ Reviewed |
| 24 | trade-imports-ins-backend | `src/main/resources/application-local.yml` | ✅ Reviewed |
| 25 | trade-imports-ins-backend | `src/main/resources/application.yml` | ✅ Reviewed |
| 26 | trade-imports-ins-backend | `src/test/java/uk/gov/defra/trade/imports/ins/backend/integration/AggregatedNotificationControllerIT.java` | ✅ Reviewed |
| 27 | trade-imports-ins-backend | `src/test/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationQueryServiceTest.java` | ✅ Reviewed |
| 28 | trade-imports-ins-backend | `src/test/java/uk/gov/defra/trade/imports/ins/backend/notification/AggregatedNotificationSortTest.java` | ✅ Reviewed |
| 29 | trade-imports-ins-frontend | `playwright.config.js` | ✅ Reviewed |
| 30 | trade-imports-ins-frontend | `src/config/config.js` | ✅ Reviewed |
| 31 | trade-imports-ins-frontend | `src/server/common/clients/__mocks__/ins-backend-client.js` | ✅ Reviewed |
| 32 | trade-imports-ins-frontend | `src/server/common/clients/ins-backend-client.js` | ✅ Reviewed |
| 33 | trade-imports-ins-frontend | `src/server/common/clients/ins-backend-client.real.js` | ✅ Reviewed |
| 34 | trade-imports-ins-frontend | `src/server/common/clients/ins-backend-client.stub.js` | ✅ Reviewed |
| 35 | trade-imports-ins-frontend | `src/server/common/clients/ins-backend-client.test.js` | ✅ Reviewed |
| 36 | trade-imports-ins-frontend | `src/server/common/helpers/notification-dashboard-helper.js` | ✅ Reviewed |
| 37 | trade-imports-ins-frontend | `src/server/common/helpers/notification-dashboard-helper.test.js` | ✅ Reviewed |
| 38 | trade-imports-ins-frontend | `src/server/routes/home/controller.js` | ✅ Reviewed |
| 39 | trade-imports-ins-frontend | `src/server/routes/home/controller.test.js` | ✅ Reviewed |
| 40 | trade-imports-ins-frontend | `src/server/routes/home/fit/dashboard.fit.spec.js` | ✅ Reviewed |
| 41 | trade-imports-ins-frontend | `src/server/routes/home/index.njk` | ✅ Reviewed |
| 42 | trade-imports-workspace | `scripts/stack/bounce-mongo.sh` | ✅ Reviewed |
| 43 | trade-imports-workspace | `scripts/stack/bounce-mongo.test.sh` | ✅ Reviewed |
| 44 | trade-imports-workspace | `scripts/stack/run-stack.sh` | ✅ Reviewed |
| 45 | trade-imports-workspace | `tim/src/constants/repos.test.js` | ✅ Reviewed |

## Verification Result

- [x] **CONFIRMED: All files have been reviewed**
