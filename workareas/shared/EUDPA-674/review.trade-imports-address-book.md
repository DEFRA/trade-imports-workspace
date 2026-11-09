# Repository Review: trade-imports-address-book

**PR:** #22
**Commit reviewed:** 491f0276ddc5772d9171a926337fbab7a1f771b3
**Files Changed:** 46

## Summary
Replaces the scheduled `EmfMetricsPublisher` with `EmfMeterRegistry` (a Micrometer `StepMeterRegistry` that publishes every recorded timer/summary value as EMF). Adds Mongo command and availability metrics via `ExternalCallRecorder`, `address.change` counters, ECS nested `event.*` logging, and renames `@Timed` metrics to `controller|service.<op>.time`. Tests cover the EMF documents, allowlist, timings through the Spring proxy, and external-call log lines.

## File Analysis Summary

| File | Verdict | Critical | Major | Minor |
|------|---------|----------|-------|-------|
| `src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressController.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressService.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java` | NEEDS ATTENTION | 0 | 2 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MongoConfig.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandler.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/NotFoundException.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilter.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoder.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/AddressMetrics.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetrics.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistry.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorder.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoAvailability.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoCommandMetrics.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoReplyWriteException.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/RecordedValues.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingDistributionSummary.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingTimer.java` | SAFE | 0 | 0 | 0 |
| `src/main/java/uk/gov/defra/trade/imports/addressbook/service/EmfMetricsPublisher.java` | SAFE | 0 | 0 | 0 |
| `src/main/resources/application.yml` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/main/resources/logback-spring.xml` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressServiceTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfigTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandlerTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilterTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressScopingIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressTimingIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EcsLoggingIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EmfMeterRegistryIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ExternalCallRecorderIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/IntegrationBase.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/MongoAvailabilityIT.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoderTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/CapturingEmfEnvironment.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetricsTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistryTest.java` | NEEDS ATTENTION | 0 | 1 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorderTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoAvailabilityTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoCommandMetricsTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/service/EmfMetricsPublisherTest.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/testsupport/CapturedConsole.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/testsupport/CapturedLogs.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/testsupport/EmfDocuments.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/testsupport/ExternalCallMeters.java` | SAFE | 0 | 0 | 0 |
| `src/test/java/uk/gov/defra/trade/imports/addressbook/testsupport/MongoClusterEvents.java` | SAFE | 0 | 0 | 0 |
| `src/test/resources/application-integration-test.yml` | SAFE | 0 | 0 | 0 |

## Positive Observations
- One publish path: `EmfMetricsPublisher` deleted; skill and code agree on `EmfMeterRegistry`.
- Already-deleted soft-delete path logs with address and organisation ids; NotFoundException keeps ids out of the caller-facing problem body.
- `AddressTimingIT` and `EmfMeterRegistryIT` prove `@Timed` and EMF publishing end-to-end, including deny-by-default allowlist behaviour.
- Shared `DEPENDENCY_TAG` / `mongodb` dependency name across call and availability meters.

## Test Coverage
- Unit tests: Present for EmfMeterRegistry, ExternalCallRecorder, MongoAvailability/CommandMetrics, AddressMetrics, EcsEventEncoder, MetricsConfig conditional bean.
- Integration tests: Present for EMF publish schedule, external-call console lines with trace.id, address timings, Mongo availability.

