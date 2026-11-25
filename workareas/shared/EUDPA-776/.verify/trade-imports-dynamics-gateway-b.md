# EUDPA-776 — trade-imports-dynamics-gateway PR #35, verification (batch b)

Head: 37e1f1a965db1b218e0a1027e0e96d3ee368e67f. Reviewed at 9e3e3acb. Commits since: 55a9848, 4067815, 37e1f1a (none are merges from main). No author replies on the PR: no inline replies, no PR reviews, and the only top-level comments are CI, Sonar and the posted review.

Paths are relative to `src/test/java/uk/gov/defra/cdp/dynamicsgateway/notification/` unless shown otherwise.

| # | Severity | Status | Evidence |
|---|---|---|---|
| 19 | Major | FIXED | `PimsEventMapperTest.java` has no `// Given/When/Then` left. Grep over the file finds no such comment, and its only `//` hits are inside URLs. Fixed in 4067815 and 37e1f1a. |
| 20 | Major | FIXED | Renamed to `map_shouldMapExchangedDocumentIdentifierAndReferenceDocument` (`PimsEventMapperV2Test.java:67`). |
| 21 | Major | FIXED | `PimsEventMapperV2Test.java` has no Given/When/Then comments left (grep). |
| 22 | Major | FIXED | `PimsEventMapperV3Test.java` has no Given/When/Then comments left (grep). |
| 23 | Minor | FIXED | Renamed to `map_shouldSendNoIssuerAndTheDocumentTypeListUrl` (`PimsEventMapperV3Test.java:68`). "Still" is gone. |
| 24 | Major | FIXED | The title is now `map_shouldStampV040SchemaVersionAndUriAndKeepTheIncomingCorrelationId` (`PimsEventMapperV4Test.java:25`). The over-claiming `map_shouldPassThroughAllEnvelopeFields` was removed from the V4 test, because the envelope is covered once in V3's `map_shouldPassThroughEnvelopeIdentityFields` (`PimsEventMapperV3Test.java:33`). |
| 26 | Major | FIXED | `PimsEventMapperV4Test.java` (90 lines) has no Given/When/Then comments and no `// --- Helpers ---` banner. It sets up its mapper with `PimsPayloadMappers.eventMapperV4()` (`:22`). |
| 28 | Major | FIXED | The committed-payload test `mapToV4_shouldProduceTheCommittedV040PayloadForTheBackendFixture` (`PimsPayloadMapperTest.java:206`) compares against the new `src/test/resources/gbn-ag/pims-v0.4.0-from-backend.json`, which contains no `issuer`. `mapToV4_shouldSendNoIssuerAndTheSameConsignmentAsV3` is at `:215`. The schemaUri test now covers every version: `mapToEveryVersion_shouldEmitMetadataSchemaUri_notSchemaUrl` (`:297-329`) checks v4's schemaUri and schemaVersion and that it has no schemaUrl. |
| 29 | Major | FIXED | `map_shouldIgnoreOwningOrganisationOnEveryPayload` (`PimsPayloadMapperTest.java:62-75`) loops over `mapToV1..mapToV4`. The v3 test is renamed `mapToV3_shouldSendNoIssuerAndSendDocumentTypeListUrlAndRegionOfOriginCode` (`:176`). |
| 30 | Major | FIXED | `PimsPayloadMapperTest.java` (370 lines) has no comments at all: no Given/When/Then, no "both streams", no rationale and no trailing assertion comments. |
| 32 | Major | OBSOLETE (see note) | `PimsTransportMapperV4Test.java` was deleted in 4067815, and v0.4.0 now reuses `PimsTransportMapperV3`. The same history comment is still in `PimsTransportMapperV3Test.java:37-39` and `PimsTransportMapperV2Test.java:37-39` ("Every other fixture in this class passes null … never exercised …"). Under the house rules it is still a defect, now only in the V3 and V2 suites. This PR did not touch those files. |
| 33 | Major | FIXED | `outbox/gbnag/ExchangedDocument.java:6` is now `@JsonIgnoreProperties(value = "issuer", ignoreUnknown = false)`, so only `issuer` is tolerated. The new fixture `src/test/resources/gbn-ag/notification-submitted-from-backend-with-issuer.json` carries `issuer`. `map_shouldAcceptAnEventStillCarryingIssuerAndSendItInNoVersion` (`PimsPayloadMapperTest.java:190-203`) parses it and asserts that v1 to v4 all carry the identifier and no `issuer`. The deploy-order note is in `docs/notification-pipeline.md` (Fields section). |
| 34 | Major | FIXED | `docs/notification-pipeline.md` now has a v0.4.0 bullet naming `PimsEventV4`, `PimsEventMapperV4`, `PimsGbnAgDataMapperV4` and `pims/gbnagv4` (`PimsExchangedDocument`, `PimsGbnAgData`). It also says that every other v0.4.0 rule is the v0.3.0 one (`PimsConsignmentMapperV3`, `PimsCommonMapperV3`). After the restructure the doc no longer needs `Pims*MapperV4` or `PimsCommonMapperV4`, because neither exists. |
| 35 | Major | FIXED | `pims/gbnagv4/` holds only `PimsExchangedDocument.java` and `PimsGbnAgData.java`, and `PimsGbnAgData` imports `gbnagv3.PimsSpecifiedConsignment`. `PimsGbnAgDataMapperV4.java:16-17` delegates to `PimsConsignmentMapperV3` and `PimsCommonMapperV3`. The V4 copies of the common, consignment, line-item and transport mappers and their tests are gone. The shared test wiring is `PimsPayloadMappers.java` (fixed in 4067815). |

## Still open

- None of the 14 items is fully open.
- #32 is obsolete for the V4 file. The history comment it named is still in `PimsTransportMapperV3Test.java:37-39`, the suite that now covers v0.4.0's transport mapping, and in `PimsTransportMapperV2Test.java:37-39`. It is worth deleting there too, but this PR did not touch those files.
- Outside this batch: the same pattern of Given/When/Then and history comments is still in the V3 and V2 consignment and line-item tests (`PimsConsignmentMapperV3Test.java:156,193`, `PimsLineItemMapperV3Test.java:31`). Those are items #18 and #27 territory, not checked here.
