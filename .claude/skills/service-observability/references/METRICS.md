Work out which custom metrics a service needs, then publish them.
Parent-loaded: path and Bash rules come from `SKILL.md`.

## Work out the list

Start from what the service does that the CDP default dashboard cannot
show. The defaults cover tasks, CPU, memory, response time and HTTP
errors. They do not cover the service's dependencies or its own
business events.

Ask of each candidate metric: what would someone do differently on
seeing it change? Drop it if the answer is nothing.

The list agreed for `trade-imports-reference-data` is the worked
example, with the names it takes once moved to the one way. It
publishes the old names until then ("A service built the old way"):

| Metric | Unit | Dimension | Answers |
|---|---|---|---|
| `external.call.duration` | ms | `dependency`, `operation` | How many calls, and how slow? |
| `external.call.failure` | 0 or 1 | `dependency`, `operation` | How many calls failed? |
| `external.dependency.available` | 1 or 0 | `dependency` | Is each dependency up? |
| `cache.hit`, `cache.miss` | count | `cache` | Is the cache doing its job? |
| `lookup` | count | `lookup.type` | Demand on the service, by type |

Rules that held:

- **Name every metric and dimension in dot case:** lowercase words
  separated by dots, most general first (`external.call.duration`,
  `cache.hit`, `address.change`; `dependency`, `lookup.type`), the same
  form as the `@Timed` names (`controller.<operation>.time`) and their
  tags (`class`, `method`, `exception`). `EmfMeterRegistry` publishes
  names and tag keys as written, so they are also the CloudWatch metric
  and dimension names.
- **Reuse the shared names.** `external.call.duration`,
  `external.call.failure` and `external.dependency.available`, with those dimension
  names, are the contract across services. A dashboard or alert built
  for one service then works for the next. Only the business metrics
  (`lookup` here) are service-specific. Several services still publish
  older names; "A service built the old way" lists them.
