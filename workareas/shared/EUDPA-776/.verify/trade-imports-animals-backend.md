# EUDPA-776 — trade-imports-animals-backend PR #133 verification (refresh 2026-11-25)

Head checked: `88a3e6c`. Commits in the window (8caabc8..88a3e6c): `42d4262` fix(EUDPA-776): share the raw stale-client save set-up between the two notification ITs; `88a3e6c` chore(EUDPA-776): re-run CI (empty commit). `git diff --stat 8caabc8 HEAD` shows one changed file, `NotificationIT.java`. Every other file the items name is the same as at the head checked on 2026-11-24, and each was re-read at the current head.
Author replies: none on GitHub. No commit message in the window answers an item without changing code.

| # | Severity | Status | Evidence |
|---|---|---|---|
| 2 | Major | FIXED | `NotificationCopyMapper.java:7-9`: the class Javadoc is only the one-line contract "Maps a {@link NotificationAggregate} to a {@link NotificationDto} for copy-as-new." The untrue field lists are gone. |
| 4 | Major | FIXED | `NotificationIT.java:1011-1018` `put_shouldAcceptTheSaveAndStoreNoConsignmentParty_whenAnOlderClientStillSendsOne` sends a raw PUT with a `consignment` object. Through `putRawSave` (`:1305-1320`) it expects `isOk()` and reads the raw Mongo `notification` document, then asserts `doesNotContainKey("consignment")` (`:1017`). The test still fails if the request is rejected or if the key is stored. |
| 8 | Major | FIXED | `NotificationServiceTest.java:480` is `saveNotification_shouldPersistThePlaceOfOriginFromTheDtoExactly`. Its only assertion is on `getPlaceOfOrigin()` (`:501`), so the title matches what it proves. |
| 9 | Major | FIXED | `GbnAgMapperTest.java:80-92` `shouldSendExactlyTheExchangedDocumentKeysPimsReads` is in `HappyPath` (`:58`), which uses `fullyPopulatedNotification()` with status SUBMITTED (`:75`). It asserts the exact key set with `containsExactlyInAnyOrder`, and that set has no `issuer`. `git grep` at HEAD finds no "consignment contact" or `issuer` in any test title. |
| 10 | Major | FIXED | `docs/design-notes.md:126` reads: "The event carries no `exchangedDocument.issuer`: the contact address page is out of the journey." |
| 11 | Major | FIXED | `ConsignmentParty.java:9-10` lists "consignor, consignee, importer, place of origin or destination — or the permanent address of an animal". The consignment contact is gone. |
| 12 | Major | FIXED | `git grep` at HEAD finds no `consignments()`, `consignmentContact` or "consignment contact" anywhere in `src` or `docs`. The fixture and its three static imports are deleted. |
| 13 | Major | FIXED | `42d4262` adds `private Document putRawSave(String referenceNumber, Map<String, Object> extraNotificationFields)` (`NotificationIT.java:1305-1320`). It reads the concurrency token, builds the base body, merges in the extra fields, PUTs through `webClient("NoAuth")` expecting 200 and returns the stored `notification` Document. Both tests call it with only their own extra field: `:996-997` (`commodities` with `typeOfCommodity`) and `:1013-1014` (`consignment`). No copy of the set-up is left. |

## Still open
- None of items 2, 4, 8, 9, 10, 11, 12 and 13.

## New problems
- `NotificationIT.java:1305-1312` and `:1016` [Minor] `putRawSave` hard-codes `origin` CH and the commodity "Live cattle". Both callers create the draft with the same values (`:990`, `:1012`), so the consignment test's `containsEntry("countryCode", "CH")` cannot tell whether the PUT body was applied. The coupling to the caller's create values is also hidden. Must: the stale-client test asserts a value that only the PUT body sets (or the helper takes the base values from its caller), so the test proves that the save was stored.
- `NotificationIT.java:995-997` [Minor] The refactor drops the precondition check that the stored draft holds the "Live cattle" commodity before the re-save (old lines 995-996). It also moves the raw-document read to before `submitAs`, so the "re-save sheds the field" assertion now checks the document after the PUT, not after the submit. That is arguably a sharper check of the claim, so no change is needed. Must: none. Noted only so that the change in what the test checks is visible.
