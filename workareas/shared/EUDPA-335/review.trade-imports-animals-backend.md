# Repository Review: trade-imports-animals-backend

**PR:** #80
**Commit:** 87ccdb0f0864768bba9c56e64b8f0392a05caf58
**Files Changed:** 33

## Summary

This PR is the model refactor described by EUDPA-335: the old `Notification`
Mongo-document root is renamed to `NotificationAggregate`, which now **has-a**
`Notification` (a new, slimmed-down content-only class) instead of extending
the shared `NotificationBase`. Aggregate-level fields (`id`, `referenceNumber`,
`status`, `created`, `updated`, `concurrencyToken`, `submittedAt`, `expireAt`,
`fulfilments`) stay on `NotificationAggregate`; content fields move into the
new `Notification`/`NotificationBase` pair. `NotificationContentSnapshot` and
its dedicated mapper are deleted outright and replaced by a MapStruct
`NotificationContentMapper` that deep-clones `Notification` into/out of the
renamed `submittedNotificationBaseline` field, symmetric with the existing
`fulfilments` deep-copy handling. Every call site (controller, service,
repository, outbox mapper/publisher, `NotificationSort`, `NotificationView`
projection, and all touched unit/integration tests) is updated in lockstep.
The PR body confirms there is no live production data, so no migration
concerns apply.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/ConsignmentPartyResolver.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/Notification.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationAggregate.java` | NEEDS ATTENTION | 0 | 1 | 2 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationBase.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationContentMapper.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationContentSnapshot.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationContentSnapshotMapper.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationController.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapper.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationDto.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationRepository.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java` | NEEDS ATTENTION | 0 | 2 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationSort.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationView.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/OutboxService.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/ExchangedDocument.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgEventData.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgEventDataMapper.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/exceptions/GlobalExceptionHandlerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationExpiryIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/NotificationIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/OptimisticLockingIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/OutboxIntegrationBase.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/OutboxPollerIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/integration/outbox/ReplayIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/ConsignmentPartyResolverTest.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationContentSnapshotTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationControllerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapperTest.java` | NEEDS ATTENTION | 0 | 2 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java` | NEEDS ATTENTION | 0 | 1 | 1 |
| `src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationSortTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/outbox/OutboxServiceTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/animals/outbox/gbnag/GbnAgMapperTest.java` | SAFE | 0 | 0 | 0 |

## Positive Observations

- The rename/composition swap is applied completely and consistently across
  every production call site (controller, service, repository, outbox
  mapper/publisher, sort key, view projection) — no dangling references to
  the old flat shape or to the deleted `NotificationContentSnapshot` remain
  anywhere in the tree.
- `NotificationAggregate.requireNotification()` establishes a single,
  well-documented fail-fast seam for code that needs the content sub-object,
  and every production caller (`ConsignmentPartyResolver`,
  `NotificationCopyMapper`, `ExchangedDocument`, `GbnAgEventData`) uses it
  consistently rather than reinventing null-handling.
- The `fulfilments` deep-copy pattern already established for amend/cancel-amend
  is mirrored symmetrically for the new `notification`/`submittedNotificationBaseline`
  pair via the new `NotificationContentMapper`, keeping the two sub-objects'
  snapshot/restore logic structurally consistent.
- Test updates are broad and mostly mechanical-but-correct: field-access
  chains, JSON path assertions, and builder shapes were all re-pointed through
  `.getNotification()`/`.notification(...)` accurately across ~15 touched test
  files, with no missed rename sites found by any file reviewer.
- `NotificationDto` and `NotificationBase`'s continued extension for the DTO
  are explicitly sanctioned by the ticket text ("implementer's discretion"),
  and the PR correctly exercises that discretion without introducing an
  inconsistency between the DTO and the new `Notification` class.

## Test Coverage