- **Do not add a count metric.** A call count is the `SampleCount` of
  `external.call.duration`. An error count is the `Sum` of
  `external.call.failure`. A token refresh is one call to the token
  endpoint, so it is the same two metrics filtered by `dependency` and
  `operation` (the token endpoint's one operation).
- **Keep dimension values few and fixed.** Never a URL, a trace id, an
  organisation or a user as a dimension: each distinct value is a
  separate CloudWatch metric.
- **One dimension set per metric.** Publish each metric with exactly the
  dimensions in the table, so the dashboard query does not have to guess
  which combination holds the data. Every query, panel and alert then
  uses that full set: CloudWatch does not add up across a published
  dimension, so `external.call.failure` queried by `dependency` alone
  finds nothing.

Record the agreed table on the ticket.

## Publish (Java, Spring Boot)

One way: every metric is an ordinary Micrometer meter, and
`EmfMeterRegistry` publishes them all to CloudWatch as Embedded Metric
Format. No EMF code at a call site. `@Timed`, `@Counted`,
`Timer.builder`, `Counter` and `Gauge` all publish properly, with their
tags as dimensions.

The reference implementation is `trade-imports-address-book`
(EUDPA-674), package `uk.gov.defra.trade.imports.addressbook.metrics`,
with its tests alongside. `[UNPROVEN]` in dev CloudWatch until that
release is checked there. Read it before writing anything.

### Copy as it is

These classes have nothing service-specific. Copy them into the
service's `metrics` package and change only the package:

| Class | What it does |
|---|---|
| `EmfMeterRegistry` | A `StepMeterRegistry` that publishes its gauges, counters, timers and distribution summaries once a minute in the `aws.emf.namespace` namespace, tags as the only dimensions. Timers and distribution summaries publish every value recorded since the last publish (timers in ms), so CloudWatch computes `SampleCount`, `Sum`, `Average`, `p95` and `Maximum` itself; the EMF library splits more than 100 values across documents. Counters publish the last minute's count; gauges their value when finite. Long task timers, function counters, function timers and time gauges are not published. One meter failing to publish is logged at warn and the rest still go |
| `ValueRecordingTimer`, `ValueRecordingDistributionSummary`, `RecordedValues` | Micrometer's step timer and summary, also keeping each recorded value until the registry takes it |
| `ExternalCallMetrics` | Logs each call to a dependency (`LOGGING.md`) and records it as the timer `external.call.duration` and the distribution summary `external.call.failure` (0 or 1 per call), both tagged `dependency` and `operation`. `recordSuccess` and `recordFailure` (with the cause), not a boolean flag. It records a call it is given; it does not time one or keep its outcome. A service with its own `ExternalCallMetrics` replaces it ("A service built the old way") |

Copy the bean method `MetricsConfig.emfMeterRegistry` too, but not its
class. It creates and starts the registry only when `aws.emf.enabled`
is true. When it is false, as in integration tests, Spring Boot's
in-memory registry is used and nothing is published. Add the method to
the service's existing `MetricsConfig` in its `configuration` package,
not to a new class in `metrics`. Keep that class's `TimedAspect` bean:
`@Timed` records nothing without it. `@Counted` needs its
`CountedAspect` bean, which dynamics-gateway's does not have yet. A
service with no `MetricsConfig` gets one in its `configuration`
package, with the `TimedAspect` and `CountedAspect` beans as in
address-book.

### Write for the service

| Class | What it does |
|---|---|
| Where calls are measured | One place per kind of dependency, timing each call and passing it to `ExternalCallMetrics`: a driver `CommandListener` for a database (`MongoCommandMetrics`), a Feign `Capability` or a `RestClient` interceptor for HTTP. Measure at the transport, not in the calling service class, so every call is caught |
| `DependencyAvailabilityMetrics` | Registers the gauge `external.dependency.available`, tagged `dependency`, from wherever availability comes from ("Availability" below) |
| A business-metrics class (`AddressMetrics`) | One counter per agreed business metric, tagged by its dimension |
| `@Timed("controller.<operation>.time")`, `@Timed("service.<operation>.time")` | On every controller endpoint and every public method of the service classes, so each invocation's duration is published |

### Rules

- **Add every metric name to the service's Micrometer allowlist.**
  address-book's `application.yml` has `management.metrics.enable.all:
  false` with the names allowed. A name not on it gets a no-op meter:
  no error, no metric. Add each custom name in full
  (`external.call.duration: true`, `cache.hit: true`) and each `@Timed`
  prefix (`controller: true`, `service: true`). An entry enables every
  meter whose name starts with it, so never shorten a custom name to its
  first word: `cache: true` would also publish Spring Boot's own
  `cache.*` meters. That allowlist is the one
  control of what is published. It also decides what Spring Boot's own
  meters publish: on address-book it had silenced its repository and
  Mongo timers.
- **`@Timed` works only through a Spring proxy.** The method must be
  public and called from another bean. A private method, or one called
  from inside its own class, is never timed, with no error. An
  annotation on a Spring Data repository interface method recorded
  nothing when tried on address-book; measure database calls with the
  driver's listener instead.
- **Delete the service's `EmfMetricsPublisher`** (and its test). It
  publishes the same meters again, with no dimensions and running
  totals.
- **Delete any direct EMF writer** (`EmfMetricWriter` and the like).
  Every metric goes through Micrometer.
- **No `@EnableScheduling` for metrics.** The registry publishes on its
  own thread. Remove the annotation if nothing else uses it.
- **A metric never breaks a request.** Recording a Micrometer meter does
  not throw, and publishing happens on the registry's thread.
- **A step meter's `count()` is the last completed minute's,** not the
  running one. In a test with the registry switched on, assert on
  registration; with it off (Spring Boot's in-memory registry), counts
  are running totals and can be asserted.
- **Values are timestamped when published,** up to a minute after they
  were recorded.
- **Caches** `[UNPROVEN]`, not yet done this way on a service: the
  counters `cache.hit` and `cache.miss`, tagged `cache` with the cache's
  name, as in the agreed table and the dashboard's "Cache hits and
  misses" panel. Increment one on each lookup, from the code that reads
  the cache, and add both names to the allowlist. Not Micrometer's cache
  binder: it publishes `cache.gets` under other names and tags, and as
  function counters, which `EmfMeterRegistry` does not publish.

### A service built the old way

These services write EMF directly and publish the older PascalCase
names, not the dot-case names above (their `main`, checked 2026-11-06):

| Service | Where | Publishes |
|---|---|---|
| `trade-imports-reference-data` (EUDPA-632) | `metrics` package: `EmfMetricWriter`, `ExternalCallMetrics`, scheduled `DependencyAvailabilityMetrics` and `CacheMetrics`, `LookupMetrics` | Every old name in the table below |
| `trade-imports-dynamics-gateway` | `metrics/ExternalCallMetrics.java` and `metrics/ExternalCall.java`, measuring the Service Bus send in `QueueMessageSender` | `ExternalCallDuration`, `ExternalCallFailure`, dimensions `Dependency`, `Operation` |
| `trade-imports-animals-frontend`, `-ins-frontend`, `-plants-frontend` | `src/server/common/helpers/external-call-metrics.js` | `ExternalCallDuration`, `ExternalCallFailure`, dimensions `Dependency`, `Operation` |

`trade-imports-animals-admin` publishes none of these metrics.

When this skill runs on one of them, move it to the new names first. A
Java service moves to the one way above as well; a Node service renames
the names in its helper (there is no Node recipe yet: `SKILL.md` →
"What is proven"). The CloudWatch metrics then change name, so
regenerate its dashboard (`DASHBOARD.md` → "Generate") and rebuild its
alerts from a new build sheet (`ALERTS.md` → "Build") in the same run;
the old ones go quiet.

| Old | New |
|---|---|
| `ExternalCallDuration`, `ExternalCallFailure` | `external.call.duration`, `external.call.failure` |
| `DependencyAvailable` | `external.dependency.available` |
| `CacheHit`, `CacheMiss` | `cache.hit`, `cache.miss` |
| `Lookup` | `lookup` |
| Dimensions `Dependency`, `Operation`, `Cache`, `LookupType` | `dependency`, `operation`, `cache`, `lookup.type` |

The Java classes move as follows. Rows that name a class only one
service has apply to that service.

| Old | New |
|---|---|
| The service's own `ExternalCallMetrics` writing EMF (`recordCall(…, boolean)`) | Replaced by address-book's `ExternalCallMetrics` ("Copy as it is"). `ExternalCall` stays as the list of calls; pass its `dependency()` and `operation()` |
| `ExternalCallMetrics.measure(…)` around the Service Bus send (dynamics-gateway) | `QueueMessageSender` times the send itself, then calls `recordSuccess`, or `recordFailure` with the exception thrown |
| `ExternalCallMetrics.measure(…)` around each Feign call (reference-data) | Moves into `ExternalCallFeignCapability`, which stays as the place calls are measured. It times `client.execute` itself, then calls `recordSuccess`, or `recordFailure` with the exception thrown, or with no cause for a response of 400 or over |
| `ExternalCallMetrics.lastCallSucceededByDependency()` | A small `LastCallOutcomes` component holding the last outcome per dependency. `ExternalCallFeignCapability` updates it on each success and failure, beside its `recordSuccess` or `recordFailure` call, so `ExternalCallMetrics` stays a copy |
| The `Interface` property (the volumetrics `SYN-19` id) on each EMF document | No meter carries it: as a tag it would be a new dimension. Agree with the team before the move, and record the choice on the ticket: keep it as an `interface.id` key-value on the call's log line, in this service's copy of `ExternalCallMetrics`, or drop it |
| `EmfMetricWriter` | Deleted; each metric becomes a meter |
| `@Scheduled` `DependencyAvailabilityMetrics` | One `external.dependency.available` gauge per dependency in `ExternalCall`, tagged `dependency`, reading `LastCallOutcomes`: 1 after a success, 0 after a failure, NaN (not published) before the first call |
| `@Scheduled` `CacheMetrics` | `cache.hit` and `cache.miss` counters tagged `cache` (Rules → "Caches") |
| `LookupMetrics` | The counter `lookup` tagged `lookup.type` |
| `EmfMetricsPublisher` | Deleted |

### Availability: passive or active

`external.dependency.available` can come from a probe the service sends, or from
the outcome of the calls it already makes.

- **Passive (used on reference-data).** Report the outcome of the most
  recent real call, kept in `LastCallOutcomes` ("A service built the
  old way"). No extra traffic. The cost: the value is as old as
  the last call, and nothing is published until the first call after
  start-up. Where a cache sits in front of the dependency, that can be
  as long as the cache lifetime.
- **Active.** Send a cheap probe every minute. Always fresh. Only use it
  where a probe is free and harmless. Do not probe a dependency whose
  calls are rate-limited or cost a real token request.

For an HTTP dependency, alert on `external.call.failure` over a time
window, per `dependency` and `operation` (`ALERTS.md`), not on
`external.dependency.available`. A passive reading lags by up to the cache
lifetime and holds a single failure until the next success; an active
probe is itself a call, so it records `external.call.failure` too. A
database is the exception: its availability comes from the driver's
heartbeats, which are fresh, so alert on it (below).

### A database

A database the service has configured is a dependency (`SKILL.md` Step
1). Written and tested on `trade-imports-address-book` (EUDPA-674,
package `uk.gov.defra.trade.imports.addressbook.metrics`), where MongoDB
is the only dependency. `[UNPROVEN]` in dev CloudWatch until that release
is checked there.

- **Take availability from the driver's cluster description, by
  default.** The MongoDB driver already checks each server every 10
  seconds on its own monitoring connections and keeps the result in its
  cluster description. A `ClusterListener` (`MongoAvailability`, added
  with `MongoClientSettings.applyToClusterSettings(b ->
  b.addClusterListener(...))`) reads the servers the driver monitors now
  on each change. The database is available while any of them is up, and
  unavailable once every one has failed its check. A server the driver
  has removed drops out, and one not yet checked leaves the answer
  unknown rather than down. `DependencyAvailabilityMetrics` registers it
  as the gauge `external.dependency.available{dependency=mongodb}` (NaN, so not
  published, while unknown). No extra traffic, no scheduled probe, never
  in `/health`. Not a `ServerMonitorListener`: it is not told which
  servers the driver still monitors, so a removed server's last success
  would hold the database up.
- **Log only the change.** A heartbeat is not a call the service makes,
  so it gets no external-call log line and no `external.call.duration`:
  that would be several lines a minute per task. Log once when the
  database becomes available (info) and once when it becomes
  unavailable (warn, with a failed check's exception).
- **Know what a check proves.** Monitoring connections may not sign in,
  so a successful check proves the server is up, not that the service's
  credentials work. Where that gap matters, add a scheduled `ping`
  command bounded by `MongoTemplate.getDb().withTimeout(...)`, and record
  the choice here.
- **Measure the real commands too, if the team wants query latency.** A
  driver `CommandListener` (`MongoCommandMetrics`, added with
  `addCommandListener`) records every command as `mongodb/<command
  name>` through `ExternalCallMetrics`. Keep the operation to a fixed set
  of command names, with anything else as `other`. A command that never
  reaches the server (no server to select) fires no listener event, so
  these metrics do not show an outage; the heartbeat does.
- **Alerts.** Which rules a service with a database gets:
  `assets/alerts.template.md` → "Check".
- **Test it** with unit tests that feed the listener cluster
  descriptions (several servers, one failing, all failing, a removed
  server, one not yet checked, recovery, and one log line per change, none
  while another server is up), an integration test that the application's own client
  reports available (it goes red if the listener is not registered), and
  an integration test with a throwaway Testcontainers database that is
  started, seen available, stopped, and seen unavailable. Do not stop the
  shared Testcontainers database: the other integration tests need it.

### Tests

address-book's tests are the ones to copy.

| Test | Proves |
|---|---|
| `EmfMeterRegistryTest` (copied as it is), with `CapturingEmfEnvironment` and a `MockClock` | The EMF documents: namespace, tags as the only dimensions, every recorded value, units, counters per minute, gauges skipped while NaN, more than 100 values split, one bad meter not stopping the rest |
| A unit test per metrics class, with a `SimpleMeterRegistry` | Each meter's name, tags and recorded values |
| An integration test with `aws.emf.enabled=true` (`EmfMeterRegistryIT`), with `EnvironmentConfigurationProvider.getConfig().setEnvironmentOverride(Environments.Local)` so EMF writes to the console | The registry is the one in use, and every custom metric name is let through the allowlist: each is recorded, then `meterRegistry.find(name)` is not null. A denied meter is never registered, so a missing or misspelled allowlist entry turns it red |
| An integration test with `aws.emf.enabled=true` that records a call and waits up to 2 minutes for an EMF document on the console (`EmfMeterRegistryIT`) | The registry publishes on its own thread once started. Turns red if `MetricsConfig` does not call `start` |
| An integration test per annotated class (`AddressTimingIT`) | Each `@Timed` method, called through the Spring proxy, adds one call to its own timer. Turns red if the allowlist lacks the prefix |
| An integration test with the dependency failing | The failure is recorded against the right dependency and operation |
| The existing health check test | `/health` is still `UP` with no components |

Run the repo's full build before pushing:

```bash
mvn -f ~/git/defra/trade-imports-workspace/repos/<service>/pom.xml verify
```
