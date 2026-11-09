# Consistency check: trade-imports-address-book

**PR:** #22 @ 491f0276ddc5772d9171a926337fbab7a1f771b3

## Cross-file themes

- **Metric vocabulary is one word.** Controller and service `@Timed` names use `controller.<op>.time` / `service.<op>.time`. Custom meters use `address.change`, `external.call.*`, `external.dependency.available`. No leftover Operator vocabulary.
- **Shared tag key.** `DependencyAvailabilityMetrics` uses `ExternalCallRecorder.DEPENDENCY_TAG` and `MongoCommandMetrics.DEPENDENCY` (`mongodb`).
- **CloudWatch unit gap spans three files.** `EmfMeterRegistry` publishes gauges/summaries as `Unit.NONE`, `application.yml` allowlists `jvm.memory.*` (bytes) and `external.call.failure` (0/1), and `EmfMeterRegistryTest` does not assert those units. Already raised on those files; Step 5a should merge them under one owner.
- **Publish path is one.** `EmfMetricsPublisher` deleted; `EmfMeterRegistry` is the only EMF publisher. Skill docs match.

## Verdict

Consistent naming and wiring. Open items are the unit mapping and MetricsConfig naming/logging already on the per-file list.
