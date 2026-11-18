Build the service's custom alerts, route them to Slack, promote them and
prove they fire. Parent-loaded: path and Bash rules come from
`SKILL.md`.

`SKILL.md` → "What is proven" says which parts have been done on a real
service. `[UNPROVEN]` These dot-case rules, rules 1a and 1b among them, have not
been built or fired anywhere. Each fact that comes only from the CDP
monitoring docs is marked `[UNPROVEN]`.

The developer builds the alerts by hand in Grafana, from a build sheet
Claude writes. Nothing can push them for us: writing to the dev Grafana
needs a signed-in Editor and CDP issues no service-account tokens (see
`DASHBOARD.md`). `[UNPROVEN]` Grafana's UI has no import for
Grafana-managed alert rules; if a run finds one, add an importable
template beside the build sheet and record it here.

Claude writes the sheet to
`workareas/ticket-planning/<ticket>/grafana/alerts.md`
by copying `assets/alerts.template.md` and filling in:

- `<service>`;
- `<read-timeout-ms>` and `<slow-threshold-ms>` (two thirds of it) for
  each dependency, from the read timeout its client actually applies.
  Read the client code, not just the config: on reference-data the YAML
  sets `readTimeout: 3000`, but the Feign clients have no
  `Request.Options`, so Feign's 60 second default applies. If
  dependencies differ, split "dependency slow" into one rule per
  dependency, as the sheet says;
- `<section-slow-ms>` and `<conflicts-per-hour>` for rules 4 and 5,
  from the team, when the service publishes those metrics.

The build sheet and the table below must agree; a change to one is a
change to both.

## Build

| Thing            | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| Folder           | `Playground/<service>-monitoring` (seen on reference-data; see `DASHBOARD.md`) |
| Evaluation group | `<service>-advanced-alerts`                                                    |

The folder and evaluation group already exist, holding one alert named
`platform_managed_do_not_delete` (seen 2026-10-15 for reference-data and
animals-backend). Leave that alert alone. `[UNPROVEN]` The alerts must
be in that evaluation group; it evaluates every 5 minutes. No labels are
needed: promotion adds them.

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

| Alert                                                                                                    | Fires when                                                                                                                                | If there is no data |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Dependency unavailable                                                                                   | `external.call.failure`, `Minimum`, equal to 1 over 5 minutes (every call in the window failed), per `dependency` and `operation`         | Normal              |
| Database unavailable (which rules a service with a database gets: `assets/alerts.template.md` → "Check") | `external.dependency.available`, `Maximum`, below 1 over 5 minutes (every reading from every task said down), `dependency` = the database | Normal              |
| Redis unavailable (a Node service whose session store is Redis)                                          | `external.dependency.available`, `Maximum`, below 1 over 5 minutes (every reading from every task said down), `dependency` = `redis`      | Normal              |
| Dependency calls failing                                                                                 | `external.call.failure`, `Sum`, 3 or more over 15 minutes, per `dependency` and `operation`                                               | Normal              |
| Dependency slow                                                                                          | `external.call.duration`, `p95`, above two thirds of the call's read timeout, over 15 minutes, per `dependency` and `operation`           | Normal              |
| Section slow (a service publishing `http.server.requests`)                                               | `http.server.requests`, `p95`, above a threshold the team sets, over 15 minutes, per `method`, `section` and `status.class`               | Normal              |
| Concurrency conflicts (a service publishing `journey.concurrency.conflict`)                              | `journey.concurrency.conflict`, `Sum`, above a threshold the team sets over 60 minutes, with no dimensions                                | Normal              |

`[UNPROVEN]` The section and concurrency rules (4 and 5 in
`assets/alerts.template.md`) have not been built or fired anywhere. They
are built for the names `trade-imports-animals-frontend` publishes
(`NODE.md`). CDP's own advanced HTTP alerts already cover the whole
service's p95 and 5xx rate, so rule 4 adds only the split by section.

**Query every call alert by `dependency` and `operation`.** Both
external call metrics are published with that one dimension set
(`METRICS.md` → "One dimension set per metric"), and CloudWatch does not
add up across a dimension a metric was published with, so a query on
`dependency` alone finds no data. With "no data" set to Normal, that
alert would never fire and nobody would know. Each call alert has one
series per dependency and operation, and the thresholds above apply to
each series.

**Read a dot-case label with `index` in a summary.** A summary is a Go
template, where `{{ $labels.status.class }}` reads a field `class` of
the label `status`, so it fails or renders blank. Write
`{{ index $labels "status.class" }}`. A label with no dot reads as
`{{ $labels.dependency }}`. `[UNPROVEN]` until rule 4 has fired.

**The availability alerts are the exception: query them by `dependency`
alone.** `external.dependency.available` is published with `dependency` as its only
dimension, so adding `operation` to its query finds no data in the same
way.

**Do not alert on `external.dependency.available` for an HTTP dependency.** It is
for the dashboard. The "Dependency unavailable" alert uses
`external.call.failure` instead, which only reports calls that happened in
the window. `METRICS.md` → "Availability: passive or active" says why,
for a passive reading and an active probe both.

