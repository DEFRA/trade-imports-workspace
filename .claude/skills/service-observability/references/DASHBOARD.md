Build the service's custom Grafana dashboard in the CDP dev playground.
Parent-loaded: path and Bash rules come from `SKILL.md`.

`SKILL.md` → "What is proven" says which parts have been done on a real
service. This dot-case template was imported on dynamics-gateway in dev
on 2026-11-23, and every panel showed data. Each fact that comes only
from the CDP monitoring docs is marked `[UNPROVEN]`.

Claude generates the dashboard JSON from
`assets/dashboard.template.json`. Anyone on the network can read the
dev Grafana API without signing in, but writing needs Editor rights, and
CDP does not issue service-account tokens. (Checked 2026-10-15: an
anonymous search returned 200, an anonymous create returned 403
`dashboards:create`.) So the import is done under a signed-in person's
session: by them, or by Claude through their browser
(`GRAFANA_API.md`).

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
reference-data, 2026-10-21). The CloudWatch region `default` finds the
service's metrics (dynamics-gateway, 2026-11-23).

CDP's own dashboards for the service (`SKILL.md` → "Step 1") already
show its platform metrics: ECS, SQS from `AWS/SQS`, MongoDB. Do not
repeat them. Where a custom panel sits next to one (the gateway's queue
depth beside CDP's SQS dashboard), give it a panel link to that
dashboard (`links: [{ title, url: "/d/<uid>/<slug>", targetBlank: true }]`)
and say in its description what the CDP one shows that it does not.

**Title every panel in plain English**, for what it shows: "Calls",
"Messages waiting, by queue", "Publish an event: endpoint". Never the
metric or timer name: it goes first in the description, where a search
for it still finds the panel.

The panels sit in Grafana rows, one section each, and every row can be
collapsed with the arrow beside its title. A collapsed row runs none of
its queries; saving the dashboard keeps rows as they were left. Only
"Dependency status" sits above the first row, so it stays in view with
every section collapsed.

| Row | Panels |
|---|---|
| (none, always shown) | Dependency status, every dependency |
| `<dependency>`, one row per dependency | Calls, Failed calls, Failure rate, Call time |
| Caches | Cache hits and misses |
| Business events | One panel per business metric |
| Dependency call logs | Slowest dependency calls |
| Timers | One panel per `@Timed` name |

Every CloudWatch query uses `*` for each dimension with "match exact"
off, so a panel shows one series per published combination without
listing the values. The one exception is `dependency` in a dependency's
row, which is set to that dependency, so the row shows its operations
alone.

| Panel | Metric | Statistic | Split by |
|---|---|---|---|
| Dependency status, one value per dependency | `external.dependency.available` | `Minimum` | `dependency` |
| Calls | `external.call.duration` | `SampleCount` | `operation`, with `dependency` set to the row's |
| Failed calls | `external.call.failure` | `Sum` | `operation`, with `dependency` set to the row's |
| Failure rate | `external.call.failure` | `Average`, with the percent (0-1) unit | `operation`, with `dependency` set to the row's |
| Call time: average, 95th percentile, slowest | `external.call.duration` | `Average`, `p95`, `Maximum` | `operation`, with `dependency` set to the row's |
| Cache hits and misses | `cache.hit`, `cache.miss` | `Sum` | `cache` |
| Business events, a counter | the service's own metric | `Sum` | every dimension it is published with |
| Business events, a gauge | the service's own metric | `Maximum` (each task publishes the same reading of a shared thing, such as a queue's depth, so `Sum` would multiply it by the task count) | every dimension it is published with |

A business metric with more than one dimension sets each to `*` and
labels the series with all of them:
`${PROP('Dim.outcome')} ${PROP('Dim.schema.version')}`. A dimension name
with a dot in it works in `PROP` (dynamics-gateway, 2026-11-23).

Use `Minimum` for `external.dependency.available`. With more than one task, each
publishes its own value, and `Minimum` shows a single unhealthy task.
The status panel's text mode is "Value and name", so each value carries
its dependency's name: Grafana's default hides the name when there is
only one series, leaving "Available" with nothing to say what is.

Split each panel by every dimension its metric is published with, as in
the table. CloudWatch does not add up across a published dimension, so
a panel on `external.call.failure` split by `dependency` alone is empty.

One more panel per `@Timed("<name>")` annotation in the service's
`src/main` (`METRICS.md` → "Publish" puts one on every controller
endpoint and public service method). `EmfMeterRegistry` publishes each
timer as the metric `<name>`, one value per call in milliseconds, with
the `@Timed` tags `class`, `method` and `exception` as dimensions.

| Panel title | Series | Query |
|---|---|---|
| `<timer-title>`: what the method does, then `endpoint`, `service` or `listener` (`List dead-letter messages: endpoint`) | Average, p95, Slowest | `<timed-name>`, `Average`, `p95`, `Maximum` (ms) |
| | Calls | `<timed-name>`, `SampleCount`, on the right axis |

