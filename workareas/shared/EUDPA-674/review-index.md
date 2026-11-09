# Code Review: EUDPA-674

**Ticket:** Add custom metrics, alerts, Grafana dashboards and logging to the remaining INS services
**Reviewer:** Claude Code Agent
**Date:** 2026-11-09
**Verdict:** CONCERNS

## Summary
Fresh review of the new open PRs only: address-book #22 and workspace #217 (closed #21/#199 and unrelated EUDPA-368/668 PRs left out). Address-book's Micrometer→EMF path is solid and well tested; fix CloudWatch unit mapping for gauges/summaries, MetricsConfig naming/logging, and strip ticket-key history from the skill docs before merge. Dashboard/alert AC for address-book is templates-only and still `[UNPROVEN]` in Grafana.

## Repositories Analyzed
| Repository | PR | Merge Commit | Files Changed | Verdict | Review |
|------------|-----|--------------|---------------|---------|--------|
| trade-imports-address-book | #22 | 491f0276ddc5772d9171a926337fbab7a1f771b3 (head) | 46 | NEEDS ATTENTION | [review.trade-imports-address-book.md](review.trade-imports-address-book.md) |
| trade-imports-workspace | #217 | a937d6cc727855548f8d365f6e39c5a9e6c6ea0d (head) | 10 | NEEDS ATTENTION | [review.trade-imports-workspace.md](review.trade-imports-workspace.md) |

## Acceptance Criteria Check
Assessed for address-book, the only service with a code PR so far. The other eight services have no PR in this set.

| # | Criterion | Proved by a test? | Evidence |
|---|-----------|-------------------|----------|
| 1 | AC1: The service uses the common metrics agreed in EUDPA-632 (call counts, errors and times for outbound calls) | Yes | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EmfMeterRegistryIT.java:42` theMetersAnAddressCreateRecordsAndTheDependencyGaugeAreLetThroughTheAllowlist<br>`src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ExternalCallRecorderIT.java:29` aCreateRecordsAMongodbInsert<br>`src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorderTest.java:1` records success/failure as external.call.duration and external.call.failure |
| 2 | AC2: Dependencies listed and extra metrics agreed and recorded on the ticket | No |  |
| 3 | AC3: CDP default dashboard and default alerts checked in Grafana | No |  |
| 4 | AC4: The service publishes the common and extra metrics | Yes | `src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressServiceTest.java:77` address.change counter helpers<br>`src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EmfMeterRegistryIT.java:59` theRegistryPublishesARecordedCallOnItsOwnSchedule<br>`src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistryTest.java:37` publish_writesEveryTimerValueInMillisecondsWithItsTagsAsTheOnlyDimensions |
| 5 | AC5: The service records whether each dependency is available as a metric | Yes | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/MongoAvailabilityIT.java:1` availability gauge against live driver<br>`src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetricsTest.java:1` gauge 1/0/NaN for MongoAvailability states |
| 6 | AC6: For each call to an external dependency, the service logs how long the call took with dependency name, outcome and trace.id | Yes | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ExternalCallRecorderIT.java:63` theConsoleWritesTheCallLineWithTheTraceIdAndANestedEventObject<br>`src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorderTest.java:1` success/failure log key-values |
| 7 | AC7: The service has a custom Grafana dashboard showing its metrics and dependency status | No |  |
| 8 | AC8: The service's /health endpoint is not changed | No |  |
| 9 | AC9: The service has custom alerts including dependency unavailable, built and promoted through #cdp-support | No |  |
| 10 | AC10: Default and custom alerts reach the INS team in the agreed Slack channels | No |  |
| 11 | AC11: Each custom alert has been tested in dev and test to fire and reach the team | No |  |
| 12 | AC12: A request can be followed across services in OpenSearch using its trace.id | Yes | `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ExternalCallRecorderIT.java:63` trace.id present on external-call console line |
| 13 | AC13: Anything the skill got wrong or missed is fixed in the skill as we go | No |  |

## Test Coverage Assessment
- **Unit Tests:** Present (address-book metrics, logging, config)
- **Integration Tests:** Present (EMF publish, external-call logs, timings, availability)

## Configuration & Environment
- **New Environment Variables:** `aws.emf.environment` (`AWS_EMF_ENVIRONMENT`), `aws.emf.step` (`AWS_EMF_STEP`); existing `aws.emf.enabled` / `aws.emf.namespace` retained
- **Database Changes:** None (Mongo listeners only)

## Risk Matrix
| Category | Risk Level |
|----------|------------|
| Correctness | Medium |
| Code Quality | Medium |
| Security | Low |
| Test Coverage | Low |

## Conclusion
Ship after fixing the CloudWatch unit owner item and the MetricsConfig naming/logging items on address-book, and removing ticket-key provenance from the skill docs. Alerts/dashboard promotion for address-book remain outside these PRs and are still marked unproven in the skill.
