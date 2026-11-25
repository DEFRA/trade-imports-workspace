# EUDPA-776 — trade-imports-dynamics-gateway PR #35 verification (refresh 2026-11-25)

Head checked: `96cdd78`. Commits in the window (37e1f1a..96cdd78): `54555b9` fix(EUDPA-776): drop the function 106 comment, the rationale lives in the pipeline doc; `2ba0a54` fix(EUDPA-776): one everyVersion helper for the payload mapper tests; `96cdd78` fix(EUDPA-776): one parameterized test for a failing version mapping.
Author replies: none on GitHub; no commit message in the window argues against a finding, so nothing is ANSWERED. PR checks are green at this head.

| # | Severity | Status | Evidence |
|---|---|---|---|
| 1 | Major | FIXED | README.md:68 names v0.1.0, v0.2.0, v0.3.0 and v0.4.0. docs/notification-pipeline.md:14 says "published four times" and names `-v2`, `-v3`, `-v4`; :15 names v0.4.0 best-effort failures. docs/observability.md:32 lists `0.4.0` as a `schema.version` value; :48 names `-v4`. No "three times" left in README or docs/. |
| 2 | Major | FIXED | `54555b9` deleted the comment. PimsConsignmentMapperV3.java:53 is now a bare local `String subdivisionOfOriginFunctionCode = "106";` inside `subdivisionOfOrigin`, with no comment. There is no V4 consignment mapper (one owner). The function 106 vs disease-zone rationale is in docs/notification-pipeline.md:27. |
| 3 | Major | FIXED | docs/notification-pipeline.md:25: "No message the gateway sends carries an `issuer`: v0.3.0 messages leave it out and the v0.4.0 schema drops it", and it names `gbn-ag-pims-v0.4.0-changes.md` beside the v0.2.0 and v0.3.0 notes. |
| 5 | Major | FIXED | PimsPayloadMapper.java: each `mapToVn` is `return serialise(pimsEventMapperVn.map(event))`. The private `serialise(Object)` is the only place that catches `JsonProcessingException` and throws `SqsNonRetryableException`, naming `getClass().getSimpleName()`. |
| 6 | Minor | FIXED | PimsPayloadMapper.java has no `@Slf4j` and no Slf4j import. |
| 8 | Major | FIXED | EmfMeterRegistryIT.java:121 `@ValueSource(strings = {"http.server.requests", "jvm.gc.pause", "notification.sqs.messages"})`. |
| 9 | Major | FIXED | NotificationSqsListenerIT.java:242-245 asserts the v4 body's `regionOfOriginCode` is `ES-12345` and that v4 `specifiedConsignment` equals v3's; :247-248 assert `exchangedDocument.has("issuer")` is false for v3 and v4. |
| 10 | Major | FIXED | NotificationSqsListenerIT.java:75-81 holds one `SCHEMA_STREAMS` list of `SchemaStream(schemaVersion, messageIdSuffix)`. `expectedMessageIds` (:164-168), `awaitOneOrderedAsbMessagePerSchemaVersion` (:170), the counter test (:254, :262) and the send-count test (`baseSends + SCHEMA_STREAMS.size()`, :284) all read it. No name carries a count. |
| 11 | Major | FIXED | NotificationSqsListenerIT.java has no `//` comments (only URLs in strings). Assertions that need words use `.as(...)`. |
| 12 | Major | FIXED | NotificationSqsListenerTest.java:217 `receive_shouldThrowRetryable_andCountV1AsFailed_whenAsbFailsTransiently` asserts `failedCount("0.1.0") == 1` (:232), as does the permanent-failure test (:254). `96cdd78` replaced the separate v2/v4 mapping tests with one `@ParameterizedTest` over 0.2.0, 0.3.0, 0.4.0 (:260-275). For each version, it asserts forwarded=0 and failed=1 for the failing one and forwarded=1 and failed=0 for every other, so v0.3.0 is now covered too. |
| 13 | Major | FIXED | NotificationSqsListenerTest.java:289 `receive_shouldForwardEveryOtherVersionAndCountOnlyV2Failed_whenV2PublishFails` and :310 `...CountOnlyV3Failed_whenV3PublishFails`. |
| 14 | Major | FIXED | NotificationSqsListenerTest.java has no `//` comments at all. |
| 15 | Major | FIXED | Test-support factory `PimsPayloadMappers.real(objectMapper)` (src/test/.../notification/PimsPayloadMappers.java). NotificationSqsListenerTest.java:61 and PimsPayloadMapperTest.java:26 call it. Neither file builds the mapper graph by hand. |
| 18 | Major | MOOT | PimsConsignmentMapperV4Test.java is no longer in the PR (deleted when the V4 consignment mapper was folded into V3), so the comments the item names are gone. The same comments still sit in PimsConsignmentMapperV3Test.java:156 (`// Given`) and :193-195 ("the only other fields that delegate to … Previously exercised on the null path only …"), but that file is main's content and the PR does not touch it. See the follow-on note below. |
| 19 | Major | FIXED | PimsEventMapperTest.java has no Given/When/Then comments. The only `//` matches are URLs at :91 and :99. |
| 20 | Major | FIXED | PimsEventMapperV2Test.java:67 is now `map_shouldMapExchangedDocumentIdentifierAndReferenceDocument`. Its assertions (:75-78) check the identifier and the reference document only. |

## Still open
- None of the checked items.
- Follow-on from #18 (not open on #18 itself): PimsConsignmentMapperV3Test.java:156 and :193-195 carry the bare Given comment and the history comment #18 objected to. They now serve v0.4.0 too. The file is outside the PR diff, so fixing them is optional for this PR.

## New problems
- NotificationSqsListenerTest.java:262 [Minor] the parameterized title `receive_shouldNotThrow_andCountOnlyThatVersionAsFailed_whenItsMappingFails` does not say that every other version is still forwarded, which its loop asserts (:270-274). Must: the title states the forwarding of the other versions as well, e.g. `receive_shouldForwardEveryOtherVersionAndCountOnlyThatVersionFailed_whenItsMappingFails`, to match the publish-failure titles at :289 and :310.
