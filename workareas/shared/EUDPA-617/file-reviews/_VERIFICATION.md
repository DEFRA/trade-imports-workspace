# File Review Coverage Verification

**Ticket:** EUDPA-617
**Last Verified:** 2026-10-30T10:57:30Z
**Total files changed:** 119
**Files reviewed:** 69
**Coverage:** 57%

## Changed Files Checklist

| # | Repository | Changed File | Status |
|---|------------|--------------|--------|
| 1 | trade-imports-animals-backend | `docs/design-notes.md` | ⏳ Pending |
| 2 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocument.java` | ⏳ Pending |
| 3 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocumentDto.java` | ⏳ Pending |
| 4 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocumentRepository.java` | ⏳ Pending |
| 5 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/ClaimUploadRequest.java` | ⏳ Pending |
| 6 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentController.java` | ⏳ Pending |
| 7 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentService.java` | ⏳ Pending |
| 8 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentUploadRequest.java` | ⏳ Pending |
| 9 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentUploadResponse.java` | ⏳ Pending |
| 10 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/RegisterUploadRequest.java` | ⏳ Pending |
| 11 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/UploadSession.java` | ⏳ Pending |
| 12 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/UploadSessionDto.java` | ⏳ Pending |
| 13 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/UploadSessionRepository.java` | ⏳ Pending |
| 14 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/file/UploadedFile.java` | ⏳ Pending |
| 15 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/file/UploadedFileDto.java` | ⏳ Pending |
| 16 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpScanResultFile.java` | ⏳ Pending |
| 17 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpScanResultForm.java` | ⏳ Pending |
| 18 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpUploaderClient.java` | ⏳ Pending |
| 19 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpUploaderInitiateRequest.java` | ⏳ Pending |
| 20 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpUploaderInitiateResponse.java` | ⏳ Pending |
| 21 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/configuration/CdpConfig.java` | ⏳ Pending |
| 22 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/configuration/RestClientConfig.java` | ⏳ Pending |
| 23 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandler.java` | ⏳ Pending |
| 24 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/exceptions/ServiceUnavailableException.java` | ⏳ Pending |
| 25 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxService.java` | ⏳ Pending |
| 26 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/ExchangedDocument.java` | ⏳ Pending |
| 27 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgEventData.java` | ⏳ Pending |
| 28 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgEventDataMapper.java` | ⏳ Pending |
| 29 | trade-imports-animals-backend | `src/main/resources/application.yml` | ⏳ Pending |
| 30 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/OpenApiDateFormatTest.java` | ⏳ Pending |
| 31 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocumentDtoTest.java` | ⏳ Pending |
| 32 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocumentTest.java` | ⏳ Pending |
| 33 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentControllerTest.java` | ⏳ Pending |
| 34 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentControllerTrailingSlashTest.java` | ⏳ Pending |
| 35 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentServiceTest.java` | ⏳ Pending |
| 36 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/UploadSessionFixtures.java` | ⏳ Pending |
| 37 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpScanResultFormTest.java` | ⏳ Pending |
| 38 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpUploaderClientTest.java` | ⏳ Pending |
| 39 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/configuration/CommitRetryingMongoTransactionManagerTest.java` | ⏳ Pending |
| 40 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandlerTest.java` | ⏳ Pending |
| 41 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/IntegrationBase.java` | ⏳ Pending |
| 42 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java` | ⏳ Pending |
| 43 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/document/CdpUploaderTestSupport.java` | ⏳ Pending |
| 44 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/document/DocumentControllerIT.java` | ⏳ Pending |
| 45 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/document/DocumentInitiateProductionModeIT.java` | ⏳ Pending |
| 46 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/document/DocumentScanCallbackIT.java` | ⏳ Pending |
| 47 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/document/UploadSessionRepositoryIT.java` | ⏳ Pending |
| 48 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/outbox/OutboxServiceTest.java` | ⏳ Pending |
| 49 | trade-imports-animals-backend | `src/test/resources/application-integration-test.yml` | ⏳ Pending |
| 50 | trade-imports-animals-backend | `src/test/resources/fixtures/cdp-scan-callback-rejected.json` | ⏳ Pending |
| 51 | trade-imports-animals-frontend | `fit/live-animals-journey.js` | ✅ Reviewed |
| 52 | trade-imports-animals-frontend | `src/server/app/docs/architecture.md` | ✅ Reviewed |
| 53 | trade-imports-animals-frontend | `src/server/app/model/analysis/reachability/reachability.test.js` | ✅ Reviewed |
| 54 | trade-imports-animals-frontend | `src/server/app/model/obligations/README.md` | ✅ Reviewed |
| 55 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/docs/services.md` | ✅ Reviewed |
| 56 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/copy/copy.cy.js` | ✅ Reviewed |
| 57 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/refusal.js` | ✅ Reviewed |
| 58 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/refusal.test.js` | ✅ Reviewed |
| 59 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/commodity-question-detour.js` | ✅ Reviewed |
| 60 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/consignment-details/consignment-details.controller.js` | ✅ Reviewed |
| 61 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/consignment-details/consignment-details.controller.test.js` | ✅ Reviewed |
| 62 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/consignment-details/empty-lines-redirect.js` | ✅ Reviewed |
| 63 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/consignment-details/remove/post-remove.js` | ✅ Reviewed |
| 64 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/fit/consignment-details.fit.spec.js` | ✅ Reviewed |
| 65 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/fit/identification.fit.spec.js` | ✅ Reviewed |
| 66 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/fit/search.fit.spec.js` | ✅ Reviewed |
| 67 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/search/search.controller.js` | ✅ Reviewed |
| 68 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/search/search.controller.test.js` | ✅ Reviewed |
| 69 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/view-model/selected-commodity-rows.test.js` | ✅ Reviewed |
| 70 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/services/commodities/index.test.js` | ✅ Reviewed |
| 71 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/services/commodities/rules.js` | ✅ Reviewed |
| 72 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/services/commodities/search.js` | ✅ Reviewed |
| 73 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/services/commodities/species-check.js` | ✅ Reviewed |
| 74 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/services/commodities/species-check.test.js` | ✅ Reviewed |
| 75 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/services/commodities/stub-or-reference-data.js` | ✅ Reviewed |
| 76 | trade-imports-animals-frontend | `src/server/app/shared/kit.js` | ✅ Reviewed |
| 77 | trade-imports-animals-frontend | `src/server/app/shared/kit.test.js` | ✅ Reviewed |
| 78 | trade-imports-ins-tests | `flows/animals/journey.ts` | ✅ Reviewed |
| 79 | trade-imports-ins-tests | `page-objects/animals/animal-identification-page.ts` | ✅ Reviewed |
| 80 | trade-imports-ins-tests | `page-objects/animals/commodity-selection-page.ts` | ✅ Reviewed |
| 81 | trade-imports-ins-tests | `tests/animals/e2e/features/additional-details-scope.spec.ts` | ✅ Reviewed |
| 82 | trade-imports-ins-tests | `tests/animals/e2e/features/animal-identifiers-conditional.spec.ts` | ✅ Reviewed |
| 83 | trade-imports-ins-tests | `tests/animals/e2e/features/cph-scope.spec.ts` | ✅ Reviewed |
| 84 | trade-imports-ins-tests | `tests/animals/e2e/pages/commodities.spec.ts` | ✅ Reviewed |
| 85 | trade-imports-ins-tests | `tests/animals/e2e/visual/identification-card.visual.spec.ts` | ✅ Reviewed |
| 86 | trade-imports-reference-data | `README.md` | ✅ Reviewed |
| 87 | trade-imports-reference-data | `src/main/java/uk/gov/defra/trade/imports/client/MdmErrorDecoder.java` | ✅ Reviewed |
| 88 | trade-imports-reference-data | `src/main/java/uk/gov/defra/trade/imports/client/MdmService.java` | ✅ Reviewed |
| 89 | trade-imports-reference-data | `src/main/java/uk/gov/defra/trade/imports/commodities/CommoditiesController.java` | ✅ Reviewed |
| 90 | trade-imports-reference-data | `src/main/java/uk/gov/defra/trade/imports/commodities/CommoditySearchService.java` | ✅ Reviewed |
| 91 | trade-imports-reference-data | `src/main/java/uk/gov/defra/trade/imports/exceptions/GlobalExceptionHandler.java` | ✅ Reviewed |
| 92 | trade-imports-reference-data | `src/main/java/uk/gov/defra/trade/imports/exceptions/MdmUnavailableException.java` | ✅ Reviewed |
| 93 | trade-imports-reference-data | `src/main/java/uk/gov/defra/trade/imports/exceptions/MdmUnusableResponseException.java` | ✅ Reviewed |
| 94 | trade-imports-reference-data | `src/main/java/uk/gov/defra/trade/imports/exceptions/TokenEndpointUnavailableException.java` | ✅ Reviewed |
| 95 | trade-imports-reference-data | `src/main/java/uk/gov/defra/trade/imports/interceptor/MdmClientInterceptor.java` | ✅ Reviewed |
| 96 | trade-imports-reference-data | `src/test/java/uk/gov/defra/trade/imports/client/MdmErrorDecoderTest.java` | ✅ Reviewed |
| 97 | trade-imports-reference-data | `src/test/java/uk/gov/defra/trade/imports/client/MdmServiceTest.java` | ✅ Reviewed |
| 98 | trade-imports-reference-data | `src/test/java/uk/gov/defra/trade/imports/commodities/CommoditySearchServiceTest.java` | ✅ Reviewed |
| 99 | trade-imports-reference-data | `src/test/java/uk/gov/defra/trade/imports/commodities/SpeciesCheckServiceTest.java` | ✅ Reviewed |
| 100 | trade-imports-reference-data | `src/test/java/uk/gov/defra/trade/imports/exceptions/GlobalExceptionHandlerTest.java` | ✅ Reviewed |
| 101 | trade-imports-reference-data | `src/test/java/uk/gov/defra/trade/imports/integration/CommoditiesControllerIT.java` | ✅ Reviewed |
| 102 | trade-imports-reference-data | `src/test/java/uk/gov/defra/trade/imports/integration/TokenEndpointUnavailableIT.java` | ✅ Reviewed |
| 103 | trade-imports-reference-data | `src/test/java/uk/gov/defra/trade/imports/interceptor/MdmClientInterceptorTest.java` | ✅ Reviewed |
| 104 | trade-imports-stub | `src/main/java/uk/gov/defra/trade/imports/stubs/mdm/product/ProductController.java` | ✅ Reviewed |
| 105 | trade-imports-stub | `src/test/java/uk/gov/defra/trade/imports/integration/FaultsIT.java` | ✅ Reviewed |
| 106 | trade-imports-stub | `src/test/java/uk/gov/defra/trade/imports/integration/LatencyProfilesIT.java` | ✅ Reviewed |
| 107 | trade-imports-stub | `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/MdmStubRequests.java` | ✅ Reviewed |
| 108 | trade-imports-stub | `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/MdmStubResponseMatchers.java` | ✅ Reviewed |
| 109 | trade-imports-stub | `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/MdmStubMvc.java` | ✅ Reviewed |
| 110 | trade-imports-stub | `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/countries/CountriesControllerTest.java` | ✅ Reviewed |
| 111 | trade-imports-stub | `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/poe/PortsOfEntryControllerTest.java` | ✅ Reviewed |
| 112 | trade-imports-stub | `src/test/java/uk/gov/defra/trade/imports/stubs/mdm/product/ProductControllerTest.java` | ✅ Reviewed |
| 113 | trade-imports-workspace | `docs/repos/trade-imports-reference-data.md` | ✅ Reviewed |
| 114 | trade-imports-workspace | `docs/repos/trade-imports-stub.md` | ✅ Reviewed |
| 115 | trade-imports-workspace | `openspec/coverage/live-animals/journey-pages/check-your-answers/coverage.json` | ✅ Reviewed |
| 116 | trade-imports-workspace | `openspec/coverage/live-animals/journey-pages/commodity-selection/coverage.json` | ✅ Reviewed |
| 117 | trade-imports-workspace | `openspec/coverage/live-animals/journey-pages/identification-details/coverage.json` | ✅ Reviewed |
| 118 | trade-imports-workspace | `openspec/specs/live-animals/journey-pages/check-your-answers/spec.md` | ✅ Reviewed |
| 119 | trade-imports-workspace | `openspec/specs/live-animals/journey-pages/commodity-selection/spec.md` | ✅ Reviewed |

## Verification Result

- [ ] **INCOMPLETE: 50 file(s) pending review**

### Pending Reviews

- `trade-imports-animals-backend/docs/design-notes.md`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocument.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocumentDto.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocumentRepository.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/ClaimUploadRequest.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentController.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentService.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentUploadRequest.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentUploadResponse.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/RegisterUploadRequest.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/UploadSession.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/UploadSessionDto.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/UploadSessionRepository.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/file/UploadedFile.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/file/UploadedFileDto.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpScanResultFile.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpScanResultForm.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpUploaderClient.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpUploaderInitiateRequest.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpUploaderInitiateResponse.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/configuration/CdpConfig.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/configuration/RestClientConfig.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandler.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/exceptions/ServiceUnavailableException.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxService.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/ExchangedDocument.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgEventData.java`
- `trade-imports-animals-backend/src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgEventDataMapper.java`
- `trade-imports-animals-backend/src/main/resources/application.yml`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/OpenApiDateFormatTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocumentDtoTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/AccompanyingDocumentTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentControllerTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentControllerTrailingSlashTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/DocumentServiceTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/accompanyingdocument/UploadSessionFixtures.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpScanResultFormTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/cdp/uploader/CdpUploaderClientTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/configuration/CommitRetryingMongoTransactionManagerTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandlerTest.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/integration/IntegrationBase.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/integration/document/CdpUploaderTestSupport.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/integration/document/DocumentControllerIT.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/integration/document/DocumentInitiateProductionModeIT.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/integration/document/DocumentScanCallbackIT.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/integration/document/UploadSessionRepositoryIT.java`
- `trade-imports-animals-backend/src/test/java/uk/gov/defra/trade/imports/animals/outbox/OutboxServiceTest.java`
- `trade-imports-animals-backend/src/test/resources/application-integration-test.yml`
- `trade-imports-animals-backend/src/test/resources/fixtures/cdp-scan-callback-rejected.json`
