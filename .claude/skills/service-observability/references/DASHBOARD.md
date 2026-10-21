Build the service's custom Grafana dashboard in the CDP dev playground.
Parent-loaded: path and Bash rules come from `SKILL.md`.

The template was first imported for reference-data (EUDPA-632). Each
fact that comes only from the CDP monitoring docs is marked
`[UNPROVEN]`.

Claude generates the dashboard JSON from
`assets/dashboard.template.json`; the developer imports it in Grafana.
Nothing can push to Grafana for us: anyone on the network can read the
dev Grafana API without signing in, but writing needs Editor rights, and
CDP does not issue service-account tokens. So the import is always done
by a signed-in person. (Checked 2026-10-15: an anonymous search returned
200, an anonymous create returned 403 `dashboards:create`.)

## Before starting

The metrics must be deployed to dev and arriving. A dev service that
nobody calls shows nothing, so drive some requests first. Where a cache
sits in front of a dependency, calls to it only happen on a cache miss:
after a deploy, or once per cache lifetime.

Expect the dashboard to be mostly empty in dev. Callers may cache as
well: the animals frontend loads reference-data's countries and ports
once per instance and never refreshes them. E2E tests add little: the
GitHub Actions runs use the local Docker stack, whose metrics never
reach CloudWatch, and the CDP Portal runs go through the same caches. To
see data, redeploy the service and call its endpoints directly
(`ALERTS.md` → "Prove they fire").

## Where and what to call it

| Thing | Value |
|---|---|
| Grafana | `https://metrics.dev.cdp-int.defra.cloud/` |
| Folder | `Playground/<service>-monitoring`. Seen on reference-data: `trade-imports-reference-data-monitoring` (uid `afkd0b2ef9m9se`) in `Playground` (uid `afgzyqk5orl6oc`) |
| Name | `<service> (custom)` |

`[UNPROVEN]` The name may only use letters, numbers, spaces, hyphens and
brackets. CDP will not promote a dashboard whose name has other characters, such
as `! @ # $ % & _`. The text in brackets is free.

## Panels

`assets/dashboard.template.json` holds these panels. A change to this
table is a change to the template, and the reverse.

CloudWatch, namespace `<service>` (the service's `aws.emf.namespace`,
which defaults to the service name). The template picks its data
sources through two dashboard variables, `cloudwatch` and `opensearch`,
so it carries no data source ids. The OpenSearch variable's plugin type,
`grafana-opensearch-datasource`, works (the log panel showed data on
reference-data, 2026-10-21). `[UNPROVEN]` that the CloudWatch region
`default` is right for CDP.

Every CloudWatch query uses `*` for each dimension with "match exact"
off, so a panel shows one series per published combination without
listing the values.

| Panel | Metric | Statistic | Split by |
|---|---|---|---|
| Dependency status, one value per dependency | `DependencyAvailable` | `Minimum` | `Dependency` |
| Calls per dependency | `ExternalCallDuration` | `SampleCount` | `Dependency`, `Operation` |
| Failed calls | `ExternalCallFailure` | `Sum` | `Dependency`, `Operation` |
| Failure rate | `ExternalCallFailure` | `Average`, times 100 | `Dependency`, `Operation` |
| Call time: average, 95th percentile, slowest | `ExternalCallDuration` | `Average`, `p95`, `Maximum` | `Dependency`, `Operation` |
| Cache hits and misses | `CacheHit`, `CacheMiss` | `Sum` | `Cache` |
| Business events | the service's own metric | `Sum` | its dimension |

Use `Minimum` for `DependencyAvailable`. With more than one task, each
publishes its own value, and `Minimum` shows a single unhealthy task.

Split each panel by every dimension its metric is published with, as in
the table. CloudWatch does not add up across a published dimension, so
a panel on `ExternalCallFailure` split by `Dependency` alone is empty.

One panel reads logs, not metrics:

| Panel | Data source | Query |
|---|---|---|
| Slowest dependency calls | OpenSearch | `event.category:"external-call" AND service.name:"<service>"`, columns `@timestamp`, `event.action`, `event.outcome`, `event.duration`, `trace.id`, sorted by `event.duration` (nanoseconds) |

Grafana queries OpenSearch with Lucene, not DQL: build the query in
OpenSearch Dashboards with DQL switched off, then copy it across. The
template's query works as written (reference-data, 2026-10-21). This
panel finds nothing unless the service writes the `event.*` fields as a
nested object with a numeric `event.duration` (`LOGGING.md` → "How to
write the fields"). CDP drops the flat MDC form.

The dimension values for the service come from its code. For
reference-data: `Dependency` is `mdm` or `trade-token`; `Cache` is
`MDM_COUNTRIES_CACHE` or `MDM_POE_CACHE`; `LookupType` is `countries` or
`ports-of-entry`. A service with a database also has its ping
(`METRICS.md` → "A database"), for example `Dependency` `mongodb` with
`Operation` `ping`.

## Generate

Claude writes the service's dashboard to
`~/git/defra/trade-imports-workspace/workareas/ticket-planning/<ticket>/grafana/dashboard.json`:

1. Copy `assets/dashboard.template.json`.
2. Replace every `<service>` with the service name. If the service's
   `aws.emf.namespace` is not its name, use the namespace in the
   `namespace` fields and the name everywhere else.
3. Make one copy of the `<business-metric> by <business-dimension>`
   panel per business metric on the agreed list (Step 2), filling in the
   metric and its dimension, and laying each copy out on the grid. Delete
   the panel if there are none.
4. Delete "Cache hits and misses" if the service has no cache.
5. Check the result is valid JSON (`jq empty <file>`) and that no
   placeholder is left (`grep -nE '<service>|<business-' <file>` finds
   nothing).

## Import

Signed in to the dev Grafana with Editor rights on the folder:

- **A new dashboard:** Dashboards → New → Import → paste the file →
  folder `Playground/<service>-monitoring` → choose the CloudWatch and
  OpenSearch data sources when asked → Import.
- **Over an existing one** (for example one built by hand): add its uid
  to the file as `"uid": "<uid>"` (the uid is in the dashboard's URL,
  `/d/<uid>/…`), then import; Grafana offers to overwrite it. Or open the
  dashboard → Settings → JSON Model, replace `panels` and `templating`
  with the file's, and save.

Then check each panel shows data. Drive some requests first: where a
cache sits in front of a dependency, calls only happen on a miss.

## Promote

`[UNPROVEN]` The CDP monitoring how-to says dashboards are promoted from
the Portal: service → Diagnostics → Dev → `Promote`. The FAQ says to
ask #cdp-support. Try the Portal button first and record here which one
worked.
