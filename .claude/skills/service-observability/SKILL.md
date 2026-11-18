---
name: service-observability
description: 'Add custom metrics, dependency call logging, a Grafana dashboard and alerts to one CDP service, then promote them and prove the alerts fire. Use when a ticket asks for observability on a single trade-imports service (triggers: "add observability to", "add metrics and alerts to", "add a dashboard and alerts to", "service-observability", "observability for EUDPA-"). NOT for planning or implementing a ticket in general — use the ticket skill and point its plan at these steps. NOT for reviewing code already written — use review or code-style.'
---

The recipe for giving one CDP service the observability the platform
defaults do not: custom metrics, a searchable log line per dependency
call, a custom Grafana dashboard, and alerts that reach the team in
Slack. One service per run. The code lands in the service's repo.
Claude generates the dashboard JSON and an alert build sheet from the
templates in `assets/`; the developer imports and builds them in the
CDP dev Grafana. Claude never uses a browser to reach Grafana ("Who
does what").

Its dashboard and alert steps come from a spike on
`trade-imports-reference-data`, and its code recipe from the reference
implementation on `trade-imports-address-book`. For a Java service, every metric is a
Micrometer meter published by `EmfMeterRegistry` (`references/METRICS.md`
→ "Publish"). That is the one way this skill builds metrics for Java.
For a Node (hapi) service, every metric is one EMF document written
through `@defra/cdp-metrics` at a choke point, the recipe proven on
`trade-imports-animals-frontend` (`references/NODE.md`). Every metric and dimension is named in dot case
(`external.call.duration`). Read "What is proven" before trusting any
step.

## Path conventions

Cross-workspace paths are relative to the workspace root —
`tools/<domain>/`,
`docs/best-practices/`,
`workareas/`. Bash
runs from the workspace root. Skill-internal references stay
relative (`references/<NAME>.md`, `assets/<name>`).

**Bash call hygiene** — one command per Bash call. Full rule
table: [`docs/agent-skills.md`](../../../docs/agent-skills.md)
→ "Bash call hygiene".

## When to use

| Trigger                                                         | What to follow                                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "add observability to `<service>`", "observability for EUDPA-X" | Steps 1 to 6 in order                                                                                              |
| "add metrics and alerts to `<service>`"                         | Steps 1 to 6 in order                                                                                              |
| "add a dashboard and alerts to `<service>`"                     | Step 1's Grafana checks and Step 2's email question, then Steps 4 to 6, if the metrics are already deployed to dev |

When the work is one ticket among others, plan it with the `ticket`
skill and point its plan at these steps.

## What is proven

| Part                                                   | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metrics, Java service                                  | Proven by tests on `trade-imports-address-book` (`EmfMeterRegistry`, the EMF documents it writes, the allowlist, `@Timed` through the Spring proxy). `[UNPROVEN]` in dev CloudWatch until that release is checked there. reference-data's older direct-EMF metrics reached dev CloudWatch under the PascalCase names; it has moved to this way, proven by its own tests (including Caffeine cache hits and misses through a `StatsCounter`), which renames every metric and dimension to dot case, so its dashboard and alerts are rebuilt (`references/METRICS.md` → "A service built the old way"). `[UNPROVEN]` in dev CloudWatch for reference-data until that release is checked there. dynamics-gateway has moved to this way too, proven by its own tests: every SQS call through an AWS SDK `ExecutionInterceptor` (against Floci), the Service Bus send against the emulator, an `@Timed` `@SqsListener` method through the proxy, and the `sqs.queue.depth` gauge read from SQS at publish. `[UNPROVEN]` in dev CloudWatch for the gateway until that release is checked there |
| Log line, Java service                                 | Proven by tests on `trade-imports-address-book`: `EcsEventEncoderTest` and `ExternalCallRecorderIT` check that the encoded JSON holds a nested `event` object with a numeric duration, and a failure's flat `error.type` and `error.message` with no stack trace (`references/LOGGING.md` → "How to write the fields"). The same encoder's line reached dev OpenSearch from reference-data 0.27.0 on 2026-10-21; CDP dropped the earlier MDC version (`references/LOGGING.md` → "What was learned on reference-data"). `[UNPROVEN]` in dev OpenSearch for address-book until its release is checked there                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Metrics and log line, Node service                     | Proven by tests on `trade-imports-animals-frontend` (EUDPA-674, PR #488): the parsed EMF documents for the dependency, endpoint and engine layers, and the JSON that pino with the deployed ECS options writes for the external-call line (nested `event` with an integral duration, `error` with no stack trace, `trace.id` from the request), each test checked red with its change reverted (`references/NODE.md` → "Tests"). `[UNPROVEN]` in dev CloudWatch and dev OpenSearch until that release is checked there, including whether CDP keeps the nested `error` object. `-ins-frontend` and `-plants-frontend` still publish the old names (`references/METRICS.md` → "A service built the old way")                                                                                                                                                                                                                                                                                                                                                                              |
| Dashboard and alerts, PascalCase names                 | Done on reference-data in dev: the dashboard imported and showing CloudWatch and OpenSearch data on 2026-10-21, and the alerts built and fired on 2026-10-22 (`references/ALERTS.md` → "Prove they fire"). Not routed to Slack or promoted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Dashboard and alert templates, dot-case names          | Written for the names address-book publishes, from the CDP docs and the PascalCase versions above. `[UNPROVEN]`: not yet imported into Grafana or fired anywhere. Nor are the database rule 1a and the `<timed-name>` panel, which had no PascalCase version, nor the Redis rule 1b, the Requests, Journey events and Dependency connections rows and alert rules 4 and 5, added for animals-frontend's endpoint and engine metrics (EUDPA-674)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Slack routing, promotion, alert tests in test and prod | **Taken from the CDP docs, not yet done on a real service.** Every fact that comes only from the docs is marked `[UNPROVEN]` where it is stated                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

When a run settles an `[UNPROVEN]` fact, edit the file that states it
(this SKILL.md or the reference): replace the marker with what happened. Do the same when a step turns out wrong.
Commit the edit in this workspace repo, on a branch with the same name
as the service's branch (CLAUDE.md rule 2).

## Who does what

Claude reads and changes the service's code and runs its tests.

Claude never opens, reads, creates, updates or deletes anything in
Slack, the CDP Portal, OpenSearch or the CDP Grafana (dev, test or
prod) through a browser. That covers claude-in-chrome, computer use,
Playwright and any other browser automation. It covers dashboards,
alert rules, contact points, folders and Explore, and it covers just
looking. A signed-in Chrome on the developer's machine does not change
this.

For Steps 4 and 5 Claude only writes the dashboard JSON and the alert
build sheet to
`workareas/ticket-planning/<ticket>/grafana/`;
for Step 6 it gives the exact messages. The developer does everything in
Grafana, the Portal, OpenSearch and Slack, and reports back. Claude
records what they say.

The anonymous, read-only `curl` of the alert rules listing in Step 1 is
still allowed, because it is not a browser.

A run takes days and several sessions. Its progress lives in the
ticket's plan,
`workareas/ticket-planning/<ticket>/plan.md`:
add the completion block below to it at the end of each session, and
read it first in the next one. If the run did not start from the
`ticket` skill there is no plan yet, so create the file (and its
directory) with the first completion block. `workareas/` is local and
not committed, so also record each completion block on the ticket: that
is the copy another developer, or another machine, picks up from.

Where a step says "record it on the ticket", Claude drafts the text and
the developer posts it.

## Step 1: Check what CDP already gives the service

No code. The developer checks in the dev Grafana
(`https://metrics.dev.cdp-int.defra.cloud/`):

- the service has its default dashboard;
- the service has default alerts. They are deployed per service on
  request, so they may be missing: on 2026-10-15 animals-backend had
  them and reference-data had none. They live in the `CDP_Tenants`
  folder in two groups, `<service>` (desired running tasks, CPU, memory,
  storage, average response time, HTTP status code, log ingestion
  errors) and `<service> advanced http alerts` (4xx and 5xx percentage
  and spike detection, p95 response time, slow requests percentage).
  Claude can check this with the rules listing below, filtered on the
  service name. If
  either group is missing, ask #cdp-support to deploy it in every
  environment, naming a service that has it;
- the folder `Playground/<service>-monitoring` exists, with an alert
  evaluation group `<service>-advanced-alerts` holding one alert named
  `platform_managed_do_not_delete`. (Seen 2026-10-15 for reference-data
  and animals-backend.) Anyone can list the dev alert rules without
  signing in, and Claude may run this, because it is not a browser:
  `curl -s 'https://metrics.dev.cdp-int.defra.cloud/api/prometheus/grafana/api/v1/rules' | jq -r '.data.groups[] | "\(.file) | \(.name) | \([.rules[].name] | join(", "))"'`.

Then list the service's real dependencies from its code, not from the
ticket: every system it calls, and any database it has configured. A
configured database is a dependency like any other: give it the
metrics, dashboard panels and alerts in `references/METRICS.md` → "A
database". The one exception is a database that is configured but that
nothing reads or writes through: leave it out, say why on the ticket,
and raise a ticket to remove the configuration. (On reference-data,
MongoDB is configured but unused, so it is left out.) Do not measure,
show or alert on a dependency that is not on that list.

## Step 2: Agree the metric list

Follow `references/METRICS.md` → "Work out the list". Agree the list
with the team before writing code, and record it on the ticket.

Ask at the same time: Slack only, or email as well? `[UNPROVEN]` Email
is a #cdp-support request, made in Step 5.

## Step 3: Publish the metrics and log each dependency call

Java service: follow `references/METRICS.md` → "Publish" and
`references/LOGGING.md`. Copy the registry classes from
`trade-imports-address-book`. If the service already writes EMF
directly or has an `EmfMetricsPublisher`, move it to the registry first
(`references/METRICS.md` → "A service built the old way").

Node service: follow `references/NODE.md`, with the names from
`references/METRICS.md` → "Work out the list" and the log line from
`references/LOGGING.md` → "The line". Copy the helpers from
`trade-imports-animals-frontend`. A service with the old
`src/server/common/helpers/external-call-metrics.js` replaces it with
these helpers, and its dashboard and alerts are rebuilt
(`references/METRICS.md` → "A service built the old way").

Raise the PR from a `feat/EUDPA-X-<slug>` branch and deploy to dev.
Steps 4 to 6 need the metrics to be arriving in dev.

`/health` must not change. CDP uses it to decide whether a task is
alive, so a dependency check there restarts every task when a
dependency goes down. Availability is a metric, never a health check.

## Step 4: Build the dashboard

Follow `references/DASHBOARD.md` → "Generate" (Claude, from
`assets/dashboard.template.json`), then "Import" (the developer).

## Step 5: Build the alerts and route them to Slack

Follow `references/ALERTS.md` → "Build" (Claude writes the build sheet
from `assets/alerts.template.md`; the developer builds each rule) and
"Route to Slack".

## Step 6: Promote, then prove each alert fires

Follow `references/ALERTS.md` → "Promote" and "Prove they fire", and
`references/LOGGING.md` → "Follow a request by trace.id". The developer
does every Grafana part of these; Claude gives the steps and records
what they report.

## Completion output

```
service-observability: <service> (<ticket>)

Done:
- <steps finished, with PR links>

Waiting on a person:
- <Grafana, Portal, Slack or #cdp-support steps still open>

Settled this run:
- <each [UNPROVEN] fact confirmed or corrected, and the file that states it (this SKILL.md or the reference) edited>

Next: <the single next action and who takes it>
```
