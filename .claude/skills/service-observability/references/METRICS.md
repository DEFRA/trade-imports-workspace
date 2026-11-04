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
example:

| Metric | Unit | Dimension | Answers |
|---|---|---|---|
| `ExternalCallDuration` | ms | `Dependency`, `Operation` | How many calls, and how slow? |
| `ExternalCallFailure` | 0 or 1 | `Dependency`, `Operation` | How many calls failed? |
| `DependencyAvailable` | 1 or 0 | `Dependency` | Is each dependency up? |
| `CacheHit`, `CacheMiss` | count | `Cache` | Is the cache doing its job? |
| `Lookup` | count | `LookupType` | Demand on the service, by type |

Rules that held:

- **Reuse the shared names.** `ExternalCallDuration`,
  `ExternalCallFailure` and `DependencyAvailable`, with those dimension
  names, are the contract across services. A dashboard or alert built
  for one service then works for the next. Only the business metrics
  (`Lookup` here) are service-specific.
- **Do not add a count metric.** A call count is the `SampleCount` of
  `ExternalCallDuration`. An error count is the `Sum` of
  `ExternalCallFailure`. A token refresh is one call to the token
  endpoint, so it is the same two metrics filtered by `Dependency` and
  `Operation` (the token endpoint's one operation).
- **Keep dimension values few and fixed.** Never a URL, a trace id, an
  organisation or a user as a dimension: each distinct value is a
  separate CloudWatch metric.
- **One dimension set per metric.** Publish each metric with exactly the
  dimensions in the table, so the dashboard query does not have to guess
  which combination holds the data. Every query, panel and alert then
  uses that full set: CloudWatch does not add up across a published
  dimension, so `ExternalCallFailure` queried by `Dependency` alone
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
| `MetricsConfig.emfMeterRegistry` (a bean method) | Creates and starts the registry only when `aws.emf.enabled` is true. When it is false, as in integration tests, Spring Boot's in-memory registry is used and nothing is published |

### Write for the service

| Class | What it does |
|---|---|
| `ExternalCallMetrics` | Logs each call to a dependency (`LOGGING.md`) and records it as the timer `ExternalCallDuration` and the distribution summary `ExternalCallFailure` (0 or 1 per call), both tagged `Dependency` and `Operation`. `recordSuccess` and `recordFailure` (with the cause), not a boolean flag. Copy it as it is |
| Where calls are measured | One place per kind of dependency, calling `ExternalCallMetrics`: a driver `CommandListener` for a database (`MongoCommandMetrics`), a Feign `Capability` or a `RestClient` interceptor for HTTP. Measure at the transport, not in the calling service class, so every call is caught |
| `DependencyAvailabilityMetrics` | Registers the gauge `DependencyAvailable`, tagged `Dependency`, from wherever availability comes from ("Availability" below) |
| A business-metrics class (`AddressMetrics`) | One counter per agreed business metric, tagged by its dimension |
| `@Timed("controller.<operation>.time")`, `@Timed("service.<operation>.time")` | On every controller endpoint and every public method of the service classes, so each invocation's duration is published |

### Rules

- **Add every metric name to the service's Micrometer allowlist.**
  address-book's `application.yml` has `management.metrics.enable.all:
  false` with the names allowed. A name not on it gets a no-op meter:
  no error, no metric. Add each custom name with its case kept by
  brackets (`"[ExternalCallDuration]": true`) and each `@Timed` prefix
  (`controller: true`, `service: true`). That allowlist is the one
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
  counters `CacheHit` and `CacheMiss`, tagged `Cache` with the cache's
  name, as in the agreed table and the dashboard's "Cache hits and
  misses" panel. Increment one on each lookup, from the code that reads
  the cache, and add both names to the allowlist. Not Micrometer's cache
  binder: it publishes `cache.gets` under other names and tags, and as
  function counters, which `EmfMeterRegistry` does not publish.

### A service built the old way

`trade-imports-reference-data` (EUDPA-632) writes EMF directly, through
`EmfMetricWriter` and a scheduled `DependencyAvailabilityMetrics`. When
this skill runs on a service like it, move the service to the one way
above first. Keep the metric names and dimensions, so its dashboard and
alerts carry on:

| Old | New |
|---|---|
| `ExternalCallMetrics.recordCall(…, boolean)` writing EMF | `ExternalCallMetrics` as above. `ExternalCallFeignCapability` stays as the place calls are measured |
| `EmfMetricWriter` | Deleted; each metric becomes a meter |
| `@Scheduled` `DependencyAvailabilityMetrics` | A `DependencyAvailable` gauge over the same reading |
| `@Scheduled` `CacheMetrics` | `CacheHit` and `CacheMiss` counters tagged `Cache` (Rules → "Caches") |
| `LookupMetrics` | A counter tagged `LookupType` |
| `EmfMetricsPublisher` | Deleted |

### Availability: passive or active

`DependencyAvailable` can come from a probe the service sends, or from
the outcome of the calls it already makes.

- **Passive (used on reference-data).** Report the outcome of the most
  recent real call. No extra traffic. The cost: the value is as old as
  the last call, and nothing is published until the first call after
  start-up. Where a cache sits in front of the dependency, that can be
  as long as the cache lifetime.
- **Active.** Send a cheap probe every minute. Always fresh. Only use it
  where a probe is free and harmless. Do not probe a dependency whose
  calls are rate-limited or cost a real token request.

For an HTTP dependency, alert on `ExternalCallFailure` over a time
window, per `Dependency` and `Operation` (`ALERTS.md`), not on
`DependencyAvailable`. A passive reading lags by up to the cache
lifetime and holds a single failure until the next success; an active
probe is itself a call, so it records `ExternalCallFailure` too. A
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
  as the gauge `DependencyAvailable{Dependency=mongodb}` (NaN, so not
  published, while unknown). No extra traffic, no scheduled probe, never
  in `/health`. Not a `ServerMonitorListener`: it is not told which
  servers the driver still monitors, so a removed server's last success
  would hold the database up.
- **Log only the change.** A heartbeat is not a call the service makes,
  so it gets no external-call log line and no `ExternalCallDuration`:
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
- **Alerts.** "Dependency unavailable" for the database queries
  `DependencyAvailable` (`ALERTS.md`); "calls failing" and "slow" query
  the command operations as for any dependency.
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
| An integration test per annotated class (`OperatorServiceTimingIT`) | Each `@Timed` method, called through the Spring proxy, adds one call to its own timer. Turns red if the allowlist lacks the prefix |
| An integration test with the dependency failing | The failure is recorded against the right dependency and operation |
| The existing health check test | `/health` is still `UP` with no components |

Run the repo's full build before pushing:

```bash
mvn -f ~/git/defra/trade-imports-workspace/repos/<service>/pom.xml verify
```
