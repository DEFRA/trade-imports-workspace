Build the service's custom alerts, route them to Slack, promote them and
prove they fire. Parent-loaded: path and Bash rules come from
`SKILL.md`.

The alerts were first built and fired in dev for reference-data
(EUDPA-632, 2026-10-22). None has been routed to Slack or promoted yet.
Each fact that comes only from the CDP monitoring docs is marked
`[UNPROVEN]`.

The developer builds the alerts by hand in Grafana, from a build sheet
Claude writes. Nothing can push them for us: writing to the dev Grafana
needs a signed-in Editor and CDP issues no service-account tokens (see
`DASHBOARD.md`). `[UNPROVEN]` Grafana's UI has no import for
Grafana-managed alert rules; if a run finds one, add an importable
template beside the build sheet and record it here.

Claude writes the sheet to
`~/git/defra/trade-imports-workspace/workareas/ticket-planning/<ticket>/grafana/alerts.md`
by copying `assets/alerts.template.md` and filling in:

- `<service>`;
- `<read-timeout-ms>` and `<slow-threshold-ms>` (two thirds of it) for
  each dependency, from the read timeout its client actually applies.
  Read the client code, not just the config: on reference-data the YAML
  sets `readTimeout: 3000`, but the Feign clients have no
  `Request.Options`, so Feign's 60 second default applies. If
  dependencies differ, split "dependency slow" into one rule per
  dependency, as the sheet says.

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

| Alert | Fires when | If there is no data |
|---|---|---|
| Dependency unavailable | `ExternalCallFailure`, `Minimum`, equal to 1 over 5 minutes (every call in the window failed), per `Dependency` and `Operation` | Normal |
| Dependency calls failing | `ExternalCallFailure`, `Sum`, 3 or more over 15 minutes, per `Dependency` and `Operation` | Normal |
| Dependency slow | `ExternalCallDuration`, `p95`, above two thirds of the call's read timeout, over 15 minutes, per `Dependency` and `Operation` | Normal |

**Query every alert by `Dependency` and `Operation`.** Both external
call metrics are published with that one dimension set (`METRICS.md` →
"One dimension set per metric"), and CloudWatch does not add up across
a dimension a metric was published with, so a query on `Dependency`
alone finds no data. With "no data" set to Normal, that alert would
never fire and nobody would know. Each alert has one series per
dependency and operation, and the thresholds above apply to each series.

**Do not alert on `DependencyAvailable`.** It reports the outcome of
the last call, however old. Behind a cache it can read 1 for up to the
cache lifetime after the dependency goes down, and one failed call holds
it at 0 until the next call succeeds. It is for the dashboard. The
"Dependency unavailable" alert uses `ExternalCallFailure` instead, which
only reports calls that happened in the window.

**Never set "no data" to Alerting on these.** Calls only happen when a
request needs the dependency, so nothing is published until the first
call after start-up, and the metrics go quiet while a cache is warm.
"No data → Alerting" would alert the team after every deploy. Use
Normal, or Keep Last State.

Only alert on a dependency the service really uses. A configured
database counts (`METRICS.md` → "A database").

**The alerts cannot see an outage nobody calls through.** If the
service and its callers are serving from caches, no call reaches the
dependency, so no alert fires. On reference-data, a frontend instance
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

**Make the calls yourself.** The alerts only see dependency calls that
happened, and few happen on their own:

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
  back and watch it return to Normal. With no failures the failure
  metrics read 0, so use `IS ABOVE -1` for "unavailable" and "calls
  failing", and `IS ABOVE 0` for "slow". Once Slack routing is in
  place, also check the alert arrives in
  `trade-imports-team-alerts-non-prod`.
- **Dev, the failure rules: a real failure.** Set the dependency's URL
  in the Portal (for reference-data's MDM, `MDM_SERVICE_URL`) to an
  address that does not exist, such as `https://mdm.invalid`, redeploy,
  and run the loop above. "Unavailable" and "calls failing" fire for
  that dependency only. Done on reference-data on 2026-10-22: both
  fired for `mdm` after a dead-end `MDM_SERVICE_URL` and the loop run
  from the Portal terminal. Restore the URL and redeploy. This breaks the service in dev
  for everyone while it runs, so agree a time with the team. "Slow"
  has no practical real test; the lowered threshold is enough.
- **Test.** `[UNPROVEN]` The alert is read-only there, so the failure
  has to be real. One way: deploy briefly with a wrong URL or key for
  the dependency, then call the service. This breaks the service for
  everyone using test while it runs. Agree the method and a time with
  the team and the testers first.
- **Prod.** Proven by the first prod deploy that follows, not by
  breaking prod.

Record on the ticket which alerts fired, where, and when.
