# EUDPA-776 — trade-imports-animals-backend PR #133 — verification

Reviewed at `b73a5d07`, verified at head `8caabc8`. All seven items were addressed in one commit, `8caabc8` ("fix(EUDPA-776): address the backend review items"). The author left no inline or top-level replies on the PR, so every item was judged on the code alone.

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 2 | Major | FIXED | `NotificationCopyMapper.java:7-9`: the class Javadoc is now only the one-line contract "Maps a NotificationAggregate to a NotificationDto for copy-as-new". The untrue field lists ('type', 'party addresses') are deleted (8caabc8). |
| 4 | Major | FIXED | `NotificationIT.java:1023-1043` `put_shouldAcceptTheSaveAndStoreNoConsignmentParty_whenAnOlderClientStillSendsOne`: sends a raw PUT save body that includes a `consignment` object, asserts `isOk()` (1037), reads the raw Mongo document through `NotificationTestSupport.storedDocument` and asserts `doesNotContainKey("consignment")` (1042). This meets the Must. Minor note: the origin assertion repeats the value used at create (CH), so it does not prove the PUT body was applied. The Must does not require that. |
| 8 | Major | FIXED | `NotificationServiceTest.java:479` is renamed `saveNotification_shouldPersistThePlaceOfOriginFromTheDtoExactly`. Its only assertion is on `getPlaceOfOrigin()` (line 500), so the title now matches what it proves (8caabc8). |
| 9 | Major | FIXED | `GbnAgMapperTest.java:81-92` `shouldSendExactlyTheExchangedDocumentKeysPimsReads` is in `HappyPath` (line 58), which uses `fullyPopulatedNotification()` (status SUBMITTED, line 75). It asserts the exact key set with `containsExactlyInAnyOrder` and no `issuer`. The old `shouldOmitIssuerKey_whenNoConsignmentContact` is deleted. A grep for "consignment contact" or "issuer" finds no test title in the file. |
| 10 | Major | FIXED | `docs/design-notes.md:126` now reads "The event carries no `exchangedDocument.issuer`: the contact address page is out of the journey." No other `issuer` or consignment-contact mention remains in the docs (8caabc8). |
| 11 | Major | FIXED | `ConsignmentParty.java:9-10` Javadoc now lists "consignor, consignee, importer, place of origin or destination — or the permanent address of an animal". This matches its real uses: the five fields at `NotificationBase.java:26-34` and `AnimalIdentifier.java:22` (8caabc8). |
| 12 | Major | FIXED | `NotificationTestData.consignments()` is deleted, and so are the static imports in `NotificationControllerTest`, `NotificationCopyMapperTest` and `NotificationServiceTest` (all in 8caabc8). A grep of the whole clone for `consignments(` or `consignmentContact` returns nothing. |

## Still open

- None of items 2, 4, 8, 9, 10, 11 and 12.
- Out of scope for this check, so not verified here: the duplicate `TraderOrganisationHeaderFilter` import that merged item #5 raised in `NotificationControllerTest`.
