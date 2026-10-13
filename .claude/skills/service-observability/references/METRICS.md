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
  endpoint, so it is the same two metrics filtered by `Dependency`.
- **Keep dimension values few and fixed.** Never a URL, a trace id, an
  organisation or a user as a dimension: each distinct value is a
  separate CloudWatch metric.
- **One dimension set per metric.** Publish each metric with exactly the
  dimensions in the table, so the dashboard query does not have to guess
  which combination holds the data.
- **Check the dependency list against the code.** See Step 1.

Record the agreed table on the ticket.

## Publish (Java, Spring Boot)

The reference implementation is in `trade-imports-reference-data`,
package `uk.gov.defra.trade.imports.metrics`. Read these before writing
anything; copy the shape, not the names of the business metrics.

| Class | What it does |
|---|---|
| `ExternalCallMetrics` | Times each outbound call and publishes `ExternalCallDuration` and `ExternalCallFailure`. Also remembers the last outcome per dependency |
| `ExternalCallFeignCapability` | Why calls are measured at the Feign transport rather than in the calling service class |
| `EmfMetricWriter` | Writes one metric with one dimension. Never throws. Does nothing when `aws.emf.enabled` is false |
| `DependencyAvailabilityMetrics` | Every minute, publishes `DependencyAvailable` for each dependency that has been called |
| `CacheMetrics` | Every minute, publishes cache hits and misses since the last publish |
| `LookupMetrics` | Counts one business event, called from the controller |

Metrics are written directly as AWS Embedded Metric Format (the
`aws-embedded-metrics` library), with the CloudWatch namespace from
`aws.emf.namespace` — on CDP this is the service name.

What to carry over:

- **A metric must never break a request.** Catch everything in the
  writer and log at warn.
- **Honour `aws.emf.enabled`.** It is off in integration tests. Skip the
  work, not only the write.
- **Do not publish through the existing `EmfMetricsPublisher`.** It
  writes every measurement of a Micrometer meter (count, total, max)
  under one metric name with no dimensions, so values collide. Leave it
  alone; fixing it changes every metric a service already publishes.
- **Caches need `.recordStats()`** on the Caffeine builder, or hits and
  misses read as zero.

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

Whichever is used, pair the availability alert with one on
`ExternalCallFailure`, which fires on the first failed calls.

Do not report on a dependency the service does not use.

### Tests

| Test | Proves |
|---|---|
| Unit test per publisher, using `CapturingEmfEnvironment` | Metric name, value, and that the dimension set is exactly as agreed |
| Unit test with the writer disabled | Nothing is written and no work is done |
| Integration test with the dependency stubbed to fail | The failure is recorded against the right dependency, and the others are not marked failed |
| The existing health check test | `/health` is still `UP` with no components |

Run the repo's full build before pushing: `mvn -f <repo>/pom.xml verify`.
