Build the service's custom alerts, route them to Slack, promote them and
prove they fire. Parent-loaded: path and Bash rules come from
`SKILL.md`.

`SKILL.md` → "What is proven" says which parts have been done on a real
service. Rules 1, 2 and 3 in these dot-case names were built on
dynamics-gateway in dev on 2026-11-23, fired with a lowered threshold,
reached Slack and were restored. `[UNPROVEN]` Rule 1a has not been built
anywhere. Each fact that comes only from the CDP monitoring docs is
marked `[UNPROVEN]`.

The alerts are built from a build sheet Claude writes. Writing to the
dev Grafana needs a signed-in Editor and CDP issues no service-account
tokens (see `DASHBOARD.md`), so they are built under the developer's
session, by hand from the sheet. `[UNPROVEN]` Grafana's UI has no
import for Grafana-managed alert rules.

Claude writes the sheet to
`workareas/ticket-planning/<ticket>/<service>/grafana/alerts.md`
by copying `assets/alerts.template.md` and filling in:

- `<service>`;
- `<read-timeout-ms>` and `<slow-threshold-ms>` (two thirds of it) for
  each dependency, from the read timeout its client actually applies.
  Read the client code, not just the config: on reference-data the YAML
  sets `readTimeout: 3000`, but the Feign clients have no
  `Request.Options`, so Feign's 60 second default applies. If
  dependencies differ, split "dependency slow" into one rule per
  dependency, as the sheet says.

Two thirds of the timeout is the starting value. Once the service has
traffic in dev, read each dependency's real call times and agree a
tighter value with the team: the highest 15-minute `p95` over the last
7 days and the slowest single call, from `external.call.duration` with
period `900`. On
dynamics-gateway the Service Bus timeout gave 40000 ms against a worst
`p95` of 417 ms, so the team set 2000 ms; SQS gave 20000 ms against
47 ms, so 1000 ms.

