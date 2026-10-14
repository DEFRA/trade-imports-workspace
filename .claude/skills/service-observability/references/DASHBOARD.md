Build the service's custom Grafana dashboard in the CDP dev playground.
Parent-loaded: path and Bash rules come from `SKILL.md`.

No dashboard has been built from this file yet. Each fact that comes
only from the CDP monitoring docs is marked `[UNPROVEN]`; the panel
table is a proposal to adjust as it is built.

The developer does this by hand in Grafana. Claude supplies the names
and queries below, filled in for the service.

## Before starting

The metrics must be deployed to dev and arriving. A dev service that
nobody calls shows nothing, so drive some requests first. Where a cache
sits in front of a dependency, calls to it only happen on a cache miss:
after a deploy, or once per cache lifetime.

## Where and what to call it

| Thing | Value |
|---|---|
| Grafana | `https://metrics.dev.cdp-int.defra.cloud/` |
| Folder | `Playground/<service>-monitoring` |
| Name | `<service> (custom)` |

`[UNPROVEN]` The name may only use letters, numbers, spaces, hyphens and
brackets. CDP will not promote a dashboard whose name has other characters, such
as `! @ # $ % & _`. The text in brackets is free.

## Panels

CloudWatch data source, namespace `<service>`.

| Panel | Metric | Statistic | Split by |
|---|---|---|---|
| Dependency status, one value per dependency | `DependencyAvailable` | `Minimum` | `Dependency` |
| Calls per dependency | `ExternalCallDuration` | `SampleCount` | `Dependency`, `Operation` |
| Failed calls | `ExternalCallFailure` | `Sum` | `Dependency`, `Operation` |
| Failure rate | `ExternalCallFailure` | `Average`, times 100 | `Dependency` |
| Call time: average, 95th percentile, slowest | `ExternalCallDuration` | `Average`, `p95`, `Maximum` | `Dependency`, `Operation` |
| Cache hits and misses | `CacheHit`, `CacheMiss` | `Sum` | `Cache` |
| Business events | the service's own metric | `Sum` | its dimension |

Use `Minimum` for `DependencyAvailable`. With more than one task, each
publishes its own value, and `Minimum` shows a single unhealthy task.

One panel reads logs, not metrics:

| Panel | Data source | Query |
|---|---|---|
| Slowest dependency calls | OpenSearch | `event.category:"external-call"`, sorted by `event.duration` |

`[UNPROVEN]` Grafana queries OpenSearch with Lucene, not DQL. Build the query in
OpenSearch Dashboards with DQL switched off, then copy it across. This
panel depends on the open question in `LOGGING.md` about whether
`event.duration` arrives as a number.

The dimension values for the service come from its code. For
reference-data: `Dependency` is `mdm` or `trade-token`; `Cache` is
`MDM_COUNTRIES_CACHE` or `MDM_POE_CACHE`; `LookupType` is `countries` or
`ports-of-entry`. A service with a database also has its ping
(`METRICS.md` → "A database"), for example `Dependency` `mongodb` with
`Operation` `ping`.

## Promote

`[UNPROVEN]` The CDP monitoring how-to says dashboards are promoted from
the Portal: service → Diagnostics → Dev → `Promote`. The FAQ says to
ask #cdp-support. Try the Portal button first and record here which one
worked.