Every query sets all three dimensions, `class`, `method` and
`exception`, each to `*`, as the template does: a query missing one finds
no data. Each series is labelled by `exception`, so failed calls show
apart from `none`. A timer registered in code (`meterRegistry.timer("…")`)
publishes with its own tags as dimensions, not `class`, `method` and
`exception`. Give it a panel only if the team asks: copy `<timed-name>`
and set the dimensions to that timer's tags, each to `*`.

One panel reads logs, not metrics:

| Panel | Data source | Query |
|---|---|---|
| Slowest dependency calls | OpenSearch | `event.category:"external-call" AND service.name:"<service>"`, columns `@timestamp`, `event.action`, `event.outcome`, `event.duration`, `trace.id`, sorted by `event.duration` (nanoseconds) |

Grafana queries OpenSearch with Lucene, not DQL: build the query in
OpenSearch Dashboards with DQL switched off, then copy it across. The
template's query works as written (reference-data, 2026-10-21).

The table sorts only the newest 500 matching lines, not the whole time
range. A dependency called all the time fills all 500 and pushes every
other dependency out. On dynamics-gateway, SQS acknowledgements and
queue-depth reads filled them, so no Service Bus send showed. There,
narrow the query to the dependencies that matter and any failure:
`… AND (event.action:"azure-service-bus/send-message" OR event.outcome:"failure")`,
and say so in the description. Check by running the panel's query
(`GRAFANA_API.md`) and counting the rows per `event.action`. This
panel finds nothing unless the service writes the `event.*` fields as a
nested object with a numeric `event.duration` (`LOGGING.md` → "How to
write the fields"). CDP drops the flat MDC form.

The dimension values for the service come from its code. For
reference-data (dot-case names): `dependency` is `mdm`
or `trade-token`; `cache` is `MDM_COUNTRIES_CACHE` or `MDM_POE_CACHE`;
`lookup.type` is `countries`, `ports-of-entry`, `commodity-search` or
`species-check`. A service with a database has `dependency` `mongodb`,
its status from the driver's heartbeats and, if its commands are
measured, an `operation` from a fixed set of command names, with every
other command as `other` (`METRICS.md` → "A database").

## Generate

Claude writes the service's dashboard to
`workareas/ticket-planning/<ticket>/<service>/grafana/dashboard.json`:

1. Copy `assets/dashboard.template.json`.
2. Replace every `<service>` with the service name. If the service's
   `aws.emf.namespace` is not its name, use the namespace in the
   `namespace` fields and the name everywhere else.
3. Make one copy of the `<dependency>` row, with the four panels after
   it, per `dependency` value the service publishes ("The dimension
   values" above), replacing `<dependency>` everywhere in the copy (the row
   title, each panel description and each `dependency` dimension). Put
   the copies one after another in `panels`. A dependency's section is
   17 high (the row's 1, then two panel rows of 8), so add 17 to every
   `y` in the second copy, 34 in the third, and so on, and move every
   row and panel after the last copy down by 17 for each dependency
   past the first.
4. Make one copy of the `<business-title>` panel per business metric
   on the agreed list (Step 2): a plain-English title, and the metric
   and its dimensions everywhere else they appear (the description,
   `metricName`, `dimensions` and the legend `label`; add a dimension
   for each one it is published with). Set the statistic for a gauge
   ("Panels" above). Lay the copies out two to a row under "Business
   events". If there are none, delete the panel and its row.
5. Delete "Cache hits and misses" and its "Caches" row if the service
   has no cache.
6. List the service's `@Timed` names, in one command:
   `grep -rhoE --include='*.java' --exclude-dir=target --exclude-dir=node_modules --exclude-dir=test '@Timed\((value *= *)?"[^"]+"' <repo>`.
   Each line is `@Timed("<name>"`; the name is between the quotes. No
   output means the service has no timers, a Node service included:
   delete the panel and its "Timers" row.
   Otherwise make one copy of the `<timer-title>` panel per name,
   replacing `<timed-name>` everywhere in the copy (description and each
   `metricName`) and `<timer-title>` with its plain-English title
   ("Panels" above), and lay the copies out two to a row from the
   template panel's position down. Where a controller and a service time the same
   operation (`controller.list.time`,
   `service.list.time`), put the pair on one row, controller on
   the left, so the time spent outside the service reads across. Check
   each name is let through the
   service's `management.metrics.enable` allowlist (`METRICS.md` →
   "Rules"); a denied timer publishes nothing.
7. Check the result is valid JSON (`jq empty <file>`) and that no
   placeholder is left
   (`grep -nE '<service>|<dependency>|<business-|<timed-|<timer-' <file>`
   finds nothing).

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

Or Claude imports it through the developer's browser
(`GRAFANA_API.md` → "How"), checks the saved copy against the file by
hash, and adds its `uid` to the file so a later import overwrites it.

Then check each panel shows data. Drive some requests first: where a
cache sits in front of a dependency, calls only happen on a miss.
Claude can run every panel's queries and count the series and points
each returns (`GRAFANA_API.md`), rather than read screenshots.

## Promote

`[UNPROVEN]` The CDP monitoring how-to says dashboards are promoted from
the Portal: service → Diagnostics → Dev → `Promote`. The FAQ says to
ask #cdp-support. Try the Portal button first and record here which one
worked.