- **Unit tests:** Present and broadly updated in lockstep with the production
  rename, but three genuine coverage gaps were introduced alongside new
  fail-fast/mapping logic (items 1, 4, 5, 7, 11 below) — the new
  `requireNotification()` NPE branch and the new `NotificationContentMapper`'s
  null-normalisation logic are exercised nowhere.
- **Integration tests:** Present (`NotificationIT`, `NotificationExpiryIT`,
  `OptimisticLockingIT`, outbox ITs) and correctly updated to the new
  aggregate/content shape; no gaps found by the file reviewers.

## Risk Assessment

**Overall Risk:** Low

**Rationale:** This is a same-repo, same-behaviour structural refactor with no
live data to migrate (per the PR description) and no cross-repo/wire-contract
change — every finding below is either a missing negative-path test or a
quality/performance nit, not a functional regression the reviewers could
identify.

## Items

| # | File | Line | Severity | Category | Issue | Fix | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|-----|-------------|--------|-------|
| 1 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationAggregate.java | 72 | Major | test-coverage | requireNotification() is new fail-fast logic (throws NPE when notification is absent) but no test in the suite exercises the null branch — only the happy path is covered indirectly via NotificationCopyMapperTest | Add a direct unit test (e.g. NotificationAggregateTest) asserting requireNotification() throws NullPointerException with the expected message when notification is null |  |  |  |
| 2 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationAggregate.java | 20 | Minor | code-style | @lombok.AllArgsConstructor is fully-qualified inline while sibling Lombok annotations (@Builder, @Data, @NoArgsConstructor) are cleanly imported; sibling @Document entities (Audit.java, AccompanyingDocument.java) import AllArgsConstructor normally too — there's no name collision forcing the FQN here | Add "import lombok.AllArgsConstructor;" and use the plain @AllArgsConstructor annotation |  |  |  |
| 3 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationAggregate.java | 21 | Minor | documentation | NotificationAggregate has no class-level Javadoc even though every non-trivial field is documented; this is the new aggregate-root type this ticket introduces (aggregate metadata vs. the composed Notification content), so its responsibility and relationship to Notification isn't obvious from the name alone | Add a short class Javadoc summarising that this is the aggregate root (metadata + fulfilments) that has-a Notification for content, contrasting it with the composed Notification type |  |  |  |
| 4 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationContentMapper.java | 16 | Major | test-coverage | New mapper introduces custom logic (copyCommodity/commodityComplements null-to-empty-list normalisation, the whole reason a default method exists instead of pure @DeepClone) but has no unit test anywhere; NotificationServiceTest's amend/cancelAmend coverage of deepClone() only exercises the Origin field, never Commodity/CommodityComplement, so the normalisation this file exists to provide is unverified. | Add a NotificationContentMapperTest (repo convention per NotificationCopyMapperTest/GbnAgMapperTest) asserting deepClone() normalises a null commodityComplement to an empty list, preserves a populated one via a distinct object graph, and round-trips the other content fields. |  |  |  |
| 5 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapper.java | 23 | Major | test-coverage | toCopyDto now calls notificationAggregate.requireNotification(), a new fail-fast NPE path when the aggregate's notification sub-object is null, but no test in NotificationCopyMapperTest exercises it | Add a test asserting toCopyDto throws (NullPointerException with the requireNotification message) when the NotificationAggregate has no notification set, matching this test class's existing convention of enumerating null-handling cases |  |  |  |
| 6 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java | 46 | Major | dependency-injection | NotificationContentMapper is wired via a static Mappers.getMapper(...) field instead of constructor injection, unlike every other collaborator in this class (notificationCopyMapper, consignmentPartyResolver, etc.) | Add componentModel = "spring" to @Mapper on NotificationContentMapper and inject it as a final constructor field, matching the rest of NotificationService's collaborators |  |  |  |
| 7 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationService.java | 218 | Major | test-coverage | No test asserts mutation independence between notificationAggregate.getNotification() and the CONTENT_MAPPER.deepClone() snapshot stored in submittedNotificationBaseline, unlike the equivalent existing fulfilments deep-copy tests (amend_shouldSnapshotFulfilments..., deepCopyFulfilments_shouldProduceIndependentCopy_underNestedMutation) | Add a test mutating the live notification (or the restored one in cancelAmend) after the clone and asserting submittedNotificationBaseline (or notification) is unaffected, mirroring the fulfilments defensive-copy tests |  |  |  |
| 8 | src/main/java/uk/gov/defra/trade/imports/animals/notification/NotificationView.java | 26 | Major | performance | Switching NotificationView from a closed record projection to an interface with @Value SpEL accessors forces Spring Data into an open projection, so findAllViewByStatusIn/findViewByReferenceNumberAndStatusIn now hydrate the full NotificationAggregate (including the opaque fulfilments payload) for every row instead of Mongo restricting the fields fetched — this silently breaks the still-current invariant documented on NotificationPageResponse ('the opaque fulfilments payload is never loaded from Mongo') and the field-restriction rationale this same file's own prior javadoc stated. | Either accept and update NotificationPageResponse's javadoc to stop claiming fulfilments is never loaded (and confirm the cost is acceptable for the paginated dashboard endpoint), or avoid the open projection — e.g. a DTO/record projection with a @Query fields restriction, or a repository-level aggregation pipeline that projects notification.origin/commodity/consignor/consignee/transport directly — so the closed-projection field restriction is preserved. |  |  |  |
| 9 | src/test/java/uk/gov/defra/trade/imports/animals/notification/ConsignmentPartyResolverTest.java | 47 | Major | duplication | The mechanical NotificationAggregate.builder().notification(Notification.builder()...build()).build() wrap is repeated inline across all 12 test methods instead of being extracted | Add a private static helper, e.g. aggregateOf(Notification notification), and call it from each test |  |  |  |
| 10 | src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapperTest.java | 33 | Major | test-duplication | Every test (~24 of the file's ~27) now inlines NotificationAggregate.builder().notification(Notification.builder()...build()).build() to wrap its fixture, duplicating the same two-level builder boilerplate across the whole file instead of extracting it once. | Add a private helper, e.g. private static NotificationAggregate aggregateOf(Notification notification) { return NotificationAggregate.builder().notification(notification).build(); }, and call it from each test with just the inner Notification.builder() chain. |  |  |  |
| 11 | src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationCopyMapperTest.java | 22 | Major | test-coverage | NotificationCopyMapper.toCopyDto now reads fulfilments from notificationAggregate.getFulfilments() instead of the old flattened Notification.getFulfilments(), but no test in this file exercises that field — a mis-wire during the aggregate/content split would go undetected. | Add a RetainedFields test that sets NotificationAggregate.builder().fulfilments(...).notification(...).build() and asserts result.getFulfilments() equals the source list, mirroring the existing per-field retention tests. |  |  |  |
| 12 | src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java | 1341 | Major | dead-code | Builder chains call .notification(Notification.builder().build()) then immediately overwrite it with a second .notification(...) call (e.g. lines 1341-1342 are byte-identical duplicates; also seen at ~254-256, 1052-1054, 1087-1089, 1122-1124, 1216-1218, 1325-1327, 1360-1362, 1501-1503, 1553-1555) — the first call is dead code left over from the NotificationBase -> Notification composition refactor | Remove the redundant no-op .notification(Notification.builder().build()) call wherever a second .notification(...) call follows it in the same builder chain |  |  |  |
| 13 | src/test/java/uk/gov/defra/trade/imports/animals/notification/NotificationServiceTest.java | 2461 | Minor | test-simplification | NotificationViewBuilder.build() was rewritten to a 20-line anonymous class implementing every NotificationView getter, duplicating the production NotificationView.Data carrier class (same package, public all-args constructor with the same field order) that exists exactly for this purpose | Replace the anonymous class with new NotificationView.Data(ref, 0L, s, c, o, cm, cor, cee, t) |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