**A Node service follows the same rule.** It publishes
`external.dependency.available` for each HTTP dependency from its most
recent call (`NODE.md` → "Availability of an HTTP dependency"), which
holds a single failure until the next call: on a quiet dependency, one
failed call would keep an alert firing until a call succeeds. Its HTTP
dependencies are alerted on by rules 1, 2 and 3, and its Redis session
store by its own rule, "Redis unavailable" (rule 1b in
`assets/alerts.template.md`), never by an availability rule with
`dependency` = `*`.

**Do alert on it for a database, and for Redis.** A database's `external.dependency.available`
comes from the driver's heartbeats every 10 seconds (`METRICS.md` → "A
database"), or for Redis from the client's connection events, published
on each change and every minute (`NODE.md` → "Redis"), so it is fresh.
And a MongoDB outage barely shows in
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

**The call alerts cannot see an outage nobody calls through.** If the
service and its callers are serving from caches, no call reaches the
dependency, so no call alert fires. Nor does a passive availability
reading change, as it comes from the same calls. A database's
availability is different: it reads the driver's own monitoring, which
runs with no calls at all. On reference-data, a frontend instance
that has loaded its countries and ports never asks again, so an MDM
outage only shows once a frontend restarts or a request misses
reference-data's 60-minute cache. Users are not affected until then
either, but say so on the ticket so nobody reads a quiet alert as
proof the dependency is up.

## Route to Slack

The team's channels are shared across services:

| Environment | Channel                              |
| ----------- | ------------------------------------ |
| dev, test   | `trade-imports-team-alerts-non-prod` |
| prod        | `trade-imports-team-alerts-prod`     |

1. Check both channels exist and are public.
2. Ask #cdp-support to route the service's alerts, default and custom,
   to these two channels.

`[UNPROVEN]` CDP's docs expect one pair of channels per service, named
`<service>-team-alerts-non-prod` and `<service>-team-alerts-prod`. These
are shared team channels with a different name. Ask #cdp-support to
confirm that works, and record the answer here: it decides the routing
for every service that follows.

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
that happened, and few happen on their own. Rules 1a and 1b need no
calls: a database's gauge is published every minute once the driver has
checked the database, and Redis's on each connection event and every
minute after:

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
  the labels its rule names (not blanks), then put the threshold back
  and watch it return to Normal. The call rules' summaries show the
  dependency and operation. The database and Redis alerts' summaries
  have no labels: they show the name as written in the rule. With no
  failures the failure metrics read 0, so use `IS ABOVE -1` for
  "unavailable" and "calls failing", and `IS ABOVE 0` for "slow". A
  healthy database or Redis reads 1, so use `IS BELOW 2` for rules 1a
  and 1b.
  Once Slack routing is in place, also check the alert arrives in
  `trade-imports-team-alerts-non-prod`.
- **Dev, section slow (rule 4).** Open a few pages of the service, then
  lower the threshold to `IS ABOVE 0`: any page request's time is
  above 0. Check the summary shows the method, section and status
  class of each firing series, such as `GET dashboard 2xx`.
- **Dev, concurrency conflicts (rule 5): a real conflict.**
  `journey.concurrency.conflict` is published only when a save is
  refused for a stale concurrency token, so with no conflict there is
  no data, no data is Normal, and a lowered threshold never fires.
  Make one: open the same page of one notification in two browser tabs,
  save it in the first, then save it in the second, whose form still
  holds the old concurrency token. Then lower the threshold to
  `IS ABOVE 0`. The summary has no labels: it shows the threshold as
  written in the rule.
- **Dev, rules 1a and 1b: no real failure.** Pointing the service at
  a database that does not exist stops it starting (address-book needs
  its database to build indexes), so no task publishes the gauge and the
  rule stays Normal on no data. The lowered threshold is enough, for
  Redis too.
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
- **Test, rules 1a and 1b.** `[UNPROVEN]` A wrong database address
  does not work here either: the service does not start, so no task
  publishes the gauge and the rule stays Normal. The database has to go
  away from a task that is already running, and this skill knows no way
  to do that on CDP. Ask #cdp-support: "Can a running task in test lose
  its database for 10 minutes, for example by revoking its access, so
  we can watch an alert fire?" Until they answer, the evidence is the
  dev Firing from the lowered threshold, plus the same rule shown in
  test after promotion. Record it on the ticket as not fired in test,
  and why.
- **Test, concurrency conflicts (rule 5).** `[UNPROVEN]` The rule is
  read-only there, so make more stale saves than `<conflicts-per-hour>`
  within an hour, two tabs at a time as in dev. A refused save writes
  nothing: the service sends the browser back to the page.
- **Test, section slow (rule 4).** `[UNPROVEN]` No practical real test:
  making a page slower than the team's threshold means breaking it. The
  evidence is the dev Firing from the lowered threshold, plus the same
  rule shown in test after promotion. Record it on the ticket as not
  fired in test, and why.
- **Prod.** Proven by the first prod deploy that follows, not by
  breaking prod.

Record on the ticket which alerts fired, where, and when.