## Risk Assessment
**Overall Risk:** Medium
**Rationale:** Core observability path is well tested, but CloudWatch units for allowlisted JVM memory gauges and failure summaries are wrong (`Unit.NONE`), which will mis-shape dashboards until fixed.

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java | 51 | Major | naming | timedAspect takes MeterRegistry meterRegistry (line 45) while countedAspect takes MeterRegistry registry (line 51) for the same injected MeterRegistry; a reader of countedAspect cannot tell from the name which registry it holds, and emfMeterRegistry's local is also named registry (line 38) for a different type (EmfMeterRegistry). | the injected MeterRegistry has one name across every bean method in MetricsConfig, and the EmfMeterRegistry built in emfMeterRegistry has a name of its own. | rename countedAspect's parameter to meterRegistry and the local in emfMeterRegistry to emfRegistry. |  |  |  |
| 2 | src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java | 28 | Major | logging | emfMeterRegistry is created only when aws.emf.enabled=true and then logs the namespace and step (line 40); when the property is false or unset the bean is absent and nothing logs that CloudWatch publishing is off, so support looking at an empty custom dashboard cannot tell from OpenSearch whether EMF was switched off. | the service's startup log says whether EMF metrics publishing is on and, when it is, the namespace and step. | keep the enabled log, and add a @ConditionalOnProperty(havingValue=false, matchIfMissing=true) bean or ApplicationRunner that logs that EMF publishing is off. |  |  |  |
| 3 | src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistry.java | 131 | Major | correctness | readingsOf always builds gauges with Unit.NONE (line 131) and distribution summaries with Unit.NONE (line 128), ignoring Meter.Id.getBaseUnit(). application.yml allowlists jvm.memory.used/committed/max (base unit bytes) and external.call.failure is a 0/1 summary, so CloudWatch receives Bytes metrics as None and the failure summary as None instead of Count; EmfMeterRegistryTest asserts units for timers and counters but not for a bytes gauge or the failure summary. | a gauge or summary is published with the CloudWatch Unit that matches its base unit when CloudWatch knows it (bytes → Bytes, and Count when the meter is a dimensionless count such as external.call.failure); None only when there is no known unit. | map id.getBaseUnit() (and treat null/empty count-like summaries as Count) in one helper used by readingsOf, with EmfMeterRegistryTest asserting the unit for a bytes gauge and for external.call.failure. | Merged | — | merged into #6 |
| 4 | src/main/resources/application.yml | 95 | Major | correctness | management.metrics.enable.jvm.memory.{committed,used,max} lets through Micrometer gauges whose base unit is bytes, but EmfMeterRegistry.publish readings always use Unit.NONE for gauges (EmfMeterRegistry.java readingsOf), so CloudWatch stores them as unit None and dashboards cannot treat them as bytes. | every allowlisted gauge is published with the CloudWatch unit that matches its Meter.Id base unit when CloudWatch knows that unit (bytes → Bytes), and Unit.NONE only when it has none. | map id.getBaseUnit() in EmfMeterRegistry for gauges (and use Count for dimensionless distribution summaries such as external.call.failure), with a unit assertion in EmfMeterRegistryTest for a bytes gauge. | Merged | — | merged into #6 |
| 5 | src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistryTest.java | 98 | Major | coverage-gap | publish_writesAFiniteGaugeAndSkipsANaNOne asserts the gauge value but never unitOf(document); no test registers a gauge with base unit bytes or asserts external.call.failure publishes as Count. EmfDocuments.unitOf exists and is used for timers (Milliseconds) and counters (Count), so the missing unit asserts leave the Unit.NONE behaviour in EmfMeterRegistry unproved as wrong. | a test fails if a bytes gauge is published with a unit other than Bytes, and if external.call.failure is published with a unit other than Count. | extend EmfMeterRegistryTest with those two unit assertions beside the existing value asserts. | Merged | — | merged into #6 |
| 6 | src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistry.java | 131 | Major | duplication | One rule, 3 findings: #3, #4, #5 — gauges and distribution summaries must publish with the CloudWatch unit that matches the meter's base unit (bytes → Bytes; dimensionless counts such as external.call.failure → Count), and tests must lock that in; application.yml allowlists jvm.memory.* that depend on it | one owner holds the unit mapping in EmfMeterRegistry.readingsOf; the allowlist stays as the list of wanted meters; EmfMeterRegistryTest asserts Bytes for a bytes gauge and Count for external.call.failure. | EmfMeterRegistry is the owner — map id.getBaseUnit() (and Count for count-like summaries) there, keep the jvm.memory allowlist, add the two unit asserts in EmfMeterRegistryTest. |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
