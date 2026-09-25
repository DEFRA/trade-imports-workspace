# File Review Coverage Verification

**Ticket:** EUDPA-130
**Last Verified:** 2026-09-25T10:25:57Z
**Total files changed:** 168
**Files reviewed:** 44
**Coverage:** 26%

## Changed Files Checklist

| # | Repository | Changed File | Status |
|---|------------|--------------|--------|
| 1 | trade-imports-address-book | `.github/workflows/check-pull-request.yml` | ⏳ Pending |
| 2 | trade-imports-address-book | `.github/workflows/publish-branch.yml` | ⏳ Pending |
| 3 | trade-imports-address-book | `.github/workflows/sonarcloud.yml` | ⏳ Pending |
| 4 | trade-imports-address-book | `Dockerfile` | ⏳ Pending |
| 5 | trade-imports-address-book | `README.md` | ⏳ Pending |
| 6 | trade-imports-address-book | `compose.yml` | ⏳ Pending |
| 7 | trade-imports-address-book | `docker/dev-run.sh` | ⏳ Pending |
| 8 | trade-imports-address-book | `docs/openapi/api-contract.locked.yaml` | ⏳ Pending |
| 9 | trade-imports-address-book | `docs/openapi/operators.yml` | ⏳ Pending |
| 10 | trade-imports-address-book | `docs/review/EUDPA-58-review.md` | ⏳ Pending |
| 11 | trade-imports-address-book | `docs/review/items.trade-imports-address-book.json` | ⏳ Pending |
| 12 | trade-imports-address-book | `pom.xml` | ⏳ Pending |
| 13 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/configuration/FeignLoggingConfig.java` | ⏳ Pending |
| 14 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/configuration/LoggingConfig.java` | ⏳ Pending |
| 15 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/configuration/MetricsConfig.java` | ⏳ Pending |
| 16 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/configuration/ProxyConfig.java` | ⏳ Pending |
| 17 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/configuration/RestClientConfig.java` | ⏳ Pending |
| 18 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/configuration/tls/CertificateLoader.java` | ⏳ Pending |
| 19 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/configuration/tls/TrustStoreConfiguration.java` | ⏳ Pending |
| 20 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/controller/ExampleController.java` | ⏳ Pending |
| 21 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/domain/Example.java` | ⏳ Pending |
| 22 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/domain/repository/ExampleRepository.java` | ⏳ Pending |
| 23 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/exceptions/ConflictException.java` | ⏳ Pending |
| 24 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/exceptions/GlobalExceptionHandler.java` | ⏳ Pending |
| 25 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/filter/RequestTracingFilter.java` | ⏳ Pending |
| 26 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/interceptor/TraceIdPropagationInterceptor.java` | ⏳ Pending |
| 27 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/service/EmfMetricsPublisher.java` | ⏳ Pending |
| 28 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/service/ExampleService.java` | ⏳ Pending |
| 29 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/Application.java` | ⏳ Pending |
| 30 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/Application.java` | ⏳ Pending |
| 31 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/address/Address.java` | ⏳ Pending |
| 32 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressRequest.java` | ⏳ Pending |
| 33 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressStatus.java` | ⏳ Pending |
| 34 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorController.java` | ⏳ Pending |
| 35 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorMapper.java` | ⏳ Pending |
| 36 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorPageResponse.java` | ⏳ Pending |
| 37 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorRepository.java` | ⏳ Pending |
| 38 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorResponse.java` | ⏳ Pending |
| 39 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorService.java` | ⏳ Pending |
| 40 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/AwsConfig.java` | ⏳ Pending |
| 41 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/configuration/AwsConfig.java` | ⏳ Pending |
| 42 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/JacksonConfig.java` | ⏳ Pending |
| 43 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java` | ⏳ Pending |
| 44 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MongoConfig.java` | ⏳ Pending |
| 45 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/configuration/MongoConfig.java` | ⏳ Pending |
| 46 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/OpenApiConfig.java` | ⏳ Pending |
| 47 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/ProxyConfig.java` | ⏳ Pending |
| 48 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/tls/CertificateLoader.java` | ⏳ Pending |
| 49 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/tls/TrustStoreConfiguration.java` | ⏳ Pending |
| 50 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/BadRequestException.java` | ⏳ Pending |
| 51 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandler.java` | ⏳ Pending |
| 52 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/NotFoundException.java` | ⏳ Pending |
| 53 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/exceptions/NotFoundException.java` | ⏳ Pending |
| 54 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/Problem.java` | ⏳ Pending |
| 55 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/ValidationProblem.java` | ⏳ Pending |
| 56 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/filter/HealthCheckFilter.java` | ⏳ Pending |
| 57 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/address/book/filter/HealthCheckFilter.java` | ⏳ Pending |
| 58 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilter.java` | ⏳ Pending |
| 59 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/filter/RequestTracingFilter.java` | ⏳ Pending |
| 60 | trade-imports-address-book | `src/main/java/uk/gov/defra/trade/imports/addressbook/service/EmfMetricsPublisher.java` | ⏳ Pending |
| 61 | trade-imports-address-book | `src/main/resources/application-local.yml` | ⏳ Pending |
| 62 | trade-imports-address-book | `src/main/resources/application.yml` | ⏳ Pending |
| 63 | trade-imports-address-book | `src/main/resources/logback-spring.xml` | ⏳ Pending |
| 64 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/configuration/MetricsConfigTest.java` | ⏳ Pending |
| 65 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/configuration/MetricsConfigurationPropertiesTest.java` | ⏳ Pending |
| 66 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/controller/ExampleControllerTest.java` | ⏳ Pending |
| 67 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/exceptions/GlobalExceptionHandlerTest.java` | ⏳ Pending |
| 68 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/integration/ExampleComplianceIT.java` | ⏳ Pending |
| 69 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/integration/IntegrationBase.java` | ⏳ Pending |
| 70 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/interceptor/TraceIdPropagationInterceptorTest.java` | ⏳ Pending |
| 71 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/service/EmfMetricsPublisherTest.java` | ⏳ Pending |
| 72 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/service/ExampleServiceTest.java` | ⏳ Pending |
| 73 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressRequestValidationTest.java` | ⏳ Pending |
| 74 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/address/OperatorMapperTest.java` | ⏳ Pending |
| 75 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/address/OperatorResponseTest.java` | ⏳ Pending |
| 76 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/address/OperatorServiceTest.java` | ⏳ Pending |
| 77 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfigTest.java` | ⏳ Pending |
| 78 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/ProxyConfigTest.java` | ⏳ Pending |
| 79 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/tls/CertificateLoaderTest.java` | ⏳ Pending |
| 80 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/configuration/tls/CertificateLoaderTest.java` | ⏳ Pending |
| 81 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandlerTest.java` | ⏳ Pending |
| 82 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilterTest.java` | ⏳ Pending |
| 83 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressCrudIT.java` | ⏳ Pending |
| 84 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressDeleteIT.java` | ⏳ Pending |
| 85 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressGetIT.java` | ⏳ Pending |
| 86 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressScopingIT.java` | ⏳ Pending |
| 87 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressSearchIT.java` | ⏳ Pending |
| 88 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressUpdateIT.java` | ⏳ Pending |
| 89 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EcsLoggingIT.java` | ⏳ Pending |
| 90 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/integration/EcsLoggingIT.java` | ⏳ Pending |
| 91 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/HealthCheckConfigIT.java` | ⏳ Pending |
| 92 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/integration/HealthCheckConfigIT.java` | ⏳ Pending |
| 93 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/IntegrationBase.java` | ⏳ Pending |
| 94 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/MongoConfigIT.java` | ⏳ Pending |
| 95 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/integration/MongoConfigIT.java` | ⏳ Pending |
| 96 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/OperatorComplianceIT.java` | ⏳ Pending |
| 97 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/OperatorIndexIT.java` | ⏳ Pending |
| 98 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/OperatorListIT.java` | ⏳ Pending |
| 99 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/OperatorRepositoryIT.java` | ⏳ Pending |
| 100 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ProxyConfigIT.java` | ⏳ Pending |
| 101 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/integration/ProxyConfigIT.java` | ⏳ Pending |
| 102 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/TrustStoreConfigurationIT.java` | ⏳ Pending |
| 103 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/address/book/integration/TrustStoreConfigurationIT.java` | ⏳ Pending |
| 104 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/openapi/OpenApiArtifactGeneratorIT.java` | ⏳ Pending |
| 105 | trade-imports-address-book | `src/test/java/uk/gov/defra/trade/imports/addressbook/service/EmfMetricsPublisherTest.java` | ⏳ Pending |
| 106 | trade-imports-address-book | `src/test/resources/application-integration-test.yml` | ⏳ Pending |
| 107 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandler.java` | ⏳ Pending |
| 108 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationController.java` | ⏳ Pending |
| 109 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationRepository.java` | ⏳ Pending |
| 110 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java` | ⏳ Pending |
| 111 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandlerTest.java` | ⏳ Pending |
| 112 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java` | ⏳ Pending |
| 113 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java` | ⏳ Pending |
| 114 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java` | ⏳ Pending |
| 115 | trade-imports-animals-frontend | `src/server/app/flow/dispatch.js` | ✅ Reviewed |
| 116 | trade-imports-animals-frontend | `src/server/app/lib/validate/index.js` | ✅ Reviewed |
| 117 | trade-imports-animals-frontend | `src/server/app/lib/validate/page-validation.js` | ✅ Reviewed |
| 118 | trade-imports-animals-frontend | `src/server/app/lib/validate/page-validation.test.js` | ✅ Reviewed |
| 119 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/additional-details/controller.js` | ✅ Reviewed |
| 120 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/additional-details/copy/copy.cy.js` | ✅ Reviewed |
| 121 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/additional-details/copy/copy.en.js` | ✅ Reviewed |
| 122 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/additional-details/validate.js` | ✅ Reviewed |
| 123 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/additional-details/validate.test.js` | ✅ Reviewed |
| 124 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/check-answers.test.js` | ✅ Reviewed |
| 125 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/controller.js` | ✅ Reviewed |
| 126 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/refusal.js` | ✅ Reviewed |
| 127 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/refusal.test.js` | ✅ Reviewed |
| 128 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/controller.js` | ✅ Reviewed |
| 129 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/copy/copy.cy.js` | ✅ Reviewed |
| 130 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/copy/copy.en.js` | ✅ Reviewed |
| 131 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/validate.js` | ✅ Reviewed |
| 132 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/validate.test.js` | ✅ Reviewed |
| 133 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/cph-number/controller.js` | ✅ Reviewed |
| 134 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/cph-number/copy/copy.cy.js` | ✅ Reviewed |
| 135 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/cph-number/copy/copy.en.js` | ✅ Reviewed |
| 136 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/cph-number/validate.js` | ✅ Reviewed |
| 137 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/cph-number/validate.test.js` | ✅ Reviewed |
| 138 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/declaration/controller.js` | ✅ Reviewed |
| 139 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/declaration/controller.test.js` | ✅ Reviewed |
| 140 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/hub/controller.js` | ✅ Reviewed |
| 141 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/hub/controller.test.js` | ✅ Reviewed |
| 142 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/import-reason/controller.js` | ✅ Reviewed |
| 143 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/import-reason/validate.js` | ✅ Reviewed |
| 144 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/origin/controller.js` | ✅ Reviewed |
| 145 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/origin/validate.js` | ✅ Reviewed |
| 146 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.cy.js` | ✅ Reviewed |
| 147 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.en.js` | ✅ Reviewed |
| 148 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/transport/port-of-entry/port-of-entry.controller.js` | ✅ Reviewed |
| 149 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/transport/port-of-entry/validate.js` | ✅ Reviewed |
| 150 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/transport/transit-countries/transit-countries.controller.js` | ✅ Reviewed |
| 151 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/transport/transit-countries/validate.js` | ✅ Reviewed |
| 152 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/transport/transporters/transporters.controller.js` | ✅ Reviewed |
| 153 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/transport/transporters/validate.js` | ✅ Reviewed |
| 154 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/transport/transporters/validate.test.js` | ✅ Reviewed |
| 155 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/validation-coverage.test.js` | ✅ Reviewed |
| 156 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/stored-answers.js` | ✅ Reviewed |
| 157 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/stored-answers.test.js` | ✅ Reviewed |
| 158 | trade-imports-animals-frontend | `src/server/app/shared/kit.js` | ✅ Reviewed |
| 159 | trade-imports-animals-tests | `flows/plants-journey.ts` | ⏳ Pending |
| 160 | trade-imports-animals-tests | `page-objects/factory.ts` | ⏳ Pending |
| 161 | trade-imports-animals-tests | `page-objects/plants/plants-arrival-status-page.ts` | ⏳ Pending |
| 162 | trade-imports-animals-tests | `page-objects/plants/plants-overview-page.ts` | ⏳ Pending |
| 163 | trade-imports-animals-tests | `tests/e2e/features/plants/arrival.spec.ts` | ⏳ Pending |
| 164 | trade-imports-animals-tests | `tests/e2e/features/plants/origin.spec.ts` | ⏳ Pending |
| 165 | trade-imports-animals-tests | `tests/e2e/features/plants/start.spec.ts` | ⏳ Pending |
| 166 | trade-imports-workspace | `.github/workflows/security-active-scan.yml` | ⏳ Pending |
| 167 | trade-imports-workspace | `docker/stack/AGENTS.md` | ⏳ Pending |
| 168 | trade-imports-workspace | `docker/stack/security.compose.yml` | ⏳ Pending |

## Verification Result

- [ ] **INCOMPLETE: 124 file(s) pending review**

### Pending Reviews

- `trade-imports-address-book/.github/workflows/check-pull-request.yml`
- `trade-imports-address-book/.github/workflows/publish-branch.yml`
- `trade-imports-address-book/.github/workflows/sonarcloud.yml`
- `trade-imports-address-book/Dockerfile`
- `trade-imports-address-book/README.md`
- `trade-imports-address-book/compose.yml`
- `trade-imports-address-book/docker/dev-run.sh`
- `trade-imports-address-book/docs/openapi/api-contract.locked.yaml`
- `trade-imports-address-book/docs/openapi/operators.yml`
- `trade-imports-address-book/docs/review/EUDPA-58-review.md`
- `trade-imports-address-book/docs/review/items.trade-imports-address-book.json`
- `trade-imports-address-book/pom.xml`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/configuration/FeignLoggingConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/configuration/LoggingConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/configuration/MetricsConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/configuration/ProxyConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/configuration/RestClientConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/configuration/tls/CertificateLoader.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/configuration/tls/TrustStoreConfiguration.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/controller/ExampleController.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/domain/Example.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/domain/repository/ExampleRepository.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/exceptions/ConflictException.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/exceptions/GlobalExceptionHandler.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/filter/RequestTracingFilter.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/interceptor/TraceIdPropagationInterceptor.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/service/EmfMetricsPublisher.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/service/ExampleService.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/Application.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/Application.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/address/Address.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressRequest.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressStatus.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorController.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorMapper.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorPageResponse.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorRepository.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorResponse.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/address/OperatorService.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/AwsConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/configuration/AwsConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/JacksonConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MongoConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/configuration/MongoConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/OpenApiConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/ProxyConfig.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/tls/CertificateLoader.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/tls/TrustStoreConfiguration.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/BadRequestException.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandler.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/NotFoundException.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/exceptions/NotFoundException.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/Problem.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/ValidationProblem.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/filter/HealthCheckFilter.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/address/book/filter/HealthCheckFilter.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilter.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/filter/RequestTracingFilter.java`
- `trade-imports-address-book/src/main/java/uk/gov/defra/trade/imports/addressbook/service/EmfMetricsPublisher.java`
- `trade-imports-address-book/src/main/resources/application-local.yml`
- `trade-imports-address-book/src/main/resources/application.yml`
- `trade-imports-address-book/src/main/resources/logback-spring.xml`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/configuration/MetricsConfigTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/configuration/MetricsConfigurationPropertiesTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/controller/ExampleControllerTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/exceptions/GlobalExceptionHandlerTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/integration/ExampleComplianceIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/integration/IntegrationBase.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/interceptor/TraceIdPropagationInterceptorTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/service/EmfMetricsPublisherTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/service/ExampleServiceTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressRequestValidationTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/address/OperatorMapperTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/address/OperatorResponseTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/address/OperatorServiceTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfigTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/ProxyConfigTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/tls/CertificateLoaderTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/configuration/tls/CertificateLoaderTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandlerTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilterTest.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressCrudIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressDeleteIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressGetIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressScopingIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressSearchIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressUpdateIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EcsLoggingIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/integration/EcsLoggingIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/HealthCheckConfigIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/integration/HealthCheckConfigIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/IntegrationBase.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/MongoConfigIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/integration/MongoConfigIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/OperatorComplianceIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/OperatorIndexIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/OperatorListIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/OperatorRepositoryIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ProxyConfigIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/integration/ProxyConfigIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/TrustStoreConfigurationIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/address/book/integration/TrustStoreConfigurationIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/openapi/OpenApiArtifactGeneratorIT.java`
- `trade-imports-address-book/src/test/java/uk/gov/defra/trade/imports/addressbook/service/EmfMetricsPublisherTest.java`
- `trade-imports-address-book/src/test/resources/application-integration-test.yml`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandler.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationController.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationRepository.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandlerTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java`
- `trade-imports-animals-tests/flows/plants-journey.ts`
- `trade-imports-animals-tests/page-objects/factory.ts`
- `trade-imports-animals-tests/page-objects/plants/plants-arrival-status-page.ts`
- `trade-imports-animals-tests/page-objects/plants/plants-overview-page.ts`
- `trade-imports-animals-tests/tests/e2e/features/plants/arrival.spec.ts`
- `trade-imports-animals-tests/tests/e2e/features/plants/origin.spec.ts`
- `trade-imports-animals-tests/tests/e2e/features/plants/start.spec.ts`
- `trade-imports-workspace/.github/workflows/security-active-scan.yml`
- `trade-imports-workspace/docker/stack/AGENTS.md`
- `trade-imports-workspace/docker/stack/security.compose.yml`