Leave out of a slow rule any operation whose time is not a latency,
such as an SQS long poll (`receive-message` waits up to its wait time
when the queue is empty). A dimension can take a list of values, which
Grafana searches with OR: set `operation` to every value but that one
(`"operation": ["delete-message", "get-queue-attributes", …]` in the
query model; pick each in the form's operation box). Checked on
dynamics-gateway, 2026-11-23.

The build sheet and the table below must agree; a change to one is a
change to both.

## Build

| Thing | Value |
|---|---|
| Folder | `Playground/<service>-monitoring` (seen on reference-data; see `DASHBOARD.md`) |
| Evaluation group | `<service>-advanced-alerts` |

The folder and evaluation group already exist, holding one alert named
`platform_managed_do_not_delete` (seen 2026-10-15 for reference-data and
animals-backend). Leave that alert alone. `[UNPROVEN]` The alerts must
be in that evaluation group. It evaluates every 5 minutes, on the
minute (dynamics-gateway: 13:00:00, 13:05:00 on 2026-11-23). No labels
are needed: promotion adds them.

Each rule sends to the contact point `<service>`, which CDP has already
made (`SKILL.md` → "Step 1"): reference-data's rules do, and
dynamics-gateway's were sent to Slack through it.

What the form does, seen building reference-data's alerts on
2026-10-19:

- It opens in a simplified mode: the condition is one row under the
  query, "WHEN QUERY `Last` IS ABOVE …". The Advanced options toggle
  shows the same thing as Reduce and Threshold expressions.
- The pending period must be None or at least the group's evaluation
  interval. `1m` was refused with "Pending period must be greater than
  or equal to the evaluation interval". Use None: each rule already
  looks at a whole window.
- Each alert is its own rule with one condition. Build the first, then
  make the others with More → Duplicate.

Starting alerts. The thresholds are a first guess for the team to
agree, not tested values.

| Alert | Fires when | If there is no data |
|---|---|---|
| Dependency unavailable | `external.call.failure`, `Minimum`, equal to 1 over 5 minutes (every call in the window failed), per `dependency` and `operation` | Normal |
| Database unavailable (which rules a service with a database gets: `assets/alerts.template.md` → "Check") | `external.dependency.available`, `Maximum`, below 1 over 5 minutes (every reading from every task said down), `dependency` = the database | Normal |
| Dependency calls failing | `external.call.failure`, `Sum`, 3 or more over 15 minutes, per `dependency` and `operation` | Normal |
| Dependency slow | `external.call.duration`, `p95`, above two thirds of the call's read timeout, over 15 minutes, per `dependency` and `operation` | Normal |

**Query every call alert by `dependency` and `operation`.** Both
external call metrics are published with that one dimension set
(`METRICS.md` → "One dimension set per metric"), and CloudWatch does not
add up across a dimension a metric was published with, so a query on
`dependency` alone finds no data. With "no data" set to Normal, that
alert would never fire and nobody would know. Each call alert has one
series per dependency and operation, and the thresholds above apply to
each series.

**The database alert is the one exception: query it by `dependency`
alone.** `external.dependency.available` is published with `dependency` as its only
dimension, so adding `operation` to its query finds no data in the same
way.

**Do not alert on `external.dependency.available` for an HTTP dependency.** It is
for the dashboard. The "Dependency unavailable" alert uses
`external.call.failure` instead, which only reports calls that happened in
the window. `METRICS.md` → "Availability: passive or active" says why,
for a passive reading and an active probe both.

**Do alert on it for a database.** A database's `external.dependency.available`
comes from the driver's heartbeats every 10 seconds (`METRICS.md` → "A
database"), so it is fresh. And a database's outage barely shows in
`external.call.failure`: only a command already sent when the
connection drops is recorded as a failure. A command that cannot reach
a server fails before it is sent and is not recorded. Use `Maximum`, so
the alert fires only when every task saw the database down for the
whole window, not on one task's passing failure.

**Never set "no data" to Alerting on these.** Calls only happen when a
request needs the dependency, so nothing is published until the first
call after start-up, and the metrics go quiet while a cache is warm.
"No data → Alerting" would alert the team after every deploy. Use
Normal, or Keep Last State.

Only alert on a dependency the service really uses. A configured
database counts (`METRICS.md` → "A database").

**Alerts on the service's own metrics** come from the agreed list
(Step 2): one rule per thing a person would act on, each on that
metric's full dimension set, with "no data" Normal. dynamics-gateway's,
built 2026-11-23 (`assets/alerts.template.md` → "4. Business rules"):

| Alert | Fires when |
|---|---|
| Notification backlog | `sqs.queue.depth`, `Minimum`, `queue` = `notification`, above 100 over 15 minutes (the backlog never dropped to 100 in the window) |
| Notifications discarded | `notification.error`, `Sum`, `action` = `discarded`, above 0 over 15 minutes (each one is lost) |

Do not repeat an alert CDP already has. A service with an SQS queue has
CDP's dead-letter queue alert (`SKILL.md` → "Step 1"), so the gateway
has no dead-letter rule of its own.

**The call alerts cannot see an outage nobody calls through.** If the
service and its callers are serving from caches, no call reaches the
dependency, so no call alert fires. The database alert is different: it
reads the driver's own monitoring, which runs with no calls at all. On reference-data, a frontend instance
that has loaded its countries and ports never asks again, so an MDM
outage only shows once a frontend restarts or a request misses
reference-data's 60-minute cache. Users are not affected until then
either, but say so on the ticket so nobody reads a quiet alert as
proof the dependency is up.

## Route to Slack

The team's channels are shared across services:

| Environment | Channel |
|---|---|
| dev, test | `trade-imports-team-alerts-non-prod` |
| prod | `trade-imports-team-alerts-prod` |

1. Check the service's contact point `<service>` is Slack with the
   channel above as its recipient (Alerting → Contact points).
2. Only if it is missing or points elsewhere, ask #cdp-support to route
   the service's alerts, default and custom, to these channels.

CDP's docs expect one pair of channels per service, named
`<service>-team-alerts-non-prod` and `<service>-team-alerts-prod`. The
shared team channel works instead: dynamics-gateway's contact point was
already Slack with recipient `trade-imports-team-alerts-non-prod` and
resolved messages on, and its custom alerts were sent through it on
2026-11-23 with no error. `[UNPROVEN]` That prod routes to
`trade-imports-team-alerts-prod` the same way; check the prod contact
point on the first promotion.

`[UNPROVEN]` Where alerts from perf-test and ext-test go. Assumed
non-prod.

`[UNPROVEN]` If the team asked for email as well (Step 2), make that
request to #cdp-support at the same time.

## Promote

Alerts are promoted to test and prod by asking #cdp-support. Use the
request template in the CDP monitoring how-to, naming the owning
service.

`[UNPROVEN]` Three things the docs say, to know before asking. Confirm
each with #cdp-support on the first promotion:

- **Promotion copies every alert in the evaluation group.** Remove
  experiments first.
- **Deleting a promoted alert in dev deletes it everywhere** on the next
  promotion. Do not delete promoted alerts to tidy up.
- **Promoted alerts are read-only in test and prod.** Every later change
  is: edit in dev, then ask #cdp-support to promote again.

## Prove they fire

An alert that has never fired is not known to work. For each alert, in
dev and then in test, watch it fire, reach the Slack channel, and
resolve.

**Make the calls yourself.** The call alerts only see dependency calls
that happened, and few happen on their own (the database alert needs no
calls: its gauge is published every minute once the driver has checked
the database):

- The service calls a dependency only on a cache miss: after a deploy,
  or once per cache lifetime (60 minutes for reference-data's MDM
  cache).
- Its callers may cache too. The animals frontend loads countries and
  ports of entry from reference-data once per instance and never
  refreshes them, so reference-data gets requests only after a frontend
  instance starts.
- E2E tests are not a source of traffic. The GitHub Actions runs use the
  local Docker stack, whose metrics go to the local AWS stand-in, not
  CloudWatch. The CDP Portal runs call the real services, but through
  the caches above, so they make a handful of calls at most.

So before each test, redeploy the service in dev, then call its
endpoints directly (for reference-data, `GET /countries` and
`GET /ports-of-entry`). Allow about 10 minutes for the metrics to reach
CloudWatch and the group to evaluate.

**Call from the CDP Portal terminal, not a laptop.** From a laptop,
`https://<service>.dev.cdp-int.defra.cloud/...` returns `403` in about
60 ms from CDP's edge, and the request never reaches the service (seen
2026-10-22). The Portal terminal for the service in dev can reach it.
Six rounds, 30 seconds apart:

```bash
for i in 1 2 3 4 5 6; do printf '%s  ' "$(date +%T)"; curl -s -o /dev/null -w 'countries %{http_code}  ' https://trade-imports-reference-data.dev.cdp-int.defra.cloud/countries; curl -s -o /dev/null -w 'ports %{http_code}\n' https://trade-imports-reference-data.dev.cdp-int.defra.cloud/ports-of-entry; sleep 30; done
```

Check the calls happened before waiting on an alert:
`event.category:"external-call" AND event.outcome:"failure" AND
service.name:"<service>"` in OpenSearch shows one line per failed call.

- **Dev, every rule: lower the threshold.** Change the condition so
  ordinary traffic breaks it, wait for Firing, check the summary shows
  the dependency and operation (not blanks), then put the threshold
  back and watch it return to Normal. The database alert's summary has
  no labels: it shows the database name as written in the rule. With
  no failures the failure metrics read 0, so use `IS ABOVE -1` for "unavailable" and "calls
  failing", and `IS ABOVE 0` for "slow". A healthy database reads 1, so
  use `IS BELOW 2` for the database alert. Also check the alert
  arrives in `trade-imports-team-alerts-non-prod`. A dependency with no
  calls in the rule's window has no data: for that check only, widen
  its time range and period to `86400`. Done on dynamics-gateway on
  2026-11-23: all six Firing at the next evaluation with their labels
  filled in, sent to Slack, then all Normal once restored.
- **Dev, the database alert: no real failure.** Pointing the service at
  a database that does not exist stops it starting (address-book needs
  its database to build indexes), so no task publishes the gauge and the
  rule stays Normal on no data. The lowered threshold is enough.
- **Dev, the call failure rules: a real failure.** Set the dependency's URL
  in the Portal (for reference-data's MDM, `MDM_SERVICE_URL`) to an
  address that does not exist, such as `https://mdm.invalid`, redeploy,
  and run the loop above. "Unavailable" and "calls failing" fire for
  that dependency only. Done on reference-data on 2026-10-22: both
  fired for `mdm` after a dead-end `MDM_SERVICE_URL` and the loop run
  from the Portal terminal. Restore the URL and redeploy. This breaks
  the service in dev for everyone while it runs, so agree a time with
  the team. "Slow" has no practical real test; the lowered threshold is
  enough.
- **Test, the call failure rules.** `[UNPROVEN]` The alert is
  read-only there, so the failure has to be real. One way: deploy briefly with a wrong URL or key for
  the dependency, then call the service. This breaks the service for
  everyone using test while it runs. Agree the method and a time with
  the team and the testers first.
- **Test, the database alert.** `[UNPROVEN]` A wrong database address
  does not work here either: the service does not start, so no task
  publishes the gauge and the rule stays Normal. The database has to go
  away from a task that is already running, and this skill knows no way
  to do that on CDP. Ask #cdp-support: "Can a running task in test lose
  its database for 10 minutes, for example by revoking its access, so
  we can watch an alert fire?" Until they answer, the evidence is the
  dev Firing from the lowered threshold, plus the same rule shown in
  test after promotion. Record it on the ticket as not fired in test,
  and why.
- **Prod.** Proven by the first prod deploy that follows, not by
  breaking prod.

Record on the ticket which alerts fired, where, and when.
