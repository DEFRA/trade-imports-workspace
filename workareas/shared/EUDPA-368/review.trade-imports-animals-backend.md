# Repository Review: trade-imports-animals-backend

**PR:** #94
**Commit:** 308ec55fcdece46f671e2717e4b7b1fe818082ce
**Files Changed:** 15

## Summary
This PR adds the backend model surface for EUDPA-368: a new `regionOfOriginCode`
field on `Origin`, four new fields (`purposeInInternalMarket`, `destinationCountry`,
`portOfExit`, `exitDate`) on the shared `NotificationBase`, and a new
`AnimalIdentifier` class (with `Species.animalIdentifiers: List<AnimalIdentifier>`)
for per-unit identifier data. All five new/changed fields are wired through
`NotificationService.setNotificationDetails` (unconditional pass-through, matching
the existing pattern) and given explicit retain/omit treatment in
`NotificationCopyMapper` for copy-as-new behaviour. The bulk of the diff outside
the four model/mapper/service files is mechanical: every existing `new Origin(...)`
call site across IT and unit tests was updated to the new 4-arg constructor.

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/AnimalIdentifier.java` | RISKY | 1 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationBase.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapper.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/Origin.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/Species.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/TransactionRetryAdvisorIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/OutboxIntegrationBase.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationContentMapperTest.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapperTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/outbox/OutboxServiceTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgMapperTest.java` | SAFE | 0 | 0 | 0 |

## Positive Observations
- `NotificationCopyMapper` gives each new field an individually-reasoned,
  commented retain/omit decision (e.g. `portOfExit` retained despite being
  logistics data, `exitDate` omitted like `arrivalDate`) rather than a blanket
  rule — and every decision has a matching test in `NotificationCopyMapperTest`.
- `NotificationControllerTest` adds one well-scoped end-to-end test
  (`post_shouldAcceptNotificationWithRegionOfOriginCodeAndPerUnitAnimalIdentifiers`)
  that exercises the new fields via real JSON response assertions rather than
  mock interactions.
- The mechanical `Origin` constructor fallout across ~8 test files was handled
  consistently (`null` padding) and did not silently break any existing
  assertion.

## Test Coverage
- Unit tests: Present, but with the gap below — the new `regionOfOriginCode`
  field is the one new behaviour on `Origin` in this PR, and three of the files
  that touch it (`NotificationIT`, `NotificationContentMapperTest`,
  `NotificationServiceTest`) pass `null` for it rather than a real value,
  so it is asserted only at the controller/JSON layer, not at the
  service/mapper/deepClone layers those tests exist to cover.
- Integration tests: Present (`NotificationIT`), same gap as above.

## Risk Assessment
**Overall Risk:** Low
**Rationale:** The production code is correct and consistent with the frontend/tests repos (see `_consistency-check.md`); the open items are a genuine cross-repo AC gap (`AnimalIdentifier` missing 2 of 5 per-unit fields) and unit/integration-test coverage gaps for `regionOfOriginCode`, not production defects.

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/main/java/uk/gov/defra/trade/imports/animals/notification/AnimalIdentifier.java | 21 | Critical | missing-field | AnimalIdentifier is missing identificationDetails and description — the ticket's AC lists 5 per-unit fields (tattoo, horse name, identification details, description, permanent address) but only 3 of those plus microchip/earTag/passport/tattoo/horseName/permanentAddress are modelled; identificationDetails and description have no slot at all, so those two fields will silently drop just like before the fix | Add 'private String identificationDetails;' and 'private String description;' to AnimalIdentifier, and wire them through NotificationService/NotificationCopyMapper and the frontend mapper alongside the other per-unit fields |  |  |  |
| 2 | src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java | 126 | Major | test-coverage | PR adds Origin.regionOfOriginCode (AC1) but every Origin(...) call updated by this diff, including the comprehensive post_shouldMapAllFieldsToNotificationAndSave test, passes null for it, and assertNotificationMappedFields() never asserts Origin::getRegionOfOriginCode — so the AC that a submitted region code reaches notification.origin.regionOfOriginCode has no integration coverage | Pass a real region-code value (e.g. "UKZZ") in the Origin(...) built for post_shouldMapAllFieldsToNotificationAndSave and add Origin::getRegionOfOriginCode to the extracting()/containsExactly() assertion in assertNotificationMappedFields |  |  |  |
| 3 | src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationContentMapperTest.java | 68 | Major | test-coverage | deepClone_shouldRoundTripContentFields updates the Origin constructor call for the new regionOfOriginCode field but passes null for it, so the test never exercises deepClone actually round-tripping a non-null region code — the one behaviour this ticket adds to Origin | Pass a non-null value, e.g. new Origin("GB", "true", "REF-1", "UKZZ"), and assert clone.getOrigin().getRegionOfOriginCode() equals it (or rely on the existing isEqualTo(source.getOrigin()) with a populated value) |  |  |  |
| 4 | src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java | 243 | Major | missing-test | saveNotification_shouldUpdateNotificationFieldsAndWriteEditedEvent_whenDraft was rewritten to add pass-through coverage for purposeInInternalMarket, destinationCountry, portOfExit and exitDate, but every Origin(...) call in this file (including this one) was mechanically padded with a null 4th arg for the new regionOfOriginCode field rather than exercising a real value — so the field that is AC #1 and that forced the Origin constructor signature change everywhere in this file has no non-null assertion at the NotificationService pass-through layer, the exact layer this PR strengthened for its sibling fields. | In this same test, set origin's regionOfOriginCode to a non-null value (e.g. new Origin("FR", "false", "REF456", "FR-75")) and assert it flows through on result.getNotification().getOrigin().getRegionOfOriginCode(), matching the treatment already given to the other new fields in this test. |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
