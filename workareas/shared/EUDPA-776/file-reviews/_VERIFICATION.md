# File Review Coverage Verification

**Ticket:** EUDPA-776
**Last Verified:** 2026-11-23T10:07:04Z
**Total files changed:** 227
**Files reviewed:** 210
**Coverage:** 92%

## Changed Files Checklist

| # | Repository | Changed File | Status |
|---|------------|--------------|--------|
| 1 | trade-imports-animals-backend | `.github/dependabot.yml` | ✅ Reviewed |
| 2 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationBase.java` | ✅ Reviewed |
| 3 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapper.java` | ✅ Reviewed |
| 4 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java` | ✅ Reviewed |
| 5 | trade-imports-animals-backend | `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/ExchangedDocument.java` | ✅ Reviewed |
| 6 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java` | ✅ Reviewed |
| 7 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java` | ✅ Reviewed |
| 8 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapperTest.java` | ✅ Reviewed |
| 9 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java` | ✅ Reviewed |
| 10 | trade-imports-animals-backend | `src/test/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgMapperTest.java` | ✅ Reviewed |
| 11 | trade-imports-animals-frontend | `fit/journey-smoke.fit.spec.js` | ✅ Reviewed |
| 12 | trade-imports-animals-frontend | `fit/live-animals-journey.js` | ✅ Reviewed |
| 13 | trade-imports-animals-frontend | `scripts/lighthouse/seed-address-book.js` | ✅ Reviewed |
| 14 | trade-imports-animals-frontend | `scripts/lighthouse/seed-address-book.test.js` | ✅ Reviewed |
| 15 | trade-imports-animals-frontend | `scripts/lighthouse/seed-notification.js` | ✅ Reviewed |
| 16 | trade-imports-animals-frontend | `src/server/app/co-residency.test.js` | ✅ Reviewed |
| 17 | trade-imports-animals-frontend | `src/server/app/contract.test.js` | ✅ Reviewed |
| 18 | trade-imports-animals-frontend | `src/server/app/model/obligations/evaluator.test.js` | ✅ Reviewed |
| 19 | trade-imports-animals-frontend | `src/server/app/services/persistence/records/mapper-a-contract.test.js` | ✅ Reviewed |
| 20 | trade-imports-animals-frontend | `src/server/app/services/persistence/records/notification-mapper/mapper-a/sections/direct-fields.js` | ✅ Reviewed |
| 21 | trade-imports-animals-frontend | `src/server/app/services/persistence/records/notification-mapper/notification-mapper.test.js` | ✅ Reviewed |
| 22 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/docs/journey-flow-and-gates.md` | ✅ Reviewed |
| 23 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/docs/page-design.md` | ✅ Reviewed |
| 24 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/addresses/address-return/controller.test.js` | ✅ Reviewed |
| 25 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/addresses/assert-party-bindings.js` | ✅ Reviewed |
| 26 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/addresses/controller.test.js` | ✅ Reviewed |
| 27 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/addresses/frozen-parties.js` | ✅ Reviewed |
| 28 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/addresses/frozen-parties.test.js` | ✅ Reviewed |
| 29 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/addresses/parties.js` | ✅ Reviewed |
| 30 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-edit/party-edit.controller.js` | ✅ Reviewed |
| 31 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-edit/party-edit.controller.test.js` | ✅ Reviewed |
| 32 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-for-fulfilment-id.js` | ✅ Reviewed |
| 33 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/addresses/party-for-fulfilment-id.test.js` | ✅ Reviewed |
| 34 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/check-answers.fit.spec.js` | ✅ Reviewed |
| 35 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/check-answers.test.js` | ✅ Reviewed |
| 36 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/controller.js` | ✅ Reviewed |
| 37 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/copy/copy.cy.js` | ✅ Reviewed |
| 38 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/copy/copy.en.js` | ✅ Reviewed |
| 39 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/copy/copy.test.js` | ✅ Reviewed |
| 40 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/refusal.js` | ✅ Reviewed |
| 41 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/refusal.test.js` | ✅ Reviewed |
| 42 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/template.njk` | ✅ Reviewed |
| 43 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/applicability.js` | ✅ Reviewed |
| 44 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/addresses/contact-address.js` | ✅ Reviewed |
| 45 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/addresses/contact-address.test.js` | ✅ Reviewed |
| 46 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/addresses/roles-and-addresses.js` | ✅ Reviewed |
| 47 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/addresses/consignment-addresses.js` | ❌ Missing |
| 48 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/additional-animal-details.js` | ✅ Reviewed |
| 49 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/import-details.js` | ✅ Reviewed |
| 50 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/reason-for-import.js` | ✅ Reviewed |
| 51 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/species/identifier-table.js` | ✅ Reviewed |
| 52 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/species/species-card-actions.js` | ✅ Reviewed |
| 53 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/species/species-card-rows.js` | ✅ Reviewed |
| 54 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/species/species-card-title.js` | ✅ Reviewed |
| 55 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/species/species-card-title.test.js` | ✅ Reviewed |
| 56 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/species/species-cards.js` | ❌ Missing |
| 57 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/species/units-for-commodity-line.js` | ❌ Missing |
| 58 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/documents.js` | ❌ Missing |
| 59 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/movement/arrival-details.js` | ❌ Missing |
| 60 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/movement/transit-countries.js` | ❌ Missing |
| 61 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/movement/transport-details.js` | ❌ Missing |
| 62 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/incomplete-cards.js` | ✅ Reviewed |
| 63 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/index.js` | ✅ Reviewed |
| 64 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/invalid-parties.js` | ✅ Reviewed |
| 65 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/rows/change-link.js` | ❌ Missing |
| 66 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/rows/party-row.js` | ❌ Missing |
| 67 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/about-consignment.js` | ❌ Missing |
| 68 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/addresses.js` | ❌ Missing |
| 69 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/consignment-parties.js` | ❌ Missing |
| 70 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/contact-address.js` | ✅ Reviewed |
| 71 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/description-of-goods.js` | ❌ Missing |
| 72 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/documents.js` | ❌ Missing |
| 73 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/transport-and-arrival.js` | ❌ Missing |
| 74 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/line-title.js` | ❌ Missing |
| 75 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/commodities/line-title.test.js` | ❌ Missing |
| 76 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/contact.fit.spec.js` | ✅ Reviewed |
| 77 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/controller.js` | ✅ Reviewed |
| 78 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/controller.test.js` | ✅ Reviewed |
| 79 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/copy/copy.cy.js` | ✅ Reviewed |
| 80 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/copy/copy.en.js` | ✅ Reviewed |
| 81 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/copy/copy.test.js` | ✅ Reviewed |
| 82 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/evaluation.js` | ✅ Reviewed |
| 83 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/page.js` | ✅ Reviewed |
| 84 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/template.njk` | ✅ Reviewed |
| 85 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/test-support.js` | ✅ Reviewed |
| 86 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/validate.js` | ✅ Reviewed |
| 87 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/contact/validate.test.js` | ✅ Reviewed |
| 88 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/evaluation.js` | ✅ Reviewed |
| 89 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/hub/controller.test.js` | ✅ Reviewed |
| 90 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/hub/copy/copy.cy.js` | ✅ Reviewed |
| 91 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/hub/copy/copy.en.js` | ✅ Reviewed |
| 92 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/hub/copy/copy.test.js` | ✅ Reviewed |
| 93 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/hub/hub.fit.spec.js` | ✅ Reviewed |
| 94 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/index.js` | ✅ Reviewed |
| 95 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/request-view.parity.test.js` | ✅ Reviewed |
| 96 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/save-actions.test.js` | ✅ Reviewed |
| 97 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/features/section-caption.test.js` | ✅ Reviewed |
| 98 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/fixtures/characterisation-oracles.json` | ✅ Reviewed |
| 99 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/dispatch.test.js` | ✅ Reviewed |
| 100 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/fixtures/happy-path.json` | ✅ Reviewed |
| 101 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/flow.js` | ✅ Reviewed |
| 102 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/flow.test.js` | ✅ Reviewed |
| 103 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/gates.test.js` | ✅ Reviewed |
| 104 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/reachability-fixtures/seeds.js` | ✅ Reviewed |
| 105 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/section-captions/section-captions.test.js` | ✅ Reviewed |
| 106 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/simulate.test.js` | ✅ Reviewed |
| 107 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/status.test.js` | ✅ Reviewed |
| 108 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/task-rows.js` | ✅ Reviewed |
| 109 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/journeys/linear/flow/task-rows.test.js` | ✅ Reviewed |
| 110 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/obligations/index.js` | ✅ Reviewed |
| 111 | trade-imports-animals-frontend | `src/server/app/sets/live-animals/obligations/sections/misc.js` | ✅ Reviewed |
| 112 | trade-imports-animals-frontend | `src/server/common/helpers/start-server.test.js` | ✅ Reviewed |
| 113 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/NotificationSqsListener.java` | ✅ Reviewed |
| 114 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsCommonMapperV4.java` | ✅ Reviewed |
| 115 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsConsignmentMapperV4.java` | ✅ Reviewed |
| 116 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsEventMapperV4.java` | ✅ Reviewed |
| 117 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsGbnAgDataMapperV3.java` | ✅ Reviewed |
| 118 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsGbnAgDataMapperV4.java` | ✅ Reviewed |
| 119 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsLineItemMapperV4.java` | ✅ Reviewed |
| 120 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsPayloadMapper.java` | ✅ Reviewed |
| 121 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsTransportMapperV4.java` | ✅ Reviewed |
| 122 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/outbox/gbnag/ExchangedDocument.java` | ✅ Reviewed |
| 123 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/PimsEventV4.java` | ✅ Reviewed |
| 124 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsAnimalIdentifier.java` | ✅ Reviewed |
| 125 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsApplicableClassification.java` | ✅ Reviewed |
| 126 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsAuthentication.java` | ✅ Reviewed |
| 127 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsClause.java` | ✅ Reviewed |
| 128 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsCodedValue.java` | ✅ Reviewed |
| 129 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsConsignmentItem.java` | ✅ Reviewed |
| 130 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsDefinedContact.java` | ✅ Reviewed |
| 131 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsExchangedDocument.java` | ✅ Reviewed |
| 132 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsGbnAgData.java` | ✅ Reviewed |
| 133 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsLineTradeDelivery.java` | ✅ Reviewed |
| 134 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsLogisticsLocation.java` | ✅ Reviewed |
| 135 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsLogisticsPackage.java` | ✅ Reviewed |
| 136 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsLogisticsTransportMeans.java` | ✅ Reviewed |
| 137 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsLogisticsTransportMovement.java` | ✅ Reviewed |
| 138 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsProductUnitQuantity.java` | ✅ Reviewed |
| 139 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsReferencedDocument.java` | ✅ Reviewed |
| 140 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsSpecifiedConsignment.java` | ✅ Reviewed |
| 141 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsTradeAddress.java` | ✅ Reviewed |
| 142 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsTradeCountry.java` | ✅ Reviewed |
| 143 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsTradeCountrySubDivision.java` | ✅ Reviewed |
| 144 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsTradeLineItem.java` | ✅ Reviewed |
| 145 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsTradeParty.java` | ✅ Reviewed |
| 146 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsTradeProductInstance.java` | ✅ Reviewed |
| 147 | trade-imports-dynamics-gateway | `src/main/java/uk/gov/defra/cdp/dynamicsgateway/notification/pims/gbnagv4/PimsTransportEvent.java` | ✅ Reviewed |
| 148 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/integration/EmfMeterRegistryIT.java` | ✅ Reviewed |
| 149 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/integration/NotificationSqsListenerIT.java` | ✅ Reviewed |
| 150 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/notification/NotificationSqsListenerTest.java` | ✅ Reviewed |
| 151 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsCommonMapperV4Test.java` | ✅ Reviewed |
| 152 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsConsignmentMapperV4Test.java` | ✅ Reviewed |
| 153 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsEventMapperTest.java` | ✅ Reviewed |
| 154 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsEventMapperV2Test.java` | ✅ Reviewed |
| 155 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsEventMapperV3Test.java` | ✅ Reviewed |
| 156 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsEventMapperV4Test.java` | ✅ Reviewed |
| 157 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsLineItemMapperV4Test.java` | ✅ Reviewed |
| 158 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsPayloadMapperTest.java` | ✅ Reviewed |
| 159 | trade-imports-dynamics-gateway | `src/test/java/uk/gov/defra/cdp/dynamicsgateway/notification/PimsTransportMapperV4Test.java` | ✅ Reviewed |
| 160 | trade-imports-dynamics-gateway | `src/test/resources/gbn-ag/notification-submitted-from-backend.json` | ✅ Reviewed |
| 161 | trade-imports-ins-frontend | `src/server/app/features/address-book/add/add.controller.js` | ✅ Reviewed |
| 162 | trade-imports-ins-frontend | `src/server/app/features/address-book/add/add.controller.test.js` | ✅ Reviewed |
| 163 | trade-imports-ins-frontend | `src/server/app/features/address-book/add/add.njk` | ✅ Reviewed |
| 164 | trade-imports-ins-frontend | `src/server/app/features/address-book/fit/add.fit.spec.js` | ✅ Reviewed |
| 165 | trade-imports-ins-frontend | `src/server/app/features/address-book/journey-registry.js` | ✅ Reviewed |
| 166 | trade-imports-ins-frontend | `src/server/app/features/address-book/journey-registry.test.js` | ✅ Reviewed |
| 167 | trade-imports-ins-frontend | `src/server/common/test-helpers/journey-handshake.js` | ✅ Reviewed |
| 168 | trade-imports-ins-tests | `domain/animals/constants/journey-options.ts` | ✅ Reviewed |
| 169 | trade-imports-ins-tests | `flows/animals/journey.ts` | ✅ Reviewed |
| 170 | trade-imports-ins-tests | `flows/animals/seed-form-steps.ts` | ✅ Reviewed |
| 171 | trade-imports-ins-tests | `flows/animals/seeded-journey.ts` | ✅ Reviewed |
| 172 | trade-imports-ins-tests | `page-objects/animals/contact-address-page.ts` | ✅ Reviewed |
| 173 | trade-imports-ins-tests | `page-objects/animals/index.ts` | ✅ Reviewed |
| 174 | trade-imports-ins-tests | `tests/animals-admin/e2e/features/frontend-seed-context.spec.ts` | ✅ Reviewed |
| 175 | trade-imports-ins-tests | `tests/animals-admin/e2e/features/outbox-event-notification.spec.ts` | ✅ Reviewed |
| 176 | trade-imports-ins-tests | `tests/animals/a11y/notification-address-edit.spec.ts` | ✅ Reviewed |
| 177 | trade-imports-ins-tests | `tests/animals/a11y/notification-journey-error-state.spec.ts` | ✅ Reviewed |
| 178 | trade-imports-ins-tests | `tests/animals/a11y/notification-journey-filled-state.spec.ts` | ✅ Reviewed |
| 179 | trade-imports-ins-tests | `tests/animals/a11y/notification-journey-initial-state.spec.ts` | ✅ Reviewed |
| 180 | trade-imports-ins-tests | `tests/animals/e2e/features/address-book/addresses-add-handshake.spec.ts` | ✅ Reviewed |
| 181 | trade-imports-ins-tests | `tests/animals/e2e/features/address-book/addresses-edit.spec.ts` | ✅ Reviewed |
| 182 | trade-imports-ins-tests | `tests/animals/e2e/features/amend-endings.spec.ts` | ✅ Reviewed |
| 183 | trade-imports-ins-tests | `tests/animals/e2e/features/change-from-cya.spec.ts` | ✅ Reviewed |
| 184 | trade-imports-ins-tests | `tests/animals/e2e/features/commercial-transporter-submission.spec.ts` | ✅ Reviewed |
| 185 | trade-imports-ins-tests | `tests/animals/e2e/features/cph-scope.spec.ts` | ✅ Reviewed |
| 186 | trade-imports-ins-tests | `tests/animals/e2e/features/hub-groups-and-cya-rows.spec.ts` | ✅ Reviewed |
| 187 | trade-imports-ins-tests | `tests/animals/e2e/journeys/back.spec.ts` | ✅ Reviewed |
| 188 | trade-imports-ins-tests | `tests/animals/e2e/journeys/dynamics/notification-data-gaps.spec.ts` | ✅ Reviewed |
| 189 | trade-imports-ins-tests | `tests/animals/e2e/journeys/persistence/persistence-notification.spec.ts` | ✅ Reviewed |
| 190 | trade-imports-ins-tests | `tests/animals/e2e/journeys/save-and-continue.spec.ts` | ✅ Reviewed |
| 191 | trade-imports-ins-tests | `tests/animals/e2e/pages/contact-address.spec.ts` | ✅ Reviewed |
| 192 | trade-imports-ins-tests | `tests/animals/e2e/pages/notification-view-states.spec.ts` | ✅ Reviewed |
| 193 | trade-imports-ins-tests | `tests/animals/e2e/visual/overview-totals.visual.spec.ts-snapshots/overview-totals-chromium-linux.png` | ✅ Reviewed |
| 194 | trade-imports-ins-tests | `tests/animals/e2e/visual/refused-review.visual.spec.ts-snapshots/refused-review-desktop-chromium-linux.png` | ✅ Reviewed |
| 195 | trade-imports-ins-tests | `tests/animals/e2e/visual/refused-review.visual.spec.ts-snapshots/refused-review-phone-chromium-linux.png` | ✅ Reviewed |
| 196 | trade-imports-performance-tests | `src/config/endpoints.js` | ✅ Reviewed |
| 197 | trade-imports-performance-tests | `src/config/journey-endpoints.js` | ✅ Reviewed |
| 198 | trade-imports-performance-tests | `src/config/journey-endpoints.test.js` | ✅ Reviewed |
| 199 | trade-imports-performance-tests | `src/config/smoke.test.js` | ✅ Reviewed |
| 200 | trade-imports-performance-tests | `src/k6/journeys.js` | ✅ Reviewed |
| 201 | trade-imports-performance-tests | `src/k6/live-animals.js` | ✅ Reviewed |
| 202 | trade-imports-schemas | `schemas/README.md` | ✅ Reviewed |
| 203 | trade-imports-schemas | `schemas/profiles/imports/gb/gbn-ag-data-dictionary.md` | ✅ Reviewed |
| 204 | trade-imports-schemas | `schemas/profiles/imports/gb/gbn-ag-v1.schema.json` | ✅ Reviewed |
| 205 | trade-imports-schemas | `schemas/profiles/imports/gb/pims-data-mapping.md` | ✅ Reviewed |
| 206 | trade-imports-schemas | `schemas/profiles/imports/gb/pims/gbn-ag-pims-v0.4.0-changes.md` | ✅ Reviewed |
| 207 | trade-imports-schemas | `schemas/profiles/imports/gb/pims/gbn-ag-pims-v0.4.0.schema.json` | ✅ Reviewed |
| 208 | trade-imports-workspace | `docs/analysis/gbn-ag-field-lineage.md` | ✅ Reviewed |
| 209 | trade-imports-workspace | `docs/best-practices/playwright/BEST_PRACTICES.md` | ✅ Reviewed |
| 210 | trade-imports-workspace | `openspec/coverage/AREAS.md` | ✅ Reviewed |
| 211 | trade-imports-workspace | `openspec/coverage/ins/address-book/coverage.json` | ✅ Reviewed |
| 212 | trade-imports-workspace | `openspec/coverage/live-animals/addresses/coverage.json` | ✅ Reviewed |
| 213 | trade-imports-workspace | `openspec/coverage/live-animals/journey-flow/coverage.json` | ✅ Reviewed |
| 214 | trade-imports-workspace | `openspec/coverage/live-animals/journey-pages/check-your-answers/coverage.json` | ✅ Reviewed |
| 215 | trade-imports-workspace | `openspec/coverage/live-animals/journey-pages/consignment-addresses/coverage.json` | ✅ Reviewed |
| 216 | trade-imports-workspace | `openspec/coverage/live-animals/journey-pages/contact-address/coverage.json` | ✅ Reviewed |
| 217 | trade-imports-workspace | `openspec/coverage/live-animals/journey-pages/cph-number/coverage.json` | ✅ Reviewed |
| 218 | trade-imports-workspace | `openspec/coverage/live-animals/journey-pages/overview/coverage.json` | ✅ Reviewed |
| 219 | trade-imports-workspace | `openspec/coverage/live-animals/journey-section-captions/coverage.json` | ✅ Reviewed |
| 220 | trade-imports-workspace | `openspec/coverage/live-animals/page-titles/coverage.json` | ✅ Reviewed |
| 221 | trade-imports-workspace | `openspec/specs/ins/address-book/spec.md` | ✅ Reviewed |
| 222 | trade-imports-workspace | `openspec/specs/live-animals/addresses/spec.md` | ✅ Reviewed |
| 223 | trade-imports-workspace | `openspec/specs/live-animals/journey-flow/spec.md` | ✅ Reviewed |
| 224 | trade-imports-workspace | `openspec/specs/live-animals/journey-pages/check-your-answers/spec.md` | ✅ Reviewed |
| 225 | trade-imports-workspace | `openspec/specs/live-animals/journey-pages/contact-address/spec.md` | ✅ Reviewed |
| 226 | trade-imports-workspace | `openspec/specs/live-animals/journey-pages/overview/spec.md` | ✅ Reviewed |
| 227 | trade-imports-workspace | `openspec/specs/live-animals/journey-section-captions/spec.md` | ✅ Reviewed |

## Verification Result

- [ ] **INCOMPLETE: 17 file(s) pending review**

### Pending Reviews

- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/addresses/consignment-addresses.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/species/species-cards.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/consignment/species/units-for-commodity-line.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/documents.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/movement/arrival-details.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/movement/transit-countries.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/cards/movement/transport-details.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/rows/change-link.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/rows/party-row.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/about-consignment.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/addresses.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/consignment-parties.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/description-of-goods.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/documents.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/check-answers/view-model/sections/transport-and-arrival.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/commodities/line-title.js`
- `trade-imports-animals-frontend/src/server/app/sets/live-animals/journeys/linear/features/commodities/line-title.test.js`
